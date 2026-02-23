// 贾维斯为您服务
import SwiftUI

struct LiquidListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: LiquidViewModel?
    @State private var showAdd = false
    @State private var editingItem: LiquidAsset?

    var body: some View {
        Group {
            if let vm {
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
                            EmptyStateView(icon: "drop", title: "暂无活钱", message: "点击右上角添加")
                        }
                        ForEach(vm.items) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.name).font(.headline)
                                    Text("\(item.platform) · \(item.type == "deposit" ? "活期存款" : "货币基金")")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    CurrencyText(value: item.amount, font: .headline)
                                    if let rate = item.annualRate, rate > 0 {
                                        Text("年化 \(Formatters.percent(rate))").font(.caption).foregroundStyle(.secondary)
                                    }
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
            } else {
                LoadingView()
            }
        }
        .navigationTitle("活钱")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { LiquidFormSheet(mode: .add) { try await vm.create($0) } }
        }
        .sheet(item: $editingItem) { item in
            if let vm {
                LiquidFormSheet(mode: .edit(item)) { data in
                    try await vm.update(id: item.id, LiquidAssetUpdate(
                        name: data.name, type: data.type, platform: data.platform,
                        amount: data.amount, annualRate: data.annualRate))
                }
            }
        }
        .task {
            if vm == nil { vm = LiquidViewModel(api: api) }
            await vm?.load()
        }
    }
}
