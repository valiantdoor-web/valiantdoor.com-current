import Foundation

struct AppConfig {
    static let appName = "Valiant Listings"
    static let listingsURL = URL(string: "https://www.valiantdoor.com/listings-admin")!
    static let openAIModel = ProcessInfo.processInfo.environment["OPENAI_MODEL"].flatMap { $0.isEmpty ? nil : $0 } ?? "gpt-4o-mini"
    static let allowedHosts: Set<String> = [
        "www.valiantdoor.com",
        "valiantdoor.com"
    ]

    static var openAIAPIKey: String? {
        let environmentKey = ProcessInfo.processInfo.environment["OPENAI_API_KEY"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let environmentKey, !environmentKey.isEmpty {
            return environmentKey
        }

        if let plistKey = Bundle.main.object(forInfoDictionaryKey: "OpenAIAPIKey") as? String {
            let trimmed = plistKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }

        return nil
    }
}
