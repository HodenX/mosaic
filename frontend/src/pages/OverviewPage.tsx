import { useEffect, useState } from "react";
import { portfolioApi, positionApi } from "@/services/api";
import SummaryCards from "@/components/SummaryCards";
import TrendChart from "@/components/TrendChart";
import PlatformChart from "@/components/PlatformChart";
import AllocationChart from "@/components/AllocationChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { AllocationResponse, PlatformBreakdown, PortfolioSummary, PortfolioTrend, PositionStatus } from "@/types";

export default function OverviewPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);
  const [trend, setTrend] = useState<PortfolioTrend[]>([]);
  const [assetAlloc, setAssetAlloc] = useState<AllocationResponse | null>(null);
  const [geoAlloc, setGeoAlloc] = useState<AllocationResponse | null>(null);
  const [sectorAlloc, setSectorAlloc] = useState<AllocationResponse | null>(null);
  const [position, setPosition] = useState<PositionStatus | null>(null);

  useEffect(() => {
    portfolioApi.summary().then(setSummary);
    portfolioApi.byPlatform().then(setPlatforms);
    portfolioApi.trend().then(setTrend);
    portfolioApi.allocation("asset_class").then(setAssetAlloc);
    portfolioApi.allocation("geography").then(setGeoAlloc);
    portfolioApi.allocation("sector").then(setSectorAlloc);
    positionApi.getBudget().then(setPosition);
  }, []);

  if (!summary) return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[56px] rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-3 h-[300px] rounded-xl" />
        <Skeleton className="lg:col-span-2 h-[300px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[320px] rounded-xl" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <h2 className="text-xl font-semibold">组合概览</h2>

      {/* Row 1: Summary cards + position gauge */}
      <SummaryCards
        summary={summary}
        position={position}
        onPositionUpdated={setPosition}
      />

      {/* Row 2: Trend chart (wider) + Platform chart */}
      {(trend.length > 0 || platforms.length > 0) && (
        <div className={`grid grid-cols-1 gap-4 ${trend.length > 0 && platforms.length > 0 ? "lg:grid-cols-5" : ""}`}>
          {trend.length > 0 && (
            <div className={platforms.length > 0 ? "lg:col-span-3" : ""}>
              <TrendChart data={trend} />
            </div>
          )}
          {platforms.length > 0 && (
            <div className={trend.length > 0 ? "lg:col-span-2" : ""}>
              <PlatformChart data={platforms} />
            </div>
          )}
        </div>
      )}

      {/* Row 3: Allocation donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AllocationChart title="资产类别" data={assetAlloc?.items ?? []} coverage={assetAlloc?.coverage} />
        <AllocationChart title="地域分布" data={geoAlloc?.items ?? []} coverage={geoAlloc?.coverage} />
        <AllocationChart title="行业分布" data={sectorAlloc?.items ?? []} coverage={sectorAlloc?.coverage} />
      </div>
    </div>
  );
}
