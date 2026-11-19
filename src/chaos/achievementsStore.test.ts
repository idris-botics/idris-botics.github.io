import { beforeEach, describe, expect, it } from 'vitest'
import { COOKIE_NAME, PROGRESS_KEY, SCHEMA, foundEntry, foundIds, mergeFound, migrate, recordAchievement, reloadProgress, resetProgress, subscribeProgress } from './achievementsStore'
import { ACH_TOTAL, SECRETS } from './secretsRegistry'

const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }
}
// a tiny cookie jar: it understands name=value and Max-Age=0 (delete), which is all the store uses
const jar = () => {
  const c = new Map<string, string>()
  const o = { writes: [] as string[] }
  return Object.defineProperties(o, {
    cookie: {
      get: () => [...c].map(([k, v]) => `${k}=${v}`).join('; '),
      set: (s: string) => { o.writes.push(s); const [kv, ...attrs] = s.split('; '); const [k, v] = [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]; if (attrs.includes('Max-Age=0')) c.delete(k); else c.set(k, v) },
    },
  }) as { writes: string[]; cookie: string }
}
const g = globalThis as unknown as { sessionStorage: ReturnType<typeof mem>; localStorage: ReturnType<typeof mem>; document: ReturnType<typeof jar> }
const OLD = ['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted']

beforeEach(() => { g.sessionStorage = mem(); g.localStorage = mem(); g.document = jar(); reloadProgress(); resetProgress(); g.localStorage = mem(); g.document = jar() })

describe('migrate (old formats become the current one)', () => {
  it('reads an old-format state: a bare list of ids, and the old { v, list, keep } hand-over', () => {
    const a = migrate(OLD)!
    expect(Object.keys(a.found)).toEqual(OLD)
    expect(a.schema).toBe(SCHEMA)
    expect(a.found.moon).toMatchObject({ found: true, help: 0 })
    expect(a.found.moon.at).toBeLessThan(a.found.evicted.at) // the order they were found in is kept
    const b = migrate({ v: 4, list: OLD, keep: true })!
    expect(Object.keys(b.found)).toEqual(OLD)
  })
  it('keeps only ids that still exist: a removed id is dropped, nothing else is', () => {
    const s = migrate({ schema: 1, updated: 5, found: { moon: { found: true, at: 1, help: 0 }, 'long-gone': { found: true, at: 2, help: 0 }, coffee: { found: true, at: 3, help: 3 }, constructor: { found: true, at: 4, help: 0 } } })!
    expect(Object.keys(s.found).sort()).toEqual(['coffee', 'moon'])
    expect(s.found.coffee.help).toBe(3)
    expect(migrate(['moon', 'a-secret-that-was-removed'])!.found).not.toHaveProperty('a-secret-that-was-removed')
  })
  it('a registry with a new id: old progress stays, the new one is simply not found yet, and the count is x / N', () => {
    // a save made when only the first 10 secrets existed
    const first10 = SECRETS.slice(0, 10).map((s) => s.ach)
    g.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ schema: 1, updated: 1, found: Object.fromEntries(first10.map((a, i) => [a, { found: true, at: i, help: 0 }])) }))
    reloadProgress()
    expect(foundIds()).toEqual(first10)
    expect(foundIds().length).toBeLessThanOrEqual(ACH_TOTAL)
    expect(foundIds().includes(SECRETS[ACH_TOTAL - 1].ach)).toBe(false)
    expect(recordAchievement(SECRETS[ACH_TOTAL - 1].ach)).toBe(true)
    expect(foundIds()).toHaveLength(11)
  })
  it('repairs odd values and ignores things that are not progress', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('nope')).toBeNull()
    expect(migrate({ schema: 1, found: 'x' })).toBeNull()
    const s = migrate({ schema: 1, found: { moon: { found: true, at: 'soon', help: 99 }, roll: null } })!
    expect(s.found.moon).toEqual({ found: true, at: 0, help: 3 })
    expect(s.found.roll).toEqual({ found: true, at: 0, help: 0 })
  })
  it('reads a record from a newer build as far as it can', () => {
    const s = migrate({ schema: 9, updated: 3, found: { moon: { found: true, at: 1, help: 0 } }, extra: 1 })!
    expect(Object.keys(s.found)).toEqual(['moon'])
  })
})

