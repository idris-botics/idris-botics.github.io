// Chaos progress: which achievements a visitor has found. It lasts. It is kept in three places on this device, written together and read back
// newest-first, and nothing here is ever sent anywhere (no network, no logging):
//   1. localStorage   - the full record
//   2. IndexedDB      - the full record (survives someone clearing localStorage)
//   3. a first-party cookie - only the list of found ids, one year, SameSite=Lax, Secure
// Every storage call is wrapped, so private mode or blocked storage only means the progress lasts less long; it never breaks the page.
//
// The record is a map of achievement id -> { found: true, at: when, help: hint tier used (0 none, 3 = the answer) }.
// When secrets are added or removed nothing is thrown away: on load every id the registry still knows is kept and only unknown ids are dropped,
// so x / N stays correct. SCHEMA changes only when the *format* changes; each old format has a migration below.
import { ACH_NAMES } from './secretsRegistry'

export const SCHEMA = 1
export const PROGRESS_KEY = 'chaos-progress' // localStorage
export const COOKIE_NAME = 'chaos_progress'
const COOKIE_MAX_AGE = 31536000 // one year, in seconds
const IDB_NAME = 'idris-site'
const IDB_STORE = 'kv'
const IDB_KEY = 'progress'
const IDB_TIMEOUT = 1500
// shapes written by older builds, read once and then removed
const LEGACY_LOCAL = 'achievements' // schema 0: a bare list of ids
const LEGACY_SESSION = 'achievements-state' // schema 0: { v, list, keep }

export type Entry = { found: true; at: number; help: number }
export type Found = Record<string, Entry>
export type Saved = { schema: number; updated: number; found: Found }

const known = (id: string): boolean => Object.prototype.hasOwnProperty.call(ACH_NAMES, id) // not `in`: ids like "constructor" are not secrets
const isStr = (x: unknown): x is string => typeof x === 'string'
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d)

// --- formats and migrations -------------------------------------------------------------------------------------------------------------------

/** One function per old format version: takes that version's data, returns the next version's. */
export const MIGRATIONS: Record<number, (raw: unknown) => unknown> = {
  // 0 -> 1: a plain list of ids (old localStorage list, or the old { v, list, keep } session state) becomes a found map. The list order is the order they were found.
  0: (raw) => {
    const list = (Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.list) ? raw.list : []).filter(isStr)
    const t = Date.now()
    return { schema: 1, updated: t, found: Object.fromEntries(list.map((id, i) => [id, { found: true, at: t - list.length + i, help: 0 }])) }
  },
}

/** Which format is this? null when it is not progress at all. */
const schemaOf = (raw: unknown): number | null => {
  if (isObj(raw) && typeof raw.schema === 'number' && raw.schema >= 1) return raw.schema
  if (Array.isArray(raw) || (isObj(raw) && Array.isArray(raw.list))) return 0
  return null
}

/** Keeps every id the registry still has and drops the rest; repairs odd values. */
function sanitize(raw: unknown): Saved | null {
  if (!isObj(raw) || !isObj(raw.found)) return null
  const found: Found = {}
  for (const [id, e] of Object.entries(raw.found)) {
    if (!known(id)) continue // an id that no longer exists
    const o = isObj(e) ? e : {}
    found[id] = { found: true, at: num(o.at, 0), help: Math.min(3, Math.max(0, Math.round(num(o.help, 0)))) }
  }
  return { schema: SCHEMA, updated: num(raw.updated, 0), found }
}

/** Reads progress in any format this site has ever used (or one from a newer build, as far as it can be understood). */
export function migrate(raw: unknown): Saved | null {
  let schema = schemaOf(raw)
  if (schema === null) return null
  let cur = raw
  while (schema < SCHEMA) { cur = MIGRATIONS[schema](cur); schema++ }
  return sanitize(cur)
}

// --- state ------------------------------------------------------------------------------------------------------------------------------------

const blank = (): Saved => ({ schema: SCHEMA, updated: 0, found: {} })
let state: Saved = blank()
let fromCookie = false // the record came from the cookie alone, so it has no time and must not outvote IndexedDB
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((f) => { try { f() } catch { /* a listener must not break the others */ } })

