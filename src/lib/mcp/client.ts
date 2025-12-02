/**
 * MCP Client interface
 *
 * Note: Real MCP SDK integration is currently disabled due to bundling issues with Next.js/Turbopack.
 * The application uses a fallback mode with direct Jira/GitHub API calls instead.
 *
 * To enable real MCP:
 * 1. Run locally (not in Docker)
 * 2. Set ENABLE_MCP=true in environment
 * 3. Ensure @modelcontextprotocol/sdk is properly installed
 */

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}

/**
 * MCP Client class - placeholder for when MCP SDK is available
 */
export class MCPClient {
  private connected = false;

  async connect(_config: MCPServerConfig): Promise<void> {
    // Real implementation would use @modelcontextprotocol/sdk
    throw new Error("MCP SDK not available in this environment");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      throw new Error("Not connected to MCP server");
    }
    return [];
  }

  async callTool(_name: string, _args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.connected) {
      throw new Error("Not connected to MCP server");
    }
    return { content: [] };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Try to create and connect to GitHub MCP server
 * Currently always returns null - fallback mode is used instead
 *
 * The application will use MCPExecutor (direct API calls) as fallback
 */
export async function createGitHubMCPClient(_githubToken: string): Promise<MCPClient | null> {
  // MCP SDK integration disabled - use fallback mode with direct API calls
  // This avoids bundling issues with Next.js/Turbopack and Docker
  console.log("MCP: Using fallback mode (direct API calls)");
  return null;
}

/**
 * Try to create and connect to a custom MCP server
 * Currently always returns null - fallback mode is used instead
 */
export async function createMCPClient(_config: MCPServerConfig): Promise<MCPClient | null> {
  console.log("MCP: Using fallback mode (direct API calls)");
  return null;
}
