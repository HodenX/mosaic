import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, Landmark, TrendingUp, Shield, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary, Reminder } from "@/types";

const LEVEL_ICONS: Record<string, string> = {
  urgent: "\uD83D\uDD34",
  warning: "\uD83D\uDFE1",
  info: "\uD83D\uDD35",
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
];

const chartConfig = {
  liquid: { label: "\u6D3B\u94B1", color: "var(--chart-1)" },
  stable: { label: "\u7A33\u94B1", color: "var(--chart-2)" },
  growth: { label: "\u957F\u94B1", color: "var(--chart-3)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    dashboardApi.summary().then(setSummary);
    dashboardApi.reminders().then(setReminders);
  }, []);

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

  const allocationData = [
    { name: "\u6D3B\u94B1", value: summary.buckets.liquid.amount },
    { name: "\u7A33\u94B1", value: summary.buckets.stable.amount },
    { name: "\u957F\u94B1", value: summary.buckets.growth.total_amount },
  ].filter((d) => d.value > 0);

  const growthPnl = summary.buckets.growth.total_pnl;
  const isGrowthProfit = growthPnl >= 0;
  const growthPnlColor = isGrowthProfit ? "text-red-500" : "text-green-500";

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <h2 className="text-xl font-semibold">{"\u8D44\u4EA7\u603B\u89C8"}</h2>

      {/* 1. Total Assets Card */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">
            {"\u5BB6\u5EAD\u603B\u8D44\u4EA7"}
          </p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(summary.total_assets)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{"\u603B\u6536\u76CA"}</span>
            <span className={`text-sm font-medium tabular-nums ${returnColor}`}>
              {isProfit ? "+" : ""}
              {formatCurrency(summary.total_return)}
            </span>
            <span className={`text-xs tabular-nums ${returnColor}`}>
              ({isProfit ? "+" : ""}
              {summary.total_return_percent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {"\u5E74\u4FDD\u8D39\u652F\u51FA"} {formatCurrency(summary.buckets.insurance.annual_premium)}
          </p>
        </CardContent>
      </Card>

      {/* 2. Four Bucket Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Liquid */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u6D3B\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(summary.buckets.liquid.amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u9884\u4F30\u5E74\u6536\u76CA"} {formatCurrency(summary.buckets.liquid.estimated_return)}
              </p>
              <p className="text-xs text-muted-foreground">
                {"\u5171"}{summary.buckets.liquid.count}{"\u7B14"}
              </p>
            </div>
            <button
              onClick={() => navigate("/liquid")}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              {"\u67E5\u770B"} <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Stable */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u7A33\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(summary.buckets.stable.amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u9884\u4F30\u5E74\u6536\u76CA"} {formatCurrency(summary.buckets.stable.estimated_return)}
              </p>
              {summary.buckets.stable.nearest_maturity_days != null && (
                <p className="text-xs text-amber-600 mt-1">
                  {"\u6700\u8FD1\u5230\u671F: "}{summary.buckets.stable.nearest_maturity_days}{"\u5929"}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/stable")}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              {"\u67E5\u770B"} <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u957F\u94B1"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(summary.buckets.growth.total_amount)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-medium tabular-nums ${growthPnlColor}`}>
                  {isGrowthProfit ? "+" : ""}
                  {formatCurrency(growthPnl)}
                </span>
                <span className={`text-xs tabular-nums ${growthPnlColor}`}>
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
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              {"\u67E5\u770B"} <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="pt-5 pb-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {"\u4FDD\u969C"}
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {summary.buckets.insurance.active_count}{"\u4EFD\u751F\u6548\u4FDD\u5355"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {"\u5E74\u4FDD\u8D39"} {formatCurrency(summary.buckets.insurance.annual_premium)}
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
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
            >
              {"\u67E5\u770B"} <ChevronRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* 3. Asset Allocation Ring Chart */}
      {allocationData.length > 0 && (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{"\u8D44\u4EA7\u914D\u7F6E"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 space-y-1">
              {allocationData.map((item, i) => {
                const total = allocationData.reduce((sum, d) => sum + d.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Reminders List */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
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
                  <span className="text-sm mt-0.5">{LEVEL_ICONS[r.level] ?? LEVEL_ICONS.info}</span>
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
