// 贾维斯为您服务
import SwiftUI

struct StrategyView: View {
    let suggestion: StrategyResult?

    var body: some View {
        NavigationStack {
            Group {
                if let s = suggestion {
                    List {
                        Section("策略概要") { Text(s.summary) }
                        Section("操作建议") {
                            ForEach(s.suggestions) { item in
                                HStack {
                                    Image(systemName: item.action == "buy" ? "arrow.down.circle.fill" :
                                        item.action == "sell" ? "arrow.up.circle.fill" : "hand.raised.circle.fill")
                                        .foregroundStyle(item.action == "buy" ? .red :
                                            item.action == "sell" ? .green : .secondary)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.fundName).font(.subheadline)
                                        Text(item.reason).font(.caption2).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    CurrencyText(value: item.amount, font: .subheadline)
                                }
                            }
                        }
                    }
                } else { LoadingView(message: "正在计算建议...") }
            }
            .navigationTitle("策略建议").navigationBarTitleDisplayMode(.inline)
        }
    }
}
