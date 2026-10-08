import ActivityKit
import WidgetKit
import SwiftUI

@main
struct FocusWidgetBundle: WidgetBundle {
    var body: some Widget { FocusWidget() }
}

struct FocusWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusAttributes.self) { context in
            LockCard(context: context)
                .activityBackgroundTint(Color(red: 0.09, green: 0.20, blue: 0.17))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "adhdkiller://focus"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("当前小时", systemImage: "scope").font(.caption)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("今日 \(context.state.completed)/\(context.state.total)").font(.caption)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.goal).font(.headline).lineLimit(1)
                        HStack {
                            Text(context.state.intent.isEmpty ? "回到当前目标" : context.state.intent).lineLimit(1)
                            Spacer()
                            Countdown(state: context.state).frame(maxWidth: 80)
                        }
                        Text(context.state.tasks.joined(separator: " · ")).font(.caption).lineLimit(1)
                    }
                }
            } compactLeading: {
                Image(systemName: "scope").foregroundStyle(.mint)
            } compactTrailing: {
                Countdown(state: context.state).font(.caption).frame(maxWidth: 60)
            } minimal: {
                Image(systemName: "scope")
            }
            .widgetURL(URL(string: "adhdkiller://focus"))
            .keylineTint(.mint)
        }
    }
}

struct Countdown: View {
    let state: FocusAttributes.ContentState
    var body: some View {
        if let start = state.intentStart, let end = state.intentEnd, end > start {
            Text(timerInterval: start...end, countsDown: true, showsHours: false)
                .monospacedDigit().foregroundStyle(.mint)
        } else { Text("—").foregroundStyle(.secondary) }
    }
}

struct LockCard: View {
    let context: ActivityViewContext<FocusAttributes>
    private var state: FocusAttributes.ContentState { context.state }
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Label("回到此刻", systemImage: "scope").font(.caption.bold())
                Spacer()
                Text(state.hourStart, style: .time)
                Text("–")
                Text(state.hourEnd, style: .time)
            }.font(.caption2).foregroundStyle(.mint)
            Text(state.goal.isEmpty ? "先选一件小事" : state.goal)
                .font(.headline).lineLimit(1)
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("临时意图").font(.caption2).foregroundStyle(.white.opacity(0.65))
                    Text(state.intent.isEmpty ? "暂无 · 专注当前目标" : state.intent).font(.caption).lineLimit(1)
                    if let start = state.intentStart, let end = state.intentEnd {
                        HStack(spacing: 2) { Text(start, style: .time); Text("–"); Text(end, style: .time) }
                            .font(.caption2).foregroundStyle(.white.opacity(0.7))
                        Countdown(state: state).font(.title3.bold()).frame(width: 90, alignment: .leading)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 3) {
                    Text("今日清单 · \(state.completed)/\(state.total)").font(.caption2).foregroundStyle(.white.opacity(0.65))
                    if state.tasks.isEmpty {
                        Text(state.total == 0 ? "还没有任务" : "今日任务已完成 ✓").font(.caption)
                    }
                    ForEach(Array(state.tasks.enumerated()), id: \.offset) { _, title in
                        Text("○ \(title)").font(.caption).lineLimit(1)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
            }
            Text(context.isStale ? "时间已到或目标时段已结束 · 点击 App 更新" : "点卡片管理目标与清单 · 倒计时到零停止")
                .font(.system(size: 9)).foregroundStyle(.white.opacity(0.55)).lineLimit(1)
        }.padding(.horizontal, 14).padding(.vertical, 10).foregroundStyle(.white)
    }
}
