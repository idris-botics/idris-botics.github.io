import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
const n = await p.evaluate(() => document.querySelector('main').innerText.split(/\s+/).filter(Boolean).length)
console.log('words in main:', n, n <= 450 ? 'ok' : 'OVER 450')
await b.close()
