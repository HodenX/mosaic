"""Position & strategy MCP tools — budget, position ratio, and strategy suggestions."""

from sqlmodel import Session

from app.database import engine
from app.services.position import build_portfolio_context, get_or_create_budget, run_strategy


def _fmt_money(v: float) -> str:
    return f"¥{v:,.2f}"


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ""
    return f"{sign}{v:.2f}%"


def get_position_status() -> str:
    """获取当前仓位管理状态：总预算、仓位比例、目标区间、可用现金。"""
    with Session(engine) as session:
        budget = get_or_create_budget(session)
        ctx = build_portfolio_context(budget, session)

    lines = [
        "## 仓位管理状态\n",
        "| 指标 | 数值 |",
        "|------|------|",
        f"| 总预算 | {_fmt_money(ctx.total_budget)} |",
        f"| 当前市值 | {_fmt_money(ctx.total_value)} |",
        f"| 总成本 | {_fmt_money(ctx.total_cost)} |",
        f"| 可用现金 | {_fmt_money(ctx.available_cash)} |",
        f"| 仓位比例 | {ctx.position_ratio:.1f}% |",
        f"| 目标区间 | {ctx.target_position_min:.0f}% - {ctx.target_position_max:.0f}% |",
    ]

    # Position status assessment
    if ctx.total_budget > 0:
        if ctx.position_ratio < ctx.target_position_min:
            lines.append(f"\n**状态**: 仓位偏低，低于目标下限 {ctx.target_position_min:.0f}%")
        elif ctx.position_ratio > ctx.target_position_max:
            lines.append(f"\n**状态**: 仓位偏高，高于目标上限 {ctx.target_position_max:.0f}%")
        else:
            lines.append(f"\n**状态**: 仓位在目标区间内")

    # Per-holding breakdown
    if ctx.holdings:
        lines.append("\n### 持仓权重")
        lines.append("| 基金 | 市值 | 占比 |")
        lines.append("|------|------|------|")
        for h in sorted(ctx.holdings, key=lambda x: -x["weight"]):
            lines.append(
                f"| {h['fund_name']} ({h['fund_code']}) | "
                f"{_fmt_money(h['market_value'])} | {h['weight']:.1f}% |"
            )

    return "\n".join(lines)


def get_strategy_suggestion() -> str:
    """执行当前激活的投资策略，获取买入/卖出/持有建议。"""
    with Session(engine) as session:
        result = run_strategy(session)

    if result is None:
        return "没有可用的策略，请先在仓位管理中配置策略。"

    lines = [
        f"## 策略建议 — {result.strategy_name}\n",
        f"**概要**: {result.summary}\n",
    ]

    if result.suggestions:
        lines.append("| 基金 | 操作 | 金额 | 原因 |")
        lines.append("|------|------|------|------|")
        for s in result.suggestions:
            action_label = {"buy": "买入", "sell": "卖出", "hold": "持有"}.get(s.action, s.action)
            lines.append(
                f"| {s.fund_name} ({s.fund_code}) | {action_label} | "
                f"{_fmt_money(s.amount)} | {s.reason} |"
            )

    if result.metadata:
        lines.append("\n### 策略详情")
        for k, v in result.metadata.items():
            lines.append(f"- **{k}**: {v}")

    return "\n".join(lines)
