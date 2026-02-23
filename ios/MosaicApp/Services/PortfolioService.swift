// 贾维斯为您服务
import Foundation

struct PortfolioService {
    let api: APIClient

    func summary() async throws -> PortfolioSummary {
        try await api.get("/portfolio/summary")
    }

    func byPlatform() async throws -> [PlatformBreakdown] {
        try await api.get("/portfolio/by-platform")
    }

    func trend(start: String? = nil, end: String? = nil) async throws -> [PortfolioTrend] {
        var query: [String: String] = [:]
        if let start { query["start"] = start }
        if let end { query["end"] = end }
        return try await api.get("/portfolio/trend", query: query)
    }

    func allocation(dimension: String) async throws -> AllocationResponse {
        try await api.get("/portfolio/allocation", query: ["dimension": dimension])
    }
}
