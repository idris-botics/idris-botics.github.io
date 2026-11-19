// Chaos-mode sound effects and music, synthesised with the Web Audio API (no audio files to download).
// Nothing plays until the visitor has interacted with the page, and the mute switch is remembered for the session.
let ctx: AudioContext | null = null
// Sound is on by default; the speaker button turns it off, and the choice is remembered for the visit.
let muted = false
try { muted = sessionStorage.getItem('sfx-muted') === '1' } catch { /* ignore */ }

export const isMuted = () => muted
const muteListeners = new Set<() => void>()
/** Subscribe to the sound switch (the speaker button): the Rick roll and Cena videos follow it too. Returns the unsubscribe function. */
export const onMuteChange = (f: () => void) => { muteListeners.add(f); return () => { muteListeners.delete(f) } }
export function setMuted(m: boolean) {
  muted = m
  muteListeners.forEach((f) => f())
  try { sessionStorage.setItem('sfx-muted', m ? '1' : '0') } catch { /* ignore */ }
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

const MASTER = 0.22

// One shared mixer: a compressor keeps many overlapping sounds from clipping, a high-pass takes out rumble nobody can hear
// (it only eats headroom), and a small dark room with a short pre-delay gives everything some depth.
const buses = new WeakMap<AudioContext, GainNode>()
function bus(c: AudioContext): AudioNode {
  let b = buses.get(c)
  if (b) return b
  b = c.createGain()
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 26
  b.connect(hp).connect(comp).connect(c.destination)
  // the room: 1.2 s, two different channels, and the tail gets darker as it fades
  const len = Math.floor(c.sampleRate * 1.2)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0
    for (let i = 0; i < len; i++) {
      const k = 1 - i / len
      lp += ((Math.random() * 2 - 1) - lp) * (0.08 + 0.52 * k * k)
      d[i] = lp * Math.pow(k, 2.6) * 2.4
    }
  }
  const pre = c.createDelay(0.1); pre.delayTime.value = 0.018
  const conv = c.createConvolver(); conv.buffer = ir
  const wet = c.createGain(); wet.gain.value = 0.17
  b.connect(pre).connect(conv).connect(wet).connect(comp)
  buses.set(c, b)
  return b
}

/** While the music loop is scheduling its notes this is the music fader, so they can fade in and out together; otherwise the main mixer. */
let out: AudioNode | null = null
const dest = (c: AudioContext): AudioNode => out ?? bus(c)

type Pan = number | [number, number] // -1 (left) to 1 (right), or a sweep from one side to the other
function route(c: AudioContext, node: AudioNode, t: number, dur: number, pan: Pan) {
  if (pan === 0 || typeof c.createStereoPanner !== 'function') { node.connect(dest(c)); return }
  const p = c.createStereoPanner()
  if (Array.isArray(pan)) { p.pan.setValueAtTime(pan[0], t); p.pan.linearRampToValueAtTime(pan[1], t + dur) } else p.pan.value = pan
  node.connect(p).connect(dest(c))
}

function env(g: GainNode, t: number, peak: number, dur: number, attack = 0.012) {
  const a = Math.min(attack, dur * 0.4)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * MASTER), t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

let jitter = 0.05 // pitch variation, so a sound used again and again never repeats exactly
function tone(c: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, peak = 1, delay = 0, pan: Pan = 0, attack = 0.012) {
  const v = 1 + (Math.random() - 0.5) * 2 * jitter
  f0 *= v; f1 *= v
  const t = c.currentTime + delay
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  env(g, t, peak, dur, attack)
  o.connect(g); route(c, g, t, dur, pan)
  o.start(t); o.stop(t + dur + 0.02)
}

// one shared second and a half of white noise (a new buffer for every hiss was a lot of garbage)
const noiseBufs = new WeakMap<AudioContext, AudioBuffer>()
function noiseBuf(c: AudioContext) {
  let b = noiseBufs.get(c)
  if (!b) {
    b = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    noiseBufs.set(c, b)
  }
  return b
}

function noise(c: AudioContext, dur: number, f0: number, f1: number, peak = 1, delay = 0, type: BiquadFilterType = 'lowpass', pan: Pan = 0, q = 1) {
  const t = c.currentTime + delay
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  src.buffer = noiseBuf(c); src.loop = true
  f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur)
  env(g, t, peak, dur)
  src.connect(f).connect(g); route(c, g, t, dur, pan)
  src.start(t, Math.random()); src.stop(t + dur + 0.02)
}

