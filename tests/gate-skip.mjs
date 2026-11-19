// The hidden word "chaos", typed on the Calm side, goes straight into Chaos (no warning, no crawl, no questions);
// typing "idris" during the warning no longer skips it; typing it inside a text field or during the warning does nothing.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
const url = process.argv[2] ?? 'http://localhost:4173/'
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) bad++ }
const mode = (p) => p.evaluate(() => document.documentElement.dataset.mode)
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(url, { waitUntil: 'networkidle' })
  check(await p.locator('.hidden-chaos').count() === 0, 'there is no button for it: it is a hidden word')
  await p.keyboard.type('chaos', { delay: 40 }); await p.waitForTimeout(800)
  check(await p.locator('.gate').count() === 0 && await mode(p) === 'chaos', 'typing chaos goes straight into Chaos: no gate')
  check(!errs.length, 'no page errors ' + errs.join('|'))
  await p.close()
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'Enter Chaos' }).click()
  await p.keyboard.type('chaos', { delay: 40 }); await p.waitForTimeout(500)
  check(await p.locator('.gate').count() === 1 && await mode(p) !== 'chaos', 'typing chaos during the warning does nothing')
  await p.getByRole('button', { name: 'Proceed', exact: true }).click(); await p.waitForTimeout(500)
  await p.keyboard.type('idris', { delay: 40 }); await p.waitForTimeout(500)
  check(await p.locator('.gate').count() === 1 && await mode(p) !== 'chaos', 'typing idris during the warning no longer skips it')
  await p.close()
}
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.evaluate(() => { const i = document.createElement('input'); i.id = 'tt'; document.body.prepend(i) })
  await p.locator('#tt').focus(); await p.keyboard.type('chaos', { delay: 40 }); await p.waitForTimeout(500)
  check(await mode(p) !== 'chaos', 'typing it in a text field does nothing')
  await p.close()
}
await b.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0)
