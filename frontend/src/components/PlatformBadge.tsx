// 贾维斯: 创建投资平台徽章组件

import { cn } from "@/lib/utils";

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  "支付宝": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "蚂蚁财富": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "天天基金": "bg-red-500/10 text-red-700 border-red-500/20",
  "招商银行": "bg-green-500/10 text-green-700 border-green-500/20",
  "工商银行": "bg-red-600/10 text-red-800 border-red-600/20",
  "建设银行": "bg-blue-600/10 text-blue-800 border-blue-600/20",
  "中国银行": "bg-red-500/10 text-red-700 border-red-500/20",
  "农业银行": "bg-green-600/10 text-green-800 border-green-600/20",
  "交通银行": "bg-blue-700/10 text-blue-900 border-blue-700/20",
  "浦发银行": "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  "兴业银行": "bg-sky-500/10 text-sky-700 border-sky-500/20",
  "平安银行": "bg-orange-600/10 text-orange-800 border-orange-600/20",
};

const DEFAULT_COLOR = "bg-muted/30 text-muted-foreground border-muted/30";

export const PLATFORMS = [
  "支付宝",
  "蚂蚁财富",
  "天天基金",
  "招商银行",
  "工商银行",
  "建设银行",
  "中国银行",
  "农业银行",
  "交通银行",
  "浦发银行",
  "兴业银行",
  "平安银行",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const colorClass = PLATFORM_COLORS[platform] || DEFAULT_COLOR;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        colorClass,
        className
      )}
    >
      {platform || "未知"}
    </span>
  );
}
