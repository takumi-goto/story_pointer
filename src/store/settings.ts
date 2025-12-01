"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";
import { DEFAULT_PROMPT } from "@/lib/gemini/prompts";

// Default model ID
export const DEFAULT_AI_MODEL_ID = "gemini-2.5-pro-preview-06-05";

interface SettingsState extends AppSettings {
  aiModelId: string;
  setSprintCount: (count: number) => void;
  setDefaultBoardId: (boardId: number | undefined) => void;
  setCustomPrompt: (prompt: string | undefined) => void;
  setAiModelId: (modelId: string) => void;
  resetPrompt: () => void;
  resetAll: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sprintCount: 10,
      defaultBoardId: undefined,
      customPrompt: undefined,
      aiModelId: DEFAULT_AI_MODEL_ID,

      setSprintCount: (sprintCount: number) => set({ sprintCount }),

      setDefaultBoardId: (defaultBoardId: number | undefined) => set({ defaultBoardId }),

      setCustomPrompt: (customPrompt: string | undefined) => set({ customPrompt }),

      setAiModelId: (aiModelId: string) => set({ aiModelId }),

      resetPrompt: () => set({ customPrompt: undefined }),

      resetAll: () =>
        set({
          sprintCount: 10,
          defaultBoardId: undefined,
          customPrompt: undefined,
          aiModelId: DEFAULT_AI_MODEL_ID,
        }),
    }),
    {
      name: "story-pointer-settings",
    }
  )
);

export { DEFAULT_PROMPT };
