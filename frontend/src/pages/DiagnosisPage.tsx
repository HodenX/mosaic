import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  HeartPulse,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Droplets,
  Landmark,
  Shield,
} from "lucide-react";
import { PieChart, Pie, Cell, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { diagnosisApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  DiagnosisResult,
  DiagnosisFinding,
  DiagnosisIssueSummary,
  DiagnosisRecommendation,
  DiagnosisScanSection,
} from "@/types";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
  "var(--chart-6)", "var(--chart-7)", "var(--chart-8)", "var(--chart-9)", "var(--chart-10)",
];

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; border: string; label: string }> = {
  high: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "高" },
  medium: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "中" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "提醒" },
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "提醒" },
};

const BUCKET_ICONS: Record<string, typeof Droplets> = {
  liquid: Droplets,
  stable: Landmark,
  growth: TrendingUp,
  insurance: Shield,
};

const BUCKET_LABELS: Record<string, string> = {
  liquid: "活钱",
  stable: "稳钱",
  growth: "长钱",
  insurance: "保险",
};

const BUCKET_BENCHMARKS: Record<string, string> = {
  liquid: "10-15%",
  stable: "15-25%",
  growth: "50-70%",
};

const BUCKET_BORDER_COLORS: Record<string, string> = {
  liquid: "border-t-bucket-liquid",
  stable: "border-t-bucket-stable",
  growth: "border-t-primary",
  insurance: "border-t-bucket-insurance",
};

// --- Helpers to extract data from the flexible JSON ---

function getBuckets(data: DiagnosisResult) {
  const overview = data.family_asset_overview;
  if (!overview?.buckets) return [];
  const total = overview.total_assets || 1;
  return Object.entries(overview.buckets as Record<string, Record<string, number | string>>).map(([key, bucket]) => {
    const amount = (bucket.amount ?? bucket.market_value ?? bucket.annual_premium ?? 0) as number;
    const pct = (bucket.pct_of_total ?? null) as number | null;
    const label = (bucket.label ?? BUCKET_LABELS[key] ?? key) as string;
    let status: "over" | "under" | "normal" = "normal";
    const benchmark = BUCKET_BENCHMARKS[key];
    if (benchmark && pct != null) {
      const [lo, hi] = benchmark.split("-").map((s) => parseFloat(s));
      if (pct > hi * 1.5) status = "over";
      else if (pct < lo) status = "under";
    }
    return { key, label, amount, pct, total, status, benchmark, isPremium: key === "insurance" };
  });
}

function getScans(data: DiagnosisResult): { id: string; scan: DiagnosisScanSection }[] {
  const diagnosis = data.diagnosis;
  if (!diagnosis) return [];
  return Object.entries(diagnosis)
    .filter(([, v]) => v && typeof v === "object" && "theory" in (v as object))
    .map(([id, v]) => ({ id, scan: v as DiagnosisScanSection }));
}

function getSupplementaryFindings(data: DiagnosisResult): { label: string; findings: DiagnosisFinding[] }[] {
  const supp = data.diagnosis?.supplementary;
  if (!supp) return [];
  const result: { label: string; findings: DiagnosisFinding[] }[] = [];
  if (supp.bucket_allocation?.findings) {
    result.push({ label: "桶间配比", findings: supp.bucket_allocation.findings });
  }
  if (supp.insurance?.findings) {
    result.push({ label: "保险覆盖", findings: supp.insurance.findings });
  }
  if (supp.platform_concentration && supp.platform_concentration.top_platform) {
    const pc = supp.platform_concentration;
    result.push({
      label: "平台集中度",
      findings: [{
        issue: `${pc.top_platform} 占比 ${pc.top_platform_pct}%`,
        severity: pc.over_70_threshold ? "high" : "info",
        detail: pc.over_70_threshold ? "单一平台超过70%阈值" : "平台分布尚可",
      }],
    });
  }
  return result;
}

function getExposureChartData(data: DiagnosisResult) {
  const geo = data.exposure_analysis?.by_geography;
  const asset = data.exposure_analysis?.by_asset_class;
  const byIndex = data.exposure_analysis?.by_index;
  return { geo, asset, byIndex };
}

// --- Sub-components ---

function FindingItem({ finding }: { finding: DiagnosisFinding }) {
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <div className={cn("flex gap-3 rounded-lg border p-3", cfg.bg, cfg.border)}>
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{finding.issue}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{finding.detail}</p>
      </div>
    </div>
  );
}

function PieChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const config = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }])
  ) satisfies ChartConfig;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <ChartContainer config={config} className="h-[200px] w-full">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
      <div className="mt-2 space-y-1">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-serif tabular-nums">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExposureBarChart({ title, data }: { title: string; data: { name: string; value: number; count?: number }[] }) {
  const config = { value: { label: "占比 %", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <ChartContainer config={config} className="h-[200px] w-full">
        <BarChart data={data} layout="vertical">
          <CartesianGrid horizontal={false} strokeOpacity={0.3} />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function AllWeatherMatrix({ scan }: { scan: DiagnosisScanSection }) {
  const scenarios = [
    { scenario: "增长+低通胀", assets: "股票", covered: (scan.scenarios_covered ?? 0) >= 1 },
    { scenario: "增长+高通胀", assets: "大宗商品", covered: false },
    { scenario: "衰退+低通胀", assets: "长期国债", covered: false },
    { scenario: "衰退+高通胀", assets: "黄金/商品", covered: false },
  ];
  // Mark covered based on findings — if a finding says "仅覆盖1/4" we know only first is covered
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">宏观象限覆盖 ({scan.scenarios_covered ?? "?"}/4)</p>
      <div className="grid grid-cols-2 gap-2">
        {scenarios.map((item) => (
          <div
            key={item.scenario}
            className={cn(
              "rounded-lg border p-3 text-center transition-colors",
              item.covered
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-muted/50 border-dashed border-muted-foreground/30"
            )}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {item.covered ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </div>
            <p className="text-xs font-medium">{item.scenario}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.assets}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoreSatelliteBar({ scan }: { scan: DiagnosisScanSection }) {
  const core = scan.core_pct ?? 0;
  const satellite = scan.satellite_pct ?? 0;
  const total = core + satellite || 1;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">核心 vs 卫星</p>
      <div className="flex h-8 rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-center text-xs font-medium text-white"
          style={{ width: `${(core / total) * 100}%`, backgroundColor: "var(--chart-1)" }}
        >
          核心 {core}%
        </div>
        <div
          className="flex items-center justify-center text-xs font-medium text-white"
          style={{ width: `${(satellite / total) * 100}%`, backgroundColor: "var(--chart-3)" }}
        >
          卫星 {satellite}%
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          <span className="text-muted-foreground">核心(宽基指数) {core}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--chart-3)" }} />
          <span className="text-muted-foreground">卫星(主题/行业) {satellite}%</span>
        </div>
      </div>
    </div>
  );
}

function EquityGauge({ data }: { data: DiagnosisResult }) {
  const scan = data.diagnosis?.scan5_lifecycle;
  if (!scan) return null;
  const current = data.family_asset_overview?.buckets?.growth?.pct_of_total ?? 0;
  const range = scan.recommended_equity_pct ?? { min: 55, max: 70 };
  const target = Math.round((range.min + range.max) / 2);
  const progressValue = Math.min((current / (target * 1.3)) * 100, 100);
  const isLow = current < range.min;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">权益配置 vs 目标</p>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={cn("text-2xl font-semibold font-serif tabular-nums", isLow ? "text-amber-500" : "text-emerald-500")}>
            {current.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">
            目标 <span className="font-serif">{range.min}-{range.max}%</span>
          </span>
        </div>
        <div className="relative">
          <Progress value={progressValue} className="h-3" />
          <div
            className="absolute top-0 h-3 w-0.5 bg-foreground/60"
            style={{ left: `${(target / (target * 1.3)) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">权益占家庭总资产</p>
      </div>
    </div>
  );
}

// --- Scan card: renders chart + findings for each theory scan ---

function ScanCard({ id, scan, data }: { id: string; scan: DiagnosisScanSection; data: DiagnosisResult }) {
  const { geo, asset, byIndex } = getExposureChartData(data);

  const renderChart = () => {
    if (id.includes("mpt")) {
      return (
        <div className="space-y-4">
          {geo && <PieChartCard title="地域分布" data={geo.map((g: { region: string; pct: number }) => ({ name: g.region, value: g.pct }))} />}
          {asset && <PieChartCard title="资产类别" data={asset.map((a: { class: string; pct: number }) => ({ name: a.class, value: a.pct }))} />}
        </div>
      );
    }
    if (id.includes("three_fund")) {
      // Build a three-fund bar from geo + asset data
      const chinaEquity = geo?.find((g: { region: string }) => g.region === "中国")?.pct ?? 0;
      const intlEquity = geo?.find((g: { region: string }) => g.region !== "中国")?.pct ?? 0;
      const bondPct = asset?.find((a: { class: string }) => a.class.includes("债券"))?.pct ?? 0;
      const barData = [
        { name: "A股宽基", value: chinaEquity },
        { name: "海外宽基", value: intlEquity },
        { name: "债券", value: bondPct },
      ];
      return <ExposureBarChart title="三基金结构" data={barData} />;
    }
    if (id.includes("all_weather")) {
      return <AllWeatherMatrix scan={scan} />;
    }
    if (id.includes("core_satellite")) {
      return <CoreSatelliteBar scan={scan} />;
    }
    if (id.includes("lifecycle")) {
      return <EquityGauge data={data} />;
    }
    // For supplementary/unknown scans — show index exposure if available
    if (byIndex) {
      return <ExposureBarChart title="指数暴露" data={byIndex.map((i: { index: string; combined_weight_pct: number; fund_count: number }) => ({ name: i.index, value: i.combined_weight_pct, count: i.fund_count }))} />;
    }
    return null;
  };

  return (
    <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{scan.theory}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>{renderChart()}</div>
          <div className="space-y-2">
            {scan.findings.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500 py-4">
                <CheckCircle2 className="h-4 w-4" />
                <span>未发现问题</span>
              </div>
            ) : (
              scan.findings.map((f, i) => <FindingItem key={i} finding={f} />)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function DiagnosisPage() {
  const [report, setReport] = useState<DiagnosisResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    diagnosisApi
      .report()
      .then(setReport)
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-[120px] rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <HeartPulse className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">尚未生成诊断报告</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          请在 Claude Code 中运行「帮我做个资产诊断」来生成报告，诊断结果将在此页面展示。
        </p>
      </div>
    );
  }

  const issues: DiagnosisIssueSummary[] = report.issues_summary ?? [];
  const recommendations: DiagnosisRecommendation[] = report.recommendations ?? [];
  const scans = getScans(report);
  const buckets = getBuckets(report);
  const supplementary = getSupplementaryFindings(report);
  const totalAssets = report.family_asset_overview?.total_assets ?? 0;
  const totalReturn = report.family_asset_overview?.total_return ?? 0;
  const totalReturnPct = report.family_asset_overview?.total_return_pct ?? 0;

  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  const infoCount = issues.filter((i) => i.severity === "info" || i.severity === "low").length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">资产诊断</h2>
          <div className="flex gap-1.5">
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                {highCount} 高
              </span>
            )}
            {mediumCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                {mediumCount} 中
              </span>
            )}
            {infoCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                {infoCount} 提醒
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {report.report_date ?? ""}
        </p>
      </div>

      {/* Total Assets Summary */}
      <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">家庭总资产</p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums font-serif">
            {formatCurrency(totalAssets)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">总收益</span>
            <span className={cn("text-sm font-medium tabular-nums font-serif", totalReturn >= 0 ? "text-red-500" : "text-green-500")}>
              {totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)}
            </span>
            <span className={cn("text-xs tabular-nums font-serif", totalReturn >= 0 ? "text-red-500" : "text-green-500")}>
              ({totalReturn >= 0 ? "+" : ""}{totalReturnPct.toFixed(2)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bucket Panorama */}
      {buckets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">四桶全景</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buckets.map((bucket) => {
              const Icon = BUCKET_ICONS[bucket.key] ?? Droplets;
              return (
                <Card
                  key={bucket.key}
                  className={cn(
                    "shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out border-t-2",
                    BUCKET_BORDER_COLORS[bucket.key] ?? ""
                  )}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{bucket.label}</span>
                      </div>
                      {bucket.benchmark && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            bucket.status === "over" && "text-red-500 bg-red-500/10 border-red-500/30",
                            bucket.status === "under" && "text-amber-500 bg-amber-500/10 border-amber-500/30",
                            bucket.status === "normal" && "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                          )}
                        >
                          {bucket.status === "over" ? "超配" : bucket.status === "under" ? "低配" : "正常"}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-semibold tracking-tight tabular-nums font-serif">
                      {formatCurrency(bucket.amount)}
                    </div>
                    {bucket.pct != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        占比 <span className="font-serif">{bucket.pct.toFixed(1)}%</span>
                        {bucket.benchmark && <span className="ml-1">（基准 {bucket.benchmark}）</span>}
                      </p>
                    )}
                    {bucket.isPremium && (
                      <p className="text-xs text-muted-foreground mt-1">年保费支出</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Five Theory Scans */}
      {scans.map(({ id, scan }) => (
        <ScanCard key={id} id={id} scan={scan} data={report} />
      ))}

      {/* Supplementary Findings */}
      {supplementary.length > 0 && (
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">补充扫描</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplementary.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.findings.map((f, i) => (
                    <FindingItem key={i} finding={f} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Issues Summary Table */}
      {issues.length > 0 && (
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">问题汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">严重程度</th>
                    <th className="text-left py-2 pr-4 font-medium">问题</th>
                    <th className="text-left py-2 pr-4 font-medium">来源</th>
                    <th className="text-left py-2 font-medium">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue, i) => {
                    const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cfg.color)}>
                            <Icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{issue.issue}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{issue.source}</td>
                        <td className="py-2.5 text-muted-foreground">{issue.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              方向性建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.approach}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t text-center">
              {report.disclaimer ?? "以上分析基于当前持仓数据，所有建议仅供参考，不构成投资意见。"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
