import { useEffect, useRef } from 'react'

/**
 * Engineering paper behind the page: a faint millimetre grid with a stronger line every 10 mm, and ruler ticks along the left and top edges
 * of the viewport. A small mono readout beside the cursor shows its position the way a CNC jog display does ("X 412.0  Y 188.5", in mm),
 * and fades after a second of stillness. The drawing happens once per resize or theme change; nothing here runs per frame.
 * Linework stays at about 8% contrast, so text always sits on clean paper. On touch screens there is no readout.
 */
const MM = 96 / 25.4 // CSS px in one millimetre

export default function PaperGrid({ wobble = false }: { wobble?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const jog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const w = innerWidth, h = innerHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1c1b19'
      const step = MM * 2 // a grid line every 2 mm, a stronger one every 10 mm
      ctx.strokeStyle = ink; ctx.lineWidth = 1
      ctx.globalAlpha = 0.045
      ctx.beginPath()
      for (let i = 1; i * step < w; i++) if (i % 5) { const x = Math.round(i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h) }
      for (let j = 1; j * step < h; j++) if (j % 5) { const y = Math.round(j * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y) }
      ctx.stroke()
      ctx.globalAlpha = 0.085
      ctx.beginPath()
      for (let i = 5; i * step < w; i += 5) { const x = Math.round(i * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h) }
      for (let j = 5; j * step < h; j += 5) { const y = Math.round(j * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y) }
      ctx.stroke()
      // rulers on the left and top edges: a tick every 2 mm, longer every 10 mm, a label every 50 mm
      ctx.globalAlpha = 0.3
      ctx.fillStyle = ink
      ctx.font = '9px "IBM Plex Mono", ui-monospace, monospace'
      ctx.beginPath()
      for (let i = 0; i * step < w; i++) { const x = Math.round(i * step) + 0.5, len = i % 25 === 0 ? 12 : i % 5 === 0 ? 8 : 4; ctx.moveTo(x, 0); ctx.lineTo(x, len) }
      for (let j = 0; j * step < h; j++) { const y = Math.round(j * step) + 0.5, len = j % 25 === 0 ? 12 : j % 5 === 0 ? 8 : 4; ctx.moveTo(0, y); ctx.lineTo(len, y) }
      ctx.stroke()
      if (w > 700) {
        for (let i = 25; i * step < w; i += 25) ctx.fillText(String(i * 2), Math.round(i * step) + 3, 22)
        ctx.save(); ctx.rotate(-Math.PI / 2)
        for (let j = 25; j * step < h; j += 25) ctx.fillText(String(j * 2), -Math.round(j * step) + 3, 22)
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }
    draw()
    const ro = new ResizeObserver(draw); ro.observe(document.documentElement)
    const mo = new MutationObserver(draw); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] })

    // the jog readout (mouse only)
    const el = jog.current
    let raf = 0, fade = 0, mx = 0, my = 0
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !el) return
      mx = e.clientX; my = e.clientY
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0
        el.textContent = `X ${(mx / MM).toFixed(1).padStart(6, ' ')}  Y ${(my / MM).toFixed(1).padStart(6, ' ')}`
        el.style.transform = `translate(${Math.min(mx + 16, innerWidth - 150)}px, ${Math.min(my + 18, innerHeight - 24)}px)`
        el.classList.add('on')
        clearTimeout(fade); fade = window.setTimeout(() => el.classList.remove('on'), 1000)
      })
    }
    if (fine) addEventListener('pointermove', move, { passive: true })
    return () => { ro.disconnect(); mo.disconnect(); removeEventListener('pointermove', move); cancelAnimationFrame(raf); clearTimeout(fade) }
  }, [])
  return (
    <>
      <canvas ref={ref} className={wobble ? 'paper wobble' : 'paper'} aria-hidden="true" />
      <div ref={jog} className="jog" aria-hidden="true" />
    </>
  )
}
