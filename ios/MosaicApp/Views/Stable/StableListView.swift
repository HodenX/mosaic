// 贾维斯为您服务
import SwiftUI

struct StableListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: StableViewModel?
    @State private var showAdd = false
    @State private var editingItem: StableAsset?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.items.isEmpty {
                    LoadingView()
                } else if let error = vm.error, vm.items.isEmpty {
                    ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                        description: Text(error.localizedDescription))
                } else {
                    List {
                        if let s = vm.summary {
                            Section {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("总金额").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: s.totalAmount, font: .title2)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing) {
                                        Text("预估年收益").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: s.estimatedAnnualReturn, font: .headline)
                                    }
                                }
                            }
                        }
                        Section("资产列表") {
                            if vm.items.isEmpty {
                                EmptyStateView(icon: "building.columns", title: "暂无稳钱", message: "点击右上角添加")
                            }
                            ForEach(vm.items) { item in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(item.name).font(.headline)
                                        Spacer()
                                        CurrencyText(value: item.amount, font: .headline)
                                    }
                                    HStack {
                                        Text("\(item.platform) · \(item.type == "term_deposit" ? "定期存款" : "银行理财")")
                                            .font(.caption).foregroundStyle(.secondary)
                                        Spacer()
                                        Text("年化 \(Formatters.percent(item.annualRate))").font(.caption).foregroundStyle(.secondary)
                                    }
                                    if let maturity = item.maturityDate {
                                        maturityBadge(maturity)
                                    }
                                }
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        Task { try? await vm.delete(id: item.id) }
                                    } label: { Label("删除", systemImage: "trash") }
                                    Button { editingItem = item } label: { Label("编辑", systemImage: "pencil") }
                                        .tint(.blue)
                                }
                            }
                        }
                    }
                    .refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("稳钱")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { StableFormSheet(mode: .add) { try await vm.create($0) } }
        }
        .sheet(item: $editingItem) { item in
            if let vm {
                StableFormSheet(mode: .edit(item)) { data in
                    try await vm.update(id: item.id, StableAssetUpdate(
                        name: data.name, type: data.type, platform: data.platform,
                        amount: data.amount, annualRate: data.annualRate,
                        startDate: data.startDate, maturityDate: data.maturityDate))
                }
            }
        }
        .task {
            if vm == nil { vm = StableViewModel(api: api) }
            await vm?.load()
        }
    }

    @ViewBuilder
    private func maturityBadge(_ dateStr: String) -> some View {
        if let days = Formatters.daysBetween(from: dateStr) {
            // days > 0 means the maturity date is in the past (expired)
            // days < 0 means the maturity date is in the future
            let daysUntil = -days
            if daysUntil <= 0 {
                HStack(spacing: 4) {
                    Text("已到期")
                    Text("· \(-daysUntil) 天前")
                }
                .font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.danger.opacity(0.15), in: Capsule()).foregroundStyle(Color.danger)
            } else if daysUntil <= 30 {
                HStack(spacing: 4) {
                    Text("剩余 \(daysUntil) 天")
                }
                .font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.warning.opacity(0.15), in: Capsule()).foregroundStyle(Color.warning)
            } else {
                Text("\(dateStr) 到期 · 剩余 \(daysUntil) 天")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}
