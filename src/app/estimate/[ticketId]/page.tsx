"use client";

import { useEffect, useState, Suspense, use, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EstimateResult from "@/components/estimate/EstimateResult";
import ApiKeyGuard from "@/components/auth/ApiKeyGuard";
import { useSettingsStore } from "@/store/settings";
import { useAuthenticatedFetch } from "@/lib/api/client";
import type { EstimationResult } from "@/types";

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 300; // 10 minutes max (300 * 2s)

function EstimateContent({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sprintCount, customPrompt, mcpPrompt, selectedRepositories, _hasHydrated } = useSettingsStore();
  const authFetch = useAuthenticatedFetch();

  const [result, setResult] = useState<EstimationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState<string>("開始中...");
  const [logs, setLogs] = useState<Array<{ timestamp: number; message: string }>>([]);
  const [showLogs, setShowLogs] = useState(false);
  const pollCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);

  const ticketKey = searchParams.get("key") || ticketId;
  const ticketSummary = searchParams.get("summary") || "";
  const ticketDescription = searchParams.get("description") || "";
  const boardId = searchParams.get("boardId") || "";

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string): Promise<void> => {
    pollCountRef.current++;

    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      throw new Error("タイムアウト: 処理に時間がかかりすぎています。後でもう一度お試しください。");
    }

    const response = await authFetch(`/api/estimate/status/${jobId}`);
    const responseText = await response.text();

    if (!responseText) {
      // Empty response, server might be restarting, retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      return pollJobStatus(jobId);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Invalid JSON, retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      return pollJobStatus(jobId);
    }

    // Update logs if available
    if (data.logs) {
      setLogs(data.logs);
    }

    if (data.status === "completed") {
      setResult(data.data as EstimationResult);
      setIsLoading(false);
      return;
    }

    if (data.status === "error") {
      // Update logs before throwing error so they're visible
      if (data.logs) {
        setLogs(data.logs);
        setShowLogs(true); // Auto-expand logs on error
      }
      throw new Error(data.error || "推定に失敗しました");
    }

    // Still processing, update progress and poll again
    if (data.progress) {
      setProgress(data.progress);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    return pollJobStatus(jobId);
  }, [authFetch]);

  const runEstimation = useCallback(async () => {
    // Cancel any existing polling
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setProgress("ジョブを開始中...");
    setLogs([]);
    setShowLogs(false);
    pollCountRef.current = 0;

    try {
      // Debug: Log current settings
      const currentSettings = useSettingsStore.getState();
      console.log("[runEstimation] Current aiModelId:", currentSettings.aiModelId);

      // Start the estimation job
      const startResponse = await authFetch("/api/estimate/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketKey,
          ticketSummary,
          ticketDescription,
          boardId: parseInt(boardId),
          sprintCount,
          customPrompt,
          mcpPrompt,
          selectedRepositories,
        }),
        includeGitHub: true,
      });

      const startResponseText = await startResponse.text();
      if (!startResponseText) {
        throw new Error("サーバーからの応答が空です");
      }

      let startData;
      try {
        startData = JSON.parse(startResponseText);
      } catch {
        throw new Error(`不正な応答: ${startResponseText.substring(0, 100)}`);
      }

      if (!startData.success || !startData.jobId) {
        throw new Error(startData.error || "ジョブの開始に失敗しました");
      }

      setProgress("処理中...");

      // Poll for results
      await pollJobStatus(startData.jobId);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Cancelled, ignore
      }
      setError(err instanceof Error ? err.message : "Estimation failed");
      setShowLogs(true); // Auto-expand logs on error
      setIsLoading(false);
    }
  }, [authFetch, ticketKey, ticketSummary, ticketDescription, boardId, sprintCount, customPrompt, mcpPrompt, selectedRepositories, pollJobStatus]);

  // Run estimation on mount - wait for hydration before starting
  useEffect(() => {
    if (!boardId) {
      setError("ボードIDが指定されていません");
      setIsLoading(false);
      return;
    }

    // Wait for Zustand to hydrate from localStorage
    if (!_hasHydrated) {
      console.log("[EstimatePage] Waiting for settings hydration...");
      return;
    }

    // Prevent duplicate execution in React Strict Mode
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    console.log("[EstimatePage] Hydration complete, starting estimation");
    runEstimation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketKey, boardId, _hasHydrated]);

  // Track elapsed time during loading
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              ← 戻る
            </Button>
          </div>
          {result && (
            <Button variant="secondary" size="sm" onClick={() => runEstimation()} disabled={isLoading}>
              再推定
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="py-8">
            <div className="flex flex-col gap-6">
              {/* Ticket Info */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {ticketKey}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {ticketSummary || "チケット"}
                </h2>
                {ticketDescription && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {ticketDescription.substring(0, 300)}{ticketDescription.length > 300 ? "..." : ""}
                  </p>
                )}
              </div>

              {/* Loading Status */}
              <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-gray-600">
                  AIがストーリーポイントを推定中です...
                </p>
                <p className="text-sm text-gray-500">
                  {progress}
                </p>
                <p className="text-sm text-gray-500 font-mono">
                  経過時間: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}
                </p>
              </div>

              {/* Logs Section */}
              {logs.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showLogs ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    実行ログ ({logs.length}件)
                  </button>
                  {showLogs && (
                    <div className="mt-2 max-h-60 overflow-y-auto bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs">
                      {logs.map((log, index) => (
                        <div key={index} className="py-0.5">
                          <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="ml-2">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <div className="flex flex-col items-center gap-4 py-8">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-700 font-medium">推定に失敗しました</p>
              <p className="text-red-600 text-sm">{error}</p>
              <Button onClick={() => runEstimation()}>再試行</Button>
            </div>

            {/* Logs Section for Error */}
            {logs.length > 0 && (
              <div className="border-t border-red-200 mt-4 pt-4">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showLogs ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  実行ログ ({logs.length}件)
                </button>
                {showLogs && (
                  <div className="mt-2 max-h-80 overflow-y-auto bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs">
                    {logs.map((log, index) => (
                      <div key={index} className="py-0.5">
                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="ml-2">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : result ? (
          <EstimateResult
            result={result}
            ticketKey={ticketKey}
            ticketSummary={ticketSummary}
          />
        ) : null}
      </main>
    </div>
  );
}

export default function EstimatePage({ params }: { params: Promise<{ ticketId: string }> }) {
  return (
    <ApiKeyGuard>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
        <EstimateContent params={params} />
      </Suspense>
    </ApiKeyGuard>
  );
}
