import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIEstimationClient, EstimationContext, AIProvider } from "../types";
import type { EstimationResult, StoryPoint, BaselineTicket, SimilarTicket, PointCandidate } from "@/types";
import { DEFAULT_PROMPT, buildPrompt } from "@/lib/gemini/prompts";
import { isValidStoryPoint } from "@/lib/utils/fibonacci";

interface GeminiEstimationResponse {
  estimatedPoints: number;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  baseline: {
    key: string;
    points: number;
    similarityScore: number;
    similarityReason: string[];
  };
  similarTickets: Array<{
    key: string;
    points: number;
    similarityScore: number;
    similarityReason: string[];
    diff: {
      scopeDiff: number;
      fileDiff: number;
      logicDiff: number;
      riskDiff: number;
      diffTotal: number;
      diffReason: string;
    };
    relatedPRs: Array<{
      number: string;
      summary: string;
      filesChanged: number;
      commits: number;
      leadTimeDays: number;
    }>;
  }>;
  pointCandidates: Array<{
    points: number;
    candidateReason: string;
  }>;
}

export class GeminiEstimationClient implements AIEstimationClient {
  readonly provider: AIProvider = "gemini";
  readonly modelId: string;
  private genAI: GoogleGenerativeAI;
  private model;

  constructor(apiKey: string, modelId: string) {
    this.modelId = modelId;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelId });
  }

  async estimateStoryPoints(context: EstimationContext): Promise<EstimationResult> {
    const basePrompt = context.customPrompt || DEFAULT_PROMPT;
    const prompt = buildPrompt(
      basePrompt,
      context.sprintData,
      context.targetTicket.summary,
      context.targetTicket.description
    );

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON response from Gemini");
      }

      const parsed: GeminiEstimationResponse = JSON.parse(jsonMatch[1]);

      // Validate and normalize the response
      const estimatedPoints = this.normalizeStoryPoint(parsed.estimatedPoints);

      // Build baseline with fallback for missing data
      const baseline = parsed.baseline ? {
        key: parsed.baseline.key || "N/A",
        points: parsed.baseline.points || 0,
        similarityScore: this.normalizeSimilarityScore(parsed.baseline.similarityScore || 0),
        similarityReason: parsed.baseline.similarityReason || [],
      } : {
        key: "N/A",
        points: 0,
        similarityScore: 0,
        similarityReason: [],
      };

      return {
        estimatedPoints,
        reasoning: parsed.reasoning || "",
        shouldSplit: parsed.shouldSplit || estimatedPoints >= 13,
        splitSuggestion: parsed.splitSuggestion || "",
        baseline,
        similarTickets: (parsed.similarTickets || []).filter((ticket) => ticket != null).map((ticket) => ({
          key: ticket.key || "N/A",
          points: ticket.points || 0,
          similarityScore: this.normalizeSimilarityScore(ticket.similarityScore || 0),
          similarityReason: ticket.similarityReason || [],
          diff: ticket.diff ? {
            scopeDiff: this.normalizeDiffValue(ticket.diff.scopeDiff || 0),
            fileDiff: this.normalizeDiffValue(ticket.diff.fileDiff || 0),
            logicDiff: this.normalizeDiffValue(ticket.diff.logicDiff || 0),
            riskDiff: this.normalizeDiffValue(ticket.diff.riskDiff || 0),
            diffTotal: ticket.diff.diffTotal || 0,
            diffReason: ticket.diff.diffReason || "",
          } : {
            scopeDiff: 0,
            fileDiff: 0,
            logicDiff: 0,
            riskDiff: 0,
            diffTotal: 0,
            diffReason: "",
          },
          relatedPRs: (ticket.relatedPRs || []).map((pr) => ({
            number: pr.number || "",
            summary: pr.summary || "",
            filesChanged: pr.filesChanged || 0,
            commits: pr.commits || 0,
            leadTimeDays: pr.leadTimeDays || 0,
          })),
        })),
        pointCandidates: (parsed.pointCandidates || []).map((candidate) => ({
          points: candidate.points || 0,
          candidateReason: candidate.candidateReason || "",
        })),
      };
    } catch (error) {
      console.error("Gemini estimation error:", error);
      throw new Error(`Failed to estimate story points: ${error}`);
    }
  }

  private normalizeStoryPoint(value: number): StoryPoint {
    if (isValidStoryPoint(value)) {
      return value;
    }

    // Find the nearest valid story point
    const validPoints: StoryPoint[] = [0.5, 1, 2, 3, 5, 8, 13];
    let closest: StoryPoint = 1;
    let minDiff = Math.abs(value - 1);

    for (const point of validPoints) {
      const diff = Math.abs(value - point);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }

  private normalizeSimilarityScore(value: number): number {
    return Math.min(5, Math.max(0, Math.round(value)));
  }

  private normalizeDiffValue(value: number): number {
    return Math.min(2, Math.max(-2, Math.round(value)));
  }
}
