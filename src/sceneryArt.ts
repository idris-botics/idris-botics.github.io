/**
 * The long background picture, written as plain SVG text. `npm run gen:scenery` turns this into public/scenery.svg, which the page
 * shows with an <img> (see Scenery.tsx). Edit the drawing here, run that command, and commit both files; a test fails if they differ.
 *
 * Why a file and not markup in the page: the picture has about 650 shapes. As part of the page they would be 650 extra DOM nodes
 * for React to create, style and lay out at load, which cost a third of a second of main-thread time on a slow phone. As an image
 * file the page sees one element.
 *
 * It is a quiet landscape in the site's own colours (sand, sky, mint, coral, mustard) turned down: a soft apricot dusk with the sun,
 * a few stars and a tiny rocket at the top; a sea of clouds with floating islands and waterfalls; a mountain; a lake; and a meadow
 * where a small robot looks out at the view. A faint dotted trail links the robot to the rocket. The top of the picture is where
 * the page starts; the meadow is the arrival at the end. A cream veil is part of the drawing, so text on it keeps its contrast.
 *
 * Plain TypeScript with no JSX, so Node can run it directly (node --experimental-strip-types).
 */

type Attrs = Record<string, string | number | undefined>
const attrs = (o: Attrs) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => ` ${k}="${v}"`).join('')
const el = (tag: string, o: Attrs = {}, ...kids: string[]) => (kids.length ? `<${tag}${attrs(o)}>${kids.join('')}</${tag}>` : `<${tag}${attrs(o)}/>`)
const g = (o: Attrs, ...kids: string[]) => el('g', o, ...kids)
const at = (x: number, y: number, s = 1, r = 0) => ({ transform: `translate(${x} ${y})${r ? ` rotate(${r})` : ''}${s !== 1 ? ` scale(${s})` : ''}` })
const r1 = (n: number) => Math.round(n * 10) / 10

// a small seeded random, so the flowers and stars are the same every time
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

type Tone = { shade: string; mid: string; light: string }
const DAY: Tone = { shade: '#d0dce8', mid: '#edf1f3', light: '#fafcfc' }
const DUSK: Tone = { shade: '#e6c0c4', mid: '#fbe6dd', light: '#fff7ef' }
const PUFFS: [number, number, number][] = [[0, 0, 62], [78, -40, 84], [160, -18, 70], [228, 8, 54], [-62, 18, 46], [110, 30, 74], [30, 30, 60], [190, 34, 50]]

/** A cumulus: three layers of the same lumps (shade, body, lit top) give it volume without any outline. */
const cloud = (x: number, y: number, s = 1, tone: Tone = DAY, o = 1) =>
  g(at(x, y, s), g({ opacity: o === 1 ? undefined : o },
    g({ fill: tone.shade }, ...PUFFS.map(([cx, cy, r]) => el('circle', { cx, cy: cy + 16, r })), el('ellipse', { cx: 100, cy: 58, rx: 190, ry: 30 })),
    g({ fill: tone.mid }, ...PUFFS.map(([cx, cy, r]) => el('circle', { cx, cy: cy + 4, r: r - 2 })), el('ellipse', { cx: 100, cy: 48, rx: 184, ry: 26 })),
    g({ fill: tone.light }, ...PUFFS.slice(0, 6).map(([cx, cy, r]) => el('circle', { cx: cx - 8, cy: cy - 12, r: r - 14 })))))

const bird = (x: number, y: number, s = 1) =>
  g(at(x, y, s), el('path', { d: 'M-22 2 Q-11 -12 0 2 Q11 -12 22 2', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.85, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))

const spark = (x: number, y: number, s = 1) => g(at(x, y, s), el('path', { d: 'M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z', fill: '#fffaf0' }))

/** A floating island: grass on top, rock below, a waterfall off one edge. The origin is the middle of the grass edge. */
const island = (x: number, y: number, s = 1, fall = 0, extra = '') =>
  g(at(x, y, s),
    fall > 0 ? el('rect', { x: 72, y: 14, width: 15, height: fall, fill: 'url(#sc-fall)' }) : '',
    el('path', { d: 'M-132 4 L132 4 L108 52 L92 86 L64 150 L36 214 L8 268 L-16 212 L-52 156 L-92 96 L-116 48 Z', fill: 'url(#sc-rock)' }),
    el('path', { d: 'M-132 4 L-16 4 L8 268 L-16 212 L-52 156 L-92 96 L-116 48 Z', fill: '#fff', opacity: 0.18 }),
    el('path', { d: 'M8 4 L132 4 L108 52 L92 86 L64 150 L36 214 L8 268 Z', fill: '#6b6f95', opacity: 0.16 }),
    el('path', { d: 'M-138 6 C -100 -26, 100 -26, 138 6 C 100 24, -100 24, -138 6 Z', fill: 'url(#sc-grass)' }),
    extra)

const rect = (x: number, y: number, width: number, height: number, fill: string, rx?: number) => el('rect', { x, y, width, height, rx, fill })
const circle = (cx: number, cy: number, r: number, fill: string, opacity?: number) => el('circle', { cx, cy, r, fill, opacity })
const path = (d: string, fill: string, opacity?: number) => el('path', { d, fill, opacity })
const stop = (offset: number, color: string, opacity?: number) => el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })
const vgrad = (id: string, ...stops: string[]) => el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, ...stops)

