import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AllocationCoverage, AllocationItem } from "@/types";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
  "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

interface Props {
  title: string;
  data: AllocationItem[];
  coverage?: AllocationCoverage;
}

export default function AllocationChart({ title, data, coverage }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!data.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasFunds = data.some((item) => item.funds && item.funds.length > 0);

  const chartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.category,
      { label: item.category, color: COLORS[i % COLORS.length] },
    ])
  ) satisfies ChartConfig;

  const chartData = data.map((item, i) => ({
    name: item.category,
    value: item.percentage,
    fill: COLORS[i % COLORS.length],
  }));

  const handleCategoryClick = (category: string) => {
    if (!hasFunds) return;
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const selectedItem = data.find((item) => item.category === selectedCategory);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {coverage && coverage.covered_funds < coverage.total_funds && (
          <p className="text-xs text-muted-foreground">
            覆盖 {coverage.covered_funds}/{coverage.total_funds} 只基金，占总市值 {coverage.covered_percent}%
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              onClick={hasFunds ? (_: unknown, index: number) => handleCategoryClick(chartData[index].name) : undefined}
              style={hasFunds ? { cursor: "pointer" } : undefined}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  strokeWidth={selectedCategory === entry.name ? 3 : 1}
                  stroke={selectedCategory === entry.name ? "#000" : undefined}
                  opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="mt-2 space-y-1">
          {data.slice(0, 5).map((item, i) => (
            <div
              key={item.category}
              className={`flex items-center justify-between text-xs ${hasFunds ? "cursor-pointer rounded px-1 hover:bg-muted" : ""} ${selectedCategory === item.category ? "bg-muted" : ""}`}
              onClick={() => handleCategoryClick(item.category)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.category}</span>
              </div>
              <span>{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        {selectedItem?.funds && selectedItem.funds.length > 0 && (
          <div className="mt-3 rounded-md border p-2">
            <p className="mb-1.5 text-xs font-medium">{selectedCategory} - 基金明细</p>
            <div className="space-y-1">
              {selectedItem.funds.map((fund) => (
                <div key={fund.fund_code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{fund.fund_code}</span>
                    <span>{fund.fund_name}</span>
                  </div>
                  <span>{fund.percentage.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
