import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { holdingsApi } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChangeLog } from "@/types";

interface Props {
  holdingId: number;
  fundName: string;
}

export default function ChangeLogDialog({ holdingId, fundName }: Props) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    holdingsApi
      .changelog(holdingId)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [open, holdingId]);

  const formatDiff = (diff: number) => {
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          历史
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>持仓变更历史 — {fundName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            暂无变更记录
          </div>
        ) : (
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>日期</TableHead>
                  <TableHead>份额变化</TableHead>
                  <TableHead>成本价变化</TableHead>
                  <TableHead>记录时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{log.change_date}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {log.old_shares.toFixed(2)} → {log.new_shares.toFixed(2)}
                      <span
                        className={`ml-1 text-xs ${
                          log.shares_diff >= 0
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        ({formatDiff(log.shares_diff)})
                      </span>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {log.old_cost_price.toFixed(4)} →{" "}
                      {log.new_cost_price.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
