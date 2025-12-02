// Jira API Response Types

export interface JiraApiUser {
  accountId: string;
  emailAddress: string;
  displayName: string;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
  active: boolean;
}

export interface JiraApiBoard {
  id: number;
  self: string;
  name: string;
  type: "scrum" | "kanban" | "simple";
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

export interface JiraApiBoardsResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: JiraApiBoard[];
}

export interface JiraApiSprint {
  id: number;
  self: string;
  state: "active" | "closed" | "future";
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId: number;
  goal?: string;
}

export interface JiraApiSprintsResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: JiraApiSprint[];
}

export interface JiraApiIssueFields {
  summary: string;
  description?: string | null;
  status: {
    name: string;
    statusCategory: {
      key: string;
      name: string;
    };
  };
  issuetype: {
    name: string;
    iconUrl: string;
  };
  priority?: {
    name: string;
    iconUrl: string;
  };
  assignee?: JiraApiUser | null;
  reporter?: JiraApiUser | null;
  created: string;
  resolutiondate?: string | null;
  labels?: string[];
  // Story points can be in different fields depending on Jira configuration
  customfield_10016?: number; // Common story points field
  [key: string]: unknown;
}

export interface JiraApiIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraApiIssueFields;
}

export interface JiraApiSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraApiIssue[];
}

export interface JiraApiSprintIssuesResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraApiIssue[];
}

// Development Information (GitHub integration)
export interface JiraDevInfoPullRequest {
  id: string;
  url: string;
  name: string;
  status: "OPEN" | "MERGED" | "DECLINED";
  author: {
    name: string;
    avatar?: string;
  };
  sourceBranch: string;
  destinationBranch: string;
  lastUpdate: string;
}

export interface JiraDevInfoRepository {
  name: string;
  url: string;
  pullRequests: JiraDevInfoPullRequest[];
}

export interface JiraDevInfoResponse {
  detail: Array<{
    repositories: JiraDevInfoRepository[];
  }>;
}
