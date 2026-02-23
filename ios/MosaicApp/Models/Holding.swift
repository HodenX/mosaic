// 贾维斯为您服务
import Foundation

struct HoldingResponse: Codable, Identifiable {
    let id: Int
    let fundCode: String
    let fundName: String
    let platform: String
    let shares: Double
    let costPrice: Double
    let purchaseDate: String
    let latestNav: Double?
    let latestNavDate: String?
    let marketValue: Double?
    let pnl: Double?
    let pnlPercent: Double?
    let createdAt: String
    let updatedAt: String
}

struct HoldingCreate: Codable {
    let fundCode: String
    let platform: String
    let shares: Double
    let costPrice: Double
    let purchaseDate: String
}

struct HoldingUpdate: Codable {
    var platform: String?
    var shares: Double?
    var costPrice: Double?
    var purchaseDate: String?
}

struct SnapshotUpdate: Codable {
    let shares: Double
    let costPrice: Double
    let changeDate: String
}

struct ChangeLog: Codable, Identifiable {
    let id: Int
    let holdingId: Int
    let changeDate: String
    let oldShares: Double
    let newShares: Double
    let oldCostPrice: Double
    let newCostPrice: Double
    let sharesDiff: Double
    let createdAt: String
}
