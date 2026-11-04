import { useState } from 'react'

/**
 * Phones have no keyboard for the typed secrets, so the corner menu holds a small command box: type a word, or tap a chip.
 * It sends the letters as key presses, so a typed word and a tapped chip run exactly the same secret. Hidden unless the corner menu is open.
 */
const CHIPS = ['cat', 'idris', 'coffee', 'roll'] as const
export default function CommandBox({ lang, run }: { lang: 'en' | 'ja'; run: (word: string) => void }) {
  const [text, setText] = useState('')
  const go = (w: string) => { const word = w.trim().toLowerCase(); if (word) run(word) }
  return (
    <form className="cmdbox" onSubmit={(e) => { e.preventDefault(); go(text); setText('') }} aria-label={lang === 'en' ? 'Command box' : 'コマンドボックス'}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === 'en' ? 'Type a word' : '言葉を入力'} aria-label={lang === 'en' ? 'Type a word' : '言葉を入力'} autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" />
      <button className="btn" type="submit">{lang === 'en' ? 'Go' : '実行'}</button>
      <div className="cmd-chips">
        {CHIPS.map((c) => <button key={c} type="button" className="btn chip" onClick={() => run(c)}>{c}</button>)}
      </div>
    </form>
  )
}
