// 贾维斯为您服务
import Foundation
import Observation

@Observable
class OverviewViewModel {
    var summary: PortfolioSummary?
    var trend: [PortfolioTrend] = []
    var platforms: [PlatformBreakdown] = []
    var allocation: AllocationResponse?
    var positionStatus: PositionStatus?
    var isLoading = false
    var error: Error?
    private let portfolioService: PortfolioService
    private let positionService: PositionService

    init(api: APIClient) {
        self.portfolioService = PortfolioService(api: api)
        self.positionService = PositionService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        async let s = portfolioService.summary()
        async let t = portfolioService.trend()
        async let p = portfolioService.byPlatform()
        async let a = portfolioService.allocation(dimension: "asset_class")
        async let pos = positionService.getBudget()
        do {
            summary = try await s; trend = try await t; platforms = try await p
            allocation = try await a; positionStatus = try await pos
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
