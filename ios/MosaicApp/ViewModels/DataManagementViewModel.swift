// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DataManagementViewModel {
    var holdings: [HoldingResponse] = []
    var isLoading = false
    var error: Error?
    var refreshingCodes: Set<String> = []
    var refreshProgress: Double = 0
    var isRefreshingAll = false

    private let holdingsService: HoldingsService
    private let fundsService: FundsService

    init(api: APIClient) {
        self.holdingsService = HoldingsService(api: api)
        self.fundsService = FundsService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            holdings = try await holdingsService.list()
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func refreshFund(code: String) async {
        refreshingCodes.insert(code)
        do {
            _ = try await fundsService.refresh(code: code)
        } catch {
            self.error = error
        }
        refreshingCodes.remove(code)
        await load()
    }

    func refreshAll() async {
        isRefreshingAll = true
        refreshProgress = 0
        let codes = Array(Set(holdings.map(\.fundCode)))
        let total = Double(codes.count)

        await withTaskGroup(of: Void.self) { group in
            var index = 0
            for code in codes {
                group.addTask {
                    await self.refreshFund(code: code)
                }
                index += 1
                if index % 3 == 0 {
                    for await _ in group.prefix(3) {}
                }
                refreshProgress = Double(index) / total
            }
            for await _ in group {}
        }

        refreshProgress = 1.0
        isRefreshingAll = false
        await load()
    }
}
