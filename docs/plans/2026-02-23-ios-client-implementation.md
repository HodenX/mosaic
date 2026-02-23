# iOS 客户端实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建与 Web 端功能完全对等的 SwiftUI 原生 iOS 客户端

**Architecture:** SwiftUI + MVVM (@Observable) + URLSession async/await + Swift Charts。TabView 5 Tab 导航，APIClient 统一网络层，每个页面对应独立 ViewModel。

**Tech Stack:** Swift 5.9+, SwiftUI, iOS 17+, Swift Charts, URLSession, @Observable

**注意:** 本项目无测试框架（与现有后端/前端一致），验证方式为 Xcode 构建 + 模拟器运行。

---

## Task 1: 创建 Xcode 项目与目录结构

**Files:**
- Create: `ios/MosaicApp.xcodeproj`（Xcode 自动生成）
- Create: `ios/MosaicApp/` 目录结构

**Step 1: 创建 Xcode 项目**

在项目根目录下创建 `ios/` 文件夹，使用 SwiftUI App 模板创建项目：

```bash
mkdir -p ios
cd ios
# 用 Xcode 创建：File → New → Project → iOS → App
# Product Name: MosaicApp
# Interface: SwiftUI
# Language: Swift
# Minimum Deployments: iOS 17.0
```

**Step 2: 创建目录结构**

```bash
cd ios/MosaicApp
mkdir -p Config Models Services ViewModels
mkdir -p Views/{Dashboard,Liquid,Stable,Growth,Insurance,FundDetail,Diagnosis,DataManagement,Settings,Shared}
mkdir -p Utilities Resources
```

**Step 3: 验证构建**

Xcode 中 Cmd+B 确认项目可以正常构建。

**Step 4: 提交**

```bash
git add ios/
git commit -m "feat(ios): scaffold Xcode project with directory structure"
```

---

## Task 2: 工具函数与主题色

**Files:**
- Create: `ios/MosaicApp/Utilities/Formatters.swift`
- Create: `ios/MosaicApp/Utilities/Colors.swift`
- Create: `ios/MosaicApp/Config/AppConfig.swift`

**Step 1: 编写 Formatters.swift**

```swift
// 贾维斯为您服务
import Foundation

enum Formatters {
    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "zh_CN")
        f.currencySymbol = "¥"
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 2
        return f
    }()

    private static let percentFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 2
        f.multiplier = 1  // 后端已经是百分比数值如 5.26，不需要 x100
        return f
    }()

    private static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "zh_CN")
        return f
    }()

    static func currency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "¥0.00"
    }

    static func wan(_ value: Double) -> String {
        if abs(value) >= 10000 {
            let v = value / 10000
            return String(format: "%.2f万", v)
        }
        return currency(value)
    }

    static func percent(_ value: Double) -> String {
        String(format: "%.2f%%", value)
    }

    static func isoDate(_ date: Date) -> String {
        isoDateFormatter.string(from: date)
    }

    static func displayDate(_ date: Date) -> String {
        displayDateFormatter.string(from: date)
    }

    static func parseDate(_ string: String) -> Date? {
        isoDateFormatter.date(from: string)
    }
}
```

**Step 2: 编写 Colors.swift**

```swift
// 贾维斯为您服务
import SwiftUI

extension Color {
    // 翡翠金主题
    static let jade = Color(red: 0.18, green: 0.55, blue: 0.34)
    static let jadeLight = Color(red: 0.24, green: 0.70, blue: 0.44)

    // 四桶颜色
    static let bucketLiquid = Color.blue
    static let bucketStable = Color.green
    static let bucketGrowth = Color.orange
    static let bucketInsurance = Color.purple

    // 盈亏颜色
    static let profit = Color.red       // 中国市场：红涨
    static let loss = Color.green       // 中国市场：绿跌

    static func pnlColor(_ value: Double) -> Color {
        if value > 0 { return .profit }
        if value < 0 { return .loss }
        return .secondary
    }
}
```

**Step 3: 编写 AppConfig.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class AppConfig {
    var serverHost: String {
        didSet { UserDefaults.standard.set(serverHost, forKey: "serverHost") }
    }
    var serverPort: Int {
        didSet { UserDefaults.standard.set(serverPort, forKey: "serverPort") }
    }

    var baseURL: URL {
        URL(string: "http://\(serverHost):\(serverPort)/api")!
    }

    var isConfigured: Bool {
        !serverHost.isEmpty
    }

    init() {
        self.serverHost = UserDefaults.standard.string(forKey: "serverHost") ?? ""
        self.serverPort = UserDefaults.standard.integer(forKey: "serverPort").nonZero ?? 8011
    }
}

private extension Int {
    var nonZero: Int? { self == 0 ? nil : self }
}
```

**Step 4: 构建验证**

Cmd+B 确认编译通过。

**Step 5: 提交**

```bash
git add -A && git commit -m "feat(ios): add formatters, theme colors, and app config"
```

---

## Task 3: 数据模型（Codable Structs）

**Files:**
- Create: `ios/MosaicApp/Models/Dashboard.swift`
- Create: `ios/MosaicApp/Models/Holding.swift`
- Create: `ios/MosaicApp/Models/Fund.swift`
- Create: `ios/MosaicApp/Models/Portfolio.swift`
- Create: `ios/MosaicApp/Models/Position.swift`
- Create: `ios/MosaicApp/Models/LiquidAsset.swift`
- Create: `ios/MosaicApp/Models/StableAsset.swift`
- Create: `ios/MosaicApp/Models/Insurance.swift`
- Create: `ios/MosaicApp/Models/Diagnosis.swift`

**Step 1: 编写 Dashboard.swift**

```swift
// 贾维斯为您服务
import Foundation

struct DashboardSummary: Codable {
    let totalAssets: Double
    let totalReturn: Double
    let totalReturnPercent: Double
    let buckets: BucketsSummary
}

struct BucketsSummary: Codable {
    let liquid: LiquidBucket
    let stable: StableBucket
    let growth: GrowthBucket
    let insurance: InsuranceBucket
}

struct LiquidBucket: Codable {
    let amount: Double
    let estimatedReturn: Double
    let count: Int
}

struct StableBucket: Codable {
    let amount: Double
    let estimatedReturn: Double
    let count: Int
    let nearestMaturityDays: Int?
}

struct GrowthBucket: Codable {
    let totalAmount: Double
    let totalCost: Double
    let totalPnl: Double
    let pnlPercent: Double
    let count: Int
}

struct InsuranceBucket: Codable {
    let activeCount: Int
    let totalCount: Int
    let annualPremium: Double
    let coveredPersons: Int
    let nearestRenewalDays: Int?
}

struct Reminder: Codable, Identifiable {
    var id: String { "\(type)-\(title)" }
    let type: String
    let level: String  // "urgent" | "warning" | "info"
    let title: String
    let detail: String
    let days: Int?
    let link: String
}

struct TotalAssetTrend: Codable, Identifiable {
    var id: String { date }
    let date: String
    let liquidAmount: Double
    let stableAmount: Double
    let growthAmount: Double
    let insurancePremium: Double
    let totalAssets: Double
}
```

**Step 2: 编写 Holding.swift**

```swift
// 贾维斯为您服务
import Foundation

struct HoldingResponse: Codable, Identifiable {
    let id: Int
    let fundCode: String
    let fundName: String
    let platform: String
    let shares: Double
    let costPrice: Double
    let purchaseDate: String
    let latestNav: Double?
    let latestNavDate: String?
    let marketValue: Double?
    let pnl: Double?
    let pnlPercent: Double?
    let createdAt: String
    let updatedAt: String
}

struct HoldingCreate: Codable {
    let fundCode: String
    let platform: String
    let shares: Double
    let costPrice: Double
    let purchaseDate: String
}

struct HoldingUpdate: Codable {
    var platform: String?
    var shares: Double?
    var costPrice: Double?
    var purchaseDate: String?
}

struct SnapshotUpdate: Codable {
    let shares: Double
    let costPrice: Double
    let changeDate: String
}

struct ChangeLog: Codable, Identifiable {
    let id: Int
    let holdingId: Int
    let changeDate: String
    let oldShares: Double
    let newShares: Double
    let oldCostPrice: Double
    let newCostPrice: Double
    let sharesDiff: Double
    let createdAt: String
}
```

**Step 3: 编写 Fund.swift**

```swift
// 贾维斯为您服务
import Foundation

struct FundInfo: Codable {
    let fundCode: String
    let fundName: String
    let fundType: String
    let managementCompany: String
    let latestNav: Double?
    let latestNavDate: String?
}

struct NavHistory: Codable, Identifiable {
    var id: String { date }
    let date: String
    let nav: Double
}

struct AllocationItem: Codable, Identifiable {
    var id: String { category }
    let category: String
    let percentage: Double
    let funds: [AllocationFundDetail]?
}

struct AllocationFundDetail: Codable, Identifiable {
    var id: String { fundCode }
    let fundCode: String
    let fundName: String
    let percentage: Double
}

struct AllocationCoverage: Codable {
    let coveredFunds: Int
    let totalFunds: Int
    let coveredValue: Double
    let totalValue: Double
    let coveredPercent: Double
    let missingFunds: [String]
}

struct AllocationResponse: Codable {
    let items: [AllocationItem]
    let coverage: AllocationCoverage
}

typealias FundAllocation = [String: [AllocationItem]]

struct TopHolding: Codable, Identifiable {
    var id: String { stockCode }
    let stockCode: String
    let stockName: String
    let percentage: Double
}
```

**Step 4: 编写 Portfolio.swift**

```swift
// 贾维斯为您服务
import Foundation

struct PortfolioSummary: Codable {
    let totalValue: Double
    let totalCost: Double
    let totalPnl: Double
    let pnlPercent: Double
}

struct PlatformBreakdown: Codable, Identifiable {
    var id: String { platform }
    let platform: String
    let marketValue: Double
    let cost: Double
    let pnl: Double
    let count: Int
}

struct PortfolioTrend: Codable, Identifiable {
    var id: String { date }
    let date: String
    let totalValue: Double
    let totalCost: Double
    let totalPnl: Double
}
```

**Step 5: 编写 Position.swift**

```swift
// 贾维斯为您服务
import Foundation

struct PositionStatus: Codable {
    let totalBudget: Double
    let totalValue: Double
    let totalCost: Double
    let availableCash: Double
    let positionRatio: Double
    let targetPositionMin: Double
    let targetPositionMax: Double
    let activeStrategy: String
    let isBelowMin: Bool
    let isAboveMax: Bool
}

struct BudgetUpdateRequest: Codable {
    var totalBudget: Double?
    var targetPositionMin: Double?
    var targetPositionMax: Double?
    var reason: String?
}

struct BudgetChangeLogEntry: Codable, Identifiable {
    let id: Int
    let oldBudget: Double
    let newBudget: Double
    let reason: String?
    let createdAt: String
}

struct StrategyInfo: Codable, Identifiable {
    var id: String { name }
    let name: String
    let displayName: String
    let description: String
    let configSchema: [String: AnyCodableValue]
}

struct ActiveStrategyUpdate: Codable {
    let strategyName: String
}

struct StrategyConfigUpdate: Codable {
    let configJson: [String: AnyCodableValue]
}

struct StrategyResult: Codable {
    let strategyName: String
    let summary: String
    let suggestions: [SuggestionItem]
    let extra: [String: AnyCodableValue]
}

struct SuggestionItem: Codable, Identifiable {
    var id: String { "\(fundCode)-\(action)" }
    let fundCode: String
    let fundName: String
    let action: String
    let amount: Double
    let reason: String
}

// 通用的 JSON 值类型，用于处理后端返回的 dict 字段
enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([AnyCodableValue])
    case dictionary([String: AnyCodableValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let v = try? container.decode(Bool.self) {
            self = .bool(v)
        } else if let v = try? container.decode(Int.self) {
            self = .int(v)
        } else if let v = try? container.decode(Double.self) {
            self = .double(v)
        } else if let v = try? container.decode(String.self) {
            self = .string(v)
        } else if let v = try? container.decode([AnyCodableValue].self) {
            self = .array(v)
        } else if let v = try? container.decode([String: AnyCodableValue].self) {
            self = .dictionary(v)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .int(let v): try container.encode(v)
        case .double(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .dictionary(let v): try container.encode(v)
        case .null: try container.encodeNil()
        }
    }
}
```

**Step 6: 编写 LiquidAsset.swift**

```swift
// 贾维斯为您服务
import Foundation

struct LiquidAsset: Codable, Identifiable {
    let id: Int
    let name: String
    let type: String
    let platform: String
    let amount: Double
    let annualRate: Double?
    let updatedAt: String
}

struct LiquidAssetCreate: Codable {
    let name: String
    let type: String
    var platform: String?
    var amount: Double?
    var annualRate: Double?
}

struct LiquidAssetUpdate: Codable {
    var name: String?
    var type: String?
    var platform: String?
    var amount: Double?
    var annualRate: Double?
}

struct LiquidAssetList: Codable {
    let items: [LiquidAsset]
    let summary: LiquidSummary
}

struct LiquidSummary: Codable {
    let totalAmount: Double
    let estimatedAnnualReturn: Double
    let count: Int
}
```

**Step 7: 编写 StableAsset.swift**

```swift
// 贾维斯为您服务
import Foundation

struct StableAsset: Codable, Identifiable {
    let id: Int
    let name: String
    let type: String
    let platform: String
    let amount: Double
    let annualRate: Double
    let startDate: String?
    let maturityDate: String?
    let updatedAt: String
}

struct StableAssetCreate: Codable {
    let name: String
    let type: String
    var platform: String?
    var amount: Double?
    var annualRate: Double?
    var startDate: String?
    var maturityDate: String?
}

struct StableAssetUpdate: Codable {
    var name: String?
    var type: String?
    var platform: String?
    var amount: Double?
    var annualRate: Double?
    var startDate: String?
    var maturityDate: String?
}

struct StableAssetList: Codable {
    let items: [StableAsset]
    let summary: StableSummary
}

struct StableSummary: Codable {
    let totalAmount: Double
    let estimatedAnnualReturn: Double
    let count: Int
}
```

**Step 8: 编写 Insurance.swift**

```swift
// 贾维斯为您服务
import Foundation

struct InsurancePolicy: Codable, Identifiable {
    let id: Int
    let name: String
    let type: String
    let policyNumber: String?
    let insurer: String
    let insuredPerson: String
    let annualPremium: Double
    let coverageAmount: Double?
    let coverageSummary: String?
    let startDate: String?
    let endDate: String?
    let paymentYears: Int?
    let nextPaymentDate: String?
    let status: String
    let updatedAt: String
}

struct InsurancePolicyCreate: Codable {
    let name: String
    let type: String
    var policyNumber: String?
    var insurer: String?
    let insuredPerson: String
    var annualPremium: Double?
    var coverageAmount: Double?
    var coverageSummary: String?
    var startDate: String?
    var endDate: String?
    var paymentYears: Int?
    var nextPaymentDate: String?
    var status: String?
}

struct InsurancePolicyUpdate: Codable {
    var name: String?
    var type: String?
    var policyNumber: String?
    var insurer: String?
    var insuredPerson: String?
    var annualPremium: Double?
    var coverageAmount: Double?
    var coverageSummary: String?
    var startDate: String?
    var endDate: String?
    var paymentYears: Int?
    var nextPaymentDate: String?
    var status: String?
}

struct InsurancePolicyList: Codable {
    let items: [InsurancePolicy]
    let summary: InsuranceSummary
}

struct InsuranceSummary: Codable {
    let totalAnnualPremium: Double
    let activeCount: Int
    let totalCount: Int
    let coveredPersons: Int
}
```

**Step 9: 编写 Diagnosis.swift**

```swift
// 贾维斯为您服务
import Foundation

// 诊断报告结构灵活，用 [String: AnyCodableValue] 作为顶层类型
typealias DiagnosisResult = [String: AnyCodableValue]
```

**Step 10: 构建验证**

Cmd+B 确认所有模型编译通过。

**Step 11: 提交**

```bash
git add -A && git commit -m "feat(ios): add all Codable data models"
```

---

## Task 4: 网络层（APIClient + Services）

**Files:**
- Create: `ios/MosaicApp/Services/APIClient.swift`
- Create: `ios/MosaicApp/Services/DashboardService.swift`
- Create: `ios/MosaicApp/Services/HoldingsService.swift`
- Create: `ios/MosaicApp/Services/FundsService.swift`
- Create: `ios/MosaicApp/Services/PortfolioService.swift`
- Create: `ios/MosaicApp/Services/PositionService.swift`
- Create: `ios/MosaicApp/Services/LiquidService.swift`
- Create: `ios/MosaicApp/Services/StableService.swift`
- Create: `ios/MosaicApp/Services/InsuranceService.swift`
- Create: `ios/MosaicApp/Services/DiagnosisService.swift`

**Step 1: 编写 APIClient.swift**

```swift
// 贾维斯为您服务
import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case serverError(Int, Data?)
    case decodingError(Error)
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效的 URL"
        case .networkError(let e): return "网络错误: \(e.localizedDescription)"
        case .serverError(let code, _): return "服务器错误: \(code)"
        case .decodingError(let e): return "数据解析错误: \(e.localizedDescription)"
        case .notConfigured: return "请先配置服务器地址"
        }
    }
}

