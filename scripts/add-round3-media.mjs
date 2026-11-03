// Round 3 media: new photos in the parent folder -> 640/1280 WebP in public/media/img (metadata stripped, rotated upright).
// Videos are cut with ffmpeg by hand (see docs/REVIEW.md). Run from robotics-portfolio: node scripts/add-round3-media.mjs
import sharp from 'sharp'
import { resolve } from 'node:path'
const root = resolve(process.cwd(), '..')
const out = resolve(process.cwd(), 'public/media/img')
const jobs = [
  ['WhatsApp Image 2026-11-03 at 7.23.54 PM (1).jpeg', 'dog-eyes-1'],
  ['WhatsApp Image 2026-11-03 at 7.23.54 PM (2).jpeg', 'dog-eyes-2'],
  ['WhatsApp Image 2026-11-03 at 7.23.54 PM.jpeg', 'dog-eyes-3'],
  ['WhatsApp Image 2026-11-03 at 7.23.55 PM.jpeg', 'dog-eyes-4'],
  ['WhatsApp Image 2026-11-03 at 7.23.56 PM.jpeg', 'swarm-bot-top'],
]
for (const [file, name] of jobs) {
  const src = resolve(root, file)
  const meta = await sharp(src).metadata()
  for (const w of [640, 1280]) {
    if (w > meta.width && w !== 640) continue
    await sharp(src).rotate().resize({ width: Math.min(w, meta.width), withoutEnlargement: true }).webp({ quality: 78 }).toFile(resolve(out, `${name}-${w}.webp`))
  }
  console.log('ok', name, meta.width, meta.height)
}
// the 8-bit computer photo was sideways: turn it a quarter clockwise
const eight = resolve(out, 'image5-1280.webp')
const buf = await sharp(eight).toBuffer()
await sharp(buf).rotate(90).webp({ quality: 80 }).toFile(resolve(out, 'image5r-1280.webp'))
const buf6 = await sharp(resolve(out, 'image5-640.webp')).toBuffer()
await sharp(buf6).rotate(90).webp({ quality: 80 }).toFile(resolve(out, 'image5r-640.webp'))
console.log('rotated image5 ->', (await sharp(resolve(out, 'image5r-1280.webp')).metadata()).width, 'x', (await sharp(resolve(out, 'image5r-1280.webp')).metadata()).height)
