// Every page at 360, 390 and 430: no horizontal scroll, tap targets of at least 44 px (inline text links excepted), reduced motion on and off.
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let fails = 0
for (const rm of ['no-preference', 'reduce']) for (const w of [360, 390, 430]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, reducedMotion: rm, hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push(String(e)))
  for (const route of ['', '#work/pid', '#work/robodog', '#work/spider', '#work/net', '#work/pipe', '#work/stepscribe', '#work/cpu8', '#work/stocksite', '#work/abb']) {
    await p.goto(url + route, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
    const r = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth > innerWidth + 1,
      small: [...document.querySelectorAll('button, a.btn, .tile-main, .mini, .pn-a, summary, .back, nav a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5) && !e.closest('[hidden]') }).map((e) => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 5),
    }))
    if (r.over || r.small.length) { fails++; console.log('FAIL', rm, w, route || 'home', JSON.stringify(r)) }
  }
  if (errs.length) console.log('console', rm, w, errs.slice(0, 3))
  await ctx.close()
}
console.log(fails ? `${fails} problems` : 'all ok')
await b.close(); process.exit(fails ? 1 : 0)
