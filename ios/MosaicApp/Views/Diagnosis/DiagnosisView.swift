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

    @ViewBuilder
    private func renderValue(_ value: AnyCodableValue) -> some View {
        switch value {
        case .string(let s):
            Text(s).font(.subheadline)
        case .int(let i):
            Text("\(i)").font(.subheadline).monospacedDigit()
        case .double(let d):
            Text(String(format: "%.2f", d)).font(.subheadline).monospacedDigit()
        case .bool(let b):
            Text(b ? "是" : "否").font(.subheadline)
        case .array(let arr):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(arr.enumerated()), id: \.offset) { _, item in
                    renderValue(item)
                }
            }
        case .dictionary(let dict):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(dict.sorted(by: { $0.key < $1.key }), id: \.key) { key, val in
                    HStack(alignment: .top) {
                        Text(formatKey(key)).font(.caption.bold()).frame(width: 80, alignment: .leading)
                        renderValue(val)
                    }
                }
            }
        case .null:
            Text("-").foregroundStyle(.secondary)
        }
    }

    private func formatKey(_ key: String) -> String {
        key.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
