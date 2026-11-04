import { describe, expect, it } from 'vitest'
import { ACH_TOTAL, CORE_ACH, SECRETS, lastLeft, nextToHint } from './secretsRegistry'
import { SRC, read, walk } from '../test/fs'

const ach = SECRETS.map((s) => s.ach)

describe('secrets registry', () => {
  it('has unique ids and achievement ids', () => {
    expect(new Set(SECRETS.map((s) => s.id)).size).toBe(SECRETS.length)
    expect(new Set(ach).size).toBe(ach.length)
    expect(ACH_TOTAL).toBe(SECRETS.length)
  })
  it('gives every achievement three hint tiers, a name and a solved line in both languages', () => {
    for (const s of SECRETS) {
      expect(s.hints, s.id).toHaveLength(3)
      for (const l of [...s.hints, s.name, s.solved]) { expect(l.en.length, s.id).toBeGreaterThan(3); expect(l.ja.length, s.id).toBeGreaterThan(1) }
      expect(s.trigger.text.length, s.id).toBeGreaterThan(5)
    }
  })
  it('covers every award() call in the source, so no achievement is missing hints', () => {
    const used = new Set<string>()
    for (const file of walk(SRC)) {
      if (!/\.tsx?$/.test(file) || /\.test\./.test(file)) continue
      for (const m of read(file).matchAll(/award\('([a-z0-9]+)'\)/g)) used.add(m[1])
    }
    for (const a of used) expect(ach, `award('${a}') has no registry entry`).toContain(a)
  })
  it('the original four secrets open the ending, and the typed ones can be run for the visitor', () => {
    expect(CORE_ACH.sort()).toEqual(['coffee', 'moon', 'omae', 'roll'])
    for (const s of SECRETS) if (s.trigger.kind === 'word') expect(s.word, s.id).toBeTruthy()
  })
  it('hints puzzles before meta entries, and finds the one left for the final clip', () => {
    expect(nextToHint([])?.meta).toBeFalsy()
    const all = ach.filter((a) => a !== 'cv')
    expect(lastLeft(all)?.ach).toBe('cv')
    expect(lastLeft(ach.filter((a) => a !== 'cv' && a !== 'asked'))?.ach).toBe('cv') // the clip reward never counts as "left"
    expect(lastLeft([])).toBeUndefined()
  })
})
