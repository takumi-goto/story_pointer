"use client";

import { useApiKeysStore } from "@/store/apiKeys";
import { useSettingsStore } from "@/store/settings";

interface FetchOptions extends RequestInit {
  includeGitHub?: boolean;
}

export function createAuthenticatedFetch() {
  return async (url: string, options: FetchOptions = {}) => {
    const apiKeysState = useApiKeysStore.getState();
    const settingsState = useSettingsStore.getState();
    const { includeGitHub, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);

    // Jira設定
    if (apiKeysState.jiraHost) {
      headers.set("X-Jira-Host", apiKeysState.jiraHost);
    }
    if (apiKeysState.jiraEmail) {
      headers.set("X-Jira-Email", apiKeysState.jiraEmail);
    }
    if (apiKeysState.jiraApiToken) {
      headers.set("X-Jira-Api-Token", apiKeysState.jiraApiToken);
    }
    if (apiKeysState.jiraProjectKey) {
      headers.set("X-Jira-Project-Key", apiKeysState.jiraProjectKey);
    }

    // GitHub設定
    if (includeGitHub && apiKeysState.githubToken) {
      headers.set("X-GitHub-Token", apiKeysState.githubToken);
    }
    if (apiKeysState.githubOrg) {
      headers.set("X-GitHub-Org", apiKeysState.githubOrg);
    }

    // AI Model設定
    if (settingsState.aiModelId) {
      headers.set("X-AI-Model-Id", settingsState.aiModelId);
    }

    return fetch(url, {
      ...fetchOptions,
      headers,
    });
  };
}

// Singleton instance for use outside React components
let authenticatedFetchInstance: ReturnType<typeof createAuthenticatedFetch> | null = null;

export function getAuthenticatedFetch() {
  if (!authenticatedFetchInstance) {
    authenticatedFetchInstance = createAuthenticatedFetch();
  }
  return authenticatedFetchInstance;
}

// React hook for use in components
export function useAuthenticatedFetch() {
  const apiKeysState = useApiKeysStore();
  const settingsState = useSettingsStore();

  return async (url: string, options: FetchOptions = {}) => {
    const { includeGitHub, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);

    // Jira設定
    if (apiKeysState.jiraHost) {
      headers.set("X-Jira-Host", apiKeysState.jiraHost);
    }
    if (apiKeysState.jiraEmail) {
      headers.set("X-Jira-Email", apiKeysState.jiraEmail);
    }
    if (apiKeysState.jiraApiToken) {
      headers.set("X-Jira-Api-Token", apiKeysState.jiraApiToken);
    }
    if (apiKeysState.jiraProjectKey) {
      headers.set("X-Jira-Project-Key", apiKeysState.jiraProjectKey);
    }

    // GitHub設定
    if (includeGitHub && apiKeysState.githubToken) {
      headers.set("X-GitHub-Token", apiKeysState.githubToken);
    }
    if (apiKeysState.githubOrg) {
      headers.set("X-GitHub-Org", apiKeysState.githubOrg);
    }

    // AI Model設定
    if (settingsState.aiModelId) {
      headers.set("X-AI-Model-Id", settingsState.aiModelId);
    }

    return fetch(url, {
      ...fetchOptions,
      headers,
    });
  };
}
