// Every question in the Chaos gate: both buttons must be visible, fully inside the screen, unclipped and readable (desktop and phone). Screenshots: tests/out/gate-q<N>-<width>.png
import { chromium } from '@playwright/test'
const b = await chromium.launch()
let bad = 0
for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 360, height: 700 }]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 500, isMobile: vp.width < 500 })
  const p = await ctx.newPage()
  await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'Enter Chaos' }).click()
  await p.getByRole('button', { name: 'Proceed', exact: true }).click()
  await p.evaluate(() => document.querySelector('.crawl-inner')?.dispatchEvent(new Event('animationend', { bubbles: true })))
  await p.getByRole('button', { name: 'OK', exact: true }).click()
  for (let q = 0; q < 7; q++) {
    await p.waitForTimeout(1300)
    const info = await p.evaluate(() => {
      const card = document.querySelector('.gate-card'), btns = [...document.querySelectorAll('.gate-card .gate-actions button')]
      return { q: card?.querySelector('h2')?.textContent, btns: btns.map((x) => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return { t: x.textContent, l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), bot: Math.round(r.bottom), w: Math.round(r.width), clipped: x.scrollWidth > x.clientWidth + 1, color: cs.color, bg: cs.backgroundColor, op: cs.opacity, fs: cs.fontSize } }), vw: innerWidth, vh: innerHeight }
    })
    await p.screenshot({ path: `tests/out/gate-q${q + 1}-${vp.width}.png` })
    for (const x of info.btns) {
      const problems = []
      if (x.l < 0 || x.r > info.vw || x.top < 0 || x.bot > info.vh) problems.push('outside the screen')
      if (x.clipped) problems.push('text clipped')
      const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number), lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
      const bgc = rgb(x.bg), bg = bgc.length > 3 && bgc[3] === 0 ? [0, 0, 0] : bgc // transparent buttons sit on the black gate
      const L1 = lum(rgb(x.color)), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      if (ratio < 4.5) problems.push(`contrast ${ratio.toFixed(1)}:1`)
      if (parseFloat(x.fs) < 14) problems.push(`text ${x.fs}`)
      if (+x.op < 0.9) problems.push('faded')
      if (problems.length) { console.log('FAIL', vp.width, `Q${q + 1}`, JSON.stringify(x.t), problems.join(', ')); bad++ }
    }
    if (info.btns.length !== 2) { console.log('FAIL', vp.width, `Q${q + 1}`, 'expected 2 buttons, got', info.btns.length); bad++ }
    console.log(vp.width, `Q${q + 1}`, JSON.stringify(info.q), info.btns.map((x) => `${x.t} [${x.l}-${x.r}] ${x.color} on ${x.bg}`).join(' | '))
    // advance: press the second button (Yes) except on the last one
    if (q < 6) await p.locator('.gate-card .gate-actions button').filter({ hasNotText: /^$/ }).evaluateAll((bs) => bs.find((x) => x.classList.contains('chaos-btn') || x.textContent) && null)
    if (q < 6) await p.locator('.gate .gate-actions .chaos-btn').last().click()
  }
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)
