"use client";

import { useSettingsStore, DEFAULT_PROMPT } from "@/store/settings";

export function useSettings() {
  const {
    sprintCount,
    defaultBoardId,
    customPrompt,
    setSprintCount,
    setDefaultBoardId,
    setCustomPrompt,
    resetPrompt,
    resetAll,
  } = useSettingsStore();

  const getPrompt = () => customPrompt || DEFAULT_PROMPT;

  const isPromptModified = () => customPrompt !== undefined && customPrompt !== DEFAULT_PROMPT;

  return {
    sprintCount,
    defaultBoardId,
    customPrompt,
    getPrompt,
    isPromptModified,
    setSprintCount,
    setDefaultBoardId,
    setCustomPrompt,
    resetPrompt,
    resetAll,
    DEFAULT_PROMPT,
  };
}
