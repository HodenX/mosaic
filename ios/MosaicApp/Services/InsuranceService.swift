// 贾维斯为您服务
import Foundation

struct InsuranceService {
    let api: APIClient

    func list(insuredPerson: String? = nil) async throws -> InsurancePolicyList {
        var query: [String: String] = [:]
        if let insuredPerson { query["insured_person"] = insuredPerson }
        return try await api.get("/insurance", query: query)
    }

    func create(_ data: InsurancePolicyCreate) async throws -> InsurancePolicy {
        try await api.post("/insurance", body: data)
    }

    func update(id: Int, _ data: InsurancePolicyUpdate) async throws -> InsurancePolicy {
        try await api.put("/insurance/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/insurance/\(id)")
    }

    func renew(id: Int) async throws -> InsurancePolicy {
        try await api.post("/insurance/\(id)/renew")
    }
}
