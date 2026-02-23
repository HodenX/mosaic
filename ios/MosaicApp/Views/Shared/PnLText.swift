// 贾维斯为您服务
import SwiftUI

struct PnLText: View {
    let value: Double
    var font: Font = .body

    var body: some View {
        Text(formatted)
            .font(font)
            .monospacedDigit()
            .foregroundStyle(Color.pnlColor(value))
    }

    private var formatted: String {
        let sign = value > 0 ? "+" : ""
        return "\(sign)\(Formatters.currency(value))"
    }
}