@Observable
class APIClient {
    let config: AppConfig

    private let session = URLSession.shared

    private var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }

    private var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }

    init(config: AppConfig) {
        self.config = config
    }

    func get<T: Decodable>(_ path: String, query: [String: String]? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "GET", query: query)
        return try await execute(request)
    }

    func post<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "POST", body: body)
        return try await execute(request)
    }

    func put<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "PUT", body: body)
        return try await execute(request)
    }

    func delete(_ path: String) async throws {
        let request = try buildRequest(path: path, method: "DELETE")
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let http = response as? HTTPURLResponse
            throw APIError.serverError(http?.statusCode ?? 0, nil)
        }
    }

    func postVoid(_ path: String, body: (any Encodable)? = nil) async throws {
        let request = try buildRequest(path: path, method: "POST", body: body)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let http = response as? HTTPURLResponse
            throw APIError.serverError(http?.statusCode ?? 0, nil)
        }
    }

    func healthCheck() async -> Bool {
        do {
            let _: [String: String] = try await get("/health")
            return true
        } catch {
            return false
        }
    }

    // MARK: - Private

    private func buildRequest(
        path: String,
        method: String,
        query: [String: String]? = nil,
        body: (any Encodable)? = nil
    ) throws -> URLRequest {
        guard config.isConfigured else { throw APIError.notConfigured }

        var components = URLComponents(url: config.baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if let query, !query.isEmpty {
            components.queryItems = query.compactMap { k, v in
                v.isEmpty ? nil : URLQueryItem(name: k, value: v)
            }
        }

        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.serverError(0, nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.serverError(http.statusCode, data)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
```

**Step 2: 编写 DashboardService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct DashboardService {
    let api: APIClient

    func summary() async throws -> DashboardSummary {
        try await api.get("/dashboard/summary")
    }

    func reminders() async throws -> [Reminder] {
        try await api.get("/dashboard/reminders")
    }

    func trend(days: Int = 90) async throws -> [TotalAssetTrend] {
        try await api.get("/dashboard/trend", query: ["days": "\(days)"])
    }

    func snapshot() async throws {
        try await api.postVoid("/dashboard/snapshot")
    }
}
```

**Step 3: 编写 HoldingsService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct HoldingsService {
    let api: APIClient

    func list() async throws -> [HoldingResponse] {
        try await api.get("/holdings")
    }

    func create(_ data: HoldingCreate) async throws -> HoldingResponse {
        try await api.post("/holdings", body: data)
    }

    func update(id: Int, _ data: HoldingUpdate) async throws -> HoldingResponse {
        try await api.put("/holdings/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/holdings/\(id)")
    }

    func updateSnapshot(id: Int, _ data: SnapshotUpdate) async throws -> HoldingResponse {
        try await api.post("/holdings/\(id)/update-snapshot", body: data)
    }

    func changelog(id: Int) async throws -> [ChangeLog] {
        try await api.get("/holdings/\(id)/changelog")
    }
}
```

**Step 4: 编写 FundsService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct FundsService {
    let api: APIClient

    func get(code: String) async throws -> FundInfo {
        try await api.get("/funds/\(code)")
    }

    func navHistory(code: String, start: String? = nil, end: String? = nil) async throws -> [NavHistory] {
        var query: [String: String] = [:]
        if let start { query["start"] = start }
        if let end { query["end"] = end }
        return try await api.get("/funds/\(code)/nav-history", query: query)
    }

    func refresh(code: String) async throws -> [String: String] {
        try await api.post("/funds/\(code)/refresh")
    }

    func allocation(code: String) async throws -> FundAllocation {
        try await api.get("/funds/\(code)/allocation")
    }

    func topHoldings(code: String) async throws -> [TopHolding] {
        try await api.get("/funds/\(code)/top-holdings")
    }
}
```

**Step 5: 编写 PortfolioService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct PortfolioService {
    let api: APIClient

    func summary() async throws -> PortfolioSummary {
        try await api.get("/portfolio/summary")
    }

    func byPlatform() async throws -> [PlatformBreakdown] {
        try await api.get("/portfolio/by-platform")
    }

    func trend(start: String? = nil, end: String? = nil) async throws -> [PortfolioTrend] {
        var query: [String: String] = [:]
        if let start { query["start"] = start }
        if let end { query["end"] = end }
        return try await api.get("/portfolio/trend", query: query)
    }

    func allocation(dimension: String) async throws -> AllocationResponse {
        try await api.get("/portfolio/allocation", query: ["dimension": dimension])
    }
}
```

**Step 6: 编写 PositionService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct PositionService {
    let api: APIClient

    func getBudget() async throws -> PositionStatus {
        try await api.get("/position/budget")
    }

    func updateBudget(_ data: BudgetUpdateRequest) async throws -> PositionStatus {
        try await api.put("/position/budget", body: data)
    }

    func changelog() async throws -> [BudgetChangeLogEntry] {
        try await api.get("/position/budget/changelog")
    }

    func strategies() async throws -> [StrategyInfo] {
        try await api.get("/position/strategies")
    }

    func setActiveStrategy(name: String) async throws -> PositionStatus {
        try await api.put("/position/active-strategy", body: ActiveStrategyUpdate(strategyName: name))
    }

    func getStrategyConfig(name: String) async throws -> [String: AnyCodableValue] {
        try await api.get("/position/strategy-config/\(name)")
    }

    func updateStrategyConfig(name: String, config: [String: AnyCodableValue]) async throws -> [String: AnyCodableValue] {
        try await api.put("/position/strategy-config/\(name)", body: StrategyConfigUpdate(configJson: config))
    }

    func suggestion() async throws -> StrategyResult {
        try await api.get("/position/suggestion")
    }
}
```

**Step 7: 编写 LiquidService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct LiquidService {
    let api: APIClient

    func list() async throws -> LiquidAssetList {
        try await api.get("/liquid")
    }

    func create(_ data: LiquidAssetCreate) async throws -> LiquidAsset {
        try await api.post("/liquid", body: data)
    }

    func update(id: Int, _ data: LiquidAssetUpdate) async throws -> LiquidAsset {
        try await api.put("/liquid/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/liquid/\(id)")
    }
}
```

**Step 8: 编写 StableService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct StableService {
    let api: APIClient

    func list() async throws -> StableAssetList {
        try await api.get("/stable")
    }

    func create(_ data: StableAssetCreate) async throws -> StableAsset {
        try await api.post("/stable", body: data)
    }

    func update(id: Int, _ data: StableAssetUpdate) async throws -> StableAsset {
        try await api.put("/stable/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/stable/\(id)")
    }
}
```

**Step 9: 编写 InsuranceService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct InsuranceService {
    let api: APIClient

    func list(insuredPerson: String? = nil) async throws -> InsurancePolicyList {
        var query: [String: String] = [:]
        if let insuredPerson { query["insured_person"] = insuredPerson }
        return try await api.get("/insurance", query: query)
    }

    func create(_ data: InsurancePolicyCreate) async throws -> InsurancePolicy {
        try await api.post("/insurance", body: data)
    }

    func update(id: Int, _ data: InsurancePolicyUpdate) async throws -> InsurancePolicy {
        try await api.put("/insurance/\(id)", body: data)
    }

    func delete(id: Int) async throws {
        try await api.delete("/insurance/\(id)")
    }

    func renew(id: Int) async throws -> InsurancePolicy {
        try await api.post("/insurance/\(id)/renew")
    }
}
```

**Step 10: 编写 DiagnosisService.swift**

```swift
// 贾维斯为您服务
import Foundation

struct DiagnosisService {
    let api: APIClient

    func report() async throws -> DiagnosisResult {
        try await api.get("/diagnosis/report")
    }
}
```

**Step 11: 构建验证**

Cmd+B 确认编译通过。

**Step 12: 提交**

```bash
git add -A && git commit -m "feat(ios): add APIClient and all service layers"
```

---

## Task 5: 共享 UI 组件

**Files:**
- Create: `ios/MosaicApp/Views/Shared/CurrencyText.swift`
- Create: `ios/MosaicApp/Views/Shared/PercentText.swift`
- Create: `ios/MosaicApp/Views/Shared/PnLText.swift`
- Create: `ios/MosaicApp/Views/Shared/EmptyStateView.swift`
- Create: `ios/MosaicApp/Views/Shared/LoadingView.swift`
- Create: `ios/MosaicApp/Views/Shared/SummaryCard.swift`

**Step 1: 编写 CurrencyText.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct CurrencyText: View {
    let value: Double
    var useWan: Bool = false
    var font: Font = .body

    var body: some View {
        Text(useWan ? Formatters.wan(value) : Formatters.currency(value))
            .font(font)
            .monospacedDigit()
    }
}
```

**Step 2: 编写 PercentText.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct PercentText: View {
    let value: Double
    var showSign: Bool = true
    var font: Font = .body

    var body: some View {
        Text(formatted)
            .font(font)
            .monospacedDigit()
            .foregroundStyle(Color.pnlColor(value))
    }

    private var formatted: String {
        let sign = showSign && value > 0 ? "+" : ""
        return "\(sign)\(Formatters.percent(value))"
    }
}
```

**Step 3: 编写 PnLText.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct PnLText: View {
    let value: Double
    var font: Font = .body

    var body: some View {
        Text(formatted)
            .font(font)
            .monospacedDigit()
            .foregroundStyle(Color.pnlColor(value))
    }

    private var formatted: String {
        let sign = value > 0 ? "+" : ""
        return "\(sign)\(Formatters.currency(value))"
    }
}
```

**Step 4: 编写 EmptyStateView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    var message: String?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: icon)
        } description: {
            if let message {
                Text(message)
            }
        }
    }
}
```

**Step 5: 编写 LoadingView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct LoadingView: View {
    var message: String = "加载中…"

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

**Step 6: 编写 SummaryCard.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct SummaryCard: View {
    let title: String
    let value: String
    var subtitle: String?
    var color: Color = .primary

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.bold())
                .monospacedDigit()
                .foregroundStyle(color)
            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 7: 构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add shared UI components"
```

---

## Task 6: App 入口与 TabView 导航骨架

**Files:**
- Modify: `ios/MosaicApp/MosaicApp.swift`
- Create: `ios/MosaicApp/ContentView.swift`（覆盖模板文件）
- Create: `ios/MosaicApp/Views/Settings/SettingsView.swift`
- Create: `ios/MosaicApp/Views/Settings/ServerConfigView.swift`

**Step 1: 编写 MosaicApp.swift**

```swift
// 贾维斯为您服务
import SwiftUI

@main
struct MosaicApp: App {
    @State private var config = AppConfig()
    @State private var apiClient: APIClient

    init() {
        let cfg = AppConfig()
        _config = State(initialValue: cfg)
        _apiClient = State(initialValue: APIClient(config: cfg))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(config)
                .environment(apiClient)
        }
    }
}
```

**Step 2: 编写 ContentView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct ContentView: View {
    @Environment(AppConfig.self) private var config

    var body: some View {
        if config.isConfigured {
            MainTabView()
        } else {
            ServerConfigView(isInitialSetup: true)
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("总览", systemImage: "house.fill") {
                NavigationStack {
                    DashboardPlaceholder()
                }
            }

            Tab("四笔钱", systemImage: "wallet.fill") {
                NavigationStack {
                    BucketsPlaceholder()
                }
            }

            Tab("诊断", systemImage: "heart.text.square.fill") {
                NavigationStack {
                    DiagnosisPlaceholder()
                }
            }

            Tab("数据", systemImage: "arrow.triangle.2.circlepath") {
                NavigationStack {
                    DataPlaceholder()
                }
            }

            Tab("设置", systemImage: "gearshape.fill") {
                NavigationStack {
                    SettingsView()
                }
            }
        }
        .tint(.jade)
    }
}

// 临时占位视图，后续 Task 逐一替换
struct DashboardPlaceholder: View {
    var body: some View {
        Text("总览").navigationTitle("资产总览")
    }
}

struct BucketsPlaceholder: View {
    var body: some View {
        Text("四笔钱").navigationTitle("四笔钱")
    }
}

struct DiagnosisPlaceholder: View {
    var body: some View {
        Text("诊断").navigationTitle("资产诊断")
    }
}

