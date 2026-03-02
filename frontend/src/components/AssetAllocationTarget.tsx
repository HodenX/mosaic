import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TargetConfig {
  target: number;
  min: number;
  max: number;
}

interface Props {
  classValues: Record<string, number>;
  targets: Record<string, TargetConfig>;
  totalBudget?: number;
}

const CLASS_LABELS: Record<string, string> = {
  equity: "权益",
  bond: "债券",
  gold: "黄金",
};

const CLASS_ORDER = ["equity", "bond", "gold"];

// Bullet chart: bar represents 0–SCALE% of target (so target line sits at 67% of bar width)
const BULLET_SCALE = 150;

export default function AssetAllocationTarget({ classValues, targets, totalBudget }: Props) {
  const currentTotal = Object.values(classValues).reduce((a, b) => a + b, 0);
  const referenceTotal = totalBudget ?? currentTotal;
  const pendingTotal = referenceTotal - currentTotal;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">资产配置目标</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[3.5rem_5.5rem_3.5rem_1fr_5rem] gap-x-3 text-xs text-muted-foreground mb-2 px-0.5">
          <span />
          <span className="text-right">当前市值</span>
          <span className="text-right">达成率</span>
          <span className="pl-1">进度（{BULLET_SCALE}% 满格）</span>
          <span className="text-right">缺口</span>
        </div>

        <div className="space-y-3">
          {CLASS_ORDER.map((cls) => {
            const label = CLASS_LABELS[cls] ?? cls;
            const value = classValues[cls] ?? 0;
            const t = targets[cls] ?? { target: 0, min: 0, max: 100 };
            const targetAmount = referenceTotal * t.target / 100;
            const displayRatio = targetAmount > 0 ? (value / targetAmount * 100) : 0;
            const minThreshold = t.target > 0 ? (t.min / t.target * 100) : 0;
            const maxThreshold = t.target > 0 ? (t.max / t.target * 100) : 100;
            const gap = targetAmount - value;

            const isBelow = displayRatio < minThreshold;
            const isAbove = displayRatio > maxThreshold;
            const barColor = isBelow ? "bg-yellow-400" : isAbove ? "bg-red-400" : "bg-emerald-500";
            const textColor = isBelow ? "text-yellow-600 dark:text-yellow-400" : isAbove ? "text-red-500" : "text-emerald-600 dark:text-emerald-400";

            // Map percentages onto the bullet chart's 0–BULLET_SCALE range → 0–100% width
            const fillW    = Math.min(displayRatio / BULLET_SCALE * 100, 100);
            const rangeL   = minThreshold / BULLET_SCALE * 100;
            const rangeR   = 100 - Math.min(maxThreshold / BULLET_SCALE * 100, 100);
            const targetX  = (100 / BULLET_SCALE * 100); // target line at 100% of target

            return (
              <div key={cls} className="grid grid-cols-[3.5rem_5.5rem_3.5rem_1fr_5rem] gap-x-3 items-center">
                {/* Label */}
                <span className="text-sm font-medium">{label}</span>

                {/* Current value */}
                <span className="text-right text-sm tabular-nums font-mono">
                  ¥{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>

                {/* Achievement ratio */}
                <span className={`text-right text-sm font-semibold tabular-nums ${textColor}`}>
                  {displayRatio.toFixed(1)}%
                </span>

                {/* Bullet chart */}
                <div className="relative h-5 rounded bg-muted/30 overflow-hidden">
                  {/* Acceptable range band */}
                  <div
                    className="absolute inset-y-0 bg-muted/70"
                    style={{ left: `${rangeL}%`, right: `${rangeR}%` }}
                  />
                  {/* Current fill bar */}
                  <div
                    className={`absolute top-1 bottom-1 left-0 rounded-sm transition-all duration-300 ${barColor}`}
                    style={{ width: `${fillW}%` }}
                  />
                  {/* Target line */}
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/40"
                    style={{ left: `${targetX}%` }}
                  />
                  {/* Min / max labels inside chart */}
                  <span
                    className="absolute top-0.5 text-[9px] text-foreground/40 leading-none"
                    style={{ left: `${rangeL + 0.5}%` }}
                  >
                    {t.min}%
                  </span>
                  <span
                    className="absolute top-0.5 text-[9px] text-foreground/40 leading-none"
                    style={{ right: `${rangeR + 0.5}%` }}
                  >
                    {t.max}%
                  </span>
                </div>

                {/* Gap */}
                <span className={`text-right text-xs tabular-nums font-medium ${gap > 0 ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {gap > 0
                    ? `-¥${Math.round(gap).toLocaleString()}`
                    : `+¥${Math.round(-gap).toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">
          <span>目标 <span className="font-medium text-foreground">¥{referenceTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
          <span>已投 <span className="font-medium text-foreground">¥{currentTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
          <span className={pendingTotal > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600 dark:text-emerald-400"}>
            {pendingTotal > 0 ? "待投" : "超出"}{" "}
            <span className="font-medium">¥{Math.abs(pendingTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