/** A glassy bell: a sine whose pitch is bent by a second sine, so it starts bright and rings down to a pure note. */
function bell(c: AudioContext, f: number, dur: number, peak = 0.6, delay = 0, pan: Pan = 0) {
  const t = c.currentTime + delay
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain()
  car.frequency.value = f; mod.frequency.value = f * 3.5
  mg.gain.setValueAtTime(f * 1.5, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.55)
  mod.connect(mg).connect(car.frequency)
  env(g, t, peak, dur, 0.004)
  car.connect(g); route(c, g, t, dur, pan)
  car.start(t); mod.start(t); car.stop(t + dur + 0.02); mod.stop(t + dur + 0.02)
}

/** A plucked note: a bright oscillator that closes down fast, like a string or a marimba. */
function pluck(c: AudioContext, type: OscillatorType, f: number, dur: number, peak = 0.5, delay = 0, pan: Pan = 0, bright = 3400) {
  const t = c.currentTime + delay
  const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain()
  o.type = type; o.frequency.value = f
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.2), t + dur * 0.8)
  env(g, t, peak, dur, 0.006)
  o.connect(lp).connect(g); route(c, g, t, dur, pan)
  o.start(t); o.stop(t + dur + 0.02)
}

/** A slow soft chord: detuned triangles through a low-pass, fading in and out. Used under the music and for solemn moments. */
function pad(c: AudioContext, freqs: number[], delay: number, dur: number, peak = 0.3, open = 1500) {
  const t = c.currentTime + delay
  const f = c.createBiquadFilter(), g = c.createGain()
  f.type = 'lowpass'; f.frequency.value = open
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak * MASTER, t + dur * 0.35)
  g.gain.linearRampToValueAtTime(peak * MASTER * 0.7, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  f.connect(g); g.connect(dest(c))
  for (const hz of freqs) for (const d of [-7, 7]) {
    const o = c.createOscillator()
    o.type = 'triangle'; o.frequency.value = hz; o.detune.value = d
    o.connect(f); o.start(t); o.stop(t + dur + 0.05)
  }
}

/** A sustained brass-like chord: detuned sawtooth voices through a low-pass filter. */
function brass(c: AudioContext, freqs: number[], delay: number, dur: number, peak = 0.5) {
  const t = c.currentTime + delay
  const f = c.createBiquadFilter(), g = c.createGain()
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2600, t + 0.25); f.frequency.linearRampToValueAtTime(1200, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak * MASTER, t + 0.1)
  g.gain.setValueAtTime(peak * MASTER, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  f.connect(g); g.connect(dest(c))
  for (const hz of freqs) for (const d of [-6, 6]) {
    const o = c.createOscillator()
    o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = d
    o.connect(f); o.start(t); o.stop(t + dur + 0.05)
  }
}

function timpani(c: AudioContext, delay: number) {
  tone(c, 'sine', 120, 50, 0.45, 1.1, delay)
  noise(c, 0.2, 700, 90, 0.5, delay)
}

/** A round "bloop" bubble: a sine that bends up quickly. */
const bubble = (c: AudioContext, delay: number, f = 220 + Math.random() * 260, peak = 0.4, pan: Pan = (Math.random() - 0.5) * 0.9) =>
  tone(c, 'sine', f, f * (1.9 + Math.random() * 0.8), 0.07 + Math.random() * 0.05, peak, delay, pan, 0.006)

