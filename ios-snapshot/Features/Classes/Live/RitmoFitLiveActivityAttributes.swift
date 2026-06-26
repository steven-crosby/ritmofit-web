import ActivityKit
import Foundation

/// Defines the data required for the Live Activity (Lock Screen & Dynamic Island).
/// This model must be compiled into both the main App and the Widget Extension.
public struct RitmoFitLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// The active track's title (e.g. "Titanium").
        public var trackTitle: String
        
        /// The next upcoming cue or current move instructions.
        public var cueText: String?
        
        /// The raw string for the current intensity (e.g., "mod", "hard", "all_out").
        /// Used by the widget to style the background or accent color.
        public var intensityRaw: String
        
        /// A timer range representing the timeline. Live Activities rely on 
        /// `Text(timerInterval:countsDown:)` to stay synced while the app is suspended.
        public var timerRange: ClosedRange<Date>?
        
        public init(trackTitle: String, cueText: String? = nil, intensityRaw: String, timerRange: ClosedRange<Date>? = nil) {
            self.trackTitle = trackTitle
            self.cueText = cueText
            self.intensityRaw = intensityRaw
            self.timerRange = timerRange
        }
    }

    /// The title of the class (e.g. "Mon POWER 6/8"). Static.
    public var classTitle: String
    
    public init(classTitle: String) {
        self.classTitle = classTitle
    }
}
