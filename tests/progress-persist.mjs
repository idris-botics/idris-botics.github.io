// Chaos progress lasts. Checks: it survives a reload; it survives localStorage being cleared while IndexedDB remains; it comes back from the cookie when
// both are cleared; Mission Control's Save progress gives a short code that Restore progress accepts in a fresh browser; a code with a wrong checksum is
// rejected; the site still works when storage is blocked; and nothing is sent anywhere. Usage: node tests/progress-persist.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const base = process.argv[2] ?? 'http://localhost:5199/'
const url = base + (base.includes('?') ? '&' : '?') + 'e2e=1'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
const errors = []
const requests = []

const newCtx = async (opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], ...opts })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } }) // the rick roll is a random interruption with its own test
  return ctx
}
const go = async (ctx, existing) => {
  const p = existing ?? (await ctx.newPage())
  if (!existing) {
    p.on('pageerror', (e) => errors.push(e.message))
    p.on('request', (r) => requests.push({ url: r.url(), method: r.method(), post: r.postData() ?? '' }))
  }
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.waitForFunction(() => typeof window.__award === 'function')
  await p.waitForTimeout(600)
  return p
}
const award = async (p, ids) => { await p.evaluate((x) => { for (const a of x) window.__award(a) }, ids); await p.waitForTimeout(500) }
const count = async (p) => { const t = await p.locator('.ach').first().innerText({ timeout: 800 }).catch(() => ''); const m = /(\d+)\/(\d+)/.exec(t); return m ? Number(m[1]) : 0 }
const total = async (p) => { const t = await p.locator('.ach').first().innerText({ timeout: 800 }).catch(() => ''); const m = /(\d+)\/(\d+)/.exec(t); return m ? Number(m[2]) : 0 }
// what IndexedDB holds right now (only called after something was awarded, so the database exists)
const idbIds = (p) => p.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('idris-site', 1)
  r.onerror = () => res(null)
  r.onsuccess = () => {
    try { const g = r.result.transaction('kv').objectStore('kv').get('progress'); g.onsuccess = () => { res(Object.keys(g.result?.found ?? {}).sort()); r.result.close() } } catch { res(null) }
  }
}))
const idbHas = async (p, n) => { for (let i = 0; i < 40; i++) { if ((await idbIds(p))?.length === n) return true; await p.waitForTimeout(100) } return false }
const openMc = async (p) => { await p.locator('.hb-btn').click(); await p.locator('.hb-panel').waitFor() }
const sections = async (p) => ({ save: p.getByRole('button', { name: 'Save progress' }), restore: p.getByRole('button', { name: 'Restore progress' }) })

// 1. a reload keeps it ---------------------------------------------------------------------------------------------------------------------------
{
  const ctx = await newCtx()
  const p = await go(ctx)
  check((await count(p)) === 0, 'fresh visitor starts with no achievements')
  await award(p, ['moon', 'coffee'])
  check((await count(p)) === 2, 'two achievements found: 2/23')
  check(await idbHas(p, 2), 'IndexedDB holds both')
  const cookies = (await ctx.cookies()).filter((c) => c.name === 'chaos_progress')
  check(cookies.length === 1 && cookies[0].value === 'moon.coffee', `cookie holds only the ids (${cookies[0]?.value})`)
  check(cookies[0]?.secure === true && cookies[0]?.sameSite === 'Lax', 'cookie is Secure and SameSite=Lax')
  const secs = cookies[0] ? cookies[0].expires - Date.now() / 1000 : 0
  check(secs > 364 * 86400 && secs < 366 * 86400, `cookie lasts a year (${Math.round(secs / 86400)} days)`)
  check(JSON.parse(await p.evaluate(() => localStorage.getItem('chaos-progress'))).schema === 1, 'localStorage holds the record')
  await go(ctx, p) // reload
  check((await count(p)) === 2, 'after a reload and a new Chaos visit: still 2/23')
  check((await total(p)) === 23, 'the counter reads x / 23')
  await p.keyboard.type('cat', { delay: 40 }) // a new achievement on top of the saved ones
  await p.waitForTimeout(800)
  check((await count(p)) === 3, 'a new achievement adds to the saved ones: 3/23')
  await ctx.close()
}

// 2. localStorage cleared, IndexedDB remains -----------------------------------------------------------------------------------------------------
{
  const ctx = await newCtx()
  const p = await go(ctx)
  await award(p, ['moon', 'roll', 'omae'])
  await idbHas(p, 3)
  await p.evaluate(() => localStorage.clear())
  await ctx.clearCookies() // only IndexedDB is left
  await go(ctx, p)
  check((await count(p)) === 3, 'localStorage and cookie cleared, IndexedDB kept: still 3/23')
  check(await p.evaluate(() => !!localStorage.getItem('chaos-progress')), 'and localStorage is filled in again')
  await ctx.close()
}

// 3. localStorage and IndexedDB cleared, the cookie remains --------------------------------------------------------------------------------------
{
  const ctx = await newCtx()
  const p = await go(ctx)
  await award(p, ['moon', 'cv'])
  await idbHas(p, 2)
  await p.evaluate(() => { localStorage.clear(); return new Promise((res) => { const r = indexedDB.deleteDatabase('idris-site'); r.onsuccess = r.onerror = r.onblocked = () => res() }) })
  await go(ctx, p)
  check((await count(p)) === 2, 'localStorage and IndexedDB cleared, cookie kept: still 2/23')
  await ctx.close()
}

