// The static hero in index.html (src/heroShell.html): it paints without any script, it has the same boxes as the app's hero at every width,
// the app takes over without a layout shift, and readers who would get something else (Japanese, a project page) never see it.
// Needs a production build (npm run build, then npm run preview): the static hero is only written into the built page.
import { chromium } from '@playwright/test'

const U = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const ok = (cond, msg) => { console.log(cond ? 'ok  ' : 'FAIL', msg); if (!cond) bad++ }
const boxes = (p) => p.evaluate(() => {
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }
  return { header: q('.site-header'), card: q('.hero-text'), h1: q('.hero h1'), actions: q('.hero-actions'), photo: q('.hero-photo img, .hero-photo video'), scene: q('.scene') }
})

for (const [w, h] of [[360, 740], [390, 844], [430, 932], [768, 1024], [1280, 800], [1440, 900], [1920, 1080]]) {
  const c1 = await b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false })
  const p1 = await c1.newPage(); await p1.goto(U); await p1.waitForSelector('.hero h1')
  const a = await boxes(p1)
  const hasText = await p1.evaluate(() => document.querySelector('.hero h1')?.getAttribute('aria-label') === 'Idris Sadiq' && !!document.querySelector('.hero-photo img[src]') && !!document.querySelector('.scene svg'))
  await c1.close()
  const c2 = await b.newContext({ viewport: { width: w, height: h } })
  const p2 = await c2.newPage(); const errs = []
  p2.on('pageerror', (e) => errs.push(e.message)); p2.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await p2.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true }) })
  await p2.goto(U); await p2.waitForSelector('.hero-photo video'); await p2.waitForTimeout(1500)
  const d = await boxes(p2)
  const cls = await p2.evaluate(() => window.__cls)
  const diffs = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k]))
  ok(hasText, `${w}: the page without script already shows the name, the picture and the scene`)
  ok(diffs.length === 0, `${w}: the app's hero has the same boxes as the static one${diffs.length ? ' (' + diffs.map((k) => `${k} ${JSON.stringify(a[k])} -> ${JSON.stringify(d[k])}`).join('; ') + ')' : ''}`)
  ok(cls < 0.02, `${w}: layout shift while the app takes over is ${cls.toFixed(3)} (< 0.02)`)
  ok(errs.length === 0, `${w}: no console errors (CSP) ${errs.slice(0, 2).join(' | ')}`)
  await c2.close()
}

// readers who would get something else never see the static English hero
const seen = async (ctxOpts, path, setup) => {
  const c = await b.newContext(ctxOpts); if (setup) await c.addInitScript(setup)
  const p = await c.newPage(); await p.route('**/assets/index-*.js', (r) => r.abort())
  await p.goto(U + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(300)
  const v = await p.evaluate(() => !!document.querySelector('#root .hero')); await c.close(); return v
}
ok(await seen({ locale: 'en-US' }, '') === true, 'English reader: static hero shown')
ok(await seen({ locale: 'ja-JP' }, '') === false, 'Japanese browser: static hero removed before first paint')
ok(await seen({ locale: 'en-US' }, '?lang=ja') === false, '?lang=ja: static hero removed')
ok(await seen({ locale: 'ja-JP' }, '?lang=en') === true, 'ja browser with ?lang=en: static hero shown')
ok(await seen({ locale: 'en-US' }, '', () => { try { localStorage.setItem('lang', 'ja') } catch { /* blocked */ } }) === false, 'saved Japanese choice: static hero removed')
ok(await seen({ locale: 'en-US' }, '#work/robodog') === false, 'a project page: static hero removed')

await b.close(); process.exit(bad ? 1 : 0)
