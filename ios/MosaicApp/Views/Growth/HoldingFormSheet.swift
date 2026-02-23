// 贾维斯为您服务
import SwiftUI

struct HoldingFormSheet: View {
    let onSave: (HoldingCreate) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var fundCode = ""
    @State private var platform = ""
    @State private var shares = ""
    @State private var costPrice = ""
    @State private var purchaseDate = Date()
    @State private var isSaving = false
    private let df: DateFormatter = { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f }()

    var body: some View {
        NavigationStack {
            Form {
                TextField("基金代码", text: $fundCode).keyboardType(.numberPad)
                TextField("平台", text: $platform)
                TextField("份额", text: $shares).keyboardType(.decimalPad)
                TextField("成本单价", text: $costPrice).keyboardType(.decimalPad)
                DatePicker("购入日期", selection: $purchaseDate, displayedComponents: .date)
            }
            .navigationTitle("添加持仓")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        isSaving = true
                        Task {
                            try? await onSave(HoldingCreate(fundCode: fundCode, platform: platform,
                                shares: Double(shares) ?? 0, costPrice: Double(costPrice) ?? 0,
                                purchaseDate: df.string(from: purchaseDate)))
                            dismiss()
                        }
                    }.disabled(fundCode.isEmpty || isSaving)
                }
            }
        }
    }
}
