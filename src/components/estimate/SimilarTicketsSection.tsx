"use client";

import { getPointColor } from "@/lib/utils/fibonacci";
import type { BaselineTicket, SimilarTicket, StoryPoint } from "@/types";

interface SimilarTicketsSectionProps {
  baseline: BaselineTicket;
  similarTickets: SimilarTicket[];
}

function SimilarityBadge({ score }: { score: number }) {
  const colors = [
    "bg-gray-100 text-gray-600",
    "bg-red-100 text-red-600",
    "bg-orange-100 text-orange-600",
    "bg-yellow-100 text-yellow-600",
    "bg-green-100 text-green-600",
    "bg-blue-100 text-blue-600",
  ];
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[score] || colors[0]}`}>
      類似度 {score}/5
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
  return (
    <div className="space-y-6">
      {/* Baseline Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">ベースラインチケット</h4>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">{baseline.key}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(baseline.points as StoryPoint)}`}>
                {baseline.points} pt
              </span>
              <SimilarityBadge score={baseline.similarityScore} />
            </div>
          </div>
          {baseline.similarityReason && baseline.similarityReason.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">類似理由:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {baseline.similarityReason.map((reason, idx) => (
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
            {similarTickets.map((ticket, index) => (
              <div
                key={ticket.key}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{ticket.key}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(ticket.points as StoryPoint)}`}>
                      {ticket.points} pt
                    </span>
                    <SimilarityBadge score={ticket.similarityScore} />
                  </div>
                  {ticket.diff && <DiffTotalBadge value={ticket.diff.diffTotal} />}
                </div>

                {/* Similarity Reasons */}
                {ticket.similarityReason && ticket.similarityReason.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">類似理由:</p>
                    <ul className="text-sm text-gray-600 space-y-0.5">
                      {ticket.similarityReason.map((reason, idx) => (
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
