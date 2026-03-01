import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Landmark, TrendingUp, Shield, ChevronRight, Pencil } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardApi } from "@/services/api";
import { formatCurrency, formatWan } from "@/lib/utils";
import type { AllocationTarget, DashboardSummary, Reminder, TotalAssetTrend } from "@/types";

const LEVEL_COLORS: Record<string, string> = {
  urgent: "oklch(0.55 0.22 25)",
  warning: "oklch(0.65 0.14 80)",
  info: "oklch(0.50 0.12 165)",
};

const trendChartConfig = {
  total_assets: { label: "\u603B\u8D44\u4EA7", color: "var(--chart-1)" },
} satisfies ChartConfig;

type TrendRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

// --- useCountUp hook ---
function useCountUp(target: number, duration: number, trigger: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, trigger]);

  return value;
}

// --- BucketRow sub-component ---
interface BucketRowProps {
  color: string;
  label: string;
  amount: number;
  totalAssets: number;
  targetPct: number | null;
  animated: boolean;
}

function BucketRow({ color, label, amount, totalAssets, targetPct, animated }: BucketRowProps) {
  const currentPct = totalAssets > 0 ? (amount / totalAssets) * 100 : 0;
  const targetAmount = targetPct !== null && totalAssets > 0 ? (targetPct / 100) * totalAssets : null;
  const deviation = targetAmount !== null ? amount - targetAmount : null;

  const isOnTarget = deviation !== null && Math.abs(currentPct - (targetPct ?? 0)) <= 5;
  const isOver = deviation !== null && deviation > 0 && !isOnTarget;

  const animatedPct = useCountUp(currentPct, 800, animated);

  return (
    <div className="group py-2.5 px-1 rounded-lg hover:bg-muted/40 transition-colors duration-150">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm tabular-nums font-serif font-medium">
          {formatCurrency(amount)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-2 bg-muted rounded-full overflow-visible">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              width: animated ? `${Math.min(currentPct, 100)}%` : "0%",
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
          {targetPct !== null && (
            <div
              className="absolute top-[-3px] bottom-[-3px] w-0.5 rounded-full transition-opacity duration-300"
              style={{
                left: `${Math.min(targetPct, 100)}%`,
                backgroundColor: isOnTarget
                  ? "oklch(0.60 0.15 145)"
                  : "oklch(0.40 0.01 0)",
                opacity: animated ? 0.9 : 0,
                transitionDelay: animated ? "400ms" : "0ms",
              }}
            />
          )}
        </div>

        <div
          className="flex items-center gap-1.5 transition-opacity duration-300"
          style={{ opacity: animated ? 1 : 0, transitionDelay: animated ? "200ms" : "0ms" }}
        >
          <span className="text-sm tabular-nums font-serif font-semibold w-12 text-right">
            {animatedPct.toFixed(1)}%
          </span>
          {targetPct !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              / {targetPct}%
            </span>
          )}
        </div>

        {deviation !== null && (
          <div
            className="shrink-0 text-xs tabular-nums font-serif font-medium px-1.5 py-0.5 rounded-md transition-all duration-300"
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? "translateX(0)" : "translateX(8px)",
              transitionDelay: animated ? "600ms" : "0ms",
              backgroundColor: isOnTarget
                ? "oklch(0.93 0.05 145)"
                : isOver
                ? "oklch(0.95 0.04 25)"
                : "oklch(0.95 0.06 80)",
              color: isOnTarget
                ? "oklch(0.45 0.12 145)"
                : isOver
                ? "oklch(0.50 0.18 25)"
                : "oklch(0.55 0.14 75)",
            }}
          >
            {isOnTarget
              ? "达标"
              : isOver
              ? `超 +${formatWan(deviation)}`
              : `欠 ${formatWan(deviation)}`}
          </div>
        )}
      </div>
    </div>
  );
}

