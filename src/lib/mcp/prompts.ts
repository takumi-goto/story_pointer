/**
 * Default MCP prompt template
 * {toolDocs} will be replaced with available tools documentation
 * {targetTicketKey} will be replaced with the actual target ticket key
 * {repositories} will be replaced with the list of repositories to search
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
   - チケットの **タイトルと説明** から主要キーワード（日本語OK）を抽出して検索
   - 技術用語、機能名、コンポーネント名などを優先的に抽出
   - 上記の「検索対象リポジトリ」それぞれに対して検索を実行すること
   - 例: search_pull_requests({ keywords: "CSV ダウンロード", repo: "eviry-private/kt-list-api" })

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

### Step2. 類似チケット抽出（作業内容のみ／語彙根拠は禁止）

**最重要ルール:**
- 類似理由に「同じドメイン/同じ画面/同じキーワード（例: OpenSearch, デモグラ）」を使うことを禁止。
- それらは"作業内容の証拠"にならない。書いた時点で減点対象。

#### 2-1. 作業タイプ一致で候補を一次フィルタ
Step1で付けた T1〜T6 のパターンを「作業タイプ指紋」と呼ぶ。
候補チケットにも同じT1〜T6指紋を推定し、以下でフィルタする。

【TypeFilter条件】
- 推定対象で level=2 の作業タイプが
  候補でも level>=1 で **1つ以上一致しない候補は除外**。
- 逆に候補側で level=2 の T3/T4/T5/T6 が立っている場合、
  推定対象がそれらを持たなければ **重すぎる候補として除外**。

→ ここで残ったものだけを "類似候補" としてスコア付けする。

#### 2-2. 作業量類似スコア（0-10）を算出
WorkloadSimilarityScore = W1+W2+W3+W4 （W5は廃止）

W1 作業タイプ一致度 (0-6)
- T1〜T6の一致度だけで評価。
  完全一致=6 / ほぼ一致=5 / 一部一致=3 / 弱一致=1 / 不一致=0
- **語彙・ドメインに関する記述はW1評価に含めない。**

W2 影響規模一致度 (0-2)
- changedModulesEstimate / changedFilesEstimate の規模カテゴリが近いほど高い。
  同規模=2 / 近い=1 / 遠い or 不明=0

W3 調査・リカバリ一致度 (0-1)
- T5/T6 の有無が一致するほど高い。
  一致=1 / 不一致 or 不明=0

W4 PR作業量一致度 (0-1) ※PR実績が"数値で"取れている場合のみ
- filesChanged/commits/leadTime が近い=1、そうでなければ0
- **PRメトリクスが取れない候補はW4=0で固定。語彙で補うのは禁止。**

#### 2-3. baseline選定
- WorkloadSimilarityScore 最大の候補を baseline とする。
- **ポイント差が2段階以上（例: 3pt候補があるのに13ptが最大など）の候補はbaseline禁止。**
  その場合は次点をbaselineにする。

---

`;
