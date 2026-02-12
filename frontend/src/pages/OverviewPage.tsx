import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { portfolioApi, positionApi } from "@/services/api";
import AllocationChart from "@/components/AllocationChart";
import PositionGauge from "@/components/PositionGauge";
import BudgetSettingDialog from "@/components/BudgetSettingDialog";
import StrategySuggestionDialog from "@/components/StrategySuggestionDialog";
import type { AllocationResponse, PlatformBreakdown, PortfolioSummary, PortfolioTrend, PositionStatus } from "@/types";

const platformChartConfig = {
  market_value: { label: "市值", color: "var(--chart-1)" },
  cost: { label: "成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function OverviewPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);
  const [trend, setTrend] = useState<PortfolioTrend[]>([]);
  const [assetAlloc, setAssetAlloc] = useState<AllocationResponse | null>(null);
  const [geoAlloc, setGeoAlloc] = useState<AllocationResponse | null>(null);
  const [sectorAlloc, setSectorAlloc] = useState<AllocationResponse | null>(null);
  const [position, setPosition] = useState<PositionStatus | null>(null);

  useEffect(() => {
    portfolioApi.summary().then(setSummary);
    portfolioApi.byPlatform().then(setPlatforms);
    portfolioApi.trend().then(setTrend);
    portfolioApi.allocation("asset_class").then(setAssetAlloc);
    portfolioApi.allocation("geography").then(setGeoAlloc);
    portfolioApi.allocation("sector").then(setSectorAlloc);
    positionApi.getBudget().then(setPosition);
  }, []);

  if (!summary) return <div className="text-muted-foreground">加载中...</div>;

  const isProfit = summary.total_pnl >= 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">组合概览</h2>

      {/* Position warning banner */}
      {position && position.total_budget > 0 && position.is_below_min && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          仓位 {position.position_ratio.toFixed(1)}% 低于目标下限 {position.target_position_min}%，建议适当加仓。
        </div>
      )}
      {position && position.total_budget > 0 && position.is_above_max && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          仓位 {position.position_ratio.toFixed(1)}% 超过目标上限 {position.target_position_max}%，建议适当减仓。
        </div>
      )}

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

      {/* Position section */}
      {position && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {position.total_budget > 0 ? (
            <>
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">仓位状态</CardTitle>
                    <BudgetSettingDialog current={position} onUpdated={setPosition} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-3">
                    {position.position_ratio.toFixed(1)}%
                  </div>
                  <PositionGauge
                    ratio={position.position_ratio}
                    min={position.target_position_min}
                    max={position.target_position_max}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    已投入 ¥{position.total_value.toLocaleString()} / 总预算 ¥{position.total_budget.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">可用资金</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ¥{position.available_cash.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">可补仓金额</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">策略建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{position.active_strategy}</p>
                  <StrategySuggestionDialog />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="md:col-span-4">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-muted-foreground mb-3">尚未设置投资预算</p>
                  <BudgetSettingDialog
                    current={position}
                    onUpdated={setPosition}
                    trigger={<Button>设置投资预算</Button>}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AllocationChart title="资产类别" data={assetAlloc?.items ?? []} coverage={assetAlloc?.coverage} />
        <AllocationChart title="地域分布" data={geoAlloc?.items ?? []} coverage={geoAlloc?.coverage} />
        <AllocationChart title="行业分布" data={sectorAlloc?.items ?? []} coverage={sectorAlloc?.coverage} />
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
