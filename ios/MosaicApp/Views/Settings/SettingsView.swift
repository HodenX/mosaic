// 贾维斯为您服务
import SwiftUI

struct SettingsView: View {
    @Environment(AppConfig.self) private var config
    @Environment(APIClient.self) private var api
    @State private var connectionOK: Bool?

    var body: some View {
        List {
            Section("服务器") {
                NavigationLink {
                    ServerConfigView(isInitialSetup: false)
                } label: {
                    HStack {
                        Label("服务器地址", systemImage: "server.rack")
                        Spacer()
                        Text("\(config.serverHost):\(config.serverPort)")
                            .foregroundStyle(.secondary)
                    }
                }

                Button {
                    Task {
                        connectionOK = await api.healthCheck()
                    }
                } label: {
                    HStack {
                        Label("测试连接", systemImage: "network")
                        Spacer()
                        if let ok = connectionOK {
                            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(ok ? .green : .red)
                        }
                    }
                }
            }

            Section("外观") {
                Label("主题跟随系统设置", systemImage: "paintbrush")
            }

            Section("关于") {
                HStack {
                    Text("版本")
                    Spacer()
                    Text("1.0.0").foregroundStyle(.secondary)
                }
                HStack {
                    Text("项目")
                    Spacer()
                    Text("知合 Mosaic").foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("设置")
    }
}
