// 贾维斯为您服务
import SwiftUI

struct InsuranceFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    let editing: InsurancePolicy?
    let onSave: (InsurancePolicyCreate) -> Void

    @State private var name = ""
    @State private var type = "critical_illness"
    @State private var policyNumber = ""
    @State private var insurer = ""
    @State private var insuredPerson = ""
    @State private var annualPremium = ""
    @State private var coverageAmount = ""
    @State private var coverageSummary = ""
    @State private var startDate = Date()
    @State private var hasStartDate = false
    @State private var paymentYears = ""
    @State private var nextPaymentDate = Date()
    @State private var hasNextPayment = false
    @State private var status = "active"

    private let typeOptions = [
        ("critical_illness", "重疾险"), ("medical", "医疗险"),
        ("accident", "意外险"), ("life", "寿险"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("基本信息") {
                    TextField("保单名称", text: $name)
                    Picker("险种", selection: $type) {
                        ForEach(typeOptions, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    TextField("保险公司", text: $insurer)
                    TextField("被保人", text: $insuredPerson)
                    TextField("保单号", text: $policyNumber)
                }
                Section("保费与保额") {
                    TextField("年缴保费", text: $annualPremium).keyboardType(.decimalPad)
                    TextField("保额", text: $coverageAmount).keyboardType(.decimalPad)
                    TextField("保障摘要", text: $coverageSummary)
                }
                Section("日期") {
                    Toggle("起始日期", isOn: $hasStartDate)
                    if hasStartDate {
                        DatePicker("起始", selection: $startDate, displayedComponents: .date)
                    }
                    TextField("缴费年限", text: $paymentYears).keyboardType(.numberPad)
                    Toggle("下次缴费日", isOn: $hasNextPayment)
                    if hasNextPayment {
                        DatePicker("缴费日", selection: $nextPaymentDate, displayedComponents: .date)
                    }
                }
                Section("状态") {
                    Picker("状态", selection: $status) {
                        Text("有效").tag("active")
                        Text("脱保").tag("lapsed")
                        Text("已终止").tag("expired")
                    }
                }
            }
            .navigationTitle(editing == nil ? "添加保单" : "编辑保单")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let data = InsurancePolicyCreate(
                            name: name, type: type,
                            policyNumber: policyNumber.isEmpty ? nil : policyNumber,
                            insurer: insurer.isEmpty ? nil : insurer,
                            insuredPerson: insuredPerson,
                            annualPremium: Double(annualPremium),
                            coverageAmount: Double(coverageAmount),
                            coverageSummary: coverageSummary.isEmpty ? nil : coverageSummary,
                            startDate: hasStartDate ? Formatters.isoDate(startDate) : nil,
                            paymentYears: Int(paymentYears),
                            nextPaymentDate: hasNextPayment ? Formatters.isoDate(nextPaymentDate) : nil,
                            status: status
                        )
                        onSave(data)
                        dismiss()
                    }.disabled(name.isEmpty || insuredPerson.isEmpty)
                }
            }
            .onAppear {
                if let e = editing {
                    name = e.name; type = e.type; insurer = e.insurer
                    insuredPerson = e.insuredPerson; status = e.status
                    policyNumber = e.policyNumber ?? ""
                    annualPremium = "\(e.annualPremium)"
                    coverageAmount = e.coverageAmount.map { "\($0)" } ?? ""
                    coverageSummary = e.coverageSummary ?? ""
                    paymentYears = e.paymentYears.map { "\($0)" } ?? ""
                    if let s = e.startDate, let d = Formatters.parseDate(s) {
                        hasStartDate = true; startDate = d
                    }
                    if let n = e.nextPaymentDate, let d = Formatters.parseDate(n) {
                        hasNextPayment = true; nextPaymentDate = d
                    }
                }
            }
        }
    }
}
