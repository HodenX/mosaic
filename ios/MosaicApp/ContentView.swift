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
            NavigationStack {
                DashboardView()
            }
            .tabItem { Label("总览", systemImage: "house.fill") }

            NavigationStack {
                BucketsListView()
            }
            .tabItem { Label("四笔钱", systemImage: "banknote.fill") }

            NavigationStack {
                DiagnosisView()
            }
            .tabItem { Label("诊断", systemImage: "heart.text.square.fill") }

            NavigationStack {
                DataManagementView()
            }
            .tabItem { Label("数据", systemImage: "arrow.triangle.2.circlepath") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("设置", systemImage: "gearshape.fill") }
        }
        .tint(.jade)
    }
}
