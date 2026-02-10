import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Fund, FundAllocation, FundNavHistory, FundTopHolding
from app.services.fund_data import fetch_fund_allocation, fetch_fund_info, fetch_fund_nav

router = APIRouter(prefix="/api/funds", tags=["funds"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/{fund_code}")
def get_fund(fund_code: str, session: SessionDep):
    fund = session.get(Fund, fund_code)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    latest_nav = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()

    return {
        **fund.model_dump(),
        "latest_nav": latest_nav.nav if latest_nav else None,
        "latest_nav_date": str(latest_nav.date) if latest_nav else None,
    }


@router.get("/{fund_code}/nav-history")
def get_nav_history(
    fund_code: str,
    session: SessionDep,
    start: datetime.date | None = Query(None),
    end: datetime.date | None = Query(None),
):
    query = select(FundNavHistory).where(FundNavHistory.fund_code == fund_code)
    if start:
        query = query.where(FundNavHistory.date >= start)
    if end:
        query = query.where(FundNavHistory.date <= end)
    query = query.order_by(FundNavHistory.date)

    records = session.exec(query).all()
    return [{"date": str(r.date), "nav": r.nav} for r in records]


@router.post("/{fund_code}/refresh")
def refresh_fund(fund_code: str, session: SessionDep):
    fund = fetch_fund_info(fund_code, session)
    fetch_fund_nav(fund_code, session)
    fetch_fund_allocation(fund_code, session)
    return {"ok": True, "fund_name": fund.fund_name}


@router.get("/{fund_code}/allocation")
def get_fund_allocation(fund_code: str, session: SessionDep):
    allocations = session.exec(
        select(FundAllocation).where(FundAllocation.fund_code == fund_code)
    ).all()
    result: dict[str, list] = {}
    for a in allocations:
        if a.dimension not in result:
            result[a.dimension] = []
        result[a.dimension].append({
            "category": a.category,
            "percentage": a.percentage,
            "source": a.source,
        })
    return result


@router.get("/{fund_code}/top-holdings")
def get_fund_top_holdings(fund_code: str, session: SessionDep):
    holdings = session.exec(
        select(FundTopHolding).where(FundTopHolding.fund_code == fund_code)
    ).all()
    return [
        {"stock_code": h.stock_code, "stock_name": h.stock_name, "percentage": h.percentage}
        for h in holdings
    ]


@router.put("/{fund_code}/allocation")
def override_allocation(fund_code: str, data: list[dict], session: SessionDep):
    for item in data:
        session.add(FundAllocation(
            fund_code=fund_code,
            dimension=item["dimension"],
            category=item["category"],
            percentage=item["percentage"],
            source="manual",
            report_date=item.get("report_date"),
        ))
    session.commit()
    return {"ok": True}
