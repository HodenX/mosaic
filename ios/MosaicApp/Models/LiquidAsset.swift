// 贾维斯为您服务
import Foundation

struct LiquidAsset: Codable, Identifiable {
    let id: Int
    let name: String
    let type: String
    let platform: String
    let amount: Double
    let annualRate: Double?
    let updatedAt: String
}

struct LiquidAssetCreate: Codable {
    let name: String
    let type: String
    var platform: String?
    var amount: Double?
    var annualRate: Double?
}

struct LiquidAssetUpdate: Codable {
    var name: String?
    var type: String?
    var platform: String?
    var amount: Double?
    var annualRate: Double?
}

struct LiquidAssetList: Codable {
    let items: [LiquidAsset]
    let summary: LiquidSummary
}

struct LiquidSummary: Codable {
    let totalAmount: Double
    let estimatedAnnualReturn: Double
    let count: Int
}
