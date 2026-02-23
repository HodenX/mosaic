// 贾维斯为您服务
import SwiftUI
import Charts

struct AllocationPieChart: View {
    let allocation: FundAllocation
    @State private var selectedDimension = "asset_class"
    private let dimensionLabels = ["asset_class": "资产类别", "sector": "行业", "geography": "地域"]
    private let colors: [Color] = [.blue, .green, .orange, .purple, .red, .cyan, .yellow, .pink]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("资产配置").font(.headline)
                Spacer()
                Picker("维度", selection: $selectedDimension) {
                    ForEach(Array(allocation.keys.sorted()), id: \.self) { key in
                        Text(dimensionLabels[key] ?? key).tag(key)
                    }
                }.pickerStyle(.segmented).frame(width: 220)
            }
            if let items = allocation[selectedDimension], !items.isEmpty {
                Chart(Array(items.enumerated()), id: \.element.category) { i, item in
                    SectorMark(angle: .value("占比", item.percentage), innerRadius: .ratio(0.55))
                        .foregroundStyle(colors[i % colors.count])
                }.frame(height: 160)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                    ForEach(Array(items.enumerated()), id: \.element.category) { i, item in
                        HStack(spacing: 4) {
                            Circle().fill(colors[i % colors.count]).frame(width: 8, height: 8)
                            Text(item.category).font(.caption2)
                            Spacer()
                            Text(Formatters.percent(item.percentage)).font(.caption2).monospacedDigit()
                        }
                    }
                }
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
