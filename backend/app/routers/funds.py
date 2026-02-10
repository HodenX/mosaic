import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Fund, FundNavHistory
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
