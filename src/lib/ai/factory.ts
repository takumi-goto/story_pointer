import type { AIEstimationClient, AIClientConfig, AIProvider } from "./types";
import { GeminiEstimationClient } from "./clients/gemini";

// Default model ID (Gemini 2.5 Pro)
export const DEFAULT_MODEL_ID = "gemini-2.5-pro-preview-06-05";

export function createAIClient(config: AIClientConfig): AIEstimationClient {
  switch (config.provider) {
    case "gemini":
      return new GeminiEstimationClient(config.apiKey, config.modelId);

    case "claude":
      // TODO: Implement Claude client
      throw new Error("Claude client is not yet implemented");

    case "openai":
      // TODO: Implement OpenAI client
      throw new Error("OpenAI client is not yet implemented");

    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

// Helper to get provider from model ID based on naming convention
export function getProviderFromModelId(modelId: string): AIProvider {
  const lowerModelId = modelId.toLowerCase();

  if (lowerModelId.startsWith("gemini")) {
    return "gemini";
  }

  if (lowerModelId.startsWith("claude") || lowerModelId.includes("anthropic")) {
    return "claude";
  }

  if (lowerModelId.startsWith("gpt") || lowerModelId.startsWith("o1") || lowerModelId.includes("openai")) {
    return "openai";
  }

  // Default to gemini for unknown models
  return "gemini";
}
