// 贾维斯为您服务
import SwiftUI

struct FundDetailView: View {
    @Environment(APIClient.self) private var api
    let fundCode: String
    @State private var vm: FundDetailViewModel?
    @State private var navDays = 90

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.fundInfo == nil { LoadingView() }
                else if let info = vm.fundInfo {
                    ScrollView {
                        VStack(spacing: 16) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(info.fundName).font(.title2).bold()
                                HStack {
                                    Text(info.fundCode); Text("·"); Text(info.fundType)
                                }.font(.caption).foregroundStyle(.secondary)
                                Text(info.managementCompany).font(.caption).foregroundStyle(.secondary)
                                if let nav = info.latestNav, let date = info.latestNavDate {
                                    HStack {
                                        Text("最新净值").foregroundStyle(.secondary)
                                        Text(String(format: "%.4f", nav)).bold().monospacedDigit()
                                        Text("(\(date))").foregroundStyle(.secondary)
                                    }.font(.subheadline)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            if !vm.myHoldings.isEmpty {
                                myHoldingsSection(vm.myHoldings)
                            }

                            NavHistoryChart(data: vm.navHistory, selectedDays: $navDays) { days in
                                Task { await vm.loadNavHistory(days: days) }
                            }
                            if !vm.allocation.isEmpty { AllocationPieChart(allocation: vm.allocation) }
                            if !vm.topHoldings.isEmpty { topHoldingsSection(vm.topHoldings) }
                        }.padding()
                    }
                } else if let error = vm.error {
                    ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                        description: Text(error.localizedDescription))
                } else {
                    LoadingView()
                }
            } else {
                LoadingView()
            }
        }
        .navigationTitle(vm?.fundInfo?.fundName ?? fundCode)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if vm == nil { vm = FundDetailViewModel(api: api, fundCode: fundCode) }
            await vm?.load()
        }
    }

    private func myHoldingsSection(_ holdings: [HoldingResponse]) -> some View {
        let totalShares = holdings.reduce(0) { $0 + $1.shares }
        let totalMarketValue = holdings.compactMap(\.marketValue).reduce(0, +)
        let totalCost = holdings.reduce(0) { $0 + $1.shares * $1.costPrice }
        let totalPnl = totalMarketValue - totalCost

        return VStack(alignment: .leading, spacing: 8) {
            Text("我的持仓").font(.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("份额").font(.caption).foregroundStyle(.secondary)
                    Text(String(format: "%.2f", totalShares)).font(.subheadline).monospacedDigit()
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("成本").font(.caption).foregroundStyle(.secondary)
                    CurrencyText(value: totalCost, font: .subheadline)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("市值").font(.caption).foregroundStyle(.secondary)
                    CurrencyText(value: totalMarketValue, font: .subheadline)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("盈亏").font(.caption).foregroundStyle(.secondary)
                    PnLText(value: totalPnl, font: .subheadline)
                }
            }
            if holdings.count > 1 {
                ForEach(holdings) { h in
                    HStack {
                        Text(Formatters.platformDisplayName(h.platform)).font(.caption)
                        Spacer()
                        if let mv = h.marketValue { CurrencyText(value: mv, font: .caption) }
                        if let pnl = h.pnl { PnLText(value: pnl, font: .caption) }
                    }
                }
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func topHoldingsSection(_ holdings: [TopHolding]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("重仓股").font(.headline)
            ForEach(holdings) { h in
                HStack {
                    Text(h.stockName)
                    Spacer()
                    Text(Formatters.percent(h.percentage)).monospacedDigit().foregroundStyle(.secondary)
                }.font(.subheadline)
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
