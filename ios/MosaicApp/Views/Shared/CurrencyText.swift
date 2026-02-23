// 贾维斯为您服务
import SwiftUI

struct CurrencyText: View {
    let value: Double
    var useWan: Bool = false
    var font: Font = .body

    var body: some View {
        Text(useWan ? Formatters.wan(value) : Formatters.currency(value))
            .font(font)
            .monospacedDigit()
    }
}
