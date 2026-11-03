import { useEffect, useMemo, useRef, useState } from 'react'
import * as k from '../../lib/iso/iso-kit.mjs'
import * as G from '../../lib/iso/lathe.mjs'
import { poke, reducedMotion, useFrameLoop, useIsoCss } from './IsoHost'

// A bench arena with three self-balancing two-wheeled units (the final-year swarm). A switch turns the coordination on or off:
// on, the units share their position over the infrared and ESP-NOW links and hold an even spacing; off, each one balances alone and drifts.
// The bubble level on each unit shows its balance. The numbers in the readout come from the same model that moves the parts.
// It is a concept figure: the swarm is designed and simulated, hardware tests are still to come.

const W = 640, H = 390
const PLATE = { x: -150, y: -78, w: 300, d: 156, r: 10 }
const PLATE_H = 10, FOOT_H = 5
const SLOTS = [-88, 0, 88] // the even spacing the units hold when they coordinate
const WHEEL_R = 14, TRACK = 18

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-100, 0, 62], [100, 0, 62]], W, H, { pad: 26, azimuth: 40 })
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style)
const L = (d: string, style?: object) => k.lineSvg(d, style)
const D = (pts: unknown[], style?: object) => k.dotsSvg(pts, style)
const at = (p: [number, number, number]) => k.iso(p, P)

function arena() {
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
  // docking rings: where each unit stands when the spacing is even
  for (const x of SLOTS) {
    out.push(L(k.ring(x, 0, 21, 0, P, 40), { tone: 'faint' }))
    out.push(L(k.ring(x, 0, 17, 0, P, 36), { tone: 'faint' }))
    out.push(L(k.lineOnTop([x - 26, 0], [x - 21, 0], 0, P) + k.lineOnTop([x + 21, 0], [x + 26, 0], 0, P) + k.lineOnTop([x, -26], [x, -21], 0, P) + k.lineOnTop([x, 21], [x, 26], 0, P), { tone: 'lo' }))
  }
  // a floor line the units run along, and a ruler strip on the front edge
  out.push(L(k.lineOnTop([PLATE.x + 16, 0], [PLATE.x + PLATE.w - 16, 0], 0, P), { tone: 'faint', dotted: true }))
  const strip = { x: PLATE.x + 20, y: PLATE.y + PLATE.d - 18, w: PLATE.w - 40, d: 8, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2.2, 4], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  out.push(D([at([strip.x + 2, strip.y + 4, 0.6]), at([strip.x + strip.w - 2, strip.y + 4, 0.6])], { size: 0.45 }))
  // a label plate with three rule lines
  const plate = { x: PLATE.x + 20, y: PLATE.y + 12, w: 58, d: 12, r: 2 }
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: 'lo', crease: 'none' }))
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P), { tone: 'faint' }))
  out.push(L([0, 1, 2].map((r) => k.lineOnTop([plate.x + 8, plate.y + 3.6 + r * 2.2], [plate.x + (r === 1 ? 34 : 46), plate.y + 3.6 + r * 2.2], 0.8, P)).join(''), { tone: 'lo' }))
  out.push(D([at([plate.x + 3.5, plate.y + 6, 0.8]), at([plate.x + plate.w - 3.5, plate.y + 6, 0.8])], { size: 0.4 }))
  return out.join('')
}

const wheelSide = (y: number) => {
  const F = G.frameAlong([0, y, WHEEL_R], [0, 1, 0])
  const out: string[] = []
  out.push(S(G.disc(-2.6, 2.6, WHEEL_R, F, P, { bevel: 0.6 }), { tone: 'lo' }))
  out.push(S(G.disc(2.6, 3.4, 9.2, F, P), { tone: 'mid', crease: 'none' }))
  out.push(S(G.disc(3.4, 4.4, 3.4, F, P), { tone: 'hi' }))
  return out.join('')
}

