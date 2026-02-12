# Complete Visual Redesign — Modern Fintech (Teal/Cyan)

## Summary

A complete visual facelift for the frontend, moving from the default monochrome shadcn/ui look to a modern fintech aesthetic with teal/cyan as the brand color. Covers color system, typography, spacing, card design, micro-interactions, and chart visuals.

## 1. Color System

### Primary palette — Teal/Cyan
- Primary: `oklch(0.55 0.15 180)` — medium teal for active nav, primary buttons, links, focused inputs
- Primary foreground: white text on primary backgrounds
- Lighter tint: `oklch(0.95 0.03 180)` for subtle primary backgrounds (active nav, selected states)

### Semantic colors (unchanged)
- Profit: `text-red-500` (Chinese convention)
- Loss: `text-green-500` (Chinese convention)
- Position warnings: yellow/red borders

### Surface hierarchy (light mode)
- Background: `oklch(0.975 0.005 250)` — slightly cool-tinted white
- Card: `oklch(1 0 0)` — pure white, floating on background
- Sidebar: `oklch(0.98 0.005 250)` — slightly off-white
- Muted/secondary: cool grays instead of pure neutral

### Dark mode
- Background: `oklch(0.16 0.015 250)` — dark slate with blue hint
- Cards: `oklch(0.22 0.015 250)` — slightly lighter dark surface
- Primary: `oklch(0.65 0.15 180)` — lighter teal for contrast

### Chart colors (refreshed)
- Chart 1: Teal `oklch(0.55 0.15 180)`
- Chart 2: Coral `oklch(0.65 0.2 25)`
- Chart 3: Amber `oklch(0.75 0.15 85)`
- Chart 4: Indigo `oklch(0.55 0.2 270)`
- Chart 5: Rose `oklch(0.65 0.2 350)`

## 2. Typography & Spacing

### Font stack
- `-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif`
- PingFang SC prioritized for Chinese characters

### Type scale
- Page titles: `text-xl font-semibold` (down from text-2xl font-bold)
- Card metric values: `text-2xl font-semibold tracking-tight`
- Card labels: `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Table numbers: `font-mono tabular-nums` for column alignment

### Spacing & layout
- Cards: `shadow-sm` instead of just border
- Border radius: `0.75rem` (from 0.625rem)
- Section gaps: `gap-4` (unchanged)

### Sidebar
- Active nav: teal left border (3px) + teal-tinted background
- Slightly more padding for touch targets
- Subtle top separator on footer buttons

### Tables
- Alternating rows: `even:bg-muted/30`
- Hover highlight: `hover:bg-muted/50`
- Number columns: `tabular-nums` right-aligned

## 3. Cards, Shadows & Micro-interactions

### Card elevation
- Default: `shadow-sm border border-border/50`
- Hover (interactive): `hover:shadow-md transition-shadow duration-200`
- Warning state: colored left border (3px) instead of full border

### Summary metric cards
- Thin colored top border (2px) per card:
  - 总市值: teal (primary)
  - 总成本: slate/gray
  - 总盈亏: red or green (dynamic)
  - 收益率: red or green (dynamic)

### Position gauge card
- Left border color: yellow (below-min), red (above-max), teal (in-range)
- Gauge bar: slight gradient for depth

### Slide-over panel
- Backdrop: `backdrop-blur-sm` (frosted glass)
- Entrance: slide-in-from-right + fade-in backdrop
- Inner cards: flat (no shadow), subtle borders only

### Buttons
- Primary: teal background, white text, `hover:brightness-110`
- Ghost/outline: teal text on hover
- Destructive: keep red

## 4. Chart Visual Refresh

### Line charts
- Value line: teal, 2px stroke, no dots
- Cost line: coral, dashed, 1.5px stroke
- Area fill under value: `fill-opacity: 0.08` teal
- Grid lines: `stroke-muted/30`

### Bar charts
- Rounded corners `radius={6}`
- Teal + coral palette
- Y-axis: ¥ prefix with K/W abbreviation

### Donut charts
- Thinner ring: `innerRadius={55} outerRadius={85}`
- Hover segment: slight scale via strokeWidth
- Legend dots: `h-2.5 w-2.5 rounded-full`

### Tooltips
- `shadow-lg border-0 rounded-lg`
- Teal accent indicator dot
