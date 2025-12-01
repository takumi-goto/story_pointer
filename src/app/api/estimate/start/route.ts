import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob, generateJobId } from "@/lib/jobs/store";
import { createJiraClient } from "@/lib/jira/client";
import { createGitHubClient } from "@/lib/github/client";
import { createAIClient, getProviderFromModelId, DEFAULT_MODEL_ID } from "@/lib/ai/factory";
import { getSecret } from "@/lib/secrets/manager";
import { formatSprintData } from "@/lib/gemini/prompts";
import type { EstimationContext, SprintDataForPrompt } from "@/lib/ai/types";
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

    const { ticketKey, ticketSummary, ticketDescription, boardId, sprintCount, customPrompt } = body;

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
        updateJob(jobId, { progress: "Jiraクライアントを初期化中..." });

        const jiraClient = createJiraClient({
          host: jiraHost,
          email: jiraEmail,
          apiToken: jiraApiToken,
        });

        const githubClient = githubToken ? createGitHubClient({ token: githubToken }) : null;
        const aiClient = createAIClient({ provider, modelId: aiModelId, apiKey });

        updateJob(jobId, { progress: "スプリントデータを取得中..." });

        // Fetch sprint data with tickets
        const sprints = await jiraClient.getSprintsWithTickets(boardId, sprintCount || 10);

        updateJob(jobId, { progress: `${sprints.length}件のスプリントを処理中...` });

        // Fetch PR data for each ticket if GitHub is configured (parallelized)
        const sprintDataWithPRs = await Promise.all(
          sprints.map(async (sprint) => {
            const prMap = new Map<string, Array<{
              url: string;
              fileCount: number;
              commitCount: number;
              additions?: number;
              deletions?: number;
              daysToMerge?: number;
            }>>();

            if (githubClient) {
              const ticketPrResults = await Promise.all(
                sprint.tickets.map(async (ticket) => {
                  try {
                    const devInfo = await jiraClient.getDevInfo(ticket.key);
                    const prUrls: string[] = [];

                    if (devInfo?.detail) {
                      for (const detail of devInfo.detail) {
                        for (const repo of detail.repositories) {
                          for (const pr of repo.pullRequests) {
                            prUrls.push(pr.url);
                          }
                        }
                      }
                    }

                    if (prUrls.length > 0) {
                      const prs = await githubClient.getPullRequestsFromUrls(prUrls);
                      return {
                        ticketKey: ticket.key,
                        prs: prs.map(pr => ({
                          url: pr.url,
                          fileCount: pr.fileCount,
                          commitCount: pr.commitCount,
                          additions: pr.additions,
                          deletions: pr.deletions,
                          daysToMerge: pr.daysToMerge,
                        })),
                      };
                    }
                  } catch (error) {
                    console.error(`Failed to fetch PRs for ${ticket.key}:`, error);
                  }
                  return null;
                })
              );

              for (const result of ticketPrResults) {
                if (result) {
                  prMap.set(result.ticketKey, result.prs);
                }
              }
            }

            return {
              name: sprint.name,
              tickets: sprint.tickets
                .filter(t => t.key !== ticketKey)
                .map(t => ({
                  key: t.key,
                  summary: t.summary,
                  description: typeof t.description === "string" ? t.description : undefined,
                  storyPoints: t.storyPoints,
                  daysToComplete: t.daysToComplete,
                })),
              pullRequests: prMap,
            };
          })
        );

        updateJob(jobId, { progress: "AIで推定中..." });

        // Format data for AI
        const formattedSprintData: SprintDataForPrompt[] = formatSprintData(sprintDataWithPRs);

        // Build estimation context
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
