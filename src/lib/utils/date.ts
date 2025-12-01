export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isWithinDays(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = calculateDaysBetween(dateString, now.toISOString());
  return diffDays <= days;
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 30) {
    return formatDate(dateString);
  } else if (diffDays > 0) {
    return `${diffDays}日前`;
  } else if (diffHours > 0) {
    return `${diffHours}時間前`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分前`;
  } else {
    return "たった今";
  }
}
