// 贾维斯为您服务
import Foundation

struct PositionService {
    let api: APIClient

    func getBudget() async throws -> PositionStatus {
        try await api.get("/position/budget")
    }

    func updateBudget(_ data: BudgetUpdateRequest) async throws -> PositionStatus {
        try await api.put("/position/budget", body: data)
    }

    func changelog() async throws -> [BudgetChangeLogEntry] {
        try await api.get("/position/budget/changelog")
    }

    func strategies() async throws -> [StrategyInfo] {
        try await api.get("/position/strategies")
    }

    func setActiveStrategy(name: String) async throws -> PositionStatus {
        try await api.put("/position/active-strategy", body: ActiveStrategyUpdate(strategyName: name))
    }

    func getStrategyConfig(name: String) async throws -> [String: AnyCodableValue] {
        try await api.get("/position/strategy-config/\(name)")
    }

    func updateStrategyConfig(name: String, config: [String: AnyCodableValue]) async throws -> [String: AnyCodableValue] {
        try await api.put("/position/strategy-config/\(name)", body: StrategyConfigUpdate(configJson: config))
    }

    func suggestion() async throws -> StrategyResult {
        try await api.get("/position/suggestion")
    }
}
