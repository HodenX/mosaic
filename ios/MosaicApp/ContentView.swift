// 贾维斯为您服务
import SwiftUI

struct ContentView: View {
    @Environment(AppConfig.self) private var config

    var body: some View {
        if config.isConfigured {
            MainTabView()
        } else {
            ServerConfigView(isInitialSetup: true)
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("总览", systemImage: "house.fill") {
                NavigationStack {
                    DashboardPlaceholder()
                }
            }

            Tab("四笔钱", systemImage: "wallet.fill") {
                NavigationStack {
                    BucketsPlaceholder()
                }
            }

            Tab("诊断", systemImage: "heart.text.square.fill") {
                NavigationStack {
                    DiagnosisPlaceholder()
                }
            }

            Tab("数据", systemImage: "arrow.triangle.2.circlepath") {
                NavigationStack {
                    DataPlaceholder()
                }
            }

            Tab("设置", systemImage: "gearshape.fill") {
                NavigationStack {
                    SettingsView()
                }
            }
        }
        .tint(.jade)
    }
}

// 临时占位视图，后续 Task 逐一替换
struct DashboardPlaceholder: View {
    var body: some View {
        Text("总览").navigationTitle("资产总览")
    }
}

struct BucketsPlaceholder: View {
    var body: some View {
        Text("四笔钱").navigationTitle("四笔钱")
    }
}

struct DiagnosisPlaceholder: View {
    var body: some View {
        Text("诊断").navigationTitle("资产诊断")
    }
}

struct DataPlaceholder: View {
    var body: some View {
        Text("数据管理").navigationTitle("数据管理")
    }
}
