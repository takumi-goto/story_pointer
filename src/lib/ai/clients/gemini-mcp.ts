/**
 * Gemini AI Client with MCP (Model Context Protocol) integration
 * Uses real MCP SDK to connect to MCP servers
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
  type Content,
  type Part,
} from "@google/generative-ai";
import type { AIEstimationClient, EstimationContext, AIProvider, SprintDataForPrompt } from "../types";
import type {
  EstimationResult,
  StoryPoint,
  WorkTypeBreakdown,
  WorkloadFeatures,
  WorkloadSimilarityBreakdown,
  AILeverage,
  RaisePermissionCheck,
} from "@/types";
import { DEFAULT_PROMPT } from "@/lib/gemini/prompts";
import { DEFAULT_MCP_PROMPT } from "@/lib/mcp/prompts";
import { isValidStoryPoint } from "@/lib/utils/fibonacci";
import { MCPClient, createGitHubMCPClient, type MCPTool } from "@/lib/mcp/client";
import { MCPExecutor } from "@/lib/mcp/executor";
import type { JiraClient } from "@/lib/jira/client";
import type { GitHubClient } from "@/lib/github/client";

const MAX_TOOL_ITERATIONS = 10;
const MAX_TOOL_CALLS_PER_ITERATION = 5; // Limit parallel tool calls per iteration
const MAX_TOTAL_TOOL_CALLS = 12; // Total tool calls limit across all iterations (allow 2 repos × 4 calls each + extras)
const TOOL_CALL_DELAY_MS = 1000; // Delay between tool calls to avoid rate limiting
const MAX_RETRY_ATTEMPTS = 5; // Increased for free tier rate limits
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a retriable error (rate limit or server error)
 */
function isRetriableError(error: unknown): boolean {
  // Check Error instance
  if (error instanceof Error) {
    const msg = error.message;
    // Rate limit errors
    if (msg.includes("429") || msg.includes("Too Many Requests")) return true;
    // Server errors (500, 502, 503, 504)
    if (msg.includes("500") || msg.includes("Internal Server Error")) return true;
    if (msg.includes("502") || msg.includes("Bad Gateway")) return true;
    if (msg.includes("503") || msg.includes("Service Unavailable")) return true;
    if (msg.includes("504") || msg.includes("Gateway Timeout")) return true;
  }
  // Check object format (Google's API error format)
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    const status = obj.status as number | undefined;
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    if (obj.statusText === "Too Many Requests" || obj.statusText === "Internal Server Error") {
      return true;
    }
    // Check nested message
    if (typeof obj.message === "string") {
      const msg = obj.message;
      if (msg.includes("429") || msg.includes("Too Many Requests")) return true;
      if (msg.includes("500") || msg.includes("Internal Server Error")) return true;
    }
  }
  return false;
}

/**
 * Check if error is a rate limit error (for backwards compatibility)
 */
function isRateLimitError(error: unknown): boolean {
  return isRetriableError(error);
}

/**
 * Check if error is a quota exceeded error (not temporary rate limit)
 * Quota exceeded errors should not be retried - user needs to change model or wait longer
 *
 * Note: "PerMinute" quotas are rate limits, not true quota exceeded errors
 */
function isQuotaExceededError(error: unknown): boolean {
  let message: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      message = obj.message;
    }
  }

  if (message) {
    // Debug: Log what we're checking
    const hasPerMinute = message.includes("PerMinute") || message.includes("per minute");
    console.log(`[isQuotaExceededError] hasPerMinute: ${hasPerMinute}, message contains: PerMinute=${message.includes("PerMinute")}`);

    // If it's a per-minute rate limit, treat as temporary (can retry)
    if (hasPerMinute) {
      console.log(`[isQuotaExceededError] Per-minute rate limit detected, returning false (retriable)`);
      return false;
    }

    // Check for true quota exceeded indicators (billing/plan limits)
    const isRealQuotaExceeded = (
      message.includes("exceeded your current quota") ||
      message.includes("Quota exceeded") ||
      message.includes("QuotaFailure")
    );
    console.log(`[isQuotaExceededError] isRealQuotaExceeded: ${isRealQuotaExceeded}`);
    return isRealQuotaExceeded;
  }
  return false;
}

