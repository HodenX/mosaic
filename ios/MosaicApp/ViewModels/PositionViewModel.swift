// 贾维斯为您服务
import Foundation
import Observation

@Observable
class PositionViewModel {
    var status: PositionStatus?
    var strategies: [StrategyInfo] = []
    var suggestion: StrategyResult?
    var isLoading = false
    private let service: PositionService

    init(api: APIClient) { self.service = PositionService(api: api) }

    func load() async {
        isLoading = true
        async let s = service.getBudget()
        async let strats = service.strategies()
        do { status = try await s; strategies = try await strats } catch {}
        isLoading = false
    }

    func updateBudget(_ data: BudgetUpdateRequest) async throws { status = try await service.updateBudget(data) }
    func setStrategy(name: String) async throws { status = try await service.setActiveStrategy(name: name) }
    func loadSuggestion() async { do { suggestion = try await service.suggestion() } catch {} }
}
