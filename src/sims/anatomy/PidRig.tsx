import { useEffect, useMemo, useRef, useState } from 'react'
import * as k from '../../lib/iso/iso-kit.mjs'
import * as G from '../../lib/iso/lathe.mjs'
import { useStore } from '../../store'
import { emit } from '../../bus'
import { DEFAULT_PLANT, PID, VMAX, plantStep, simulateStep, type State } from '../pid/core'
import { poke, reducedMotion, useFrameLoop, useIsoCss } from './IsoHost'

// The PID servo twin as a real test rig: a geared servo on a pedestal swings a weighted arm; an encoder disc turns on the hub; a dial gauge reads
// the error live; and a knurled knob sets Kp. The knob is the interface: turn it and the arm's motion and the readout change at once.
// The model is the same plant and PID as the full simulation, stepped at 1 kHz. In Chaos the six resistors on the board carry a clue (COFFEE).

const W = 640, H = 420
const PLATE = { x: -150, y: -100, w: 300, d: 200, r: 10 }
const PLATE_H = 10, FOOT_H = 5
const HUB: [number, number, number] = [-90, 24, 98]
const ARM_L = 94
const DIAL_C: [number, number, number] = [66, 62, 66]
const DIAL_R = 22
const KNOB = { x: 112, y: 58, r: 13, z: 0, h: 12 }
const BAND = ['#111', '#6b3b1b', '#d33', '#f80', '#fd0', '#2a2', '#36d', '#85c', '#999', '#fff']
const RIG = ['03', '15', '06', '06', '05', '05'] // C O F F E E, two digits per letter
const PLAIN = ['10', '22', '47', '10', '33', '47'] // ordinary values in Calm

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-90, 0, 128], [66, 60, 92]], W, H, { pad: 26, azimuth: 38 })
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style)
const L = (d: string, style?: object) => k.lineSvg(d, style)
const D = (pts: unknown[], style?: object) => k.dotsSvg(pts, style)
const at = (p: [number, number, number]) => k.iso(p, P)
const seg = (a: [number, number, number], b: [number, number, number]) => k.segment(a, b, P)
const tip = (a: number): [number, number, number] => [HUB[0] + ARM_L * Math.sin(a), HUB[1] + 7, HUB[2] - ARM_L * Math.cos(a)]
const F_HUB = G.frameOf([HUB[0], HUB[1], HUB[2]], [0, 1, 0], [1, 0, 0], [0, 0, 1])

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
  const strip = { x: PLATE.x + 22, y: PLATE.y + PLATE.d - 18, w: 150, d: 8, r: 1 }
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }))
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2.2, 4], P)
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }))
  const plate = { x: PLATE.x + 22, y: PLATE.y + 12, w: 58, d: 12, r: 2 }
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: 'lo', crease: 'none' }))
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P), { tone: 'faint' }))
  out.push(L([0, 1, 2].map((r) => k.lineOnTop([plate.x + 8, plate.y + 3.6 + r * 2.2], [plate.x + (r === 1 ? 34 : 46), plate.y + 3.6 + r * 2.2], 0.8, P)).join(''), { tone: 'lo' }))
  out.push(D([at([plate.x + 3.5, plate.y + 6, 0.8]), at([plate.x + plate.w - 3.5, plate.y + 6, 0.8])], { size: 0.4 }))
  return out.join('')
}

