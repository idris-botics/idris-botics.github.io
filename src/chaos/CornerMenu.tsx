import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

/**
 * Phones only: the sound and achievements buttons fold into one menu button, so only one control sits in the corner.
 * (On wider screens this renders nothing and the three buttons stay where they were.)
 */
export default function CornerMenu({ lang }: { lang: 'en' | 'ja' }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(() => matchMedia('(max-width: 700px)').matches)
  useEffect(() => {
    const mq = matchMedia('(max-width: 700px)')
    const f = () => setPhone(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('has-corner', phone)
    root.classList.toggle('corner-open', phone && open)
    return () => { root.classList.remove('has-corner', 'corner-open') }
  }, [phone, open])
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.corner-fab, .sfx-btn, .ach')) setOpen(false) }
    addEventListener('pointerdown', out)
    return () => removeEventListener('pointerdown', out)
  }, [open])
  if (!phone) return null
  const label = lang === 'en' ? (open ? 'Close the menu' : 'Open the menu: sound, achievements') : (open ? 'メニューを閉じる' : 'メニューを開く：音、実績')
  return (
    <button className="btn corner-fab" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((o) => !o)}>
      {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
    </button>
  )
}
