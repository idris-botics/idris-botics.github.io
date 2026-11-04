// Live check for round 5 on the deployed site: home, two project pages after a hard refresh, Chaos (name split, idris, cat), phone, share page, media files.
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const U = process.argv[2] ?? 'https://idris-botics.github.io/'
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
let bad = 0
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) bad++ }
const SKIP = () => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } }
for (const f of ['cat.mp4', 'rick.mp4', 'cena.mp4', 'tell-me.mp4', 'soccer-run.mp4']) { const r = await fetch(U + 'media/vid/' + f, { method: 'HEAD' }); ok(r.ok, `${f} served (${r.headers.get('content-length')} bytes)`) }
for (const f of ['idris-whimsy-960.jpg', 'idris-whimsy-960.avif', 'cat-poster.webp']) { const r = await fetch(U + 'media/img/' + f, { method: 'HEAD' }); ok(r.ok, `${f} served`) }
const share = await (await fetch(U + 'work/robosoccer/')).text()
ok(/og:title" content="Robo Soccer/.test(share) && /og\/robosoccer\.png/.test(share), 'the Robo Soccer share page has its own title and image')

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(SKIP)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message))
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000)
ok((await p.locator('main h2').allInnerTexts()).join('|') === 'Work|About|Publications and awards|Path|Beyond the lab|Contact', 'home sections in order')
await p.screenshot({ path: 'tests/out/live-r5-home.png' })
for (const slug of ['vehicles', 'robosoccer']) {
  await p.goto(U + '#work/' + slug, { waitUntil: 'domcontentloaded' }); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  ok(await p.locator('.interest').count() === 1, `#work/${slug} after a hard refresh shows the project`)
  await p.screenshot({ path: `tests/out/live-r5-${slug}.png`, fullPage: false })
}
// the arena: Calm connects first try and arrows drive without navigating away
await p.goto(U + '#work/vehicles', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500)
await p.locator('.sim-poster').click(); await p.waitForTimeout(1500)
await p.getByRole('button', { name: /Connect Bluetooth/ }).dispatchEvent('click')
await p.getByText(/Connected to HC-05/).first().waitFor({ timeout: 4000 }); ok(true, 'Calm Bluetooth connects first try')
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500)
ok(/vehicles/.test(p.url()) && /right/.test(await p.locator('.sim [role=status]', { hasText: /Now:/ }).first().innerText()), 'ArrowRight drives the bot and does not leave the page')
await p.keyboard.up('ArrowRight')
await p.locator('.sim').screenshot({ path: 'tests/out/live-r5-arena.png' })
// Chaos
await p.goto(U, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
await enterChaos(p); await p.waitForTimeout(3000)
const moved = await p.evaluate(() => [...document.querySelectorAll('h1[data-name] .ltr')].filter((l) => l.style.transform && l.style.transform !== 'none').length)
ok(moved >= 6, `Chaos: the name's letters are tumbling (${moved})`)
await p.screenshot({ path: 'tests/out/live-r5-chaos-name.png' })
await p.waitForTimeout(5000)
await p.evaluate(() => { for (const ch of 'idris') document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }); await p.waitForTimeout(1800)
ok(await p.locator('.summon img').isVisible(), 'Chaos: typing idris shows the portrait')
await p.screenshot({ path: 'tests/out/live-r5-summon.png' }); await p.keyboard.press('Escape')
await p.evaluate(() => { for (const ch of 'cat') document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }); await p.waitForTimeout(1500)
ok(await p.locator('.clip video').isVisible() && (await p.locator('.clip video').evaluate((v) => v.duration)) > 58, 'Chaos: typing cat plays the full cat video')
await p.screenshot({ path: 'tests/out/live-r5-cat.png' })
ok(errs.length === 0, 'no page errors ' + errs.join('|'))
// phone
const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await m.addInitScript(SKIP)
const q = await m.newPage(); await q.goto(U, { waitUntil: 'domcontentloaded' }); await q.waitForTimeout(2500)
ok(!(await q.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'phone: no horizontal overflow')
await enterChaos(q); await q.waitForTimeout(3000)
ok(await q.locator('.scout-dock').isVisible(), 'phone: the pet robot is visible in Chaos')
await q.screenshot({ path: 'tests/out/live-r5-phone-chaos.png' })
await b.close()
process.exit(bad ? 1 : 0)