/** One balancing unit at the origin: two wheels on an axle, a frame of two decks on four posts, a control board, a battery, an IR eye and a bubble level. */
function unit() {
  const far = k.depthOf([0, -TRACK, 0], P) < k.depthOf([0, TRACK, 0], P) ? -TRACK : TRACK
  const near = -far
  const out: string[] = []
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -17, y: -26, w: 34, d: 52, r: 8 }, 0, 0.2, P)}" style="filter:blur(3px)"/>`)
  out.push(wheelSide(far))
  // axle
  out.push(S(G.disc(-TRACK, TRACK, 2.2, G.frameAlong([0, 0, WHEEL_R], [0, 1, 0]), P), { tone: 'mid', crease: 'none' }))
  // lower deck with the board and battery
  const deck = { x: -12, y: -13, w: 24, d: 26, r: 2 }
  out.push(S(k.slabOf(deck, 18, 2.4, P, 4, 0.5), { tone: 'hi' }))
  out.push(S(k.slabOf({ x: -9, y: -9, w: 12, d: 18, r: 1 }, 20.4, 2, P, 3, 0.3), { tone: 'lo' })) // control board
  out.push(L(k.planOutline({ x: -7.5, y: -7.5, w: 9, d: 15, r: 0.6 }, 22.4, P, 3), { tone: 'faint' }))
  out.push(D([at([-8, -8, 22.4]), at([-8, 8, 22.4]), at([2, -8, 22.4]), at([2, 8, 22.4])], { size: 0.35, tone: 'lo' }))
  out.push(S(k.slabOf({ x: 4, y: -9, w: 6, d: 18, r: 1 }, 20.4, 5, P, 3, 0.4), { tone: 'mid' })) // battery
  out.push(L(k.lineOnTop([5, -4], [9, -4], 25.4, P) + k.lineOnTop([5, 4], [9, 4], 25.4, P), { tone: 'faint' }))
  // posts
  for (const [x, y] of [[-10, -11], [10, -11], [-10, 11], [10, 11]]) out.push(S(k.slabOf({ x: x - 1.3, y: y - 1.3, w: 2.6, d: 2.6, r: 0.6 }, 20.4, 17, P, 3), { tone: 'mid', crease: 'none' }))
  // upper deck
  out.push(S(k.slabOf(deck, 37, 2.4, P, 4, 0.5), { tone: 'hi' }))
  out.push(L(k.planOutline(k.insetPlan(deck, 2.4), 39.4, P, 4), { tone: 'faint' }))
  // IR eye on the front (+x) edge
  out.push(S(k.slabOf({ x: 12, y: -4, w: 4, d: 8, r: 1 }, 39.4, 4, P, 3, 0.3), { tone: 'lo' }))
  out.push(D([at([16, 0, 42])], { size: 0.55, tone: 'mid' }))
  // bubble level: a slot with a bubble that slides along x
  out.push(S(k.slabOf({ x: -9, y: -3, w: 16, d: 6, r: 2.4 }, 39.4, 1.4, P, 6, 0.3), { tone: 'lo', crease: 'none' }))
  out.push(L(k.lineOnTop([-1.5, -3], [-1.5, 3], 40.8, P) + k.lineOnTop([0.5, -3], [0.5, 3], 40.8, P), { tone: 'mid' }))
  out.push(`<g data-part="bubble" transform="${k.translateAlong(P, [0, 0, 0])}">${S(k.cylinder(-0.5, 0, 1.9, 40.8, 1.2, P, 16), { tone: 'hi', lit: true })}</g>`)
  out.push(D([at([-9, -5, 39.4]), at([-9, 5, 39.4]), at([7, -5, 39.4]), at([7, 5, 39.4])], { size: 0.35, tone: 'lo' }))
  out.push(wheelSide(near))
  return out.join('')
}

/** The three infrared beams (front of one unit to the back of the next) are redrawn each frame. */
const beam = (a: number, b: number) => k.lineOnTop([a + 16, 0], [b - 16, 0], 42, P)

