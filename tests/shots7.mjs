// Round 7 screenshot set: node tests/shots7.mjs <url> <outDir>
// 7 widths x English/Japanese x 0/25/50/75/100 % scroll, Chaos top and end, two project pages, reduced motion.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = (process.argv[2] ?? 'http://localhost:4173/').replace(/\/$/, '/')
const out = process.argv[3] ?? 'docs/screens/round7/after'
mkdirSync(out, { recursive: true })
const b = await chromium.launch()
const heights = { 360: 740, 390: 844, 430: 932, 768: 1024, 1280: 800, 1440: 900, 1920: 1080 }
const jpg = (p, name) => p.screenshot({ path: join(out, name + '.jpg'), type: 'jpeg', quality: 72 })
const settle = async (p) => { await p.waitForSelector('.hero h1, main h1', { timeout: 20000 }).catch(() => {}); await p.waitForSelector('.scenery img.on', { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(1200) }
const at = async (p, f) => { const room = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(room * f)); await p.waitForTimeout(700) }

for (const [w, h] of Object.entries(heights)) {
  for (const lang of ['en', 'ja']) {
    const c = await b.newContext({ viewport: { width: +w, height: h }, locale: lang === 'ja' ? 'ja-JP' : 'en-US', deviceScaleFactor: 1 })
    const p = await c.newPage(); await p.goto(`${url}?lang=${lang}`); await settle(p)
    for (const f of [0, 0.25, 0.5, 0.75, 1]) { await at(p, f); await jpg(p, `${w}-${lang}-${String(Math.round(f * 100)).padStart(3, '0')}`) }
    await c.close()
  }
}
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: heights[w] }, locale: 'en-US' }); const p = await c.newPage()
  await p.goto(`${url}?lang=en`); await settle(p); await enterChaos(p); await p.waitForTimeout(6000)
  await jpg(p, `${w}-chaos-top`); await at(p, 0.5); await jpg(p, `${w}-chaos-mid`); await at(p, 1); await jpg(p, `${w}-chaos-end`)
  await c.close()
}
for (const slug of ['pid', 'cpu8']) for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: heights[w] }, locale: 'en-US' }); const p = await c.newPage()
  await p.goto(`${url}?lang=en#work/${slug}`); await settle(p); await jpg(p, `${w}-project-${slug}-top`); await at(p, 1); await jpg(p, `${w}-project-${slug}-end`)
  await c.close()
}
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: heights[w] }, locale: 'en-US', reducedMotion: 'reduce' }); const p = await c.newPage()
  await p.goto(`${url}?lang=en`); await settle(p)
  await jpg(p, `${w}-reduced-000`); await at(p, 0.5); await jpg(p, `${w}-reduced-050`); await at(p, 1); await jpg(p, `${w}-reduced-100`)
  await c.close()
}
await b.close(); console.log('done', out)
