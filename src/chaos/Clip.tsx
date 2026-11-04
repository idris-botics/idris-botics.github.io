import { useEffect, useRef, useState } from 'react'
import { X, Play, Volume2, VolumeX } from 'lucide-react'
import { isMuted, onMuteChange, setMuted } from './sfx'

type Props = {
  /** File name without extension, in public/media/vid (an MP4 is always there, a WebM sometimes). */
  name: string
  webm?: boolean
  label: string
  lang: 'en' | 'ja'
  /** The close button runs away from the pointer for this long (ms) and Escape does nothing until then. 0 = a plain Close button. */
  runaway?: number
  /** Called when the visitor closes it. `seconds` is how much they watched (the furthest point reached). */
  onClose: (seconds: number) => void
  /** The close button is not shown (and Escape does nothing) until this many ms have passed (omae: 20 s). */
  closeAfter?: number
  /** Short taunts shown beside the close button itself (not by the pet robot) each time it dodges. */
  taunts?: { en: string; ja: string }[]
}

/**
 * A clip in a popup that plays in full, with sound, on a loop, with no controls: nothing can be paused or scrubbed, only muted. It opens after a click, tap or typed word, so sound is allowed; if a browser
 * still blocks it, a big "tap to play" button appears. It pauses when the tab is hidden. Escape closes it (unless the close button is running away).
 */
export default function Clip({ name, webm, label, lang, runaway = 0, onClose, taunts, closeAfter = 0 }: Props) {
  const v = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const x = useRef<HTMLButtonElement>(null)
  const [needTap, setNeedTap] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [say, setSay] = useState<string | null>(null)
  const sayTimer = useRef(0)
  const openedAt = useRef(performance.now())
  const reached = useRef(0)
  const [muted, setMutedState] = useState(isMuted())
  const dodges = useRef(0)
  const base = import.meta.env.BASE_URL
  const locked = () => (runaway > 0 && performance.now() - openedAt.current < runaway) || (closeAfter > 0 && performance.now() - openedAt.current < closeAfter)
  const [closeShown, setCloseShown] = useState(closeAfter === 0)
  useEffect(() => { if (closeAfter > 0) { const t = window.setTimeout(() => setCloseShown(true), closeAfter); return () => clearTimeout(t) } }, [closeAfter])

  useEffect(() => {
    const el = v.current
    el?.play().catch(() => setNeedTap(true))
    const vis = () => { if (document.hidden) el?.pause(); else if (el?.paused) el.play().catch(() => undefined) }
    const off = onMuteChange(() => setMutedState(isMuted()))
    document.addEventListener('visibilitychange', vis)
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (!locked()) onClose(reached.current)
    }
    addEventListener('keydown', key, true)
    return () => { off(); document.removeEventListener('visibilitychange', vis); removeEventListener('keydown', key, true); el?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flee = () => {
    const b = box.current?.getBoundingClientRect()
    if (!b) return
    dodges.current++
    if (taunts?.length && dodges.current % 2 === 1) { setSay(taunts[Math.floor(dodges.current / 2) % taunts.length][lang]); clearTimeout(sayTimer.current); sayTimer.current = window.setTimeout(() => setSay(null), 1500) }
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
          ref={v} className="clip-video" loop muted={muted} playsInline preload="auto" aria-label={label}
          poster={`${base}media/img/${name}-poster.webp`}
          onPlay={() => setNeedTap(false)}
          onPause={(e) => { if (!document.hidden) e.currentTarget.play().catch(() => setNeedTap(true)) }}
          onClick={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()} disablePictureInPicture
          onTimeUpdate={(e) => { reached.current = Math.max(reached.current, e.currentTarget.currentTime) }}
        >
          {webm && <source src={`${base}media/vid/${name}.webm`} type="video/webm" />}
          <source src={`${base}media/vid/${name}.mp4`} type="video/mp4" />
        </video>
        {needTap && (
          <button className="clip-tap btn" onClick={() => { v.current?.play().catch(() => undefined); setNeedTap(false) }}>
            <Play size={22} aria-hidden="true" /> {lang === 'en' ? 'Tap to play' : 'タップして再生'}
          </button>
        )}
        {say && <span className="clip-taunt" style={pos ? { left: Math.max(4, pos.x - 120), top: pos.y + 6 } : { right: 60, top: 14 }} aria-hidden="true">{say}</span>}
        <button className="clip-mute" aria-pressed={muted} aria-label={lang === 'en' ? (muted ? 'Turn the sound on' : 'Mute') : (muted ? '音を出す' : 'ミュート')} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={22} aria-hidden="true" /> : <Volume2 size={22} aria-hidden="true" />}</button>
        {closeShown && <button
          ref={x} className="clip-x" aria-label={lang === 'en' ? 'Close' : '閉じる'}
          style={pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}
          onPointerEnter={() => { if (locked()) flee() }}
          onPointerDown={(e) => { if (locked()) { e.preventDefault(); flee() } }}
          onClick={() => { if (locked()) { flee(); return } onClose(reached.current) }}
        ><X size={22} aria-hidden="true" /></button>}
      </div>
    </div>
  )
}
