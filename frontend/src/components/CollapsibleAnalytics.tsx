import { useCallback, useEffect, useRef, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { portfolioApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { AllocationCoverage, AllocationItem, AllocationResponse, PlatformBreakdown } from "@/types";

type TabKey = "geography" | "sector" | "platform" | "asset_class";

interface TabDef {
  key: TabKey;
  label: string;
}

interface Props {
  activeStrategy: string;
}

const STORAGE_KEY = "overview_analytics_open";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
  "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#06b6d4",
];

export default function CollapsibleAnalytics({ activeStrategy }: Props) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  const baseTabs: TabDef[] = [
    { key: "geography", label: "地域分布" },
    { key: "sector", label: "行业分布" },
    { key: "platform", label: "平台分布" },
  ];
  const tabs: TabDef[] = activeStrategy !== "asset_rebalance"
    ? [{ key: "asset_class", label: "资产类别" }, ...baseTabs]
    : baseTabs;

  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0].key);

  const [geoAlloc, setGeoAlloc] = useState<AllocationResponse | null>(null);
  const [sectorAlloc, setSectorAlloc] = useState<AllocationResponse | null>(null);
  const [assetAlloc, setAssetAlloc] = useState<AllocationResponse | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[] | null>(null);

  const fetched = useRef(new Set<TabKey>());

  const fetchTab = useCallback((tab: TabKey) => {
    if (fetched.current.has(tab)) return;
    fetched.current.add(tab);
    switch (tab) {
      case "geography":
        portfolioApi.allocation("geography").then(setGeoAlloc);
        break;
      case "sector":
        portfolioApi.allocation("sector").then(setSectorAlloc);
        break;
      case "asset_class":
        portfolioApi.allocation("asset_class").then(setAssetAlloc);
        break;
      case "platform":
        portfolioApi.byPlatform().then(setPlatforms);
        break;
    }
  }, []);

  useEffect(() => {
    if (open) fetchTab(activeTab);
  }, [open, activeTab, fetchTab]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
  };

  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeStrategy]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTabContent = () => {
    switch (activeTab) {
      case "geography":
        return geoAlloc ? (
          <InlineAllocationChart data={geoAlloc.items} coverage={geoAlloc.coverage} />
        ) : <Skeleton className="h-[220px] rounded-xl" />;
      case "sector":
        return sectorAlloc ? (
          <InlineAllocationChart data={sectorAlloc.items} coverage={sectorAlloc.coverage} />
        ) : <Skeleton className="h-[220px] rounded-xl" />;
      case "asset_class":
        return assetAlloc ? (
          <InlineAllocationChart data={assetAlloc.items} coverage={assetAlloc.coverage} />
        ) : <Skeleton className="h-[220px] rounded-xl" />;
      case "platform":
        return platforms ? (
          <PlatformList data={platforms} />
        ) : <Skeleton className="h-[160px] rounded-xl" />;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">详细分析</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={toggleOpen} className="text-xs text-muted-foreground">
            {open ? "收起 ▲" : "展开 ▼"}
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex gap-1 mb-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-xs transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {renderTabContent()}
        </CardContent>
      )}
    </Card>
  );
}

const LEGEND_LIMIT = 8;

/** Inline donut chart with horizontal layout — no Card wrapper, fits full-width context */
function InlineAllocationChart({ data, coverage }: { data: AllocationItem[]; coverage?: AllocationCoverage }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>;
  }

  const hasFunds = data.some((item) => item.funds && item.funds.length > 0);

  const chartConfig = Object.fromEntries(
    data.map((item, i) => [item.category, { label: item.category, color: COLORS[i % COLORS.length] }])
  ) satisfies ChartConfig;

  const chartData = data.map((item, i) => ({
    name: item.category,
    value: item.percentage,
    fill: COLORS[i % COLORS.length],
  }));

  const handleClick = (category: string) => {
    if (!hasFunds) return;
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const selectedItem = data.find((item) => item.category === selectedCategory);

  return (
    <div>
      {coverage && coverage.covered_funds < coverage.total_funds && (
        <p className="text-xs text-muted-foreground mb-3">
          覆盖 {coverage.covered_funds}/{coverage.total_funds} 只基金，占总市值 {coverage.covered_percent}%
        </p>
      )}
      <div className="flex items-start gap-6">
        {/* Donut chart — fixed width */}
        <ChartContainer config={chartConfig} className="h-[200px] w-[200px] shrink-0">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              onClick={hasFunds ? (_: unknown, index: number) => handleClick(chartData[index].name) : undefined}
              style={hasFunds ? { cursor: "pointer" } : undefined}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  strokeWidth={selectedCategory === entry.name ? 3 : 1}
                  stroke={selectedCategory === entry.name ? "#000" : undefined}
                  opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        {/* Legend — fills remaining space, capped */}
        <div className="flex-1 min-w-0 pt-2 space-y-1.5">
          {(showAll ? data : data.slice(0, LEGEND_LIMIT)).map((item) => {
            const idx = data.indexOf(item);
            return (
              <div
                key={item.category}
                className={`flex items-center justify-between text-sm py-1 px-2 rounded ${hasFunds ? "cursor-pointer hover:bg-muted" : ""} ${selectedCategory === item.category ? "bg-muted" : ""}`}
                onClick={() => handleClick(item.category)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.category}</span>
                </div>
                <span className="tabular-nums font-medium">{item.percentage.toFixed(1)}%</span>
              </div>
            );
          })}
          {data.length > LEGEND_LIMIT && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 pt-1"
            >
              {showAll ? "收起" : `展开全部 ${data.length} 项`}
            </button>
          )}
        </div>
      </div>
      {selectedItem?.funds && selectedItem.funds.length > 0 && (
        <div className="mt-3 rounded-md border p-3">
          <p className="mb-1.5 text-xs font-medium">{selectedCategory} - 基金明细</p>
          <div className="space-y-1">
            {selectedItem.funds.map((fund) => (
              <div key={fund.fund_code} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{fund.fund_code}</span>
                  <span>{fund.fund_name}</span>
                </div>
                <span>{fund.percentage.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformList({ data }: { data: PlatformBreakdown[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((p) => {
        const isProfit = p.pnl >= 0;
        return (
          <div key={p.platform} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
            <div>
              <span className="text-sm font-medium">{p.platform}</span>
              <span className="text-xs text-muted-foreground ml-2">{p.count} 只基金</span>
            </div>
            <div className="flex items-center gap-4 text-sm tabular-nums">
              <span>{formatCurrency(p.market_value)}</span>
              <span className={isProfit ? "text-red-500" : "text-green-500"}>
                {isProfit ? "+" : ""}{formatCurrency(p.pnl)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
