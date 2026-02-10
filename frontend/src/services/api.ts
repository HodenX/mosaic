import axios from "axios";
import type {
  FundInfo,
  Holding,
  HoldingCreate,
  HoldingUpdate,
  NavHistory,
  PlatformBreakdown,
  PortfolioSummary,
} from "@/types";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

export const holdingsApi = {
  list: () => api.get<Holding[]>("/holdings").then((r) => r.data),
  create: (data: HoldingCreate) =>
    api.post<Holding>("/holdings", data).then((r) => r.data),
  update: (id: number, data: HoldingUpdate) =>
    api.put<Holding>(`/holdings/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/holdings/${id}`),
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
};

export const portfolioApi = {
  summary: () =>
    api.get<PortfolioSummary>("/portfolio/summary").then((r) => r.data),
  byPlatform: () =>
    api.get<PlatformBreakdown[]>("/portfolio/by-platform").then((r) => r.data),
};
