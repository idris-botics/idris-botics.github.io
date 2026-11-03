import { chromium } from '@playwright/test'
const slug = process.argv[2] && !process.argv[2].startsWith('http') ? process.argv[2] : 'swarm'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 })
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:4173/#work/' + slug, { waitUntil: 'networkidle' })
await p.waitForSelector('.iso-figure', { timeout: 8000 })
await p.waitForTimeout(1500)
await p.locator('.iso-wrap').screenshot({ path: `tests/out/anat-${slug}.png` })
await p.waitForTimeout(2500)
await p.locator('.iso-wrap').screenshot({ path: `tests/out/anat-${slug}-2.png` })
console.log(errs)
await b.close()
