import Foundation
import Observation

/// The single virtual clock that drives the live prompter — the interval timer the whole
/// live surface advances against. It does **not** play audio (the three music rules);
/// it's a transport over the class timeline that the prompter reads `elapsedMs` from.
///
/// Time is **anchored to the wall clock**, not accumulated per tick: while running,
/// `elapsed = banked + (now − anchor)`, so the timer can't drift over a 45-minute class
/// regardless of how often the display ticker fires (the web `LiveMode` banked-base
/// pattern). Seeking rebases the anchor to *now*, so a drag while playing doesn't re-add
/// the time already elapsed since play started. The transitions take an injected `now`
/// so the math is unit-testable without real time; the UI uses the `Date.now` defaults.
@MainActor
@Observable
final class LiveClock {
    /// Assembled class length; the timer caps here and auto-stops.
    let totalMs: Int

    /// Current position, published for the views. Updated on every transition and pumped
    /// by the display ticker while running.
    private(set) var elapsedMs: Int = 0
    private(set) var isRunning: Bool = false

    /// Position banked at the last pause/seek; `elapsedMs` grows from here while running.
    private var bankedMs: Int = 0
    /// Wall-clock instant the current running segment began; `nil` while paused.
    private var anchor: Date?
    /// Display pump — recomputes `elapsedMs` from the anchor ~10×/sec while running.
    @ObservationIgnored private var ticker: Timer?

    init(totalMs: Int) {
        self.totalMs = max(0, totalMs)
    }

    // MARK: - Pure position math (testable via injected `now`)

    /// The position the clock represents at `now`, clamped to `[0, totalMs]`.
    func position(at now: Date) -> Int {
        guard isRunning, let anchor else { return clamp(bankedMs) }
        let live = bankedMs + Int(now.timeIntervalSince(anchor) * 1000)
        return clamp(live)
    }

    private func clamp(_ ms: Int) -> Int { min(max(0, ms), totalMs) }

    // MARK: - Transport

    func toggle(now: Date = .now) {
        isRunning ? pause(now: now) : play(now: now)
    }

    /// Start running from the banked position. A no-op at the end of the class.
    func play(now: Date = .now) {
        guard !isRunning, bankedMs < totalMs else { return }
        anchor = now
        isRunning = true
        elapsedMs = clamp(bankedMs)
        startTicker()
    }

    /// Stop and bank the current position.
    func pause(now: Date = .now) {
        guard isRunning else { return }
        bankedMs = position(at: now)
        isRunning = false
        anchor = nil
        stopTicker()
        elapsedMs = bankedMs
    }

    /// Jump to `ms`. Keeps running if it was running, rebasing the anchor to `now` so the
    /// clock continues from the new position instead of snapping back.
    func seek(toMs ms: Int, now: Date = .now) {
        bankedMs = clamp(ms)
        if isRunning {
            if bankedMs >= totalMs {           // seeked to the very end → stop
                pause(now: now)
            } else {
                anchor = now
                elapsedMs = bankedMs
            }
        } else {
            elapsedMs = bankedMs
        }
    }

    /// Stop and return to the start.
    func reset(now: Date = .now) {
        isRunning = false
        anchor = nil
        bankedMs = 0
        elapsedMs = 0
        stopTicker()
    }

    /// Recompute `elapsedMs` from the anchor and auto-stop at the end. Exposed for the
    /// display ticker and for deterministic testing of the running→ended transition.
    func sync(now: Date = .now) {
        guard isRunning else { return }
        let pos = position(at: now)
        elapsedMs = pos
        if pos >= totalMs {
            pause(now: now)
        }
    }

    // MARK: - Display ticker

    private func startTicker() {
        stopTicker()
        // Weak self + self-invalidation: if the clock is gone, the next fire tears the
        // timer down (so no deinit cleanup is needed and the RunLoop stops retaining it).
        let timer = Timer(timeInterval: 0.1, repeats: true) { [weak self] timer in
            guard let self else { timer.invalidate(); return }
            MainActor.assumeIsolated { self.sync() }
        }
        RunLoop.main.add(timer, forMode: .common)
        ticker = timer
    }

    private func stopTicker() {
        ticker?.invalidate()
        ticker = nil
    }
}
