# Four-Bucket Phase 1: Framework + Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the four-bucket architecture skeleton — new data models, CRUD APIs, route restructuring, sidebar redesign, and a dashboard homepage showing family-level asset overview.

**Architecture:** Add three new SQLModel tables (LiquidAsset, StableAsset, InsurancePolicy) with standard CRUD routers. Create a dashboard router that aggregates across all buckets. Restructure frontend routes under `/growth/*` for existing fund pages, add new bucket pages, and redesign the sidebar with collapsible groups.

**Tech Stack:** Python/FastAPI/SQLModel (backend), React 19/TypeScript/Vite/Tailwind/shadcn-ui/Recharts (frontend)

---

### Task 1: Backend — New Models

**Files:**
- Modify: `backend/app/models.py`

**Step 1: Add LiquidAsset, StableAsset, InsurancePolicy models**

Append to `backend/app/models.py`:

```python
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


class InsurancePolicy(SQLModel, table=True):
    __tablename__ = "insurance_policies"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: str  # "critical_illness" | "medical" | "accident" | "life"
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
```

**Step 2: Verify tables auto-create**

Run: `cd backend && python -c "from app.database import create_db_and_tables; create_db_and_tables(); print('OK')"`
Expected: `OK` — three new tables created in `data/finance.db`

**Step 3: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: add LiquidAsset, StableAsset, InsurancePolicy models"
```

---

### Task 2: Backend — New Schemas

**Files:**
- Modify: `backend/app/schemas.py`

**Step 1: Add Create/Update schemas for all three models**

Append to `backend/app/schemas.py`:

```python
# --- Liquid Asset schemas ---

class LiquidAssetCreate(SQLModel):
    name: str
    type: str
    platform: str = ""
    amount: float = 0.0
    annual_rate: float | None = None


class LiquidAssetUpdate(SQLModel):
    name: str | None = None
    type: str | None = None
    platform: str | None = None
    amount: float | None = None
    annual_rate: float | None = None


# --- Stable Asset schemas ---

class StableAssetCreate(SQLModel):
    name: str
    type: str
    platform: str = ""
    amount: float = 0.0
    annual_rate: float = 0.0
    start_date: date | None = None
    maturity_date: date | None = None


class StableAssetUpdate(SQLModel):
    name: str | None = None
    type: str | None = None
    platform: str | None = None
    amount: float | None = None
    annual_rate: float | None = None
    start_date: date | None = None
    maturity_date: date | None = None


# --- Insurance Policy schemas ---

class InsurancePolicyCreate(SQLModel):
    name: str
    type: str
    insurer: str = ""
    insured_person: str
    annual_premium: float = 0.0
    coverage_amount: float | None = None
    coverage_summary: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    payment_years: int | None = None
    next_payment_date: date | None = None
    status: str = "active"


class InsurancePolicyUpdate(SQLModel):
    name: str | None = None
    type: str | None = None
    insurer: str | None = None
    insured_person: str | None = None
    annual_premium: float | None = None
    coverage_amount: float | None = None
    coverage_summary: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    payment_years: int | None = None
    next_payment_date: date | None = None
    status: str | None = None
```

**Step 2: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat: add schemas for liquid, stable, insurance"
```

---

### Task 3: Backend — Liquid Asset CRUD Router

**Files:**
- Create: `backend/app/routers/liquid.py`

**Step 1: Create the router file**

```python
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import LiquidAsset
from app.schemas import LiquidAssetCreate, LiquidAssetUpdate

router = APIRouter(prefix="/api/liquid", tags=["liquid"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_liquid_assets(session: SessionDep):
    assets = session.exec(select(LiquidAsset)).all()
    total_amount = sum(a.amount for a in assets)
    estimated_annual_return = sum(
        a.amount * (a.annual_rate / 100) for a in assets if a.annual_rate
    )
    return {
        "items": assets,
        "summary": {
            "total_amount": round(total_amount, 2),
            "estimated_annual_return": round(estimated_annual_return, 2),
            "count": len(assets),
        },
    }


@router.post("", status_code=201)
def create_liquid_asset(data: LiquidAssetCreate, session: SessionDep):
    asset = LiquidAsset(**data.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.put("/{asset_id}")
def update_liquid_asset(asset_id: int, data: LiquidAssetUpdate, session: SessionDep):
    asset = session.get(LiquidAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Liquid asset not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    asset.updated_at = datetime.now()
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_liquid_asset(asset_id: int, session: SessionDep):
    asset = session.get(LiquidAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Liquid asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}
```

