"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JiraUser, AuthSession } from "@/types";

interface AuthState {
  user: JiraUser | null;
  jiraHost: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (session: AuthSession) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      jiraHost: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setSession: (session: AuthSession) =>
        set({
          user: session.user,
          jiraHost: session.jiraHost,
          accessToken: session.accessToken,
          isAuthenticated: true,
          error: null,
        }),

      logout: () =>
        set({
          user: null,
          jiraHost: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      setError: (error: string | null) => set({ error }),
    }),
    {
      name: "story-pointer-auth",
      partialize: (state) => ({
        user: state.user,
        jiraHost: state.jiraHost,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
