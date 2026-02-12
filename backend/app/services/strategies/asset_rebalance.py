import calendar
import datetime

from sqlmodel import Session

from app.models import Fund
from app.services.strategies.base import PortfolioContext, StrategyResult, SuggestionItem

DEFAULT_CONFIG = {
    "targets": {
        "equity": {"target": 70, "min": 65, "max": 75},
        "bond": {"target": 10, "min": 8, "max": 12},
        "gold": {"target": 20, "min": 16, "max": 24},
    },
    "execution_window_days": 5,
    "min_position_for_rebalance": 80,
}

ASSET_CLASS_LABELS = {
    "equity": "权益",
    "bond": "债券",
    "gold": "黄金",
}


def classify_fund(fund_type: str) -> str:
    """Classify a fund into equity/bond/gold based on its fund_type string."""
    ft = fund_type.lower()
    if "债" in ft:
        return "bond"
    if "黄金" in ft or "贵金属" in ft:
        return "gold"
    return "equity"


def _in_execution_window(today: datetime.date, window_days: int) -> bool:
    """Check if today is within the last N days of the month."""
    last_day = calendar.monthrange(today.year, today.month)[1]
    return today.day > last_day - window_days


class AssetRebalanceStrategy:
    name = "asset_rebalance"
    display_name = "资产再平衡策略"
    description = (
        "按权益/债券/黄金三类资产设定目标比例，"
        "当偏离触发阈值时在每月末执行窗口内给出再平衡建议。"
    )
    config_schema: dict = {
        "type": "object",
        "properties": {
            "targets": {
                "type": "object",
                "description": "各资产类别的目标与阈值",
                "properties": {
                    "equity": {
                        "type": "object",
                        "properties": {
                            "target": {"type": "number", "description": "权益目标占比%"},
                            "min": {"type": "number", "description": "权益下限%"},
                            "max": {"type": "number", "description": "权益上限%"},
                        },
                    },
                    "bond": {
                        "type": "object",
                        "properties": {
                            "target": {"type": "number", "description": "债券目标占比%"},
                            "min": {"type": "number", "description": "债券下限%"},
                            "max": {"type": "number", "description": "债券上限%"},
                        },
                    },
                    "gold": {
                        "type": "object",
                        "properties": {
                            "target": {"type": "number", "description": "黄金目标占比%"},
                            "min": {"type": "number", "description": "黄金下限%"},
                            "max": {"type": "number", "description": "黄金上限%"},
                        },
                    },
                },
            },
            "execution_window_days": {
                "type": "integer",
                "description": "每月末执行窗口天数",
            },
            "min_position_for_rebalance": {
                "type": "number",
                "description": "触发再平衡的最低仓位%，低于此值优先补仓",
            },
        },
    }

    def evaluate(self, context: PortfolioContext, session: Session) -> StrategyResult:
        budget = context.total_budget
        if budget <= 0:
            return StrategyResult(
                strategy_name=self.name,
                summary="尚未设置投资预算，请先设置预算。",
            )

        # Merge user config with defaults
        cfg = {**DEFAULT_CONFIG, **context.strategy_config}
        if "targets" in context.strategy_config:
            cfg["targets"] = {**DEFAULT_CONFIG["targets"], **context.strategy_config["targets"]}
        targets = cfg["targets"]
        window_days = cfg.get("execution_window_days", 5)
        min_position = cfg.get("min_position_for_rebalance", 80)

        # --- Classify holdings and compute per-class market value ---
        class_values: dict[str, float] = {"equity": 0.0, "bond": 0.0, "gold": 0.0}
        for h in context.holdings:
            fund = session.get(Fund, h["fund_code"])
            fund_type = fund.fund_type if fund else ""
            cls = classify_fund(fund_type)
            class_values[cls] += h.get("market_value", 0.0)

        total_value = sum(class_values.values())

        # --- Compute actual ratios ---
        class_ratios: dict[str, float] = {}
        for cls in class_values:
            class_ratios[cls] = (class_values[cls] / total_value * 100) if total_value > 0 else 0.0

        # --- If position is below threshold, skip rebalance and suggest filling position ---
        if context.position_ratio < min_position:
            target_value = budget * min_position / 100
            gap = target_value - context.total_value
            return StrategyResult(
                strategy_name=self.name,
                summary=(
                    f"当前仓位 {context.position_ratio:.1f}% 低于再平衡最低仓位要求 {min_position:.0f}%，"
                    f"优先补充仓位至 {min_position:.0f}% 以上（约需买入 ¥{gap:,.2f}），"
                    f"达标后再执行资产再平衡。"
                ),
                suggestions=[SuggestionItem(
                    fund_code="",
                    fund_name="补充仓位",
                    action="buy",
                    amount=round(gap, 2),
                    reason=f"仓位 {context.position_ratio:.1f}% 不足 {min_position:.0f}%，建议先补仓",
                )],
                metadata={
                    "action": "fill_position",
                    "position_ratio": round(context.position_ratio, 2),
                    "min_position_for_rebalance": min_position,
                    "gap": round(gap, 2),
                    "class_ratios": {k: round(v, 2) for k, v in class_ratios.items()},
                    "class_values": {k: round(v, 2) for k, v in class_values.items()},
                },
            )

        # --- Build status lines ---
        status_lines = []
        for cls in ("equity", "bond", "gold"):
            label = ASSET_CLASS_LABELS[cls]
            t = targets[cls]
            ratio = class_ratios[cls]
            status_lines.append(
                f"{label}：当前 {ratio:.1f}%（目标 {t['target']}%，区间 {t['min']}%-{t['max']}%）"
            )

        # --- Check execution window ---
        today = datetime.date.today()
        in_window = _in_execution_window(today, window_days)

        if not in_window:
            last_day = calendar.monthrange(today.year, today.month)[1]
            window_start = last_day - window_days + 1
            summary = (
                f"当前非执行窗口（本月执行窗口：{today.month}月{window_start}日-{last_day}日）。\n"
                + "\n".join(status_lines)
            )
            return StrategyResult(
                strategy_name=self.name,
                summary=summary,
                metadata={
                    "action": "hold",
                    "in_window": False,
                    "class_ratios": {k: round(v, 2) for k, v in class_ratios.items()},
                    "class_values": {k: round(v, 2) for k, v in class_values.items()},
                },
            )

        # --- In execution window: check for rebalance triggers ---
        suggestions: list[SuggestionItem] = []
        triggered_classes: list[str] = []

        for cls in ("equity", "bond", "gold"):
            label = ASSET_CLASS_LABELS[cls]
            t = targets[cls]
            ratio = class_ratios[cls]

            if ratio < t["min"]:
                target_value = total_value * t["target"] / 100
                gap = target_value - class_values[cls]
                triggered_classes.append(label)
                suggestions.append(SuggestionItem(
                    fund_code=cls,
                    fund_name=f"{label}类资产",
                    action="buy",
                    amount=round(gap, 2),
                    reason=f"{label}占比 {ratio:.1f}% 低于下限 {t['min']}%，建议买入约 ¥{gap:,.2f} 至目标 {t['target']}%",
                ))
            elif ratio > t["max"]:
                target_value = total_value * t["target"] / 100
                excess = class_values[cls] - target_value
                triggered_classes.append(label)
                suggestions.append(SuggestionItem(
                    fund_code=cls,
                    fund_name=f"{label}类资产",
                    action="sell",
                    amount=round(excess, 2),
                    reason=f"{label}占比 {ratio:.1f}% 高于上限 {t['max']}%，建议卖出约 ¥{excess:,.2f} 至目标 {t['target']}%",
                ))

        if suggestions:
            summary = (
                f"执行窗口内，以下资产类别触发再平衡：{'、'.join(triggered_classes)}。\n"
                + "\n".join(status_lines)
            )
        else:
            summary = "执行窗口内，各资产类别均在目标区间内，无需调仓。\n" + "\n".join(status_lines)

        return StrategyResult(
            strategy_name=self.name,
            summary=summary,
            suggestions=suggestions,
            metadata={
                "action": "rebalance" if suggestions else "hold",
                "in_window": True,
                "class_ratios": {k: round(v, 2) for k, v in class_ratios.items()},
                "class_values": {k: round(v, 2) for k, v in class_values.items()},
            },
        )
