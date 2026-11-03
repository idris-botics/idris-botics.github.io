import { useEffect, useRef, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import data from '../content/jokes/hintbot.json'
import hints from '../content/jokes/hints.json'
import { markHelped } from './hintsStore'

type L = { en: string; ja: string }
type Q = { q: L; a: L; b: L; ra: L; rb: L }
type Taunt = { n: string; en: string; ja: string }
const ui = data.ui as unknown as Record<string, L>
const QUESTIONS = data.questions as unknown as Q[]
const TAUNTS = data.taunts as unknown as Taunt[]
const HINTS = data.secrets as unknown as Record<string, L[]>
const SECRETS = hints.secrets as unknown as Record<string, { ach: string }>
const IDS = Object.keys(HINTS)
const WAIT = [0, 40, 60] // seconds before the second and third hint of one secret unlock

// shuffle bag: nothing repeats until the pool is used up
const bags = new Map<string, number[]>()
function draw(key: string, n: number): number {
  let bag = bags.get(key)
  if (!bag?.length) { bag = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5); bags.set(key, bag) }
  return bag.pop()!
}

// hints already given this visit, and when the last one for each secret was shown (kept outside React so closing the panel does not reset them)
const given: Record<string, number> = {}
const givenAt: Record<string, number> = {}
let asked = 0

type Step =
  | { k: 'q'; q: Q; left: number }
  | { k: 'reply'; text: string; left: number; next: () => void }
  | { k: 'hint'; text: string; id?: string; more: boolean }
  | { k: 'msg'; text: string }

type Props = { lang: 'en' | 'ja'; found: string[]; say: (text: string, ms?: number) => boolean; fire: (id: string) => void }

/**
 * The hint button, top right. Pressing it starts a few questionable questions and a taunt or two. Only then does it give a hint:
 * first what to do, then a clearer nudge, then the answer. Each next hint unlocks on a timer, so pressing early shows the last hint again.
 */
export default function HintBot({ lang, found, fire }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step | null>(null)
  const [bubble, setBubble] = useState('')
  const live = useRef({ found })
  useEffect(() => { live.current = { found } })

  // now and then the bot pipes up by itself with a taunt, never over a project window or a set piece
  useEffect(() => {
    let t = 0, hide = 0
    const next = (ms: number) => {
      t = window.setTimeout(() => {
        const busy = document.hidden || document.querySelector('.page, .rick, .cena, .omae, .coffee-flood, .coffee-brew')
        if (!busy) {
          const tn = TAUNTS[draw('ambient', TAUNTS.length)]
          setBubble(tn[lang])
          hide = window.setTimeout(() => setBubble(''), 6500)
        }
        next(55000 + Math.random() * 40000)
      }, ms)
    }
    next(30000)
    return () => { clearTimeout(t); clearTimeout(hide) }
  }, [lang])

  const unfound = () => IDS.filter((id) => !live.current.found.includes(SECRETS[id].ach))

  const reveal = () => {
    const ids = unfound()
    if (!ids.length) { setStep({ k: 'msg', text: ui.none[lang] }); return }
    const id = ids[0]
    const tier = given[id] ?? 0
    const tiers = HINTS[id]
    if (tier > 0 && (Date.now() - (givenAt[id] ?? 0)) / 1000 < WAIT[tier]) {
      setStep({ k: 'hint', text: `${ui.soon[lang]} ${tiers[tier - 1][lang]}`, id: undefined, more: false })
      return
    }
    given[id] = Math.min(tier + 1, tiers.length)
    givenAt[id] = Date.now()
    if (tier === tiers.length - 1) markHelped(SECRETS[id].ach)
    setStep({ k: 'hint', text: tiers[tier][lang], id: tier === tiers.length - 1 && id !== 'moon' ? id : undefined, more: tier < tiers.length - 1 })
  }

  const askNext = (left: number) => {
    if (left <= 0) { reveal(); return }
    setStep({ k: 'q', q: QUESTIONS[draw('q', QUESTIONS.length)], left })
  }

  const toggle = () => {
    if (open) { setOpen(false); setStep(null); return }
    setBubble('')
    setOpen(true)
    asked++
    // the first request gets a few questions, later ones fewer, so it teases without becoming a chore
    askNext(asked === 1 ? 3 : 2)
  }

  const answer = (q: Q, which: 'a' | 'b', left: number) => {
    const text = q[which === 'a' ? 'ra' : 'rb'][lang]
    const taunt = Math.random() < 0.5 ? TAUNTS[draw('between', TAUNTS.length)][lang] : ''
    setStep({ k: 'reply', text: taunt ? `${text} ${taunt}` : text, left: left - 1, next: () => askNext(left - 1) })
  }

  return (
    <div className="hb">
      <button className="btn hb-btn" aria-expanded={open} aria-label={ui.button[lang]} title={ui.button[lang]} onClick={toggle}>
        <Lightbulb size={18} aria-hidden="true" /><span className="hb-word">{ui.button[lang]}</span>
      </button>
      {!open && bubble && <p className="hb-bubble" role="status" onClick={() => setBubble('')}>{bubble}</p>}
      {open && step && (
        <div className="hb-panel" role="dialog" aria-label={ui.title[lang]}>
          <div className="hb-head">
            <strong>{ui.title[lang]}</strong>
            <button className="hb-x" onClick={() => { setOpen(false); setStep(null) }} aria-label={ui.close[lang]}><X size={18} aria-hidden="true" /></button>
          </div>
          {step.k === 'q' && (
            <div className="hb-body">
              <p>{step.q.q[lang]}</p>
              <div className="hb-opts">
                <button className="btn" onClick={() => answer(step.q, 'a', step.left)}>{step.q.a[lang]}</button>
                <button className="btn" onClick={() => answer(step.q, 'b', step.left)}>{step.q.b[lang]}</button>
              </div>
            </div>
          )}
          {step.k === 'reply' && (
            <div className="hb-body">
              <p>{step.text}</p>
              <div className="hb-opts"><button className="btn" autoFocus onClick={step.next}>{lang === 'en' ? 'Continue' : '続ける'}</button></div>
            </div>
          )}
          {step.k === 'hint' && (
            <div className="hb-body">
              <p className="hb-hint">{step.text}</p>
              {step.id && <div className="hb-opts"><button className="btn" onClick={() => { const id = step.id!; setOpen(false); setStep(null); fire(id) }}>{ui.fire[lang]}</button></div>}
            </div>
          )}
          {step.k === 'msg' && <div className="hb-body"><p>{step.text}</p></div>}
        </div>
      )}
    </div>
  )
}
