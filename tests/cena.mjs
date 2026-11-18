// The jumpscare: flashing text first, then the embedded theme with a close button.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { Math.random = () => 0.01; sessionStorage.setItem('rolled', '1') })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2000)
for (let i = 0; i < 400; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(40); if (await p.locator('.cena').count()) break }
const shown = await p.locator('.cena').count()
await p.waitForTimeout(1300)
const name = await p.locator('.cena-b').count()
await p.screenshot({ path: 'tests/out/cena.png' })
await p.waitForSelector('.cena-video', { timeout: 5000 }).catch(() => {})
const video = await p.locator('.cena-video').count()
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
const escIgnored = (await p.locator('.cena-video').count()) === 1
const before = (await p.locator('.cena .vid-count').count()) === 0
await p.evaluate(() => { performance.now = ((o) => () => o() + 5000)(performance.now.bind(performance)) }); await p.waitForTimeout(700) // the countdown appears 4 s in, so the video gets its surprise first
const counting = before && (await p.locator('.cena .vid-count .vc-clock').count()) === 1
await p.evaluate(() => document.querySelector('.cena-x')?.click())
await p.waitForTimeout(200)
const closed = (await p.locator('.cena').count()) === 0
const ok = shown === 1 && name === 1 && video === 1 && escIgnored && counting && closed && !errs.length
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ shown, name, video, escIgnored, counting, closed }), errs.join('|'))
await b.close()
process.exit(ok ? 0 : 1)
