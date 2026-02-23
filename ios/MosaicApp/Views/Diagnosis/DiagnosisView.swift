// 贾维斯为您服务
import SwiftUI

struct DiagnosisView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DiagnosisViewModel?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("资产诊断")
        .task {
            if vm == nil { vm = DiagnosisViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: DiagnosisViewModel) -> some View {
        if vm.isLoading && vm.report == nil {
            LoadingView()
        } else if vm.notFound {
            ContentUnavailableView(
                "暂无诊断报告",
                systemImage: "heart.text.square",
                description: Text("诊断报告由 AI 生成，请先在 Web 端执行资产诊断")
            )
        } else if let report = vm.report {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(report.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                        diagnosisSection(title: formatKey(key), value: value)
                    }
                }
                .padding()
            }
        } else if let error = vm.error {
            ContentUnavailableView("加载失败", systemImage: "exclamationmark.triangle", description: Text(error.localizedDescription))
        }
    }

    private func diagnosisSection(title: String, value: AnyCodableValue) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            renderValue(value)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func renderValue(_ value: AnyCodableValue) -> AnyView {
        switch value {
        case .string(let s):
            AnyView(Text(s).font(.subheadline))
        case .int(let i):
            AnyView(Text("\(i)").font(.subheadline).monospacedDigit())
        case .double(let d):
            AnyView(Text(String(format: "%.2f", d)).font(.subheadline).monospacedDigit())
        case .bool(let b):
            AnyView(Text(b ? "是" : "否").font(.subheadline))
        case .array(let arr):
            AnyView(VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(arr.enumerated()), id: \.offset) { _, item in
                    if case .dictionary = item {
                        VStack(alignment: .leading, spacing: 4) { renderValue(item) }
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.secondary.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        renderValue(item)
                    }
                }
            })
        case .dictionary(let dict):
            AnyView(VStack(alignment: .leading, spacing: 8) {
                ForEach(dict.sorted(by: { $0.key < $1.key }), id: \.key) { key, val in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(formatKey(key)).font(.caption).foregroundStyle(.secondary)
                        renderValue(val)
                    }
                }
            })
        case .null:
            AnyView(Text("-").foregroundStyle(.secondary))
        }
    }

    private func formatKey(_ key: String) -> String {
        let map: [String: String] = [
            "report_date": "报告日期", "family_asset_overview": "家庭资产总览",
            "market_snapshot": "市场快照", "holdings": "持仓分析",
            "exposure_analysis": "风险暴露", "position_management": "仓位管理",
            "diagnosis": "诊断结论", "issues_summary": "问题汇总",
            "recommendations": "优化建议", "disclaimer": "免责声明",
            "total_assets": "总资产", "total_return": "总收益",
            "total_return_pct": "总收益率", "buckets": "四笔钱",
            "liquid": "活钱", "stable": "稳钱", "growth": "长钱", "insurance": "保险",
            "label": "类别", "amount": "金额", "pct_of_total": "占比",
            "annual_income_est": "预估年收益", "count": "数量",
            "market_value": "市值", "cost": "成本", "pnl": "盈亏",
            "pnl_pct": "盈亏比例", "fund_count": "基金数量",
            "severity": "严重程度", "issue": "问题", "detail": "详情",
            "findings": "发现", "suggestion": "建议", "action": "操作建议",
            "priority": "优先级", "category": "分类", "score": "评分",
            "status": "状态", "name": "名称", "description": "描述",
            "active_count": "有效保单数", "annual_premium": "年缴保费",
            "covered_persons": "覆盖人数"
        ]
        return map[key] ?? key.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
