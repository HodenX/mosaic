// 贾维斯为您服务
import Foundation

struct StableService {
    let api: APIClient

    func list() async throws -> StableAssetList {
        try await api.get("/stable")
    }

    func create(_ data: StableAssetCreate) async throws -> StableAsset {
        try await api.post("/stable", body: data)
    }

    func update(id: Int, _ data: StableAssetUpdate) async throws -> StableAsset {
        try await api.put("/stable/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/stable/\(id)")
    }
}
