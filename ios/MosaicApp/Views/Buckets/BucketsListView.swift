// 贾维斯为您服务
import SwiftUI

struct BucketsListView: View {
    @Environment(APIClient.self) private var api
    @State private var summary: DashboardSummary?

    var body: some View {
        List {
            Section {
                NavigationLink {
                    LiquidListView()
                } label: {
                    HStack {
                        Label {
                            Text("活钱").font(.headline)
                        } icon: {
                            Image(systemName: "drop.fill").foregroundStyle(Color.bucketLiquid)
                        }
                        Spacer()
                        if let s = summary {
                            Text(Formatters.wan(s.buckets.liquid.amount))
                                .font(.subheadline).monospacedDigit().foregroundStyle(.secondary)
                        }
                    }
                }

                NavigationLink {
                    StableListView()
                } label: {
                    HStack {
                        Label {
                            Text("稳钱").font(.headline)
                        } icon: {
                            Image(systemName: "building.columns.fill").foregroundStyle(Color.bucketStable)
                        }
                        Spacer()
                        if let s = summary {
                            Text(Formatters.wan(s.buckets.stable.amount))
                                .font(.subheadline).monospacedDigit().foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section {
                NavigationLink {
                    OverviewView()
                } label: {
                    HStack {
                        Label {
                            Text("长钱 · 组合概览").font(.headline)
                        } icon: {
                            Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(Color.bucketGrowth)
                        }
                        Spacer()
                        if let s = summary {
                            Text(Formatters.wan(s.buckets.growth.totalAmount))
                                .font(.subheadline).monospacedDigit().foregroundStyle(.secondary)
                        }
                    }
                }

                NavigationLink {
                    HoldingsListView()
                } label: {
                    Label {
                        Text("长钱 · 持仓明细").font(.headline)
                    } icon: {
                        Image(systemName: "list.bullet.rectangle").foregroundStyle(Color.bucketGrowth)
                    }
                }

                NavigationLink {
                    PositionView()
                } label: {
                    Label {
                        Text("长钱 · 仓位管理").font(.headline)
                    } icon: {
                        Image(systemName: "gauge.with.needle").foregroundStyle(Color.bucketGrowth)
                    }
                }
            }

            Section {
                NavigationLink {
                    InsuranceListView()
                } label: {
                    HStack {
                        Label {
                            Text("保险").font(.headline)
                        } icon: {
                            Image(systemName: "shield.fill").foregroundStyle(Color.bucketInsurance)
                        }
                        Spacer()
                        if let s = summary {
                            Text("年缴 \(Formatters.currency(s.buckets.insurance.annualPremium))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("四笔钱")
        .task {
            do {
                summary = try await DashboardService(api: api).summary()
            } catch {}
        }
    }
}
