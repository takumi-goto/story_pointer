# Story Pointer - 実装計画

## 概要
Jira APIとGitHub APIを使用して、過去のスプリントデータからGemini AIでストーリーポイントを推定するNext.js 16アプリケーション

## 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.1+
- **Styling**: Tailwind CSS
- **Container**: Docker + Docker Compose
- **Deploy**: AWS Amplify
- **AI**: Google Gemini API
- **External APIs**: Jira REST API, GitHub API

---

## ディレクトリ構成

```
story_pointer/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .env.local (gitignore)
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # ホーム（リダイレクト）
│   │   ├── globals.css
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx                # Jiraログイン画面
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                # メインダッシュボード
│   │   │
│   │   ├── search/
│   │   │   └── page.tsx                # チケット検索画面
│   │   │
│   │   ├── estimate/
│   │   │   └── [ticketId]/
│   │   │       └── page.tsx            # ポイント推定結果画面
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx                # 設定画面（スプリント数、プロンプト）
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts      # Jira認証
│   │       │   ├── logout/route.ts
│   │       │   └── session/route.ts
│   │       │
│   │       ├── jira/
│   │       │   ├── sprints/route.ts    # スプリント一覧取得
│   │       │   ├── tickets/route.ts    # チケット取得
│   │       │   ├── search/route.ts     # チケット検索
│   │       │   └── boards/route.ts     # ボード一覧
│   │       │
│   │       ├── github/
│   │       │   └── pulls/route.ts      # PR情報取得
│   │       │
│   │       └── estimate/
│   │           └── route.ts            # Gemini API分析
│   │
│   ├── components/
│   │   ├── ui/                         # 共通UIコンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Modal.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   │
│   │   ├── search/
│   │   │   ├── SearchForm.tsx
│   │   │   └── TicketList.tsx
│   │   │
│   │   ├── estimate/
│   │   │   ├── EstimateResult.tsx
│   │   │   ├── ReferenceTickets.tsx
│   │   │   └── SplitSuggestion.tsx
│   │   │
│   │   └── settings/
│   │       ├── SprintSettings.tsx
│   │       └── PromptEditor.tsx
│   │
│   ├── lib/
│   │   ├── jira/
│   │   │   ├── client.ts               # Jira APIクライアント
│   │   │   ├── types.ts                # Jira型定義
│   │   │   └── queries.ts              # JQL クエリビルダー
│   │   │
│   │   ├── github/
│   │   │   ├── client.ts               # GitHub APIクライアント
│   │   │   └── types.ts
│   │   │
│   │   ├── gemini/
│   │   │   ├── client.ts               # Gemini APIクライアント
│   │   │   ├── prompts.ts              # デフォルトプロンプト
│   │   │   └── types.ts
│   │   │
│   │   ├── secrets/
│   │   │   └── manager.ts              # AWS Secrets Manager / .env 切り替え
│   │   │
│   │   └── utils/
│   │       ├── date.ts                 # 日付計算
│   │       └── fibonacci.ts            # フィボナッチ数列関連
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useJira.ts
│   │   ├── useEstimate.ts
│   │   └── useSettings.ts
│   │
│   ├── store/
│   │   ├── auth.ts                     # 認証状態
│   │   └── settings.ts                 # 設定状態（スプリント数、プロンプト）
│   │
│   └── types/
│       └── index.ts                    # 共通型定義
│
└── amplify/
    └── (Amplify設定ファイル)
```

---

## 実装タスク

### Phase 1: プロジェクト基盤構築

#### Task 1.1: プロジェクト初期化
- [ ] Next.js 16プロジェクト作成
- [ ] TypeScript設定
- [ ] Tailwind CSS設定
- [ ] ESLint/Prettier設定

#### Task 1.2: Docker環境構築
- [ ] Dockerfile作成
- [ ] docker-compose.yml作成
- [ ] .env.example作成

#### Task 1.3: 基本レイアウト
- [ ] 共通レイアウト（Header, Sidebar）
- [ ] 共通UIコンポーネント

---

### Phase 2: 認証・API基盤

#### Task 2.1: Secrets Manager統合
- [ ] lib/secrets/manager.ts実装
- [ ] 環境変数の切り替えロジック

#### Task 2.2: Jira認証
- [ ] Jira APIクライアント実装
- [ ] ログイン画面実装
- [ ] セッション管理

#### Task 2.3: GitHub API統合
- [ ] GitHub APIクライアント実装
- [ ] PR情報取得ロジック

---

### Phase 3: データ取得機能

#### Task 3.1: スプリントデータ取得
- [ ] ボード一覧API
- [ ] スプリント一覧API
- [ ] 過去Nスプリントのチケット取得

#### Task 3.2: チケット詳細取得
- [ ] チケット情報取得
- [ ] ストーリーポイント取得
- [ ] オープン〜完了日数計算

