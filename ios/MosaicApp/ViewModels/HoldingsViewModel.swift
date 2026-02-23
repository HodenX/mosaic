// 贾维斯为您服务
import Foundation
import Observation

@Observable
class HoldingsViewModel {
    var holdings: [HoldingResponse] = []
    var isLoading = false
    var error: APIError?
    private let service: HoldingsService

    init(api: APIClient) { self.service = HoldingsService(api: api) }

    func load() async {
        isLoading = true
        do { holdings = try await service.list() }
        catch let e as APIError { error = e }
        catch { self.error = .networkError(error) }
        isLoading = false
    }

    func create(_ data: HoldingCreate) async throws { _ = try await service.create(data); await load() }
    func delete(id: Int) async throws { try await service.delete(id: id); await load() }
    func updateSnapshot(id: Int, _ data: SnapshotUpdate) async throws {
        _ = try await service.updateSnapshot(id: id, data); await load()
    }
}