const RECIPES = {
  // a loud brass jumpscare sting: three hits and a held chord (original, not any entrance theme)
  cena: (c: AudioContext) => {
    brass(c, [392, 587], 0, 0.28, 0.9); timpani(c, 0)
    brass(c, [392, 587], 0.34, 0.28, 0.9); timpani(c, 0.34)
    brass(c, [392, 587], 0.68, 0.28, 0.9); timpani(c, 0.68)
    brass(c, [523, 784, 1046], 1.05, 1.8, 1); timpani(c, 1.05); noise(c, 0.5, 6000, 800, 0.9, 1.05, 'highpass')
  },
  // an original heroic fanfare (not any film theme): rising chords over timpani, about 9 seconds
  epic: (c: AudioContext) => {
    const G = [196, 294, 392], Eb = [155.6, 233, 311], F = [174.6, 261.6, 349.2], Bb = [233, 349, 466]
    const bars: [number[], number, number][] = [[G, 0, 1.3], [Eb, 1.4, 1.3], [F, 2.8, 1.3], [G, 4.2, 1.3], [Bb, 5.6, 1.2], [F, 6.9, 1.2], [G, 8.2, 3.2]]
    for (const [fr, at, len] of bars) { brass(c, fr, at, len); timpani(c, at) }
    brass(c, [98], 0, 11.4, 0.5)
  },
  // user interface
  chime: (c: AudioContext) => { [784, 988, 1319, 1568].forEach((fr, i) => bell(c, fr, 0.95, 0.42, i * 0.085, (i - 1.5) * 0.25)); bell(c, 3136, 0.5, 0.12, 0.34) },
  tick: (c: AudioContext) => { noise(c, 0.012, 7000, 3500, 0.7, 0, 'highpass'); tone(c, 'sine', 2300, 1700, 0.03, 0.4) },
  swish: (c: AudioContext) => { noise(c, 0.3, 600, 5600, 1.3, 0, 'bandpass', [-0.5, 0.5], 1.2) },
  pop: (c: AudioContext) => { tone(c, 'sine', 880, 300, 0.1, 0.8); noise(c, 0.012, 6000, 2500, 0.2, 0, 'highpass') },
  ding: (c: AudioContext) => { bell(c, 880, 0.9, 0.6); bell(c, 1320, 0.7, 0.25, 0.06) },
  blip: (c: AudioContext) => pluck(c, 'square', 660, 0.1, 0.5, 0, 0, 2600),
  // the remix: a low toll while the statement is up, and a big hit with a rising chord for REMIX IS ON
  toll: (c: AudioContext) => { bell(c, 165, 3.6, 0.9); bell(c, 396, 2.8, 0.32); bell(c, 990, 1.6, 0.12, 0.02); tone(c, 'sine', 82, 80, 2.8, 0.5, 0, 0, 0.05) },
  remix: (c: AudioContext) => {
    tone(c, 'sine', 100, 30, 1.4, 1.3); noise(c, 1.3, 2600, 80, 0.9); noise(c, 1.6, 9000, 2500, 0.45, 0, 'highpass')
    brass(c, [146.8, 220, 293.7, 440], 0.04, 1.9, 0.8); pad(c, [293.7, 440, 587.3, 880], 0.1, 2.8, 0.4, 2400)
    ;[880, 1175, 1319, 1760, 2349].forEach((f, i) => bell(c, f, 1.1, 0.3, 0.22 + i * 0.1, (i - 2) * 0.3))
  },
  flush: (c: AudioContext) => {
    // a whirlpool: two bands of rushing water that circle from side to side, a falling hum underneath, and bubbles
    noise(c, 2.6, 2200, 170, 0.5, 0, 'bandpass', [-0.8, 0.8], 3)
    noise(c, 2.6, 1500, 120, 0.4, 0.15, 'bandpass', [0.8, -0.8], 2.5)
    tone(c, 'triangle', 300, 46, 2.6, 0.2); tone(c, 'sine', 150, 40, 2.6, 0.3)
    for (let i = 0; i < 9; i++) bubble(c, 0.1 + Math.random() * 2.2, 200 + Math.random() * 260, 0.22)
  },
  gurgle: (c: AudioContext) => { noise(c, 1.2, 380, 140, 0.25, 0, 'lowpass', 0, 2); for (let i = 0; i < 10; i++) bubble(c, i * 0.11 + Math.random() * 0.05, 150 + Math.random() * 200, 0.8) },
  burp: (c: AudioContext) => {
    // a low buzz with a mouth shape: a sawtooth through a band that opens and closes
    const t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.55)
    f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(700, t + 0.2); f.frequency.linearRampToValueAtTime(320, t + 0.55)
    env(g, t, 1.1, 0.55, 0.03); o.connect(f).connect(g); g.connect(dest(c)); o.start(t); o.stop(t + 0.6)
    noise(c, 0.35, 500, 140, 0.25, 0.02, 'lowpass')
  },
  boing: (c: AudioContext) => {
    // a spring: the pitch springs up, then wobbles back down
    const t = c.currentTime, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(760, t + 0.1); o.frequency.exponentialRampToValueAtTime(200, t + 0.5)
    lfo.frequency.value = 26; lg.gain.setValueAtTime(10, t); lg.gain.linearRampToValueAtTime(70, t + 0.2); lg.gain.linearRampToValueAtTime(0, t + 0.5)
    lfo.connect(lg).connect(o.frequency)
    env(g, t, 0.9, 0.52, 0.008); o.connect(g); route(c, g, t, 0.5, 0); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55)
    tone(c, 'triangle', 480, 1500, 0.1, 0.2)
  },
  whoosh: (c: AudioContext) => { noise(c, 0.9, 400, 4200, 2.4, 0, 'bandpass', [-0.7, 0.7], 1); noise(c, 0.9, 200, 2200, 0.7, 0.05, 'lowpass', [-0.7, 0.7]) },
  whistle: (c: AudioContext) => { tone(c, 'sine', 1600, 190, 1.3, 0.55, 0, 0, 0.04); noise(c, 1.3, 3800, 600, 0.1, 0, 'bandpass', 0, 8) },
  boom: (c: AudioContext) => { noise(c, 1.2, 2200, 60, 1.4); tone(c, 'sine', 120, 28, 1.1, 1.4); tone(c, 'sine', 58, 32, 1.6, 0.8); noise(c, 0.35, 5000, 400, 0.8, 0, 'highpass') },
  thud: (c: AudioContext) => { tone(c, 'sine', 100, 36, 0.26, 1.1); noise(c, 0.1, 700, 120, 0.55) },
  rumble: (c: AudioContext) => { noise(c, 1.6, 220, 40, 1); tone(c, 'sine', 48, 34, 1.5, 0.6, 0, 0, 0.2) },
  alarm: (c: AudioContext) => { for (let i = 0; i < 3; i++) { tone(c, 'square', 880, 880, 0.14, 0.45, i * 0.3, -0.3); tone(c, 'square', 660, 660, 0.14, 0.45, i * 0.3 + 0.15, 0.3) } },
  crack: (c: AudioContext) => { noise(c, 0.08, 6000, 1500, 0.9, 0, 'highpass'); noise(c, 0.1, 5000, 800, 0.7, 0.07, 'highpass', -0.3); noise(c, 0.12, 4000, 600, 0.6, 0.15, 'highpass', 0.3) },
  warp: (c: AudioContext) => { tone(c, 'sawtooth', 1200, 120, 0.9, 0.45, 0, [-0.6, 0.6]); tone(c, 'sawtooth', 120, 1200, 0.9, 0.35, 0.9, [0.6, -0.6]); noise(c, 1.8, 300, 5000, 0.12, 0, 'bandpass', 0, 3) },
  sting: (c: AudioContext) => { tone(c, 'sawtooth', 110, 55, 1.4, 0.9); tone(c, 'square', 440, 330, 0.5, 0.5, 0.05); tone(c, 'square', 311, 233, 0.9, 0.5, 0.5); timpani(c, 0) },
  nani: (c: AudioContext) => { pluck(c, 'square', 1046, 0.14, 0.6, 0, 0, 4200); pluck(c, 'square', 1568, 0.4, 0.6, 0.12, 0, 4200) },
  // a short victory call: a rising bell arpeggio over a bright chord
  fanfare: (c: AudioContext) => {
    ;[523, 659, 784, 1046].forEach((f, i) => { pluck(c, 'sawtooth', f, 0.32, 0.5, i * 0.13, (i - 1.5) * 0.3, 4200); bell(c, f * 2, 0.7, 0.18, i * 0.13) })
    brass(c, [523, 659, 784], 0.55, 0.9, 0.55); noise(c, 0.7, 9000, 3000, 0.3, 0.55, 'highpass')
  },
  restore: (c: AudioContext) => { [392, 523, 659].forEach((f, i) => { bell(c, f, 0.6, 0.45, i * 0.09, (i - 1) * 0.3) }) },
  error: (c: AudioContext) => { tone(c, 'sawtooth', 200, 110, 0.3, 0.6); tone(c, 'sawtooth', 160, 80, 0.4, 0.6, 0.18) },
  // a bite: a soft thump and a few crumbs
  chomp: (c: AudioContext) => {
    const p = (Math.random() - 0.5) * 0.6
    tone(c, 'sine', 150, 70, 0.07, 1, 0, p)
    for (let i = 0; i < 4; i++) noise(c, 0.03, 3600 - i * 400, 800, 1.2 - i * 0.2, 0.004 + i * 0.022, 'bandpass', p, 2)
  },
  shake: (c: AudioContext) => { noise(c, 1.7, 180, 60, 1.4); for (let i = 0; i < 16; i++) noise(c, 0.02, 5000, 2000, 0.6, Math.random() * 1.6, 'highpass', (Math.random() - 0.5) * 1.2) },
  // coffee: a pour that glugs, a slurp as it drains, and a vending-machine clunk
  pour: (c: AudioContext) => { noise(c, 1.1, 1400, 500, 0.45, 0, 'bandpass', 0, 2); for (let i = 0; i < 5; i++) bubble(c, 0.1 + i * 0.17, 300 + i * 40, 0.4, 0) },
  slurp: (c: AudioContext) => { noise(c, 0.8, 600, 2400, 0.4, 0, 'bandpass', 0, 3); tone(c, 'sine', 500, 160, 0.7, 0.4) },
  gachon: (c: AudioContext) => { tone(c, 'sine', 140, 60, 0.18, 1); noise(c, 0.1, 1200, 200, 0.7); bell(c, 330, 0.5, 0.25, 0.12); tone(c, 'triangle', 220, 110, 0.25, 0.5, 0.12) },
} as const

