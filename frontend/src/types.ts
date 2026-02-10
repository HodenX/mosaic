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

export interface PortfolioTrend {
  date: string;
  total_value: number;
  total_cost: number;
  total_pnl: number;
}

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
