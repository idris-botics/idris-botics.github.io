// Screenshots of the home page and project pages at several widths (for a quick look).
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
for (const [name, w, h] of [['360', 360, 780], ['390', 390, 844], ['430', 430, 900], ['1440', 1440, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  const errs = []
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.locator('#work').scrollIntoViewIfNeeded()
  await p.screenshot({ path: `tests/out/page-home-${name}.png` })
  for (const slug of ['pid', 'robodog', 'net', 'pipe', 'stepscribe']) {
    await p.goto(url + '#work/' + slug, { waitUntil: 'networkidle' })
    await p.waitForTimeout(300)
    await p.screenshot({ path: `tests/out/page-${slug}-${name}.png`, fullPage: true })
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    console.log(over ? 'FAIL overflow' : 'ok  ', name, slug)
  }
  if (errs.length) console.log('console errors', errs)
  await p.close()
}
await b.close()
