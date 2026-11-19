import { describe, expect, it } from 'vitest'
import { CODE_PREFIX, decodeIndices, encodeIndices, readSaveCode, saveCodeFor } from './progressCode'
import { ACH_BY_IDX, ACH_IDX, IDX_SPAN, RETIRED_IDX, SECRETS } from './secretsRegistry'

const all = SECRETS.map((s) => s.ach)

describe('save codes', () => {
  it('round-trips every subset shape, and an empty set', () => {
    for (const ids of [[], ['moon'], all, all.filter((_, i) => i % 2), ['everything'], ['moon', 'everything']]) {
      const r = readSaveCode(saveCodeFor(ids))
      expect(r.ok && r.ids.sort()).toEqual([...ids].sort())
      expect(r.ok && r.ignored).toBe(0)
    }
  })
  it('is short for the current registry: under 20 characters, with the IDRIS prefix', () => {
    const c = saveCodeFor(all)
    expect(c.startsWith(`${CODE_PREFIX}-`)).toBe(true)
    expect(c.length).toBeLessThan(20)
    expect(c).toMatch(/^IDRIS(-[0-9A-HJKMNP-TV-Z]{1,4})+$/)
  })
  it('has the same length for any set (it depends on the registry, not on what was found)', () => {
    expect(saveCodeFor([]).length).toBe(saveCodeFor(all).length)
  })
  it('is forgiving: spaces, lowercase, a missing prefix, odd separators, easily confused letters', () => {
    const ids = ['moon', 'coffee', 'cv']
    const c = saveCodeFor(ids)
    for (const variant of [c.toLowerCase(), c.replace(/-/g, ' '), c.replace('IDRIS-', ''), `  ${c}  `, c.replace(/-/g, ''), c.replace(/-/g, '_'), `"${c}".`, `idris ${c.slice(6).toLowerCase()}`]) {
      const r = readSaveCode(variant)
      expect(r.ok && r.ids.sort(), variant).toEqual([...ids].sort())
    }
    // Crockford reading: O is 0, I and L are 1
    const swapped = c.replace(/0/g, 'O').replace(/1/g, 'l')
    expect(readSaveCode(swapped).ok).toBe(true)
  })
  it('rejects a wrong checksum, a typo, a cut-off code and nonsense', () => {
    const c = saveCodeFor(['moon', 'roll', 'omae'])
    const body = c.replace('IDRIS-', '').replace(/-/g, '')
    const flip = (i: number) => body.slice(0, i) + (body[i] === '2' ? '3' : '2') + body.slice(i + 1)
    for (let i = 0; i < body.length; i++) expect(readSaveCode(flip(i)).ok, `char ${i}`).toBe(false) // any single changed character is caught
    expect(readSaveCode(c.slice(0, -1))).toMatchObject({ ok: false })
    expect(readSaveCode('IDRIS-ZZZZ-ZZZ')).toMatchObject({ ok: false, reason: 'checksum' })
    expect(readSaveCode('hello world!')).toMatchObject({ ok: false })
    expect(readSaveCode('IDRIS-UUUU-UUU')).toMatchObject({ ok: false, reason: 'format' }) // U is not in the alphabet
    expect(readSaveCode('')).toMatchObject({ ok: false, reason: 'empty' })
    expect(readSaveCode('IDRIS-')).toMatchObject({ ok: false, reason: 'empty' })
    expect(readSaveCode('A'.repeat(200))).toMatchObject({ ok: false, reason: 'format' })
  })
  it('grows with the registry without breaking old codes', () => {
    const idx = [0, 3, 22]
    const old = encodeIndices(idx, 23) // made when the registry had 23 indices
    const bigger = encodeIndices(idx, 60) // the same secrets, a much bigger registry
    expect(bigger.length).toBeGreaterThan(old.length)
    expect(decodeIndices(old)).toEqual({ ok: true, indices: idx }) // an old code still reads the same
    expect(decodeIndices(bigger)).toEqual({ ok: true, indices: idx })
    // the first characters never change as the registry grows
    const a = old.replace(/[-]/g, '').slice(5, 10), b = bigger.replace(/[-]/g, '').slice(5, 10)
    expect(a).toBe(b)
    // a newer code read by an older build: indices it does not know are counted, not applied
    const fromFuture = readSaveCode(encodeIndices([0, 40], 60))
    expect(fromFuture).toEqual({ ok: true, ids: [ACH_BY_IDX[0]], ignored: 1 })
  })
  it('stays under 20 characters up to 45 secrets, and grows by a group after that', () => {
    expect(encodeIndices([], 45).length).toBeLessThan(20)
    expect(encodeIndices([], 55).length).toBeGreaterThanOrEqual(20)
  })
})

describe('registry index numbers', () => {
  // The index of a secret is part of every save code ever handed out. This table pins them: an existing line must never change.
  // To add a secret, give it the next free number and add a line here. To remove one, add its number to RETIRED_IDX (never reuse it).
  const PINNED: Record<string, number> = {
    moon: 0, roll: 1, omae: 2, coffee: 3, letters: 4, sim: 5, finale: 6, rick: 7, moonup: 8, moon3: 9, crash: 10, evicted: 11,
    cena: 12, featured: 13, twin: 14, about: 15, cv: 16, legend: 17, idris: 18, cat: 19, cookie: 20, asked: 21, everything: 22,
  }
  it('never change for an existing secret', () => { for (const [a, i] of Object.entries(PINNED)) expect(ACH_IDX[a], a).toBe(i) })
  it('are unique non-negative integers and never reuse a retired number', () => {
    const idx = SECRETS.map((s) => s.idx)
    expect(new Set(idx).size).toBe(idx.length)
    for (const i of idx) { expect(Number.isInteger(i)).toBe(true); expect(i).toBeGreaterThanOrEqual(0); expect(RETIRED_IDX).not.toContain(i) }
    expect(IDX_SPAN).toBeGreaterThan(Math.max(...idx))
  })
  it('every secret is pinned above, so a new one is a conscious change', () => {
    for (const s of SECRETS) expect(PINNED, `${s.ach} needs a line in PINNED`).toHaveProperty(s.ach)
  })
})
