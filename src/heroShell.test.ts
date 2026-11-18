import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hero, links } from './content'
import { personal } from './personal'
import { ROOT } from './test/fs'

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

describe('the static hero in index.html (src/heroShell.html, written by npm run gen:shell)', () => {
  const shell = read('src/heroShell.html')
  const index = read('index.html')

  it('says what the live hero says: name, line, sub line, buttons, email address', () => {
    const t = text(shell)
    expect(shell).toContain(`aria-label="${hero.name}"`)
    expect(t).toContain(hero.line.en)
    expect(t).toContain(hero.sub.en)
    expect(shell).toContain(`mailto:${links.email}`)
    if (personal.cv.en) expect(shell).toContain(`__BASE__${personal.cv.en}`)
  })

  it('has no address that starts at the site root (the build puts the base in) and no script', () => {
    expect(shell).not.toMatch(/(src|href|poster)="\/[^/]/)
    expect(shell).toContain('__BASE__media/img/hero-reel-poster-')
    expect(shell).not.toMatch(/<script/i)
  })

  it('shows the hero picture as an <img> with the same srcset and sizes as the preload link in index.html, so the browser fetches one file for both', () => {
    const img = /<img data-pre-poster[^>]*>/.exec(shell)?.[0] ?? ''
    expect(img).not.toBe('')
    const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? ''
    const link = /<link rel="preload" as="image" imagesrcset[^>]*>/.exec(index)?.[0] ?? ''
    expect(link).not.toBe('')
    const norm = (s: string) => s.replaceAll('__BASE__', '%BASE_URL%')
    expect(norm(attr(img, 'srcset'))).toBe(attr(link, 'imagesrcset'))
    expect(attr(img, 'sizes')).toBe(attr(link, 'imagesizes'))
  })

  it('is written into the page by the heroShell plugin, with the CSP hash for its one inline guard script', () => {
    const cfg = read('vite.config.ts')
    expect(cfg).toContain('heroShell()')
    expect(cfg).toContain('data-pre-guard')
    expect(cfg).toContain("sha256-")
    expect(cfg).not.toMatch(/script-src[^\n]*unsafe-inline/)
  })
})
