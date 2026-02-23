// 贾维斯为您服务
import Foundation
import Observation

@Observable
class AppConfig {
    var serverHost: String {
        didSet { UserDefaults.standard.set(serverHost, forKey: "serverHost") }
    }
    var serverPort: Int {
        didSet { UserDefaults.standard.set(serverPort, forKey: "serverPort") }
    }

    var baseURL: URL {
        URL(string: "http://\(serverHost):\(serverPort)/api")!
    }

    var isConfigured: Bool {
        !serverHost.isEmpty
    }

    init() {
        self.serverHost = UserDefaults.standard.string(forKey: "serverHost") ?? ""
        self.serverPort = UserDefaults.standard.integer(forKey: "serverPort").nonZero ?? 8011
    }
}

private extension Int {
    var nonZero: Int? { self == 0 ? nil : self }
}
