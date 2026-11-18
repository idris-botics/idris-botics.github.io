import { Component, type ReactNode } from 'react'
import { hero, links } from './content'

type Lang = 'en' | 'ja'

// NEEDS-NATIVE-REVIEW: the Japanese wording below is a draft, like every other ja string.
const text = {
  failed: { en: 'This part could not be loaded. Check your connection and try again.', ja: 'この部分を読み込めませんでした。接続を確認して、もう一度お試しください。' },
  retry: { en: 'Try again', ja: 'もう一度試す' },
  appFailed: { en: 'Something went wrong on this page.', ja: 'このページで問題が発生しました。' },
  reload: { en: 'Reload the page', ja: 'ページを再読み込み' },
  emailMe: { en: 'Or email me:', ja: 'メールでのご連絡：' },
}

/**
 * A simulation or figure is a separate file that is fetched on demand. If it cannot be fetched (a weak connection, or a tab left
 * open across a deploy, when the old file names are gone) React throws, and without a boundary the whole page goes blank.
 * React.lazy remembers a failed import, so a soft retry does not work: the button reloads the page.
 */
export class LoadGuard extends Component<{ lang: Lang; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('A lazy part failed to load.', err) }
  render() {
    if (!this.state.failed) return this.props.children
    const { lang } = this.props
    return (
      <div className="surface" role="alert" style={{ padding: '1rem' }}>
        <p>{text.failed[lang]}</p>
        <button className="btn" onClick={() => location.reload()}>{text.retry[lang]}</button>
      </div>
    )
  }
}

/** Last resort around the whole app: plain markup with no dependency on app state, so the reader still gets a name and an email. */
export class AppGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('The page crashed.', err) }
  render() {
    if (!this.state.failed) return this.props.children
    const ja = document.documentElement.lang === 'ja'
    const lang: Lang = ja ? 'ja' : 'en'
    return (
      <main style={{ maxWidth: '36rem', margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }} role="alert">
        <h1>{hero.name}</h1>
        <p>{text.appFailed[lang]}</p>
        <p><button className="btn" onClick={() => location.reload()}>{text.reload[lang]}</button></p>
        <p>{text.emailMe[lang]} <a href={`mailto:${links.email}`}>{links.email}</a></p>
      </main>
    )
  }
}
