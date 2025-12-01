"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ApiKeyGuard from "@/components/auth/ApiKeyGuard";
import { useSettingsStore } from "@/store/settings";
import { useAuthenticatedFetch } from "@/lib/api/client";
import type { JiraBoard } from "@/types";

function DashboardContent() {
  const router = useRouter();
  const { defaultBoardId, setDefaultBoardId } = useSettingsStore();
  const authFetch = useAuthenticatedFetch();

  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>(defaultBoardId?.toString() || "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await authFetch("/api/jira/boards");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch boards");
      }

      setBoards(data.data);

      if (data.data.length > 0 && !selectedBoard) {
        setSelectedBoard(defaultBoardId?.toString() || data.data[0].id.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch boards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoardChange = (value: string) => {
    setSelectedBoard(value);
    setDefaultBoardId(parseInt(value));
  };

  const handleStartEstimation = () => {
    if (selectedBoard) {
      router.push(`/search?boardId=${selectedBoard}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-1 text-gray-600">
            ストーリーポイント推定を開始しましょう
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <p className="text-red-700">{error}</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Board Selection Card */}
            <Card className="col-span-full lg:col-span-2">
              <CardTitle>ボード選択</CardTitle>
              <CardDescription className="mb-4">
                ストーリーポイント推定に使用するスクラムボードを選択してください
              </CardDescription>

              <div className="space-y-4">
                <Select
                  label="スクラムボード"
                  value={selectedBoard}
                  onChange={(e) => handleBoardChange(e.target.value)}
                  options={boards.map((board) => ({
                    value: board.id.toString(),
                    label: `${board.name} (${board.projectKey})`,
                  }))}
                  placeholder="ボードを選択..."
                />

                <Button onClick={handleStartEstimation} disabled={!selectedBoard}>
                  チケット検索へ進む
                </Button>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardTitle>クイックアクション</CardTitle>
              <CardDescription className="mb-4">よく使う機能へのショートカット</CardDescription>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/search")}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  チケット検索
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/settings")}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  設定
                </Button>
              </div>
            </Card>

            {/* Stats Card */}
            <Card className="col-span-full">
              <CardTitle>使い方</CardTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-jira-blue">1</div>
                  <div className="text-sm text-gray-600 mt-1">ボードを選択</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-jira-blue">2</div>
                  <div className="text-sm text-gray-600 mt-1">チケットを検索</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-jira-blue">3</div>
                  <div className="text-sm text-gray-600 mt-1">AIがポイント推定</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ApiKeyGuard>
      <DashboardContent />
    </ApiKeyGuard>
  );
}
