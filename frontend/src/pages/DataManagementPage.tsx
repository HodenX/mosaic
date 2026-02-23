import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { holdingsApi, fundsApi } from "@/services/api";
import type { Holding } from "@/types";

export default function DataManagementPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [refreshAll, setRefreshAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ completed: number; total: number } | null>(null);
  const progressRef = useRef(0);

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

  const uniqueFunds = [...new Map(holdings.map((h) => [h.fund_code, h])).values()];

  const handleRefreshOne = async (fundCode: string) => {
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

  const handleRefreshAll = async () => {
    setRefreshAll(true);
    const total = uniqueFunds.length;
    progressRef.current = 0;
    setRefreshProgress({ completed: 0, total });
    try {
      const CONCURRENCY = 3;
      const queue = [...uniqueFunds];
      const runBatch = async () => {
        while (queue.length > 0) {
          const fund = queue.shift();
          if (fund) {
            setRefreshing((prev) => new Set(prev).add(fund.fund_code));
            try {
              await fundsApi.refresh(fund.fund_code);
            } finally {
              setRefreshing((prev) => {
                const next = new Set(prev);
                next.delete(fund.fund_code);
                return next;
              });
              progressRef.current += 1;
              setRefreshProgress({ completed: progressRef.current, total });
            }
          }
        }
      };
      await Promise.allSettled(
        Array.from({ length: Math.min(CONCURRENCY, total) }, () => runBatch())
      );
      await fetchHoldings();
    } finally {
      setRefreshAll(false);
      setRefreshProgress(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">数据管理</h2>
        <Button onClick={handleRefreshAll} disabled={refreshAll}>
          {refreshProgress
            ? `刷新中 (${refreshProgress.completed}/${refreshProgress.total})`
            : "刷新全部基金"}
        </Button>
      </div>

      {refreshProgress && (
        <div className="space-y-1">
          <Progress
            value={(refreshProgress.completed / refreshProgress.total) * 100}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground text-right">
            已刷新 {refreshProgress.completed}/{refreshProgress.total} 只基金
          </p>
        </div>
      )}

      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-sm">基金数据状态</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-4 space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="whitespace-nowrap">基金代码</TableHead>
                <TableHead className="whitespace-nowrap">基金名称</TableHead>
                <TableHead className="whitespace-nowrap">最新净值</TableHead>
                <TableHead className="whitespace-nowrap">净值日期</TableHead>
                <TableHead className="whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueFunds.map((f) => (
                <TableRow key={f.fund_code} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">{f.fund_code}</TableCell>
                  <TableCell className="whitespace-nowrap">{f.fund_name || "-"}</TableCell>
                  <TableCell className="font-serif tabular-nums whitespace-nowrap">{f.latest_nav?.toFixed(4) ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{f.latest_nav_date ?? "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                      disabled={refreshing.has(f.fund_code)}
                      onClick={() => handleRefreshOne(f.fund_code)}
                    >
                      {refreshing.has(f.fund_code) ? "刷新中..." : "刷新"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {uniqueFunds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    暂无基金数据，请先在持仓明细中添加持仓
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
