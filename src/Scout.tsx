import { useEffect, useRef } from 'react'

// "Scout": original mascot (a small round-visor robot). Eyes follow the cursor.
export default function Scout({ size = 120, mood = 'off' }: { size?: number; mood?: 'off' | 'wired' | 'crashed' }) {
  const l = useRef<SVGCircleElement>(null)
  const r = useRef<SVGCircleElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (e: MouseEvent) => {
      const b = svg.current!.getBoundingClientRect()
      const dx = e.clientX - (b.left + b.width / 2)
      const dy = e.clientY - (b.top + b.height / 2)
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(5, d / 40)
      const ox = (dx / d) * k, oy = (dy / d) * k
      l.current?.setAttribute('transform', `translate(${ox} ${oy})`)
      r.current?.setAttribute('transform', `translate(${ox} ${oy})`)
    }
    addEventListener('mousemove', move)
    return () => removeEventListener('mousemove', move)
  }, [])
  return (
    <svg ref={svg} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={mood === 'off' ? 'bob' : `bob ${mood}`}>
      <g className="ant"><line x1="60" y1="8" x2="60" y2="24" stroke="#9aa6c8" strokeWidth="4" /><circle cx="60" cy="8" r="6" fill="#ffd45e" /></g>
      <rect x="20" y="24" width="80" height="62" rx="22" fill="#e8ecf8" stroke="#1b2340" strokeWidth="4" />
      <rect x="30" y="36" width="60" height="36" rx="16" fill="#1b2340" />
      <circle cx="48" cy="54" r={mood === 'wired' ? 12 : 9} fill="#fff" />
      <circle cx="72" cy="54" r={mood === 'wired' ? 12 : 9} fill="#fff" />
      {mood === 'wired' ? (
        // wide eyes with little spiral pupils
        [48, 72].map((cx) => <path key={cx} className="spiral" d={`M${cx} 54 a1.5 1.5 0 1 1 3 0 a3 3 0 1 1 -6 0 a4.5 4.5 0 1 1 9 0 a6 6 0 1 1 -12 0 a7.5 7.5 0 1 1 15 0`} fill="none" stroke="#1b2340" strokeWidth="1.6" strokeLinecap="round" />)
      ) : (
        <>
          <circle ref={l} cx="48" cy="54" r="4.5" fill="#6cd4ff" />
          <circle ref={r} cx="72" cy="54" r="4.5" fill="#6cd4ff" />
        </>
      )}
      {mood === 'crashed' && <><rect x="38" y="43" width="20" height="11" rx="3" fill="#1b2340" /><rect x="62" y="43" width="20" height="11" rx="3" fill="#1b2340" /></>}
      <rect x="40" y="88" width="40" height="22" rx="8" fill="#b9a8ff" stroke="#1b2340" strokeWidth="4" />
      <circle cx="14" cy="60" r="7" fill="#ff9cc2" stroke="#1b2340" strokeWidth="3" />
      <circle cx="106" cy="60" r="7" fill="#ff9cc2" stroke="#1b2340" strokeWidth="3" />
    </svg>
  )
}
