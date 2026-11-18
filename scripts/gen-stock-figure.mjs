// Draws the Live Stock Viewer overview (shop PC, cloud app, dealers, backup, admin) in the site's own look, writes docs/figures/stocksite-flow.svg
// and the site pictures public/media/img/stocksite-flow-{640,1280}.webp. It is a diagram, not a screenshot. Run: node scripts/gen-stock-figure.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const INK = '#26221f', CARD = '#fff8ea', SAND = '#f6e7c8', CORAL = '#ee6a4c', MUSTARD = '#f2b441', MINT = '#9ed9cb', SKY = '#afcbea'
const F = 'font-family="Space Grotesk, Arial, Helvetica, sans-serif"'
const box = (x, y, w, h, head, fill, lines) => `
  <rect x="${x + 8}" y="${y + 8}" width="${w}" height="${h}" rx="22" fill="${INK}"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${CARD}" stroke="${INK}" stroke-width="5"/>
  <path d="M${x} ${y + 62} V${y + 22} a22 22 0 0 1 22 -22 H${x + w - 22} a22 22 0 0 1 22 22 V${y + 62} Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <text x="${x + w / 2}" y="${y + 43}" text-anchor="middle" ${F} font-weight="700" font-size="28" letter-spacing="3" fill="${INK}">${head}</text>
  ${lines.map(([t, size, weight], i) => `<text x="${x + w / 2}" y="${y + 112 + i * 44 + (i > 0 ? (lines[0][1] - 30) : 0)}" text-anchor="middle" ${F} font-weight="${weight}" font-size="${size}" fill="${INK}">${t}</text>`).join('')}`
const arrow = (d, label, lx, ly) => `
  <path d="${d}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/>
  <path d="${d}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#h)" stroke-dasharray="26 12"/>
  <text x="${lx}" y="${ly}" text-anchor="middle" ${F} font-weight="600" font-size="24" fill="${INK}" paint-order="stroke" stroke="${SAND}" stroke-width="10" stroke-linejoin="round">${label}</text>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <defs><marker id="h" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z" fill="${INK}"/></marker></defs>
  <rect width="1280" height="800" fill="${SAND}"/>
  ${box(50, 80, 280, 270, 'SHOP PC', MUSTARD, [['Tally', 52, 700], ['accounting software', 28, 500], ['Python sync agent', 28, 500]])}
  ${box(500, 80, 280, 270, 'CLOUD APP', SKY, [['Flask + SQLite', 35, 700], ['hosted on Render', 28, 500], ['behind Cloudflare', 28, 500]])}
  ${box(950, 80, 280, 270, 'DEALERS', MINT, [['Live stock', 46, 700], ['browse, search', 28, 500], ['photos in order', 28, 500]])}
  ${box(500, 470, 280, 250, 'GOOGLE DRIVE', CORAL, [['Nightly backup', 34, 700], ['data and images', 28, 500], ['trash, never delete', 28, 500]])}
  ${box(950, 470, 280, 250, 'ADMINS', MUSTARD, [['Usage charts', 37, 700], ['who uses it, when', 28, 500]])}
  ${arrow('M342 215 H488', 'every 3 min', 415, 176)}
  ${arrow('M792 215 H938', 'live', 865, 176)}
  ${arrow('M620 362 V458', 'nightly', 560, 418)}
  ${arrow('M720 362 V404 H1090 V458', '', 0, 0)}
</svg>
`
mkdirSync('docs/figures', { recursive: true })
writeFileSync('docs/figures/stocksite-flow.svg', svg)
for (const w of [640, 1280]) await sharp(Buffer.from(svg), { density: 96 * (w / 1280) * 1.0 }).resize({ width: w }).webp({ quality: 86, effort: 5 }).toFile(`public/media/img/stocksite-flow-${w}.webp`)
console.log('wrote docs/figures/stocksite-flow.svg and public/media/img/stocksite-flow-{640,1280}.webp')
