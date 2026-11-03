import { useEffect, useRef } from 'react'
import { featured } from '../content'

/**
 * Achievements for actually looking at the work: opening every featured project, running the PID twin,
 * reading the About story (it stays on screen for four seconds), and finding the CV (opening it).
 */
export default function WorkAwards({ award }: { award: (id: string) => void }) {
  const opened = useRef(new Set<string>())
  useEffect(() => {
    const p = (e: Event) => {
      opened.current.add((e as CustomEvent<string>).detail)
      if (featured.every((s) => opened.current.has(s))) award('featured')
    }
    const s = (e: Event) => { if ((e as CustomEvent<string>).detail === 'pid') award('twin') }
    const c = (e: MouseEvent) => { if ((e.target as HTMLElement).closest?.('a[download]')) award('cv') }
    addEventListener('portfolio:project-open', p); addEventListener('portfolio:sim-play', s); document.addEventListener('click', c)
    let t = 0
    const el = document.getElementById('about')
    const io = el && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([en]) => { clearTimeout(t); if (en.isIntersecting) t = window.setTimeout(() => award('about'), 4000) }, { threshold: 0.6 })
      : null
    if (el && io) io.observe(el)
    return () => { removeEventListener('portfolio:project-open', p); removeEventListener('portfolio:sim-play', s); document.removeEventListener('click', c); io?.disconnect(); clearTimeout(t) }
  }, [award])
  return null
}
