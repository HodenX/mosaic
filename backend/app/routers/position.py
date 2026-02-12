from __future__ import annotations

import datetime
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import BudgetChangeLog, PositionBudget, StrategyConfig
from app.schemas import (
    ActiveStrategyUpdate,
    BudgetChangeLogResponse,
    BudgetUpdateRequest,
    PositionStatusResponse,
    StrategyConfigUpdate,
    StrategyInfoResponse,
    StrategyResultResponse,
    SuggestionItemResponse,
)
from app.services.position import build_portfolio_context, get_or_create_budget, run_strategy
from app.services.strategies.registry import get_strategy, list_strategies

router = APIRouter(prefix="/api/position", tags=["position"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/budget", response_model=PositionStatusResponse)
def get_budget(session: SessionDep):
    budget = get_or_create_budget(session)
    ctx = build_portfolio_context(budget, session)
    return PositionStatusResponse(
        total_budget=budget.total_budget,
        total_value=ctx.total_value,
        total_cost=ctx.total_cost,
        available_cash=ctx.available_cash,
        position_ratio=ctx.position_ratio,
        target_position_min=budget.target_position_min,
        target_position_max=budget.target_position_max,
        active_strategy=budget.active_strategy,
        is_below_min=ctx.position_ratio < budget.target_position_min,
        is_above_max=ctx.position_ratio > budget.target_position_max,
    )


@router.put("/budget", response_model=PositionStatusResponse)
def update_budget(data: BudgetUpdateRequest, session: SessionDep):
    budget = get_or_create_budget(session)
    old_budget_val = budget.total_budget

    if data.total_budget is not None:
        budget.total_budget = data.total_budget
    if data.target_position_min is not None:
        budget.target_position_min = data.target_position_min
    if data.target_position_max is not None:
        budget.target_position_max = data.target_position_max
    budget.updated_at = datetime.datetime.now()

    # log budget change if amount changed
    if data.total_budget is not None and data.total_budget != old_budget_val:
        log = BudgetChangeLog(
            old_budget=old_budget_val,
            new_budget=data.total_budget,
            reason=data.reason,
        )
        session.add(log)

    session.add(budget)
    session.commit()
    session.refresh(budget)

    ctx = build_portfolio_context(budget, session)
    return PositionStatusResponse(
        total_budget=budget.total_budget,
        total_value=ctx.total_value,
        total_cost=ctx.total_cost,
        available_cash=ctx.available_cash,
        position_ratio=ctx.position_ratio,
        target_position_min=budget.target_position_min,
        target_position_max=budget.target_position_max,
        active_strategy=budget.active_strategy,
        is_below_min=ctx.position_ratio < budget.target_position_min,
        is_above_max=ctx.position_ratio > budget.target_position_max,
    )


@router.get("/budget/changelog", response_model=list[BudgetChangeLogResponse])
def budget_changelog(session: SessionDep):
    logs = session.exec(
        select(BudgetChangeLog).order_by(BudgetChangeLog.created_at.desc())
    ).all()
    return logs


@router.get("/strategies", response_model=list[StrategyInfoResponse])
def get_strategies():
    return [
        StrategyInfoResponse(
            name=s.name,
            display_name=s.display_name,
            description=s.description,
            config_schema=s.config_schema,
        )
        for s in list_strategies()
    ]


@router.put("/active-strategy", response_model=PositionStatusResponse)
def set_active_strategy(data: ActiveStrategyUpdate, session: SessionDep):
    strategy = get_strategy(data.strategy_name)
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{data.strategy_name}' not found")

    budget = get_or_create_budget(session)
    budget.active_strategy = data.strategy_name
    budget.updated_at = datetime.datetime.now()
    session.add(budget)
    session.commit()
    session.refresh(budget)

    ctx = build_portfolio_context(budget, session)
    return PositionStatusResponse(
        total_budget=budget.total_budget,
        total_value=ctx.total_value,
        total_cost=ctx.total_cost,
        available_cash=ctx.available_cash,
        position_ratio=ctx.position_ratio,
        target_position_min=budget.target_position_min,
        target_position_max=budget.target_position_max,
        active_strategy=budget.active_strategy,
        is_below_min=ctx.position_ratio < budget.target_position_min,
        is_above_max=ctx.position_ratio > budget.target_position_max,
    )


@router.get("/strategy-config/{name}")
def get_strategy_config(name: str, session: SessionDep):
    strategy = get_strategy(name)
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{name}' not found")

    cfg_row = session.exec(
        select(StrategyConfig).where(StrategyConfig.strategy_name == name).limit(1)
    ).first()
    config = json.loads(cfg_row.config_json) if cfg_row else {}
    return {"strategy_name": name, "config": config}


@router.put("/strategy-config/{name}")
def update_strategy_config(name: str, data: StrategyConfigUpdate, session: SessionDep):
    strategy = get_strategy(name)
    if strategy is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{name}' not found")

    cfg_row = session.exec(
        select(StrategyConfig).where(StrategyConfig.strategy_name == name).limit(1)
    ).first()

    if cfg_row is None:
        cfg_row = StrategyConfig(strategy_name=name)

    cfg_row.config_json = json.dumps(data.config_json, ensure_ascii=False)
    cfg_row.updated_at = datetime.datetime.now()
    session.add(cfg_row)
    session.commit()
    session.refresh(cfg_row)
    return {"strategy_name": name, "config": json.loads(cfg_row.config_json)}


@router.get("/suggestion", response_model=StrategyResultResponse)
def get_suggestion(session: SessionDep):
    result = run_strategy(session)
    if result is None:
        raise HTTPException(status_code=404, detail="No active strategy found")
    return StrategyResultResponse(
        strategy_name=result.strategy_name,
        summary=result.summary,
        suggestions=[
            SuggestionItemResponse(
                fund_code=s.fund_code,
                fund_name=s.fund_name,
                action=s.action,
                amount=s.amount,
                reason=s.reason,
            )
            for s in result.suggestions
        ],
        extra=result.metadata,
    )