struct DataPlaceholder: View {
    var body: some View {
        Text("数据管理").navigationTitle("数据管理")
    }
}
```

**Step 3: 编写 SettingsView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct SettingsView: View {
    @Environment(AppConfig.self) private var config
    @Environment(APIClient.self) private var api
    @State private var connectionOK: Bool?

    var body: some View {
        List {
            Section("服务器") {
                NavigationLink {
                    ServerConfigView(isInitialSetup: false)
                } label: {
                    HStack {
                        Label("服务器地址", systemImage: "server.rack")
                        Spacer()
                        Text("\(config.serverHost):\(config.serverPort)")
                            .foregroundStyle(.secondary)
                    }
                }

                Button {
                    Task {
                        connectionOK = await api.healthCheck()
                    }
                } label: {
                    HStack {
                        Label("测试连接", systemImage: "network")
                        Spacer()
                        if let ok = connectionOK {
                            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(ok ? .green : .red)
                        }
                    }
                }
            }

            Section("外观") {
                // 跟随系统即可，无需手动切换
                Label("主题跟随系统设置", systemImage: "paintbrush")
            }

            Section("关于") {
                HStack {
                    Text("版本")
                    Spacer()
                    Text("1.0.0").foregroundStyle(.secondary)
                }
                HStack {
                    Text("项目")
                    Spacer()
                    Text("知合 Mosaic").foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("设置")
    }
}
```

**Step 4: 编写 ServerConfigView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct ServerConfigView: View {
    @Environment(AppConfig.self) private var config
    @Environment(APIClient.self) private var api
    let isInitialSetup: Bool

    @State private var host = ""
    @State private var port = "8011"
    @State private var testing = false
    @State private var testResult: Bool?

    var body: some View {
        Form {
            Section("服务器地址") {
                TextField("IP 地址（如 192.168.1.100）", text: $host)
                    .keyboardType(.numbersAndPunctuation)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                TextField("端口（默认 8011）", text: $port)
                    .keyboardType(.numberPad)
            }

            Section {
                Button {
                    Task { await testConnection() }
                } label: {
                    HStack {
                        Text("测试连接")
                        Spacer()
                        if testing {
                            ProgressView()
                        } else if let ok = testResult {
                            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(ok ? .green : .red)
                        }
                    }
                }
                .disabled(host.isEmpty)

                Button("保存") {
                    config.serverHost = host
                    config.serverPort = Int(port) ?? 8011
                }
                .disabled(host.isEmpty)
            }
        }
        .navigationTitle(isInitialSetup ? "连接服务器" : "服务器设置")
        .onAppear {
            host = config.serverHost
            port = "\(config.serverPort)"
        }
    }

    private func testConnection() async {
        testing = true
        testResult = nil
        // 临时设置用于测试
        let oldHost = config.serverHost
        let oldPort = config.serverPort
        config.serverHost = host
        config.serverPort = Int(port) ?? 8011
        testResult = await api.healthCheck()
        if testResult != true {
            config.serverHost = oldHost
            config.serverPort = oldPort
        }
        testing = false
    }
}
```

**Step 5: 构建验证 + 模拟器运行**

Cmd+R 在模拟器上运行，确认：
- 未配置时显示服务器配置页
- 配置后显示 5 个 Tab 的主界面
- 设置页可正常显示

**Step 6: 提交**

```bash
git add -A && git commit -m "feat(ios): add app entry, TabView navigation, and settings"
```

---

## Phase 2: 核心页面实现

### Task 7: Dashboard 总览页

**Files:**
- Create: `MosaicApp/ViewModels/DashboardViewModel.swift`
- Modify: `MosaicApp/Views/Dashboard/DashboardView.swift`
- Create: `MosaicApp/Views/Dashboard/BucketSummaryCard.swift`
- Create: `MosaicApp/Views/Dashboard/AssetTrendChart.swift`
- Create: `MosaicApp/Views/Dashboard/AssetPieChart.swift`
- Create: `MosaicApp/Views/Dashboard/ReminderListView.swift`

**Step 1: DashboardViewModel**

```swift
// MosaicApp/ViewModels/DashboardViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DashboardViewModel {
    var summary: DashboardSummary?
    var reminders: [Reminder] = []
    var trend: [TotalAssetTrend] = []
    var selectedDays = 90
    var isLoading = false
    var error: APIError?

    private let service: DashboardService

    init(api: APIClient) {
        self.service = DashboardService(api: api)
    }

    func loadAll() async {
        isLoading = true
        error = nil
        async let s = service.summary()
        async let r = service.reminders()
        async let t = service.trend(days: selectedDays)
        do {
            let (summaryResult, remindersResult, trendResult) = try await (s, r, t)
            summary = summaryResult
            reminders = remindersResult
            trend = trendResult
        } catch let e as APIError {
            error = e
        } catch {
            self.error = .networkError(error)
        }
        isLoading = false
    }

    func loadTrend() async {
        do { trend = try await service.trend(days: selectedDays) } catch {}
    }
}
```

**Step 2: DashboardView** — 总资产卡片 + 四桶概览 + 走势图 + 提醒

```swift
// MosaicApp/Views/Dashboard/DashboardView.swift
// 贾维斯为您服务
import SwiftUI

struct DashboardView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DashboardViewModel?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.summary == nil {
                    LoadingView()
                } else if let summary = vm.summary {
                    ScrollView {
                        VStack(spacing: 16) {
                            totalAssetCard(summary)

                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                BucketSummaryCard(title: "活钱", icon: "drop.fill", color: .bucketLiquid,
                                    amount: summary.buckets.liquid.amount,
                                    subtitle: "\(summary.buckets.liquid.count) 笔")
                                BucketSummaryCard(title: "稳钱", icon: "building.columns.fill", color: .bucketStable,
                                    amount: summary.buckets.stable.amount,
                                    subtitle: "\(summary.buckets.stable.count) 笔")
                                BucketSummaryCard(title: "长钱", icon: "chart.line.uptrend.xyaxis", color: .bucketGrowth,
                                    amount: summary.buckets.growth.totalAmount,
                                    subtitle: "\(summary.buckets.growth.pnlPercent >= 0 ? "+" : "")\(Fmt.currency(summary.buckets.growth.totalPnl))")
                                BucketSummaryCard(title: "保险", icon: "shield.fill", color: .bucketInsurance,
                                    amount: summary.buckets.insurance.annualPremium,
                                    subtitle: "\(summary.buckets.insurance.activeCount) 份保单")
                            }

                            AssetTrendChart(data: vm.trend, selectedDays: $vm.selectedDays)
                                .onChange(of: vm.selectedDays) { Task { await vm.loadTrend() } }

                            if !vm.reminders.isEmpty {
                                ReminderListView(reminders: vm.reminders)
                            }
                        }
                        .padding()
                    }
                    .refreshable { await vm.loadAll() }
                } else if let error = vm.error {
                    ContentUnavailableView("加载失败", systemImage: "wifi.slash",
                        description: Text(error.localizedDescription))
                }
            }
        }
        .navigationTitle("资产总览")
        .task {
            if vm == nil { vm = DashboardViewModel(api: api) }
            await vm?.loadAll()
        }
    }

    private func totalAssetCard(_ s: DashboardSummary) -> some View {
        VStack(spacing: 8) {
            Text("家庭总资产").font(.subheadline).foregroundStyle(.secondary)
            CurrencyText(value: s.totalAssets, font: .system(size: 32, weight: .bold))
            HStack(spacing: 16) {
                PnLText(value: s.totalReturn, font: .callout)
                PercentText(value: s.totalReturnPercent, font: .callout)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
```

**Step 3: BucketSummaryCard**

```swift
// MosaicApp/Views/Dashboard/BucketSummaryCard.swift
// 贾维斯为您服务
import SwiftUI

struct BucketSummaryCard: View {
    let title: String
    let icon: String
    let color: Color
    let amount: Double
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon).font(.caption).foregroundStyle(color)
            CurrencyText(value: amount, font: .headline)
            Text(subtitle).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 4: AssetTrendChart** — Swift Charts 走势图 + 时间范围选择

```swift
// MosaicApp/Views/Dashboard/AssetTrendChart.swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct AssetTrendChart: View {
    let data: [TotalAssetTrend]
    @Binding var selectedDays: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("资产走势").font(.headline)
                Spacer()
                Picker("时间", selection: $selectedDays) {
                    Text("1月").tag(30)
                    Text("3月").tag(90)
                    Text("6月").tag(180)
                    Text("1年").tag(365)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }

            if data.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 200)
            } else {
                Chart(data) { item in
                    AreaMark(x: .value("日期", item.date), y: .value("总资产", item.totalAssets))
                        .foregroundStyle(.linearGradient(
                            colors: [Color.bucketGrowth.opacity(0.3), .clear],
                            startPoint: .top, endPoint: .bottom))
                    LineMark(x: .value("日期", item.date), y: .value("总资产", item.totalAssets))
                        .foregroundStyle(Color.bucketGrowth)
                }
                .chartYAxis {
                    AxisMarks { v in
                        AxisValueLabel { if let d = v.as(Double.self) { Text(Fmt.wan(d)) } }
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 5)) { v in
                        AxisValueLabel { if let s = v.as(String.self) { Text(Fmt.shortDate(s)) } }
                    }
                }
                .frame(height: 200)
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 5: ReminderListView**

```swift
// MosaicApp/Views/Dashboard/ReminderListView.swift
// 贾维斯为您服务
import SwiftUI

struct ReminderListView: View {
    let reminders: [Reminder]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("待办提醒").font(.headline)
            ForEach(reminders) { r in
                HStack(spacing: 12) {
                    Circle().fill(Color.reminderColor(r.level)).frame(width: 8, height: 8)
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
}
```

**Step 6: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Dashboard with trend chart and reminders"
```

---

### Task 8: 活钱管理页

**Files:**
- Create: `MosaicApp/ViewModels/LiquidViewModel.swift`
- Modify: `MosaicApp/Views/Liquid/LiquidListView.swift`
- Create: `MosaicApp/Views/Liquid/LiquidFormSheet.swift`

**Step 1: LiquidViewModel**

```swift
// MosaicApp/ViewModels/LiquidViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class LiquidViewModel {
    var items: [LiquidAsset] = []
    var summary: LiquidSummary?
    var isLoading = false
    var error: APIError?
    private let service: LiquidService

    init(api: APIClient) { self.service = LiquidService(api: api) }

    func load() async {
        isLoading = true
        do {
            let result = try await service.list()
            items = result.items; summary = result.summary
        } catch let e as APIError { error = e }
        catch { self.error = .networkError(error) }
        isLoading = false
    }

    func create(_ data: LiquidAssetCreate) async throws {
        _ = try await service.create(data); await load()
    }
    func update(id: Int, _ data: LiquidAssetUpdate) async throws {
        _ = try await service.update(id: id, data); await load()
    }
    func delete(id: Int) async throws {
        try await service.delete(id: id); await load()
    }
}
```

**Step 2: LiquidListView** — 汇总卡 + 列表 + swipe 操作

```swift
// MosaicApp/Views/Liquid/LiquidListView.swift
// 贾维斯为您服务
import SwiftUI

struct LiquidListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: LiquidViewModel?
    @State private var showAdd = false
    @State private var editingItem: LiquidAsset?

    var body: some View {
        Group {
            if let vm {
                List {
                    if let s = vm.summary {
                        Section {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("总金额").font(.caption).foregroundStyle(.secondary)
                                    CurrencyText(value: s.totalAmount, font: .title2)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text("预估年收益").font(.caption).foregroundStyle(.secondary)
                                    CurrencyText(value: s.estimatedAnnualReturn, font: .headline)
                                }
                            }
                        }
                    }
                    Section("资产列表") {
                        if vm.items.isEmpty {
                            EmptyStateView(icon: "drop", title: "暂无活钱", message: "点击右上角添加")
                        }
                        ForEach(vm.items) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.name).font(.headline)
                                    Text("\(item.platform) · \(item.type == "deposit" ? "活期存款" : "货币基金")")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    CurrencyText(value: item.amount, font: .headline)
                                    if let rate = item.annualRate, rate > 0 {
                                        Text("年化 \(Fmt.percent(rate))").font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { try? await vm.delete(id: item.id) }
                                } label: { Label("删除", systemImage: "trash") }
                                Button { editingItem = item } label: { Label("编辑", systemImage: "pencil") }
                                    .tint(.blue)
                            }
                        }
                    }
                }
                .refreshable { await vm.load() }
            } else {
                LoadingView()
            }
        }
        .navigationTitle("活钱")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { LiquidFormSheet(mode: .add) { try await vm.create($0) } }
        }
        .sheet(item: $editingItem) { item in
            if let vm {
                LiquidFormSheet(mode: .edit(item)) { data in
                    try await vm.update(id: item.id, LiquidAssetUpdate(
                        name: data.name, type: data.type, platform: data.platform,
                        amount: data.amount, annualRate: data.annualRate))
                }
            }
        }
        .task {
            if vm == nil { vm = LiquidViewModel(api: api) }
            await vm?.load()
        }
    }
}
```

**Step 3: LiquidFormSheet** — 添加/编辑表单

```swift
// MosaicApp/Views/Liquid/LiquidFormSheet.swift
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
```

**Step 4: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Liquid assets with CRUD"
```

---

### Task 9: 稳钱管理页

**Files:**
- Create: `MosaicApp/ViewModels/StableViewModel.swift`
- Modify: `MosaicApp/Views/Stable/StableListView.swift`
- Create: `MosaicApp/Views/Stable/StableFormSheet.swift`

结构与 Task 8 完全平行。关键差异：
- 模型多了 `startDate`、`maturityDate` 字段
- 列表行需要显示到期状态 badge
- 表单多两个 DatePicker

**Step 1: StableViewModel** — 同 LiquidViewModel 模式，使用 StableService

```swift
// MosaicApp/ViewModels/StableViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class StableViewModel {
    var items: [StableAsset] = []
    var summary: StableSummary?
    var isLoading = false
    var error: APIError?
    private let service: StableService

    init(api: APIClient) { self.service = StableService(api: api) }

    func load() async {
        isLoading = true
        do {
            let result = try await service.list()
            items = result.items; summary = result.summary
        } catch let e as APIError { error = e }
        catch { self.error = .networkError(error) }
        isLoading = false
    }

    func create(_ data: StableAssetCreate) async throws {
        _ = try await service.create(data); await load()
    }
    func update(id: Int, _ data: StableAssetUpdate) async throws {
        _ = try await service.update(id: id, data); await load()
    }
    func delete(id: Int) async throws {
        try await service.delete(id: id); await load()
    }
}
```

**Step 2: StableListView** — 额外显示到期状态和 DatePicker

```swift
// MosaicApp/Views/Stable/StableListView.swift
// 贾维斯为您服务
import SwiftUI

struct StableListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: StableViewModel?
    @State private var showAdd = false
    @State private var editingItem: StableAsset?

    var body: some View {
        Group {
            if let vm {
                List {
                    if let s = vm.summary {
                        Section {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("总金额").font(.caption).foregroundStyle(.secondary)
                                    CurrencyText(value: s.totalAmount, font: .title2)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text("预估年收益").font(.caption).foregroundStyle(.secondary)
                                    CurrencyText(value: s.estimatedAnnualReturn, font: .headline)
                                }
                            }
                        }
                    }
                    Section("资产列表") {
                        if vm.items.isEmpty {
                            EmptyStateView(icon: "building.columns", title: "暂无稳钱", message: "点击右上角添加")
                        }
                        ForEach(vm.items) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(item.name).font(.headline)
                                    Spacer()
                                    CurrencyText(value: item.amount, font: .headline)
                                }
                                HStack {
                                    Text("\(item.platform) · \(item.type == "term_deposit" ? "定期存款" : "银行理财")")
                                        .font(.caption).foregroundStyle(.secondary)
                                    Spacer()
                                    Text("年化 \(Fmt.percent(item.annualRate))").font(.caption).foregroundStyle(.secondary)
                                }
                                if let maturity = item.maturityDate {
                                    maturityBadge(maturity)
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { try? await vm.delete(id: item.id) }
                                } label: { Label("删除", systemImage: "trash") }
                                Button { editingItem = item } label: { Label("编辑", systemImage: "pencil") }
                                    .tint(.blue)
                            }
                        }
                    }
                }
                .refreshable { await vm.load() }
            } else { LoadingView() }
        }
        .navigationTitle("稳钱")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { StableFormSheet(mode: .add) { try await vm.create($0) } }
        }
        .sheet(item: $editingItem) { item in
            if let vm {
                StableFormSheet(mode: .edit(item)) { data in
                    try await vm.update(id: item.id, StableAssetUpdate(
                        name: data.name, type: data.type, platform: data.platform,
                        amount: data.amount, annualRate: data.annualRate,
                        startDate: data.startDate, maturityDate: data.maturityDate))
                }
            }
        }
        .task {
            if vm == nil { vm = StableViewModel(api: api) }
            await vm?.load()
        }
    }

    @ViewBuilder
    private func maturityBadge(_ dateStr: String) -> some View {
        let df = DateFormatter()
        let _ = (df.dateFormat = "yyyy-MM-dd")
        if let date = df.date(from: dateStr) {
            let days = Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 0
            if days <= 0 {
                Text("已到期").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Color.red.opacity(0.15), in: Capsule()).foregroundStyle(.red)
            } else if days <= 30 {
                Text("\(days)天到期").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Color.orange.opacity(0.15), in: Capsule()).foregroundStyle(.orange)
            } else {
                Text("\(dateStr) 到期").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}
