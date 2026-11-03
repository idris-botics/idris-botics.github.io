// Fails when any caption slot is still an unreviewed draft. Run in CI with CHECK_STRICT=1.
import { readFileSync } from 'node:fs'
let bad = 0
let total = 0
for (const lang of ['en', 'ja']) {
  const slots = JSON.parse(readFileSync(`src/content/jokes/${lang}.json`, 'utf8'))
  for (const s of slots) {
    total++
    const reviewed = s.custom.trim() !== '' || s.selected !== null
    if (!reviewed) {
      bad++
      if (process.env.CHECK_STRICT === '1') console.error(`UNREVIEWED ${lang}/${s.id}`)
    }
  }
}
// hints.json: every text object needs an English and a Japanese string
const hints = { hints: JSON.parse(readFileSync('src/content/jokes/hints.json', 'utf8')), narrators: JSON.parse(readFileSync('src/content/jokes/narrators.json', 'utf8')), hintbot: JSON.parse(readFileSync('src/content/jokes/hintbot.json', 'utf8')) }
let missing = 0
const walk = (v, path) => {
  if (v && typeof v === 'object') {
    if (typeof v.en === 'string' || typeof v.ja === 'string') { if (!String(v.en ?? '').trim() || !String(v.ja ?? '').trim()) { console.error(`HINT missing en or ja: ${path}`); missing++ } }
    else for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`)
  }
}
walk(hints, 'jokes')
if (missing) process.exit(1)
console.log(`${total - bad}/${total} caption slots reviewed`)
if (bad && process.env.CHECK_STRICT === '1') process.exit(1)
