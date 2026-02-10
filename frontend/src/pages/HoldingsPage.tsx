import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import { holdingsApi, fundsApi } from "@/services/api";
import type { Holding } from "@/types";

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

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
    await fundsApi.refresh(fundCode);
    await fetchHoldings();
  };

  const handleDelete = async (id: number) => {
    await holdingsApi.delete(id);
    await fetchHoldings();
  };

  const formatCurrency = (val: number | null) =>
    val != null ? `¥${val.toFixed(2)}` : "-";

  const formatPercent = (val: number | null) =>
    val != null ? `${val.toFixed(2)}%` : "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">持仓明细</h2>
        <AddHoldingDialog onCreated={fetchHoldings} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>基金名称</TableHead>
                <TableHead>基金代码</TableHead>
                <TableHead>平台</TableHead>
                <TableHead className="text-right">份额</TableHead>
                <TableHead className="text-right">最新净值</TableHead>
                <TableHead className="text-right">市值</TableHead>
                <TableHead className="text-right">成本</TableHead>
                <TableHead className="text-right">盈亏</TableHead>
                <TableHead className="text-right">盈亏%</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    <Link to={`/fund/${h.fund_code}`} className="hover:underline">
                      {h.fund_name || h.fund_code}
                    </Link>
                  </TableCell>
                  <TableCell>{h.fund_code}</TableCell>
                  <TableCell>{h.platform}</TableCell>
                  <TableCell className="text-right">{h.shares.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {h.latest_nav?.toFixed(4) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(h.market_value)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(h.shares * h.cost_price)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.pnl != null && h.pnl >= 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatCurrency(h.pnl)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.pnl_percent != null && h.pnl_percent >= 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {formatPercent(h.pnl_percent)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefresh(h.fund_code)}
                      >
                        刷新
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
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