const flowers = (() => {
  const r = rng(7)
  return Array.from({ length: 40 }, () => { const y = 3500 + r() * 480; return { x: 20 + r() * 960, y, r: 2 + r() * 2.4 + (y - 3500) / 260, c: ['#fffdf5', '#fff1b8', '#fbd9d6', '#fffdf5'][Math.floor(r() * 4)] } })
})()
const grass = (() => { const r = rng(11); return Array.from({ length: 22 }, () => ({ x: 10 + r() * 980, y: 3500 + r() * 480, h: 10 + r() * 12 })) })()
const stars = (() => { const r = rng(3); return Array.from({ length: 22 }, () => ({ x: 20 + r() * 960, y: 20 + r() * 420, s: 0.35 + r() * 0.6, spark: r() > 0.75 })) })()

const MOUNTAIN = g({ id: 'sc-mountain' },
  path('M110 3170 L250 2960 L330 2860 L420 2700 L490 2540 L560 2330 L612 2480 L670 2580 L760 2740 L850 2890 L940 3030 L1000 3170 Z', 'url(#sc-peak)'),
  path('M560 2330 L490 2540 L420 2700 L330 2860 L250 2960 L110 3170 L330 3170 L400 2980 L470 2790 L520 2600 Z', '#fff', 0.24),
  path('M560 2330 L612 2480 L670 2580 L760 2740 L850 2890 L940 3030 L1000 3170 L700 3170 L640 2900 L600 2700 L570 2540 Z', '#6f84ab', 0.2),
  path('M560 2330 L520 2440 L546 2452 L566 2420 L590 2470 L612 2480 L590 2420 Z', '#fff'),
  path('M490 2540 L520 2440 L546 2452 L530 2520 L508 2500 Z', '#fff', 0.9),
  path('M100 3170 C 200 3050, 300 3080, 380 3040 S 560 3060, 640 3030 S 860 3050, 1000 3000 V3170 Z', 'url(#sc-forest)'))

const DEFS = el('defs', {},
  // one sky from the top (apricot dusk) down to the horizon (sand); the blue in the middle is the Chaos side's blue (#7cc8ff), a touch deeper here because the veil lightens it
  vgrad('sc-sky', stop(0, '#dbbccb'), stop(0.1, '#efcdc3'), stop(0.2, '#f3d7c4'), stop(0.3, '#cdd9f0'), stop(0.42, '#94d0ff'), stop(0.58, '#6ab9fb'), stop(0.72, '#9bd5fc'), stop(0.82, '#f1e6cc')),
  el('radialGradient', { id: 'sc-sun' }, stop(0, '#fff3cf', 0.95), stop(0.35, '#fbd9b0', 0.5), stop(1, '#f6c4b4', 0)),
  vgrad('sc-ray', stop(0, '#fff', 0.32), stop(1, '#fff', 0)),
  vgrad('sc-rock', stop(0, '#cdcbdc'), stop(1, '#a4abc6')),
  vgrad('sc-grass', stop(0, '#d7e8ac'), stop(1, '#b2d394')),
  vgrad('sc-fall', stop(0, '#fff', 0.9), stop(1, '#fff', 0.3)),
  vgrad('sc-peak', stop(0, '#e6edf5'), stop(0.5, '#bccbdf'), stop(1, '#a5b8d1')),
  vgrad('sc-forest', stop(0, '#a9cfae'), stop(1, '#c3dfb2')),
  vgrad('sc-mist', stop(0, '#eef6f8', 0), stop(1, '#eef6f8', 0.95)),
  vgrad('sc-lake', stop(0, '#d6edee'), stop(0.5, '#a9d8de'), stop(1, '#8cc7d4')),
  vgrad('sc-hill1', stop(0, '#dfe8ae'), stop(1, '#c3d795')),
  vgrad('sc-hill2', stop(0, '#cbdf9f'), stop(1, '#a9c985')),
  vgrad('sc-hill3', stop(0, '#bfd899'), stop(1, '#a6c783')),
  // the veil over the picture: cream over the dusk and the meadow, a pale blue-white over the sky band, so the sky stays near the Chaos blue
  vgrad('sc-veil', stop(0, '#fff8ea', 0.3), stop(0.26, '#fff8ea', 0.3), stop(0.34, '#eef7ff', 0.34), stop(0.76, '#eef7ff', 0.34), stop(0.84, '#fff8ea', 0.3), stop(1, '#fff8ea', 0.3)),
  // a slight blue multiply over the sky band only: cloud whites drop a little so the cream cards on top read warmer than the clouds
  vgrad('sc-tint', stop(0, '#7cc8ff', 0), stop(0.28, '#7cc8ff', 0), stop(0.38, '#7cc8ff', 0.16), stop(0.74, '#7cc8ff', 0.16), stop(0.82, '#7cc8ff', 0)),
  el('clipPath', { id: 'sc-lakeclip' }, el('rect', { x: 0, y: 3170, width: 1000, height: 260 })),
  MOUNTAIN)

