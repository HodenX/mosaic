# Four-Bucket Financial Planning Design

> Date: 2026-02-13
> Status: Approved

## Background

FolioPal currently only manages mutual fund portfolios (long-term investments). This design expands the product into a comprehensive personal finance assistant using a **four-bucket** framework.

## Four-Bucket Framework

| Bucket | Chinese | Purpose | Typical Assets |
|---|---|---|---|
| Living Money | 活钱 | Short-term liquidity, accessible anytime | Demand deposits, money market funds (e.g. 招招保) |
| Stable Money | 稳钱 | Medium-term preservation, high certainty | Term deposits, bank wealth management products |
| Growth Money | 长钱 | Long-term appreciation, tolerate volatility | Equity/mixed/bond funds (existing features) |
| Insurance | 保险 | Risk protection, transfer uncertainty | Critical illness, medical, accident, life insurance |

## Architecture Changes

### Navigation Structure

Sidebar changes from flat layout to grouped structure:

```
📊 资产总览           →  /dashboard     (new homepage)
💧 活钱
   └ 活钱管理         →  /liquid
💰 稳钱
   └ 稳钱管理         →  /stable
📈 长钱
   ├ 组合概览         →  /growth/overview   (was /overview)
   ├ 持仓明细         →  /growth/holdings   (was /holdings)
   └ 仓位管理         →  /growth/position   (was /position)
🛡️ 保险
   └ 保单管理         →  /insurance
⚙️ 数据管理           →  /data             (unchanged)
```

- Default homepage changes from `/overview` to `/dashboard`
- Existing fund pages move under `/growth/` prefix, functionality unchanged
- Sidebar groups are collapsible; clicking a collapsed group name navigates to its main page
- Each group has an icon identifier

### Route Migration

| Current Route | New Route | Change |
|---|---|---|
| `/` → redirect `/overview` | `/` → redirect `/dashboard` | Homepage changed |
| `/overview` | `/growth/overview` | Moved into Growth group |
| `/holdings` | `/growth/holdings` | Moved into Growth group |
| `/position` | `/growth/position` | Moved into Growth group |
| `/data` | `/data` | Unchanged |
| — | `/dashboard` | **New** |
| — | `/liquid` | **New** |
| — | `/stable` | **New** |
| — | `/insurance` | **New** |

## New Data Models

### LiquidAsset (活钱)

| Field | Type | Description |
|---|---|---|
| id | int PK | Auto-increment primary key |
| name | str | Asset name, e.g. "招行活期", "招招保" |
| type | str | `"deposit"` demand deposit / `"money_fund"` money market fund |
| platform | str | Platform, e.g. "招商银行" |
| amount | float | Current amount |
| annual_rate | float? | Annualized yield (optional) |
| updated_at | date | Last updated date |

### StableAsset (稳钱)

| Field | Type | Description |
|---|---|---|
| id | int PK | Auto-increment primary key |
| name | str | E.g. "招行3年定期", "工行理财产品" |
| type | str | `"term_deposit"` / `"bank_product"` bank wealth management |
| platform | str | Platform/bank |
| amount | float | Principal amount |
| annual_rate | float | Annual rate / expected yield |
| start_date | date | Start date |
| maturity_date | date? | Maturity date (some products may not have fixed maturity) |
| updated_at | date | Last updated date |

### InsurancePolicy (保险)

| Field | Type | Description |
|---|---|---|
| id | int PK | Auto-increment primary key |
| name | str | Product name, e.g. "平安福重疾险" |
| type | str | `"critical_illness"` / `"medical"` / `"accident"` / `"life"` |
| insurer | str | Insurance company |
| insured_person | str | Insured person, e.g. "我", "老婆", "孩子" |
| annual_premium | float | Annual premium |
| coverage_amount | float? | Coverage amount |
| coverage_summary | str? | Coverage summary text |
| start_date | date | Effective date |
| end_date | date? | Termination date (null for lifetime policies) |
| payment_years | int? | Payment term in years |
| next_payment_date | date? | Next renewal payment date |
| status | str | `"active"` / `"expired"` / `"lapsed"` |

## Page Designs

### Dashboard `/dashboard` (New Homepage)

Layout from top to bottom:

**1. Top: Total Family Assets Card**

- Total assets = sum of three money buckets (insurance excluded from asset calculation)
- Total return = living money interest + stable money yield + growth money P&L
- Insurance annual premium shown separately as a small note

**2. Middle: Four Bucket Cards**

Four cards in horizontal layout, each containing:
- Bucket name and icon
- Amount (or policy count for insurance)
- Percentage of total assets (insurance shows annual premium and coverage count instead)
- Return/P&L summary
- Urgent alert: nearest maturity (stable) or renewal (insurance) with days countdown
- "View" link to bucket management page

**3. Middle: Asset Allocation Ring Chart**

