import { useEffect, useRef, useState } from 'react'
import { sfx } from './sfx'

type Kind = 'lady' | 'beetle' | 'ant'
const KINDS: Kind[] = ['lady', 'beetle', 'ant', 'lady']

/** One bug seen from above, head up. Two sets of legs swap places quickly while it walks (CSS, ".bug.walk"). */
function BugArt({ kind }: { kind: Kind }) {
  const legs = (cls: string, d: string) => <path className={cls} d={d} fill="none" stroke="#2a2420" strokeWidth="1.1" strokeLinecap="round" />
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      {legs('legs-a', 'M7 9 L2 6 M7 13 L1.5 14 M9 18 L5 22 M17 9 L22 12 M17 14 L22.5 13 M15 18 L19 22')}
      {legs('legs-b', 'M7 9 L2 11 M7 13 L2 18 M9 18 L8 23 M17 9 L22 6 M17 14 L22 18 M15 18 L16 23')}
      <path d="M10 5 Q8 1 5 2 M14 5 Q16 1 19 2" fill="none" stroke="#2a2420" strokeWidth="1" strokeLinecap="round" />
      {kind === 'lady' && <>
        <circle cx="12" cy="6" r="3" fill="#2a2420" />
        <ellipse cx="12" cy="14" rx="7" ry="8" fill="#d93a2b" stroke="#2a2420" strokeWidth="1.1" />
        <path d="M12 7 V22" stroke="#2a2420" strokeWidth="1" />
        <circle cx="9" cy="12" r="1.3" fill="#2a2420" /><circle cx="15" cy="12" r="1.3" fill="#2a2420" /><circle cx="9.5" cy="17" r="1.2" fill="#2a2420" /><circle cx="14.5" cy="17" r="1.2" fill="#2a2420" />
      </>}
      {kind === 'beetle' && <>
        <circle cx="12" cy="6" r="2.8" fill="#1d2f2b" />
        <ellipse cx="12" cy="14.5" rx="6.5" ry="8.5" fill="#2f6b57" stroke="#1d2f2b" strokeWidth="1.1" />
        <path d="M12 7 V23" stroke="#1d2f2b" strokeWidth="1" /><path d="M8 11 Q12 13 16 11" fill="none" stroke="#8fd1b6" strokeWidth=".9" opacity=".7" />
      </>}
      {kind === 'ant' && <>
        <circle cx="12" cy="5.5" r="2.6" fill="#4a2a1a" /><ellipse cx="12" cy="11.5" rx="3" ry="3.4" fill="#5b3420" /><ellipse cx="12" cy="18" rx="4.2" ry="5.2" fill="#4a2a1a" />
      </>}
    </svg>
  )
}

type B = { x: number; y: number; a: number; speed: number; pause: number; alive: boolean; node: HTMLElement }

/**
 * The bugs gag: a few tiny bugs wander in from the edges of the screen, keep out of the cursor's way, stop and twitch now and then, and leave on their
 * own after about 40 seconds. Click one and it is squashed. The pet robot says what happened (Chaos.tsx hands over its speech bubble).
 * They sit below every popup, never block a click on the page, and under reduced motion they just sit still.
 */