const workshop = g({},
  rect(-58, -62, 54, 44, '#fff8ea'), path('M-66 -62 L-31 -92 L4 -62 Z', '#e98a72'), rect(-46, -44, 16, 26, '#7ea3cf'), rect(-14, -92, 10, 22, '#e98a72'),
  rect(40, -44, 9, 26, '#c9a068'), circle(44, -62, 26, '#9ccaa0'), circle(30, -50, 18, '#b0d8ae'), circle(60, -52, 17, '#b0d8ae'))
const tree = g({}, rect(-14, -42, 9, 24, '#c9a068'), circle(-9, -58, 26, '#9ccaa0'), circle(-26, -46, 17, '#b0d8ae'), circle(8, -46, 17, '#b0d8ae'))

const shadow = (cx: number, cy: number, rx: number) => el('ellipse', { cx, cy, rx, ry: rx * 0.2, fill: '#5f8a47', opacity: 0.3 })

const inked = (x: number, y: number, width: number, height: number, fill: string, rx: number) => el('rect', { x, y, width, height, rx, fill, stroke: '#26221f', 'stroke-width': 3.5 })
const robotAt = (x: number, y: number, s: number) => g(at(x, y, s),
  shadow(2, 3, 38),
  inked(-36, -38, 12, 30, '#e9b34e', 6), inked(26, -38, 12, 30, '#e9b34e', 6),
  inked(-26, -44, 54, 44, '#e9b34e', 10),
  el('path', { d: 'M0 -86 V-104', stroke: '#26221f', 'stroke-width': 3.5, 'stroke-linecap': 'round' }), el('circle', { cx: 0, cy: -108, r: 6, fill: '#e8704f', stroke: '#26221f', 'stroke-width': 3 }),
  inked(-22, -86, 46, 40, '#fff8ea', 12), inked(-17, -80, 36, 22, '#5f8fc9', 7), circle(-6, -69, 4.2, '#fff8ea'), circle(8, -69, 4.2, '#fff8ea'))

/** A rocket. The tiny one at the top is in flight (with a flame); the one at the end stands on its pad. */
const rocketAt = (x: number, y: number, s: number, r = 0, flame = false) => g(at(x, y, s, r),
  flame ? path('M-12 22 Q0 76 12 22 Z', '#f4b073') + path('M-6 22 Q0 52 6 22 Z', '#fff0b8') : '',
  path('M-26 8 L-46 40 L-26 34 Z', '#efc16a'), path('M26 8 L46 40 L26 34 Z', '#efc16a'),
  path('M0 -92 C 26 -62 30 -24 28 24 L-28 24 C -30 -24 -26 -62 0 -92 Z', '#fff8ea'),
  path('M0 -92 C 13 -77 21 -62 25 -48 L-25 -48 C -21 -62 -13 -77 0 -92 Z', '#e98a72'),
  circle(0, -18, 12, '#7ea3cf'), circle(-4, -22, 3.5, '#fff8ea'))

