// 贾维斯为您服务
import Foundation

struct FundInfo: Codable {
    let fundCode: String
    let fundName: String
    let fundType: String
    let managementCompany: String
    let latestNav: Double?
    let latestNavDate: String?
}

struct NavHistory: Codable, Identifiable {
    var id: String { date }
    let date: String
    let nav: Double
}

struct AllocationItem: Codable, Identifiable {
    var id: String { category }
    let category: String
    let percentage: Double
    let funds: [AllocationFundDetail]?
}

struct AllocationFundDetail: Codable, Identifiable {
    var id: String { fundCode }
    let fundCode: String
    let fundName: String
    let percentage: Double
}

struct AllocationCoverage: Codable {
    let coveredFunds: Int
    let totalFunds: Int
    let coveredValue: Double
    let totalValue: Double
    let coveredPercent: Double
    let missingFunds: [String]
}

struct AllocationResponse: Codable {
    let items: [AllocationItem]
    let coverage: AllocationCoverage
}

typealias FundAllocation = [String: [AllocationItem]]

struct TopHolding: Codable, Identifiable {
    var id: String { stockCode }
    let stockCode: String
    let stockName: String
    let percentage: Double
}
