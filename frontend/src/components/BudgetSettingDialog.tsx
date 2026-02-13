import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>总预算</Label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="例如: 100000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>仓位下限(%)</Label>
              <Input
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>仓位上限(%)</Label>
              <Input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>调整原因</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="可选"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "保存中..." : "确认保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