- Ring/donut chart showing living/stable/growth money proportions
- Insurance excluded from proportion calculation (it's an expense, not an asset)

**4. Bottom: Reminders / Action Items**

Auto-aggregated alerts from all buckets, sorted by urgency:
- 🔴 Urgent (within 7 days): insurance renewal, stable money maturity
- 🟡 Warning (within 30 days): upcoming renewals and maturities
- 🔵 Info: growth money strategy suggestions, position alerts
- Clicking a reminder navigates to the corresponding bucket page

### Living Money Management `/liquid`

- Standard CRUD table matching existing holdings page style
- Top summary: total amount, estimated annual return
- Add/edit via Dialog popup
- All data manually entered by user

### Stable Money Management `/stable`

- CRUD table with maturity date highlighting
- Yellow highlight for maturity within 30 days, red within 7 days
- Expired items shown in gray with prompt to handle
- Default sort: nearest maturity first
- Top summary: total amount, estimated annual return

### Insurance Management `/insurance`

- **Card list** (not table) grouped by insured person — each policy has too many fields for a table
- Top summary: total policies, annual premium total, number of people covered
- Each card shows: product name, insurer, coverage amount, annual premium, renewal date
- Renewal date color-coded (red/yellow) for urgency
- "Details" expands full info: coverage summary, payment years, effective/end dates
- Status badges: 🟢 Active, 🔴 Expired, 🟡 Pending Renewal
- "Renewed" button triggers `POST /api/insurance/{id}/renew` to roll next_payment_date forward by one year

## API Design

### New Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/dashboard/summary` | GET | Four-bucket summary: amounts, returns, total assets |
| `/api/dashboard/reminders` | GET | Aggregated reminders list |
| `/api/liquid` | GET | List liquid assets + summary |
| `/api/liquid` | POST | Add liquid asset |
| `/api/liquid/{id}` | PUT | Edit liquid asset |
| `/api/liquid/{id}` | DELETE | Delete liquid asset |
| `/api/stable` | GET | List stable assets + summary |
| `/api/stable` | POST | Add stable asset |
| `/api/stable/{id}` | PUT | Edit stable asset |
| `/api/stable/{id}` | DELETE | Delete stable asset |
| `/api/insurance` | GET | List policies (supports `?insured_person=` filter) |
| `/api/insurance` | POST | Add policy |
| `/api/insurance/{id}` | PUT | Edit policy |
| `/api/insurance/{id}` | DELETE | Delete policy |
| `/api/insurance/{id}/renew` | POST | Roll next_payment_date forward by one year |

## Reminder System

Reminders are computed in real-time by `GET /api/dashboard/reminders`, no separate persistence table needed.

| Source | Trigger | Level |
|---|---|---|
| Insurance renewal | next_payment_date within 7 days | 🔴 Urgent |
| Insurance renewal | next_payment_date within 30 days | 🟡 Warning |
| Stable maturity | maturity_date within 7 days | 🔴 Urgent |
| Stable maturity | maturity_date within 30 days | 🟡 Warning |
| Stable expired | maturity_date has passed, item still exists | 🔴 Urgent |
| Insurance lapsed | status = lapsed or end_date has passed | 🔴 Urgent |
| Growth strategy | Existing strategy engine suggestions | 🔵 Info |
| Growth position | Position below target min or above max | 🟡 Warning |

## Delivery Phases

### Phase 1: Framework + Dashboard

- Backend: Create `LiquidAsset`, `StableAsset`, `InsurancePolicy` tables and CRUD APIs
- Backend: Create `/api/dashboard/summary` and `/api/dashboard/reminders`
- Frontend: Route restructuring, migrate existing pages to `/growth/*`
- Frontend: Sidebar redesign with grouped structure
- Frontend: Build `/dashboard` homepage (total assets card + four bucket cards + allocation chart + reminders)

Deliverable: Users see the four-bucket overview; new bucket management pages are placeholder.

### Phase 2: Living Money + Stable Money

- Frontend: `/liquid` management page (table CRUD + summary card)
- Frontend: `/stable` management page (table CRUD + summary card + maturity highlighting)
- Dashboard living/stable cards connected to real data
- Reminder system connected to stable money maturity alerts

Deliverable: Living and stable money fully functional, dashboard shows real data.

### Phase 3: Insurance Management

- Frontend: `/insurance` policy management page (card list grouped by insured person + detail expansion)
- Frontend: Policy add/edit Dialog (most complex form)
- Backend: `POST /api/insurance/{id}/renew` renewal endpoint
- Reminder system connected to insurance renewal alerts
- Dashboard insurance card connected to real data

Deliverable: All four buckets fully operational, product feature-complete.

### Phase 4: Polish & Enhancements

- Dashboard total asset trend chart (historical trend across all four buckets)
- Insurance calendar view for renewal/expiry dates
- MCP Server extension: expose all four buckets to AI assistant
- Stable money maturity reinvestment suggestions

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Bucket structure | Fixed four buckets | Standard financial planning framework, simple and intuitive |
| Overview entry | New `/dashboard` as homepage | Four buckets is a higher abstraction level than fund portfolio |
| Bucket management | Separate page per bucket | Data models differ significantly across buckets |
| Insurance in allocation | Excluded from asset proportion | Insurance premium is an expense, not an investable asset |
| Reminder persistence | Real-time computation | Simple logic, small data volume, no need for persistence |
| Living/stable data source | Manual user entry | No unified API for bank deposits and wealth products |
| Insurance display | Card list grouped by person | Too many fields for a table; person grouping is natural |
| Delivery approach | Four progressive phases | Each phase independently deliverable and usable |
