// 贾维斯: 资产配置目标可折叠卡片组件

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil, Check } from "lucide-react";
import { growthApi } from "@/services/api";
import type { GrowthAllocationItem, GrowthAllocationResponse } from "@/types";

interface TargetConfig {
  target: number;
  min: number;
  max: number;
}

interface Props {
  classValues: Record<string, number>;
  targets: Record<string, TargetConfig>;
  totalBudget?: number;
  onUpdated?: () => void;
}

const CLASS_LABELS: Record<string, string> = {
  equity: "权益",
  bond: "债券",
  gold: "黄金",
};

const CLASS_ORDER = ["equity", "bond", "gold"];

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

// Bullet chart: bar represents 0–SCALE% of target (so target line sits at 67% of bar width)
const BULLET_SCALE = 150;

export default function AssetAllocationTarget({ classValues, targets, totalBudget, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assetClass, setAssetClass] = useState<GrowthAllocationItem[]>(DEFAULT_ASSET_CLASS);
  const [equitySub, setEquitySub] = useState<GrowthAllocationItem[]>(DEFAULT_EQUITY_SUB);
  const [saving, setSaving] = useState(false);

  // 加载详细配置
  useEffect(() => {
    if (expanded && !editMode) {
      growthApi.allocationTargets().then((res) => {
        setAssetClass(res.asset_class);
        setEquitySub(res.equity_sub);
      }).catch(() => {});
    }
  }, [expanded, editMode]);

  const currentTotal = Object.values(classValues).reduce((a, b) => a + b, 0);
  const referenceTotal = totalBudget ?? currentTotal;
  const pendingTotal = referenceTotal - currentTotal;

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
      setEditMode(false);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    // 重新加载配置
    growthApi.allocationTargets().then((res) => {
      setAssetClass(res.asset_class);
      setEquitySub(res.equity_sub);
    }).catch(() => {});
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
    <Card className="shadow-sm">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">资产配置目标</CardTitle>
          <div className="flex items-center gap-2">
            {expanded && !editMode && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={(e) => { e.stopPropagation(); setEditMode(true); }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 折叠状态：简洁摘要 */}
          {!expanded && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {CLASS_ORDER.map((cls) => {
                const label = CLASS_LABELS[cls] ?? cls;
                const value = classValues[cls] ?? 0;
                const t = targets[cls] ?? { target: 0, min: 0, max: 100 };
                const targetAmount = referenceTotal * t.target / 100;
                const ratio = targetAmount > 0 ? (value / targetAmount * 100) : 0;
                const isBelow = ratio < (t.min / t.target * 100);
                const isAbove = ratio > (t.max / t.target * 100);
                const colorClass = isBelow ? "text-yellow-600" : isAbove ? "text-red-500" : "text-emerald-600";
                return (
                  <span key={cls}>
                    {label} <span className={`font-medium ${colorClass}`}>{ratio.toFixed(0)}%</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* 展开状态：详细内容 */}
          <CollapsibleContent>
            {!editMode ? (
              <>
                {/* 查看模式：当前配置状态 */}
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="grid grid-cols-[3.5rem_4.5rem_3.5rem_1fr_4.5rem] gap-x-2 text-xs text-muted-foreground mb-1 px-0.5">
                    <span />
                    <span className="text-right">市值</span>
                    <span className="text-right">达成</span>
                    <span className="pl-1">进度</span>
                    <span className="text-right">缺口</span>
                  </div>

                  {CLASS_ORDER.map((cls) => {
                    const label = CLASS_LABELS[cls] ?? cls;
                    const value = classValues[cls] ?? 0;
                    const t = targets[cls] ?? { target: 0, min: 0, max: 100 };
                    const targetAmount = referenceTotal * t.target / 100;
                    const displayRatio = targetAmount > 0 ? (value / targetAmount * 100) : 0;
                    const minThreshold = t.target > 0 ? (t.min / t.target * 100) : 0;
                    const maxThreshold = t.target > 0 ? (t.max / t.target * 100) : 100;
                    const gap = targetAmount - value;

                    const isBelow = displayRatio < minThreshold;
                    const isAbove = displayRatio > maxThreshold;
                    const barColor = isBelow ? "bg-yellow-400" : isAbove ? "bg-red-400" : "bg-emerald-500";
                    const textColor = isBelow ? "text-yellow-600 dark:text-yellow-400" : isAbove ? "text-red-500" : "text-emerald-600 dark:text-emerald-400";

                    const fillW = Math.min(displayRatio / BULLET_SCALE * 100, 100);
                    const rangeL = minThreshold / BULLET_SCALE * 100;
                    const rangeR = 100 - Math.min(maxThreshold / BULLET_SCALE * 100, 100);
                    const targetX = (100 / BULLET_SCALE * 100);

                    return (
                      <div key={cls} className="grid grid-cols-[3.5rem_4.5rem_3.5rem_1fr_4.5rem] gap-x-2 items-center">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-right text-xs tabular-nums font-mono">
                          ¥{(value / 10000).toFixed(1)}万
                        </span>
                        <span className={`text-right text-xs font-semibold tabular-nums ${textColor}`}>
                          {displayRatio.toFixed(0)}%
                        </span>
                        <div className="relative h-4 rounded bg-muted/30 overflow-hidden">
                          <div className="absolute inset-y-0 bg-muted/70" style={{ left: `${rangeL}%`, right: `${rangeR}%` }} />
                          <div className={`absolute top-0.5 bottom-0.5 left-0 rounded-sm ${barColor}`} style={{ width: `${fillW}%` }} />
                          <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${targetX}%` }} />
                        </div>
                        <span className={`text-right text-xs tabular-nums ${gap > 0 ? "text-muted-foreground" : "text-emerald-600"}`}>
                          {gap > 0 ? `-¥${(gap / 10000).toFixed(1)}万` : `+¥${(-gap / 10000).toFixed(1)}万`}
                        </span>
                      </div>
                    );
                  })}

                  {/* Footer summary */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <span>目标 <span className="font-medium text-foreground">¥{(referenceTotal / 10000).toFixed(1)}万</span></span>
                    <span>已投 <span className="font-medium text-foreground">¥{(currentTotal / 10000).toFixed(1)}万</span></span>
                    <span className={pendingTotal > 0 ? "text-yellow-600" : "text-emerald-600"}>
                      {pendingTotal > 0 ? "待投" : "超出"}{" "}
                      <span className="font-medium">¥{(Math.abs(pendingTotal) / 10000).toFixed(1)}万</span>
                    </span>
                  </div>
                </div>

                {/* 权益内部详情（可折叠） */}
                <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full py-2 text-muted-foreground hover:text-foreground">
                    {detailsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    权益内部配置
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {Object.entries(equityGroups).map(([group, items]) => (
                        <div key={group}>
                          <span className="text-muted-foreground">{group}</span>
                          <div className="mt-1 space-y-0.5">
                            {items.map((item) => {
                              const meta = EQUITY_SUB_LABELS[item.code];
                              return (
                                <div key={item.code} className="flex justify-between">
                                  <span>{meta?.label || item.code}</span>
                                  <span className="tabular-nums">{item.target_ratio}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <>
                {/* 编辑模式 */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">资产类别配置</Label>
                    {assetClass.map((item) => (
                      <div key={item.code} className="flex items-center gap-2">
                        <span className="w-10 text-xs">{ASSET_CLASS_LABELS[item.code] || item.code}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={item.target_ratio}
                            onChange={(e) => updateAssetClass(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                            className="h-7 w-14 text-right text-xs tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">% ±</span>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            step={1}
                            value={item.float_ratio}
                            onChange={(e) => updateAssetClass(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                            className="h-7 w-10 text-right text-xs tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                    <div className={`text-xs text-right ${Math.abs(assetTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                      合计 {assetTotal.toFixed(0)}% {Math.abs(assetTotal - 100) < 0.01 ? "✓" : ""}
                    </div>
                  </div>

                  {/* 权益内部配置 */}
                  <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full py-1">
                      {detailsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
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
                                <span className="w-14 text-xs">{meta?.label || item.code}</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={item.target_ratio}
                                    onChange={(e) => updateEquitySub(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                                    className="h-7 w-14 text-right text-xs tabular-nums"
                                  />
                                  <span className="text-xs text-muted-foreground">% ±</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={item.float_ratio}
                                    onChange={(e) => updateEquitySub(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                                    className="h-7 w-10 text-right text-xs tabular-nums"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className={`text-xs text-right ${Math.abs(equityTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                        合计 {equityTotal.toFixed(0)}% {Math.abs(equityTotal - 100) < 0.01 ? "✓" : ""}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!isValid || saving}>
                      {saving ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
