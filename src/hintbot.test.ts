import { describe, expect, it } from 'vitest'
import data from './content/jokes/hintbot.json'

type Opt = { label: { en: string; ja: string }; reply: { en: string; ja: string }; next?: string; effect?: string }
const nodes = data.nodes as unknown as Record<string, { q: unknown; a: Opt; b: Opt }>

describe('hint bot dialogue', () => {
  it('every answer has a reply, and every follow-up or opener points at a real question', () => {
    for (const [id, n] of Object.entries(nodes)) for (const w of ['a', 'b'] as const) {
      const o = n[w]
      expect(o.reply.en.length, `${id}.${w}`).toBeGreaterThan(3)
      expect(o.reply.ja.length, `${id}.${w} ja`).toBeGreaterThan(1)
      if (o.next) expect(nodes[o.next], `${id}.${w} -> ${o.next}`).toBeTruthy()
      if (o.effect) expect(['skip', 'more', 'refuse', 'reveal']).toContain(o.effect)
    }
    for (const s of data.starts) expect(nodes[s], s).toBeTruthy()
  })
  it('the answers lead to different places: follow-ups, shortcuts, refusals and reveals all exist', () => {
    const all = Object.values(nodes).flatMap((n) => [n.a, n.b])
    for (const k of ['skip', 'more', 'refuse', 'reveal']) expect(all.some((o) => o.effect === k), k).toBe(true)
    expect(all.filter((o) => o.next).length).toBeGreaterThan(8)
    for (const n of Object.values(nodes)) expect(n.a.reply.en === n.b.reply.en).toBe(false) // the two answers never get the same reply
  })
})
