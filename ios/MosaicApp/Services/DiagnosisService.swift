// 贾维斯为您服务
import Foundation

struct DiagnosisService {
    let api: APIClient

    func report() async throws -> DiagnosisResult {
        try await api.get("/diagnosis/report")
    }
}