**Step 2: Register in main.py**

In `backend/app/main.py`, add import and include:

```python
from app.routers import funds, holdings, portfolio, position, liquid
# ...
app.include_router(liquid.router)
```

**Step 3: Test manually**

Run: `cd backend && uvicorn app.main:app --reload`
Then: `curl -s http://localhost:8000/api/liquid | python -m json.tool`
Expected: `{"items": [], "summary": {"total_amount": 0.0, "estimated_annual_return": 0.0, "count": 0}}`

**Step 4: Commit**

```bash
git add backend/app/routers/liquid.py backend/app/main.py
git commit -m "feat: add liquid asset CRUD router"
```

---

### Task 4: Backend — Stable Asset CRUD Router

**Files:**
- Create: `backend/app/routers/stable.py`

**Step 1: Create the router file**

```python
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import StableAsset
from app.schemas import StableAssetCreate, StableAssetUpdate

router = APIRouter(prefix="/api/stable", tags=["stable"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_stable_assets(session: SessionDep):
    assets = session.exec(select(StableAsset)).all()
    total_amount = sum(a.amount for a in assets)
    estimated_annual_return = sum(
        a.amount * (a.annual_rate / 100) for a in assets
    )
    return {
        "items": assets,
        "summary": {
            "total_amount": round(total_amount, 2),
            "estimated_annual_return": round(estimated_annual_return, 2),
            "count": len(assets),
        },
    }


@router.post("", status_code=201)
def create_stable_asset(data: StableAssetCreate, session: SessionDep):
    asset = StableAsset(**data.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.put("/{asset_id}")
def update_stable_asset(asset_id: int, data: StableAssetUpdate, session: SessionDep):
    asset = session.get(StableAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Stable asset not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    asset.updated_at = datetime.now()
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_stable_asset(asset_id: int, session: SessionDep):
    asset = session.get(StableAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Stable asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}
```

**Step 2: Register in main.py**

```python
from app.routers import funds, holdings, portfolio, position, liquid, stable
# ...
app.include_router(stable.router)
```

**Step 3: Commit**

```bash
git add backend/app/routers/stable.py backend/app/main.py
git commit -m "feat: add stable asset CRUD router"
```

---

### Task 5: Backend — Insurance Policy CRUD Router

**Files:**
- Create: `backend/app/routers/insurance.py`

**Step 1: Create the router file**

```python
import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import InsurancePolicy
from app.schemas import InsurancePolicyCreate, InsurancePolicyUpdate

router = APIRouter(prefix="/api/insurance", tags=["insurance"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_policies(
    session: SessionDep,
    insured_person: str | None = Query(None),
):
    query = select(InsurancePolicy)
    if insured_person:
        query = query.where(InsurancePolicy.insured_person == insured_person)
    policies = session.exec(query).all()
    total_premium = sum(p.annual_premium for p in policies if p.status == "active")
    persons = set(p.insured_person for p in policies if p.status == "active")
    return {
        "items": policies,
        "summary": {
            "total_annual_premium": round(total_premium, 2),
            "active_count": sum(1 for p in policies if p.status == "active"),
            "total_count": len(policies),
            "covered_persons": len(persons),
        },
    }


@router.post("", status_code=201)
def create_policy(data: InsurancePolicyCreate, session: SessionDep):
    policy = InsurancePolicy(**data.model_dump())
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.put("/{policy_id}")
def update_policy(policy_id: int, data: InsurancePolicyUpdate, session: SessionDep):
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(policy, key, value)
    policy.updated_at = dt.datetime.now()
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.delete("/{policy_id}")
def delete_policy(policy_id: int, session: SessionDep):
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    session.delete(policy)
    session.commit()
    return {"ok": True}


@router.post("/{policy_id}/renew")
def renew_policy(policy_id: int, session: SessionDep):
    """Roll next_payment_date forward by one year."""
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    if not policy.next_payment_date:
        raise HTTPException(status_code=422, detail="No next_payment_date set")
    policy.next_payment_date = policy.next_payment_date.replace(
        year=policy.next_payment_date.year + 1
    )
    policy.updated_at = dt.datetime.now()
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy
```

