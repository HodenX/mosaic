import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TargetConfig {
  target: number;
  min: number;
  max: number;
}

interface Props {
  classRatios: Record<string, number>;
  classValues: Record<string, number>;
  targets: Record<string, TargetConfig>;
}

const CLASS_LABELS: Record<string, string> = {
  equity: "权益",
  bond: "债券",
  gold: "黄金",
};

const CLASS_ORDER = ["equity", "bond", "gold"];

function statusColor(ratio: number, min: number, max: number) {
  if (ratio < min) return { bar: "from-yellow-400 to-yellow-500", border: "border-l-yellow-400", text: "text-yellow-600" };
  if (ratio > max) return { bar: "from-red-400 to-red-500", border: "border-l-red-400", text: "text-red-500" };
  return { bar: "from-emerald-400 to-emerald-500", border: "border-l-emerald-500", text: "text-emerald-600" };
}

export default function AssetAllocationTarget({ classRatios, classValues, targets }: Props) {
  const totalValue = Object.values(classValues).reduce((a, b) => a + b, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">资产配置目标</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {CLASS_ORDER.map((cls) => {
          const label = CLASS_LABELS[cls] ?? cls;
          const ratio = classRatios[cls] ?? 0;
          const value = classValues[cls] ?? 0;
          const t = targets[cls] ?? { target: 0, min: 0, max: 100 };
          const colors = statusColor(ratio, t.min, t.max);
          const clamped = Math.min(ratio, 100);

          return (
            <div key={cls}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className={`text-lg font-semibold tabular-nums ${colors.text}`}>
                    {ratio.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
                  <span>¥{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span>目标 {t.target}% ({t.min}%-{t.max}%)</span>
                  {ratio < t.min && <span className="text-yellow-600 font-medium">低于下限</span>}
                  {ratio > t.max && <span className="text-red-500 font-medium">高于上限</span>}
                </div>
              </div>
              {/* Gauge bar */}
              <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 bg-gradient-to-r ${colors.bar}`}
                  style={{ width: `${clamped}%` }}
                />
                {t.min > 0 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/30"
                    style={{ left: `${t.min}%` }}
                  />
                )}
                {t.max < 100 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/30"
                    style={{ left: `${t.max}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-1">
          总市值 ¥{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </CardContent>
    </Card>
  );
}
