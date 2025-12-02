/**
 * Extract related ticket keys from ticket description
 * Supports formats like:
 * - KT-1234
 * - [KT-1234]
 * - KT-1234: Title
 * - Links to Jira tickets
 */
export function extractRelatedTicketKeys(
  description: string,
  currentTicketKey: string,
  projectKey?: string
): string[] {
  if (!description) return [];

  // Default pattern matches common project key formats (2-10 uppercase letters followed by dash and numbers)
  const pattern = projectKey
    ? new RegExp(`\\b(${projectKey}-\\d+)\\b`, "gi")
    : /\b([A-Z]{2,10}-\d+)\b/g;

  const matches = description.match(pattern) || [];

  // Remove duplicates and the current ticket key
  const uniqueKeys = [...new Set(matches.map((key) => key.toUpperCase()))].filter(
    (key) => key !== currentTicketKey.toUpperCase()
  );

  return uniqueKeys;
}

/**
 * Parse ticket description to find explicit references to related work
 * Returns structured information about the relationship
 */
export interface RelatedTicketReference {
  key: string;
  relationship: "parent" | "related" | "similar" | "dependency" | "unknown";
  context?: string;
}

export function parseRelatedTicketReferences(
  description: string,
  currentTicketKey: string,
  projectKey?: string
): RelatedTicketReference[] {
  if (!description) return [];

  const ticketKeys = extractRelatedTicketKeys(description, currentTicketKey, projectKey);
  const references: RelatedTicketReference[] = [];

  for (const key of ticketKeys) {
    // Try to determine the relationship type based on surrounding context
    const keyPattern = new RegExp(`(.{0,100})${key}(.{0,100})`, "i");
    const match = description.match(keyPattern);

    let relationship: RelatedTicketReference["relationship"] = "unknown";
    let context: string | undefined;

    if (match) {
      const surroundingText = (match[1] + match[2]).toLowerCase();
      context = match[0].trim();

      // Determine relationship type based on context
      if (
        surroundingText.includes("同様") ||
        surroundingText.includes("同じ") ||
        surroundingText.includes("similar")
      ) {
        relationship = "similar";
      } else if (
        surroundingText.includes("親") ||
        surroundingText.includes("parent") ||
        surroundingText.includes("にて")
      ) {
        relationship = "parent";
      } else if (
        surroundingText.includes("依存") ||
        surroundingText.includes("前提") ||
        surroundingText.includes("depend") ||
        surroundingText.includes("blocked")
      ) {
        relationship = "dependency";
      } else if (
        surroundingText.includes("関連") ||
        surroundingText.includes("related") ||
        surroundingText.includes("参照")
      ) {
        relationship = "related";
      }
    }

    references.push({ key, relationship, context });
  }

  return references;
}

/**
 * Determine if a related ticket is likely the "parent" work that this ticket is based on
 * (e.g., "Do the same thing for CSV download as we did for the sort feature")
 */
export function findParentTicket(
  references: RelatedTicketReference[]
): RelatedTicketReference | null {
  // Prioritize: parent > similar > dependency > related > unknown
  const priority: RelatedTicketReference["relationship"][] = [
    "parent",
    "similar",
    "dependency",
    "related",
  ];

  for (const rel of priority) {
    const found = references.find((r) => r.relationship === rel);
    if (found) return found;
  }

  // Return the first reference if no specific relationship found
  return references.length > 0 ? references[0] : null;
}
