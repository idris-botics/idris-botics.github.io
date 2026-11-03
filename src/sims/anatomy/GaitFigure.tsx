import { useEffect, useMemo, useRef, useState } from 'react'
import * as k from '../../lib/iso/iso-kit.mjs'
import * as G from '../../lib/iso/lathe.mjs'
import { poke, reducedMotion, useFrameLoop, useIsoCss } from './IsoHost'

// A bench stand for the G.A.I.T. wristband: a forearm rests on two cradles, the band sits on the wrist with its board on top, and a lamp stands
// for the appliance. A tremor shakes the arm fast and small; a deliberate gesture lifts the hand once. The trace strip shows what the IMU sees,
// and the classifier lights one of two lamps. Only the gesture switches the appliance on. Concept figure: the prototype is in development.

const W = 640, H = 390
const PLATE = { x: -160, y: -84, w: 320, d: 168, r: 10 }
const PLATE_H = 10, FOOT_H = 5
const ARM_Z = 34, ARM_R = 16
const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-120, 0, 110], [130, 0, 90]], W, H, { pad: 26, azimuth: 36 })
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style)
const L = (d: string, style?: object) => k.lineSvg(d, style)
const D = (pts: unknown[], style?: object) => k.dotsSvg(pts, style)
const at = (p: [number, number, number]) => k.iso(p, P)
const TRACE = { x: -134, y: 30, w: 132, d: 38, r: 2 }
const N = 66

