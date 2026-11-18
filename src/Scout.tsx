import { useEffect, useRef } from 'react'

// "Scout": original mascot (a small round-visor robot). Eyes follow the cursor. A `pose` changes its face and puts little props around it
// (hearts, stars, music notes, a sweat drop, steam, a coffee cup); the movement of each pose is in chaos.css (".scout-dock.pose-...").
export type Pose = 'idle' | 'happy' | 'dizzy' | 'shock' | 'love' | 'dance' | 'sleepy' | 'sip' | 'salute' | 'annoyed' | 'yawn' | 'whistle' | 'wave' | 'look' | 'panic'

const SPIRAL = (cx: number) => `M${cx} 54 a1.5 1.5 0 1 1 3 0 a3 3 0 1 1 -6 0 a4.5 4.5 0 1 1 9 0 a6 6 0 1 1 -12 0 a7.5 7.5 0 1 1 15 0`
const HEART = (cx: number, cy: number, s: number) => `M${cx} ${cy + 5 * s} C${cx - 9 * s} ${cy - 1 * s} ${cx - 5 * s} ${cy - 8 * s} ${cx} ${cy - 3 * s} C${cx + 5 * s} ${cy - 8 * s} ${cx + 9 * s} ${cy - 1 * s} ${cx} ${cy + 5 * s} Z`

