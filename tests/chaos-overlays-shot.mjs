// Screenshots of every Chaos message box at phone widths, to check size and legibility by eye. Output: tests/out/ov-<name>-<width>.png
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
for (const w of [360, 390, 430]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await enterChaos(p); await p.waitForTimeout(2600)
  const shot = (n) => p.screenshot({ path: `tests/out/ov-${n}-${w}.png` })
  await p.locator('.hb-btn').click(); await p.waitForTimeout(500); await shot('hint'); await p.locator('.hb-x').click()
  await p.evaluate(() => { for (const ch of 'omae') document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }); await p.waitForTimeout(1500); await shot('omae'); await p.waitForTimeout(3500)
  await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:repeat-event', { detail: 'cookie' }))); await p.waitForTimeout(2500); await shot('cookie'); await p.waitForTimeout(9000)
  await p.evaluate(() => { for (const ch of 'idris') document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }); await p.waitForTimeout(1800); await shot('summon'); await p.keyboard.press('Escape')
  await p.evaluate(() => { document.querySelector('.moon')?.click() }); await p.waitForTimeout(6500); await shot('moon-pile')
  await ctx.close()
}
await b.close()
