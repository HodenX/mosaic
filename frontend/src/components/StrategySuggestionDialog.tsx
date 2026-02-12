import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { positionApi } from "@/services/api";
import type { StrategyResult } from "@/types";

interface StrategySuggestionDialogProps {
  trigger?: React.ReactNode;
}

export default function StrategySuggestionDialog({
  trigger,
}: StrategySuggestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      positionApi
        .suggestion()
        .then(setResult)
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">查看详情</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>策略建议详情</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">分析中...</p>
        ) : result ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">策略</p>
              <p className="text-sm">{result.strategy_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">摘要</p>
              <p className="text-sm">{result.summary}</p>
            </div>
            {result.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">具体建议</p>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {s.fund_name}{s.fund_code ? ` (${s.fund_code})` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium ${
                            s.action === "buy"
                              ? "text-red-500"
                              : s.action === "sell"
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {s.action === "buy" ? "买入" : s.action === "sell" ? "卖出" : "持有"}
                        </span>
                        {s.amount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ¥{s.amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">无法获取策略建议</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
