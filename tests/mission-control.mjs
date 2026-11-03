// Mission Control: slots start locked, wrong words get a warm or cold reply, the command box fires a secret, easy mode opens the hints. Usage: node tests/mission-control.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForTimeout(2200)
  { const fab = p.locator('.corner-fab'); if (await fab.isVisible().catch(() => false)) await fab.click() } await p.locator('.mc-btn').click()
  check((await p.locator('.mc-list li').count()) === 4, `${name}: four locked slots`)
  check((await p.locator('.mc-list li strong', { hasText: '???' }).count()) === 4, `${name}: names are hidden`)
  await p.locator('.mc-cmd input').fill('coffe')
  await p.locator('.mc-cmd button').click()
  check(/coffe/.test(await p.locator('.mc-msg').innerText()), `${name}: a near miss gets a reply`)
  await p.locator('.mc-set summary').click()
  await p.locator('.mc-set input').check()
  await p.waitForSelector('.mc-clue', { timeout: 14000 })
  check(true, `${name}: easy mode opens a transmission after about 10 s`)
  await p.locator('.mc-cmd input').fill('coffee')
  await p.locator('.mc-cmd button').click()
  await p.waitForSelector('.coffee-brew', { timeout: 3000 })
  check(true, `${name}: the command box runs coffee`)
  await p.waitForTimeout(5500)
  check((await p.locator('.mc-list li.done').count()) === 1, `${name}: the slot shows as found`)
  check(errs.length === 0, `${name}: no page errors ${errs.join('|')}`)
  await p.screenshot({ path: `tests/out/redesign/mission-${name}.png` })
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
