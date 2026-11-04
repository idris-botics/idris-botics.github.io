// A returning visitor with achievements saved by an older build must start at 0/23, not at a stale count. Usage: node tests/achievements-version.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const OLD = ['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted']
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
for (const [name, seed] of [
  ['legacy localStorage list', () => localStorage.setItem('achievements', JSON.stringify(OLD))],
  ['older-version session state marked keep', () => sessionStorage.setItem('achievements-state', JSON.stringify({ v: 1, list: OLD, keep: true }))],
  ['unversioned session state marked keep', () => sessionStorage.setItem('achievements-state', JSON.stringify({ list: OLD, keep: true }))],
]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(seed)
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForTimeout(2500)
  check((await p.locator('.ach').count()) === 0, `${name}: starts with no achievements (0/23)`)
  await p.keyboard.type('coffee', { delay: 40 })
  await p.waitForTimeout(800)
  const txt = await p.locator('.ach').innerText()
  check(/[12]\/23/.test(txt), `${name}: first achievement reads 1/23 (${txt.replace(/\s+/g, ' ')})`)
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
