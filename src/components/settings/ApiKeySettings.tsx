"use client";

import { useState, useEffect, useCallback } from "react";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useApiKeysStore } from "@/store/apiKeys";

interface EnvConfig {
  jiraHost: string | null;
  jiraEmail: string | null;
  jiraApiToken: string | null;
  jiraProjectKey: string | null;
  githubToken: string | null;
  githubOrg: string | null;
}

export default function ApiKeySettings() {
  const {
    jiraHost,
    jiraEmail,
    jiraApiToken,
    jiraProjectKey,
    githubToken,
    githubOrg,
    setJiraHost,
    setJiraEmail,
    setJiraApiToken,
    setJiraProjectKey,
    setGithubToken,
    setGithubOrg,
    clearJiraConfig,
    clearGithubConfig,
  } = useApiKeysStore();

  // Jira設定
  const [localJiraHost, setLocalJiraHost] = useState("");
  const [localJiraEmail, setLocalJiraEmail] = useState("");
  const [localJiraToken, setLocalJiraToken] = useState("");
  const [localJiraProjectKey, setLocalJiraProjectKey] = useState("");
  const [showJiraToken, setShowJiraToken] = useState(false);

  // GitHub設定
  const [localGithubToken, setLocalGithubToken] = useState("");
  const [localGithubOrg, setLocalGithubOrg] = useState("");
  const [showGithubToken, setShowGithubToken] = useState(false);

  const [saved, setSaved] = useState({ jira: false, github: false });
  const [mounted, setMounted] = useState(false);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(true);

  // .envから設定を取得
  const fetchEnvConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEnvConfig(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch env config:", error);
    } finally {
      setLoadingEnv(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchEnvConfig();
  }, [fetchEnvConfig]);

  useEffect(() => {
    if (!mounted || loadingEnv) return;

    // 優先順位: LocalStorage > .env
    // LocalStorageに値があればそれを使用、なければ.envの値を使用
    setLocalJiraHost(jiraHost || envConfig?.jiraHost || "");
    setLocalJiraEmail(jiraEmail || envConfig?.jiraEmail || "");
    setLocalJiraToken(jiraApiToken || envConfig?.jiraApiToken || "");
    setLocalJiraProjectKey(jiraProjectKey || envConfig?.jiraProjectKey || "");
    setLocalGithubToken(githubToken || envConfig?.githubToken || "");
    setLocalGithubOrg(githubOrg || envConfig?.githubOrg || "");
  }, [jiraHost, jiraEmail, jiraApiToken, jiraProjectKey, githubToken, githubOrg, mounted, loadingEnv, envConfig]);

  const handleSaveJira = () => {
    if (localJiraHost) setJiraHost(localJiraHost);
    if (localJiraEmail) setJiraEmail(localJiraEmail);
    if (localJiraToken) setJiraApiToken(localJiraToken);
    if (localJiraProjectKey) setJiraProjectKey(localJiraProjectKey);
    setSaved((prev) => ({ ...prev, jira: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, jira: false })), 2000);
  };

  const handleSaveGithub = () => {
    if (localGithubToken) setGithubToken(localGithubToken);
    if (localGithubOrg) setGithubOrg(localGithubOrg);
    setSaved((prev) => ({ ...prev, github: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, github: false })), 2000);
  };

  const handleClearJira = () => {
    clearJiraConfig();
    // クリア後は.envの値があればそれを表示
    setLocalJiraHost(envConfig?.jiraHost || "");
    setLocalJiraEmail(envConfig?.jiraEmail || "");
    setLocalJiraToken(envConfig?.jiraApiToken || "");
    setLocalJiraProjectKey(envConfig?.jiraProjectKey || "");
    setShowJiraToken(false);
  };

  const handleClearGithub = () => {
    clearGithubConfig();
    // クリア後は.envの値があればそれを表示
    setLocalGithubToken(envConfig?.githubToken || "");
    setLocalGithubOrg(envConfig?.githubOrg || "");
    setShowGithubToken(false);
  };

  // 現在有効な設定（LocalStorage優先、なければ.env）
  const effectiveJiraHost = jiraHost || envConfig?.jiraHost;
  const effectiveJiraEmail = jiraEmail || envConfig?.jiraEmail;
  const effectiveJiraToken = jiraApiToken || envConfig?.jiraApiToken;
  const effectiveGithubToken = githubToken || envConfig?.githubToken;

  const isJiraConfigured = !!(effectiveJiraHost && effectiveJiraEmail && effectiveJiraToken);
  const isGithubConfigured = !!effectiveGithubToken;

  // 変更があるかどうか
  const currentJiraHost = jiraHost || envConfig?.jiraHost || "";
  const currentJiraEmail = jiraEmail || envConfig?.jiraEmail || "";
  const currentJiraToken = jiraApiToken || envConfig?.jiraApiToken || "";
  const currentJiraProjectKey = jiraProjectKey || envConfig?.jiraProjectKey || "";
  const currentGithubToken = githubToken || envConfig?.githubToken || "";
  const currentGithubOrg = githubOrg || envConfig?.githubOrg || "";

  const hasJiraChanges =
    localJiraHost !== currentJiraHost ||
    localJiraEmail !== currentJiraEmail ||
    localJiraToken !== currentJiraToken ||
    localJiraProjectKey !== currentJiraProjectKey;

  const hasGithubChanges =
    localGithubToken !== currentGithubToken ||
    localGithubOrg !== currentGithubOrg;

  // .envから読み込まれているかどうか
  const isJiraFromEnv = !jiraHost && !!envConfig?.jiraHost;
  const isGithubFromEnv = !githubToken && !!envConfig?.githubToken;

  if (loadingEnv) {
    return (
      <Card>
        <CardTitle>接続設定</CardTitle>
        <CardDescription className="mb-6">
          設定を読み込み中...
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>接続設定</CardTitle>
      <CardDescription className="mb-6">
        各サービスへの接続情報を設定してください。設定はこのブラウザのローカルストレージに保存されます。
      </CardDescription>

      <div className="space-y-6">
        {/* Jira設定 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 text-lg">Jira設定</h4>
            <div className="flex items-center gap-2">
              {isJiraFromEnv && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">.envから読込</span>
              )}
              {isJiraConfigured ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">設定済み</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">未設定（必須）</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Jira Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jira Host <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="your-domain.atlassian.net"
                value={localJiraHost}
                onChange={(e) => setLocalJiraHost(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Atlassianのホスト名（例: your-domain.atlassian.net）
              </p>
            </div>

            {/* Jira Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jira Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="your-email@example.com"
                value={localJiraEmail}
                onChange={(e) => setLocalJiraEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Atlassianアカウントのメールアドレス
              </p>
            </div>

            {/* Jira API Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jira API Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showJiraToken ? "text" : "password"}
                  placeholder="Jira API Token を入力"
                  value={localJiraToken}
                  onChange={(e) => setLocalJiraToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowJiraToken(!showJiraToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  title={showJiraToken ? "非表示" : "表示"}
                >
                  {showJiraToken ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-jira-blue hover:underline"
                >
                  Atlassian アカウント設定
                </a>
                で作成できます
              </p>
            </div>

            {/* Jira Project Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jira Project Key
              </label>
              <Input
                type="text"
                placeholder="PROJ"
                value={localJiraProjectKey}
                onChange={(e) => setLocalJiraProjectKey(e.target.value.toUpperCase())}
              />
              <p className="mt-1 text-xs text-gray-500">
                デフォルトのプロジェクトキー（例: PROJ）
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveJira} disabled={!localJiraHost || !localJiraEmail || !localJiraToken || !hasJiraChanges}>
              {saved.jira ? "保存しました" : "保存"}
            </Button>
            {(jiraHost || jiraEmail || jiraApiToken || jiraProjectKey) && (
              <Button variant="outline" onClick={handleClearJira}>
                クリア
              </Button>
            )}
          </div>
        </div>

        {/* GitHub設定 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 text-lg">GitHub設定</h4>
            <div className="flex items-center gap-2">
              {isGithubFromEnv && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">.envから読込</span>
              )}
              {isGithubConfigured ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">設定済み</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">未設定（任意）</span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            PR情報の取得に使用します。設定するとより正確な推定が可能になります。
          </p>

          <div className="space-y-4">
            {/* GitHub Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <Input
                  type={showGithubToken ? "text" : "password"}
                  placeholder="GitHub Token を入力"
                  value={localGithubToken}
                  onChange={(e) => setLocalGithubToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  title={showGithubToken ? "非表示" : "表示"}
                >
                  {showGithubToken ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-jira-blue hover:underline"
                >
                  GitHub Settings
                </a>
                で作成できます（repoスコープが必要）
              </p>
            </div>

            {/* GitHub Org */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Organization
              </label>
              <Input
                type="text"
                placeholder="your-org"
                value={localGithubOrg}
                onChange={(e) => setLocalGithubOrg(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                PR検索時に絞り込む組織名（任意）
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveGithub} disabled={!hasGithubChanges}>
              {saved.github ? "保存しました" : "保存"}
            </Button>
            {(githubToken || githubOrg) && (
              <Button variant="outline" onClick={handleClearGithub}>
                クリア
              </Button>
            )}
          </div>
        </div>

        {/* Info Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>設定の優先順位:</strong> ブラウザに保存した設定 &gt; 環境変数(.env)
            <br />
            <span className="text-xs">環境変数が設定されている場合、自動的に読み込まれます。ブラウザで保存すると上書きされます。</span>
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong> ブラウザに保存した設定はローカルストレージに保存されます。
            共有PCでは使用後にクリアすることをお勧めします。
          </p>
        </div>
      </div>
    </Card>
  );
}
