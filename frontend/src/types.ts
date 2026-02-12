export interface Holding {
  id: number;
  fund_code: string;
  fund_name: string;
  platform: string;
  shares: number;
  cost_price: number;
  purchase_date: string;
  latest_nav: number | null;
  latest_nav_date: string | null;
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

export interface PortfolioTrend {
  date: string;
  total_value: number;
  total_cost: number;
  total_pnl: number;
}

export interface AllocationFundDetail {
  fund_code: string;
  fund_name: string;
  percentage: number;
}

export interface AllocationItem {
  category: string;
  percentage: number;
  funds?: AllocationFundDetail[];
}

export interface AllocationCoverage {
  covered_funds: number;
  total_funds: number;
  covered_value: number;
  total_value: number;
  covered_percent: number;
  missing_funds: string[];
}

export interface AllocationResponse {
  items: AllocationItem[];
  coverage: AllocationCoverage;
}

export interface FundAllocation {
  [dimension: string]: AllocationItem[];
}

export interface TopHolding {
  stock_code: string;
  stock_name: string;
  percentage: number;
}

export interface SnapshotUpdate {
  shares: number;
  cost_price: number;
  change_date: string;
}

export interface ChangeLog {
  id: number;
  holding_id: number;
  change_date: string;
  old_shares: number;
  new_shares: number;
  old_cost_price: number;
  new_cost_price: number;
  shares_diff: number;
  created_at: string;
}
