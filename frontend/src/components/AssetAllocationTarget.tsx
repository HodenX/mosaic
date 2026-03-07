// 贾维斯: 资产配置目标卡片组件

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { growthApi } from "@/services/api";
import type { GrowthAllocationItem } from "@/types";

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

// Bullet chart: bar represents 0–150% of target
const BULLET_SCALE = 150;

export default function AssetAllocationTarget({ classValues, targets, totalBudget, onUpdated }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [equityExpanded, setEquityExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assetClass, setAssetClass] = useState<GrowthAllocationItem[]>(DEFAULT_ASSET_CLASS);
  const [equitySub, setEquitySub] = useState<GrowthAllocationItem[]>(DEFAULT_EQUITY_SUB);
  const [saving, setSaving] = useState(false);

  // 加载详细配置
  useEffect(() => {
    growthApi.allocationTargets().then((res) => {
      setAssetClass(res.asset_class);
      setEquitySub(res.equity_sub);
    }).catch(() => {});
  }, []);

  const currentTotal = Object.values(classValues).reduce((a, b) => a + b, 0);
  const referenceTotal = totalBudget ?? currentTotal;
  const pendingTotal = referenceTotal - currentTotal;

  // 权益内部子项的市值（按比例分配权益总市值）
  const equityValue = classValues["equity"] ?? 0;
  const equitySubValues: Record<string, number> = {};
  const equityTotalRatio = equitySub.reduce((s, i) => s + i.target_ratio, 0);
  equitySub.forEach((item) => {
    equitySubValues[item.code] = equityValue * (item.target_ratio / equityTotalRatio);
  });

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
    growthApi.allocationTargets().then((res) => {
      setAssetClass(res.asset_class);
      setEquitySub(res.equity_sub);
    }).catch(() => {});
  };

  // 按组分类权益子项
  const equityGroups = equitySub.reduce((acc, item) => {
    const meta = EQUITY_SUB_LABELS[item.code];
    if (meta) {
      if (!acc[meta.group]) acc[meta.group] = [];
      acc[meta.group].push(item);
    }
    return acc;
  }, {} as Record<string, GrowthAllocationItem[]>);

  // 渲染进度条行
  const renderProgressRow = (
    label: string,
    value: number,
    targetPercent: number,
    minPercent: number,
    maxPercent: number,
    indent?: boolean
  ) => {
    const targetAmount = referenceTotal * targetPercent / 100;
    const ratio = targetAmount > 0 ? (value / targetAmount * 100) : 0;
    const minThreshold = targetPercent > 0 ? (minPercent / targetPercent * 100) : 0;
    const maxThreshold = targetPercent > 0 ? (maxPercent / targetPercent * 100) : 100;
    const gap = targetAmount - value;

    const isBelow = ratio < minThreshold;
    const isAbove = ratio > maxThreshold;
    const barColor = isBelow ? "bg-yellow-400" : isAbove ? "bg-red-400" : "bg-emerald-500";
    const textColor = isBelow ? "text-yellow-600 dark:text-yellow-400" : isAbove ? "text-red-500" : "text-emerald-600 dark:text-emerald-400";

    const fillW = Math.min(ratio / BULLET_SCALE * 100, 100);
    const rangeL = minThreshold / BULLET_SCALE * 100;
    const rangeR = 100 - Math.min(maxThreshold / BULLET_SCALE * 100, 100);
    const targetX = (100 / BULLET_SCALE * 100);

    return (
      <div className={`grid grid-cols-[1fr_4rem_3rem_1fr_3.5rem] gap-x-2 items-center ${indent ? "pl-4" : ""}`}>
        <span className={`text-xs ${indent ? "text-muted-foreground" : "font-medium"}`}>{label}</span>
        <span className="text-right text-xs tabular-nums font-mono">
          ¥{(value / 10000).toFixed(1)}万
        </span>
        <span className={`text-right text-xs font-semibold tabular-nums ${textColor}`}>
          {ratio.toFixed(0)}%
        </span>
        <div className="relative h-3 rounded bg-muted/30 overflow-hidden">
          <div className="absolute inset-y-0 bg-muted/70" style={{ left: `${rangeL}%`, right: `${rangeR}%` }} />
          <div className={`absolute top-0.5 bottom-0.5 left-0 rounded-sm ${barColor}`} style={{ width: `${fillW}%` }} />
          <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${targetX}%` }} />
        </div>
        <span className={`text-right text-xs tabular-nums ${gap > 0 ? "text-muted-foreground" : "text-emerald-600"}`}>
          {gap > 0 ? `-${(gap / 10000).toFixed(1)}万` : `+${(-gap / 10000).toFixed(1)}万`}
        </span>
      </div>
    );
  };

  // 渲染编辑行
  const renderEditRow = (
    label: string,
    targetRatio: number,
    floatRatio: number,
    onTargetChange: (v: number) => void,
    onFloatChange: (v: number) => void,
    indent?: boolean
  ) => (
    <div className={`flex items-center gap-2 ${indent ? "pl-4" : ""}`}>
      <span className={`w-16 text-xs ${indent ? "text-muted-foreground" : ""}`}>{label}</span>
      <Input
        type="number"
        min={0}
        max={100}
        step={1}
        value={targetRatio}
        onChange={(e) => onTargetChange(parseFloat(e.target.value) || 0)}
        className="h-6 w-12 text-right text-xs tabular-nums px-1"
      />
      <span className="text-xs text-muted-foreground">% ±</span>
      <Input
        type="number"
        min={0}
        max={50}
        step={1}
        value={floatRatio}
        onChange={(e) => onFloatChange(parseFloat(e.target.value) || 0)}
        className="h-6 w-10 text-right text-xs tabular-nums px-1"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">资产配置目标</CardTitle>
        <div className="flex items-center gap-1">
          {!editMode ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancel}>
                取消
              </Button>
              <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSave} disabled={!isValid || saving}>
                {saving ? "保存中" : "保存"}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-3 pt-0">
          {editMode ? (
            <>
              {/* 编辑模式 */}
              {CLASS_ORDER.map((cls) => {
                const label = CLASS_LABELS[cls] ?? cls;
                const item = assetClass.find((a) => a.code === cls);
                const t = targets[cls] ?? { target: 0, min: 0, max: 100 };

                return (
                  <div key={cls} className="space-y-1">
                    {renderEditRow(
                      label,
                      item?.target_ratio ?? t.target,
                      item?.float_ratio ?? 5,
                      (v) => updateAssetClass(cls, "target_ratio", v),
                      (v) => updateAssetClass(cls, "float_ratio", v)
                    )}

                    {/* 权益内部配置 */}
                    {cls === "equity" && (
                      <Collapsible open={equityExpanded} onOpenChange={setEquityExpanded}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground pl-4 py-1 hover:text-foreground">
                          {equityExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          权益内部配置
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-1">
                          {Object.entries(equityGroups).map(([group, items]) => (
                            <div key={group}>
                              <div className="text-xs text-muted-foreground pl-4">{group}</div>
                              {items.map((subItem) => {
                                const meta = EQUITY_SUB_LABELS[subItem.code];
                                return renderEditRow(
                                  meta?.label || subItem.code,
                                  subItem.target_ratio,
                                  subItem.float_ratio,
                                  (v) => updateEquitySub(subItem.code, "target_ratio", v),
                                  (v) => updateEquitySub(subItem.code, "float_ratio", v),
                                  true
                                );
                              })}
                            </div>
                          ))}
                          <div className={`text-xs text-right pl-4 ${Math.abs(equityTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                            合计 {equityTotal.toFixed(0)}%
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
              <div className={`text-xs text-right ${Math.abs(assetTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                资产类别合计 {assetTotal.toFixed(0)}%
              </div>
            </>
          ) : (
            <>
              {/* 查看模式 */}
              {CLASS_ORDER.map((cls) => {
                const label = CLASS_LABELS[cls] ?? cls;
                const value = classValues[cls] ?? 0;
                const t = targets[cls] ?? { target: 0, min: 0, max: 100 };

                return (
                  <div key={cls} className="space-y-1">
                    {renderProgressRow(label, value, t.target, t.min, t.max)}

                    {/* 权益内部配置 */}
                    {cls === "equity" && (
                      <Collapsible open={equityExpanded} onOpenChange={setEquityExpanded}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground pl-2 py-1 hover:text-foreground">
                          {equityExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          权益内部配置
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-1">
                          {Object.entries(equityGroups).map(([group, items]) => (
                            <div key={group}>
                              <div className="text-xs text-muted-foreground pl-4 mb-0.5">{group}</div>
                              {items.map((subItem) => {
                                const meta = EQUITY_SUB_LABELS[subItem.code];
                                const subValue = equitySubValues[subItem.code] ?? 0;
                                const subTarget = subItem.target_ratio;
                                const subFloat = subItem.float_ratio;
                                return renderProgressRow(
                                  meta?.label || subItem.code,
                                  subValue,
                                  subTarget,
                                  Math.max(0, subTarget - subFloat),
                                  Math.min(100, subTarget + subFloat),
                                  true
                                );
                              })}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t border-border/40">
                <span>目标 <span className="font-medium text-foreground">¥{(referenceTotal / 10000).toFixed(1)}万</span></span>
                <span>已投 <span className="font-medium text-foreground">¥{(currentTotal / 10000).toFixed(1)}万</span></span>
                <span className={pendingTotal > 0 ? "text-yellow-600" : "text-emerald-600"}>
                  {pendingTotal > 0 ? "待投" : "超出"}{" "}
                  <span className="font-medium">¥{(Math.abs(pendingTotal) / 10000).toFixed(1)}万</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
