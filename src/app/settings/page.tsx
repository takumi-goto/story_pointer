"use client";

import Header from "@/components/layout/Header";
import ApiKeySettings from "@/components/settings/ApiKeySettings";
import SprintSettings from "@/components/settings/SprintSettings";
import ModelSettings from "@/components/settings/ModelSettings";
import RepositorySettings from "@/components/settings/RepositorySettings";
import PromptEditor from "@/components/settings/PromptEditor";
import MCPPromptEditor from "@/components/settings/MCPPromptEditor";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          <p className="mt-1 text-gray-600">
            ストーリーポイント推定の設定をカスタマイズできます
          </p>
        </div>

        <div className="space-y-6">
          <ApiKeySettings />
          <SprintSettings />
          <ModelSettings />
          <RepositorySettings />
          <PromptEditor />
          <MCPPromptEditor />
        </div>
      </main>
    </div>
  );
}
