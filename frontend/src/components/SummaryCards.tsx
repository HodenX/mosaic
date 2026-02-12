import { Card, CardContent } from "@/components/ui/card";
import BudgetSettingDialog from "@/components/BudgetSettingDialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
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

  // Position status color
  const posColor = position
    ? position.is_above_max ? "border-t-red-400"
    : position.is_below_min ? "border-t-yellow-400"
    : "border-t-emerald-500"
    : "border-t-primary";
  const posTextColor = position
    ? position.is_above_max ? "text-red-500"
    : position.is_below_min ? "text-yellow-600"
    : "text-emerald-600"
    : "";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Hero: Total PnL */}
      <Card className={`shadow-sm border-t-2 ${pnlBorder} transition-shadow duration-200 hover:shadow-md`}>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总盈亏</p>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${pnlColor}`}>
            {isProfit ? "+" : ""}{formatCurrency(summary.total_pnl)}
          </div>
        </CardContent>
      </Card>

      {/* Hero: Return % */}
      <Card className={`shadow-sm border-t-2 ${pnlBorder} transition-shadow duration-200 hover:shadow-md`}>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">收益率</p>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${pnlColor}`}>
            {isProfit ? "+" : ""}{summary.pnl_percent.toFixed(2)}%
          </div>
        </CardContent>
      </Card>

      {/* Secondary: Market Value */}
      <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-medium text-muted-foreground tracking-wide mb-1">总市值</p>
          <div className="text-lg font-semibold tracking-tight tabular-nums text-muted-foreground">
            {formatCurrency(summary.total_value)}
          </div>
        </CardContent>
      </Card>

      {/* Secondary: Position ratio */}
      {position && position.total_budget > 0 ? (
        <Card className={`shadow-sm border-t-2 ${posColor} transition-shadow duration-200 hover:shadow-md`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground tracking-wide">仓位</p>
              <BudgetSettingDialog
                current={position}
                onUpdated={onPositionUpdated}
                trigger={
                  <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary -mr-2 h-5 text-[11px]">
                    设置
                  </Button>
                }
              />
            </div>
            <div className={`text-lg font-semibold tracking-tight tabular-nums ${posTextColor}`}>
              {position.position_ratio.toFixed(1)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              {position.target_position_min}%-{position.target_position_max}%
              {position.is_below_min && " · 低于下限"}
              {position.is_above_max && " · 高于上限"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-t-2 border-t-primary transition-shadow duration-200 hover:shadow-md">
          <CardContent className="pt-5 pb-4 flex flex-col items-center justify-center h-full">
            <BudgetSettingDialog
              current={position}
              onUpdated={onPositionUpdated}
              trigger={<Button variant="outline" size="sm">设置预算</Button>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
