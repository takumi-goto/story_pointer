"use client";

import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import ContributionRadar from "./ContributionRadar";
import ReferenceTickets from "./ReferenceTickets";
import SplitSuggestion from "./SplitSuggestion";
import { getPointColor, getPointDescription } from "@/lib/utils/fibonacci";
import type { EstimationResult, StoryPoint } from "@/types";

interface EstimateResultProps {
  result: EstimationResult;
  ticketKey: string;
  ticketSummary: string;
}

export default function EstimateResult({ result, ticketKey, ticketSummary }: EstimateResultProps) {
  return (
    <div className="space-y-6">
      {/* Main Estimation Result */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>推定結果</CardTitle>
            <CardDescription className="mt-1">
              {ticketKey}: {ticketSummary}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">信頼度:</span>
            <span className={`text-sm font-medium ${
              result.confidence >= 70 ? "text-green-600" :
              result.confidence >= 40 ? "text-yellow-600" : "text-red-600"
            }`}>
              {result.confidence}%
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getPointColor(result.estimatedPoints)}`}>
              {result.estimatedPoints}
            </div>
            <div className="mt-2 text-sm text-gray-600">ストーリーポイント</div>
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-500">
              {getPointDescription(result.estimatedPoints as StoryPoint)}
            </p>
          </div>
        </div>
      </Card>

      {/* Split Suggestion */}
      {result.shouldSplit && result.splitSuggestion && (
        <SplitSuggestion suggestion={result.splitSuggestion} />
      )}

      {/* Reasoning */}
      <Card>
        <CardTitle>推定理由</CardTitle>
        <p className="mt-4 text-gray-700 whitespace-pre-wrap">{result.reasoning}</p>
      </Card>

      {/* Contribution Factors */}
      <Card>
        <CardTitle>分析要因の寄与率</CardTitle>
        <CardDescription className="mb-4">
          各分析観点がポイント推定にどの程度影響したかを示します
        </CardDescription>
        <ContributionRadar factors={result.contributionFactors} />
      </Card>

      {/* Reference Tickets and PRs */}
      {result.references.length > 0 && (
        <Card>
          <CardTitle>参考にした過去のデータ</CardTitle>
          <CardDescription className="mb-4">
            寄与率が高いものほどポイント推定に強く影響しています
          </CardDescription>
          <ReferenceTickets references={result.references} />
        </Card>
      )}
    </div>
  );
}
