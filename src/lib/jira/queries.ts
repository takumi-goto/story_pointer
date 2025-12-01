import type { SearchQuery } from "@/types";

export function buildSearchJQL(query: SearchQuery): string {
  const conditions: string[] = [];

  if (query.text) {
    // Search in summary and description
    conditions.push(`(summary ~ "${query.text}" OR description ~ "${query.text}")`);
  }

  if (query.projectKey) {
    conditions.push(`project = "${query.projectKey}"`);
  }

  if (query.issueType) {
    conditions.push(`issuetype = "${query.issueType}"`);
  }

  if (query.status) {
    conditions.push(`status = "${query.status}"`);
  }

  // Default: only search for Story, Task, Bug types
  if (!query.issueType) {
    conditions.push(`issuetype in (Story, Task, Bug)`);
  }

  const jql = conditions.length > 0 ? conditions.join(" AND ") : "issuetype in (Story, Task, Bug)";

  return `${jql} ORDER BY updated DESC`;
}

export function buildSprintIssuesJQL(sprintId: number): string {
  return `sprint = ${sprintId} ORDER BY rank ASC`;
}

export function buildRecentCompletedJQL(projectKey: string, days: number = 90): string {
  return `project = "${projectKey}" AND status = Done AND resolved >= -${days}d ORDER BY resolved DESC`;
}
