"use client";

import Card from "@/components/ui/Card";

interface SplitSuggestionProps {
  suggestion: string;
}

export default function SplitSuggestion({ suggestion }: SplitSuggestionProps) {
  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-yellow-800">
            チケット分割を推奨
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            このチケットは大きすぎる可能性があります。以下の分割を検討してください：
          </p>
          <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
