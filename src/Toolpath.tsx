import { useEffect, useRef, useState } from 'react'

/**
 * A toolpath down the right edge of the page. It plots as you scroll, like a plotter drawing a path: a straight run with a short 45 degree
 * jog at every waypoint, and a small square waypoint marker for each section. The markers are links that jump to the section.
 * It replaces a progress bar. Under reduced motion it simply shows the current progress without easing.
 */
type WP = { id: string; label: string }
export default function Toolpath({ points, label }: { points: WP[]; label: string }) {
  const path = useRef<SVGPathElement>(null)
  const drawn = useRef<SVGPathElement>(null)
  const [geom, setGeom] = useState<{ h: number; ys: number[] }>({ h: 600, ys: [] })
  const [active, setActive] = useState(-1)
  const lenRef = useRef(0)
  const pctRef = useRef(0)
  const [len, setLen] = useState(0)

  // where each waypoint sits along the path: its share of the page height
  useEffect(() => {
    const layout = () => {
      const h = innerHeight - 120
      const doc = Math.max(1, document.documentElement.scrollHeight - innerHeight)
      const ys = points.map((p) => {
        const el = document.getElementById(p.id)
        const top = el ? el.getBoundingClientRect().top + scrollY - 80 : 0
        return Math.max(8, Math.min(h - 8, (top / doc) * h))
      })
      setGeom({ h, ys })
    }
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(document.documentElement)
    addEventListener('resize', layout)
    const late = window.setTimeout(layout, 800) // images and the figures settle after load
    return () => { ro.disconnect(); removeEventListener('resize', layout); clearTimeout(late) }
  }, [points])

  const d = (() => {
    // x = 8 on the main run; between waypoints the run jogs to x = 16 and back with 45 degree corners
    let out = 'M8 0'
    let y = 0
    const stops = [...geom.ys, geom.h]
    stops.forEach((sy, i) => {
      const j = Math.max(y, sy - 14)
      out += ` L8 ${j}`
      if (i < stops.length - 1) out += ` L16 ${j + 8} L16 ${Math.max(j + 8, sy - 6)} L8 ${Math.max(j + 16, sy + 2)}`
      y = Math.max(j + 16, sy + 2)
    })
    return out + ` L8 ${geom.h}`
  })()

  useEffect(() => {
    if (!path.current) return
    const l = path.current.getTotalLength(); lenRef.current = l; setLen(l)
    if (drawn.current) drawn.current.style.strokeDashoffset = String(l * (1 - pctRef.current))
  }, [d])

  useEffect(() => {
    let raf = 0
    const upd = () => {
      raf = 0
      const doc = Math.max(1, document.documentElement.scrollHeight - innerHeight)
      const p = Math.max(0, Math.min(1, scrollY / doc))
      if (drawn.current) drawn.current.style.strokeDashoffset = String(lenRef.current * (1 - p)) // written straight to the path: no re-render per scroll frame
      pctRef.current = p
      let a = -1
      points.forEach((pt, i) => { const el = document.getElementById(pt.id); if (el && el.getBoundingClientRect().top < innerHeight * 0.45) a = i })
      setActive(a)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(upd) }
    upd()
    addEventListener('scroll', on, { passive: true })
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [points])

  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }

  return (
    <nav className="toolpath" aria-label={label} style={{ height: geom.h }}>
      <svg width="28" height={geom.h} viewBox={`0 0 28 ${geom.h}`} aria-hidden="true">
        <path ref={path} d={d} className="tp-base" />
        <path ref={drawn} d={d} className="tp-done" style={{ strokeDasharray: len }} />
      </svg>
      {points.map((p, i) => (
        <a key={p.id} href={`#${p.id}`} className={`tp-wp${active === i ? ' on' : ''}`} style={{ top: geom.ys[i] ?? 0 }} onClick={go(p.id)} aria-label={p.label} aria-current={active === i ? 'location' : undefined}>
          <i /><span>{p.label}</span>
        </a>
      ))}
    </nav>
  )
}
