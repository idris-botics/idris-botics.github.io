// Figure plates (PID rig, swarm, G.A.I.T.): the four captions are readable (at least 11.5 px from 380 px wide up), stay inside the plate and do not touch each other, in English and Japanese.
// node tests/figure-labels.mjs [url]
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
for (const lang of ['en', 'ja']) for (const w of [360, 390, 412, 820, 1280]) for (const slug of ['pid', 'swarm', 'gait']) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage()
  await p.goto(`${url}?e2e=1&lang=${lang}#work/${slug}`); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200)
  const plate = p.locator('.iso-plate').first()
  if (!(await plate.count())) { check(false, `${lang} ${w} ${slug}: no figure plate`); await ctx.close(); continue }
  await plate.scrollIntoViewIfNeeded(); await p.waitForTimeout(400)
  const r = await p.evaluate(() => {
    const pl = document.querySelector('.iso-plate'); const pr = pl.getBoundingClientRect()
    const cs = [...pl.querySelectorAll('.iso-plate-corner')].map((e) => { const x = e.getBoundingClientRect(); return { k: e.dataset.corner, x: x.x, y: x.y, w: x.width, h: x.height, fs: parseFloat(getComputedStyle(e).fontSize) } })
    return { pr: { x: pr.x, y: pr.y, w: pr.width, h: pr.height }, cs }
  })
  const inside = r.cs.every((c) => c.x >= r.pr.x + 4 && c.x + c.w <= r.pr.x + r.pr.w - 4 && c.y >= r.pr.y && c.y + c.h <= r.pr.y + r.pr.h)
  let touch = []
  for (let i = 0; i < r.cs.length; i++) for (let j = i + 1; j < r.cs.length; j++) { const a = r.cs[i], c = r.cs[j]; if (a.x < c.x + c.w + 4 && c.x < a.x + a.w + 4 && a.y < c.y + c.h && c.y < a.y + a.h) touch.push(a.k + '/' + c.k) }
  const min = Math.min(...r.cs.map((c) => c.fs))
  check(inside && !touch.length && (w < 380 || min >= 11.5), `${lang} ${w}px ${slug}: ${min.toFixed(1)} px, inside ${inside}, touching ${touch.join(',') || 'none'}`)
  await ctx.close()
}
await b.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0)