export type Sfx = keyof typeof RECIPES
export const SFX_NAMES = Object.keys(RECIPES) as Sfx[]

export function sfx(name: Sfx) {
  const c = ac()
  if (c) RECIPES[name](c)
}

/** Robot anger: a beep that climbs with each click (level 1 to 14). */
export function angerBeep(level: number) {
  const c = ac()
  if (!c) return
  const f = 300 + level * 60
  tone(c, 'square', f, f * 1.25, 0.1, 0.5)
  if (level > 8) tone(c, 'sawtooth', f * 0.5, f * 0.4, 0.18, 0.5, 0.05)
}

/**
 * The music for the warning crawl: a 16-bar chiptune loop at 132 bpm (about 29 seconds, then round again).
 * Four bars of drums, bass and a plucked arpeggio; four more with a pad and a lead melody with an echo; four that lift
 * (F, G, Am, E, an extra kick, open hats); and four of turnaround with a snare fill at the end. It fades in, fades out when stopped,
 * and goes quiet at once if the sound is switched off. Returns the stop function.
 */
export function startMusic(): () => void {
  const c = ac()
  if (!c) return () => {}
  const step = 60 / 132 / 4
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  jitter = 0
  // everything goes through one fader, so it can fade in, fade out and follow the mute switch
  const fade = c.createGain()
  fade.gain.setValueAtTime(0.0001, c.currentTime); fade.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.6)
  fade.connect(bus(c))
  // a dotted-eighth echo for the lead
  const echo = c.createDelay(1); echo.delayTime.value = step * 3
  const fb = c.createGain(); fb.gain.value = 0.3
  const ew = c.createGain(); ew.gain.value = 0.32
  echo.connect(fb).connect(echo); echo.connect(ew).connect(fade)
  const offMute = onMuteChange(() => {
    const t = c.currentTime
    fade.gain.cancelScheduledValues(t); fade.gain.setValueAtTime(Math.max(0.0001, fade.gain.value), t)
    fade.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 1, t + 0.15)
  })

  type Chord = { root: number; tri: number[] } // midi note numbers
  const Am = { root: 45, tri: [57, 60, 64] }, F = { root: 41, tri: [53, 57, 60] }, C = { root: 48, tri: [60, 64, 67] }, G = { root: 43, tri: [55, 59, 62] }, E = { root: 40, tri: [52, 56, 59] }
  const prog: Chord[] = [Am, F, C, G, Am, F, C, G, F, G, Am, E, Am, F, G, E]
  // lead motifs: [step, chord degree (0 to 5, counting up through the triad and the next octave), length in steps]
  const motifs: [number, number, number][][] = [
    [[0, 2, 3], [4, 1, 1], [6, 2, 1], [8, 3, 3], [12, 2, 1], [14, 1, 1]],
    [[0, 3, 2], [3, 4, 1], [6, 3, 2], [8, 2, 3], [12, 1, 2]],
    [[0, 4, 2], [2, 3, 1], [4, 4, 2], [8, 5, 4], [12, 4, 2], [14, 3, 1]],
  ]
  const lead = (f: number, len: number, delay: number) => {
    const t = c.currentTime + delay, d = len * step * 0.9
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain()
    o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 3000
    env(g, t, 0.2, d, 0.01)
    o.connect(lp).connect(g); g.connect(fade); g.connect(echo)
    o.start(t); o.stop(t + d + 0.02)
  }

  const play = (s: number, bar: number, delay: number) => {
    const ch = prog[bar], sec = bar >= 8 ? 2 : bar >= 4 ? 1 : 0
    const odd = bar % 2 === 1, fill = bar % 4 === 3
    // drums
    if (s % 4 === 0 || (sec >= 1 && s === 10 && odd) || (sec === 2 && s === 14 && odd)) { tone(c, 'sine', 160, 42, 0.2, 1.1, delay); noise(c, 0.012, 3000, 800, 0.25, delay, 'bandpass') } // kick
    if (s === 4 || s === 12) { noise(c, 0.14, 3400, 900, 0.55, delay, 'bandpass'); tone(c, 'triangle', 220, 150, 0.1, 0.4, delay) } // snare
    if (fill && s >= 12) { noise(c, 0.09, 3400, 1200, 0.35 + (s - 12) * 0.13, delay, 'bandpass'); tone(c, 'triangle', 240, 170, 0.08, 0.25, delay) } // fill
    if (sec >= 1 && s === 15 && !fill) noise(c, 0.06, 3000, 1200, 0.18, delay, 'bandpass') // ghost snare
    if (s % 2 === 0) noise(c, 0.04, 7000, 5000, s % 4 === 2 ? 0.35 : 0.2, delay, 'highpass', s % 4 === 2 ? 0.25 : -0.25) // closed hat
    if (sec >= 1 && s === 14) noise(c, 0.16, 8000, 4500, 0.28, delay, 'highpass', 0.3) // open hat
    if (sec === 2 && s % 2 === 1) noise(c, 0.025, 8000, 6000, 0.09, delay, 'highpass') // sixteenth hats
    // bass: a plucked saw, on the beat and then syncopated in the lift
    const bassSteps = sec === 2 ? [0, 3, 6, 8, 10, 14] : [0, 2, 4, 6, 8, 10, 12, 14]
    if (bassSteps.includes(s)) { const up = s % 8 === 6 || s === 14; pluck(c, 'sawtooth', hz(ch.root + (up ? 12 : 0)), 0.16, 0.42, delay, 0, 1100) }
    // arpeggio, an octave higher in the second half of each bar once the music has built
    const arp = [0, 1, 2, 1][s % 4], hi = sec >= 1 && s % 8 >= 4 ? 12 : 0
    pluck(c, 'triangle', hz(ch.tri[arp] + 12 + hi), 0.12, 0.34, delay, s % 2 ? 0.35 : -0.35, 3600)
    if (sec === 0 && (s === 0 || s === 8)) tone(c, 'square', hz(ch.tri[2] + 24), hz(ch.tri[2] + 24), 0.2, 0.2, delay) // bright accent
    // the pad holds each chord for the bar, and the lead plays its motif
    if (sec >= 1 && s === 0) pad(c, ch.tri.map((m) => hz(m - 12)), delay, step * 16, 0.28)
    if (sec >= 1) for (const [at, deg, len] of motifs[sec === 2 ? 2 : odd ? 1 : 0]) if (at === s) lead(hz(ch.tri[deg % 3] + 12 + 12 * Math.floor(deg / 3)), len, delay)
  }
  let next = c.currentTime + 0.08, n = 0, alive = true
  const timer = window.setInterval(() => {
    if (!alive) return
    if (muted) { next = Math.max(next, c.currentTime + 0.08); return }
    out = fade
    try {
      while (next < c.currentTime + 0.45) {
        play(n % 16, Math.floor(n / 16) % 16, Math.max(0, next - c.currentTime))
        next += step
        n++
      }
    } finally { out = null }
  }, 100)
  return () => {
    alive = false; jitter = 0.05; clearInterval(timer); offMute()
    const t = c.currentTime
    fade.gain.cancelScheduledValues(t); fade.gain.setValueAtTime(Math.max(0.0001, fade.gain.value), t); fade.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    window.setTimeout(() => { fade.disconnect(); echo.disconnect() }, 2500)
  }
}

