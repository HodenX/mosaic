// 贾维斯为您服务
import Foundation

struct LiquidService {
    let api: APIClient

    func list() async throws -> LiquidAssetList {
        try await api.get("/liquid")
    }

    func create(_ data: LiquidAssetCreate) async throws -> LiquidAsset {
        try await api.post("/liquid", body: data)
    }

    func update(id: Int, _ data: LiquidAssetUpdate) async throws -> LiquidAsset {
        try await api.put("/liquid/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/liquid/\(id)")
    }
}
