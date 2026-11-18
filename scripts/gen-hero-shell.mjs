// Writes src/heroShell.html: the first screen of the home page (skip link, header, hero with its picture and scene) as static HTML.
// The build (heroShell plugin in vite.config.ts) puts it inside #root, so the first paint needs no JavaScript; the app replaces it as soon as it
// has started (src/preShell.ts, src/main.tsx). It is taken from the running app, so it is always the same markup the app draws.
// Run after changing the header or the hero:  npm run gen:shell
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const out = fileURLToPath(new URL('../src/heroShell.html', import.meta.url))
const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  await page.goto(url)
  await page.waitForSelector('.hero-grid .hero-photo video')
  await page.waitForSelector('.scene svg')
  await page.evaluate(() => document.fonts.ready)
  const html = await page.evaluate(() => {
    const take = (sel) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error('missing ' + sel)
      return el.cloneNode(true)
    }
    const skip = take('a.skip')
    const header = take('header.site-header')
    const hero = take('main#main section.hero')
    // the reel is a <video>; the static page shows the same box as a plain <img> of its poster, chosen by the browser from a srcset
    const video = hero.querySelector('.hero-photo video')
    const label = video.getAttribute('aria-label') || ''
    const img = document.createElement('img')
    img.setAttribute('data-pre-poster', '')
    img.src = '/media/img/hero-reel-poster-1280.webp'
    img.srcset = '/media/img/hero-reel-poster-640.webp 640w, /media/img/hero-reel-poster-960.webp 960w, /media/img/hero-reel-poster-1280.webp 1280w'
    img.sizes = '(max-width: 800px) calc(100vw - 32px), min(54vw, 582px)'
    img.alt = label
    img.width = 1920
    img.height = 1080
    img.setAttribute('fetchpriority', 'high')
    video.replaceWith(img)
    hero.querySelectorAll('.reel-btn').forEach((b) => b.remove())
    hero.querySelector('.copied-note')?.replaceChildren()
    hero.querySelectorAll('svg.blink').forEach((s) => s.classList.remove('blink'))
    hero.querySelectorAll('.waving').forEach((s) => s.classList.remove('waving'))
    const main = document.createElement('main')
    main.id = 'main'
    const wrap = document.createElement('div')
    wrap.append(hero)
    main.append(wrap)
    return [skip, header, main].map((n) => n.outerHTML).join('\n')
  })
  // addresses that start at the site root get the build's base back
  const withBase = html
    .replace(/\b(src|href|poster)="\/(?!\/)/g, '$1="__BASE__')
    .replace(/\bsrcset="([^"]*)"/g, (_m, v) => `srcset="${v.replace(/(^|, ?)\//g, '$1__BASE__')}"`)
  if (/="\/[^/]/.test(withBase)) throw new Error('an address still starts at the site root')
  writeFileSync(out, withBase + '\n')
  console.log('wrote src/heroShell.html,', withBase.length, 'bytes')
} finally {
  await browser.close()
  await server.close()
}
