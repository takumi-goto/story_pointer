"use client";

import { useState, useCallback } from "react";
import type { EstimationResult, EstimationRequest } from "@/types";

export function useEstimate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimationResult | null>(null);

  const estimate = useCallback(async (request: EstimationRequest): Promise<EstimationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Estimation failed");
      }

      setResult(data.data);
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Estimation failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    estimate,
    clearResult,
  };
}
