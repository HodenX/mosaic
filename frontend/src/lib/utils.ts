import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format currency with ¥ and thousand separators. decimals defaults to 2. */
export function formatCurrency(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "-";
  return `¥${val.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Format percentage like "10.24%". */
export function formatPercent(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "-";
  return `${val.toFixed(decimals)}%`;
}

/** Format large numbers for chart Y-axis: 100000 → "10万" */
export function formatWan(val: number): string {
  if (Math.abs(val) >= 10000) return `${(val / 10000).toFixed(val % 10000 === 0 ? 0 : 1)}万`;
  return val.toLocaleString("zh-CN");
}
