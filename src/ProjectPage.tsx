import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink, FileText, Minimize2, Play } from 'lucide-react'
import { useStore } from './store'
import { SimView } from './sims/registry'
import { Gallery, mediaBase } from './Gallery'
import { ProjectOpen } from './Extras'
import { backToWork, gotoProject } from './route'
import { stepscribe } from './content/stepscribe'
import { links, order, projects, statusLabel, tiles, type Project } from './content'

const FIGURES: Record<string, React.LazyExoticComponent<React.ComponentType<{ lang: 'en' | 'ja' }>>> = {
  pid: lazy(() => import('./sims/anatomy/PidRig')),
  swarm: lazy(() => import('./sims/anatomy/SwarmFigure')),
  gait: lazy(() => import('./sims/anatomy/GaitFigure')),
}
const ChaosClue = lazy(() => import('./chaos/ChaosClue')) // only fetched in Chaos

const ui = {
  back: { en: 'Back to work', ja: '制作一覧へ戻る' },
  prev: { en: 'Previous project', ja: '前のプロジェクト' },
  next: { en: 'Next project', ja: '次のプロジェクト' },
  play: { en: 'Play the simulation', ja: 'シミュレーションを動かす' },
  minimise: { en: 'Minimise', ja: '小さくする' },
  loading: { en: 'Loading simulation…', ja: 'シミュレーションを読み込み中…' },
  mine: { en: 'What I did', ja: '担当' },
  objective: { en: 'Goal', ja: '目的' },
  method: { en: 'How it works', ja: '方法' },
  status: { en: 'Where it stands', ja: '現状' },
  details: { en: 'Details', ja: '詳細' },
  rig: { en: 'Rig', ja: '実験装置' },
  figure: { en: 'Figure', ja: '図' },
  sim: { en: 'Simulation', ja: 'シミュレーション' },
  abstract: { en: 'Abstract', ja: '要旨' },
  versions: { en: 'Versions', ja: 'バージョン' },
  whatsNew: { en: 'New in v2', ja: 'v2の新機能' },
  changelog: { en: 'Changelog', ja: '変更履歴' },
  noSound: { en: 'no sound', ja: '音声なし' },
  interested: { en: 'Interested in this project? Email me.', ja: 'このプロジェクトに興味がありますか？ メールでご連絡ください。' },
  emailMe: { en: 'Email', ja: 'メール' },
  specStatus: { en: 'Status', ja: '状態' },
  specKind: { en: 'Kind', ja: '種類' },
  specStack: { en: 'Stack', ja: '技術' },
  specDesign: { en: 'Design', ja: '設計' },
}

const thumbOf = (p: Project) => {
  const m = p.media?.[0]
  if (m) return `${mediaBase()}${m.src}-640.webp`
  const v = p.videos?.[0]
  return v ? `${mediaBase()}${v.poster}-640.webp` : null
}

/**
 * A simulation opens in place from its poster and can be minimised back to it. It is only mounted while it is on screen,
 * so it stops running (and costs nothing) when the reader scrolls past it.
 */
