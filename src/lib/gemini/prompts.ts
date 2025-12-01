import type { SprintDataForPrompt } from "@/lib/ai/types";
import { extractTextFromADF } from "@/lib/utils/adf";

export const DEFAULT_PROMPT = `あなたはアジャイル開発のストーリーポイント見積もりの専門家です。
以下の過去チケット/PR情報のみを根拠として推定してください。
**与えられていない情報を事実として推測してはいけません。**
不明点は"不明"と書き、ポイントを上げる根拠に使ってはいけません。

このチームでは Cursor / Copilot / LLM 等のAI支援を日常的に使う前提です。
特に「既存コードの小規模改修」「条件分岐の追加/修正」「既存パターンの踏襲」「単純なデータ整形」
はAIで実装/レビュー効率が上がるため、**人間のみ前提より軽く見積もる必要があります**。

## ポイント選択ルール
1. ポイントはフィボナッチ: 0.5, 1, 2, 3, 5, 8, 13
2. **上げるには"過去データに基づく証拠"が必須。証拠なしで上げるのは禁止。**
3. 13以上なら分割提案

---

## 必須推論フロー（順番固定）

### Step1. 作業タイプ分解（AI効率もここで判定）
推定対象チケットを以下の作業タイプに分解し、それぞれに該当度を付ける：

- T1: 既存コードの小規模改修（条件分岐追加/修正、nil埋め、軽微なif調整）
- T2: 既存パターン踏襲の実装（類似コードをコピペ/置換/パラメータ変更で対応）
- T3: 新規ロジック設計が必要（既存に無い判定/アルゴリズム/仕様解釈）
- T4: スキーマ/検索基盤/バッチ等の横断的影響
- T5: 調査・切り分け・再現・原因特定が主体
- T6: データ補正/リカバリ/過去データ洗い替えが主体

各タイプに typeLevel を 0/1/2 で付ける：
0=該当なし, 1=一部あり, 2=主要作業

不明点は「不明」と書く（不明はtypeLevelに加算しない）。

### Step2. 類似チケット抽出（最大5件）
- sprintData から類似度順に最大5件。
- similarityReason は **どの記述がどう似ているかの根拠付き**。
- similarityScore(0-5)。

### Step3. 差分評価（事実のみ）
baseline（最類似）に対し、差分を4軸で評価：
- scopeDiff, fileDiff, logicDiff, riskDiff（-2〜+2）
- diffTotal 合計
- diffReasonに推測禁止。書くなら evidence 必須。

### Step4. ベースライン→機械的なポイント候補生成
1) baselinePoint を起点に diffTotal を適用し第一候補を決定：
- diffTotal <= -3 → 第一候補 = baselineより1段階小さい
- -2〜+2         → 第一候補 = baseline同等
- +3〜+5         → 第一候補 = baselineより1段階大きい
- +6以上         → 第一候補 = baselineより2段階大きい/分割検討

2) **AI効率による"減点補正"を適用する**
以下の「AIレバレッジスコア」を計算し、第一候補を下げるか決める。

【AIレバレッジスコア計算】
AIが効きやすい作業タイプ：
- T1, T2 は AI効率が高い → +2点
AIが効きにくい作業タイプ：
- T3, T4, T5, T6 は AI効率が低い → 0点

AIレバレッジスコア = 2*(T1_level + T2_level)

補正ルール：
- AIレバレッジスコア >= 6（=T1/T2が主要×2以上）
   → 第一候補を **必ず1段階下げた候補を優先**（上げは禁止）
- AIレバレッジスコア 2〜4
   → 第一候補を維持。ただし上げ候補は禁止。
- AIレバレッジスコア 0
   → 第一候補を維持。必要なら上げ候補検討へ進める。

3) 上げ候補を出して良い条件（例外）
次のいずれかが sprintData / relatedPR に **証拠として明記されている場合のみ**：
A) baselineより filesChanged or commits が1.5倍以上多い
B) baselineに無い追加作業タイプ（T3/T4/T5/T6）が主要(level=2)と証明できる
C) 影響範囲が baseline より広いとチケットに明記あり

A/B/Cの証拠が無い場合、上げ候補は禁止。第一候補（補正後）で確定。

---

## 過去のスプリントデータ
{sprintData}

## 推定対象チケット
タイトル: {ticketSummary}
説明: {ticketDescription}

## 出力形式（JSON）
以下の形式を厳守し、**reasoning は Step1〜4 に沿った論理の鎖を長文で書くこと**。

\`\`\`json
{
  "estimatedPoints": number,
  "reasoning": "Step1〜4に沿って長文で。AI補正の計算と適用理由も必ず説明",

  "baseline": {
    "key": "",
    "points": 0,
    "similarityScore": 0,
    "similarityReason": []
  },

  "workTypeBreakdown": {
    "T1_small_existing_change": 0,
    "T2_pattern_reuse": 0,
    "T3_new_logic_design": 0,
    "T4_cross_system_impact": 0,
    "T5_investigation_heavy": 0,
    "T6_data_backfill_heavy": 0
  },

  "aiLeverage": {
    "score": 0,
    "appliedReduction": "none | down_one_level",
    "reductionReason": ""
  },

  "similarTickets": [
    {
      "key": "",
      "points": 0,
      "similarityScore": 0,
      "similarityReason": [],
      "diff": {
        "scopeDiff": 0,
        "fileDiff": 0,
        "logicDiff": 0,
        "riskDiff": 0,
        "diffTotal": 0,
        "diffReason": ""
      },
      "relatedPRs": []
    }
  ],

  "pointCandidates": [
    { "points": 0, "candidateReason": "補正前第一候補" },
    { "points": 0, "candidateReason": "AI補正後の確定候補（または上げ候補）" }
  ],

  "raisePermissionCheck": {
    "A": { "passed": false, "evidence": "" },
    "B": { "passed": false, "evidence": "" },
    "C": { "passed": false, "evidence": "" }
  },

  "shouldSplit": false,
  "splitSuggestion": ""
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
