// WCAG contrast of the token pairs used for text, in the light and the dark theme.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const themes = {
  light: { bg: '#f4f2ee', card: '#fbfaf8', panel: '#e8e6e1', ink: '#1c1b19', muted: '#65615a', accentText: '#b93a0a', accent: '#ee4f10', onAccent: '#1c1b19', line: '#d9d5ce' },
  dark: { bg: '#14161a', card: '#1e2128', panel: '#0b0d12', ink: '#f2f1ec', muted: '#a8acb4', accentText: '#ff7a45', accent: '#ff7a45', onAccent: '#14161a', line: '#3a3f47' },
}
let bad = 0
for (const [name, t] of Object.entries(themes)) {
  const pairs = [['ink on bg', t.ink, t.bg, 4.5], ['ink on card', t.ink, t.card, 4.5], ['muted on bg', t.muted, t.bg, 4.5], ['muted on card', t.muted, t.card, 4.5], ['muted on panel', t.muted, t.panel, 4.5], ['accent text on bg', t.accentText, t.bg, 4.5], ['accent text on card', t.accentText, t.card, 4.5], ['on-accent on accent (buttons)', t.onAccent, t.accent, 4.5], ['accent vs bg (graphics)', t.accent, t.bg, 3], ['line vs bg (borders)', t.line, t.bg, 1.2]]
  for (const [label, a, b, min] of pairs) { const r = ratio(a, b); const ok = r >= min; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(5), label.padEnd(32), r.toFixed(2), '(min ' + min + ')') }
}
process.exit(bad ? 1 : 0)
