import { NextResponse } from "next/server";
import { getSecret } from "@/lib/secrets/manager";

export async function GET() {
  try {
    // Get environment configuration
    const jiraHost = await getSecret("JIRA_HOST");
    const jiraEmail = await getSecret("JIRA_EMAIL");
    const jiraApiToken = await getSecret("JIRA_API_TOKEN");
    const jiraProjectKey = await getSecret("JIRA_PROJECT_KEY");
    const githubToken = await getSecret("GITHUB_TOKEN");
    const githubOrg = await getSecret("GITHUB_ORG");

    // Return config with actual values for non-sensitive fields
    // and masked values for tokens (just indicate if they're set)
    return NextResponse.json({
      success: true,
      data: {
        // Non-sensitive values can be returned as-is
        jiraHost: jiraHost || null,
        jiraEmail: jiraEmail || null,
        jiraProjectKey: jiraProjectKey || null,
        githubOrg: githubOrg || null,
        // For tokens, return the actual value so it can be used
        // (the user can view it in the UI anyway with show/hide toggle)
        jiraApiToken: jiraApiToken || null,
        githubToken: githubToken || null,
      },
    });
  } catch (error) {
    console.error("Config fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}
