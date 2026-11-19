import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'

/** A video stops by itself when it is scrolled away (less than a fifth of it left) or the tab is left. It does not start again by itself. */
export function useQuietVideo(ref: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting && !v.paused) v.pause() }, { threshold: 0.2 })
    io.observe(v)
    const hide = () => { if (document.hidden && !v.paused) v.pause() }
    document.addEventListener('visibilitychange', hide)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', hide) }
  }, [ref])
}

/** A project video with the browser's own controls (silent clips in the project galleries). */
export function QuietVideo(props: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const ref = useRef<HTMLVideoElement>(null)
  useQuietVideo(ref)
  return <video ref={ref} {...props} />
}

export type StripClip = { src: string; poster: string; label: { en: string; ja: string }; w: number; h: number; length: string }

/** A video with sound, shown as a picture with a play button. It opens large, starts muted (the speaker button is in the controls), and stops when closed. */
export function VideoCard({ clip, lang }: { clip: StripClip; lang: 'en' | 'ja' }) {
  const [open, setOpen] = useState(false)
  const base = import.meta.env.BASE_URL
  const label = clip.label[lang]
  return (
    <>
      <button className="video-card" onClick={() => setOpen(true)} aria-label={`${lang === 'en' ? 'Play video' : '動画を再生'} (${clip.length}): ${label}`}>
        <img src={`${base}media/img/${clip.poster}-640.webp`} width={clip.w} height={clip.h} alt="" loading="lazy" decoding="async" />
        <span className="vc-play" aria-hidden="true"><Play size={22} fill="currentColor" /><span>{clip.length}</span></span>
      </button>
      {open && <VideoDialog clip={clip} lang={lang} onClose={() => setOpen(false)} />}
    </>
  )
}

function VideoDialog({ clip, lang, onClose }: { clip: StripClip; lang: 'en' | 'ja'; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  useQuietVideo(vid)
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLElement>('.lb-close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (e.key === 'Tab') {
        const f = [...(box.current?.querySelectorAll<HTMLElement>('button, video') ?? [])]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    // the page behind does not scroll while the video is open
    const html = document.documentElement, prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey, true); html.style.overflow = prev; vid.current?.pause(); back?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const t = (en: string, ja: string) => (lang === 'en' ? en : ja)
  const base = import.meta.env.BASE_URL
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={t('Video player', '動画プレーヤー')} ref={box} onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lb-stage')) onClose() }}>
      <button className="lb-close" onClick={onClose} aria-label={t('Close video', '動画を閉じる')}><X size={22} aria-hidden="true" /></button>
      <div className="lb-stage">
        <video ref={vid} className="lb-video" autoPlay muted controls playsInline preload="metadata" width={clip.w} height={clip.h}
          poster={`${base}media/img/${clip.poster}-640.webp`} aria-label={clip.label[lang]}
          style={{ width: `min(100%, calc((100svh - 150px) * ${clip.w / clip.h}))` }}>
          <source src={`${base}media/vid/${clip.src}.mp4`} type="video/mp4" />
        </video>
      </div>
      <p className="lb-cap">{clip.label[lang]}<span className="lb-hint">{t('Starts muted: use the speaker button for sound.', '音は消してあります。スピーカーのボタンで入れられます。')}</span></p>
    </div>,
    document.body,
  )
}
