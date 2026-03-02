import { useCallback, useMemo, useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWan } from "@/lib/utils";
import type { PortfolioTrend } from "@/types";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "1M", label: "1月", days: 30 },
  { key: "3M", label: "3月", days: 90 },
  { key: "6M", label: "6月", days: 180 },
  { key: "1Y", label: "1年", days: 365 },
  { key: "ALL", label: "全部", days: 0 },
];

function fmtDate(dateStr: string, range: Range): string {
  const d = new Date(dateStr);
  if (range === "1M") return `${d.getMonth() + 1}/${d.getDate()}`;
  if (range === "3M" || range === "6M") return `${d.getMonth() + 1}月`;
  return `${String(d.getFullYear()).slice(2)}年`;
}

function fmtSigned(v: number): string {
  const sign = v > 0 ? "+" : "";
  if (Math.abs(v) >= 10000) return `${sign}${(v / 10000).toFixed(2)}万`;
  return `${sign}${v.toFixed(0)}`;
}

/** 根据 range 计算理论截止日字符串（yyyy-mm-dd），ALL 返回 null */
function rangeCutoff(range: Range): string | null {
  if (range === "ALL") return null;
  const days = RANGES.find((r) => r.key === range)!.days;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  data: PortfolioTrend[];
}

type RechartsMouseEvent = { activePayload?: { payload: PortfolioTrend }[] };

export default function TrendChart({ data }: Props) {
  const [range, setRange] = useState<Range>("ALL");
  const [activePoint, setActivePoint] = useState<PortfolioTrend | null>(null);

  const filtered = useMemo(() => {
    if (range === "ALL" || !data.length) return data;
    const cutoffStr = rangeCutoff(range)!;
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

  // 判断某个 range 是否有独立的数据区间（起点早于数据的全局最早点则说明数据不够）
  const dataSpanDays = useMemo(() => {
    if (data.length < 2) return 0;
    const first = new Date(data[0].date).getTime();
    const last  = new Date(data[data.length - 1].date).getTime();
    return Math.round((last - first) / 86400000);
  }, [data]);

  const isRangeDisabled = useCallback((r: { key: Range; days: number }) => {
    if (r.key === "ALL") return false;
    // 若所选区间天数 > 数据跨度，这个 range 不能提供比更短区间更多的信息
    return r.days > dataSpanDays + 3; // +3 容忍周末/节假日空洞
  }, [dataSpanDays]);

  const chartData = useMemo(() =>
    filtered.map((d) => ({ ...d })),
    [filtered]
  );

  const yDomain = useMemo((): [number, number] => {
    if (!filtered.length) return [0, 1];
    const vals = filtered.flatMap((d) => [d.total_value, d.total_cost]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.2 || max * 0.02;
    return [Math.max(0, min - pad), max + pad];
  }, [filtered]);

  const display = activePoint ?? filtered.at(-1) ?? null;
  const periodFirst = filtered[0] ?? null;

  // 区间涨跌：起止点相同时不显示（数据只有一条）
  const periodDelta = display && periodFirst && display.date !== periodFirst.date
    ? display.total_value - periodFirst.total_value
    : null;
  const periodDeltaPct = periodDelta != null && periodFirst.total_value > 0
    ? (periodDelta / periodFirst.total_value) * 100 : null;

  // 持仓盈亏：自买入累计，与区间无关
  const pnlPct = display && display.total_cost > 0
    ? (display.total_pnl / display.total_cost) * 100 : null;

  const isPnlUp    = (display?.total_pnl ?? 0) >= 0;
  const isPeriodUp = (periodDelta ?? 0) >= 0;

  const onMouseMove = useCallback((e: RechartsMouseEvent) => {
    if (e.activePayload?.length) setActivePoint(e.activePayload[0].payload);
  }, []);
  const onMouseLeave = useCallback(() => setActivePoint(null), []);

  if (!data.length) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-0 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">组合走势</CardTitle>
        <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5">
          {RANGES.map((r) => {
            const disabled = isRangeDisabled(r);
            return (
              <button
                key={r.key}
                disabled={disabled}
                onClick={() => { setRange(r.key); setActivePoint(null); }}
                title={disabled ? `数据不足 ${r.days} 天` : undefined}
                className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
                  disabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : range === r.key
                      ? "bg-background shadow-sm text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* ── Stats bar ── */}
      {display && (
        <div className="px-6 pt-3 pb-1 flex items-end gap-6 min-h-[60px]">
          {/* 当前/悬停市值 */}
          <div className="transition-all duration-150">
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {activePoint ? activePoint.date : "当前市值"}
            </p>
            <p className="text-2xl font-semibold tabular-nums leading-none">
              ¥{display.total_value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* 区间涨跌（随区间变化） */}
          {periodDelta != null ? (
            <div className="transition-all duration-150">
              <p className="text-[11px] text-muted-foreground mb-0.5">
                区间{isPeriodUp ? "涨" : "跌"}（自 {periodFirst?.date}）
              </p>
              <p className={`text-sm font-medium tabular-nums leading-none ${isPeriodUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {fmtSigned(periodDelta)}
                <span className="text-xs ml-1 opacity-80">
                  ({periodDeltaPct != null ? fmtSigned(periodDeltaPct) + "%" : "—"})
                </span>
              </p>
            </div>
          ) : (
            <div className="transition-all duration-150">
              <p className="text-[11px] text-muted-foreground mb-0.5">区间涨跌</p>
              <p className="text-sm text-muted-foreground/50 leading-none">数据不足</p>
            </div>
          )}

          {/* 持仓盈亏（累计，不随区间变化） */}
          <div className="transition-all duration-150">
            <p className="text-[11px] text-muted-foreground mb-0.5">总盈亏 · 自买入</p>
            <p className={`text-sm font-medium tabular-nums leading-none ${isPnlUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {fmtSigned(display.total_pnl)}
              <span className="text-xs ml-1 opacity-80">
                ({pnlPct != null ? fmtSigned(pnlPct) + "%" : "—"})
              </span>
            </p>
          </div>

          {/* 持仓成本（右对齐） */}
          <div className="ml-auto transition-all duration-150">
            <p className="text-[11px] text-muted-foreground mb-0.5 text-right">持仓成本</p>
            <p className="text-sm tabular-nums text-muted-foreground leading-none text-right">
              ¥{display.total_cost.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      <CardContent className="pt-2 pb-3 px-2">
        <ResponsiveContainer width="100%" height={180} key={range}>
          <ComposedChart
            data={chartData}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-1)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => fmtDate(v, range)}
              interval="preserveStartEnd"
              minTickGap={48}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatWan}
              domain={yDomain}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={40}
            />
            <Tooltip
              content={() => null}
              cursor={{ stroke: "var(--foreground)", strokeWidth: 1, strokeOpacity: 0.15, strokeDasharray: "3 3" }}
            />

            <Area
              type="monotone"
              dataKey="total_value"
              fill="url(#gradValue)"
              stroke="none"
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="total_cost"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="total_value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--background)", stroke: "var(--chart-1)", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex gap-4 justify-end px-2 mt-1">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-5 h-0.5 rounded bg-[var(--chart-1)]" />
            总市值
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-5 border-t-2 border-dashed border-[var(--chart-2)]" />
            持仓成本
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
