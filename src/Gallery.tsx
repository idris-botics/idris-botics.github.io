import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Project } from './content'

export type Media = NonNullable<Project['media']>[number]
export const mediaBase = () => import.meta.env.BASE_URL + 'media/img/'
const src = (m: Media, i: number) => `${mediaBase()}${m.src}-${(m.widths ?? [640, 1280])[i]}.webp`

/** Full-window view of a gallery image: scrim, large image, caption, previous and next, Escape or the X to close. */
function Lightbox({ items, i, go, onClose, lang }: { items: Media[]; i: number; go: (k: number) => void; onClose: () => void; lang: 'en' | 'ja' }) {
  const box = useRef<HTMLDivElement>(null)
  const m = items[i]
  const n = items.length
  const widths = m.widths ?? [640, 1280]
  const big = widths[widths.length - 1]
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLElement>('.lb-close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (n > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); e.stopPropagation(); go(i + (e.key === 'ArrowRight' ? 1 : -1)) }
      else if (e.key === 'Tab') {
        const f = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); back?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n])
  const label = (en: string, ja: string) => (lang === 'en' ? en : ja)
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={label('Image viewer', '画像ビューア')} ref={box} onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lb-stage')) onClose() }}>
      <button className="lb-close" onClick={onClose} aria-label={label('Close image', '画像を閉じる')}><X size={22} aria-hidden="true" /></button>
      <div className="lb-stage">
        <img key={m.src} src={`${mediaBase()}${m.src}-${big}.webp`} width={m.w} height={m.h} style={{ width: `min(100%, calc((100svh - 150px) * ${m.w / m.h}))` }} alt={m.alt[lang]} decoding="async" />
        {n > 1 && (
          <>
            <button className="spot-nav prev" onClick={() => go(i - 1)} aria-label={label('Previous image', '前の画像')}><ChevronLeft size={22} aria-hidden="true" /></button>
            <button className="spot-nav next" onClick={() => go(i + 1)} aria-label={label('Next image', '次の画像')}><ChevronRight size={22} aria-hidden="true" /></button>
          </>
        )}
      </div>
      {(m.caption || m.label) && <p className="lb-cap">{m.label && <span className="lab">{m.label[lang]}</span>}{m.caption?.[lang]}{n > 1 && <span className="lb-count"> {i + 1} / {n}</span>}</p>}
    </div>,
    document.body,
  )
}

/** Spotlight gallery: one large image, thumbnails below. Clicking a thumbnail promotes it; it rotates by itself until the reader takes over. */
export function Gallery({ items, lang, morph = false }: { items: Media[]; lang: 'en' | 'ja'; morph?: boolean }) {
  const [i, setI] = useState(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const n = items.length
  const go = (k: number) => setI(((k % n) + n) % n)
  const m = items[i]
  const w = m.widths ?? [640, 1280]
  const t = (l: { en: string; ja: string }) => l[lang]
  return (
    <div className={n === 1 ? 'gallery single' : 'gallery'} ref={host} role="group" aria-roledescription="carousel" aria-label={lang === 'en' ? 'Project images' : 'プロジェクトの画像'}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1) }}>
      <figure className="spot" aria-live="polite">
        <div className="spot-img" style={m.w >= m.h ? undefined : { width: 'fit-content', maxWidth: '100%', margin: '0 auto' }}
          onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={(e) => {
            const s0 = swipe.current; swipe.current = null
            if (!s0 || n < 2) return
            const dx = e.clientX - s0.x, dy = e.clientY - s0.y
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1))
          }}
          onPointerCancel={() => { swipe.current = null }}>
          <button className="spot-open" onClick={() => setZoom(true)} aria-label={`${lang === 'en' ? 'Enlarge image' : '画像を拡大'}: ${t(m.alt)}`}>
            <img key={m.src} src={src(m, 0)} srcSet={w.map((x) => `${mediaBase()}${m.src}-${x}.webp ${x}w`).join(', ')} sizes="(max-width: 900px) 100vw, 640px"
          width={m.w} height={m.h} style={{ ...(m.w >= m.h ? { width: '100%', height: 'auto' } : { height: 'min(62vh, 560px)', width: 'auto', maxWidth: '100%' }), ...(morph && i === 0 ? { viewTransitionName: 'proj' } : {}) }} alt={t(m.alt)} loading="lazy" decoding="async" />
          </button>
          {n > 1 && (
            <>
              <button className="spot-nav prev" onClick={() => go(i - 1)} aria-label={lang === 'en' ? 'Previous image' : '前の画像'}><ChevronLeft size={20} aria-hidden="true" /></button>
              <button className="spot-nav next" onClick={() => go(i + 1)} aria-label={lang === 'en' ? 'Next image' : '次の画像'}><ChevronRight size={20} aria-hidden="true" /></button>
            </>
          )}
        </div>
        {(m.caption || m.label) && <figcaption>{m.label && <span className="lab">{t(m.label)}</span>}{m.caption && t(m.caption)}</figcaption>}
      </figure>
      {zoom && <Lightbox items={items} i={i} go={go} onClose={() => setZoom(false)} lang={lang} />}
      {n > 1 && (
        <div className="dots" role="tablist" aria-label={lang === 'en' ? 'Choose an image' : '画像を選ぶ'}>
          {items.map((x, k) => (
            <button key={x.src} role="tab" className="dot" aria-selected={k === i} onClick={() => go(k)} aria-label={`${lang === 'en' ? 'Image' : '画像'} ${k + 1} / ${n}: ${t(x.alt)}`}><span /></button>
          ))}
        </div>
      )}
    </div>
  )
}
