import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Content fades up 8 px once, the first time it scrolls into view. Nothing else moves. */
export function Reveal({ children, delay = 0, as: Tag = 'div' }: { children: ReactNode; delay?: number; as?: 'div' | 'li' | 'p' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const P = Tag as 'div'
  return <P ref={ref} className={`rv${seen ? ' in' : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</P>
}

/** A number that counts up to its value once, when it first appears (600 ms), then stays still. */
export function Tick({ to, locale }: { to: number; locale: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [v, setV] = useState(to)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return
    setV(0)
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const run = (now: number) => {
        const k = Math.min(1, (now - t0) / 600)
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(run)
      }
      raf = requestAnimationFrame(run)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [to])
  return <span ref={ref} className="tabnum">{v.toLocaleString(locale)}</span>
}
