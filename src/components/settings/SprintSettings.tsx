"use client";

import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { useSettingsStore } from "@/store/settings";

export default function SprintSettings() {
  const { sprintCount, setSprintCount } = useSettingsStore();

  const sprintOptions = [
    { value: 5, label: "直近5スプリント" },
    { value: 10, label: "直近10スプリント" },
    { value: 15, label: "直近15スプリント" },
    { value: 20, label: "直近20スプリント" },
    { value: 25, label: "直近25スプリント" },
    { value: 30, label: "直近30スプリント" },
  ];

  return (
    <Card>
      <CardTitle>スプリント設定</CardTitle>
      <CardDescription className="mb-4">
        ポイント推定に使用する過去のスプリント数を設定します
      </CardDescription>

      <Select
        label="参照スプリント数"
        value={sprintCount.toString()}
        onChange={(e) => setSprintCount(parseInt(e.target.value))}
        options={sprintOptions}
      />

      <p className="mt-2 text-sm text-gray-500">
        スプリント数を増やすとより多くのデータを参照しますが、推定に時間がかかる場合があります
      </p>
    </Card>
  );
}
