import { useEffect, useRef } from 'react'
import { ISO_CSS } from '../../lib/iso/iso-kit.mjs'

/** The kit's own stylesheet, added once. The figures sit on paper (the light theme) in both of the site's modes. */
let cssIn = false
export function useIsoCss() {
  useEffect(() => {
    if (cssIn) return
    cssIn = true
    const s = document.createElement('style')
    s.id = 'iso-css'
    s.textContent = ISO_CSS + `
.iso-wrap { margin: 0 0 20px; }
.iso-wrap .iso-figure { margin: 0; }
.iso-controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
.iso-controls .btn { min-height: 44px; }
.iso-controls .btn[aria-pressed='true'] { border-color: var(--accent); }
`
    document.head.appendChild(s)
  }, [])
}

/** Calls `tick(dt)` every frame while the figure is on screen and the tab is visible. Stops entirely when `still()` is true after one draw. */
export function useFrameLoop(host: React.RefObject<HTMLElement | null>, tick: (dt: number, now: number) => boolean | void, deps: unknown[]) {
  const tickRef = useRef(tick)
  useEffect(() => { tickRef.current = tick })
  useEffect(() => {
    const el = host.current
    if (!el) return
    let raf = 0, last = 0, visible = false, alive = true
    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
      last = now
      const more = tickRef.current(dt, now)
      raf = visible && !document.hidden && more !== false ? requestAnimationFrame(frame) : 0
    }
    const run = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame) } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run() }, { rootMargin: '120px 0px' })
    io.observe(el)
    const vis = () => { if (!document.hidden) run() }
    document.addEventListener('visibilitychange', vis)
    const poke = () => run()
    el.addEventListener('iso:poke', poke)
    return () => { alive = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis); el.removeEventListener('iso:poke', poke) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export const poke = (el: HTMLElement | null) => el?.dispatchEvent(new Event('iso:poke'))
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
