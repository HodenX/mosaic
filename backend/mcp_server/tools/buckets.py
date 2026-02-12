"""Bucket-level MCP tools — query liquid, stable, insurance, and family asset summary."""

import datetime

from sqlmodel import Session, select

from app.database import engine
from app.models import (
    FundNavHistory,
    Holding,
    InsurancePolicy,
    LiquidAsset,
    StableAsset,
)


def _fmt_money(v: float) -> str:
    return f"\u00a5{v:,.2f}"


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ""
    return f"{sign}{v:.2f}%"


def get_liquid_assets() -> str:
    """获取活钱(短期流动资金)持仓明细,含活期存款和货币基金。"""
    with Session(engine) as session:
        assets = session.exec(select(LiquidAsset)).all()

        if not assets:
            return "当前没有活钱(短期流动资金)记录。"

        lines = [
            "## 活钱持仓明细\n",
            "| 名称 | 类型 | 平台 | 金额 | 年化利率 |",
            "|------|------|------|------|---------|",
        ]

        type_labels = {"deposit": "活期存款", "money_fund": "货币基金"}
        total_amount = 0.0
        total_return = 0.0

        for a in assets:
            total_amount += a.amount
            annual_return = a.amount * (a.annual_rate / 100) if a.annual_rate else 0.0
            total_return += annual_return
            rate_str = f"{a.annual_rate:.2f}%" if a.annual_rate else "N/A"
            lines.append(
                f"| {a.name} | {type_labels.get(a.type, a.type)} | "
                f"{a.platform or '-'} | {_fmt_money(a.amount)} | {rate_str} |"
            )

        lines.append(
            f"\n**合计**: {len(assets)} 笔 | 总金额 {_fmt_money(total_amount)} | "
            f"预估年收益 {_fmt_money(total_return)}"
        )

        return "\n".join(lines)


def get_stable_assets() -> str:
    """获取稳钱(中期保值)持仓明细,含定期存款和银行理财。"""
    with Session(engine) as session:
        assets = session.exec(select(StableAsset)).all()

        if not assets:
            return "当前没有稳钱(中期保值)记录。"

        today = datetime.date.today()

        lines = [
            "## 稳钱持仓明细\n",
            "| 名称 | 类型 | 平台 | 金额 | 年化利率 | 起息日 | 到期日 |",
            "|------|------|------|------|---------|--------|--------|",
        ]

        type_labels = {"term_deposit": "定期存款", "bank_product": "银行理财"}
        total_amount = 0.0
        total_return = 0.0

        for a in assets:
            total_amount += a.amount
            annual_return = a.amount * (a.annual_rate / 100)
            total_return += annual_return

            # Highlight maturity within 30 days
            maturity_str = str(a.maturity_date) if a.maturity_date else "N/A"
            if a.maturity_date:
                days_to_maturity = (a.maturity_date - today).days
                if 0 <= days_to_maturity <= 30:
                    maturity_str = f"\u26a0\ufe0f {a.maturity_date} ({days_to_maturity}天)"
                elif days_to_maturity < 0:
                    maturity_str = f"\u26a0\ufe0f {a.maturity_date} (已到期)"

            lines.append(
                f"| {a.name} | {type_labels.get(a.type, a.type)} | "
                f"{a.platform or '-'} | {_fmt_money(a.amount)} | {a.annual_rate:.2f}% | "
                f"{a.start_date or 'N/A'} | {maturity_str} |"
            )

        lines.append(
            f"\n**合计**: {len(assets)} 笔 | 总金额 {_fmt_money(total_amount)} | "
            f"预估年收益 {_fmt_money(total_return)}"
        )

        return "\n".join(lines)


def get_insurance_policies() -> str:
    """获取保险保单明细,按被保人分组,含保障和续费信息。"""
    with Session(engine) as session:
        policies = session.exec(select(InsurancePolicy)).all()

        if not policies:
            return "当前没有保险保单记录。"

        today = datetime.date.today()

        # Group by insured_person
        groups: dict[str, list[InsurancePolicy]] = {}
        for p in policies:
            groups.setdefault(p.insured_person, []).append(p)

        type_labels = {
            "critical_illness": "重疾险",
            "medical": "医疗险",
            "accident": "意外险",
            "life": "寿险",
        }

        active_count = 0
        total_premium = 0.0
        lines = ["## 保险保单明细\n"]

        for person, person_policies in groups.items():
            lines.append(f"### {person}\n")
            lines.append(
                "| 保单名称 | 险种 | 保险公司 | 保额 | 年保费 | 状态 | 下次缴费日 |"
            )
            lines.append(
                "|---------|------|---------|------|--------|------|-----------|"
            )

            for p in person_policies:
                if p.status == "active":
                    active_count += 1
                    total_premium += p.annual_premium

                coverage_str = _fmt_money(p.coverage_amount) if p.coverage_amount else "N/A"
                status_labels = {"active": "生效中", "expired": "已过期", "lapsed": "已失效"}
                status_str = status_labels.get(p.status, p.status)

                # Highlight upcoming renewal within 30 days
                payment_str = str(p.next_payment_date) if p.next_payment_date else "N/A"
                if p.next_payment_date:
                    days_to_renewal = (p.next_payment_date - today).days
                    if 0 <= days_to_renewal <= 30:
                        payment_str = f"\u26a0\ufe0f {p.next_payment_date} ({days_to_renewal}天)"
                    elif days_to_renewal < 0:
                        payment_str = f"\u26a0\ufe0f {p.next_payment_date} (已逾期)"

                lines.append(
                    f"| {p.name} | {type_labels.get(p.type, p.type)} | "
                    f"{p.insurer or '-'} | {coverage_str} | "
                    f"{_fmt_money(p.annual_premium)} | {status_str} | {payment_str} |"
                )

            lines.append("")

        covered_persons = len(groups)
        lines.append(
            f"**合计**: {active_count} 份生效保单 | "
            f"年总保费 {_fmt_money(total_premium)} | "
            f"覆盖 {covered_persons} 人"
        )

        return "\n".join(lines)


