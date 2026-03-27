import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 简单的相对时间格式化
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  const month = target.getMonth() + 1;
  const day = target.getDate();
  return `${month}月${day}日`;
}

/** 计算步骤列表的总耗时 */
export function calculateDuration(steps: { started_at?: string; completed_at?: string }[]): string | null {
  if (steps.length === 0) return null

  const firstStep = steps.find(s => s.started_at)
  const completedSteps = steps.filter(s => s.completed_at)
  const lastStep = completedSteps[completedSteps.length - 1]

  if (!firstStep?.started_at || !lastStep?.completed_at) return null

  const start = dayjs(firstStep.started_at)
  const end = dayjs(lastStep.completed_at)
  const diffMs = end.diff(start)

  if (diffMs < 1000) {
    return `${diffMs}ms`
  } else if (diffMs < 60000) {
    return `${(diffMs / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}
