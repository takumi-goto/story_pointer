// Atlassian Document Format (ADF) utilities

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: Array<{ type: string }>;
}

interface ADFDocument {
  type: "doc";
  version: number;
  content: ADFNode[];
}

/**
 * Extract plain text from Atlassian Document Format (ADF)
 */
export function extractTextFromADF(adf: ADFDocument | string | null | undefined): string {
  if (!adf) return "";

  // If it's already a string, return it
  if (typeof adf === "string") return adf;

  // If it's not a valid ADF document, return empty
  if (typeof adf !== "object" || adf.type !== "doc" || !Array.isArray(adf.content)) {
    return "";
  }

  return extractTextFromNodes(adf.content);
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
