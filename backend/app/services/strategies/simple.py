from sqlmodel import Session

from app.services.strategies.base import PortfolioContext, StrategyResult, SuggestionItem


class SimpleStrategy:
    name = "simple"
    display_name = "简单仓位策略"
    description = "根据目标仓位区间判断是否需要加仓或减仓，不推荐具体基金。"
    config_schema: dict = {}

    def evaluate(self, context: PortfolioContext, session: Session) -> StrategyResult:
        ratio = context.position_ratio
        lo = context.target_position_min
        hi = context.target_position_max
        budget = context.total_budget
        suggestions: list[SuggestionItem] = []

        if budget <= 0:
            return StrategyResult(
                strategy_name=self.name,
                summary="尚未设置投资预算，请先设置预算。",
            )

        if ratio < lo:
            target_value = budget * lo / 100
            gap = target_value - context.total_value
            return StrategyResult(
                strategy_name=self.name,
                summary=f"当前仓位 {ratio:.1f}% 低于下限 {lo:.1f}%，建议加仓约 ¥{gap:,.2f}。",
                suggestions=suggestions,
                metadata={"action": "buy", "gap": round(gap, 2)},
            )

        if ratio > hi:
            target_value = budget * hi / 100
            excess = context.total_value - target_value
            return StrategyResult(
                strategy_name=self.name,
                summary=f"当前仓位 {ratio:.1f}% 高于上限 {hi:.1f}%，建议减仓约 ¥{excess:,.2f}。",
                suggestions=suggestions,
                metadata={"action": "sell", "excess": round(excess, 2)},
            )

        return StrategyResult(
            strategy_name=self.name,
            summary=f"当前仓位 {ratio:.1f}%，处于目标区间 [{lo:.1f}%, {hi:.1f}%] 内，无需调仓。",
            metadata={"action": "hold"},
        )
