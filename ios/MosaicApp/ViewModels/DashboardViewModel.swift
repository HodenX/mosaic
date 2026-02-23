// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DashboardViewModel {
    var summary: DashboardSummary?
    var reminders: [Reminder] = []
    var trend: [TotalAssetTrend] = []
    var selectedDays = 90
    var isLoading = false
    var error: APIError?

    private let service: DashboardService

    init(api: APIClient) {
        self.service = DashboardService(api: api)
    }

    func loadAll() async {
        isLoading = true
        error = nil
        async let s = service.summary()
        async let r = service.reminders()
        async let t = service.trend(days: selectedDays)
        do {
            let (summaryResult, remindersResult, trendResult) = try await (s, r, t)
            summary = summaryResult
            reminders = remindersResult
            trend = trendResult
        } catch let e as APIError {
            error = e
        } catch {
            self.error = .networkError(error)
        }
        isLoading = false
    }

    func loadTrend() async {
        do { trend = try await service.trend(days: selectedDays) } catch {}
    }
}
