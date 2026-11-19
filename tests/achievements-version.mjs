// A returning visitor with achievements saved by an older build keeps them (they are migrated, not thrown away); only ids that no longer exist are dropped,
// and the counter stays x/23. Usage: node tests/achievements-version.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
const count = async (p) => { const t = await p.locator('.ach').first().innerText({ timeout: 800 }).catch(() => ''); const m = /(\d+)\/(\d+)/.exec(t); return m ? [Number(m[1]), Number(m[2])] : [0, 0] }
for (const [name, seed, want] of [
  ['legacy localStorage list', () => localStorage.setItem('achievements', JSON.stringify(['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted'])), 10],
  ['older-version session state marked keep', () => sessionStorage.setItem('achievements-state', JSON.stringify({ v: 1, list: ['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted'], keep: true })), 10],
  ['unversioned session state', () => sessionStorage.setItem('achievements-state', JSON.stringify({ list: ['moon', 'roll', 'letters', 'sim', 'finale', 'rick', 'moonup', 'crash', 'moon3', 'evicted'], keep: false })), 10],
  ['a removed id is dropped, the rest stay', () => localStorage.setItem('achievements', JSON.stringify(['moon', 'a-secret-that-was-removed', 'cv'])), 2],
  ['current format with a removed and an unknown id', () => localStorage.setItem('chaos-progress', JSON.stringify({ schema: 1, updated: 1, found: { moon: { found: true, at: 1, help: 0 }, gone: { found: true, at: 2, help: 0 }, coffee: { found: true, at: 3, help: 3 } } })), 2],
]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(seed)
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForTimeout(2500)
  const [n, t] = await count(p)
  check(n === want && t === 23, `${name}: reads ${want}/23 (${n}/${t})`)
  await p.keyboard.type('cat', { delay: 40 })
  await p.waitForTimeout(800)
  const [n2] = await count(p)
  check(n2 === want + 1, `${name}: a new achievement makes it ${want + 1}/23 (${n2})`)
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