const TXT = {
  en: {
    fig: 'Fig 3', title: 'Self-balancing swarm',
    hint: 'Switch coordination on or off',
    label: 'Three two-wheeled self-balancing units on a bench arena. With coordination on they hold an even spacing; with it off each drifts and wobbles.',
    caption: 'Three self-balancing units on a bench arena. With coordination on, they share position over infrared and ESP-NOW and hold an even spacing; off, each balances alone and drifts. A concept sketch of the final-year swarm: designed and simulated, hardware tests still to come.',
    keyLit: 'Bubble level: how well a unit is balanced', keyRaised: 'A balancing unit, two decks on four posts',
    on: 'Coordination on', off: 'Coordination off', pause: 'Pause motion', play: 'Play motion',
    ro: (spread: string, tilt: string, on: boolean) => `${on ? 'linked' : 'no link'} · spacing ${spread} px · tilt ±${tilt}°`,
  },
  ja: {
    fig: '図3', title: '自己平衡スウォーム',
    hint: '協調のオン・オフを切り替え',
    label: '実験台の上の、二輪の自己平衡ユニット3台。協調をオンにすると等間隔を保ち、オフにするとそれぞれがふらつきながらずれていきます。',
    caption: '実験台の上の、自己平衡ユニット3台。協調をオンにすると、赤外線とESP-NOWで位置を共有して等間隔を保ちます。オフにすると、それぞれが単独でバランスをとり、ずれていきます。卒業研究のスウォームの概念図で、設計とシミュレーションまで。実機試験はこれからです。',
    keyLit: '水準器：ユニットのバランスの良さ', keyRaised: '自己平衡ユニット（4本の柱で支える2段のデッキ）',
    on: '協調：オン', off: '協調：オフ', pause: '動きを止める', play: '動かす',
    ro: (spread: string, tilt: string, on: boolean) => `${on ? '接続中' : '未接続'} · 間隔 ${spread} px · 傾き ±${tilt}°`,
  },
}

