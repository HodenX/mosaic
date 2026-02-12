import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatWan } from "@/lib/utils";
import type { PortfolioTrend } from "@/types";

const trendChartConfig = {
  total_value: { label: "总市值", color: "var(--chart-1)" },
  total_cost: { label: "总成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";
const ranges: { key: Range; label: string; days: number }[] = [
  { key: "1M", label: "1月", days: 30 },
  { key: "3M", label: "3月", days: 90 },
  { key: "6M", label: "6月", days: 180 },
  { key: "1Y", label: "1年", days: 365 },
  { key: "ALL", label: "全部", days: 0 },
];

interface Props {
  data: PortfolioTrend[];
}

export default function TrendChart({ data }: Props) {
  const [range, setRange] = useState<Range>("ALL");

  const filteredData = useMemo(() => {
    if (range === "ALL" || !data.length) return data;
    const days = ranges.find((r) => r.key === range)!.days;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

  if (!data.length) return null;

  return (
    <Card className="shadow-sm animate-in fade-in duration-300">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">组合走势</CardTitle>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                range === r.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.3} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={formatWan} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="total_value" fill="url(#fillValue)" stroke="none" />
            <Line type="monotone" dataKey="total_value" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="total_cost" stroke="var(--chart-2)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
