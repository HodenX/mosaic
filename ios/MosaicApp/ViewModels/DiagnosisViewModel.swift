// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DiagnosisViewModel {
    var report: DiagnosisResult?
    var isLoading = false
    var error: Error?
    var notFound = false

    private let service: DiagnosisService

    init(api: APIClient) {
        self.service = DiagnosisService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        notFound = false
        do {
            report = try await service.report()
        } catch let e as APIError {
            if case .serverError(404, _) = e {
                notFound = true
            } else {
                self.error = e
            }
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
