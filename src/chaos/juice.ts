// Small bits of feel for Chaos. A hit-stop freezes running animations for 40 to 60 ms on a big moment; it is skipped under reduced motion.
let busy = false
export function hitStop(ms = 50) {
  if (busy || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  busy = true
  const root = document.documentElement
  root.classList.add('hitstop')
  window.setTimeout(() => { root.classList.remove('hitstop'); busy = false }, Math.min(60, Math.max(40, ms)))
}
