import { useEffect, useRef, useState } from 'react'

/** 83 seconds shown as 1:23. */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const CAPTIONS: { en: string; ja: string }[] = [
  { en: 'this countdown is not suspicious at all', ja: 'このカウントダウンは全く怪しくありません' },
  { en: 'nothing happens at zero. probably.', ja: 'ゼロになっても何も起きません。たぶん。' },
  { en: 'please ignore the timer', ja: 'タイマーは気にしないでください' },
  { en: 'completely normal timer. carry on.', ja: 'ごく普通のタイマーです。続けてください。' },
]
const AT_ZERO = { en: 'see? nothing happened.', ja: 'ほら、何も起きなかったでしょう。' }

/**
 * The small countdown on the full-screen videos (Rick roll, John Cena, the cat, the other clips). Escape does nothing on those; the close button runs
 * away from the pointer (or is not there yet) until the countdown reaches zero, and from then on it is a normal close button. The countdown tries very
 * hard to look innocent, says "see? nothing happened." at zero, and goes away. It counts from the moment it appears, which is when the video opens.
 */
export function Countdown({ seconds, lang }: { seconds: number; lang: 'en' | 'ja' }) {
  const start = useRef(performance.now())
  const [left, setLeft] = useState(Math.ceil(seconds))
  const [cap, setCap] = useState(0)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const tick = () => {
      const t = (performance.now() - start.current) / 1000
      setLeft(Math.max(0, Math.ceil(seconds - t)))
      setCap(Math.floor(t / 7) % CAPTIONS.length)
      if (t > seconds + 3.5) setGone(true)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => clearInterval(id)
  }, [seconds])
  if (gone) return null
  return (
    <div className={left <= 0 ? 'vid-count done' : left <= 10 ? 'vid-count hot' : 'vid-count'} role="timer" aria-live="off"
      aria-label={lang === 'en' ? `The close button starts working in ${left} seconds` : `あと${left}秒で閉じるボタンが使えるようになります`}>
      <span className="vc-clock" aria-hidden="true"><i className="vc-dot" />{clock(left)}</span>
      <span className="vc-cap" aria-hidden="true">{left <= 0 ? AT_ZERO[lang] : CAPTIONS[cap][lang]}</span>
    </div>
  )
}
