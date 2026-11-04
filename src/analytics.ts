// Google Analytics 4 (gtag.js). Off unless VITE_GA_MEASUREMENT_ID is set at build time, and off for visitors who send Do Not Track.
// The Google script is added from here (the page's CSP allows no inline scripts), after the page has loaded, so it never blocks rendering.
const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
type Gtag = (...args: unknown[]) => void
declare global { interface Window { dataLayer?: unknown[]; gtag?: Gtag } }

const enabled = () => !!id && /^G-[A-Z0-9]+$/.test(id) && navigator.doNotTrack !== '1'
const send: Gtag = (...args) => { window.gtag?.(...args) }

let lastPath = ''
function pageView() {
  const path = location.pathname + location.hash
  if (path === lastPath) return // never send the same view twice
  lastPath = path
  send('event', 'page_view', { page_path: path, page_location: location.href, page_title: document.title })
}

/** What kind of outbound link is this, if any? Labels are the destination only; nothing about the visitor. */
function linkKind(a: HTMLAnchorElement): string | null {
  if (a.protocol === 'mailto:') return 'email'
  if (/\.pdf($|\?)/i.test(a.pathname)) return 'paper_or_cv'
  if (a.origin === location.origin) return null
  if (/github\.com$/i.test(a.hostname)) return 'github'
  if (/linkedin\.com$/i.test(a.hostname)) return 'linkedin'
  return 'external'
}

export function initAnalytics() {
  if (!enabled()) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer!.push(arguments) } // gtag.js needs the real `arguments` object
  send('js', new Date())
  // page views are sent by hand (single-page app), and with no ad or cross-device features
  send('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })

  const load = () => {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    document.head.appendChild(s)
  }
  if (document.readyState === 'complete') load(); else addEventListener('load', load, { once: true })

  pageView()
  addEventListener('hashchange', () => { pageView() })

  // moving between the home sections
  const seen = new Set<string>()
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || seen.has(e.target.id)) continue
      seen.add(e.target.id)
      send('event', 'section_view', { section: e.target.id })
    }
  }, { threshold: 0.4 })
  const watch = () => document.querySelectorAll('main section[id]').forEach((el) => io.observe(el))
  new MutationObserver(watch).observe(document.getElementById('root')!, { childList: true, subtree: true })
  watch()

  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    const kind = a && linkKind(a)
    if (a && kind) send('event', 'outbound_click', { link_type: kind, link_url: a.protocol === 'mailto:' ? 'mailto' : a.href })
  }, { capture: true })
}
