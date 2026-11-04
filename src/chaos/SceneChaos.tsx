import { useEffect, useRef } from 'react'
import Matter from 'matter-js'

/**
 * Chaos for the hero scene. The mascot hops and spins, throws things (cubes, balls, triangles) into a matter-js world that fills the scene,
 * and panics when the coffee flood comes. The plants wobble (CSS) and the moon is the Moon gag (HeroScene). It draws on a canvas laid over the
 * scene, never takes the pointer, never reaches outside the scene (so it can never cover text), and stops when the scene is off screen.
 */
const COLOURS = ['#ee6a4c', '#f2b441', '#9ed9cb', '#afcbea', '#fff8ea']

export default function SceneChaos({ scene }: { scene: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const host = scene.current, c = ref.current
    const ctx = c?.getContext('2d')
    if (!host || !c || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const { Engine, Bodies, Body, Composite } = Matter
    const engine = Engine.create({ gravity: { x: 0, y: 1.1, scale: 0.001 } })
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, alive = true, onScreen = true, next = 1800, spinAt = 5200, t = 0
    let walls: Matter.Body[] = []
    const mascot = () => host.querySelector<SVGGElement>('.mascot')
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2)
      w = host.clientWidth; h = host.clientHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      Composite.remove(engine.world, walls)
      const floor = h * 0.9 // the ground line of the scene
      walls = [Bodies.rectangle(w / 2, floor + 30, w + 200, 60, { isStatic: true }), Bodies.rectangle(-30, h / 2, 60, h * 3, { isStatic: true }), Bodies.rectangle(w + 30, h / 2, 60, h * 3, { isStatic: true })]
      Composite.add(engine.world, walls)
    }
    const throwSomething = () => {
      const m = mascot()
      if (!m) return
      const r = m.getBoundingClientRect(), hr = host.getBoundingClientRect()
      const x = r.left - hr.left + r.width * 0.15, y = r.top - hr.top + r.height * 0.3
      const kind = Math.floor(Math.random() * 3), s = 14 + Math.random() * 10
      const opts = { restitution: 0.6, friction: 0.1, render: { fillStyle: COLOURS[Math.floor(Math.random() * COLOURS.length)] } }
      const b = kind === 0 ? Bodies.rectangle(x, y, s * 1.6, s * 1.6, opts) : kind === 1 ? Bodies.circle(x, y, s, opts) : Bodies.polygon(x, y, 3, s * 1.2, opts)
      Body.setVelocity(b, { x: -(5 + Math.random() * 9), y: -(7 + Math.random() * 7) })
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.4)
      ;(b as Matter.Body & { born?: number }).born = t
      Composite.add(engine.world, b)
      const bodies = Composite.allBodies(engine.world).filter((q) => !q.isStatic)
      if (bodies.length > 14) Composite.remove(engine.world, bodies[0])
    }
    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const dt = Math.min(33, now - (last || now)); last = now; t += dt
      if (onScreen && !document.hidden) {
        Engine.update(engine, dt)
        next -= dt; spinAt -= dt
        if (next <= 0) { throwSomething(); next = 2200 + Math.random() * 2200 }
        if (spinAt <= 0) { const m = mascot(); m?.classList.add('spin'); window.setTimeout(() => m?.classList.remove('spin'), 800); spinAt = 6000 + Math.random() * 4000 }
        ctx.clearRect(0, 0, w, h)
        ctx.lineWidth = 3; ctx.strokeStyle = '#1e2128'; ctx.lineJoin = 'round'
        for (const b of Composite.allBodies(engine.world)) {
          if (b.isStatic) continue
          const born = (b as Matter.Body & { born?: number }).born ?? t
          const age = (t - born) / 1000
          if (age > 9) { Composite.remove(engine.world, b); continue }
          ctx.globalAlpha = age > 7.5 ? Math.max(0, (9 - age) / 1.5) : 1
          ctx.fillStyle = (b.render as { fillStyle?: string }).fillStyle ?? '#ee6a4c'
          ctx.beginPath(); b.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); ctx.fill(); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (!raf && !reduced) { last = 0; raf = requestAnimationFrame(frame) } }
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0 }
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop() }, { rootMargin: '60px' })
    io.observe(host)
    const ro = new ResizeObserver(size); ro.observe(host)
    size()
    // the coffee flood: the mascot panics for a few seconds
    let panic = 0
    const coffee = () => { host.classList.add('panic'); clearTimeout(panic); panic = window.setTimeout(() => host.classList.remove('panic'), 3500); next = 200 }
    addEventListener('portfolio:coffee', coffee)
    const vis = () => { if (document.hidden) stop(); else start() }
    document.addEventListener('visibilitychange', vis)
    start()
    return () => { alive = false; stop(); io.disconnect(); ro.disconnect(); removeEventListener('portfolio:coffee', coffee); document.removeEventListener('visibilitychange', vis); clearTimeout(panic); host.classList.remove('panic'); Composite.clear(engine.world, false) }
  }, [scene])
  return <canvas ref={ref} className="scene-chaos" aria-hidden="true" />
}
