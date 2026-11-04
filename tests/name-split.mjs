// Chaos: the name breaks into letters (physics) when Chaos starts, on a click, and on a phone tap; every letter stays in the window; the name is whole again at the end.
// Reduced motion keeps the name whole. Usage: node tests/name-split.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
const rects = (p) => p.$$eval('h1[data-name] .ltr', (ls) => ls.map((l) => { const r = l.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }))
const whole = (p) => p.evaluate(() => { const h = document.querySelector('h1[data-name]'); return !h.dataset.broken && [...h.querySelectorAll('.ltr')].every((l) => !l.style.transform || l.style.transform === 'none') })
const moved = (a, c) => a.filter((r, i) => Math.abs(r[0] - c[i][0]) + Math.abs(r[1] - c[i][1]) > 12).length

for (const [label, vp, touch] of [['desktop', { width: 1280, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  const home = await rects(p)
  check(home.length === 11, `${label}: the name is in 11 letters`)
  await enterChaos(p)
  // it breaks by itself shortly after Chaos starts
  let split = 0
  for (let i = 0; i < 28 && split < 8; i++) { await p.waitForTimeout(250); split = Math.max(split, moved(home, await rects(p))) }
  check(split >= 6, `${label}: the letters broke apart on entering Chaos (${split} moved)`)
  const inside = (await rects(p)).every(([x, y, w, h]) => x >= -2 && x + w <= vp.width + 2 && y + h <= vp.height + 80)
  check(inside, `${label}: every letter is inside the window`)
  check((await p.locator('h1[data-name]').getAttribute('aria-label')) === 'Idris Sadiq', `${label}: the heading keeps its aria-label`)
  // and it settles back on its own
  let isWhole = false
  for (let i = 0; i < 40 && !isWhole; i++) { await p.waitForTimeout(250); isWhole = await whole(p) }
  check(isWhole, `${label}: the name is whole again afterwards`)
  // a tap breaks it again, a second tap puts it back
  await p.waitForTimeout(500)
  await p.evaluate(() => scrollTo(0, 0))
  const settled = await rects(p)
  await p.locator('h1[data-name]').dispatchEvent('click')
  await p.waitForTimeout(900)
  check(moved(settled, await rects(p)) >= 6, `${label}: a tap breaks it again`)
  await p.locator('h1[data-name]').dispatchEvent('click')
  await p.waitForTimeout(1700)
  check(await whole(p) && moved(settled, await rects(p)) === 0, `${label}: a tap on the broken name puts it back`)
  await ctx.close()
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p); await p.waitForTimeout(1500)
  const still = await rects(p)
  await p.waitForTimeout(1500)
  check((await whole(p)) && moved(still, await rects(p)) === 0, 'reduced motion: the name stays whole')
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