function base() {
  const out: string[] = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`]
  const feet = [...k.corners(PLATE, 26)].sort((a: number[], b: number[]) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: 'lo' }))
    out.push(S(k.cylinder(x, y, 6.2, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: 'mid' }))
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: 'mid' }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }))
  const screws = k.corners(PLATE, 11)
  out.push(L(screws.map(([x, y]: number[]) => k.ring(x, y, 2.4, 0, P, 16)).join(''), { tone: 'lo' }))
  out.push(D(screws.map(([x, y]: number[]) => at([x, y, 0])), { size: 0.5 }))
  // trace strip: a recessed glass with a centre line and a time scale
  out.push(S(k.slabOf(TRACE, 0, 0.8, P, 4), { tone: 'lo', crease: 'none' }))
  out.push(L(k.planOutline(k.insetPlan(TRACE, 1.8), 0.8, P), { tone: 'faint' }))
  out.push(L(k.lineOnTop([TRACE.x + 3, TRACE.y + TRACE.d / 2], [TRACE.x + TRACE.w - 3, TRACE.y + TRACE.d / 2], 0.8, P), { tone: 'faint', dotted: true }))
  const t = k.topTicks(TRACE.x + 6, TRACE.x + TRACE.w - 6, 4, 5, TRACE.y + TRACE.d - 4, 0.8, [1.4, 2.8], P)
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }))
  out.push(D([at([TRACE.x + 3.5, TRACE.y + 3.5, 0.8]), at([TRACE.x + TRACE.w - 3.5, TRACE.y + 3.5, 0.8])], { size: 0.4 }))
  // classifier: two indicator windows, tremor and gesture
  for (const [i, x] of [[0, 14], [1, 40]]) {
    const win = { x: TRACE.x + TRACE.w + x - 4, y: TRACE.y + 6, w: 20, d: 10, r: 2 }
    out.push(S(k.slabOf(win, 0, 1.4, P, 4, 0.3), { tone: 'lo', crease: 'none' }))
    out.push(L(k.planOutline(k.insetPlan(win, 1.6), 1.4, P), { tone: 'faint' }))
    out.push(`<g data-part="lamp${i}" style="opacity:.0">${S(k.slabOf(k.insetPlan(win, 1.6), 1.4, 0.8, P, 3), { tone: 'hi', lit: true, crease: 'none' })}</g>`)
  }
  // cradles under the forearm
  const cradles = [-82, 6]
  for (const x of cradles) {
    out.push(S(k.slabOf({ x: x - 9, y: -22, w: 18, d: 44, r: 2 }, 0, 10, P, 4, 0.6), { tone: 'mid' }))
    out.push(S(k.slabOf({ x: x - 7, y: -17, w: 14, d: 34, r: 6 }, 10, 8, P, 8, 0.5), { tone: 'lo' }))
    out.push(D([at([x, -19, 10]), at([x, 19, 10])], { size: 0.4 }))
  }
  // the appliance: a lamp on a small stand
  const lx = 112, ly = -36
  out.push(S(k.slabOf({ x: lx - 16, y: ly - 14, w: 32, d: 28, r: 3 }, 0, 4, P, 4, 0.5), { tone: 'mid' }))
  out.push(S(k.cylinder(lx, ly, 2.6, 4, 36, P, 20), { tone: 'mid', crease: 'none' }))
  out.push(S(k.cylinder(lx, ly, 9, 40, 3, P, 28), { tone: 'lo' }))
  out.push(S(k.cylinder(lx, ly, 8, 43, 12, P, 28), { tone: 'hi' }))
  out.push(`<g data-part="bulb" style="opacity:0">${S(k.cylinder(lx, ly, 8, 43, 12, P, 28), { tone: 'hi', lit: true })}</g>`)
  out.push(L(k.sideArc(lx, ly, 8, 49, P, 14), { tone: 'faint' }))
  out.push(D([at([lx - 12, ly + 9, 4]), at([lx + 12, ly + 9, 4])], { size: 0.4 }))
  return out.join('')
}

/** The forearm, hand and wristband: one group that the figure shakes or lifts. */
function arm() {
  const out: string[] = []
  const F = G.frameAlong([0, 0, ARM_Z], [1, 0, 0])
  out.push(S(G.disc(-122, 40, ARM_R, F, P, { bevel: 0.5 }), { tone: 'hi' })) // forearm
  out.push(S(G.disc(-124, -118, ARM_R + 1.4, F, P), { tone: 'mid' })) // sleeve cuff
  out.push(L([-80, -40].map((x) => k.sideRing([x, 0, ARM_Z], ARM_R, 'x', P, 28)).join(''), { tone: 'faint' }))
  // the hand: a palm, a thumb and four fingers lying on the stand
  out.push(S(k.slabOf({ x: 40, y: -15, w: 34, d: 30, r: 5 }, ARM_Z - 12, 22, P, 6, 1), { tone: 'hi' }))
  for (const [i, y] of [-12, -4, 4, 12].entries()) out.push(S(k.slabOf({ x: 74, y: y - 3, w: 24 - Math.abs(i - 1.5) * 3, d: 6, r: 2.4 }, ARM_Z - 8, 12, P, 5, 0.6), { tone: 'hi' }))
  out.push(S(k.slabOf({ x: 46, y: 15, w: 22, d: 7, r: 3 }, ARM_Z - 6, 11, P, 5, 0.6), { tone: 'hi' })) // thumb
  // the wristband: a strap round the wrist, a housing on top with the board, an LED and the IMU window
  const bandF = G.frameAlong([0, 0, ARM_Z], [1, 0, 0])
  out.push(S(G.ringBand(-16, 6, ARM_R, ARM_R + 2.2, bandF, P, { hole: null }), { tone: 'mid' }))
  out.push(L([-12, 2].map((x) => k.sideRing([x, 0, ARM_Z], ARM_R + 2.2, 'x', P, 28)).join(''), { tone: 'lo' }))
  const hz = ARM_Z + ARM_R + 1.6
  out.push(S(k.slabOf({ x: -14, y: -11, w: 22, d: 22, r: 4 }, hz, 7, P, 6, 1), { tone: 'hi' }))
  out.push(S(k.slabOf({ x: -11, y: -8, w: 16, d: 16, r: 2.4 }, hz + 7, 0.8, P, 5), { tone: 'lo', crease: 'none' })) // cover plate
  out.push(L(k.planOutline({ x: -8.5, y: -5.5, w: 11, d: 11, r: 1.2 }, hz + 7.8, P, 4), { tone: 'faint' }))
  out.push(S(k.slabOf({ x: -6, y: -3, w: 6, d: 6, r: 0.8 }, hz + 7.8, 0.8, P, 3), { tone: 'mid', crease: 'none' })) // IMU
  out.push(D([at([-12, -9, hz + 7]), at([-12, 9, hz + 7]), at([6, -9, hz + 7]), at([6, 9, hz + 7])], { size: 0.4 }))
  out.push(D([at([3, 0, hz + 8.6])], { size: 0.6, tone: 'hi' }))
  out.push(`<g data-part="led" style="opacity:0">${D([at([3, 0, hz + 8.6])], { size: 1.1, tone: 'hi' })}</g>`)
  // strap buckle and a charging port
  out.push(S(k.slabOf({ x: -6, y: ARM_R - 1, w: 10, d: 4, r: 1 }, ARM_Z - 4, 8, P, 3, 0.3), { tone: 'mid', crease: 'none' }))
  return out.join('')
}

const TXT = {
  en: {
    fig: 'Fig 4', title: 'G.A.I.T. wristband',
    hint: 'Press Tremor or Gesture',
    label: 'A forearm on a bench stand wearing the G.A.I.T. wristband, a trace strip showing the motion sensor, two classifier windows and a lamp. A tremor shakes the arm and is ignored; a deliberate gesture lifts the hand and switches the lamp on.',
    caption: 'A forearm on a bench stand, wearing the wristband. A tremor shakes the arm fast and small and is ignored; a deliberate gesture lifts the hand once and switches the lamp on. The band reads its motion sensor and classifies it on the device. A concept sketch: the prototype is in development, and a smaller v2 with better sensors and a housing is next.',
    keyLit: 'Lit: what the classifier decided', keyRaised: 'Wristband board on the wrist',
    tremor: 'Tremor', gesture: 'Gesture', auto: 'Auto', pause: 'Pause motion', play: 'Play motion',
    ro: (s: string) => s,
    rest: 'at rest · reading the sensor', tremorRo: 'tremor · about 5 Hz · ignored', gestureRo: 'gesture · lamp on',
  },
  ja: {
    fig: '図4', title: 'G.A.I.T. リストバンド',
    hint: '「震え」か「ジェスチャー」を押す',
    label: '実験台の上の前腕にG.A.I.T.リストバンドを着け、モーションセンサーの波形、2つの判定窓、ランプを並べた図。震えは腕を揺らしますが無視され、意図したジェスチャーは手を持ち上げてランプを点けます。',
    caption: '実験台の上の前腕にリストバンドを着けた図です。震えは腕を速く小さく揺らしますが、無視されます。意図したジェスチャーは手を1回持ち上げ、ランプを点けます。バンドは動きセンサーを読み、端末上で分類します。概念図で、試作は開発中です。次は、より小型でセンサーを改良し、筐体をつけたv2を作ります。',
    keyLit: '点灯：判定の結果', keyRaised: '手首の上のバンド基板',
    tremor: '震え', gesture: 'ジェスチャー', auto: '自動', pause: '動きを止める', play: '動かす',
    ro: (s: string) => s,
    rest: '静止中 · センサーを読んでいます', tremorRo: '震え · 約5 Hz · 無視', gestureRo: 'ジェスチャー · ランプ点灯',
  },
}

type Phase = 'rest' | 'tremor' | 'gesture'

export default function GaitFigure({ lang }: { lang: 'en' | 'ja' }) {
  useIsoCss()
  const T = TXT[lang]
  const host = useRef<HTMLDivElement>(null)
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [phase, setPhaseState] = useState<Phase>('rest')
  const calm = useMemo(() => reducedMotion(), [])
  const live = useRef({ phase: 'rest' as Phase, t: 0, clock: 0, auto: true, paused: false, buf: new Array(N).fill(0), acc: 0, lamp: 0, bulb: 0, lampOn: false })

  const html = useMemo(() => {
    const body = [
      base(),
      `<g data-part="arm" transform="${k.translateAlong(P, [0, 0, 0])}">${arm()}</g>`,
      `<path data-part="trace" class="iso-line" data-tone="lit" d="" style="stroke-width:1.1"/>`,
      `<path data-part="radio" class="iso-line" data-tone="lit" data-flow="true" d="${k.segment([-6, 0, ARM_Z + ARM_R + 10], [112, -36, 60], P)}" style="opacity:0;stroke-dasharray:3 3"/>`,
    ]
    return k.plateHtml({
      fig: T.fig, title: T.title, hint: T.hint, readout: T.rest,
      keys: [{ mark: 'lit', label: T.keyLit }, { mark: 'raised', label: T.keyRaised }],
      caption: T.caption,
      body: `<div class="iso-stage">${k.figureSvg({ width: W, height: H, label: T.label, body })}</div>`,
    })
  }, [T])

  const els = useRef<{ arm: SVGElement | null; trace: SVGElement | null; radio: SVGElement | null; lamp: (SVGElement | null)[]; bulb: SVGElement | null; led: SVGElement | null; readout: HTMLElement | null }>({ arm: null, trace: null, radio: null, lamp: [], bulb: null, led: null, readout: null })

  const draw = () => {
    const l = live.current, e = els.current
    if (!e.arm) return
    // the arm: a tremor shakes it across the cradle; a gesture lifts the hand and sets it down
    const lift = l.phase === 'gesture' ? Math.sin(Math.min(1, l.t / 2.2) * Math.PI) * 16 : 0
    const shake = l.phase === 'tremor' ? Math.sin(l.clock * 2 * Math.PI * 5) * 1.5 : 0
    e.arm.setAttribute('transform', k.translateAlong(P, [0, shake, lift]))
    const pts: [number, number][] = l.buf.map((v: number, i: number) => [TRACE.x + 4 + (i / (N - 1)) * (TRACE.w - 8), TRACE.y + TRACE.d / 2 - v])
    e.trace?.setAttribute('d', k.onTop(pts, 0.9, P))
    e.lamp[0]?.setAttribute('style', `opacity:${l.phase === 'tremor' ? 1 : 0}`)
    e.lamp[1]?.setAttribute('style', `opacity:${l.lampOn ? 1 : 0}`)
    e.bulb?.setAttribute('style', `opacity:${l.bulb.toFixed(2)}`)
    e.led?.setAttribute('style', `opacity:${l.lampOn ? 1 : 0}`)
    e.radio?.setAttribute('style', `opacity:${l.lampOn ? 1 : 0};stroke-dasharray:3 3`)
    const text = l.phase === 'tremor' ? T.tremorRo : l.phase === 'gesture' && l.lampOn ? T.gestureRo : T.rest
    if (e.readout && e.readout.textContent !== text) e.readout.textContent = text
  }

  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = html
    const q = (s: string) => el.querySelector<SVGElement>(s)
    els.current = { arm: q('[data-part="arm"]'), trace: q('[data-part="trace"]'), radio: q('[data-part="radio"]'), lamp: [q('[data-part="lamp0"]'), q('[data-part="lamp1"]')], bulb: q('[data-part="bulb"]'), led: q('[data-part="led"]'), readout: el.querySelector('[data-readout]') }
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  const set = (p: Phase) => { const l = live.current; l.phase = p; l.t = 0; setPhaseState(p); if (p === 'gesture') l.lampOn = false; poke(host.current) }
  useEffect(() => { live.current.auto = auto; live.current.paused = paused; poke(host.current) }, [auto, paused])

  useFrameLoop(host, (dt) => {
    const l = live.current
    if (l.paused && !calm) return false
    l.t += dt; l.clock += dt
    // the timeline: rest, tremor, rest, gesture, repeating; a button press starts one of them at once
    if (l.auto && !calm) {
      const cycle: [Phase, number][] = [['rest', 1.4], ['tremor', 3.4], ['rest', 1.2], ['gesture', 2.6]]
      let acc = 0, i = 0
      for (; i < cycle.length; i++) { acc += cycle[i][1]; if (l.acc % 8.6 < acc) break }
      l.acc += dt
      const want = cycle[Math.min(i, cycle.length - 1)][0]
      if (want !== l.phase) { l.phase = want; l.t = 0; if (want === 'gesture') l.lampOn = false; setPhaseState(want) }
    } else if (l.phase !== 'rest' && l.t > (l.phase === 'tremor' ? 3.4 : 2.6)) { l.phase = 'rest'; l.t = 0; setPhaseState('rest') }
    if (l.phase === 'gesture' && l.t > 1.0) l.lampOn = true
    if (l.phase !== 'gesture' && (l.phase === 'tremor' || l.t > 1.6)) l.lampOn = false // the lamp stays on for a moment after the gesture
    // the IMU signal: a small hum at rest, a regular 5 Hz wave in a tremor, one smooth burst in a gesture
    const noise = (Math.sin(l.clock * 37) + Math.sin(l.clock * 23.7)) * 0.5
    const v = l.phase === 'tremor' ? Math.sin(l.clock * 2 * Math.PI * 5) * 9 + noise
      : l.phase === 'gesture' ? Math.sin(Math.min(1, l.t / 2.2) * Math.PI) * 17 + noise * 0.6
      : noise * 0.7
    l.buf.push(v); l.buf.shift()
    l.bulb += ((l.lampOn ? 1 : 0) - l.bulb) * Math.min(1, dt * 6)
    draw()
  }, [calm, T])

  return (
    <div className="iso-wrap">
      <div className="iso" data-theme="light" ref={host} />
      <div className="iso-controls">
        <button className="btn" aria-pressed={phase === 'tremor'} onClick={() => { setAuto(false); set('tremor') }}>{T.tremor}</button>
        <button className="btn" aria-pressed={phase === 'gesture'} onClick={() => { setAuto(false); set('gesture') }}>{T.gesture}</button>
        <button className="btn" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>{T.auto}</button>
        {!calm && <button className="btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? T.play : T.pause}</button>}
      </div>
    </div>
  )
}
