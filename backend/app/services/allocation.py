from sqlmodel import Session, select

from app.models import Fund, FundAllocation, FundNavHistory, Holding


def get_weighted_allocation(dimension: str, session: Session) -> dict:
    """Calculate portfolio-level allocation by weighting each fund's allocation by its market value.

    Returns allocation items plus coverage metadata so the frontend can show
    how much of the portfolio is actually represented in the chart.
    """
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
        return {
            "items": [],
            "coverage": {
                "covered_funds": 0,
                "total_funds": len(set(h.fund_code for h in holdings)),
                "covered_value": 0,
                "total_value": 0,
                "covered_percent": 0,
                "missing_funds": [],
            },
        }

    # Find which funds have data for this dimension
    covered_value = 0.0
    covered_funds: list[str] = []
    missing_funds: list[str] = []

    category_totals: dict[str, float] = {}
    category_funds: dict[str, list[dict]] = {}
    for fund_code, market_value in fund_weights.items():
        weight = market_value / total_value
        allocations = session.exec(
            select(FundAllocation)
            .where(FundAllocation.fund_code == fund_code)
            .where(FundAllocation.dimension == dimension)
        ).all()
        if allocations:
            # Only use the latest report_date to avoid duplicate entries
            latest_date = max((a.report_date for a in allocations if a.report_date), default=None)
            if latest_date:
                allocations = [a for a in allocations if a.report_date == latest_date]
            covered_value += market_value
            covered_funds.append(fund_code)
            fund_record = session.get(Fund, fund_code)
            fund_name = fund_record.fund_name if fund_record else fund_code
            for a in allocations:
                weighted_pct = a.percentage * weight
                category_totals[a.category] = category_totals.get(a.category, 0) + weighted_pct
                category_funds.setdefault(a.category, []).append({
                    "fund_code": fund_code,
                    "fund_name": fund_name,
                    "percentage": round(weighted_pct, 2),
                })
        else:
            missing_funds.append(fund_code)

    items = []
    for cat, pct in sorted(category_totals.items(), key=lambda x: -x[1]):
        funds = sorted(category_funds.get(cat, []), key=lambda f: -f["percentage"])
        items.append({"category": cat, "percentage": round(pct, 2), "funds": funds})

    all_fund_codes = set(h.fund_code for h in holdings)

    return {
        "items": items,
        "coverage": {
            "covered_funds": len(covered_funds),
            "total_funds": len(all_fund_codes),
            "covered_value": round(covered_value, 2),
            "total_value": round(total_value, 2),
            "covered_percent": round(covered_value / total_value * 100, 1) if total_value else 0,
            "missing_funds": missing_funds,
        },
    }
