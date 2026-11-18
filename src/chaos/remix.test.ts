import { describe, expect, it } from 'vitest'
import { endsWithWord, makeRemixMap, REMIX_WORDS } from './remix'

const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }

describe('remix', () => {
  it('deals every word a different gag, and uses each gag exactly once', () => {
    for (let s = 1; s <= 200; s++) {
      const m = makeRemixMap(seeded(s))
      expect(Object.keys(m).sort()).toEqual([...REMIX_WORDS].sort())
      expect(Object.values(m).sort()).toEqual([...REMIX_WORDS].sort())
      for (const w of REMIX_WORDS) expect(m[w]).not.toBe(w)
    }
  })
  it('is different from one visit to the next', () => {
    const seen = new Set<string>()
    for (let s = 1; s <= 50; s++) seen.add(JSON.stringify(makeRemixMap(seeded(s))))
    expect(seen.size).toBeGreaterThan(10)
  })
  it('spots a hidden word at the end of what was typed', () => {
    expect(endsWithWord('xxcat')).toBe('cat')
    expect(endsWithWord('hello cookie')).toBe('cookie')
    expect(endsWithWord('catx')).toBeNull()
  })
})
