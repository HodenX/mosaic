import { useEffect, useState } from "react";
import { portfolioApi, positionApi } from "@/services/api";
import SummaryCards from "@/components/SummaryCards";
import AssetAllocationTarget from "@/components/AssetAllocationTarget";
import TrendChart from "@/components/TrendChart";
import CollapsibleAnalytics from "@/components/CollapsibleAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioSummary, PortfolioTrend, PositionStatus, StrategyResult } from "@/types";

export default function OverviewPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [trend, setTrend] = useState<PortfolioTrend[]>([]);
  const [position, setPosition] = useState<PositionStatus | null>(null);
  const [suggestion, setSuggestion] = useState<StrategyResult | null>(null);
  const [strategyTargets, setStrategyTargets] = useState<Record<string, { target: number; min: number; max: number }> | null>(null);

  useEffect(() => {
    portfolioApi.summary().then(setSummary);
    portfolioApi.trend().then(setTrend);
    positionApi.getBudget().then((pos) => {
      setPosition(pos);
      if (pos.active_strategy === "asset_rebalance") {
        positionApi.suggestion().then(setSuggestion);
        positionApi.getStrategyConfig("asset_rebalance").then((res) => {
          const cfg = res?.config as Record<string, unknown> | undefined;
          setStrategyTargets((cfg?.targets as typeof strategyTargets) ?? null);
        }).catch(() => setStrategyTargets(null));
      }
    });
  }, []);

  if (!summary) return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[220px] rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <h2 className="text-xl font-semibold">组合概览</h2>

      {/* Row 1: Summary cards (PnL, Return%, Market Value, Position) */}
      <SummaryCards
        summary={summary}
        position={position}
        onPositionUpdated={setPosition}
      />

      {/* Asset allocation target gauges (only for asset_rebalance strategy) */}
      {position?.active_strategy === "asset_rebalance" && suggestion?.extra?.class_ratios != null && (
        <AssetAllocationTarget
          classRatios={suggestion.extra.class_ratios as Record<string, number>}
          classValues={(suggestion.extra.class_values ?? {}) as Record<string, number>}
          targets={strategyTargets ?? {
            equity: { target: 70, min: 65, max: 75 },
            bond: { target: 10, min: 8, max: 12 },
            gold: { target: 20, min: 16, max: 24 },
          }}
        />
      )}

      {/* Row 2: Trend chart (full width) */}
      {trend.length > 0 && <TrendChart data={trend} />}

      {/* Row 3: Collapsible analytics panel */}
      <CollapsibleAnalytics activeStrategy={position?.active_strategy ?? ""} />
    </div>
  );
}
