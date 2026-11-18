import { useEffect, useState } from 'react'
import { sfx } from './sfx'

/**
 * When the last achievement is found: the whole page is flushed. It spins, speeds up and shrinks down a drain in the middle of the screen, the drain
 * gurgles, the page comes back up out of it, and a huge REMIX IS ON fills the screen. (The page itself is main, the header and the footer; the
 * fixed things, the pet robot and the picture behind stay where they are.) Reduced motion skips the spinning and only shows the banner.
 * Styles: chaos.css, "remix flush".
 */
export default function RemixFlush({ lang, onDone }: { lang: 'en' | 'ja'; onDone: () => void }) {
  const [stage, setStage] = useState<'down' | 'hold' | 'up' | 'banner'>('down')
  useEffect(() => {
    const root = document.documentElement
    const targets = [...document.querySelectorAll<HTMLElement>('main, .site-header, .page-end')]
    const timers: number[] = []
    const at = (ms: number, f: () => void) => { timers.push(window.setTimeout(f, ms)) }
    const reset = () => { root.classList.remove('flush-down', 'flush-hold', 'flush-up'); targets.forEach((el) => { el.style.transformOrigin = '' }) }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage('banner'); sfx('fanfare')
      at(4000, onDone)
      return () => timers.forEach(clearTimeout)
    }
    // every part of the page spins around the middle of the screen, wherever the part is
    for (const el of targets) { const r = el.getBoundingClientRect(); el.style.transformOrigin = `${innerWidth / 2 - r.left}px ${innerHeight / 2 - r.top}px` }
    root.classList.add('flush-down'); sfx('flush')
    at(2600, () => { root.classList.replace('flush-down', 'flush-hold'); setStage('hold'); sfx('gurgle') })
    at(3700, () => { root.classList.replace('flush-hold', 'flush-up'); setStage('up'); sfx('pop') })
    at(4900, () => { reset(); setStage('banner'); sfx('fanfare') })
    at(9000, onDone)
    return () => { timers.forEach(clearTimeout); reset() }
  }, [onDone])
  return (
    <div className="remix-flush" aria-hidden={stage !== 'banner'}>
      <div className={stage === 'down' ? 'flush-hole grow' : stage === 'hold' ? 'flush-hole on' : stage === 'up' ? 'flush-hole shrink' : 'flush-hole'} aria-hidden="true" />
      {stage === 'banner' && (
        <div className="remix-banner" role="status">
          <b>{lang === 'en' ? 'REMIX IS ON' : 'リミックス ON'}</b>
          <span>{lang === 'en' ? 'The words no longer do what they say.' : 'もう、言葉どおりには動きません。'}</span>
        </div>
      )}
    </div>
  )
}
