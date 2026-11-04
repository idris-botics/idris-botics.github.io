// On a phone, no visible text in Chaos may render under 14 px (and bubbles under 16 px), in the page and in every message, dialog and toast.
// Usage: node tests/chaos-text-size.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch()
let bad = 0
const small = (p, root = 'body', min = 14) => p.evaluate(([root, min]) => {
  const out = []
  const walker = document.createTreeWalker(document.querySelector(root), NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim()
    const el = n.parentElement
    if (!t || !el || el.closest('script, style, noscript, .sr-only, canvas, [aria-hidden="true"]')) continue
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || r.width === 0 || r.height === 0) continue
    if (parseFloat(cs.fontSize) < min - 0.01) out.push(`${parseFloat(cs.fontSize)}px "${t.slice(0, 40)}" in ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`)
  }
  return [...new Set(out)]
}, [root, min])
const check = (name, list) => { console.log(list.length ? 'FAIL' : 'PASS', name, list.length ? '\n   ' + list.slice(0, 40).join('\n   ') : ''); if (list.length) bad++ }

for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForTimeout(2500)
  check(`${vp.width}: the Chaos home page`, await small(p, 'body'))
  // the hint robot's panel
  await p.locator('.hb-btn').click(); await p.waitForTimeout(400)
  check(`${vp.width}: the hint panel`, await small(p, '.hb'))
  await p.locator('.hb-x').click().catch(() => {})
  // a speech bubble (the pet robot talks): force one by typing coffee
  const type = (w) => p.evaluate((w) => { for (const ch of w) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }, w)
  await type('coffee'); await p.waitForTimeout(6500)
  await type('coffee'); await p.waitForTimeout(800) // the second run gets a quip in the speech bubble
  check(`${vp.width}: the coffee brew and what the robot says`, await small(p, 'body'))
  const bubble = p.locator('.toast').first()
  if (await bubble.count()) {
    check(`${vp.width}: the speech bubble is at least 16 px`, await small(p, '.toast', 16))
    const r = await bubble.boundingBox()
    if (r && (r.x < 0 || r.x + r.width > vp.width || r.y < 0 || r.y + r.height > vp.height)) { console.log('FAIL the speech bubble is clipped by the viewport', JSON.stringify(r)); bad++ } else console.log('PASS the speech bubble stays inside the viewport')
  } else console.log('note: no speech bubble appeared')
  await p.waitForTimeout(6000)
  const ach = p.locator('.ach .btn')
  if (await ach.count() && await ach.isVisible()) { await ach.click(); await p.waitForTimeout(300); check(`${vp.width}: the achievements list`, await small(p, '.ach')) }
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
