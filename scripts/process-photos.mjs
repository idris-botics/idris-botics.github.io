// Round 5 photos: AVIF + WebP + JPG at two sizes, EXIF/GPS stripped (sharp drops metadata unless asked to keep it), plus the video posters as WebP.
// Run from robotics-portfolio: node scripts/process-photos.mjs
import sharp from 'sharp'
import { existsSync } from 'node:fs'

const out = 'public/media/img'
const src = '../whimsy photo.jpeg'
for (const w of [480, 960]) {
  const base = sharp(src).rotate().resize({ width: w })
  await base.clone().avif({ quality: 55 }).toFile(`${out}/idris-whimsy-${w}.avif`)
  await base.clone().webp({ quality: 76 }).toFile(`${out}/idris-whimsy-${w}.webp`)
  await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${out}/idris-whimsy-${w}.jpg`)
}
for (const n of ['cat', 'soccer-run', 'cena', 'rick', 'tell-me']) {
  const f = `${out}/${n}-poster.jpg`
  if (existsSync(f)) await sharp(f).webp({ quality: 72 }).toFile(`${out}/${n}-poster.webp`)
}
console.log('photos done')
