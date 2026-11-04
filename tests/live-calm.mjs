import { chromium } from '@playwright/test'
const url = 'https://idris-botics.github.io/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(url, { waitUntil: 'networkidle' }); await p.mouse.move(1000, 600); await p.waitForTimeout(3500)
await p.screenshot({ path: 'tests/out/live-calm-home.png' })
await p.goto(url + '#work/swarm', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
await p.locator('.page-gallery .dot').nth(1).click(); await p.waitForTimeout(600)
await p.screenshot({ path: 'tests/out/live-calm-swarm.png' })
await b.close()
