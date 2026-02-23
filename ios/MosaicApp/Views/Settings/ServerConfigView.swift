// 贾维斯为您服务
import SwiftUI

struct ServerConfigView: View {
    @Environment(AppConfig.self) private var config
    @Environment(APIClient.self) private var api
    let isInitialSetup: Bool

    @State private var host = ""
    @State private var port = "8011"
    @State private var testing = false
    @State private var testResult: Bool?

    var body: some View {
        Form {
            Section("服务器地址") {
                TextField("IP 地址（如 192.168.1.100）", text: $host)
                    .keyboardType(.numbersAndPunctuation)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                TextField("端口（默认 8011）", text: $port)
                    .keyboardType(.numberPad)
            }

            Section {
                Button {
                    Task { await testConnection() }
                } label: {
                    HStack {
                        Text("测试连接")
                        Spacer()
                        if testing {
                            ProgressView()
                        } else if let ok = testResult {
                            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(ok ? .green : .red)
                        }
                    }
                }
                .disabled(host.isEmpty)

                Button("保存") {
                    config.serverHost = host
                    config.serverPort = Int(port) ?? 8011
                }
                .disabled(host.isEmpty)
            }
        }
        .navigationTitle(isInitialSetup ? "连接服务器" : "服务器设置")
        .onAppear {
            host = config.serverHost
            port = "\(config.serverPort)"
        }
    }

    private func testConnection() async {
        testing = true
        testResult = nil
        // 临时设置用于测试
        let oldHost = config.serverHost
        let oldPort = config.serverPort
        config.serverHost = host
        config.serverPort = Int(port) ?? 8011
        testResult = await api.healthCheck()
        if testResult != true {
            config.serverHost = oldHost
            config.serverPort = oldPort
        }
        testing = false
    }
}
