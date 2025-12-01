"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ApiKeysState {
  // Jira設定
  jiraHost: string | null;
  jiraEmail: string | null;
  jiraApiToken: string | null;
  jiraProjectKey: string | null;

  // GitHub設定
  githubToken: string | null;
  githubOrg: string | null;

  // AI API設定
  geminiApiKey: string | null;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;

  // セッター
  setJiraHost: (host: string) => void;
  setJiraEmail: (email: string) => void;
  setJiraApiToken: (token: string) => void;
  setJiraProjectKey: (key: string) => void;
  setGithubToken: (token: string) => void;
  setGithubOrg: (org: string) => void;
  setGeminiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;

  // クリア
  clearJiraConfig: () => void;
  clearGithubConfig: () => void;
  clearAiConfig: () => void;
  clearAllConfig: () => void;

  // 状態チェック
  isConfigured: () => boolean;
  getConfigurationStatus: () => {
    jira: boolean;
    github: boolean;
    ai: boolean;
  };
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      jiraHost: null,
      jiraEmail: null,
      jiraApiToken: null,
      jiraProjectKey: null,
      githubToken: null,
      githubOrg: null,
      geminiApiKey: null,
      anthropicApiKey: null,
      openaiApiKey: null,

      setJiraHost: (host: string) => set({ jiraHost: host }),
      setJiraEmail: (email: string) => set({ jiraEmail: email }),
      setJiraApiToken: (token: string) => set({ jiraApiToken: token }),
      setJiraProjectKey: (key: string) => set({ jiraProjectKey: key }),
      setGithubToken: (token: string) => set({ githubToken: token }),
      setGithubOrg: (org: string) => set({ githubOrg: org }),
      setGeminiApiKey: (key: string) => set({ geminiApiKey: key }),
      setAnthropicApiKey: (key: string) => set({ anthropicApiKey: key }),
      setOpenaiApiKey: (key: string) => set({ openaiApiKey: key }),

      clearJiraConfig: () =>
        set({
          jiraHost: null,
          jiraEmail: null,
          jiraApiToken: null,
          jiraProjectKey: null,
        }),

      clearGithubConfig: () =>
        set({
          githubToken: null,
          githubOrg: null,
        }),

      clearAiConfig: () =>
        set({
          geminiApiKey: null,
          anthropicApiKey: null,
          openaiApiKey: null,
        }),

      clearAllConfig: () =>
        set({
          jiraHost: null,
          jiraEmail: null,
          jiraApiToken: null,
          jiraProjectKey: null,
          githubToken: null,
          githubOrg: null,
          geminiApiKey: null,
          anthropicApiKey: null,
          openaiApiKey: null,
        }),

      isConfigured: () => {
        const state = get();
        // Jira必須項目がすべて設定されているか
        return !!(state.jiraHost && state.jiraEmail && state.jiraApiToken);
      },

      getConfigurationStatus: () => {
        const state = get();
        return {
          jira: !!(state.jiraHost && state.jiraEmail && state.jiraApiToken),
          github: !!state.githubToken,
          ai: !!(state.geminiApiKey || state.anthropicApiKey || state.openaiApiKey),
        };
      },
    }),
    {
      name: "story-pointer-config",
    }
  )
);
