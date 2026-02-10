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
    market_value: float | None
    pnl: float | None
    pnl_percent: float | None
    created_at: datetime
    updated_at: datetime
