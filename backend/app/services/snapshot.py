import datetime

from sqlmodel import Session, select

from app.models import FundNavHistory, Holding, PortfolioSnapshot


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
