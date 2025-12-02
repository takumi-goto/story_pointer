/**
 * MCP Tool Executor
 * Executes tools called by Gemini Function Calling
 */

import type { JiraClient } from "@/lib/jira/client";
import type { GitHubClient } from "@/lib/github/client";
import type {
  JiraTicketResult,
  PullRequestInfo,
  PullRequestFilesResult,
  CodeAnalysisResult,
  SearchPullRequestsResult,
  ListRecentPRsResult,
} from "./tools";

export interface MCPExecutorConfig {
  jiraClient: JiraClient;
  githubClient: GitHubClient | null;
}

export class MCPExecutor {
  private jiraClient: JiraClient;
  private githubClient: GitHubClient | null;

  constructor(config: MCPExecutorConfig) {
    this.jiraClient = config.jiraClient;
    this.githubClient = config.githubClient;
  }

  /**
   * Execute a tool call and return the result
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    console.log(`[MCP] Executing tool: ${toolName}`, JSON.stringify(args));

    switch (toolName) {
      case "get_jira_ticket":
        return this.getJiraTicket(args.ticketKey as string);

      case "get_ticket_pull_requests":
        return this.getTicketPullRequests(args.ticketKey as string);

      case "get_pull_request_files":
        return this.getPullRequestFiles(args.prUrl as string);

      case "analyze_code_changes":
        return this.analyzeCodeChanges(args.prUrl as string);

      case "search_pull_requests":
        return this.searchPullRequests(
          args.keywords as string,
          args.repo as string | undefined
        );

      case "list_recent_prs":
        return this.listRecentPRs(
          args.repo as string,
          args.count as number | undefined
        );

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Get Jira ticket details
   */
  private async getJiraTicket(ticketKey: string): Promise<JiraTicketResult> {
    const ticket = await this.jiraClient.getIssue(ticketKey);
    return {
      key: ticket.key,
      summary: ticket.summary,
      description:
        typeof ticket.description === "string"
          ? ticket.description.substring(0, 2000)
          : undefined,
      storyPoints: ticket.storyPoints,
      status: ticket.status,
      issueType: ticket.issueType,
    };
  }

  /**
   * Get pull requests associated with a Jira ticket
   */
  private async getTicketPullRequests(
    ticketKey: string
  ): Promise<PullRequestInfo[]> {
    console.log(`[MCP] get_ticket_pull_requests: チケット ${ticketKey} のPRを検索中...`);

    if (!this.githubClient) {
      console.log(`[MCP] get_ticket_pull_requests: GitHubクライアントなし`);
      return [];
    }

    const devInfo = await this.jiraClient.getDevInfo(ticketKey);
    const prUrls: string[] = [];

    if (devInfo?.detail) {
      for (const detail of devInfo.detail) {
        for (const repo of detail.repositories) {
          for (const pr of repo.pullRequests) {
            prUrls.push(pr.url);
          }
        }
      }
    }

    if (prUrls.length === 0) {
      console.log(`[MCP] get_ticket_pull_requests: ${ticketKey} に紐づくPRなし`);
      return [];
    }

    console.log(`[MCP] get_ticket_pull_requests: ${prUrls.length}件のPR URLを発見`);

    const prs = await this.githubClient.getPullRequestsFromUrls(prUrls);

    // Log found PRs for visibility
    console.log(`[MCP] get_ticket_pull_requests: ${ticketKey} に直接紐づくPR:`);
    prs.forEach((pr, i) => {
      console.log(`[MCP]   ${i + 1}. PR#${pr.number}: ${pr.title}`);
      console.log(`[MCP]      URL: ${pr.url}`);
      console.log(`[MCP]      変更: +${pr.additions}/-${pr.deletions} (${pr.fileCount}ファイル)`);
    });

    return prs.map((pr) => ({
      number: pr.number,
      url: pr.url,
      title: pr.title,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.fileCount,
    }));
  }

  /**
   * Get pull request files with diffs
   */
  private async getPullRequestFiles(
    prUrl: string
  ): Promise<PullRequestFilesResult | null> {
    if (!this.githubClient) {
      return null;
    }

    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      throw new Error(`Invalid PR URL: ${prUrl}`);
    }

    const [, owner, repo, prNumber] = match;
    const prWithFiles = await this.githubClient.getPullRequestWithFiles(
      owner,
      repo,
      parseInt(prNumber)
    );

    // Limit patch size to avoid token overflow
    const MAX_PATCH_LENGTH = 500;
    const MAX_FILES = 15;