**Step 2: Register in main.py**

```python
from app.routers import funds, holdings, portfolio, position, liquid, stable, insurance
# ...
app.include_router(insurance.router)
```

**Step 3: Commit**

```bash
git add backend/app/routers/insurance.py backend/app/main.py
git commit -m "feat: add insurance policy CRUD router with renew endpoint"
```

---

### Task 6: Backend — Dashboard Summary & Reminders API

**Files:**
- Create: `backend/app/routers/dashboard.py`

**Step 1: Create the dashboard router**

```python
import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Holding,
    Fund,
    FundNavHistory,
    LiquidAsset,
    StableAsset,
    InsurancePolicy,
    PositionBudget,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
SessionDep = Annotated[Session, Depends(get_session)]


def _get_growth_summary(session: Session) -> dict:
    """Calculate long-money (fund) bucket summary."""
    holdings = session.exec(select(Holding)).all()
    total_value = 0.0
    total_cost = 0.0
    for h in holdings:
        nav_row = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
        ).first()
        nav = nav_row.nav if nav_row else None
        if nav is not None:
            total_value += h.shares * nav
        total_cost += h.shares * h.cost_price
    total_pnl = total_value - total_cost
    pnl_percent = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0
    return {
        "total_amount": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
        "count": len(holdings),
    }


@router.get("/summary")
def dashboard_summary(session: SessionDep):
    # Liquid bucket
    liquid_assets = session.exec(select(LiquidAsset)).all()
    liquid_amount = sum(a.amount for a in liquid_assets)
    liquid_return = sum(
        a.amount * (a.annual_rate / 100) for a in liquid_assets if a.annual_rate
    )

    # Stable bucket
    stable_assets = session.exec(select(StableAsset)).all()
    stable_amount = sum(a.amount for a in stable_assets)
    stable_return = sum(a.amount * (a.annual_rate / 100) for a in stable_assets)

    # Growth bucket (funds)
    growth = _get_growth_summary(session)

    # Insurance bucket
    policies = session.exec(select(InsurancePolicy)).all()
    active_policies = [p for p in policies if p.status == "active"]
    total_premium = sum(p.annual_premium for p in active_policies)
    covered_persons = len(set(p.insured_person for p in active_policies))

    # Totals (insurance excluded from asset total)
    total_assets = liquid_amount + stable_amount + growth["total_amount"]
    total_return = liquid_return + stable_return + growth["total_pnl"]

    return {
        "total_assets": round(total_assets, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(
            total_return / (liquid_amount + stable_amount + growth["total_cost"]) * 100, 2
        ) if (liquid_amount + stable_amount + growth["total_cost"]) > 0 else 0.0,
        "buckets": {
            "liquid": {
                "amount": round(liquid_amount, 2),
                "estimated_return": round(liquid_return, 2),
                "count": len(liquid_assets),
            },
            "stable": {
                "amount": round(stable_amount, 2),
                "estimated_return": round(stable_return, 2),
                "count": len(stable_assets),
                "nearest_maturity_days": _nearest_maturity_days(stable_assets),
            },
            "growth": growth,
            "insurance": {
                "active_count": len(active_policies),
                "total_count": len(policies),
                "annual_premium": round(total_premium, 2),
                "covered_persons": covered_persons,
                "nearest_renewal_days": _nearest_renewal_days(active_policies),
            },
        },
    }


def _nearest_maturity_days(assets: list[StableAsset]) -> int | None:
    today = dt.date.today()
    days_list = []
    for a in assets:
        if a.maturity_date and a.maturity_date >= today:
            days_list.append((a.maturity_date - today).days)
    return min(days_list) if days_list else None


def _nearest_renewal_days(policies: list[InsurancePolicy]) -> int | None:
    today = dt.date.today()
    days_list = []
    for p in policies:
        if p.next_payment_date and p.next_payment_date >= today:
            days_list.append((p.next_payment_date - today).days)
    return min(days_list) if days_list else None


@router.get("/reminders")
def dashboard_reminders(session: SessionDep):
    today = dt.date.today()
    reminders = []

    # Insurance renewal reminders
    active_policies = session.exec(
        select(InsurancePolicy).where(InsurancePolicy.status == "active")
    ).all()
    for p in active_policies:
        if not p.next_payment_date:
            continue
        days = (p.next_payment_date - today).days
        if days < 0:
            reminders.append({
                "type": "insurance_renewal",
                "level": "urgent",
                "title": f"保险已逾期续费",
                "detail": f"{p.name}({p.insured_person}) 已逾期{-days}天",
                "days": days,
                "link": "/insurance",
            })
        elif days <= 7:
            reminders.append({
                "type": "insurance_renewal",
                "level": "urgent",
                "title": "保险即将续费",
                "detail": f"{p.name}({p.insured_person}) 还有{days}天",
                "days": days,
                "link": "/insurance",
            })
        elif days <= 30:
            reminders.append({
                "type": "insurance_renewal",
                "level": "warning",
                "title": "保险续费提醒",
                "detail": f"{p.name}({p.insured_person}) 还有{days}天",
                "days": days,
                "link": "/insurance",
            })

    # Stable asset maturity reminders
    stable_assets = session.exec(select(StableAsset)).all()
    for a in stable_assets:
        if not a.maturity_date:
            continue
        days = (a.maturity_date - today).days
        if days < 0:
            reminders.append({
                "type": "stable_maturity",
                "level": "urgent",
                "title": "理财已到期",
                "detail": f"{a.name} 已到期{-days}天，请处理",
                "days": days,
                "link": "/stable",
            })
        elif days <= 7:
            reminders.append({
                "type": "stable_maturity",
                "level": "urgent",
                "title": "理财即将到期",
                "detail": f"{a.name} 还有{days}天到期",
                "days": days,
                "link": "/stable",
            })
        elif days <= 30:
            reminders.append({
                "type": "stable_maturity",
                "level": "warning",
                "title": "理财到期提醒",
                "detail": f"{a.name} 还有{days}天到期",
                "days": days,
                "link": "/stable",
            })

    # Growth money — position warning
    budget = session.exec(select(PositionBudget)).first()
    if budget and budget.total_budget > 0:
        growth = _get_growth_summary(session)
        position_pct = growth["total_amount"] / budget.total_budget * 100
        if position_pct < budget.target_min_position:
            reminders.append({
                "type": "growth_position",
                "level": "warning",
                "title": "长钱仓位偏低",
                "detail": f"当前仓位 {position_pct:.0f}%，低于目标下限 {budget.target_min_position:.0f}%",
                "days": None,
                "link": "/growth/position",
            })
        elif position_pct > budget.target_max_position:
            reminders.append({
                "type": "growth_position",
                "level": "warning",
                "title": "长钱仓位偏高",
                "detail": f"当前仓位 {position_pct:.0f}%，高于目标上限 {budget.target_max_position:.0f}%",
                "days": None,
                "link": "/growth/position",
            })

    # Sort: urgent first, then warning, then info; within same level by days ascending
    level_order = {"urgent": 0, "warning": 1, "info": 2}
    reminders.sort(key=lambda r: (level_order.get(r["level"], 9), r["days"] or 999))

    return reminders
```

