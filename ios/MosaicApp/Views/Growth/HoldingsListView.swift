// 贾维斯为您服务
import SwiftUI

struct HoldingsListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: HoldingsViewModel?
    @State private var showAdd = false

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.holdings.isEmpty { LoadingView() }
                else {
                    List {
                        ForEach(vm.holdings) { h in
                            NavigationLink { FundDetailView(fundCode: h.fundCode) } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(h.fundName).font(.headline)
                                        Text("\(h.fundCode) · \(h.platform)").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 4) {
                                        if let mv = h.marketValue { CurrencyText(value: mv, font: .headline) }
                                        if let pnl = h.pnl, let pct = h.pnlPercent {
                                            HStack(spacing: 4) {
                                                PnLText(value: pnl, font: .caption)
                                                PercentText(value: pct, font: .caption)
                                            }
                                        }
                                    }
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { Task { try? await vm.delete(id: h.id) } }
                                    label: { Label("删除", systemImage: "trash") }
                            }
                        }
                    }
                    .refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("持仓明细")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { HoldingFormSheet { try await vm.create($0) } }
        }
        .task {
            if vm == nil { vm = HoldingsViewModel(api: api) }
            await vm?.load()
        }
    }
}
