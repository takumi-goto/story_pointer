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
  approvedAt?: string;
  daysToApprove?: number;
  author: string;
}

// Estimation Types
export interface RelatedPR {
  number: string;
  summary: string;
  filesChanged: number;
  commits: number;
  leadTimeDays: number;
}

export interface DiffEvaluation {
  scopeDiff: number; // -2 to +2
  fileDiff: number; // -2 to +2
  logicDiff: number; // -2 to +2
  riskDiff: number; // -2 to +2
  diffTotal: number; // -8 to +8
  diffReason: string;
}

export interface WorkloadSimilarityBreakdown {
  W1_typeMatch: number; // 0-6 (作業タイプ一致度)
  W2_scopeMatch: number; // 0-2 (影響規模一致度)
  W3_investigationMatch: number; // 0-1 (調査・リカバリ一致度)
  W4_prWorkloadMatch: number; // 0-1 (PR作業量一致度)
  W5_lexicalBonus: number; // 廃止 (常に0)
}

export interface WorkloadFeatures {
  changedModulesEstimate: string; // "1" | "2-3" | "4+" | "不明"
  changedFilesEstimate: string; // "1" | "2-3" | "4+" | "不明"
  needQueryOrBackfill: string; // "yes" | "no" | "不明"
}

export interface SimilarTicket {
  key: string;
  summary?: string;
  points: number;
  workloadSimilarityScore: number; // 0-10
  workloadSimilarityBreakdown: WorkloadSimilarityBreakdown;
  similarityReason: string[];
  diff: DiffEvaluation;
  relatedPRs: RelatedPR[];
}

export interface BaselineTicket {
  key: string;
  summary?: string;
  points: number;
  workloadSimilarityScore: number; // 0-10
  workloadSimilarityBreakdown: WorkloadSimilarityBreakdown;
  similarityReason: string[];
}

export interface PointCandidate {
  points: number;
  candidateReason: string;
}

export interface WorkTypeBreakdown {
  T1_small_existing_change: number; // 0-2
  T2_pattern_reuse: number; // 0-2
  T3_new_logic_design: number; // 0-2
  T4_cross_system_impact: number; // 0-2
  T5_investigation_heavy: number; // 0-2
  T6_data_backfill_heavy: number; // 0-2
}

export interface AILeverage {
  score: number;
  appliedReduction: "none" | "down_one_level";
  reductionReason: string;
}

export interface RaisePermissionCheck {
  A: { passed: boolean; evidence: string };
  B: { passed: boolean; evidence: string };
  C: { passed: boolean; evidence: string };
}

export interface EstimationResult {
  estimatedPoints: StoryPoint;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  baseline: BaselineTicket;
  workTypeBreakdown?: WorkTypeBreakdown;
  workloadFeatures?: WorkloadFeatures;
  aiLeverage?: AILeverage;
  similarTickets: SimilarTicket[];
  pointCandidates: PointCandidate[];
  raisePermissionCheck?: RaisePermissionCheck;
}

export interface EstimationRequest {
  ticketKey: string;
  ticketSummary: string;
  ticketDescription: string;
  boardId: number;
  sprintCount: number;
  customPrompt?: string;
  mcpPrompt?: string;
  selectedRepositories?: string[];
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
  sprintNameExample?: string; // e.g., "スプリント86"
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
