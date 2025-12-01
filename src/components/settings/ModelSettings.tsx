"use client";

import { useState, useEffect } from "react";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useSettingsStore, DEFAULT_AI_MODEL_ID } from "@/store/settings";

type VerificationStatus = "idle" | "verifying" | "success" | "error";

export default function ModelSettings() {
  const { aiModelId, setAiModelId } = useSettingsStore();
  const [inputValue, setInputValue] = useState(aiModelId);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState("");

  // Sync input with store on mount
  useEffect(() => {
    setInputValue(aiModelId);
  }, [aiModelId]);

  const handleVerify = async () => {
    if (!inputValue.trim()) {
      setStatus("error");
      setMessage("モデルIDを入力してください");
      return;
    }

    setStatus("verifying");
    setMessage("");

    try {
      const response = await fetch("/api/ai/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: inputValue.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setAiModelId(inputValue.trim());
      } else {
        setStatus("error");
        setMessage(data.error);
      }
    } catch (error) {
      setStatus("error");
      setMessage("検証中にエラーが発生しました");
    }
  };

  const handleReset = () => {
    setInputValue(DEFAULT_AI_MODEL_ID);
    setStatus("idle");
    setMessage("");
    setAiModelId(DEFAULT_AI_MODEL_ID);
  };

  const hasChanges = inputValue.trim() !== aiModelId;

  return (
    <Card>
      <CardTitle>AIモデル設定</CardTitle>
      <CardDescription className="mb-4">
        ストーリーポイント推定に使用するGeminiモデルを指定します
      </CardDescription>

      <div className="space-y-4">
        <div>
          <Input
            label="モデルID"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setStatus("idle");
              setMessage("");
            }}
            placeholder="例: gemini-2.5-pro-preview-06-05"
          />
          <p className="mt-1 text-xs text-gray-500">
            <a
              href="https://ai.google.dev/gemini-api/docs/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-jira-blue hover:underline"
            >
              利用可能なモデル一覧
            </a>
          </p>
        </div>

        {/* Status indicator */}
        {status !== "idle" && (
          <div
            className={`flex items-center gap-2 text-sm ${
              status === "success"
                ? "text-green-600"
                : status === "error"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {status === "verifying" && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {status === "success" && (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {status === "error" && (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={!inputValue.trim() || status === "verifying"}
            isLoading={status === "verifying"}
          >
            {hasChanges ? "検証して保存" : "検証"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            デフォルトに戻す
          </Button>
        </div>

        {/* Current saved model */}
        <div className="pt-2 border-t text-sm text-gray-600">
          <span className="font-medium">現在の設定:</span>{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">{aiModelId}</code>
        </div>
      </div>
    </Card>
  );
}
