import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PositionGauge from "@/components/PositionGauge";
import BudgetSettingDialog from "@/components/BudgetSettingDialog";
import BudgetChangeLogDialog from "@/components/BudgetChangeLogDialog";
import StrategySuggestionDialog from "@/components/StrategySuggestionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { positionApi } from "@/services/api";
import type { PositionStatus, StrategyInfo, StrategyResult } from "@/types";

export default function PositionPage() {
  const [position, setPosition] = useState<PositionStatus | null>(null);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [suggestion, setSuggestion] = useState<StrategyResult | null>(null);
  const [switching, setSwitching] = useState(false);

  const load = () => {
    positionApi.getBudget().then(setPosition);
    positionApi.strategies().then(setStrategies);
  };

  const loadSuggestion = () => {
    positionApi.suggestion().then(setSuggestion).catch(() => setSuggestion(null));
  };

  useEffect(() => {
    load();
    loadSuggestion();
  }, []);

  const handleSwitch = async (name: string) => {
    setSwitching(true);
    try {
      const result = await positionApi.setActiveStrategy(name);
      setPosition(result);
      loadSuggestion();
    } finally {
      setSwitching(false);
    }
  };

  const handleBudgetUpdated = (status: PositionStatus) => {
    setPosition(status);
    loadSuggestion();
  };

  if (!position) return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-[200px] rounded-xl" />
      <Skeleton className="h-[160px] rounded-xl" />
      <Skeleton className="h-[120px] rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <h2 className="text-xl font-semibold">仓位管理</h2>

      {/* Budget management */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">投资预算</CardTitle>
            <div className="flex gap-2">
              <BudgetChangeLogDialog />
              <BudgetSettingDialog current={position} onUpdated={handleBudgetUpdated} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {position.total_budget > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">总预算</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums whitespace-nowrap">¥{position.total_budget.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">已投入</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums whitespace-nowrap">¥{position.total_value.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">可用资金</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums whitespace-nowrap">¥{position.available_cash.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">仓位比例</p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums whitespace-nowrap">{position.position_ratio.toFixed(1)}%</p>
                </div>
              </div>
              <PositionGauge
                ratio={position.position_ratio}
                min={position.target_position_min}
                max={position.target_position_max}
              />
              <p className="text-xs text-muted-foreground">
                目标仓位区间: {position.target_position_min}% ~ {position.target_position_max}%
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">尚未设置投资预算，请先设置预算开始仓位管理</p>
              <BudgetSettingDialog
                current={position}
                onUpdated={handleBudgetUpdated}
                trigger={<Button>设置投资预算</Button>}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">策略管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {strategies.map((s) => (
              <div
                key={s.name}
                className={`flex items-center justify-between rounded-md border p-4 transition-colors ${
                  s.name === position.active_strategy ? "border-l-3 border-l-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {s.display_name}
                    {s.name === position.active_strategy && (
                      <span className="ml-2 text-xs text-primary">(当前)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                {s.name !== position.active_strategy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    disabled={switching}
                    onClick={() => handleSwitch(s.name)}
                  >
                    切换
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy suggestion result */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">策略建议</CardTitle>
            <StrategySuggestionDialog />
          </div>
        </CardHeader>
        <CardContent>
          {suggestion ? (
            <div className="space-y-3">
              <p className="text-sm">{suggestion.summary}</p>
              {suggestion.suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestion.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {s.fund_name} ({s.fund_code})
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
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无策略建议</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
