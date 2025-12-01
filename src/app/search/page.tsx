"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Card, { CardTitle } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import SearchForm from "@/components/search/SearchForm";
import TicketList from "@/components/search/TicketList";
import ApiKeyGuard from "@/components/auth/ApiKeyGuard";
import { useSettingsStore } from "@/store/settings";
import { useAuthenticatedFetch } from "@/lib/api/client";
import type { JiraBoard, JiraTicket } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const { defaultBoardId, setDefaultBoardId } = useSettingsStore();
  const authFetch = useAuthenticatedFetch();

  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>(
    searchParams.get("boardId") || defaultBoardId?.toString() || ""
  );
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
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
      setIsLoadingBoards(false);
    }
  };

  // Extract ticket key from Jira URL or return as-is if it's already a ticket key
  const extractTicketKey = (input: string): string | null => {
    const trimmed = input.trim();

    // Check if it's a Jira URL (e.g., https://xxx.atlassian.net/browse/KT-6019)
    const urlMatch = trimmed.match(/https?:\/\/[^/]+\/browse\/([A-Z]+-\d+)/i);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }

    // Check if it looks like a ticket key (e.g., KT-6019)
    const keyMatch = trimmed.match(/^([A-Z]+-\d+)$/i);
    if (keyMatch) {
      return keyMatch[1].toUpperCase();
    }

    return null;
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setError(null);

    try {
      const ticketKey = extractTicketKey(query);

      if (ticketKey) {
        // Direct ticket fetch by key or URL
        const response = await authFetch(`/api/jira/tickets?key=${ticketKey}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "チケットが見つかりません");
        }

        setTickets([data.data]);
      } else {
        // Text search
        const params = new URLSearchParams();
        if (query) params.append("text", query);

        const response = await authFetch(`/api/jira/search?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Search failed");
        }

        setTickets(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBoardChange = (value: string) => {
    setSelectedBoard(value);
    setDefaultBoardId(parseInt(value));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">チケット検索</h1>
          <p className="mt-1 text-gray-600">
            ポイントを推定したいチケットを検索してください
          </p>
        </div>

        {isLoadingBoards ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Board Selection */}
            <Card>
              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-xs">
                  <Select
                    label="対象ボード"
                    value={selectedBoard}
                    onChange={(e) => handleBoardChange(e.target.value)}
                    options={boards.map((board) => ({
                      value: board.id.toString(),
                      label: `${board.name} (${board.projectKey})`,
                    }))}
                  />
                </div>
              </div>
            </Card>

            {/* Search Form */}
            <Card>
              <CardTitle className="mb-4">検索</CardTitle>
              <SearchForm onSearch={handleSearch} isLoading={isSearching} />
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="bg-red-50 border-red-200">
                <p className="text-red-700">{error}</p>
              </Card>
            )}

            {/* Results */}
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              tickets.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    検索結果 ({tickets.length}件)
                  </h2>
                  <TicketList tickets={tickets} boardId={selectedBoard} />
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ApiKeyGuard>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
        <SearchContent />
      </Suspense>
    </ApiKeyGuard>
  );
}
