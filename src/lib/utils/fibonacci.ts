import type { StoryPoint } from "@/types";

export const FIBONACCI_POINTS: StoryPoint[] = [0.5, 1, 2, 3, 5, 8, 13];

export function isValidStoryPoint(value: number): value is StoryPoint {
  return FIBONACCI_POINTS.includes(value as StoryPoint);
}

export function getNearestFibonacci(value: number): StoryPoint {
  if (value <= 0.5) return 0.5;
  if (value >= 13) return 13;

  let closest: StoryPoint = 0.5;
  let minDiff = Math.abs(value - 0.5);

  for (const point of FIBONACCI_POINTS) {
    const diff = Math.abs(value - point);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}

export function getHigherFibonacci(point: StoryPoint): StoryPoint | null {
  const index = FIBONACCI_POINTS.indexOf(point);
  if (index === -1 || index === FIBONACCI_POINTS.length - 1) {
    return null;
  }
  return FIBONACCI_POINTS[index + 1];
}

export function getLowerFibonacci(point: StoryPoint): StoryPoint | null {
  const index = FIBONACCI_POINTS.indexOf(point);
  if (index <= 0) {
    return null;
  }
  return FIBONACCI_POINTS[index - 1];
}

export function shouldSuggestSplit(point: StoryPoint): boolean {
  return point >= 13;
}

export function getPointColor(point: StoryPoint): string {
  const colors: Record<StoryPoint, string> = {
    0.5: "bg-green-100 text-green-800",
    1: "bg-green-200 text-green-800",
    2: "bg-blue-100 text-blue-800",
    3: "bg-blue-200 text-blue-800",
    5: "bg-yellow-100 text-yellow-800",
    8: "bg-orange-100 text-orange-800",
    13: "bg-red-100 text-red-800",
  };
  return colors[point];
}

export function getPointDescription(point: StoryPoint): string {
  const descriptions: Record<StoryPoint, string> = {
    0.5: "ほぼ確実な軽微な変更",
    1: "シンプルな変更、明確な実装",
    2: "少し複雑だが見通しの良いタスク",
    3: "中程度の複雑さ、いくつかの不確実性",
    5: "複雑なタスク、調査が必要な可能性",
    8: "かなり複雑、多くの不確実性",
    13: "非常に複雑、分割を検討すべき",
  };
  return descriptions[point];
}
