// Remix: after every achievement the hidden words stop doing what they say. It is remembered, and it has a switch.
// node --experimental-strip-types tests/remix.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
import { ACH_NAMES } from '../src/chaos/secretsRegistry.ts'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
const open = async (remixValue) => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript((v) => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1'); if (v !== null) localStorage.setItem('chaos-remix', v) } catch { /* ignore */ } }, remixValue)
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(url + '?e2e=1', { waitUntil: 'networkidle' })
  await enterChaos(p); await p.waitForTimeout(2500)
  return { ctx, p, errs }
}
const catClip = (p) => p.evaluate(() => { const v = document.querySelector('.clip video'); return !!v && /cat-poster/.test(v.getAttribute('poster') ?? '') })

// without remix: "cat" opens the cat clip
{
  const { ctx, p } = await open(null)
  await p.keyboard.type('cat'); await p.waitForTimeout(1500)
  check(await catClip(p), 'normally the word cat opens the cat clip')
  await ctx.close()
}
// remix on: it does not, and the game says so
{
  const { ctx, p, errs } = await open('1')
  await p.keyboard.type('cat'); await p.waitForTimeout(1800)
  check(!(await catClip(p)), 'with remix on, the word cat no longer opens the cat clip')
  check(/remix/i.test(await p.locator('.toast').first().innerText().catch(() => '')), 'and the pet robot says remix is on')
  await p.locator('.ach button').first().click().catch(() => {})
  check((await p.locator('.remix-tag').count()) === 1, 'the achievements button is tagged REMIX')
  check(errs.length === 0, 'no page errors ' + errs.join('|'))
  await ctx.close()
}
// remix switched off in the panel: the words are honest again
{
  const { ctx, p } = await open('1')
  await p.evaluate(() => window.__award('coffee'))
  await p.locator('.ach button').first().click()
  await p.locator('.remix-btn').click(); await p.waitForTimeout(300)
  check((await p.evaluate(() => localStorage.getItem('chaos-remix'))) === '0', 'the switch turns remix off and remembers it')
  await p.keyboard.type('cat'); await p.waitForTimeout(1500)
  check(await catClip(p), 'with remix off the word cat opens the cat clip again')
  await ctx.close()
}
// the owner's test word: remixtest plays the flush without unlocking anything
{
  const { ctx, p } = await open(null)
  await p.keyboard.type('remixtest')
  await p.waitForSelector('.remix-banner', { timeout: 9000 }).catch(() => {})
  check((await p.locator('.remix-banner').count()) === 1, 'typing remixtest plays the flush and the REMIX IS ON banner')
  check((await p.evaluate(() => localStorage.getItem('chaos-remix'))) === null, 'and unlocks nothing')
  await ctx.close()
}
// finding every achievement unlocks it
{
  const { ctx, p } = await open(null)
  check((await p.evaluate(() => localStorage.getItem('chaos-remix'))) === null, 'remix starts locked')
  await p.evaluate((ids) => { for (const a of ids) window.__award(a) }, Object.keys(ACH_NAMES))
  await p.waitForTimeout(600)
  check((await p.evaluate(() => localStorage.getItem('chaos-remix'))) === '1', 'every achievement found: remix is unlocked and on')
  await p.waitForSelector('.remix-banner', { timeout: 8000 }).catch(() => {})
  check((await p.locator('.remix-banner').count()) === 1, 'the page is flushed and a huge REMIX IS ON comes up')
  await p.waitForSelector('.remix-flush', { state: 'detached', timeout: 8000 }).catch(() => {})
  await p.waitForTimeout(500)
  check(/godspeed|ご武運/i.test(await p.locator('.toast').first().innerText().catch(() => '')), 'then the pet robot says nobody has made it this far, godspeed')
  await ctx.close()
}
await b.close(); process.exit(bad ? 1 : 0)
