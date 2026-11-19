// Chaos interface details: the achievements list closes when you press anywhere else, the button stays where it is when it opens, and the list is capped in height.
// node tests/chaos-ui.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
const ids = ['moon', 'roll', 'omae', 'coffee', 'letters', 'sim', 'finale', 'rick', 'moonup', 'moon3', 'crash', 'evicted', 'cena', 'featured', 'twin', 'about', 'cv', 'legend', 'idris', 'cat']
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
const p = await ctx.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url + '?e2e=1', { waitUntil: 'load' }); await enterChaos(p); await p.waitForTimeout(1500)
await p.evaluate((x) => { for (const a of x) window.__award(a) }, ids); await p.waitForTimeout(500)
const btn = p.locator('.ach > .btn').first()
const top0 = (await btn.boundingBox()).y
await btn.click(); await p.waitForTimeout(300)
check(await p.locator('.ach ul').count() === 1, 'the list opens')
check(Math.abs((await btn.boundingBox()).y - top0) < 2, 'the button stays where it was')
const h = await p.evaluate(() => document.querySelector('.ach ul').getBoundingClientRect().height)
check(h <= 800 * 0.46 + 2, `the list is capped (${Math.round(h)} px of 800)`)
await p.locator('.ach ul').click({ position: { x: 20, y: 10 } }); await p.waitForTimeout(200)
check(await p.locator('.ach ul').count() === 1, 'pressing inside the list does not close it')
await p.mouse.click(900, 300); await p.waitForTimeout(300)
check(await p.locator('.ach ul').count() === 0, 'pressing anywhere else closes it')
await btn.click(); await p.waitForTimeout(200)
check(await p.locator('.ach ul').count() === 1, 'the button opens it again')
await btn.click(); await p.waitForTimeout(200)
check(await p.locator('.ach ul').count() === 0, 'and the button closes it')
check(errs.length === 0, 'no page errors ' + errs.join('|'))
await b.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0)
