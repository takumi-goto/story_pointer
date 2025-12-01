"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth";

interface LoginFormProps {
  defaultValues?: {
    jiraHost?: string;
    email?: string;
  };
}

export default function LoginForm({ defaultValues }: LoginFormProps) {
  const router = useRouter();
  const { setSession, setLoading, setError, isLoading, error } = useAuthStore();

  const [jiraHost, setJiraHost] = useState(defaultValues?.jiraHost || "");
  const [email, setEmail] = useState(defaultValues?.email || "");
  const [apiToken, setApiToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Story Pointer にログイン</CardTitle>
        <CardDescription>Jira アカウントでログインしてください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Jira Host"
            placeholder="your-domain.atlassian.net"
            value={jiraHost}
            onChange={(e) => setJiraHost(e.target.value)}
            required
            helperText="Atlassian Cloud のドメインを入力してください"
          />

          <Input
            label="Email"
            type="email"
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="API Token"
            type="password"
            placeholder="API トークンを入力"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            required
            helperText={
              <span>
                API トークンは{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-jira-blue hover:underline"
                >
                  Atlassian アカウント設定
                </a>
                {" "}で作成できます
              </span>
            }
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            ログイン
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
