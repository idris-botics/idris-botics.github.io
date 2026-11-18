// The "More builds" cards show a 192 px wide picture. Each one used to download the 640 px file (up to 134 kB for a card that small), so this writes a
// 480 px copy (enough for a 2.5x screen) next to it: public/media/img/<name>-480.webp, made from the 1280 px file when there is one.
// Run after adding or changing a project's first picture:  node --experimental-strip-types scripts/make-thumbs.mjs
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { projects } from '../src/content.ts'

const dir = 'public/media/img'
const names = new Set()
for (const p of projects) {
  const first = p.media?.[0]?.src ?? (!p.media?.length ? p.videos?.[0]?.poster : undefined)
  if (first) names.add(first)
}
let n = 0
for (const name of names) {
  const from = [`${name}-1280.webp`, `${name}-640.webp`].map((f) => join(dir, f)).find(existsSync)
  if (!from) continue
  const out = join(dir, `${name}-480.webp`)
  await sharp(from).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72, effort: 5 }).toFile(out)
  n++
}
console.log('wrote', n, 'thumbnails (-480.webp)')
