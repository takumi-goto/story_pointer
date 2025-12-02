import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIEstimationClient, EstimationContext, AIProvider } from "../types";
import type { EstimationResult, StoryPoint, WorkTypeBreakdown, WorkloadFeatures, WorkloadSimilarityBreakdown, AILeverage, RaisePermissionCheck } from "@/types";
import { DEFAULT_PROMPT, buildPrompt } from "@/lib/gemini/prompts";
import { isValidStoryPoint } from "@/lib/utils/fibonacci";

interface GeminiWorkloadSimilarityBreakdown {
  W1_typeMatch: number;
  W2_scopeMatch: number;
  W3_investigationMatch: number;
  W4_prWorkloadMatch: number;
  W5_lexicalBonus: number;
}

interface GeminiEstimationResponse {
  estimatedPoints: number;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  baseline: {
    key: string;
    summary?: string;
    points: number;
    workloadSimilarityScore: number;
    workloadSimilarityBreakdown: GeminiWorkloadSimilarityBreakdown;
    similarityReason: string[];
  };
  workTypeBreakdown?: {
    T1_small_existing_change: number;
    T2_pattern_reuse: number;
    T3_new_logic_design: number;
    T4_cross_system_impact: number;
    T5_investigation_heavy: number;
    T6_data_backfill_heavy: number;
  };
  workloadFeatures?: {
    changedModulesEstimate: string;
    changedFilesEstimate: string;
    needQueryOrBackfill: string;
  };
  aiLeverage?: {
    score: number;
    appliedReduction: string;
    reductionReason: string;
  };
  similarTickets: Array<{
    key: string;
    summary?: string;
    points: number;
    workloadSimilarityScore: number;
    workloadSimilarityBreakdown: GeminiWorkloadSimilarityBreakdown;
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
  raisePermissionCheck?: {
    A: { passed: boolean; evidence: string };
    B: { passed: boolean; evidence: string };
    C: { passed: boolean; evidence: string };
  };
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

    // Append related ticket context to description if available
    let fullDescription = context.targetTicket.description;
    if (context.relatedTicketContext) {
      fullDescription += "\n\n" + context.relatedTicketContext;
    }

    const prompt = buildPrompt(
      basePrompt,
      context.sprintData,
      context.targetTicket.summary,
      fullDescription
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

      // Sanitize JSON string to handle various formatting issues
      const sanitizedJson = this.sanitizeJsonString(jsonMatch[1]);

      const parsed: GeminiEstimationResponse = JSON.parse(sanitizedJson);

      // Validate and normalize the response
      const estimatedPoints = this.normalizeStoryPoint(parsed.estimatedPoints);

      // Build baseline with fallback for missing data
      const baseline = parsed.baseline ? {
        key: parsed.baseline.key || "N/A",
        summary: parsed.baseline.summary,
        points: parsed.baseline.points || 0,
        workloadSimilarityScore: this.normalizeWorkloadSimilarityScore(parsed.baseline.workloadSimilarityScore || 0),
        workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(parsed.baseline.workloadSimilarityBreakdown),
        similarityReason: parsed.baseline.similarityReason || [],
      } : {
        key: "N/A",
        points: 0,
        workloadSimilarityScore: 0,
        workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(undefined),
        similarityReason: [],
      };

      // Build workloadFeatures
      const workloadFeatures: WorkloadFeatures | undefined = parsed.workloadFeatures ? {
        changedModulesEstimate: parsed.workloadFeatures.changedModulesEstimate || "不明",
        changedFilesEstimate: parsed.workloadFeatures.changedFilesEstimate || "不明",
        needQueryOrBackfill: parsed.workloadFeatures.needQueryOrBackfill || "不明",
      } : undefined;

      // Build workTypeBreakdown
      const workTypeBreakdown: WorkTypeBreakdown | undefined = parsed.workTypeBreakdown ? {
        T1_small_existing_change: parsed.workTypeBreakdown.T1_small_existing_change || 0,
        T2_pattern_reuse: parsed.workTypeBreakdown.T2_pattern_reuse || 0,
        T3_new_logic_design: parsed.workTypeBreakdown.T3_new_logic_design || 0,
        T4_cross_system_impact: parsed.workTypeBreakdown.T4_cross_system_impact || 0,
        T5_investigation_heavy: parsed.workTypeBreakdown.T5_investigation_heavy || 0,
        T6_data_backfill_heavy: parsed.workTypeBreakdown.T6_data_backfill_heavy || 0,
      } : undefined;

      // Build aiLeverage
      const aiLeverage: AILeverage | undefined = parsed.aiLeverage ? {
        score: parsed.aiLeverage.score || 0,
        appliedReduction: (parsed.aiLeverage.appliedReduction === "down_one_level" ? "down_one_level" : "none") as "none" | "down_one_level",
        reductionReason: parsed.aiLeverage.reductionReason || "",
      } : undefined;

      // Build raisePermissionCheck
      const raisePermissionCheck: RaisePermissionCheck | undefined = parsed.raisePermissionCheck ? {
        A: { passed: parsed.raisePermissionCheck.A?.passed || false, evidence: parsed.raisePermissionCheck.A?.evidence || "" },
        B: { passed: parsed.raisePermissionCheck.B?.passed || false, evidence: parsed.raisePermissionCheck.B?.evidence || "" },
        C: { passed: parsed.raisePermissionCheck.C?.passed || false, evidence: parsed.raisePermissionCheck.C?.evidence || "" },
      } : undefined;

      return {
        estimatedPoints,
        reasoning: parsed.reasoning || "",
        shouldSplit: parsed.shouldSplit || estimatedPoints >= 13,
        splitSuggestion: parsed.splitSuggestion || "",
        baseline,
        workTypeBreakdown,
        workloadFeatures,
        aiLeverage,
        similarTickets: (parsed.similarTickets || []).filter((ticket) => ticket != null).map((ticket) => ({
          key: ticket.key || "N/A",
          summary: ticket.summary,
          points: ticket.points || 0,
          workloadSimilarityScore: this.normalizeWorkloadSimilarityScore(ticket.workloadSimilarityScore || 0),
          workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(ticket.workloadSimilarityBreakdown),
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
        raisePermissionCheck,
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

  private normalizeWorkloadSimilarityScore(value: number): number {
    return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
  }

  private normalizeWorkloadSimilarityBreakdown(breakdown: GeminiWorkloadSimilarityBreakdown | undefined): WorkloadSimilarityBreakdown {
    if (!breakdown) {
      return {
        W1_typeMatch: 0,
        W2_scopeMatch: 0,
        W3_investigationMatch: 0,
        W4_prWorkloadMatch: 0,
        W5_lexicalBonus: 0,
      };
    }
    return {
      W1_typeMatch: Math.min(6, Math.max(0, breakdown.W1_typeMatch || 0)),
      W2_scopeMatch: Math.min(2, Math.max(0, breakdown.W2_scopeMatch || 0)),
      W3_investigationMatch: Math.min(1, Math.max(0, breakdown.W3_investigationMatch || 0)),
      W4_prWorkloadMatch: Math.min(1, Math.max(0, breakdown.W4_prWorkloadMatch || 0)),
      W5_lexicalBonus: 0, // 廃止
    };
  }

  private normalizeDiffValue(value: number): number {
    return Math.min(2, Math.max(-2, Math.round(value)));
  }

  private sanitizeJsonString(jsonStr: string): string {
    // Remove control characters except valid whitespace (tab \x09, newline \x0A, carriage return \x0D)
    // eslint-disable-next-line no-control-regex
    const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    let result = jsonStr
      .replace(controlCharRegex, '')
      // Remove trailing commas before closing brackets/braces
      .replace(/,(\s*[}\]])/g, '$1');

    // Try to fix common JSON issues
    try {
      JSON.parse(result);
      return result;
    } catch {
      // If still invalid, try more aggressive fixes
      result = result
        // Fix single quotes to double quotes (for property names and string values)
        .replace(/'/g, '"')
        // Fix unquoted property names (simple cases)
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
        // Remove any BOM or invisible characters at the start
        .replace(/^\uFEFF/, '')
        .trim();

      return result;
    }
  }
}
