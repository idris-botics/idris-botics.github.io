import { useSyncExternalStore } from 'react'

// After a coffee run the pet robot is CAFFEINATED for about 30 seconds (each further run adds 30 s, capped at 90 s from now),
// then the coffee wears off: it crashes for a few seconds and is itself again. The deadline is kept in sessionStorage, so a visit remembers it:
// leaving Chaos and coming back, or typing coffee again, does not start the whole show from zero.
export type CaffeineState = 'off' | 'wired' | 'crashed'
const KEY = 'caffeine'
export const WIRED_MS = 30_000, MAX_MS = 90_000, CRASH_MS = 8_000

type Saved = { until: number; runs: number }
const load = (): Saved => { try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Saved | null; if (s && typeof s.until === 'number' && typeof s.runs === 'number') return s } catch { /* ignore */ } return { until: 0, runs: 0 } }
let saved = load()
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* ignore */ } }
const listeners = new Set<() => void>()
let timer = 0

export function caffeineState(now = Date.now()): CaffeineState {
  if (now < saved.until) return 'wired'
  if (saved.until && now < saved.until + CRASH_MS) return 'crashed'
  return 'off'
}
function tick() {
  clearTimeout(timer)
  const now = Date.now(), s = caffeineState(now)
  listeners.forEach((f) => f())
  const next = s === 'wired' ? saved.until - now : s === 'crashed' ? saved.until + CRASH_MS - now : 0
  if (next > 0) timer = window.setTimeout(tick, next + 20)
}
/** A coffee run: adds `ms`, never more than MAX_MS from now. Returns how many runs there have been this visit. */
export function extendCaffeine(ms = WIRED_MS, now = Date.now()): number {
  saved = { until: Math.min(now + MAX_MS, Math.max(now, saved.until) + ms), runs: saved.runs + 1 }
  save(); tick()
  return saved.runs
}
export const coffeeRuns = () => saved.runs
/** Milliseconds of caffeine left (0 when not wired). */
export const caffeineLeft = (now = Date.now()) => Math.max(0, saved.until - now)
/** For tests: forget everything. */
export function resetCaffeine() { saved = { until: 0, runs: 0 }; save(); tick() }
/** Re-arm the wear-off timer after a page load (the deadline is remembered). */
export const resumeCaffeine = () => tick()

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export const useCaffeine = (): CaffeineState => useSyncExternalStore(subscribe, () => caffeineState())
