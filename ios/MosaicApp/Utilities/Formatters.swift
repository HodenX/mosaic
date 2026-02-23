// 贾维斯为您服务
import Foundation

enum Formatters {
    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "zh_CN")
        f.currencySymbol = "¥"
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 2
        return f
    }()

    private static let percentFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 2
        f.multiplier = 1  // 后端已经是百分比数值如 5.26，不需要 x100
        return f
    }()

    private static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "zh_CN")
        return f
    }()

    static func currency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "¥0.00"
    }

    static func wan(_ value: Double) -> String {
        if abs(value) >= 10000 {
            let v = value / 10000
            return String(format: "%.2f万", v)
        }
        return currency(value)
    }

    static func percent(_ value: Double) -> String {
        String(format: "%.2f%%", value)
    }

    static func isoDate(_ date: Date) -> String {
        isoDateFormatter.string(from: date)
    }

    static func displayDate(_ date: Date) -> String {
        displayDateFormatter.string(from: date)
    }

    static func parseDate(_ string: String) -> Date? {
        isoDateFormatter.date(from: string)
    }

    static func daysBetween(from dateString: String, to: Date = Date()) -> Int? {
        guard let date = isoDateFormatter.date(from: dateString) else { return nil }
        return Calendar.current.dateComponents([.day], from: date, to: to).day
    }

    static func relativeDays(_ days: Int) -> String {
        if days > 0 { return "已过期 \(days) 天" }
        if days < 0 { return "剩余 \(-days) 天" }
        return "今天到期"
    }

    static func platformDisplayName(_ raw: String) -> String {
        let map: [String: String] = [
            "alipay": "支付宝", "蚂蚁财富": "支付宝",
            "tiantian": "天天基金", "天天": "天天基金",
            "博时 app": "博时基金", "博时app": "博时基金",
            "eastmoney": "天天基金", "danjuan": "蛋卷基金",
            "wechat": "微信理财", "jd": "京东金融",
            "cmb": "招商银行", "icbc": "工商银行",
        ]
        return map[raw.lowercased()] ?? map[raw] ?? raw
    }
}