/**
 * Construction site: hammering in quick runs, a drill every few seconds, a metal clang now and then, and a reversing truck beeping.
 * Used while the page is being "fixed" after the gravity gag. Returns a function that stops it.
 */
export function startConstruction(): () => void {
  const c = ac()
  if (!c) return () => {}
  let alive = true
  let nextHammer = 0, nextDrill = 1.5, nextBeep = 3, nextClang = 2.5
  const t0 = c.currentTime
  const timer = window.setInterval(() => {
    if (!alive) return
    const now = c.currentTime - t0
    const side = (Math.random() - 0.5) * 1.2
    const hammer = (d: number) => { noise(c, 0.05, 3200, 900, 0.8, d, 'bandpass', side); tone(c, 'square', 190, 80, 0.07, 0.45, d, side); bell(c, 1250, 0.18, 0.08, d, side) }
    if (now >= nextHammer) { // a run of 2 to 4 knocks
      const n = 2 + Math.floor(Math.random() * 3)
      for (let k = 0; k < n; k++) hammer(k * 0.24)
      nextHammer = now + n * 0.24 + 0.5 + Math.random() * 0.9
    }
    if (now >= nextDrill) { // buzzing drill
      for (let k = 0; k < 26; k++) { noise(c, 0.035, 2600, 1800, 0.5, k * 0.04, 'bandpass', 0.4); if (k % 2 === 0) tone(c, 'sawtooth', 150 + k * 2, 170 + k * 2, 0.04, 0.35, k * 0.04, 0.4) }
      nextDrill = now + 4.5 + Math.random() * 3
    }
    if (now >= nextClang) { bell(c, 880, 0.9, 0.4, 0, -0.4); tone(c, 'sine', 1320, 990, 0.35, 0.2, 0, -0.4); nextClang = now + 3.5 + Math.random() * 3 }
    if (now >= nextBeep) { for (let k = 0; k < 4; k++) tone(c, 'square', 1000, 1000, 0.2, 0.3, k * 0.5, 0.5); nextBeep = now + 7 + Math.random() * 3 }
  }, 120)
  return () => { alive = false; clearInterval(timer) }
}

