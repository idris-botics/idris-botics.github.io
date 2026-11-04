import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:4173/#work/vehicles', { waitUntil: 'networkidle' })
await p.locator('.sim-poster').click(); await p.waitForTimeout(1500)
await p.evaluate(() => { window.__log = []; const t0 = performance.now(); new MutationObserver(() => { const m = /(Searching|Found HC-05|Connected to HC-05|Not connected)/.exec(document.querySelector('.sim-readout')?.textContent ?? ''); const l = window.__log; if (m && l[l.length - 1]?.[0] !== m[1]) l.push([m[1], Math.round(performance.now() - t0)]) }).observe(document.body, { subtree: true, childList: true, characterData: true }) })
await p.getByRole('button', { name: /Connect Bluetooth/ }).dispatchEvent('click'); await p.waitForTimeout(4000)
console.log(JSON.stringify(await p.evaluate(() => window.__log))); await b.close()
