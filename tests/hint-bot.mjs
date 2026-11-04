// Hint bot: a button in the top right corner; it asks a few questions before it gives a hint; the second hint waits on a timer.
// Also checks that the Rick roll plays from the local file (no YouTube frame) and loops until it is closed.
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
let fails = 0
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails++ }
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport })
  const errors = []
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  const btn = p.locator('.hb-btn')
  await btn.waitFor()
  const box = await btn.boundingBox()
  check(box.x + box.width > viewport.width - 120 && box.y < 140, `${name}: hint button is in the top right corner`)
  check(box.width >= 44 && box.height >= 44, `${name}: hint button is at least 44 px`)
  await btn.click()
  check(await p.locator('.hb-panel').count() === 1, `${name}: panel opens`)
  // the dialogue branches: answer whatever is asked until a hint (or a refusal) arrives; at least one question comes first
  let questions = 0, end = ''
  for (let i = 0; i < 14 && !end; i++) {
    if (await p.locator('.hb-hint').count()) end = 'hint'
    else if (/No hint right now/i.test(await p.locator('.hb-body').innerText().catch(() => ''))) end = 'refused'
    else if ((await p.locator('.hb-opts button').count()) === 2) { questions++; await p.locator('.hb-opts button').nth(i % 2).click() }
    else await p.locator('.hb-opts button', { hasText: /Continue/ }).click()
  }
  check(questions >= 1 && !!end, `${name}: ${questions} question(s) came first, then ${end}`)
  await p.locator('.hb-x').click()
  check(errors.filter((e) => !/postMessage|frame-shell/.test(e)).length === 0, `${name}: no console errors ${JSON.stringify(errors)}`)
  await p.screenshot({ path: `tests/out/hint-${name}.png` })
  await p.close()
}
// Rick roll from the local file
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const reqs = []
  p.on('request', (r) => { if (/youtube/.test(r.url())) reqs.push(r.url()) })
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await p.waitForSelector('.rick-video', { timeout: 120000 }).catch(() => {})
  const has = await p.locator('.rick-video').count()
  if (has) {
    const info = await p.locator('.rick-video').evaluate((v) => ({ tag: v.tagName, loop: v.loop, src: v.currentSrc || v.src }))
    check(info.tag === 'VIDEO' && info.loop && /rick\.mp4$/.test(info.src), `rick roll is the local ${info.src}, looping`)
    check(reqs.length === 0, 'no request to YouTube')
  } else console.log('skip rick: did not fire in this run')
  await p.close()
}
await b.close(); process.exit(fails ? 1 : 0)
