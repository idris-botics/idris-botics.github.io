import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch {} })
const p = await ctx.newPage(); await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' }); await enterChaos(p); await p.waitForTimeout(800)
await p.evaluate(() => { for (const ch of 'idris') document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }); await p.waitForTimeout(2200)
await p.screenshot({ path: 'tests/out/summon-big.png' }); await b.close()
