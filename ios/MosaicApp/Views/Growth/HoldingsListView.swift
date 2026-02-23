// 贾维斯为您服务
import SwiftUI

struct HoldingsListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: HoldingsViewModel?
    @State private var showAdd = false
    @State private var sortBy: SortOption = .defaultOrder

    enum SortOption: String, CaseIterable {
        case defaultOrder = "默认"
        case marketValue = "市值"
        case pnlPercent = "盈亏率"
    }

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
                        Section {
                            summaryRow(vm.holdings)
                        }
                        Section {
                            ForEach(sortedHoldings(vm.holdings)) { h in
                                NavigationLink { FundDetailView(fundCode: h.fundCode) } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(h.fundName).font(.headline)
                                            Text("\(h.fundCode) · \(Formatters.platformDisplayName(h.platform))")
                                                .font(.caption).foregroundStyle(.secondary)
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
                    }
                    .refreshable { await vm.load() }
                }
            } else {
                LoadingView()
            }
        }
        .navigationTitle("持仓明细")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    Menu {
                        ForEach(SortOption.allCases, id: \.self) { opt in
                            Button {
                                sortBy = opt
                            } label: {
                                HStack {
                                    Text(opt.rawValue)
                                    if sortBy == opt { Image(systemName: "checkmark") }
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
        }
        .sheet(isPresented: $showAdd) {
            if let vm { HoldingFormSheet { try await vm.create($0) } }
        }
        .task {
            if vm == nil { vm = HoldingsViewModel(api: api) }
            await vm?.load()
        }
    }

    private func summaryRow(_ holdings: [HoldingResponse]) -> some View {
        let totalMV = holdings.compactMap(\.marketValue).reduce(0, +)
        let totalPnl = holdings.compactMap(\.pnl).reduce(0, +)
        return HStack {
            Text("\(holdings.count) 只基金")
                .font(.subheadline).foregroundStyle(.secondary)
            Spacer()
            Text("总市值").font(.caption).foregroundStyle(.secondary)
            CurrencyText(value: totalMV, useWan: true, font: .subheadline)
            Text("·").foregroundStyle(.secondary)
            Text("盈亏").font(.caption).foregroundStyle(.secondary)
            PnLText(value: totalPnl, font: .subheadline)
        }
    }

    private func sortedHoldings(_ holdings: [HoldingResponse]) -> [HoldingResponse] {
        switch sortBy {
        case .defaultOrder:
            return holdings
        case .marketValue:
            return holdings.sorted { ($0.marketValue ?? 0) > ($1.marketValue ?? 0) }
        case .pnlPercent:
            return holdings.sorted { ($0.pnlPercent ?? 0) > ($1.pnlPercent ?? 0) }
        }
    }
}
