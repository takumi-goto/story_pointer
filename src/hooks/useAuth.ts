"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { isAuthenticated, user, logout, setSession, setLoading, setError, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [requireAuth, isAuthenticated, router]);

  const login = async (jiraHost: string, email: string, apiToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jiraHost: jiraHost.replace(/^https?:\/\//, ""),
          email,
          apiToken,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }

      setSession({
        user: data.user,
        jiraHost: data.jiraHost,
        accessToken: apiToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
      router.push("/login");
    }
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout: handleLogout,
  };
}
