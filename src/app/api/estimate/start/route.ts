import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob, generateJobId } from "@/lib/jobs/store";
import { createJiraClient } from "@/lib/jira/client";
import { createGitHubClient } from "@/lib/github/client";
import { createAIClient, getProviderFromModelId, DEFAULT_MODEL_ID } from "@/lib/ai/factory";
import { GeminiMCPEstimationClient } from "@/lib/ai/clients/gemini-mcp";
import { getSecret } from "@/lib/secrets/manager";
import type { EstimationContext, SprintDataForPrompt, AIEstimationClient } from "@/lib/ai/types";
import type { EstimationRequest } from "@/types";

// Safe wrapper for getSecret
async function safeGetSecret(key: Parameters<typeof getSecret>[0]): Promise<string | undefined> {
  try {
    return await getSecret(key);
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const jobId = generateJobId();

  try {
    // Create job immediately
    createJob(jobId);
    updateJob(jobId, { status: "processing", progress: "設定を確認中..." });

    // Get config from headers (LocalStorage), fallback to env
    const jiraHost = request.headers.get("X-Jira-Host") || (await safeGetSecret("JIRA_HOST"));
    const jiraEmail = request.headers.get("X-Jira-Email") || (await safeGetSecret("JIRA_EMAIL"));
    const jiraApiToken = request.headers.get("X-Jira-Api-Token") || (await safeGetSecret("JIRA_API_TOKEN"));
    const githubToken = request.headers.get("X-GitHub-Token") || (await safeGetSecret("GITHUB_TOKEN"));
    const aiModelId = request.headers.get("X-AI-Model-Id") || DEFAULT_MODEL_ID;

    // AI API Keys from headers, fallback to env
    const geminiApiKeyFromHeader = request.headers.get("X-Gemini-Api-Key");
    const anthropicApiKeyFromHeader = request.headers.get("X-Anthropic-Api-Key");
    const openaiApiKeyFromHeader = request.headers.get("X-Openai-Api-Key");

    if (!jiraHost || !jiraEmail || !jiraApiToken) {
      updateJob(jobId, {
        status: "error",
        error: "Jira設定が見つかりません。設定画面で設定してください。",
      });
      return NextResponse.json({ success: true, jobId });
    }

    // Get API key based on provider
    const provider = getProviderFromModelId(aiModelId);
    let apiKey: string | undefined;

    switch (provider) {
      case "gemini":
        apiKey = geminiApiKeyFromHeader || (await safeGetSecret("GEMINI_API_KEY"));
        break;
      case "claude":
        apiKey = anthropicApiKeyFromHeader || (await safeGetSecret("ANTHROPIC_API_KEY"));
        break;
      case "openai":
        apiKey = openaiApiKeyFromHeader || (await safeGetSecret("OPENAI_API_KEY"));
        break;
    }

    if (!apiKey) {
      updateJob(jobId, {
        status: "error",
        error: `${provider.toUpperCase()} API Keyが設定されていません。設定画面で設定してください。`,
      });
      return NextResponse.json({ success: true, jobId });
    }

    let body: EstimationRequest;
    try {
      body = await request.json();
    } catch {
      updateJob(jobId, {
        status: "error",
        error: "リクエストボディの解析に失敗しました",
      });
      return NextResponse.json({ success: true, jobId });
    }

    const { ticketKey, ticketSummary, ticketDescription, boardId, sprintCount, customPrompt, mcpPrompt, selectedRepositories } = body;

    if (!ticketKey || !ticketSummary || !boardId) {
      updateJob(jobId, {
        status: "error",
        error: "必須フィールドが不足しています",
      });
      return NextResponse.json({ success: true, jobId });
    }

    // Return job ID immediately, continue processing
    // Use setImmediate/setTimeout to not block the response
    const processJob = async () => {
      try {
        const startTime = Date.now();
        const log = (msg: string) => console.log(`[${Date.now() - startTime}ms] ${msg}`);

        updateJob(jobId, { progress: "Jiraクライアントを初期化中..." });

        const jiraClient = createJiraClient({
          host: jiraHost,
          email: jiraEmail,
          apiToken: jiraApiToken,
        });

        const githubClient = githubToken ? createGitHubClient({ token: githubToken }) : null;

        // Use MCP-enabled client for Gemini to enable dynamic tool calling
        let aiClient: AIEstimationClient;
        log(`AIプロバイダー: ${provider}, モデル: ${aiModelId}`);
        if (provider === "gemini") {
          aiClient = new GeminiMCPEstimationClient({
            apiKey,
            modelId: aiModelId,
            githubToken: githubToken || undefined,
            jiraClient,
            githubClient,
            mcpPrompt,
            selectedRepositories,
            onProgress: (msg) => updateJob(jobId, { progress: msg }),
          });
        } else {
          aiClient = createAIClient({ provider, modelId: aiModelId, apiKey });
        }

        log("クライアント初期化完了");
        updateJob(jobId, { progress: "スプリントデータを取得中..." });

        // Fetch sprint data with tickets (PR info will be fetched dynamically via MCP)
        const sprints = await jiraClient.getSprintsWithTickets(boardId, sprintCount || 10);
        log(`スプリント取得完了: ${sprints.length}件`);

        // Debug: Log sprint names and ticket counts
        for (const sprint of sprints) {
          log(`  Sprint: ${sprint.name} (${sprint.tickets.length}件) - End: ${sprint.endDate}`);
        }
        const allTicketKeys = sprints.flatMap((s) => s.tickets.map((t) => t.key));
        log(`  Total tickets in sprint data: ${allTicketKeys.length}件`);

        // MCP-enabled AI will dynamically fetch PR/related ticket info using tools
        updateJob(jobId, { progress: "AIで推定中（MCPツール使用）..." });
        log("AI推定開始（MCP）");

        // Format sprint data (without PR info - MCP will fetch when needed)
        const formattedSprintData: SprintDataForPrompt[] = sprints.map((sprint) => ({
          sprintName: sprint.name,
          tickets: sprint.tickets
            .filter((t) => t.key !== ticketKey)
            .map((t) => ({
              key: t.key,
              summary: t.summary,
              description: typeof t.description === "string" ? t.description : undefined,
              storyPoints: t.storyPoints,
              daysToComplete: t.daysToComplete,
            })),
        }));

        // Build estimation context
        // MCP client will dynamically fetch related ticket info using tools
        const context: EstimationContext = {
          targetTicket: {
            key: ticketKey,
            summary: ticketSummary,
            description: ticketDescription || "",
          },
          sprintData: formattedSprintData,
          customPrompt,
        };

        // Get estimation from AI
        const result = await aiClient.estimateStoryPoints(context);
        log("AI推定完了");

        updateJob(jobId, {
          status: "completed",
          progress: "完了",
          result,
        });
      } catch (error) {
        console.error("Job processing error:", error);
        updateJob(jobId, {
          status: "error",
          error: `処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    };

    // Start processing without blocking
    processJob();

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Estimation start error:", error);
    updateJob(jobId, {
      status: "error",
      error: `開始に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    });
    return NextResponse.json({ success: true, jobId });
  }
}
