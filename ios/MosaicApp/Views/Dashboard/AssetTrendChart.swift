// 贾维斯为您服务
import SwiftUI
import Charts

struct AssetTrendChart: View {
    let data: [TotalAssetTrend]
    @Binding var selectedDays: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("资产走势").font(.headline)
                Spacer()
                Picker("时间", selection: $selectedDays) {
                    Text("1月").tag(30)
                    Text("3月").tag(90)
                    Text("6月").tag(180)
                    Text("1年").tag(365)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }

            if data.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 200)
            } else {
                Chart(data) { item in
                    AreaMark(x: .value("日期", item.date), y: .value("总资产", item.totalAssets))
                        .foregroundStyle(.linearGradient(
                            colors: [Color.bucketGrowth.opacity(0.3), .clear],
                            startPoint: .top, endPoint: .bottom))
                    LineMark(x: .value("日期", item.date), y: .value("总资产", item.totalAssets))
                        .foregroundStyle(Color.bucketGrowth)
                }
                .chartYAxis {
                    AxisMarks { v in
                        AxisValueLabel { if let d = v.as(Double.self) { Text(Formatters.wan(d)) } }
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 5)) { v in
                        AxisValueLabel { if let s = v.as(String.self) { Text(String(s.suffix(5))) } }
                    }
                }
                .frame(height: 200)
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
