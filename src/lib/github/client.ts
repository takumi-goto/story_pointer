import type {
  GitHubApiPullRequest,
  GitHubApiSearchResponse,
  GitHubApiReview,
  GitHubApiPullRequestFile,
  GitHubPullRequestWithFiles,
} from "./types";
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

  private mapPullRequest(pr: GitHubApiPullRequest, approvedAt?: string): GitHubPullRequest {
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
      approvedAt,
      daysToApprove: approvedAt ? calculateDaysBetween(createdAt, approvedAt) : undefined,
      author: pr.user.login,
    };
  }

  private async getFirstApprovalDate(owner: string, repo: string, prNumber: number): Promise<string | undefined> {
    try {
      const reviews = await this.fetch<GitHubApiReview[]>(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
      const approvals = reviews
        .filter(r => r.state === "APPROVED")
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      return approvals[0]?.submitted_at;
    } catch {
      return undefined;
    }
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    const [pr, approvedAt] = await Promise.all([
      this.fetch<GitHubApiPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`),
      this.getFirstApprovalDate(owner, repo, prNumber),
    ]);
    return this.mapPullRequest(pr, approvedAt);
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

  /**
   * Get the files changed in a pull request with their diffs
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubApiPullRequestFile[]> {
    return this.fetch<GitHubApiPullRequestFile[]>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
    );
  }

  /**
   * Get a pull request with its files/diff information
   */
  async getPullRequestWithFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequestWithFiles> {
    const [pr, files] = await Promise.all([
      this.fetch<GitHubApiPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`),
      this.getPullRequestFiles(owner, repo, prNumber),
    ]);

    return {
      number: pr.number,
      url: pr.html_url,
      title: pr.title,
      files,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    };
  }

  /**
   * Get pull requests with files from URLs
   */
  async getPullRequestsWithFilesFromUrls(urls: string[]): Promise<GitHubPullRequestWithFiles[]> {
    const results: GitHubPullRequestWithFiles[] = [];

    for (const url of urls) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (match) {
        try {
          const prWithFiles = await this.getPullRequestWithFiles(
            match[1],
            match[2],
            parseInt(match[3])
          );
          results.push(prWithFiles);
        } catch (error) {
          console.error(`Failed to fetch PR files from ${url}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * List repositories the token has access to
   */
  async listRepositories(perPage: number = 100): Promise<Array<{ fullName: string; private: boolean; updatedAt: string }>> {
    interface RepoItem {
      full_name: string;
      private: boolean;
      updated_at: string;
    }

    // Get repositories from the authenticated user
    const repos = await this.fetch<RepoItem[]>(`/user/repos?per_page=${perPage}&sort=updated&direction=desc`);

    return repos.map((repo) => ({
      fullName: repo.full_name,
      private: repo.private,
      updatedAt: repo.updated_at,
    }));
  }
}

export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  return new GitHubClient(config);
}
