import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from './store'
import { Reveal } from './Reveal'
import { mediaBase } from './Gallery'
import { openProject } from './route'
import { featured, order, projects, tiles, type Project } from './content'

const thumbs = (p: Project) => {
  const list = (p.media ?? []).map((m) => ({ src: `${mediaBase()}${m.src}-640.webp`, alt: m.alt }))
  if (!list.length && p.videos?.[0]) list.push({ src: `${mediaBase()}${p.videos[0].poster}-640.webp`, alt: p.videos[0].caption })
  return list
}

/** A plain left click opens the page with the transition; Cmd/Ctrl-click, Shift-click and middle-click keep the normal link behaviour. */
const plain = (e: React.MouseEvent, go: () => void) => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); go() }

/**
 * A 4 to 5 s loop of the build's simulation plays on top of the tile's picture: on hover or focus with a mouse, and while the tile is in the middle of the screen on a phone.
 * Under reduced motion, Save-Data or a slow connection nothing is loaded and the picture stays.
 */
function TileClip({ name, active }: { name: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) void v.play().catch(() => {})
    else { v.pause(); setShown(false) }
  }, [active])
  return <video ref={ref} className={`tile-clip${shown ? ' on' : ''}`} src={`${import.meta.env.BASE_URL}media/vid/${name}.mp4`} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => setShown(true)} />
}

const clipsAllowed = () => {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !matchMedia('(prefers-reduced-motion: reduce)').matches && !(c && (c.saveData === true || /(^|-)[23]g$/.test(c.effectiveType ?? '')))
}

/** A featured tile. When the project has several pictures, they change in the tile's own picture spot: arrows, dots, swipe. */
function FeaturedTile({ p, lang }: { p: Project; lang: 'en' | 'ja' }) {
  const t = (l: { en: string; ja: string }) => l[lang]
  const info = tiles[p.slug]
  const imgs = thumbs(p).slice(0, 5) // the page has the rest
  const n = imgs.length
  const [k, setK] = useState(0)
  const go = (d: number) => setK((x) => ((x + d) % n + n) % n)
  const imgRef = useRef<HTMLImageElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const [hover, setHover] = useState(false)
  const [centred, setCentred] = useState(false)
  const [ok] = useState(clipsAllowed)
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ok || !info.clip || !matchMedia('(pointer: coarse)').matches || !host.current) return
    const io = new IntersectionObserver(([e]) => setCentred(e.isIntersecting), { rootMargin: '-30% 0px -30% 0px' })
    io.observe(host.current)
    return () => io.disconnect()
  }, [ok, info.clip])
  const hoverOk = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
  const label = lang === 'en' ? 'Picture' : '画像'

  return (
    <div className="tile" onPointerEnter={() => hoverOk && setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }; swiped.current = false }}
      onPointerUp={(e) => {
        const s0 = swipe.current; swipe.current = null
        if (!s0 || n < 2) return
        const dx = e.clientX - s0.x, dy = e.clientY - s0.y
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; go(dx < 0 ? 1 : -1) }
      }}>
      <a className="tile-main" id={p.slug} href={`#work/${p.slug}`}
        onClick={(e) => { if (swiped.current) { e.preventDefault(); swiped.current = false; return } plain(e, () => openProject(p.slug, imgRef.current)) }}
        onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        {n > 0 && (
          <span className="tile-img" ref={host}>
            <img ref={imgRef} key={imgs[k].src} src={imgs[k].src} alt="" loading="lazy" decoding="async" width={640} height={400} />
            {ok && info.clip && <TileClip name={info.clip} active={hover || centred} />}
          </span>
        )}
        <span className="tile-text">
          {info.tag && <span className="tile-tag">{t(info.tag)}</span>}
          <strong>{t(info.short)}</strong>
          <span>{info.line && t(info.line)}</span>
          {info.did && <span className="tile-did">{t(info.did)}</span>}
        </span>
        <ArrowUpRight className="tile-go" size={18} aria-hidden="true" />
      </a>
      {n > 1 && (
        <div className="tile-gal">
          <button className="spot-nav prev" onClick={() => go(-1)} aria-label={lang === 'en' ? 'Previous picture' : '前の画像'}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button className="spot-nav next" onClick={() => go(1)} aria-label={lang === 'en' ? 'Next picture' : '次の画像'}><ChevronRight size={20} aria-hidden="true" /></button>
          <div className="tile-dots" role="group" aria-label={lang === 'en' ? 'Choose a picture' : '画像を選ぶ'}>
            {imgs.map((_, i) => <button key={i} className="dot" aria-current={i === k} onClick={() => setK(i)} aria-label={`${label} ${i + 1} / ${n}`}><span /></button>)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Work() {
  const lang = useStore((s) => s.lang)
  const t = (l: { en: string; ja: string }) => l[lang]

  // the Chaos hint and Mission Control can send the visitor to a project
  useEffect(() => {
    const f = (e: Event) => { const s = (e as CustomEvent<string>).detail; if (projects.some((p) => p.slug === s)) openProject(s) }
    addEventListener('portfolio:open-project', f)
    return () => removeEventListener('portfolio:open-project', f)
  }, [])

  const project = (s: string) => projects.find((p) => p.slug === s)!
  const more = order.filter((s) => !featured.includes(s))

  return (
    <section id="work" className="sec" aria-labelledby="wk">
      <div className="wrap">
        <h2 id="wk">{lang === 'en' ? 'Work' : '制作'}</h2>
        <div className="tiles">
          {featured.map((s, i) => <Reveal key={s} delay={i * 50}><FeaturedTile p={project(s)} lang={lang} /></Reveal>)}
        </div>

        <h3 className="more-h">{lang === 'en' ? 'More builds' : 'ほかの制作'}</h3>
        <ul className="strip" aria-label={lang === 'en' ? 'More builds' : 'ほかの制作'}>
          {more.map((s) => {
            const p = project(s), info = tiles[s], img = thumbs(p)[0]?.src
            return (
              <li key={s}>
                <a className="mini" id={s} href={`#work/${s}`} onClick={(e) => plain(e, () => openProject(s, (e.currentTarget as HTMLElement).querySelector('img')))}>
                  {img && <img src={img} alt="" loading="lazy" decoding="async" width={160} height={100} />}
                  <strong>{t(info.short)}</strong>
                  <span>{t(info.strip)}</span>
                  <ArrowUpRight className="tile-go" size={14} aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
