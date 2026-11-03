import { useEffect, useRef } from 'react'
import { useReducedMotion } from './lib/hooks'

/**
 * One small point-cloud engine for both modes.
 *
 * Calm ("sensor field"): a sparse lidar-style scan behind the hero. A sweep rotates slowly and lights the points it passes, and the points bend away
 * from the cursor or finger, as if the robot is scanning the visitor. One accent colour, low contrast, behind the hero only.
 * Chaos: the same points as a loud cartoon sky: chunky coloured stars with scroll parallax, a click sends a ripple through them, and a planet,
 * the Moon, a drifting little robot and the odd comet float past.
 *
 * It draws about 500 points with fillRect, which stays well under 2 ms a frame. It stops when it is off screen or the tab is hidden, shows one still
 * frame under reduced motion, Save-Data or on a very low-end phone, and never takes pointer events.
 */
type Variant = 'calm' | 'chaos'
type Pt = { a: number; r: number; x: number; y: number; z: number; hue: number }

const lowEnd = () => {
  const nav = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } }
  return nav.connection?.saveData === true || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2
}

export default function PointField({ variant, faint = false }: { variant: Variant; faint?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d', { alpha: true })
    if (!c || !ctx) return
    const chaos = variant === 'chaos'
    const still = reduce || lowEnd()
    const N = chaos ? 150 : (matchMedia('(max-width: 700px)').matches ? 260 : 460)
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45'
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, t = 0
    let px = -9999, py = -9999, scroll = scrollY, ripple = { x: 0, y: 0, t: -1 }
    let alive = true, onScreen = true
    const pts: Pt[] = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1, hue: Math.floor(Math.random() * 5) }))
    const CHAOS = ['#ffffff', '#ffd45e', '#ff8fb1', '#7ad7ff', '#b69cff']
    const sky = chaos ? [
      { e: '🪐', x: 0.12, y: 0.22, z: 0.5, s: 54 }, { e: '🌙', x: 0.86, y: 0.12, z: 0.35, s: 46 }, { e: '🤖', x: 0.5, y: 0.5, z: 0.7, s: 40 }, { e: '🔴', x: 0.74, y: 0.7, z: 0.25, s: 30 },
    ] : []
    const font = (s: number) => `${s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
    let comet = { x: -1, y: 0, v: 0, on: false, next: 6000 }

    const size = () => {
      const box = chaos ? { w: innerWidth, h: innerHeight } : { w: c.parentElement!.clientWidth, h: c.parentElement!.clientHeight }
      dpr = Math.min(devicePixelRatio || 1, 2)
      w = box.w; h = box.h
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const paint = (dt: number) => {
      ctx.clearRect(0, 0, w, h)
      if (chaos) {
        const par = scroll * 0.0006
        for (const p of pts) {
          let x = p.x * w, y = ((p.y - par * p.z) % 1 + 1) % 1 * h
          if (!still) { y = (y + t * 0.012 * p.z) % h }
          if (ripple.t >= 0) {
            const dx = x - ripple.x, dy = y - ripple.y, d = Math.hypot(dx, dy), front = ripple.t * 0.5
            const k = Math.max(0, 1 - Math.abs(d - front) / 40) * 22
            if (k > 0 && d > 0) { x += (dx / d) * k; y += (dy / d) * k }
          }
          const s = 2 + p.z * 3.4
          ctx.fillStyle = CHAOS[p.hue]
          ctx.globalAlpha = 0.45 + p.z * 0.5
          ctx.fillRect(x, y, s, s)
        }
        ctx.globalAlpha = 1
        for (const o of sky) {
          const bob = still ? 0 : Math.sin(t * 0.0007 + o.x * 9) * 8
          const x = o.x * w + (still ? 0 : Math.sin(t * 0.00012 + o.y * 6) * 30), y = ((o.y - par * o.z * 2) % 1 + 1) % 1 * h + bob
          ctx.font = font(o.s); ctx.globalAlpha = 0.9; ctx.fillText(o.e, x, y)
        }
        ctx.globalAlpha = 1
        if (!still) {
          comet.next -= dt
          if (!comet.on && comet.next <= 0) { comet = { x: -60, y: Math.random() * h * 0.6, v: 0.5 + Math.random() * 0.4, on: true, next: 0 } }
          if (comet.on) {
            comet.x += comet.v * dt; comet.y += comet.v * dt * 0.35
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8
            ctx.beginPath(); ctx.moveTo(comet.x, comet.y); ctx.lineTo(comet.x - 70, comet.y - 25); ctx.stroke(); ctx.globalAlpha = 1
            ctx.font = font(26); ctx.fillText('☄️', comet.x - 10, comet.y + 8)
            if (comet.x > w + 80) { comet.on = false; comet.next = 9000 + Math.random() * 9000 }
          }
          if (ripple.t >= 0) { ripple.t += dt; if (ripple.t > 900) ripple.t = -1 }
        }
        return
      }
      // calm: a lidar scan from a point low in the frame; the sweep lights the points it passes
      const ox = w * 0.62, oy = h * 1.02, R = Math.hypot(w, h) * 0.85
      const sweep = still ? 1.1 : (t * 0.00045) % (Math.PI * 2)
      const TAU = Math.PI * 2
      ctx.fillStyle = accent
      for (const p of pts) {
        const ang = Math.PI * 1.02 + p.a * 0.5 // the upper half-plane only
        const ring = Math.round(p.r * 9) / 9 // points sit on rings, with a little jitter, like a scan
        const rad = (0.12 + ring * 0.88) * R + (p.x - 0.5) * 18
        let x = ox + Math.cos(ang) * rad, y = oy + Math.sin(ang) * rad
        const dx = x - px, dy = y - py, d = Math.hypot(dx, dy)
        if (d < 150 && d > 0) { const k = (150 - d) * 0.38; x += (dx / d) * k; y += (dy / d) * k }
        const behind = (((sweep - (ang - Math.PI)) % TAU) + TAU) % TAU
        const lit = Math.exp(-behind * 2.4)
        ctx.globalAlpha = Math.min(0.5, 0.07 + lit * 0.4)
        const s = 1.6 + lit * 1.6
        ctx.fillRect(x, y, s, s)
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const dt = Math.min(48, now - (last || now)); last = now; t += dt
      if (onScreen && !document.hidden) paint(dt)
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && !still) { last = 0; raf = requestAnimationFrame(frame) } }
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0 }

    const move = (e: PointerEvent) => {
      if (chaos) { px = e.clientX; py = e.clientY; return }
      const r = c.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top
    }
    const leave = () => { px = py = -9999 }
    const down = (e: PointerEvent) => { if (chaos) ripple = { x: e.clientX, y: e.clientY, t: 0 } }
    const onScroll = () => { scroll = scrollY; if (still) paint(0) }
    const vis = () => { if (document.hidden) stop(); else start() }
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) { start() } else stop() }, { rootMargin: '80px' })
    if (!chaos) io.observe(c.parentElement!)
    const ro = new ResizeObserver(() => { size(); paint(0) })
    ro.observe(chaos ? document.documentElement : c.parentElement!)
    size(); paint(0)
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', vis)
    start()
    return () => {
      alive = false; stop(); io.disconnect(); ro.disconnect()
      removeEventListener('pointermove', move); removeEventListener('pointerdown', down); removeEventListener('scroll', onScroll)
      document.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', vis)
    }
  }, [variant, reduce])
  return <canvas ref={ref} className={variant === 'chaos' ? 'stars' : faint ? 'sensor faint' : 'sensor'} aria-hidden="true" />
}
