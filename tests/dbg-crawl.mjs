import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await p.getByRole('button', { name: 'Enter Chaos' }).click(); await p.waitForTimeout(500); await p.screenshot({ path: 'tests/out/crawl-notice.png' })
await p.getByRole('button', { name: 'Proceed', exact: true }).click(); await p.waitForTimeout(2500); await p.screenshot({ path: 'tests/out/crawl-crawl.png' }); await b.close()
