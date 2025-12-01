"use client";

import { useEffect, useState, Suspense, use } from "react";
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

function EstimateContent({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sprintCount, customPrompt } = useSettingsStore();
  const authFetch = useAuthenticatedFetch();

  const [result, setResult] = useState<EstimationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const ticketKey = searchParams.get("key") || ticketId;
  const ticketSummary = searchParams.get("summary") || "";
  const ticketDescription = searchParams.get("description") || "";
  const boardId = searchParams.get("boardId") || "";

  useEffect(() => {
    if (!boardId) {
      setError("ボードIDが指定されていません");
      setIsLoading(false);
      return;
    }

    runEstimation();
  }, [ticketKey, boardId]);

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

  const runEstimation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/estimate", {
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
        }),
        includeGitHub: true,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Estimation failed");
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setIsLoading(false);
    }
  };

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
            <Button variant="secondary" size="sm" onClick={runEstimation} disabled={isLoading}>
              再推定
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Spinner size="lg" />
              <p className="text-gray-600">
                AIがストーリーポイントを推定中です...
              </p>
              <p className="text-sm text-gray-400">
                過去のスプリントデータを分析しています
              </p>
              <p className="text-sm text-gray-500 font-mono">
                経過時間: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}
              </p>
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
              <Button onClick={runEstimation}>再試行</Button>
            </div>
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
