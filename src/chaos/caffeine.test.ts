import { beforeEach, describe, expect, it } from 'vitest'
import { CRASH_MS, MAX_MS, WIRED_MS, caffeineLeft, caffeineState, coffeeRuns, extendCaffeine, resetCaffeine } from './caffeine'

// a minimal sessionStorage for the node test environment
const store = new Map<string, string>()
;(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) }, removeItem: (k: string) => { store.delete(k) }, clear: () => store.clear(), key: () => null, length: 0 }
;(globalThis as unknown as { window: unknown }).window = globalThis

describe('caffeine', () => {
  beforeEach(() => resetCaffeine())
  it('is wired for about 90 s after one run, then crashes, then is off', () => {
    const t0 = 1_000_000
    extendCaffeine(WIRED_MS, t0)
    expect(caffeineState(t0 + 1000)).toBe('wired')
    expect(caffeineState(t0 + WIRED_MS - 1)).toBe('wired')
    expect(caffeineState(t0 + WIRED_MS + 1)).toBe('crashed')
    expect(caffeineState(t0 + WIRED_MS + CRASH_MS + 1)).toBe('off')
  })
  it('adds time on each further run, capped at five minutes from now', () => {
    const t0 = 5_000_000
    for (let i = 0; i < 8; i++) extendCaffeine(WIRED_MS, t0)
    expect(caffeineLeft(t0)).toBe(MAX_MS)
    expect(coffeeRuns()).toBe(8)
  })
  it('counts runs for the whole visit', () => {
    extendCaffeine(WIRED_MS, 1); extendCaffeine(WIRED_MS, 2)
    expect(coffeeRuns()).toBe(2)
  })
})