/** The long falling sound: wind that drops away (down) or climbs (up). */
export function fall(dir: 1 | -1) {
  const c = ac()
  if (!c) return
  noise(c, 3.8, dir === 1 ? 3200 : 260, dir === 1 ? 220 : 3200, 0.9, 0, 'bandpass', dir === 1 ? [-0.3, 0.3] : [0.3, -0.3], 1.5)
  tone(c, 'sine', dir === 1 ? 1500 : 180, dir === 1 ? 150 : 1500, 3.6, 0.45, 0, 0, 0.3)
  tone(c, 'triangle', dir === 1 ? 750 : 90, dir === 1 ? 75 : 750, 3.6, 0.15, 0.05, 0, 0.3)
}

/** One thing hitting another: a clack, a clang or a thud between pieces, a heavy thump on the floor or ceiling. */
export function impact(level: number, wall: boolean) {
  const c = ac()
  if (!c) return
  const r = 0.8 + Math.random() * 0.5, p = (Math.random() - 0.5) * 1.2
  if (wall) {
    tone(c, 'sine', 120 * r, 34, 0.4, 0.7 + 0.7 * level)
    noise(c, 0.25, 900, 90, 0.55 + 0.4 * level)
    return
  }
  const pick = Math.random()
  if (pick < 0.5) { noise(c, 0.06, 2000 * r, 600, 0.3 + 0.5 * level, 0, 'bandpass', p); tone(c, 'triangle', 430 * r, 260, 0.07, 0.3 + 0.3 * level, 0, p) } // clack
  else if (pick < 0.8) { tone(c, 'sine', 200 * r, 70, 0.14, 0.45 + 0.5 * level, 0, p); noise(c, 0.08, 700, 150, 0.3 * level, 0, 'lowpass', p) } // thud
  else { bell(c, 880 * r, 0.35, 0.16 + 0.3 * level, 0, p); noise(c, 0.05, 6000, 2000, 0.25 * level, 0, 'highpass', p) } // clang
}

