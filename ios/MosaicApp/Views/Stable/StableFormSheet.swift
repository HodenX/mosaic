// 贾维斯为您服务
import SwiftUI

struct StableFormSheet: View {
    enum Mode { case add; case edit(StableAsset) }
    let mode: Mode
    let onSave: (StableAssetCreate) async throws -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var type = "term_deposit"
    @State private var platform = ""
    @State private var amount = ""
    @State private var annualRate = ""
    @State private var startDate: Date?
    @State private var maturityDate: Date?
    @State private var hasStartDate = false
    @State private var hasMaturityDate = false
    @State private var isSaving = false

    private let df: DateFormatter = { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f }()

    var body: some View {
        NavigationStack {
            Form {
                TextField("名称", text: $name)
                Picker("类型", selection: $type) {
                    Text("定期存款").tag("term_deposit")
                    Text("银行理财").tag("bank_product")
                }
                TextField("平台", text: $platform)
                TextField("金额", text: $amount).keyboardType(.decimalPad)
                TextField("年化利率 (%)", text: $annualRate).keyboardType(.decimalPad)
                Toggle("设置起始日期", isOn: $hasStartDate)
                if hasStartDate {
                    DatePicker("起始日期", selection: Binding(get: { startDate ?? Date() },
                        set: { startDate = $0 }), displayedComponents: .date)
                }
                Toggle("设置到期日期", isOn: $hasMaturityDate)
                if hasMaturityDate {
                    DatePicker("到期日期", selection: Binding(get: { maturityDate ?? Date() },
                        set: { maturityDate = $0 }), displayedComponents: .date)
                }
            }
            .navigationTitle(isEdit ? "编辑稳钱" : "添加稳钱")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }.disabled(name.isEmpty || isSaving)
                }
            }
            .onAppear { prefill() }
        }
    }

    private var isEdit: Bool { if case .edit = mode { return true }; return false }

    private func prefill() {
        if case .edit(let item) = mode {
            name = item.name; type = item.type; platform = item.platform
            amount = "\(item.amount)"; annualRate = "\(item.annualRate)"
            if let s = item.startDate { hasStartDate = true; startDate = df.date(from: s) }
            if let m = item.maturityDate { hasMaturityDate = true; maturityDate = df.date(from: m) }
        }
    }

    private func save() {
        isSaving = true
        Task {
            try? await onSave(StableAssetCreate(
                name: name, type: type, platform: platform,
                amount: Double(amount) ?? 0, annualRate: Double(annualRate) ?? 0,
                startDate: hasStartDate ? startDate.map { df.string(from: $0) } : nil,
                maturityDate: hasMaturityDate ? maturityDate.map { df.string(from: $0) } : nil))
            dismiss()
        }
    }
}
