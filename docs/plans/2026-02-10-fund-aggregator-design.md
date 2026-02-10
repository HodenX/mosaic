# Fund Portfolio Aggregator - Design Document

## Problem

Due to QDII fund purchase limits, fund holdings are spread across multiple platforms (Alipay, fund company apps, bank apps). This creates two problems:

1. No unified view of total portfolio across all platforms
2. No visibility into underlying asset composition (asset look-through / penetration analysis)

This lack of data-driven visibility makes it difficult to make rational rebalancing decisions.

## Solution

A locally-running web application that aggregates fund holdings from all platforms, providing a global portfolio view with full asset look-through analysis.

## Architecture

Three layers:

**Backend (Python FastAPI)**
- REST API serving all data to the frontend
- Background scheduler (APScheduler) fetching fund NAV and holdings data daily
- SQLite database for all persistent storage
- Runs locally on Mac

**Frontend (React + Tailwind + shadcn/ui)**
- Single-page dashboard app
- Charts (recharts) for allocation visualization
- Tables (shadcn/ui) for detailed holdings view
- Trend charts for historical portfolio value
- Communicates with backend via REST API

**Data Pipeline**
- `akshare` library fetches public fund data: current NAV, quarterly disclosed holdings (top stocks, asset allocation, geographic breakdown, sector allocation)
- Daily scheduled task records NAV snapshots and calculates portfolio value
- Manual override API allows adjusting/supplementing auto-fetched allocation data

### Data Flow

1. User adds a fund holding via the UI (fund code, shares, platform, cost, purchase date)
2. Backend fetches fund metadata and latest NAV from akshare
3. Backend fetches fund's disclosed holdings/allocation from quarterly reports
4. Daily scheduler updates NAV and records portfolio value snapshot
5. Frontend queries API and renders charts + tables

## Data Model

### funds (Fund metadata cache)

| Column             | Type    | Note              |
|--------------------|---------|-------------------|
| fund_code (PK)     | TEXT    | e.g., "012414"    |
| fund_name          | TEXT    | Fund name         |
| fund_type          | TEXT    | QDII/stock/bond/mixed |
| management_company | TEXT    |                   |
| last_updated       | DATETIME|                   |

### holdings (User's fund holdings)

| Column        | Type    | Note                        |
|---------------|---------|------------------------------|
| id (PK)       | INTEGER | Auto increment               |
| fund_code (FK)| TEXT    | → funds.fund_code            |
| platform      | TEXT    | Alipay/bank/fund company     |
| shares        | REAL    | Number of shares held        |
| cost_price    | REAL    | Average cost per share       |
| purchase_date | DATE    |                              |
| created_at    | DATETIME|                              |
| updated_at    | DATETIME|                              |

### fund_nav_history (Daily NAV snapshots)

| Column         | Type | Note                      |
|----------------|------|---------------------------|
| fund_code (PK) | TEXT | → funds.fund_code         |
| date (PK)      | DATE | Composite PK with fund_code|
| nav            | REAL | Unit NAV                  |

### fund_allocations (Look-through data)

| Column        | Type    | Note                              |
|---------------|---------|-----------------------------------|
| id (PK)       | INTEGER |                                   |
| fund_code (FK)| TEXT    | → funds.fund_code                 |
| dimension     | TEXT    | asset_class / geography / sector  |
| category      | TEXT    | e.g., "US stocks", "tech", "bonds"|
| percentage    | REAL    |                                   |
| source        | TEXT    | auto / manual                     |
| report_date   | DATE    | Quarterly report date             |

### fund_top_holdings (Top positions per fund)

| Column        | Type    | Note              |
|---------------|---------|-------------------|
| id (PK)       | INTEGER |                   |
| fund_code (FK)| TEXT    | → funds.fund_code |
| stock_code    | TEXT    |                   |
| stock_name    | TEXT    |                   |
| percentage    | REAL    | % of NAV          |
| report_date   | DATE    |                   |

### portfolio_snapshots (Daily portfolio value)

| Column      | Type | Note           |
|-------------|------|----------------|
| date (PK)   | DATE |                |
| total_value | REAL | Total market value |
| total_cost  | REAL | Total cost basis   |
| total_pnl   | REAL | Total profit/loss  |

## API Design

### Holdings

