# Story Pointer

AIを活用したストーリーポイント推定ツール。過去のスプリントデータとPR情報を分析し、新しいチケットのストーリーポイントを推定します。

## 機能

- **AI推定**: Gemini APIを使用して、過去の実績データに基づくストーリーポイント推定
- **Jira連携**: スプリントデータ、チケット情報の自動取得
- **GitHub連携**: PR情報（ファイル数、コミット数、マージまでの日数）を分析に活用
- **カスタムプロンプト**: 推定ロジックのカスタマイズが可能
- **モデル選択**: 任意のGeminiモデルを指定可能

## 技術スタック

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS
- **State Management**: Zustand (LocalStorage永続化)
- **AI**: Google Generative AI (Gemini)
- **APIs**: Jira REST API, GitHub REST API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`を作成:

```env
# Jira設定（オプション - UIからも設定可能）
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# GitHub設定（オプション）
GITHUB_TOKEN=your-github-token

# Gemini API（必須）
GEMINI_API_KEY=your-gemini-api-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## 使い方

### 1. 設定

設定画面で以下を設定:

- **Jira設定**: ホスト、メール、APIトークン
- **GitHub設定**: トークン（オプション、PR情報取得用）
- **スプリント設定**: 分析対象のスプリント数、デフォルトボード
- **AIモデル**: 使用するGeminiモデル（デフォルト: gemini-2.5-pro）
- **プロンプト**: カスタム推定プロンプト

### 2. チケット検索

検索画面でチケットを検索:

- チケットキー（例: `PROJ-123`）
- Jira URL（例: `https://your-domain.atlassian.net/browse/PROJ-123`）
- キーワード検索

### 3. 推定実行

チケットを選択して「推定」ボタンをクリック。AIが以下を分析:

- チケットの説明・要件の複雑さ
- 類似チケットの過去実績
- 関連PRのメトリクス
- チームの過去ベロシティ
- 不確実性・リスク要因

### 4. 結果確認

推定結果には以下が含まれます:

- 推定ストーリーポイント（フィボナッチ: 0.5, 1, 2, 3, 5, 8, 13）
- 推定理由の詳細説明
- 信頼度スコア
- 各分析観点の寄与率
- 参考にしたチケット・PR
- 分割提案（13ポイント以上の場合）

## API設定の取得方法

### Jira API Token

1. https://id.atlassian.com/manage-profile/security/api-tokens にアクセス
2. 「APIトークンを作成」をクリック
3. トークン名を入力して作成

### GitHub Token

1. https://github.com/settings/tokens にアクセス
2. 「Generate new token (classic)」をクリック
3. `repo`スコープを選択して作成

### Gemini API Key

1. https://aistudio.google.com/app/apikey にアクセス
2. 「Create API Key」をクリック

## Docker

```bash
docker-compose up -d
```

## ライセンス

MIT
