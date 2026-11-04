// Bluetooth vehicles sim: Calm pairing always works first try and fast; arrow keys and WASD drive the bot without scrolling the page;
// the on-screen pad drives too; Chaos shows "Try again" and connects after three failures. Usage: node tests/bluetooth.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'

const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch()
let bad = 0
const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) bad++ }

async function open(p) {
  await p.goto(url + '#work/vehicles', { waitUntil: 'networkidle' })
  await p.locator('.sim-poster').click()
  await p.locator('.sim canvas').first().evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await p.waitForTimeout(1200) // no scrolling first: pressing Connect is what starts the sim
}
const speed = (p) => p.evaluate(() => /speed (\d+)/.exec(document.querySelector('.sim')?.textContent ?? '')?.[1] ?? null)
const nowText = (p) => p.locator('.sim [role=status]', { hasText: /Now:/ }).first().innerText()

// --- Calm
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await open(p)
  check(await p.getByText('How to drive').first().isVisible(), 'a "How to drive" panel sits above the sim')
  const btn = p.getByRole('button', { name: /Connect Bluetooth/ })
  await btn.scrollIntoViewIfNeeded()
  const t0 = Date.now()
  await btn.dispatchEvent('click')
  await p.getByText(/Connected to HC-05/).first().waitFor({ timeout: 3000 })
  check(Date.now() - t0 < 1800, `Calm connects on the first try in ${Date.now() - t0} ms`)
  const y0 = await p.evaluate(() => scrollY)
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700)
  check((await nowText(p)).includes('forward'), 'ArrowUp shows "forward" live')
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400)
  check(/forward \+ right/.test(await nowText(p)), 'ArrowUp + ArrowRight shows "forward + right"')
  await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowRight')
  check(Math.abs((await p.evaluate(() => scrollY)) - y0) < 4, 'the page did not scroll on arrow keys')
  await p.keyboard.down('d'); await p.waitForTimeout(300)
  check((await nowText(p)).includes('right'), 'WASD works too (D = right)')
  await p.keyboard.up('d')
  // on-screen pad, held smoothly
  const up = p.getByRole('button', { name: 'forward', exact: true })
  const box = await up.boundingBox()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(500)
  check((await nowText(p)).includes('forward'), 'the on-screen pad drives (held)')
  await p.mouse.up(); await p.waitForTimeout(300)
  check((await nowText(p)).includes('no input'), 'releasing the pad stops it')
  check(box.width >= 44 && box.height >= 44, 'pad buttons are at least 44 px')
  check((await p.locator('.vehicles li').count()) === 3, 'the Vehicles comparison lists all three')
  await p.close()
}

// --- Chaos: failures, a visible Try again, then success on the 4th try
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
  await p.goto(url, { waitUntil: 'networkidle' })
  await enterChaos(p)
  await open(p)
  for (let i = 1; i <= 3; i++) {
    await p.getByRole('button', { name: i === 1 ? /Connect Bluetooth/ : /Try again/ }).click()
    await p.getByText(/failed|failing|Failed|Hmm/i).first().waitFor({ timeout: 4000 })
    check(await p.getByRole('button', { name: /Try again/ }).isVisible(), `Chaos failure ${i}: a "Try again" button is visible`)
  }
  await p.getByRole('button', { name: /Try again/ }).click()
  await p.getByText(/Connected to HC-05/).first().waitFor({ timeout: 4000 })
  check(true, 'after three failures Chaos connects like Calm')
  await p.close()
}
await b.close()
process.exit(bad ? 1 : 0)
