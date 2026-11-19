// Project videos: the Robo Soccer card opens a large muted player and stops when closed; gallery videos stop when scrolled away; leaving the tab pauses.
// node tests/videos.mjs [url]
import { chromium, devices } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext(opts)
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(url + '?e2e=1', { waitUntil: 'load' })
  await p.waitForTimeout(1500)
  // 1. the strip card
  const card = p.locator('.video-card')
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  const pic = await p.locator('.photo-strip .gallery img').first().boundingBox()
  check(!!box && !!pic && Math.abs(box.height - pic.height) < 8 && Math.abs(box.width - pic.width) < 8, `${name}: the video card is the same size as the pictures next to it (${Math.round(box?.width)}x${Math.round(box?.height)} vs ${Math.round(pic?.width)}x${Math.round(pic?.height)})`)
  check(await p.locator('.photo-strip video').count() === 0, `${name}: no tiny inline video player in the strip`)
  await card.click()
  await p.waitForSelector('.lightbox video.lb-video')
  await p.waitForTimeout(1200)
  const st = await p.evaluate(() => { const v = document.querySelector('.lb-video'); const r = v.getBoundingClientRect(); return { muted: v.muted, paused: v.paused, w: r.width, h: r.height, vw: innerWidth, scroll: getComputedStyle(document.documentElement).overflow } })
  check(st.muted, `${name}: it starts muted`)
  check(!st.paused, `${name}: it plays`)
  check(st.w > (name === 'desktop' ? 700 : st.vw * 0.85), `${name}: it opens large (${Math.round(st.w)}x${Math.round(st.h)})`)
  check(st.scroll === 'hidden', `${name}: the page behind does not scroll`)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  check(await p.locator('.lightbox').count() === 0, `${name}: Escape closes it`)
  check((await p.evaluate(() => document.activeElement?.className ?? '')).includes('video-card'), `${name}: focus goes back to the card`)
  check(await p.evaluate(() => getComputedStyle(document.documentElement).overflow) !== 'hidden', `${name}: the page scrolls again`)
  // the close button too
  await card.click(); await p.waitForSelector('.lb-video')
  await p.locator('.lb-close').click(); await p.waitForTimeout(200)
  check(await p.locator('.lightbox').count() === 0, `${name}: the X closes it`)

  // 2. gallery videos on a project page
  await p.goto(url + '?e2e=1#work/swarm'); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200)
  const vids = await p.locator('.gallery .dot.vid').count()
  check(vids >= 1, `${name}: the swarm page has a video in its gallery (${vids})`)
  await p.locator('.gallery .dot.vid').first().click()
  await p.waitForSelector('video.spot-video')
  await p.evaluate(() => { const v = document.querySelector('video.spot-video'); v.scrollIntoView({ block: 'center' }); return v.play() })
  await p.waitForTimeout(800)
  check(await p.evaluate(() => !document.querySelector('video.spot-video').paused), `${name}: the gallery video plays`)
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await p.waitForTimeout(700)
  check(await p.evaluate(() => document.querySelector('video.spot-video').paused), `${name}: it pauses when scrolled out of view`)
  await p.evaluate(() => { const v = document.querySelector('video.spot-video'); v.scrollIntoView({ block: 'center' }) })
  await p.waitForTimeout(500)
  check(await p.evaluate(() => document.querySelector('video.spot-video').paused), `${name}: it does not start again by itself`)
  // 2b. the enlarged view: open a picture, step on, and the videos are there and play
  await p.locator('.gallery .dot').first().click(); await p.waitForTimeout(300)
  await p.locator('.gallery .spot-open').click(); await p.waitForSelector('.lightbox')
  let seen = 0
  for (let k = 0; k < 8 && !seen; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); seen = await p.locator('.lightbox video.lb-video').count() }
  check(seen === 1, `${name}: stepping through the enlarged view reaches a video`)
  await p.waitForTimeout(1200)
  const lv = await p.evaluate(() => { const v = document.querySelector('.lightbox video.lb-video'); if (!v) return null; const r = v.getBoundingClientRect(); return { paused: v.paused, muted: v.muted, w: r.width, vw: innerWidth, t: v.currentTime } })
  check(!!lv && !lv.paused && lv.muted && lv.t > 0, `${name}: that video plays by itself, muted (at ${lv?.t?.toFixed(1)} s)`)
  check(!!lv && lv.w > lv.vw * (name === 'desktop' ? 0.4 : 0.8), `${name}: and it is shown large (${Math.round(lv?.w ?? 0)} px)`)
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500)
  check(await p.locator('.lightbox').count() === 1, `${name}: the arrow keys keep going`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  check(await p.locator('.lightbox').count() === 0, `${name}: Escape closes it`)
  check(errs.length === 0, `${name}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await ctx.close()
}
// leaving the tab pauses the large player
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage()
  await p.goto(url + '?e2e=1', { waitUntil: 'load' }); await p.waitForTimeout(1200)
  await p.locator('.video-card').scrollIntoViewIfNeeded(); await p.locator('.video-card').click(); await p.waitForSelector('.lb-video'); await p.waitForTimeout(800)
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await p.waitForTimeout(300)
  check(await p.evaluate(() => document.querySelector('.lb-video').paused), 'leaving the tab pauses the video')
  await ctx.close()
}
await b.close()
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0)