- `GET /api/holdings` — List all holdings with current NAV and P&L
- `POST /api/holdings` — Add a new holding
- `PUT /api/holdings/{id}` — Update a holding
- `DELETE /api/holdings/{id}` — Remove a holding

### Funds

- `GET /api/funds/{fund_code}` — Fund metadata + latest NAV
- `GET /api/funds/{fund_code}/nav-history?start=&end=` — NAV history
- `POST /api/funds/{fund_code}/refresh` — Manually trigger data refresh

### Allocation (Look-through)

- `GET /api/portfolio/allocation?dimension=asset_class|geography|sector` — Weighted allocation across entire portfolio
- `GET /api/funds/{fund_code}/allocation` — Single fund's allocation
- `GET /api/funds/{fund_code}/top-holdings` — Single fund's top positions
- `PUT /api/funds/{fund_code}/allocation` — Manual override

### Portfolio Overview

- `GET /api/portfolio/summary` — Total value, cost, P&L, daily change
- `GET /api/portfolio/trend?start=&end=` — Historical portfolio value
- `GET /api/portfolio/by-platform` — Holdings grouped by platform

### Key Computation

Weighted look-through: `/api/portfolio/allocation?dimension=geography` multiplies each fund's geographic allocation percentages by that fund's market value weight in the total portfolio, then aggregates across all funds.

## Frontend Pages

### 1. Portfolio Overview (首页概览)

- Top bar: total market value, total cost, total P&L (amount + %), daily change
- Three donut charts: asset class, geographic, sector breakdown
- Portfolio value trend line chart (time range selector: 1M/3M/6M/1Y/ALL)
- Platform distribution bar chart

### 2. Holdings List (持仓明细)

- Sortable table: fund name, code, platform, shares, NAV, market value, cost, P&L, P&L%, purchase date
- Row click expands to show fund's allocation and top holdings
- "Add Holding" button with form dialog
- Inline edit and delete
- Filter by platform, fund type

### 3. Fund Detail (基金详情)

- Fund metadata (name, type, company)
- NAV trend chart
- Three allocation donut charts
- Top 10 holdings table
- "Override Allocation" button for manual adjustment

### 4. Data Management (数据管理)

- Manual refresh trigger (all funds or individual)
- Last refresh timestamp
- Override history log
- Platform name management

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Backend  | Python 3.11+, FastAPI, SQLAlchemy, APScheduler |
| Database | SQLite                                |
| Data     | akshare                              |
| Frontend | React 18, TypeScript, Vite            |
| UI       | Tailwind CSS, shadcn/ui               |
| Charts   | recharts                              |
| HTTP     | axios                                 |
| Routing  | React Router                          |

## Project Structure

```
finance_mgr/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── database.py          # SQLite connection setup
│   │   ├── routers/
│   │   │   ├── holdings.py      # Holdings CRUD
│   │   │   ├── funds.py         # Fund data endpoints
│   │   │   └── portfolio.py     # Portfolio overview & allocation
│   │   ├── services/
│   │   │   ├── fund_data.py     # akshare data fetching logic
│   │   │   ├── allocation.py    # Weighted look-through calculation
│   │   │   └── snapshot.py      # Daily snapshot logic
│   │   └── scheduler.py         # APScheduler daily tasks
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/               # 4 page components
│   │   ├── components/          # Shared charts, tables, forms
│   │   ├── services/            # API client (axios)
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── package.json
├── data/
│   └── finance.db               # SQLite database file
└── docs/
    └── plans/
```

## Implementation Phases

### Phase 1 — Core (MVP)

- Backend: Holdings CRUD, fund metadata/NAV fetch via akshare, SQLite setup
- Frontend: Holdings list page, add/edit/delete holdings, basic portfolio summary
- Goal: Manage holdings and see total value + P&L

### Phase 2 — Look-through

- Backend: Allocation data fetch from quarterly reports, weighted aggregation, manual override API
- Frontend: Donut charts for asset class/geography/sector, fund detail page with top holdings
- Goal: Full asset penetration analysis across portfolio

### Phase 3 — Trend & Polish

- Backend: Daily NAV snapshot scheduler, portfolio trend API
- Frontend: Trend line charts, data management page, platform breakdown view
- Goal: Historical tracking and complete dashboard experience
