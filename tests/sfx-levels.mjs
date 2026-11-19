// Sound check (no ears needed): plays every Chaos effect and the crawl music through a real (headless) audio context, taps what reaches the output
// and reports peak and loudness. Fails on silence, on clipping, on a page error, and when the music is not louder than silence or does not stop.
// Needs the dev server: npx vite --port 5199   then   node tests/sfx-levels.mjs [http://localhost:5199]
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await (await b.newContext()).newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await p.addInitScript(() => {
  // tap everything that is connected to the speakers
  const stats = { peak: 0, sum: 0, n: 0 }
  window.__stats = stats
  window.__reset = () => { stats.peak = 0; stats.sum = 0; stats.n = 0 }
  const real = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (d, ...a) {
    if (d instanceof AudioDestinationNode && !d.context.__tap) {
      const tap = d.context.createScriptProcessor(2048, 2, 1)
      tap.onaudioprocess = (e) => { for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) { const x = e.inputBuffer.getChannelData(ch); for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > stats.peak) stats.peak = v; stats.sum += v * v; stats.n++ } } }
      d.context.__tap = tap
      real.call(tap, d)
      real.call(this, tap)
    }
    return real.call(this, d, ...a)
  }
})
await p.goto(url + '/?e2e=1')
await p.waitForTimeout(1500)
await p.evaluate(async () => { window.__m = await import('/src/chaos/sfx.ts') })
await p.mouse.click(10, 10)

let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
const long = { cena: 3.2, epic: 12, fanfare: 2, toll: 4, remix: 3.6, flush: 3.2, gurgle: 1.6, whistle: 1.6, boom: 2, rumble: 2, shake: 2, warp: 2, pour: 1.6, sting: 1.8, slurp: 1.2 }
const names = await p.evaluate(() => window.__m.SFX_NAMES)
for (const n of names) {
  await p.evaluate((x) => { window.__reset(); window.__m.sfx(x) }, n)
  await p.waitForTimeout((long[n] ?? 1.2) * 1000)
  const s = await p.evaluate(() => ({ peak: window.__stats.peak, rms: Math.sqrt(window.__stats.sum / Math.max(1, window.__stats.n)) }))
  console.log(`   ${n.padEnd(8)} peak ${s.peak.toFixed(2)}  rms ${s.rms.toFixed(3)}`)
  check(s.peak > 0.02, `${n}: it makes sound`)
  check(s.peak < 1, `${n}: it does not clip`)
}
// the long ones that are not in the recipe list
for (const [label, call, secs] of [['fanfare()', 'window.__m.fanfare()', 8], ['fall(down)', 'window.__m.fall(1)', 4.4], ['talk', "window.__m.talk('Remix is on and nobody has been here before')", 3.2], ['impact', 'window.__m.impact(0.8,false); window.__m.impact(1,true)', 1.2], ['anger', 'window.__m.angerBeep(10)', 0.8]]) {
  await p.evaluate((c) => { window.__reset(); new Function(c)() }, call)
  await p.waitForTimeout(secs * 1000)
  const s = await p.evaluate(() => window.__stats.peak)
  check(s > 0.02 && s < 1, `${label}: sound, no clipping (peak ${s.toFixed(2)})`)
}
// the music: 25 s, then stop and check it goes quiet
await p.evaluate(() => { window.__reset(); window.__stop = window.__m.startMusic() })
await p.waitForTimeout(25000)
const m = await p.evaluate(() => ({ peak: window.__stats.peak, rms: Math.sqrt(window.__stats.sum / window.__stats.n) }))
console.log(`   music    peak ${m.peak.toFixed(2)}  rms ${m.rms.toFixed(3)}`)
check(m.peak > 0.05 && m.peak < 1, 'music: audible and does not clip')
check(m.rms > 0.01, 'music: it has body (not just clicks)')
await p.evaluate(() => window.__stop())
await p.waitForTimeout(1200) // the fade-out
await p.evaluate(() => window.__reset())
await p.waitForTimeout(2500)
const q = await p.evaluate(() => window.__stats.peak)
check(q < 0.01, `music: it is silent after stop (peak ${q.toFixed(4)})`)
// mute while it plays
await p.evaluate(() => { window.__stop = window.__m.startMusic() })
await p.waitForTimeout(3000)
await p.evaluate(() => window.__m.setMuted(true))
await p.waitForTimeout(700) // the fade-out
await p.evaluate(() => window.__reset())
await p.waitForTimeout(1500)
const mm = await p.evaluate(() => window.__stats.peak)
check(mm < 0.02, `music: muting silences it (peak ${mm.toFixed(4)})`)
await p.evaluate(() => { window.__stop(); window.__m.setMuted(false) })
check(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '))
await b.close()
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0)
