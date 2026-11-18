import { useEffect, useRef } from 'react'

/**
 * Engineering paper behind the page: a faint millimetre grid with a stronger line every 10 mm, and ruler ticks along the left and top edges
 * of the viewport. A small mono readout beside the cursor shows its position the way a CNC jog display does ("X 412.0  Y 188.5", in mm),
 * and fades after a second of stillness. The drawing happens once per resize or theme change; nothing here runs per frame.
 * On touch screens there is no readout.
 *
 * In Calm there is a painted picture behind the page, and two styles fighting is too much. So over the picture the grid is a third of its
 * strength, the strong 10 mm lines are gone and the ruler numbers are at about half; the full grid and rulers are a second canvas that
 * fades out over the first screen (from CSS, or from a scroll listener where scroll-driven animations are missing). The cursor readout
 * is only shown on that first screen. In Chaos (no picture) the original full grid is drawn on the one canvas, as before.
 */
const MM = 96 / 25.4 // CSS px in one millimetre

type Ctx = CanvasRenderingContext2D
type Look = { minor: number; major: number; ruler: number }
/** Calm, over the picture (the grid is a third of its old strength; rulers about half). */
const OVER_PICTURE: Look = { minor: 0.015, major: 0, ruler: 0.21 }
/** Calm, the extra that the first screen adds on top, so there it adds up to the original look (0.045 / 0.085 / 0.42). */
const HERO_EXTRA: Look = { minor: 0.03, major: 0.085, ruler: 0.27 }
/** Chaos and the original look. */
const FULL: Look = { minor: 0.045, major: 0.085, ruler: 0.42 }

function paint(c: HTMLCanvasElement, ctx: Ctx, look: Look, ink: string) {
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const w = innerWidth, h = innerHeight
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const step = MM * 2 // a grid line every 2 mm, a stronger one every 10 mm
  ctx.strokeStyle = ink; ctx.lineWidth = 1
  if (look.minor) {
    ctx.globalAlpha = look.minor
    ctx.beginPath()
    for (let i = 1; i * step < w; i++) if (i % 5) { const x = Math.round(i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let j = 1; j * step < h; j++) if (j % 5) { const y = Math.round(j * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  }
  if (look.major) {
    ctx.globalAlpha = look.major
    ctx.beginPath()
    for (let i = 5; i * step < w; i += 5) { const x = Math.round(i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let j = 5; j * step < h; j += 5) { const y = Math.round(j * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
  }
  if (look.ruler) {
    // rulers on the left and top edges: a tick every 2 mm, longer every 10 mm, a label every 50 mm
    ctx.globalAlpha = look.ruler
    ctx.fillStyle = ink
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace'
    ctx.beginPath()
    for (let i = 0; i * step < w; i++) { const x = Math.round(i * step) + 0.5, len = i % 25 === 0 ? 12 : i % 5 === 0 ? 8 : 4; ctx.moveTo(x, 0); ctx.lineTo(x, len) }
    for (let j = 0; j * step < h; j++) { const y = Math.round(j * step) + 0.5, len = j % 25 === 0 ? 12 : j % 5 === 0 ? 8 : 4; ctx.moveTo(0, y); ctx.lineTo(len, y) }
    ctx.stroke()
    if (w > 700) {
      for (let i = 25; i * step < w; i += 25) ctx.fillText(String(i * 2), Math.round(i * step) + 3, 22)
      ctx.save(); ctx.rotate(-Math.PI / 2)
      for (let j = 25; j * step < h; j += 25) ctx.fillText(String(j * 2), -Math.round(j * step) + 3, 22)
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
}

export default function PaperGrid({ wobble = false, soft = false }: { wobble?: boolean; soft?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const hero = useRef<HTMLCanvasElement>(null)
  const jog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const h = hero.current
    const hctx = h?.getContext('2d') ?? null
    // The lines only depend on the size of the screen (and the ink colour), but the observer below fires every time the page's height
    // changes (images and videos load, sections reveal). So it repaints only when the screen size really changed.
    let drawn = ''
    const draw = () => {
      const key = `${innerWidth}x${innerHeight}@${devicePixelRatio}`
      if (key === drawn) return
      drawn = key
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1c1b19'
      paint(c, ctx, soft ? OVER_PICTURE : FULL, ink)
      if (soft && h && hctx) paint(h, hctx, HERO_EXTRA, ink)
    }
    draw()
    const ro = new ResizeObserver(draw); ro.observe(document.documentElement)

    // Browsers with scroll-driven animations fade the first-screen layer from CSS; the others get this small fallback.
    let fadeOn = false
    const fade = () => { if (h) h.style.opacity = String(Math.max(0, 1 - scrollY / Math.max(1, innerHeight))) }
    if (soft && h && !CSS.supports('animation-timeline: scroll()')) { fadeOn = true; fade(); addEventListener('scroll', fade, { passive: true }) }

    // the jog readout (mouse only, and only on the first screen when there is a picture behind the page)
    const el = jog.current
    let raf = 0, fadeT = 0, mx = 0, my = 0
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !el) return
      if (soft && scrollY > innerHeight * 0.9) { el.classList.remove('on'); return }
      mx = e.clientX; my = e.clientY
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0
        el.textContent = `X ${(mx / MM).toFixed(1).padStart(6, ' ')}  Y ${(my / MM).toFixed(1).padStart(6, ' ')}`
        el.style.transform = `translate(${Math.min(mx + 16, innerWidth - 150)}px, ${Math.min(my + 18, innerHeight - 24)}px)`
        el.classList.add('on')
        clearTimeout(fadeT); fadeT = window.setTimeout(() => el.classList.remove('on'), 1000)
      })
    }
    if (fine) addEventListener('pointermove', move, { passive: true })
    return () => { ro.disconnect(); removeEventListener('pointermove', move); if (fadeOn) removeEventListener('scroll', fade); cancelAnimationFrame(raf); clearTimeout(fadeT) }
  }, [soft])
  return (
    <>
      <canvas ref={ref} className={wobble ? 'paper wobble' : 'paper'} aria-hidden="true" />
      {soft && <canvas ref={hero} className="paper-hero" aria-hidden="true" />}
      <div ref={jog} className="jog" aria-hidden="true" />
    </>
  )
}
