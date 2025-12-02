"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";
import { DEFAULT_PROMPT } from "@/lib/gemini/prompts";
import { DEFAULT_MCP_PROMPT } from "@/lib/mcp/prompts";

// Default model ID
export const DEFAULT_AI_MODEL_ID = "gemini-2.5-pro-preview-06-05";

interface SettingsState extends AppSettings {
  aiModelId: string;
  mcpPrompt: string | undefined;
  selectedRepositories: string[];
  setSprintCount: (count: number) => void;
  setDefaultBoardId: (boardId: number | undefined) => void;
  setCustomPrompt: (prompt: string | undefined) => void;
  setMcpPrompt: (prompt: string | undefined) => void;
  setSprintNameExample: (example: string | undefined) => void;
  setAiModelId: (modelId: string) => void;
  setSelectedRepositories: (repos: string[]) => void;
  resetPrompt: () => void;
  resetMcpPrompt: () => void;
  resetAll: () => void;
}

// Sprint count limits
export const MIN_SPRINT_COUNT = 3;
export const MAX_SPRINT_COUNT = 10;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sprintCount: 10,
      defaultBoardId: undefined,
      customPrompt: undefined,
      mcpPrompt: undefined,
      sprintNameExample: undefined,
      aiModelId: DEFAULT_AI_MODEL_ID,
      selectedRepositories: [],

      setSprintCount: (sprintCount: number) =>
        set({ sprintCount: Math.min(MAX_SPRINT_COUNT, Math.max(MIN_SPRINT_COUNT, sprintCount)) }),

      setDefaultBoardId: (defaultBoardId: number | undefined) => set({ defaultBoardId }),

      setCustomPrompt: (customPrompt: string | undefined) => set({ customPrompt }),

      setMcpPrompt: (mcpPrompt: string | undefined) => set({ mcpPrompt }),

      setSprintNameExample: (sprintNameExample: string | undefined) => set({ sprintNameExample }),

      setAiModelId: (aiModelId: string) => set({ aiModelId }),

      setSelectedRepositories: (selectedRepositories: string[]) => set({ selectedRepositories }),

      resetPrompt: () => set({ customPrompt: undefined }),

      resetMcpPrompt: () => set({ mcpPrompt: undefined }),

      resetAll: () =>
        set({
          sprintCount: 10,
          defaultBoardId: undefined,
          customPrompt: undefined,
          mcpPrompt: undefined,
          sprintNameExample: undefined,
          aiModelId: DEFAULT_AI_MODEL_ID,
          selectedRepositories: [],
        }),
    }),
    {
      name: "story-pointer-settings",
    }
  )
);

export { DEFAULT_PROMPT, DEFAULT_MCP_PROMPT };
