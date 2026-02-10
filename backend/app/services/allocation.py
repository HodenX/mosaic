from sqlmodel import Session, select

from app.models import FundAllocation, FundNavHistory, Holding


def get_weighted_allocation(dimension: str, session: Session) -> list[dict]:
    """Calculate portfolio-level allocation by weighting each fund's allocation by its market value."""
    holdings = session.exec(select(Holding)).all()

    # Calculate each holding's market value
    fund_weights: dict[str, float] = {}
    total_value = 0.0
    for h in holdings:
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            mv = h.shares * nav_record.nav
            fund_weights[h.fund_code] = fund_weights.get(h.fund_code, 0) + mv
            total_value += mv

    if total_value == 0:
        return []

    # Aggregate allocations weighted by market value
    category_totals: dict[str, float] = {}
    for fund_code, market_value in fund_weights.items():
        weight = market_value / total_value
        allocations = session.exec(
            select(FundAllocation)
            .where(FundAllocation.fund_code == fund_code)
            .where(FundAllocation.dimension == dimension)
        ).all()
        for a in allocations:
            category_totals[a.category] = category_totals.get(a.category, 0) + a.percentage * weight

    result = [
        {"category": cat, "percentage": round(pct, 2)}
        for cat, pct in sorted(category_totals.items(), key=lambda x: -x[1])
    ]
    return result
