import type { SprintDataForPrompt } from "./types";
import { extractTextFromADF } from "@/lib/utils/adf";

export const DEFAULT_PROMPT = `あなたはアジャイル開発のストーリーポイント見積もりの専門家です。

以下の過去のチケットデータとPR情報を参考に、新しいチケットのストーリーポイントを推定してください。

## ルール
1. ポイントはフィボナッチ数列: 0.5, 1, 2, 3, 5, 8, 13 から選択
2. 2つのポイントで迷った場合は、必ず大きい方を選択
3. 13ポイント以上になりそうな場合は、チケット分割を提案

## 分析観点と寄与率
以下の5つの観点から分析し、それぞれの寄与率(0-100)を算出してください：
- descriptionComplexity: チケットの説明・要件の複雑さ
- similarTickets: 類似チケットの実績ポイントとの類似度
- prMetrics: 類似PRのファイル数・コミット数・マージまでの日数
- historicalVelocity: チームの過去の完了速度との整合性
- uncertainty: 不確実性・リスク要因

各参考チケット・PRにも寄与率(contributionWeight)を0-100で設定してください。
寄与率は、その参考情報がポイント推定にどれだけ影響したかを示します。

## 過去のスプリントデータ
{sprintData}

## 推定対象チケット
タイトル: {ticketSummary}
説明: {ticketDescription}

## 出力形式（JSON）
必ず以下の形式で出力してください：
\`\`\`json
{
  "estimatedPoints": number,
  "reasoning": "推定理由の詳細（日本語）",
  "shouldSplit": boolean,
  "splitSuggestion": "分割が必要な場合の提案（日本語）",
  "confidence": number (0-100),
  "contributionFactors": {
    "descriptionComplexity": number (0-100),
    "similarTickets": number (0-100),
    "prMetrics": number (0-100),
    "historicalVelocity": number (0-100),
    "uncertainty": number (0-100)
  },
  "references": [
    {
      "type": "ticket" | "pull_request",
      "key": "チケットキーまたはPR番号",
      "url": "リンク",
      "points": number (チケットの場合のみ),
      "summary": "概要（日本語）",
      "contributionWeight": number (0-100)
    }
  ]
}
\`\`\``;

export function buildPrompt(
  basePrompt: string,
  sprintData: SprintDataForPrompt[],
  ticketSummary: string,
  ticketDescription: string
): string {
  const sprintDataStr = JSON.stringify(sprintData, null, 2);

  return basePrompt
    .replace("{sprintData}", sprintDataStr)
    .replace("{ticketSummary}", ticketSummary)
    .replace("{ticketDescription}", ticketDescription || "説明なし");
}

export function formatSprintData(
  sprints: Array<{
    name: string;
    tickets: Array<{
      key: string;
      summary: string;
      description?: string;
      storyPoints?: number;
      daysToComplete?: number;
    }>;
    pullRequests?: Map<
      string,
      Array<{
        url: string;
        fileCount: number;
        commitCount: number;
        daysToMerge?: number;
      }>
    >;
  }>
): SprintDataForPrompt[] {
  return sprints.map((sprint) => ({
    sprintName: sprint.name,
    tickets: sprint.tickets.map((ticket) => ({
      key: ticket.key,
      summary: ticket.summary,
      description: extractTextFromADF(ticket.description).substring(0, 500), // Truncate long descriptions
      storyPoints: ticket.storyPoints,
      daysToComplete: ticket.daysToComplete,
      pullRequests: sprint.pullRequests?.get(ticket.key) || [],
    })),
  }));
}
