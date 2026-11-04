import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Mail, Pause, Play, X } from 'lucide-react'
import { useStore } from './store'
import { useReducedMotion } from './lib/hooks'
import PointField from './PointField'
import HeroScene from './HeroScene'
import PaperGrid from './PaperGrid'
import Toolpath from './Toolpath'
import ChaosGate from './ChaosGate'
import ChaosGuard from './chaos/ChaosGuard'
import { Documents } from './Extras'
import { tidyThen } from './lib/tidy'
import Work from './Work'
import { Gallery } from './Gallery'
import { Reveal, Tick } from './Reveal'
import { hero, aboutText, pathRows, learning, extras, fieldEvents, strip, projects, habits, links, type L } from './content'
import { personal } from './personal'
import ProjectPage from './ProjectPage'
import { restoreHome, useRoute } from './route'

/** The hero picture is a 15 s muted loop built from real build photos and simulation footage. Reduced motion shows the first frame and a play button. */
function HeroReel({ lang }: { lang: 'en' | 'ja' }) {
  const base = import.meta.env.BASE_URL
  const reduce = useReducedMotion()
  const [playing, setPlaying] = useState<boolean | null>(null) // null: follow the reduced-motion setting
  // Save-Data or a slow connection: the poster and a play button, nothing downloads until it is pressed
  const [slow] = useState(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    return !!c && (c.saveData === true || /(^|-)[23]g$/.test(c.effectiveType ?? ''))
  })
  const on = playing ?? !(reduce || slow)
  const vid = useRef<HTMLVideoElement>(null)
  const small = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 800px)').matches
  useEffect(() => { const v = vid.current; if (!v) return; if (on) void v.play().catch(() => {}); else v.pause() }, [on])
  const label = on ? (lang === 'en' ? 'Pause the video' : '動画を止める') : (lang === 'en' ? 'Play the video' : '動画を再生')
  return (
    <figure className="hero-photo">
      <video ref={vid} muted loop playsInline autoPlay={!(reduce || slow)} preload={slow ? 'none' : 'metadata'} poster={`${base}media/img/hero-reel-poster-${small ? 640 : 1280}.webp`} width={1920} height={1080}
        aria-label={lang === 'en' ? 'A short loop of my builds: RoboDog, an 8-bit computer, a battery pack, a PID simulation, a wristband, and more.' : '私の制作物の短いループ映像：RoboDog、8ビットコンピュータ、バッテリー、PIDシミュレーション、リストバンドなど。'}>
        <source src={`${base}media/vid/hero-reel-${small ? 720 : 1080}.mp4`} type="video/mp4" />
        <source src={`${base}media/vid/hero-reel-720.webm`} type="video/webm" />
      </video>
      {/* no pause button while it plays; when it is not playing (reduced motion, Save-Data, slow connection) a play button starts it */}
      {!on && <button className="reel-btn" onClick={() => setPlaying(true)} aria-label={label} title={label}><Play size={16} aria-hidden="true" /></button>}
    </figure>
  )
}

/** The still from the second version of the site. Hover (mouse) or the play button (touch, keyboard) runs a 6 s muted peek once. Reduced motion, Save-Data and slow connections keep the still. */
function PeekReel({ alt, lang }: { alt: string; lang: 'en' | 'ja' }) {
  const base = import.meta.env.BASE_URL
  const reduce = useReducedMotion()
  const [slow] = useState(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    return !!c && (c.saveData === true || /(^|-)[23]g$/.test(c.effectiveType ?? ''))
  })
  const [run, setRun] = useState(false)
  const vid = useRef<HTMLVideoElement>(null)
  const can = !(reduce || slow)
  const start = () => { const v = vid.current; if (!v || !can) return; v.currentTime = 0; setRun(true); void v.play().catch(() => setRun(false)) }
  const stop = () => { const v = vid.current; if (!v) return; v.pause(); v.currentTime = 0; setRun(false) }
  const hoverOk = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
  const label = lang === 'en' ? 'Play a 6 second preview' : '6秒のプレビューを再生'
  return (
    <figure className="peek-fig" onPointerEnter={() => hoverOk && start()} onPointerLeave={() => hoverOk && stop()}>
      <img src={`${base}media/img/second-site-640.webp`} srcSet={`${base}media/img/second-site-640.webp 640w, ${base}media/img/second-site-1280.webp 1280w`} sizes="(max-width: 800px) 100vw, 420px"
        width={1280} height={800} alt={alt} loading="lazy" decoding="async" />
      {can && <video ref={vid} className={run ? 'on' : ''} src={`${base}media/vid/peek-second.mp4`} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} onEnded={() => setRun(false)} />}
      {can && <button className="reel-btn" onClick={run ? stop : start} aria-label={run ? (lang === 'en' ? 'Stop the preview' : 'プレビューを止める') : label} title={label}>{run ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>}
    </figure>
  )
}

