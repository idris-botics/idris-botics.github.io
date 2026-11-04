// "Active time": how long the visitor has really been here. It only counts while the tab is visible, the window has focus,
// and there has been some input (mouse, touch, key, scroll) in the last IDLE_MS. Used to space out repeat events.
export const IDLE_MS = 20_000
export const REPEAT_MIN_MS = 360_000, REPEAT_SPAN_MS = 240_000 // a repeat comes 6 to 10 minutes of active time after the last event
export const MAX_EVENTS = 6

export type ActiveClock = {
  /** Active milliseconds so far. */
  activeMs: () => number
  /** The visitor did something. */
  touch: () => void
  setVisible: (v: boolean) => void
  setFocused: (f: boolean) => void
}

export function createActiveClock(now: () => number = Date.now, idleMs = IDLE_MS): ActiveClock {
  let total = 0, last = now(), lastInput = now(), visible = true, focused = true
  // add the time since the last sample, but only up to the moment the visitor went idle
  const sample = () => {
    const t = now()
    if (visible && focused) total += Math.max(0, Math.min(t, lastInput + idleMs) - last)
    last = t
  }
  return {
    activeMs: () => { sample(); return total },
    touch: () => { sample(); lastInput = now() },
    setVisible: (v) => { sample(); visible = v },
    setFocused: (f) => { sample(); focused = f },
  }
}

/** Connects a clock to the page: visibility, focus and input events. Returns the clock and a function that removes the listeners. */
export function watchPage(): { clock: ActiveClock; stop: () => void } {
  const clock = createActiveClock()
  const touch = () => clock.touch()
  const vis = () => clock.setVisible(!document.hidden)
  const focus = () => clock.setFocused(true), blur = () => clock.setFocused(false)
  const evs = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
  evs.forEach((e) => addEventListener(e, touch, { passive: true }))
  document.addEventListener('visibilitychange', vis)
  addEventListener('focus', focus); addEventListener('blur', blur)
  vis(); clock.setFocused(document.hasFocus())
  return { clock, stop: () => { evs.forEach((e) => removeEventListener(e, touch)); document.removeEventListener('visibilitychange', vis); removeEventListener('focus', focus); removeEventListener('blur', blur) } }
}

export type RepeatState = { count: number; lastAt: number; interval: number }
export const newInterval = (rand = Math.random) => REPEAT_MIN_MS + rand() * REPEAT_SPAN_MS
/** Is a repeat event due? `busy` is true while a project window, a video or another event is open. */
export const repeatDue = (st: RepeatState, activeMs: number, busy: boolean) => !busy && st.count < MAX_EVENTS && activeMs - st.lastAt >= st.interval
