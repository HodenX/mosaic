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
import { positionApi } from "@/services/api";
import type { BudgetChangeLogEntry } from "@/types";

export default function BudgetChangeLogDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<BudgetChangeLogEntry[]>([]);

  useEffect(() => {
    if (open) {
      positionApi.changelog().then(setLogs);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">变更记录</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>预算变更记录</DialogTitle>
        </DialogHeader>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">暂无变更记录</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">调整前</TableHead>
                  <TableHead className="text-right">调整后</TableHead>
                  <TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ¥{log.old_budget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ¥{log.new_budget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.reason || "-"}
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
