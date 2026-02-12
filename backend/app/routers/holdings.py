from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Fund, FundNavHistory, Holding, HoldingChangeLog
from app.schemas import ChangeLogResponse, HoldingCreate, HoldingResponse, HoldingUpdate, SnapshotUpdate

router = APIRouter(prefix="/api/holdings", tags=["holdings"])

SessionDep = Annotated[Session, Depends(get_session)]


def _enrich_holding(holding: Holding, session: Session) -> HoldingResponse:
    fund = session.get(Fund, holding.fund_code)
    fund_name = fund.fund_name if fund else ""

    nav_record = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == holding.fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()

    latest_nav = nav_record.nav if nav_record else None
    latest_nav_date = nav_record.date if nav_record else None
    market_value = holding.shares * latest_nav if latest_nav else None
    total_cost = holding.shares * holding.cost_price
    pnl = market_value - total_cost if market_value else None
    pnl_percent = (pnl / total_cost * 100) if pnl and total_cost else None

    return HoldingResponse(
        id=holding.id,
        fund_code=holding.fund_code,
        fund_name=fund_name,
        platform=holding.platform,
        shares=holding.shares,
        cost_price=holding.cost_price,
        purchase_date=holding.purchase_date,
        latest_nav=latest_nav,
        latest_nav_date=latest_nav_date,
        market_value=market_value,
        pnl=pnl,
        pnl_percent=pnl_percent,
        created_at=holding.created_at,
        updated_at=holding.updated_at,
    )


@router.get("", response_model=list[HoldingResponse])
def list_holdings(session: SessionDep):
    holdings = session.exec(select(Holding)).all()
    return [_enrich_holding(h, session) for h in holdings]


@router.post("", response_model=HoldingResponse, status_code=201)
def create_holding(data: HoldingCreate, session: SessionDep):
    fund = session.get(Fund, data.fund_code)
    if not fund:
        fund = Fund(fund_code=data.fund_code)
        session.add(fund)
        session.commit()
        session.refresh(fund)

    holding = Holding(
        fund_code=data.fund_code,
        platform=data.platform,
        shares=data.shares,
        cost_price=data.cost_price,
        purchase_date=data.purchase_date,
    )
    session.add(holding)
    session.commit()
    session.refresh(holding)
    return _enrich_holding(holding, session)


@router.put("/{holding_id}", response_model=HoldingResponse)
def update_holding(holding_id: int, data: HoldingUpdate, session: SessionDep):
    holding = session.get(Holding, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(holding, key, value)
    holding.updated_at = datetime.now()

    session.add(holding)
    session.commit()
    session.refresh(holding)
    return _enrich_holding(holding, session)


@router.delete("/{holding_id}")
def delete_holding(holding_id: int, session: SessionDep):
    holding = session.get(Holding, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    session.delete(holding)
    session.commit()
    return {"ok": True}


@router.post("/{holding_id}/update-snapshot", response_model=HoldingResponse)
def update_snapshot(holding_id: int, data: SnapshotUpdate, session: SessionDep):
    holding = session.get(Holding, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    if data.shares <= 0 or data.cost_price <= 0:
        raise HTTPException(status_code=422, detail="shares and cost_price must be positive")

    if holding.shares == data.shares and holding.cost_price == data.cost_price:
        return _enrich_holding(holding, session)

    log = HoldingChangeLog(
        holding_id=holding.id,
        change_date=data.change_date,
        old_shares=holding.shares,
        new_shares=data.shares,
        old_cost_price=holding.cost_price,
        new_cost_price=data.cost_price,
    )
    session.add(log)

    holding.shares = data.shares
    holding.cost_price = data.cost_price
    holding.updated_at = datetime.now()
    session.add(holding)
    session.commit()
    session.refresh(holding)
    return _enrich_holding(holding, session)


@router.get("/{holding_id}/changelog", response_model=list[ChangeLogResponse])
def get_changelog(holding_id: int, session: SessionDep):
    holding = session.get(Holding, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    logs = session.exec(
        select(HoldingChangeLog)
        .where(HoldingChangeLog.holding_id == holding_id)
        .order_by(HoldingChangeLog.change_date.desc(), HoldingChangeLog.created_at.desc())
    ).all()

    return [
        ChangeLogResponse(
            id=log.id,
            holding_id=log.holding_id,
            change_date=log.change_date,
            old_shares=log.old_shares,
            new_shares=log.new_shares,
            old_cost_price=log.old_cost_price,
            new_cost_price=log.new_cost_price,
            shares_diff=log.new_shares - log.old_shares,
            created_at=log.created_at,
        )
        for log in logs
    ]
