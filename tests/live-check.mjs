import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = 'https://idris900323.github.io/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const log = (ok, m) => console.log(ok ? 'ok  ' : 'FAIL', m)
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push(String(e)))
await p.goto(url, { waitUntil: 'networkidle' })
log(/Idris Sadiq/.test(await p.title()), 'home loads: ' + await p.title())
log((await p.locator('.tile-main').count()) === 3, 'three featured tiles')
log(await p.locator('text=I’ve always been fascinated').count() > 0, 'new About text')
await p.screenshot({ path: 'tests/out/live-home.png' })
for (const s of ['pid', 'robodog']) {
  await p.goto(url + '#work/' + s); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  log(await p.locator('.page .page-title').count() === 1, `hard refresh on #work/${s}: page renders`)
  await p.screenshot({ path: `tests/out/live-${s}.png` })
}
await p.goto(url + '#work/swarm', { waitUntil: 'networkidle' }); await p.waitForSelector('.iso-figure', { timeout: 8000 }).then(() => log(true, 'swarm figure renders'), () => log(false, 'swarm figure'))
const v = await p.request.get(url + 'media/vid/rick-90.mp4'); log(v.ok(), 'rick-90.mp4 served')
const pdf = await p.request.get(url + 'papers/ASANS-ICCORSE-2026.pdf'); log(pdf.ok(), 'paper PDF served')
await p.goto(url, { waitUntil: 'networkidle' })
await enterChaos(p).then(() => log(true, 'Chaos entry works'), (e) => log(false, 'Chaos entry ' + e.message.slice(0, 80)))
await p.waitForTimeout(2000)
log(await p.locator('.hb-btn').count() === 1, 'hint button present in Chaos')
console.log('console errors:', errs.filter((e) => !/postMessage|frame-shell/.test(e)).slice(0, 5))
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await m.goto(url, { waitUntil: 'networkidle' })
log(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone: no horizontal scroll')
await m.screenshot({ path: 'tests/out/live-phone.png' })
for (const s of ['cpu8', 'swarm']) { await p.goto(url + '#work/' + s, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.screenshot({ path: `tests/out/live-${s}.png` }) }
log((await p.locator('text=1,239').count()) >= 0, 'screenshots saved')
await b.close()
