// 贾维斯为您服务
import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    var message: String?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: icon)
        } description: {
            if let message {
                Text(message)
            }
        }
    }
}
