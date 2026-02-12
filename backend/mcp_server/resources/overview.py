"""Dynamic resource: portfolio overview — loaded as context when AI starts a conversation."""

from sqlmodel import Session, select

from app.database import engine
from app.models import Fund, FundNavHistory, Holding, PositionBudget
from app.services.allocation import get_weighted_allocation


def _fmt_money(v: float) -> str:
    return f"¥{v:,.2f}"


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ""
    return f"{sign}{v:.2f}%"


def get_portfolio_overview() -> str:
    """Generate a structured overview of the user's portfolio for AI context."""
    with Session(engine) as session:
        holdings = session.exec(select(Holding)).all()

        if not holdings:
            return "当前没有任何基金持仓记录。请先在 FolioPal 聚宝中添加持仓。"

        # --- Portfolio summary ---
        total_value = 0.0
        total_cost = 0.0
        holding_details = []

        for h in holdings:
            fund = session.get(Fund, h.fund_code)
            fund_name = fund.fund_name if fund else h.fund_code

            nav_record = session.exec(
                select(FundNavHistory)
                .where(FundNavHistory.fund_code == h.fund_code)
                .order_by(FundNavHistory.date.desc())
                .limit(1)
            ).first()

            nav = nav_record.nav if nav_record else None
            cost = h.shares * h.cost_price
            total_cost += cost
            mv = h.shares * nav if nav else 0
            total_value += mv
            pnl = mv - cost if nav else 0
            pnl_pct = (pnl / cost * 100) if cost else 0

            holding_details.append({
                "fund_code": h.fund_code,
                "fund_name": fund_name,
                "fund_type": fund.fund_type if fund else "",
                "platform": h.platform,
                "shares": h.shares,
                "cost": cost,
                "market_value": mv,
                "pnl": pnl,
                "pnl_pct": pnl_pct,
            })

        total_pnl = total_value - total_cost
        pnl_pct = (total_pnl / total_cost * 100) if total_cost else 0
        fund_count = len(set(h.fund_code for h in holdings))
        platforms = sorted(set(h.platform for h in holdings))

        lines = [
            "## 我的基金组合概况\n",
            f"- 总市值: {_fmt_money(total_value)} | 总成本: {_fmt_money(total_cost)} | "
            f"盈亏: {_fmt_money(total_pnl)} ({_fmt_pct(pnl_pct)})",
            f"- 持有 {fund_count} 只基金，分布在 {len(platforms)} 个平台（{', '.join(platforms)}）",
        ]

        # --- Position status ---
        budget = session.exec(select(PositionBudget).limit(1)).first()
        if budget and budget.total_budget > 0:
            position_ratio = total_value / budget.total_budget * 100
            available_cash = max(budget.total_budget - total_value, 0)
            lines.append(
                f"- 仓位: {position_ratio:.1f}% "
                f"(目标区间: {budget.target_position_min:.0f}%-{budget.target_position_max:.0f}%) "
                f"| 可用现金: {_fmt_money(available_cash)}"
            )

        # --- Holdings table ---
        lines.append("\n## 持仓明细\n")
        lines.append("| 基金 | 类型 | 平台 | 市值 | 盈亏 |")
        lines.append("|------|------|------|------|------|")
        for d in sorted(holding_details, key=lambda x: -x["market_value"]):
            lines.append(
                f"| {d['fund_name']}({d['fund_code']}) | {d['fund_type']} | "
                f"{d['platform']} | {_fmt_money(d['market_value'])} | "
                f"{_fmt_pct(d['pnl_pct'])} |"
            )

        # --- Asset allocation summary ---
        for dim, label in [("asset_class", "资产类别"), ("sector", "行业"), ("geography", "地域")]:
            result = get_weighted_allocation(dim, session)
            items = result["items"]
            if items:
                top_items = items[:5]
                summary = ", ".join(f"{i['category']} {i['percentage']:.0f}%" for i in top_items)
                if len(items) > 5:
                    summary += f" 等{len(items)}项"
                lines.append(f"- {label}: {summary}")

        return "\n".join(lines)
