import { useEffect, useRef, useState } from 'react'
import { X, Play } from 'lucide-react'

type Props = {
  /** File name without extension, in public/media/vid (an MP4 is always there, a WebM sometimes). */
  name: string
  webm?: boolean
  label: string
  lang: 'en' | 'ja'
  /** Plays at most this many times, then stops (default: once). */
  plays?: number
  /** The close button runs away from the pointer for this long (ms) and Escape does nothing until then. 0 = a plain Close button. */
  runaway?: number
  /** Called when the visitor closes it. `seconds` is how much they watched (the furthest point reached). */
  onClose: (seconds: number) => void
  /** Called once when the clip has played to the end. */
  onEnded?: () => void
  /** A line the pet robot says when the close button dodges. */
  taunt?: (n: number) => void
}

/**
 * A clip in a popup that plays in full, with sound, with its controls. It opens after a click, tap or typed word, so sound is allowed; if a browser
 * still blocks it, a big "tap to play" button appears. It pauses when the tab is hidden. Escape closes it (unless the close button is running away).
 */
export default function Clip({ name, webm, label, lang, plays = 1, runaway = 0, onClose, onEnded, taunt }: Props) {
  const v = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const x = useRef<HTMLButtonElement>(null)
  const [needTap, setNeedTap] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const openedAt = useRef(performance.now())
  const reached = useRef(0)
  const count = useRef(0)
  const dodges = useRef(0)
  const base = import.meta.env.BASE_URL
  const locked = () => runaway > 0 && performance.now() - openedAt.current < runaway

  useEffect(() => {
    const el = v.current
    el?.play().catch(() => setNeedTap(true))
    const vis = () => { if (document.hidden) el?.pause() }
    document.addEventListener('visibilitychange', vis)
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (!locked()) onClose(reached.current)
    }
    addEventListener('keydown', key, true)
    return () => { document.removeEventListener('visibilitychange', vis); removeEventListener('keydown', key, true); el?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flee = () => {
    const b = box.current?.getBoundingClientRect()
    if (!b) return
    dodges.current++
    taunt?.(dodges.current)
    const w = 44, pad = 8
    setPos({ x: pad + Math.random() * (b.width - w - pad * 2), y: pad + Math.random() * (b.height - w - pad * 2) })
  }
  const near = (e: React.PointerEvent) => {
    if (!locked() || !x.current) return
    const r = x.current.getBoundingClientRect()
    if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 90) flee()
  }

  return (
    <div className="clip" role="dialog" aria-modal="true" aria-label={label} onPointerMove={near}>
      <div className="clip-box" ref={box}>
        <video
          ref={v} className="clip-video" controls playsInline preload="auto" aria-label={label}
          poster={`${base}media/img/${name}-poster.webp`}
          onPlay={() => setNeedTap(false)}
          onTimeUpdate={(e) => { reached.current = Math.max(reached.current, e.currentTarget.currentTime) }}
          onEnded={(e) => {
            count.current++
            if (count.current === 1) onEnded?.()
            if (count.current < plays) { e.currentTarget.currentTime = 0; e.currentTarget.play().catch(() => setNeedTap(true)) }
          }}
        >
          {webm && <source src={`${base}media/vid/${name}.webm`} type="video/webm" />}
          <source src={`${base}media/vid/${name}.mp4`} type="video/mp4" />
        </video>
        {needTap && (
          <button className="clip-tap btn" onClick={() => { v.current?.play().catch(() => undefined); setNeedTap(false) }}>
            <Play size={22} aria-hidden="true" /> {lang === 'en' ? 'Tap to play' : 'タップして再生'}
          </button>
        )}
        <button
          ref={x} className="clip-x" aria-label={lang === 'en' ? 'Close' : '閉じる'}
          style={pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}
          onPointerEnter={() => { if (locked()) flee() }}
          onPointerDown={(e) => { if (locked()) { e.preventDefault(); flee() } }}
          onClick={() => { if (locked()) { flee(); return } onClose(reached.current) }}
        ><X size={22} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
