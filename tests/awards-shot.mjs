import { chromium } from '@playwright/test'
const b = await chromium.launch()
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: '*{scroll-behavior:auto!important}.rv{opacity:1!important;transform:none!important}' })
  await p.locator('#awards').scrollIntoViewIfNeeded(); await p.waitForTimeout(600)
  await p.locator('#awards').screenshot({ path: `tests/out/awards-${w}.png` })
}
await b.close()
