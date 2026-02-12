from datetime import date, datetime

from sqlmodel import SQLModel


class HoldingCreate(SQLModel):
    fund_code: str
    platform: str
    shares: float
    cost_price: float
    purchase_date: date


class HoldingUpdate(SQLModel):
    platform: str | None = None
    shares: float | None = None
    cost_price: float | None = None
    purchase_date: date | None = None


class HoldingResponse(SQLModel):
    id: int
    fund_code: str
    fund_name: str
    platform: str
    shares: float
    cost_price: float
    purchase_date: date
    latest_nav: float | None
    latest_nav_date: date | None
    market_value: float | None
    pnl: float | None
    pnl_percent: float | None
    created_at: datetime
    updated_at: datetime


class SnapshotUpdate(SQLModel):
    shares: float
    cost_price: float
    change_date: date


class ChangeLogResponse(SQLModel):
    id: int
    holding_id: int
    change_date: date
    old_shares: float
    new_shares: float
    old_cost_price: float
    new_cost_price: float
    shares_diff: float
    created_at: datetime


class BudgetUpdateRequest(SQLModel):
    total_budget: float | None = None
    target_position_min: float | None = None
    target_position_max: float | None = None
    reason: str | None = None


class PositionStatusResponse(SQLModel):
    total_budget: float
    total_value: float
    total_cost: float
    available_cash: float
    position_ratio: float
    target_position_min: float
    target_position_max: float
    active_strategy: str
    is_below_min: bool
    is_above_max: bool


class BudgetChangeLogResponse(SQLModel):
    id: int
    old_budget: float
    new_budget: float
    reason: str | None
    created_at: datetime


class StrategyInfoResponse(SQLModel):
    name: str
    display_name: str
    description: str
    config_schema: dict


class ActiveStrategyUpdate(SQLModel):
    strategy_name: str


class StrategyConfigUpdate(SQLModel):
    config_json: dict


class SuggestionItemResponse(SQLModel):
    fund_code: str
    fund_name: str
    action: str
    amount: float
    reason: str


class StrategyResultResponse(SQLModel):
    strategy_name: str
    summary: str
    suggestions: list[SuggestionItemResponse]
    extra: dict
