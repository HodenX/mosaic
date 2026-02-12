import { useCallback, useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import UpdateSnapshotDialog from "@/components/UpdateSnapshotDialog";
import ChangeLogDialog from "@/components/ChangeLogDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { holdingsApi, fundsApi } from "@/services/api";
import { useFundDetail } from "@/contexts/FundDetailContext";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Holding } from "@/types";

export default function HoldingsPage() {
  const { openFundDetail } = useFundDetail();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await holdingsApi.list();
      setHoldings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const handleRefresh = async (fundCode: string) => {
    setRefreshing((prev) => new Set(prev).add(fundCode));
    try {
      await fundsApi.refresh(fundCode);
      await fetchHoldings();
    } finally {
      setRefreshing((prev) => {
        const next = new Set(prev);
        next.delete(fundCode);
        return next;
      });
    }
  };

  const handleCreated = async (fundCode: string) => {
    await fetchHoldings();
    handleRefresh(fundCode);
  };

  const handleDelete = async (id: number) => {
    await holdingsApi.delete(id);
    await fetchHoldings();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">持仓明细</h2>
        <AddHoldingDialog onCreated={handleCreated} />
      </div>

      {loading ? (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-muted/30 h-10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="whitespace-nowrap">基金名称</TableHead>
                <TableHead className="whitespace-nowrap">基金代码</TableHead>
                <TableHead className="whitespace-nowrap">平台</TableHead>
                <TableHead className="text-right whitespace-nowrap">份额</TableHead>
                <TableHead className="text-right whitespace-nowrap">最新净值</TableHead>
                <TableHead className="text-right whitespace-nowrap">市值</TableHead>
                <TableHead className="text-right whitespace-nowrap">成本</TableHead>
                <TableHead className="text-right whitespace-nowrap">盈亏</TableHead>
                <TableHead className="text-right whitespace-nowrap">盈亏%</TableHead>
                <TableHead className="whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.id} className={`hover:bg-muted/50 transition-colors ${refreshing.has(h.fund_code) ? "opacity-60" : ""}`}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <button
                      onClick={() => openFundDetail(h.fund_code)}
                      className="hover:underline text-left text-primary hover:text-primary/80"
                    >
                      {h.fund_name || h.fund_code}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">{h.fund_code}</TableCell>
                  <TableCell className="whitespace-nowrap">{h.platform}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">{h.shares.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {refreshing.has(h.fund_code) && !h.latest_nav
                      ? "加载中..."
                      : h.latest_nav?.toFixed(4) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {refreshing.has(h.fund_code) && h.market_value == null
                      ? "加载中..."
                      : formatCurrency(h.market_value)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {formatCurrency(h.shares * h.cost_price)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums whitespace-nowrap ${
                      h.pnl != null && h.pnl >= 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {refreshing.has(h.fund_code) && h.pnl == null
                      ? "加载中..."
                      : formatCurrency(h.pnl)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums whitespace-nowrap ${
                      h.pnl_percent != null && h.pnl_percent >= 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {refreshing.has(h.fund_code) && h.pnl_percent == null
                      ? "加载中..."
                      : formatPercent(h.pnl_percent)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <UpdateSnapshotDialog
                        holding={h}
                        onUpdated={fetchHoldings}
                      />
                      <ChangeLogDialog
                        holdingId={h.id}
                        fundName={h.fund_name || h.fund_code}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-primary active:scale-[0.97] transition-transform duration-100"
                        disabled={refreshing.has(h.fund_code)}
                        onClick={() => handleRefresh(h.fund_code)}
                      >
                        {refreshing.has(h.fund_code) ? "刷新中..." : "刷新"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive active:scale-[0.97] transition-transform duration-100"
                        onClick={() => handleDelete(h.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {holdings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    暂无持仓，点击"添加持仓"开始
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
