import type { L } from '../content'

/**
 * stepscribe-cad: version history and the v2 page content, in one place so it is quick to update when v2 ships.
 *
 * When v2 was released (done; kept for the next major version):
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
      version: 'v2.1',
      state: 'in development',
      note: { en: 'Next: measured mass per part, density ranges on torque, and a check against an existing robot URDF.', ja: '次回：部品ごとの実測質量、トルクの密度レンジ、既存ロボットURDFとの照合。' },
    },
    {
      version: 'v2.0',
      state: 'released',
      note: { en: 'Robotics release: finds the joints and writes a URDF. Released on PyPI as stepscribe-cad.', ja: 'ロボティクス対応版：関節を検出しURDFを出力。PyPIに stepscribe-cad として公開済み。' },
    },
    {
      version: 'v0.1.x',
      state: 'released',
      note: { en: 'First releases on PyPI as stepscribe-cad.', ja: 'PyPIに stepscribe-cad として最初に公開したバージョン。' },
    },
  ],
  whatsNewInV2: [
    { en: 'Finds the joints of a robot from the CAD (link groups, revolute joints, axes, origins). A six-axis arm is recognised as a 6-axis serial arm.', ja: 'CADからロボットの関節（リンク群、回転関節、軸、原点）を検出。6軸アームは「6軸シリアルアーム」と認識します。' },
    { en: 'Writes robot.urdf and robot.json with a DH-style table and mass and inertia per link. Optional per-link STL meshes. MuJoCo can check the result.', ja: 'robot.urdf と robot.json を出力（DH形式の表、リンクごとの質量と慣性）。リンクごとのSTLメッシュも任意で出力でき、MuJoCoで検証できます。' },
    { en: 'Joint axes, ranges and direction can be set by the designer and are marked as confirmed by the designer.', ja: '関節、軸、可動範囲、方向は設計者が指定でき、「設計者確認済み」と表示されます。' },
    { en: 'Ten new image types in three sets: three-view drawings, hole maps, weak spots, contact map, kinematic diagram, section views, wall-thickness heat map and more. Images carry IDs and numbers only.', ja: '3つのセットに分けた10種類の新しい画像（三面図、穴マップ、弱点、接触マップ、運動学図、断面図、肉厚ヒートマップなど）。画像にはIDと番号のみを表示します。' },
    { en: 'Faster: a full export of a six-axis arm dropped from 15 min 47 s to 5 min 9 s on the same laptop.', ja: '高速化：6軸アームの全出力が、同じノートPCで15分47秒から5分9秒に短縮。' },
    { en: 'Several STEP files, a folder or a zip can be combined into one assembly.', ja: '複数のSTEPファイル、フォルダ、zipを1つのアセンブリにまとめられます。' },
    { en: 'Every "Likely:" statement now carries a confidence and its evidence, and complex free-form parts no longer get a confident wrong manufacturing guess.', ja: '「Likely:」の記述すべてに確信度と根拠を付け、複雑な自由曲面の部品には、自信のある誤った製造方法の推定を出さなくなりました。' },
  ],
  // TODO(idris): changelog entries for v0.1.x (version, month, changes). Hidden until filled in.
  changelog: [],
  // TODO(idris): screenshots of v2. Hidden until added.
  screenshots: [],
}
