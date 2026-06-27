import SwiftUI

struct AgentView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: AgentViewModel

    init(context: AgentContext) {
        _viewModel = StateObject(wrappedValue: AgentViewModel(context: context))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .onChange(of: viewModel.messages.count) { _, _ in
                        guard let lastID = viewModel.messages.last?.id else { return }
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(lastID, anchor: .bottom)
                        }
                    }
                }

                composer
            }
            .navigationTitle("Valiant Agent")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.reset()
                    } label: {
                        Image(systemName: "trash")
                    }
                    .accessibilityLabel("Reset chat")
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Built for listings, SEO, and site changes", systemImage: "sparkles")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            Text(viewModel.context.pageTitle)
                .font(.headline)
                .lineLimit(2)

            Text(viewModel.context.pageURL.absoluteString)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(.ultraThinMaterial)
    }

    private var composer: some View {
        VStack(spacing: 10) {
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField("Ask the agent", text: $viewModel.draft, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)

                Button {
                    Task { await viewModel.send() }
                } label: {
                    if viewModel.isSending {
                        ProgressView()
                            .frame(width: 28, height: 28)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 28))
                    }
                }
                .disabled(viewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
            }

            HStack(spacing: 8) {
                ForEach(viewModel.quickPrompts, id: \.self) { prompt in
                    Button(prompt) {
                        viewModel.draft = prompt
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(.ultraThinMaterial)
    }
}

private struct MessageBubble: View {
    let message: AgentChatMessage

    var body: some View {
        HStack {
            if message.role == .assistant {
                bubble
                Spacer(minLength: 40)
            } else {
                Spacer(minLength: 40)
                bubble
            }
        }
    }

    private var bubble: some View {
        Text(message.text)
            .font(.body)
            .foregroundStyle(message.role == .user ? .white : .primary)
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .background(message.role == .user ? Color.accentColor : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .frame(maxWidth: 320, alignment: message.role == .user ? .trailing : .leading)
    }
}

@MainActor
final class AgentViewModel: ObservableObject {
    @Published var messages: [AgentChatMessage]
    @Published var draft = ""
    @Published var isSending = false
    @Published var errorMessage: String?

    let context: AgentContext
    let quickPrompts = [
        "What should I improve on this page?",
        "Summarize the current admin page.",
        "Suggest a better conversion CTA."
    ]

    private let service = AgentChatService()

    init(context: AgentContext) {
        self.context = context
        self.messages = [
            AgentChatMessage(
                role: .assistant,
                text: "I’m your Valiant Agent. Ask me about listings, SEO, conversion tracking, or what to change on the current page."
            )
        ]
    }

    func reset() {
        messages = [
            AgentChatMessage(
                role: .assistant,
                text: "I’m your Valiant Agent. Ask me about listings, SEO, conversion tracking, or what to change on the current page."
            )
        ]
        draft = ""
        errorMessage = nil
    }

    func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }

        draft = ""
        errorMessage = nil
        messages.append(AgentChatMessage(role: .user, text: text))
        isSending = true

        do {
            let reply = try await service.reply(for: messages, context: context)
            messages.append(AgentChatMessage(role: .assistant, text: reply))
        } catch {
            errorMessage = error.localizedDescription
        }

        isSending = false
    }
}
