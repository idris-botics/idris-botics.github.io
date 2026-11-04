import { lazy, Suspense, useEffect, useRef } from 'react'
import { useStore } from './store'
import { useReducedMotion } from './lib/hooks'

const SceneChaos = lazy(() => import('./chaos/SceneChaos')) // matter-js lives in the Chaos chunk only

/**
 * The hero scene: a small flat retro-futurist landscape (a pale moon, blue hills, teal plants, coral rocks, a mustard and coral ground) with an
 * original robot mascot standing in it. Layers drift a few pixels with the cursor. The mascot's eyes follow the cursor or finger, it blinks now
 * and then, and clicking it makes it wave. Nothing else moves on its own. Under reduced motion the scene is still and the eyes stay centred.
 *
 * In Chaos the same scene is turned up (see chaos/SceneChaos.tsx): the mascot hops and spins, throws things into a physics world, and panics at
 * the coffee flood; the plants wobble and the moon is the Moon gag.
 */
export default function HeroScene() {
  const chaos = useStore((s) => s.mode === 'chaos')
  const lang = useStore((s) => s.lang)
  const reduce = useReducedMotion()
  const scene = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const armRef = useRef<SVGGElement>(null)
  const waveTimer = useRef(0)

  const wave = () => {
    const a = armRef.current
    if (!a) return
    a.classList.remove('waving'); void a.getBoundingClientRect(); a.classList.add('waving')
    clearTimeout(waveTimer.current); waveTimer.current = window.setTimeout(() => a.classList.remove('waving'), 1300)
  }

  useEffect(() => {
    const el = scene.current, sv = svg.current
    if (!el || !sv || reduce) return
    const pupils = [...sv.querySelectorAll<SVGElement>('.pupil')]
    let raf = 0, px = 0.5, py = 0.5, cx = 0, cy = 0, alive = true
    const update = () => {
      raf = 0
      if (!alive) return
      el.style.setProperty('--px', String((px - 0.5) * 2))
      el.style.setProperty('--py', String((py - 0.5) * 2))
      const r = sv.getBoundingClientRect(), k = r.width / 1000
      for (const p of pupils) {
        const c = p.parentElement!.getBoundingClientRect()
        const ex = c.left + c.width / 2, ey = c.top + c.height / 2
        const dx = cx - ex, dy = cy - ey, d = Math.hypot(dx, dy) || 1
        const m = Math.min(4.2, d / (30 * Math.max(k, 0.4)))
        p.style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m}px)`
      }
    }
    const move = (e: PointerEvent) => {
      cx = e.clientX; cy = e.clientY
      px = Math.max(0, Math.min(1, cx / innerWidth)); py = Math.max(0, Math.min(1, cy / innerHeight))
      if (!raf) raf = requestAnimationFrame(update)
    }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', move, { passive: true })
    // the mascot blinks now and then
    let blinkT = 0
    const blink = () => {
      blinkT = window.setTimeout(() => {
        sv.classList.add('blink')
        window.setTimeout(() => sv.classList.remove('blink'), 140)
        blink()
      }, 3200 + Math.random() * 3800)
    }
    blink()
    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(blinkT); removeEventListener('pointermove', move); removeEventListener('pointerdown', move) }
  }, [reduce])

  const onMoon = () => { if (chaos) document.querySelector<HTMLElement>('.moon')?.click() }
  const label = lang === 'en' ? 'Wave at the robot' : 'ロボットに手を振る'

  return (
    <div ref={scene} className={chaos ? 'scene wild' : 'scene'}>
      <svg ref={svg} viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label={lang === 'en' ? 'A small retro robot standing in a flat illustrated landscape' : '平らなイラストの風景に立つ小さなレトロロボット'}>
        <rect width="1000" height="300" fill="#fdf0d0" />
        {/* distant hills in light sky blue, and the moon */}
        <g className="lay l-far">
          <path d="M -20,214 C 90,150 210,168 330,196 S 560,170 690,190 S 900,150 1020,184 L 1020,230 L -20,230 Z" fill="#afcbea" />
          <path d="M -20,224 C 130,190 260,206 400,214 S 700,196 820,210 S 960,196 1020,206 L 1020,240 L -20,240 Z" fill="#8fb4dd" />
        </g>
        <g className="lay l-moon" onClick={onMoon} role={chaos ? 'button' : undefined} tabIndex={chaos ? 0 : undefined} aria-label={chaos ? (lang === 'en' ? 'The moon' : '月') : undefined} onKeyDown={(e) => { if (chaos && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onMoon() } }} style={chaos ? { cursor: 'pointer' } : undefined}>
          <circle cx="170" cy="78" r="38" fill="#fff8ea" stroke="#26221f" strokeWidth="3" />
          <clipPath id="m o o n c l i p"><circle cx="170" cy="78" r="36.5" /></clipPath>
          <circle cx="152" cy="86" r="34" fill="#afcbea" clipPath="url(#moon-clip)" opacity=".75" />
          <circle cx="186" cy="64" r="5" fill="#e6d9b8" /><circle cx="160" cy="96" r="3.5" fill="#e6d9b8" /><circle cx="190" cy="92" r="2.8" fill="#e6d9b8" />
        </g>
        {/* the ground: a mustard band under a horizon line, a coral band in front */}
        <rect y="226" width="1000" height="74" fill="#f2b441" />
        <line x1="0" y1="226" x2="1000" y2="226" stroke="#26221f" strokeWidth="3" />
        <rect y="268" width="1000" height="32" fill="#ee6a4c" />
        <line x1="0" y1="268" x2="1000" y2="268" stroke="#26221f" strokeWidth="3" />
        {/* plants: mint behind, teal in front */}
        <g className="lay l-plants">
          <g className="plant" fill="#9ed9cb">
            <path d="M 300,226 C 292,196 296,176 308,160 C 312,182 312,204 308,226 Z" /><path d="M 318,226 C 322,200 334,184 350,176 C 346,198 336,214 330,226 Z" />
            <path d="M 760,226 C 752,202 756,184 768,170 C 772,188 772,208 768,226 Z" /><path d="M 778,226 C 784,206 796,192 810,186 C 806,204 796,218 790,226 Z" />
          </g>
          <g className="plant" fill="#1e9e8e">
            <path d="M 70,268 C 58,224 62,186 84,156 C 92,192 94,232 90,268 Z" /><path d="M 92,268 C 96,232 116,204 142,194 C 138,226 124,252 112,268 Z" /><path d="M 48,268 C 46,240 36,222 20,214 C 26,238 34,256 40,268 Z" />
            <path d="M 905,268 C 896,230 902,198 922,174 C 928,204 930,238 924,268 Z" /><path d="M 926,268 C 934,240 952,218 976,212 C 970,238 956,256 944,268 Z" /><path d="M 884,268 C 882,246 872,232 856,226 C 862,246 870,260 876,268 Z" />
          </g>
        </g>
        {/* coral rocks */}
        <g className="lay l-rocks" fill="#ee6a4c" stroke="#26221f" strokeWidth="3" strokeLinejoin="round">
          <path d="M 360,268 C 356,246 372,234 392,236 C 414,238 426,252 422,268 Z" /><path d="M 392,240 C 400,238 410,242 412,250" fill="none" stroke="#fff8ea" strokeWidth="3" strokeLinecap="round" />
          <path d="M 520,268 C 522,256 534,250 546,252 C 558,254 564,262 562,268 Z" />
          <path d="M 770,268 C 770,250 788,240 806,244 C 824,248 832,258 830,268 Z" /><path d="M 796,248 C 804,248 810,252 812,258" fill="none" stroke="#fff8ea" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* the mascot: boxy, mustard, charcoal outlines, a blue screen face, an antenna. Feet at the ground line. */}
        <g className="lay l-mascot">
          <g transform="translate(640 266)" className="mascot" role="button" tabIndex={0} aria-label={label} onClick={wave} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wave() } }} style={{ cursor: 'pointer' }}>
            <rect x="-34" y="-12" width="28" height="12" rx="4" fill="#3f6fb5" stroke="#26221f" strokeWidth="3.5" />
            <rect x="6" y="-12" width="28" height="12" rx="4" fill="#3f6fb5" stroke="#26221f" strokeWidth="3.5" />
            <rect x="-28" y="-34" width="14" height="24" fill="#fff8ea" stroke="#26221f" strokeWidth="3.5" />
            <rect x="14" y="-34" width="14" height="24" fill="#fff8ea" stroke="#26221f" strokeWidth="3.5" />
            <g>
              <rect x="-46" y="-116" width="92" height="84" rx="12" fill="#f2b441" stroke="#26221f" strokeWidth="4" />
              <rect x="-28" y="-98" width="56" height="44" rx="7" fill="#9ed9cb" stroke="#26221f" strokeWidth="3.5" />
              <circle cx="-14" cy="-76" r="5" fill="#ee6a4c" stroke="#26221f" strokeWidth="2.5" /><circle cx="0" cy="-76" r="5" fill="#fff8ea" stroke="#26221f" strokeWidth="2.5" /><circle cx="14" cy="-76" r="5" fill="#3f6fb5" stroke="#26221f" strokeWidth="2.5" />
              <path d="M -20,-62 H 20" stroke="#26221f" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g>
              <rect x="-68" y="-108" width="22" height="52" rx="9" fill="#f2b441" stroke="#26221f" strokeWidth="4" />
              <circle cx="-57" cy="-52" r="9" fill="#fff8ea" stroke="#26221f" strokeWidth="3.5" />
            </g>
            <g transform="translate(46 -104)">
              <g ref={armRef} className="arm-r">
                <rect x="0" y="0" width="22" height="52" rx="9" fill="#f2b441" stroke="#26221f" strokeWidth="4" />
                <circle cx="11" cy="56" r="9" fill="#fff8ea" stroke="#26221f" strokeWidth="3.5" />
              </g>
            </g>
            <rect x="-9" y="-130" width="18" height="16" fill="#26221f" />
            <g className="head">
              <line x1="0" y1="-190" x2="0" y2="-210" stroke="#26221f" strokeWidth="4" strokeLinecap="round" />
              <circle cx="0" cy="-216" r="8" fill="#ee6a4c" stroke="#26221f" strokeWidth="3.5" />
              <rect x="-42" y="-192" width="84" height="64" rx="14" fill="#f2b441" stroke="#26221f" strokeWidth="4" />
              <circle cx="-46" cy="-160" r="6" fill="#ee6a4c" stroke="#26221f" strokeWidth="3" /><circle cx="46" cy="-160" r="6" fill="#ee6a4c" stroke="#26221f" strokeWidth="3" />
              <rect x="-32" y="-182" width="64" height="44" rx="9" fill="#3f6fb5" stroke="#26221f" strokeWidth="3.5" />
              {[-16, 16].map((x) => (
                <g key={x} transform={`translate(${x} -160)`}>
                  <circle r="11" fill="#fff8ea" stroke="#26221f" strokeWidth="2.5" />
                  <g className="pupil"><circle r="5.2" fill="#26221f" /><circle cx="-1.6" cy="-1.8" r="1.7" fill="#fff8ea" /></g>
                  <rect className="lid" x="-12.5" y="-12.5" width="25" height="25" fill="#3f6fb5" />
                </g>
              ))}
              <path d="M -9,-146 Q 0,-139 9,-146" stroke="#fff8ea" strokeWidth="3" strokeLinecap="round" fill="none" />
              <ellipse cx="-26" cy="-146" rx="4" ry="2.6" fill="#ee6a4c" opacity=".85" /><ellipse cx="26" cy="-146" rx="4" ry="2.6" fill="#ee6a4c" opacity=".85" />
            </g>
          </g>
        </g>
      </svg>
      {chaos && <Suspense fallback={null}><SceneChaos scene={scene} /></Suspense>}
    </div>
  )
}