const Chaos = lazy(() => import('./chaos/Chaos'))

const ui = {
  skip: { en: 'Skip to content', ja: '本文へ' },
  nav: { about: { en: 'About', ja: '自己紹介' }, work: { en: 'Work', ja: '制作' }, path: { en: 'Path', ja: '経歴' }, contact: { en: 'Contact', ja: '連絡先' } },
  seeWork: { en: 'See my work', ja: '制作を見る' },
  email: { en: 'Email me', ja: 'メールする' },
  cv: { en: 'CV (PDF)', ja: '履歴書（PDF）' },
  about: { en: 'About', ja: '自己紹介' },
  path: { en: 'Path', ja: '経歴' },
  beyond: { en: 'Beyond the lab', ja: '研究室の外で' },
  contact: { en: 'Contact', ja: '連絡先' },
  contactBody: {
    en: 'I am exploring Master’s opportunities in robotics in Japan, especially in autonomous systems, swarm robotics and space robotics. I am also open to research collaborations, internships, and any chance to learn and contribute to robotics research.',
    ja: '日本のロボティクス分野、特に自律システム、群ロボット、宇宙ロボティクスの修士課程の機会を探しています。共同研究やインターン、そしてロボティクス研究に貢献しながら学べる機会があれば、ぜひ関わりたいと考えています。',
  },
  certs: { en: 'Certificates and field visits', ja: '資格・学習・見学' },
  chaosOn: { en: 'Enter Chaos', ja: 'カオスに入る' },
  chaosOff: { en: 'Restore order', ja: '元に戻す' },
  modeWord: { en: 'Chaos', ja: 'カオス' },
  modeLabel: { en: 'Switch to Chaos mode', ja: 'カオスモードに切り替える' },
  modeHint: { en: 'Chaos mode: the same portfolio, just louder. You can leave at any time.', ja: 'カオスモード：中身は同じで、少し賑やか。いつでも戻れます。' },
  peekTitle: { en: 'One more thing', ja: 'もう一つだけ' },
  peekBody: {
    en: 'I also built a second version of this site, just for fun. It has a physics engine, a synthesizer and secrets. It took longer than some of my robots.',
    ja: 'このサイトの別バージョンも、遊びで作りました。物理エンジン、シンセサイザー、隠し要素があります。ロボットのいくつかより時間がかかりました。',
  },
  peekShows: { en: 'Physics simulation · sound synthesis · state machines · accessibility · Japanese localisation', ja: '物理シミュレーション · 音の合成 · 状態機械 · アクセシビリティ · 日本語対応' },
  peekAlt: { en: 'A still from Chaos mode: the same portfolio with a bright cartoon skin.', ja: 'カオスモードの一場面：同じポートフォリオに明るいマンガ調の見た目をつけたもの。' },
  footer: { en: 'Designed and built by Idris Sadiq, with help from a few AI tools, and mostly powered by coffee.', ja: '設計と制作はIdris Sadiq。いくつかのAIツールの助けを借り、動力はほとんどコーヒーです。' },
  lite: { en: 'Lite mode: simulations start paused.', ja: '軽量モード：シミュレーションは停止状態で始まります。' },
  streak: { en: 'day Duolingo streak', ja: '日連続のDuolingo' },
  facts: {
    study: { en: 'Final-year B.E. EEE, SRM Easwari', ja: '電気電子工学科 学部4年（SRM Easwari）' },
    abb: { en: 'Research intern, ABB Global CoE', ja: '研究インターン（ABB Global CoE）' },
    jp: { en: 'JLPT N5 and NAT-TEST 4Q passed', ja: 'JLPT N5・NAT-TEST 4Q合格' },
  },
}

const subjectEn = 'Inquiry from your portfolio'
const subjectJa = 'ポートフォリオを拝見してのお問い合わせ'

// Splits the name into letters: they resolve once on load, and the Chaos "title prank" can knock them around.
function Name() {
  return (
    <h1 data-name aria-label={hero.name}>
      {[...hero.name].map((c, i) => <span className="ltr" aria-hidden="true" key={i} style={{ animationDelay: `${i * 40}ms` }}>{c === ' ' ? ' ' : c}</span>)}
    </h1>
  )
}

const SECTIONS = ['about', 'work', 'path', 'contact']
const TOOLPATH_IDS = ['about', 'work', 'path', 'beyond', 'contact'] as const
/** The section nearest the top of the viewport, for the nav underline. */
function useActiveSection(on: boolean) {
  const [active, setActive] = useState('')
  useEffect(() => {
    if (!on) return
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis.length) setActive(vis[0].target.id)
    }, { rootMargin: '-20% 0px -60% 0px' })
    els.forEach((e) => io.observe(e))
    const top = () => { if (scrollY < 200) setActive('') }
    addEventListener('scroll', top, { passive: true })
    return () => { io.disconnect(); removeEventListener('scroll', top) }
  }, [on])
  return active
}

