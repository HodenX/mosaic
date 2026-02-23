// 贾维斯为您服务
import SwiftUI

struct PercentText: View {
    let value: Double
    var showSign: Bool = true
    var font: Font = .body

    var body: some View {
        Text(formatted)
            .font(font)
            .monospacedDigit()
            .foregroundStyle(Color.pnlColor(value))
    }

    private var formatted: String {
        let sign = showSign && value > 0 ? "+" : ""
        return "\(sign)\(Formatters.percent(value))"
    }
}
