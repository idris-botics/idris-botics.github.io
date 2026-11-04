import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch {} })
const p = await ctx.newPage(); await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await enterChaos(p)
for (let i = 0; i < 20; i++) { await p.waitForTimeout(300); console.log(i, await p.evaluate(() => { const h = document.querySelector('h1[data-name]'); const r = h.getBoundingClientRect(); return [h.dataset.broken, Math.round(r.top), Math.round(scrollY), h.querySelector('.ltr').style.transform.slice(0, 40)] })) }
await b.close()
