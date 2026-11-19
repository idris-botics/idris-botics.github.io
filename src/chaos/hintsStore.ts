// What the hint robot has given this visit, per achievement. When the secret is found, the tier is kept with the saved progress
// (achievementsStore: help), so a secret solved with the answer keeps its SOLVED WITH HELP stamp for good.
import { foundEntry } from './achievementsStore'

const helped = new Set<string>()
const tiers = new Map<string, number>()
/** The answer itself was shown (or run for the visitor). */
export const markHelped = (id: string) => { helped.add(id) }
/** The hint robot gave tier 1, 2 or 3 for this achievement (the highest counts). */
export const noteHint = (id: string, tier: number) => { tiers.set(id, Math.max(tiers.get(id) ?? 0, tier)) }
/** The hint tier used so far this visit (0 when none). */
export const hintTier = (id: string): number => tiers.get(id) ?? 0
export const isHelped = (id: string) => helped.has(id) || (foundEntry(id)?.help ?? 0) >= 3
