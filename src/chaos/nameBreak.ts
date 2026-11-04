import Matter from 'matter-js'

/**
 * The name "Idris Sadiq" breaks into its letters, which tumble and bounce in a matter-js world the size of the window,
 * then settle back into the name (after a few seconds, or when the visitor taps it). The letters stay in the page (so the heading's own
 * aria-label still names it) and are only moved with a transform; the world has a floor and both side walls, so none can leave the window.
 */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const state = new WeakMap<HTMLElement, { stop: (early?: boolean) => void }>()

export const isBroken = (h: HTMLElement) => h.dataset.broken === '1'

export function breakName(h: HTMLElement, opts: { ms?: number; onDone?: () => void } = {}): boolean {
  if (state.has(h)) return false
  const letters = [...h.querySelectorAll<HTMLElement>('.ltr')]
  if (!letters.length) return false
  // reduced motion: the name stays whole and only wobbles a little
  if (reduced()) {
    h.classList.add('name-wobble')
    const t = window.setTimeout(() => { h.classList.remove('name-wobble'); state.delete(h); opts.onDone?.() }, 900)
    state.set(h, { stop: () => { clearTimeout(t); h.classList.remove('name-wobble'); state.delete(h) } })
    return true
  }
  const { Engine, Bodies, Body, Composite } = Matter
  const engine = Engine.create({ gravity: { x: 0, y: 1.2, scale: 0.0012 } })
  const W = innerWidth, H = innerHeight
  const rects = letters.map((l) => l.getBoundingClientRect())
  const floor = Bodies.rectangle(W / 2, H + 40, W + 400, 80, { isStatic: true })
  const left = Bodies.rectangle(-40, H / 2, 80, H * 4, { isStatic: true })
  const right = Bodies.rectangle(W + 40, H / 2, 80, H * 4, { isStatic: true })
  const bodies = rects.map((r) => {
    const b = Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, Math.max(8, r.width * 0.85), Math.max(8, r.height * 0.7), { restitution: 0.62, friction: 0.25, frictionAir: 0.004 })
    Body.setVelocity(b, { x: (Math.random() - 0.5) * 9, y: -(3 + Math.random() * 7) })
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.35)
    return b
  })
  Composite.add(engine.world, [floor, left, right, ...bodies])
  h.dataset.broken = '1'
  letters.forEach((l) => { l.style.transition = 'none'; l.style.willChange = 'transform' })
  let raf = 0, last = 0, alive = true
  const total = opts.ms ?? 4200
  let done = 0
  const frame = (now: number) => {
    if (!alive) return
    const dt = Math.min(33, now - (last || now)); last = now
    Engine.update(engine, dt)
    bodies.forEach((b, i) => {
      const r = rects[i]
      letters[i].style.transform = `translate(${b.position.x - (r.left + r.width / 2)}px, ${b.position.y - (r.top + r.height / 2)}px) rotate(${b.angle}rad)`
    })
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  const stop = () => {
    if (!alive) return
    alive = false
    cancelAnimationFrame(raf); clearTimeout(done)
    // back into place: the letters glide home, then everything is cleaned up
    letters.forEach((l, i) => { l.style.transition = `transform .8s cubic-bezier(.34, 1.4, .64, 1) ${i * 25}ms`; l.style.transform = 'none' })
    window.setTimeout(() => {
      letters.forEach((l) => { l.style.transition = ''; l.style.transform = ''; l.style.willChange = '' })
      delete h.dataset.broken
      Composite.clear(engine.world, false)
      state.delete(h)
      opts.onDone?.()
    }, 1100)
  }
  done = window.setTimeout(stop, total)
  state.set(h, { stop })
  return true
}

/** A tap on a broken name puts it back right away. */
export function reassembleName(h: HTMLElement) { state.get(h)?.stop(true) }