def get_family_asset_summary() -> str:
    """获取家庭资产四桶总览:活钱、稳钱、长钱和保险的汇总数据。"""
    with Session(engine) as session:
        today = datetime.date.today()

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

        # --- Growth bucket (funds) ---
        holdings = session.exec(select(Holding)).all()
        growth_value = 0.0
        growth_cost = 0.0
        for h in holdings:
            nav_row = session.exec(
                select(FundNavHistory)
                .where(FundNavHistory.fund_code == h.fund_code)
                .order_by(FundNavHistory.date.desc())
                .limit(1)
            ).first()
            nav = nav_row.nav if nav_row else None
            if nav is not None:
                growth_value += h.shares * nav
            growth_cost += h.shares * h.cost_price
        growth_pnl = growth_value - growth_cost
        growth_pnl_pct = (growth_pnl / growth_cost * 100) if growth_cost > 0 else 0.0

        # --- Insurance bucket ---
        policies = session.exec(select(InsurancePolicy)).all()
        active_policies = [p for p in policies if p.status == "active"]
        total_premium = sum(p.annual_premium for p in active_policies)
        covered_persons = len(set(p.insured_person for p in active_policies))

        # --- Totals (insurance excluded from asset total) ---
        total_assets = liquid_amount + stable_amount + growth_value
        total_cost_base = liquid_amount + stable_amount + growth_cost
        total_return = liquid_return + stable_return + growth_pnl
        total_return_pct = (total_return / total_cost_base * 100) if total_cost_base > 0 else 0.0

        lines = [
            "## 家庭资产四桶总览\n",
            "| 指标 | 数值 |",
            "|------|------|",
            f"| 家庭总资产 | {_fmt_money(total_assets)} |",
            f"| 综合收益 | {_fmt_money(total_return)} ({_fmt_pct(total_return_pct)}) |",
            "",
            "### 各桶明细\n",
            "| 桶 | 金额/市值 | 收益/盈亏 | 数量 |",
            "|------|---------|---------|------|",
            f"| 活钱 | {_fmt_money(liquid_amount)} | 预估年收益 {_fmt_money(liquid_return)} | {len(liquid_assets)} 笔 |",
            f"| 稳钱 | {_fmt_money(stable_amount)} | 预估年收益 {_fmt_money(stable_return)} | {len(stable_assets)} 笔 |",
            f"| 长钱 | {_fmt_money(growth_value)} | 盈亏 {_fmt_money(growth_pnl)} ({_fmt_pct(growth_pnl_pct)}) | {len(holdings)} 笔 |",
            f"| 保险 | 年保费 {_fmt_money(total_premium)} | {len(active_policies)} 份生效 | 覆盖 {covered_persons} 人 |",
        ]

        # --- Active reminders ---
        reminders: list[str] = []

        # Stable maturity within 30 days
        for a in stable_assets:
            if a.maturity_date:
                days = (a.maturity_date - today).days
                if days < 0:
                    reminders.append(f"\u26a0\ufe0f {a.name} 已到期{-days}天，请及时处理")
                elif days <= 30:
                    reminders.append(f"\u26a0\ufe0f {a.name} 还有{days}天到期")

        # Insurance renewal within 30 days
        for p in active_policies:
            if p.next_payment_date:
                days = (p.next_payment_date - today).days
                if days < 0:
                    reminders.append(f"\u26a0\ufe0f {p.name}({p.insured_person}) 保费已逾期{-days}天")
                elif days <= 30:
                    reminders.append(f"\u26a0\ufe0f {p.name}({p.insured_person}) 还有{days}天续费")

        if reminders:
            lines.append("")
            lines.append("### 待办提醒\n")
            for r in reminders:
                lines.append(f"- {r}")
        else:
            lines.append("\n*当前无紧急提醒*")

        return "\n".join(lines)
