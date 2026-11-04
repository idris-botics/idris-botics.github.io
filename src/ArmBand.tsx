import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { useReducedMotion } from './lib/hooks'

/**
 * The workbench: a blueprint-style robot arm (three links and a gripper) in a strip under the hero.
 *
 * It uses real planar inverse kinematics. The wrist is placed above the target with the gripper pointing down, a two-link solution finds the
 * shoulder and elbow, joint limits are enforced, and each joint follows its target through a damped spring. The arm reaches toward the cursor (or
 * the finger). When the visitor stops, it idles with a slow pick-and-place of a small orange cube between two trays. A click sends it to grab
 * (or drop) the cube. A telemetry corner shows the joint angles and a scrolling trace of the end-effector error, like the PID twin.
 *
 * Chaos is the same workbench gone wrong: the damping drops so the arm overshoots, the wrist spins, the cube is thrown across the strip and bounces,
 * the arm chases it, and a coffee cup is dropped once the coffee secret is found.
 *
 * Canvas 2D, a few dozen strokes per frame. It runs only while on screen and the tab is visible, caps the pixel ratio at 2, draws one still pose
 * under reduced motion, and is aria-hidden: nothing important lives only here.
 */
const TAU = Math.PI * 2
const deg = (r: number) => (r * 180) / Math.PI
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

type Joint = { a: number; w: number } // angle (radians, relative) and angular velocity

