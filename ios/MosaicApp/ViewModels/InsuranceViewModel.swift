// 贾维斯为您服务
import Foundation
import Observation

@Observable
class InsuranceViewModel {
    var items: [InsurancePolicy] = []
    var summary: InsuranceSummary?
    var isLoading = false
    var error: Error?

    private let service: InsuranceService

    init(api: APIClient) {
        self.service = InsuranceService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await service.list()
            items = result.items
            summary = result.summary
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func create(_ data: InsurancePolicyCreate) async {
        do {
            _ = try await service.create(data)
            await load()
        } catch { self.error = error }
    }

    func update(id: Int, _ data: InsurancePolicyUpdate) async {
        do {
            _ = try await service.update(id: id, data)
            await load()
        } catch { self.error = error }
    }

    func delete(id: Int) async {
        do {
            try await service.delete(id: id)
            await load()
        } catch { self.error = error }
    }

    func renew(id: Int) async {
        do {
            _ = try await service.renew(id: id)
            await load()
        } catch { self.error = error }
    }

    var groupedByPerson: [(person: String, policies: [InsurancePolicy])] {
        let grouped = Dictionary(grouping: items, by: \.insuredPerson)
        return grouped.sorted { $0.key < $1.key }.map { (person: $0.key, policies: $0.value) }
    }
}
