import datetime

from sqlmodel import Session, select

from app.models import (
    FundNavHistory,
    Holding,
    InsurancePolicy,
    LiquidAsset,
    PortfolioSnapshot,
    StableAsset,
    TotalAssetSnapshot,
)


def take_portfolio_snapshot(session: Session) -> None:
    """Calculate and store today's portfolio value snapshot."""
    holdings = session.exec(select(Holding)).all()

    total_value = 0.0
    total_cost = 0.0

    for h in holdings:
        total_cost += h.shares * h.cost_price
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            total_value += h.shares * nav_record.nav

    today = datetime.date.today()
    existing = session.get(PortfolioSnapshot, today)
    if existing:
        existing.total_value = total_value
        existing.total_cost = total_cost
        existing.total_pnl = total_value - total_cost
        session.add(existing)
    else:
        session.add(PortfolioSnapshot(
            date=today,
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            total_pnl=round(total_value - total_cost, 2),
        ))
    session.commit()


def take_total_asset_snapshot(session: Session) -> TotalAssetSnapshot:
    """Calculate and store today's total asset snapshot across all four buckets."""
    # Liquid bucket
    liquid_assets = session.exec(select(LiquidAsset)).all()
    liquid_amount = sum(a.amount for a in liquid_assets)

    # Stable bucket
    stable_assets = session.exec(select(StableAsset)).all()
    stable_amount = sum(a.amount for a in stable_assets)

    # Growth bucket (funds)
    holdings = session.exec(select(Holding)).all()
    growth_amount = 0.0
    for h in holdings:
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            growth_amount += h.shares * nav_record.nav

    # Insurance bucket
    policies = session.exec(
        select(InsurancePolicy).where(InsurancePolicy.status == "active")
    ).all()
    insurance_premium = sum(p.annual_premium for p in policies)

    # Total (insurance excluded from asset total, same as dashboard summary)
    total_assets = liquid_amount + stable_amount + growth_amount

    today = datetime.date.today()
    existing = session.get(TotalAssetSnapshot, today)
    if existing:
        existing.liquid_amount = round(liquid_amount, 2)
        existing.stable_amount = round(stable_amount, 2)
        existing.growth_amount = round(growth_amount, 2)
        existing.insurance_premium = round(insurance_premium, 2)
        existing.total_assets = round(total_assets, 2)
        session.add(existing)
    else:
        existing = TotalAssetSnapshot(
            date=today,
            liquid_amount=round(liquid_amount, 2),
            stable_amount=round(stable_amount, 2),
            growth_amount=round(growth_amount, 2),
            insurance_premium=round(insurance_premium, 2),
            total_assets=round(total_assets, 2),
        )
        session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing
