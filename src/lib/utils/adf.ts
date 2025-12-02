// Atlassian Document Format (ADF) utilities
import type { ADFDocument } from "@/types";

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: Array<{ type: string }>;
}

/**
 * Extract plain text from Atlassian Document Format (ADF)
 */
export function extractTextFromADF(adf: ADFDocument | string | null | undefined): string {
  if (!adf) return "";

  // If it's already a string, return it
  if (typeof adf === "string") return adf;

  // If it's not a valid ADF document, try to handle gracefully
  if (typeof adf !== "object") {
    console.warn("[ADF] Unexpected type:", typeof adf);
    return "";
  }

  // Handle ADF document
  if (adf.type === "doc" && Array.isArray(adf.content)) {
    return extractTextFromNodes(adf.content as ADFNode[]);
  }

  // Handle case where content might be at root level (some Jira versions)
  if (Array.isArray((adf as unknown as { content: ADFNode[] }).content)) {
    return extractTextFromNodes((adf as unknown as { content: ADFNode[] }).content);
  }

  console.warn("[ADF] Unrecognized format:", JSON.stringify(adf).substring(0, 200));
  return "";
}

function extractTextFromNodes(nodes: ADFNode[]): string {
  const texts: string[] = [];

  for (const node of nodes) {
    if (node.text) {
      texts.push(node.text);
    }

    if (node.content && Array.isArray(node.content)) {
      texts.push(extractTextFromNodes(node.content));
    }

    // Add newlines for block elements
    if (["paragraph", "heading", "bulletList", "orderedList", "listItem", "codeBlock"].includes(node.type)) {
      texts.push("\n");
    }
  }

  return texts.join("").trim();
}

/**
 * Check if a value is an ADF document
 */
export function isADFDocument(value: unknown): value is ADFDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as ADFDocument).type === "doc" &&
    "version" in value &&
    "content" in value
  );
}