**Step 2: Register in main.py**

```python
from app.routers import funds, holdings, portfolio, position, liquid, stable, insurance, dashboard
# ...
app.include_router(dashboard.router)
```

**Step 3: Test manually**

Run: `curl -s http://localhost:8000/api/dashboard/summary | python -m json.tool`
Expected: JSON with `total_assets`, `buckets.liquid`, `buckets.stable`, `buckets.growth`, `buckets.insurance`

Run: `curl -s http://localhost:8000/api/dashboard/reminders | python -m json.tool`
Expected: `[]` (empty list if no data with upcoming dates)

**Step 4: Commit**

```bash
git add backend/app/routers/dashboard.py backend/app/main.py
git commit -m "feat: add dashboard summary and reminders API"
```

---

### Task 7: Frontend — TypeScript Types for New Buckets

**Files:**
- Modify: `frontend/src/types.ts`

**Step 1: Add interfaces**

Append to `frontend/src/types.ts`:

```typescript
// --- Four-Bucket Types ---

export interface LiquidAsset {
  id: number;
  name: string;
  type: string;
  platform: string;
  amount: number;
  annual_rate: number | null;
  updated_at: string;
}

export interface LiquidAssetCreate {
  name: string;
  type: string;
  platform?: string;
  amount?: number;
  annual_rate?: number | null;
}

export interface LiquidAssetUpdate {
  name?: string;
  type?: string;
  platform?: string;
  amount?: number;
  annual_rate?: number | null;
}

export interface LiquidAssetList {
  items: LiquidAsset[];
  summary: {
    total_amount: number;
    estimated_annual_return: number;
    count: number;
  };
}

export interface StableAsset {
  id: number;
  name: string;
  type: string;
  platform: string;
  amount: number;
  annual_rate: number;
  start_date: string | null;
  maturity_date: string | null;
  updated_at: string;
}

export interface StableAssetCreate {
  name: string;
  type: string;
  platform?: string;
  amount?: number;
  annual_rate?: number;
  start_date?: string | null;
  maturity_date?: string | null;
}

export interface StableAssetUpdate {
  name?: string;
  type?: string;
  platform?: string;
  amount?: number;
  annual_rate?: number;
  start_date?: string | null;
  maturity_date?: string | null;
}

export interface StableAssetList {
  items: StableAsset[];
  summary: {
    total_amount: number;
    estimated_annual_return: number;
    count: number;
  };
}

export interface InsurancePolicy {
  id: number;
  name: string;
  type: string;
  insurer: string;
  insured_person: string;
  annual_premium: number;
  coverage_amount: number | null;
  coverage_summary: string | null;
  start_date: string | null;
  end_date: string | null;
  payment_years: number | null;
  next_payment_date: string | null;
  status: string;
  updated_at: string;
}

export interface InsurancePolicyCreate {
  name: string;
  type: string;
  insurer?: string;
  insured_person: string;
  annual_premium?: number;
  coverage_amount?: number | null;
  coverage_summary?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  payment_years?: number | null;
  next_payment_date?: string | null;
  status?: string;
}

export interface InsurancePolicyUpdate {
  name?: string;
  type?: string;
  insurer?: string;
  insured_person?: string;
  annual_premium?: number;
  coverage_amount?: number | null;
  coverage_summary?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  payment_years?: number | null;
  next_payment_date?: string | null;
  status?: string;
}

export interface InsurancePolicyList {
  items: InsurancePolicy[];
  summary: {
    total_annual_premium: number;
    active_count: number;
    total_count: number;
    covered_persons: number;
  };
}

export interface DashboardSummary {
  total_assets: number;
  total_return: number;
  total_return_percent: number;
  buckets: {
    liquid: {
      amount: number;
      estimated_return: number;
      count: number;
    };
    stable: {
      amount: number;
      estimated_return: number;
      count: number;
      nearest_maturity_days: number | null;
    };
    growth: {
      total_amount: number;
      total_cost: number;
      total_pnl: number;
      pnl_percent: number;
      count: number;
    };
    insurance: {
      active_count: number;
      total_count: number;
      annual_premium: number;
      covered_persons: number;
      nearest_renewal_days: number | null;
    };
  };
}

export interface Reminder {
  type: string;
  level: "urgent" | "warning" | "info";
  title: string;
  detail: string;
  days: number | null;
  link: string;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat: add TypeScript types for four-bucket system"
```

