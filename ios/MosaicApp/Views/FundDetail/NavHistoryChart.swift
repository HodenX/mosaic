// 贾维斯为您服务
import SwiftUI
import Charts

struct NavHistoryChart: View {
    let data: [NavHistory]
    @Binding var selectedDays: Int
    var onDaysChanged: ((Int) -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("净值走势").font(.headline)
                Spacer()
                Picker("时间", selection: $selectedDays) {
                    Text("1月").tag(30)
                    Text("3月").tag(90)
                    Text("6月").tag(180)
                    Text("1年").tag(365)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
                .onChange(of: selectedDays) { _, newValue in
                    onDaysChanged?(newValue)
                }
            }
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
