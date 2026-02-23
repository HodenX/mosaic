// 贾维斯为您服务
import Foundation

struct DashboardService {
    let api: APIClient

    func summary() async throws -> DashboardSummary {
        try await api.get("/dashboard/summary")
    }

    func reminders() async throws -> [Reminder] {
        try await api.get("/dashboard/reminders")
    }

    func trend(days: Int = 90) async throws -> [TotalAssetTrend] {
        try await api.get("/dashboard/trend", query: ["days": "\(days)"])
    }

    func snapshot() async throws {
        try await api.postVoid("/dashboard/snapshot")
    }
}
