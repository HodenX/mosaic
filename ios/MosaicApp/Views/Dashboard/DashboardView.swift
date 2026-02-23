// 贾维斯为您服务
import SwiftUI

struct DashboardView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DashboardViewModel?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.summary == nil {
                    LoadingView()
                } else if let summary = vm.summary {
                    ScrollView {
                        VStack(spacing: 16) {
                            totalAssetCard(summary)

                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                NavigationLink { LiquidListView() } label: {
                                    BucketSummaryCard(title: "活钱", icon: "drop.fill", color: .bucketLiquid,
                                        amount: summary.buckets.liquid.amount,
                                        subtitle: "\(summary.buckets.liquid.count) 笔")
                                }
                                .buttonStyle(.plain)

                                NavigationLink { StableListView() } label: {
                                    BucketSummaryCard(title: "稳钱", icon: "building.columns.fill", color: .bucketStable,
                                        amount: summary.buckets.stable.amount,
                                        subtitle: "\(summary.buckets.stable.count) 笔")
                                }
                                .buttonStyle(.plain)

                                NavigationLink { OverviewView() } label: {
                                    BucketSummaryCard(title: "长钱", icon: "chart.line.uptrend.xyaxis", color: .bucketGrowth,
                                        amount: summary.buckets.growth.totalAmount,
                                        subtitle: "\(summary.buckets.growth.pnlPercent >= 0 ? "+" : "")\(Formatters.currency(summary.buckets.growth.totalPnl))")
                                }
                                .buttonStyle(.plain)

                                NavigationLink { InsuranceListView() } label: {
                                    BucketSummaryCard(title: "保险", icon: "shield.fill", color: .bucketInsurance,
                                        amount: summary.buckets.insurance.annualPremium,
                                        subtitle: "\(summary.buckets.insurance.activeCount) 份保单")
                                }
                                .buttonStyle(.plain)
                            }

                            AssetTrendChart(data: vm.trend, selectedDays: Binding(
                                get: { vm.selectedDays },
                                set: { vm.selectedDays = $0 }
                            ))
                                .onChange(of: vm.selectedDays) { Task { await vm.loadTrend() } }

                            if !vm.reminders.isEmpty {
                                ReminderListView(reminders: vm.reminders)
                            }
                        }
                        .padding()
                    }
                    .refreshable { await vm.loadAll() }
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
        .navigationTitle("资产总览")
        .task {
            if vm == nil { vm = DashboardViewModel(api: api) }
            await vm?.loadAll()
        }
    }

    private func totalAssetCard(_ s: DashboardSummary) -> some View {
        VStack(spacing: 8) {
            Text("家庭总资产").font(.subheadline).foregroundStyle(.secondary)
            CurrencyText(value: s.totalAssets, font: .system(size: 32, weight: .bold))
            HStack(spacing: 16) {
                PnLText(value: s.totalReturn, font: .callout)
                PercentText(value: s.totalReturnPercent, font: .callout)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
