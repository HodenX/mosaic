import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import AllocationChart from "@/components/AllocationChart";
import { fundsApi } from "@/services/api";
import type { AllocationItem, FundInfo, NavHistory, TopHolding } from "@/types";

const navChartConfig = {
  nav: { label: "单位净值", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function FundDetailPage() {
  const { fundCode } = useParams<{ fundCode: string }>();
  const [fund, setFund] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<NavHistory[]>([]);
  const [allocation, setAllocation] = useState<Record<string, AllocationItem[]>>({});
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);

  useEffect(() => {
    if (!fundCode) return;
    fundsApi.get(fundCode).then(setFund);
    fundsApi.navHistory(fundCode).then(setNavHistory);
    fundsApi.allocation(fundCode).then(setAllocation);
    fundsApi.topHoldings(fundCode).then(setTopHoldings);
  }, [fundCode]);

  if (!fund) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{fund.fund_name || fund.fund_code}</h2>
        <p className="text-muted-foreground">
          {fund.fund_code} · {fund.fund_type} · {fund.management_company}
        </p>
      </div>

      {navHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>净值走势</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={navChartConfig} className="h-[300px] w-full">
              <LineChart data={navHistory}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="nav" stroke="var(--color-nav)" dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allocation.asset_class && <AllocationChart title="资产类别" data={allocation.asset_class} />}
        {allocation.geography && <AllocationChart title="地域分布" data={allocation.geography} />}
        {allocation.sector && <AllocationChart title="行业分布" data={allocation.sector} />}
      </div>

      {topHoldings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>前十大持仓</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>股票代码</TableHead>
                  <TableHead>股票名称</TableHead>
                  <TableHead className="text-right">占净值比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHoldings.map((h) => (
                  <TableRow key={h.stock_code}>
                    <TableCell>{h.stock_code}</TableCell>
                    <TableCell>{h.stock_name}</TableCell>
                    <TableCell className="text-right">{h.percentage.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