export default function Scout({ size = 120, mood = 'off', full = 0, stuffed = false, pose = 'idle' }: { size?: number; mood?: 'off' | 'wired' | 'crashed'; full?: number; stuffed?: boolean; pose?: Pose }) {
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

  const p: Pose = stuffed ? 'idle' : pose
  const dark = '#1b2340'
  // the eyes
  const eyes = (() => {
    if (stuffed) return <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M42 47 L54 54 L42 61" /><path d="M78 47 L66 54 L78 61" /></g>
    if (mood === 'wired') return [48, 72].map((cx) => <g key={cx}><circle cx={cx} cy="54" r="12" fill="#fff" /><path className="spiral" d={SPIRAL(cx)} fill="none" stroke={dark} strokeWidth="1.6" strokeLinecap="round" /></g>)
    switch (p) {
      case 'happy': case 'dance': case 'wave':
        return <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M40 58 Q48 46 56 58" /><path d="M64 58 Q72 46 80 58" /></g>
      case 'love':
        return <g fill="#ff5c8a"><path d={HEART(48, 53, 1.4)} /><path d={HEART(72, 53, 1.4)} /></g>
      case 'dizzy': case 'panic':
        return <>{[48, 72].map((cx) => <g key={cx}><circle cx={cx} cy="54" r="10.5" fill="#fff" /><path className="spiral slow" d={SPIRAL(cx)} fill="none" stroke={dark} strokeWidth="1.6" strokeLinecap="round" /></g>)}</>
      case 'shock':
        return <><circle cx="48" cy="54" r="11.5" fill="#fff" /><circle cx="72" cy="54" r="11.5" fill="#fff" /><circle cx="48" cy="54" r="2.6" fill={dark} /><circle cx="72" cy="54" r="2.6" fill={dark} /><g stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M38 38 L56 36" /><path d="M64 36 L82 38" /></g></>
      case 'sleepy':
        return <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M40 57 Q48 62 56 57" /><path d="M64 57 Q72 62 80 57" /></g>
      case 'yawn':
        return <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M41 52 Q48 60 55 52" /><path d="M65 52 Q72 60 79 52" /></g>
      case 'annoyed':
        return <><circle cx="48" cy="55" r="9" fill="#fff" /><circle cx="72" cy="55" r="9" fill="#fff" /><rect x="36" y="44" width="24" height="10" fill={dark} /><rect x="60" y="44" width="24" height="10" fill={dark} /><g stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M38 42 L56 49" /><path d="M82 42 L64 49" /></g><circle ref={l} cx="48" cy="58" r="3.6" fill="#6cd4ff" /><circle ref={r} cx="72" cy="58" r="3.6" fill="#6cd4ff" /></>
      default:
        return <><circle cx="48" cy="54" r="9" fill="#fff" /><circle cx="72" cy="54" r="9" fill="#fff" /><g className={p === 'look' ? 'pupils look' : 'pupils'}><circle ref={l} cx="48" cy="54" r="4.5" fill="#6cd4ff" /><circle ref={r} cx="72" cy="54" r="4.5" fill="#6cd4ff" /></g></>
    }
  })()
  // the mouth (under the visor)
  const mouth = (() => {
    if (full > 0 && p !== 'shock') return <ellipse className="mouth" cx="60" cy="79" rx="9" ry="4" fill={dark} />
    switch (p) {
      case 'happy': case 'dance': case 'wave': case 'salute': case 'love': return <path d="M50 76 Q60 90 70 76 Z" fill={dark} />
      case 'shock': return <ellipse className="o" cx="60" cy="80" rx="5" ry="7" fill={dark} />
      case 'whistle': return <circle cx="60" cy="80" r="3.2" fill={dark} />
      case 'yawn': return <ellipse className="yawn-mouth" cx="60" cy="80" rx="9" ry="8" fill={dark} />
      case 'annoyed': return <path className="grr" d="M51 81 H69" stroke={dark} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      case 'sleepy': return <ellipse className="breath" cx="60" cy="80" rx="3" ry="2.6" fill={dark} />
      case 'sip': return <ellipse cx="60" cy="80" rx="3.4" ry="3" fill={dark} />
      case 'dizzy': case 'panic': return <path d="M49 80 q5.5 -6 11 0 t11 0" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
      default: return null
    }
  })()
  const cls = `bob${mood === 'off' ? '' : ' ' + mood}`
  return (
    <svg ref={svg} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={cls} style={{ overflow: 'visible' }}>
      <g className="ant"><line x1="60" y1="8" x2="60" y2="24" stroke="#9aa6c8" strokeWidth="4" /><circle cx="60" cy="8" r="6" fill="#ffd45e" /></g>
      <rect x="20" y="24" width="80" height="62" rx="22" fill="#e8ecf8" stroke={dark} strokeWidth="4" />
      <rect x="30" y="36" width="60" height="36" rx="16" fill={dark} />
      {eyes}
      {mood === 'crashed' && <><rect x="38" y="43" width="20" height="11" rx="3" fill={dark} /><rect x="62" y="43" width="20" height="11" rx="3" fill={dark} /></>}
      {mouth}
      <rect className="belly" x={40 - full * 2.5} y="88" width={40 + full * 5} height={22 + full * 3} rx={8 + full * 1.5} fill="#b9a8ff" stroke={dark} strokeWidth="4" style={{ x: 40 - full * 2.5, width: 40 + full * 5, height: 22 + full * 3 }} />
      <circle className="cheek hand-l" cx={14 - full * 0.8} cy="60" r={7 + full * 2.4} fill="#ff9cc2" stroke={dark} strokeWidth="3" style={{ cx: 14 - full * 0.8, r: 7 + full * 2.4 }} />
      <circle className="cheek hand-r" cx={106 + full * 0.8} cy="60" r={7 + full * 2.4} fill="#ff9cc2" stroke={dark} strokeWidth="3" style={{ cx: 106 + full * 0.8, r: 7 + full * 2.4 }} />
      {/* props around it, one set per pose */}
      {p === 'love' && <g className="sc-hearts" fill="#ff5c8a" stroke={dark} strokeWidth="1.5"><path d={HEART(34, 14, 1.1)} /><path d={HEART(60, 2, 0.9)} /><path d={HEART(88, 12, 1.2)} /></g>}
      {(p === 'dizzy' || p === 'panic') && <g className="sc-stars" fill="#ffd45e" stroke={dark} strokeWidth="1.5"><path d="M60 4 l3 7 7 .6 -5.4 4.6 1.8 7 -6.4 -4 -6.4 4 1.8 -7 -5.4 -4.6 7 -.6 z" transform="translate(-34 0) scale(.8)" /><path d="M60 4 l3 7 7 .6 -5.4 4.6 1.8 7 -6.4 -4 -6.4 4 1.8 -7 -5.4 -4.6 7 -.6 z" transform="translate(4 -6) scale(.7)" /><path d="M60 4 l3 7 7 .6 -5.4 4.6 1.8 7 -6.4 -4 -6.4 4 1.8 -7 -5.4 -4.6 7 -.6 z" transform="translate(30 2) scale(.8)" /></g>}
      {(p === 'dance' || p === 'whistle') && <g className="sc-notes" fill={dark} fontFamily="sans-serif" fontWeight="800"><text x="-6" y="30" fontSize="18">♪</text><text x="112" y="24" fontSize="22">♫</text><text x="100" y="6" fontSize="15">♪</text></g>}
      {(p === 'shock' || p === 'panic') && <path className="sc-sweat" d="M96 30 C92 38 91 42 96 45 C101 42 100 38 96 30 Z" fill="#6cd4ff" stroke={dark} strokeWidth="1.5" />}
      {p === 'annoyed' && <g className="sc-steam" fill="#fff" stroke={dark} strokeWidth="1.5"><circle cx="40" cy="14" r="5" /><circle cx="82" cy="12" r="6" /><circle cx="60" cy="2" r="4" /></g>}
      {p === 'sleepy' && <g className="sc-snot" fill="#b8e6ff" stroke={dark} strokeWidth="1"><circle className="bubble" cx="68" cy="82" r="3" /></g>}
      {p === 'sip' && (
        <g className="sc-cup">
          <path d="M84 62 h20 v14 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 z" fill="#fff" stroke={dark} strokeWidth="3" strokeLinejoin="round" />
          <path d="M104 66 h4 a5 5 0 0 1 0 10 h-4" fill="none" stroke={dark} strokeWidth="3" />
          <path d="M86 66 h16" stroke="#7a4b2a" strokeWidth="5" />
          <g className="sc-vapor" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".9"><path d="M90 58 q-3 -5 0 -9" /><path d="M98 58 q-3 -5 0 -9" /></g>
        </g>
      )}
    </svg>
  )
}
