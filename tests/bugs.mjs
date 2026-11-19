// The bugs gag: a few tiny bugs wander across the screen, the pet robot notices, a click squashes one, and they never block the page.
// node tests/bugs.mjs [url]
import { chromium, devices } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
const open = async (opts, reduced) => {
  const ctx = await b.newContext({ ...opts, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(url + '?e2e=1', { waitUntil: 'load' })
  await enterChaos(p); await p.waitForTimeout(2000)
  return { ctx, p, errs }
}
const pos = (p) => p.evaluate(() => [...document.querySelectorAll('.bug:not([hidden])')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), Math.round(r.width)] }))

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  const { ctx, p, errs } = await open(opts, false)
  if (name === 'desktop') { await p.keyboard.type('bugtest') } else await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:bugs'))) // the owner's hidden word, and the event
  await p.waitForSelector('.bugs .bug', { timeout: 3000 })
  const n = await p.locator('.bug').count()
  check(n >= 3 && n <= 5, `${name}: ${n} bugs`)
  await p.waitForTimeout(3500)
  const a = await pos(p); await p.waitForTimeout(1500); const c = await pos(p)
  check(a.length > 0 && a.some((q, i) => c[i] && (q[0] !== c[i][0] || q[1] !== c[i][1])), `${name}: they crawl`)
  check(a.every((q) => q[2] <= 34), `${name}: they are tiny (${a.map((q) => q[2]).join(', ')} px)`)
  check(await p.evaluate(() => getComputedStyle(document.querySelector('.bugs')).pointerEvents) === 'none', `${name}: the layer does not block the page`)
  check(await p.evaluate(() => getComputedStyle(document.querySelector('.bugs')).zIndex < 100), `${name}: they sit below the popups`)
  await p.waitForTimeout(1500)
  const said = await p.evaluate(() => document.body.innerText.includes('bugs have sneaked in'))
  check(said, `${name}: the robot says bugs have sneaked in`)
  // squash one with a real click (a bug may be under another button or have just moved: try a few)
  const before = (await pos(p)).length
  let squashed = false
  for (let k = 0; k < 4 && !squashed; k++) {
    const t = (await pos(p)).filter((q) => q[0] > 30 && q[0] < opts.viewport.width - 30 && q[1] > 30 && q[1] < opts.viewport.height - 30)[k % 2]
    if (!t) { await p.waitForTimeout(500); continue }
    if (name === 'desktop') await p.mouse.click(t[0], t[1]); else await p.touchscreen.tap(t[0], t[1])
    await p.waitForTimeout(300)
    squashed = (await pos(p)).length === before - 1
  }
  check(squashed, `${name}: a click squashes one`)
  check(await p.locator('.bug-splat').count() === 1, `${name}: it leaves a mark`)
  // the rest: squash all, the robot says it is fixed (after its first line, so give it time), and the layer goes
  await p.evaluate(() => document.querySelectorAll('.bug:not([hidden])').forEach((e) => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))))
  let fixed = false
  for (let k = 0; k < 30 && !fixed; k++) { await p.waitForTimeout(500); fixed = await p.evaluate(() => document.body.innerText.includes('All bugs fixed')) }
  check(fixed, `${name}: "All bugs fixed" when the last one goes`)
  check(await p.locator('.bugs').count() === 0, `${name}: the layer is removed`)
  // and it can come again later (the scheduler was released)
  await p.waitForTimeout(500)
  check(errs.length === 0, `${name}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  if (name === 'desktop') { await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:bugs'))); await p.waitForTimeout(6000); await p.screenshot({ path: 'tests/out/bugs.png' }) }
  await ctx.close()
}
// reduced motion: they sit still
{
  const { ctx, p } = await open({ viewport: { width: 1280, height: 800 } }, true)
  await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:bugs')))
  await p.waitForSelector('.bugs .bug'); await p.waitForTimeout(500)
  const a = await pos(p); await p.waitForTimeout(1500); const c = await pos(p)
  check(a.length > 0 && JSON.stringify(a) === JSON.stringify(c), 'reduced motion: they sit still')
  await ctx.close()
}
// once per session: they come by themselves after a while, one time only (the clock is fast-forwarded instead of waiting minutes)
for (const preset of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript((v) => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1'); if (v) sessionStorage.setItem('bugs', '1') } catch { /* ignore */ } }, preset)
  const p = await ctx.newPage()
  await p.clock.install()
  await p.goto(url + '?e2e=1', { waitUntil: 'load' })
  await p.clock.resume()
  await enterChaos(p); await p.waitForTimeout(500)
  let came = false
  for (let k = 0; k < 12 && !came; k++) { await p.clock.fastForward(20000); await p.waitForTimeout(150); came = (await p.locator('.bugs').count()) > 0 }
  check(came === !preset, preset ? 'once per session: not again when this session already had them' : 'once per session: they come by themselves after a while')
  if (!preset && came) {
    check(await p.evaluate(() => sessionStorage.getItem('bugs')) === '1', 'once per session: it is remembered')
    await p.evaluate(() => document.querySelectorAll('.bug').forEach((e) => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))))
    await p.waitForTimeout(500)
    let again = false
    for (let k = 0; k < 15 && !again; k++) { await p.clock.fastForward(20000); await p.waitForTimeout(100); again = (await p.locator('.bugs').count()) > 0 }
    check(!again, 'once per session: they do not come a second time')
  }
  await ctx.close()
}
await b.close()
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0)
