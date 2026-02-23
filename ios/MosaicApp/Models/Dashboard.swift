// 贾维斯为您服务
import Foundation

struct DashboardSummary: Codable {
    let totalAssets: Double
    let totalReturn: Double
    let totalReturnPercent: Double
    let buckets: BucketsSummary
}

struct BucketsSummary: Codable {
    let liquid: LiquidBucket
    let stable: StableBucket
    let growth: GrowthBucket
    let insurance: InsuranceBucket
}

struct LiquidBucket: Codable {
    let amount: Double
    let estimatedReturn: Double
    let count: Int
}

struct StableBucket: Codable {
    let amount: Double
    let estimatedReturn: Double
    let count: Int
    let nearestMaturityDays: Int?
}

struct GrowthBucket: Codable {
    let totalAmount: Double
    let totalCost: Double
    let totalPnl: Double
    let pnlPercent: Double
    let count: Int
}

struct InsuranceBucket: Codable {
    let activeCount: Int
    let totalCount: Int
    let annualPremium: Double
    let coveredPersons: Int
    let nearestRenewalDays: Int?
}

struct Reminder: Codable, Identifiable {
    var id: String { "\(type)-\(title)" }
    let type: String
    let level: String
    let title: String
    let detail: String
    let days: Int?
    let link: String
}

struct TotalAssetTrend: Codable, Identifiable {
    var id: String { date }
    let date: String
    let liquidAmount: Double
    let stableAmount: Double
    let growthAmount: Double
    let insurancePremium: Double
    let totalAssets: Double
}
