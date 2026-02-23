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
