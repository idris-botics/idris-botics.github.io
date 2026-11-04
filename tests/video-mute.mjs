// The speaker button controls the Rick roll and Cena videos: sound is on by default, the button mutes them, and turns them back on.
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.addInitScript(() => { Math.random = () => 0.01 })
await p.goto(url, { waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(1500)
for (let i = 0; i < 90 && !(await p.locator('.rick-video, .cena-video').count()); i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(80) }
await p.waitForSelector('.rick-video, .cena-video', { timeout: 15000 })
const vid = p.locator('.rick-video, .cena-video').first()
let fails = 0
const check = (ok, m) => { console.log(ok ? 'ok  ' : 'FAIL', m); if (!ok) fails++ }
check(!(await vid.evaluate((v) => v.muted)), 'sound is on by default')
await p.locator('.sfx-btn').first().click(); await p.waitForTimeout(300)
check(await vid.evaluate((v) => v.muted), 'the speaker button mutes the video')
await p.locator('.sfx-btn').first().click(); await p.waitForTimeout(300)
check(!(await vid.evaluate((v) => v.muted)), 'and turns the sound back on')
await b.close(); process.exit(fails ? 1 : 0)
