// 贾维斯为您服务
import SwiftUI

struct FundDetailView: View {
    @Environment(APIClient.self) private var api
    let fundCode: String
    @State private var vm: FundDetailViewModel?

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

                            NavHistoryChart(data: vm.navHistory)
                            if !vm.allocation.isEmpty { AllocationPieChart(allocation: vm.allocation) }
                            if !vm.topHoldings.isEmpty { topHoldingsSection(vm.topHoldings) }
                        }.padding()
                    }
                }
            }
        }
        .navigationTitle(fundCode)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if vm == nil { vm = FundDetailViewModel(api: api, fundCode: fundCode) }
            await vm?.load()
        }
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
