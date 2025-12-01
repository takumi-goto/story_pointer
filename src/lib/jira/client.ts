import type {
  JiraApiUser,
  JiraApiBoardsResponse,
  JiraApiSprintsResponse,
  JiraApiSearchResponse,
  JiraApiSprintIssuesResponse,
  JiraDevInfoResponse,
} from "./types";
import type { JiraUser, JiraBoard, JiraSprint, JiraTicket, SprintWithTickets } from "@/types";
import { calculateDaysBetween } from "@/lib/utils/date";

export interface JiraClientConfig {
  host: string;
  email: string;
  apiToken: string;
}

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: JiraClientConfig) {
    this.baseUrl = `https://${config.host}`;
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<JiraUser> {
    const user = await this.fetch<JiraApiUser>("/rest/api/3/myself");
    return {
      accountId: user.accountId,
      email: user.emailAddress,
      displayName: user.displayName,
      avatarUrl: user.avatarUrls["48x48"],
    };
  }

  async getBoards(): Promise<JiraBoard[]> {
    // Get all boards (scrum and kanban)
    const response = await this.fetch<JiraApiBoardsResponse>("/rest/agile/1.0/board");
    return response.values
      .filter((board) => board.location?.projectKey) // Filter out boards without project
      .map((board) => ({
        id: board.id,
        name: board.name,
        type: board.type,
        projectKey: board.location!.projectKey,
      }));
  }

  async getSprints(boardId: number, count: number = 10): Promise<JiraSprint[]> {
    const response = await this.fetch<JiraApiSprintsResponse>(
      `/rest/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=${count}`
    );
    return response.values.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      completeDate: sprint.completeDate,
    }));
  }

  async getSprintIssues(sprintId: number, storyPointField: string = "customfield_10016"): Promise<JiraTicket[]> {
    const jql = `sprint = ${sprintId}`;
    const fields = `summary,description,status,issuetype,priority,assignee,reporter,created,resolutiondate,labels,${storyPointField}`;

    const response = await this.fetch<JiraApiSprintIssuesResponse>(
      `/rest/agile/1.0/sprint/${sprintId}/issue?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`
    );

    return response.issues.map((issue) => {
      const storyPoints = issue.fields[storyPointField] as number | undefined;
      const created = issue.fields.created;
      const resolved = issue.fields.resolutiondate;

      return {
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || undefined,
        storyPoints,
        status: issue.fields.status.name,
        created,
        resolved: resolved || undefined,
        daysToComplete: resolved ? calculateDaysBetween(created, resolved) : undefined,
        assignee: issue.fields.assignee
          ? {
              accountId: issue.fields.assignee.accountId,
              email: issue.fields.assignee.emailAddress,
              displayName: issue.fields.assignee.displayName,
              avatarUrl: issue.fields.assignee.avatarUrls["48x48"],
            }
          : undefined,
        reporter: issue.fields.reporter
          ? {
              accountId: issue.fields.reporter.accountId,
              email: issue.fields.reporter.emailAddress,
              displayName: issue.fields.reporter.displayName,
              avatarUrl: issue.fields.reporter.avatarUrls["48x48"],
            }
          : undefined,
        issueType: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name,
        labels: issue.fields.labels,
      };
    });
  }

  async getSprintsWithTickets(boardId: number, count: number = 10): Promise<SprintWithTickets[]> {
    const sprints = await this.getSprints(boardId, count);
    const sprintsWithTickets: SprintWithTickets[] = [];

    for (const sprint of sprints) {
      const tickets = await this.getSprintIssues(sprint.id);
      sprintsWithTickets.push({
        ...sprint,
        tickets,
      });
    }

    return sprintsWithTickets;
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraTicket[]> {
    const fields = "summary,description,status,issuetype,priority,assignee,reporter,created,resolutiondate,labels,customfield_10016";

    const response = await this.fetch<JiraApiSearchResponse>(
      `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${maxResults}`
    );

    return response.issues.map((issue) => {
      const storyPoints = issue.fields.customfield_10016 as number | undefined;
      const created = issue.fields.created;
      const resolved = issue.fields.resolutiondate;

      return {
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || undefined,
        storyPoints,
        status: issue.fields.status.name,
        created,
        resolved: resolved || undefined,
        daysToComplete: resolved ? calculateDaysBetween(created, resolved) : undefined,
        assignee: issue.fields.assignee
          ? {
              accountId: issue.fields.assignee.accountId,
              email: issue.fields.assignee.emailAddress,
              displayName: issue.fields.assignee.displayName,
              avatarUrl: issue.fields.assignee.avatarUrls["48x48"],
            }
          : undefined,
        reporter: issue.fields.reporter
          ? {
              accountId: issue.fields.reporter.accountId,
              email: issue.fields.reporter.emailAddress,
              displayName: issue.fields.reporter.displayName,
              avatarUrl: issue.fields.reporter.avatarUrls["48x48"],
            }
          : undefined,
        issueType: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name,
        labels: issue.fields.labels,
      };
    });
  }

  async getIssue(issueKey: string): Promise<JiraTicket> {
    const fields = "summary,description,status,issuetype,priority,assignee,reporter,created,resolutiondate,labels,customfield_10016";

    const response = await this.fetch<{ key: string; fields: JiraApiSearchResponse["issues"][0]["fields"] }>(
      `/rest/api/3/issue/${issueKey}?fields=${fields}`
    );

    const storyPoints = response.fields.customfield_10016 as number | undefined;
    const created = response.fields.created;
    const resolved = response.fields.resolutiondate;

    return {
      key: response.key,
      summary: response.fields.summary,
      description: response.fields.description || undefined,
      storyPoints,
      status: response.fields.status.name,
      created,
      resolved: resolved || undefined,
      daysToComplete: resolved ? calculateDaysBetween(created, resolved) : undefined,
      assignee: response.fields.assignee
        ? {
            accountId: response.fields.assignee.accountId,
            email: response.fields.assignee.emailAddress,
            displayName: response.fields.assignee.displayName,
            avatarUrl: response.fields.assignee.avatarUrls["48x48"],
          }
        : undefined,
      reporter: response.fields.reporter
        ? {
            accountId: response.fields.reporter.accountId,
            email: response.fields.reporter.emailAddress,
            displayName: response.fields.reporter.displayName,
            avatarUrl: response.fields.reporter.avatarUrls["48x48"],
          }
        : undefined,
      issueType: response.fields.issuetype.name,
      priority: response.fields.priority?.name,
      labels: response.fields.labels,
    };
  }

  async getDevInfo(issueKey: string): Promise<JiraDevInfoResponse | null> {
    try {
      const response = await this.fetch<JiraDevInfoResponse>(
        `/rest/dev-status/1.0/issue/detail?issueId=${issueKey}&applicationType=GitHub&dataType=pullrequest`
      );
      return response;
    } catch {
      // Dev info might not be available for all issues
      return null;
    }
  }

  getIssueUrl(issueKey: string): string {
    return `${this.baseUrl}/browse/${issueKey}`;
  }
}

export function createJiraClient(config: JiraClientConfig): JiraClient {
  return new JiraClient(config);
}
