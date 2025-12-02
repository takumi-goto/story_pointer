import type { SprintDataForPrompt } from "@/lib/ai/types";
import { extractTextFromADF } from "@/lib/utils/adf";

export const DEFAULT_PROMPT = `あなたはアジャイル開発のストーリーポイント見積もりの専門家です。
以下の過去チケット/PR情報のみを根拠として推定してください。
**与えられていない情報を事実として推測してはいけません。**
不明点は"不明"と書き、ポイントを上げる根拠に使ってはいけません。

このチームでは Cursor / Copilot / LLM 等のAI支援を日常的に使う前提です。
特に「既存コードの小規模改修」「条件分岐の追加/修正」「既存パターンの踏襲」
はAIで効率化されるため軽く見積もります。

## ポイント選択ルール
1. ポイントはフィボナッチ: 0.5, 1, 2, 3, 5, 8, 13
2. 上げるには"過去データに基づく明確な証拠"が必須。証拠なしで上げるのは禁止。
3. 13以上なら分割提案

---

## 必須推論フロー（順番固定）

### Step1. 作業タイプ分解（作業量の骨格を作る）
推定対象チケットを以下の作業タイプに分解し、それぞれ typeLevel を 0/1/2で付ける。
0=該当なし, 1=一部あり, 2=主要作業

- T1: 既存コードの小規模改修（条件分岐追加/修正、nil埋め、軽微なif調整）
- T2: 既存パターン踏襲の実装（類似コードの置換/パラメータ変更中心）
- T3: 新規ロジック設計が必要（既存に無い判定/アルゴリズム/仕様解釈）
- T4: スキーマ/検索基盤/バッチ等の横断的影響
- T5: 調査・原因特定が主体
- T6: データ補正/過去データ洗い替え/リカバリが主体

さらに作業量特徴を推定対象について書く（不明なら"不明"）：
- changedModulesEstimate: 影響モジュール/クラス数の見積（1/2-3/4+ or 不明）
- changedFilesEstimate: 影響ファイル数の見積（1/2-3/4+ or 不明）
- needQueryOrBackfill: SQL実行/データ洗い替えが必要か（yes/no/不明）

### Step2. 類似チケット抽出（語彙より作業量優先）
**重要: baselineは必ず下記の「過去のスプリントデータ」セクションに記載されているチケットから選ぶこと。**
**スプリントデータに存在しないチケットをbaselineに使用するのは禁止。**
sprintData から最大10件抽出するが、**類似度は次の「作業量類似スコア」だけで決める。**
語彙/ドメイン一致は補助評価であり、これでベースラインを決めてはいけない。

各候補について以下を算出：

【WorkloadSimilarityScore(0-10) = W1+W2+W3+W4+W5】

W1 作業タイプ一致度 (0-4)
- 推定対象の T1〜T6 のパターンと候補がどれだけ一致するか
  完全一致=4, ほぼ一致=3, 一部一致=2, ほぼ不一致=1, 不一致=0

W2 影響範囲一致度(0-2)
- changedModulesEstimate / changedFilesEstimate の規模カテゴリーが近いほど高い
  同規模=2, 近い=1, 遠い/不明=0

W3 調査/リカバリ有無一致度(0-2)
- needQueryOrBackfill や T5/T6 の有無が一致するほど高い
  一致=2, 近い=1, 不一致/不明=0

W4 PR作業量一致度(0-2) ※候補にPR実績がある場合のみ
- relatedPRs の filesChanged/commits/leadTime が
  推定対象の作業量感と近いほど高い
  近い=2, まあ近い=1, 遠い/不明=0

W5 語彙/ドメイン一致度(0-0.5)
- タイトルや領域の一致は最大0.5点の"おまけ"
  ※この点だけで上位にならないよう重みを極小にする

- 各候補に WorkloadSimilarityScore を必ず記載し、
  **最大スコアのものを baseline とする。**
- もし語彙一致が強くても WorkloadSimilarityScore が低いものは baseline に禁止。

### Step3. 差分評価（baselineと推定対象を比較）
各項目を -2〜+2 で評価。0=同等、+は推定対象が大きい、-は小さい。
**情報が不足していてもチケット説明から読み取れる範囲で必ず評価すること。全て0は禁止。**

- scopeDiff: 影響範囲の差
  +2: 推定対象の方が明らかに広い（複数モジュール/API追加）
  +1: やや広い
  0: 同等
  -1: やや狭い
  -2: 推定対象の方が明らかに狭い（単一箇所の修正）

- fileDiff: 影響ファイル数の差（PR実績があれば参照）
  +2: 推定対象の方が多い（4+ファイル差）
  +1: やや多い（2-3ファイル差）
  0: 同等
  -1: やや少ない
  -2: 推定対象の方が明らかに少ない

- logicDiff: ロジック複雑度の差
  +2: 推定対象に新規設計/アルゴリズム実装あり、baselineにはない
  +1: やや複雑
  0: 同等
  -1: やや単純
  -2: 推定対象は既存パターン踏襲のみ、baselineは新規設計あり

- riskDiff: リスクの差
  +2: 推定対象にデータ変更/横断影響あり、baselineにはない
  +1: ややリスク高い
  0: 同等
  -1: ややリスク低い
  -2: 推定対象はリスク低い（表示のみ等）、baselineはリスク高い

### Step4. baselinePoint → 第一候補 → AI補正 → 確定
1) diffTotalで第一候補を機械的に決定：
- diffTotal <= -3 → 第一候補 = baselineより1段階小さい
- -2〜+2         → 第一候補 = baseline同等
- +3〜+5         → 第一候補 = baselineより1段階大きい
- +6以上         → 第一候補 = baselineより2段階大きい / 分割検討

2) AIレバレッジ補正（軽くする方向のみ）
AIレバレッジスコア = 2*(T1_level + T2_level)

- スコア >= 6 → 第一候補を必ず1段階下げて確定（上げ候補は禁止）
- スコア 2〜4 → 第一候補維持（上げ候補は禁止）
- スコア 0     → 第一候補維持。必要なら上げ候補検討へ。

3) 上げ候補は例外（証拠必須）
A) baselineより filesChanged or commits が1.5倍以上多い証拠
B) baselineに無い追加作業タイプ（T3/T4/T5/T6が主要level=2）が証明できる
C) 影響範囲がbaselineより広いとチケットに明記あり

A/B/C証拠が無ければ上げ候補は禁止。第一候補（補正後）で確定。

---

## 過去のスプリントデータ
{sprintData}

## 推定対象チケット
タイトル: {ticketSummary}
説明: {ticketDescription}

## 出力形式（JSON）
\`\`\`json
{
  "estimatedPoints": number,
  "reasoning": "Step1〜4に沿って長文で。WorkloadSimilarityScoreの内訳とbaseline選定根拠を必ず説明",

  "workTypeBreakdown": {
    "T1_small_existing_change": 0,
    "T2_pattern_reuse": 0,
    "T3_new_logic_design": 0,
    "T4_cross_system_impact": 0,
    "T5_investigation_heavy": 0,
    "T6_data_backfill_heavy": 0
  },
  "workloadFeatures": {
    "changedModulesEstimate": "1 | 2-3 | 4+ | 不明",
    "changedFilesEstimate": "1 | 2-3 | 4+ | 不明",
    "needQueryOrBackfill": "yes | no | 不明"
  },

  "baseline": {
    "key": "",
    "summary": "チケットのタイトルをそのまま記載",
    "points": 0,
    "workloadSimilarityScore": 0,
    "workloadSimilarityBreakdown": {
      "W1_typeMatch": 0,
      "W2_scopeMatch": 0,
      "W3_investigationMatch": 0,
      "W4_prWorkloadMatch": 0,
      "W5_lexicalBonus": 0
    },
    "similarityReason": []
  },

  "similarTickets": [
    {
      "key": "",
      "summary": "チケットのタイトルをそのまま記載",
      "points": 0,
      "workloadSimilarityScore": 0,
      "workloadSimilarityBreakdown": {
        "W1_typeMatch": 0,
        "W2_scopeMatch": 0,
        "W3_investigationMatch": 0,
        "W4_prWorkloadMatch": 0,
        "W5_lexicalBonus": 0
      },
      "similarityReason": [],
      "diff": {
        "scopeDiff": 0, "fileDiff": 0, "logicDiff": 0, "riskDiff": 0,
        "diffTotal": 0, "diffReason": ""
      },
      "relatedPRs": []
    }
  ],

  "aiLeverage": {
    "score": 0,
    "appliedReduction": "none | down_one_level",
    "reductionReason": ""
  },

  "pointCandidates": [
    { "points": 0, "candidateReason": "補正前第一候補" },
    { "points": 0, "candidateReason": "AI補正後の確定候補 or 例外上げ候補" }
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
        daysToApprove?: number;
      }>
    >;
  }>
): SprintDataForPrompt[] {
  return sprints.map((sprint) => ({
    sprintName: sprint.name,
    tickets: sprint.tickets.map((ticket) => ({
      key: ticket.key,
      summary: ticket.summary,
      description: extractTextFromADF(ticket.description).substring(0, 5000),
      storyPoints: ticket.storyPoints,
      daysToComplete: ticket.daysToComplete,
      pullRequests: sprint.pullRequests?.get(ticket.key) || [],
    })),
  }));
}
