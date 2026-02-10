# Fund Portfolio Aggregator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal fund portfolio aggregator with holdings management, asset look-through analysis, and trend tracking.

**Architecture:** Python FastAPI backend with SQLModel/SQLite, React + Tailwind + shadcn/ui frontend. Data fetched from akshare. Three-phase delivery: MVP holdings → look-through → trends.

**Tech Stack:** Python 3.13, FastAPI, SQLModel, APScheduler, akshare, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, recharts, axios, React Router

---

## Phase 1: Core MVP

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`

**Step 1: Create requirements.txt**

```
fastapi[standard]>=0.115.0
sqlmodel>=0.0.22
uvicorn>=0.32.0
akshare>=1.14.0
apscheduler>=3.10.0
httpx>=0.27.0
```

**Step 2: Create database.py**

```python
from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = "sqlite:///./data/finance.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
```

**Step 3: Create main.py**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Fund Portfolio Aggregator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

**Step 4: Create empty __init__.py files**

Empty files for `backend/app/__init__.py`, `backend/app/routers/__init__.py`, `backend/app/services/__init__.py`.

**Step 5: Create data directory**

```bash
mkdir -p data
```

**Step 6: Install dependencies and verify server starts**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
python3 -m uvicorn backend.app.main:app --reload
```

Expected: Server starts, `GET http://localhost:8000/api/health` returns `{"status": "ok"}`

**Step 7: Commit**

```bash
git init
echo "venv/\ndata/finance.db\n__pycache__/\n*.pyc\n.DS_Store\nnode_modules/\ndist/\n.env" > .gitignore
git add .
git commit -m "feat: initialize backend project with FastAPI and SQLite"
```

---

### Task 2: Define Database Models

**Files:**
- Create: `backend/app/models.py`

**Step 1: Create models.py with all SQLModel table definitions**

```python
from datetime import date, datetime

from sqlmodel import Field, SQLModel


class Fund(SQLModel, table=True):
    __tablename__ = "funds"

    fund_code: str = Field(primary_key=True)
    fund_name: str = ""
    fund_type: str = ""
    management_company: str = ""
    last_updated: datetime | None = None


class Holding(SQLModel, table=True):
    __tablename__ = "holdings"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    platform: str
    shares: float
    cost_price: float
    purchase_date: date
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class FundNavHistory(SQLModel, table=True):
    __tablename__ = "fund_nav_history"

    fund_code: str = Field(foreign_key="funds.fund_code", primary_key=True)
    date: date = Field(primary_key=True)
    nav: float


class FundAllocation(SQLModel, table=True):
    __tablename__ = "fund_allocations"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    dimension: str  # asset_class / geography / sector
    category: str
    percentage: float
    source: str = "auto"  # auto / manual
    report_date: date | None = None


class FundTopHolding(SQLModel, table=True):
    __tablename__ = "fund_top_holdings"

    id: int | None = Field(default=None, primary_key=True)
    fund_code: str = Field(foreign_key="funds.fund_code")
    stock_code: str
    stock_name: str
    percentage: float
    report_date: date | None = None


class PortfolioSnapshot(SQLModel, table=True):
    __tablename__ = "portfolio_snapshots"

    date: date = Field(primary_key=True)
    total_value: float
    total_cost: float
    total_pnl: float
```

**Step 2: Import models in database.py so tables are registered**

Add to top of `backend/app/database.py`:

```python
from app import models  # noqa: F401
```

**Step 3: Verify tables are created**

```bash
cd backend && source venv/bin/activate && cd ..
python3 -m uvicorn backend.app.main:app --reload
```

Then in another terminal:
```bash
sqlite3 data/finance.db ".tables"
```

Expected: `fund_allocations  fund_nav_history  fund_top_holdings  funds  holdings  portfolio_snapshots`

**Step 4: Commit**

```bash
git add backend/app/models.py backend/app/database.py
git commit -m "feat: define SQLModel database models for all 6 tables"
```

---

### Task 3: Holdings CRUD API

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/routers/holdings.py`
- Modify: `backend/app/main.py` (register router)

**Step 1: Create schemas.py with Pydantic request/response models**

```python
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
```

**Step 2: Create holdings router**

```python
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Fund, FundNavHistory, Holding
from app.schemas import HoldingCreate, HoldingResponse, HoldingUpdate

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
    # Ensure fund exists in our cache (create placeholder if not)
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
```

**Step 3: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import holdings

app.include_router(holdings.router)
```

**Step 4: Verify API works**

```bash
# Create a holding
curl -X POST http://localhost:8000/api/holdings \
  -H "Content-Type: application/json" \
  -d '{"fund_code":"000001","platform":"支付宝","shares":1000,"cost_price":1.5,"purchase_date":"2024-01-15"}'

# List holdings
curl http://localhost:8000/api/holdings
```

Expected: 201 response with holding data, then GET returns list with that holding.

**Step 5: Commit**

```bash
git add backend/app/schemas.py backend/app/routers/holdings.py backend/app/main.py
git commit -m "feat: add holdings CRUD API endpoints"
```

---

### Task 4: Fund Data Service (akshare Integration)

