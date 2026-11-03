import { FileText } from 'lucide-react'
import { useStore } from './store'
import { personal, openFields } from './personal'

const dev = import.meta.env.DEV

/** Dashed placeholder box. Visible only while developing; renders nothing in production. */
export function Open({ label, hint }: { label: string; hint?: string }) {
  if (!dev) return null
  return (
    <div className="open" role="note">
      <strong>OPEN</strong> {label}
      {hint && <div className="open-hint">{hint}</div>}
    </div>
  )
}

export function ProjectOpen({ slug }: { slug: string }) {
  const items = openFields[slug]
  if (!dev || !items?.length) return null
  return <>{items.map((i) => <Open key={i} label={i} />)}</>
}

/** CV download. The button appears once a file is configured; until then a dev-only placeholder shows. */
export function Documents() {
  const lang = useStore((s) => s.lang)
  const base = import.meta.env.BASE_URL
  return (
    <>
      {personal.cv.en && (
        <a className="btn" style={{ color: 'inherit' }} href={base + personal.cv.en} download>
          <FileText size={14} /> {lang === 'en' ? 'Download CV (PDF)' : '履歴書をダウンロード（PDF）'}
        </a>
      )}
      {!personal.cv.en && <Open label="CV PDF (English)" hint="Put it in public/cv/ and set personal.cv.en" />}
    </>
  )
}
