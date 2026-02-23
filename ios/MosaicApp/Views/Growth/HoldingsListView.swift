// 贾维斯为您服务
import SwiftUI

struct HoldingsListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: HoldingsViewModel?
    @State private var showAdd = false

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.holdings.isEmpty {
                    LoadingView()
                } else if let error = vm.error {
                    ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                        description: Text(error.localizedDescription))
                } else if vm.holdings.isEmpty {
                    EmptyStateView(icon: "list.bullet.rectangle", title: "暂无持仓",
                        message: "点击右上角 + 添加基金持仓")
                } else {
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
            } else {
                LoadingView()
            }
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