#### Task 3.3: PR情報取得
- [ ] JiraチケットからPRリンク取得
- [ ] ファイル数取得
- [ ] コミット数取得
- [ ] オープン〜マージ日数計算

#### Task 3.4: チケット検索
- [ ] JQL検索API
- [ ] タイトル・説明での検索

---

### Phase 4: AI分析機能

#### Task 4.1: Gemini API統合
- [ ] Gemini APIクライアント実装
- [ ] デフォルトプロンプト作成

#### Task 4.2: ポイント推定ロジック
- [ ] 過去データの整形
- [ ] プロンプト組み立て
- [ ] レスポンス解析

#### Task 4.3: 結果表示
- [ ] ポイント推定結果画面
- [ ] 参考チケット・PRリンク表示
- [ ] 分割提案UI（13ポイント以上）

---

### Phase 5: 設定機能

#### Task 5.1: スプリント数設定
- [ ] 設定画面UI
- [ ] LocalStorage保存

#### Task 5.2: プロンプト編集
- [ ] プロンプトエディタUI
- [ ] デフォルトに戻す機能

---

### Phase 6: デプロイ準備

#### Task 6.1: AWS Amplify設定
- [ ] amplify.yml作成
- [ ] 環境変数設定
- [ ] Secrets Manager連携

---

## API設計

### POST /api/auth/login
```typescript
// Request
{
  jiraHost: string,      // e.g., "your-domain.atlassian.net"
  email: string,
  apiToken: string
}

// Response
{
  success: boolean,
  user: { email: string, displayName: string }
}
```

### GET /api/jira/sprints
```typescript
// Query: ?boardId=123&count=10

// Response
{
  sprints: [{
    id: number,
    name: string,
    startDate: string,
    endDate: string,
    tickets: [{
      key: string,
      summary: string,
      storyPoints: number,
      status: string,
      created: string,
      resolved: string,
      daysToComplete: number
    }]
  }]
}
```

### GET /api/github/pulls
```typescript
// Query: ?ticketKey=PROJ-123

// Response
{
  pulls: [{
    url: string,
    title: string,
    fileCount: number,
    commitCount: number,
    daysToMerge: number,
    createdAt: string,
    mergedAt: string
  }]
}
```

### POST /api/estimate
```typescript
// Request
{
  ticketKey: string,
  ticketSummary: string,
  ticketDescription: string,
  sprintCount: number,
  customPrompt?: string
}

// Response
{
  estimatedPoints: 0.5 | 1 | 2 | 3 | 5 | 8 | 13,
  reasoning: string,
  shouldSplit: boolean,
  splitSuggestion?: string,
  references: [{
    type: "ticket" | "pull_request",
    key: string,
    url: string,
    points?: number,
    summary: string
  }]
}
```

---

## Gemini プロンプト（デフォルト）

```
あなたはアジャイル開発のストーリーポイント見積もりの専門家です。

以下の過去のチケットデータとPR情報を参考に、新しいチケットのストーリーポイントを推定してください。

## ルール
1. ポイントはフィボナッチ数列: 0.5, 1, 2, 3, 5, 8, 13 から選択
2. 2つのポイントで迷った場合は、必ず大きい方を選択
3. 13ポイント以上になりそうな場合は、チケット分割を提案

## 分析観点
- チケットの説明・要件の複雑さ
- 類似チケットの実績ポイントと完了日数
- 類似PRのファイル数・コミット数・マージまでの日数

## 過去のスプリントデータ
{sprintData}

## 推定対象チケット
タイトル: {ticketSummary}
説明: {ticketDescription}

## 出力形式（JSON）
{
  "estimatedPoints": number,
  "reasoning": "推定理由の詳細",
  "shouldSplit": boolean,
  "splitSuggestion": "分割が必要な場合の提案",
  "references": [
    {
      "type": "ticket" | "pull_request",
      "key": "チケットキーまたはPR番号",
      "url": "リンク",
      "points": "参考ポイント（チケットの場合）",
      "summary": "概要"
    }
  ]
}
```

---

## 環境変数

```env
# Jira
JIRA_HOST=your-domain.atlassian.net

# GitHub
GITHUB_TOKEN=ghp_xxxx

# Gemini
GEMINI_API_KEY=xxxx

# AWS (本番のみ)
AWS_REGION=ap-northeast-1
AWS_SECRET_NAME=story-pointer/secrets

# App
NODE_ENV=development
```

---

## 注意事項

1. **セキュリティ**: APIトークンはサーバーサイドのみで使用し、クライアントに露出させない
2. **レート制限**: Jira/GitHub APIのレート制限を考慮したキャッシング
3. **エラーハンドリング**: API失敗時の適切なフォールバック
4. **Next.js 16対応**:
   - `await params`の使用
   - Turbopackの活用
   - `"use cache"`ディレクティブの活用
