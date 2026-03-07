// 贾维斯: 长钱资产配置目标对话框组件

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { growthApi } from "@/services/api";
import type { GrowthAllocationItem, GrowthAllocationResponse } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

// 标签映射
const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: "权益",
  bond: "债券",
  gold: "黄金",
};

const EQUITY_SUB_LABELS: Record<string, { label: string; group: string }> = {
  spx: { label: "标普500", group: "美股" },
  nasdaq: { label: "纳斯达克", group: "美股" },
  csi300: { label: "沪深300", group: "A股/港股" },
  dividend: { label: "中证红利", group: "A股/港股" },
  hkt: { label: "恒生科技", group: "A股/港股" },
};

const DEFAULT_ASSET_CLASS: GrowthAllocationItem[] = [
  { code: "equity", target_ratio: 70, float_ratio: 5 },
  { code: "bond", target_ratio: 10, float_ratio: 2 },
  { code: "gold", target_ratio: 20, float_ratio: 4 },
];

const DEFAULT_EQUITY_SUB: GrowthAllocationItem[] = [
  { code: "spx", target_ratio: 30, float_ratio: 5 },
  { code: "nasdaq", target_ratio: 15, float_ratio: 5 },
  { code: "csi300", target_ratio: 15, float_ratio: 5 },
  { code: "dividend", target_ratio: 10, float_ratio: 5 },
  { code: "hkt", target_ratio: 10, float_ratio: 5 },
];

export default function GrowthAllocationDialog({ open, onOpenChange, onUpdated }: Props) {
  const [assetClass, setAssetClass] = useState<GrowthAllocationItem[]>(DEFAULT_ASSET_CLASS);
  const [equitySub, setEquitySub] = useState<GrowthAllocationItem[]>(DEFAULT_EQUITY_SUB);
  const [equityOpen, setEquityOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      growthApi.allocationTargets().then((res) => {
        setAssetClass(res.asset_class);
        setEquitySub(res.equity_sub);
      }).catch(() => {
        // 使用默认值
      });
    }
  }, [open]);

  const updateAssetClass = useCallback((code: string, field: "target_ratio" | "float_ratio", value: number) => {
    setAssetClass((prev) =>
      prev.map((item) =>
        item.code === code ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const updateEquitySub = useCallback((code: string, field: "target_ratio" | "float_ratio", value: number) => {
    setEquitySub((prev) =>
      prev.map((item) =>
        item.code === code ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const assetTotal = assetClass.reduce((sum, item) => sum + item.target_ratio, 0);
  const equityTotal = equitySub.reduce((sum, item) => sum + item.target_ratio, 0);
  const isValid = Math.abs(assetTotal - 100) < 0.01 && Math.abs(equityTotal - 100) < 0.01;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await growthApi.updateAllocationTargets({
        asset_class: assetClass,
        equity_sub: equitySub,
      });
      onOpenChange(false);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  // 按组分类权益子项
  const equityGroups = equitySub.reduce((acc, item) => {
    const meta = EQUITY_SUB_LABELS[item.code];
    if (meta) {
      const group = meta.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
    }
    return acc;
  }, {} as Record<string, GrowthAllocationItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>长钱资产配置目标</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 资产类别配置 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">资产类别配置</Label>
            {assetClass.map((item) => (
              <div key={item.code} className="flex items-center gap-2">
                <span className="w-12 text-sm">{ASSET_CLASS_LABELS[item.code] || item.code}</span>
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={item.target_ratio}
                    onChange={(e) => updateAssetClass(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                    className="h-8 w-16 text-right tabular-nums font-serif"
                  />
                  <span className="text-xs text-muted-foreground">% ±</span>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={item.float_ratio}
                    onChange={(e) => updateAssetClass(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                    className="h-8 w-12 text-right tabular-nums font-serif"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <div className={`text-xs text-right ${Math.abs(assetTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
              合计 {assetTotal.toFixed(1)}% {Math.abs(assetTotal - 100) < 0.01 ? "✓" : "（需等于 100%）"}
            </div>
          </div>

          {/* 权益内部配置（折叠） */}
          <Collapsible open={equityOpen} onOpenChange={setEquityOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full py-2">
              {equityOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              权益内部配置
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {Object.entries(equityGroups).map(([group, items]) => (
                <div key={group}>
                  <Label className="text-xs text-muted-foreground">{group}</Label>
                  {items.map((item) => {
                    const meta = EQUITY_SUB_LABELS[item.code];
                    return (
                      <div key={item.code} className="flex items-center gap-2 mt-1">
                        <span className="w-16 text-sm">{meta?.label || item.code}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={item.target_ratio}
                            onChange={(e) => updateEquitySub(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                            className="h-8 w-16 text-right tabular-nums font-serif"
                          />
                          <span className="text-xs text-muted-foreground">% ±</span>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            step={1}
                            value={item.float_ratio}
                            onChange={(e) => updateEquitySub(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                            className="h-8 w-12 text-right tabular-nums font-serif"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className={`text-xs text-right ${Math.abs(equityTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                合计 {equityTotal.toFixed(1)}% {Math.abs(equityTotal - 100) < 0.01 ? "✓" : "（需等于 100%）"}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
