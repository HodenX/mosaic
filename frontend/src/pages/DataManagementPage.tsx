import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { holdingsApi, fundsApi } from "@/services/api";
import type { Holding } from "@/types";

export default function DataManagementPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [refreshAll, setRefreshAll] = useState(false);

  const fetchHoldings = useCallback(async () => {
    const data = await holdingsApi.list();
    setHoldings(data);
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
    try {
      for (const f of uniqueFunds) {
        await fundsApi.refresh(f.fund_code);
      }
      await fetchHoldings();
    } finally {
      setRefreshAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">数据管理</h2>
        <Button onClick={handleRefreshAll} disabled={refreshAll}>
          {refreshAll ? "刷新中..." : "刷新全部基金"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基金数据状态</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>基金代码</TableHead>
                <TableHead>基金名称</TableHead>
                <TableHead>最新净值</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueFunds.map((f) => (
                <TableRow key={f.fund_code}>
                  <TableCell>{f.fund_code}</TableCell>
                  <TableCell>{f.fund_name || "-"}</TableCell>
                  <TableCell>{f.latest_nav?.toFixed(4) ?? "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={refreshing.has(f.fund_code)}
                      onClick={() => handleRefreshOne(f.fund_code)}
                    >
                      {refreshing.has(f.fund_code) ? "刷新中..." : "刷新"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
