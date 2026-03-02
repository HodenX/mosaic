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
    """Backfill portfolio snapshots for all NAV dates since the last snapshot."""
    holdings = session.exec(select(Holding)).all()
    if not holdings:
        return

    fund_codes = [h.fund_code for h in holdings]

    # Find the last snapshot date so we only fill forward from there
    last_snapshot = session.exec(
        select(PortfolioSnapshot).order_by(PortfolioSnapshot.date.desc()).limit(1)
    ).first()
    last_date = last_snapshot.date if last_snapshot else None

    # Collect all unique NAV dates across held funds that have no snapshot yet
    dates_query = (
        select(FundNavHistory.date)
        .where(FundNavHistory.fund_code.in_(fund_codes))
        .distinct()
        .order_by(FundNavHistory.date)
    )
    if last_date:
        dates_query = dates_query.where(FundNavHistory.date > last_date)

    dates_to_fill = session.exec(dates_query).all()

    for nav_date in dates_to_fill:
        total_value = 0.0
        total_cost = 0.0

        for h in holdings:
            total_cost += h.shares * h.cost_price
            # Use the NAV on or most recently before this date
            nav_record = session.exec(
                select(FundNavHistory)
                .where(FundNavHistory.fund_code == h.fund_code)
                .where(FundNavHistory.date <= nav_date)
                .order_by(FundNavHistory.date.desc())
                .limit(1)
            ).first()
            if nav_record:
                total_value += h.shares * nav_record.nav

        existing = session.get(PortfolioSnapshot, nav_date)
        if existing:
            existing.total_value = round(total_value, 2)
            existing.total_cost = round(total_cost, 2)
            existing.total_pnl = round(total_value - total_cost, 2)
            session.add(existing)
        else:
            session.add(PortfolioSnapshot(
                date=nav_date,
                total_value=round(total_value, 2),
                total_cost=round(total_cost, 2),
                total_pnl=round(total_value - total_cost, 2),
            ))

    if dates_to_fill:
        session.commit()


def take_total_asset_snapshot(session: Session) -> TotalAssetSnapshot:
    """Calculate and store total asset snapshot across all four buckets, keyed to the latest NAV date."""
    # Liquid bucket
    liquid_assets = session.exec(select(LiquidAsset)).all()
    liquid_amount = sum(a.amount for a in liquid_assets)

    # Stable bucket
    stable_assets = session.exec(select(StableAsset)).all()
    stable_amount = sum(a.amount for a in stable_assets)

    # Growth bucket (funds)
    holdings = session.exec(select(Holding)).all()
    growth_amount = 0.0
    latest_nav_date = None
    for h in holdings:
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            growth_amount += h.shares * nav_record.nav
            if latest_nav_date is None or nav_record.date > latest_nav_date:
                latest_nav_date = nav_record.date

    # Insurance bucket
    policies = session.exec(
        select(InsurancePolicy).where(InsurancePolicy.status == "active")
    ).all()
    insurance_premium = sum(p.annual_premium for p in policies)

    # Total (insurance excluded from asset total, same as dashboard summary)
    total_assets = liquid_amount + stable_amount + growth_amount

    snapshot_date = latest_nav_date if latest_nav_date else datetime.date.today()
    existing = session.get(TotalAssetSnapshot, snapshot_date)
    if existing:
        existing.liquid_amount = round(liquid_amount, 2)
        existing.stable_amount = round(stable_amount, 2)
        existing.growth_amount = round(growth_amount, 2)
        existing.insurance_premium = round(insurance_premium, 2)
        existing.total_assets = round(total_assets, 2)
        session.add(existing)
    else:
        existing = TotalAssetSnapshot(
            date=snapshot_date,
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
