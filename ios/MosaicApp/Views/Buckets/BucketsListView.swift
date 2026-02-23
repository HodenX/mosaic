// 贾维斯为您服务
import SwiftUI

struct BucketsListView: View {
    var body: some View {
        List {
            Section {
                NavigationLink {
                    LiquidListView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("活钱").font(.headline)
                            Text("活期存款、货币基金等流动资金").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "drop.fill").foregroundStyle(Color.bucketLiquid)
                    }
                }

                NavigationLink {
                    StableListView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("稳钱").font(.headline)
                            Text("定期存款、银行理财等中期资产").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "building.columns.fill").foregroundStyle(Color.bucketStable)
                    }
                }
            }

            Section {
                NavigationLink {
                    OverviewView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("长钱 · 组合概览").font(.headline)
                            Text("基金组合收益、配置与趋势").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(Color.bucketGrowth)
                    }
                }

                NavigationLink {
                    HoldingsListView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("长钱 · 持仓明细").font(.headline)
                            Text("基金持仓列表与基金详情").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "list.bullet.rectangle").foregroundStyle(Color.bucketGrowth)
                    }
                }

                NavigationLink {
                    PositionView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("长钱 · 仓位管理").font(.headline)
                            Text("预算、仓位与投资策略").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "gauge.with.needle").foregroundStyle(Color.bucketGrowth)
                    }
                }
            }

            Section {
                NavigationLink {
                    InsuranceListView()
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("保险").font(.headline)
                            Text("家庭保单管理与续费提醒").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "shield.fill").foregroundStyle(Color.bucketInsurance)
                    }
                }
            }
        }
        .navigationTitle("四笔钱")
    }
}
