import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
for (const rm of ['no-preference', 'reduce']) for (const [w, h] of [[360, 780], [390, 844], [430, 900], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: rm, isMobile: w < 700, hasTouch: w < 700 })
  const p = await ctx.newPage()
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  await p.screenshot({ path: `tests/out/m-${rm === 'reduce' ? 'rm' : 'mo'}-${w}.png` })
  await ctx.close()
}
await b.close()