**Files:**
- Create: `backend/app/services/fund_data.py`
- Create: `backend/app/routers/funds.py`
- Modify: `backend/app/main.py` (register router)

**Step 1: Create fund_data.py service**

```python
from datetime import date, datetime

import akshare as ak
from sqlmodel import Session

from app.models import Fund, FundNavHistory


def fetch_fund_info(fund_code: str, session: Session) -> Fund:
    """Fetch fund metadata from akshare and update database."""
    fund = session.get(Fund, fund_code)
    if not fund:
        fund = Fund(fund_code=fund_code)

    try:
        # Get fund name list from Eastmoney
        df = ak.fund_name_em()
        row = df[df["基金代码"] == fund_code]
        if not row.empty:
            fund.fund_name = str(row.iloc[0]["基金简称"])
            fund.fund_type = str(row.iloc[0]["基金类型"])
    except Exception:
        pass  # Keep existing data if fetch fails

    fund.last_updated = datetime.now()
    session.add(fund)
    session.commit()
    session.refresh(fund)
    return fund


def fetch_fund_nav(fund_code: str, session: Session) -> None:
    """Fetch historical NAV data and store in database."""
    try:
        df = ak.fund_open_fund_info_em(symbol=fund_code, indicator="单位净值走势")
        for _, row in df.iterrows():
            nav_date = row["净值日期"]
            if isinstance(nav_date, str):
                nav_date = date.fromisoformat(nav_date)
            elif hasattr(nav_date, "date"):
                nav_date = nav_date.date()

            existing = session.get(FundNavHistory, (fund_code, nav_date))
            if not existing:
                record = FundNavHistory(
                    fund_code=fund_code,
                    date=nav_date,
                    nav=float(row["单位净值"]),
                )
                session.add(record)
        session.commit()
    except Exception:
        session.rollback()
```

**Step 2: Create funds router**

```python
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Fund, FundNavHistory
from app.services.fund_data import fetch_fund_info, fetch_fund_nav

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
    start: date | None = Query(None),
    end: date | None = Query(None),
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
    return {"ok": True, "fund_name": fund.fund_name}
```

**Step 3: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import funds

app.include_router(funds.router)
```

**Step 4: Verify fund data fetch works**

```bash
# Refresh a fund (fetches metadata + NAV history)
curl -X POST http://localhost:8000/api/funds/000001/refresh

# Get fund info
curl http://localhost:8000/api/funds/000001

# Get NAV history
curl "http://localhost:8000/api/funds/000001/nav-history?start=2024-01-01&end=2024-12-31"
```

Expected: Fund metadata populated, NAV history records returned.

**Step 5: Commit**

```bash
git add backend/app/services/fund_data.py backend/app/routers/funds.py backend/app/main.py
git commit -m "feat: add fund data service with akshare integration"
```

---

### Task 5: Portfolio Summary API

**Files:**
- Create: `backend/app/routers/portfolio.py`
- Modify: `backend/app/main.py` (register router)

**Step 1: Create portfolio router with summary and by-platform endpoints**

```python
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FundNavHistory, Holding

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

SessionDep = Annotated[Session, Depends(get_session)]


def _get_latest_nav(fund_code: str, session: Session) -> float | None:
    record = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()
    return record.nav if record else None


@router.get("/summary")
def portfolio_summary(session: SessionDep):
    holdings = session.exec(select(Holding)).all()

    total_value = 0.0
    total_cost = 0.0

    for h in holdings:
        cost = h.shares * h.cost_price
        total_cost += cost
        nav = _get_latest_nav(h.fund_code, session)
        if nav:
            total_value += h.shares * nav

    total_pnl = total_value - total_cost
    pnl_percent = (total_pnl / total_cost * 100) if total_cost else 0

    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
    }


@router.get("/by-platform")
def portfolio_by_platform(session: SessionDep):
    holdings = session.exec(select(Holding)).all()

    platforms: dict[str, dict] = {}
    for h in holdings:
        nav = _get_latest_nav(h.fund_code, session)
        market_value = h.shares * nav if nav else 0
        cost = h.shares * h.cost_price

        if h.platform not in platforms:
            platforms[h.platform] = {"platform": h.platform, "market_value": 0, "cost": 0, "count": 0}

        platforms[h.platform]["market_value"] += market_value
        platforms[h.platform]["cost"] += cost
        platforms[h.platform]["count"] += 1

    result = list(platforms.values())
    for p in result:
        p["market_value"] = round(p["market_value"], 2)
        p["cost"] = round(p["cost"], 2)
        p["pnl"] = round(p["market_value"] - p["cost"], 2)

    return result
```

**Step 2: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import portfolio

app.include_router(portfolio.router)
```

**Step 3: Verify**

```bash
curl http://localhost:8000/api/portfolio/summary
curl http://localhost:8000/api/portfolio/by-platform
```

**Step 4: Commit**

```bash
git add backend/app/routers/portfolio.py backend/app/main.py
git commit -m "feat: add portfolio summary and by-platform API endpoints"
```

---

### Task 6: Initialize Frontend Project

**Files:**
- Create: `frontend/` (entire Vite project)

**Step 1: Create Vite React TypeScript project**

