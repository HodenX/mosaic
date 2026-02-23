// 贾维斯为您服务
import Foundation

struct FundsService {
    let api: APIClient

    func get(code: String) async throws -> FundInfo {
        try await api.get("/funds/\(code)")
    }

    func navHistory(code: String, start: String? = nil, end: String? = nil) async throws -> [NavHistory] {
        var query: [String: String] = [:]
        if let start { query["start"] = start }
        if let end { query["end"] = end }
        return try await api.get("/funds/\(code)/nav-history", query: query)
    }

    func refresh(code: String) async throws -> [String: String] {
        try await api.post("/funds/\(code)/refresh")
    }

    func allocation(code: String) async throws -> FundAllocation {
        try await api.get("/funds/\(code)/allocation")
    }

    func topHoldings(code: String) async throws -> [TopHolding] {
        try await api.get("/funds/\(code)/top-holdings")
    }
}
