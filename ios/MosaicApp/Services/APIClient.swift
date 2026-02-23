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
