"use client";

import type { WorkTypeBreakdown, AILeverage } from "@/types";

interface AILeverageSectionProps {
  workTypeBreakdown?: WorkTypeBreakdown;
  aiLeverage?: AILeverage;
}

const workTypeLabels: Record<keyof WorkTypeBreakdown, { label: string; aiEfficient: boolean }> = {
  T1_small_existing_change: { label: "T1: 既存コード小規模改修", aiEfficient: true },
  T2_pattern_reuse: { label: "T2: 既存パターン踏襲", aiEfficient: true },
  T3_new_logic_design: { label: "T3: 新規ロジック設計", aiEfficient: false },
  T4_cross_system_impact: { label: "T4: 横断的影響", aiEfficient: false },
  T5_investigation_heavy: { label: "T5: 調査・切り分け主体", aiEfficient: false },
  T6_data_backfill_heavy: { label: "T6: データ補正主体", aiEfficient: false },
};

function LevelBadge({ level }: { level: number }) {
  const colors = [
    "bg-gray-100 text-gray-500",
    "bg-yellow-100 text-yellow-700",
    "bg-orange-100 text-orange-700",
  ];
  const labels = ["該当なし", "一部あり", "主要作業"];
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[level] || colors[0]}`}>
      {labels[level] || labels[0]}
    </span>
  );
}

export default function AILeverageSection({ workTypeBreakdown, aiLeverage }: AILeverageSectionProps) {
  if (!workTypeBreakdown && !aiLeverage) return null;

  return (
    <div className="space-y-4">
      {/* Work Type Breakdown */}
      {workTypeBreakdown && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">作業タイプ分解</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(workTypeBreakdown) as [keyof WorkTypeBreakdown, number][]).map(([key, level]) => {
              const info = workTypeLabels[key];
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-2 rounded border ${
                    info.aiEfficient ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {info.aiEfficient && (
                      <span className="text-xs text-green-600">🤖</span>
                    )}
                    <span className="text-xs text-gray-700">{info.label}</span>
                  </div>
                  <LevelBadge level={level} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Leverage Score */}
      {aiLeverage && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">AIレバレッジスコア</span>
            <span className={`text-lg font-bold ${
              aiLeverage.score >= 6 ? "text-green-600" :
              aiLeverage.score >= 2 ? "text-blue-600" : "text-gray-600"
            }`}>
              {aiLeverage.score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">補正:</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              aiLeverage.appliedReduction === "down_one_level"
                ? "bg-green-200 text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}>
              {aiLeverage.appliedReduction === "down_one_level" ? "1段階減" : "なし"}
            </span>
          </div>
          {aiLeverage.reductionReason && (
            <p className="text-xs text-gray-600 mt-2">{aiLeverage.reductionReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
