# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 使用中文交流
## 不要编写兼容性代码
## 每段代码的开头请先称呼自己为贾维斯

## Project Overview

**知合 Mosaic** — a locally-running personal finance web app that manages family assets using a "four-bucket" (四笔钱) framework: liquid assets (活钱), stable assets (稳钱), growth/fund portfolio (长钱), and insurance (保障). Aggregates mutual fund holdings across multiple Chinese investment platforms. Uses **akshare** for fund NAV, allocations, and market data from Chinese fund markets. All data is stored locally in SQLite.

## Development Commands

### Quick Start

```bash
./start.sh          # Starts both backend (port 8011) and frontend (port 5173)
./setup.sh          # One-time: creates venv, installs all dependencies
```

### Backend (Python FastAPI)

```bash
source backend/venv/bin/activate
uv pip install -r backend/requirements.txt

# Run backend (port 8011 in start.sh; default 8000 with bare uvicorn)
cd backend && uvicorn app.main:app --reload --port 8011
```

### Frontend (React + TypeScript + Vite)

```bash
cd frontend
npm install
npm run dev          # Dev server on http://localhost:5173
npm run build        # Type-check (tsc -b) + Vite build
npm run lint         # ESLint
```

The frontend Vite dev server proxies `/api` requests to `http://localhost:8011` (configured in `vite.config.ts`). Both servers must be running simultaneously.

### No Tests

There are no test files or test frameworks configured in this project.

## Architecture

### Backend (`backend/app/`)

- **Framework:** FastAPI with SQLModel ORM over SQLite (`data/finance.db`)
- **Entry point:** `main.py` — creates tables on startup via lifespan, starts APScheduler, registers 9 routers
- **Database:** `database.py` — SQLite engine, `get_session()` dependency
- **Models:** `models.py` — 14 SQLModel tables: `Fund`, `Holding`, `HoldingChangeLog`, `FundNavHistory`, `FundAllocation`, `FundTopHolding`, `PortfolioSnapshot`, `PositionBudget`, `BudgetChangeLog`, `StrategyConfig`, `LiquidAsset`, `StableAsset`, `TotalAssetSnapshot`, `InsurancePolicy`
- **Schemas:** `schemas.py` — Pydantic request/response models
- **Routers (`routers/`):**
  - `holdings.py` — fund holding CRUD
  - `funds.py` — fund detail, NAV history, allocation, refresh
  - `portfolio.py` — portfolio summary, platform breakdown, allocation aggregation, trend
  - `position.py` — budget, strategies, position management
  - `liquid.py` — liquid asset CRUD
  - `stable.py` — stable asset CRUD
  - `insurance.py` — insurance policy CRUD
  - `dashboard.py` — family dashboard summary, reminders, trend, snapshot
  - `diagnosis.py` — reads AI-generated diagnosis report from `data/diagnosis_report.json`
- **Services (`services/`):**
  - `fund_data.py` — akshare integration for fund info/NAV/allocations
  - `allocation.py` — weighted portfolio-level allocation aggregation
  - `snapshot.py` — daily portfolio + total asset snapshots
  - `position.py` — position/budget calculations
  - `strategies/` — pluggable strategy system with `base.py` (Protocol), `registry.py`, `simple.py` (position-based), `asset_rebalance.py` (equity/bond/gold ratio)
- **Scheduler:** `scheduler.py` — APScheduler cron job at 20:00 daily to fetch NAV and take snapshots

All API routes are prefixed with `/api`. Health check: `GET /api/health`.

### MCP Server (`backend/mcp_server/`)

A FastMCP-based Model Context Protocol server with 16 tools, 1 resource, and 5 prompts. Configured in `.mcp.json` at project root. Tool groups:
- `tools/portfolio.py` — summary, holdings, platform breakdown, allocation, trend
- `tools/fund.py` — fund detail, NAV history
- `tools/position.py` — position status, strategy suggestion
- `tools/market.py` — market indices, realtime NAV, macro indicators
- `tools/buckets.py` — liquid assets, stable assets, insurance, family summary

### Frontend (`frontend/src/`)

- **Framework:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **UI:** shadcn/ui (new-york style) with Radix UI, Recharts for charts, Lucide for icons
- **Forms:** React Hook Form + Zod validation
- **Routing:** React Router DOM — 9 routes:
  - `/` → redirects to `/dashboard`
  - `/dashboard` — family asset dashboard (four-bucket summary, reminders, trend)
  - `/diagnosis` — AI-generated wealth health diagnosis
  - `/liquid` — liquid assets (cash, money market funds)
  - `/stable` — stable assets (term deposits, bank products)
  - `/growth/overview` — fund portfolio overview with charts
  - `/growth/holdings` — holdings table with CRUD
  - `/growth/position` — position/budget management with gauge
  - `/insurance` — insurance policies by insured person
  - `/data` — bulk data refresh management
- **Fund detail:** shown as a slide-over panel via `FundDetailContext` (React Context), not a separate route
- **API layer:** `services/api.ts` — Axios client organized into `holdingsApi`, `fundsApi`, `portfolioApi`, etc.
- **State:** local component state (`useState`/`useEffect`); one React Context (`FundDetailContext`) for the fund detail panel
- **Path alias:** `@/*` maps to `src/*`
- **Styling:** Tailwind CSS v4 with inline `@theme` config in `index.css` — Jade & Gold color palette using `oklch()`, full light/dark mode, custom bucket accent colors (`--bucket-liquid`, `--bucket-stable`, etc.), serif fonts for financial numbers (Fraunces / Noto Serif SC)
- **Utilities:** `lib/utils.ts` — `cn()`, `formatCurrency()`, `formatPercent()`, `formatWan()`

### Data Flow

1. User adds fund holdings (fund code, platform, shares, cost) via the holdings page
2. Backend fetches fund metadata and NAV from akshare on first add or manual refresh
3. APScheduler daily job at 20:00 updates NAV data and records portfolio + total asset snapshots
4. Portfolio endpoints aggregate across holdings to compute total value, P&L, and allocation breakdowns
5. Dashboard aggregates all four buckets for the family-level summary

### Database

SQLite at `data/finance.db`. Tables auto-created on startup via `SQLModel.metadata.create_all()`. No Alembic — schema changes require manual DB recreation or ALTER statements. The `fund_code` (e.g., "012414") is the primary key for funds and the foreign key used by holdings, NAV history, allocations, and top holdings.

### Key Files

- `data/diagnosis_report.json` — AI-generated diagnosis report, read by the diagnosis router (generated externally by Claude skill, not by the app itself)
- `.mcp.json` — MCP server configuration for Claude Code integration
- `frontend/components.json` — shadcn/ui component config
