import { useEffect, useRef } from 'react'
import { useReducedMotion } from './lib/hooks'

/**
 * The Calm background: a live lidar scan of RoboDog, built from about 3,000 points.
 *
 * The robot is a point cloud (body, bay, head, four legs) standing on a floor of rings. A scan plane climbs it every few seconds, a sweep
 * circles the floor, and a ping runs out across the rings now and then. The eyes glow and blink. The view orbits slowly and leans with the
 * pointer; the points near the pointer are pushed away and a targeting reticle follows it, as if the robot is scanning you. A click sends a ping.
 *
 * It draws with fillRect (a few thousand rectangles, about 1 to 2 ms a frame), stops off screen and in hidden tabs, shows one still frame under
 * reduced motion, Save-Data or on a very low-end phone, and never takes pointer events. The `faint` variant is just the floor, used behind sections.
 */
type Pt = { x: number; y: number; z: number; c: number; kind: 0 | 1 | 2 | 3; a: number; r: number }
const TAU = Math.PI * 2

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

const lowEnd = () => {
  const nav = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } }
  return nav.connection?.saveData === true || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2
}

// palette: 0 floor (cool grey-blue), 1 body (pale cyan), 2 bay (white), 3 legs (RoboDog orange), 4 feet (blue), 5 eyes (glow cyan), 6 dust
const COLOURS = ['#6f86a8', '#9fe8ff', '#ffffff', '#ff7a45', '#5b8cff', '#7df0ff', '#9db3d3']

function build(dog: boolean, density: number): Pt[] {
  const R = rng(7)
  const pts: Pt[] = []
  const add = (x: number, y: number, z: number, c: number, kind: Pt['kind']) => pts.push({ x, y, z, c, kind, a: Math.atan2(y, x), r: Math.hypot(x, y) })
  const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, n: number, c: number) => {
    const areas = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy], total = areas.reduce((a, b) => a + b, 0)
    for (let i = 0; i < n * density; i++) {
      let f = R() * total, face = 0
      while (f > areas[face]) { f -= areas[face]; face++ }
      const u = R() - 0.5, v = R() - 0.5
      const p: [number, number, number] = face < 2 ? [face ? 0.5 : -0.5, u, v] : face < 4 ? [u, face === 3 ? 0.5 : -0.5, v] : [u, v, face === 5 ? 0.5 : -0.5]
      add(cx + p[0] * sx, cy + p[1] * sy, cz + p[2] * sz, c, 0)
    }
  }
  if (dog) {
    box(0, 0, 30, 44, 26, 16, 760, 1)       // body
    box(0, 0, 40, 30, 20, 6, 220, 2)        // electronics bay
    box(30, 0, 33, 14, 20, 16, 300, 1)      // head
    for (const sy of [-1, 1]) for (let i = 0; i < 26; i++) add(37.4 + R() * 0.8, sy * 5.2 + (R() - 0.5) * 4.2, 36 + (R() - 0.5) * 4.6, 5, 2) // eyes
    for (const [lx, ly] of [[14, -15], [14, 15], [-14, -15], [-14, 15]]) {
      box(lx, ly, 25, 6, 5, 14, 150, 3)      // thigh
      box(lx, ly, 10, 5, 4, 16, 150, 3)      // shin
      box(lx + 1.5, ly, 2, 9, 5, 3, 60, 4)  // foot
    }
    for (let i = 0; i < 70 * density; i++) add(-30 - R() * 8, (R() - 0.5) * 8, 38 + R() * 6, 1, 0) // a short tail
  }
  // the floor: rings, thinner at the edge
  for (let r = dog ? 30 : 20; r <= 190; r += 9) {
    const n = Math.round(r * 1.5 * density)
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R() * 0.02; add(Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.8, 0, 1) }
  }
  // dust above the floor
  for (let i = 0; i < 160 * density; i++) { const a = R() * TAU, r = 20 + R() * 170; add(Math.cos(a) * r, Math.sin(a) * r, 4 + R() * 60, 6, 3) }
  return pts.sort((p, q) => p.c - q.c)
}

