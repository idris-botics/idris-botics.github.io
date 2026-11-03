// Static SVG of the PID rig for the CV and README. Run with the site served (npm run preview): node scripts/export-pid-svg.mjs [url]
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { ISO_CSS } from '../src/lib/iso/iso-kit.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1000, height: 900 }, reducedMotion: 'reduce' }) // reduced motion: the arm rests at its target
await p.goto(url + '#work/pid', { waitUntil: 'networkidle' })
await p.waitForSelector('.iso-pid svg.iso-svg')
await p.waitForTimeout(600)
let svg = await p.locator('.iso-pid svg.iso-svg').first().evaluate((e) => e.outerHTML)
svg = svg.replace('<svg ', '<svg data-theme="light" ').replace('class="iso-svg"', 'class="iso-svg iso"').replace('>', `><style>${ISO_CSS}</style>`)
mkdirSync('docs/figures', { recursive: true })
writeFileSync('docs/figures/pid-rig.svg', svg)
console.log('wrote docs/figures/pid-rig.svg', Math.round(svg.length / 1024) + ' KB')
await b.close()
