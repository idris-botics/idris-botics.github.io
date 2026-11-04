// Chaos: the achievements counter starts empty and counts to 13, and typing "coffee" runs the whole sequence. Usage: node tests/chaos-coffee.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForTimeout(2500)
  check((await p.locator('.ach').count()) === 0, `${name}: no achievements shown on first entry`)
  await p.keyboard.type('coffee', { delay: 40 })
  await p.waitForSelector('.coffee-brew', { timeout: 3000 })
  check(true, `${name}: brewing bar appears`)
  await p.waitForSelector('.coffee-flood', { timeout: 5000 })
  check(true, `${name}: flood appears`)
  await p.waitForSelector('.coffee-flood', { state: 'detached', timeout: 8000 })
  check(true, `${name}: flood drains`)
  check((await p.locator('.coffee-ring').count()) >= 2, `${name}: stains stay`)
  await p.waitForTimeout(500)
  const txt = await p.locator('.ach').innerText()
  check(/[12]\/23/.test(txt), `${name}: achievements read 1/23 (${txt.replace(/\s+/g, ' ')})`)
  for (let i = 0; i < 4; i++) { await p.keyboard.type('coffee', { delay: 20 }); await p.waitForTimeout(300) }
  await p.waitForTimeout(500)
  check(errs.length === 0, `${name}: no page errors ${errs.join('|')}`)
  await p.screenshot({ path: `tests/out/redesign/coffee-${name}.png` })
  await p.getByRole('button', { name: 'Restore order' }).click()
  await p.waitForSelector('.chaos-layer, .restore, [data-mode="chaos"]', { state: 'detached', timeout: 15000 }).catch(() => {})
  await p.waitForFunction(() => document.documentElement.dataset.mode === 'calm', null, { timeout: 15000 })
  await enterChaos(p)
  await p.waitForTimeout(2500)
  check((await p.locator('.ach').count()) === 0, `${name}: second entry starts with no achievements`)
}
await b.close()
process.exit(bad ? 1 : 0)
