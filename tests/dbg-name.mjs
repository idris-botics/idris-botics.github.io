import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch {} })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(2500)
console.log('h1 data-name count', await p.locator('h1[data-name]').count(), 'ltr', await p.locator('h1[data-name] .ltr').count())
await p.locator('h1[data-name]').click({ position: { x: 20, y: 20 } }); await p.waitForTimeout(900)
console.log(await p.evaluate(() => { const h = document.querySelector('h1[data-name]'); return [h?.dataset.prank, getComputedStyle(h.querySelector('.ltr')).transform] }))
await b.close()
