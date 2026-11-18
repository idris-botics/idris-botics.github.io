import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scenerySvg } from './sceneryArt'
import { ROOT } from './test/fs'

describe('background picture', () => {
  const file = readFileSync(join(ROOT, 'public', 'scenery.svg'), 'utf8')

  it('public/scenery.svg is what the drawing in src/sceneryArt.ts produces (run npm run gen:scenery)', () => {
    expect(file).toBe(scenerySvg())
  })

  it('is one well-formed picture: balanced tags, unique ids, every gradient it uses is defined', () => {
    const opens = (file.match(/<[a-zA-Z][^>]*>/g) ?? []).filter((t) => !t.endsWith('/>')).length
    const closes = (file.match(/<\/[a-zA-Z]+>/g) ?? []).length
    expect(opens).toBe(closes)
    const ids = [...file.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    for (const [, ref] of file.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref)
    for (const [, ref] of file.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(ref)
  })

  it('stays small and quiet: no scripts, no external references, under 60 KB', () => {
    expect(file.length).toBeLessThan(60 * 1024)
    expect(file).not.toMatch(/<script|<foreignObject|<image|https?:\/\/(?!www\.w3\.org)/i)
  })
})
