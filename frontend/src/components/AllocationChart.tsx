import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AllocationItem } from "@/types";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
  "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

interface Props {
  title: string;
  data: AllocationItem[];
}

export default function AllocationChart({ title, data }: Props) {
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
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
              innerRadius={50}
              outerRadius={90}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="mt-2 space-y-1">
          {data.slice(0, 5).map((item, i) => (
            <div key={item.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.category}</span>
              </div>
              <span>{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
