import type { L } from '../content'

/**
 * stepscribe-cad: version history and the v2 page content, in one place so it is quick to update when v2 ships.
 *
 * When v2 is released:
 *  1. set `v2.state` to 'released', fill in `v2.released` (for example '2026-12') and `v2.version`;
 *  2. move the "what is new" lines into `changelog` as a new entry (newest first);
 *  3. add screenshots to public/media/img (640 and 1280 wide WebP) and list them in `screenshots`.
 * Anything left empty is not shown on the site.
 */
export type Release = { version: string; state: 'released' | 'in development'; when?: string; note: L; notes?: L[] }

export const stepscribe: {
  releases: Release[]
  whatsNewInV2: L[]
  changelog: { version: string; when: string; changes: L[] }[]
  screenshots: { src: string; w: number; h: number; alt: L; caption?: L }[]
} = {
  releases: [
    {
      version: 'v2',
      state: 'in development',
      note: { en: 'The next major version. In development.', ja: '次のメジャーバージョン。開発中です。' },
    },
    {
      version: 'v0.1.x',
      state: 'released',
      note: { en: 'Released on PyPI as stepscribe-cad.', ja: 'PyPIに stepscribe-cad として公開済み。' },
    },
  ],
  // TODO(idris): what is new in v2, one short line each. Hidden until filled in.
  whatsNewInV2: [],
  // TODO(idris): changelog entries for v0.1.x (version, month, changes). Hidden until filled in.
  changelog: [],
  // TODO(idris): screenshots of v2. Hidden until added.
  screenshots: [],
}
