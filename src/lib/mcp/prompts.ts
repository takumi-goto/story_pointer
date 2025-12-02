/**
 * Default MCP prompt template for tool usage instructions
 * Used by GeminiMCPEstimationClient and settings UI
 */
export const DEFAULT_MCP_PROMPT = `## ツール使用について（必須）

あなたは以下のツールを使って情報を収集できます：

{toolDocs}

### 推定対象チケット
チケットキー: **{targetTicketKey}**

### 検索対象リポジトリ
{repositories}

### 必須手順

**Step 0: 類似作業のPR検索（作業量の参考用）**

推定対象チケットはまだ実装前なので、**過去の類似作業のPR**を探して作業量を把握します：

1. search_pull_requests で**類似機能・コンポーネント**に関する過去PRを検索
   - チケットの説明から変更対象の機能名を理解する。特に「対応内容」というセクションの内容を重視すること

   - 似たような作業がPRの概要欄に書かれているものを探すこと
   - チケットにファイル名がある場合は、そのファイル名の修正をしたPRを探すこと

   例:
   - search_pull_requests({ repo: "org/repo-api", keywords: "PlaylistItems" })
   - search_pull_requests({ repo: "org/repo-front", keywords: "YouTube" })

   **⚠️ 検索対象リポジトリすべてに対して検索すること**

2. 見つからない場合: list_recent_prs で最近のPRを確認
   例: list_recent_prs({ repo: "org/repo-api", count: 30 })

3. 見つかったPRがあれば analyze_code_changes で作業量を確認
   例: analyze_code_changes({ repo: "org/repo-api", prNumber: 123 })

### 禁止事項

- **get_ticket_pull_requests({targetTicketKey}) は呼び出し禁止**
  - 推定対象チケットはまだ実装前なのでPRは存在しない
  - 過去の類似PRは search_pull_requests で検索すること

### その他のツール使用

- 対象チケットの説明に「KT-1234と同様」のような別チケットへの言及があれば：
  - その **実際のチケットキー**（例: KT-1234）で get_jira_ticket を呼び出す
  - 「KT-XXXX」「推定対象チケットのキー」等のプレースホルダーは使用禁止

### baseline選定の制限
**重要**: baseline選定は必ず「過去のスプリントデータ」セクションのチケットから行うこと。
ツールで取得した情報は作業量把握の参考として推定根拠に使えるが、baselineチケットには使わない。

---

### ⚠️ 最重要: ツール実行後の必須タスク

ツール実行が完了したら、**必ず以下を行うこと**：

1. **baseline選定**: 「過去のスプリントデータ」から作業量が類似するチケットを選ぶ
   - baseline が N/A や空は **絶対禁止**
   - スプリントデータには必ず類似チケットが存在する
   - WorkloadSimilarityScore を計算して最も高いものを選ぶ

2. **similarTickets**: 最低3件以上の類似チケットを抽出する
   - 空の配列は **禁止**

3. **JSON出力**: 全フィールドを埋めた完全なJSONを出力する

---

`;
