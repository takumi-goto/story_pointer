"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useApiKeysStore } from "@/store/apiKeys";

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

interface EnvConfig {
  jiraHost: string | null;
  jiraEmail: string | null;
  jiraApiToken: string | null;
  jiraProjectKey: string | null;
  githubToken: string | null;
  githubOrg: string | null;
}

export default function ApiKeyGuard({ children }: ApiKeyGuardProps) {
  const router = useRouter();
  const {
    jiraHost,
    jiraEmail,
    jiraApiToken,
    githubToken,
  } = useApiKeysStore();
  const [mounted, setMounted] = useState(false);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchEnvConfig();
  }, [fetchEnvConfig]);

  // Hydration対策：マウント前は何も表示しない
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jira-blue mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">設定を確認中...</p>
        </div>
      </div>
    );
  }

  // 有効な設定を判定（LocalStorage優先、なければ.env）
  const effectiveJiraHost = jiraHost || envConfig?.jiraHost;
  const effectiveJiraEmail = jiraEmail || envConfig?.jiraEmail;
  const effectiveJiraToken = jiraApiToken || envConfig?.jiraApiToken;
  const effectiveGithubToken = githubToken || envConfig?.githubToken;

  const isJiraConfigured = !!(effectiveJiraHost && effectiveJiraEmail && effectiveJiraToken);
  const isGithubConfigured = !!effectiveGithubToken;

  // 設定元の判定
  const jiraSource = jiraHost ? "localStorage" : envConfig?.jiraHost ? ".env" : null;
  const githubSource = githubToken ? "localStorage" : envConfig?.githubToken ? ".env" : null;

  if (!isJiraConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle>設定が必要です</CardTitle>
            <CardDescription className="mt-2">
              Story Pointer を使用するには、設定画面または環境変数(.env)でJira接続情報を設定してください。
            </CardDescription>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-700">Jira設定</span>
                <p className="text-xs text-gray-500">Host, Email, API Token</p>
              </div>
              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">未設定（必須）</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">GitHub設定</span>
              {isGithubConfigured ? (
                <div className="flex items-center gap-1">
                  {githubSource === ".env" && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">.env</span>
                  )}
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">設定済み</span>
                </div>
              ) : (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">未設定（任意）</span>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>ヒント:</strong> 開発環境では.envファイルに設定を記述することで、毎回入力する必要がなくなります。
            </p>
          </div>

          <div className="mt-6">
            <Button className="w-full" onClick={() => router.push("/settings")}>
              設定画面へ
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