// 4. save code: shown in Mission Control, restored in a fresh browser ----------------------------------------------------------------------------
let code = ''
{
  const ctx = await newCtx()
  const p = await go(ctx)
  await award(p, ['moon', 'roll', 'cv'])
  await openMc(p)
  const quiet = await p.locator('.hb-progress').innerText()
  check(/Progress is saved on this device\. Use Save progress to carry it elsewhere\./.test(quiet), 'Mission Control has the quiet line about saving')
  const s = await sections(p)
  await s.save.click()
  code = await p.getByLabel('Your save code').inputValue()
  check(/^IDRIS(-[0-9A-Z]{1,4})+$/.test(code) && code.length < 20, `the save code is short (${code}, ${code.length} characters)`)
  await p.getByRole('button', { name: 'Copy', exact: true }).click()
  await p.waitForTimeout(300)
  check(/Copied/.test(await p.locator('.hb-progress [role=status]').innerText()), 'Copy says so')
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')
  check(clip === code, 'the clipboard holds the code')
  await ctx.close()
}
{
  const ctx = await newCtx() // a fresh browser: nothing saved
  const p = await go(ctx)
  check((await count(p)) === 0, 'fresh context has nothing')
  await openMc(p)
  const s = await sections(p)
  await s.restore.click()
  // spaces, lowercase and a missing prefix are all fine
  await p.getByLabel('Paste a save code').fill(' ' + code.replace('IDRIS-', '').toLowerCase().replace(/-/g, ' ') + ' ')
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(400)
  const msg = await p.locator('.hb-progress [role=status]').innerText()
  check(/Restored 3 achievements/.test(msg), `Restore says how many came back (${msg})`)
  check((await count(p)) === 3, 'the counter shows 3/23')
  await p.getByLabel('Paste a save code').fill(code)
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(300)
  check(/Nothing new/.test(await p.locator('.hb-progress [role=status]').innerText()), 'restoring the same code again adds nothing')
  check((await count(p)) === 3, 'and removes nothing')
  await award(p, ['coffee'])
  await p.getByLabel('Paste a save code').fill(code)
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(300)
  check((await count(p)) === 4, 'restoring never removes what is already found (4/23)')
  await go(ctx, p)
  check((await count(p)) === 4, 'and the restored progress lasts through a reload')
  await ctx.close()
}

// 5. a wrong checksum is rejected ----------------------------------------------------------------------------------------------------------------
{
  const ctx = await newCtx()
  const p = await go(ctx)
  await openMc(p)
  const s = await sections(p)
  await s.restore.click()
  const last = code.at(-1)
  const wrong = code.slice(0, -1) + (last === '2' ? '3' : '2')
  await p.getByLabel('Paste a save code').fill(wrong)
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(300)
  check(/does not look right/.test(await p.locator('.hb-progress [role=status]').innerText()), `a code with a wrong checksum is rejected (${wrong})`)
  check((await count(p)) === 0, 'and nothing is restored')
  await p.getByLabel('Paste a save code').fill('hello')
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(300)
  check(/does not look right/.test(await p.locator('.hb-progress [role=status]').innerText()), 'nonsense is rejected too')
  await ctx.close()
}

// 6. storage blocked: the site still works --------------------------------------------------------------------------------------------------------
{
  const ctx = await newCtx()
  await ctx.addInitScript(() => {
    const boom = () => { throw new DOMException('blocked', 'SecurityError') }
    for (const k of ['localStorage', 'indexedDB']) Object.defineProperty(window, k, { get: boom, configurable: true })
    Object.defineProperty(Document.prototype, 'cookie', { get: boom, set: boom, configurable: true })
  })
  const before = errors.length
  const p = await go(ctx)
  check((await count(p)) === 0, 'blocked storage: Chaos opens')
  await award(p, ['moon', 'roll'])
  check((await count(p)) === 2, 'blocked storage: achievements still count for the visit (2/23)')
  await openMc(p)
  const s = await sections(p)
  await s.save.click()
  const c = await p.getByLabel('Your save code').inputValue()
  check(/^IDRIS-/.test(c), `blocked storage: Save progress still gives a code (${c})`)
  await p.getByRole('button', { name: 'Restore progress' }).click()
  await p.getByLabel('Paste a save code').fill(code)
  await p.getByRole('button', { name: 'Restore', exact: true }).click()
  await p.waitForTimeout(300)
  check((await count(p)) >= 3, 'blocked storage: Restore still works for the visit')
  check(errors.length === before, `blocked storage: no page errors (${errors.slice(before).join(' | ')})`)
  await ctx.close()
}

// 7. nothing is sent anywhere --------------------------------------------------------------------------------------------------------------------
{
  const leaks = requests.filter((r) => r.method !== 'GET' || r.url.includes('chaos_progress') || r.url.includes(code) || /moon\.coffee|chaos_progress/.test(r.post))
  check(leaks.length === 0, `no request carries progress or the save code, and none is a POST (${requests.length} requests seen)`)
}

check(errors.length === 0, `no page errors in the whole run (${errors.join(' | ')})`)
await b.close()
process.exit(bad ? 1 : 0)
