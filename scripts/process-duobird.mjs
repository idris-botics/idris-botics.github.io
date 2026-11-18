// Cuts the Duolingo owl out of its white background and writes small web-ready pictures next to the streak in About.
// Usage: node scripts/process-duobird.mjs ../source-media/photos/duobird.png
// The white outside the owl is removed by a flood fill from the edges, so the white of its eyes stays. Writes public/media/img/duo-owl-96.webp and -144.webp.
import sharp from 'sharp'

const src = process.argv[2] ?? '../source-media/photos/duobird.png'
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info
const near = (i) => Math.min(data[i], data[i + 1], data[i + 2]) >= 236 // near white
const seen = new Uint8Array(w * h)
const stack = []
const push = (x, y) => { const k = y * w + x; if (x < 0 || y < 0 || x >= w || y >= h || seen[k] || !near(k * 4)) return; seen[k] = 1; stack.push(k) }
for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
while (stack.length) { const k = stack.pop(); const x = k % w, y = (k - x) / w; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1) }
// transparent where the flood reached; a soft edge on the pixels just inside it (their whiteness decides how opaque they are)
for (let k = 0; k < w * h; k++) {
  const i = k * 4
  if (seen[k]) { data[i + 3] = 0; continue }
  const x = k % w, y = (k - x) / w
  const touches = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && seen[ny * w + nx] })
  if (touches) { const m = Math.min(data[i], data[i + 1], data[i + 2]); data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (255 - m) / 110))) }
}
const base = sharp(data, { raw: { width: w, height: h, channels: 4 } })
for (const s of [96, 144]) {
  await base.clone().trim().resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(`public/media/img/duo-owl-${s}.webp`)
}
console.log('public/media/img/duo-owl-96.webp and duo-owl-144.webp written')
