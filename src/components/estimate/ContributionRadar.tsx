"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ContributionFactors } from "@/types";

interface ContributionRadarProps {
  factors: ContributionFactors;
}

const factorLabels: Record<keyof ContributionFactors, string> = {
  descriptionComplexity: "説明の複雑さ",
  similarTickets: "類似チケット",
  prMetrics: "PRメトリクス",
  historicalVelocity: "過去のベロシティ",
  uncertainty: "不確実性",
};

export default function ContributionRadar({ factors }: ContributionRadarProps) {
  const data = Object.entries(factors).map(([key, value]) => ({
    factor: factorLabels[key as keyof ContributionFactors],
    value,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fontSize: 12 }}
            className="text-gray-600"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
          />
          <Radar
            name="寄与率"
            dataKey="value"
            stroke="#0052CC"
            fill="#0052CC"
            fillOpacity={0.5}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "寄与率"]}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
