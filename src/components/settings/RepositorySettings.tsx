"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useSettingsStore } from "@/store/settings";
import { useAuthenticatedFetch } from "@/lib/api/client";

interface Repository {
  fullName: string;
  private: boolean;
  updatedAt: string;
}

export default function RepositorySettings() {
  const { selectedRepositories, setSelectedRepositories } = useSettingsStore();
  const authFetch = useAuthenticatedFetch();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/github/repos", {
        includeGitHub: true,
      });

      if (!response.ok) {
        throw new Error("リポジトリの取得に失敗しました");
      }

      const data = await response.json();
      if (data.success) {
        setRepos(data.data);
        setHasLoaded(true);
      } else {
        throw new Error(data.error || "リポジトリの取得に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRepository = (repoName: string) => {
    if (selectedRepositories.includes(repoName)) {
      setSelectedRepositories(selectedRepositories.filter((r) => r !== repoName));
    } else {
      setSelectedRepositories([...selectedRepositories, repoName]);
    }
  };

  const selectAll = () => {
    setSelectedRepositories(repos.map((r) => r.fullName));
  };

  const clearAll = () => {
    setSelectedRepositories([]);
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              検索対象リポジトリ
            </h2>
            <p className="text-sm text-gray-600">
              PR検索時に参照するGitHubリポジトリを選択してください
            </p>
          </div>

          {!hasLoaded && (
            <Button
              onClick={fetchRepositories}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? <Spinner size="sm" /> : "リポジトリを取得"}
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {hasLoaded && repos.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {selectedRepositories.length} / {repos.length} 選択中
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  すべて選択
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  すべて解除
                </Button>
                <Button variant="outline" size="sm" onClick={fetchRepositories} disabled={isLoading}>
                  更新
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {repos.map((repo) => (
                <label
                  key={repo.fullName}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedRepositories.includes(repo.fullName)}
                    onChange={() => toggleRepository(repo.fullName)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {repo.fullName}
                      </span>
                      {repo.private && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        {hasLoaded && repos.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            アクセス可能なリポジトリが見つかりませんでした
          </div>
        )}

        {selectedRepositories.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">選択中:</span>{" "}
            {selectedRepositories.join(", ")}
          </div>
        )}
      </div>
    </Card>
  );
}
