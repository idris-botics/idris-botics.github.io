// Records the site's own simulations and a run through Chaos as screen videos (Playwright), for the tile clips and the teaser peek.
// Output: ../project-videos/tile-clips/raw/{pid,swarm,chaos}.webm and a bbox JSON per clip (crop rectangle, 16:10). Usage: node tests/record-clips.mjs [url]
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync, renameSync, readdirSync, rmSync } from 'node:fs'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const out = '../project-videos/tile-clips/raw'
mkdirSync(out, { recursive: true })
const b = await chromium.launch()

const only = process.argv.slice(3)
async function take(name, run) {
  if (only.length && !only.includes(name)) return
  const dir = `${out}/_${name}`
  rmSync(dir, { recursive: true, force: true })
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir, size: { width: 1280, height: 800 } } })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  const t0 = Date.now()
  const box = await run(p, () => (Date.now() - t0) / 1000)
  await ctx.close()
  const f = readdirSync(dir).find((x) => x.endsWith('.webm'))
  renameSync(`${dir}/${f}`, `${out}/${name}.webm`)
  rmSync(dir, { recursive: true, force: true })
  writeFileSync(`${out}/${name}.json`, JSON.stringify(box))
  console.log(name, JSON.stringify(box))
}

// a 16:10 crop centred on an element, kept inside the 1280x800 frame
// a 16:10 crop that stays inside the element
const inside = (r) => {
  let w = Math.round(r.width), h = Math.round(w / 1.6)
  if (h > r.height) { h = Math.round(r.height); w = Math.round(h * 1.6) }
  return { x: Math.round(r.x + (r.width - w) / 2), y: Math.round(r.y + (r.height - h) / 2), w, h }
}
const crop = (r, pad = 0) => {
  let w = Math.min(1280, Math.round(r.width + pad * 2)), h = Math.round(w / 1.6)
  if (h < r.height + pad * 2) { h = Math.min(800, Math.round(r.height + pad * 2)); w = Math.min(1280, Math.round(h * 1.6)) }
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2
  return { x: Math.max(0, Math.min(1280 - w, Math.round(cx - w / 2))), y: Math.max(0, Math.min(800 - h, Math.round(cy - h / 2))), w, h }
}

await take('pid', async (p) => {
  await p.locator('#pid').click()
  await p.waitForSelector('.iso-pid svg')
  await p.addStyleTag({ content: '.pid-pause { display: none !important }' }) // the pause button stays out of the clip
  await p.locator('.iso-pid').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.waitForTimeout(500)
  const r = await p.locator('.iso-pid svg').boundingBox()
  await p.waitForTimeout(16000) // the arm swings between two targets every 2.4 s, so the take is periodic
  return { ...crop(r), source: 'figure' }
})

await take('swarm', async (p) => {
  await p.locator('#swarm').click()
  await p.waitForSelector('.page .play')
  await p.locator('.page .play').click()
  await p.waitForSelector('.page .sim-screen')
  await p.locator('.page .sim-screen').first().evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.waitForTimeout(800)
  const r = await p.locator('.page .sim-screen').first().boundingBox()
  for (let i = 0; i < 7; i++) { await p.getByRole('button', { name: i % 2 ? 'Shove back' : 'Shove forward' }).click(); await p.waitForTimeout(2300) } // the robot is pushed and catches itself
  return { ...inside(r), source: 'sim' }
})

await take('chaos', async (p, now) => {
  await enterChaos(p)
  await p.waitForTimeout(1500)
  const a = now()
  await p.keyboard.type('coffee', { delay: 40 }) // brewing bar, then the flood
  await p.waitForTimeout(4700)
  await p.waitForTimeout(1100)
  await p.locator('#pid').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.locator('#pid').click()
  await p.waitForTimeout(1200)
  return { x: 0, y: 0, w: 1280, h: 800, source: 'page', from: a }
})

await b.close()