```

**Step 3: StableFormSheet** — 含 DatePicker

```swift
// MosaicApp/Views/Stable/StableFormSheet.swift
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
```

**Step 4: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Stable assets with CRUD and maturity badge"
```

---

### Task 10: 持仓明细页 + 基金详情页

**Files:**
- Create: `MosaicApp/ViewModels/HoldingsViewModel.swift`
- Create: `MosaicApp/ViewModels/FundDetailViewModel.swift`
- Modify: `MosaicApp/Views/Growth/HoldingsListView.swift`
- Create: `MosaicApp/Views/Growth/HoldingFormSheet.swift`
- Modify: `MosaicApp/Views/FundDetail/FundDetailView.swift`
- Create: `MosaicApp/Views/FundDetail/NavHistoryChart.swift`
- Create: `MosaicApp/Views/FundDetail/AllocationPieChart.swift`

**Step 1: HoldingsViewModel**

```swift
// MosaicApp/ViewModels/HoldingsViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class HoldingsViewModel {
    var holdings: [HoldingResponse] = []
    var isLoading = false
    var error: APIError?
    private let service: HoldingsService

    init(api: APIClient) { self.service = HoldingsService(api: api) }

    func load() async {
        isLoading = true
        do { holdings = try await service.list() }
        catch let e as APIError { error = e }
        catch { self.error = .networkError(error) }
        isLoading = false
    }

    func create(_ data: HoldingCreate) async throws { _ = try await service.create(data); await load() }
    func delete(id: Int) async throws { try await service.delete(id: id); await load() }
    func updateSnapshot(id: Int, _ data: SnapshotUpdate) async throws {
        _ = try await service.updateSnapshot(id: id, data); await load()
    }
}
```

**Step 2: HoldingsListView** — 点击 NavigationLink 到 FundDetailView

```swift
// MosaicApp/Views/Growth/HoldingsListView.swift
// 贾维斯为您服务
import SwiftUI

struct HoldingsListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: HoldingsViewModel?
    @State private var showAdd = false

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.holdings.isEmpty { LoadingView() }
                else {
                    List {
                        ForEach(vm.holdings) { h in
                            NavigationLink { FundDetailView(fundCode: h.fundCode) } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(h.fundName).font(.headline)
                                        Text("\(h.fundCode) · \(h.platform)").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 4) {
                                        if let mv = h.marketValue { CurrencyText(value: mv, font: .headline) }
                                        if let pnl = h.pnl, let pct = h.pnlPercent {
                                            HStack(spacing: 4) {
                                                PnLText(value: pnl, font: .caption)
                                                PercentText(value: pct, font: .caption)
                                            }
                                        }
                                    }
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { Task { try? await vm.delete(id: h.id) } }
                                    label: { Label("删除", systemImage: "trash") }
                            }
                        }
                    }
                    .refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("持仓明细")
        .toolbar { Button { showAdd = true } label: { Image(systemName: "plus") } }
        .sheet(isPresented: $showAdd) {
            if let vm { HoldingFormSheet { try await vm.create($0) } }
        }
        .task {
            if vm == nil { vm = HoldingsViewModel(api: api) }
            await vm?.load()
        }
    }
}
```

**Step 3: HoldingFormSheet**

```swift
// MosaicApp/Views/Growth/HoldingFormSheet.swift
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
```

**Step 4: FundDetailViewModel**

```swift
// MosaicApp/ViewModels/FundDetailViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class FundDetailViewModel {
    var fundInfo: FundInfo?
    var navHistory: [NavHistory] = []
    var allocation: FundAllocation = [:]
    var topHoldings: [TopHolding] = []
    var isLoading = false
    private let service: FundsService
    let fundCode: String

    init(api: APIClient, fundCode: String) {
        self.service = FundsService(api: api); self.fundCode = fundCode
    }

    func load() async {
        isLoading = true
        async let i = service.get(code: fundCode)
        async let n = service.navHistory(code: fundCode)
        async let a = service.allocation(code: fundCode)
        async let t = service.topHoldings(code: fundCode)
        do {
            fundInfo = try await i; navHistory = try await n
            allocation = try await a; topHoldings = try await t
        } catch {}
        isLoading = false
    }
}
```

**Step 5: FundDetailView** — 基本信息 + 净值图 + 配置饼图 + 重仓股

```swift
// MosaicApp/Views/FundDetail/FundDetailView.swift
// 贾维斯为您服务
import SwiftUI

struct FundDetailView: View {
    @Environment(APIClient.self) private var api
    let fundCode: String
    @State private var vm: FundDetailViewModel?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.fundInfo == nil { LoadingView() }
                else if let info = vm.fundInfo {
                    ScrollView {
                        VStack(spacing: 16) {
                            // 基本信息
                            VStack(alignment: .leading, spacing: 8) {
                                Text(info.fundName).font(.title2).bold()
                                HStack {
                                    Text(info.fundCode); Text("·"); Text(info.fundType)
                                }.font(.caption).foregroundStyle(.secondary)
                                Text(info.managementCompany).font(.caption).foregroundStyle(.secondary)
                                if let nav = info.latestNav, let date = info.latestNavDate {
                                    HStack {
                                        Text("最新净值").foregroundStyle(.secondary)
                                        Text(String(format: "%.4f", nav)).bold().monospacedDigit()
                                        Text("(\(date))").foregroundStyle(.secondary)
                                    }.font(.subheadline)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            NavHistoryChart(data: vm.navHistory)
                            if !vm.allocation.isEmpty { AllocationPieChart(allocation: vm.allocation) }
                            if !vm.topHoldings.isEmpty { topHoldingsSection(vm.topHoldings) }
                        }.padding()
                    }
                }
            }
        }
        .navigationTitle(fundCode)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if vm == nil { vm = FundDetailViewModel(api: api, fundCode: fundCode) }
            await vm?.load()
        }
    }

    private func topHoldingsSection(_ holdings: [TopHolding]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("重仓股").font(.headline)
            ForEach(holdings) { h in
                HStack {
                    Text(h.stockName)
                    Spacer()
                    Text(Fmt.percent(h.percentage)).monospacedDigit().foregroundStyle(.secondary)
                }.font(.subheadline)
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 6: NavHistoryChart + AllocationPieChart**

```swift
// MosaicApp/Views/FundDetail/NavHistoryChart.swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct NavHistoryChart: View {
    let data: [NavHistory]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("净值走势").font(.headline)
            if data.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 180)
            } else {
                Chart(data) { item in
                    LineMark(x: .value("日期", item.date), y: .value("净值", item.nav))
                        .foregroundStyle(Color.accentColor)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 180)
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
```

```swift
// MosaicApp/Views/FundDetail/AllocationPieChart.swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct AllocationPieChart: View {
    let allocation: FundAllocation
    @State private var selectedDimension = "asset_class"
    private let dimensionLabels = ["asset_class": "资产类别", "sector": "行业", "geography": "地域"]
    private let colors: [Color] = [.blue, .green, .orange, .purple, .red, .cyan, .yellow, .pink]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("资产配置").font(.headline)
                Spacer()
                Picker("维度", selection: $selectedDimension) {
                    ForEach(Array(allocation.keys.sorted()), id: \.self) { key in
                        Text(dimensionLabels[key] ?? key).tag(key)
                    }
                }.pickerStyle(.segmented).frame(width: 220)
            }
            if let items = allocation[selectedDimension], !items.isEmpty {
                Chart(Array(items.enumerated()), id: \.element.category) { i, item in
                    SectorMark(angle: .value("占比", item.percentage), innerRadius: .ratio(0.55))
                        .foregroundStyle(colors[i % colors.count])
                }.frame(height: 160)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                    ForEach(Array(items.enumerated()), id: \.element.category) { i, item in
                        HStack(spacing: 4) {
                            Circle().fill(colors[i % colors.count]).frame(width: 8, height: 8)
                            Text(item.category).font(.caption2)
                            Spacer()
                            Text(Fmt.percent(item.percentage)).font(.caption2).monospacedDigit()
                        }
                    }
                }
            }
        }
        .padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 7: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Holdings list and Fund detail page"
