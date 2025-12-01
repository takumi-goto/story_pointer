import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSecret } from "@/lib/secrets/manager";
import type { JiraUser } from "@/types";

interface SessionPayload {
  user: JiraUser;
  jiraHost: string;
  email: string;
  apiToken: string;
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "No session" },
        { status: 401 }
      );
    }

    const sessionSecret = await getSecret("SESSION_SECRET");
    if (!sessionSecret) {
      return NextResponse.json(
        { success: false, error: "Session secret not configured" },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(sessionSecret);
    const { payload } = await jwtVerify(sessionCookie.value, secret);

    const session = payload as unknown as SessionPayload;

    return NextResponse.json({
      success: true,
      user: session.user,
      jiraHost: session.jiraHost,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid session" },
      { status: 401 }
    );
  }
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie) return null;

    const sessionSecret = await getSecret("SESSION_SECRET");
    if (!sessionSecret) return null;

    const secret = new TextEncoder().encode(sessionSecret);
    const { payload } = await jwtVerify(sessionCookie.value, secret);

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
