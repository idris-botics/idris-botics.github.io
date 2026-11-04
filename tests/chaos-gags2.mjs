// Chaos extras: omae overlay, text shatter, dodging button, toast survives scrolling and replays when scrolling up.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { Math.random = () => 0.01 })
await p.goto(url, { waitUntil: 'networkidle' })
let fails = 0
const check = (name, ok) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name) }
await enterChaos(p)
await p.waitForTimeout(2200)

// omae
await p.keyboard.type('omae')
await p.waitForSelector('.clip video', { timeout: 3000 }).catch(() => {})
check('omae plays its video, looping, with only a mute button', (await p.locator('.clip video').evaluate((v) => v.loop && !v.controls).catch(() => false)) && (await p.locator('.clip-mute').count()) === 1)
check('and the hint button is hidden while it plays', !(await p.locator('.hb-btn').isVisible()))
await p.screenshot({ path: 'tests/out/omae.png' })
check('the omae video has no close button for the first 20 s', (await p.locator('.clip-x').count()) === 0)
await p.evaluate(() => { performance.now = ((o) => () => o() + 21000)(performance.now.bind(performance)) })
await p.keyboard.press('Escape'); await p.waitForTimeout(400)
check('omae gone', (await p.locator('.clip').count()) === 0)

// shatter
const para = p.locator('.about-p').first()
await para.scrollIntoViewIfNeeded()
await para.click()
await p.waitForTimeout(300)
check('text shatters', (await p.locator('.shard').count()) > 3)
await p.waitForTimeout(3600)
check('text re-forms', (await p.locator('.shard').count()) === 0)

// dodge
for (let i = 0; i < 3 && (await p.locator('.rick, .cena').count()); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(500) } // the rick roll or Cena may have fired while scrolling: Esc closes them
await p.waitForSelector('.omae', { state: 'detached', timeout: 10000 }).catch(() => {})
const chip = p.locator('.hero-actions a.btn').first()
await p.mouse.move(5, 5); await p.waitForTimeout(300)
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(600)
const before = await chip.boundingBox()
await chip.hover({ force: true })
await p.waitForTimeout(450)
const after = await chip.boundingBox()
check('chip dodges', Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20)

// toast persists over scroll and replays when scrolling up
await p.evaluate(() => scrollTo(0, 3000))
await p.keyboard.press('r'); await p.keyboard.type('oll')
await p.waitForSelector('.toast', { timeout: 3000 }).catch(() => {})
await p.mouse.wheel(0, 500); await p.waitForTimeout(300)
check('toast survives scrolling', (await p.locator('.toast').count()) === 1)

check('no page errors', !errs.length)
if (errs.length) console.log(errs.join('\n'))
await b.close()
process.exit(fails ? 1 : 0)
