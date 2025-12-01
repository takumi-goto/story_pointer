"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthenticatedFetch } from "@/lib/api/client";
import type { EstimationResult, EstimationRequest } from "@/types";

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max

export function useEstimate() {
  const authFetch = useAuthenticatedFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [progress, setProgress] = useState<string>("");
  const pollCountRef = useRef(0);

  const pollJobStatus = useCallback(async (jobId: string): Promise<EstimationResult> => {
    pollCountRef.current++;

    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      throw new Error("タイムアウト: 処理に時間がかかりすぎています。");
    }

    const response = await authFetch(`/api/estimate/status/${jobId}`);
    const responseText = await response.text();

    if (!responseText) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      return pollJobStatus(jobId);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      return pollJobStatus(jobId);
    }

    if (data.status === "completed") {
      return data.data as EstimationResult;
    }

    if (data.status === "error") {
      throw new Error(data.error || "推定に失敗しました");
    }

    if (data.progress) {
      setProgress(data.progress);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    return pollJobStatus(jobId);
  }, [authFetch]);

  const estimate = useCallback(async (request: EstimationRequest): Promise<EstimationResult> => {
    setIsLoading(true);
    setError(null);
    setProgress("ジョブを開始中...");
    pollCountRef.current = 0;

    try {
      // Start the job
      const startResponse = await authFetch("/api/estimate/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
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
      const estimationResult = await pollJobStatus(startData.jobId);

      setResult(estimationResult);
      return estimationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Estimation failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  }, [authFetch, pollJobStatus]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress("");
  }, []);

  return {
    isLoading,
    error,
    result,
    progress,
    estimate,
    clearResult,
  };
}
