// 贾维斯为您服务
import Foundation
import Observation

@Observable
class FundDetailViewModel {
    var fundInfo: FundInfo?
    var navHistory: [NavHistory] = []
    var allocation: FundAllocation = [:]
    var topHoldings: [TopHolding] = []
    var isLoading = false
    private let service: FundsService
    let fundCode: String

    init(api: APIClient, fundCode: String) {
        self.service = FundsService(api: api); self.fundCode = fundCode
    }

    func load() async {
        isLoading = true
        async let i = service.get(code: fundCode)
        async let n = service.navHistory(code: fundCode)
        async let a = service.allocation(code: fundCode)
        async let t = service.topHoldings(code: fundCode)
        do {
            fundInfo = try await i; navHistory = try await n
            allocation = try await a; topHoldings = try await t
        } catch {}
        isLoading = false
    }
}
