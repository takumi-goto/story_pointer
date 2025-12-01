import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIEstimationClient, EstimationContext, AIProvider } from "../types";
import type { EstimationResult, StoryPoint } from "@/types";
import { DEFAULT_PROMPT, buildPrompt } from "@/lib/gemini/prompts";
import { isValidStoryPoint } from "@/lib/utils/fibonacci";

interface GeminiEstimationResponse {
  estimatedPoints: number;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  references: Array<{
    type: "ticket" | "pull_request";
    key: string;
    url: string;
    points?: number;
    summary: string;
    contributionWeight: number;
  }>;
  contributionFactors: {
    descriptionComplexity: number;
    similarTickets: number;
    prMetrics: number;
    historicalVelocity: number;
    uncertainty: number;
  };
  confidence: number;
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

      return {
        estimatedPoints,
        reasoning: parsed.reasoning,
        shouldSplit: parsed.shouldSplit || estimatedPoints >= 13,
        splitSuggestion: parsed.splitSuggestion,
        references: parsed.references.map((ref) => ({
          ...ref,
          contributionWeight: Math.min(100, Math.max(0, ref.contributionWeight)),
        })),
        contributionFactors: {
          descriptionComplexity: this.normalizePercentage(parsed.contributionFactors.descriptionComplexity),
          similarTickets: this.normalizePercentage(parsed.contributionFactors.similarTickets),
          prMetrics: this.normalizePercentage(parsed.contributionFactors.prMetrics),
          historicalVelocity: this.normalizePercentage(parsed.contributionFactors.historicalVelocity),
          uncertainty: this.normalizePercentage(parsed.contributionFactors.uncertainty),
        },
        confidence: this.normalizePercentage(parsed.confidence),
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

  private normalizePercentage(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
}