```bash
cd /Users/liulingfeng/finance_mgr
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Install Tailwind CSS**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Add Tailwind plugin to `frontend/vite.config.ts`:

```typescript
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
```

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: TypeScript, Default style, Neutral color, CSS variables, `@/` alias.

**Step 4: Add core shadcn/ui components**

```bash
npx shadcn@latest add button card dialog form input label select table tabs
```

**Step 5: Install additional dependencies**

```bash
npm install recharts axios react-router-dom
npm install -D @types/react-router-dom
```

**Step 6: Verify frontend starts**

```bash
npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173`

**Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: initialize frontend with React, Tailwind, shadcn/ui"
```

---

### Task 7: API Client and Router Setup

**Files:**
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/types.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: Create types.ts**

```typescript
export interface Holding {
  id: number;
  fund_code: string;
  fund_name: string;
  platform: string;
  shares: number;
  cost_price: number;
  purchase_date: string;
  latest_nav: number | null;
  market_value: number | null;
  pnl: number | null;
  pnl_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface HoldingCreate {
  fund_code: string;
  platform: string;
  shares: number;
  cost_price: number;
  purchase_date: string;
}

export interface HoldingUpdate {
  platform?: string;
  shares?: number;
  cost_price?: number;
  purchase_date?: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  pnl_percent: number;
}

export interface PlatformBreakdown {
  platform: string;
  market_value: number;
  cost: number;
  pnl: number;
  count: number;
}

export interface FundInfo {
  fund_code: string;
  fund_name: string;
  fund_type: string;
  management_company: string;
  latest_nav: number | null;
  latest_nav_date: string | null;
}

export interface NavHistory {
  date: string;
  nav: number;
}
```

**Step 2: Create api.ts**

```typescript
import axios from "axios";
import type {
  FundInfo,
  Holding,
  HoldingCreate,
  HoldingUpdate,
  NavHistory,
  PlatformBreakdown,
  PortfolioSummary,
} from "@/types";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

export const holdingsApi = {
  list: () => api.get<Holding[]>("/holdings").then((r) => r.data),
  create: (data: HoldingCreate) =>
    api.post<Holding>("/holdings", data).then((r) => r.data),
  update: (id: number, data: HoldingUpdate) =>
    api.put<Holding>(`/holdings/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/holdings/${id}`),
};

export const fundsApi = {
  get: (code: string) =>
    api.get<FundInfo>(`/funds/${code}`).then((r) => r.data),
  navHistory: (code: string, start?: string, end?: string) =>
    api
      .get<NavHistory[]>(`/funds/${code}/nav-history`, {
        params: { start, end },
      })
      .then((r) => r.data),
  refresh: (code: string) =>
    api.post(`/funds/${code}/refresh`).then((r) => r.data),
};

export const portfolioApi = {
  summary: () =>
    api.get<PortfolioSummary>("/portfolio/summary").then((r) => r.data),
  byPlatform: () =>
    api.get<PlatformBreakdown[]>("/portfolio/by-platform").then((r) => r.data),
};
```

**Step 3: Set up React Router in App.tsx**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import OverviewPage from "@/pages/OverviewPage";
import HoldingsPage from "@/pages/HoldingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 4: Create Layout component**

Create `frontend/src/components/Layout.tsx`:

```tsx
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "组合概览", path: "/overview" },
  { label: "持仓明细", path: "/holdings" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold mr-8">基金管家</h1>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  location.pathname === item.path
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 5: Create placeholder pages**

Create `frontend/src/pages/OverviewPage.tsx`:

```tsx
export default function OverviewPage() {
  return <div>Overview - coming soon</div>;
}
```

Create `frontend/src/pages/HoldingsPage.tsx`:

```tsx
export default function HoldingsPage() {
  return <div>Holdings - coming soon</div>;
}
```

**Step 6: Verify routing works**

```bash
cd frontend && npm run dev
```

Expected: App loads, nav bar shows, links navigate between pages.

**Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add API client, types, router, and layout component"
```

---

### Task 8: Holdings List Page

**Files:**
- Modify: `frontend/src/pages/HoldingsPage.tsx`
- Create: `frontend/src/components/AddHoldingDialog.tsx`

**Step 1: Build AddHoldingDialog component**