```

---

### Task 11: 组合概览页

**Files:**
- Create: `MosaicApp/ViewModels/OverviewViewModel.swift`
- Modify: `MosaicApp/Views/Growth/OverviewView.swift`

**Step 1: OverviewViewModel**

```swift
// MosaicApp/ViewModels/OverviewViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class OverviewViewModel {
    var summary: PortfolioSummary?
    var trend: [PortfolioTrend] = []
    var platforms: [PlatformBreakdown] = []
    var allocation: AllocationResponse?
    var positionStatus: PositionStatus?
    var isLoading = false
    private let portfolioService: PortfolioService
    private let positionService: PositionService

    init(api: APIClient) {
        self.portfolioService = PortfolioService(api: api)
        self.positionService = PositionService(api: api)
    }

    func load() async {
        isLoading = true
        async let s = portfolioService.summary()
        async let t = portfolioService.trend()
        async let p = portfolioService.byPlatform()
        async let a = portfolioService.allocation(dimension: "asset_class")
        async let pos = positionService.getBudget()
        do {
            summary = try await s; trend = try await t; platforms = try await p
            allocation = try await a; positionStatus = try await pos
        } catch {}
        isLoading = false
    }
}
```

**Step 2: OverviewView** — 汇总卡片 + 走势图 + 平台分布 + 配置图

```swift
// MosaicApp/Views/Growth/OverviewView.swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct OverviewView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: OverviewViewModel?

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.summary == nil { LoadingView() }
                else if let summary = vm.summary {
                    ScrollView {
                        VStack(spacing: 16) {
                            // 汇总卡片
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                statCard("总盈亏") { PnLText(value: summary.totalPnl, font: .headline) }
                                statCard("收益率") { PercentText(value: summary.pnlPercent, font: .headline) }
                                statCard("总市值") { CurrencyText(value: summary.totalValue, font: .headline) }
                                statCard("仓位") {
                                    Text(Fmt.percent(vm.positionStatus?.positionRatio ?? 0))
                                        .font(.headline).monospacedDigit()
                                }
                            }
                            // 走势图
                            trendSection(vm.trend)
                            // 平台分布
                            if !vm.platforms.isEmpty { platformSection(vm.platforms) }
                            // 配置分析
                            if let alloc = vm.allocation, !alloc.items.isEmpty { allocationSection(alloc) }
                        }.padding()
                    }.refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("组合概览")
        .task {
            if vm == nil { vm = OverviewViewModel(api: api) }
            await vm?.load()
        }
    }

    private func statCard<V: View>(_ title: String, @ViewBuilder value: () -> V) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            value()
        }.frame(maxWidth: .infinity).padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func trendSection(_ data: [PortfolioTrend]) -> some View {
        VStack(alignment: .leading) {
            Text("组合走势").font(.headline)
            if data.isEmpty { Text("暂无数据").foregroundStyle(.secondary).frame(height: 200) }
            else {
                Chart(data) {
                    LineMark(x: .value("日期", $0.date), y: .value("市值", $0.totalValue))
                        .foregroundStyle(Color.bucketGrowth)
                }.chartYScale(domain: .automatic(includesZero: false)).frame(height: 200)
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func platformSection(_ platforms: [PlatformBreakdown]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("平台分布").font(.headline)
            ForEach(platforms) { p in
                HStack {
                    Text(p.platform)
                    Spacer()
                    CurrencyText(value: p.marketValue, font: .subheadline)
                    PnLText(value: p.pnl, font: .caption)
                }
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func allocationSection(_ alloc: AllocationResponse) -> some View {
        let colors: [Color] = [.blue, .green, .orange, .purple, .red, .cyan]
        return VStack(alignment: .leading, spacing: 8) {
            Text("资产配置").font(.headline)
            Chart(Array(alloc.items.enumerated()), id: \.element.category) { i, item in
                SectorMark(angle: .value("占比", item.percentage), innerRadius: .ratio(0.6))
                    .foregroundStyle(colors[i % colors.count])
            }.frame(height: 160)
            ForEach(Array(alloc.items.enumerated()), id: \.element.category) { i, item in
                HStack(spacing: 4) {
                    Circle().fill(colors[i % colors.count]).frame(width: 8, height: 8)
                    Text(item.category).font(.caption)
                    Spacer()
                    Text(Fmt.percent(item.percentage)).font(.caption).monospacedDigit()
                }
            }
        }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 3: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Portfolio overview with charts"
```

---

### Task 12: 仓位管理页

**Files:**
- Create: `MosaicApp/ViewModels/PositionViewModel.swift`
- Modify: `MosaicApp/Views/Growth/PositionView.swift`
- Create: `MosaicApp/Views/Growth/PositionGaugeView.swift`
- Create: `MosaicApp/Views/Growth/StrategyView.swift`

**Step 1: PositionViewModel**

```swift
// MosaicApp/ViewModels/PositionViewModel.swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class PositionViewModel {
    var status: PositionStatus?
    var strategies: [StrategyInfo] = []
    var suggestion: StrategyResult?
    var isLoading = false
    private let service: PositionService

    init(api: APIClient) { self.service = PositionService(api: api) }

    func load() async {
        isLoading = true
        async let s = service.getBudget()
        async let strats = service.strategies()
        do { status = try await s; strategies = try await strats } catch {}
        isLoading = false
    }

    func updateBudget(_ data: BudgetUpdate) async throws { status = try await service.updateBudget(data) }
    func setStrategy(name: String) async throws { status = try await service.setActiveStrategy(name: name) }
    func loadSuggestion() async { do { suggestion = try await service.suggestion() } catch {} }
}
```

**Step 2: PositionGaugeView** — 自定义圆弧仪表盘

```swift
// MosaicApp/Views/Growth/PositionGaugeView.swift
// 贾维斯为您服务
import SwiftUI

struct PositionGaugeView: View {
    let ratio: Double     // 0-100
    let minTarget: Double
    let maxTarget: Double

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().trim(from: 0, to: 0.75)
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 20)
                    .rotationEffect(.degrees(135))
                Circle().trim(from: CGFloat(minTarget / 100 * 0.75), to: CGFloat(maxTarget / 100 * 0.75))
                    .stroke(Color.green.opacity(0.3), lineWidth: 20)
                    .rotationEffect(.degrees(135))
                Circle().trim(from: 0, to: CGFloat(min(ratio, 100) / 100 * 0.75))
                    .stroke(gaugeColor, lineWidth: 20)
                    .rotationEffect(.degrees(135))
                VStack(spacing: 2) {
                    Text(Fmt.percent(ratio)).font(.system(size: 28, weight: .bold)).monospacedDigit()
                    Text("当前仓位").font(.caption).foregroundStyle(.secondary)
                }
            }.frame(width: 180, height: 180)
            Label("目标 \(Fmt.percent(minTarget))-\(Fmt.percent(maxTarget))", systemImage: "target")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var gaugeColor: Color {
        if ratio < minTarget { return .orange }
        if ratio > maxTarget { return .red }
        return .green
    }
}
```

**Step 3: PositionView** — 仪表盘 + 预算 + 策略

```swift
// MosaicApp/Views/Growth/PositionView.swift
// 贾维斯为您服务
import SwiftUI

struct PositionView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: PositionViewModel?
    @State private var showBudgetEdit = false
    @State private var showSuggestion = false

    var body: some View {
        Group {
            if let vm {
                if vm.isLoading && vm.status == nil { LoadingView() }
                else if let status = vm.status {
                    ScrollView {
                        VStack(spacing: 16) {
                            PositionGaugeView(ratio: status.positionRatio,
                                minTarget: status.targetPositionMin, maxTarget: status.targetPositionMax)

                            // 预算卡片
                            VStack(spacing: 12) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("总预算").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalBudget, font: .headline)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing) {
                                        Text("可用资金").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.availableCash, font: .headline)
                                    }
                                }
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("总市值").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalValue, font: .subheadline)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing) {
                                        Text("总成本").font(.caption).foregroundStyle(.secondary)
                                        CurrencyText(value: status.totalCost, font: .subheadline)
                                    }
                                }
                            }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            // 策略列表
                            VStack(alignment: .leading, spacing: 8) {
                                Text("投资策略").font(.headline)
                                ForEach(vm.strategies) { s in
                                    HStack {
                                        VStack(alignment: .leading) {
                                            Text(s.displayName).font(.subheadline)
                                            Text(s.description).font(.caption).foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        if s.name == status.activeStrategy {
                                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                        } else {
                                            Button("启用") { Task { try? await vm.setStrategy(name: s.name) } }
                                                .buttonStyle(.bordered).controlSize(.small)
                                        }
                                    }.padding(.vertical, 4)
                                }
                            }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))

                            Button { showSuggestion = true; Task { await vm.loadSuggestion() } } label: {
                                Label("获取策略建议", systemImage: "lightbulb").frame(maxWidth: .infinity)
                            }.buttonStyle(.borderedProminent)
                        }.padding()
                    }.refreshable { await vm.load() }
                }
            } else { LoadingView() }
        }
        .navigationTitle("仓位管理")
        .toolbar { Button { showBudgetEdit = true } label: { Image(systemName: "slider.horizontal.3") } }
        .sheet(isPresented: $showBudgetEdit) {
            if let vm, let s = vm.status { BudgetEditSheet(status: s) { try await vm.updateBudget($0) } }
        }
        .sheet(isPresented: $showSuggestion) {
            if let vm { StrategyView(suggestion: vm.suggestion) }
        }
        .task {
            if vm == nil { vm = PositionViewModel(api: api) }
            await vm?.load()
        }
    }
}

struct BudgetEditSheet: View {
    let status: PositionStatus
    let onSave: (BudgetUpdate) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var totalBudget = ""
    @State private var minTarget = ""
    @State private var maxTarget = ""
    @State private var reason = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("总预算", text: $totalBudget).keyboardType(.decimalPad)
                TextField("目标仓位下限 (%)", text: $minTarget).keyboardType(.decimalPad)
                TextField("目标仓位上限 (%)", text: $maxTarget).keyboardType(.decimalPad)
                TextField("调整原因", text: $reason)
            }
            .navigationTitle("预算设置").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        Task {
                            try? await onSave(BudgetUpdate(totalBudget: Double(totalBudget),
                                targetPositionMin: Double(minTarget), targetPositionMax: Double(maxTarget),
                                reason: reason.isEmpty ? nil : reason))
                            dismiss()
                        }
                    }
                }
            }
            .onAppear {
                totalBudget = "\(status.totalBudget)"
                minTarget = "\(status.targetPositionMin)"
                maxTarget = "\(status.targetPositionMax)"
            }
        }
    }
}
```

**Step 4: StrategyView**

```swift
// MosaicApp/Views/Growth/StrategyView.swift
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
```

**Step 5: 构建验证 + Commit**

```bash
swift build
git add -A && git commit -m "feat(ios): implement Position management with gauge and strategy"
```

---

## Task 7: Dashboard 总览页

**Files:**
- Create: `ios/MosaicApp/ViewModels/DashboardViewModel.swift`
- Create: `ios/MosaicApp/Views/Dashboard/DashboardView.swift`
- Create: `ios/MosaicApp/Views/Dashboard/BucketSummaryCard.swift`
- Create: `ios/MosaicApp/Views/Dashboard/AssetTrendChart.swift`
- Create: `ios/MosaicApp/Views/Dashboard/AssetPieChart.swift`
- Create: `ios/MosaicApp/Views/Dashboard/ReminderListView.swift`
- Modify: `ios/MosaicApp/ContentView.swift` — 替换 `DashboardPlaceholder`

**Step 1: 编写 DashboardViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DashboardViewModel {
    var summary: DashboardSummary?
    var reminders: [Reminder] = []
    var trend: [TotalAssetTrend] = []
    var selectedDays = 90
    var isLoading = false
    var error: Error?

    private let service: DashboardService

    init(api: APIClient) {
        self.service = DashboardService(api: api)
    }

    func loadAll() async {
        isLoading = true
        error = nil
        do {
            async let s = service.summary()
            async let r = service.reminders()
            async let t = service.trend(days: selectedDays)
            summary = try await s
            reminders = try await r
            trend = try await t
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func loadTrend() async {
        do {
            trend = try await service.trend(days: selectedDays)
        } catch {
            self.error = error
        }
    }
}
```

**Step 2: 编写 DashboardView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct DashboardView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DashboardViewModel?

    var body: some View {
        Group {
            if let vm {
                content(vm)
            } else {
                LoadingView()
            }
        }
        .navigationTitle("资产总览")
        .task {
            if vm == nil { vm = DashboardViewModel(api: api) }
            await vm?.loadAll()
        }
        .refreshable {
            await vm?.loadAll()
        }
    }

    @ViewBuilder
    private func content(_ vm: DashboardViewModel) -> some View {
        if vm.isLoading && vm.summary == nil {
            LoadingView()
        } else if let summary = vm.summary {
            ScrollView {
                VStack(spacing: 16) {
                    // 总资产卡片
                    totalAssetCard(summary)

                    // 四桶概览
                    bucketGrid(summary.buckets)

                    // 走势图
                    AssetTrendChart(
                        trend: vm.trend,
                        selectedDays: $vm.selectedDays,
                        onDaysChanged: { Task { await vm.loadTrend() } }
                    )

                    // 提醒
                    if !vm.reminders.isEmpty {
                        ReminderListView(reminders: vm.reminders)
                    }
                }
                .padding()
            }
        } else if let error = vm.error {
            ContentUnavailableView("加载失败", systemImage: "exclamationmark.triangle", description: Text(error.localizedDescription))
        }
    }

    private func totalAssetCard(_ summary: DashboardSummary) -> some View {
        VStack(spacing: 8) {
            Text("家庭总资产")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            CurrencyText(value: summary.totalAssets, useWan: true, font: .largeTitle.bold())
            HStack(spacing: 16) {
                PnLText(value: summary.totalReturn, font: .headline)
                PercentText(value: summary.totalReturnPercent, font: .headline)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func bucketGrid(_ buckets: BucketsSummary) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            BucketSummaryCard(
                title: "活钱", icon: "drop.fill", color: .bucketLiquid,
                amount: buckets.liquid.amount, detail: "\(buckets.liquid.count) 笔"
            )
            BucketSummaryCard(
                title: "稳钱", icon: "building.columns.fill", color: .bucketStable,
                amount: buckets.stable.amount, detail: "\(buckets.stable.count) 笔"
            )
            BucketSummaryCard(
                title: "长钱", icon: "chart.line.uptrend.xyaxis", color: .bucketGrowth,
                amount: buckets.growth.totalAmount,
                detail: Formatters.percent(buckets.growth.pnlPercent)
            )
            BucketSummaryCard(
                title: "保险", icon: "shield.fill", color: .bucketInsurance,
                amount: buckets.insurance.annualPremium,
                detail: "\(buckets.insurance.activeCount) 份保单"
            )
        }
    }
}
```

**Step 3: 编写 BucketSummaryCard.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct BucketSummaryCard: View {
    let title: String
    let icon: String
    let color: Color
    let amount: Double
    var detail: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                    .font(.subheadline.bold())
            }
            CurrencyText(value: amount, useWan: true, font: .headline.bold())
            if let detail {
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 4: 编写 AssetTrendChart.swift**

```swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct AssetTrendChart: View {
    let trend: [TotalAssetTrend]
    @Binding var selectedDays: Int
    var onDaysChanged: (() -> Void)?

    private let dayOptions = [30, 90, 180, 365]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("资产走势")
                    .font(.headline)
                Spacer()
                Picker("时间范围", selection: $selectedDays) {
                    Text("1月").tag(30)
                    Text("3月").tag(90)
                    Text("6月").tag(180)
                    Text("1年").tag(365)
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
                .onChange(of: selectedDays) { _, _ in
                    onDaysChanged?()
                }
            }

            if trend.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 200)
            } else {
                Chart(trend) { item in
                    LineMark(
                        x: .value("日期", item.date),
                        y: .value("总资产", item.totalAssets)
                    )
                    .foregroundStyle(Color.jade)

                    AreaMark(
                        x: .value("日期", item.date),
                        y: .value("总资产", item.totalAssets)
                    )
                    .foregroundStyle(
                        .linearGradient(
                            colors: [Color.jade.opacity(0.3), Color.jade.opacity(0.0)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
                .frame(height: 200)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            if let v = value.as(Double.self) {
                                Text(Formatters.wan(v))
                                    .font(.caption2)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 5: 编写 AssetPieChart.swift**

```swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct AssetPieChart: View {
    let items: [(label: String, value: Double, color: Color)]
    var title: String = "资产配置"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline)

            Chart(items, id: \.label) { item in
                SectorMark(
                    angle: .value("金额", item.value),
                    innerRadius: .ratio(0.5)
                )
                .foregroundStyle(item.color)
            }
            .frame(height: 200)

            // 图例
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                ForEach(items, id: \.label) { item in
                    HStack(spacing: 4) {
                        Circle().fill(item.color).frame(width: 8, height: 8)
                        Text(item.label).font(.caption)
                        Spacer()
                        Text(Formatters.wan(item.value)).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 6: 编写 ReminderListView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct ReminderListView: View {
    let reminders: [Reminder]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("提醒事项").font(.headline)

            ForEach(reminders) { reminder in
                HStack(spacing: 12) {
                    Image(systemName: iconName(reminder.level))
                        .foregroundStyle(levelColor(reminder.level))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(reminder.title)
                            .font(.subheadline.bold())
                        Text(reminder.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if let days = reminder.days {
                        Text("\(days)天")
                            .font(.caption.bold())
                            .foregroundStyle(levelColor(reminder.level))
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func iconName(_ level: String) -> String {
        switch level {
        case "urgent": return "exclamationmark.triangle.fill"
        case "warning": return "exclamationmark.circle.fill"
        default: return "info.circle.fill"
        }
    }

    private func levelColor(_ level: String) -> Color {
        switch level {
        case "urgent": return .red
        case "warning": return .orange
        default: return .blue
        }
    }
}
```

**Step 7: 修改 ContentView.swift**

替换 `DashboardPlaceholder()` 为 `DashboardView()`。

**Step 8: 构建验证 + 模拟器运行，提交**

```bash
git add -A && git commit -m "feat(ios): implement Dashboard with trend chart and reminders"
```

---

## Task 8: 四笔钱入口页 + 活钱管理

**Files:**
- Create: `ios/MosaicApp/Views/Growth/BucketsListView.swift`
- Create: `ios/MosaicApp/ViewModels/LiquidViewModel.swift`
- Create: `ios/MosaicApp/Views/Liquid/LiquidListView.swift`
- Create: `ios/MosaicApp/Views/Liquid/LiquidFormSheet.swift`
- Modify: `ios/MosaicApp/ContentView.swift` — 替换 `BucketsPlaceholder`

**Step 1: 编写 BucketsListView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct BucketsListView: View {
    var body: some View {
        List {
            NavigationLink(destination: LiquidListView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("活钱").font(.headline)
                        Text("活期存款、货币基金").font(.caption).foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "drop.fill").foregroundStyle(.bucketLiquid)
                }
            }

            NavigationLink(destination: StableListView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("稳钱").font(.headline)
                        Text("定期存款、银行理财").font(.caption).foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "building.columns.fill").foregroundStyle(.bucketStable)
                }
            }

            NavigationLink(destination: GrowthSectionView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("长钱").font(.headline)
                        Text("基金组合投资").font(.caption).foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(.bucketGrowth)
                }
            }

            NavigationLink(destination: InsuranceListView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("保险").font(.headline)
                        Text("家庭保障规划").font(.caption).foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "shield.fill").foregroundStyle(.bucketInsurance)
                }
            }
        }
        .navigationTitle("四笔钱")
    }
}