/** The pet robot's mood changes how it sounds: caffeinated is high and quick, crashed is low and slow. */
export type VoiceMood = 'normal' | 'caffeinated' | 'crashed'
let mood: VoiceMood = 'normal'
export const setVoiceMood = (m: VoiceMood) => { mood = m }
/** Bleep-bloop talking: one short blip per word, spread over the time the bubble stays up. Only plays when sound is on. */
export function talk(text: string, wordMs = 280) {
  const c = ac()
  if (!c) return
  const words = text.split(/\s+/).filter(Boolean).slice(0, 36)
  const base = mood === 'caffeinated' ? 640 : mood === 'crashed' ? 170 : 340
  const gap = (mood === 'caffeinated' ? 0.7 : mood === 'crashed' ? 1.6 : 1) * (wordMs / 1000)
  words.forEach((w, i) => {
    const f = base * (1 + ((w.length * 37 + i * 11) % 9) / 14)
    const to = f * (i % 2 ? 1.25 : 0.82)
    tone(c, 'triangle', f, to, 0.08, 0.32, i * gap, 0, 0.006) // the round voice
    tone(c, 'square', f * 2, to * 2, 0.05, 0.05, i * gap, 0, 0.004) // a thin buzz on top, so it sounds like a robot
  })
}

/**
 * A royal fanfare for the "idris" secret (about 7 seconds, only when sound is on): drum roll, a brass call, a rising victory run with chords,
 * a cymbal crash, a bouncy little tune and sparkle chimes. Everything is synthesised, no audio file.
 */
