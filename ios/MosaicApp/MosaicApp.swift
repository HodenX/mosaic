// 贾维斯为您服务
import SwiftUI

@main
struct MosaicApp: App {
    @State private var config = AppConfig()
    @State private var apiClient: APIClient

    init() {
        let cfg = AppConfig()
        _config = State(initialValue: cfg)
        _apiClient = State(initialValue: APIClient(config: cfg))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(config)
                .environment(apiClient)
        }
    }
}
