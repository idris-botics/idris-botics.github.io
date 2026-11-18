// The hero and contact email buttons: the hero has a coral and a cream pill and a plain CV link; pressing Email me copies the address and shows a note
// (the mailto: link alone does nothing visible on a computer with no mail app). Usage: node tests/email-note.mjs [url]
import { chromium, devices } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch(); let bad = 0
const ok = (n, p, x = '') => { console.log(`${p ? 'ok  ' : 'FAIL'} ${n} ${x}`); if (!p) bad++ }
for (const [n, o] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  for (const lang of ['en', 'ja']) {
    const c = await b.newContext({ ...o, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await c.newPage(); const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    await p.goto(url); if (lang === 'ja') await p.getByRole('button', { name: '日本語' }).click(); await p.waitForSelector('.hero-actions .btn'); await p.waitForTimeout(1200)
    const hero = await p.evaluate(() => [...document.querySelectorAll('.hero-actions .btn')].map((e) => { const q = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 16), bg: getComputedStyle(e).backgroundColor, h: Math.round(q.height), right: Math.round(q.right) } }))
    const cv = await p.locator('.hero-actions a.cv-link').count()
    ok(`${n} ${lang}: hero has a coral pill, a cream pill and a plain CV link`, hero.length === 2 && hero[0].bg === 'rgb(238, 106, 76)' && hero[1].bg === 'rgb(255, 248, 234)' && cv === 1, hero.map((h) => h.t).join(' | '))
    ok(`${n} ${lang}: hero pills >= 44px tall and inside the screen`, hero.every((h) => h.h >= 44 && h.right <= (o.viewport?.width ?? 390)))
    await p.evaluate(() => document.querySelector('.hero-actions a[href^="mailto"]').addEventListener('click', (e) => e.preventDefault(), { once: true })) // stop the real mail app opening during the test
    await p.locator('.hero-actions a[href^="mailto"]').click(); await p.waitForTimeout(500)
    const note = await p.locator('.hero-text .copied-note').innerText(); const clip = await p.evaluate(() => navigator.clipboard.readText())
    ok(`${n} ${lang}: click copies the address`, clip === 'idris.connected@gmail.com', clip)
    ok(`${n} ${lang}: click shows the note`, /idris\.connected@gmail\.com/.test(note), note)
    const vis = await p.locator('.hero-text .copied-note').boundingBox(); ok(`${n} ${lang}: note is visible inside the hero card`, !!vis && vis.height > 10)
    ok(`${n} ${lang}: no sideways scroll, no errors`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) && errs.length === 0, errs.join('|'))
        await c.close()
  }
}
await b.close(); process.exitCode = bad ? 1 : 0
