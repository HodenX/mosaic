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
import type { HoldingCreate } from "@/types";

interface Props {
  onCreated: (fundCode: string) => void;
}

export default function AddHoldingDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<HoldingCreate>({
    fund_code: "",
    platform: "",
    shares: 0,
    cost_price: 0,
    purchase_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await holdingsApi.create(form);
      setOpen(false);
      setForm({ fund_code: "", platform: "", shares: 0, cost_price: 0, purchase_date: "" });
      onCreated(form.fund_code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加持仓</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加基金持仓</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>基金代码</Label>
            <Input
              value={form.fund_code}
              onChange={(e) => setForm({ ...form, fund_code: e.target.value })}
              placeholder="例如 000001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>购买平台</Label>
            <Input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="例如 支付宝"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>持有份额</Label>
              <Input
                type="number"
                step="0.01"
                value={form.shares || ""}
                onChange={(e) => setForm({ ...form, shares: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>买入均价</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.cost_price || ""}
                onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>购买日期</Label>
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "添加中..." : "确认添加"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