function SimPanel({ project, lang }: { project: Project; lang: 'en' | 'ja' }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const host = useRef<HTMLDivElement>(null)
  const held = useRef(0)
  const S = project.sim ? SimView[project.sim] : null
  const t = (l: { en: string; ja: string }) => l[lang]
  useEffect(() => { setOpen(false) }, [project.slug])
  useEffect(() => {
    const el = host.current
    if (!el || !open) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); else { held.current = el.offsetHeight; setVisible(false) } }, { rootMargin: '120px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [open])
  if (!S) return null
  const poster = thumbOf(project)
  return (
    <div className="pw-sim" ref={host}>
      {open ? (
        <>
          <div className="sim-bar-top">
            <strong>{t(ui.sim)}</strong>
            <button className="btn" onClick={() => setOpen(false)}><Minimize2 size={14} aria-hidden="true" /> {t(ui.minimise)}</button>
          </div>
          {visible
            ? <Suspense fallback={<p className="tag">{t(ui.loading)}</p>}><S lang={lang} /></Suspense>
            : <div style={{ height: held.current }} aria-hidden="true" />}
        </>
      ) : (
        <button className="sim-poster" onClick={() => { setOpen(true); setVisible(true); dispatchEvent(new CustomEvent('portfolio:sim-play', { detail: project.slug })) }}>
          {poster && <img src={poster} alt="" width={640} height={400} loading="lazy" decoding="async" />}
          <span className="btn play"><Play size={16} aria-hidden="true" /> {t(ui.play)}</span>
        </button>
      )}
    </div>
  )
}

function Videos({ project, lang }: { project: Project; lang: 'en' | 'ja' }) {
  const base = import.meta.env.BASE_URL
  if (!project.videos?.length) return null
  const t = (l: { en: string; ja: string }) => l[lang]
  return (
    <div className="media pw-videos">
      {project.videos.map((v) => (
        <figure key={v.src}>
          <video muted playsInline controls preload="none" loop width={1280} height={720}
            poster={`${base}media/img/${v.poster}-640.webp`} aria-label={`${t(v.caption)} (${t(ui.noSound)})`}>
            <source src={`${base}media/vid/${v.src}.mp4`} type="video/mp4" />
            <source src={`${base}media/vid/${v.src}.webm`} type="video/webm" />
          </video>
          <figcaption>{t(v.caption)}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function Stepscribe({ lang }: { lang: 'en' | 'ja' }) {
  const t = (l: { en: string; ja: string }) => l[lang]
  const s = stepscribe
  return (
    <>
      <section className="pw-sec">
        <h2>{t(ui.versions)}</h2>
        <ul className="versions">
          {s.releases.map((r) => (
            <li key={r.version}>
              <strong>{r.version}</strong>
              <span className={r.state === 'released' ? 'ver-tag' : 'ver-tag dev'}>{r.state === 'released' ? (lang === 'en' ? 'Released' : '公開済み') : (lang === 'en' ? 'In development' : '開発中')}</span>
              <span>{t(r.note)}</span>
            </li>
          ))}
        </ul>
      </section>
      {s.whatsNewInV2.length > 0 && <section className="pw-sec"><h2>{t(ui.whatsNew)}</h2><ul className="plain">{s.whatsNewInV2.map((l) => <li key={l.en}>{t(l)}</li>)}</ul></section>}
      {s.screenshots.length > 0 && <div className="pw-sec"><Gallery items={s.screenshots.map((x) => ({ ...x, widths: [640, 1280] }))} lang={lang} /></div>}
      {s.changelog.length > 0 && (
        <section className="pw-sec">
          <h2>{t(ui.changelog)}</h2>
          {s.changelog.map((c) => <div key={c.version}><strong>{c.version}</strong> <span className="muted">{c.when}</span><ul className="plain">{c.changes.map((l) => <li key={l.en}>{t(l)}</li>)}</ul></div>)}
        </section>
      )}
    </>
  )
}

/** A project page: one scroll, its own address. Previous and next at the bottom, Back to work at the top, swipe or arrow keys between projects. */
export default function ProjectPage({ project }: { project: Project }) {
  const lang = useStore((s) => s.lang)
  const mode = useStore((s) => s.mode)
  const t = (l: { en: string; ja: string }) => l[lang]
  const [view, setView] = useState<'rig' | 'sim'>('rig')
  const idx = order.indexOf(project.slug)
  const prev = projects.find((p) => p.slug === order[(idx - 1 + order.length) % order.length])!
  const next = projects.find((p) => p.slug === order[(idx + 1) % order.length])!
  const info = tiles[project.slug]
  const root = useRef<HTMLElement>(null)

  useEffect(() => { setView('rig'); document.title = `${t(project.title)} | Idris Sadiq`; return () => { document.title = lang === 'ja' ? 'Idris Sadiq | ポートフォリオ' : 'Idris Sadiq | Portfolio' } }, [project.slug, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // arrow keys step through the projects (not while typing, on a slider, or with the image viewer open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('.lightbox')) return // a simulation that is driving with the arrow keys has already claimed them
      const typing = !!(e.target as HTMLElement).closest?.('input, select, textarea, [role="slider"], [role="tab"], .gallery')
      if (typing || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight') gotoProject(next.slug)
      else if (e.key === 'ArrowLeft') gotoProject(prev.slug)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [next.slug, prev.slug])

  // swipe left or right on a phone for the next or previous project, but never from a gallery, a simulation, a slider or a video
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok: !el.closest('.gallery, .pw-sim, .interactive, input, select, canvas, video, [role="slider"], .figure, svg') }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = touch.current; touch.current = null
    if (!s0?.ok) return
    const dx = e.changedTouches[0].clientX - s0.x, dy = e.changedTouches[0].clientY - s0.y
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2) gotoProject(dx < 0 ? next.slug : prev.slug)
  }

  const rows = (['objective', 'method', 'status'] as const).filter((k) => project.summary[k])
  const leadVideo = project.leadVideo && project.videos?.length
  const hasMedia = !!leadVideo || !!project.media?.length
  const Fig = FIGURES[project.slug]
  const S = project.sim ? SimView[project.sim] : null

  return (
    <article className="page" ref={root} aria-labelledby="pg-h" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="wrap page-wrap">
        <a className="back" href="#work" onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); backToWork() }}><ArrowLeft size={16} aria-hidden="true" /> {t(ui.back)}</a>

        <div className={`page-top${hasMedia ? ' has-media' : ''}`}>
          {hasMedia && (
            <div className="page-media">
              {leadVideo && <Videos project={{ ...project, videos: project.videos!.slice(0, 1) }} lang={lang} />}
              {project.media && project.media.length > 0 && <div className="page-gallery"><Gallery key={project.slug} items={project.media} lang={lang} morph /></div>}
            </div>
          )}
          <div className="page-intro surface">
            <p className="pw-status">{String(idx + 1).padStart(2, '0')} / {String(order.length).padStart(2, '0')}</p>
            <h1 id="pg-h" className="page-title">{t(project.title)}</h1>
            <p className="pw-lead">{info?.line ? t(info.line) : t(project.blurb)}</p>
            <dl className="spec">
              <div><dt>{t(ui.specStatus)}</dt><dd>{statusLabel[project.status][lang]}</dd></div>
              <div><dt>{t(ui.specKind)}</dt><dd>{t(project.eyebrow)}</dd></div>
              {project.tags.length > 0 && <div><dt>{t(ui.specStack)}</dt><dd>{project.tags.join(' · ')}</dd></div>}
              {project.credit && <div><dt>{t(ui.specDesign)}</dt><dd>{t(project.credit).replace(/^[^:：]*[:：]\s*/, '')}</dd></div>}
            </dl>
            {project.summary.mine && <section className="pw-sec"><h2>{t(ui.mine)}</h2><p>{t(project.summary.mine)}</p></section>}
            {rows.map((k) => <section className="pw-sec" key={k}><h2>{t(ui[k])}</h2><p>{t(project.summary[k]!)}</p></section>)}
            {project.paper && (
              <section className="pw-sec paper">
                <h2>{t(ui.abstract)}</h2>
                <p>{t(project.paper.abstract)}</p>
                <p className="muted">{t(project.paper.venue)}</p>
                <p><a className="btn" href={import.meta.env.BASE_URL + project.paper.href} target="_blank" rel="noopener noreferrer"><FileText size={14} aria-hidden="true" /> {t(project.paper.label)}</a></p>
              </section>
            )}
            {project.link && <p className="pw-link"><a href={project.link.href} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> {t(project.link.label)}</a></p>}
          </div>
        </div>

        {Fig ? (
          <div className="pw-sec">
            {S && (
              <div className="view-tabs" role="tablist" aria-label={lang === 'en' ? 'Figure or simulation' : '図かシミュレーション'}>
                <button role="tab" className="chip" aria-selected={view === 'rig'} aria-pressed={view === 'rig'} onClick={() => setView('rig')}>{project.slug === 'pid' ? t(ui.rig) : t(ui.figure)}</button>
                <button role="tab" className="chip" aria-selected={view === 'sim'} aria-pressed={view === 'sim'} onClick={() => setView('sim')}>{t(ui.sim)}</button>
              </div>
            )}
            {view === 'rig' || !S ? <Suspense fallback={null}><Fig lang={lang} /></Suspense> : <SimPanel project={project} lang={lang} />}
          </div>
        ) : S && <SimPanel project={project} lang={lang} />}

        {mode === 'chaos' && <Suspense fallback={null}><ChaosClue slug={project.slug} lang={lang} /></Suspense>}

        {project.slug === 'stepscribe' && <Stepscribe lang={lang} />}

        {project.more && project.more.length > 0 && (
          <details className="pw-details">
            <summary>{t(ui.details)}</summary>
            <div className="pw-details-body">{project.more.map((m) => <div key={m.title.en}><h2>{t(m.title)}</h2><p>{t(m.body)}</p></div>)}</div>
          </details>
        )}

        {project.credit && <p className="pw-credit">{t(project.credit)}</p>}
        <ProjectOpen slug={project.slug} />

        {!leadVideo && <Videos project={project} lang={lang} />}
        {leadVideo && project.videos!.length > 1 && <Videos project={{ ...project, videos: project.videos!.slice(1) }} lang={lang} />}


        <aside className="interest surface">
          <p>{t(ui.interested)}</p>
          <a className="btn primary" href={`mailto:${links.email}?subject=${encodeURIComponent((lang === 'ja' ? 'プロジェクトについて：' : 'About your project: ') + t(project.title))}`}>{t(ui.emailMe)}: {links.email}</a>
        </aside>

        <nav className="pn" aria-label={lang === 'en' ? 'More projects' : '他のプロジェクト'}>
          <a className="pn-a prev" href={`#work/${prev.slug}`} onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); gotoProject(prev.slug) }}>
            <span className="pn-dir"><ChevronLeft size={16} aria-hidden="true" /> {t(ui.prev)}</span>
            <strong>{t(tiles[prev.slug]?.short ?? prev.title)}</strong>
          </a>
          <a className="pn-a next" href={`#work/${next.slug}`} onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); gotoProject(next.slug) }}>
            <span className="pn-dir">{t(ui.next)} <ChevronRight size={16} aria-hidden="true" /></span>
            <strong>{t(tiles[next.slug]?.short ?? next.title)}</strong>
          </a>
        </nav>
        <p className="back-bottom"><a className="back" href="#work" onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); backToWork() }}><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" /> {t(ui.back)}</a></p>
      </div>
    </article>
  )
}
