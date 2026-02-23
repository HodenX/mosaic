// 贾维斯为您服务
import SwiftUI

struct BucketSummaryCard: View {
    let title: String
    let icon: String
    let color: Color
    let amount: Double
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon).font(.caption).foregroundStyle(color)
            CurrencyText(value: amount, font: .headline)
            Text(subtitle).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
    }
}
