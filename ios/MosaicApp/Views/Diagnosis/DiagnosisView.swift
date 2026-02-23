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
                    scoreSection(report)
                    issuesSummarySection(report)
                    recommendationsSection(report)
                    diagnosisDetailsSection(report)
                    otherInfoSection(report)
                    disclaimerSection(report)
                }
                .padding()
                .padding(.bottom, 20)
            }
        } else if let error = vm.error {
            ContentUnavailableView("加载失败", systemImage: "exclamationmark.triangle", description: Text(error.localizedDescription))
        }
    }

    // MARK: - 评分区

    private func scoreSection(_ report: DiagnosisResult) -> some View {
        let issueCount = extractIssuesSummary(report).count
        let highCount = extractIssuesSummary(report).filter { severity(of: $0) == "high" }.count
        let score = max(0, 100 - highCount * 10 - (issueCount - highCount) * 3)

        return VStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.15), lineWidth: 12)
                Circle()
                    .trim(from: 0, to: CGFloat(score) / 100)
                    .stroke(scoreColor(score), style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 2) {
                    Text("\(score)")
                        .font(.system(size: 36, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(scoreColor(score))
                    Text("健康评分")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 120, height: 120)

            if let dateVal = report["report_date"], case .string(let date) = dateVal {
                Text("报告日期 \(date)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func scoreColor(_ score: Int) -> Color {
        if score >= 80 { return .success }
        if score >= 60 { return .warning }
        return .danger
    }

    // MARK: - 问题汇总

    private func issuesSummarySection(_ report: DiagnosisResult) -> some View {
        let issues = extractIssuesSummary(report)
        let sorted = issues.sorted { severityOrder(severity(of: $0)) < severityOrder(severity(of: $1)) }

        return Group {
            if !sorted.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("问题汇总").font(.headline)
                        Spacer()
                        Text("\(sorted.count) 项")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    ForEach(Array(sorted.enumerated()), id: \.offset) { _, issue in
                        issueCard(issue)
                    }
                }
            }
        }
    }

    private func issueCard(_ issue: [String: AnyCodableValue]) -> some View {
        let sev = severity(of: issue)
        let issueText = stringValue(issue, key: "issue") ?? "未知问题"
        let detail = stringValue(issue, key: "detail")
        let source = stringValue(issue, key: "source")

        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(issueText).font(.subheadline.bold())
                Spacer()
                severityBadge(sev)
            }
            if let detail {
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
            if let source {
                Label(source, systemImage: "tag")
                    .font(.caption2).foregroundStyle(.tertiary)
            }
        }
        .padding()
        .background(severityColor(sev).opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - 优化建议

    private func recommendationsSection(_ report: DiagnosisResult) -> some View {
        guard let recVal = report["recommendations"], case .array(let recs) = recVal, !recs.isEmpty else {
            return AnyView(EmptyView())
        }

        return AnyView(VStack(alignment: .leading, spacing: 12) {
            Text("优化建议").font(.headline)
            ForEach(Array(recs.enumerated()), id: \.offset) { i, rec in
                if case .dictionary(let dict) = rec {
                    recommendationCard(i + 1, dict)
                }
            }
        })
    }

    private func recommendationCard(_ index: Int, _ rec: [String: AnyCodableValue]) -> some View {
        let title = stringValue(rec, key: "title") ?? "建议 \(index)"
        let approach = stringValue(rec, key: "approach")

        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                Text("\(index)")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Color.jade, in: Circle())
                Text(title).font(.subheadline.bold())
            }
            if let approach {
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "lightbulb").foregroundStyle(Color.warning).font(.caption)
                    Text(approach).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - 诊断详情（按理论框架分组）

    private func diagnosisDetailsSection(_ report: DiagnosisResult) -> some View {
        guard let diagVal = report["diagnosis"], case .dictionary(let diag) = diagVal else {
            return AnyView(EmptyView())
        }

        return AnyView(VStack(alignment: .leading, spacing: 12) {
            Text("诊断详情").font(.headline)
            ForEach(diag.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                if case .dictionary(let scanDict) = value {
                    scanCard(key: key, scan: scanDict)
                }
            }
        })
    }

    private func scanCard(key: String, scan: [String: AnyCodableValue]) -> some View {
        let theory = stringValue(scan, key: "theory") ?? formatKey(key)
        var findings: [[String: AnyCodableValue]] = []
        if let f = scan["findings"], case .array(let arr) = f {
            findings = arr.compactMap { if case .dictionary(let d) = $0 { return d } else { return nil } }
        }

        return DisclosureGroup {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(findings.enumerated()), id: \.offset) { _, finding in
                    findingRow(finding)
                }
                ForEach(scan.filter({ $0.key != "theory" && $0.key != "findings" }).sorted(by: { $0.key < $1.key }), id: \.key) { k, v in
                    if case .string(let s) = v {
                        HStack {
                            Text(formatKey(k)).font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            Text(s).font(.caption).monospacedDigit()
                        }
                    } else if case .int(let i) = v {
                        HStack {
                            Text(formatKey(k)).font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            Text("\(i)").font(.caption).monospacedDigit()
                        }
                    }
                }
            }
        } label: {
            Text(theory).font(.subheadline.bold())
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func findingRow(_ finding: [String: AnyCodableValue]) -> some View {
        let sev = severity(of: finding)
        let issue = stringValue(finding, key: "issue") ?? ""
        let detail = stringValue(finding, key: "detail")
        let suggestion = stringValue(finding, key: "suggestion")

        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(issue).font(.caption)
                Spacer()
                severityBadge(sev)
            }
            if let detail {
                Text(detail).font(.caption2).foregroundStyle(.secondary)
            }
            if let suggestion {
                HStack(alignment: .top, spacing: 4) {
                    Image(systemName: "lightbulb").font(.caption2).foregroundStyle(Color.warning)
                    Text(suggestion).font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - 其他信息

    private func otherInfoSection(_ report: DiagnosisResult) -> some View {
        let infoKeys = ["family_asset_overview", "market_snapshot", "holdings", "exposure_analysis", "position_management"]
        let available = infoKeys.filter { report[$0] != nil }

        return Group {
            if !available.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("详细数据").font(.headline)
                    ForEach(available, id: \.self) { key in
                        if let value = report[key] {
                            DisclosureGroup {
                                renderValue(value)
                            } label: {
                                Text(formatKey(key)).font(.subheadline.bold())
                            }
                            .padding()
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }
        }
    }

    private func disclaimerSection(_ report: DiagnosisResult) -> some View {
        Group {
            if let d = report["disclaimer"], case .string(let text) = d {
                Text(text)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Helpers

    private func extractIssuesSummary(_ report: DiagnosisResult) -> [[String: AnyCodableValue]] {
        guard let val = report["issues_summary"], case .array(let arr) = val else { return [] }
        return arr.compactMap { if case .dictionary(let d) = $0 { return d } else { return nil } }
    }

    private func severity(of issue: [String: AnyCodableValue]) -> String {
        stringValue(issue, key: "severity") ?? "info"
    }

    private func stringValue(_ dict: [String: AnyCodableValue], key: String) -> String? {
        guard let val = dict[key], case .string(let s) = val else { return nil }
        return s
    }

    private func severityOrder(_ sev: String) -> Int {
        switch sev {
        case "high": return 0
        case "medium": return 1
        case "info": return 2
        default: return 3
        }
    }

    private func severityColor(_ sev: String) -> Color {
        switch sev {
        case "high": return .danger
        case "medium": return .warning
        case "info": return .info
        default: return .secondary
        }
    }

    private func severityBadge(_ sev: String) -> some View {
        let label: String = switch sev {
        case "high": "严重"
        case "medium": "中等"
        case "info": "提示"
        default: sev
        }
        return Text(label)
            .font(.caption2.bold())
            .padding(.horizontal, 8).padding(.vertical, 2)
            .background(severityColor(sev).opacity(0.15))
            .foregroundStyle(severityColor(sev))
            .clipShape(Capsule())
    }

    private func renderValue(_ value: AnyCodableValue) -> AnyView {
        switch value {
        case .string(let s):
            AnyView(Text(s).font(.caption))
        case .int(let i):
            AnyView(Text("\(i)").font(.caption).monospacedDigit())
        case .double(let d):
            AnyView(Text(String(format: "%.2f", d)).font(.caption).monospacedDigit())
        case .bool(let b):
            AnyView(Text(b ? "是" : "否").font(.caption))
        case .array(let arr):
            AnyView(VStack(alignment: .leading, spacing: 6) {
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
            AnyView(VStack(alignment: .leading, spacing: 6) {
                ForEach(dict.sorted(by: { $0.key < $1.key }), id: \.key) { key, val in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(formatKey(key)).font(.caption2).foregroundStyle(.secondary)
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
            "exposure_analysis": "风险暴露分析", "position_management": "仓位管理",
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
            "covered_persons": "覆盖人数", "covered_members": "覆盖成员",
            "scan1_mpt": "MPT 分散化分析", "scan2_three_fund": "三基金组合分析",
            "scan3_all_weather": "全天候策略分析", "scan4_core_satellite": "核心-卫星分析",
            "scan5_lifecycle": "生命周期分析", "supplementary": "补充分析",
            "theory": "理论框架", "scenarios_covered": "覆盖情景数",
            "scenarios_total": "总情景数", "core_pct": "核心占比",
            "satellite_pct": "卫星占比", "estimated_age_range": "预估年龄段",
            "basis": "依据", "recommended_equity_pct": "建议权益占比",
            "bucket_allocation": "桶间配置", "platform_concentration": "平台集中度",
            "top_platform": "主要平台", "top_platform_pct": "主要平台占比",
            "over_70_threshold": "超70%阈值", "geographic_concentration": "地域集中度",
            "by_index": "按指数", "by_geography": "按地域", "by_asset_class": "按资产类型",
            "effective_exposures": "有效暴露数", "nominal_funds": "名义基金数",
            "top3_sectors": "前三大行业", "top3_sectors_total_pct": "前三大行业合计",
            "budget": "预算", "current_value": "当前市值", "position_pct": "仓位比例",
            "target_range": "目标区间", "gap_to_min": "距下限差额",
            "sh_index": "上证指数", "csi300": "沪深300", "csi500": "中证500",
            "star50": "科创50", "value": "数值", "change_pct": "涨跌幅",
            "code": "代码", "platform": "平台", "weight_pct": "权重",
            "index_tracked": "跟踪指数", "index": "指数",
            "combined_weight_pct": "合计权重", "region": "地域", "pct": "占比",
            "class": "类别", "sector": "行业",
            "title": "标题", "approach": "方案", "resolves_issues": "解决问题",
            "id": "编号", "source": "来源", "policy_count": "保单数"
        ]
        return map[key] ?? key.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
