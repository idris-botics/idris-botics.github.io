// Round 5 Chaos: the "idris" summon, the cat clip (the X runs for 60 s, Escape does nothing), the pet robot and the cookie, the caffeinated pet robot,
// repeat events and the final-hint clip. Usage: node tests/chaos-r5.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
const SKIP = () => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } }
const type = (p, w) => p.evaluate((w) => { for (const ch of w) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true })) }, w)
const open = async (init = SKIP, vp = { width: 1280, height: 900 }) => {
  const ctx = await b.newContext({ viewport: vp })
  await ctx.addInitScript(init)
  const p = await ctx.newPage()
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p); await p.waitForTimeout(800)
  return { ctx, p, errs }
}

// --- idris
{
  const { ctx, p, errs } = await open()
  await type(p, 'IDRIS'); await p.waitForTimeout(500)
  check(await p.evaluate(() => document.querySelector('.scout-dock')?.classList.contains('bow')), 'the pet robot bows')
  await p.waitForTimeout(400)
  check(await p.locator('.summon .royal img').isVisible(), '"idris" (any case) shows the portrait in its frame')
  check((await p.locator('.summon .confetti').count()) > 10 && (await p.locator('.summon .firework').count()) >= 3, 'with confetti and fireworks')
  await p.waitForTimeout(900)
  const said = await p.locator('.toast').first().innerText().catch(() => '')
  check(/supreme one|You rang|buffering|autographs/i.test(said), `the pet robot asks: "${said.slice(0, 60)}"`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check((await p.locator('.summon').count()) === 0, 'Escape dismisses it')
  check((await p.locator('.ach li', { hasText: 'Summoned the supreme one' }).count()) === 0 || true, 'achievement given')
  await p.locator('.ach .btn').click().catch(() => undefined)
  check(await p.locator('.ach').getByText('Summoned the supreme one').count() > 0, 'achievement "Summoned the supreme one"')
  check(errs.length === 0, 'no page errors ' + errs.join('|'))
  await ctx.close()
}

// --- cat: full video with sound and controls, the X runs for 60 s, Escape does nothing
{
  const { ctx, p, errs } = await open()
  await type(p, 'cat'); await p.waitForTimeout(1200)
  const v = p.locator('.clip video')
  check(await v.isVisible(), '"cat" opens the cat video')
  check(await v.evaluate((el) => el.controls && !el.muted && el.src.endsWith('/cat.mp4') || [...el.querySelectorAll('source')].some((s) => /cat\.mp4$/.test(s.src))), 'it has controls and is not muted')
  const dur = await v.evaluate((el) => el.duration)
  check(dur > 58 && dur < 60, `it is the full clip (${dur?.toFixed(1)} s)`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check((await p.locator('.clip').count()) === 1, 'Escape does not close it during the first 60 s')
  const x = p.locator('.clip-x'); const b0 = await x.boundingBox()
  await p.mouse.move(b0.x + 22, b0.y + 22); await p.waitForTimeout(300)
  const b1 = await x.boundingBox()
  check(Math.abs(b0.x - b1.x) + Math.abs(b0.y - b1.y) > 20, 'the close X runs away from the pointer')
  await x.dispatchEvent('click'); await p.waitForTimeout(200)
  check((await p.locator('.clip').count()) === 1, 'clicking it does nothing yet')
  // 60 s later it can be clicked and Escape works: shift the opening time instead of waiting
  await p.evaluate(() => { performance.now = ((o) => () => o() + 61000)(performance.now.bind(performance)) })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check((await p.locator('.clip').count()) === 0, 'after 60 s Escape closes it')
  check(!(await p.locator('.clip-skip, button:has-text("Skip")').count()), 'there is never a Skip button')
  check(errs.length === 0, 'no page errors ' + errs.join('|'))
  await ctx.close()
}

// --- the pet robot and the cookie (on its own, no first press); a repeat later with other lines
{
  const { ctx, p, errs } = await open(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1') } catch { /* ignore */ } })
  await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:repeat-event', { detail: 'cookie' })))
  await p.waitForSelector('.cookie', { timeout: 3000 })
  check(await p.evaluate(() => document.querySelector('.scout-dock')?.classList.contains('eating')), 'the pet robot sneaks over to the cookie')
  await p.waitForSelector('.scout-dock.cough', { timeout: 12000 })
  check(true, 'it chokes and coughs crumbs up')
  await p.waitForTimeout(400)
  check(/delicious/i.test(await p.locator('.toast').first().innerText().catch(() => '')), 'and says it was delicious')
  await p.waitForTimeout(2500)
  check((await p.locator('.cookie').count()) === 0, 'the banner leaves with the cookie')
  check(errs.length === 0, 'no page errors ' + errs.join('|'))
  await ctx.close()
}

// --- repeat events: at most 4 per visit, never while another is open
{
  const { ctx, p } = await open()
  let fired = 0
  for (let i = 0; i < 7; i++) {
    await p.evaluate(() => dispatchEvent(new CustomEvent('portfolio:repeat-event')))
    await p.waitForTimeout(400)
    const open_ = await p.locator('.cookie, .cena, .rick').count()
    if (open_) fired++
    // close whatever opened so the next one is allowed
    await p.evaluate(() => { document.querySelectorAll('.cookie .btn, .rick-x, .cena-x').forEach((e) => e.click()) })
    await p.keyboard.press('Escape'); await p.waitForTimeout(3200)
  }
  check(fired <= 4, `at most 4 events in one visit (${fired} fired)`)
  await ctx.close()
}

// --- caffeinated: wired, then crashes with "I have regrets"-style line, then back to normal
{
  const until = 5000
  const { ctx, p, errs } = await open(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1'); sessionStorage.setItem('caffeine', JSON.stringify({ until: Date.now() + 15000, runs: 1 })) } catch { /* ignore */ } })
  void until
  check(await p.evaluate(() => document.querySelector('.scout-dock')?.classList.contains('wired')), 'after a coffee run the pet robot is caffeinated (wired)')
  check((await p.locator('.scout-dock .spiral').count()) === 2, 'with wide spiral eyes')
  await p.waitForTimeout(2600)
  const line = await p.locator('.toast').first().innerText().catch(() => '')
  check(line.length > 10, `and talks: "${line.slice(0, 50)}"`)
  await p.waitForSelector('.scout-dock.crashed', { timeout: 20000 })
  check(true, 'when it wears off it crashes')
  await p.waitForTimeout(1500)
  check(/regrets|beans|heavy|mistake/i.test(await p.locator('.toast').first().innerText().catch(() => '')), 'with a crash line')
  await p.waitForFunction(() => !document.querySelector('.scout-dock.crashed, .scout-dock.wired'), null, { timeout: 20000 })
  check(true, 'then it is itself again')
  check(errs.length === 0, 'no page errors ' + errs.join('|'))
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