export default function ScanField({ faint = false }: { faint?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d', { alpha: true })
    if (!c || !ctx) return
    const phone = matchMedia('(max-width: 700px)').matches
    const still = reduce || lowEnd()
    const pts = build(!faint, phone ? 0.55 : 1)
    const eyes = pts.filter((p) => p.kind === 2)
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, t = 0, alive = true, onScreen = true
    let mx = 0.5, my = 0.5, px = -9999, py = -9999, ping = -1
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a45'
    COLOURS[3] = accent

    const size = () => {
      const el = c.parentElement!
      dpr = Math.min(devicePixelRatio || 1, 2)
      w = el.clientWidth; h = el.clientHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      const reveal = still ? 1 : Math.min(1, t / 2400)
      const yaw = (still ? 0.7 : t * 0.00011) + (mx - 0.5) * 0.9
      const pitch = (faint ? 0.2 : 0.36) + (my - 0.5) * 0.18
      const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
      const D = 300
      // the robot stands in the right-hand column beside the About text, big enough to read as a robot; the floor rings spread under the whole zone
      const f = faint ? Math.max(w, h) * 1.05 : phone ? w * 2.6 : Math.min(w * 0.82, 1180)
      const ox = faint ? w * 0.5 : phone ? w * 0.5 : w * 0.76, oy = faint ? h * 0.78 : phone ? h * 0.3 : h * 0.65
      const sweep = (t * 0.0016) % TAU
      const plane = ((t * 0.00042) % 1) // a scan plane climbs the robot
      const zs = -6 + plane * 70
      const pingR = ping >= 0 ? ping * 0.2 : ((t * 0.00022) % 1) * 260 // a ping runs out over the floor now and then, or at a click
      let ci = -1, drawn = 0, locked = 0
      for (const p of pts) {
        let X = p.x, Y = p.y, Z = p.z
        if (p.kind === 1 && !still) Z += Math.max(0, 1 - Math.abs(p.r - pingR) / 16) * 3.2
        const x1 = X * cy_ - Y * sy_, y1 = X * sy_ + Y * cy_
        const zc = Z - 22
        const depth = y1 * cp + zc * sp, up = -y1 * sp + zc * cp
        const k = f / (D + depth)
        let sx = ox + x1 * k, sy = oy - up * k
        // the pointer pushes points away and lights them
        let near = 0
        const dx = sx - px, dy = sy - py, d2 = dx * dx + dy * dy
        if (d2 < 22500) { const d = Math.sqrt(d2) || 1; near = 1 - d / 150; sx += (dx / d) * near * 26; sy += (dy / d) * near * 26 }
        // how lit this point is: the sweep around the floor, the climbing plane on the robot, the ping
        const behind = ((sweep - p.a) % TAU + TAU) % TAU
        let lit = p.kind === 1 ? Math.exp(-behind * 1.7) * 0.8 : 0
        if (p.kind !== 1) lit = Math.max(lit, Math.exp(-Math.abs(p.z - zs) / 3.4))
        if (p.kind === 1) lit = Math.max(lit, Math.max(0, 1 - Math.abs(p.r - pingR) / 14))
        // build-up on load: the robot rises and the floor spreads out
        const order = p.kind === 1 ? p.r / 190 : p.z / 60
        const vis = Math.max(0, Math.min(1, reveal * 1.5 - order * 0.5))
        if (vis <= 0) continue
        const base = p.kind === 1 ? 0.27 : p.kind === 3 ? 0.14 : p.kind === 2 ? 0.95 : 0.5
        const a = Math.min(0.97, (base + lit * 0.62 + near * 0.35) * vis * (faint ? 0.6 : phone ? 0.55 : 1))
        if (a < 0.03) continue
        if (p.c !== ci) { ctx.fillStyle = COLOURS[p.c]; ci = p.c }
        ctx.globalAlpha = a
        drawn++; if (near > 0.5) locked++
        if (sx < -8 || sx > w + 8 || sy < -8 || sy > h + 8) continue
        const s = Math.min(4.2, Math.max(1, (p.kind === 1 ? 0.6 : p.kind === 3 ? 0.4 : 0.8) * k * (1 + lit * 0.5) * (faint ? 0.45 : 1) * (faint ? 1 : f / 1180 * (phone ? 1.1 : 1)) * (faint ? 1 : 1)))
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s)
      }
      ctx.globalAlpha = 1
      if (!faint) {
        // the eyes glow, and blink now and then
        const blink = still ? 1 : Math.abs(((t % 4300) - 4100) / 200) < 1 ? 0.15 : 1
        for (const sgn of [-1, 1]) {
          let sx = 0, sy = 0, n = 0
          for (const p of eyes) if (Math.sign(p.y) === sgn) {
            const x1 = p.x * cy_ - p.y * sy_, y1 = p.x * sy_ + p.y * cy_, zc = p.z - 22
            const k = f / (D + y1 * cp + zc * sp)
            sx += ox + x1 * k; sy += oy - (-y1 * sp + zc * cp) * k; n++
          }
          if (!n) continue
          sx /= n; sy /= n
          const rr = 3.4 * (f / (D + 0)) * blink
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, rr))
          g.addColorStop(0, 'rgba(180,250,255,.95)'); g.addColorStop(0.35, 'rgba(90,224,255,.55)'); g.addColorStop(1, 'rgba(90,224,255,0)')
          ctx.fillStyle = g; ctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2)
        }
        // a small readout beside the robot, like a scanner's HUD: corner brackets and live numbers from the same model that draws the points
        if (!phone) {
          const kk = f / D, bw = 210 * kk / 5.4, bh = 150 * kk / 5.4
          const x0 = ox - bw, y0 = oy - bh * 0.95, x1 = ox + bw, y1 = oy + bh * 0.75
          ctx.strokeStyle = '#7df0ff'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55
          for (const [bx, by, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ctx.beginPath(); ctx.moveTo(bx + dx * 16, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + dy * 16); ctx.stroke() }
          ctx.font = '11px ui-monospace, "IBM Plex Mono", Consolas, monospace'; ctx.fillStyle = '#9fe8ff'; ctx.globalAlpha = 0.8
          const lines = ['LIDAR  ROBODOG-01', `POINTS ${String(drawn).padStart(5, '0')}`, `SWEEP  ${String(Math.round((sweep / TAU) * 360)).padStart(3, '0')} DEG`, `SCAN Z ${Math.max(0, zs).toFixed(0).padStart(2, '0')} CM`]
          lines.forEach((l, i) => ctx.fillText(l, x0 + 4, y1 + 18 + i * 14))
          ctx.fillStyle = locked > 6 ? accent : '#6f86a8'
          ctx.fillText(locked > 6 ? 'TARGET LOCKED: VISITOR' : 'TARGET -', x0 + 4, y1 + 18 + lines.length * 14)
          ctx.globalAlpha = 1
        }
        // the targeting reticle follows the pointer
        if (px > -999 && !still) {
          ctx.strokeStyle = accent; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.85
          const rr = 20, rot = t * 0.0021
          for (let i = 0; i < 4; i++) { const a0 = rot + (i * TAU) / 4; ctx.beginPath(); ctx.arc(px, py, rr, a0, a0 + 0.9); ctx.stroke() }
          ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5); ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }

    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const dt = Math.min(48, now - (last || now)); last = now; t += dt
      if (ping >= 0) { ping += dt; if (ping > 1400) ping = -1 }
      if (onScreen && !document.hidden) paint()
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && !still) { last = 0; raf = requestAnimationFrame(frame) } }
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0 }

    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      px = e.clientX - r.left; py = e.clientY - r.top
      if (py < -60 || py > r.height + 60) { px = py = -9999; return }
      mx = Math.max(0, Math.min(1, px / Math.max(1, r.width))); my = Math.max(0, Math.min(1, py / Math.max(1, r.height)))
    }
    const down = (e: PointerEvent) => { const r = c.getBoundingClientRect(); if (e.clientY >= r.top && e.clientY <= r.bottom) ping = 0 }
    const leave = () => { px = py = -9999 }
    const vis = () => { if (document.hidden) stop(); else start() }
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop() }, { rootMargin: '80px' })
    io.observe(c.parentElement!)
    const ro = new ResizeObserver(() => { size(); paint() })
    ro.observe(c.parentElement!)
    size(); paint()
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', vis)
    start()
    return () => {
      alive = false; stop(); io.disconnect(); ro.disconnect()
      removeEventListener('pointermove', move); removeEventListener('pointerdown', down)
      document.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', vis)
    }
  }, [faint, reduce])
  return <canvas ref={ref} className={faint ? 'sensor faint' : 'sensor'} aria-hidden="true" />
}
