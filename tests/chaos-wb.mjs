import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(4500)
await p.screenshot({ path: 'tests/out/wb-chaos.png' })
console.log(errs)
await b.close()
