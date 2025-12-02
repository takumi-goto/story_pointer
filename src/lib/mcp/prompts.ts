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

### 必須手順（この順番で必ず実行すること）

**Step 0: 関連PR検索（必須・最初に実行）**
推定を始める前に、まず以下を必ず実行してください：

1. search_pull_requests でチケットのキーワードからPRを検索
   - チケットの **説明** から対応内容と類似した作業をしているPRを時系列問わず検索する
   - **変更対象の機能・コンポーネント名**を抽出する（変更内容の技術用語ではなく）
   - 「XをAからBに変更」という記述があれば、「X」をキーワードにする（「A」「B」は補助的に使用）
   - 例: 「CSVダウンロードのデモグラの値をOpenSearch参照にする」
     → 検索キーワード: 「CSV」「デモグラ」「チャンネルリスト」
     → ❌ 「OpenSearch」「DB参照」だけで検索しない

   **⚠️ 必須: 上記「検索対象リポジトリ」に記載された全リポジトリに対して、それぞれ個別に検索を実行すること**
   - 1つのリポジトリだけ検索して終わりにしない
   - 例: リポジトリが2つあれば、search_pull_requestsを2回呼び出す

2. **キーワード検索で関連PRが見つからない場合**: list_recent_prs を使用
   - リポジトリから最近マージされたPR一覧を取得し、タイトルから関連しそうなPRを探す
   - 例: list_recent_prs({ repo: "eviry-private/kt-list-api", count: 30 })

3. 見つかったPRがあれば analyze_code_changes で作業量を確認
   - ファイル数、変更行数、複雑度を確認

4. get_ticket_pull_requests で対象チケット {targetTicketKey} 自体にPRがあるか確認
   - 例: get_ticket_pull_requests({ ticketKey: "{targetTicketKey}" })

**この検索を行わずにいきなり推定結果を出すのは禁止です。**

### その他のツール使用

- 対象チケットの説明に「KT-1234と同様」のような別チケットへの言及があれば：
  - その **実際のチケットキー**（例: KT-1234）で get_jira_ticket を呼び出す
  - 「KT-XXXX」「推定対象チケットのキー」等のプレースホルダーは使用禁止

### baseline選定の制限
**重要**: baseline選定は必ず「過去のスプリントデータ」セクションのチケットから行うこと。
ツールで取得した情報は作業量把握の参考として推定根拠に使えるが、baselineチケットには使わない。

---

`;
