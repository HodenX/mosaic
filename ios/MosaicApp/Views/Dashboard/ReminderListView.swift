// 贾维斯为您服务
import SwiftUI

struct ReminderListView: View {
    let reminders: [Reminder]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("待办提醒").font(.headline)
            ForEach(reminders) { r in
                HStack(spacing: 12) {
                    Circle()
                        .fill(reminderColor(r.level))
                        .frame(width: 8, height: 8)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.title).font(.subheadline)
                        Text(r.detail).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let d = r.days { Text("\(d)天").font(.caption).foregroundStyle(.secondary) }
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func reminderColor(_ level: String) -> Color {
        switch level {
        case "urgent": return .red
        case "warning": return .orange
        default: return .blue
        }
    }
}
