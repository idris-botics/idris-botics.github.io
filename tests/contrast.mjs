// WCAG contrast of the token pairs used for text (light is the only theme).
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const t = { bg: '#f6e7c8', card: '#fff8ea', panel: '#fff1d2', ink: '#26221f', muted: '#5e554b', link: '#2f5f9f', mustard: '#f2b441', coral: '#ee6a4c', mint: '#9ed9cb', sky: '#afcbea', blue: '#3f6fb5', line: '#d9c79f' }
const pairs = [
  ['ink on sand', t.ink, t.bg, 4.5], ['ink on cream', t.ink, t.card, 4.5], ['muted on sand', t.muted, t.bg, 4.5], ['muted on cream', t.muted, t.card, 4.5], ['muted on panel', t.muted, t.panel, 4.5],
  ['link blue on sand', t.link, t.bg, 4.5], ['link blue on cream', t.link, t.card, 4.5],
  ['ink on mustard tile', t.ink, t.mustard, 4.5], ['ink on mint tile', t.ink, t.mint, 4.5], ['ink on coral tile', t.ink, t.coral, 4.5], ['ink on sky tile', t.ink, t.sky, 4.5],
  ['ink on coral button', t.ink, t.coral, 4.5], ['cream on blue (mascot screen)', t.card, t.blue, 3],
  ['coral vs sand (graphics)', t.coral, t.bg, 1.8], ['ink outline vs sand', t.ink, t.bg, 3],
]
let bad = 0
for (const [label, a, b, min] of pairs) { const r = ratio(a, b); const ok = r >= min; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', label.padEnd(32), r.toFixed(2), '(min ' + min + ')') }
process.exit(bad ? 1 : 0)
