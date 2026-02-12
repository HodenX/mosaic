import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatWan } from "@/lib/utils";
import type { PlatformBreakdown } from "@/types";

const platformChartConfig = {
  market_value: { label: "市值", color: "var(--chart-1)" },
  cost: { label: "成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface Props {
  data: PlatformBreakdown[];
}

export default function PlatformChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <Card className="shadow-sm animate-in fade-in duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">平台分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={platformChartConfig} className="h-[300px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} strokeOpacity={0.3} />
            <XAxis dataKey="platform" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={formatWan} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="market_value" fill="var(--chart-1)" radius={6} />
            <Bar dataKey="cost" fill="var(--chart-2)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
