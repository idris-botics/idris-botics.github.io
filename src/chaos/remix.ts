// Remix: once every achievement has been found, the gags stop being predictable. The hidden words no longer do what they say (each Chaos visit
// deals them out again, never to themselves), and the random interruptions come from the whole pool, a little more often. It is remembered in
// this browser, and it can be switched off in the achievements panel.
export const REMIX_KEY = 'chaos-remix' // '1' unlocked and on, '0' unlocked but switched off
/** The hidden words that start a gag (typed, tapped in the command box, or the matching random event). */
export const REMIX_WORDS = ['cat', 'idris', 'coffee', 'cookie', 'omae', 'roll'] as const
export type RemixWord = (typeof REMIX_WORDS)[number]

export const remixUnlocked = (): boolean => { try { const v = localStorage.getItem(REMIX_KEY); return v === '1' || v === '0' } catch { return false } }
export const remixEnabled = (): boolean => { try { return localStorage.getItem(REMIX_KEY) === '1' } catch { return false } }
export const setRemix = (on: boolean) => { try { localStorage.setItem(REMIX_KEY, on ? '1' : '0') } catch { /* storage can be blocked */ } }
/** First time every achievement is found: switch it on. Returns true when this was the first time. */
export const unlockRemix = (): boolean => { if (remixUnlocked()) return false; setRemix(true); return true }

/** A fresh shuffle of the words in which no word keeps its own gag (a derangement), so the remix is always noticeable. */
export function makeRemixMap(rand: () => number = Math.random): Record<RemixWord, RemixWord> {
  const w = [...REMIX_WORDS]
  for (let tries = 0; tries < 50; tries++) {
    const p = [...w]
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]] }
    if (p.every((x, i) => x !== w[i])) return Object.fromEntries(w.map((k, i) => [k, p[i]])) as Record<RemixWord, RemixWord>
  }
  // a plain rotation is always a derangement
  return Object.fromEntries(w.map((k, i) => [k, w[(i + 1) % w.length]])) as Record<RemixWord, RemixWord>
}

/** If the letters typed so far end in one of the hidden words, which one. */
export const endsWithWord = (buf: string): RemixWord | null => REMIX_WORDS.find((x) => buf.endsWith(x)) ?? null
