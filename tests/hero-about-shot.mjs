import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' })
await p.screenshot({ path: 'tests/out/hero-now.png' })
await p.locator('#about').scrollIntoViewIfNeeded(); await p.waitForTimeout(500)
await p.locator('#about').screenshot({ path: 'tests/out/about-now.png' }); await b.close()