export default function App() {
  const { lang, setLang, mode, toggleMode, evicted, setEvicted } = useStore()
  const t = (l: L) => l[lang]
  const [gate, setGate] = useState(false)
  const [lite] = useState(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''))
  })
  const base = import.meta.env.BASE_URL
  const slug = useRoute()
  const project = slug ? projects.find((p) => p.slug === slug) ?? null : null
  const tpPoints = useMemo(() => TOOLPATH_IDS.map((id) => ({ id, label: id === 'beyond' ? ui.beyond[lang] : ui.nav[id][lang] })), [lang])
  const active = useActiveSection(!slug)
  const wasProject = useRef(false)
  // coming back from a project page: the home page is where the reader left it
  useEffect(() => { if (!project && wasProject.current) restoreHome(); wasProject.current = !!project }, [project])

  // Japanese web font is loaded only for Japanese readers
  useEffect(() => { if (lang === 'ja') void import('@fontsource-variable/noto-sans-jp') }, [lang])
  useEffect(() => { document.title = lang === 'ja' ? 'Idris Sadiq | ポートフォリオ' : 'Idris Sadiq | Portfolio' }, [lang])

  const openGate = () => { setEvicted(false); setGate(true) }
  const warm = () => { void import('./chaos/Chaos') }

  return (
    <>
      <a className="skip" href="#main">{t(ui.skip)}</a>
      <PaperGrid wobble={mode === 'chaos'} />
      {!project && mode === 'calm' && <Toolpath key={lang} points={tpPoints} label={lang === 'en' ? 'Page sections' : 'ページの区切り'} />}
      {mode === 'chaos' && <PointField variant="chaos" />}
      <header className="site-header">
        <div className="wrap">
          <strong className="brand" style={{ fontFamily: 'var(--font-head)' }}>Idris Sadiq</strong>
          <nav aria-label="Primary">
            {SECTIONS.map((id) => <a key={id} href={`#${id}`} className={active === id ? 'on' : undefined} aria-current={active === id ? 'location' : undefined}>{t(ui.nav[id as 'about' | 'work' | 'path' | 'contact'])}</a>)}
          </nav>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => setLang(lang === 'en' ? 'ja' : 'en')} lang={lang === 'en' ? 'ja' : 'en'} title={lang === 'en' ? 'Switch language' : '言語切替'}>
            {lang === 'en' ? '日本語' : 'English'}
          </button>
          {mode === 'chaos' && <button className="btn chaos-btn" onClick={() => tidyThen(toggleMode)} aria-pressed>{t(ui.chaosOff)}</button>}
        </div>
      </header>

      {evicted && mode === 'calm' && (
        <div className="evicted" role="alert">
          <span>{lang === 'en' ? "You have been evicted by Idris' pet robot. Please try again." : 'Idrisのペットロボットに追い出されました。もう一度お試しください。'}</span>
          <button className="btn" onClick={() => setEvicted(false)} aria-label={lang === 'en' ? 'Dismiss' : '閉じる'}><X size={16} aria-hidden="true" /></button>
        </div>
      )}
      {gate && <ChaosGate lang={lang} onCancel={() => setGate(false)} onConfirm={() => { setGate(false); scrollTo({ top: 0, behavior: 'instant' }); toggleMode() }} />}

      {project && <main id="main"><ProjectPage project={project} /></main>}
      {!project && <main id="main">
        <div>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-text">
              <Name />
              <p className="hero-line">{t(hero.line)}</p>
              <p className="hero-sub">{t(hero.sub)}</p>
              <div className="hero-actions">
                <a className="btn primary" href="#work">{t(ui.seeWork)}</a>
                <a className="btn" href={`mailto:${links.email}?subject=${encodeURIComponent(lang === 'ja' ? subjectJa : subjectEn)}`}><Mail size={14} aria-hidden="true" /> {t(ui.email)}</a>
                {personal.cv.en && <a className="quiet" href={base + personal.cv.en} download>{t(ui.cv)}</a>}
              </div>
            </div>
            <HeroReel lang={lang} />
          </div>
          <div className="wrap"><HeroScene /></div>
        </section>

        <section id="about" className="sec" aria-labelledby="ab">
          <div className="wrap about-grid">
            <div>
              <h2 id="ab">{t(ui.about)}</h2>
              {aboutText.map((p, i) => <Reveal key={i} delay={i * 50}><p className="about-p">{t(p)}</p></Reveal>)}
            </div>
            <ul className="facts">
              <li>{personal.links.duolingo ? <a className="quiet-link" href={personal.links.duolingo} target="_blank" rel="noopener noreferrer"><Tick to={habits.duolingoDays} locale={lang} /> {t(ui.streak)}</a> : <><Tick to={habits.duolingoDays} locale={lang} /> {t(ui.streak)}</>}, {t(ui.facts.jp)}</li>
            </ul>
          </div>
        </section>

        </div>

        <Work />

        <section id="path" className="sec" aria-labelledby="pt">
          <div className="wrap">
            <h2 id="pt">{t(ui.path)}</h2>
            <ol className="path">
              {pathRows.map((r) => <li key={r.when + r.text.en}><span className="when">{r.when}</span><span>{t(r.text)}</span></li>)}
            </ol>
            <details className="certs">
              <summary>{t(ui.certs)} ({learning.reduce((n, g) => n + g.items.length, 0) + fieldEvents.length + extras.length})</summary>
              <div className="certs-body">
                {learning.map((g) => (
                  <div key={g.theme.en}>
                    <h3>{t(g.theme)}</h3>
                    <ul>{g.items.map((l) => <li key={l.en}>{t(l)}</li>)}</ul>
                  </div>
                ))}
                <div>
                  <h3>{lang === 'en' ? 'Publications and awards' : '論文・受賞'}</h3>
                  <ul>{extras.map((x) => <li key={x.text.en}>{t(x.text)}{x.link && <> <a href={base + x.link.href} target="_blank" rel="noopener noreferrer" aria-label={`${t(x.text)} (PDF)`}>{t(x.link.label)}</a></>}</li>)}</ul>
                </div>
                <div>
                  <h3>{lang === 'en' ? 'Out in the field' : '現場での学び'}</h3>
                  <ul>{fieldEvents.map((l) => <li key={l.en}>{t(l)}</li>)}</ul>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section id="beyond" className="sec" aria-labelledby="bl">
          <div className="wrap">
            <h2 id="bl">{t(ui.beyond)}</h2>
            <ul className="photo-strip">
              {strip.map((s) => (
                <li key={s.media.src}>
                  <Gallery items={[s.media]} lang={lang} />
                  <p>{s.link ? <a href={s.link.href} target="_blank" rel="noopener noreferrer" aria-label={t(s.link.label)}>{t(s.caption)} <ExternalLink size={12} aria-hidden="true" /></a> : t(s.caption)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className="sec contact" aria-labelledby="ct">
          <div className="wrap">
            <h2 id="ct">{t(ui.contact)}</h2>
            <p className="contact-body">{t(ui.contactBody)}</p>
            <div className="contact-row">
              <a className="btn" href={`mailto:${links.email}?subject=${encodeURIComponent(lang === 'ja' ? subjectJa : subjectEn)}`}><Mail size={14} aria-hidden="true" /> {links.email}</a>
              <a href={links.linkedin} rel="noopener noreferrer" target="_blank"><ExternalLink size={14} aria-hidden="true" /> LinkedIn</a>
              <a href={links.github} rel="noopener noreferrer" target="_blank"><ExternalLink size={14} aria-hidden="true" /> GitHub</a>
              <Documents />
            </div>
          </div>
        </section>
      </main>}

      {mode === 'calm' && !project && (
        <section className="sec peek" aria-labelledby="om">
          <div className="wrap peek-grid">
            <svg className="peek-bot" viewBox="0 0 64 44" aria-hidden="true"><line x1="32" y1="2" x2="32" y2="10" stroke="#26221f" strokeWidth="3" strokeLinecap="round" /><circle cx="32" cy="4" r="4" fill="#ee6a4c" stroke="#26221f" strokeWidth="2.5" /><rect x="8" y="10" width="48" height="34" rx="9" fill="#f2b441" stroke="#26221f" strokeWidth="3" /><rect x="14" y="16" width="36" height="22" rx="6" fill="#3f6fb5" stroke="#26221f" strokeWidth="2.5" /><circle cx="25" cy="27" r="5" fill="#fff8ea" /><circle cx="39" cy="27" r="5" fill="#fff8ea" /><circle cx="26" cy="28" r="2.4" fill="#26221f" /><circle cx="40" cy="28" r="2.4" fill="#26221f" /></svg>
            <PeekReel alt={t(ui.peekAlt)} lang={lang} />
            <div>
              <h2 id="om">{t(ui.peekTitle)}</h2>
              <p>{t(ui.peekBody)}</p>
              <p className="peek-shows">{t(ui.peekShows)}</p>
              <button className="btn" onClick={openGate} onMouseEnter={warm} onFocus={warm}>{t(ui.chaosOn)}</button>
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="wrap">
          <span>{t(ui.footer)}</span>
          {lite && <span className="lite"> · {t(ui.lite)}</span>}
        </div>
      </footer>

      {mode === 'chaos' && <ChaosGuard key="chaos"><Suspense fallback={null}><Chaos /></Suspense></ChaosGuard>}
    </>
  )
}
