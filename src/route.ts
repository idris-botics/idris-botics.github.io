import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { projects } from './content'

// Project pages live at #work/<slug>. A hash route works on GitHub Pages with a hard refresh and needs no server rules.
export const PREFIX = '#work/'
export const slugFromHash = (): string | null => {
  const h = location.hash
  const s = h.startsWith(PREFIX) ? decodeURIComponent(h.slice(PREFIX.length)) : ''
  return projects.some((p) => p.slug === s) ? s : null
}

const EVENT = 'portfolio:route'
let homeY = 0 // where the home page was scrolled to when a project page was opened

export function useRoute(): string | null {
  const [slug, setSlug] = useState<string | null>(slugFromHash)
  useEffect(() => {
    const sync = () => setSlug(slugFromHash())
    addEventListener('popstate', sync)
    addEventListener('hashchange', sync)
    addEventListener(EVENT, sync)
    return () => { removeEventListener('popstate', sync); removeEventListener('hashchange', sync); removeEventListener(EVENT, sync) }
  }, [])
  return slug
}

type VT = { finished: Promise<void>; ready: Promise<void> }
const canMorph = () => typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
let morphing = false

/** Runs `update` inside a View Transition when the browser has them (a fade, or the tile picture growing into the page picture); otherwise it just runs. */
function transition(update: () => void, name?: { el: HTMLElement | null | undefined; at: 'before' | 'after' }) {
  if (!canMorph() || morphing) { update(); return }
  morphing = true
  const root = document.documentElement
  root.classList.add('vt-run')
  if (name?.at === 'before' && name.el) name.el.style.viewTransitionName = 'proj'
  const t = (document as unknown as { startViewTransition: (f: () => void) => VT }).startViewTransition(() => {
    if (name?.at === 'before' && name.el) name.el.style.viewTransitionName = ''
    flushSync(update)
  })
  t.ready.catch(() => {})
  void t.finished.catch(() => {}).finally(() => { if (name?.el) name.el.style.viewTransitionName = ''; root.classList.remove('vt-run'); morphing = false })
}

/** Open a project page from the home page: remember the scroll position, push the address, and cross-fade (or morph the tile picture). */
export function openProject(slug: string, tileImg?: HTMLElement | null) {
  homeY = scrollY
  try { history.replaceState({ y: homeY }, '') } catch { /* ignore */ } // the home entry remembers its scroll position
  try { history.pushState({ from: 'home' }, '', PREFIX + slug) } catch { /* ignore */ }
  transition(() => { dispatchEvent(new Event(EVENT)); scrollTo({ top: 0, behavior: 'instant' }) }, { el: tileImg, at: 'before' })
  dispatchEvent(new CustomEvent('portfolio:project-open', { detail: slug }))
}

/** Previous or next project from a project page: a new history entry, back to the top. */
export function gotoProject(slug: string) {
  try { history.pushState({ from: 'project' }, '', PREFIX + slug) } catch { /* ignore */ }
  transition(() => { dispatchEvent(new Event(EVENT)); scrollTo({ top: 0, behavior: 'instant' }) })
  dispatchEvent(new CustomEvent('portfolio:project-open', { detail: slug }))
}

/** "Back to work": undo the push when we came from the home page (so Forward still works), otherwise go to the Work section. */
export function backToWork() {
  if ((history.state as { from?: string } | null)?.from === 'home') { history.back(); return }
  try { history.pushState({ from: 'project-back' }, '', '#work') } catch { /* ignore */ }
  dispatchEvent(new Event(EVENT))
}

/** Called once the home page is on screen again: put the scroll position back, or fall back to the Work section. */
export function restoreHome() {
  const y = (history.state as { y?: number } | null)?.y ?? homeY
  requestAnimationFrame(() => {
    if (y > 0) scrollTo({ top: y, behavior: 'instant' })
    else document.getElementById('work')?.scrollIntoView({ block: 'start' })
  })
}
