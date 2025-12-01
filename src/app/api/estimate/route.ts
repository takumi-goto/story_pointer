import { NextRequest, NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/client";
import { createGitHubClient } from "@/lib/github/client";
import { createAIClient, getProviderFromModelId, DEFAULT_MODEL_ID } from "@/lib/ai/factory";
import { getSecret } from "@/lib/secrets/manager";
import { formatSprintData } from "@/lib/gemini/prompts";
import type { EstimationContext, SprintDataForPrompt } from "@/lib/ai/types";
import type { EstimationRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Get config from headers (LocalStorage), fallback to env
    const jiraHost = request.headers.get("X-Jira-Host") || (await getSecret("JIRA_HOST"));
    const jiraEmail = request.headers.get("X-Jira-Email") || (await getSecret("JIRA_EMAIL"));
    const jiraApiToken = request.headers.get("X-Jira-Api-Token") || (await getSecret("JIRA_API_TOKEN"));
    const githubToken = request.headers.get("X-GitHub-Token") || (await getSecret("GITHUB_TOKEN"));
    const geminiApiKey = await getSecret("GEMINI_API_KEY");
    const aiModelId = request.headers.get("X-AI-Model-Id") || DEFAULT_MODEL_ID;

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
        apiKey = geminiApiKey;
        break;
      case "claude":
        apiKey = await getSecret("ANTHROPIC_API_KEY");
        break;
      case "openai":
        apiKey = await getSecret("OPENAI_API_KEY");
        break;
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: `${provider.toUpperCase()} API Keyが設定されていません。管理者に連絡してください。` },
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

    // Fetch PR data for each ticket if GitHub is configured
    const sprintDataWithPRs: Array<{
      name: string;
      tickets: Array<{
        key: string;
        summary: string;
        description?: string;
        storyPoints?: number;
        daysToComplete?: number;
      }>;
      pullRequests: Map<string, Array<{
        url: string;
        fileCount: number;
        commitCount: number;
        daysToMerge?: number;
      }>>;
    }> = [];

    for (const sprint of sprints) {
      const prMap = new Map<string, Array<{
        url: string;
        fileCount: number;
        commitCount: number;
        daysToMerge?: number;
      }>>();

      if (githubClient) {
        for (const ticket of sprint.tickets) {
          try {
            // Try to get PR info from Jira dev panel first
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
              prMap.set(ticket.key, prs.map(pr => ({
                url: pr.url,
                fileCount: pr.fileCount,
                commitCount: pr.commitCount,
                daysToMerge: pr.daysToMerge,
              })));
            }
          } catch (error) {
            console.error(`Failed to fetch PRs for ${ticket.key}:`, error);
          }
        }
      }

      sprintDataWithPRs.push({
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
      });
    }

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
