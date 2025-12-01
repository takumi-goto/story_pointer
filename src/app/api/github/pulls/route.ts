import { NextRequest, NextResponse } from "next/server";
import { createGitHubClient } from "@/lib/github/client";
import { createJiraClient } from "@/lib/jira/client";
import { getSecret } from "@/lib/secrets/manager";

export async function GET(request: NextRequest) {
  try {
    // Get config from headers (LocalStorage), fallback to env
    const jiraHost = request.headers.get("X-Jira-Host") || (await getSecret("JIRA_HOST"));
    const jiraEmail = request.headers.get("X-Jira-Email") || (await getSecret("JIRA_EMAIL"));
    const jiraApiToken = request.headers.get("X-Jira-Api-Token") || (await getSecret("JIRA_API_TOKEN"));
    const githubToken = request.headers.get("X-GitHub-Token") || (await getSecret("GITHUB_TOKEN"));
    const githubOrg = request.headers.get("X-GitHub-Org") || (await getSecret("GITHUB_ORG"));

    if (!jiraHost || !jiraEmail || !jiraApiToken) {
      return NextResponse.json(
        { success: false, error: "Jira設定が見つかりません。設定画面で設定してください。" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticketKey = searchParams.get("ticketKey");

    if (!ticketKey) {
      return NextResponse.json(
        { success: false, error: "ticketKey is required" },
        { status: 400 }
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: "GitHub Tokenが設定されていません。" },
        { status: 500 }
      );
    }

    // First, try to get PR links from Jira's dev info
    const jiraClient = createJiraClient({
      host: jiraHost,
      email: jiraEmail,
      apiToken: jiraApiToken,
    });

    const devInfo = await jiraClient.getDevInfo(ticketKey);
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

    const githubClient = createGitHubClient({ token: githubToken });
    let pulls;

    if (prUrls.length > 0) {
      // Get PR details from URLs found in Jira
      pulls = await githubClient.getPullRequestsFromUrls(prUrls);
    } else {
      // Search for PRs by ticket key
      pulls = await githubClient.findPullRequestsByTicketKey(ticketKey, githubOrg);
    }

    return NextResponse.json({
      success: true,
      data: pulls,
    });
  } catch (error) {
    console.error("GitHub pulls fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pull requests" },
      { status: 500 }
    );
  }
}
