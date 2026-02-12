import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Holding,
    FundNavHistory,
    LiquidAsset,
    StableAsset,
    InsurancePolicy,
    PositionBudget,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
SessionDep = Annotated[Session, Depends(get_session)]


def _get_growth_summary(session: Session) -> dict:
    """Calculate long-money (fund) bucket summary."""
    holdings = session.exec(select(Holding)).all()
    total_value = 0.0
    total_cost = 0.0
    for h in holdings:
        nav_row = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
        ).first()
        nav = nav_row.nav if nav_row else None
        if nav is not None:
            total_value += h.shares * nav
        total_cost += h.shares * h.cost_price
    total_pnl = total_value - total_cost
    pnl_percent = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0
    return {
        "total_amount": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
        "count": len(holdings),
    }


def _nearest_maturity_days(assets: list) -> int | None:
    today = dt.date.today()
    days_list = []
    for a in assets:
        if a.maturity_date and a.maturity_date >= today:
            days_list.append((a.maturity_date - today).days)
    return min(days_list) if days_list else None


def _nearest_renewal_days(policies: list) -> int | None:
    today = dt.date.today()
    days_list = []
    for p in policies:
        if p.next_payment_date and p.next_payment_date >= today:
            days_list.append((p.next_payment_date - today).days)
    return min(days_list) if days_list else None


@router.get("/summary")
def dashboard_summary(session: SessionDep):
    # Liquid bucket
    liquid_assets = session.exec(select(LiquidAsset)).all()
    liquid_amount = sum(a.amount for a in liquid_assets)
    liquid_return = sum(
        a.amount * (a.annual_rate / 100) for a in liquid_assets if a.annual_rate
    )

    # Stable bucket
    stable_assets = session.exec(select(StableAsset)).all()
    stable_amount = sum(a.amount for a in stable_assets)
    stable_return = sum(a.amount * (a.annual_rate / 100) for a in stable_assets)

    # Growth bucket (funds)
    growth = _get_growth_summary(session)

    # Insurance bucket
    policies = session.exec(select(InsurancePolicy)).all()
    active_policies = [p for p in policies if p.status == "active"]
    total_premium = sum(p.annual_premium for p in active_policies)
    covered_persons = len(set(p.insured_person for p in active_policies))

    # Totals (insurance excluded from asset total)
    total_assets = liquid_amount + stable_amount + growth["total_amount"]
    total_cost_base = liquid_amount + stable_amount + growth["total_cost"]
    total_return = liquid_return + stable_return + growth["total_pnl"]

    return {
        "total_assets": round(total_assets, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(
            total_return / total_cost_base * 100, 2
        ) if total_cost_base > 0 else 0.0,
        "buckets": {
            "liquid": {
                "amount": round(liquid_amount, 2),
                "estimated_return": round(liquid_return, 2),
                "count": len(liquid_assets),
            },
            "stable": {
                "amount": round(stable_amount, 2),
                "estimated_return": round(stable_return, 2),
                "count": len(stable_assets),
                "nearest_maturity_days": _nearest_maturity_days(stable_assets),
            },
            "growth": growth,
            "insurance": {
                "active_count": len(active_policies),
                "total_count": len(policies),
                "annual_premium": round(total_premium, 2),
                "covered_persons": covered_persons,
                "nearest_renewal_days": _nearest_renewal_days(active_policies),
            },
        },
    }


@router.get("/reminders")
def dashboard_reminders(session: SessionDep):
    today = dt.date.today()
    reminders = []

    # Insurance renewal reminders
    active_policies = session.exec(
        select(InsurancePolicy).where(InsurancePolicy.status == "active")
    ).all()
    for p in active_policies:
        if not p.next_payment_date:
            continue
        days = (p.next_payment_date - today).days
        if days < 0:
            reminders.append({
                "type": "insurance_renewal",
                "level": "urgent",
                "title": "保险已逾期续费",
                "detail": f"{p.name}({p.insured_person}) 已逾期{-days}天",
                "days": days,
                "link": "/insurance",
            })
        elif days <= 7:
            reminders.append({
                "type": "insurance_renewal",
                "level": "urgent",
                "title": "保险即将续费",
                "detail": f"{p.name}({p.insured_person}) 还有{days}天",
                "days": days,
                "link": "/insurance",
            })
        elif days <= 30:
            reminders.append({
                "type": "insurance_renewal",
                "level": "warning",
                "title": "保险续费提醒",
                "detail": f"{p.name}({p.insured_person}) 还有{days}天",
                "days": days,
                "link": "/insurance",
            })

    # Stable asset maturity reminders
    stable_assets = session.exec(select(StableAsset)).all()
    for a in stable_assets:
        if not a.maturity_date:
            continue
        days = (a.maturity_date - today).days
        if days < 0:
            reminders.append({
                "type": "stable_maturity",
                "level": "urgent",
                "title": "理财已到期",
                "detail": f"{a.name} 已到期{-days}天，请处理",
                "days": days,
                "link": "/stable",
            })
        elif days <= 7:
            reminders.append({
                "type": "stable_maturity",
                "level": "urgent",
                "title": "理财即将到期",
                "detail": f"{a.name} 还有{days}天到期",
                "days": days,
                "link": "/stable",
            })
        elif days <= 30:
            reminders.append({
                "type": "stable_maturity",
                "level": "warning",
                "title": "理财到期提醒",
                "detail": f"{a.name} 还有{days}天到期",
                "days": days,
                "link": "/stable",
            })

    # Growth money — position warning
    budget = session.exec(select(PositionBudget)).first()
    if budget and budget.total_budget > 0:
        growth = _get_growth_summary(session)
        position_pct = growth["total_amount"] / budget.total_budget * 100
        if position_pct < budget.target_position_min:
            reminders.append({
                "type": "growth_position",
                "level": "warning",
                "title": "长钱仓位偏低",
                "detail": f"当前仓位 {position_pct:.0f}%，低于目标下限 {budget.target_position_min:.0f}%",
                "days": None,
                "link": "/growth/position",
            })
        elif position_pct > budget.target_position_max:
            reminders.append({
                "type": "growth_position",
                "level": "warning",
                "title": "长钱仓位偏高",
                "detail": f"当前仓位 {position_pct:.0f}%，高于目标上限 {budget.target_position_max:.0f}%",
                "days": None,
                "link": "/growth/position",
            })

    # Sort: urgent first, then warning, then info; within same level by days ascending
    level_order = {"urgent": 0, "warning": 1, "info": 2}
    reminders.sort(key=lambda r: (level_order.get(r["level"], 9), r["days"] if r["days"] is not None else 999))

    return reminders
