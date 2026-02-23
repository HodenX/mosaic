// 贾维斯为您服务
import SwiftUI
import Charts

struct NavHistoryChart: View {
    let data: [NavHistory]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("净值走势").font(.headline)
            if data.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 180)
            } else {
                Chart(data) { item in
                    LineMark(x: .value("日期", item.date), y: .value("净值", item.nav))
                        .foregroundStyle(Color.accentColor)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 180)
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
