import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production-only Content-Security-Policy meta tag (static hosting cannot set headers).
// Everything is self-hosted. The one exception: when VITE_GA_MEASUREMENT_ID is set at build time, Google Analytics hosts are allowed (and only then).
const ga = !!process.env.VITE_GA_MEASUREMENT_ID
const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    const policy = [
      "default-src 'self'",
      `script-src 'self'${ga ? ' https://www.googletagmanager.com' : ''}`,
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

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), siteUrl(), csp(), inlineCss(), preloadFonts()],
})