Create `frontend/src/components/AddHoldingDialog.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { holdingsApi } from "@/services/api";
import type { HoldingCreate } from "@/types";

interface Props {
  onCreated: () => void;
}

export default function AddHoldingDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<HoldingCreate>({
    fund_code: "",
    platform: "",
    shares: 0,
    cost_price: 0,
    purchase_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await holdingsApi.create(form);
      setOpen(false);
      setForm({ fund_code: "", platform: "", shares: 0, cost_price: 0, purchase_date: "" });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加持仓</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加基金持仓</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>基金代码</Label>
            <Input
              value={form.fund_code}
              onChange={(e) => setForm({ ...form, fund_code: e.target.value })}
              placeholder="例如 000001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>购买平台</Label>
            <Input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="例如 支付宝"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>持有份额</Label>
              <Input
                type="number"
                step="0.01"
                value={form.shares || ""}
                onChange={(e) => setForm({ ...form, shares: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>买入均价</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.cost_price || ""}
                onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>购买日期</Label>
            <Input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "添加中..." : "确认添加"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Build HoldingsPage with data table**

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import { holdingsApi, fundsApi } from "@/services/api";
import type { Holding } from "@/types";

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await holdingsApi.list();
      setHoldings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const handleRefresh = async (fundCode: string) => {
    await fundsApi.refresh(fundCode);
    await fetchHoldings();
  };

  const handleDelete = async (id: number) => {
    await holdingsApi.delete(id);
    await fetchHoldings();
  };

  const formatCurrency = (val: number | null) =>
    val != null ? `¥${val.toFixed(2)}` : "-";

  const formatPercent = (val: number | null) =>
    val != null ? `${val.toFixed(2)}%` : "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">持仓明细</h2>
        <AddHoldingDialog onCreated={fetchHoldings} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>基金名称</TableHead>
                <TableHead>基金代码</TableHead>
                <TableHead>平台</TableHead>
                <TableHead className="text-right">份额</TableHead>
                <TableHead className="text-right">最新净值</TableHead>
                <TableHead className="text-right">市值</TableHead>
                <TableHead className="text-right">成本</TableHead>
                <TableHead className="text-right">盈亏</TableHead>
                <TableHead className="text-right">盈亏%</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.fund_name || h.fund_code}</TableCell>
                  <TableCell>{h.fund_code}</TableCell>
                  <TableCell>{h.platform}</TableCell>
                  <TableCell className="text-right">{h.shares.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {h.latest_nav?.toFixed(4) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(h.market_value)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(h.shares * h.cost_price)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.pnl != null && h.pnl >= 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatCurrency(h.pnl)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      h.pnl_percent != null && h.pnl_percent >= 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {formatPercent(h.pnl_percent)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefresh(h.fund_code)}
                      >
                        刷新
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(h.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {holdings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    暂无持仓，点击"添加持仓"开始
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify end-to-end**

Start both backend and frontend, add a holding via the UI, click refresh to fetch NAV data, verify table shows values.

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add holdings list page with add/delete functionality"
```

---

### Task 9: Portfolio Overview Page (MVP)

**Files:**
- Modify: `frontend/src/pages/OverviewPage.tsx`

**Step 1: Build OverviewPage with summary cards and platform chart**

```tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { portfolioApi } from "@/services/api";
import type { PlatformBreakdown, PortfolioSummary } from "@/types";

const platformChartConfig = {
  market_value: { label: "市值", color: "var(--chart-1)" },
  cost: { label: "成本", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function OverviewPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);

  useEffect(() => {
    portfolioApi.summary().then(setSummary);
    portfolioApi.byPlatform().then(setPlatforms);
  }, []);

  if (!summary) return <div className="text-muted-foreground">加载中...</div>;

  const isProfit = summary.total_pnl >= 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">组合概览</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总市值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.total_value.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总成本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.total_cost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}¥{summary.total_pnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? "text-red-500" : "text-green-500"}`}>
              {isProfit ? "+" : ""}{summary.pnl_percent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>平台分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={platformChartConfig} className="h-[300px] w-full">
              <BarChart data={platforms}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="platform" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="market_value" fill="var(--color-market_value)" radius={4} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Add chart component from shadcn**

```bash
cd frontend && npx shadcn@latest add chart
```

**Step 3: Verify overview page shows summary cards and platform bar chart**

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add portfolio overview page with summary cards and platform chart"
```

---

## Phase 2: Look-through Analysis

### Task 10: Allocation Data Fetching Service

**Files:**
- Create: `backend/app/services/allocation.py`
- Modify: `backend/app/services/fund_data.py` (add allocation fetch)

**Step 1: Create allocation.py with weighted look-through calculation**

```python
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FundAllocation, FundNavHistory, Holding

SessionDep = Annotated[Session, Depends(get_session)]


def get_weighted_allocation(dimension: str, session: Session) -> list[dict]:
    """Calculate portfolio-level allocation by weighting each fund's allocation by its market value."""
    holdings = session.exec(select(Holding)).all()

    # Calculate each holding's market value
    fund_weights: dict[str, float] = {}
    total_value = 0.0
    for h in holdings:
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            mv = h.shares * nav_record.nav
            fund_weights[h.fund_code] = fund_weights.get(h.fund_code, 0) + mv
            total_value += mv

    if total_value == 0:
        return []

    # Aggregate allocations weighted by market value
    category_totals: dict[str, float] = {}
    for fund_code, market_value in fund_weights.items():
        weight = market_value / total_value
        allocations = session.exec(
            select(FundAllocation)
            .where(FundAllocation.fund_code == fund_code)
            .where(FundAllocation.dimension == dimension)
        ).all()
        for a in allocations:
            category_totals[a.category] = category_totals.get(a.category, 0) + a.percentage * weight

    result = [
        {"category": cat, "percentage": round(pct, 2)}
        for cat, pct in sorted(category_totals.items(), key=lambda x: -x[1])
    ]
    return result
```

**Step 2: Add allocation fetch to fund_data.py**

Add to `backend/app/services/fund_data.py`:

```python
from app.models import FundAllocation, FundTopHolding


def fetch_fund_allocation(fund_code: str, session: Session) -> None:
    """Fetch asset allocation and top holdings from akshare."""
    current_year = str(date.today().year)
    prev_year = str(date.today().year - 1)

    # Fetch asset class allocation (from Xueqiu)
    try:
        # Try latest quarter dates
        for quarter_date in _recent_quarter_dates():
            try:
                df = ak.fund_individual_detail_hold_xq(symbol=fund_code, date=quarter_date)
                if not df.empty:
                    _save_allocations(fund_code, "asset_class", df, "资产类型", "仓位占比", quarter_date, session)
                    break
            except Exception:
                continue
    except Exception:
        pass

    # Fetch sector/industry allocation
    try:
        for year in [current_year, prev_year]:
            try:
                df = ak.fund_portfolio_industry_allocation_em(symbol=fund_code, date=year)
                if not df.empty:
                    report_date_str = str(df.iloc[0].get("截止时间", ""))
                    _save_allocations_from_industry(fund_code, df, report_date_str, session)
                    break
            except Exception:
                continue
    except Exception:
        pass

    # Fetch top stock holdings
    try:
        for year in [current_year, prev_year]:
            try:
                df = ak.fund_portfolio_hold_em(symbol=fund_code, date=year)
                if not df.empty:
                    _save_top_holdings(fund_code, df, session)
                    break
            except Exception:
                continue
    except Exception:
        pass

    session.commit()


def _recent_quarter_dates() -> list[str]:
    """Return recent quarter-end dates as strings like '20241231'."""
    today = date.today()
    quarters = []
    year = today.year
    for q_month, q_day in [(12, 31), (9, 30), (6, 30), (3, 31)]:
        d = date(year, q_month, q_day)
        if d <= today:
            quarters.append(d.strftime("%Y%m%d"))
    # Also add previous year quarters
    for q_month, q_day in [(12, 31), (9, 30), (6, 30), (3, 31)]:
        quarters.append(date(year - 1, q_month, q_day).strftime("%Y%m%d"))
    return quarters


def _save_allocations(fund_code: str, dimension: str, df, type_col: str, pct_col: str, report_date_str: str, session: Session):
    report_date_val = date(int(report_date_str[:4]), int(report_date_str[4:6]), int(report_date_str[6:8]))
    # Clear old auto records for this dimension
    old = session.exec(
        select(FundAllocation)
        .where(FundAllocation.fund_code == fund_code)
        .where(FundAllocation.dimension == dimension)
        .where(FundAllocation.source == "auto")
    ).all()
    for o in old:
        session.delete(o)

    for _, row in df.iterrows():
        session.add(FundAllocation(
            fund_code=fund_code,
            dimension=dimension,
            category=str(row[type_col]),
            percentage=float(row[pct_col]),
            source="auto",
            report_date=report_date_val,
        ))


def _save_allocations_from_industry(fund_code: str, df, report_date_str: str, session: Session):
    old = session.exec(
        select(FundAllocation)
        .where(FundAllocation.fund_code == fund_code)
        .where(FundAllocation.dimension == "sector")
        .where(FundAllocation.source == "auto")
    ).all()
    for o in old:
        session.delete(o)

    for _, row in df.iterrows():
        report_date_val = None
        if report_date_str:
            try:
                report_date_val = date.fromisoformat(report_date_str)
            except ValueError:
                pass
        session.add(FundAllocation(
            fund_code=fund_code,
            dimension="sector",
            category=str(row["行业类别"]),
            percentage=float(row["占净值比例"]),
            source="auto",
            report_date=report_date_val,
        ))


def _save_top_holdings(fund_code: str, df, session: Session):
    old = session.exec(
        select(FundTopHolding).where(FundTopHolding.fund_code == fund_code)
    ).all()
    for o in old:
        session.delete(o)

    # Only save top 10 from the most recent quarter
    latest_quarter = df.iloc[0]["季度"] if "季度" in df.columns else ""
    recent = df[df["季度"] == latest_quarter].head(10) if latest_quarter else df.head(10)

    for _, row in recent.iterrows():
        session.add(FundTopHolding(
            fund_code=fund_code,
            stock_code=str(row["股票代码"]),
            stock_name=str(row["股票名称"]),
            percentage=float(row["占净值比例"]),
        ))
```

**Step 3: Update refresh endpoint to also fetch allocations**

In `backend/app/routers/funds.py`, update:

```python
from app.services.fund_data import fetch_fund_info, fetch_fund_nav, fetch_fund_allocation

@router.post("/{fund_code}/refresh")
def refresh_fund(fund_code: str, session: SessionDep):
    fund = fetch_fund_info(fund_code, session)
    fetch_fund_nav(fund_code, session)
    fetch_fund_allocation(fund_code, session)
    return {"ok": True, "fund_name": fund.fund_name}
```

**Step 4: Commit**

```bash
git add backend/app/services/ backend/app/routers/funds.py
git commit -m "feat: add allocation data fetching and weighted look-through calculation"
```

---

### Task 11: Allocation & Top Holdings API Endpoints

**Files:**
- Modify: `backend/app/routers/portfolio.py` (add allocation endpoint)
- Modify: `backend/app/routers/funds.py` (add per-fund allocation + top holdings + manual override)

**Step 1: Add portfolio allocation endpoint**

Add to `backend/app/routers/portfolio.py`:

```python
from app.services.allocation import get_weighted_allocation

@router.get("/allocation")
def portfolio_allocation(dimension: str, session: SessionDep):
    return get_weighted_allocation(dimension, session)
```

**Step 2: Add per-fund allocation and top holdings to funds router**

Add to `backend/app/routers/funds.py`:

```python
from app.models import FundAllocation, FundTopHolding

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
```

**Step 3: Verify**

```bash
curl "http://localhost:8000/api/portfolio/allocation?dimension=asset_class"
curl http://localhost:8000/api/funds/000001/allocation
curl http://localhost:8000/api/funds/000001/top-holdings
```

**Step 4: Commit**

```bash
git add backend/app/routers/
git commit -m "feat: add allocation and top holdings API endpoints"
```

---

### Task 12: Frontend Allocation Charts

**Files:**
- Modify: `frontend/src/pages/OverviewPage.tsx` (add donut charts)
- Modify: `frontend/src/services/api.ts` (add allocation API)
- Modify: `frontend/src/types.ts` (add allocation types)

**Step 1: Add types**

Add to `frontend/src/types.ts`:

```typescript
export interface AllocationItem {
  category: string;
  percentage: number;
}

export interface FundAllocation {
  [dimension: string]: AllocationItem[];
}

export interface TopHolding {
  stock_code: string;
  stock_name: string;
  percentage: number;
}
```

**Step 2: Add API methods**

Add to `frontend/src/services/api.ts`:

```typescript
import type { AllocationItem, FundAllocation, TopHolding } from "@/types";

// Add to portfolioApi:
export const portfolioApi = {
  // ...existing methods...
  allocation: (dimension: string) =>
    api.get<AllocationItem[]>("/portfolio/allocation", { params: { dimension } }).then((r) => r.data),
};

// Add to fundsApi:
export const fundsApi = {
  // ...existing methods...
  allocation: (code: string) =>
    api.get<FundAllocation>(`/funds/${code}/allocation`).then((r) => r.data),
  topHoldings: (code: string) =>
    api.get<TopHolding[]>(`/funds/${code}/top-holdings`).then((r) => r.data),
};
```

**Step 3: Create AllocationChart reusable component**

Create `frontend/src/components/AllocationChart.tsx`:

```tsx
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AllocationItem } from "@/types";

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
  "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

