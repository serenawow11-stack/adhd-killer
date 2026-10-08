import SwiftUI
import Combine

struct ContentView: View {
    @EnvironmentObject private var store: FocusStore
    @Environment(\.scenePhase) private var phase
    @State private var goal = ""
    @State private var intent = ""
    @State private var minutes = 5
    @State private var taskTitle = ""
    @State private var loadedHour = ""
    private let pulse = Timer.publish(every: 30, on: .main, in: .common).autoconnect()
    private let green = Color(red: 0.14, green: 0.30, blue: 0.26)

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("只做眼前这一件。")
                        .font(.title2.bold()).foregroundStyle(green)
                    Text("目标、临时意图和今日清单，一起带到锁屏。")
                        .font(.subheadline).foregroundStyle(.secondary)
                    Button(store.active ? "同步锁屏看板" : "开启锁屏看板") {
                        saveGoal()
                        Task { await store.publish(startIfNeeded: true) }
                    }.disabled(store.busy)
                    if store.active {
                        Button("结束锁屏显示", role: .destructive) { Task { await store.end() } }
                            .disabled(store.busy)
                    }
                    if !store.message.isEmpty { Text(store.message).font(.footnote) }
                }
                Section("01 · 当前小时的目标") {
                    TimelineView(.periodic(from: .now, by: 60)) { context in
                        let interval = Calendar.current.dateInterval(of: .hour, for: context.date)!
                        Text("\(interval.start.formatted(date: .omitted, time: .shortened)) – \(interval.end.formatted(date: .omitted, time: .shortened))")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    TextField("这个小时，只想完成什么？", text: $goal, axis: .vertical)
                        .lineLimit(1...3).onChange(of: goal) { _, value in
                            store.plan.goals[loadedHour] = String(value.prefix(60)); store.save()
                        }
                    Button("保存目标并同步") { saveGoal(); Task { await store.publish() } }
                        .disabled(store.busy)
                }
                Section("02 · 临时意图") {
                    TextField("例如：点外卖、查一个信息", text: $intent)
                    Stepper("计划用时 \(minutes) 分钟", value: $minutes, in: 1...120)
                    Button("开始意图并显示到锁屏") {
                        let now = Date()
                        store.plan.intent = String(intent.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40))
                        store.plan.intentStart = now
                        store.plan.intentEnd = now.addingTimeInterval(Double(minutes) * 60)
                        saveGoal()
                        Task { await store.publish(startIfNeeded: true) }
                    }.disabled(intent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.busy)
                    if let start = store.plan.intentStart, let end = store.plan.intentEnd {
                        Text(store.plan.intent).font(.headline)
                        Text("\(start.formatted(date: .omitted, time: .shortened)) → \(end.formatted(date: .omitted, time: .shortened))")
                            .font(.caption)
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            if context.date >= end { Text("时间到了，回到目标或再延长一点。").foregroundStyle(.orange) }
                            else { Text(timerInterval: start...end, countsDown: true).monospacedDigit() }
                        }
                        HStack {
                            Button("完成意图") {
                                store.plan.intent = ""; store.plan.intentStart = nil; store.plan.intentEnd = nil
                                store.save(); Task { await store.publish() }
                            }
                            Spacer()
                            Button("延长 2 分钟") {
                                store.plan.intentEnd = max(Date(), end).addingTimeInterval(120)
                                store.save(); Task { await store.publish() }
                            }
                        }.buttonStyle(.borderless).disabled(store.busy)
                    }
                }
                Section("03 · 今日清单（\(store.today.filter(\.done).count)/\(store.today.count)）") {
                    HStack {
                        TextField("添加一件小事", text: $taskTitle).onSubmit(addTodo)
                        Button(action: addTodo) { Image(systemName: "plus.circle.fill") }
                            .disabled(taskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.busy)
                    }
                    ForEach(store.today) { todo in
                        Button {
                            if let i = store.plan.todos.firstIndex(where: { $0.id == todo.id }) {
                                store.plan.todos[i].done.toggle(); store.save()
                                Task { await store.publish() }
                            }
                        } label: {
                            Label(todo.title, systemImage: todo.done ? "checkmark.circle.fill" : "circle")
                                .strikethrough(todo.done).foregroundStyle(todo.done ? .secondary : .primary)
                        }.disabled(store.busy)
                    }.onDelete { offsets in
                        let ids = offsets.map { store.today[$0].id }
                        store.plan.todos.removeAll { ids.contains($0.id) }; store.save()
                        Task { await store.publish() }
                    }
                    Text("锁屏展示进度及最多 3 项未完成任务；点卡片回这里管理完整清单。")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section("使用说明") {
                    Text("锁屏倒计时由系统显示，到零停止；本版没有到时声音提醒。修改后请同步。App 在前台会更新小时，后台不会自动换目标。跨小时后请打开 App 同步。实时活动可能被系统结束或被划掉，可重新开启。")
                    Text("数据仅在本机保存，与网页版暂不互通。昨日任务保留在本地但不计入今日清单。")
                }.font(.footnote).foregroundStyle(.secondary)
            }
            .tint(green).navigationTitle("回到此刻")
            .task { loadHour(); intent = store.plan.intent; await store.publish() }
            .onChange(of: phase) { _, next in
                if next == .active { loadHour(); store.refreshStatus(); Task { await store.publish() } }
            }
            .onReceive(pulse) { _ in
                if phase == .active && loadedHour != FocusStore.hourKey() {
                    loadHour(); Task { await store.publish() }
                }
            }
        }
    }
    private func loadHour() {
        loadedHour = FocusStore.hourKey()
        goal = store.plan.goals[loadedHour] ?? ""
    }
    private func saveGoal() {
        store.plan.goals[loadedHour] = String(goal.trimmingCharacters(in: .whitespacesAndNewlines).prefix(60))
        store.save()
    }
    private func addTodo() {
        let title = taskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !store.busy else { return }
        store.plan.todos.append(Todo(title: String(title.prefix(80)), day: FocusStore.day()))
        taskTitle = ""; store.save(); Task { await store.publish() }
    }
}
