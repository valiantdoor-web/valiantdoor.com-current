import SwiftUI

struct ContentView: View {
    @State private var reloadToken = UUID()
    @State private var isLoading = true
    @State private var currentURL = AppConfig.listingsURL
    @State private var pageTitle = AppConfig.appName
    @State private var errorMessage: String?
    @State private var isShowingAgent = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                ListingsWebView(
                    url: AppConfig.listingsURL,
                    reloadToken: reloadToken,
                    isLoading: $isLoading,
                    currentURL: $currentURL,
                    pageTitle: $pageTitle,
                    errorMessage: $errorMessage
                )
                .ignoresSafeArea(edges: .bottom)

                if isLoading {
                    ProgressView()
                        .padding(12)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.top, 12)
                }
            }
            .navigationTitle(pageTitle.isEmpty ? AppConfig.appName : pageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        reloadToken = UUID()
                    } label: {
                        Label("Reload", systemImage: "arrow.clockwise")
                    }
                    .accessibilityIdentifier("reloadListings")

                    ShareLink(item: currentURL) {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                    .accessibilityIdentifier("shareListings")

                    Button {
                        isShowingAgent = true
                    } label: {
                        Label("Agent", systemImage: "sparkles")
                    }
                    .accessibilityIdentifier("openAgent")
                }
            }
            .safeAreaInset(edge: .bottom) {
                BottomStatusBar(currentURL: currentURL, errorMessage: errorMessage)
            }
            .sheet(isPresented: $isShowingAgent) {
                AgentView(
                    context: AgentContext(
                        pageTitle: pageTitle.isEmpty ? AppConfig.appName : pageTitle,
                        pageURL: currentURL
                    )
                )
            }
        }
    }
}

private struct BottomStatusBar: View {
    let currentURL: URL
    let errorMessage: String?

    var body: some View {
        VStack(spacing: 6) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(spacing: 10) {
                Image(systemName: "lock.shield")
                    .foregroundStyle(.yellow)
                Text(currentURL.host() ?? "valiantdoor.com")
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                Spacer()
                Text("Private admin")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }
}

#Preview {
    ContentView()
}
