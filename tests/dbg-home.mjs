import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(600)
await p.screenshot({ path: 'tests/out/dbg-home-top.png' })
await p.locator('#work').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 200); await p.waitForTimeout(800)
await p.screenshot({ path: 'tests/out/dbg-home-work.png' })
console.log(errs)
await b.close()
