import { NextRequest, NextResponse } from "next/server";
import { createGitHubClient } from "@/lib/github/client";

export async function GET(request: NextRequest) {
  try {
    const githubToken = request.headers.get("X-GitHub-Token");

    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: "GitHub tokenが設定されていません" },
        { status: 401 }
      );
    }

    const githubClient = createGitHubClient({ token: githubToken });
    const repos = await githubClient.listRepositories(100);

    return NextResponse.json({
      success: true,
      data: repos,
    });
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
