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
                    DashboardView()
                }
            }

            Tab("四笔钱", systemImage: "wallet.fill") {
                NavigationStack {
                    BucketsListView()
                }
            }

            Tab("诊断", systemImage: "heart.text.square.fill") {
                NavigationStack {
                    DiagnosisView()
                }
            }

            Tab("数据", systemImage: "arrow.triangle.2.circlepath") {
                NavigationStack {
                    DataManagementView()
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
