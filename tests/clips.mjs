// The hero reel, the tile clips and the teaser peek: they play when they should, and stay still under reduced motion, Save-Data and slow connections.
// Usage: node tests/clips.mjs [url]
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }
const open = async (opts, init) => {
  const ctx = await b.newContext(opts)
  if (init) await ctx.addInitScript(init)
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  await p.goto(url, { waitUntil: 'networkidle' })
  return { ctx, p, errs }
}
const paused = (p, sel) => p.locator(sel).first().evaluate((v) => v.paused)

{ // desktop, normal
  const { ctx, p, errs } = await open({ viewport: { width: 1440, height: 900 } })
  await p.waitForTimeout(1200)
  check(!(await paused(p, '.hero-photo video')), 'desktop: the hero reel plays by itself')
  await p.locator('.reel-btn').first().click()
  check(await paused(p, '.hero-photo video'), 'desktop: its pause button pauses it')
  await p.locator('#swarm').scrollIntoViewIfNeeded(); await p.mouse.move(5, 5); await p.waitForTimeout(400)
  check(await paused(p, '#swarm .tile-clip'), 'desktop: the swarm tile clip is paused until hovered')
  await p.locator('#swarm').hover({ position: { x: 24, y: 24 } })
  await p.waitForTimeout(900)
  check(!(await paused(p, '#swarm .tile-clip')) && (await p.locator('#swarm .tile-clip').evaluate((v) => getComputedStyle(v).opacity)) === '1', 'desktop: hovering the swarm tile plays its clip')
  await p.mouse.move(5, 5); await p.waitForTimeout(300)
  check(await paused(p, '#swarm .tile-clip'), 'desktop: leaving it pauses the clip')
  check((await p.locator('#gait .tile-clip').count()) === 0, 'desktop: G.A.I.T. stays a still')
  await p.locator('.peek-fig').scrollIntoViewIfNeeded()
  await p.locator('.peek-fig').hover(); await p.waitForTimeout(900)
  check(!(await paused(p, '.peek-fig video')), 'desktop: hovering the teaser plays the 6 s peek')
  check(errs.length === 0, `desktop: no page errors ${errs.join('|')}`)
  await ctx.close()
}
{ // reduced motion
  const { ctx, p } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await p.waitForTimeout(800)
  check(await paused(p, '.hero-photo video'), 'reduced motion: the hero reel shows its poster')
  check((await p.locator('.tile-clip').count()) === 0 && (await p.locator('.peek-fig video').count()) === 0, 'reduced motion: no tile clips and no peek video')
  await ctx.close()
}
{ // Save-Data
  const { ctx, p } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true }, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }) })
  await p.waitForTimeout(800)
  check(await paused(p, '.hero-photo video'), 'Save-Data: the hero reel shows its poster and a play button')
  check((await p.locator('.tile-clip').count()) === 0 && (await p.locator('.peek-fig video').count()) === 0, 'Save-Data: no tile clips and no peek video')
  await p.locator('.reel-btn').first().click(); await p.waitForTimeout(800)
  check(!(await paused(p, '.hero-photo video')), 'Save-Data: the play button starts the reel')
  await ctx.close()
}
{ // slow connection
  const { ctx, p } = await open({ viewport: { width: 390, height: 844 } }, () => { Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g' }, configurable: true }) })
  await p.waitForTimeout(800)
  check(await paused(p, '.hero-photo video'), 'slow connection: the hero reel shows its poster')
  await ctx.close()
}
{ // phone: the tile in the middle of the screen plays
  const { ctx, p } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await p.locator('#swarm').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.waitForTimeout(1200)
  check(!(await paused(p, '#swarm .tile-clip')), 'phone: the swarm tile clip plays when the tile is mid-screen')
  await p.locator('#swarm').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.waitForTimeout(1200)
  await p.locator('.peek-fig .reel-btn').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.locator('.peek-fig .reel-btn').click(); await p.waitForTimeout(900)
  check(!(await paused(p, '.peek-fig video')), 'phone: tapping the teaser button plays the peek')
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
