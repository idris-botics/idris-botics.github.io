import { useEffect, useRef, useState } from 'react'

/** A section heading with a dimension line under it (|<--  -->|) that draws itself once, when the heading first comes into view. */
export function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <h2 id={id} ref={ref} className={`dim-h${seen ? ' in' : ''}`}>
      <span>{children}</span>
      <svg className="dim-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path d="M.5 0v10M99.5 0v10M3 5h94M3 5l5-3M3 5l5 3M97 5l-5-3M97 5l-5 3" />
      </svg>
    </h2>
  )
}
