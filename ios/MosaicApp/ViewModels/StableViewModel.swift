// 贾维斯为您服务
import Foundation
import Observation

@Observable
class StableViewModel {
    var items: [StableAsset] = []
    var summary: StableSummary?
    var isLoading = false
    var error: APIError?
    private let service: StableService

    init(api: APIClient) { self.service = StableService(api: api) }

    func load() async {
        isLoading = true
        do {
            let result = try await service.list()
            items = result.items; summary = result.summary
        } catch let e as APIError { error = e }
        catch { self.error = .networkError(error) }
        isLoading = false
    }

    func create(_ data: StableAssetCreate) async throws {
        _ = try await service.create(data); await load()
    }
    func update(id: Int, _ data: StableAssetUpdate) async throws {
        _ = try await service.update(id: id, data); await load()
    }
    func delete(id: Int) async throws {
        try await service.delete(id: id); await load()
    }
}
