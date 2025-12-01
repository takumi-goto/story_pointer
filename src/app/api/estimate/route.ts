import { NextRequest, NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/client";
import { createGitHubClient } from "@/lib/github/client";
import { createAIClient, getProviderFromModelId, DEFAULT_MODEL_ID } from "@/lib/ai/factory";
import { getSecret } from "@/lib/secrets/manager";
import { formatSprintData } from "@/lib/gemini/prompts";
import type { EstimationContext, SprintDataForPrompt } from "@/lib/ai/types";
import type { EstimationRequest } from "@/types";

// Safe wrapper for getSecret that returns undefined instead of throwing
async function safeGetSecret(key: Parameters<typeof getSecret>[0]): Promise<string | undefined> {
  try {
    return await getSecret(key);
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { success: false, error: "Jira設定が見つかりません。設定画面で設定してください。" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, error: `${provider.toUpperCase()} API Keyが設定されていません。設定画面で設定してください。` },
        { status: 500 }
      );
    }

    const body: EstimationRequest = await request.json();
    const { ticketKey, ticketSummary, ticketDescription, boardId, sprintCount, customPrompt } = body;

    if (!ticketKey || !ticketSummary || !boardId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize clients
    const jiraClient = createJiraClient({
      host: jiraHost,
      email: jiraEmail,
      apiToken: jiraApiToken,
    });

    const githubClient = githubToken ? createGitHubClient({ token: githubToken }) : null;
    const aiClient = createAIClient({ provider, modelId: aiModelId, apiKey });

    // Fetch sprint data with tickets
    const sprints = await jiraClient.getSprintsWithTickets(boardId, sprintCount || 10);

    // Fetch PR data for each ticket if GitHub is configured (parallelized for speed)
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
          // Parallelize dev info fetches for all tickets in the sprint
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

          // Populate prMap from results
          for (const result of ticketPrResults) {
            if (result) {
              prMap.set(result.ticketKey, result.prs);
            }
          }
        }

        return {
          name: sprint.name,
          // Exclude target ticket to avoid bias
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

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Estimation error:", error);
    return NextResponse.json(
      { success: false, error: `Estimation failed: ${error}` },
      { status: 500 }
    );
  }
}
