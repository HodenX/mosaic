# iOS 客户端设计文档

**日期**: 2026-02-23
**状态**: 已确认

## 概述

为「知合 Mosaic」个人理财应用构建 iOS 原生客户端，实现与 Web 端完全对等的功能，包括家庭资产总览、四桶管理（活钱/稳钱/长钱/保险）、AI 诊断、数据管理等全部功能。

## 技术选型

| 项目 | 选择 | 说明 |
|---|---|---|
| UI 框架 | SwiftUI | iOS 17+ |
| 架构 | MVVM + @Observable | Swift 5.9 Observation 框架 |
| 网络 | URLSession + async/await | 零第三方依赖 |
| 图表 | Swift Charts | iOS 16+ 原生图表框架 |
| 依赖管理 | Swift Package Manager | 尽量零外部依赖 |
| 连接方式 | 局域网直连 → 后续扩展远程 | 先 IP:Port 直连 |

## 项目结构

```
ios/MosaicApp/
├── MosaicApp.swift                 # App 入口
├── ContentView.swift               # 根视图（TabView）
├── Config/
│   └── AppConfig.swift             # 服务器地址配置
├── Models/                         # Codable 数据模型
│   ├── Dashboard.swift
│   ├── Holding.swift
│   ├── Fund.swift
│   ├── Portfolio.swift
│   ├── Position.swift
│   ├── LiquidAsset.swift
│   ├── StableAsset.swift
│   ├── Insurance.swift
│   └── Diagnosis.swift
├── Services/                       # 网络层
│   ├── APIClient.swift             # URLSession 封装
│   ├── DashboardService.swift
│   ├── HoldingsService.swift
│   ├── FundsService.swift
│   ├── PortfolioService.swift
│   ├── PositionService.swift
│   ├── LiquidService.swift
│   ├── StableService.swift
│   ├── InsuranceService.swift
│   └── DiagnosisService.swift
├── ViewModels/                     # @Observable 视图模型
│   ├── DashboardViewModel.swift
│   ├── HoldingsViewModel.swift
│   ├── OverviewViewModel.swift
│   ├── PositionViewModel.swift
│   ├── LiquidViewModel.swift
│   ├── StableViewModel.swift
│   ├── InsuranceViewModel.swift
│   ├── FundDetailViewModel.swift
│   ├── DiagnosisViewModel.swift
│   └── DataManagementViewModel.swift
├── Views/
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── BucketSummaryCard.swift
│   │   ├── AssetTrendChart.swift
│   │   ├── AssetPieChart.swift
│   │   └── ReminderListView.swift
│   ├── Liquid/
│   │   ├── LiquidListView.swift
│   │   └── LiquidFormSheet.swift
│   ├── Stable/
│   │   ├── StableListView.swift
│   │   └── StableFormSheet.swift
│   ├── Growth/
│   │   ├── OverviewView.swift
│   │   ├── HoldingsListView.swift
│   │   ├── HoldingFormSheet.swift
│   │   ├── PositionView.swift
│   │   ├── PositionGaugeView.swift
│   │   └── StrategyView.swift
│   ├── Insurance/
│   │   ├── InsuranceListView.swift
│   │   └── InsuranceFormSheet.swift
│   ├── FundDetail/
│   │   ├── FundDetailView.swift
│   │   ├── NavHistoryChart.swift
│   │   └── AllocationPieChart.swift
│   ├── Diagnosis/
│   │   └── DiagnosisView.swift
│   ├── DataManagement/
│   │   └── DataManagementView.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── Shared/
│       ├── CurrencyText.swift
│       ├── PercentText.swift
│       ├── PnLText.swift
│       ├── EmptyStateView.swift
│       └── LoadingView.swift
├── Utilities/
│   ├── Formatters.swift
│   └── Colors.swift
└── Resources/
    └── Assets.xcassets
```

## 导航架构

采用 TabView 作为主导航（5 个 Tab），替代 Web 端侧边栏：

```
TabView
├── Tab 1: 总览 (house.fill)
│   └── DashboardView
│
├── Tab 2: 四笔钱 (wallet.fill)
│   └── NavigationStack
│       └── BucketListView (四桶卡片入口)
│           ├── → LiquidListView
│           ├── → StableListView
│           ├── → GrowthSectionView
│           │   ├── → OverviewView
│           │   ├── → HoldingsListView
│           │   └── → PositionView
│           └── → InsuranceListView
│
├── Tab 3: 诊断 (heart.text.square.fill)
│   └── DiagnosisView
│
├── Tab 4: 数据 (arrow.triangle.2.circlepath)
│   └── DataManagementView
│
└── Tab 5: 设置 (gearshape.fill)
    └── SettingsView
```

## Web → iOS 页面映射

| Web 路由 | iOS 视图 | 说明 |
|---|---|---|
| `/dashboard` | Tab 1: DashboardView | 总资产 + 四桶概览 + 走势图 + 提醒 |
| `/liquid` | Tab 2 → LiquidListView | 汇总卡 + 列表 + swipe 删除 + sheet 编辑 |
| `/stable` | Tab 2 → StableListView | 汇总卡 + 列表 + 到期状态 badge |
| `/growth/overview` | Tab 2 → OverviewView | 汇总卡 + 走势图 + 配置图表 |
| `/growth/holdings` | Tab 2 → HoldingsListView | 持仓列表 + 点击进入基金详情 |
| `/growth/position` | Tab 2 → PositionView | 仓位仪表盘 + 策略建议 |
| `/insurance` | Tab 2 → InsuranceListView | 按被保人分组 Section |
| `/diagnosis` | Tab 3: DiagnosisView | 诊断报告 |
| `/data` | Tab 4: DataManagementView | 基金数据刷新 |
| 基金详情面板 | NavigationLink → FundDetailView | push 到详情页 |

