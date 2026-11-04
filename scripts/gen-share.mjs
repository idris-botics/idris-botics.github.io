// Per-project share previews, generated at build time (after `vite build`).
// For every project this writes dist/work/<slug>/index.html (the same app with its own title, description and og/twitter tags) and
// dist/og/<slug>.png (1200x630). A person who opens /work/<slug>/ is sent on to the real route (#work/<slug>) by work-redirect.js;
// link previews read the tags and never run it. Run with: node --experimental-strip-types scripts/gen-share.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { projects, tiles } from '../src/content.ts'

const dist = 'dist'
const base = process.env.VITE_BASE ?? '/'
const site = (process.env.SITE_URL ?? '').replace(/\/$/, '')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const wrap = (text, n) => { const out = []; let line = ''; for (const w of text.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w } else line = (line + ' ' + w).trim() } if (line) out.push(line); return out }

writeFileSync(join(dist, 'work-redirect.js'), `// A shared /work/<slug>/ link opens the real route.\n(function () { var m = location.pathname.match(/\\/work\\/([\\w-]+)\\/?$/); if (m) location.replace(location.pathname.replace(/\\/work\\/[\\w-]+\\/?$/, '/') + '#work/' + m[1]) })()\n`)
mkdirSync(join(dist, 'og'), { recursive: true })

for (const p of projects) {
  const title = p.title.en
  const desc = (tiles[p.slug]?.line?.en ?? p.blurb.en).replace(/\s+/g, ' ').slice(0, 200)
  const media = p.media?.[0]?.src ?? p.videos?.[0]?.poster
  const photo = media ? ['-1280', '-640'].map((w) => join('public/media/img', media + w + '.webp')).find(existsSync) : null
  // the card: sand paper, a photo in a charcoal-outlined frame on the left, the title on the right
  const lines = wrap(title, 24).slice(0, 4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect x="610" y="60" width="530" height="510" rx="24" fill="#fff8ea" stroke="#26221f" stroke-width="5"/>
    <text x="650" y="130" font-family="monospace" font-size="26" fill="#5e554b">${esc(String(projects.indexOf(p) + 1).padStart(2, '0'))} / ${esc(String(projects.length).padStart(2, '0'))}</text>
    ${lines.map((l, i) => `<text x="650" y="${200 + i * 62}" font-family="sans-serif" font-weight="700" font-size="52" fill="#26221f">${esc(l)}</text>`).join('')}
    <text x="650" y="520" font-family="sans-serif" font-size="30" fill="#26221f">Idris Sadiq</text>
    <rect x="650" y="538" width="120" height="8" fill="#ee6a4c"/></svg>`
  const layers = [{ input: Buffer.from(svg), top: 0, left: 0 }]
  if (photo) {
    const img = await sharp(photo).resize(490, 510, { fit: 'cover' }).png().toBuffer()
    layers.unshift({ input: await sharp(img).composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="490" height="510"><rect width="490" height="510" rx="18" fill="none" stroke="#26221f" stroke-width="4"/></svg>') }]).png().toBuffer(), top: 60, left: 70 })
  }
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#f6e7c8' } }).composite(layers).png().toFile(join(dist, 'og', `${p.slug}.png`))

  const url = `${site}${base}work/${p.slug}/`
  const img = `${site}${base}og/${p.slug}.png`
  let page = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} | Idris Sadiq</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)} | Idris Sadiq$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
  const extra = `    <meta property="og:url" content="${url}" />\n    <meta name="twitter:title" content="${esc(title)} | Idris Sadiq" />\n    <meta name="twitter:description" content="${esc(desc)}" />\n    <meta name="twitter:image" content="${img}" />\n    <link rel="canonical" href="${url}" />\n    <script src="${base}work-redirect.js"></script>\n`
  page = page.replace('</head>', extra + '  </head>')
  mkdirSync(join(dist, 'work', p.slug), { recursive: true })
  writeFileSync(join(dist, 'work', p.slug, 'index.html'), page)
}
console.log(`share previews: ${projects.length} pages and images`)
