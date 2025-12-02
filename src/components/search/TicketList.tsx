"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getPointColor } from "@/lib/utils/fibonacci";
import { formatDate } from "@/lib/utils/date";
import { extractTextFromADF } from "@/lib/utils/adf";
import type { JiraTicket, StoryPoint } from "@/types";

interface TicketListProps {
  tickets: JiraTicket[];
  boardId: string;
}

export default function TicketList({ tickets, boardId }: TicketListProps) {
  const router = useRouter();

  const handleEstimate = (ticket: JiraTicket) => {
    const description = extractTextFromADF(ticket.description);
    const params = new URLSearchParams({
      key: ticket.key,
      summary: ticket.summary,
      description: description,
      boardId,
    });
    router.push(`/estimate/${ticket.key}?${params.toString()}`);
  };

  if (tickets.length === 0) {
    return (
      <Card className="text-center py-8 text-gray-500">
        チケットが見つかりませんでした
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card key={ticket.key} className="hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-jira-blue">{ticket.key}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {ticket.issueType}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {ticket.status}
                </span>
                {ticket.storyPoints !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(ticket.storyPoints as StoryPoint)}`}>
                    {ticket.storyPoints} pt
                  </span>
                )}
              </div>

              <h3 className="mt-1 text-lg font-medium text-gray-900 truncate">
                {ticket.summary}
              </h3>

              {(() => {
                const description = extractTextFromADF(ticket.description);
                return description ? (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {description}
                  </p>
                ) : null;
              })()}

              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span>作成: {formatDate(ticket.created)}</span>
                {ticket.assignee && <span>担当: {ticket.assignee.displayName}</span>}
                {ticket.priority && <span>優先度: {ticket.priority}</span>}
              </div>
            </div>

            <div className="ml-4 flex-shrink-0">
              <Button size="sm" onClick={() => handleEstimate(ticket)}>
                ポイント推定
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
