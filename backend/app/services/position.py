from __future__ import annotations

import json

from sqlmodel import Session, select

from app.models import FundNavHistory, Holding, PositionBudget, StrategyConfig, Fund
from app.services.strategies.base import PortfolioContext, StrategyResult
from app.services.strategies.registry import get_strategy


def get_or_create_budget(session: Session) -> PositionBudget:
    budget = session.exec(select(PositionBudget).limit(1)).first()
    if budget is None:
        budget = PositionBudget()
        session.add(budget)
        session.commit()
        session.refresh(budget)
    return budget


def _get_latest_nav(fund_code: str, session: Session) -> float | None:
    record = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()
    return record.nav if record else None


def build_portfolio_context(budget: PositionBudget, session: Session) -> PortfolioContext:
    holdings = session.exec(select(Holding)).all()

    total_value = 0.0
    total_cost = 0.0
    holding_details: list[dict] = []

    for h in holdings:
        nav = _get_latest_nav(h.fund_code, session)
        cost = h.shares * h.cost_price
        market_value = h.shares * nav if nav else 0.0
        total_cost += cost
        total_value += market_value

        fund = session.get(Fund, h.fund_code)
        holding_details.append({
            "fund_code": h.fund_code,
            "fund_name": fund.fund_name if fund else "",
            "platform": h.platform,
            "shares": h.shares,
            "cost_price": h.cost_price,
            "cost": round(cost, 2),
            "market_value": round(market_value, 2),
            "weight": 0.0,  # filled below
        })

    # compute weights
    for d in holding_details:
        d["weight"] = round(d["market_value"] / total_value * 100, 2) if total_value else 0.0

    tb = budget.total_budget
    position_ratio = (total_value / tb * 100) if tb > 0 else 0.0
    available_cash = max(tb - total_value, 0.0)

    # load strategy config
    strategy_name = budget.active_strategy
    cfg_row = session.exec(
        select(StrategyConfig).where(StrategyConfig.strategy_name == strategy_name).limit(1)
    ).first()
    strategy_config = json.loads(cfg_row.config_json) if cfg_row else {}

    return PortfolioContext(
        total_budget=tb,
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        available_cash=round(available_cash, 2),
        position_ratio=round(position_ratio, 2),
        target_position_min=budget.target_position_min,
        target_position_max=budget.target_position_max,
        holdings=holding_details,
        strategy_config=strategy_config,
    )


def run_strategy(session: Session) -> StrategyResult | None:
    budget = get_or_create_budget(session)
    strategy = get_strategy(budget.active_strategy)
    if strategy is None:
        return None
    context = build_portfolio_context(budget, session)
    return strategy.evaluate(context, session)
