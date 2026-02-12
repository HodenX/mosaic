import datetime

from sqlmodel import Field, SQLModel


class Fund(SQLModel, table=True):
    __tablename__ = "funds"

    fund_code: str = Field(primary_key=True)
    fund_name: str = ""
    fund_type: str = ""
    management_company: str = ""
    last_updated: datetime.datetime | None = None


class Holding(SQLModel, table=True):
    __tablename__ = "holdings"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    platform: str
    shares: float
    cost_price: float
    purchase_date: datetime.date
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class FundNavHistory(SQLModel, table=True):
    __tablename__ = "fund_nav_history"

    fund_code: str = Field(foreign_key="funds.fund_code", primary_key=True)
    date: datetime.date = Field(primary_key=True)
    nav: float


class FundAllocation(SQLModel, table=True):
    __tablename__ = "fund_allocations"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    dimension: str  # asset_class / geography / sector
    category: str
    percentage: float
    source: str = "auto"  # auto / manual
    report_date: datetime.date | None = None


class FundTopHolding(SQLModel, table=True):
    __tablename__ = "fund_top_holdings"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    stock_code: str
    stock_name: str
    percentage: float
    report_date: datetime.date | None = None


class HoldingChangeLog(SQLModel, table=True):
    __tablename__ = "holding_change_logs"

    id: int | None = Field(default=None, primary_key=True)
    holding_id: int = Field(foreign_key="holdings.id")
    change_date: datetime.date
    old_shares: float
    new_shares: float
    old_cost_price: float
    new_cost_price: float
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class PortfolioSnapshot(SQLModel, table=True):
    __tablename__ = "portfolio_snapshots"

    date: datetime.date = Field(primary_key=True)
    total_value: float
    total_cost: float
    total_pnl: float
