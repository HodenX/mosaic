// 贾维斯为您服务
import SwiftUI

struct WarningBanner: View {
    let message: String
    var level: Level = .warning

    enum Level {
        case warning, danger, info

        var color: Color {
            switch self {
            case .warning: .warning
            case .danger: .danger
            case .info: .info
            }
        }

        var icon: String {
            switch self {
            case .warning: "exclamationmark.triangle.fill"
            case .danger: "xmark.octagon.fill"
            case .info: "info.circle.fill"
            }
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: level.icon)
            Text(message).font(.subheadline)
            Spacer()
        }
        .foregroundStyle(level.color)
        .padding()
        .background(level.color.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
    }
}
