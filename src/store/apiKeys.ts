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

  // セッター
  setJiraHost: (host: string) => void;
  setJiraEmail: (email: string) => void;
  setJiraApiToken: (token: string) => void;
  setJiraProjectKey: (key: string) => void;
  setGithubToken: (token: string) => void;
  setGithubOrg: (org: string) => void;

  // クリア
  clearJiraConfig: () => void;
  clearGithubConfig: () => void;
  clearAllConfig: () => void;

  // 状態チェック
  isConfigured: () => boolean;
  getConfigurationStatus: () => {
    jira: boolean;
    github: boolean;
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

      setJiraHost: (host: string) => set({ jiraHost: host }),
      setJiraEmail: (email: string) => set({ jiraEmail: email }),
      setJiraApiToken: (token: string) => set({ jiraApiToken: token }),
      setJiraProjectKey: (key: string) => set({ jiraProjectKey: key }),
      setGithubToken: (token: string) => set({ githubToken: token }),
      setGithubOrg: (org: string) => set({ githubOrg: org }),

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

      clearAllConfig: () =>
        set({
          jiraHost: null,
          jiraEmail: null,
          jiraApiToken: null,
          jiraProjectKey: null,
          githubToken: null,
          githubOrg: null,
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
        };
      },
    }),
    {
      name: "story-pointer-config",
    }
  )
);