const trendRanges: { key: TrendRange; label: string; days: number }[] = [
  { key: "1M", label: "1\u6708", days: 30 },
  { key: "3M", label: "3\u6708", days: 90 },
  { key: "6M", label: "6\u6708", days: 180 },
  { key: "1Y", label: "1\u5E74", days: 365 },
  { key: "ALL", label: "\u5168\u90E8", days: 0 },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [trendData, setTrendData] = useState<TotalAssetTrend[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("ALL");
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Allocation targets state
  const [targets, setTargets] = useState<AllocationTarget | null>(null);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false);
  const [animRevision, setAnimRevision] = useState(0);
  const [barAnimated, setBarAnimated] = useState(false);

  // Dialog form state
  const [draftLiquid, setDraftLiquid] = useState("20");
  const [draftStable, setDraftStable] = useState("30");
  const [draftGrowth, setDraftGrowth] = useState("50");
  const [savingTargets, setSavingTargets] = useState(false);

  useEffect(() => {
    dashboardApi.summary().then(setSummary);
    dashboardApi.reminders().then(setReminders);
    dashboardApi.trend(0).then(setTrendData);
    dashboardApi.allocationTargets().then((t) => {
      setTargets(t);
      setTargetsLoaded(true);
      if (t) {
        setDraftLiquid(String(t.liquid_target));
        setDraftStable(String(t.stable_target));
        setDraftGrowth(String(t.growth_target));
      }
    });
  }, []);

  const filteredTrend = useMemo(() => {
    if (trendRange === "ALL" || !trendData.length) return trendData;
    const days = trendRanges.find((r) => r.key === trendRange)!.days;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return trendData.filter((d) => d.date >= cutoffStr);
  }, [trendData, trendRange]);

  const handleSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      await dashboardApi.snapshot();
      const updated = await dashboardApi.trend(0);
      setTrendData(updated);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Trigger bar animation when data is ready or targets change
  useEffect(() => {
    if (!summary || !targetsLoaded) return;
    setBarAnimated(false);
    const t = setTimeout(() => setBarAnimated(true), 50);
    return () => clearTimeout(t);
  }, [summary, targetsLoaded, animRevision]);

  const handleSaveTargets = useCallback(async () => {
    const l = parseFloat(draftLiquid) || 0;
    const s = parseFloat(draftStable) || 0;
    const g = parseFloat(draftGrowth) || 0;
    if (Math.round(l + s + g) !== 100) return;
    setSavingTargets(true);
    try {
      const updated = await dashboardApi.updateAllocationTargets({
        liquid_target: l,
        stable_target: s,
        growth_target: g,
      });
      setTargets(updated);
      setAnimRevision((r) => r + 1);
      setTargetsDialogOpen(false);
    } finally {
      setSavingTargets(false);
    }
  }, [draftLiquid, draftStable, draftGrowth]);

  const draftTotal = Math.round(
    (parseFloat(draftLiquid) || 0) +
    (parseFloat(draftStable) || 0) +
    (parseFloat(draftGrowth) || 0)
  );

  if (!summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-[120px] rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  const isProfit = summary.total_return >= 0;
  const returnColor = isProfit ? "text-red-500" : "text-green-500";

  const growthPnl = summary.buckets.growth.total_pnl;
  const isGrowthProfit = growthPnl >= 0;
  const growthPnlColor = isGrowthProfit ? "text-red-500" : "text-green-500";

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <h2 className="text-xl font-semibold">{"\u8D44\u4EA7\u603B\u89C8"}</h2>

      {/* 1. Total Assets Card */}
      <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
            {"\u5BB6\u5EAD\u603B\u8D44\u4EA7"}
          </p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
            {formatCurrency(summary.total_assets)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{"\u603B\u6536\u76CA"}</span>
            <span className={`text-sm font-medium tabular-nums font-serif ${returnColor}`}>
              {isProfit ? "+" : ""}
              {formatCurrency(summary.total_return)}
            </span>
            <span className={`text-xs tabular-nums font-serif ${returnColor}`}>
              ({isProfit ? "+" : ""}
              {summary.total_return_percent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {"\u5E74\u4FDD\u8D39\u652F\u51FA"} <span className="font-serif">{formatCurrency(summary.buckets.insurance.annual_premium)}</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Four Bucket Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Liquid */}
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out border-t-2 border-t-bucket-liquid">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u6D3B\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(summary.buckets.liquid.amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u9884\u4F30\u5E74\u6536\u76CA"} <span className="font-serif">{formatCurrency(summary.buckets.liquid.estimated_return)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {"\u5171"}{summary.buckets.liquid.count}{"\u7B14"}
              </p>
            </div>
            <button
              onClick={() => navigate("/liquid")}
              className="group flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              <span className="group-hover:underline underline-offset-2">{"\u67E5\u770B"}</span> <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Stable */}
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out border-t-2 border-t-bucket-stable">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u7A33\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(summary.buckets.stable.amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u9884\u4F30\u5E74\u6536\u76CA"} <span className="font-serif">{formatCurrency(summary.buckets.stable.estimated_return)}</span>
              </p>
              {summary.buckets.stable.nearest_maturity_days != null && (
                <p className="text-xs text-amber-600 mt-1">
                  {"\u6700\u8FD1\u5230\u671F: "}{summary.buckets.stable.nearest_maturity_days}{"\u5929"}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/stable")}
              className="group flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              <span className="group-hover:underline underline-offset-2">{"\u67E5\u770B"}</span> <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out border-t-2 border-t-primary">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u957F\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
                {formatCurrency(summary.buckets.growth.total_amount)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-medium tabular-nums font-serif ${growthPnlColor}`}>
                  {isGrowthProfit ? "+" : ""}
                  {formatCurrency(growthPnl)}
                </span>
                <span className={`text-xs tabular-nums font-serif ${growthPnlColor}`}>
                  ({isGrowthProfit ? "+" : ""}
                  {summary.buckets.growth.pnl_percent.toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u5171"}{summary.buckets.growth.count}{"\u53EA\u57FA\u91D1"}
              </p>
            </div>
            <button
              onClick={() => navigate("/growth/overview")}
              className="group flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              <span className="group-hover:underline underline-offset-2">{"\u67E5\u770B"}</span> <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out border-t-2 border-t-bucket-insurance">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u4FDD\u969C"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                <span className="tabular-nums font-serif">{summary.buckets.insurance.active_count}</span>
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {"\u4EFD\u751F\u6548\u4FDD\u5355"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u5E74\u4FDD\u8D39"} <span className="font-serif">{formatCurrency(summary.buckets.insurance.annual_premium)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.buckets.insurance.covered_persons}{"\u4EBA\u8986\u76D6"}
              </p>
              {summary.buckets.insurance.nearest_renewal_days != null && (
                <p className="text-xs text-amber-600 mt-1">
                  {"\u6700\u8FD1\u7EED\u8D39: "}{summary.buckets.insurance.nearest_renewal_days}{"\u5929"}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/insurance")}
              className="group flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              <span className="group-hover:underline underline-offset-2">{"\u67E5\u770B"}</span> <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* 3. Asset Allocation Bars */}
      <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">{"资产配置"}</CardTitle>
          <button
            onClick={() => setTargetsDialogOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {"编辑目标"}
          </button>
        </CardHeader>
        <CardContent className="space-y-0">
          {!targets && targetsLoaded && (
            <button
              onClick={() => setTargetsDialogOpen(true)}
              className="w-full mb-3 rounded-md border border-dashed border-muted-foreground/30 py-2.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-center"
            >
              {"尚未设置目标比例，点此配置 →"}
            </button>
          )}
          <BucketRow
            color="var(--bucket-liquid)"
            label={"活钱"}
            amount={summary.buckets.liquid.amount}
            totalAssets={summary.total_assets}
            targetPct={targets?.liquid_target ?? null}
            animated={barAnimated}
          />
          <BucketRow
            color="var(--bucket-stable)"
            label={"稳钱"}
            amount={summary.buckets.stable.amount}
            totalAssets={summary.total_assets}
            targetPct={targets?.stable_target ?? null}
            animated={barAnimated}
          />
          <BucketRow
            color="var(--color-primary, var(--chart-1))"
            label={"长钱"}
            amount={summary.buckets.growth.total_amount}
            totalAssets={summary.total_assets}
            targetPct={targets?.growth_target ?? null}
            animated={barAnimated}
          />
        </CardContent>
      </Card>

      {/* Allocation Target Dialog */}
      <Dialog open={targetsDialogOpen} onOpenChange={setTargetsDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>{"设置目标配置"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{"活钱目标比例"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draftLiquid}
                  onChange={(e) => setDraftLiquid(e.target.value)}
                  className="h-8 text-right tabular-nums font-serif"
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{"稳钱目标比例"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draftStable}
                  onChange={(e) => setDraftStable(e.target.value)}
                  className="h-8 text-right tabular-nums font-serif"
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{"长钱目标比例"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draftGrowth}
                  onChange={(e) => setDraftGrowth(e.target.value)}
                  className="h-8 text-right tabular-nums font-serif"
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
            </div>
            <div className={`flex items-center justify-end gap-1 text-xs ${draftTotal === 100 ? "text-emerald-600" : "text-red-500"}`}>
              <span>{"合计"}</span>
              <span className="tabular-nums font-serif font-medium">{draftTotal}%</span>
              <span>{draftTotal === 100 ? "✓" : "（需等于 100%）"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={handleSaveTargets}
              disabled={draftTotal !== 100 || savingTargets}
            >
              {savingTargets ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3.5. Total Asset Trend Chart */}
      <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">{"\u8D44\u4EA7\u8D70\u52BF"}</CardTitle>
          {filteredTrend.length > 0 && (
            <div className="flex gap-1">
              {trendRanges.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setTrendRange(r.key)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    trendRange === r.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredTrend.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm text-muted-foreground">
                {"\u6682\u65E0\u5386\u53F2\u6570\u636E\uFF0C\u6570\u636E\u5C06\u6BCF\u65E5\u81EA\u52A8\u8BB0\u5F55"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSnapshot}
                disabled={snapshotLoading}
              >
                {snapshotLoading ? "\u8BB0\u5F55\u4E2D..." : "\u7ACB\u5373\u8BB0\u5F55"}
              </Button>
            </div>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
              <ComposedChart data={filteredTrend}>
                <defs>
                  <linearGradient id="fillTotalAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatWan} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="total_assets" fill="url(#fillTotalAssets)" stroke="none" />
                <Line type="monotone" dataKey="total_assets" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. Reminders List */}
      <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{"\u5F85\u529E\u4E8B\u9879"}</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {"\u6682\u65E0\u5F85\u529E\u4E8B\u9879"}
            </p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md p-2 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => navigate(r.link)}
                >
                  <span className="mt-1.5 shrink-0">
                    <span
                      className="block h-2 w-2 rounded-full"
                      style={{ backgroundColor: LEVEL_COLORS[r.level] ?? LEVEL_COLORS.info }}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.detail}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
