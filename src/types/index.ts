// Fibonacci story points
export type StoryPoint = 0.5 | 1 | 2 | 3 | 5 | 8 | 13;

export const STORY_POINTS: StoryPoint[] = [0.5, 1, 2, 3, 5, 8, 13];

// Jira Types
export interface JiraUser {
  accountId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  projectKey: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

// Atlassian Document Format (ADF)
export interface ADFDocument {
  type: "doc";
  version: number;
  content: unknown[];
}

export interface JiraTicket {
  key: string;
  summary: string;
  description?: string | ADFDocument;
  storyPoints?: number;
  status: string;
  created: string;
  resolved?: string;
  daysToComplete?: number;
  assignee?: JiraUser;
  reporter?: JiraUser;
  issueType: string;
  priority?: string;
  labels?: string[];
}

export interface SprintWithTickets extends JiraSprint {
  tickets: JiraTicket[];
}

// GitHub Types
export interface GitHubPullRequest {
  number: number;
  url: string;
  title: string;
  state: "open" | "closed" | "merged";
  fileCount: number;
  commitCount: number;
  additions: number;
  deletions: number;
  createdAt: string;
  mergedAt?: string;
  daysToMerge?: number;
  author: string;
}

// Estimation Types
export interface EstimationReference {
  type: "ticket" | "pull_request";
  key: string;
  url: string;
  points?: number;
  summary: string;
  contributionWeight: number; // 0-100, percentage contribution to the estimate
}

export interface ContributionFactors {
  descriptionComplexity: number; // 0-100
  similarTickets: number; // 0-100
  prMetrics: number; // 0-100
  historicalVelocity: number; // 0-100
  uncertainty: number; // 0-100
}

export interface EstimationResult {
  estimatedPoints: StoryPoint;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  references: EstimationReference[];
  contributionFactors: ContributionFactors;
  confidence: number; // 0-100
}

export interface EstimationRequest {
  ticketKey: string;
  ticketSummary: string;
  ticketDescription: string;
  boardId: number;
  sprintCount: number;
  customPrompt?: string;
}

// Auth Types
export interface AuthSession {
  user: JiraUser;
  jiraHost: string;
  accessToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  jiraHost: string;
  email: string;
  apiToken: string;
}

// Settings Types
export interface AppSettings {
  sprintCount: number;
  defaultBoardId?: number;
  customPrompt?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sprintCount: 10,
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Search Types
export interface SearchQuery {
  text?: string;
  projectKey?: string;
  issueType?: string;
  status?: string;
  maxResults?: number;
}
