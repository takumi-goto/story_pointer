import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecret } from "@/lib/secrets/manager";

export async function POST(request: NextRequest) {
  let modelId: string | undefined;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }
    modelId = body.modelId;

    if (!modelId || typeof modelId !== "string") {
      return NextResponse.json(
        { success: false, error: "モデルIDが指定されていません" },
        { status: 400 }
      );
    }

    // Get API key from header (LocalStorage) first, fallback to env
    const geminiApiKeyFromHeader = request.headers.get("X-Gemini-Api-Key");
    console.log("[/api/ai/verify] Header X-Gemini-Api-Key:", geminiApiKeyFromHeader ? "RECEIVED" : "NOT RECEIVED");

    let geminiApiKey: string | undefined = geminiApiKeyFromHeader || undefined;
    if (!geminiApiKey) {
      try {
        geminiApiKey = await getSecret("GEMINI_API_KEY");
      } catch {
        // Ignore error from getSecret, will use header value or fail below
      }
    }
    console.log("[/api/ai/verify] Final API key:", geminiApiKey ? "SET" : "NOT SET");

    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API Keyが設定されていません" },
        { status: 500 }
      );
    }

    // Verify by making a simple test request
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    // Simple test prompt to verify model exists
    const result = await model.generateContent("Say 'OK' if you can read this.");
    const response = result.response;
    const text = response.text();

    if (text) {
      return NextResponse.json({
        success: true,
        message: `モデル "${modelId}" は利用可能です`,
      });
    }

    return NextResponse.json(
      { success: false, error: "モデルからの応答がありません" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Model verification error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Rate limit error means the model exists (API recognized it)
    if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests") || errorMessage.includes("quota")) {
      return NextResponse.json({
        success: true,
        message: `モデル "${modelId}" は利用可能です（レート制限中ですが有効なモデルです）`,
      });
    }

    // Check for common error patterns
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return NextResponse.json(
        { success: false, error: "モデルが見つかりません" },
        { status: 404 }
      );
    }

    if (errorMessage.includes("API key") || errorMessage.includes("401")) {
      return NextResponse.json(
        { success: false, error: "API Keyが無効です" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: `検証に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
