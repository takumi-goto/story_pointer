import { NextRequest, NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/client";
import { getSecret } from "@/lib/secrets/manager";
import { buildSearchJQL } from "@/lib/jira/queries";
import type { SearchQuery } from "@/types";

export async function GET(request: NextRequest) {
  try {
    // Get config from headers (LocalStorage), fallback to env
    const jiraHost = request.headers.get("X-Jira-Host") || (await getSecret("JIRA_HOST"));
    const jiraEmail = request.headers.get("X-Jira-Email") || (await getSecret("JIRA_EMAIL"));
    const apiToken = request.headers.get("X-Jira-Api-Token") || (await getSecret("JIRA_API_TOKEN"));
    const defaultProjectKey = request.headers.get("X-Jira-Project-Key") || (await getSecret("JIRA_PROJECT_KEY"));

    if (!jiraHost || !jiraEmail || !apiToken) {
      return NextResponse.json(
        { success: false, error: "Jira設定が見つかりません。設定画面で設定してください。" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text") || undefined;
    const issueType = searchParams.get("issueType") || undefined;
    const status = searchParams.get("status") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "50");
    const projectKey = searchParams.get("projectKey") || defaultProjectKey;

    const jiraClient = createJiraClient({
      host: jiraHost,
      email: jiraEmail,
      apiToken: apiToken,
    });

    const query: SearchQuery = {
      text,
      projectKey,
      issueType,
      status,
      maxResults,
    };

    const jql = buildSearchJQL(query);
    const tickets = await jiraClient.searchIssues(jql, maxResults);

    return NextResponse.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
