// Save codes: a short text that carries a visitor's found achievements to another browser or device (Mission Control: Save / Restore progress).
// Nothing here talks to a server. The code is the achievements' stable index numbers (secretsRegistry.ts, field idx) as a bitmap.
//
//   IDRIS-XXXX-XXX          <- the code for the current registry (23 secrets): 5 bitmap characters + 2 checksum characters
//
// Bit i of the bitmap is the secret with idx i. Five bits go into one Crockford base32 character, lowest bit first, so a registry that grows only
// adds characters at the end and every older code is still read the same way (missing characters are zeros). The checksum covers exactly the
// characters that are in the code, so it does not change when the registry grows. Indices are never reused (RETIRED_IDX), so an old code can never
// light up a different achievement.
import { ACH_BY_IDX, ACH_IDX, IDX_SPAN } from './secretsRegistry'

export const CODE_PREFIX = 'IDRIS'
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford: no I, L, O or U, so a code is hard to misread
const BITS = 5
const GROUP = 4
const MAX_CHARS = 64 // a code of any sane size; this only stops absurd input

/** 10-bit check over the bitmap characters (and how many there are, so a cut-off code is caught). */
function checksum(symbols: readonly number[]): number {
  let h = (symbols.length * 131 + 17) & 1023
  for (const s of symbols) h = (h * 33 + s + 1) & 1023
  return h
}

/** Crockford reading: O is 0; I and L are 1. Anything else outside the alphabet is not part of a code. */
function symbolOf(ch: string): number {
  const c = ch === 'O' ? '0' : ch === 'I' || ch === 'L' ? '1' : ch
  return ALPHABET.indexOf(c)
}

/** The code for a set of index numbers. `span` is how many indices the registry has (IDX_SPAN); it fixes the length. */
export function encodeIndices(indices: Iterable<number>, span: number = IDX_SPAN): string {
  const n = Math.max(1, Math.ceil(span / BITS))
  const symbols = new Array<number>(n).fill(0)
  for (const i of indices) if (Number.isInteger(i) && i >= 0 && i < n * BITS) symbols[Math.floor(i / BITS)] |= 1 << (i % BITS)
  const c = checksum(symbols)
  const chars = [...symbols, c >> BITS, c & 31].map((v) => ALPHABET[v])
  const groups: string[] = []
  for (let i = 0; i < chars.length; i += GROUP) groups.push(chars.slice(i, i + GROUP).join(''))
  return `${CODE_PREFIX}-${groups.join('-')}`
}

export type DecodedIndices = { ok: true; indices: number[] } | { ok: false; reason: 'empty' | 'format' | 'checksum' }

/** Reads a code. Spaces, dashes, lowercase and a missing IDRIS prefix are all fine. */
export function decodeIndices(input: string): DecodedIndices {
  let t = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (t.startsWith(CODE_PREFIX)) t = t.slice(CODE_PREFIX.length) // generated codes never contain the letter I, so this cannot eat real data
  if (!t) return { ok: false, reason: 'empty' }
  if (t.length < 3 || t.length > MAX_CHARS) return { ok: false, reason: 'format' }
  const vals = [...t].map(symbolOf)
  if (vals.some((v) => v < 0)) return { ok: false, reason: 'format' }
  const symbols = vals.slice(0, -2)
  if (checksum(symbols) !== ((vals[vals.length - 2] << BITS) | vals[vals.length - 1])) return { ok: false, reason: 'checksum' }
  const indices: number[] = []
  symbols.forEach((s, k) => { for (let b = 0; b < BITS; b++) if (s & (1 << b)) indices.push(k * BITS + b) })
  return { ok: true, indices }
}

/** The save code for a list of found achievement ids (ids the registry does not know are left out). */
export const saveCodeFor = (found: readonly string[]): string => encodeIndices(found.flatMap((a) => (Object.prototype.hasOwnProperty.call(ACH_IDX, a) ? [ACH_IDX[a]] : [])))

export type ReadCode = { ok: true; ids: string[]; ignored: number } | { ok: false; reason: 'empty' | 'format' | 'checksum' }

/** The achievement ids a code carries. `ignored` counts bits for indices this build does not have (a code from a newer version, or a retired secret). */
export function readSaveCode(input: string): ReadCode {
  const d = decodeIndices(input)
  if (!d.ok) return d
  const ids = d.indices.flatMap((i) => (i in ACH_BY_IDX ? [ACH_BY_IDX[i]] : []))
  return { ok: true, ids, ignored: d.indices.length - ids.length }
}
