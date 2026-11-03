import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projects, statusLabel, loopLabel, timeline, pathRows, aboutText, tiles, strip, learning, fieldEvents, hero, links, featured, type L } from './content'
import { EM_DASH, ROOT, SRC, read, walk } from './test/fs'

const imgDir = join(ROOT, 'public', 'media', 'img')
const vidDir = join(ROOT, 'public', 'media', 'vid')

const collectL = (v: unknown, path: string, out: { path: string; l: L }[] = []) => {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.en === 'string' && typeof o.ja === 'string') out.push({ path, l: o as unknown as L })
    else for (const k of Object.keys(o)) collectL(o[k], `${path}.${k}`, out)
  }
  return out
}

describe('content integrity', () => {
  it('slugs are unique and non-empty', () => {
    const slugs = projects.map((p) => p.slug)
    expect(slugs.every(Boolean)).toBe(true)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every bilingual field has non-empty en and ja', () => {
    const all = [
      ...projects.flatMap((p) => collectL(p, p.slug)),
      ...collectL({ statusLabel, loopLabel, timeline, pathRows, aboutText, tiles, strip, learning, fieldEvents, hero }, 'root'),
    ]
    expect(all.length).toBeGreaterThan(100)
    const bad = all.filter((x) => !x.l.en.trim() || !x.l.ja.trim()).map((x) => x.path)
    expect(bad).toEqual([])
  })

  it('ja strings contain Japanese characters (or a deliberate proper name)', () => {
    const jp = /[぀-ヿ一-鿿]/
    const bad = projects.flatMap((p) => collectL(p, p.slug)).filter((x) => !jp.test(x.l.ja) && x.l.ja !== x.l.en).map((x) => x.path)
    expect(bad).toEqual([])
  })

  it('every project status has a statusLabel and no project uses OPEN', () => {
    for (const p of projects) {
      expect(statusLabel[p.status], p.slug).toBeDefined()
      expect(p.status, p.slug).not.toBe('OPEN')
    }
  })

  it('featured and tile data point at real projects', () => {
    const slugs = projects.map((p) => p.slug)
    expect(featured).toHaveLength(3)
    for (const f of featured) { expect(slugs).toContain(f); expect(tiles[f].line, f).toBeDefined(); expect(tiles[f].did, f).toBeDefined() }
    expect(slugs.filter((s) => !tiles[s])).toEqual([])
    for (const s of strip) expect(existsSync(join(imgDir, `${s.media.src}-640.webp`)), s.media.src).toBe(true)
  })

  it('every project has a valid tier and loops', () => {
    for (const p of projects) {
      expect(['flagship', 'grant', 'foundation']).toContain(p.tier)
      expect(p.loops.length).toBeGreaterThan(0)
      for (const l of p.loops) expect(loopLabel[l], `${p.slug}:${l}`).toBeDefined()
    }
  })

  it('media dimensions are positive and alt text is present', () => {
    for (const p of projects) for (const m of p.media ?? []) {
      expect(m.w).toBeGreaterThan(0)
      expect(m.h).toBeGreaterThan(0)
      expect(m.alt.en.length).toBeGreaterThan(5)
    }
  })

  it('every media src has webp files for each declared width', () => {
    const missing: string[] = []
    for (const p of projects) for (const m of p.media ?? []) {
      for (const w of m.widths ?? [640, 1280]) {
        const f = `${m.src}-${w}.webp`
        if (!existsSync(join(imgDir, f))) missing.push(`${p.slug}: ${f}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('video files and posters exist', () => {
    const missing: string[] = []
    for (const p of projects) for (const v of p.videos ?? []) {
      if (!existsSync(join(vidDir, `${v.src}.mp4`))) missing.push(`${p.slug}: ${v.src}.mp4`)
      if (!existsSync(join(imgDir, `${v.poster}-1280.webp`)) && !existsSync(join(imgDir, `${v.poster}-640.webp`))) missing.push(`${p.slug}: poster ${v.poster}`)
    }
    expect(missing).toEqual([])
  })

  it('every sim key maps to a registry entry and a View file', () => {
    const reg = read(join(SRC, 'sims', 'registry.tsx'))
    const body = reg.slice(reg.indexOf('export const SimView'))
    for (const p of projects) if (p.sim) {
      expect(body, p.slug).toMatch(new RegExp(`\\b${p.sim}\\s*[:(]`))
      expect(existsSync(join(SRC, 'sims', p.sim === 'dog' || p.sim === 'spider' ? 'gait' : p.sim, 'View.tsx')), p.sim).toBe(true)
    }
  })

  it('links are well formed', () => {
    expect(links.linkedin).toMatch(/^https:\/\//)
    expect(links.github).toMatch(/^https:\/\//)
    expect(links.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    for (const p of projects) if (p.link) expect(p.link.href).toMatch(/^https?:\/\//)
  })
})

describe('source hygiene', () => {
  const files = walk(SRC).filter((f) => /\.(ts|tsx|json|css)$/.test(f))
  it('no em dash anywhere in src', () => {
    const offenders = files.filter((f) => read(f).includes(EM_DASH)).map((f) => f.replace(ROOT, ''))
    expect(offenders).toEqual([])
  })
  it('no OPEN placeholder leaks into rendered content data', () => {
    const json = JSON.stringify({ projects, timeline, pathRows, aboutText, tiles, strip })
    expect(json).not.toMatch(/\bOPEN\b/)
    expect(json).not.toMatch(/TODO|TBD|FIXME|lorem ipsum/i)
  })
})
