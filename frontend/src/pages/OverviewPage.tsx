import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { portfolioApi } from "@/services/api";
import type { PlatformBreakdown, PortfolioSummary, PortfolioTrend } from "@/types";

const platformChartConfig = {
  market_value: { label: "市值", color: "var(--chart-1)" },
  cost: { label: "成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function OverviewPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);
  const [trend, setTrend] = useState<PortfolioTrend[]>([]);

  useEffect(() => {
    portfolioApi.summary().then(setSummary);
    portfolioApi.byPlatform().then(setPlatforms);
    portfolioApi.trend().then(setTrend);
  }, []);

  if (!summary) return <div className="text-muted-foreground">加载中...</div>;

  const isProfit = summary.total_pnl >= 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">组合概览</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总市值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.total_value.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.total_cost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}¥{summary.total_pnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}{summary.pnl_percent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>平台分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={platformChartConfig} className="h-[300px] w-full">
              <BarChart data={platforms}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="platform" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="market_value" fill="var(--color-market_value)" radius={4} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>组合走势</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total_value: { label: "总市值", color: "var(--chart-1)" },
                total_cost: { label: "总成本", color: "var(--chart-2)" },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total_value" stroke="var(--color-total_value)" dot={false} />
                <Line type="monotone" dataKey="total_cost" stroke="var(--color-total_cost)" dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