export default function ArmBand() {
  const wrap = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const chaos = useStore((s) => s.mode === 'chaos')
  const reduce = useReducedMotion()
  useEffect(() => {
    const c = ref.current, box = wrap.current
    const ctx = c?.getContext('2d')
    if (!c || !box || !ctx) return
    const touchy = matchMedia('(pointer: coarse)').matches
    let w = 0, h = 0, dpr = 1, u = 1, raf = 0, last = 0, t = 0, alive = true, onScreen = true
    let bx = 0, by = 0, L = [0, 0, 0], floor = 0
    // pointer in viewport coordinates, and when it last moved
    let px = 0, py = 0, moved = -1e9, click: { x: number; y: number } | null = null
    const J: Joint[] = [{ a: 1.9, w: 0 }, { a: -1.5, w: 0 }, { a: -0.3, w: 0 }]
    let grip = 0.6 // 0 closed, 1 open
    let spin = 0
    const cube = { x: 0, y: 0, vx: 0, vy: 0, held: false, flying: false }
    let slotA = 0, slotB = 0, state = 0, stateT = 0
    const trace: number[] = new Array(96).fill(0)
    let traceAcc = 0
    const cup = { on: false, x: 0, y: 0, vy: 0, t: 0 }
    let target = { x: 0, y: 0 }, tip = { x: 0, y: 0 }
    const colours = { ink: '#1c1b19', muted: '#6b675f', accent: '#ff5a1f', paper: '#f4f2ee' }
    const readColours = () => {
      const cs = getComputedStyle(document.documentElement)
      colours.ink = cs.getPropertyValue('--ink').trim() || colours.ink
      colours.muted = cs.getPropertyValue('--muted').trim() || colours.muted
      colours.accent = cs.getPropertyValue('--accent').trim() || colours.accent
      colours.paper = cs.getPropertyValue('--bg').trim() || colours.paper
    }

    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      w = box.clientWidth; h = box.clientHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      u = Math.min(1.12, h / 232)
      L = [104 * u, 88 * u, 50 * u]
      bx = w * (w > 760 ? 0.5 : 0.5); by = h - 12 * u; floor = by
      slotA = bx - 150 * u * (w > 560 ? 1 : 0.7); slotB = bx + 150 * u * (w > 560 ? 1 : 0.7)
      if (!cube.held && !cube.flying) { cube.x = slotA; cube.y = floor - 9 * u }
      readColours()
    }

    // ---- inverse kinematics: gripper pointing down, wrist straight above the target
    const solve = (tx: number, ty: number): [number, number, number] => {
      const j0x = bx, j0y = by - 16 * u
      const wx = tx - j0x, wy = j0y - (ty - L[2]) // wrist, y up, relative to the shoulder
      const reach = L[0] + L[1], d = clamp(Math.hypot(wx, wy), Math.abs(L[0] - L[1]) + 4, reach - 1)
      const ang = Math.atan2(wy, wx)
      const a1 = Math.acos(clamp((L[0] * L[0] + d * d - L[1] * L[1]) / (2 * L[0] * d), -1, 1))
      const a2 = Math.acos(clamp((L[0] * L[0] + L[1] * L[1] - d * d) / (2 * L[0] * L[1]), -1, 1))
      const th1 = clamp(ang + a1, 0.15, Math.PI - 0.15)            // shoulder, from +x, y up
      const th2 = clamp(-(Math.PI - a2), -2.7, -0.25)               // elbow, relative
      const th3 = clamp(-Math.PI / 2 - th1 - th2, -1.8, 1.8)        // wrist keeps the gripper pointing down
      return [th1, th2, th3]
    }
    const forward = () => {
      const j0 = { x: bx, y: by - 16 * u }
      const a1 = J[0].a, a2 = a1 + J[1].a, a3 = a2 + J[2].a
      const j1 = { x: j0.x + L[0] * Math.cos(a1), y: j0.y - L[0] * Math.sin(a1) }
      const j2 = { x: j1.x + L[1] * Math.cos(a2), y: j1.y - L[1] * Math.sin(a2) }
      const j3 = { x: j2.x + L[2] * Math.cos(a3), y: j2.y - L[2] * Math.sin(a3) }
      return { j0, j1, j2, j3, a3 }
    }

    // ---- what the arm is trying to do
    const idleTarget = () => {
      const lift = floor - 74 * u, down = floor - 22 * u
      const A = slotA, B = slotB
      switch (state) {
        case 0: return { x: bx, y: lift, grip: 1, dur: 0.7 }
        case 1: return { x: A, y: lift, grip: 1, dur: 1.1 }
        case 2: return { x: A, y: down, grip: 1, dur: 0.9 }
        case 3: return { x: A, y: down, grip: 0.05, dur: 0.5 }
        case 4: return { x: A, y: lift, grip: 0.05, dur: 0.9 }
        case 5: return { x: B, y: lift, grip: 0.05, dur: 1.2 }
        case 6: return { x: B, y: down, grip: 0.05, dur: 0.9 }
        case 7: return { x: B, y: down, grip: 1, dur: 0.5 }
        default: return { x: B, y: lift, grip: 1, dur: 0.7 }
      }
    }
    const swapSlots = () => { const s = slotA; slotA = slotB; slotB = s }

    const step = (dt: number, now: number) => {
      const active = now - moved < 2600
      let gripWant = 1
      const rmax = L[0] + L[1] + L[2] * 0.5
      if (chaos && (cube.flying || (!cube.held && Math.abs(cube.y - (floor - 9 * u)) < 3 && Math.hypot(cube.vx, cube.vy) < 20 && now - moved > 1200 && !active && state === 0))) {
        // chaos: chase the cube too eagerly
        target = { x: clamp(cube.x + Math.sin(t * 6) * 18 * u, bx - rmax, bx + rmax), y: clamp(cube.y - 10 * u, 20, floor - 12 * u) }
        gripWant = Math.hypot(tip.x - cube.x, tip.y - cube.y) < 28 * u ? 0.05 : 1
        if (!cube.held && gripWant < 0.2 && Math.hypot(cube.vx, cube.vy) < 60) { cube.held = true; cube.flying = false; state = 5; stateT = 0 }
      } else if (active || click) {
        const dx = px - (box.getBoundingClientRect().left + bx), dy = py - (box.getBoundingClientRect().top + by)
        const dist = Math.hypot(dx, dy) || 1
        const k = Math.min(1, (rmax * 0.96) / dist)
        target = { x: bx + dx * k, y: clamp(by + dy * k, 24 * u, floor - 14 * u) }
        gripWant = cube.held ? 0.05 : 0.7
        if (click) {
          const cx = click.x - box.getBoundingClientRect().left, cy = click.y - box.getBoundingClientRect().top
          click = null
          if (cube.held) { cube.held = false; cube.vx = (Math.random() - 0.5) * 40; cube.vy = 0; cube.flying = true }
          else if (Math.hypot(cx - cube.x, cy - cube.y) < 120 * u) { target = { x: cube.x, y: cube.y }; }
        }
        if (!cube.held && !cube.flying && Math.hypot(tip.x - cube.x, tip.y - cube.y) < 14 * u && active) cube.held = true
      } else {
        stateT += dt
        const s = idleTarget()
        target = { x: s.x, y: s.y }; gripWant = s.grip
        if (stateT > s.dur) {
          stateT = 0; state++
          if (state === 4 && !cube.held && Math.hypot(tip.x - cube.x, tip.y - cube.y) < 30 * u) cube.held = true
          if (state === 8) {
            if (cube.held) { cube.held = false; cube.x = slotB; cube.y = floor - 9 * u }
            if (chaos && Math.random() < 0.5) { cube.held = false; cube.flying = true; cube.vx = (Math.random() < 0.5 ? -1 : 1) * (260 + Math.random() * 220) * u; cube.vy = -(300 + Math.random() * 200) * u; cube.x = tip.x; cube.y = tip.y }
            swapSlots(); state = 0
          }
        }
      }
      grip += (gripWant - grip) * (1 - Math.exp(-dt / 0.12))
      const goal = solve(target.x, target.y)
      const k = chaos ? 300 : 150, zeta = chaos ? 0.22 : 0.82, cdamp = 2 * zeta * Math.sqrt(k)
      for (let i = 0; i < 3; i++) {
        // the joint targets are absolute for the shoulder and relative for the others
        J[i].w += ((goal[i] - J[i].a) * k - J[i].w * cdamp) * dt
        J[i].a += J[i].w * dt
      }
      if (chaos) spin += dt * (active ? 9 : 4)
      const f = forward()
      tip = { x: f.j3.x, y: f.j3.y }
      if (cube.held) { cube.x = tip.x; cube.y = tip.y + 8 * u; cube.vx = cube.vy = 0 }
      else if (cube.flying || cube.y < floor - 9 * u - 0.5) {
        cube.vy += 1100 * u * dt; cube.x += cube.vx * dt; cube.y += cube.vy * dt
        const half = 9 * u
        if (cube.y > floor - half) { cube.y = floor - half; cube.vy *= -0.5; cube.vx *= 0.8; if (Math.abs(cube.vy) < 40) { cube.vy = 0; if (Math.abs(cube.vx) < 12) { cube.vx = 0; cube.flying = false } } }
        if (cube.x < half) { cube.x = half; cube.vx = Math.abs(cube.vx) * 0.6 }
        if (cube.x > w - half) { cube.x = w - half; cube.vx = -Math.abs(cube.vx) * 0.6 }
        if (cube.vx) cube.x += 0 // (the cube keeps sliding until the damping above stops it)
      }
      if (cup.on) { cup.vy += 900 * u * dt; cup.y += cup.vy * dt; cup.t += dt; if (cup.y > floor - 8 * u) { cup.y = floor - 8 * u; cup.vy *= -0.35 } if (cup.t > 3.5) cup.on = false }
      traceAcc += dt
      if (traceAcc > 0.05) { traceAcc = 0; trace.push(Math.hypot(target.x - tip.x, target.y - tip.y)); trace.shift() }
    }

    // ---- drawing
    const capsule = (x1: number, y1: number, x2: number, y2: number, r: number) => {
      const a = Math.atan2(y2 - y1, x2 - x1)
      ctx.beginPath()
      ctx.arc(x1, y1, r, a + Math.PI / 2, a + (3 * Math.PI) / 2)
      ctx.lineTo(x2 + r * Math.cos(a - Math.PI / 2), y2 + r * Math.sin(a - Math.PI / 2))
      ctx.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2)
      ctx.closePath()
    }
    const mono = (s: number) => `${s}px "IBM Plex Mono", ui-monospace, monospace`
    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      const ink = colours.ink, lw = chaos ? 3 : 1.25
      const f = forward()
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      // floor line with ticks, and the two trays
      ctx.strokeStyle = ink; ctx.globalAlpha = chaos ? 1 : 0.55; ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(0, floor + 1); ctx.lineTo(w, floor + 1); ctx.stroke()
      ctx.globalAlpha = chaos ? 0.6 : 0.3; ctx.beginPath()
      for (let x = 0; x < w; x += 12) { ctx.moveTo(x, floor + 1); ctx.lineTo(x - 6, floor + 7) }
      ctx.stroke()
      ctx.globalAlpha = chaos ? 1 : 0.6
      for (const sx of [bx - 150 * u * (w > 560 ? 1 : 0.7), bx + 150 * u * (w > 560 ? 1 : 0.7)]) { ctx.strokeRect(sx - 30 * u, floor - 4 * u, 60 * u, 4 * u); ctx.fillStyle = colours.paper; ctx.globalAlpha = 1 }
      // the reach arc and the base
      ctx.globalAlpha = chaos ? 0.5 : 0.22; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(f.j0.x, f.j0.y, L[0] + L[1] + L[2] * 0.5, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); ctx.setLineDash([])
      ctx.globalAlpha = chaos ? 1 : 0.8; ctx.fillStyle = colours.paper
      ctx.beginPath(); ctx.moveTo(bx - 28 * u, floor); ctx.lineTo(bx - 18 * u, by - 30 * u); ctx.lineTo(bx + 18 * u, by - 30 * u); ctx.lineTo(bx + 28 * u, floor); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.globalAlpha = chaos ? 0.7 : 0.35; ctx.beginPath()
      for (let i = -2; i <= 2; i++) { ctx.moveTo(bx + i * 9 * u - 7 * u, floor - 2); ctx.lineTo(bx + i * 9 * u + 3 * u, by - 28 * u) }
      ctx.stroke()
      // links
      ctx.globalAlpha = chaos ? 1 : 0.85
      const links: [typeof f.j0, typeof f.j1, number][] = [[f.j0, f.j1, 9 * u], [f.j1, f.j2, 7.5 * u], [f.j2, f.j3, 5.5 * u]]
      links.forEach(([a, b, r], i) => {
        capsule(a.x, a.y, b.x, b.y, r)
        ctx.fillStyle = chaos ? ['#ffd45e', '#ff8fb1', '#7ad7ff'][i] : colours.paper
        ctx.fill(); ctx.stroke()
        if (!chaos) { ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 0.85 }
      })
      // joints with crosshairs and angle labels
      ctx.globalAlpha = 1
      ;[f.j0, f.j1, f.j2].forEach((j, i) => {
        ctx.fillStyle = chaos ? '#fffaf0' : colours.paper
        ctx.beginPath(); ctx.arc(j.x, j.y, 6.5 * u, 0, TAU); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.arc(j.x, j.y, 1.8 * u, 0, TAU); ctx.fillStyle = ink; ctx.fill()
        if (!chaos) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(j.x - 12 * u, j.y); ctx.lineTo(j.x - 8 * u, j.y); ctx.moveTo(j.x + 8 * u, j.y); ctx.lineTo(j.x + 12 * u, j.y); ctx.stroke(); ctx.globalAlpha = 1 }
        if (w > 520 && !chaos) { ctx.font = mono(Math.max(9, 10 * u)); ctx.fillStyle = colours.muted; const val = i === 0 ? deg(J[0].a) : deg(J[i].a); ctx.fillText(`θ${i + 1} ${val.toFixed(1).padStart(6, ' ')}`, j.x + 10 * u, j.y - 9 * u) }
      })
      // gripper: a palm bar and two fingers, opening with `grip`
      const g = (3 + grip * 9) * u
      ctx.save(); ctx.translate(f.j3.x, f.j3.y); ctx.rotate(-f.a3 - Math.PI / 2 + (chaos ? spin : 0))
      ctx.strokeStyle = ink; ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(-g - 2 * u, 0); ctx.lineTo(g + 2 * u, 0); ctx.moveTo(-g, 0); ctx.lineTo(-g, 14 * u); ctx.lineTo(-g + 3 * u, 14 * u); ctx.moveTo(g, 0); ctx.lineTo(g, 14 * u); ctx.lineTo(g - 3 * u, 14 * u); ctx.stroke()
      ctx.restore()
      // the cube
      const s = 18 * u
      ctx.fillStyle = colours.accent; ctx.strokeStyle = ink; ctx.lineWidth = lw
      ctx.globalAlpha = 1
      ctx.fillRect(cube.x - s / 2, cube.y - s / 2, s, s); ctx.strokeRect(cube.x - s / 2, cube.y - s / 2, s, s)
      // a dimension line from the base to the gripper: how far it has reached
      if (!chaos && w > 520) {
        const dyy = floor + 16 * u
        ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.strokeStyle = ink; ctx.fillStyle = colours.muted
        ctx.beginPath(); ctx.moveTo(bx, floor + 2); ctx.lineTo(bx, dyy + 4); ctx.moveTo(tip.x, floor + 2); ctx.lineTo(tip.x, dyy + 4); ctx.moveTo(bx, dyy); ctx.lineTo(tip.x, dyy)
        const dir = Math.sign(tip.x - bx) || 1
        ctx.moveTo(bx, dyy); ctx.lineTo(bx + dir * 6, dyy - 3); ctx.moveTo(bx, dyy); ctx.lineTo(bx + dir * 6, dyy + 3)
        ctx.moveTo(tip.x, dyy); ctx.lineTo(tip.x - dir * 6, dyy - 3); ctx.moveTo(tip.x, dyy); ctx.lineTo(tip.x - dir * 6, dyy + 3)
        ctx.stroke(); ctx.font = mono(9)
        ctx.fillText(`${(Math.abs(tip.x - bx) / (96 / 25.4)).toFixed(1)} MM`, (bx + tip.x) / 2 - 18, dyy - 4)
      }
      // telemetry corner: joint angles and a trace of the end-effector error
      if (w > 520) {
        const tx = w - 168, ty = 8
        ctx.globalAlpha = chaos ? 1 : 0.9
        ctx.fillStyle = chaos ? '#fffaf0' : colours.paper; ctx.strokeStyle = ink; ctx.lineWidth = chaos ? 2 : 1
        ctx.fillRect(tx - 8, ty - 2, 168, 70); ctx.strokeRect(tx - 8, ty - 2, 168, 70)
        ctx.fillStyle = colours.muted; ctx.font = mono(10)
        ctx.fillText(`J1 ${deg(J[0].a).toFixed(1).padStart(6, ' ')}  J2 ${deg(J[1].a).toFixed(1).padStart(6, ' ')}`, tx, ty + 11)
        ctx.fillText(`J3 ${deg(J[2].a).toFixed(1).padStart(6, ' ')}  G  ${(grip * 100).toFixed(0).padStart(3, ' ')}%`, tx, ty + 24)
        ctx.strokeStyle = colours.accent; ctx.lineWidth = 1.4; ctx.beginPath()
        trace.forEach((e, i) => { const x = tx + (i / (trace.length - 1)) * 144, y = ty + 62 - Math.min(26, e * 0.12); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) })
        ctx.stroke()
        ctx.fillStyle = colours.muted; ctx.fillText('ERR', tx, ty + 62)
      }
      // chaos: the coffee cup
      if (cup.on) { ctx.globalAlpha = Math.min(1, 3.5 - cup.t); ctx.font = `${28 * u}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.fillText('☕', cup.x - 12, cup.y) }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const dt = Math.min(0.04, (now - (last || now)) / 1000); last = now; t += dt
      if (onScreen && !document.hidden) { step(dt, now); paint() }
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame) } }
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0 }

    const move = (e: PointerEvent) => { px = e.clientX; py = e.clientY; moved = performance.now() }
    const down = (e: PointerEvent) => {
      const r = box.getBoundingClientRect()
      if (e.clientY > r.top - 60 && e.clientY < r.bottom + 60) { px = e.clientX; py = e.clientY; moved = performance.now(); click = { x: e.clientX, y: e.clientY } }
    }
    const coffee = () => { cup.on = true; cup.x = tip.x; cup.y = tip.y; cup.vy = 0; cup.t = 0 }
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop() }, { rootMargin: '60px' })
    io.observe(box)
    const ro = new ResizeObserver(() => { size(); if (reduce) pose(); else paint() })
    ro.observe(box)
    const mo = new MutationObserver(() => { readColours(); if (reduce) paint() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] })
    const vis = () => { if (document.hidden) stop(); else start() }
    // reduced motion: one still pose, the arm just having set the cube down
    const pose = () => {
      const goal = solve(slotB, floor - 22 * u); for (let i = 0; i < 3; i++) { J[i].a = goal[i]; J[i].w = 0 }
      grip = 1; const f = forward(); tip = { x: f.j3.x, y: f.j3.y }; cube.x = slotB; cube.y = floor - 9 * u; target = { x: slotB, y: floor - 22 * u }
      paint()
    }
    size()
    if (reduce) pose(); else { const g = solve(bx, floor - 74 * u); for (let i = 0; i < 3; i++) J[i].a = g[i]; paint() }
    if (!touchy) addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    if (touchy) addEventListener('pointermove', move, { passive: true })
    addEventListener('portfolio:coffee', coffee)
    document.addEventListener('visibilitychange', vis)
    start()
    return () => {
      alive = false; stop(); io.disconnect(); ro.disconnect(); mo.disconnect()
      removeEventListener('pointermove', move); removeEventListener('pointerdown', down); removeEventListener('portfolio:coffee', coffee)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [chaos, reduce])
  return (
    <div ref={wrap} className={chaos ? 'armband chaos' : 'armband'}>
      <canvas ref={ref} aria-hidden="true" />
    </div>
  )
}
