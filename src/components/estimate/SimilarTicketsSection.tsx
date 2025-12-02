"use client";

import { useEffect, useState } from "react";
import { getPointColor } from "@/lib/utils/fibonacci";
import { useApiKeysStore } from "@/store/apiKeys";
import type { BaselineTicket, SimilarTicket, StoryPoint } from "@/types";

interface SimilarTicketsSectionProps {
  baseline: BaselineTicket;
  similarTickets: SimilarTicket[];
}

function JiraTicketLink({ ticketKey, summary, jiraHost }: { ticketKey: string; summary?: string; jiraHost: string | null }) {
  const url = jiraHost ? `https://${jiraHost}/browse/${ticketKey}` : null;

  return (
    <div className="flex flex-col">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {ticketKey}
        </a>
      ) : (
        <span className="font-medium">{ticketKey}</span>
      )}
      {summary && (
        <span className="text-xs text-gray-500 truncate max-w-[300px]" title={summary}>
          {summary}
        </span>
      )}
    </div>
  );
}

function WorkloadSimilarityBadge({ score }: { score: number }) {
  // Score is 0-10, map to color based on ranges
  let color = "bg-gray-100 text-gray-600";
  if (score >= 8) color = "bg-blue-100 text-blue-600";
  else if (score >= 6) color = "bg-green-100 text-green-600";
  else if (score >= 4) color = "bg-yellow-100 text-yellow-600";
  else if (score >= 2) color = "bg-orange-100 text-orange-600";
  else if (score > 0) color = "bg-red-100 text-red-600";

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      作業量類似度 {score}/10
    </span>
  );
}

function DiffBadge({ value, label }: { value: number; label: string }) {
  let color = "bg-gray-100 text-gray-600";
  if (value > 0) color = "bg-red-100 text-red-600";
  if (value < 0) color = "bg-green-100 text-green-600";

  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
      {label}: {sign}{value}
    </span>
  );
}

function DiffTotalBadge({ value }: { value: number }) {
  let color = "bg-gray-200 text-gray-700";
  if (value >= 3) color = "bg-red-200 text-red-700";
  else if (value <= -3) color = "bg-green-200 text-green-700";
  else if (value > 0) color = "bg-orange-200 text-orange-700";
  else if (value < 0) color = "bg-blue-200 text-blue-700";

  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-sm px-2 py-1 rounded font-medium ${color}`}>
      差分合計: {sign}{value}
    </span>
  );
}

export default function SimilarTicketsSection({ baseline, similarTickets }: SimilarTicketsSectionProps) {
  const [jiraHost, setJiraHost] = useState<string | null>(null);

  useEffect(() => {
    // Get jiraHost from store or fetch from env config
    const fetchJiraHost = async () => {
      // First try from store
      const storeHost = useApiKeysStore.getState().jiraHost;
      if (storeHost) {
        setJiraHost(storeHost);
        return;
      }

      // Fallback: fetch from env config
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.jiraHost) {
            setJiraHost(result.data.jiraHost);
          }
        }
      } catch (error) {
        console.error("Failed to fetch env config:", error);
      }
    };

    fetchJiraHost();

    // Subscribe to store changes
    const unsubscribe = useApiKeysStore.subscribe((state) => {
      if (state.jiraHost) {
        setJiraHost(state.jiraHost);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div className="space-y-6">
      {/* Baseline Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">ベースラインチケット</h4>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <JiraTicketLink ticketKey={baseline.key} summary={baseline.summary} jiraHost={jiraHost} />
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(baseline.points as StoryPoint)}`}>
                {baseline.points} pt
              </span>
              <WorkloadSimilarityBadge score={baseline.workloadSimilarityScore} />
            </div>
          </div>
          {baseline.similarityReason && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">類似理由:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {(Array.isArray(baseline.similarityReason)
                  ? baseline.similarityReason
                  : [baseline.similarityReason]
                ).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Similar Tickets List */}
      {similarTickets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">類似チケット一覧</h4>
          <div className="space-y-4">
            {similarTickets.map((ticket) => (
              <div
                key={ticket.key}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <JiraTicketLink ticketKey={ticket.key} summary={ticket.summary} jiraHost={jiraHost} />
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(ticket.points as StoryPoint)}`}>
                      {ticket.points} pt
                    </span>
                    <WorkloadSimilarityBadge score={ticket.workloadSimilarityScore} />
                  </div>
                  {ticket.diff && <DiffTotalBadge value={ticket.diff.diffTotal} />}
                </div>

                {/* Similarity Reasons */}
                {ticket.similarityReason && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">類似理由:</p>
                    <ul className="text-sm text-gray-600 space-y-0.5">
                      {(Array.isArray(ticket.similarityReason)
                        ? ticket.similarityReason
                        : [ticket.similarityReason]
                      ).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diff Evaluation */}
                {ticket.diff && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">差分評価:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <DiffBadge value={ticket.diff.scopeDiff} label="範囲" />
                      <DiffBadge value={ticket.diff.fileDiff} label="ファイル" />
                      <DiffBadge value={ticket.diff.logicDiff} label="難易度" />
                      <DiffBadge value={ticket.diff.riskDiff} label="リスク" />
                    </div>
                    {ticket.diff.diffReason && (
                      <p className="text-xs text-gray-500 mt-2 italic">{ticket.diff.diffReason}</p>
                    )}
                  </div>
                )}

                {/* Related PRs */}
                {ticket.relatedPRs && ticket.relatedPRs.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">関連PR:</p>
                    <div className="space-y-1">
                      {ticket.relatedPRs.map((pr, prIdx) => (
                        <div key={prIdx} className="text-xs text-gray-600 bg-white p-2 rounded border">
                          <span className="font-medium">#{pr.number}</span>
                          {pr.summary && <span className="ml-2">{pr.summary}</span>}
                          <div className="flex gap-2 mt-1 text-gray-400">
                            <span>{pr.filesChanged} files</span>
                            <span>{pr.commits} commits</span>
                            {pr.leadTimeDays > 0 && <span>{pr.leadTimeDays} days</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
