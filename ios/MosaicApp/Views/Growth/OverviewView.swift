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
                                positionStatCard(vm)
                            }

                            if let ps = vm.positionStatus, (ps.isBelowMin || ps.isAboveMax) {
                                WarningBanner(
                                    message: ps.isBelowMin
                                        ? "仓位低于目标下限 \(Formatters.percent(ps.targetPositionMin))，建议适当加仓"
                                        : "仓位高于目标上限 \(Formatters.percent(ps.targetPositionMax))，建议适当减仓",
                                    level: ps.isAboveMax ? .danger : .warning
                                )
                            }

                            trendSection(vm.trend)
                            if !vm.platforms.isEmpty { platformSection(vm.platforms) }
                            if let alloc = vm.allocation, !alloc.items.isEmpty { allocationSection(alloc) }
                        }.padding()
                    }.refreshable { await vm.load() }
                } else if let error = vm.error {
                    ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                        description: Text(error.localizedDescription))
                } else {
                    LoadingView()
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

    private func positionStatCard(_ vm: OverviewViewModel) -> some View {
        let ratio = vm.positionStatus?.positionRatio ?? 0
        let isBelowMin = vm.positionStatus?.isBelowMin == true
        let isAboveMax = vm.positionStatus?.isAboveMax == true
        let color: Color = isAboveMax ? .danger : (isBelowMin ? .warning : .primary)
        return VStack(spacing: 4) {
            Text("仓位").font(.caption).foregroundStyle(.secondary)
            Text(Formatters.percent(ratio))
                .font(.headline).monospacedDigit()
                .foregroundStyle(color)
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
                if data.count < 5 {
                    Text("数据积累中，建议持续记录以获得完整走势")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func platformSection(_ platforms: [PlatformBreakdown]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("平台分布").font(.headline)
            ForEach(platforms) { p in
                HStack {
                    Text(Formatters.platformDisplayName(p.platform))
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
