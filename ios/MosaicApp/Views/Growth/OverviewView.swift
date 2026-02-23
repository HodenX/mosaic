// 贾维斯为您服务
import SwiftUI
import Charts

struct OverviewView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: OverviewViewModel?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.summary == nil { LoadingView() }
                else if let summary = vm.summary {
                    ScrollView {
                        VStack(spacing: 16) {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                statCard("总盈亏") { PnLText(value: summary.totalPnl, font: .headline) }
                                statCard("收益率") { PercentText(value: summary.pnlPercent, font: .headline) }
                                statCard("总市值") { CurrencyText(value: summary.totalValue, font: .headline) }
                                statCard("仓位") {
                                    Text(Formatters.percent(vm.positionStatus?.positionRatio ?? 0))
                                        .font(.headline).monospacedDigit()
                                }
                            }
                            trendSection(vm.trend)
                            if !vm.platforms.isEmpty { platformSection(vm.platforms) }
                            if let alloc = vm.allocation, !alloc.items.isEmpty { allocationSection(alloc) }
                        }.padding()
                    }.refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("组合概览")
        .task {
            if vm == nil { vm = OverviewViewModel(api: api) }
            await vm?.load()
        }
    }

    private func statCard<V: View>(_ title: String, @ViewBuilder value: () -> V) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            value()
        }.frame(maxWidth: .infinity).padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func trendSection(_ data: [PortfolioTrend]) -> some View {
        VStack(alignment: .leading) {
            Text("组合走势").font(.headline)
            if data.isEmpty { Text("暂无数据").foregroundStyle(.secondary).frame(height: 200) }
            else {
                Chart(data) {
                    LineMark(x: .value("日期", $0.date), y: .value("市值", $0.totalValue))
                        .foregroundStyle(Color.bucketGrowth)
                }.chartYScale(domain: .automatic(includesZero: false)).frame(height: 200)
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func platformSection(_ platforms: [PlatformBreakdown]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("平台分布").font(.headline)
            ForEach(platforms) { p in
                HStack {
                    Text(p.platform)
                    Spacer()
                    CurrencyText(value: p.marketValue, font: .subheadline)
                    PnLText(value: p.pnl, font: .caption)
                }
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func allocationSection(_ alloc: AllocationResponse) -> some View {
        let colors: [Color] = [.blue, .green, .orange, .purple, .red, .cyan]
        return VStack(alignment: .leading, spacing: 8) {
            Text("资产配置").font(.headline)
            Chart(Array(alloc.items.enumerated()), id: \.element.category) { i, item in
                SectorMark(angle: .value("占比", item.percentage), innerRadius: .ratio(0.6))
                    .foregroundStyle(colors[i % colors.count])
            }.frame(height: 160)
            ForEach(Array(alloc.items.enumerated()), id: \.element.category) { i, item in
                HStack(spacing: 4) {
                    Circle().fill(colors[i % colors.count]).frame(width: 8, height: 8)
                    Text(item.category).font(.caption)
                    Spacer()
                    Text(Formatters.percent(item.percentage)).font(.caption).monospacedDigit()
                }
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