function board(codes: string[]) {
  const B = { x: 20, y: -86, w: 114, d: 62, r: 3 }
  const out: string[] = []
  out.push(S(k.slabOf(B, 0, 5, P, 4, 0.5), { tone: 'lo' }))
  out.push(L(k.planOutline(k.insetPlan(B, 3), 5, P, 4), { tone: 'faint' }))
  for (const [x, y] of k.corners(B, 5)) { out.push(S(k.cylinder(x, y, 2.4, 5, 3, P, 12), { tone: 'mid', crease: 'none' })); out.push(D([at([x, y, 8])], { size: 0.35 })) }
  // traces joining the resistors
  out.push(L(k.lineOnTop([B.x + 12, B.y + 31], [B.x + B.w - 12, B.y + 31], 5, P) + k.lineOnTop([B.x + 12, B.y + 14], [B.x + B.w - 12, B.y + 14], 5, P) + k.lineOnTop([B.x + 12, B.y + 48], [B.x + B.w - 12, B.y + 48], 5, P), { tone: 'faint' }))
  // six resistors R1 to R6: the bands are the clue in Chaos
  codes.forEach((code, i) => {
    const rx = B.x + 18 + (i % 3) * 32, ry = B.y + 10 + Math.floor(i / 3) * 34
    const m = k.topMatrix([rx, ry], 5.4, P, 'x')
    out.push(`<g class="fig-res" data-code="${code}" transform="${m}">
      <line x1="-5" y1="3" x2="25" y2="3" stroke="#9a9a9a" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <rect x="1" y="0" width="20" height="6" rx="3" fill="#e6d3a8" stroke="#1e2128" stroke-width=".6" vector-effect="non-scaling-stroke"/>
      <rect x="5" y="0" width="2.4" height="6" fill="${BAND[+code[0]]}"/><rect x="10" y="0" width="2.4" height="6" fill="${BAND[+code[1]]}"/><rect x="16" y="0" width="1.8" height="6" fill="#c9a227"/>
    </g>`)
    out.push(k.faceTextSvg(k.topMatrix([rx + 2, ry + 11], 5, P, 'x'), `R${i + 1}`, { size: 3.2, tone: 'lo' }))
  })
  out.push(D([at([B.x + 10, B.y + 6, 5.4]), at([B.x + B.w - 10, B.y + 6, 5.4]), at([B.x + 10, B.y + B.d - 6, 5.4]), at([B.x + B.w - 10, B.y + B.d - 6, 5.4])], { size: 0.4, tone: 'mid' }))
  return out.join('')
}

function servo() {
  const out: string[] = []
  const ped = { x: -118, y: -22, w: 56, d: 44, r: 3 }
  out.push(S(k.slabOf({ x: -126, y: -30, w: 72, d: 60, r: 4 }, 0, 4, P, 5, 0.6), { tone: 'mid' })) // footplate
  out.push(D([at([-120, -24, 4]), at([-120, 24, 4]), at([-52, -24, 4]), at([-52, 24, 4])], { size: 0.45 }))
  out.push(S(k.slabOf(ped, 4, 40, P, 5, 0.8), { tone: 'mid' })) // pedestal
  out.push(L(k.sideSeam(ped, 22, P, 5), { tone: 'faint' }))
  const body = { x: -124, y: -20, w: 68, d: 40, r: 4 }
  out.push(S(k.slabOf(body, 44, 62, P, 6, 1), { tone: 'hi' })) // servo housing
  out.push(L(k.planOutline(k.insetPlan(body, 3), 106, P, 6), { tone: 'faint' }))
  out.push(L(k.sideSeam(body, 62, P, 6), { tone: 'faint' }))
  // vent ribs along the housing top and a cable gland on the back
  for (let i = 0; i < 5; i++) out.push(L(k.lineOnTop([body.x + 10 + i * 5, body.y + 8], [body.x + 10 + i * 5, body.y + body.d - 8], 106, P), { tone: 'lo' }))
  out.push(S(k.cylinder(body.x + 54, body.y + 12, 4, 106, 3, P, 18), { tone: 'mid' }))
  out.push(L(k.knurl(body.x + 54, body.y + 12, 4, 106, 109, 14, P), { tone: 'lo' }))
  out.push(D([at([body.x + 6, body.y + 6, 106]), at([body.x + body.w - 6, body.y + 6, 106]), at([body.x + 6, body.y + body.d - 6, 106]), at([body.x + body.w - 6, body.y + body.d - 6, 106])], { size: 0.45 }))
  // the output boss on the housing front, where the arm's hub sits
  out.push(S(G.disc(0, 5, 17, F_HUB, P, { bevel: 0.6 }), { tone: 'mid' }))
  return out.join('')
}

