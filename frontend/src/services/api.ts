import axios from "axios";
import type {
  AllocationResponse,
  BudgetChangeLogEntry,
  BudgetUpdate,
  ChangeLog,
  FundAllocation,
  FundInfo,
  Holding,
  HoldingCreate,
  HoldingUpdate,
  NavHistory,
  PlatformBreakdown,
  PortfolioSummary,
  PortfolioTrend,
  PositionStatus,
  SnapshotUpdate,
  StrategyInfo,
  StrategyResult,
  TopHolding,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
});

export const holdingsApi = {
  list: () => api.get<Holding[]>("/holdings").then((r) => r.data),
  create: (data: HoldingCreate) =>
    api.post<Holding>("/holdings", data).then((r) => r.data),
  update: (id: number, data: HoldingUpdate) =>
    api.put<Holding>(`/holdings/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/holdings/${id}`),
  updateSnapshot: (id: number, data: SnapshotUpdate) =>
    api.post<Holding>(`/holdings/${id}/update-snapshot`, data).then((r) => r.data),
  changelog: (id: number) =>
    api.get<ChangeLog[]>(`/holdings/${id}/changelog`).then((r) => r.data),
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
  allocation: (code: string) =>
    api.get<FundAllocation>(`/funds/${code}/allocation`).then((r) => r.data),
  topHoldings: (code: string) =>
    api.get<TopHolding[]>(`/funds/${code}/top-holdings`).then((r) => r.data),
};

export const portfolioApi = {
  summary: () =>
    api.get<PortfolioSummary>("/portfolio/summary").then((r) => r.data),
  byPlatform: () =>
    api.get<PlatformBreakdown[]>("/portfolio/by-platform").then((r) => r.data),
  trend: (start?: string, end?: string) =>
    api.get<PortfolioTrend[]>("/portfolio/trend", { params: { start, end } }).then((r) => r.data),
  allocation: (dimension: string) =>
    api.get<AllocationResponse>("/portfolio/allocation", { params: { dimension } }).then((r) => r.data),
};

export const positionApi = {
  getBudget: () =>
    api.get<PositionStatus>("/position/budget").then((r) => r.data),
  updateBudget: (data: BudgetUpdate) =>
    api.put<PositionStatus>("/position/budget", data).then((r) => r.data),
  changelog: () =>
    api.get<BudgetChangeLogEntry[]>("/position/budget/changelog").then((r) => r.data),
  strategies: () =>
    api.get<StrategyInfo[]>("/position/strategies").then((r) => r.data),
  setActiveStrategy: (strategy_name: string) =>
    api.put<PositionStatus>("/position/active-strategy", { strategy_name }).then((r) => r.data),
  getStrategyConfig: (name: string) =>
    api.get<{ strategy_name: string; config: Record<string, unknown> }>(`/position/strategy-config/${name}`).then((r) => r.data),
  updateStrategyConfig: (name: string, config_json: Record<string, unknown>) =>
    api.put<{ strategy_name: string; config: Record<string, unknown> }>(`/position/strategy-config/${name}`, { config_json }).then((r) => r.data),
  suggestion: () =>
    api.get<StrategyResult>("/position/suggestion").then((r) => r.data),
};
