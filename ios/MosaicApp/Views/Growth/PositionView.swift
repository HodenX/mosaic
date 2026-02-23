// 贾维斯为您服务
import SwiftUI

struct PositionView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: PositionViewModel?
    @State private var showBudgetEdit = false
    @State private var showSuggestion = false

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.status == nil { LoadingView() }
                else if let status = vm.status {
                    ScrollView {
                        VStack(spacing: 16) {
                            PositionGaugeView(ratio: status.positionRatio,
                                minTarget: status.targetPositionMin, maxTarget: status.targetPositionMax)

                            VStack(spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("总预算").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalBudget, font: .headline)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing) {
                                        Text("可用资金").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.availableCash, font: .headline)
                                    }
                                }
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("总市值").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalValue, font: .subheadline)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing) {
                                        Text("总成本").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalCost, font: .subheadline)
                                    }
                                }
                            }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            VStack(alignment: .leading, spacing: 8) {
                                Text("投资策略").font(.headline)
                                ForEach(vm.strategies) { s in
                                    HStack {
                                        VStack(alignment: .leading) {
                                            Text(s.displayName).font(.subheadline)
                                            Text(s.description).font(.caption).foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        if s.name == status.activeStrategy {
                                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                        } else {
                                            Button("启用") { Task { try? await vm.setStrategy(name: s.name) } }
                                                .buttonStyle(.bordered).controlSize(.small)
                                        }
                                    }.padding(.vertical, 4)
                                }
                            }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            Button { showSuggestion = true; Task { await vm.loadSuggestion() } } label: {
                                Label("获取策略建议", systemImage: "lightbulb").frame(maxWidth: .infinity)
                            }.buttonStyle(.borderedProminent)
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
        .navigationTitle("仓位管理")
        .toolbar { Button { showBudgetEdit = true } label: { Image(systemName: "slider.horizontal.3") } }
        .sheet(isPresented: $showBudgetEdit) {
            if let vm, let s = vm.status { BudgetEditSheet(status: s) { try await vm.updateBudget($0) } }
        }
        .sheet(isPresented: $showSuggestion) {
            if let vm { StrategyView(suggestion: vm.suggestion) }
        }
        .task {
            if vm == nil { vm = PositionViewModel(api: api) }
            await vm?.load()
        }
    }
}

struct BudgetEditSheet: View {
    let status: PositionStatus
    let onSave: (BudgetUpdateRequest) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var totalBudget = ""
    @State private var minTarget = ""
    @State private var maxTarget = ""
    @State private var reason = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("总预算", text: $totalBudget).keyboardType(.decimalPad)
                TextField("目标仓位下限 (%)", text: $minTarget).keyboardType(.decimalPad)
                TextField("目标仓位上限 (%)", text: $maxTarget).keyboardType(.decimalPad)
                TextField("调整原因", text: $reason)
            }
            .navigationTitle("预算设置").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        Task {
                            try? await onSave(BudgetUpdateRequest(totalBudget: Double(totalBudget),
                                targetPositionMin: Double(minTarget), targetPositionMax: Double(maxTarget),
                                reason: reason.isEmpty ? nil : reason))
                            dismiss()
                        }
                    }
                }
            }
            .onAppear {
                totalBudget = "\(status.totalBudget)"
                minTarget = "\(status.targetPositionMin)"
                maxTarget = "\(status.targetPositionMax)"
            }
        }
    }
}