/** The hub, encoder disc, arm and payload, drawn for one arm angle. The encoder's ticks turn with the arm. */
function hubSvg(theta: number) {
  const out: string[] = []
  out.push(S(G.disc(5, 8, 15, F_HUB, P, { bevel: 0.4 }), { tone: 'lo' })) // encoder disc
  const ticks: string[] = []
  for (let i = 0; i < 36; i++) {
    const a = ((i * 10) * Math.PI) / 180 + theta
    const r0 = 11.5, r1 = i % 3 === 0 ? 14.6 : 13.4
    ticks.push(seg([HUB[0] + r0 * Math.sin(a), HUB[1] + 8.1, HUB[2] + r0 * Math.cos(a)], [HUB[0] + r1 * Math.sin(a), HUB[1] + 8.1, HUB[2] + r1 * Math.cos(a)]))
  }
  out.push(L(ticks.join(''), { tone: 'lo' }))
  // arm: a bar from the hub to the payload, as a prism turned by theta
  const dx = Math.sin(theta), dz = -Math.cos(theta), nx = Math.cos(theta), nz = Math.sin(theta), w = 3.6
  const poly = [[ -dx * 0 + nx * w, dz * 0 + nz * w ], [ dx * ARM_L + nx * w, dz * ARM_L + nz * w ], [ dx * ARM_L - nx * w, dz * ARM_L - nz * w ], [ -nx * w, -nz * w ]]
  out.push(S(G.prismOf(F_HUB, poly, 8, 15, P), { tone: 'hi' }))
  out.push(S(G.disc(15, 17.6, 6, F_HUB, P, { bevel: 0.3 }), { tone: 'mid' })) // hub cap
  out.push(D([at([HUB[0], HUB[1] + 17.8, HUB[2]])], { size: 0.6, tone: 'hi' }))
  return out.join('')
}

function payload() {
  const t = tip(0)
  const block = { x: t[0] - 9, y: 30, w: 18, d: 12, r: 2 }
  const out: string[] = []
  out.push(S(k.slabOf(block, t[2] - 18, 18, P, 4, 0.6), { tone: 'mid' }))
  out.push(L(k.sideSeam(block, t[2] - 9, P, 4), { tone: 'faint' }))
  out.push(D([at([t[0], 42, t[2] - 9])], { size: 0.45 }))
  return out.join('')
}