export default function Bugs({ lang, say, onDone }: { lang: 'en' | 'ja'; say: (text: string, ms?: number) => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [kinds] = useState<Kind[]>(() => Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => KINDS[Math.floor(Math.random() * KINDS.length)]))
  const [splats, setSplats] = useState<{ id: number; x: number; y: number }[]>([])
  const killed = useRef(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const sayRef = useRef(say)
  sayRef.current = say

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const W = () => innerWidth, H = () => innerHeight
    const bugs: B[] = [...el.querySelectorAll<HTMLElement>('.bug')].map((node, i) => {
      // each one comes in from a different side, heading inward
      const side = (i + Math.floor(Math.random() * 4)) % 4
      const along = 0.15 + Math.random() * 0.7
      const [x, y, a] = side === 0 ? [-14, H() * along, 0] : side === 1 ? [W() + 14, H() * along, Math.PI] : side === 2 ? [W() * along, -14, Math.PI / 2] : [W() * along, H() + 14, -Math.PI / 2]
      return { x, y, a, speed: 22 + Math.random() * 20, pause: 0, alive: true, node }
    })
    if (reduce) bugs.forEach((b) => { b.x = 40 + Math.random() * (W() - 80); b.y = 80 + Math.random() * (H() - 160); b.a = Math.random() * 6.28 })
    const place = (b: B) => { b.node.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.a + Math.PI / 2}rad)` }
    bugs.forEach(place)
    const mouse = { x: -999, y: -999 }
    const move = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    addEventListener('pointermove', move, { passive: true })
    const life = (reduce ? 20000 : 36000) + Math.random() * 12000
    const born = performance.now()
    let last = born, raf = 0, finished = false
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); doneRef.current() }
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const leaving = now - born > life
      let any = false
      for (const b of bugs) {
        if (!b.alive) continue
        any = true
        if (reduce) { if (leaving) { b.alive = false; b.node.hidden = true } continue }
        b.pause -= dt
        const walking = b.pause <= 0
        b.node.classList.toggle('walk', walking)
        if (!walking) continue
        const dx = b.x - mouse.x, dy = b.y - mouse.y
        let sp = b.speed
        if (Math.hypot(dx, dy) < 110) { b.a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8; sp *= 3 } // scatter
        else if (Math.random() < 0.6 * dt) b.pause = 0.4 + Math.random() * 1.8 // stop and twitch
        else b.a += (Math.random() - 0.5) * 3 * dt
        if (leaving) { // walk out through the nearest edge
          const l = b.x, r = W() - b.x, t = b.y, bo = H() - b.y, m = Math.min(l, r, t, bo)
          b.a = m === l ? Math.PI : m === r ? 0 : m === t ? -Math.PI / 2 : Math.PI / 2
        }
        b.x += Math.cos(b.a) * sp * dt; b.y += Math.sin(b.a) * sp * dt
        if (!leaving) { // stay on the screen: turn back at the edges
          if (b.x < 10 || b.x > W() - 10) { b.a = Math.PI - b.a; b.x = Math.max(10, Math.min(W() - 10, b.x)) }
          if (b.y < 10 || b.y > H() - 10) { b.a = -b.a; b.y = Math.max(10, Math.min(H() - 10, b.y)) }
        } else if (b.x < -30 || b.x > W() + 30 || b.y < -30 || b.y > H() + 30) { b.alive = false; b.node.hidden = true; continue }
        place(b)
      }
      if (!any) { finish(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // squashing
    const squash = (e: Event) => {
      const node = (e.target as HTMLElement).closest<HTMLElement>('.bug')
      const b = node && bugs.find((x) => x.node === node)
      if (!b || !b.alive) return
      e.stopPropagation()
      b.alive = false; b.node.hidden = true
      killed.current++
      setSplats((s) => [...s, { id: Math.random(), x: b.x, y: b.y }])
      sfx('pop')
      dispatchEvent(new CustomEvent('portfolio:scout', { detail: 'happy' }))
      if (killed.current === bugs.length) sayRef.current(lang === 'en' ? 'All bugs fixed. Ship it.' : 'バグ修正完了。リリースします。', 4000)
    }
    el.addEventListener('pointerdown', squash)
    // the robot notices a moment after they arrive
    const noticed = window.setTimeout(() => {
      sayRef.current(lang === 'en' ? 'Ohh, it seems like bugs have sneaked in.' : 'おっと、バグが紛れ込んだみたいです。', 5000)
      dispatchEvent(new CustomEvent('portfolio:scout', { detail: 'look' }))
    }, 4500)
    return () => { cancelAnimationFrame(raf); clearTimeout(noticed); removeEventListener('pointermove', move); el.removeEventListener('pointerdown', squash) }
  }, [lang])

  return (
    <div className="bugs" ref={root} aria-hidden="true">
      {kinds.map((k, i) => <div key={i} className="bug"><BugArt kind={k} /></div>)}
      {splats.map((s) => <i key={s.id} className="bug-splat" style={{ left: s.x, top: s.y }} onAnimationEnd={() => setSplats((a) => a.filter((x) => x.id !== s.id))} />)}
    </div>
  )
}