## 数据层设计

### Codable 模型

Swift 模型直接映射后端 JSON 响应。使用 `keyDecodingStrategy = .convertFromSnakeCase` 自动转换 snake_case → camelCase。

### APIClient

```swift
@Observable
class APIClient {
    var baseURL: URL    // UserDefaults 存储，设置页可修改

    func get<T: Decodable>(_ path: String) async throws -> T
    func post<T: Decodable>(_ path: String, body: Encodable?) async throws -> T
    func put<T: Decodable>(_ path: String, body: Encodable?) async throws -> T
    func delete(_ path: String) async throws
}
```

- 基于 URLSession + async/await
- 统一错误类型 `APIError`（网络/解码/服务端）
- 启动时 `GET /api/health` 检查连通性

### ViewModel 模式

```swift
@Observable
class DashboardViewModel {
    var summary: DashboardSummary?
    var reminders: [Reminder] = []
    var trend: [TotalAssetTrend] = []
    var isLoading = false
    var error: APIError?

    func loadData() async { ... }
    func loadTrend(days: Int) async { ... }
}
```

- 通过 SwiftUI Environment 注入 APIClient
- `.task {}` 触发首次加载
- `.refreshable {}` 支持下拉刷新
- `.alert()` 展示错误

## 交互模式适配

| Web 模式 | iOS 适配 |
|---|---|
| 右侧滑出面板（基金详情） | NavigationLink push |
| Dialog 弹窗（CRUD 表单） | `.sheet()` modal |
| AlertDialog（删除确认） | `.confirmationDialog()` |
| 表格行操作按钮 | `.swipeActions()` |
| 下拉刷新 | `.refreshable {}` |
| 进度条（批量刷新） | `ProgressView` |
| 深浅主题切换 | `.preferredColorScheme` + 跟随系统 |
| 可折叠面板 | `DisclosureGroup` |
| 保险公司搜索下拉 | `.searchable()` + List |

## 视觉设计

### 主题色

| 用途 | 颜色 |
|---|---|
| 主色调 | 翡翠绿（Jade） |
| 活钱桶 | 蓝色系 |
| 稳钱桶 | 绿色系 |
| 长钱桶 | 橙色系 |
| 保险桶 | 紫色系 |
| 盈利 | 绿色 |
| 亏损 | 红色 |

定义在 Assets.xcassets，自动支持 light/dark mode。

### 字体

- 金额数字：`.monospacedDigit()` 确保对齐
- 标题/正文：系统 SF Pro
- 大额数字：`.font(.title)` + `.bold()` + `.monospacedDigit()`

### 图表

全部使用 Swift Charts：
- `LineMark` + `AreaMark` → 走势图
- `SectorMark` → 饼图/环形图
- `BarMark` → 配置分析/平台分布

## API 端点清单

iOS 客户端需要对接的 40 个 REST API：

### Health Check
- `GET /api/health`

### Dashboard (4)
- `GET /api/dashboard/summary`
- `GET /api/dashboard/reminders`
- `GET /api/dashboard/trend?days=`
- `POST /api/dashboard/snapshot`

### Holdings (6)
- `GET /api/holdings`
- `POST /api/holdings`
- `PUT /api/holdings/{id}`
- `DELETE /api/holdings/{id}`
- `POST /api/holdings/{id}/update-snapshot`
- `GET /api/holdings/{id}/changelog`

### Funds (6)
- `GET /api/funds/{code}`
- `GET /api/funds/{code}/nav-history?start=&end=`
- `POST /api/funds/{code}/refresh`
- `GET /api/funds/{code}/allocation`
- `GET /api/funds/{code}/top-holdings`
- `PUT /api/funds/{code}/allocation`

### Portfolio (4)
- `GET /api/portfolio/summary`
- `GET /api/portfolio/by-platform`
- `GET /api/portfolio/allocation?dimension=`
- `GET /api/portfolio/trend?start=&end=`

### Position (7)
- `GET /api/position/budget`
- `PUT /api/position/budget`
- `GET /api/position/budget/changelog`
- `GET /api/position/strategies`
- `PUT /api/position/active-strategy`
- `GET /api/position/strategy-config/{name}`
- `PUT /api/position/strategy-config/{name}`
- `GET /api/position/suggestion`

### Liquid (4)
- `GET /api/liquid`
- `POST /api/liquid`
- `PUT /api/liquid/{id}`
- `DELETE /api/liquid/{id}`

### Stable (4)
- `GET /api/stable`
- `POST /api/stable`
- `PUT /api/stable/{id}`
- `DELETE /api/stable/{id}`

### Insurance (5)
- `GET /api/insurance`
- `POST /api/insurance`
- `PUT /api/insurance/{id}`
- `DELETE /api/insurance/{id}`
- `POST /api/insurance/{id}/renew`

### Diagnosis (1)
- `GET /api/diagnosis/report`

## 设置页功能

- 服务器地址：输入 IP:Port，带连通性测试按钮
- 外观模式：跟随系统 / 浅色 / 深色
- 关于：版本号、项目信息
