import type { StoryPoint, ContributionFactors, EstimationReference } from "@/types";

export interface GeminiEstimationResponse {
  estimatedPoints: StoryPoint;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  references: EstimationReference[];
  contributionFactors: ContributionFactors;
  confidence: number;
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
      daysToMerge?: number;
    }>;
  }>;
}

export interface EstimationContext {
  targetTicket: {
    key: string;
    summary: string;
    description: string;
  };
  sprintData: SprintDataForPrompt[];
  customPrompt?: string;
}
