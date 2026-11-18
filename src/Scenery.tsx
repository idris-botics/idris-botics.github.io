import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'

/**
 * The long, quiet landscape behind the page (the drawing is src/sceneryArt.ts, shown here from public/scenery.svg). It starts in a
 * soft dusk with a tiny rocket and travels with the page to a meadow where a small robot looks out at the view, so a little more of
 * it opens up as you scroll. Chaos shows a louder version of the same picture (public/scenery-chaos.svg).
 *
 * It is a single <img>: no extra DOM nodes for React to build, loaded when the page is idle so it never competes with the first
 * paint, and faded in. Browsers with scroll-driven animations move it from CSS alone (index.css); this file is the fallback for the
 * rest. With reduced motion the picture stays still.
 */
export default function Scenery({ still = false }: { still?: boolean }) {
  const sheet = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [loadedFile, setLoadedFile] = useState('') // which picture has arrived, so a new one fades in rather than popping
  const file = useStore((st) => st.mode === 'chaos') ? 'scenery-chaos.svg' : 'scenery.svg'

  // start loading the picture once the page itself has finished and the browser has a quiet moment
  useEffect(() => {
    let handle = 0
    const hasIdle = 'requestIdleCallback' in window
    const go = () => { handle = hasIdle ? requestIdleCallback(() => setReady(true), { timeout: 2500 }) : window.setTimeout(() => setReady(true), 400) }
    if (document.readyState === 'complete') go()
    else addEventListener('load', go, { once: true })
    return () => {
      removeEventListener('load', go)
      if (handle) { if (hasIdle) cancelIdleCallback(handle); else clearTimeout(handle) }
    }
  }, [])

  useEffect(() => {
    const el = sheet.current
    if (!el) return
    // Browsers with scroll-driven animations move the picture from CSS alone (see index.css); this is the fallback for the rest.
    if (still) return // a project page: CSS holds the picture still (index.css)
    if (CSS.supports('animation-timeline: scroll()')) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0, room = 0, travel = 0
    // The measurements are taken when the page changes size, never while scrolling, so a scroll frame only reads scrollY and
    // writes one transform.
    const measure = () => { room = document.documentElement.scrollHeight - innerHeight; travel = Math.max(0, el.offsetHeight - innerHeight); place() }
    const place = () => {
      raf = 0
      const p = reduced.matches || room <= 0 ? 0 : Math.min(1, Math.max(0, scrollY / room))
      el.style.transform = `translate3d(0, ${(-travel * p).toFixed(1)}px, 0)`
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(place) }
    measure()
    addEventListener('scroll', queue, { passive: true })
    addEventListener('resize', measure)
    const ro = new ResizeObserver(measure) // the page grows and shrinks (project pages, language, lazy content)
    ro.observe(document.documentElement)
    reduced.addEventListener('change', measure)
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', queue); removeEventListener('resize', measure); ro.disconnect(); reduced.removeEventListener('change', measure) }
  }, [still])

  return (
    <div className="scenery" aria-hidden="true">
      <div className={still ? 'scenery-sheet still' : 'scenery-sheet'} ref={sheet}>
        {ready && <img key={file} className={loadedFile === file ? 'on' : undefined} src={`${import.meta.env.BASE_URL}${file}`} alt="" width={2000} height={4000} decoding="async" fetchPriority="low" draggable={false} onLoad={() => setLoadedFile(file)} />}
      </div>
    </div>
  )
}