const bump = () => Math.max(Date.now(), state.updated + 1)
/** The time for the next found achievement: now, but always after the ones already found, so the order they were found in is kept. */
const nextAt = () => Math.max(Date.now(), ...Object.values(state.found).map((e) => e.at + 1))

/** Found achievement ids, in the order they were found. Always ids the registry knows. */
export const foundIds = (): string[] =>
  Object.entries(state.found).sort((a, b) => a[1].at - b[1].at || a[0].localeCompare(b[0])).map(([id]) => id)
export const foundEntry = (id: string): Entry | undefined => state.found[id]
export const subscribeProgress = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

// --- the three places -------------------------------------------------------------------------------------------------------------------------

function readLocal(): Saved | null {
  try { return migrate(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')) } catch { return null }
}

function readCookie(): string[] | null {
  try {
    const m = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`))
    if (!m) return null
    return decodeURIComponent(m.slice(COOKIE_NAME.length + 1)).split('.').filter(known)
  } catch { return null }
}

const writeLocal = (s: Saved) => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(s)) } catch { /* storage can be blocked or full */ } }

function writeCookie(ids: string[]) {
  try {
    const base = `${COOKIE_NAME}=${encodeURIComponent(ids.join('.'))}; Path=/; SameSite=Lax; Secure`
    document.cookie = ids.length ? `${base}; Max-Age=${COOKIE_MAX_AGE}` : `${COOKIE_NAME}=; Path=/; SameSite=Lax; Secure; Max-Age=0`
  } catch { /* cookies can be blocked */ }
}

/** Opens the little database; null when IndexedDB is missing, blocked or slow (some private modes never answer). */
function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let done = false
    const finish = (db: IDBDatabase | null) => { if (!done) { done = true; resolve(db) } }
    try {
      if (typeof indexedDB === 'undefined') return finish(null)
      const t = setTimeout(() => finish(null), IDB_TIMEOUT)
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => { try { req.result.createObjectStore(IDB_STORE) } catch { /* ignore */ } }
      req.onsuccess = () => { clearTimeout(t); finish(req.result) }
      req.onerror = () => { clearTimeout(t); finish(null) }
      req.onblocked = () => { clearTimeout(t); finish(null) }
    } catch { finish(null) }
  })
}

async function readIdb(): Promise<Saved | null> {
  const db = await openDb()
  if (!db) return null
  try {
    return await new Promise<Saved | null>((resolve) => {
      try {
        const r = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY)
        r.onsuccess = () => resolve(migrate(r.result ?? null))
        r.onerror = () => resolve(null)
      } catch { resolve(null) }
    })
  } finally { try { db.close() } catch { /* ignore */ } }
}

async function writeIdb(s: Saved): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).put(s, IDB_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      } catch { resolve() }
    })
  } finally { try { db.close() } catch { /* ignore */ } }
}

let idbQueue: Promise<void> = Promise.resolve()
/** Writes go one after another so an older save can never land after a newer one. */
const queueIdb = (s: Saved) => { idbQueue = idbQueue.then(() => writeIdb(s)).catch(() => {}) }
/** Resolves once every queued IndexedDB write has finished (for tests). */
export const progressWritesDone = (): Promise<void> => idbQueue

/** Writes to all three places. `idb` false skips IndexedDB (when the record just came from there). */
function persist(idb = true) {
  const snapshot = { ...state, found: { ...state.found } }
  writeLocal(snapshot)
  writeCookie(Object.keys(snapshot.found))
  if (idb) queueIdb(snapshot)
}

let persistAsked = false
/** Asks the browser not to evict this site's storage. Called after the first achievement. */
function requestPersistence() {
  if (persistAsked) return
  persistAsked = true
  try { void Promise.resolve(navigator.storage?.persist?.()).catch(() => {}) } catch { /* not supported or blocked */ }
}

// --- loading ----------------------------------------------------------------------------------------------------------------------------------

const union = (a: Found, b: Found): Found => {
  const out: Found = { ...a }
  for (const [id, e] of Object.entries(b)) out[id] = out[id] ? { found: true, help: Math.max(out[id].help, e.help), at: out[id].at && e.at ? Math.min(out[id].at, e.at) : out[id].at || e.at } : e
  return out
}

/** Reads what is on this device right now (localStorage, then the cookie, plus anything an older build left) and heals the other places. */
function load() {
  let rec = readLocal()
  fromCookie = false
  if (!rec) {
    const ids = readCookie()
    if (ids?.length) { rec = { schema: SCHEMA, updated: 0, found: Object.fromEntries(ids.map((id) => [id, { found: true as const, at: 0, help: 0 }])) }; fromCookie = true }
  }
  let changed = false
  // older builds: a list in localStorage, or the visit hand-over in sessionStorage. They are folded in, then removed.
  const legacy: unknown[] = []
  try { legacy.push(JSON.parse(localStorage.getItem(LEGACY_LOCAL) ?? 'null')) } catch { /* ignore */ }
  try { legacy.push(JSON.parse(sessionStorage.getItem(LEGACY_SESSION) ?? 'null')) } catch { /* ignore */ }
  for (const raw of legacy) {
    const old = migrate(raw)
    if (old && Object.keys(old.found).length) { rec = { schema: SCHEMA, updated: Math.max(rec?.updated ?? 0, old.updated), found: union(rec?.found ?? {}, old.found) }; changed = true }
  }
  state = rec ?? blank()
  if (changed) persist() // write the merged record back to every place
  if (changed) {
    try { localStorage.removeItem(LEGACY_LOCAL) } catch { /* ignore */ }
    try { sessionStorage.removeItem(LEGACY_SESSION) } catch { /* ignore */ }
  }
}

/**
 * Reads IndexedDB (it is asynchronous) and takes it if it is newer than what was loaded, or adds to it when the loaded record has no time of its own.
 * Subscribers hear about any change. Safe to call more than once.
 */
export async function hydrateProgress(): Promise<void> {
  const idb = await readIdb()
  if (!idb) {
    // nothing there (first visit, blocked, or cleared): give it a copy of what we have
    if (Object.keys(state.found).length) { if (fromCookie) persist(); else queueIdb({ ...state }) }
    fromCookie = false
    return
  }
  const before = JSON.stringify(state.found)
  if (fromCookie || idb.updated === state.updated) state = { schema: SCHEMA, updated: Math.max(idb.updated, state.updated), found: union(state.found, idb.found) }
  else if (idb.updated > state.updated) state = idb // it is the newest copy: take it as it is
  // else what we hold is newer: keep it
  fromCookie = false
  if (JSON.stringify(state.found) !== before) { persist(false); notify() }
  if (idb.updated !== state.updated || JSON.stringify(idb.found) !== JSON.stringify(state.found)) queueIdb({ ...state })
}

/** For tests: read the saved state again from storage (synchronous places only). */
export function reloadProgress() { load() }

// --- changing it ------------------------------------------------------------------------------------------------------------------------------

/** An achievement was just found. `help` is the hint tier used for it (0 none, 3 the answer). Returns false if it was unknown or already found. */
export function recordAchievement(id: string, help = 0): boolean {
  if (!known(id) || state.found[id]) return false
  state = { ...state, updated: bump(), found: { ...state.found, [id]: { found: true, at: nextAt(), help: Math.min(3, Math.max(0, Math.round(help))) } } }
  fromCookie = false
  persist()
  requestPersistence()
  notify()
  return true
}

/** Adds achievements (from a save code) and never removes any. Returns how many were new. */
export function mergeFound(ids: readonly string[]): number {
  const t = nextAt()
  const add = ids.filter((id) => known(id) && !state.found[id])
  if (!add.length) return 0
  state = { ...state, updated: bump(), found: { ...state.found, ...Object.fromEntries(add.map((id, i) => [id, { found: true as const, at: t + i, help: 0 }])) } }
  fromCookie = false
  persist()
  requestPersistence()
  notify()
  return add.length
}

/** A finished run starts over from zero (the Remix flush). Clears all three places. */
export function resetProgress() {
  state = { schema: SCHEMA, updated: bump(), found: {} }
  fromCookie = false
  persist()
  notify()
}

load()
void hydrateProgress()
