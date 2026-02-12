import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { PortfolioTrend } from "@/types";

const trendChartConfig = {
  total_value: { label: "总市值", color: "var(--chart-1)" },
  total_cost: { label: "总成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface Props {
  data: PortfolioTrend[];
}

export default function TrendChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">组合走势</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-total_value)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-total_value)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.3} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="total_value" fill="url(#fillValue)" stroke="none" />
            <Line type="monotone" dataKey="total_value" stroke="var(--color-total_value)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="total_cost" stroke="var(--color-total_cost)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
