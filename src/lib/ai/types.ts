import type { EstimationResult } from "@/types";

// AI Provider types
export type AIProvider = "gemini" | "claude" | "openai";

export interface AIModel {
  provider: AIProvider;
  modelId: string;
  label: string;
  description?: string;
}

// Context for estimation
export interface EstimationContext {
  targetTicket: {
    key: string;
    summary: string;
    description: string;
  };
  sprintData: SprintDataForPrompt[];
  customPrompt?: string;
}

export interface SprintDataForPrompt {
  sprintName: string;
  tickets: Array<{
    key: string;
    summary: string;
    description?: string;
    storyPoints?: number;
    daysToComplete?: number;
    pullRequests?: Array<{
      url: string;
      fileCount: number;
      commitCount: number;
      additions?: number;
      deletions?: number;
      daysToMerge?: number;
    }>;
  }>;
}

// AI Client Interface
export interface AIEstimationClient {
  readonly provider: AIProvider;
  readonly modelId: string;
  estimateStoryPoints(context: EstimationContext): Promise<EstimationResult>;
}

// Factory config
export interface AIClientConfig {
  provider: AIProvider;
  modelId: string;
  apiKey: string;
}