/** The end of the journey: a small workshop with an antenna, the robot, and a rocket on its pad, all on one closed hill. */
const shed = (x: number, y: number, s: number) => g(at(x, y, s),
  shadow(-8, 3, 76),
  rect(-60, -52, 100, 52, '#fff8ea', 4), path('M-72 -52 L-10 -94 L52 -52 Z', '#e98a72'),
  rect(18, -84, 10, 28, '#d8765d'), rect(-10, -34, 22, 34, '#7ea3cf', 3), rect(-48, -40, 24, 20, '#f6d98c', 3),
  el('path', { d: 'M-10 -94 V-112', stroke: '#8a7a66', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  el('path', { d: 'M-22 -116 Q-10 -128 2 -116', fill: 'none', stroke: '#8a7a66', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  circle(-10, -108, 3.5, '#e8704f'))

const pad = (x: number, y: number) => g(at(x, y),
  shadow(0, 3, 74),
  rect(-62, -10, 124, 12, '#d8c8a2', 4), rect(-62, -10, 124, 4, '#e8dcbc', 2),
  el('path', { d: 'M-54 -10 V-92 H-34 M-54 -52 H-38', fill: 'none', stroke: '#b7a47c', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))

/** A small ringed planet in the dusk, up in the left margin. */
const planet = (x: number, y: number) => g(at(x, y, 1, -16),
  circle(0, 0, 34, '#f1c7a6'),
  el('path', { d: 'M-28 -10 Q0 -20 28 -10 M-33 6 Q0 -8 33 6', fill: 'none', stroke: '#e8b08e', 'stroke-width': 5, 'stroke-linecap': 'round' }),
  el('ellipse', { rx: 62, ry: 14, fill: 'none', stroke: '#efc16a', 'stroke-width': 6, opacity: 0.95 }))

const OX = 500 // the drawing is 1000 wide; it sits in the middle of a canvas twice as wide, so everything is drawn at half the size
const ROBOT_X = 548 + OX
const GROUND_Y = 3962 // where everything at the end of the picture stands
const TRAIL_PATH = `M${578 + OX} 3646 C ${612 + OX} 3700, ${600 + OX} 3760, ${566 + OX} 3806 S ${524 + OX} 3920, ${ROBOT_X} ${GROUND_Y}`

export function scenerySvg(): string {
  // the landscape itself, 1000 wide. It is drawn once in the middle and mirrored on both sides, so the sky, lake and hills carry on
  // sideways without a seam. The one-off pieces (sun, planet, rockets, robot, the trail) are not in here, so they appear only once.
  const core = g({ id: 'sc-core' },
    // top: a few stars and dusk clouds
    ...stars.map((st) => (st.spark ? spark(r1(st.x), r1(st.y), r1(st.s)) : circle(r1(st.x), r1(st.y), r1(1.4 + st.s * 1.4), '#fffaf0', 0.8))),
    cloud(560, 640, 1.5, DUSK), cloud(40, 420, 1.0, DUSK, 0.9), cloud(-80, 860, 1.6, DUSK),

    // high: a floating island with a little workshop
    cloud(20, 1180, 1.3, DUSK, 0.95), cloud(560, 1460, 1.5),
    bird(420, 1290, 0.9), bird(470, 1322, 0.6),

    // middle: a sea of clouds with light and islands
    g({ fill: 'url(#sc-ray)' }, path('M120 1480 L400 1480 L900 2420 L560 2420 Z', 'url(#sc-ray)', 0.7), path('M-40 1480 L90 1480 L360 2420 L180 2420 Z', 'url(#sc-ray)', 0.55), path('M520 1480 L640 1480 L1060 2420 L860 2420 Z', 'url(#sc-ray)', 0.5)),
    cloud(420, 1940, 1.7), cloud(-60, 2080, 1.9), cloud(600, 2240, 1.8),
    bird(560, 1640, 1), bird(610, 1680, 0.65), bird(110, 2310, 0.8),

    // lower: the mountain, the lake, the hills around it
    path('M0 3170 L120 3010 L210 2900 L300 3030 L390 3170 Z', '#b9cce2', 0.85), path('M620 3170 L760 2980 L860 2860 L950 3000 L1000 3170 Z', '#c2d3e8', 0.85),
    el('use', { href: '#sc-mountain' }),
    cloud(720, 2560, 1.1, DAY, 0.95), cloud(-30, 2760, 1.2, DAY, 0.95),
    el('rect', { x: 0, y: 3040, width: 1000, height: 140, fill: 'url(#sc-mist)' }),
    el('rect', { x: 0, y: 3170, width: 1000, height: 260, fill: 'url(#sc-lake)' }),
    g({ 'clip-path': 'url(#sc-lakeclip)' }, g({ transform: 'translate(0 6340) scale(1 -1)', opacity: 0.28 }, el('use', { href: '#sc-mountain' }))),
    g({ stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.55 },
      ...([[120, 3230, 80], [420, 3262, 120], [700, 3228, 90], [250, 3300, 100], [610, 3320, 130], [860, 3290, 70], [60, 3360, 90], [500, 3385, 110], [800, 3368, 90]] as const).map(([x, y, w]) => el('path', { d: `M${x} ${y} h${w}` }))),
    bird(300, 2990, 1), bird(350, 3020, 0.7), bird(760, 3060, 0.9),
    path('M0 3290 C 90 3250, 180 3270, 240 3330 S 330 3420, 300 3470 L0 3470 Z', 'url(#sc-hill2)'),
    path('M1000 3260 C 900 3230, 840 3260, 790 3320 S 720 3420, 760 3470 L1000 3470 Z', 'url(#sc-hill2)'),

    // ground: the meadow, and the last low hill that closes the picture
    path('M0 3440 C 200 3360, 420 3400, 540 3460 S 820 3420, 1000 3360 V4000 H0 Z', 'url(#sc-hill1)'),
    path('M0 3640 C 260 3560, 520 3600, 700 3680 S 920 3680, 1000 3640 V4000 H0 Z', 'url(#sc-hill2)'),
    path('M0 3946 C 240 3922, 480 3944, 720 3930 S 940 3938, 1000 3922 V4000 H0 Z', 'url(#sc-hill3)'),
    ...grass.map((q) => el('path', { d: `M${r1(q.x)} ${r1(q.y)} l-4 -${r1(q.h)} M${r1(q.x)} ${r1(q.y)} l1 -${r1(q.h + 4)} M${r1(q.x)} ${r1(q.y)} l6 -${r1(q.h - 2)}`, stroke: '#86ad68', 'stroke-width': 2.5, 'stroke-linecap': 'round', fill: 'none', opacity: 0.6 })),
    ...flowers.map((f) => circle(r1(f.x), r1(f.y), r1(f.r), f.c, 0.9)))

  const body = [
    el('rect', { width: 2000, height: 4000, fill: 'url(#sc-sky)' }),
    circle(690 + OX, 640, 330, 'url(#sc-sun)'), circle(690 + OX, 640, 80, '#fff6d8'),
    el('use', { href: '#sc-core', transform: `translate(${OX} 0) scale(-1 1)` }),
    el('use', { href: '#sc-core', transform: `translate(${OX} 0)` }),
    // the two floating islands (with their waterfalls) stand in the side margins, where the cards on top do not cover them; they are
    // not in the mirrored landscape, so each appears once
    island(1845, 1180, 0.8, 420, workshop), island(150, 1740, 0.85, 560, tree),
    el('use', { href: '#sc-core', transform: `translate(${OX * 5} 0) scale(-1 1)` }),

    // the path through the meadow, down to the robot
    el('path', { d: TRAIL_PATH, fill: 'none', stroke: '#f9f2d8', 'stroke-width': 30, 'stroke-linecap': 'round', opacity: 0.95 }),
    el('path', { d: TRAIL_PATH, fill: 'none', stroke: '#fff', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.35 }),

    // a cream veil keeps text on the open page easy to read (it is part of the picture, so it costs nothing while scrolling)
    el('rect', { width: 2000, height: 4000, fill: 'url(#sc-veil)' }),
    el('rect', { width: 2000, height: 4000, fill: 'url(#sc-tint)', style: 'mix-blend-mode:multiply' }),
    planet(150, 300),

    // the end: the workshop, the robot at the end of the path, and a rocket on its pad (the one launched at the top)
    shed(300 + OX, GROUND_Y, 0.9), robotAt(ROBOT_X, GROUND_Y, 0.85), pad(760 + OX, GROUND_Y), rocketAt(760 + OX, GROUND_Y - 10 - 24 * 0.9, 0.9),

    // the dotted trail from the robot up to the tiny rocket in flight, in the right margin
    el('path', { d: `M${ROBOT_X} ${GROUND_Y - 100} C ${520 + OX} 3640, ${640 + OX} 3480, ${560 + OX} 3300 S ${380 + OX} 3020, ${470 + OX} 2800 S ${640 + OX} 2500, ${520 + OX} 2300 S ${330 + OX} 2000, ${470 + OX} 1820 S ${640 + OX} 1560, ${560 + OX} 1340 S ${700 + OX} 1000, ${740 + OX} 780 S 1560 420, 1880 250`, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.6, 'stroke-width': 3.2, 'stroke-dasharray': '7 11', 'stroke-linecap': 'round' }),
    rocketAt(1880, 220, 0.5, 14, true),
  ].join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 4000" width="2000" height="4000" preserveAspectRatio="xMidYMid slice">${DEFS.replace('</defs>', `${core}</defs>`)}${body}</svg>\n`
}
