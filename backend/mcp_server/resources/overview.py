"""Dynamic resource: family asset overview — loaded as context when AI starts a conversation."""

import datetime

from sqlmodel import Session, select

from app.database import engine
from app.models import (
    Fund,
    FundNavHistory,
    Holding,
    InsurancePolicy,
    LiquidAsset,
    PositionBudget,
    StableAsset,
)
from app.services.allocation import get_weighted_allocation


def _fmt_money(v: float) -> str:
    return f"\u00a5{v:,.2f}"


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ""
    return f"{sign}{v:.2f}%"


def get_portfolio_overview() -> str:
    """Generate a structured overview of the user's family assets for AI context."""
    with Session(engine) as session:
        today = datetime.date.today()

        # =====================================================================
        # Gather data from all four buckets
        # =====================================================================

        # --- Liquid bucket ---
        liquid_assets = session.exec(select(LiquidAsset)).all()
        liquid_amount = sum(a.amount for a in liquid_assets)
        liquid_return = sum(
            a.amount * (a.annual_rate / 100) for a in liquid_assets if a.annual_rate
        )

        # --- Stable bucket ---
        stable_assets = session.exec(select(StableAsset)).all()
        stable_amount = sum(a.amount for a in stable_assets)
        stable_return = sum(a.amount * (a.annual_rate / 100) for a in stable_assets)

        # --- Growth bucket (fund holdings) ---
        holdings = session.exec(select(Holding)).all()
        growth_value = 0.0
        growth_cost = 0.0
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
            growth_cost += cost
            mv = h.shares * nav if nav else 0
            growth_value += mv
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

        growth_pnl = growth_value - growth_cost
        growth_pnl_pct = (growth_pnl / growth_cost * 100) if growth_cost > 0 else 0.0

        # --- Insurance bucket ---
        policies = session.exec(select(InsurancePolicy)).all()
        active_policies = [p for p in policies if p.status == "active"]
        total_premium = sum(p.annual_premium for p in active_policies)
        covered_persons = len(set(p.insured_person for p in active_policies))

        # --- Total assets (insurance excluded from asset total) ---
        total_assets = liquid_amount + stable_amount + growth_value

        # =====================================================================
        # Section 1: Family asset summary (top-level)
        # =====================================================================
        lines = [
            "## 家庭资产总览\n",
            f"- 家庭总资产: {_fmt_money(total_assets)}",
        ]

        bucket_parts = []
        if liquid_amount > 0:
            ratio = liquid_amount / total_assets * 100 if total_assets else 0
            bucket_parts.append(f"活钱 {_fmt_money(liquid_amount)}({ratio:.0f}%)")
        if stable_amount > 0:
            ratio = stable_amount / total_assets * 100 if total_assets else 0
            bucket_parts.append(f"稳钱 {_fmt_money(stable_amount)}({ratio:.0f}%)")
        if growth_value > 0:
            ratio = growth_value / total_assets * 100 if total_assets else 0
            bucket_parts.append(f"长钱 {_fmt_money(growth_value)}({ratio:.0f}%)")
        if bucket_parts:
            lines.append(f"- 四桶配置: {' | '.join(bucket_parts)}")

        if active_policies:
            lines.append(
                f"- 保险保障: {len(active_policies)} 份生效保单 | "
                f"年保费 {_fmt_money(total_premium)} | 覆盖 {covered_persons} 人"
            )

        # =====================================================================
        # Section 2: Active reminders
        # =====================================================================
        reminders: list[str] = []

        for a in stable_assets:
            if a.maturity_date:
                days = (a.maturity_date - today).days
                if days < 0:
                    reminders.append(f"{a.name} 已到期{-days}天，请及时处理")
                elif days <= 30:
                    reminders.append(f"{a.name} 还有{days}天到期")

        for p in active_policies:
            if p.next_payment_date:
                days = (p.next_payment_date - today).days
                if days < 0:
                    reminders.append(f"{p.name}({p.insured_person}) 保费已逾期{-days}天")
                elif days <= 30:
                    reminders.append(f"{p.name}({p.insured_person}) 还有{days}天续费")

        if reminders:
            lines.append("\n### 待办提醒\n")
            for r in reminders:
                lines.append(f"- {r}")

        # =====================================================================
        # Section 3: Liquid assets summary
        # =====================================================================
        if liquid_assets:
            type_labels = {"deposit": "活期存款", "money_fund": "货币基金"}
            lines.append("\n## 活钱明细\n")
            lines.append("| 名称 | 类型 | 平台 | 金额 | 年化利率 |")
            lines.append("|------|------|------|------|---------|")
            for a in liquid_assets:
                rate_str = f"{a.annual_rate:.2f}%" if a.annual_rate else "N/A"
                lines.append(
                    f"| {a.name} | {type_labels.get(a.type, a.type)} | "
                    f"{a.platform or '-'} | {_fmt_money(a.amount)} | {rate_str} |"
                )
            lines.append(
                f"\n活钱合计: {_fmt_money(liquid_amount)} | "
                f"预估年收益 {_fmt_money(liquid_return)}"
            )

        # =====================================================================
        # Section 4: Stable assets summary
        # =====================================================================
        if stable_assets:
            type_labels_stable = {"term_deposit": "定期存款", "bank_product": "银行理财"}
            lines.append("\n## 稳钱明细\n")
            lines.append("| 名称 | 类型 | 平台 | 金额 | 年化利率 | 到期日 |")
            lines.append("|------|------|------|------|---------|--------|")
            for a in stable_assets:
                maturity_str = str(a.maturity_date) if a.maturity_date else "N/A"
                if a.maturity_date:
                    days = (a.maturity_date - today).days
                    if 0 <= days <= 30:
                        maturity_str = f"{a.maturity_date} ({days}天后到期)"
                    elif days < 0:
                        maturity_str = f"{a.maturity_date} (已到期)"
                lines.append(
                    f"| {a.name} | {type_labels_stable.get(a.type, a.type)} | "
                    f"{a.platform or '-'} | {_fmt_money(a.amount)} | "
                    f"{a.annual_rate:.2f}% | {maturity_str} |"
                )
            lines.append(
                f"\n稳钱合计: {_fmt_money(stable_amount)} | "
                f"预估年收益 {_fmt_money(stable_return)}"
            )

        # =====================================================================
        # Section 5: Growth bucket — fund portfolio detail (existing logic)
        # =====================================================================
        if holdings:
            fund_count = len(set(h.fund_code for h in holdings))
            platforms = sorted(set(h.platform for h in holdings))

            lines.append("\n## 长钱 — 基金组合概况\n")
            lines.append(
                f"- 总市值: {_fmt_money(growth_value)} | 总成本: {_fmt_money(growth_cost)} | "
                f"盈亏: {_fmt_money(growth_pnl)} ({_fmt_pct(growth_pnl_pct)})"
            )
            lines.append(
                f"- 持有 {fund_count} 只基金，分布在 {len(platforms)} 个平台（{', '.join(platforms)}）"
            )

            # Position status
            budget = session.exec(select(PositionBudget).limit(1)).first()
            if budget and budget.total_budget > 0:
                position_ratio = growth_value / budget.total_budget * 100
                available_cash = max(budget.total_budget - growth_value, 0)
                lines.append(
                    f"- 仓位: {position_ratio:.1f}% "
                    f"(目标区间: {budget.target_position_min:.0f}%-{budget.target_position_max:.0f}%) "
                    f"| 可用现金: {_fmt_money(available_cash)}"
                )

            # Holdings table
            lines.append("\n### 持仓明细\n")
            lines.append("| 基金 | 类型 | 平台 | 市值 | 盈亏 |")
            lines.append("|------|------|------|------|------|")
            for d in sorted(holding_details, key=lambda x: -x["market_value"]):
                lines.append(
                    f"| {d['fund_name']}({d['fund_code']}) | {d['fund_type']} | "
                    f"{d['platform']} | {_fmt_money(d['market_value'])} | "
                    f"{_fmt_pct(d['pnl_pct'])} |"
                )

            # Asset allocation summary
            for dim, label in [("asset_class", "资产类别"), ("sector", "行业"), ("geography", "地域")]:
                result = get_weighted_allocation(dim, session)
                items = result["items"]
                if items:
                    top_items = items[:5]
                    summary = ", ".join(f"{i['category']} {i['percentage']:.0f}%" for i in top_items)
                    if len(items) > 5:
                        summary += f" 等{len(items)}项"
                    lines.append(f"- {label}: {summary}")
        else:
            lines.append("\n## 长钱 — 基金组合\n")
            lines.append("当前没有基金持仓记录。")

        # =====================================================================
        # Section 6: Insurance summary
        # =====================================================================
        if policies:
            type_labels_ins = {
                "critical_illness": "重疾险",
                "medical": "医疗险",
                "accident": "意外险",
                "life": "寿险",
            }
            groups: dict[str, list] = {}
            for p in policies:
                groups.setdefault(p.insured_person, []).append(p)

            lines.append("\n## 保险保障概况\n")
            for person, person_policies in groups.items():
                active_for_person = [pp for pp in person_policies if pp.status == "active"]
                if active_for_person:
                    items_str = ", ".join(
                        type_labels_ins.get(pp.type, pp.type) for pp in active_for_person
                    )
                    premium_for_person = sum(pp.annual_premium for pp in active_for_person)
                    lines.append(
                        f"- {person}: {items_str} | 年保费 {_fmt_money(premium_for_person)}"
                    )

        return "\n".join(lines)