/**
 * Extract retry delay from error message if available
 */
function extractRetryDelay(error: unknown): number | null {
  let message: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      message = obj.message;
    }
  }

  if (message) {
    // Match patterns like "retry in 107.661096ms" or "retry in 5s" or "retry in 30"
    const msMatch = message.match(/retry in (\d+(?:\.\d+)?)\s*ms/i);
    if (msMatch) {
      return Math.ceil(parseFloat(msMatch[1])); // Already in ms
    }

    const secMatch = message.match(/retry in (\d+(?:\.\d+)?)\s*s(?:ec)?/i);
    if (secMatch) {
      return Math.ceil(parseFloat(secMatch[1]) * 1000); // Convert to ms
    }

    // Fallback: assume seconds if no unit
    const match = message.match(/retry in (\d+(?:\.\d+)?)/i);
    if (match) {
      const value = parseFloat(match[1]);
      // If value is very large (>1000), it's likely already ms
      return value > 1000 ? Math.ceil(value) : Math.ceil(value * 1000);
    }
  }
  return null;
}

interface GeminiWorkloadSimilarityBreakdown {
  W1_typeMatch: number;
  W2_scopeMatch: number;
  W3_investigationMatch: number;
  W4_prWorkloadMatch: number;
  W5_lexicalBonus: number;
}

interface GeminiEstimationResponse {
  estimatedPoints: number;
  reasoning: string;
  shouldSplit: boolean;
  splitSuggestion?: string;
  baseline: {
    key: string;
    summary?: string;
    points: number;
    workloadSimilarityScore: number;
    workloadSimilarityBreakdown: GeminiWorkloadSimilarityBreakdown;
    similarityReason: string[];
  };
  workTypeBreakdown?: {
    T1_small_existing_change: number;
    T2_pattern_reuse: number;
    T3_new_logic_design: number;
    T4_cross_system_impact: number;
    T5_investigation_heavy: number;
    T6_data_backfill_heavy: number;
  };
  workloadFeatures?: {
    changedModulesEstimate: string;
    changedFilesEstimate: string;
    needQueryOrBackfill: string;
  };
  aiLeverage?: {
    score: number;
    appliedReduction: string;
    reductionReason: string;
  };
  similarTickets: Array<{
    key: string;
    summary?: string;
    points: number;
    workloadSimilarityScore: number;
    workloadSimilarityBreakdown: GeminiWorkloadSimilarityBreakdown;
    similarityReason: string[];
    diff: {
      scopeDiff: number;
      fileDiff: number;
      logicDiff: number;
      riskDiff: number;
      diffTotal: number;
      diffReason: string;
    };
    relatedPRs: Array<{
      number: string;
      summary: string;
      filesChanged: number;
      commits: number;
      leadTimeDays: number;
    }>;
  }>;
  pointCandidates: Array<{
    points: number;
    candidateReason: string;
  }>;
  raisePermissionCheck?: {
    A: { passed: boolean; evidence: string };
    B: { passed: boolean; evidence: string };
    C: { passed: boolean; evidence: string };
  };
}

export interface GeminiMCPClientConfig {
  apiKey: string;
  modelId: string;
  githubToken?: string;
  jiraClient: JiraClient;
  githubClient: GitHubClient | null;
  mcpPrompt?: string;
  selectedRepositories?: string[];
  onProgress?: (message: string) => void;
}

export class GeminiMCPEstimationClient implements AIEstimationClient {
  readonly provider: AIProvider = "gemini";
  readonly modelId: string;
  private genAI: GoogleGenerativeAI;
  private githubToken?: string;
  private mcpClient: MCPClient | null = null;
  private mcpExecutor: MCPExecutor;
  private mcpPrompt?: string;
  private selectedRepositories: string[];
  private onProgress?: (message: string) => void;

