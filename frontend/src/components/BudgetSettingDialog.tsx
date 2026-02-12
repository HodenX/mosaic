import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { positionApi } from "@/services/api";
import type { PositionStatus } from "@/types";

interface BudgetSettingDialogProps {
  current: PositionStatus | null;
  onUpdated: (status: PositionStatus) => void;
  trigger?: React.ReactNode;
}

export default function BudgetSettingDialog({
  current,
  onUpdated,
  trigger,
}: BudgetSettingDialogProps) {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && current) {
      setBudget(current.total_budget.toString());
      setMin(current.target_position_min.toString());
      setMax(current.target_position_max.toString());
      setReason("");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await positionApi.updateBudget({
        total_budget: parseFloat(budget) || 0,
        target_position_min: parseFloat(min) || 0,
        target_position_max: parseFloat(max) || 100,
        reason: reason || undefined,
      });
      onUpdated(result);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">设置预算</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>投资预算设置</DialogTitle>
          <DialogDescription>设置总投资预算和目标仓位区间</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">总预算</Label>
            <Input
              className="col-span-3"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="例如: 100000"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">仓位下限(%)</Label>
            <Input
              className="col-span-3"
              type="number"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">仓位上限(%)</Label>
            <Input
              className="col-span-3"
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">调整原因</Label>
            <Input
              className="col-span-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
