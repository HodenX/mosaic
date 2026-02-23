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
    @State private var errorMessage: String?

    var body: some View {
        Form {
            if isInitialSetup {
                Section {
                    VStack(spacing: 12) {
                        Image("AppIcon")
                            .resizable()
                            .frame(width: 72, height: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        Text("知合 Mosaic")
                            .font(.title2.bold())
                        Text("本地部署的家庭资产管理")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .listRowBackground(Color.clear)
                }
            }

            Section("服务器地址") {
                TextField("IP 地址（如 192.168.1.100）", text: $host)
                    .keyboardType(.numbersAndPunctuation)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                TextField("端口（默认 8011）", text: $port)
                    .keyboardType(.numberPad)
            }

            if isInitialSetup {
                Section {
                    Text("请确保后端服务已启动，并填写服务器的 IP 地址和端口号。如果后端运行在同一设备上，地址填 localhost 即可。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Button {
                    Task { await connectAndSave() }
                } label: {
                    HStack {
                        Spacer()
                        if testing {
                            ProgressView().padding(.trailing, 4)
                            Text("正在连接…")
                        } else {
                            Text("连接并保存")
                        }
                        Spacer()
                    }
                }
                .disabled(host.isEmpty || testing)

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(Color.danger)
                }
            }
        }
        .navigationTitle(isInitialSetup ? "连接服务器" : "服务器设置")
        .onAppear {
            host = config.serverHost
            port = "\(config.serverPort)"
        }
    }

    private func connectAndSave() async {
        testing = true
        testResult = nil
        errorMessage = nil
        let oldHost = config.serverHost
        let oldPort = config.serverPort
        config.serverHost = host
        config.serverPort = Int(port) ?? 8011
        let ok = await api.healthCheck()
        if ok {
            testResult = true
        } else {
            config.serverHost = oldHost
            config.serverPort = oldPort
            testResult = false
            errorMessage = "连接失败，请检查服务器地址和端口是否正确"
        }
        testing = false
    }
}
