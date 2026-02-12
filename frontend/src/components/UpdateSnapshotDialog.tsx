import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { holdingsApi } from "@/services/api";
import type { Holding } from "@/types";

interface Props {
  holding: Holding;
  onUpdated: () => void;
}

export default function UpdateSnapshotDialog({ holding, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    shares: holding.shares,
    cost_price: holding.cost_price,
    change_date: today,
  });

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm({
        shares: holding.shares,
        cost_price: holding.cost_price,
        change_date: new Date().toISOString().split("T")[0],
      });
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await holdingsApi.updateSnapshot(holding.id, form);
      setOpen(false);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          更新
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            更新持仓 — {holding.fund_name || holding.fund_code}({holding.fund_code})
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground space-y-1 mb-2">
          <div>当前份额：{holding.shares}</div>
          <div>当前成本价：{holding.cost_price}</div>
          <div>平台：{holding.platform}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>最新总份额</Label>
              <Input
                type="number"
                step="0.01"
                value={form.shares || ""}
                onChange={(e) =>
                  setForm({ ...form, shares: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>最新持仓成本价</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.cost_price || ""}
                onChange={(e) =>
                  setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>日期</Label>
            <Input
              type="date"
              value={form.change_date}
              onChange={(e) => setForm({ ...form, change_date: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "提交中..." : "确认更新"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
