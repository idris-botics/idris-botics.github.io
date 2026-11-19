import { useRef, useState } from 'react'
import { foundIds, mergeFound } from './achievementsStore'
import { readSaveCode, saveCodeFor } from './progressCode'

type L = { en: string; ja: string }
type Lang = 'en' | 'ja'
const T = {
  quiet: { en: 'Progress is saved on this device. Use Save progress to carry it elsewhere.', ja: '進み具合はこの端末に保存されています。ほかの端末へ移すには「進捗を保存」を使ってください。' },
  save: { en: 'Save progress', ja: '進捗を保存' },
  restore: { en: 'Restore progress', ja: '進捗を復元' },
  codeLabel: { en: 'Your save code', ja: 'あなたのセーブコード' },
  copy: { en: 'Copy', ja: 'コピー' },
  copied: { en: 'Copied.', ja: 'コピーしました。' },
  copyByHand: { en: 'The code is selected: copy it by hand.', ja: 'コードを選択しました。手動でコピーしてください。' },
  fieldLabel: { en: 'Paste a save code', ja: 'セーブコードを貼り付け' },
  go: { en: 'Restore', ja: '復元' },
  bad: { en: 'That code does not look right. Check it for a typo and try again.', ja: 'そのコードは正しくないようです。打ち間違いがないか確認して、もう一度お試しください。' },
  none: { en: 'There is nothing in that code.', ja: 'そのコードには何も入っていません。',},
  nothingNew: { en: 'Nothing new: you already have all of those.', ja: '新しいものはありません。すべて取得済みです。' },
} satisfies Record<string, L>

const restored = (n: number, lang: Lang) => (lang === 'en' ? `Restored ${n} ${n === 1 ? 'achievement' : 'achievements'}.` : `実績を${n}個復元しました。`)
const skipped = (n: number, lang: Lang) => (lang === 'en' ? ` ${n} from a newer version ${n === 1 ? 'was' : 'were'} skipped.` : ` 新しい版の${n}個は読み飛ばしました。`)

/**
 * Mission Control: carry progress to another browser or device, or bring it back. Everything happens on this device; the code is only text.
 * Restoring merges: it adds achievements and never removes any.
 */
export default function ProgressTools({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<'none' | 'save' | 'restore'>('none')
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [msg, setMsg] = useState('')
  const box = useRef<HTMLInputElement>(null)

  const open = (m: 'save' | 'restore') => {
    if (mode === m) { setMode('none'); setMsg(''); return }
    setMode(m); setMsg('')
    if (m === 'save') setCode(saveCodeFor(foundIds()))
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setMsg(T.copied[lang]); return } catch { /* no clipboard permission: fall through */ }
    try { box.current?.select(); if (document.execCommand('copy')) { setMsg(T.copied[lang]); return } } catch { /* ignore */ }
    box.current?.select()
    setMsg(T.copyByHand[lang])
  }
  const run = () => {
    const r = readSaveCode(typed)
    if (!r.ok) { setMsg(r.reason === 'empty' ? T.none[lang] : T.bad[lang]); return }
    const added = mergeFound(r.ids)
    const extra = r.ignored ? skipped(r.ignored, lang) : ''
    setMsg((added > 0 ? restored(added, lang) : r.ids.length ? T.nothingNew[lang] : T.none[lang]) + extra)
    if (added > 0) setTyped('')
  }

  return (
    <div className="hb-progress">
      <p className="hb-quiet">{T.quiet[lang]}</p>
      <div className="hb-progress-opts">
        <button type="button" className="btn" aria-expanded={mode === 'save'} onClick={() => open('save')}>{T.save[lang]}</button>
        <button type="button" className="btn" aria-expanded={mode === 'restore'} onClick={() => open('restore')}>{T.restore[lang]}</button>
      </div>
      {mode === 'save' && (
        <div className="hb-code">
          <input ref={box} readOnly value={code} aria-label={T.codeLabel[lang]} onFocus={(e) => e.currentTarget.select()} spellCheck={false} />
          <button type="button" className="btn" onClick={copy}>{T.copy[lang]}</button>
        </div>
      )}
      {mode === 'restore' && (
        <form className="hb-code" onSubmit={(e) => { e.preventDefault(); run() }}>
          <input value={typed} onChange={(e) => { setTyped(e.target.value); setMsg('') }} placeholder="IDRIS-XXXX-XXX" aria-label={T.fieldLabel[lang]} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" />
          <button type="submit" className="btn">{T.go[lang]}</button>
        </form>
      )}
      <p className="hb-quiet" role="status" aria-live="polite">{msg}</p>
    </div>
  )
}
