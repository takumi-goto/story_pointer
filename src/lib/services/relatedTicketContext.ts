/**
 * Service to fetch related ticket context for better estimation
 * When a ticket references another ticket (e.g., "Do the same as KT-5920"),
 * this service fetches the referenced ticket's information and PRs.
 */

import type { JiraClient } from "@/lib/jira/client";
import type { GitHubClient } from "@/lib/github/client";
import type { GitHubPullRequestWithFiles } from "@/lib/github/types";
import {
  parseRelatedTicketReferences,
  findParentTicket,
  type RelatedTicketReference,
} from "@/lib/utils/ticketParser";

export interface RelatedTicketPR {
  number: number;
  url: string;
  title: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** Summary of modified files grouped by type/directory */
  fileSummary: string;
  /** Key file changes with patches (truncated for large diffs) */
  keyChanges: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    /** Truncated patch content */
    patch?: string;
  }>;
}

export interface RelatedTicketInfo {
  key: string;
  summary: string;
  description?: string;
  storyPoints?: number;
  relationship: RelatedTicketReference["relationship"];
  relationshipContext?: string;
  pullRequests: RelatedTicketPR[];
}

export interface RelatedTicketContext {
  /** The main parent/reference ticket */
  parentTicket?: RelatedTicketInfo;
  /** Other related tickets */
  relatedTickets: RelatedTicketInfo[];
  /** Summary for AI prompt */
  contextSummary: string;
}

const MAX_PATCH_LENGTH = 500;
const MAX_FILES_PER_PR = 10;

/**
 * Summarize file changes by directory/type
 */
function summarizeFiles(files: GitHubPullRequestWithFiles["files"]): string {
  const byDir: Record<string, number> = {};
  const byExt: Record<string, number> = {};

  for (const file of files) {
    // Group by directory
    const parts = file.filename.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    byDir[dir] = (byDir[dir] || 0) + 1;

    // Group by extension
    const ext = file.filename.split(".").pop() || "other";
    byExt[ext] = (byExt[ext] || 0) + 1;
  }

  const dirSummary = Object.entries(byDir)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dir, count]) => `${dir}: ${count}`)
    .join(", ");

  const extSummary = Object.entries(byExt)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `.${ext}: ${count}`)
    .join(", ");

  return `ディレクトリ別: [${dirSummary}], 拡張子別: [${extSummary}]`;
}

/**
 * Extract key changes from PR files
 */
