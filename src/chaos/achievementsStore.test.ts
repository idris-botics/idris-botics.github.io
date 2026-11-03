import { beforeEach, describe, expect, it } from 'vitest'
import { ACH_KEY, ACH_VERSION, achievementsTaken, keepAchievementsForNextVisit, reloadAchievements, setCurrentAchievements, takeInitialAchievements } from './achievementsStore'

const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }
}
const g = globalThis as unknown as { sessionStorage: ReturnType<typeof mem>; localStorage: ReturnType<typeof mem> }
const OLD = ['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted']

describe('achievements store', () => {
  beforeEach(() => { g.sessionStorage = mem(); g.localStorage = mem(); reloadAchievements() })

  it('starts at zero', () => { expect(takeInitialAchievements()).toEqual([]) })

  it('throws away state saved by an older version (the 10/12 bug)', () => {
    g.sessionStorage.setItem(ACH_KEY, JSON.stringify({ v: ACH_VERSION - 1, list: OLD, keep: true }))
    g.localStorage.setItem('achievements', JSON.stringify(OLD))
    reloadAchievements()
    expect(takeInitialAchievements()).toEqual([])
    expect(g.localStorage.getItem('achievements')).toBeNull()
    expect(g.sessionStorage.getItem(ACH_KEY)).toBeNull()
  })

  it('keeps the list across an eviction, once, and not across a refresh', () => {
    setCurrentAchievements(['moon', 'coffee'])
    keepAchievementsForNextVisit()
    reloadAchievements() // the next Chaos visit
    expect(takeInitialAchievements()).toEqual(['moon', 'coffee'])
    achievementsTaken()
    reloadAchievements() // a refresh afterwards
    expect(takeInitialAchievements()).toEqual([])
  })

  it('ignores a broken stored value', () => {
    g.sessionStorage.setItem(ACH_KEY, '{nope')
    reloadAchievements()
    expect(takeInitialAchievements()).toEqual([])
  })
})
