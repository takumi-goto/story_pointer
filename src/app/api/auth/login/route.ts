import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createJiraClient } from "@/lib/jira/client";
import { getSecret } from "@/lib/secrets/manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jiraHost, email, apiToken } = body;

    if (!jiraHost || !email || !apiToken) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate credentials by getting current user
    const jiraClient = createJiraClient({
      host: jiraHost,
      email,
      apiToken,
    });

    const user = await jiraClient.getCurrentUser();

    // Create session token
    const sessionSecret = await getSecret("SESSION_SECRET");
    if (!sessionSecret) {
      return NextResponse.json(
        { success: false, error: "Session secret not configured" },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(sessionSecret);
    const token = await new SignJWT({
      user,
      jiraHost,
      email,
      apiToken, // In production, consider encrypting this
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      user,
      jiraHost,
    });

    // Set HTTP-only cookie
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid credentials or Jira connection failed" },
      { status: 401 }
    );
  }
}
