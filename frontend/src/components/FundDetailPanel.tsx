import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import AllocationChart from "@/components/AllocationChart";
import { fundsApi } from "@/services/api";
import { useFundDetail } from "@/contexts/FundDetailContext";
import type { AllocationItem, FundInfo, NavHistory, TopHolding } from "@/types";

const navChartConfig = {
  nav: { label: "单位净值", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function FundDetailPanel() {
  const { selectedFundCode, closeFundDetail } = useFundDetail();
  const [fund, setFund] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<NavHistory[]>([]);
  const [allocation, setAllocation] = useState<Record<string, AllocationItem[]>>({});
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFundCode) {
      setFund(null);
      setNavHistory([]);
      setAllocation({});
      setTopHoldings([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fundsApi.get(selectedFundCode).then(setFund),
      fundsApi.navHistory(selectedFundCode).then(setNavHistory),
      fundsApi.allocation(selectedFundCode).then(setAllocation),
      fundsApi.topHoldings(selectedFundCode).then(setTopHoldings),
    ]).finally(() => setLoading(false));
  }, [selectedFundCode]);

  useEffect(() => {
    if (!selectedFundCode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFundDetail();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedFundCode, closeFundDetail]);

  if (!selectedFundCode) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeFundDetail}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-background border-l shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-40 rounded bg-muted animate-pulse" />
            ) : fund ? (
              <>
                <h3 className="text-lg font-semibold truncate">
                  {fund.fund_name || fund.fund_code}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {fund.fund_code} · {fund.fund_type} · {fund.management_company}
                </p>
              </>
            ) : null}
          </div>
          <button
            onClick={closeFundDetail}
            className="shrink-0 rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-[250px] rounded-lg bg-muted animate-pulse" />
              <div className="h-[250px] rounded-lg bg-muted animate-pulse" />
            </div>
          ) : (
            <>
              {/* NAV Chart */}
              {navHistory.length > 0 && (
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">净值走势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={navChartConfig} className="h-[220px] w-full">
                      <LineChart data={navHistory}>
                        <CartesianGrid vertical={false} strokeOpacity={0.3} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="nav" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Allocations */}
              {(allocation.asset_class || allocation.geography || allocation.sector) && (
                <div className="space-y-4">
                  {allocation.asset_class && (
                    <AllocationChart title="资产类别" data={allocation.asset_class} />
                  )}
                  {allocation.geography && (
                    <AllocationChart title="地域分布" data={allocation.geography} />
                  )}
                  {allocation.sector && (
                    <AllocationChart title="行业分布" data={allocation.sector} />
                  )}
                </div>
              )}

              {/* Top Holdings */}
              {topHoldings.length > 0 && (
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">前十大持仓</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="whitespace-nowrap">股票代码</TableHead>
                          <TableHead className="whitespace-nowrap">股票名称</TableHead>
                          <TableHead className="text-right whitespace-nowrap">占净值比</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topHoldings.map((h) => (
                          <TableRow key={h.stock_code} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-xs tabular-nums">{h.stock_code}</TableCell>
                            <TableCell>{h.stock_name}</TableCell>
                            <TableCell className="text-right font-serif tabular-nums">{h.percentage.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
