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

export interface PositionStatus {
  total_budget: number;
  total_value: number;
  total_cost: number;
  available_cash: number;
  position_ratio: number;
  target_position_min: number;
  target_position_max: number;
  active_strategy: string;
  is_below_min: boolean;
  is_above_max: boolean;
}

export interface BudgetUpdate {
  total_budget?: number;
  target_position_min?: number;
  target_position_max?: number;
  reason?: string;
}

export interface BudgetChangeLogEntry {
  id: number;
  old_budget: number;
  new_budget: number;
  reason: string | null;
  created_at: string;
}

export interface StrategyInfo {
  name: string;
  display_name: string;
  description: string;
  config_schema: Record<string, unknown>;
}

export interface SuggestionItem {
  fund_code: string;
  fund_name: string;
  action: string;
  amount: number;
  reason: string;
}

export interface StrategyResult {
  strategy_name: string;
  summary: string;
  suggestions: SuggestionItem[];
  extra: Record<string, unknown>;
}

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
