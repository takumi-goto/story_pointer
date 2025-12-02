"use client";

import { useState, useRef, useEffect } from "react";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useSettingsStore, DEFAULT_PROMPT } from "@/store/settings";

export default function PromptEditor() {
  const { customPrompt, setCustomPrompt, resetPrompt } = useSettingsStore();
  const [prompt, setPrompt] = useState(customPrompt || DEFAULT_PROMPT);
  const [isSaved, setIsSaved] = useState(true);
  const prevCustomPromptRef = useRef(customPrompt);

  // Sync with store when customPrompt changes externally (e.g., localStorage hydration)
  useEffect(() => {
    if (prevCustomPromptRef.current !== customPrompt) {
      prevCustomPromptRef.current = customPrompt;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(customPrompt || DEFAULT_PROMPT);
    }
  }, [customPrompt]);

  const handleChange = (value: string) => {
    setPrompt(value);
    setIsSaved(false);
  };

  const handleSave = () => {
    setCustomPrompt(prompt === DEFAULT_PROMPT ? undefined : prompt);
    setIsSaved(true);
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
    resetPrompt();
    setIsSaved(true);
  };

  const isModified = prompt !== DEFAULT_PROMPT;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle>プロンプト設定</CardTitle>
          <CardDescription>
            Gemini AIに送信するプロンプトをカスタマイズできます
          </CardDescription>
        </div>
        {isModified && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            カスタマイズ済み
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            プロンプト
          </label>
          <textarea
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-jira-blue focus:border-jira-blue font-mono text-sm"
            placeholder="プロンプトを入力..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <p>使用可能な変数:</p>
            <ul className="list-disc list-inside mt-1 text-xs">
              <li><code className="bg-gray-100 px-1 rounded">{"{sprintData}"}</code> - 過去のスプリントデータ</li>
              <li><code className="bg-gray-100 px-1 rounded">{"{ticketSummary}"}</code> - 推定対象チケットのタイトル</li>
              <li><code className="bg-gray-100 px-1 rounded">{"{ticketDescription}"}</code> - 推定対象チケットの説明</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              デフォルトを使う
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaved}>
              {isSaved ? "保存済み" : "保存"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
