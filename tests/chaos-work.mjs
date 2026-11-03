// Chaos is the portfolio (plan 5b): clues sit inside the project windows, fuel cells and work achievements come from opening and running projects,
// found secrets unlock behind-the-scenes cards, and finding everything ends on a contact card. Usage: node tests/chaos-work.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = (process.argv[2] ?? 'http://localhost:4173/') + '?e2e=1'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto(url, { waitUntil: 'networkidle' })

  // Calm shows no clues
  await p.locator('#pid').click({ position: { x: 24, y: 24 } })
  check((await p.locator('.pw-clue').count()) === 0 && (await p.locator('.iso-pid .fig-res[data-code="03"]').count()) === 0, `${name}: no hidden clues in Calm (the rig board shows ordinary values)`)
  await p.locator('.back').first().click(); await p.waitForTimeout(400)

  await enterChaos(p)
  await p.waitForTimeout(2200)
  const open = async (slug) => { await p.locator('#' + slug).scrollIntoViewIfNeeded(); await p.locator('#' + slug).click({ position: { x: 24, y: 24 } }); await p.waitForSelector('.page', { timeout: 3000 }); await p.waitForTimeout(500) }
  const close = async () => { await p.locator('.back').first().click(); await p.waitForTimeout(450) }

  await open('pid')
  check((await p.locator('.iso-pid .fig-res').count()) === 6 && (await p.locator('.iso-pid .fig-res').first().getAttribute('data-code')) === '03', `${name}: the PID rig board carries six resistors with the clue bands`)
  await p.locator('.view-tabs .chip').nth(1).click(); await p.locator('.page .play').click(); await p.waitForTimeout(500)
  await close()
  await open('swarm')
  check((await p.locator('.pw-clue .mc-led, .pw-clue .mc-morse-static').count()) === 1, `${name}: swarm window holds the Morse light`)
  await close()
  await open('gait')
  check(/0x72 0x6F 0x6C 0x6C/.test(await p.locator('.pw-clue-log').innerText()), `${name}: G.A.I.T. window holds the serial log`)
  await close()
  await open('cpu8')
  check(/111 109 097 101/.test(await p.locator('.pw-clue-out').innerText()), `${name}: 8-bit computer window holds the display`)
  await close()

  await open('robodog'); await close() // the third featured project

  // work achievements
  { const fab = p.locator('.corner-fab'); if (await fab.isVisible().catch(() => false) && !(await p.locator('html.corner-open').count())) await fab.click() } await p.locator('.ach .btn').click()
  const list = await p.locator('.ach ul').innerText()
  check(/featured project/i.test(list), `${name}: achievement for opening every featured project`)
  check(/PID twin/i.test(list), `${name}: achievement for running the PID twin`)

  // Mission Control (on a phone it opens from the corner menu)
  { const fab = p.locator('.corner-fab'); if (await fab.isVisible().catch(() => false) && !(await p.locator('html.corner-open').count())) await fab.click() } await p.locator('.mc-btn').click()

  // the four secrets, the card, the ending
  await p.evaluate(() => { for (const a of ['coffee', 'roll', 'omae', 'moon']) window.__award(a) })
  await p.waitForSelector('.end-card', { timeout: 5000 })
  const card = await p.locator('.end-card').innerText()
  check(/found everything/i.test(card) && (await p.locator('.end-card a[href^="mailto"]').count()) === 1 && (await p.locator('.end-card a[download]').count()) === 1 && (await p.locator('.end-card a[href*="linkedin"]').count()) === 1, `${name}: contact card with email, CV and LinkedIn`)
  check((await p.locator('.mc-bts').count()) === 4, `${name}: four behind-the-scenes cards`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check((await p.locator('.end-card').count()) === 0 && (await p.evaluate(() => document.documentElement.dataset.mode)) === 'chaos', `${name}: Escape closes the card and stays in Chaos`)
  await p.screenshot({ path: `tests/out/redesign/work-${name}.png` })
  check(errs.length === 0, `${name}: no page errors ${errs.join('|')}`)
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