---

### Task 8: Frontend — API Service for New Buckets

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: Add API groups for liquid, stable, insurance, dashboard**

Append to `frontend/src/services/api.ts` (add necessary type imports at top):

```typescript
// Add to imports at top:
import type {
  // ... existing imports ...
  LiquidAssetList, LiquidAssetCreate, LiquidAssetUpdate, LiquidAsset,
  StableAssetList, StableAssetCreate, StableAssetUpdate, StableAsset,
  InsurancePolicyList, InsurancePolicyCreate, InsurancePolicyUpdate, InsurancePolicy,
  DashboardSummary, Reminder,
} from "@/types";

// Append these API groups:

export const liquidApi = {
  list: () => api.get<LiquidAssetList>("/liquid").then((r) => r.data),
  create: (data: LiquidAssetCreate) =>
    api.post<LiquidAsset>("/liquid", data).then((r) => r.data),
  update: (id: number, data: LiquidAssetUpdate) =>
    api.put<LiquidAsset>(`/liquid/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/liquid/${id}`),
};

export const stableApi = {
  list: () => api.get<StableAssetList>("/stable").then((r) => r.data),
  create: (data: StableAssetCreate) =>
    api.post<StableAsset>("/stable", data).then((r) => r.data),
  update: (id: number, data: StableAssetUpdate) =>
    api.put<StableAsset>(`/stable/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/stable/${id}`),
};

export const insuranceApi = {
  list: (insuredPerson?: string) =>
    api.get<InsurancePolicyList>("/insurance", { params: { insured_person: insuredPerson } }).then((r) => r.data),
  create: (data: InsurancePolicyCreate) =>
    api.post<InsurancePolicy>("/insurance", data).then((r) => r.data),
  update: (id: number, data: InsurancePolicyUpdate) =>
    api.put<InsurancePolicy>(`/insurance/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/insurance/${id}`),
  renew: (id: number) =>
    api.post<InsurancePolicy>(`/insurance/${id}/renew`).then((r) => r.data),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
  reminders: () => api.get<Reminder[]>("/dashboard/reminders").then((r) => r.data),
};
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add API services for liquid, stable, insurance, dashboard"
```

