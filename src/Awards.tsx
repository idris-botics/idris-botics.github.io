import { ExternalLink } from 'lucide-react'
import { useStore } from './store'
import { honours, type Honour } from './content'

const TOP = 5
const ui = {
  title: { en: 'Publications and awards', ja: '論文・受賞' },
  pub: { en: 'Publications', ja: '論文' },
  award: { en: 'Awards and grants', ja: '受賞・助成' },
  all: { en: 'Show all', ja: 'すべて表示' },
}

/** Publications and awards: the top five as colourful cards, the rest in a list that opens in place. */
export default function Awards() {
  const lang = useStore((s) => s.lang)
  const t = (l: { en: string; ja: string }) => l[lang]
  // publications first, then awards; the first five become cards
  const ordered = [...honours.filter((h) => h.group === 'pub'), ...honours.filter((h) => h.group === 'award')]
  const top = ordered.slice(0, TOP), rest = ordered.slice(TOP)
  const base = import.meta.env.BASE_URL
  const card = (h: Honour, i: number) => (
    <li key={h.title.en} className={`award a${i % 5}`}>
      <span className="award-year">{h.year}</span>
      <h4>{t(h.title)}</h4>
      <p>{t(h.line)}</p>
      {h.link && <a href={base + h.link.href} target="_blank" rel="noopener noreferrer">{t(h.link.label)} <ExternalLink size={13} aria-hidden="true" /></a>}
    </li>
  )
  return (
    <section id="awards" className="sec" aria-labelledby="aw">
      <div className="wrap">
        <h2 id="aw">{t(ui.title)}</h2>
        {(['pub', 'award'] as const).map((g) => {
          const items = top.filter((h) => h.group === g)
          return items.length > 0 && (
            <div key={g} className="award-group">
              <h3>{t(ui[g])}</h3>
              <ul className="awards">{items.map((h) => card(h, top.indexOf(h)))}</ul>
            </div>
          )
        })}
        {rest.length > 0 && (
          <details className="award-more">
            <summary>{t(ui.all)} ({ordered.length})</summary>
            <ul>{ordered.map((h) => <li key={h.title.en}><span className="when">{h.year}</span> {t(h.title)}. {t(h.line)}{h.link && <> <a href={base + h.link.href} target="_blank" rel="noopener noreferrer">{t(h.link.label)}</a></>}</li>)}</ul>
          </details>
        )}
      </div>
    </section>
  )
}
