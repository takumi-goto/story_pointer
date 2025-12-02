/**
 * MCP Tool definitions for GitHub integration
 * These tools are used with Gemini Function Calling
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

// Tool definitions for Gemini Function Calling
export const MCP_TOOLS: FunctionDeclaration[] = [
  {
    name: "get_jira_ticket",
    description: "Jiraからチケットの詳細情報を取得します。チケットのキー、タイトル、説明、ストーリーポイントなどを返します。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        ticketKey: {
          type: SchemaType.STRING,
          description: "JiraチケットのキーI（例: KT-1234）",
        },
      },
      required: ["ticketKey"],
    },
  },
  {
    name: "get_ticket_pull_requests",
    description: "Jiraチケットに関連するGitHub Pull Requestの一覧を取得します。PRのURL、タイトル、変更ファイル数、行数などを返します。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        ticketKey: {
          type: SchemaType.STRING,
          description: "JiraチケットのキーI（例: KT-1234）",
        },
      },
      required: ["ticketKey"],
    },
  },
  {
    name: "get_pull_request_files",
    description: "GitHub Pull Requestの変更ファイル一覧とdiffを取得します。どのファイルがどのように変更されたかを確認できます。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prUrl: {
          type: SchemaType.STRING,
          description: "GitHub PRのURL（例: https://github.com/org/repo/pull/123）",
        },
      },
      required: ["prUrl"],
    },
  },
  {
    name: "analyze_code_changes",
    description: "PRの変更内容を分析し、作業の複雑さや影響範囲を評価します。変更されたモジュール、ファイル種別、パターンなどを分析します。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prUrl: {
          type: SchemaType.STRING,
          description: "GitHub PRのURL",
        },
      },
      required: ["prUrl"],
    },
  },
  {
    name: "search_pull_requests",
    description: "GitHubでキーワードを使ってPull Requestを検索します。チケットの内容に関連するPRを探すのに使用します。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keywords: {
          type: SchemaType.STRING,
          description: "検索キーワード（例: 'CSV ダウンロード', 'OpenSearch 動画検索'）",
        },
        repo: {
          type: SchemaType.STRING,
          description: "リポジトリ名（例: 'eviry-private/kt-list-api'）。指定しない場合は全リポジトリから検索",
        },
      },
      required: ["keywords"],
    },
  },
  {
    name: "list_recent_prs",
    description: "リポジトリから最近マージされたPull Requestの一覧を取得します。キーワード検索でヒットしない場合や、最近の作業傾向を確認したい場合に使用します。",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        repo: {
          type: SchemaType.STRING,
          description: "リポジトリ名（例: 'eviry-private/kt-list-api'）",
        },
        count: {
          type: SchemaType.NUMBER,
          description: "取得するPR数（デフォルト: 20, 最大: 50）",
        },
      },
      required: ["repo"],
    },
  },
];

// Tool result types
export interface JiraTicketResult {
  key: string;
  summary: string;
  description?: string;
  storyPoints?: number;
  status: string;
  issueType: string;
}

export interface PullRequestInfo {
  number: number;
  url: string;
  title: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface PullRequestFilesResult {
  prNumber: number;
  prTitle: string;
  totalAdditions: number;
  totalDeletions: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

export interface CodeAnalysisResult {
  prNumber: number;
  summary: string;
  complexity: "low" | "medium" | "high";
  affectedModules: string[];
  fileTypes: Record<string, number>;
  patterns: string[];
  estimatedEffort: string;
}

export interface SearchPullRequestsResult {
  query: string;
  count: number;
  pullRequests: Array<{
    number: number;
    title: string;
    lines: string;  // e.g., "+100/-50"
    files: number;
  }>;
}

export interface ListRecentPRsResult {
  repo: string;
  count: number;
  pullRequests: Array<{
    number: number;
    title: string;
    lines: string;  // e.g., "+100/-50"
    files: number;
  }>;
}
