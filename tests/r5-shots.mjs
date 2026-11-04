import { chromium } from '@playwright/test'
const b = await chromium.launch()
for (const [slug, w] of [['robosoccer', 390], ['vehicles', 390], ['vehicles', 1440]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  await p.goto(`http://localhost:4173/#work/${slug}`, { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' })
  if (slug === 'vehicles') { await p.locator('.sim-poster').click(); await p.waitForTimeout(1500); await p.getByRole('button', { name: /Connect Bluetooth/ }).dispatchEvent('click'); await p.waitForTimeout(1500); await p.locator('.howto').scrollIntoViewIfNeeded() }
  await p.waitForTimeout(500)
  await p.screenshot({ path: `tests/out/r5-${slug}-${w}.png`, fullPage: slug === 'robosoccer' })
}
await b.close()
