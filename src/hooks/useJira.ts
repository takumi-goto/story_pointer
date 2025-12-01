"use client";

import { useState, useCallback } from "react";
import type { JiraBoard, JiraTicket, SprintWithTickets } from "@/types";

export function useJira() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async (): Promise<JiraBoard[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/jira/boards");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch boards");
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch boards";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSprints = useCallback(async (boardId: number, count: number = 10): Promise<SprintWithTickets[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jira/sprints?boardId=${boardId}&count=${count}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch sprints");
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch sprints";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTickets = useCallback(async (query: string): Promise<JiraTicket[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query) params.append("text", query);

      const response = await fetch(`/api/jira/search?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTicket = useCallback(async (ticketKey: string): Promise<JiraTicket> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jira/tickets?key=${ticketKey}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch ticket");
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch ticket";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchBoards,
    fetchSprints,
    searchTickets,
    fetchTicket,
  };
}
