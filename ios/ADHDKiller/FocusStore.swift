import SwiftUI
import ActivityKit

struct Todo: Identifiable, Codable {
    var id = UUID()
    var title: String
    var done = false
    var day: String
}
struct SavedPlan: Codable {
    var goals: [String: String] = [:]
    var todos: [Todo] = []
    var intent = ""
    var intentStart: Date?
    var intentEnd: Date?
}

@MainActor
final class FocusStore: ObservableObject {
    @Published var plan: SavedPlan
    @Published var message = ""
    @Published var busy = false
    @Published var active = false
    private let key = "native-focus-plan-v1"

    init() {
        if let data = UserDefaults.standard.data(forKey: key),
           let decoded = try? JSONDecoder().decode(SavedPlan.self, from: data) {
            plan = decoded
        } else { plan = SavedPlan() }
        refreshStatus()
    }
    static func day(_ date: Date = Date()) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func hourKey(_ date: Date = Date()) -> String {
        "\(day(date))-\(Calendar.current.component(.hour, from: date))"
    }
    var today: [Todo] { plan.todos.filter { $0.day == Self.day() } }
    func refreshStatus() {
        active = Activity<FocusAttributes>.activities.contains { $0.activityState == .active || $0.activityState == .stale }
    }
    func save() {
        do { UserDefaults.standard.set(try JSONEncoder().encode(plan), forKey: key) }
        catch { message = "保存失败：\(error.localizedDescription)" }
    }
    func snapshot() -> FocusAttributes.ContentState {
        let now = Date()
        let hour = Calendar.current.dateInterval(of: .hour, for: now)!
        return .init(goal: String((plan.goals[Self.hourKey()] ?? "先选一件小事").prefix(60)),
                     hourStart: hour.start, hourEnd: hour.end,
                     intent: String(plan.intent.prefix(40)), intentStart: plan.intentStart,
                     intentEnd: plan.intentEnd,
                     tasks: Array(today.filter { !$0.done }.prefix(3).map { String($0.title.prefix(35)) }),
                     completed: today.filter(\.done).count, total: today.count)
    }
    func publish(startIfNeeded: Bool = false) async {
        guard !busy else { return }
        busy = true; defer { busy = false; refreshStatus() }
        save()
        let state = snapshot()
        // Stale marks a snapshot that needs attention, not a scheduled background update.
        let futureEnd = state.intentEnd.flatMap { $0 > Date() ? $0 : nil }
        let stale = min(state.hourEnd, futureEnd ?? state.hourEnd)
        let content = ActivityContent(state: state, staleDate: stale)
        let activities = Activity<FocusAttributes>.activities.filter { $0.activityState == .active || $0.activityState == .stale }
        if let first = activities.first {
            await first.update(content)
            for extra in activities.dropFirst() { await extra.end(nil, dismissalPolicy: .immediate) }
            message = "已同步到锁屏"
        } else if startIfNeeded {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                message = "请在 iPhone 设置中允许本 App 的实时活动。"; return
            }
            do {
                _ = try Activity.request(attributes: FocusAttributes(), content: content, pushType: nil)
                message = "已开启。现在锁屏即可查看。"
            } catch { message = "无法开启实时活动：\(error.localizedDescription)" }
        }
    }
    func end() async {
        guard !busy else { return }
        busy = true; defer { busy = false; refreshStatus() }
        for activity in Activity<FocusAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        message = "锁屏看板已结束，任务仍保存在手机上。"
    }
}
