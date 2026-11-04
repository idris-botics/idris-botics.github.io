import { lazy, type ComponentType } from 'react'
import { emit } from '../bus'
import { useStore } from '../store'
import type { SimKey } from '../content'

// Every sim is a lazy chunk, mounted only when its section nears the viewport (see SimSlot).
const Pid = lazy(() => import('./pid/View'))
const Cpu8 = lazy(() => import('./cpu8/View'))
const Pipe = lazy(() => import('./pipe/View'))
const Swarm = lazy(() => import('./swarm/View'))
const Gait = lazy(() => import('./gait/View'))
const Arena = lazy(() => import('./arena/View'))
const GaitSignal = lazy(() => import('./gaitsignal/View'))
const Net = lazy(() => import('./net/View'))

type P = { lang: 'en' | 'ja' }
type L = { en: string; ja: string }

// "How to use": three steps or fewer for every simulation. Every control in these sims is a native button, slider or select,
// so keyboard (Tab, Space, arrows on sliders) and touch both work; each sim has its own Reset, and the panel around it has Enlarge/Close and Minimise.
const HOW: Record<string, L[]> = {
  pid: [
    { en: 'Press Play and watch the orange arm chase the target angle.', ja: '再生を押し、オレンジのアームが目標角度を追うのを見ます。' },
    { en: 'Move the Kp, Ki and Kd sliders, or pick a preset, and watch the charts.', ja: 'Kp・Ki・Kdのスライダーかプリセットを動かし、グラフを見ます。' },
    { en: 'Read rise time and overshoot below. Reset starts again.', ja: '下の立ち上がり時間とオーバーシュートを読みます。リセットでやり直し。' },
  ],
  cpu8: [
    { en: 'Press Step to run one clock tick.', ja: 'ステップを押して、クロックを1つ進めます。' },
    { en: 'Watch the bus and registers through the micro-steps T1 to T6.', ja: 'マイクロステップT1〜T6でバスとレジスタの動きを見ます。' },
    { en: 'Choose a program, or Reset to start over.', ja: 'プログラムを選ぶか、リセットでやり直します。' },
  ],
  pipe: [
    { en: 'Pick a pipe segment for the leak.', ja: '漏れを置く配管区間を選びます。' },
    { en: 'Press Scan: the robot runs down the pipe.', ja: 'スキャンを押すと、ロボットが配管を進みます。' },
    { en: 'It pins the leak where the pressure drops. Reset clears it.', ja: '圧力が下がる場所で漏れを特定します。リセットで消去。' },
  ],
  net: [
    { en: 'Press Play and watch the net close around the drifting debris.', ja: '再生を押し、ネットが漂うデブリを包むのを見ます。' },
    { en: 'Fail a node, or move the slider, and see how the net copes.', ja: 'ノードを故障させるかスライダーを動かし、ネットの対応を見ます。' },
    { en: 'Reset starts again.', ja: 'リセットでやり直します。' },
  ],
  gaitsignal: [
    { en: 'Press Play to stream the synthetic sensor signal.', ja: '再生を押して、模擬センサー信号を流します。' },
    { en: 'Move the slider and watch the filter and the 4 to 6 Hz band.', ja: 'スライダーを動かし、フィルターと4〜6 Hz帯を見ます。' },
    { en: 'The detected gesture appears in the readout. Reset starts again.', ja: '検出したジェスチャーが表示されます。リセットでやり直し。' },
  ],
  dog: [
    { en: 'Press Play, then choose Live or Program.', ja: '再生を押し、ライブかプログラムを選びます。' },
    { en: 'Pick a move (walk, turn, stop) and watch the legs and servos.', ja: '動き（歩く、曲がる、止まる）を選び、脚とサーボを見ます。' },
    { en: 'Reset starts again.', ja: 'リセットでやり直します。' },
  ],
  spider: [
    { en: 'Press Play and pick a move.', ja: '再生を押して、動きを選びます。' },
    { en: 'Try the gaits and the speed slider and watch the eight servo angles.', ja: '歩き方とスピードを変え、8つのサーボ角を見ます。' },
    { en: 'Reset starts again.', ja: 'リセットでやり直します。' },
  ],
  swarm: [
    { en: 'Press Play and watch the units agree on a heading with no central node.', ja: '再生を押し、中央なしで各機が進行方向をそろえるのを見ます。' },
    { en: 'Switch to a boss unit, or dock the two units into one platform.', ja: 'ボス機に切り替えるか、2台を連結して1つのプラットフォームにします。' },
    { en: 'Reset starts again.', ja: 'リセットでやり直します。' },
  ],
}

function HowTo({ id, lang }: { id: string; lang: 'en' | 'ja' }) {
  const steps = HOW[id]
  if (!steps) return null
  return (
    <details className="howto surface" open>
      <summary>{lang === 'en' ? 'How to use' : '使い方'}</summary>
      <ol>{steps.map((st, i) => <li key={i}>{st[lang]}</li>)}</ol>
    </details>
  )
}
const withHow = (id: string, node: (p: P) => React.ReactElement) => (p: P) => <><HowTo id={id} lang={p.lang} />{node(p)}</>

// Simulation events become Chaos captions through the bus (ignored in Calm mode).
const cpuEvt = (e: string) => { if (e === 'overflow') emit('p2a'); else if (e === 'illegal') emit('p2b'); else if (e === 'halt') emit('p2c') }
const swarmEvt = (e: string) => { if (e === 'boss-add') emit('p6a'); else if (e === 'boss-remove') emit('p6b') }
const gaitEvt = (e: string) => { if (e === 'chaos-gait' || e === 'tangle') emit('p3') }
const netEvt = (e: string) => { if (e === 'net-closed') emit('p9a'); else if (e === 'node-failed') emit('p9b') }
const pidEvt = (e: string) => { if (['p8a', 'p8b', 'p8c', 'p8d', 'p8e'].includes(e)) emit(e) }
const pipeEvt = (e: string) => { if (e === 'leak-found') emit('p5') }

function ArenaSim(p: P) {
  const chaos = useStore((s) => s.mode === 'chaos')
  return <Arena {...p} pairingFailures={chaos ? 3 : 0} />
}

export const SimView: Record<SimKey, ComponentType<P>> = {
  pid: withHow('pid', (p) => <Pid {...p} {...({ onEvent: pidEvt } as object)} />),
  cpu8: withHow('cpu8', (p) => <Cpu8 {...p} onEvent={cpuEvt} />),
  pipe: withHow('pipe', (p) => <Pipe {...p} {...({ onEvent: pipeEvt } as object)} />),
  swarm: withHow('swarm', (p) => <Swarm {...p} onEvent={swarmEvt} />),
  gait: (p) => <Gait {...p} onEvent={gaitEvt} />,
  dog: withHow('dog', (p) => <Gait {...p} robot="dog" onEvent={gaitEvt} />),
  spider: withHow('spider', (p) => <Gait {...p} robot="spider" onEvent={gaitEvt} />),
  arena: ArenaSim,
  gaitsignal: withHow('gaitsignal', (p) => <GaitSignal {...p} />),
  net: withHow('net', (p) => <Net {...p} {...({ onEvent: netEvt } as object)} />),
}
