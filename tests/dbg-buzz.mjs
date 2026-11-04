import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1'); sessionStorage.setItem('caffeine', JSON.stringify({ until: Date.now() + 20000, runs: 1 })) } catch {} })
const p = await ctx.newPage(); await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' }); await enterChaos(p)
for (let i = 0; i < 12; i++) { await p.waitForTimeout(400); console.log(await p.evaluate(() => { const d = document.querySelector('.scout-dock'); const r = d.getBoundingClientRect(); return [d.className, d.style.translate, Math.round(r.left), Math.round(r.top)].join(' | ') })) }
await b.close()