describe('progress store', () => {
  it('starts at zero', () => { expect(foundIds()).toEqual([]) })

  it('lasts: found achievements come back after a reload', () => {
    recordAchievement('moon', 0)
    recordAchievement('coffee', 3)
    reloadProgress()
    expect(foundIds()).toEqual(['moon', 'coffee'])
    expect(foundEntry('coffee')).toMatchObject({ found: true, help: 3 })
    expect(foundEntry('moon')!.at).toBeGreaterThan(0)
  })

  it('moves an old build\'s saved state into the new format instead of throwing it away (the old reset bug)', () => {
    g.sessionStorage.setItem('achievements-state', JSON.stringify({ v: 1, list: OLD, keep: false }))
    g.localStorage.setItem('achievements', JSON.stringify(['cv']))
    reloadProgress()
    expect(foundIds().sort()).toEqual([...OLD, 'cv'].sort())
    expect(g.localStorage.getItem('achievements')).toBeNull() // folded in, then removed
    expect(g.sessionStorage.getItem('achievements-state')).toBeNull()
    expect(JSON.parse(g.localStorage.getItem(PROGRESS_KEY)!).schema).toBe(SCHEMA)
  })

  it('ignores a broken stored value', () => {
    g.localStorage.setItem(PROGRESS_KEY, '{nope')
    reloadProgress()
    expect(foundIds()).toEqual([])
  })

  it('writes the cookie: only the found ids, one year, Lax, Secure', () => {
    recordAchievement('moon'); recordAchievement('roll')
    const w = g.document.writes.at(-1)!
    expect(w).toContain(`${COOKIE_NAME}=moon.roll`)
    expect(w).toMatch(/Max-Age=31536000/); expect(w).toMatch(/SameSite=Lax/); expect(w).toMatch(/Secure/)
    expect(w).not.toMatch(/\d{10,}/) // no timestamps in it
  })

  it('falls back to the cookie when localStorage was cleared', () => {
    recordAchievement('moon'); recordAchievement('cat')
    g.localStorage = mem()
    reloadProgress()
    expect(foundIds().sort()).toEqual(['cat', 'moon'])
  })

  it('merging adds and never removes; it reports how many were new and skips unknown ids', () => {
    recordAchievement('moon')
    expect(mergeFound(['moon', 'roll', 'omae', 'not-a-secret'])).toBe(2)
    expect(foundIds().sort()).toEqual(['moon', 'omae', 'roll'])
    expect(mergeFound(['moon'])).toBe(0)
    expect(mergeFound([])).toBe(0)
  })

  it('an unknown or repeated id is not recorded', () => {
    expect(recordAchievement('nope')).toBe(false)
    expect(recordAchievement('constructor')).toBe(false)
    expect(recordAchievement('moon')).toBe(true)
    expect(recordAchievement('moon')).toBe(false)
  })

  it('a finished run can reset it, in every place', () => {
    recordAchievement('moon')
    resetProgress()
    expect(foundIds()).toEqual([])
    reloadProgress()
    expect(foundIds()).toEqual([])
    expect(g.document.cookie).toBe('')
  })

  it('tells subscribers when progress changes', () => {
    let n = 0
    const off = subscribeProgress(() => { n++ })
    recordAchievement('moon'); mergeFound(['roll']); resetProgress()
    off(); recordAchievement('coffee')
    expect(n).toBe(3)
  })

  it('never breaks when storage and cookies throw', () => {
    const boom = () => { throw new Error('blocked') }
    g.localStorage = { getItem: boom, setItem: boom, removeItem: boom } as unknown as ReturnType<typeof mem>
    g.sessionStorage = g.localStorage
    Object.defineProperty(g, 'document', { value: { get cookie() { return boom() }, set cookie(_v: string) { boom() } }, configurable: true, writable: true })
    expect(() => reloadProgress()).not.toThrow()
    expect(recordAchievement('moon')).toBe(true) // it still works for this visit
    expect(foundIds()).toEqual(['moon'])
    expect(mergeFound(['roll'])).toBe(1)
    expect(() => resetProgress()).not.toThrow()
  })
})
