import hints from '../content/jokes/hints.json'
import { Morse } from './MissionControl'

type L = { en: string; ja: string }
const ui = hints.ui as unknown as Record<string, L>

// Clues that sit inside the project windows, so the secrets can only be solved by opening and reading the work.
// PID rig: six resistors on its board whose bands spell COFFEE (two digits per letter: 03 15 06 06 05 05); drawn by sims/anatomy/PidRig.tsx.
// Swarm: a status light that blinks MOON in Morse. 8-bit computer: an output display counting 111 109 97 101 (ASCII for the verdict word).
// G.A.I.T.: a serial log in hex (72 6F 6C 6C, the word for the barrel roll).
// TODO(idris): a photo of the messy prototype and one number for each behind-the-scenes card (src/content/jokes/hints.json, secrets.*.bts).
const MOON = '-- --- --- -.'
const OUT = [111, 109, 97, 101]
const LOG = ['72', '6F', '6C', '6C']

export default function ChaosClue({ slug, lang }: { slug: string; lang: 'en' | 'ja' }) {
  // the PID rig's own board (sims/anatomy/PidRig.tsx) carries the resistor-band clue
  if (slug === 'swarm') return <aside className="pw-clue" aria-label={ui.clueLed[lang]}><small>{ui.clueLed[lang]}</small><Morse code={MOON} lang={lang} /></aside>
  if (slug === 'cpu8') return <aside className="pw-clue" aria-label={ui.clueOut[lang]}><small>{ui.clueOut[lang]}</small><p className="pw-clue-out">{OUT.map((n) => String(n).padStart(3, '0')).join(' ')}</p></aside>
  if (slug === 'gait') return <aside className="pw-clue" aria-label={ui.clueLog[lang]}><small>{ui.clueLog[lang]}</small><p className="pw-clue-log">{LOG.map((h) => `0x${h}`).join(' ')}</p></aside>
  return null
}