    const files = prWithFiles.files.slice(0, MAX_FILES).map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch
        ? file.patch.length > MAX_PATCH_LENGTH
          ? file.patch.substring(0, MAX_PATCH_LENGTH) + "\n... (truncated)"
          : file.patch
        : undefined,
    }));

    return {
      prNumber: prWithFiles.number,
      prTitle: prWithFiles.title,
      totalAdditions: prWithFiles.additions,
      totalDeletions: prWithFiles.deletions,
      files,
    };
  }

  /**
   * Analyze code changes in a PR
   */
  private async analyzeCodeChanges(
    prUrl: string
  ): Promise<CodeAnalysisResult | null> {
    if (!this.githubClient) {
      return null;
    }

    const filesResult = await this.getPullRequestFiles(prUrl);
    if (!filesResult) {
      return null;
    }

    // Analyze file types
    const fileTypes: Record<string, number> = {};
    const modules = new Set<string>();
    const patterns: string[] = [];

    for (const file of filesResult.files) {
      // Count file types
      const ext = file.filename.split(".").pop() || "other";
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;

      // Extract module/directory
      const parts = file.filename.split("/");
      if (parts.length > 1) {
        modules.add(parts[0]);
        if (parts.length > 2) {
          modules.add(parts.slice(0, 2).join("/"));
        }
      }

      // Detect patterns from changes
      if (file.patch) {
        if (file.patch.includes("interface ") || file.patch.includes("type ")) {
          patterns.push("型定義の変更");
        }
        if (file.patch.includes("async ") || file.patch.includes("await ")) {
          patterns.push("非同期処理");
        }
        if (file.patch.includes("try {") || file.patch.includes("catch (")) {
          patterns.push("エラーハンドリング");
        }
        if (file.patch.includes("test(") || file.patch.includes("describe(")) {
          patterns.push("テストコード");
        }
        if (file.patch.includes("SELECT ") || file.patch.includes("INSERT ")) {
          patterns.push("データベース操作");
        }
      }
    }

    // Determine complexity
    let complexity: "low" | "medium" | "high" = "low";
    const totalChanges = filesResult.totalAdditions + filesResult.totalDeletions;
    const fileCount = filesResult.files.length;

    if (totalChanges > 500 || fileCount > 10 || modules.size > 3) {
      complexity = "high";
    } else if (totalChanges > 100 || fileCount > 5 || modules.size > 2) {
      complexity = "medium";
    }

    // Estimate effort
    let estimatedEffort = "小規模（0.5-1pt相当）";
    if (complexity === "high") {
      estimatedEffort = "大規模（5-8pt相当）";
    } else if (complexity === "medium") {
      estimatedEffort = "中規模（2-3pt相当）";
    }

    return {
      prNumber: filesResult.prNumber,
      summary: `${fileCount}ファイル変更、+${filesResult.totalAdditions}/-${filesResult.totalDeletions}行`,
      complexity,
      affectedModules: Array.from(modules).slice(0, 5),
      fileTypes,
      patterns: [...new Set(patterns)].slice(0, 5),
      estimatedEffort,
    };
  }

  /**
   * Search for pull requests by keywords
   */
  private async searchPullRequests(
    keywords: string,
    repo?: string
  ): Promise<SearchPullRequestsResult> {
    if (!this.githubClient) {
      console.log(`[MCP] search_pull_requests: GitHubクライアントなし`);
      return { query: keywords, count: 0, pullRequests: [] };
    }

    // Build search query
    let query = `${keywords} type:pr is:merged`;
    if (repo) {
      query += ` repo:${repo}`;
    }

    console.log(`[MCP] search_pull_requests: クエリ="${query}"`);

    const prs = await this.githubClient.searchPullRequests(query);

    // Log found PRs for visibility
    console.log(`[MCP] search_pull_requests: ${prs.length}件のPRが見つかりました`);
    prs.slice(0, 5).forEach((pr, i) => {
      console.log(`[MCP]   ${i + 1}. PR#${pr.number}: ${pr.title}`);
      console.log(`[MCP]      URL: ${pr.url}`);
      console.log(`[MCP]      変更: +${pr.additions}/-${pr.deletions} (${pr.fileCount}ファイル)`);
    });

    return {
      query,
      count: prs.length,
      pullRequests: prs.slice(0, 10).map((pr) => ({
        number: pr.number,
        url: pr.url,
        title: pr.title,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.fileCount,
        mergedAt: pr.mergedAt,
      })),
    };
  }

  /**
   * List recent merged PRs from a repository
   */
  private async listRecentPRs(
    repo: string,
    count?: number
  ): Promise<ListRecentPRsResult> {
    if (!this.githubClient) {
      console.log(`[MCP] list_recent_prs: GitHubクライアントなし`);
      return { repo, count: 0, pullRequests: [] };
    }

    const limit = Math.min(count || 20, 50);
    const [owner, repoName] = repo.split("/");

    if (!owner || !repoName) {
      throw new Error(`Invalid repo format: ${repo}. Expected 'owner/repo'`);
    }

    console.log(`[MCP] list_recent_prs: ${repo} から最近の${limit}件のマージ済みPRを取得中...`);

    const prs = await this.githubClient.getRepositoryPullRequests(
      owner,
      repoName,
      "closed",
      limit
    );

    // Filter to only merged PRs
    const mergedPRs = prs.filter((pr) => pr.mergedAt);

    console.log(`[MCP] list_recent_prs: ${mergedPRs.length}件のマージ済みPRを取得`);
    mergedPRs.slice(0, 10).forEach((pr, i) => {
      console.log(`[MCP]   ${i + 1}. PR#${pr.number}: ${pr.title}`);
      console.log(`[MCP]      URL: ${pr.url}`);
      console.log(`[MCP]      マージ日: ${pr.mergedAt}`);
    });

    return {
      repo,
      count: mergedPRs.length,
      pullRequests: mergedPRs.map((pr) => ({
        number: pr.number,
        url: pr.url,
        title: pr.title,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.fileCount,
        mergedAt: pr.mergedAt,
      })),
    };
  }
}

export function createMCPExecutor(config: MCPExecutorConfig): MCPExecutor {
  return new MCPExecutor(config);
}
