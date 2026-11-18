import { useEffect, useState } from 'react'
import { sfx } from './sfx'

/**
 * When the last achievement is found: first a statement (everything is complete, nobody has been this far, the count goes back to zero, the words will
 * not mean what they used to). Then the whole site is flushed. It cracks and shakes, then every piece of it (each card, picture, heading, line of text,
 * button) comes loose and spirals into a drain in the middle of the screen, in streams, the pieces from further out arriving later; the background (the
 * painted picture, the grid) is sucked in too, and a white spreads out from the drain until there is nothing but whiteness left and the drain gurgling
 * in the middle. Then it all comes back up out of the drain, the white drains away, and a huge REMIX IS ON fills the screen.
 * The fixed things (the pet robot, the buttons) stay where they are. The pieces are the real elements, moved with the Web Animations API and put back
 * exactly as they were. Reduced motion skips the flush and shows only the statement and the banner.
 * Styles: chaos.css, "remix flush".
 */

const PIECES = [
  '.site-header .wrap > *', 'main h1', 'main h2', 'main h3', 'main p', 'main li', 'main figure', 'main .surface', 'main .tile', 'main .award', 'main .mini',
  'main .btn', 'main .scene', 'main .hero-photo', 'main img', 'main video', 'main .chip', 'main .photo-strip li', '.page-end .site-footer span',
].join(', ')

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const STATEMENT_MS = 5200

/** A path from where the piece is, spiralling in to the middle of the screen (dx, dy are relative to the piece's own place). */
function spiralFrames(cx: number, cy: number, turns: number, jitter: number): Keyframe[] {
  const r0 = Math.hypot(cx, cy) || 1, a0 = Math.atan2(cy, cx), N = 18
  const out: Keyframe[] = [{ offset: 0, transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 }]
  // a short crack and shudder before it lets go
  out.push({ offset: 0.07, transform: `translate(${rnd(-jitter, jitter)}px, ${rnd(-jitter, jitter)}px) rotate(${rnd(-3, 3)}deg) scale(.985)`, opacity: 1 })
  for (let k = 1; k <= N; k++) {
    const t = k / N, e = Math.pow(t, 1.9)
    const r = r0 * (1 - e), a = a0 - turns * Math.PI * 2 * e
    out.push({
      offset: 0.12 + 0.88 * t,
      transform: `translate(${(r * Math.cos(a) - cx).toFixed(1)}px, ${(r * Math.sin(a) - cy).toFixed(1)}px) rotate(${(-turns * 360 * e).toFixed(1)}deg) scale(${(1 - 0.98 * e).toFixed(3)})`,
      opacity: t > 0.9 ? 1 - (t - 0.9) * 8 : 1,
    })
  }
  return out
}

type Props = {
  lang: 'en' | 'ja'
  /** How many achievements there are. */
  total: number
  /** Which completion this is: 1 the first time, 2 and more when it is done again. */
  run: number
  /** Called when it is all over. */
  onDone: () => void
}