interface Props {
  title: string;
  data: AllocationItem[];
}

export default function AllocationChart({ title, data }: Props) {
  const chartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.category,
      { label: item.category, color: COLORS[i % COLORS.length] },
    ])
  ) satisfies ChartConfig;

  const chartData = data.map((item, i) => ({
    name: item.category,
    value: item.percentage,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="mt-2 space-y-1">
          {data.slice(0, 5).map((item, i) => (
            <div key={item.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.category}</span>
              </div>
              <span>{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Add donut charts to OverviewPage**

Add allocation state and charts to `OverviewPage.tsx`:

```tsx
import AllocationChart from "@/components/AllocationChart";
import type { AllocationItem } from "@/types";

// In component, add state:
const [assetAlloc, setAssetAlloc] = useState<AllocationItem[]>([]);
const [geoAlloc, setGeoAlloc] = useState<AllocationItem[]>([]);
const [sectorAlloc, setSectorAlloc] = useState<AllocationItem[]>([]);

// In useEffect, add:
portfolioApi.allocation("asset_class").then(setAssetAlloc);
portfolioApi.allocation("geography").then(setGeoAlloc);
portfolioApi.allocation("sector").then(setSectorAlloc);

// In JSX, add after summary cards:
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <AllocationChart title="资产类别" data={assetAlloc} />
  <AllocationChart title="地域分布" data={geoAlloc} />
  <AllocationChart title="行业分布" data={sectorAlloc} />
</div>
```

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add allocation donut charts to overview page"
```

---

### Task 13: Fund Detail Page

**Files:**
- Create: `frontend/src/pages/FundDetailPage.tsx`
- Modify: `frontend/src/App.tsx` (add route)

**Step 1: Create FundDetailPage**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import AllocationChart from "@/components/AllocationChart";
import { fundsApi } from "@/services/api";
import type { AllocationItem, FundInfo, NavHistory, TopHolding } from "@/types";

const navChartConfig = {
  nav: { label: "单位净值", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function FundDetailPage() {
  const { fundCode } = useParams<{ fundCode: string }>();
  const [fund, setFund] = useState<FundInfo | null>(null);
  const [navHistory, setNavHistory] = useState<NavHistory[]>([]);
  const [allocation, setAllocation] = useState<Record<string, AllocationItem[]>>({});
  const [topHoldings, setTopHoldings] = useState<TopHolding[]>([]);

  useEffect(() => {
    if (!fundCode) return;
    fundsApi.get(fundCode).then(setFund);
    fundsApi.navHistory(fundCode).then(setNavHistory);
    fundsApi.allocation(fundCode).then(setAllocation);
    fundsApi.topHoldings(fundCode).then(setTopHoldings);
  }, [fundCode]);

  if (!fund) return <div className="text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{fund.fund_name || fund.fund_code}</h2>
        <p className="text-muted-foreground">
          {fund.fund_code} · {fund.fund_type} · {fund.management_company}
        </p>
      </div>

      {navHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>净值走势</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={navChartConfig} className="h-[300px] w-full">
              <LineChart data={navHistory}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="nav" stroke="var(--color-nav)" dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allocation.asset_class && <AllocationChart title="资产类别" data={allocation.asset_class} />}
        {allocation.geography && <AllocationChart title="地域分布" data={allocation.geography} />}
        {allocation.sector && <AllocationChart title="行业分布" data={allocation.sector} />}
      </div>

      {topHoldings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>前十大持仓</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>股票代码</TableHead>
                  <TableHead>股票名称</TableHead>
                  <TableHead className="text-right">占净值比</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHoldings.map((h) => (
                  <TableRow key={h.stock_code}>
                    <TableCell>{h.stock_code}</TableCell>
                    <TableCell>{h.stock_name}</TableCell>
                    <TableCell className="text-right">{h.percentage.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 2: Add route in App.tsx**

```tsx
import FundDetailPage from "@/pages/FundDetailPage";

// Add inside Routes:
<Route path="/fund/:fundCode" element={<FundDetailPage />} />
```

**Step 3: Add link from HoldingsPage fund name to detail page**

In `HoldingsPage.tsx`, wrap fund name in a Link:

```tsx
import { Link } from "react-router-dom";

// Replace fund name cell:
<TableCell className="font-medium">
  <Link to={`/fund/${h.fund_code}`} className="hover:underline">
    {h.fund_name || h.fund_code}
  </Link>
</TableCell>
```

**Step 4: Add nav item for fund detail (breadcrumb will suffice, no nav entry needed)**

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add fund detail page with NAV chart, allocations, and top holdings"
```

---

## Phase 3: Trend & Polish

### Task 14: Daily Snapshot Scheduler

**Files:**
- Create: `backend/app/services/snapshot.py`
- Create: `backend/app/scheduler.py`
- Modify: `backend/app/main.py` (start scheduler in lifespan)

**Step 1: Create snapshot.py**

```python
from datetime import date

from sqlmodel import Session, select

from app.models import FundNavHistory, Holding, PortfolioSnapshot


def take_portfolio_snapshot(session: Session) -> None:
    """Calculate and store today's portfolio value snapshot."""
    holdings = session.exec(select(Holding)).all()

    total_value = 0.0
    total_cost = 0.0

    for h in holdings:
        total_cost += h.shares * h.cost_price
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == h.fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()
        if nav_record:
            total_value += h.shares * nav_record.nav

    today = date.today()
    existing = session.get(PortfolioSnapshot, today)
    if existing:
        existing.total_value = total_value
        existing.total_cost = total_cost
        existing.total_pnl = total_value - total_cost
        session.add(existing)
    else:
        session.add(PortfolioSnapshot(
            date=today,
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            total_pnl=round(total_value - total_cost, 2),
        ))
    session.commit()
```

**Step 2: Create scheduler.py**

```python
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session

from app.database import engine
from app.models import Holding
from app.services.fund_data import fetch_fund_nav
from app.services.snapshot import take_portfolio_snapshot


def _daily_update():
    with Session(engine) as session:
        # Get all unique fund codes
        holdings = session.exec(
            __import__("sqlmodel").select(Holding)
        ).all()
        fund_codes = set(h.fund_code for h in holdings)

        # Refresh NAV for each fund
        for code in fund_codes:
            try:
                fetch_fund_nav(code, session)
            except Exception:
                pass

        # Take portfolio snapshot
        take_portfolio_snapshot(session)


scheduler = BackgroundScheduler()
scheduler.add_job(_daily_update, "cron", hour=20, minute=0)  # Run at 8 PM daily (after market close)
```

**Step 3: Start scheduler in main.py lifespan**

Update `backend/app/main.py`:

```python
from app.scheduler import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    scheduler.start()
    yield
    scheduler.shutdown()
```

**Step 4: Commit**

```bash
git add backend/app/services/snapshot.py backend/app/scheduler.py backend/app/main.py
git commit -m "feat: add daily NAV update scheduler and portfolio snapshot"
```

---

### Task 15: Portfolio Trend API & Chart

**Files:**
- Modify: `backend/app/routers/portfolio.py` (add trend endpoint)
- Modify: `frontend/src/services/api.ts` (add trend API)
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/pages/OverviewPage.tsx` (add trend chart)

**Step 1: Add trend endpoint to portfolio router**

Add to `backend/app/routers/portfolio.py`:

```python
from app.models import PortfolioSnapshot

@router.get("/trend")
def portfolio_trend(
    session: SessionDep,
    start: date | None = Query(None),
    end: date | None = Query(None),
):
    query = select(PortfolioSnapshot)
    if start:
        query = query.where(PortfolioSnapshot.date >= start)
    if end:
        query = query.where(PortfolioSnapshot.date <= end)
    query = query.order_by(PortfolioSnapshot.date)

    records = session.exec(query).all()
    return [
        {
            "date": str(r.date),
            "total_value": r.total_value,
            "total_cost": r.total_cost,
            "total_pnl": r.total_pnl,
        }
        for r in records
    ]
```

**Step 2: Add type and API method on frontend**

Add to `types.ts`:

```typescript
export interface PortfolioTrend {
  date: string;
  total_value: number;
  total_cost: number;
  total_pnl: number;
}
```

Add to `api.ts` portfolioApi:

```typescript
trend: (start?: string, end?: string) =>
  api.get<PortfolioTrend[]>("/portfolio/trend", { params: { start, end } }).then((r) => r.data),
```

**Step 3: Add trend line chart to OverviewPage**

Add after allocation charts in `OverviewPage.tsx`:

```tsx
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { PortfolioTrend } from "@/types";

// State:
const [trend, setTrend] = useState<PortfolioTrend[]>([]);

// useEffect:
portfolioApi.trend().then(setTrend);

// JSX:
{trend.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>组合走势</CardTitle>
    </CardHeader>
    <CardContent>
      <ChartContainer
        config={{
          total_value: { label: "总市值", color: "var(--chart-1)" },
          total_cost: { label: "总成本", color: "var(--chart-2)" },
        }}
        className="h-[300px] w-full"
      >
        <LineChart data={trend}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="total_value" stroke="var(--color-total_value)" dot={false} />
          <Line type="monotone" dataKey="total_cost" stroke="var(--color-total_cost)" dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ChartContainer>
    </CardContent>
  </Card>
)}
```

**Step 4: Commit**

```bash
git add backend/app/routers/portfolio.py frontend/src/
git commit -m "feat: add portfolio trend API and line chart"
```

---

### Task 16: Data Management Page

**Files:**
- Create: `frontend/src/pages/DataManagementPage.tsx`
- Modify: `frontend/src/App.tsx` (add route)
- Modify: `frontend/src/components/Layout.tsx` (add nav item)

**Step 1: Create DataManagementPage**

```tsx
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { holdingsApi, fundsApi } from "@/services/api";
import type { Holding } from "@/types";

export default function DataManagementPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [refreshAll, setRefreshAll] = useState(false);

  const fetchHoldings = useCallback(async () => {
    const data = await holdingsApi.list();
    setHoldings(data);
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const uniqueFunds = [...new Map(holdings.map((h) => [h.fund_code, h])).values()];

  const handleRefreshOne = async (fundCode: string) => {
    setRefreshing((prev) => new Set(prev).add(fundCode));
    try {
      await fundsApi.refresh(fundCode);
      await fetchHoldings();
    } finally {
      setRefreshing((prev) => {
        const next = new Set(prev);
        next.delete(fundCode);
        return next;
      });
    }
  };

  const handleRefreshAll = async () => {
    setRefreshAll(true);
    try {
      for (const f of uniqueFunds) {
        await fundsApi.refresh(f.fund_code);
      }
      await fetchHoldings();
    } finally {
      setRefreshAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">数据管理</h2>
        <Button onClick={handleRefreshAll} disabled={refreshAll}>
          {refreshAll ? "刷新中..." : "刷新全部基金"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基金数据状态</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>基金代码</TableHead>
                <TableHead>基金名称</TableHead>
                <TableHead>最新净值</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueFunds.map((f) => (
                <TableRow key={f.fund_code}>
                  <TableCell>{f.fund_code}</TableCell>
                  <TableCell>{f.fund_name || "-"}</TableCell>
                  <TableCell>{f.latest_nav?.toFixed(4) ?? "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={refreshing.has(f.fund_code)}
                      onClick={() => handleRefreshOne(f.fund_code)}
                    >
                      {refreshing.has(f.fund_code) ? "刷新中..." : "刷新"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Add route in App.tsx**

```tsx
import DataManagementPage from "@/pages/DataManagementPage";

// Add route:
<Route path="/data" element={<DataManagementPage />} />
```

**Step 3: Add nav item in Layout.tsx**

```tsx
const navItems = [
  { label: "组合概览", path: "/overview" },
  { label: "持仓明细", path: "/holdings" },
  { label: "数据管理", path: "/data" },
];
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add data management page with per-fund refresh"
```

---

### Task 17: Final Integration Verification

**Step 1: Start backend**

```bash
cd /Users/liulingfeng/finance_mgr/backend
source venv/bin/activate
cd ..
python3 -m uvicorn backend.app.main:app --reload
```

**Step 2: Start frontend**

```bash
cd /Users/liulingfeng/finance_mgr/frontend
npm run dev
```

**Step 3: End-to-end test checklist**

- [ ] Add a holding via Holdings page
- [ ] Click "刷新" to fetch fund data from akshare
- [ ] Verify NAV and P&L columns populate
- [ ] Navigate to Overview page — verify summary cards show correct totals
- [ ] Verify platform distribution bar chart renders
- [ ] Verify allocation donut charts show data (after refresh fetches allocation)
- [ ] Click fund name → Fund Detail page shows NAV trend, allocations, top holdings
- [ ] Navigate to Data Management → refresh all funds
- [ ] Verify portfolio trend chart (may need multiple days of snapshots)

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete fund portfolio aggregator v1.0"
```
