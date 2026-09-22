import ActivityKit
import Foundation

struct FocusAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var goal: String
        var hourStart: Date
        var hourEnd: Date
        var intent: String
        var intentStart: Date?
        var intentEnd: Date?
        var tasks: [String]
        var completed: Int
        var total: Int
    }
    var name: String = "回到此刻"
}
