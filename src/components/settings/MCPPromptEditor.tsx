"use client";

import { useState, useRef, useEffect } from "react";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useSettingsStore, DEFAULT_MCP_PROMPT } from "@/store/settings";

export default function MCPPromptEditor() {
  const { mcpPrompt, setMcpPrompt, resetMcpPrompt } = useSettingsStore();
  const [prompt, setPrompt] = useState(mcpPrompt || DEFAULT_MCP_PROMPT);
  const [isSaved, setIsSaved] = useState(true);
  const prevMcpPromptRef = useRef(mcpPrompt);

  // Sync with store when mcpPrompt changes externally (e.g., localStorage hydration)
  useEffect(() => {
    if (prevMcpPromptRef.current !== mcpPrompt) {
      prevMcpPromptRef.current = mcpPrompt;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(mcpPrompt || DEFAULT_MCP_PROMPT);
    }
  }, [mcpPrompt]);

  const handleChange = (value: string) => {
    setPrompt(value);
    setIsSaved(false);
  };

  const handleSave = () => {
    setMcpPrompt(prompt === DEFAULT_MCP_PROMPT ? undefined : prompt);
    setIsSaved(true);
  };

  const handleReset = () => {
    setPrompt(DEFAULT_MCP_PROMPT);
    resetMcpPrompt();
    setIsSaved(true);
  };

  const isModified = prompt !== DEFAULT_MCP_PROMPT;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle>MCPツールプロンプト設定</CardTitle>
          <CardDescription>
            MCPツール（GitHub PR検索等）の使用方法をAIに指示するプロンプトです
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
            MCPプロンプト
          </label>
          <textarea
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-jira-blue focus:border-jira-blue font-mono text-sm"
            placeholder="MCPプロンプトを入力..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <p>使用可能な変数:</p>
            <ul className="list-disc list-inside mt-1 text-xs">
              <li><code className="bg-gray-100 px-1 rounded">{"{toolDocs}"}</code> - 利用可能なツール一覧（自動挿入）</li>
            </ul>
            <p className="mt-2 text-xs">利用可能なツール:</p>
            <ul className="list-disc list-inside mt-1 text-xs">
              <li>get_jira_ticket - Jiraチケット詳細取得</li>
              <li>get_ticket_pull_requests - チケットのPR一覧取得</li>
              <li>search_pull_requests - キーワードでPR検索</li>
              <li>get_pull_request_files - PRの変更ファイル取得</li>
              <li>analyze_code_changes - PR変更内容分析</li>
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
