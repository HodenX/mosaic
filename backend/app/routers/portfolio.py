from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FundNavHistory, Holding

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

SessionDep = Annotated[Session, Depends(get_session)]


def _get_latest_nav(fund_code: str, session: Session) -> float | None:
    record = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()
    return record.nav if record else None


@router.get("/summary")
def portfolio_summary(session: SessionDep):
    holdings = session.exec(select(Holding)).all()

    total_value = 0.0
    total_cost = 0.0

    for h in holdings:
        cost = h.shares * h.cost_price
        total_cost += cost
        nav = _get_latest_nav(h.fund_code, session)
        if nav:
            total_value += h.shares * nav

    total_pnl = total_value - total_cost
    pnl_percent = (total_pnl / total_cost * 100) if total_cost else 0

    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
    }


@router.get("/by-platform")
def portfolio_by_platform(session: SessionDep):
    holdings = session.exec(select(Holding)).all()

    platforms: dict[str, dict] = {}
    for h in holdings:
        nav = _get_latest_nav(h.fund_code, session)
        market_value = h.shares * nav if nav else 0
        cost = h.shares * h.cost_price

        if h.platform not in platforms:
            platforms[h.platform] = {"platform": h.platform, "market_value": 0, "cost": 0, "count": 0}

        platforms[h.platform]["market_value"] += market_value
        platforms[h.platform]["cost"] += cost
        platforms[h.platform]["count"] += 1

    result = list(platforms.values())
    for p in result:
        p["market_value"] = round(p["market_value"], 2)
        p["cost"] = round(p["cost"], 2)
        p["pnl"] = round(p["market_value"] - p["cost"], 2)

    return result
