// 贾维斯为您服务
import SwiftUI

extension Color {
    // 翡翠金主题
    static let jade = Color(red: 0.18, green: 0.55, blue: 0.34)
    static let jadeLight = Color(red: 0.24, green: 0.70, blue: 0.44)

    // 四桶颜色
    static let bucketLiquid = Color.blue
    static let bucketStable = Color.green
    static let bucketGrowth = Color.orange
    static let bucketInsurance = Color.purple

    // 盈亏颜色
    static let profit = Color.red       // 中国市场：红涨
    static let loss = Color.green       // 中国市场：绿跌

    static func pnlColor(_ value: Double) -> Color {
        if value > 0 { return .profit }
        if value < 0 { return .loss }
        return .secondary
    }
}
