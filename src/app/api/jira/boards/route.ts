import { NextRequest, NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/client";
import { getSecret } from "@/lib/secrets/manager";

export async function GET(request: NextRequest) {
  try {
    // Get config from headers (LocalStorage), fallback to env
    const jiraHostFromHeader = request.headers.get("X-Jira-Host");
    const jiraEmailFromHeader = request.headers.get("X-Jira-Email");
    const apiTokenFromHeader = request.headers.get("X-Jira-Api-Token");

    const jiraHost = jiraHostFromHeader || (await getSecret("JIRA_HOST"));
    const jiraEmail = jiraEmailFromHeader || (await getSecret("JIRA_EMAIL"));
    const apiToken = apiTokenFromHeader || (await getSecret("JIRA_API_TOKEN"));

    console.log("[Boards API] Config source:", {
      jiraHost: jiraHostFromHeader ? "header" : jiraHost ? "env" : "missing",
      jiraEmail: jiraEmailFromHeader ? "header" : jiraEmail ? "env" : "missing",
      apiToken: apiTokenFromHeader ? "header" : apiToken ? "env" : "missing",
    });

    if (!jiraHost || !jiraEmail || !apiToken) {
      console.error("[Boards API] Missing config:", { jiraHost: !!jiraHost, jiraEmail: !!jiraEmail, apiToken: !!apiToken });
      return NextResponse.json(
        { success: false, error: "Jira設定が見つかりません。設定画面で設定してください。" },
        { status: 401 }
      );
    }

    const jiraClient = createJiraClient({
      host: jiraHost,
      email: jiraEmail,
      apiToken: apiToken,
    });

    console.log("[Boards API] Fetching boards from:", jiraHost);
    const boards = await jiraClient.getBoards();
    console.log("[Boards API] Found boards:", boards.length);

    return NextResponse.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    console.error("Boards fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch boards";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
