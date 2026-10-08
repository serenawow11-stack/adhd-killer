import SwiftUI

@main
struct ADHDKillerApp: App {
    @StateObject private var store = FocusStore()
    var body: some Scene {
        WindowGroup { ContentView().environmentObject(store) }
    }
}
