// 贾维斯: 资产配置目标卡片 - 精致金融风格

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil, X, Check } from "lucide-react";
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

// 渐变配置
const GRADIENTS = {
  equity: "from-amber-400 via-yellow-500 to-amber-600",
  bond: "from-slate-400 via-gray-500 to-slate-500",
  gold: "from-yellow-300 via-amber-400 to-yellow-500",
  spx: "from-indigo-400 via-blue-500 to-indigo-500",
  nasdaq: "from-purple-400 via-violet-500 to-purple-500",
  csi300: "from-red-400 via-rose-500 to-red-500",
  dividend: "from-orange-400 via-amber-500 to-orange-500",
  hkt: "from-teal-400 via-cyan-500 to-teal-500",
};

const BAR_SCALE = 120;

export default function AssetAllocationTarget({ classValues, targets, totalBudget, onUpdated }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [equityExpanded, setEquityExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [assetClass, setAssetClass] = useState<GrowthAllocationItem[]>(DEFAULT_ASSET_CLASS);
  const [equitySub, setEquitySub] = useState<GrowthAllocationItem[]>(DEFAULT_EQUITY_SUB);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    growthApi.allocationTargets().then((res) => {
      setAssetClass(res.asset_class);
      setEquitySub(res.equity_sub);
    }).catch(() => {});
  }, []);

  const currentTotal = Object.values(classValues).reduce((a, b) => a + b, 0);
  const referenceTotal = totalBudget ?? currentTotal;
  const pendingTotal = referenceTotal - currentTotal;

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

  const equityGroups = equitySub.reduce((acc, item) => {
    const meta = EQUITY_SUB_LABELS[item.code];
    if (meta) {
      if (!acc[meta.group]) acc[meta.group] = [];
      acc[meta.group].push(item);
    }
    return acc;
  }, {} as Record<string, GrowthAllocationItem[]>);

  const getStatusColor = (ratio: number, minPct: number, maxPct: number) => {
    if (ratio < minPct) return "text-amber-500 dark:text-amber-400";
    if (ratio > maxPct) return "text-rose-500 dark:text-rose-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getGradientKey = (code: string) => GRADIENTS[code as keyof typeof GRADIENTS] || GRADIENTS.equity;

  const renderProgressRow = (
    label: string,
    code: string,
    value: number,
    targetPercent: number,
    minPercent: number,
    maxPercent: number,
    indent: number = 0,
    isSubItem: boolean = false
  ) => {
    const targetAmount = referenceTotal * targetPercent / 100;
    const ratio = targetAmount > 0 ? (value / targetAmount * 100) : 0;
    const minThreshold = targetPercent > 0 ? (minPercent / targetPercent * 100) : 0;
    const maxThreshold = targetPercent > 0 ? (maxPercent / targetPercent * 100) : 100;
    const gap = targetAmount - value;

    const isBelow = ratio < minThreshold;
    const isAbove = ratio > maxThreshold;
    const statusColor = getStatusColor(ratio, minThreshold, maxThreshold);

    const fillW = Math.min(ratio / BAR_SCALE * 100, 100);
    const targetX = (100 / BAR_SCALE * 100);

    const gradient = getGradientKey(code);
    const barHeight = isSubItem ? "h-1.5" : "h-2";

    return (
      <div
        className={`grid grid-cols-[2fr_4.5rem_3.5rem_1fr_4rem] gap-x-3 items-center py-1.5 transition-all duration-300 ${indent > 0 ? "pl-4 opacity-90" : "font-medium"}`}
        style={{ paddingLeft: `${indent * 0.75}rem` }}
      >
        <span className={`text-sm ${indent > 0 ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
        <span className="text-right text-sm tabular-nums font-serif">
          ¥{(value / 10000).toFixed(1)}万
        </span>
        <span className={`text-right text-sm font-semibold tabular-nums font-serif ${statusColor}`}>
          {ratio.toFixed(0)}%
        </span>
        <div className="relative rounded-full bg-muted/50 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} style={{ width: `${fillW}%` }} />
          <div className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${targetX}%` }} />
        </div>
        <span className={`text-right text-xs tabular-nums ${gap > 0 ? "text-muted-foreground" : "text-emerald-600"}`}>
          {gap > 0 ? `-${(gap / 10000).toFixed(1)}万` : `+${(-gap / 10000).toFixed(1)}万`}
        </span>
      </div>
    );
  };

  const renderEditRow = (
    label: string,
    targetRatio: number,
    floatRatio: number,
    onTargetChange: (v: number) => void,
    onFloatChange: (v: number) => void,
    indent: number = 0
  ) => (
    <div className={`flex items-center gap-3 py-2 ${indent > 0 ? "pl-4" : ""}`}>
      <span className={`w-20 text-sm ${indent > 0 ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={targetRatio}
          onChange={(e) => onTargetChange(parseFloat(e.target.value) || 0)}
          className="h-8 w-14 text-right text-sm tabular-nums font-serif"
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
      <span className="text-xs text-muted-foreground">±</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={50}
          step={1}
          value={floatRatio}
          onChange={(e) => onFloatChange(parseFloat(e.target.value) || 0)}
          className="h-8 w-12 text-right text-sm tabular-nums font-serif"
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );

  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base tracking-wide">资产配置目标</CardTitle>
        <div className="flex items-center gap-1">
          {!editMode ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleSave}
                disabled={!isValid || saving}
              >
                {saving ? "保存中..." : <><Check className="h-4 w-4 mr-1" />保存</>}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 pt-0">
          {editMode ? (
            <>
              <div className="space-y-1">
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

                      {cls === "equity" && (
                        <Collapsible open={equityExpanded} onOpenChange={setEquityExpanded}>
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5 py-1.5 hover:text-foreground transition-colors">
                            {equityExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <span>权益内部配置</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1 pt-1">
                            {Object.entries(equityGroups).map(([group, items]) => (
                              <div key={group}>
                                <div className="text-xs text-muted-foreground pl-5 py-1 font-medium">{group}</div>
                                {items.map((subItem) => {
                                  const meta = EQUITY_SUB_LABELS[subItem.code];
                                  return renderEditRow(
                                    meta?.label || subItem.code,
                                    subItem.target_ratio,
                                    subItem.float_ratio,
                                    (v) => updateEquitySub(subItem.code, "target_ratio", v),
                                    (v) => updateEquitySub(subItem.code, "float_ratio", v),
                                    5
                                  );
                                })}
                              </div>
                            ))}
                            <div className={`text-xs text-right pl-5 py-1 ${Math.abs(equityTotal - 100) < 0.01 ? "text-emerald-600" : "text-rose-500"}`}>
                              合计 {equityTotal.toFixed(0)}%
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={`text-xs text-right py-2 ${Math.abs(assetTotal - 100) < 0.01 ? "text-emerald-600" : "text-rose-500"}`}>
                资产类别合计 {assetTotal.toFixed(0)}%
              </div>
            </>
          ) : (
            <>
              {/* 表头 */}
              <div className="grid grid-cols-[2fr_4.5rem_3.5rem_1fr_4rem] gap-x-3 items-center px-1 pb-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground font-medium">资产类别</span>
                <span className="text-right text-xs text-muted-foreground">市值</span>
                <span className="text-right text-xs text-muted-foreground">达成率</span>
                <span className="text-xs text-muted-foreground">配置进度</span>
                <span className="text-right text-xs text-muted-foreground">缺口</span>
              </div>

              <div className="space-y-0.5">
                {CLASS_ORDER.map((cls) => {
                  const label = CLASS_LABELS[cls] ?? cls;
                  const value = classValues[cls] ?? 0;
                  const t = targets[cls] ?? { target: 0, min: 0, max: 100 };

                  return (
                    <div key={cls} className="space-y-0.5">
                      {renderProgressRow(label, cls, value, t.target, t.min, t.max)}

                      {cls === "equity" && (
                        <Collapsible open={equityExpanded} onOpenChange={setEquityExpanded}>
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2 py-1.5 hover:text-foreground transition-colors">
                            {equityExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <span>权益内部配置</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-0.5 pt-1">
                            {Object.entries(equityGroups).map(([group, items]) => (
                              <div key={group}>
                                <div className="text-xs text-muted-foreground pl-4 py-1 font-medium">{group}</div>
                                {items.map((subItem) => {
                                  const meta = EQUITY_SUB_LABELS[subItem.code];
                                  const subValue = equitySubValues[subItem.code] ?? 0;
                                  return renderProgressRow(
                                    meta?.label || subItem.code,
                                    subItem.code,
                                    subValue,
                                    subItem.target_ratio,
                                    Math.max(0, subItem.target_ratio - subItem.float_ratio),
                                    Math.min(100, subItem.target_ratio + subItem.float_ratio),
                                    4,
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
              </div>

              {/* 底部汇总 */}
              <div className="pt-4 mt-4 border-t border-border/50">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">目标金额</div>
                    <div className="text-lg font-semibold tabular-nums font-serif">
                      ¥{(referenceTotal / 10000).toFixed(1)}万
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">已投资</div>
                    <div className="text-lg font-semibold tabular-nums font-serif">
                      ¥{(currentTotal / 10000).toFixed(1)}万
                    </div>
                  </div>
                  <div className={`text-center ${pendingTotal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {pendingTotal > 0 ? "待投资" : "超出"}
                    </div>
                    <div className="text-lg font-semibold tabular-nums font-serif">
                      ¥{(Math.abs(pendingTotal) / 10000).toFixed(1)}万
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