export default function SwarmFigure({ lang }: { lang: 'en' | 'ja' }) {
  useIsoCss()
  const T = TXT[lang]
  const host = useRef<HTMLDivElement>(null)
  const [coord, setCoord] = useState(true)
  const [paused, setPaused] = useState(false)
  const coordRef = useRef(coord), pausedRef = useRef(paused)
  useEffect(() => { coordRef.current = coord; pausedRef.current = paused; poke(host.current) }, [coord, paused])
  const calm = useMemo(() => reducedMotion(), [])

  const order = useMemo(() => [0, 1, 2].sort((a, b) => k.depthOf([SLOTS[a], 0, 0], P) - k.depthOf([SLOTS[b], 0, 0], P)), [])
  const html = useMemo(() => {
    const body = [
      arena(),
      ...order.map((i) => `<g data-part="unit${i}" transform="${k.translateAlong(P, [SLOTS[i], 0, 0])}">${unit()}</g>`),
      `<path data-part="beam0" class="iso-line" data-tone="lit" data-flow="true" d="${beam(SLOTS[0], SLOTS[1])}" style="stroke-dasharray:3 3"/>`,
      `<path data-part="beam1" class="iso-line" data-tone="lit" data-flow="true" d="${beam(SLOTS[1], SLOTS[2])}" style="stroke-dasharray:3 3"/>`,
    ]
    const svg = k.figureSvg({ width: W, height: H, label: T.label, body })
    return k.plateHtml({
      fig: T.fig, title: T.title, hint: T.hint, readout: T.ro('88', '0.5', true),
      keys: [{ mark: 'lit', label: T.keyLit }, { mark: 'raised', label: T.keyRaised }],
      caption: T.caption,
      body: `<div class="iso-stage">${svg}</div>`,
    })
  }, [T, order])

  const parts = useRef<{ unit: SVGElement[]; bubble: SVGElement[]; beam: SVGElement[]; readout: HTMLElement | null; stage: HTMLElement | null }>({ unit: [], bubble: [], beam: [], readout: null, stage: null })
  const sim = useRef({ x: [...SLOTS], v: [0, 0, 0], tilt: [0, 0, 0], tv: [0, 0, 0], t: 0, drift: [0, 0, 0] })
  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = html
    const q = (s: string) => el.querySelector<SVGElement>(s)!
    parts.current = {
      unit: [0, 1, 2].map((i) => q(`[data-part="unit${i}"]`)),
      bubble: [0, 1, 2].map((i) => q(`[data-part="unit${i}"] [data-part="bubble"]`)),
      beam: [q('[data-part="beam0"]'), q('[data-part="beam1"]')],
      readout: el.querySelector('[data-readout]'),
      stage: el.querySelector('.iso-stage'),
    }
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  const draw = () => {
    const s = sim.current, p = parts.current
    if (!p.unit.length) return
    const on = coordRef.current
    for (let i = 0; i < 3; i++) {
      p.unit[i].setAttribute('transform', k.translateAlong(P, [s.x[i], 0, 0]))
      // the bubble slides along x with the unit's tilt (about 1.6 px per degree)
      p.bubble[i].setAttribute('transform', k.translateAlong(P, [Math.max(-5.2, Math.min(5.2, s.tilt[i] * 1.6)), 0, 0]))
    }
    p.beam[0].setAttribute('d', beam(s.x[0], s.x[1])); p.beam[1].setAttribute('d', beam(s.x[1], s.x[2]))
    for (const b of p.beam) (b as SVGElement).style.opacity = on ? '1' : '0'
    const spread = ((s.x[2] - s.x[0]) / 2).toFixed(0)
    const tilt = Math.max(...s.tilt.map(Math.abs)).toFixed(1)
    const text = T.ro(spread, tilt, on)
    if (p.readout && p.readout.textContent !== text) p.readout.textContent = text
  }

  // the model: coordinated units are pulled to their slots (a spring through the shared links) and their balance loop stays tight;
  // alone, each unit random-walks and its tilt swings wider
  useFrameLoop(host, (dt) => {
    const s = sim.current
    if (pausedRef.current || calm) { if (calm) { draw() } return false }
    s.t += dt
    const on = coordRef.current
    for (let i = 0; i < 3; i++) {
      const sway = on ? 22 * Math.sin(s.t * 0.5) : 0 // the whole line drifts together when linked
      const want = on ? SLOTS[i] + sway : s.x[i] + Math.sin(s.t * (0.37 + i * 0.23) + i * 2) * 26 * dt * 6
      const pull = on ? (want - s.x[i]) * 6 : (want - s.x[i]) * 1
      s.v[i] += (pull - s.v[i] * 4) * dt
      s.x[i] += s.v[i] * dt
      s.x[i] = Math.max(-124, Math.min(124, s.x[i]))
    }
    // keep the units from running into each other when they do not coordinate
    for (let i = 0; i < 2; i++) if (s.x[i + 1] - s.x[i] < 44) { const m = (s.x[i] + s.x[i + 1]) / 2; s.x[i] = m - 22; s.x[i + 1] = m + 22 }
    for (let i = 0; i < 3; i++) {
      const amp = on ? 0.5 : 2.4
      const target = amp * Math.sin(s.t * (on ? 2.1 : 1.3) + i * 1.7) + (on ? 0 : 1.2 * Math.sin(s.t * 0.4 + i))
      s.tv[i] += ((target - s.tilt[i]) * 30 - s.tv[i] * 7) * dt
      s.tilt[i] += s.tv[i] * dt
    }
    draw()
  }, [calm, T])

  return (
    <div className="iso-wrap">
      <div className="iso" data-theme="light" ref={host} />
      <div className="iso-controls">
        <button className="btn" aria-pressed={coord} onClick={() => setCoord((c) => !c)}>{coord ? T.on : T.off}</button>
        {!calm && <button className="btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? T.play : T.pause}</button>}
      </div>
    </div>
  )
}
