import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
for (const [x, y, n] of [[50, 800, 'a'], [1400, 100, 'b'], [720, 450, 'c']]) {
  await p.mouse.move(x, y, { steps: 6 }); await p.waitForTimeout(1200)
  await p.locator('.l-moon').screenshot({ path: `tests/out/moon-${n}.png` })
}
await b.close()
