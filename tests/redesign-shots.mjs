// Screenshots of Calm and Chaos at phone and desktop sizes, plus page height and word count. Usage: node tests/redesign-shots.mjs [url]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
mkdirSync('tests/out/redesign', { recursive: true })
const b = await chromium.launch()
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
  for (const reduce of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    const errs = []
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto(url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    // reveal everything for the full-page shot
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } scrollTo(0, 0) })
    await p.waitForTimeout(400)
    const tag = `${name}-${reduce === 'reduce' ? 'rm' : 'full'}`
    await p.screenshot({ path: `tests/out/redesign/calm-${tag}.png`, fullPage: true })
    const stats = await p.evaluate(() => ({ height: document.documentElement.scrollHeight, words: (document.querySelector('main').innerText.match(/\S+/g) ?? []).length }))
    console.log(tag, JSON.stringify(stats), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors')
    if (reduce === 'no-preference') {
      await p.locator('#pid').click()
      await p.waitForTimeout(500)
      await p.screenshot({ path: `tests/out/redesign/window-${name}.png` })
      await p.keyboard.press('Escape')
      await p.waitForTimeout(400)
      await enterChaos(p)
      await p.waitForTimeout(2500)
      await p.screenshot({ path: `tests/out/redesign/chaos-${name}.png` })
    }
    await ctx.close()
  }
}
await b.close()