export function fanfare() {
  const c = ac()
  if (!c) return
  const N = (n: number) => 440 * Math.pow(2, (n - 9) / 12) // semitones above middle C
  const brass = (n: number, at: number, dur: number, peak = 0.7) => { for (const d of [0, 7, 12]) tone(c, 'sawtooth', N(n + d), N(n + d), dur, peak * (d ? 0.5 : 1), at) }
  // 1. a timpani roll
  for (let i = 0; i < 12; i++) tone(c, 'sine', 120, 70, 0.14, 0.5 + i * 0.03, i * 0.075)
  // 2. the call: G C E G, then a held C chord with a crash
  const call: [number, number, number][] = [[-5, 0.95, 0.16], [0, 1.1, 0.16], [4, 1.25, 0.16], [7, 1.4, 0.7]]
  for (const [n, at, d] of call) brass(n, at, d)
  for (const n of [0, 4, 7, 12]) tone(c, 'square', N(n + 12), N(n + 12), 1.3, 0.35, 1.4)
  noise(c, 1.6, 9000, 2500, 0.8, 1.4, 'highpass')
  tone(c, 'sine', 110, 40, 0.5, 1, 1.4)
  // 3. a rising victory run
  ;[0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19].forEach((n, i) => pluck(c, 'square', N(n + 12), 0.14, 0.4, 3.0 + i * 0.085, (i - 6) * 0.1, 3800))
  // 4. a bouncy tune over a bass line
  const tune = [12, 16, 19, 16, 17, 14, 17, 14, 12, 16, 19, 24]
  tune.forEach((n, i) => { pluck(c, 'triangle', N(n + 12), 0.22, 0.7, 4.1 + i * 0.22, (i % 2 ? 0.25 : -0.25)); if (i % 2 === 0) pluck(c, 'sawtooth', N(n - 12), 0.2, 0.3, 4.1 + i * 0.22, 0, 900) })
  for (let i = 0; i < 6; i++) { tone(c, 'sine', 100, 55, 0.18, 0.7, 4.1 + i * 0.44) }
  // 5. the last chord
  brass(0, 6.8, 1.0, 0.8); brass(12, 6.8, 1.0, 0.5)
  noise(c, 1.2, 8000, 3000, 0.6, 6.8, 'highpass')
  // 6. sparkle chimes all the way through
  for (let i = 0; i < 26; i++) bell(c, N(24 + [0, 4, 7, 12][i % 4] + (i % 8 > 4 ? 12 : 0)), 0.5, 0.14, 1.4 + i * 0.22, ((i * 37) % 10) / 6 - 0.8)
}