function dial() {
  const out: string[] = []
  const [cx, cy, cz] = DIAL_C
  out.push(S(k.slabOf({ x: cx - 9, y: cy - 8, w: 18, d: 16, r: 2 }, 0, 40, P, 4, 0.6), { tone: 'mid' })) // stand
  out.push(S(k.slabOf({ x: cx - 6, y: cy - 6, w: 12, d: 12, r: 2 }, 40, cz - DIAL_R * 0.3 - 40 + 6, P, 3), { tone: 'mid', crease: 'none' }))
  const F = G.frameOf([cx, cy, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  out.push(S(G.disc(0, 7, DIAL_R + 3, F, P, { bevel: 0.8 }), { tone: 'mid' })) // bezel
  out.push(S(G.disc(7, 8, DIAL_R, F, P), { tone: 'hi' })) // face
  const mj: string[] = [], mn: string[] = []
  for (let i = -14; i <= 14; i++) {
    const a = (i * 5 * Math.PI) / 180, long = i % 7 === 0
    const r0 = long ? DIAL_R - 7 : DIAL_R - 4.2, r1 = DIAL_R - 1.6
    ;(long ? mj : mn).push(seg([cx + r0 * Math.sin(a), cy + 8.1, cz + r0 * Math.cos(a)], [cx + r1 * Math.sin(a), cy + 8.1, cz + r1 * Math.cos(a)]))
  }
  out.push(L(mn.join(''), { tone: 'lo' }), L(mj.join(''), { tone: 'mid' }))
  out.push(D([at([cx, cy + 8.2, cz])], { size: 0.8, tone: 'hi' }))
  return out.join('')
}

function knobBase() {
  const out: string[] = []
  const pad = { x: KNOB.x - 20, y: KNOB.y - 18, w: 40, d: 36, r: 4 }
  out.push(S(k.slabOf(pad, 0, 4, P, 5, 0.6), { tone: 'mid' }))
  out.push(D([at([pad.x + 4, pad.y + 4, 4]), at([pad.x + pad.w - 4, pad.y + 4, 4]), at([pad.x + 4, pad.y + pad.d - 4, 4]), at([pad.x + pad.w - 4, pad.y + pad.d - 4, 4])], { size: 0.4 }))
  // the Kp scale: 270 degrees of ticks round the knob
  const mn: string[] = [], mj: string[] = []
  for (let i = 0; i <= 50; i += 1) {
    const a = ((-135 + (i / 50) * 270) * Math.PI) / 180
    const long = i % 10 === 0, r0 = KNOB.r + 3, r1 = KNOB.r + (long ? 7 : 5)
    ;(long ? mj : mn).push(k.lineOnTop([KNOB.x + r0 * Math.sin(a), KNOB.y - r0 * Math.cos(a)], [KNOB.x + r1 * Math.sin(a), KNOB.y - r1 * Math.cos(a)], 4, P))
  }
  out.push(L(mn.join(''), { tone: 'lo' }), L(mj.join(''), { tone: 'mid' }))
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.4, 4, 2, P, 40), { tone: 'lo' }))
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, 6, KNOB.h - 2, P, 40, 0.8), { tone: 'hi' }))
  out.push(L(k.knurl(KNOB.x, KNOB.y, KNOB.r, 6, 6 + KNOB.h - 2, 44, P, 0.3), { tone: 'lo' }))
  out.push(L(k.ring(KNOB.x, KNOB.y, KNOB.r - 2.4, 4 + KNOB.h, P, 40), { tone: 'faint' }))
  return out.join('')
}
const KNOB_TOP = 4 + KNOB.h
const knobPointer = (kp: number) => {
  const a = ((-135 + (kp / 50) * 270) * Math.PI) / 180
  return k.lineOnTop([KNOB.x + 2.4 * Math.sin(a), KNOB.y - 2.4 * Math.cos(a)], [KNOB.x + (KNOB.r - 2) * Math.sin(a), KNOB.y - (KNOB.r - 2) * Math.cos(a)], KNOB_TOP, P)
}
const needlePath = (err: number) => {
  const a = (Math.max(-1, Math.min(1, err)) * 70 * Math.PI) / 180
  const [cx, cy, cz] = DIAL_C, r = DIAL_R - 3
  return seg([cx - 3 * Math.sin(a), cy + 8.3, cz - 3 * Math.cos(a)], [cx + r * Math.sin(a), cy + 8.3, cz + r * Math.cos(a)])
}

type Hist = { overshoot: number; settle: number }
function summarise(kp: number): Hist {
  const from = 0.26, to = 1.3
  const tr = simulateStep(DEFAULT_PLANT, { kp, ki: 20, kd: 0.05 }, from, to, 3, 5)
  const span = to - from
  let peak = from, settle = 3
  tr.y.forEach((y: number) => { if (y > peak) peak = y })
  for (let i = tr.y.length - 1; i >= 0; i--) { if (Math.abs(tr.y[i] - to) > 0.02 * span) { settle = tr.t[Math.min(i + 1, tr.t.length - 1)]; break } if (i === 0) settle = 0 }
  return { overshoot: Math.max(0, ((peak - to) / span) * 100), settle }
}

const TXT = {
  en: { fig: 'Fig 2', title: 'Servo test rig', hint: 'Turn the Kp knob', label: 'A geared servo on a pedestal swings a weighted arm. A dial gauge reads the error, and a knob sets the proportional gain Kp.', caption: 'The PID servo twin as a test rig: a geared DC servo (12 V, 180:1) swings a weighted arm towards a target angle. The dial reads the error live and the knob sets Kp. It runs the same plant and PID as the full simulation. Simulation only: nothing here is validated on hardware yet.', keyLit: 'Needle: the error between target and arm', keyRaised: 'Servo, arm and payload', kp: 'Proportional gain Kp', over: 'overshoot', settles: 'settles in', pause: 'Pause motion', play: 'Play motion' },
  ja: { fig: '図2', title: 'サーボ試験装置', hint: 'Kpのつまみを回す', label: '台座の上のギア付きサーボが、重りつきのアームを振ります。ダイヤルゲージが誤差を示し、つまみが比例ゲインKpを設定します。', caption: 'PIDサーボのデジタルツインを試験装置にしたものです。ギア付きDCサーボ（12V、減速比180:1）が、重りつきのアームを目標角度へ振ります。ダイヤルが誤差をライブで示し、つまみでKpを設定します。フルシミュレーションと同じプラントとPIDで動き、シミュレーションのみで、実機での検証はまだです。', keyLit: '針：目標とアームの誤差', keyRaised: 'サーボ、アーム、重り', kp: '比例ゲイン Kp', over: 'オーバーシュート', settles: '整定', pause: '動きを止める', play: '動かす' },
}

