"use client";

import { getPointColor } from "@/lib/utils/fibonacci";
import type { EstimationReference, StoryPoint } from "@/types";

interface ReferenceTicketsProps {
  references: EstimationReference[];
}

export default function ReferenceTickets({ references }: ReferenceTicketsProps) {
  // Sort by contribution weight
  const sortedReferences = [...references].sort((a, b) => b.contributionWeight - a.contributionWeight);

  return (
    <div className="space-y-3">
      {sortedReferences.map((ref, index) => (
        <div
          key={`${ref.type}-${ref.key}-${index}`}
          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* Contribution Weight Bar */}
          <div className="w-16 flex-shrink-0">
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-jira-blue rounded-full"
                style={{ width: `${ref.contributionWeight}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {ref.contributionWeight}%
            </div>
          </div>

          {/* Type Icon */}
          <div className="flex-shrink-0">
            {ref.type === "ticket" ? (
              <svg className="w-5 h-5 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-jira-blue hover:underline"
              >
                {ref.key}
              </a>
              {ref.type === "ticket" && ref.points !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPointColor(ref.points as StoryPoint)}`}>
                  {ref.points} pt
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{ref.summary}</p>
          </div>

          {/* External Link */}
          <a
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}
