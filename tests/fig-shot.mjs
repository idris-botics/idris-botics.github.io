// Screenshots of the PID rig figure in the project window (Calm, then Chaos). Usage: node tests/fig-shot.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1') })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(String(e)))
await p.goto(url, { waitUntil: 'networkidle' })
await p.locator('#pid').click(); await p.waitForTimeout(1500)
await p.locator('.iso-pid').screenshot({ path: 'tests/out/redesign/fig-calm.png' })
const k = p.locator('.iso-pid [role=slider]')
await k.focus(); for (let i = 0; i < 25; i++) await p.keyboard.press('ArrowRight')
await p.waitForTimeout(2500)
console.log('errs', errs.join('|'), 'figs', await p.locator('.iso-pid').count(), 'readouts', await p.locator('.pid-readout').count()); console.log('readout', await p.locator('.pid-readout').innerText())
await p.locator('.iso-pid').screenshot({ path: 'tests/out/redesign/fig-kp30.png' })
await p.keyboard.press('Escape'); await p.waitForTimeout(500)
await enterChaos(p); await p.waitForTimeout(2000)
await p.locator('#pid').scrollIntoViewIfNeeded(); await p.locator('#pid').click(); await p.waitForTimeout(1200)
await p.locator('.iso-pid').screenshot({ path: 'tests/out/redesign/fig-chaos.png' })
console.log('errors', errs.length, errs.join('|'))
await b.close()
