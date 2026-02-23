// 贾维斯为您服务
import Foundation

struct PortfolioSummary: Codable {
    let totalValue: Double
    let totalCost: Double
    let totalPnl: Double
    let pnlPercent: Double
}

struct PlatformBreakdown: Codable, Identifiable {
    var id: String { platform }
    let platform: String
    let marketValue: Double
    let cost: Double
    let pnl: Double
    let count: Int
}

struct PortfolioTrend: Codable, Identifiable {
    var id: String { date }
    let date: String
    let totalValue: Double
    let totalCost: Double
    let totalPnl: Double
}
