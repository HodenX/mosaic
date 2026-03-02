import { useCallback, useMemo, useRef, useState } from "react";
import {
  Area, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
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

function rangeCutoff(range: Range): string | null {
  if (range === "ALL") return null;
  const days = RANGES.find((r) => r.key === range)!.days;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string, range: Range): string {
  const d = new Date(dateStr);
  if (range === "1M") return `${d.getMonth() + 1}/${d.getDate()}`;
  if (range === "3M" || range === "6M") return `${d.getMonth() + 1}月`;
  return `${String(d.getFullYear()).slice(2)}年`;
}

function fmtSigned(v: number): string {
  const sign = v > 0 ? "+" : "";
  if (Math.abs(v) >= 10000) return `${sign}${(v / 10000).toFixed(2)}万`;
  return `${sign}${Math.round(v).toLocaleString()}`;
}

function fmtMoney(v: number): string {
  if (v >= 10000) return `¥${(v / 10000).toFixed(2)}万`;
  return `¥${Math.round(v).toLocaleString()}`;
}

// Custom cursor: vertical dashed line + dot marker
const CustomCursor = ({ points, height }: { points?: { x: number; y: number }[]; height?: number }) => {
  if (!points?.length) return null;
  const { x, y } = points[0];
  return (
    <g>
      <line
        x1={x} y1={0} x2={x} y2={height}
        stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="4 3"
        className="text-foreground"
      />
      <circle cx={x} cy={y} r={10} fill="var(--chart-1)" fillOpacity={0.08} />
      <circle cx={x} cy={y} r={4} fill="var(--background)" stroke="var(--chart-1)" strokeWidth={2} />
    </g>
  );
};

// Floating tooltip card that follows the cursor
const TooltipCard = ({
  active, payload, coordinate,
}: {
  active?: boolean;
  payload?: { payload: PortfolioTrend & { pnl_pos: number } }[];
  coordinate?: { x: number; y: number };
}) => {
  if (!active || !payload?.length || !coordinate) return null;
  const d = payload[0].payload;
  const pnl = d.total_pnl;
  const pnlPct = d.total_cost > 0 ? (pnl / d.total_cost * 100) : 0;
  const up = pnl >= 0;
  return (
    <div
      className="pointer-events-none absolute z-10 bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]"
      style={{ left: coordinate.x + 12, top: coordinate.y - 40, transform: "translateY(-50%)" }}
    >
      <p className="text-muted-foreground mb-1.5 font-medium">{d.date}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">市值</span>
          <span className="font-semibold tabular-nums">{fmtMoney(d.total_value)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">成本</span>
          <span className="tabular-nums text-muted-foreground">{fmtMoney(d.total_cost)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-0.5 border-t border-border/40 mt-0.5">
          <span className="text-muted-foreground">盈亏</span>
          <span className={`font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {fmtSigned(pnl)} ({up ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

interface Props {
  data: PortfolioTrend[];
}

type RechartsMouseEvent = { activePayload?: { payload: PortfolioTrend }[] };

export default function TrendChart({ data }: Props) {
  const [range, setRange] = useState<Range>("ALL");
  const [activePoint, setActivePoint] = useState<PortfolioTrend | null>(null);
  const [pressing, setPressing] = useState<Range | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (range === "ALL" || !data.length) return data;
    const cutoffStr = rangeCutoff(range)!;
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

  const dataSpanDays = useMemo(() => {
    if (data.length < 2) return 0;
    return Math.round(
      (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / 86400000
    );
  }, [data]);

  const isRangeDisabled = useCallback((r: { key: Range; days: number }) => {
    if (r.key === "ALL") return false;
    return r.days > dataSpanDays + 3;
  }, [dataSpanDays]);

  // Enrich data: add pnl_pos for profit-zone fill (stacked on total_cost)
  const chartData = useMemo(() =>
    filtered.map((d) => ({ ...d, pnl_pos: Math.max(0, d.total_pnl) })),
    [filtered]
  );

  const yDomain = useMemo((): [number, number] => {
    if (!filtered.length) return [0, 1];
    const vals = filtered.flatMap((d) => [d.total_value, d.total_cost]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.22 || max * 0.02;
    return [Math.max(0, min - pad), max + pad];
  }, [filtered]);

  const display = activePoint ?? filtered.at(-1) ?? null;
  const periodFirst = filtered[0] ?? null;

  const periodDelta = display && periodFirst && display.date !== periodFirst.date
    ? display.total_value - periodFirst.total_value : null;
  const periodDeltaPct = periodDelta != null && periodFirst.total_value > 0
    ? (periodDelta / periodFirst.total_value) * 100 : null;
  const pnlPct = display && display.total_cost > 0
    ? (display.total_pnl / display.total_cost) * 100 : null;

  const isPnlUp    = (display?.total_pnl ?? 0) >= 0;
  const isPeriodUp = (periodDelta ?? 0) >= 0;
  const isHovering = activePoint !== null;

  const onMouseMove = useCallback((e: RechartsMouseEvent) => {
    if (e.activePayload?.length) setActivePoint(e.activePayload[0].payload);
  }, []);
  const onMouseLeave = useCallback(() => setActivePoint(null), []);

  if (!data.length) return null;

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-0 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">组合走势</CardTitle>

        {/* Range selector with animated active pill */}
        <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5">
          {RANGES.map((r) => {
            const disabled = isRangeDisabled(r);
            const active   = range === r.key;
            return (
              <button
                key={r.key}
                disabled={disabled}
                onMouseDown={() => setPressing(r.key)}
                onMouseUp={() => setPressing(null)}
                onMouseLeave={() => setPressing(null)}
                onClick={() => { setRange(r.key); setActivePoint(null); }}
                title={disabled ? `数据不足 ${r.days} 天` : undefined}
                className={[
                  "px-2.5 py-1 text-xs rounded-md transition-all duration-150",
                  disabled  ? "text-muted-foreground/25 cursor-not-allowed"
                  : active  ? "bg-background shadow-sm text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  pressing === r.key && !disabled ? "scale-95" : "",
                ].join(" ")}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* ── Stats bar ── */}
      {display && (
        <div className={`px-6 pt-3 pb-1 flex items-end gap-6 min-h-[64px] transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-100"}`}>
          {/* Market value */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5 transition-all duration-150">
              {isHovering ? activePoint!.date : "当前市值"}
            </p>
            <p className="text-2xl font-semibold tabular-nums leading-none transition-all duration-150">
              ¥{display.total_value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* Period change */}
          {periodDelta != null ? (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">
                区间{isPeriodUp ? "涨" : "跌"}（自 {periodFirst?.date}）
              </p>
              <p className={`text-sm font-semibold tabular-nums leading-none transition-all duration-150 ${isPeriodUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {isPeriodUp ? "▲" : "▼"} {fmtSigned(periodDelta)}
                <span className="text-xs ml-1 font-normal opacity-75">
                  {periodDeltaPct != null ? `(${fmtSigned(periodDeltaPct)}%)` : ""}
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">区间涨跌</p>
              <p className="text-sm text-muted-foreground/40 leading-none">—</p>
            </div>
          )}

          {/* PnL */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">总盈亏 · 自买入</p>
            <p className={`text-sm font-semibold tabular-nums leading-none transition-all duration-150 ${isPnlUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {isPnlUp ? "▲" : "▼"} {fmtSigned(display.total_pnl)}
              <span className="text-xs ml-1 font-normal opacity-75">
                {pnlPct != null ? `(${fmtSigned(pnlPct)}%)` : ""}
              </span>
            </p>
          </div>

          {/* Cost – right-aligned */}
          <div className="ml-auto">
            <p className="text-[11px] text-muted-foreground mb-0.5 text-right">持仓成本</p>
            <p className="text-sm tabular-nums text-muted-foreground leading-none text-right transition-all duration-150">
              ¥{display.total_cost.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      <CardContent className="pt-2 pb-3 px-2">
        <div ref={containerRef} className="relative">
          <ResponsiveContainer width="100%" height={190} key={range}>
            <ComposedChart
              data={chartData}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Main value area gradient */}
                <linearGradient id="tcGradValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="80%" stopColor="var(--chart-1)" stopOpacity={0.03} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                {/* Profit-zone fill (stacked on cost baseline) */}
                <linearGradient id="tcGradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => fmtDate(v, range)}
                interval="preserveStartEnd"
                minTickGap={52}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatWan}
                domain={yDomain}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                width={42}
              />

              {/* Floating tooltip card */}
              <Tooltip
                content={<TooltipCard />}
                cursor={<CustomCursor />}
                isAnimationActive={false}
              />

              {/* ── Layer 1: cost baseline area (transparent spacer for stacking) ── */}
              <Area
                type="monotone"
                dataKey="total_cost"
                stackId="pnl"
                fill="transparent"
                stroke="none"
                isAnimationActive={false}
              />

              {/* ── Layer 2: profit zone (stacked above cost) ── */}
              <Area
                type="monotone"
                dataKey="pnl_pos"
                stackId="pnl"
                fill="url(#tcGradProfit)"
                stroke="none"
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />

              {/* ── Layer 3: full value area gradient (draws over the stack for glow) ── */}
              <Area
                type="monotone"
                dataKey="total_value"
                fill="url(#tcGradValue)"
                stroke="none"
                isAnimationActive={false}
              />

              {/* ── Layer 4: cost line (dashed) ── */}
              <Line
                type="monotone"
                dataKey="total_cost"
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                strokeDasharray="3 4"
                strokeOpacity={0.45}
                dot={false}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              />

              {/* ── Layer 5: value line ── */}
              <Line
                type="monotone"
                dataKey="total_value"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-5 justify-end px-2 mt-0.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-4 h-0.5 rounded-full bg-[var(--chart-1)]" />
            总市值
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-4 border-t border-dashed border-muted-foreground/50" />
            持仓成本
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-3 h-2.5 rounded-sm bg-emerald-500/25" />
            盈利区间
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
