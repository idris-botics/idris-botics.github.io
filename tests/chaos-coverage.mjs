// Chaos is still the portfolio: every project, the About text, the CV link and the email are present, visible and not covered. Usage: node tests/chaos-coverage.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const SLUGS = ['pid', 'swarm', 'gait', 'net', 'abb', 'cpu8', 'robodog', 'spider', 'vehicles', 'pipe', 'stepscribe', 'subtlebotic']
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
  for (const reduce of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduce })
    await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } }) // the rick roll is a random interruption of its own; it has its own test
    const p = await ctx.newPage()
    await p.goto(url, { waitUntil: 'networkidle' })
    await enterChaos(p)
    await p.waitForTimeout(2500)
    const tag = `${name}/${reduce}`
    // random set pieces (the jumpscare video) are modal on purpose, once per visit, and Escape closes them
    // Escape closes the video and the roll, but during the jumpscare's text phase it would restore order, so wait that out instead
    const clear = async () => { for (let k = 0; k < 12; k++) {
      if (await p.locator('.toast-x').count()) { await p.locator('.toast-x').first().click().catch(() => {}); await p.waitForTimeout(200) }
      if (await p.locator('.cena-video, .rick').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(400) } else if (await p.locator('.cena').count()) await p.waitForTimeout(500); else break } }
    const covered = async (sel) => (await coveredOnce(sel)) && (await clear(), await p.waitForTimeout(300), await coveredOnce(sel)) // a modal set piece may have just fired: Escape closes it, then look again
    const coveredOnce = async (sel) => {
      await clear()
      const el = p.locator(sel).first()
      await el.evaluate((e) => e.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })) // the page and the strip scroll smoothly by default; jump instead
      await p.waitForTimeout(sel.includes('contact') || sel.includes('download') ? 3300 : 500) // effects must clear within about 3 s
      await clear()
      return el.evaluate((e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 30)); return !(t && (e === t || e.contains(t))) })
    }
    for (const s of SLUGS) check(!(await covered(`#${s}`)), `${tag}: project ${s} is visible and clickable`)
    check(!(await covered('#about .about-p')), `${tag}: About text`)
    check(!(await covered('a[download]')), `${tag}: CV link`)
    check(!(await covered('#contact a[href^="mailto"]')), `${tag}: email`)
    // every project opens its window in Chaos too
    await clear()
    await p.locator('#pid').scrollIntoViewIfNeeded()
    await p.locator('#pid').click()
    await p.waitForSelector('.page', { timeout: 3000 }).catch(() => {})
    check(await p.locator('.page').isVisible(), `${tag}: project page opens in Chaos`)
    await clear()
    await p.locator('.back').first().click()
    await p.waitForTimeout(600)
    check((await p.locator('.page').count()) === 0 && (await p.evaluate(() => document.documentElement.dataset.mode)) === 'chaos', `${tag}: Back to work returns to the home page without leaving Chaos`)
  }
}
await b.close()
process.exit(bad ? 1 : 0)
