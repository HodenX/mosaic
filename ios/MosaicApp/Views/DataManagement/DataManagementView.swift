// 贾维斯为您服务
import SwiftUI

struct DataManagementView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DataManagementViewModel?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("数据管理")
        .task {
            if vm == nil { vm = DataManagementViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: DataManagementViewModel) -> some View {
        if vm.isLoading && vm.holdings.isEmpty {
            LoadingView()
        } else if let error = vm.error, vm.holdings.isEmpty {
            ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                description: Text(error.localizedDescription))
        } else {
            let funds = uniqueFunds(from: vm.holdings)
            let staleCount = funds.filter { isStale($0.latestNavDate, threshold: 2) }.count

            List {
                Section {
                    Button {
                        Task { await vm.refreshAll() }
                    } label: {
                        HStack {
                            Label("刷新全部基金数据", systemImage: "arrow.triangle.2.circlepath")
                            Spacer()
                            if vm.isRefreshingAll {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(vm.isRefreshingAll)

                    if vm.isRefreshingAll {
                        ProgressView(value: vm.refreshProgress)
                            .tint(.jade)
                    }

                    if staleCount > 0 {
                        WarningBanner(
                            message: "\(staleCount) 只基金数据过期",
                            level: staleCount > 3 ? .danger : .warning
                        )
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                    }
                }

                Section("基金数据状态") {
                    ForEach(funds, id: \.fundCode) { h in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(h.fundName).font(.subheadline)
                                Text(h.fundCode).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                if let nav = h.latestNav {
                                    Text(String(format: "%.4f", nav)).font(.subheadline).monospacedDigit()
                                }
                                if let date = h.latestNavDate {
                                    navDateLabel(date)
                                }
                            }
                            Button {
                                Task { await vm.refreshFund(code: h.fundCode) }
                            } label: {
                                if vm.refreshingCodes.contains(h.fundCode) {
                                    ProgressView()
                                } else {
                                    Image(systemName: "arrow.clockwise")
                                }
                            }
                            .buttonStyle(.borderless)
                            .disabled(vm.refreshingCodes.contains(h.fundCode))
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func navDateLabel(_ date: String) -> some View {
        if let days = Formatters.daysBetween(from: date), days > 2 {
            HStack(spacing: 2) {
                Text(date).font(.caption2)
                Text("(过期)").font(.caption2)
            }
            .foregroundStyle(days > 7 ? Color.danger : Color.stale)
        } else {
            Text(date).font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func isStale(_ date: String?, threshold: Int) -> Bool {
        guard let date, let days = Formatters.daysBetween(from: date) else { return false }
        return days > threshold
    }

    private func uniqueFunds(from holdings: [HoldingResponse]) -> [HoldingResponse] {
        var seen = Set<String>()
        return holdings.filter { seen.insert($0.fundCode).inserted }
    }
}