export default function RemixFlush({ lang, total, run, onDone }: Props) {
  const [stage, setStage] = useState<'statement' | 'flush' | 'banner'>('statement')
  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, f: () => void) => { timers.push(window.setTimeout(f, ms)) }
    const anims: Animation[] = []
    const stop = (e: Event) => e.preventDefault()
    let holeIn: Animation | undefined, whiteIn: Animation | undefined
    const finish = () => {
      anims.forEach((a) => a.cancel()); holeIn?.cancel(); whiteIn?.cancel()
      removeEventListener('wheel', stop); removeEventListener('touchmove', stop)
    }
    addEventListener('wheel', stop, { passive: false }); addEventListener('touchmove', stop, { passive: false })
    sfx('fanfare'); at(STATEMENT_MS - 1500, () => sfx('shake'))

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      at(STATEMENT_MS - 600, () => { setStage('banner'); sfx('fanfare') })
      at(STATEMENT_MS + 4000, () => { finish(); onDone() })
      return () => { timers.forEach(clearTimeout); finish() }
    }

    const startFlush = () => {
      setStage('flush')
      const W = innerWidth, H = innerHeight
      const white = document.querySelector<HTMLElement>('.rf-white')
      const hole = document.querySelector<HTMLElement>('.flush-hole')
      // the pieces: everything on screen that is part of the page (the fixed things stay)
      const seen = new Set<Element>()
      const pieces = [...document.querySelectorAll<HTMLElement>(PIECES)].filter((el) => {
        if (seen.has(el)) return false
        seen.add(el)
        const r = el.getBoundingClientRect()
        return r.width > 6 && r.height > 6 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W && getComputedStyle(el).position !== 'fixed'
      }).slice(0, 140)
      // the background: the painted picture and the grid canvases (full-screen, fixed)
      const layers = [...document.querySelectorAll<HTMLElement>('.scenery, canvas')].filter((el) => getComputedStyle(el).position === 'fixed')
      const maxR = Math.hypot(W / 2, H / 2)
      sfx('flush')
      for (const el of pieces) {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2 - W / 2, cy = r.top + r.height / 2 - H / 2
        const far = Math.hypot(cx, cy) / maxR // 0 at the middle, about 1 at the corners
        // the pieces nearest the drain go first, the far ones follow in a stream
        anims.push(el.animate(spiralFrames(cx, cy, rnd(1.4, 2.6), 6), { duration: rnd(1500, 2100) + 380, delay: 350 + (1 - far) * 650 + rnd(0, 450), easing: 'linear', fill: 'both' }))
      }
      for (const el of layers) anims.push(el.animate([{ transform: 'rotate(0deg) scale(1)', opacity: 1 }, { transform: 'rotate(-720deg) scale(.02)', opacity: 1 }], { duration: 2300, delay: 700, easing: 'cubic-bezier(.55, 0, .9, .45)', fill: 'both' }))
      // the drain opens, and white spreads out from it until nothing else is left
      holeIn = hole?.animate([{ scale: 0 }, { scale: 1 }], { duration: 2100, delay: 500, easing: 'ease-in', fill: 'both' })
      whiteIn = white?.animate([{ clipPath: 'circle(0px at 50% 50%)' }, { clipPath: `circle(${Math.ceil(maxR * 1.05)}px at 50% 50%)` }], { duration: 1900, delay: 1250, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'both' })
      at(2900, () => sfx('gurgle'))
      // the pieces and the background are all gone by about 3.3 s; the white holds for a moment; then everything comes back up out of the drain
      const BACK = 4700
      at(BACK - 400, () => sfx('pop'))
      pieces.forEach((_, i) => { const a = anims[i]; at(BACK + rnd(0, 700), () => { a.playbackRate = -1.5; a.play() }) })
      layers.forEach((_, i) => { const a = anims[pieces.length + i]; at(BACK + 200, () => { a.playbackRate = -1.5; a.play() }) })
      at(BACK + 250, () => { white?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 200, fill: 'forwards' }) })
      at(BACK + 500, () => { if (holeIn) { holeIn.playbackRate = -2; holeIn.play() } })
      // all back: put every piece exactly as it was, and show the banner
      at(BACK + 2600, () => { finish(); setStage('banner'); sfx('fanfare') })
      at(BACK + 2600 + 4000, onDone)
    }
    at(STATEMENT_MS, startFlush)
    return () => { timers.forEach(clearTimeout); finish() }
  }, [onDone])

  const L = (en: string, ja: string) => (lang === 'en' ? en : ja)
  return (
    <div className="remix-flush" aria-hidden={stage !== 'banner'}>
      <div className="rf-white" aria-hidden="true" />
      <div className="flush-hole" aria-hidden="true" />
      {stage === 'statement' && (
        <div className="remix-statement" role="status" aria-hidden="false">
          <p className="rs-a">{run <= 1 ? L(`ALL ${total} ACHIEVEMENTS COMPLETE`, `実績${total}個、すべて達成`) : L(`ALL ${total} COMPLETE. AGAIN.`, `実績${total}個、もう一度すべて達成`)}</p>
          <p className="rs-b">{run <= 1 ? L('Nobody has ever made it this far.', 'ここまで来た人は、これまで誰もいません。') : L('Run number ' + run + '. Nobody else is here.', run + '周目です。ほかには誰もいません。')}</p>
          <p className="rs-c">{L('So the whole site is about to be taken apart.', 'なので、サイトをまるごと分解します。')}</p>
          <p className="rs-d">{L('Your count goes back to zero. The words will not mean what they used to.', 'カウントはゼロに戻ります。言葉は、もう元の意味ではなくなります。')}</p>
        </div>
      )}
      {stage === 'banner' && (
        <div className="remix-banner" role="status">
          <b>{L('REMIX IS ON', 'リミックス ON')}</b>
          <span>{L('The words no longer do what they say.', 'もう、言葉どおりには動きません。')}</span>
        </div>
      )}
    </div>
  )
}
