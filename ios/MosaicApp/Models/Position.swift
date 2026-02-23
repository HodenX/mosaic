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
