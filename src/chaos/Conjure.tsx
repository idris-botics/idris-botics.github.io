import { useCallback, useEffect, useRef, useState } from 'react'
import Clip from './Clip'

type L = { en: string; ja: string }
type Props = {
  lang: 'en' | 'ja'
  say: (text: string, ms?: number) => boolean
  award: (id: string) => void
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const BUSY = '.clip, .rick, .cena, .omae, .summon, .coffee-flood, .coffee-brew, .page'

const SUPREME: { w: number; line: L }[] = [
  { w: 6, line: { en: 'Did you summon the supreme one?', ja: '至高の存在をお呼びになりましたか？' } },
  { w: 1, line: { en: 'You rang?', ja: 'お呼びですか？' } },
  { w: 1, line: { en: 'Please hold, the supreme one is buffering.', ja: '少々お待ちください。至高の存在はバッファリング中です。' } },
  { w: 1, line: { en: 'I would sign autographs but my hands are mostly code.', ja: 'サインしたいのですが、私の手はほとんどコードです。' } },
]
const CAT_TAUNTS: L[] = [
  { en: 'Nope.', ja: 'だめ。' },
  { en: 'Too slow.', ja: '遅い。' },
  { en: 'You came for the cat. Stay for the cat.', ja: '猫を見に来たのですから、猫を見ていてください。' },
  { en: 'Cats do not do closing.', ja: '猫は「閉じる」をしません。' },
  { en: 'Not yet. The cat is not finished.', ja: 'まだです。猫の話は終わっていません。' },
]
const pickLine = () => {
  const total = SUPREME.reduce((n, s) => n + s.w, 0)
  let r = Math.random() * total
  for (const s of SUPREME) { r -= s.w; if (r <= 0) return s.line }
  return SUPREME[0].line
}

/**
 * Two typed secrets, here or from the phone command box:
 *  - "idris": confetti and fireworks, and the whimsical photo in a fancy royal frame. The pet robot bows and asks if you summoned the supreme one.
 *  - "cat": the cat video in a popup, in full, with sound and controls, looping no more than twice. Its close button runs away for 60 seconds.
 */
export default function Conjure({ lang, say, award }: Props) {
  const [summon, setSummon] = useState(false)
  const [cat, setCat] = useState(false)
  const live = useRef({ lang, say, award })
  useEffect(() => { live.current = { lang, say, award } })
  const dodges = useRef(0)

  const openSummon = useCallback(() => {
    if (document.querySelector(BUSY)) return
    setSummon(true)
    live.current.award('idris')
    dispatchEvent(new Event('portfolio:bow'))
    window.setTimeout(() => live.current.say(pickLine()[live.current.lang], 6500), 500)
  }, [])
  const openCat = useCallback(() => {
    if (document.querySelector(BUSY)) return
    dodges.current = 0
    setCat(true)
    live.current.award('cat')
  }, [])

  // typed words (never while typing in a box)
  useEffect(() => {
    let buf = ''
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
      buf = (buf + e.key.toLowerCase()).slice(-8)
      if (buf.endsWith('idris')) { buf = ''; openSummon() }
      else if (buf.endsWith('cat')) { buf = ''; openCat() }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [openSummon, openCat])

  // the portrait closes with a tap or Escape
  useEffect(() => {
    if (!summon) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setSummon(false) } }
    addEventListener('keydown', esc, true)
    return () => removeEventListener('keydown', esc, true)
  }, [summon])

  const base = import.meta.env.BASE_URL
  const confetti = useRef(Array.from({ length: 56 }, (_, i) => ({ x: (i * 53) % 100, d: 2.2 + ((i * 7) % 18) / 10, dl: ((i * 11) % 14) / 10, c: ['#ee6a4c', '#f2b441', '#9ed9cb', '#afcbea', '#fff8ea'][i % 5], r: (i * 47) % 360 }))).current
  const bursts = [{ x: 18, y: 26 }, { x: 80, y: 20 }, { x: 50, y: 12 }, { x: 12, y: 62 }, { x: 88, y: 58 }]
  const label = lang === 'en' ? 'The supreme one' : '至高の存在'

  return (
    <>
      {summon && (
        <div className="summon" role="dialog" aria-modal="true" aria-label={label} onClick={() => setSummon(false)}>
          {!reduced() && (
            <div className="summon-fx" aria-hidden="true">
              {confetti.map((c, i) => <i key={i} className="confetti" style={{ left: `${c.x}%`, background: c.c, animationDuration: `${c.d}s`, animationDelay: `${c.dl}s`, ['--r' as string]: `${c.r}deg` }} />)}
              {bursts.map((b, i) => (
                <span key={i} className="firework" style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${0.3 + i * 0.35}s` }}>
                  {Array.from({ length: 12 }, (_, j) => <b key={j} style={{ ['--a' as string]: `${j * 30}deg`, background: ['#ee6a4c', '#f2b441', '#afcbea'][(i + j) % 3] }} />)}
                </span>
              ))}
            </div>
          )}
          <figure className="royal">
            <div className="royal-frame">
              <picture>
                <source type="image/avif" srcSet={`${base}media/img/idris-whimsy-480.avif 480w, ${base}media/img/idris-whimsy-960.avif 960w`} sizes="(max-width: 600px) 70vw, 360px" />
                <source type="image/webp" srcSet={`${base}media/img/idris-whimsy-480.webp 480w, ${base}media/img/idris-whimsy-960.webp 960w`} sizes="(max-width: 600px) 70vw, 360px" />
                <img src={`${base}media/img/idris-whimsy-960.jpg`} width={480} height={640} alt={lang === 'en' ? 'Idris Sadiq in pixel sunglasses, grinning' : 'ピクセルのサングラスをかけて笑うIdris Sadiq'} />
              </picture>
              {!reduced() && ['tl', 'tr', 'bl', 'br', 'tm', 'bm'].map((p) => <span key={p} className={`sparkle ${p}`} aria-hidden="true">✦</span>)}
            </div>
            <figcaption>{lang === 'en' ? 'His Supreme Idrisness' : '至高のIdris様'}</figcaption>
          </figure>
          <p className="summon-hint">{lang === 'en' ? 'Tap or press Escape to dismiss' : 'タップかEscapeで閉じる'}</p>
        </div>
      )}
      {cat && (
        <Clip
          name="cat" lang={lang} label={lang === 'en' ? 'A cat video' : '猫の動画'} plays={2} runaway={60_000}
          taunt={(n) => { if (n % 3 === 1) live.current.say(CAT_TAUNTS[Math.floor(n / 3) % CAT_TAUNTS.length][live.current.lang], 2500) }}
          onClose={() => setCat(false)}
        />
      )}
    </>
  )
}
