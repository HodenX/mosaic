# Navigation & Layout Redesign

## Summary

Replace the current top-nav + vertical-stack layout with a collapsible sidebar, dense grid dashboard, and a slide-over panel for fund details. The goal is better use of screen real estate, less scrolling on the overview page, and quicker access to fund details from any page.

## 1. Sidebar Navigation

- Fixed left sidebar, 240px wide, collapsible to 64px (icon-only).
- Collapse/expand toggle at the bottom of the sidebar.
- App title "基金管家" in the sidebar header, shortened to an icon when collapsed.
- Navigation items (top to bottom):
  1. 组合概览 (Overview) — dashboard icon — `/overview`
  2. 持仓明细 (Holdings) — list icon — `/holdings`
  3. 仓位管理 (Position) — gauge icon — `/position`
  4. 数据管理 (Data) — database icon — `/data`
- Active nav item gets `bg-accent` background and bold text.
- Sidebar footer: collapse toggle, dark mode toggle.
- Sidebar expanded/collapsed state persisted to localStorage.
- Main content area shifts right based on sidebar width, uses full remaining width (no `container mx-auto`), keeps `px-6 py-6` internal padding.

## 2. Fund Detail Slide-Over Panel

- Clicking any fund name/code anywhere in the app opens a 480px-wide slide-over panel from the right edge.
- Semi-transparent backdrop that dismisses the panel on click. Close button (X) and Escape key also dismiss.
- URL does not change — no `/fund/:fundCode` route. Purely state-driven.
- Panel content (top to bottom):
  1. Header: fund name + code, colored badge for latest day gain/loss.
  2. NAV history line chart (narrower to fit 480px).
  3. Three allocation donuts (asset class, geography, sector) in a compact strip or stacked.
  4. Top-10 holdings table.
- Data fetched on panel open; skeleton/spinner shown inside panel while loading.
- Replaces the current `FundDetailPage.tsx` and its route.

## 3. Dense Grid Dashboard

The overview page uses a dense grid instead of a vertical stack of 7 sections.

**Row 1 — Summary cards (full width):**
- 5 cards in a single row: 总市值, 总成本, 总收益, 收益率, and a position gauge card.
- Position warning banners replaced by a colored border/indicator on the gauge card.

**Row 2 — Two-column grid:**
- Left (~60%): Portfolio trend line chart (value vs cost over time).
- Right (~40%): Platform distribution bar chart.

**Row 3 — Three allocation donuts (full width):**
- Asset class, geography, sector in a 3-up row.

Responsive fallback: below `lg` breakpoint, 2-column grid collapses to single column.

## 4. Component Architecture

### New components
- `Sidebar.tsx` — collapsible sidebar, manages expanded/collapsed state.
- `FundDetailPanel.tsx` — slide-over panel, receives `fundCode: string | null`, fetches its own data.
- `SummaryCards.tsx` — 5-card row (4 metrics + position gauge).
- `TrendChart.tsx` — portfolio trend line chart, extracted from OverviewPage.
- `PlatformChart.tsx` — platform bar chart, extracted from OverviewPage.

### Modified components
- `Layout.tsx` — replace top-nav with sidebar + main content area. Host `FundDetailPanel` at this level.
- `OverviewPage.tsx` — compose from new sub-components instead of inline everything.

### Fund detail panel state
- `Layout.tsx` holds `selectedFundCode: string | null` and `openFundDetail(code)`.
- Expose via React Context (`FundDetailContext`) so any page/table can trigger the panel without prop drilling.

### Deleted
- `FundDetailPage.tsx` — replaced by `FundDetailPanel.tsx`.
- `/fund/:fundCode` route in `App.tsx`.

### Unchanged
- `HoldingsPage`, `PositionPage`, `DataManagementPage` — internal layout untouched; gain ability to call `openFundDetail()`.
- All API calls, types, dialogs, and backend remain the same.
