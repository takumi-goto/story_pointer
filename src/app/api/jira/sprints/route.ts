import { NextRequest, NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/client";
import { getSecret } from "@/lib/secrets/manager";

export async function GET(request: NextRequest) {
  try {
    // Get config from headers (LocalStorage), fallback to env
    const jiraHost = request.headers.get("X-Jira-Host") || (await getSecret("JIRA_HOST"));
    const jiraEmail = request.headers.get("X-Jira-Email") || (await getSecret("JIRA_EMAIL"));
    const apiToken = request.headers.get("X-Jira-Api-Token") || (await getSecret("JIRA_API_TOKEN"));

    if (!jiraHost || !jiraEmail || !apiToken) {
      return NextResponse.json(
        { success: false, error: "Jira設定が見つかりません。設定画面で設定してください。" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");
    const count = searchParams.get("count") || "10";

    if (!boardId) {
      return NextResponse.json(
        { success: false, error: "boardId is required" },
        { status: 400 }
      );
    }

    const jiraClient = createJiraClient({
      host: jiraHost,
      email: jiraEmail,
      apiToken: apiToken,
    });

    const sprintsWithTickets = await jiraClient.getSprintsWithTickets(
      parseInt(boardId),
      parseInt(count)
    );

    return NextResponse.json({
      success: true,
      data: sprintsWithTickets,
    });
  } catch (error) {
    console.error("Sprints fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sprints" },
      { status: 500 }
    );
  }
}
