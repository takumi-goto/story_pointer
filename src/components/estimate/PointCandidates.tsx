"use client";

import { getPointColor } from "@/lib/utils/fibonacci";
import type { PointCandidate, StoryPoint } from "@/types";

interface PointCandidatesProps {
  candidates: PointCandidate[];
  selectedPoint: number;
}

export default function PointCandidates({ candidates, selectedPoint }: PointCandidatesProps) {
  if (!candidates || candidates.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">検討された候補ポイント:</p>
      <div className="flex flex-wrap gap-3">
        {candidates.map((candidate, index) => {
          const isSelected = candidate.points === selectedPoint;
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg font-bold ${getPointColor(candidate.points as StoryPoint).replace("bg-", "text-").split(" ")[0]}`}>
                  {candidate.points} pt
                </span>
                {isSelected && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                    採用
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">{candidate.candidateReason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
