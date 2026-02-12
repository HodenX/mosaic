# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fund Portfolio Aggregator (基金管家) — a locally-running personal finance web app that aggregates mutual fund holdings across multiple Chinese investment platforms into a single dashboard. Uses **akshare** to fetch fund NAV, asset allocations, and top holdings data from Chinese fund markets.

## Development Commands

### Backend (Python FastAPI)

```bash
# Activate virtual environment
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server (from project root)
cd backend && uvicorn app.main:app --reload
# Serves on http://localhost:8000
```

### Frontend (React + TypeScript + Vite)

```bash
cd frontend

npm install        # Install dependencies
npm run dev        # Dev server on http://localhost:5173
npm run build      # Type-check (tsc -b) + Vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

Both servers must be running simultaneously for the app to work. The frontend connects to the backend at `http://localhost:8000/api`.

## Architecture

### Backend (`backend/app/`)

- **Framework:** FastAPI with SQLModel ORM over SQLite (`data/finance.db`)
- **Entry point:** `main.py` — creates tables on startup, starts APScheduler, registers routers
- **Database:** `database.py` — SQLite engine, `get_session()` dependency
- **Models:** `models.py` — 6 tables: `Fund`, `Holding`, `FundNavHistory`, `FundAllocation`, `FundTopHolding`, `PortfolioSnapshot`
- **Routers:** `routers/` — three route groups:
  - `holdings.py` — CRUD for user's fund holdings
  - `funds.py` — fund detail, NAV history, allocation, refresh endpoints
  - `portfolio.py` — portfolio summary, platform breakdown, allocation aggregation, trend
- **Services:** `services/` — business logic:
  - `fund_data.py` — akshare integration for fetching fund info/NAV/allocations
  - `allocation.py` — weighted portfolio-level allocation aggregation
  - `snapshot.py` — daily portfolio value snapshot
- **Scheduler:** `scheduler.py` — APScheduler cron job at 20:00 daily to fetch NAV and take snapshots

All API routes are prefixed with `/api`. Health check: `GET /api/health`.

### Frontend (`frontend/src/`)

- **Framework:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **UI Components:** shadcn/ui (new-york style) with Radix UI primitives, located in `components/ui/`
- **Routing:** React Router DOM with 4 pages:
  - `/overview` — dashboard with summary cards, allocation pie charts, platform bar chart, trend line chart
  - `/holdings` — holdings table with add/edit/delete
  - `/data` — bulk data refresh management
  - `/fund/:fundCode` — individual fund detail with NAV chart, allocation, top holdings
- **API layer:** `services/api.ts` — Axios client organized into `holdingsApi`, `fundsApi`, `portfolioApi`
- **Type definitions:** `types.ts` — shared TypeScript interfaces
- **Path alias:** `@/*` maps to `src/*`

### Data Flow

1. User adds fund holdings (fund code, platform, shares, cost) via the holdings page
2. Backend fetches fund metadata and NAV from akshare on first add or manual refresh
3. APScheduler daily job updates NAV data and records portfolio snapshots
4. Portfolio endpoints aggregate across holdings to compute total value, P&L, and allocation breakdowns

### Database

SQLite file at `data/finance.db`. Tables are auto-created on startup via `SQLModel.metadata.create_all()`. No migration tool (Alembic) is configured — schema changes require manual DB recreation or manual ALTER statements.

The `fund_code` (e.g., "012414") is the primary key for funds and the foreign key used by holdings, NAV history, allocations, and top holdings.

### CORS

Backend allows origins `http://localhost:5173` through `http://localhost:5176` (Vite dev server ports).
