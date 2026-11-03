// Content and UX audit data for docs/audit/website-audit.md: headings, alt text, links, media files, lorem/TODO text, titles per page.
import { chromium } from '@playwright/test'
import { readdirSync } from 'node:fs'
const url = 'http://localhost:4173/'
const slugs = ['pid','swarm','gait','net','abb','cpu8','robodog','spider','vehicles','pipe','stepscribe','stocksite','subtlebotic']
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const bad = []
const check = async (label) => {
  const r = await p.evaluate(() => {
    const t = document.body.innerText
    return {
      title: document.title, h1: [...document.querySelectorAll('h1')].map((h) => h.innerText),
      headingJump: (() => { let prev = 0, jumps = []; for (const h of document.querySelectorAll('h1,h2,h3,h4')) { const l = +h.tagName[1]; if (prev && l > prev + 1) jumps.push(h.innerText.slice(0, 30)); prev = l } return jumps })(),
      noAlt: [...document.querySelectorAll('img:not([alt])')].length,
      emptyLinks: [...document.querySelectorAll('a')].filter((a) => !a.innerText.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]')).length,
      lorem: /lorem ipsum/i.test(t), todo: /TODO\(|OPEN\b/.test(t), placeholder: /\bTBD\b|coming soon/i.test(t),
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
      externalNoRel: [...document.querySelectorAll('a[target=_blank]')].filter((a) => !/noopener/.test(a.rel)).length,
      words: t.split(/\s+/).filter(Boolean).length,
    }
  })
  if (r.noAlt || r.emptyLinks || r.lorem || r.todo || r.placeholder || r.brokenImgs || r.externalNoRel || r.headingJump.length || r.h1.length !== 1) bad.push([label, r])
  return r
}
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
const home = await check('home')
console.log('home', JSON.stringify(home))
for (const s of slugs) { await p.goto(url + '#work/' + s, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); const r = await check(s); console.log(s.padEnd(12), r.title.padEnd(48), 'h1:', r.h1.length, 'words:', r.words) }
// local links and media
const hrefs = new Set()
await p.goto(url, { waitUntil: 'networkidle' })
for (const h of await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))) hrefs.add(h)
const missing = []
for (const h of hrefs) if (/^(papers|cv|media)\//.test(h)) { const r = await p.request.get(url + h); if (!r.ok()) missing.push(h) }
console.log('local files missing:', missing)
console.log('problems:', JSON.stringify(bad, null, 1))
await b.close()
