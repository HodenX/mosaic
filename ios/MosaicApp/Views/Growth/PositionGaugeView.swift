// 贾维斯为您服务
import SwiftUI

struct PositionGaugeView: View {
    let ratio: Double
    let minTarget: Double
    let maxTarget: Double

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().trim(from: 0, to: 0.75)
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 20)
                    .rotationEffect(.degrees(135))
                Circle().trim(from: CGFloat(minTarget / 100 * 0.75), to: CGFloat(maxTarget / 100 * 0.75))
                    .stroke(Color.green.opacity(0.3), lineWidth: 20)
                    .rotationEffect(.degrees(135))
                Circle().trim(from: 0, to: CGFloat(min(ratio, 100) / 100 * 0.75))
                    .stroke(gaugeColor, lineWidth: 20)
                    .rotationEffect(.degrees(135))
                VStack(spacing: 2) {
                    Text(Formatters.percent(ratio)).font(.system(size: 28, weight: .bold)).monospacedDigit()
                    Text("当前仓位").font(.caption).foregroundStyle(.secondary)
                }
            }.frame(width: 180, height: 180)
            Label("目标 \(Formatters.percent(minTarget))-\(Formatters.percent(maxTarget))", systemImage: "target")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var gaugeColor: Color {
        if ratio < minTarget { return .orange }
        if ratio > maxTarget { return .red }
        return .green
    }
}