---

### Task 9: Frontend — Route Restructuring

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Update routes**

Move existing pages under `/growth/*` and add new routes:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import OverviewPage from "@/pages/OverviewPage";
import HoldingsPage from "@/pages/HoldingsPage";
import DataManagementPage from "@/pages/DataManagementPage";
import PositionPage from "@/pages/PositionPage";
import LiquidPage from "@/pages/LiquidPage";
import StablePage from "@/pages/StablePage";
import InsurancePage from "@/pages/InsurancePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/liquid" element={<LiquidPage />} />
          <Route path="/stable" element={<StablePage />} />
          <Route path="/growth/overview" element={<OverviewPage />} />
          <Route path="/growth/holdings" element={<HoldingsPage />} />
          <Route path="/growth/position" element={<PositionPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/data" element={<DataManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 2: Create placeholder pages**

Create three minimal placeholder files so the app compiles:

`frontend/src/pages/DashboardPage.tsx`:
```tsx
export default function DashboardPage() {
  return <div className="space-y-4"><h2 className="text-xl font-semibold">资产总览</h2><p className="text-muted-foreground">Coming soon...</p></div>;
}
```

`frontend/src/pages/LiquidPage.tsx`:
```tsx
export default function LiquidPage() {
  return <div className="space-y-4"><h2 className="text-xl font-semibold">活钱管理</h2><p className="text-muted-foreground">Coming soon...</p></div>;
}
```

`frontend/src/pages/StablePage.tsx`:
```tsx
export default function StablePage() {
  return <div className="space-y-4"><h2 className="text-xl font-semibold">稳钱管理</h2><p className="text-muted-foreground">Coming soon...</p></div>;
}
```

`frontend/src/pages/InsurancePage.tsx`:
```tsx
export default function InsurancePage() {
  return <div className="space-y-4"><h2 className="text-xl font-semibold">保单管理</h2><p className="text-muted-foreground">Coming soon...</p></div>;
}
```

**Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no type errors

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/LiquidPage.tsx frontend/src/pages/StablePage.tsx frontend/src/pages/InsurancePage.tsx
git commit -m "feat: restructure routes for four-bucket architecture"
```

---

### Task 10: Frontend — Sidebar Redesign with Grouped Navigation

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

**Step 1: Redesign sidebar with collapsible bucket groups**

Replace the flat `navItems` array with a grouped structure. Use lucide-react icons:
- `LayoutDashboard` for dashboard
- `Droplets` for liquid
- `Landmark` for stable
- `TrendingUp` for growth
- `Shield` for insurance
- `Database` for data management

The sidebar should:
- Show "资产总览" as a top-level non-collapsible item
- Show four bucket groups (活钱, 稳钱, 长钱, 保险), each collapsible
- "长钱" group expands to show three sub-items (组合概览, 持仓明细, 仓位管理)
- Other groups have one sub-item each for now
- Clicking a group header navigates to the group's main page
- Show "数据管理" at the bottom as a standalone item
- Collapsed sidebar shows only icons (group headers only)
- Active state: highlight if current path starts with the group's prefix

Refer to current sidebar in `frontend/src/components/Sidebar.tsx` for exact styling patterns (`bg-sidebar-accent text-primary font-medium border-l-3 border-primary -ml-0.5` for active, etc.).

**Step 2: Verify visual**

Run: `cd frontend && npm run dev`
Navigate through sidebar items — all routes should render correct pages.

**Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: redesign sidebar with collapsible bucket groups"
```

---

### Task 11: Frontend — Dashboard Page Implementation

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx` (replace placeholder)

**Step 1: Build the full dashboard page**

The page has four sections:

1. **Total assets card** — large number showing `summary.total_assets`, total return with color
2. **Four bucket cards** — grid of 4 cards, each showing bucket-specific metrics. Cards are clickable, navigating to the bucket's management page via `useNavigate()`.
3. **Asset allocation ring chart** — reuse a donut/pie chart (Recharts `PieChart`) showing liquid/stable/growth proportions. Insurance excluded.
4. **Reminders list** — fetch from `/api/dashboard/reminders`, display with level-based colors (urgent=red, warning=yellow, info=blue). Each item clickable, navigating to `reminder.link`.

Data fetching pattern: `useEffect` calling `dashboardApi.summary()` and `dashboardApi.reminders()` in parallel. Show skeleton while loading.

Follow existing UI conventions:
- Page wrapper: `<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">`
- Cards: `<Card className="shadow-sm">` with `hover:shadow-md transition-shadow`
- Stat label: `text-xs font-medium text-muted-foreground tracking-wide mb-1`
- Stat value: `text-2xl font-semibold tracking-tight tabular-nums`
- Currency format: use `formatCurrency()` from `@/lib/utils`
- Profit/loss: positive = `text-red-500`, negative = `text-green-500` (Chinese convention)
- Chart: wrap in `<ChartContainer>` with `ChartConfig`, use `var(--chart-N)` colors

For the ring chart, create it inline or as a small component within the page. Use three data points:
```typescript
const chartData = [
  { name: "活钱", value: summary.buckets.liquid.amount },
  { name: "稳钱", value: summary.buckets.stable.amount },
  { name: "长钱", value: summary.buckets.growth.total_amount },
];
```

**Step 2: Verify visual**

Run dev server, navigate to `/dashboard`. Verify:
- Total assets card renders correctly
- Four bucket cards show data (will be zeros if no data entered)
- Ring chart renders (may be empty with no data)
- Reminders section shows "暂无待办事项" when empty

**Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: implement dashboard page with four-bucket overview"
```

---

### Task 12: Verify Full Integration

**Step 1: Run both servers**

Terminal 1: `cd backend && uvicorn app.main:app --reload`
Terminal 2: `cd frontend && npm run dev`

**Step 2: Smoke test**

1. Open `http://localhost:5173` — should redirect to `/dashboard`
2. Sidebar shows grouped navigation with all buckets
3. Dashboard shows total assets = sum of existing fund holdings value
4. Click "长钱" → navigates to `/growth/overview` — existing overview page works
5. Click "持仓明细" → `/growth/holdings` — existing holdings page works
6. Click "活钱" → `/liquid` — placeholder or management page
7. Click "保险" → `/insurance` — placeholder or management page

**Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: No type errors, clean build

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration fixes for four-bucket phase 1"
```
