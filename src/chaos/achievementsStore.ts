// Achievements: a page refresh, or leaving Chaos with Restore order, starts the count again.
// They survive two things: being evicted by the pet robot, and Chaos crashing and the page falling back to Calm.
// That hand-over is kept in sessionStorage as { v, list, keep }. When the achievement list changes (a new secret, a renamed id), bump VERSION:
// state saved by an older build is then thrown away, so a visitor never sees a stale count such as 10/12.
export const ACH_VERSION = 4
export const ACH_KEY = 'achievements-state'
const LEGACY_KEYS = ['achievements'] // an older build kept the list in localStorage forever

type Saved = { v: number; list: string[]; keep: boolean }
const empty = (): Saved => ({ v: ACH_VERSION, list: [], keep: false })

function load(): Saved {
  try { for (const k of LEGACY_KEYS) localStorage.removeItem(k) } catch { /* storage can be blocked */ }
  try {
    const s = JSON.parse(sessionStorage.getItem(ACH_KEY) ?? 'null') as Partial<Saved> | null
    if (s && s.v === ACH_VERSION && Array.isArray(s.list)) return { v: ACH_VERSION, list: s.list.filter((x) => typeof x === 'string'), keep: s.keep === true }
    if (s) sessionStorage.removeItem(ACH_KEY) // another version: start again at 0
  } catch { /* ignore */ }
  return empty()
}

let state = load()
const save = () => { try { sessionStorage.setItem(ACH_KEY, JSON.stringify(state)) } catch { /* ignore */ } }

export const setCurrentAchievements = (list: string[]) => { state = { ...state, list }; save() }
/** Call just before Chaos goes away because of an eviction or a crash. */
export const keepAchievementsForNextVisit = () => { state = { ...state, keep: true }; save() }
/** The list a new Chaos visit starts with (safe to call twice, as React does in development). */
export function takeInitialAchievements(): string[] {
  if (!state.keep) state = { ...state, list: [] }
  return state.list
}
/** Once the new visit has started, the "keep" flag is used up. */
export const achievementsTaken = () => { state = { ...state, keep: false }; save() }
/** For tests: read the saved state again from storage. */
export const reloadAchievements = () => { state = load() }