function extractKeyChanges(
  files: GitHubPullRequestWithFiles["files"]
): RelatedTicketPR["keyChanges"] {
  // Prioritize files by importance: larger changes, source files over config
  const sortedFiles = [...files].sort((a, b) => {
    // Prioritize source files
    const isSourceA = /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(a.filename);
    const isSourceB = /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(b.filename);
    if (isSourceA && !isSourceB) return -1;
    if (!isSourceA && isSourceB) return 1;

    // Then by change size
    return b.changes - a.changes;
  });

  return sortedFiles.slice(0, MAX_FILES_PER_PR).map((file) => ({
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
}

/**
 * Map PR with files to RelatedTicketPR
 */
function mapPRWithFiles(pr: GitHubPullRequestWithFiles): RelatedTicketPR {
  return {
    number: pr.number,
    url: pr.url,
    title: pr.title,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    fileSummary: summarizeFiles(pr.files),
    keyChanges: extractKeyChanges(pr.files),
  };
}

/**
 * Fetch related ticket context for estimation
 */
export async function fetchRelatedTicketContext(
  ticketKey: string,
  ticketDescription: string,
  jiraClient: JiraClient,
  githubClient: GitHubClient | null,
  options: {
    maxRelatedTickets?: number;
  } = {}
): Promise<RelatedTicketContext> {
  const { maxRelatedTickets = 3 } = options;

  // Extract project key from ticket key (e.g., "KT" from "KT-6071")
  const projectKey = ticketKey.split("-")[0];

  // Parse related ticket references from description
  const references = parseRelatedTicketReferences(
    ticketDescription,
    ticketKey,
    projectKey
  );

  if (references.length === 0) {
    return {
      relatedTickets: [],
      contextSummary: "関連チケットが見つかりませんでした。",
    };
  }

  // Find the parent ticket
  const parentRef = findParentTicket(references);

  // Fetch ticket info for all references
  const ticketInfos: RelatedTicketInfo[] = [];

  for (const ref of references.slice(0, maxRelatedTickets + 1)) {
    try {
      const ticket = await jiraClient.getIssue(ref.key);

      // Get PR information if GitHub is configured
      let pullRequests: RelatedTicketPR[] = [];

      if (githubClient) {
        const devInfo = await jiraClient.getDevInfo(ref.key);
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

        if (prUrls.length > 0) {
          const prsWithFiles = await githubClient.getPullRequestsWithFilesFromUrls(prUrls);
          pullRequests = prsWithFiles.map(mapPRWithFiles);
        }
      }

      ticketInfos.push({
        key: ticket.key,
        summary: ticket.summary,
        description: typeof ticket.description === "string" ? ticket.description : undefined,
        storyPoints: ticket.storyPoints,
        relationship: ref.relationship,
        relationshipContext: ref.context,
        pullRequests,
      });
    } catch (error) {
      console.error(`Failed to fetch related ticket ${ref.key}:`, error);
    }
  }

  // Separate parent from other related tickets
  const parentTicket = parentRef
    ? ticketInfos.find((t) => t.key === parentRef.key)
    : undefined;
  const relatedTickets = ticketInfos.filter(
    (t) => !parentTicket || t.key !== parentTicket.key
  );

  // Generate context summary
  const contextSummary = generateContextSummary(parentTicket, relatedTickets);

  return {
    parentTicket,
    relatedTickets: relatedTickets.slice(0, maxRelatedTickets),
    contextSummary,
  };
}

/**
 * Generate a summary for the AI prompt
 */
function generateContextSummary(
  parentTicket?: RelatedTicketInfo,
  relatedTickets?: RelatedTicketInfo[]
): string {
  const lines: string[] = [];

  if (parentTicket) {
    lines.push(`【参照チケット: ${parentTicket.key}】`);
    lines.push(`タイトル: ${parentTicket.summary}`);
    if (parentTicket.storyPoints) {
      lines.push(`ストーリーポイント: ${parentTicket.storyPoints}`);
    }
    if (parentTicket.pullRequests.length > 0) {
      lines.push(`関連PR数: ${parentTicket.pullRequests.length}`);
      const totalChanges = parentTicket.pullRequests.reduce(
        (sum, pr) => sum + pr.additions + pr.deletions,
        0
      );
      const totalFiles = parentTicket.pullRequests.reduce(
        (sum, pr) => sum + pr.changedFiles,
        0
      );
      lines.push(`合計変更行数: ${totalChanges}, 変更ファイル数: ${totalFiles}`);

      // Add file summary from main PR
      if (parentTicket.pullRequests[0]) {
        lines.push(`主なPRの変更: ${parentTicket.pullRequests[0].fileSummary}`);
      }
    }
  }

  if (relatedTickets && relatedTickets.length > 0) {
    lines.push("");
    lines.push(`【その他の関連チケット: ${relatedTickets.length}件】`);
    for (const ticket of relatedTickets) {
      lines.push(`- ${ticket.key}: ${ticket.summary} (${ticket.storyPoints || "未設定"}pt)`);
    }
  }

  if (lines.length === 0) {
    return "関連チケットが見つかりませんでした。";
  }

  return lines.join("\n");
}

/**
 * Format related ticket context for AI prompt
 */
export function formatRelatedTicketContextForPrompt(
  context: RelatedTicketContext
): string {
  if (!context.parentTicket && context.relatedTickets.length === 0) {
    return "";
  }

  const lines: string[] = [
    "",
    "=== 関連チケット情報 ===",
    "このチケットは過去のチケットを参照しています。以下の情報を考慮して見積もりを行ってください。",
    "",
  ];

  if (context.parentTicket) {
    const parent = context.parentTicket;
    lines.push(`## 参照チケット: ${parent.key}`);
    lines.push(`タイトル: ${parent.summary}`);
    lines.push(`ストーリーポイント: ${parent.storyPoints || "未設定"}`);
    lines.push(`関連性: ${parent.relationship}`);
    if (parent.relationshipContext) {
      lines.push(`コンテキスト: ${parent.relationshipContext}`);
    }
    lines.push("");

    if (parent.pullRequests.length > 0) {
      lines.push("### 参照チケットのPR実装内容:");
      for (const pr of parent.pullRequests) {
        lines.push(`\nPR #${pr.number}: ${pr.title}`);
        lines.push(`変更: +${pr.additions}/-${pr.deletions}, ファイル数: ${pr.changedFiles}`);
        lines.push(`ファイル概要: ${pr.fileSummary}`);

        if (pr.keyChanges.length > 0) {
          lines.push("\n主な変更ファイル:");
          for (const change of pr.keyChanges) {
            lines.push(`- ${change.filename} (${change.status}: +${change.additions}/-${change.deletions})`);
            if (change.patch) {
              lines.push("```diff");
              lines.push(change.patch);
              lines.push("```");
            }
          }
        }
      }
    }
  }

  if (context.relatedTickets.length > 0) {
    lines.push("\n## その他の関連チケット:");
    for (const ticket of context.relatedTickets) {
      lines.push(`- ${ticket.key}: ${ticket.summary} (${ticket.storyPoints || "未設定"}pt)`);
    }
  }

  lines.push("\n=== 関連チケット情報ここまで ===\n");

  return lines.join("\n");
}
