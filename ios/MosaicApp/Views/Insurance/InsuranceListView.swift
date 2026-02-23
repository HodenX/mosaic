// 贾维斯为您服务
import SwiftUI

struct InsuranceListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: InsuranceViewModel?
    @State private var showForm = false
    @State private var editingPolicy: InsurancePolicy?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("保险")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showForm = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showForm) {
            InsuranceFormSheet(editing: nil) { data in Task { await vm?.create(data) } }
        }
        .sheet(item: $editingPolicy) { policy in
            InsuranceFormSheet(editing: policy) { data in
                let update = InsurancePolicyUpdate(
                    name: data.name, type: data.type, policyNumber: data.policyNumber,
                    insurer: data.insurer, insuredPerson: data.insuredPerson,
                    annualPremium: data.annualPremium, coverageAmount: data.coverageAmount,
                    coverageSummary: data.coverageSummary, startDate: data.startDate,
                    endDate: data.endDate, paymentYears: data.paymentYears,
                    nextPaymentDate: data.nextPaymentDate, status: data.status
                )
                Task { await vm?.update(id: policy.id, update) }
            }
        }
        .task {
            if vm == nil { vm = InsuranceViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: InsuranceViewModel) -> some View {
        if vm.isLoading && vm.items.isEmpty {
            LoadingView()
        } else if let error = vm.error, vm.items.isEmpty {
            ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                description: Text(error.localizedDescription))
        } else if vm.items.isEmpty {
            EmptyStateView(icon: "shield", title: "暂无保单")
        } else {
            List {
                if let s = vm.summary {
                    Section {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            SummaryCard(title: "保单数", value: "\(s.activeCount)")
                            SummaryCard(title: "覆盖人数", value: "\(s.coveredPersons)")
                            SummaryCard(title: "年缴保费", value: Formatters.currency(s.totalAnnualPremium))
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                ForEach(vm.groupedByPerson, id: \.person) { group in
                    Section(group.person) {
                        ForEach(group.policies) { policy in
                            policyRow(policy, vm: vm)
                        }
                    }
                }
            }
        }
    }

    private func policyRow(_ policy: InsurancePolicy, vm: InsuranceViewModel) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(policy.name).font(.subheadline.bold())
                Spacer()
                statusBadge(policy.status)
            }
            HStack(spacing: 12) {
                Label(typeLabel(policy.type), systemImage: typeIcon(policy.type))
                    .font(.caption)
                if !policy.insurer.isEmpty {
                    Text(policy.insurer).font(.caption).foregroundStyle(.secondary)
                }
            }
            HStack {
                Text("年缴 \(Formatters.currency(policy.annualPremium))").font(.caption)
                Spacer()
                if let next = policy.nextPaymentDate {
                    paymentCountdown(next)
                }
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                Task { await vm.delete(id: policy.id) }
            } label: { Label("删除", systemImage: "trash") }
            Button { editingPolicy = policy } label: { Label("编辑", systemImage: "pencil") }.tint(.blue)
            Button {
                Task { await vm.renew(id: policy.id) }
            } label: { Label("续费", systemImage: "arrow.clockwise") }.tint(.green)
        }
    }

    private func statusBadge(_ status: String) -> some View {
        Text(status == "active" ? "有效" : status == "lapsed" ? "脱保" : "已终止")
            .font(.caption2.bold())
            .padding(.horizontal, 8).padding(.vertical, 2)
            .background(status == "active" ? Color.success.opacity(0.15) : Color.danger.opacity(0.15))
            .foregroundStyle(status == "active" ? Color.success : Color.danger)
            .clipShape(Capsule())
    }

    @ViewBuilder
    private func paymentCountdown(_ dateStr: String) -> some View {
        if let days = Formatters.daysBetween(from: dateStr) {
            let daysUntil = -days
            if daysUntil < 0 {
                Text("已逾期 \(-daysUntil) 天")
                    .font(.caption2).foregroundStyle(Color.danger)
            } else if daysUntil <= 30 {
                Text("还有 \(daysUntil) 天")
                    .font(.caption2).foregroundStyle(Color.warning)
            } else {
                Text("下次缴费 \(dateStr)")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
    }

    private func typeLabel(_ type: String) -> String {
        switch type {
        case "critical_illness": return "重疾险"
        case "medical": return "医疗险"
        case "accident": return "意外险"
        case "life": return "寿险"
        default: return type
        }
    }

    private func typeIcon(_ type: String) -> String {
        switch type {
        case "critical_illness": return "heart.fill"
        case "medical": return "cross.case.fill"
        case "accident": return "bandage.fill"
        case "life": return "person.fill"
        default: return "shield.fill"
        }
    }
}
