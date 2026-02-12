import { Card, CardContent } from "@/components/ui/card";
import PositionGauge from "@/components/PositionGauge";
import BudgetSettingDialog from "@/components/BudgetSettingDialog";
import { Button } from "@/components/ui/button";
import type { PortfolioSummary, PositionStatus } from "@/types";

interface Props {
  summary: PortfolioSummary;
  position: PositionStatus | null;
  onPositionUpdated: (status: PositionStatus) => void;
}

export default function SummaryCards({ summary, position, onPositionUpdated }: Props) {
  const isProfit = summary.total_pnl >= 0;
  const pnlColor = isProfit ? "text-red-500" : "text-green-500";
  const pnlBorder = isProfit ? "border-t-red-400" : "border-t-green-400";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总市值</p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            ¥{summary.total_value.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-t-2 border-t-muted-foreground/20 transition-shadow duration-200 hover:shadow-md">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总成本</p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            ¥{summary.total_cost.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      <Card className={`shadow-sm border-t-2 ${pnlBorder} transition-shadow duration-200 hover:shadow-md`}>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总盈亏</p>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${pnlColor}`}>
            {isProfit ? "+" : ""}¥{summary.total_pnl.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      <Card className={`shadow-sm border-t-2 ${pnlBorder} transition-shadow duration-200 hover:shadow-md`}>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">收益率</p>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${pnlColor}`}>
            {isProfit ? "+" : ""}{summary.pnl_percent.toFixed(2)}%
          </div>
        </CardContent>
      </Card>

      {/* Position gauge card */}
      {position && position.total_budget > 0 ? (
        <Card className={`col-span-2 lg:col-span-4 shadow-sm border-l-3 ${
          position.is_below_min ? "border-l-yellow-400" :
          position.is_above_max ? "border-l-red-400" : "border-l-primary"
        }`}>
          <CardContent className="flex items-center gap-6 py-4">
            <div className="shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">仓位</span>
                <BudgetSettingDialog current={position} onUpdated={onPositionUpdated} />
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {position.position_ratio.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                已投 ¥{position.total_value.toLocaleString()} / 预算 ¥{position.total_budget.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <PositionGauge
                ratio={position.position_ratio}
                min={position.target_position_min}
                max={position.target_position_max}
              />
            </div>
          </CardContent>
        </Card>
      ) : position ? (
        <Card className="col-span-2 lg:col-span-4 shadow-sm">
          <CardContent className="flex items-center justify-center py-4">
            <BudgetSettingDialog
              current={position}
              onUpdated={onPositionUpdated}
              trigger={<Button variant="outline" size="sm">设置预算</Button>}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