// 长钱子页面入口
struct GrowthSectionView: View {
    var body: some View {
        List {
            NavigationLink("组合概览", destination: OverviewView())
            NavigationLink("持仓明细", destination: HoldingsListView())
            NavigationLink("仓位管理", destination: PositionView())
        }
        .navigationTitle("长钱")
    }
}
```

**Step 2: 编写 LiquidViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class LiquidViewModel {
    var items: [LiquidAsset] = []
    var summary: LiquidSummary?
    var isLoading = false
    var error: Error?

    private let service: LiquidService

    init(api: APIClient) {
        self.service = LiquidService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await service.list()
            items = result.items
            summary = result.summary
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func create(_ data: LiquidAssetCreate) async {
        do {
            _ = try await service.create(data)
            await load()
        } catch {
            self.error = error
        }
    }

    func update(id: Int, _ data: LiquidAssetUpdate) async {
        do {
            _ = try await service.update(id: id, data)
            await load()
        } catch {
            self.error = error
        }
    }

    func delete(id: Int) async {
        do {
            try await service.delete(id: id)
            await load()
        } catch {
            self.error = error
        }
    }
}
```

**Step 3: 编写 LiquidListView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct LiquidListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: LiquidViewModel?
    @State private var showForm = false
    @State private var editingAsset: LiquidAsset?

    var body: some View {
        Group {
            if let vm {
                content(vm)
            } else {
                LoadingView()
            }
        }
        .navigationTitle("活钱")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showForm = true } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showForm) {
            LiquidFormSheet(editing: nil) { data in
                Task { await vm?.create(data) }
            }
        }
        .sheet(item: $editingAsset) { asset in
            LiquidFormSheet(editing: asset) { data in
                Task { await vm?.update(id: asset.id, data) }
            }
        }
        .task {
            if vm == nil { vm = LiquidViewModel(api: api) }
            await vm?.load()
        }
        .refreshable {
            await vm?.load()
        }
    }

    @ViewBuilder
    private func content(_ vm: LiquidViewModel) -> some View {
        if vm.items.isEmpty && !vm.isLoading {
            EmptyStateView(icon: "drop", title: "暂无活钱资产", message: "点击右上角 + 添加")
        } else {
            List {
                if let summary = vm.summary {
                    Section {
                        HStack {
                            SummaryCard(title: "总金额", value: Formatters.wan(summary.totalAmount))
                            SummaryCard(title: "预估年收益", value: Formatters.currency(summary.estimatedAnnualReturn))
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section {
                    ForEach(vm.items) { item in
                        liquidRow(item)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await vm.delete(id: item.id) }
                                } label: {
                                    Label("删除", systemImage: "trash")
                                }
                                Button {
                                    editingAsset = item
                                } label: {
                                    Label("编辑", systemImage: "pencil")
                                }
                                .tint(.blue)
                            }
                    }
                }
            }
        }
    }

    private func liquidRow(_ item: LiquidAsset) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name).font(.headline)
                HStack(spacing: 8) {
                    Text(item.type == "deposit" ? "活期存款" : "货币基金")
                    if !item.platform.isEmpty {
                        Text("· \(item.platform)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                CurrencyText(value: item.amount, font: .headline)
                if let rate = item.annualRate {
                    Text("\(Formatters.percent(rate))年化")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
```

**Step 4: 编写 LiquidFormSheet.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct LiquidFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    let editing: LiquidAsset?
    let onSave: (LiquidAssetCreate) -> Void

    @State private var name = ""
    @State private var type = "deposit"
    @State private var platform = ""
    @State private var amount = ""
    @State private var annualRate = ""

    private let typeOptions = [("deposit", "活期存款"), ("money_fund", "货币基金")]

    var body: some View {
        NavigationStack {
            Form {
                Section("基本信息") {
                    TextField("名称", text: $name)
                    Picker("类型", selection: $type) {
                        ForEach(typeOptions, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    TextField("平台", text: $platform)
                }

                Section("金额") {
                    TextField("金额", text: $amount)
                        .keyboardType(.decimalPad)
                    TextField("年化收益率（%）", text: $annualRate)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle(editing == nil ? "添加活钱" : "编辑活钱")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let data = LiquidAssetCreate(
                            name: name,
                            type: type,
                            platform: platform.isEmpty ? nil : platform,
                            amount: Double(amount),
                            annualRate: Double(annualRate)
                        )
                        onSave(data)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                if let e = editing {
                    name = e.name
                    type = e.type
                    platform = e.platform
                    amount = "\(e.amount)"
                    annualRate = e.annualRate.map { "\($0)" } ?? ""
                }
            }
        }
    }
}
```

**Step 5: 修改 ContentView.swift**

替换 `BucketsPlaceholder()` 为 `BucketsListView()`。注意 `BucketsListView` 引用了 `StableListView`、`OverviewView`、`HoldingsListView`、`PositionView`、`InsuranceListView`，这些尚未创建。临时为每个创建一个空壳 View：

在 ContentView.swift 中添加临时占位（或在各自目录创建空文件）：

```swift
// 临时占位，后续 Task 替换
struct StableListView: View { var body: some View { Text("稳钱").navigationTitle("稳钱") } }
struct OverviewView: View { var body: some View { Text("组合概览").navigationTitle("组合概览") } }
struct HoldingsListView: View { var body: some View { Text("持仓明细").navigationTitle("持仓明细") } }
struct PositionView: View { var body: some View { Text("仓位管理").navigationTitle("仓位管理") } }
struct InsuranceListView: View { var body: some View { Text("保险").navigationTitle("保险") } }
```

**Step 6: 构建验证 + 模拟器运行，提交**

```bash
git add -A && git commit -m "feat(ios): add buckets list, liquid asset CRUD with form sheet"
```

---

## Task 9: 稳钱管理

**Files:**
- Create: `ios/MosaicApp/ViewModels/StableViewModel.swift`
- Create: `ios/MosaicApp/Views/Stable/StableListView.swift`（替换占位）
- Create: `ios/MosaicApp/Views/Stable/StableFormSheet.swift`

**Step 1: 编写 StableViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class StableViewModel {
    var items: [StableAsset] = []
    var summary: StableSummary?
    var isLoading = false
    var error: Error?

    private let service: StableService

    init(api: APIClient) {
        self.service = StableService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await service.list()
            items = result.items
            summary = result.summary
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func create(_ data: StableAssetCreate) async {
        do {
            _ = try await service.create(data)
            await load()
        } catch { self.error = error }
    }

    func update(id: Int, _ data: StableAssetUpdate) async {
        do {
            _ = try await service.update(id: id, data)
            await load()
        } catch { self.error = error }
    }

    func delete(id: Int) async {
        do {
            try await service.delete(id: id)
            await load()
        } catch { self.error = error }
    }
}
```

**Step 2: 编写 StableListView.swift**

结构与 LiquidListView 类似：顶部汇总卡 + List + swipe actions + sheet 表单。额外显示到期日期和到期状态（已到期/即将到期/正常）。

```swift
// 贾维斯为您服务
import SwiftUI

struct StableListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: StableViewModel?
    @State private var showForm = false
    @State private var editingAsset: StableAsset?

    var body: some View {
        Group {
            if let vm {
                content(vm)
            } else { LoadingView() }
        }
        .navigationTitle("稳钱")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showForm = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showForm) {
            StableFormSheet(editing: nil) { data in Task { await vm?.create(data) } }
        }
        .sheet(item: $editingAsset) { asset in
            StableFormSheet(editing: asset) { data in Task { await vm?.update(id: asset.id, data) } }
        }
        .task {
            if vm == nil { vm = StableViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: StableViewModel) -> some View {
        if vm.items.isEmpty && !vm.isLoading {
            EmptyStateView(icon: "building.columns", title: "暂无稳钱资产")
        } else {
            List {
                if let summary = vm.summary {
                    Section {
                        HStack {
                            SummaryCard(title: "总金额", value: Formatters.wan(summary.totalAmount))
                            SummaryCard(title: "预估年收益", value: Formatters.currency(summary.estimatedAnnualReturn))
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section {
                    ForEach(vm.items) { item in
                        stableRow(item)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await vm.delete(id: item.id) }
                                } label: { Label("删除", systemImage: "trash") }
                                Button { editingAsset = item } label: { Label("编辑", systemImage: "pencil") }.tint(.blue)
                            }
                    }
                }
            }
        }
    }

    private func stableRow(_ item: StableAsset) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.name).font(.headline)
                    maturityBadge(item.maturityDate)
                }
                HStack(spacing: 8) {
                    Text(item.type == "term_deposit" ? "定期存款" : "银行理财")
                    if !item.platform.isEmpty { Text("· \(item.platform)") }
                }
                .font(.caption).foregroundStyle(.secondary)

                if let maturity = item.maturityDate {
                    Text("到期 \(maturity)")
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                CurrencyText(value: item.amount, font: .headline)
                Text("\(Formatters.percent(item.annualRate))年化")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func maturityBadge(_ maturityDate: String?) -> some View {
        if let dateStr = maturityDate, let date = Formatters.parseDate(dateStr) {
            let days = Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 0
            if days < 0 {
                Text("已到期").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                    .background(.red.opacity(0.15)).foregroundStyle(.red).clipShape(Capsule())
            } else if days <= 30 {
                Text("\(days)天到期").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                    .background(.orange.opacity(0.15)).foregroundStyle(.orange).clipShape(Capsule())
            }
        }
    }
}
```

**Step 3: 编写 StableFormSheet.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct StableFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    let editing: StableAsset?
    let onSave: (StableAssetCreate) -> Void

    @State private var name = ""
    @State private var type = "term_deposit"
    @State private var platform = ""
    @State private var amount = ""
    @State private var annualRate = ""
    @State private var startDate = Date()
    @State private var maturityDate = Date()
    @State private var hasStartDate = false
    @State private var hasMaturityDate = false

    var body: some View {
        NavigationStack {
            Form {
                Section("基本信息") {
                    TextField("名称", text: $name)
                    Picker("类型", selection: $type) {
                        Text("定期存款").tag("term_deposit")
                        Text("银行理财").tag("bank_product")
                    }
                    TextField("平台", text: $platform)
                }
                Section("金额") {
                    TextField("本金", text: $amount).keyboardType(.decimalPad)
                    TextField("年化利率（%）", text: $annualRate).keyboardType(.decimalPad)
                }
                Section("日期") {
                    Toggle("起始日期", isOn: $hasStartDate)
                    if hasStartDate {
                        DatePicker("起始", selection: $startDate, displayedComponents: .date)
                    }
                    Toggle("到期日期", isOn: $hasMaturityDate)
                    if hasMaturityDate {
                        DatePicker("到期", selection: $maturityDate, displayedComponents: .date)
                    }
                }
            }
            .navigationTitle(editing == nil ? "添加稳钱" : "编辑稳钱")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let data = StableAssetCreate(
                            name: name, type: type,
                            platform: platform.isEmpty ? nil : platform,
                            amount: Double(amount),
                            annualRate: Double(annualRate),
                            startDate: hasStartDate ? Formatters.isoDate(startDate) : nil,
                            maturityDate: hasMaturityDate ? Formatters.isoDate(maturityDate) : nil
                        )
                        onSave(data)
                        dismiss()
                    }.disabled(name.isEmpty)
                }
            }
            .onAppear {
                if let e = editing {
                    name = e.name; type = e.type; platform = e.platform
                    amount = "\(e.amount)"; annualRate = "\(e.annualRate)"
                    if let s = e.startDate, let d = Formatters.parseDate(s) {
                        hasStartDate = true; startDate = d
                    }
                    if let m = e.maturityDate, let d = Formatters.parseDate(m) {
                        hasMaturityDate = true; maturityDate = d
                    }
                }
            }
        }
    }
}
```

**Step 4: 删除 ContentView.swift 中 StableListView 的临时占位定义**

**Step 5: 构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add stable asset management with maturity badges"
```

---

## Task 10: 基金持仓列表 + 基金详情页

**Files:**
- Create: `ios/MosaicApp/ViewModels/HoldingsViewModel.swift`
- Create: `ios/MosaicApp/ViewModels/FundDetailViewModel.swift`
- Create: `ios/MosaicApp/Views/Growth/HoldingsListView.swift`（替换占位）
- Create: `ios/MosaicApp/Views/Growth/HoldingFormSheet.swift`
- Create: `ios/MosaicApp/Views/FundDetail/FundDetailView.swift`
- Create: `ios/MosaicApp/Views/FundDetail/NavHistoryChart.swift`
- Create: `ios/MosaicApp/Views/FundDetail/AllocationPieChart.swift`

**Step 1: 编写 HoldingsViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class HoldingsViewModel {
    var holdings: [HoldingResponse] = []
    var isLoading = false
    var error: Error?

    private let holdingsService: HoldingsService
    private let portfolioService: PortfolioService
    var portfolioSummary: PortfolioSummary?

    init(api: APIClient) {
        self.holdingsService = HoldingsService(api: api)
        self.portfolioService = PortfolioService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let h = holdingsService.list()
            async let s = portfolioService.summary()
            holdings = try await h
            portfolioSummary = try await s
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func create(_ data: HoldingCreate) async {
        do {
            _ = try await holdingsService.create(data)
            await load()
        } catch { self.error = error }
    }

    func update(id: Int, _ data: HoldingUpdate) async {
        do {
            _ = try await holdingsService.update(id: id, data)
            await load()
        } catch { self.error = error }
    }

    func delete(id: Int) async {
        do {
            try await holdingsService.delete(id: id)
            await load()
        } catch { self.error = error }
    }

    func updateSnapshot(id: Int, _ data: SnapshotUpdate) async {
        do {
            _ = try await holdingsService.updateSnapshot(id: id, data)
            await load()
        } catch { self.error = error }
    }

    func changelog(id: Int) async throws -> [ChangeLog] {
        try await holdingsService.changelog(id: id)
    }
}
```

**Step 2: 编写 FundDetailViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class FundDetailViewModel {
    var fundInfo: FundInfo?
    var navHistory: [NavHistory] = []
    var allocation: FundAllocation = [:]
    var topHoldings: [TopHolding] = []
    var isLoading = false
    var error: Error?

    private let service: FundsService
    let fundCode: String

    init(api: APIClient, fundCode: String) {
        self.service = FundsService(api: api)
        self.fundCode = fundCode
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let info = service.get(code: fundCode)
            async let nav = service.navHistory(code: fundCode)
            async let alloc = service.allocation(code: fundCode)
            async let top = service.topHoldings(code: fundCode)
            fundInfo = try await info
            navHistory = try await nav
            allocation = try await alloc
            topHoldings = try await top
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
```

**Step 3: 编写 HoldingsListView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct HoldingsListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: HoldingsViewModel?
    @State private var showAddForm = false
    @State private var editingHolding: HoldingResponse?

    var body: some View {
        Group {
            if let vm {
                content(vm)
            } else { LoadingView() }
        }
        .navigationTitle("持仓明细")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAddForm = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showAddForm) {
            HoldingFormSheet { data in Task { await vm?.create(data) } }
        }
        .task {
            if vm == nil { vm = HoldingsViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: HoldingsViewModel) -> some View {
        if vm.holdings.isEmpty && !vm.isLoading {
            EmptyStateView(icon: "chart.line.uptrend.xyaxis", title: "暂无持仓")
        } else {
            List {
                // 汇总卡片
                if let s = vm.portfolioSummary {
                    Section {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            SummaryCard(title: "总盈亏", value: Formatters.currency(s.totalPnl), color: Color.pnlColor(s.totalPnl))
                            SummaryCard(title: "收益率", value: Formatters.percent(s.pnlPercent), color: Color.pnlColor(s.pnlPercent))
                            SummaryCard(title: "总市值", value: Formatters.wan(s.totalValue))
                            SummaryCard(title: "总成本", value: Formatters.wan(s.totalCost))
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                // 持仓列表
                Section {
                    ForEach(vm.holdings) { holding in
                        NavigationLink(destination: FundDetailView(fundCode: holding.fundCode)) {
                            holdingRow(holding)
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await vm.delete(id: holding.id) }
                            } label: { Label("删除", systemImage: "trash") }
                        }
                    }
                }
            }
        }
    }

    private func holdingRow(_ h: HoldingResponse) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(h.fundName).font(.subheadline.bold())
                HStack(spacing: 8) {
                    Text(h.fundCode).font(.caption).foregroundStyle(.secondary)
                    Text(h.platform).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                if let mv = h.marketValue {
                    CurrencyText(value: mv, font: .subheadline)
                }
                if let pnl = h.pnl, let pnlPct = h.pnlPercent {
                    HStack(spacing: 4) {
                        PnLText(value: pnl, font: .caption)
                        PercentText(value: pnlPct, font: .caption)
                    }
                }
            }
        }
    }
}
```

**Step 4: 编写 HoldingFormSheet.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct HoldingFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (HoldingCreate) -> Void

    @State private var fundCode = ""
    @State private var platform = ""
    @State private var shares = ""
    @State private var costPrice = ""
    @State private var purchaseDate = Date()

    var body: some View {
        NavigationStack {
            Form {
                Section("基金信息") {
                    TextField("基金代码（如 012414）", text: $fundCode)
                        .keyboardType(.numberPad)
                    TextField("平台（如 天天基金）", text: $platform)
                }
                Section("持仓数据") {
                    TextField("份额", text: $shares).keyboardType(.decimalPad)
                    TextField("成本单价", text: $costPrice).keyboardType(.decimalPad)
                    DatePicker("购入日期", selection: $purchaseDate, displayedComponents: .date)
                }
            }
            .navigationTitle("添加持仓")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let data = HoldingCreate(
                            fundCode: fundCode, platform: platform,
                            shares: Double(shares) ?? 0,
                            costPrice: Double(costPrice) ?? 0,
                            purchaseDate: Formatters.isoDate(purchaseDate)
                        )
                        onSave(data)
                        dismiss()
                    }.disabled(fundCode.isEmpty || platform.isEmpty)
                }
            }
        }
    }
}
```

**Step 5: 编写 FundDetailView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct FundDetailView: View {
    @Environment(APIClient.self) private var api
    let fundCode: String
    @State private var vm: FundDetailViewModel?

    var body: some View {
        Group {
            if let vm {
                content(vm)
            } else { LoadingView() }
        }
        .navigationTitle(vm?.fundInfo?.fundName ?? fundCode)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if vm == nil { vm = FundDetailViewModel(api: api, fundCode: fundCode) }
            await vm?.load()
        }
    }

    @ViewBuilder
    private func content(_ vm: FundDetailViewModel) -> some View {
        if vm.isLoading && vm.fundInfo == nil {
            LoadingView()
        } else if let info = vm.fundInfo {
            ScrollView {
                VStack(spacing: 16) {
                    // 基本信息
                    infoCard(info)
                    // 净值走势
                    NavHistoryChart(history: vm.navHistory)
                    // 配置
                    if let assetClass = vm.allocation["asset_class"], !assetClass.isEmpty {
                        AllocationPieChart(items: assetClass, title: "资产配置")
                    }
                    // 重仓股
                    if !vm.topHoldings.isEmpty {
                        topHoldingsSection(vm.topHoldings)
                    }
                }
                .padding()
            }
        }
    }

    private func infoCard(_ info: FundInfo) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(info.fundName).font(.headline)
                Spacer()
                Text(info.fundCode).font(.caption).foregroundStyle(.secondary)
            }
            HStack {
                Text(info.fundType).font(.subheadline)
                Spacer()
                Text(info.managementCompany).font(.caption).foregroundStyle(.secondary)
            }
            if let nav = info.latestNav, let date = info.latestNavDate {
                HStack {
                    Text("最新净值: \(String(format: "%.4f", nav))").font(.subheadline.bold())
                    Spacer()
                    Text(date).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func topHoldingsSection(_ holdings: [TopHolding]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("前十大持仓").font(.headline)
            ForEach(holdings) { h in
                HStack {
                    Text(h.stockName).font(.subheadline)
                    Spacer()
                    Text(Formatters.percent(h.percentage)).font(.subheadline).foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 6: 编写 NavHistoryChart.swift**

```swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct NavHistoryChart: View {
    let history: [NavHistory]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("净值走势").font(.headline)

            if history.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary).frame(height: 200)
            } else {
                Chart(history) { item in
                    LineMark(
                        x: .value("日期", item.date),
                        y: .value("净值", item.nav)
                    )
                    .foregroundStyle(Color.jade)
                }
                .frame(height: 200)
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 7: 编写 AllocationPieChart.swift**

```swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct AllocationPieChart: View {
    let items: [AllocationItem]
    var title = "资产配置"

    private let colors: [Color] = [.blue, .green, .orange, .purple, .red, .cyan, .mint, .pink, .indigo, .brown]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline)

            Chart(Array(items.enumerated()), id: \.element.id) { index, item in
                SectorMark(
                    angle: .value("比例", item.percentage),
                    innerRadius: .ratio(0.5)
                )
                .foregroundStyle(colors[index % colors.count])
            }
            .frame(height: 200)

            // 图例
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                HStack(spacing: 8) {
                    Circle().fill(colors[index % colors.count]).frame(width: 8, height: 8)
                    Text(item.category).font(.caption)
                    Spacer()
                    Text(Formatters.percent(item.percentage)).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 8: 删除 HoldingsListView 临时占位，构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add holdings list, fund detail with charts"
```

---

## Task 11: 组合概览页

**Files:**
- Create: `ios/MosaicApp/ViewModels/OverviewViewModel.swift`
- Create: `ios/MosaicApp/Views/Growth/OverviewView.swift`（替换占位）

**Step 1: 编写 OverviewViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class OverviewViewModel {
    var summary: PortfolioSummary?
    var trend: [PortfolioTrend] = []
    var platforms: [PlatformBreakdown] = []
    var allocation: AllocationResponse?
    var isLoading = false
    var error: Error?

    private let portfolioService: PortfolioService
    private let positionService: PositionService
    var positionStatus: PositionStatus?

    init(api: APIClient) {
        self.portfolioService = PortfolioService(api: api)
        self.positionService = PositionService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let s = portfolioService.summary()
            async let t = portfolioService.trend()
            async let p = portfolioService.byPlatform()
            async let a = portfolioService.allocation(dimension: "asset_class")
            async let pos = positionService.getBudget()
            summary = try await s
            trend = try await t
            platforms = try await p
            allocation = try await a
            positionStatus = try await pos
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
```

**Step 2: 编写 OverviewView.swift**

```swift
// 贾维斯为您服务
import SwiftUI
import Charts

struct OverviewView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: OverviewViewModel?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("组合概览")
        .task {
            if vm == nil { vm = OverviewViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: OverviewViewModel) -> some View {
        if vm.isLoading && vm.summary == nil { LoadingView() }
        else if let summary = vm.summary {
            ScrollView {
                VStack(spacing: 16) {
                    // 汇总卡片
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        SummaryCard(title: "总盈亏", value: Formatters.currency(summary.totalPnl), color: Color.pnlColor(summary.totalPnl))
                        SummaryCard(title: "收益率", value: Formatters.percent(summary.pnlPercent), color: Color.pnlColor(summary.pnlPercent))
                        SummaryCard(title: "总市值", value: Formatters.wan(summary.totalValue))
                        if let pos = vm.positionStatus {
                            SummaryCard(title: "仓位", value: Formatters.percent(pos.positionRatio))
                        }
                    }

                    // 走势图
                    portfolioTrendChart(vm.trend)

                    // 平台分布
                    if !vm.platforms.isEmpty {
                        platformSection(vm.platforms)
                    }

                    // 配置分析
                    if let alloc = vm.allocation, !alloc.items.isEmpty {
                        AllocationPieChart(items: alloc.items, title: "资产配置")
                    }
                }
                .padding()
            }
        }
    }

    private func portfolioTrendChart(_ trend: [PortfolioTrend]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("组合走势").font(.headline)
            if trend.isEmpty {
                Text("暂无数据").foregroundStyle(.secondary)
            } else {
                Chart(trend) { item in
                    LineMark(x: .value("日期", item.date), y: .value("市值", item.totalValue))
                        .foregroundStyle(Color.jade)
                    LineMark(x: .value("日期", item.date), y: .value("成本", item.totalCost))
                        .foregroundStyle(.secondary)
                }
                .frame(height: 200)
                .chartForegroundStyleScale(["市值": Color.jade, "成本": Color.secondary])
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func platformSection(_ platforms: [PlatformBreakdown]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("平台分布").font(.headline)
            ForEach(platforms) { p in
                HStack {
                    Text(p.platform).font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing) {
                        CurrencyText(value: p.marketValue, font: .subheadline)
                        Text("\(p.count) 只").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

**Step 3: 删除 OverviewView 临时占位，构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add portfolio overview with trend and allocation charts"
```

---

## Task 12: 仓位管理页

**Files:**
- Create: `ios/MosaicApp/ViewModels/PositionViewModel.swift`
- Create: `ios/MosaicApp/Views/Growth/PositionView.swift`（替换占位）
- Create: `ios/MosaicApp/Views/Growth/PositionGaugeView.swift`
- Create: `ios/MosaicApp/Views/Growth/StrategyView.swift`

**Step 1: 编写 PositionViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class PositionViewModel {
    var status: PositionStatus?
    var strategies: [StrategyInfo] = []
    var suggestion: StrategyResult?
    var changelog: [BudgetChangeLogEntry] = []
    var isLoading = false
    var error: Error?

    private let service: PositionService

    init(api: APIClient) {
        self.service = PositionService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let s = service.getBudget()
            async let st = service.strategies()
            status = try await s
            strategies = try await st
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func updateBudget(_ data: BudgetUpdateRequest) async {
        do {
            status = try await service.updateBudget(data)
        } catch { self.error = error }
    }

    func setActiveStrategy(name: String) async {
        do {
            status = try await service.setActiveStrategy(name: name)
        } catch { self.error = error }
    }

    func loadSuggestion() async {
        do {
            suggestion = try await service.suggestion()
        } catch { self.error = error }
    }

    func loadChangelog() async {
        do {
            changelog = try await service.changelog()
        } catch { self.error = error }
    }
}
```

**Step 2: 编写 PositionGaugeView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct PositionGaugeView: View {
    let ratio: Double     // 0-100
    let targetMin: Double // 0-100
    let targetMax: Double // 0-100

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // 背景轨道
                Circle()
                    .trim(from: 0, to: 0.75)
                    .stroke(.quaternary, lineWidth: 20)
                    .rotationEffect(.degrees(135))

                // 目标区间
                Circle()
                    .trim(from: targetMin / 100 * 0.75, to: targetMax / 100 * 0.75)
                    .stroke(Color.jade.opacity(0.3), lineWidth: 20)
                    .rotationEffect(.degrees(135))

                // 当前仓位
                Circle()
                    .trim(from: 0, to: min(ratio, 100) / 100 * 0.75)
                    .stroke(gaugeColor, style: StrokeStyle(lineWidth: 20, lineCap: .round))
                    .rotationEffect(.degrees(135))

                // 数值
                VStack(spacing: 4) {
                    Text(Formatters.percent(ratio))
                        .font(.title.bold())
                        .monospacedDigit()
                    Text("当前仓位")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 200, height: 200)

            // 目标区间标签
            HStack {
                Text("目标: \(Formatters.percent(targetMin)) - \(Formatters.percent(targetMax))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var gaugeColor: Color {
        if ratio < targetMin { return .blue }
        if ratio > targetMax { return .red }
        return .jade
    }
}
```

**Step 3: 编写 PositionView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct PositionView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: PositionViewModel?
    @State private var showBudgetSheet = false
    @State private var showSuggestion = false

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("仓位管理")
        .task {
            if vm == nil { vm = PositionViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: PositionViewModel) -> some View {
        if let status = vm.status {
            ScrollView {
                VStack(spacing: 16) {
                    // 仓位仪表盘
                    PositionGaugeView(
                        ratio: status.positionRatio,
                        targetMin: status.targetPositionMin,
                        targetMax: status.targetPositionMax
                    )

                    // 资金明细
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        SummaryCard(title: "总预算", value: Formatters.wan(status.totalBudget))
                        SummaryCard(title: "已投入", value: Formatters.wan(status.totalCost))
                        SummaryCard(title: "当前市值", value: Formatters.wan(status.totalValue))
                        SummaryCard(title: "可用资金", value: Formatters.wan(status.availableCash))
                    }

                    // 操作按钮
                    HStack(spacing: 12) {
                        Button {
                            showBudgetSheet = true
                        } label: {
                            Label("调整预算", systemImage: "slider.horizontal.3")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)

                        Button {
                            Task {
                                await vm.loadSuggestion()
                                showSuggestion = true
                            }
                        } label: {
                            Label("策略建议", systemImage: "lightbulb")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.jade)
                    }

                    // 策略选择
                    strategySection(vm)
                }
                .padding()
            }
        }
    }

    private func strategySection(_ vm: PositionViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("投资策略").font(.headline)
            ForEach(vm.strategies) { strategy in
                Button {
                    Task { await vm.setActiveStrategy(name: strategy.name) }
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(strategy.displayName).font(.subheadline.bold())
                            Text(strategy.description).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if vm.status?.activeStrategy == strategy.name {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.jade)
                        }
                    }
                    .padding()
                    .background(vm.status?.activeStrategy == strategy.name ? Color.jade.opacity(0.08) : Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            }
        }
    }
}
```

**Step 4: 编写 StrategyView.swift（策略建议弹窗内容）**

```swift
// 贾维斯为您服务
import SwiftUI

struct StrategyView: View {
    let result: StrategyResult

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(result.summary)
                        .font(.subheadline)
                }

                Section("建议操作") {
                    ForEach(result.suggestions) { item in
                        HStack {
                            Image(systemName: actionIcon(item.action))
                                .foregroundStyle(actionColor(item.action))
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.fundName).font(.subheadline.bold())
                                Text(item.reason).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text(item.action == "buy" ? "买入" : item.action == "sell" ? "卖出" : "持有")
                                    .font(.caption.bold())
                                    .foregroundStyle(actionColor(item.action))
                                if item.amount > 0 {
                                    CurrencyText(value: item.amount, font: .caption)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("策略建议")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func actionIcon(_ action: String) -> String {
        switch action {
        case "buy": return "arrow.down.circle.fill"
        case "sell": return "arrow.up.circle.fill"
        default: return "pause.circle.fill"
        }
    }

    private func actionColor(_ action: String) -> Color {
        switch action {
        case "buy": return .red     // 买入用红色（中国习惯）
        case "sell": return .green  // 卖出用绿色
        default: return .secondary
        }
    }
}
```

**Step 5: 删除 PositionView 临时占位，构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add position management with gauge and strategy"
```

---

## Task 13: 保险管理页

**Files:**
- Create: `ios/MosaicApp/ViewModels/InsuranceViewModel.swift`
- Create: `ios/MosaicApp/Views/Insurance/InsuranceListView.swift`（替换占位）
- Create: `ios/MosaicApp/Views/Insurance/InsuranceFormSheet.swift`

**Step 1: 编写 InsuranceViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class InsuranceViewModel {
    var items: [InsurancePolicy] = []
    var summary: InsuranceSummary?
    var isLoading = false
    var error: Error?

    private let service: InsuranceService

    init(api: APIClient) {
        self.service = InsuranceService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await service.list()
            items = result.items
            summary = result.summary
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func create(_ data: InsurancePolicyCreate) async {
        do {
            _ = try await service.create(data)
            await load()
        } catch { self.error = error }
    }

    func update(id: Int, _ data: InsurancePolicyUpdate) async {
        do {
            _ = try await service.update(id: id, data)
            await load()
        } catch { self.error = error }
    }

    func delete(id: Int) async {
        do {
            try await service.delete(id: id)
            await load()
        } catch { self.error = error }
    }

    func renew(id: Int) async {
        do {
            _ = try await service.renew(id: id)
            await load()
        } catch { self.error = error }
    }

    /// 按被保人分组
    var groupedByPerson: [(person: String, policies: [InsurancePolicy])] {
        let grouped = Dictionary(grouping: items, by: \.insuredPerson)
        return grouped.sorted { $0.key < $1.key }.map { (person: $0.key, policies: $0.value) }
    }
}
```

**Step 2: 编写 InsuranceListView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct InsuranceListView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: InsuranceViewModel?
    @State private var showForm = false
    @State private var editingPolicy: InsurancePolicy?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("保险")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showForm = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showForm) {
            InsuranceFormSheet(editing: nil) { data in Task { await vm?.create(data) } }
        }
        .sheet(item: $editingPolicy) { policy in
            InsuranceFormSheet(editing: policy) { data in
                // 将 Create 转为 Update（字段相同）
                let update = InsurancePolicyUpdate(
                    name: data.name, type: data.type, policyNumber: data.policyNumber,
                    insurer: data.insurer, insuredPerson: data.insuredPerson,
                    annualPremium: data.annualPremium, coverageAmount: data.coverageAmount,
                    coverageSummary: data.coverageSummary, startDate: data.startDate,
                    endDate: data.endDate, paymentYears: data.paymentYears,
                    nextPaymentDate: data.nextPaymentDate, status: data.status
                )
                Task { await vm?.update(id: policy.id, update) }
            }
        }
        .task {
            if vm == nil { vm = InsuranceViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: InsuranceViewModel) -> some View {
        if vm.items.isEmpty && !vm.isLoading {
            EmptyStateView(icon: "shield", title: "暂无保单")
        } else {
            List {
                // 汇总
                if let s = vm.summary {
                    Section {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            SummaryCard(title: "保单数", value: "\(s.activeCount)")
                            SummaryCard(title: "年缴保费", value: Formatters.currency(s.totalAnnualPremium))
                            SummaryCard(title: "覆盖人数", value: "\(s.coveredPersons)")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                // 按被保人分组
                ForEach(vm.groupedByPerson, id: \.person) { group in
                    Section(group.person) {
                        ForEach(group.policies) { policy in
                            policyRow(policy, vm: vm)
                        }
                    }
                }
            }
        }
    }

    private func policyRow(_ policy: InsurancePolicy, vm: InsuranceViewModel) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(policy.name).font(.subheadline.bold())
                Spacer()
                statusBadge(policy.status)
            }
            HStack(spacing: 12) {
                Label(typeLabel(policy.type), systemImage: typeIcon(policy.type))
                    .font(.caption)
                if !policy.insurer.isEmpty {
                    Text(policy.insurer).font(.caption).foregroundStyle(.secondary)
                }
            }
            HStack {
                Text("年缴 \(Formatters.currency(policy.annualPremium))").font(.caption)
                Spacer()
                if let next = policy.nextPaymentDate {
                    Text("下次缴费 \(next)").font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                Task { await vm.delete(id: policy.id) }
            } label: { Label("删除", systemImage: "trash") }
            Button { editingPolicy = policy } label: { Label("编辑", systemImage: "pencil") }.tint(.blue)
            Button {
                Task { await vm.renew(id: policy.id) }
            } label: { Label("续费", systemImage: "arrow.clockwise") }.tint(.green)
        }
    }

    private func statusBadge(_ status: String) -> some View {
        Text(status == "active" ? "有效" : status == "lapsed" ? "脱保" : "已终止")
            .font(.caption2.bold())
            .padding(.horizontal, 8).padding(.vertical, 2)
            .background(status == "active" ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
            .foregroundStyle(status == "active" ? .green : .red)
            .clipShape(Capsule())
    }

    private func typeLabel(_ type: String) -> String {
        switch type {
        case "critical_illness": return "重疾险"
        case "medical": return "医疗险"
        case "accident": return "意外险"
        case "life": return "寿险"
        default: return type
        }
    }

    private func typeIcon(_ type: String) -> String {
        switch type {
        case "critical_illness": return "heart.fill"
        case "medical": return "cross.case.fill"
        case "accident": return "bandage.fill"
        case "life": return "person.fill"
        default: return "shield.fill"
        }
    }
}
```

**Step 3: 编写 InsuranceFormSheet.swift**

```swift
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
```

**Step 4: 删除 InsuranceListView 临时占位，构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add insurance management grouped by insured person"
```

---

## Task 14: AI 诊断报告页

**Files:**
- Create: `ios/MosaicApp/ViewModels/DiagnosisViewModel.swift`
- Create: `ios/MosaicApp/Views/Diagnosis/DiagnosisView.swift`（替换占位）
- Modify: `ios/MosaicApp/ContentView.swift` — 替换 `DiagnosisPlaceholder`

**Step 1: 编写 DiagnosisViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DiagnosisViewModel {
    var report: DiagnosisResult?
    var isLoading = false
    var error: Error?
    var notFound = false

    private let service: DiagnosisService

    init(api: APIClient) {
        self.service = DiagnosisService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        notFound = false
        do {
            report = try await service.report()
        } catch let e as APIError {
            if case .serverError(404, _) = e {
                notFound = true
            } else {
                self.error = e
            }
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
```

**Step 2: 编写 DiagnosisView.swift**

诊断报告的 JSON 结构是灵活的，由外部 Claude skill 生成。iOS 端采用通用渲染策略：遍历顶层 key 展示 section，递归渲染嵌套内容。

```swift
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
        // snake_case -> 可读标题
        key.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
```

**Step 3: 替换 ContentView.swift 中 DiagnosisPlaceholder 为 DiagnosisView**

**Step 4: 构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add diagnosis report page with dynamic rendering"
```

---

## Task 15: 数据管理页

**Files:**
- Create: `ios/MosaicApp/ViewModels/DataManagementViewModel.swift`
- Create: `ios/MosaicApp/Views/DataManagement/DataManagementView.swift`（替换占位）
- Modify: `ios/MosaicApp/ContentView.swift` — 替换 `DataPlaceholder`

**Step 1: 编写 DataManagementViewModel.swift**

```swift
// 贾维斯为您服务
import Foundation
import Observation

@Observable
class DataManagementViewModel {
    var holdings: [HoldingResponse] = []
    var isLoading = false
    var error: Error?
    var refreshingCodes: Set<String> = []
    var refreshProgress: Double = 0
    var isRefreshingAll = false

    private let holdingsService: HoldingsService
    private let fundsService: FundsService

    init(api: APIClient) {
        self.holdingsService = HoldingsService(api: api)
        self.fundsService = FundsService(api: api)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            holdings = try await holdingsService.list()
        } catch {
            self.error = error
        }
        isLoading = false
    }

    func refreshFund(code: String) async {
        refreshingCodes.insert(code)
        do {
            _ = try await fundsService.refresh(code: code)
        } catch {
            self.error = error
        }
        refreshingCodes.remove(code)
        await load()
    }

    func refreshAll() async {
        isRefreshingAll = true
        refreshProgress = 0
        let codes = Array(Set(holdings.map(\.fundCode)))
        let total = Double(codes.count)

        // 并发 3 个
        await withTaskGroup(of: Void.self) { group in
            var index = 0
            for code in codes {
                group.addTask {
                    await self.refreshFund(code: code)
                }
                index += 1
                if index % 3 == 0 {
                    // 等待一批完成
                    for await _ in group.prefix(3) {}
                }
                refreshProgress = Double(index) / total
            }
            for await _ in group {}
        }

        refreshProgress = 1.0
        isRefreshingAll = false
        await load()
    }
}
```

**Step 2: 编写 DataManagementView.swift**

```swift
// 贾维斯为您服务
import SwiftUI

struct DataManagementView: View {
    @Environment(APIClient.self) private var api
    @State private var vm: DataManagementViewModel?

    var body: some View {
        Group {
            if let vm { content(vm) }
            else { LoadingView() }
        }
        .navigationTitle("数据管理")
        .task {
            if vm == nil { vm = DataManagementViewModel(api: api) }
            await vm?.load()
        }
        .refreshable { await vm?.load() }
    }

    @ViewBuilder
    private func content(_ vm: DataManagementViewModel) -> some View {
        List {
            // 刷新操作
            Section {
                Button {
                    Task { await vm.refreshAll() }
                } label: {
                    HStack {
                        Label("刷新全部基金数据", systemImage: "arrow.triangle.2.circlepath")
                        Spacer()
                        if vm.isRefreshingAll {
                            ProgressView()
                        }
                    }
                }
                .disabled(vm.isRefreshingAll)

                if vm.isRefreshingAll {
                    ProgressView(value: vm.refreshProgress)
                        .tint(.jade)
                }
            }

            // 基金列表
            Section("基金数据状态") {
                let uniqueFunds = uniqueFunds(from: vm.holdings)
                ForEach(uniqueFunds, id: \.fundCode) { h in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(h.fundName).font(.subheadline)
                            Text(h.fundCode).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            if let nav = h.latestNav {
                                Text(String(format: "%.4f", nav)).font(.subheadline).monospacedDigit()
                            }
                            if let date = h.latestNavDate {
                                Text(date).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        Button {
                            Task { await vm.refreshFund(code: h.fundCode) }
                        } label: {
                            if vm.refreshingCodes.contains(h.fundCode) {
                                ProgressView()
                            } else {
                                Image(systemName: "arrow.clockwise")
                            }
                        }
                        .buttonStyle(.borderless)
                        .disabled(vm.refreshingCodes.contains(h.fundCode))
                    }
                }
            }
        }
    }

    private func uniqueFunds(from holdings: [HoldingResponse]) -> [HoldingResponse] {
        var seen = Set<String>()
        return holdings.filter { seen.insert($0.fundCode).inserted }
    }
}
```

**Step 3: 替换 ContentView.swift 中 DataPlaceholder 为 DataManagementView**

**Step 4: 构建验证，提交**

```bash
git add -A && git commit -m "feat(ios): add data management with batch refresh"
```

---

## Task 16: 清理占位代码 + 最终集成验证

**Files:**
- Modify: `ios/MosaicApp/ContentView.swift` — 删除所有临时占位 struct

**Step 1: 清理 ContentView.swift**

删除所有 `Placeholder` struct 和 BucketsListView 中引用的临时占位 View。确认所有真实视图已经就位。

**Step 2: 完整构建验证**

Cmd+B 确认无编译错误。

**Step 3: 模拟器全流程验证**

Cmd+R 在模拟器上运行，逐一验证：

1. 首次启动显示服务器配置页
2. 输入服务器地址后进入主界面
3. Tab 1（总览）：总资产、四桶卡片、走势图、提醒
4. Tab 2（四笔钱）：
   - 活钱列表 + 添加/编辑/删除
   - 稳钱列表 + 到期状态
   - 长钱 → 组合概览 + 持仓明细 + 基金详情 + 仓位管理
   - 保险列表 + 按被保人分组 + 续费
5. Tab 3（诊断）：报告展示或空状态
6. Tab 4（数据）：基金列表 + 单个/批量刷新
7. Tab 5（设置）：服务器配置 + 测试连接

**Step 4: 最终提交**

```bash
git add -A && git commit -m "feat(ios): final cleanup and integration"
```

---

## 总结

| Task | 内容 | 关键产出 |
|------|------|----------|
| 1 | Xcode 项目搭建 | 目录结构 |
| 2 | 工具函数与主题 | Formatters, Colors, AppConfig |
| 3 | 数据模型 | 9 个 Model 文件，40+ Codable struct |
| 4 | 网络层 | APIClient + 10 个 Service |
| 5 | 共享 UI 组件 | 6 个可复用组件 |
| 6 | App 入口 + 导航 | TabView + Settings + 服务器配置 |
| 7 | Dashboard | 总览页 + 走势图 + 提醒 |
| 8 | 四笔钱入口 + 活钱 | BucketsListView + Liquid CRUD |
| 9 | 稳钱管理 | Stable CRUD + 到期状态 |
| 10 | 持仓 + 基金详情 | Holdings CRUD + FundDetail + 图表 |
| 11 | 组合概览 | 走势图 + 平台分布 + 配置分析 |
| 12 | 仓位管理 | 仪表盘 + 策略切换 + 策略建议 |
| 13 | 保险管理 | 按被保人分组 + 续费 |
| 14 | AI 诊断 | 动态 JSON 渲染 |
| 15 | 数据管理 | 单个/批量刷新 + 进度条 |
| 16 | 清理 + 集成验证 | 全流程验证 |

预计产出 **约 80 个 Swift 文件**，完整覆盖 Web 端全部 9 个页面 + 设置页的功能。
