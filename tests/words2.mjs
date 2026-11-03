import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
console.log(await p.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => (s.id || s.className) + ': ' + s.innerText.split(/\s+/).filter(Boolean).length).join('\n')))
await b.close()