export default function PidRig({ lang }: { lang: 'en' | 'ja' }) {
  useIsoCss()
  const T = TXT[lang]
  const chaos = useStore((s) => s.mode === 'chaos')
  const calm = useMemo(() => reducedMotion(), [])
  const host = useRef<HTMLDivElement>(null)
  const [kp, setKp] = useState(5)
  const [paused, setPaused] = useState(false)
  const kpRef = useRef(kp), pausedRef = useRef(paused)
  useEffect(() => { kpRef.current = kp; pausedRef.current = paused; poke(host.current); draw() }, [kp, paused]) // eslint-disable-line react-hooks/exhaustive-deps
  const hist = useMemo(() => summarise(kp), [kp])
  const histRef = useRef(hist)
  useEffect(() => { histRef.current = hist }, [hist])

  const sim = useRef({ s: { theta: 0.26, omega: 0 } as State, pid: null as PID | null, target: 1.3, swap: 0, acc: 0 })
  const els = useRef<{ hub: SVGElement | null; payload: SVGElement | null; ghost: SVGElement | null; ghostLine: SVGElement | null; needle: SVGElement | null; pointer: SVGElement | null; readout: HTMLElement | null; hit: SVGElement | null }>({ hub: null, payload: null, ghost: null, ghostLine: null, needle: null, pointer: null, readout: null, hit: null })

  const html = useMemo(() => {
    const t0 = tip(0)
    const ring = (() => { const pts: [number, number, number][] = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; pts.push([t0[0] + 7 * Math.sin(a), t0[1] + 12, t0[2] - 9 + 7 * Math.cos(a)]) } return k.pathOf(pts.map((p) => at(p)), true) })()
    const kc = at([KNOB.x, KNOB.y, KNOB_TOP])
    const body = [
      arena(), board(chaos ? RIG : PLAIN), servo(),
      `<g data-part="hub">${hubSvg(0.26)}</g>`,
      `<g data-part="payload" transform="${k.translateAlong(P, [0, 0, 0])}">${payload()}</g>`,
      `<path data-part="ghostline" class="iso-line" data-tone="lit" data-free="start" d="" style="stroke-dasharray:4 3"/>`,
      `<g data-part="ghost" transform="${k.translateAlong(P, [0, 0, 0])}"><path class="iso-line" data-tone="lit" d="${ring}"/></g>`,
      dial(), `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needlePath(0)}" style="stroke-width:1.2"/>`,
      knobBase(), `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="start" d="${knobPointer(5)}" style="stroke-width:1.4"/>`,
      `<g data-part="hit" role="slider" tabindex="0" aria-label="${T.kp}" aria-valuemin="0" aria-valuemax="50" aria-valuenow="5" style="cursor:grab;touch-action:none"><circle cx="${kc[0]}" cy="${kc[1]}" r="26" fill="transparent"/></g>`,
    ]
    return k.plateHtml({
      fig: T.fig, title: T.title, hint: T.hint, readout: '',
      keys: [{ mark: 'lit', label: T.keyLit }, { mark: 'raised', label: T.keyRaised }],
      caption: T.caption,
      body: `<div class="iso-stage">${k.figureSvg({ width: W, height: H, label: T.label, body })}</div>`,
    })
  }, [T, chaos])

  const draw = () => {
    const e = els.current
    if (!e.hub) return
    const { s, target } = sim.current
    const theta = calm ? 1.3 : s.theta, tgt = calm ? 1.3 : target
    e.hub.innerHTML = hubSvg(theta)
    const t0 = tip(0), tp = tip(theta), tg = tip(tgt)
    e.payload?.setAttribute('transform', k.translateAlong(P, [tp[0] - t0[0], 0, tp[2] - t0[2]]))
    e.ghost?.setAttribute('transform', k.translateAlong(P, [tg[0] - t0[0], 0, tg[2] - t0[2]]))
    e.ghostLine?.setAttribute('d', seg([HUB[0], HUB[1] + 17.8, HUB[2]], [tg[0], HUB[1] + 17.8, tg[2] + 9]))
    e.needle?.setAttribute('d', needlePath(tgt - theta))
    e.pointer?.setAttribute('d', knobPointer(kpRef.current))
    e.hit?.setAttribute('aria-valuenow', String(kpRef.current)); e.hit?.setAttribute('aria-valuetext', `Kp ${kpRef.current}`)
    const h = histRef.current
    const text = `Kp ${kpRef.current.toFixed(1)} · ${T.over} ${h.overshoot.toFixed(0)}% · ${T.settles} ${h.settle >= 2.95 ? '>3' : h.settle.toFixed(1)} s`
    if (e.readout && e.readout.textContent !== text) e.readout.textContent = text
  }

  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = html
    const q = (s: string) => el.querySelector<SVGElement>(s)
    els.current = { hub: q('[data-part="hub"]'), payload: q('[data-part="payload"]'), ghost: q('[data-part="ghost"]'), ghostLine: q('[data-part="ghostline"]'), needle: q('[data-part="needle"]'), pointer: q('[data-part="pointer"]'), readout: el.querySelector('[data-readout]'), hit: q('[data-part="hit"]') }
    const hit = els.current.hit!
    let down = false
    const set = (e: PointerEvent) => {
      const svg = el.querySelector('svg')!.getBoundingClientRect()
      const kc = at([KNOB.x, KNOB.y, KNOB_TOP]), sc = svg.width / W
      const cx = svg.left + kc[0] * sc, cy = svg.top + kc[1] * sc
      let a = (Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI
      a = Math.max(-135, Math.min(135, a))
      setKp(Math.round(((a + 135) / 270) * 50 * 2) / 2)
    }
    const pd = (e: PointerEvent) => { down = true; hit.setPointerCapture(e.pointerId); set(e); emit('p8a') }
    const pm = (e: PointerEvent) => { if (down) set(e) }
    const pu = () => { down = false }
    const kd = (e: KeyboardEvent) => { const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (d) { e.preventDefault(); setKp((v) => Math.max(0, Math.min(50, v + d))) } }
    hit.addEventListener('pointerdown', pd); hit.addEventListener('pointermove', pm); hit.addEventListener('pointerup', pu); hit.addEventListener('pointercancel', pu); hit.addEventListener('keydown', kd)
    draw()
    return () => { hit.removeEventListener('pointerdown', pd); hit.removeEventListener('pointermove', pm); hit.removeEventListener('pointerup', pu); hit.removeEventListener('pointercancel', pu); hit.removeEventListener('keydown', kd) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  // the physics: the same plant and PID as the full simulation, stepped at 1 kHz; the target alternates between two angles
  useFrameLoop(host, (dt) => {
    if (calm) { draw(); return false }
    if (pausedRef.current) return false
    const m = sim.current
    if (!m.pid) { m.pid = new PID({ kp: kpRef.current, ki: 20, kd: 0.05 }); m.pid.reset(m.s.theta) }
    m.pid.gains = { kp: kpRef.current, ki: 20, kd: 0.05 }
    m.acc += dt / 0.001
    const n = Math.floor(m.acc); m.acc -= n
    for (let i = 0; i < n; i++) { const u = m.pid.step(m.target, m.s.theta, VMAX); plantStep(m.s, u, DEFAULT_PLANT) }
    m.swap += dt
    if (m.swap > 2.4) { m.swap = 0; m.target = m.target > 0.8 ? 0.26 : 1.3 }
    draw()
  }, [calm, T])

  return (
    <div className="iso-wrap iso-pid">
      <div className="iso" data-theme="light" ref={host} />
      {!calm && <div className="iso-controls"><button className="btn" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>{paused ? T.play : T.pause}</button></div>}
    </div>
  )
}
