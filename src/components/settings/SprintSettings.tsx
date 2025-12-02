"use client";

import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useSettingsStore, MIN_SPRINT_COUNT, MAX_SPRINT_COUNT } from "@/store/settings";

export default function SprintSettings() {
  const { sprintCount, setSprintCount, sprintNameExample, setSprintNameExample } = useSettingsStore();

  // Generate options from MIN to MAX (3-10)
  const sprintOptions = Array.from(
    { length: MAX_SPRINT_COUNT - MIN_SPRINT_COUNT + 1 },
    (_, i) => {
      const value = MIN_SPRINT_COUNT + i;
      return { value, label: `直近${value}スプリント` };
    }
  );

  return (
    <Card>
      <CardTitle>スプリント設定</CardTitle>
      <CardDescription className="mb-4">
        ポイント推定に使用する過去のスプリント数を設定します
      </CardDescription>

      <div className="space-y-4">
        <Input
          label="スプリント名の例"
          placeholder="例: スプリント86"
          value={sprintNameExample || ""}
          onChange={(e) => setSprintNameExample(e.target.value || undefined)}
          helperText="現在のスプリント名を入力してください。命名パターンの特定に使用します"
        />

        <Select
          label="参照スプリント数"
          value={sprintCount.toString()}
          onChange={(e) => setSprintCount(parseInt(e.target.value))}
          options={sprintOptions}
        />

        <p className="text-sm text-gray-500">
          スプリント数を増やすとより多くのデータを参照しますが、推定に時間がかかる場合があります
        </p>
      </div>
    </Card>
  );
}
