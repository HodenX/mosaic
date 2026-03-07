import datetime

from sqlmodel import Field, SQLModel


class Fund(SQLModel, table=True):
    __tablename__ = "funds"

    fund_code: str = Field(primary_key=True)
    fund_name: str = ""
    fund_type: str = ""
    management_company: str = ""
    # 新增标签字段
    index_type: str | None = Field(default=None, description="指数类型标签: csi300|sp500|nasdaq100|csi500|hsi")
    region: str | None = Field(default=None, description="地域标签: china|usa|hongkong|japan|europe|global")
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


class PositionBudget(SQLModel, table=True):
    __tablename__ = "position_budgets"

    id: int | None = Field(default=None, primary_key=True)
    total_budget: float = 0.0
    target_position_min: float = 0.0
    target_position_max: float = 100.0
    active_strategy: str = "simple"
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class BudgetChangeLog(SQLModel, table=True):
    __tablename__ = "budget_change_logs"

    id: int | None = Field(default=None, primary_key=True)
    old_budget: float
    new_budget: float
    reason: str | None = None
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class StrategyConfig(SQLModel, table=True):
    __tablename__ = "strategy_configs"

    id: int | None = Field(default=None, primary_key=True)
    strategy_name: str = Field(index=True)
    config_json: str = "{}"
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class LiquidAsset(SQLModel, table=True):
    __tablename__ = "liquid_assets"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str  # "deposit" | "money_fund"
    platform: str = ""
    amount: float = 0.0
    annual_rate: float | None = None
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class StableAsset(SQLModel, table=True):
    __tablename__ = "stable_assets"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str  # "term_deposit" | "bank_product"
    platform: str = ""
    amount: float = 0.0
    annual_rate: float = 0.0
    start_date: datetime.date | None = None
    maturity_date: datetime.date | None = None
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class TotalAssetSnapshot(SQLModel, table=True):
    __tablename__ = "total_asset_snapshots"

    date: datetime.date = Field(primary_key=True)
    liquid_amount: float = 0.0
    stable_amount: float = 0.0
    growth_amount: float = 0.0
    insurance_premium: float = 0.0
    total_assets: float = 0.0


class InsurancePolicy(SQLModel, table=True):
    __tablename__ = "insurance_policies"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str  # "critical_illness" | "medical" | "accident" | "life"
    policy_number: str | None = None
    insurer: str = ""
    insured_person: str  # "我" | "老婆" | "孩子" etc.
    annual_premium: float = 0.0
    coverage_amount: float | None = None
    coverage_summary: str | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    payment_years: int | None = None
    next_payment_date: datetime.date | None = None
    status: str = "active"  # "active" | "expired" | "lapsed"
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class AllocationTarget(SQLModel, table=True):
    __tablename__ = "allocation_targets"

    id: int | None = Field(default=None, primary_key=True)
    # 活钱目标：绝对值（金额）
    liquid_target: float = 0.0
    # 稳钱目标：在剩余资产（总资产 - 活钱）中的百分比
    stable_target: float = 0.0
    # 长钱目标：在剩余资产（总资产 - 活钱）中的百分比
    growth_target: float = 0.0
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class GrowthAllocationTarget(SQLModel, table=True):
    __tablename__ = "growth_allocation_targets"

    id: int | None = Field(default=None, primary_key=True)
    # 层级类型: "asset_class" | "equity_sub"
    level: str
    # 资产类别代码
    # asset_class: equity/bond/gold
    # equity_sub: spx/nasdaq/csi300/dividend/hkt
    code: str
    # 父类别（仅 equity_sub 层级使用）
    parent_code: str | None = None
    # 预期占比 (%)
    target_ratio: float = 0.0
    # 浮动比例 (%)
    float_ratio: float = 5.0
    # 更新时间
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
