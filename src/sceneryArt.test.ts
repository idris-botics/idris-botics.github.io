import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scenerySvg } from './sceneryArt'
import { ROOT } from './test/fs'

const read = (name: string) => readFileSync(join(ROOT, 'public', name), 'utf8')
// a Windows checkout may turn the files' line endings into CRLF; the pictures themselves are the same
const lf = (s: string) => s.replace(/\r\n/g, '\n')

describe('background pictures', () => {
  const calm = read('scenery.svg')
  const chaos = read('scenery-chaos.svg')

  it('public/scenery.svg is what the drawing in src/sceneryArt.ts produces (run npm run gen:scenery)', () => {
    expect(lf(calm)).toBe(scenerySvg())
  })

  it('public/scenery-chaos.svg is the louder Chaos version of the same drawing', () => {
    expect(lf(chaos)).toBe(scenerySvg(true))
  })

  it.each([['calm', calm], ['chaos', chaos]])('the %s picture is well formed: balanced tags, unique ids, every gradient it uses is defined', (_name, file) => {
    const opens = (file.match(/<[a-zA-Z][^>]*>/g) ?? []).filter((t) => !t.endsWith('/>')).length
    const closes = (file.match(/<\/[a-zA-Z]+>/g) ?? []).length
    expect(opens).toBe(closes)
    const ids = [...file.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    for (const [, ref] of file.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref)
    for (const [, ref] of file.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(ref)
  })

  it.each([['calm', calm], ['chaos', chaos]])('the %s picture stays small and quiet: no scripts, no external references, under 90 KB', (_name, file) => {
    expect(file.length).toBeLessThan(90 * 1024)
    expect(file).not.toMatch(/<script|<foreignObject|<image|https?:\/\/(?!www\.w3\.org)/i)
  })

  it('the Chaos picture has a blue top where the Calm one has the pink dusk', () => {
    expect(calm).toContain('stop-color="#dbbccb"')
    expect(chaos).not.toContain('stop-color="#dbbccb"')
  })
})