  constructor(config: GeminiMCPClientConfig) {
    this.modelId = config.modelId;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.githubToken = config.githubToken;
    this.mcpExecutor = new MCPExecutor({
      jiraClient: config.jiraClient,
      githubClient: config.githubClient,
    });
    this.mcpPrompt = config.mcpPrompt;
    this.selectedRepositories = config.selectedRepositories || [];
    this.onProgress = config.onProgress;
  }

  /**
   * Send message with retry logic for rate limit errors
   * Note: Quota exceeded errors are NOT retried - user should change model settings
   */
  private async sendMessageWithRetry(
    chat: { sendMessage: (content: string | Part[]) => Promise<{ response: { candidates?: Array<{ content?: Content }> } & { text: () => string } }> },
    content: string | Part[],
    attempt: number = 0
  ): Promise<{ response: { candidates?: Array<{ content?: Content }> } & { text: () => string } }> {
    try {
      return await chat.sendMessage(content);
    } catch (error) {
      console.log(`[Gemini] API error:`, error);

      // Debug: Check error classification
      const isQuotaErr = isQuotaExceededError(error);
      const isRateLimitErr = isRateLimitError(error);
      console.log(`[Gemini] Error classification - isQuotaExceeded: ${isQuotaErr}, isRateLimit: ${isRateLimitErr}`);

      // Quota exceeded errors should not be retried - user needs to change model or wait
      if (isQuotaErr) {
        console.log(`[Gemini] Quota exceeded - not retrying. Please change model in settings.`);
        this.onProgress?.(`クォータ超過: 設定画面でモデルを変更してください`);
        throw new Error(`APIクォータを超過しました。設定画面でモデルを変更して再試行してください。`);
      }

      // Temporary rate limits can be retried
      if (isRateLimitErr && attempt < MAX_RETRY_ATTEMPTS) {
        const retryDelay = extractRetryDelay(error) ||
                          INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);

        console.log(`[Gemini] Rate limit hit, retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
        this.onProgress?.(`レート制限: ${Math.ceil(retryDelay / 1000)}秒後にリトライ...`);

        await sleep(retryDelay);
        return this.sendMessageWithRetry(chat, content, attempt + 1);
      }
      throw error;
    }
  }

  async estimateStoryPoints(context: EstimationContext): Promise<EstimationResult> {
    console.log(`[Gemini] 推定開始 - モデル: ${this.modelId}`);
    this.onProgress?.(`AIモデル: ${this.modelId}`);

    let mcpTools: MCPTool[] = [];
    let usingRealMCP = false;

    // Try to connect to GitHub MCP server if token is available
    if (this.githubToken) {
      try {
        this.onProgress?.("GitHub MCPサーバーに接続中...");
        const client = await createGitHubMCPClient(this.githubToken);
        if (client) {
          this.mcpClient = client;
          mcpTools = await this.mcpClient.listTools();
          usingRealMCP = true;
          this.onProgress?.(`MCP接続成功: ${mcpTools.length}個のツールを取得`);
        } else {
          this.onProgress?.("MCP SDK未対応環境、フォールバックモードで実行");
        }
      } catch (error) {
        console.error("Failed to connect to MCP server:", error);
        this.onProgress?.("MCP接続失敗、フォールバックモードで実行");
      }
    }

    // Convert MCP tools to Gemini function declarations
    const functionDeclarations: FunctionDeclaration[] = usingRealMCP
      ? this.convertMCPToolsToGemini(mcpTools)
      : this.getDefaultTools();

    const model = this.genAI.getGenerativeModel({
      model: this.modelId,
      tools: [{ functionDeclarations }],
    });

    // Build initial prompt with MCP instructions
    const systemPrompt = this.buildMCPPrompt(context, mcpTools);

    // Start chat with function calling enabled
    const chat = model.startChat({
      history: [],
    });

    // Initial message with retry logic
    let response = await this.sendMessageWithRetry(chat, systemPrompt);
    let result = response.response;
    let iterations = 0;
    let totalToolCalls = 0;

    // Tool calling loop
    try {
      while (iterations < MAX_TOOL_ITERATIONS) {
        const allFunctionCalls = this.extractFunctionCalls(result);

        if (allFunctionCalls.length === 0) {
          // No more function calls, we have the final response
          break;
        }

        // Check if we've exceeded total tool call limit
        if (totalToolCalls >= MAX_TOTAL_TOOL_CALLS) {
          console.log(`[MCP] Total tool call limit reached (${MAX_TOTAL_TOOL_CALLS}), skipping remaining calls`);
          this.onProgress?.(`ツール呼び出し上限に達しました（${MAX_TOTAL_TOOL_CALLS}回）`);
          break;
        }

        // Limit function calls per iteration
        const remainingCalls = MAX_TOTAL_TOOL_CALLS - totalToolCalls;
        const functionCalls = allFunctionCalls.slice(0, Math.min(MAX_TOOL_CALLS_PER_ITERATION, remainingCalls));

        if (allFunctionCalls.length > functionCalls.length) {
          console.log(`[MCP] Limiting tool calls: ${allFunctionCalls.length} requested, ${functionCalls.length} executed`);
        }

        this.onProgress?.(`MCPツール実行中: ${functionCalls.map(fc => fc.name).join(", ")}`);

        // Execute all function calls with rate limiting
        const functionResponses: Part[] = [];
        for (let i = 0; i < functionCalls.length; i++) {
          const call = functionCalls[i];
          totalToolCalls++;

          // Add delay between tool calls to avoid rate limiting
          if (i > 0) {
            await sleep(TOOL_CALL_DELAY_MS);
          }

          try {
            let toolResult: unknown;

            if (usingRealMCP && this.mcpClient) {
              // Use real MCP server
              const mcpResult = await this.mcpClient.callTool(
                call.name,
                call.args as Record<string, unknown>
              );
              toolResult = mcpResult.content.map(c => c.text || JSON.stringify(c)).join("\n");
            } else {
              // Fallback to local executor
              toolResult = await this.mcpExecutor.execute(
                call.name,
                call.args as Record<string, unknown>
              );
            }

            console.log(`[MCP] Tool ${call.name} result:`, JSON.stringify(toolResult).substring(0, 200));

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResult },
              },
            });
          } catch (error) {
            console.error(`[MCP] Tool ${call.name} error:`, error);
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: String(error) },
              },
            });
          }
        }

        // Add delay before sending results to avoid rate limiting
        await sleep(TOOL_CALL_DELAY_MS);

        // Send function results back to the model with retry logic
        response = await this.sendMessageWithRetry(chat, functionResponses);
        result = response.response;
        iterations++;
      }

      // After tool calling loop, check if response contains JSON
      // If not, explicitly ask for the JSON result
      const responseText = result.text();
      const hasJson = /\{[\s\S]*"estimatedPoints"[\s\S]*\}/.test(responseText) ||
                      /```json/.test(responseText);

      if (!hasJson && iterations > 0) {
        this.onProgress?.("最終結果をJSON形式で取得中...");
        console.log("[MCP] No JSON found after tool calls, requesting JSON explicitly");

        await sleep(TOOL_CALL_DELAY_MS);

        // Ask for JSON result explicitly with retry logic
        response = await this.sendMessageWithRetry(
          chat,
          "ツール実行結果を踏まえて、推定結果をJSON形式で出力してください。" +
          "必ず ```json で始まるコードブロック内にJSONを記述してください。"
        );
        result = response.response;
      }
    } finally {
      // Disconnect from MCP server
      if (this.mcpClient) {
        try {
          await this.mcpClient.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        this.mcpClient = null;
      }
    }

    // Parse final response
    const text = result.text();
    return this.parseEstimationResponse(text);
  }

  /**
   * Convert MCP tools to Gemini function declarations
   */
  private convertMCPToolsToGemini(mcpTools: MCPTool[]): FunctionDeclaration[] {
    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(tool.inputSchema.properties || {}).map(([key, value]) => [
            key,
            {
              type: SchemaType.STRING,
              description: (value as { description?: string }).description || "",
            },
          ])
        ),
        required: tool.inputSchema.required || [],
      },
    }));
  }

  /**
   * Default tools when MCP server is not available
   */
  private getDefaultTools(): FunctionDeclaration[] {
    return [
      {
        name: "get_jira_ticket",
        description: "Jiraからチケットの詳細情報を取得します",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticketKey: { type: SchemaType.STRING, description: "Jiraチケットキー" },
          },
          required: ["ticketKey"],
        },
      },
      {
        name: "get_ticket_pull_requests",
        description: "チケットに関連するPR一覧を取得します",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticketKey: { type: SchemaType.STRING, description: "Jiraチケットキー" },
          },
          required: ["ticketKey"],
        },
      },
      {
        name: "get_pull_request_files",
        description: "PRの変更ファイルとdiffを取得します",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            prUrl: { type: SchemaType.STRING, description: "GitHub PR URL" },
          },
          required: ["prUrl"],
        },
      },
      {
        name: "analyze_code_changes",
        description: "PRの変更内容を分析します",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            prUrl: { type: SchemaType.STRING, description: "GitHub PR URL" },
          },
          required: ["prUrl"],
        },
      },
      {
        name: "search_pull_requests",
        description: "キーワードでGitHubのPRを検索します。チケット内容から関連PRを探すのに使用",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keywords: { type: SchemaType.STRING, description: "検索キーワード" },
            repo: { type: SchemaType.STRING, description: "リポジトリ名（例: eviry-private/kt-list-api）" },
          },
          required: ["keywords"],
        },
      },
    ];
  }

  private buildMCPPrompt(context: EstimationContext, mcpTools: MCPTool[] = []): string {
    const basePrompt = context.customPrompt || DEFAULT_PROMPT;

    // Generate dynamic tool documentation from actual MCP tools
    let toolDocs = "";
    if (mcpTools.length > 0) {
      toolDocs = mcpTools
        .map((tool, i) => `${i + 1}. **${tool.name}**: ${tool.description || "ツール"}`)
        .join("\n");
    } else {
      // Default tool documentation for fallback mode
      toolDocs = `1. **get_jira_ticket**: Jiraチケットの詳細を取得
2. **get_ticket_pull_requests**: チケットに関連するPRの一覧を取得
3. **get_pull_request_files**: PRの変更ファイルとdiffを取得
4. **analyze_code_changes**: PRの変更内容を分析
5. **search_pull_requests**: キーワードでGitHubのPRを検索（チケット内容から関連PRを探す）
6. **list_recent_prs**: リポジトリから最近マージされたPRの一覧を取得（キーワード検索で見つからない場合に使用）`;
    }

    // Build repositories list for prompt
    let repositoriesList = "（リポジトリ未設定 - 設定画面でリポジトリを選択してください）";
    if (this.selectedRepositories.length > 0) {
      repositoriesList = this.selectedRepositories.map((repo) => `- ${repo}`).join("\n");
    }

    // Use custom MCP prompt if provided, otherwise use default
    const mcpTemplate = this.mcpPrompt || DEFAULT_MCP_PROMPT;
    const mcpInstructions = mcpTemplate
      .replace("{toolDocs}", toolDocs)
      .replace(/{targetTicketKey}/g, context.targetTicket.key)
      .replace("{repositories}", repositoriesList);

    // Compact sprint data to reduce token count
    const compactSprintData = this.compactSprintData(context.sprintData);
    const originalCount = context.sprintData.reduce((sum: number, s: SprintDataForPrompt) => sum + s.tickets.length, 0);
    const compactCount = compactSprintData.reduce((sum: number, s: SprintDataForPrompt) => sum + s.tickets.length, 0);
    console.log(`[Gemini] Sprint data compacted: ${originalCount} -> ${compactCount} tickets`);
    this.onProgress?.(`推定に使うチケット数は最大100件までです（${originalCount}件→${compactCount}件）`);

    // Build the prompt with proper replacements
    const formattedPrompt = basePrompt
      .replace("{ticketSummary}", context.targetTicket.summary)
      .replace("{ticketDescription}", context.targetTicket.description || "説明なし")
      .replace("{sprintData}", JSON.stringify(compactSprintData, null, 2));

    return mcpInstructions + formattedPrompt;
  }

  /**
   * Compact sprint data to reduce token count
   * - Only include tickets with story points (useful for baseline)
   * - Total max 100 tickets, distributed evenly across sprints
   * - Extra slots go to most recent sprints (first in array)
   */
  private compactSprintData(sprintData: SprintDataForPrompt[]): SprintDataForPrompt[] {
    const MAX_TOTAL_TICKETS = 100;

    type Ticket = SprintDataForPrompt["tickets"][number];

    // First, filter to only tickets with story points
    const sprintsWithFilteredTickets = sprintData.map(sprint => ({
      ...sprint,
      tickets: sprint.tickets.filter((t: Ticket) => t.storyPoints !== undefined && t.storyPoints > 0),
    }));

    const numSprints = sprintsWithFilteredTickets.length;
    if (numSprints === 0) return sprintsWithFilteredTickets;

    // Calculate even distribution
    const basePerSprint = Math.floor(MAX_TOTAL_TICKETS / numSprints);
    const extraTickets = MAX_TOTAL_TICKETS % numSprints;

    // Distribute tickets: extra slots go to most recent sprints (first in array)
    return sprintsWithFilteredTickets.map((sprint, index) => {
      const limit = basePerSprint + (index < extraTickets ? 1 : 0);
      return {
        sprintName: sprint.sprintName,
        tickets: sprint.tickets
          .slice(0, limit)
          .map((t: Ticket) => ({
            key: t.key,
            summary: t.summary,
            description: t.description,
            storyPoints: t.storyPoints,
            daysToComplete: t.daysToComplete,
            // Omit pullRequests to save tokens (MCP can fetch if needed)
          })),
      };
    });
  }

  private extractFunctionCalls(response: { candidates?: Array<{ content?: Content }> }): FunctionCall[] {
    const calls: FunctionCall[] = [];

    if (!response.candidates) return calls;

    for (const candidate of response.candidates) {
      if (!candidate.content?.parts) continue;

      for (const part of candidate.content.parts) {
        if ("functionCall" in part && part.functionCall) {
          calls.push(part.functionCall);
        }
      }
    }

    return calls;
  }

  private parseEstimationResponse(text: string): EstimationResult {
    // Log response for debugging
    console.log("[Gemini] Response length:", text.length);
    console.log("[Gemini] Response preview:", text.substring(0, 500));
    if (text.length > 500) {
      console.log("[Gemini] Response end:", text.substring(text.length - 200));
    }

    // Try multiple patterns to extract JSON
    let jsonString: string | null = null;

    // Pattern 1: ```json ... ```
    const jsonBlockMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      console.log("[Gemini] Found JSON in ```json``` block");
      jsonString = jsonBlockMatch[1];
    }

    // Pattern 2: ``` ... ``` (code block without language)
    if (!jsonString) {
      const codeBlockMatch = text.match(/```\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        console.log("[Gemini] Found JSON in ``` ``` block");
        jsonString = codeBlockMatch[1];
      }
    }

    // Pattern 3: Raw JSON object
    if (!jsonString) {
      const rawJsonMatch = text.match(/\{[\s\S]*"estimatedPoints"[\s\S]*\}/);
      if (rawJsonMatch) {
        console.log("[Gemini] Found raw JSON object");
        jsonString = rawJsonMatch[0];
      }
    }

    if (!jsonString) {
      console.error("[Gemini] Failed to find JSON in response");
      console.error("[Gemini] Full response:", text);
      throw new Error(
        `Failed to parse JSON response from Gemini - no JSON block found. ` +
        `Response length: ${text.length}, preview: ${text.substring(0, 200)}`
      );
    }

    const sanitizedJson = this.sanitizeJsonString(jsonString);
    const parsed: GeminiEstimationResponse = JSON.parse(sanitizedJson);

    // Validate and normalize the response
    const estimatedPoints = this.normalizeStoryPoint(parsed.estimatedPoints);

    // Build baseline with fallback for missing data
    const baseline = parsed.baseline
      ? {
          key: parsed.baseline.key || "N/A",
          summary: parsed.baseline.summary,
          points: parsed.baseline.points || 0,
          workloadSimilarityScore: this.normalizeWorkloadSimilarityScore(
            parsed.baseline.workloadSimilarityScore || 0
          ),
          workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(
            parsed.baseline.workloadSimilarityBreakdown
          ),
          similarityReason: parsed.baseline.similarityReason || [],
        }
      : {
          key: "N/A",
          points: 0,
          workloadSimilarityScore: 0,
          workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(undefined),
          similarityReason: [],
        };

    // Build workloadFeatures
    const workloadFeatures: WorkloadFeatures | undefined = parsed.workloadFeatures
      ? {
          changedModulesEstimate: parsed.workloadFeatures.changedModulesEstimate || "不明",
          changedFilesEstimate: parsed.workloadFeatures.changedFilesEstimate || "不明",
          needQueryOrBackfill: parsed.workloadFeatures.needQueryOrBackfill || "不明",
        }
      : undefined;

    // Build workTypeBreakdown
    const workTypeBreakdown: WorkTypeBreakdown | undefined = parsed.workTypeBreakdown
      ? {
          T1_small_existing_change: parsed.workTypeBreakdown.T1_small_existing_change || 0,
          T2_pattern_reuse: parsed.workTypeBreakdown.T2_pattern_reuse || 0,
          T3_new_logic_design: parsed.workTypeBreakdown.T3_new_logic_design || 0,
          T4_cross_system_impact: parsed.workTypeBreakdown.T4_cross_system_impact || 0,
          T5_investigation_heavy: parsed.workTypeBreakdown.T5_investigation_heavy || 0,
          T6_data_backfill_heavy: parsed.workTypeBreakdown.T6_data_backfill_heavy || 0,
        }
      : undefined;

    // Build aiLeverage
    const aiLeverage: AILeverage | undefined = parsed.aiLeverage
      ? {
          score: parsed.aiLeverage.score || 0,
          appliedReduction: (parsed.aiLeverage.appliedReduction === "down_one_level"
            ? "down_one_level"
            : "none") as "none" | "down_one_level",
          reductionReason: parsed.aiLeverage.reductionReason || "",
        }
      : undefined;

    // Build raisePermissionCheck
    const raisePermissionCheck: RaisePermissionCheck | undefined = parsed.raisePermissionCheck
      ? {
          A: {
            passed: parsed.raisePermissionCheck.A?.passed || false,
            evidence: parsed.raisePermissionCheck.A?.evidence || "",
          },
          B: {
            passed: parsed.raisePermissionCheck.B?.passed || false,
            evidence: parsed.raisePermissionCheck.B?.evidence || "",
          },
          C: {
            passed: parsed.raisePermissionCheck.C?.passed || false,
            evidence: parsed.raisePermissionCheck.C?.evidence || "",
          },
        }
      : undefined;

    return {
      estimatedPoints,
      reasoning: parsed.reasoning || "",
      shouldSplit: parsed.shouldSplit || estimatedPoints >= 13,
      splitSuggestion: parsed.splitSuggestion || "",
      baseline,
      workTypeBreakdown,
      workloadFeatures,
      aiLeverage,
      similarTickets: (parsed.similarTickets || [])
        .filter((ticket) => ticket != null)
        .map((ticket) => ({
          key: ticket.key || "N/A",
          summary: ticket.summary,
          points: ticket.points || 0,
          workloadSimilarityScore: this.normalizeWorkloadSimilarityScore(
            ticket.workloadSimilarityScore || 0
          ),
          workloadSimilarityBreakdown: this.normalizeWorkloadSimilarityBreakdown(
            ticket.workloadSimilarityBreakdown
          ),
          similarityReason: ticket.similarityReason || [],
          diff: ticket.diff
            ? {
                scopeDiff: this.normalizeDiffValue(ticket.diff.scopeDiff || 0),
                fileDiff: this.normalizeDiffValue(ticket.diff.fileDiff || 0),
                logicDiff: this.normalizeDiffValue(ticket.diff.logicDiff || 0),
                riskDiff: this.normalizeDiffValue(ticket.diff.riskDiff || 0),
                diffTotal: ticket.diff.diffTotal || 0,
                diffReason: ticket.diff.diffReason || "",
              }
            : {
                scopeDiff: 0,
                fileDiff: 0,
                logicDiff: 0,
                riskDiff: 0,
                diffTotal: 0,
                diffReason: "",
              },
          relatedPRs: (ticket.relatedPRs || []).map((pr) => ({
            number: pr.number || "",
            summary: pr.summary || "",
            filesChanged: pr.filesChanged || 0,
            commits: pr.commits || 0,
            leadTimeDays: pr.leadTimeDays || 0,
          })),
        })),
      pointCandidates: (parsed.pointCandidates || []).map((candidate) => ({
        points: candidate.points || 0,
        candidateReason: candidate.candidateReason || "",
      })),
      raisePermissionCheck,
    };
  }

  private normalizeStoryPoint(value: number): StoryPoint {
    if (isValidStoryPoint(value)) {
      return value;
    }

    const validPoints: StoryPoint[] = [0.5, 1, 2, 3, 5, 8, 13];
    let closest: StoryPoint = 1;
    let minDiff = Math.abs(value - 1);

    for (const point of validPoints) {
      const diff = Math.abs(value - point);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }

  private normalizeWorkloadSimilarityScore(value: number): number {
    return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
  }

  private normalizeWorkloadSimilarityBreakdown(
    breakdown: GeminiWorkloadSimilarityBreakdown | undefined
  ): WorkloadSimilarityBreakdown {
    if (!breakdown) {
      return {
        W1_typeMatch: 0,
        W2_scopeMatch: 0,
        W3_investigationMatch: 0,
        W4_prWorkloadMatch: 0,
        W5_lexicalBonus: 0,
      };
    }
    return {
      W1_typeMatch: Math.min(6, Math.max(0, breakdown.W1_typeMatch || 0)),
      W2_scopeMatch: Math.min(2, Math.max(0, breakdown.W2_scopeMatch || 0)),
      W3_investigationMatch: Math.min(1, Math.max(0, breakdown.W3_investigationMatch || 0)),
      W4_prWorkloadMatch: Math.min(1, Math.max(0, breakdown.W4_prWorkloadMatch || 0)),
      W5_lexicalBonus: 0, // 廃止
    };
  }

  private normalizeDiffValue(value: number): number {
    return Math.min(2, Math.max(-2, Math.round(value)));
  }

  private sanitizeJsonString(jsonStr: string): string {
    // Remove control characters except valid whitespace (tab \x09, newline \x0A, carriage return \x0D)
    // eslint-disable-next-line no-control-regex
    const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    let result = jsonStr
      .replace(controlCharRegex, "")
      .replace(/,(\s*[}\]])/g, "$1");

    try {
      JSON.parse(result);
      return result;
    } catch {
      result = result
        .replace(/'/g, '"')
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
        .replace(/^\uFEFF/, "")
        .trim();

      return result;
    }
  }
}
