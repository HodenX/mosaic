// 贾维斯为您服务
import Foundation

struct HoldingsService {
    let api: APIClient

    func list() async throws -> [HoldingResponse] {
        try await api.get("/holdings")
    }

    func create(_ data: HoldingCreate) async throws -> HoldingResponse {
        try await api.post("/holdings", body: data)
    }

    func update(id: Int, _ data: HoldingUpdate) async throws -> HoldingResponse {
        try await api.put("/holdings/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/holdings/\(id)")
    }

    func updateSnapshot(id: Int, _ data: SnapshotUpdate) async throws -> HoldingResponse {
        try await api.post("/holdings/\(id)/update-snapshot", body: data)
    }

    func changelog(id: Int) async throws -> [ChangeLog] {
        try await api.get("/holdings/\(id)/changelog")
    }
}
