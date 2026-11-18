// Writes public/scenery.svg (Calm) and public/scenery-chaos.svg (Chaos), the long background pictures, from src/sceneryArt.ts.
// Run with: npm run gen:scenery   (node --experimental-strip-types scripts/gen-scenery.mjs)
// Commit the results; src/sceneryArt.test.ts fails if a file and the drawing disagree.
import { writeFileSync } from 'node:fs'
import { scenerySvg } from '../src/sceneryArt.ts'

for (const [file, chaos] of [['public/scenery.svg', false], ['public/scenery-chaos.svg', true]]) {
  const svg = scenerySvg(chaos)
  writeFileSync(file, svg)
  console.log(`${file} written (${(svg.length / 1024).toFixed(1)} KB)`)
}
