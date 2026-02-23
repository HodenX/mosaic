// 贾维斯为您服务
import Foundation

struct StableAsset: Codable, Identifiable {
    let id: Int
    let name: String
    let type: String
    let platform: String
    let amount: Double
    let annualRate: Double
    let startDate: String?
    let maturityDate: String?
    let updatedAt: String
}

struct StableAssetCreate: Codable {
    let name: String
    let type: String
    var platform: String?
    var amount: Double?
    var annualRate: Double?
    var startDate: String?
    var maturityDate: String?
}

struct StableAssetUpdate: Codable {
    var name: String?
    var type: String?
    var platform: String?
    var amount: Double?
    var annualRate: Double?
    var startDate: String?
    var maturityDate: String?
}

struct StableAssetList: Codable {
    let items: [StableAsset]
    let summary: StableSummary
}

struct StableSummary: Codable {
    let totalAmount: Double
    let estimatedAnnualReturn: Double
    let count: Int
}
