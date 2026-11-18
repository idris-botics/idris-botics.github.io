// Writes public/scenery.svg, the long background picture, from src/sceneryArt.ts.
// Run with: npm run gen:scenery   (node --experimental-strip-types scripts/gen-scenery.mjs)
// Commit the result; src/sceneryArt.test.ts fails if the file and the drawing disagree.
import { writeFileSync } from 'node:fs'
import { scenerySvg } from '../src/sceneryArt.ts'

const svg = scenerySvg()
writeFileSync('public/scenery.svg', svg)
console.log(`public/scenery.svg written (${(svg.length / 1024).toFixed(1)} KB)`)
