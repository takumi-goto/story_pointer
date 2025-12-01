import type { GitHubApiPullRequest, GitHubApiSearchResponse } from "./types";
import type { GitHubPullRequest } from "@/types";
import { calculateDaysBetween } from "@/lib/utils/date";

export interface GitHubClientConfig {
  token: string;
}

export class GitHubClient {
  private baseUrl = "https://api.github.com";
  private token: string;

  constructor(config: GitHubClientConfig) {
    this.token = config.token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private mapPullRequest(pr: GitHubApiPullRequest): GitHubPullRequest {
    const createdAt = pr.created_at;
    const mergedAt = pr.merged_at;

    return {
      number: pr.number,
      url: pr.html_url,
      title: pr.title,
      state: pr.merged_at ? "merged" : pr.state,
      fileCount: pr.changed_files,
      commitCount: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      createdAt,
      mergedAt: mergedAt || undefined,
      daysToMerge: mergedAt ? calculateDaysBetween(createdAt, mergedAt) : undefined,
      author: pr.user.login,
    };
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    const pr = await this.fetch<GitHubApiPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    return this.mapPullRequest(pr);
  }

  async searchPullRequests(query: string): Promise<GitHubPullRequest[]> {
    const response = await this.fetch<GitHubApiSearchResponse>(
      `/search/issues?q=${encodeURIComponent(query)}+type:pr&per_page=20`
    );

    // Search API doesn't return full PR details, so we need to fetch each PR
    const prs: GitHubPullRequest[] = [];

    for (const item of response.items) {
      // Extract owner and repo from the HTML URL
      const urlParts = item.html_url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (urlParts) {
        try {
          const pr = await this.getPullRequest(urlParts[1], urlParts[2], parseInt(urlParts[3]));
          prs.push(pr);
        } catch (error) {
          console.error(`Failed to fetch PR details: ${error}`);
        }
      }
    }

    return prs;
  }

  async findPullRequestsByTicketKey(ticketKey: string, org?: string): Promise<GitHubPullRequest[]> {
    // Search for PRs that mention the ticket key in title or body
    let query = `"${ticketKey}" in:title,body`;
    if (org) {
      query += ` org:${org}`;
    }

    return this.searchPullRequests(query);
  }

  async getPullRequestsFromUrls(urls: string[]): Promise<GitHubPullRequest[]> {
    const prs: GitHubPullRequest[] = [];

    for (const url of urls) {
      // Parse GitHub PR URL
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (match) {
        try {
          const pr = await this.getPullRequest(match[1], match[2], parseInt(match[3]));
          prs.push(pr);
        } catch (error) {
          console.error(`Failed to fetch PR from URL ${url}: ${error}`);
        }
      }
    }

    return prs;
  }

  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "closed",
    perPage: number = 30
  ): Promise<GitHubPullRequest[]> {
    const prs = await this.fetch<GitHubApiPullRequest[]>(
      `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`
    );

    return prs.map((pr) => this.mapPullRequest(pr));
  }
}

export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  return new GitHubClient(config);
}
