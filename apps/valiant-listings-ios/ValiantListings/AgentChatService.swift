import Foundation

struct AgentChatMessage: Identifiable, Hashable {
    enum Role {
        case user
        case assistant
    }

    let id = UUID()
    let role: Role
    let text: String
}

struct AgentChatService {
    enum ServiceError: LocalizedError {
        case missingAPIKey
        case badResponse
        case emptyResponse
        case badStatus(Int, String)

        var errorDescription: String? {
            switch self {
            case .missingAPIKey:
                return "OpenAI API key is missing. Add OPENAI_API_KEY to the app environment or Info.plist."
            case .badResponse:
                return "The assistant service returned an invalid response."
            case .emptyResponse:
                return "The assistant returned an empty reply."
            case let .badStatus(code, body):
                return "Assistant request failed (\(code)): \(body)"
            }
        }
    }

    func reply(for messages: [AgentChatMessage], context: AgentContext) async throws -> String {
        guard let apiKey = AppConfig.openAIAPIKey, !apiKey.isEmpty else {
            throw ServiceError.missingAPIKey
        }

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let payload = ChatCompletionsRequest(
            model: AppConfig.openAIModel,
            messages: [
                ChatCompletionsMessage(role: "system", content: context.summary)
            ] + messages.map { message in
                ChatCompletionsMessage(
                    role: message.role == .user ? "user" : "assistant",
                    content: message.text
                )
            },
            temperature: 0.2
        )

        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ServiceError.badResponse
        }

        guard (200...299).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw ServiceError.badStatus(http.statusCode, body)
        }

        let decoded = try JSONDecoder().decode(ChatCompletionsResponse.self, from: data)
        guard let reply = decoded.choices.first?.message.content?.trimmingCharacters(in: .whitespacesAndNewlines), !reply.isEmpty else {
            throw ServiceError.emptyResponse
        }

        return reply
    }
}

private struct ChatCompletionsRequest: Encodable {
    let model: String
    let messages: [ChatCompletionsMessage]
    let temperature: Double
}

private struct ChatCompletionsMessage: Encodable {
    let role: String
    let content: String
}

private struct ChatCompletionsResponse: Decodable {
    let choices: [Choice]

    struct Choice: Decodable {
        let message: ChoiceMessage
    }

    struct ChoiceMessage: Decodable {
        let content: String?
    }
}
