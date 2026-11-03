import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
for (const [n, w, h] of [['m', 390, 844], ['d', 1440, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  for (let y = 0; y < 9000; y += 500) { await p.mouse.wheel(0, 500); await p.waitForTimeout(80) }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500)
  await p.screenshot({ path: `tests/out/full-${n}.png`, fullPage: true })
  await p.close()
}
await b.close()
