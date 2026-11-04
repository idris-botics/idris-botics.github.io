import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_MS, MAX_EVENTS, REPEAT_MIN_MS, createActiveClock, newInterval, repeatDue } from './activeTime'

describe('active-time clock (fake timers)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
  afterEach(() => vi.useRealTimers())

  it('counts time while the visitor is around and active', () => {
    const c = createActiveClock()
    for (let i = 0; i < 10; i++) { vi.advanceTimersByTime(5000); c.touch() }
    expect(c.activeMs()).toBe(50_000)
  })
  it('stops counting 20 s after the last input', () => {
    const c = createActiveClock()
    c.touch()
    vi.advanceTimersByTime(60_000)
    expect(c.activeMs()).toBe(IDLE_MS)
    c.touch(); vi.advanceTimersByTime(5000)
    expect(c.activeMs()).toBe(IDLE_MS + 5000)
  })
  it('pauses while the tab is hidden or the window is blurred', () => {
    const c = createActiveClock()
    vi.advanceTimersByTime(4000); c.touch()
    c.setVisible(false); vi.advanceTimersByTime(15_000); c.touch()
    c.setVisible(true); vi.advanceTimersByTime(3000)
    expect(c.activeMs()).toBe(4000 + 3000)
    c.touch(); c.setFocused(false); vi.advanceTimersByTime(10_000); c.setFocused(true)
    expect(c.activeMs()).toBe(7000)
  })
  it('a repeat event is due after 3 to 5 minutes of ACTIVE time, never while busy, and at most 4 per visit', () => {
    expect(newInterval(() => 0)).toBe(REPEAT_MIN_MS)
    expect(newInterval(() => 1)).toBe(REPEAT_MIN_MS + 120_000)
    const st = { count: 1, lastAt: 0, interval: 200_000 }
    expect(repeatDue(st, 199_999, false)).toBe(false)
    expect(repeatDue(st, 200_000, false)).toBe(true)
    expect(repeatDue(st, 300_000, true)).toBe(false) // a project window, a video or another event is open
    expect(repeatDue({ ...st, count: MAX_EVENTS }, 900_000, false)).toBe(false)
  })
})
