import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' })
await p.goto('https://dribbble.com/search/robotics-ui-design', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(3000)
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(700) }
const shots = await p.evaluate(() => [...document.querySelectorAll('li.shot-thumbnail, li[data-thumbnail-id]')].slice(0, 36).map((li) => ({ t: li.querySelector('img')?.alt?.slice(0, 70), src: li.querySelector('img')?.src })))
console.log(shots.length)
let n = 0
for (let y = 0; y < 4; y++) {
  await p.evaluate((yy) => scrollTo(0, yy), y * 1500)
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `tests/out/dr-grid-${y}.png` })
}
await b.close()
