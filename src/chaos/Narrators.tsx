import { useEffect, useRef } from 'react'
import data from '../content/jokes/narrators.json'

type L = { en: string; ja: string }
type Narrator = { lines: L[]; after?: string }
const NARRATORS = data.narrators as unknown as Record<string, Narrator>
const CONTEXTS = data.contexts as unknown as Record<string, L[]>

// A shuffle bag per pool: no line repeats until the pool is used up.
const bags = new Map<string, number[]>()
function draw(key: string, n: number): number {
  let bag = bags.get(key)
  if (!bag?.length) { bag = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5); bags.set(key, bag) }
  return bag.pop()!
}

type Props = { lang: 'en' | 'ja'; found: string[]; say: (text: string, ms?: number) => boolean; award: (id: string) => void }
const RARE = data.rare as unknown as L[]
const LEGENDARY = data.legendary as unknown as L[]

/**
 * The comment engine: now and then a short remark from one of several narrators (the robot, Mission Control, the error log, the professor,
 * the station announcer, the 8-bit computer, and the coffee mug once coffee has been found), or a line that fits the moment
 * (late at night, idle, a return visit, Japanese selected, a phone, how many secrets are found). Never two at once, never the same narrator twice
 * in a row, never while a project window or a set piece is open, and each stays up for 0.5 s plus 0.3 s per word.
 */
export default function Narrators({ lang, found, say, award }: Props) {
  const lastInput = useRef(Date.now())
  const lastNarrator = useRef('')
  const lastAt = useRef(0)
  const live = useRef({ lang, found, say, award })
  useEffect(() => { live.current = { lang, found, say, award } })
  const opened = useRef(0)
  useEffect(() => { const f = () => { opened.current++ }; addEventListener('portfolio:project-open', f); return () => removeEventListener('portfolio:project-open', f) }, [])

  useEffect(() => {
    const touch = () => { lastInput.current = Date.now() }
    const evs = ['pointerdown', 'pointermove', 'keydown', 'scroll'] as const
    evs.forEach((e) => addEventListener(e, touch, { passive: true }))
    let t = 0
    const returning = (() => { try { const r = localStorage.getItem('chaos-visited') === '1'; localStorage.setItem('chaos-visited', '1'); return r } catch { return false } })()
    let returnShown = false
    const tick = (ms: number) => {
      t = window.setTimeout(() => {
        const { lang: lg, found: fd, say: sy, award: aw } = live.current
        const busy = document.hidden || document.querySelector('.page, .rick, .cena, .omae, .coffee-flood, .coffee-brew')
        if (!busy && Date.now() - lastAt.current > 15000) {
          const hour = new Date().getHours()
          const pools: { key: string; list: L[]; narrator: string }[] = []
          if (hour < 5) pools.push({ key: 'late', list: CONTEXTS.late, narrator: 'late' })
          if (Date.now() - lastInput.current > 20000) pools.push({ key: 'idle', list: CONTEXTS.idle, narrator: 'idle' })
          if (returning && !returnShown) pools.push({ key: 'return', list: CONTEXTS.return, narrator: 'return' })
          if (lg === 'ja') pools.push({ key: 'ja', list: CONTEXTS.ja, narrator: 'ja' })
          if (opened.current > 0) pools.push({ key: 'work', list: CONTEXTS.work, narrator: 'work' })
          if (matchMedia('(pointer: coarse)').matches) pools.push({ key: 'phone', list: CONTEXTS.phone, narrator: 'phone' })
          if (fd.length >= 4) pools.push({ key: 'all', list: CONTEXTS.all, narrator: 'all' })
          else if (fd.length >= 1) pools.push({ key: 'some', list: CONTEXTS.some, narrator: 'some' })
          let pick = pools.length && Math.random() < 0.6 ? pools[Math.floor(Math.random() * pools.length)] : null
          if (!pick) {
            const names = Object.keys(NARRATORS).filter((k) => k !== lastNarrator.current && (!NARRATORS[k].after || fd.includes(NARRATORS[k].after!)))
            const k = names[Math.floor(Math.random() * names.length)]
            pick = { key: k, list: NARRATORS[k].lines, narrator: k }
          }
          // about 0.5% of comments are legendary (gold toast, an achievement) and about 3% are rare
          const roll = Math.random()
          const tier = roll < 0.005 ? 'legendary' : roll < 0.035 ? 'rare' : 'normal'
          const list = tier === 'legendary' ? LEGENDARY : tier === 'rare' ? RARE : pick.list
          const line = list[draw(tier === 'normal' ? pick.key : tier, list.length)][lg]
          const words = line.split(/\s+/).length
          const ms = Math.max(4000, 500 + (lg === 'ja' ? line.length * 160 : words * 300))
          if (sy(line, ms)) {
            if (tier === 'legendary') { aw('legend'); document.documentElement.classList.add('gold-toast'); window.setTimeout(() => document.documentElement.classList.remove('gold-toast'), ms) }
            lastNarrator.current = pick.narrator
            lastAt.current = Date.now()
            if (pick.key === 'return') returnShown = true
          }
        }
        tick(30000 + Math.random() * 25000)
      }, ms)
    }
    tick(35000)
    return () => { clearTimeout(t); evs.forEach((e) => removeEventListener(e, touch)) }
  }, [])
  return null
}
