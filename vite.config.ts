import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Production-only Content-Security-Policy meta tag (static hosting cannot set headers).
// Everything is self-hosted. The one exception: when VITE_GA_MEASUREMENT_ID is set at build time, Google Analytics hosts are allowed (and only then).
const ga = !!process.env.VITE_GA_MEASUREMENT_ID
const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    // the one inline script (the guard from heroShell below) is allowed by its hash, never by 'unsafe-inline'
    const guard = /<script data-pre-guard>([\s\S]*?)<\/script>/.exec(html)
    const guardHash = guard ? ` 'sha256-${createHash('sha256').update(guard[1]).digest('base64')}'` : ''
    const policy = [
      "default-src 'self'",
      `script-src 'self'${guardHash}${ga ? ' https://www.googletagmanager.com' : ''}`,
      "style-src 'self' 'unsafe-inline'", // React inline style attributes
      `img-src 'self' data:${ga ? ' https://*.google-analytics.com https://*.googletagmanager.com' : ''}`,
      "media-src 'self'",
      "frame-src 'none'",
      "font-src 'self' data:",
      `connect-src 'self'${ga ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' : ''}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
  },
})

// Social cards need an absolute image address. CI sets SITE_URL (for example https://<user>.github.io); without it the address stays relative.
const siteUrl = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', (process.env.SITE_URL ?? '').replace(/\/$/, '')),
})

// The one stylesheet is small (about 15 kB). A linked stylesheet blocks the first paint until it arrives (Lighthouse estimated 300 ms on a slow
// connection), so the built page carries it inline instead. The Chaos stylesheet is separate and loads with the Chaos code.
const inlineCss = (): Plugin => ({
  name: 'inline-css',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const bundle = ctx.bundle
      if (!bundle) return html
      return html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g, (tag, href: string) => {
        const file = href.split('/').pop() ?? ''
        const asset = Object.values(bundle).find((o) => o.type === 'asset' && o.fileName.endsWith(file))
        return asset && asset.type === 'asset' && typeof asset.source === 'string' ? `<style>${asset.source}</style>` : tag
      })
    },
  },
})

// The fonts the first screen uses are fetched with the page, not discovered after the stylesheet. Otherwise the text is laid out in the fallback font and
// the whole page is laid out again as each font arrives (measured: half of the first-load layout time on a slow phone).
const preloadFonts = (): Plugin => {
  let base = '/'
  return {
    name: 'preload-fonts',
    apply: 'build',
    configResolved(config) { base = config.base },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const used = /(^|\/)(space-grotesk-latin-wght|ibm-plex-sans-latin-(400|500|600)|ibm-plex-mono-latin-400)-normal[^/]*\.woff2$/
        const links = Object.values(bundle)
          .filter((o) => o.type === 'asset' && used.test(o.fileName))
          .map((o) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}${o.fileName}" />`)
          .join('\n    ')
        return links ? html.replace('</head>', `    ${links}\n  </head>`) : html
      },
    },
  }
}

// The first screen (header and hero) is written into index.html as static HTML, so it paints before any script has run. src/heroShell.html is
// generated from the running app (npm run gen:shell). The app replaces it when it starts. Readers who would get something else (Japanese, or a
// project page) never see it: a few lines remove it before the first paint, so the page does not show the wrong language and then change.
const guardScript = "(function(){var r=document.getElementById('root'),l='',m=/[?&]lang=(en|ja)/.exec(location.search);try{l=localStorage.getItem('lang')||''}catch(e){}if(m)l=m[1];if(l!=='en'&&l!=='ja')l=/^ja/i.test(navigator.language||'')?'ja':'en';if(l!=='en'||location.hash.indexOf('#work/')===0){r.textContent='';r.removeAttribute('data-pre')}})()"
const heroShell = (): Plugin => {
  let base = '/'
  return {
    name: 'hero-shell',
    apply: 'build',
    configResolved(config) { base = config.base },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const file = fileURLToPath(new URL('./src/heroShell.html', import.meta.url))
        if (!existsSync(file)) return html
        const shell = readFileSync(file, 'utf8').replaceAll('__BASE__', base).trim()
        return html.replace('<div id="root"></div>', `<div id="root" data-pre>
${shell}
    </div>
    <script data-pre-guard>${guardScript}</script>`)
      },
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), siteUrl(), heroShell(), csp(), inlineCss(), preloadFonts()],
})
