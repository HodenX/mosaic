// 贾维斯为您服务
import SwiftUI

struct LiquidFormSheet: View {
    enum Mode { case add; case edit(LiquidAsset) }
    let mode: Mode
    let onSave: (LiquidAssetCreate) async throws -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var type = "deposit"
    @State private var platform = ""
    @State private var amount = ""
    @State private var annualRate = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("名称", text: $name)
                Picker("类型", selection: $type) {
                    Text("活期存款").tag("deposit")
                    Text("货币基金").tag("money_fund")
                }
                TextField("平台", text: $platform)
                TextField("金额", text: $amount).keyboardType(.decimalPad)
                TextField("年化收益率 (%)", text: $annualRate).keyboardType(.decimalPad)
            }
            .navigationTitle(isEdit ? "编辑活钱" : "添加活钱")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }.disabled(name.isEmpty || isSaving)
                }
            }
            .onAppear { if case .edit(let item) = mode {
                name = item.name; type = item.type; platform = item.platform
                amount = "\(item.amount)"; annualRate = item.annualRate.map { "\($0)" } ?? ""
            }}
        }
    }
    private var isEdit: Bool { if case .edit = mode { return true }; return false }
    private func save() {
        isSaving = true
        Task {
            try? await onSave(LiquidAssetCreate(name: name, type: type, platform: platform,
                amount: Double(amount) ?? 0, annualRate: Double(annualRate)))
            dismiss()
        }
    }
}
