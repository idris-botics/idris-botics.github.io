// The registry of every Chaos secret, achievement and activity. One entry here gives a new feature its achievement, its place in the
// "x / N" counter, its three hint tiers for the hint robot and its "solved" line. See docs/ADDING-A-SECRET.md.
// The hint robot, the achievements list, the counter and the tests all read this file, so nothing else needs a list of ids.
export type L = { en: string; ja: string }

export type SecretEntry = {
  /** Short unique id (the registry key). */
  id: string
  /** The achievement id given with award('...'). Usually the same as the id. */
  ach: string
  /** Name shown in the achievements list. */
  name: L
  /** How it is triggered, for people: typed word, click, scroll, idle, random... */
  trigger: { kind: 'word' | 'click' | 'scroll' | 'idle' | 'random' | 'open' | 'meta'; text: string }
  /** Three hint tiers: what to do, a clearer nudge, the answer. */
  hints: [L, L, L]
  /** Said by the pet robot once the secret is found. */
  solved: L
  /** A typed word or command that runs it for the visitor ("Do it for me" in the hint robot). Omit if it cannot be run for them. */
  word?: string
  /** One of the original four secrets that open the ending card when all are found. */
  core?: true
  /** A meta achievement that is not a puzzle: it is offered last. */
  meta?: true
  /** When this is the only achievement left and the visitor asks for help, the hint robot plays the "tell me, tell me" clip first. Default true; false opts out. */
  finalHintClip?: boolean
  /** Awarded by watching that clip; it never counts as the "one left" that triggers it. */
  rewardsClip?: true
}

export const SECRETS: SecretEntry[] = [
  {
    id: 'moon', ach: 'moon', core: true,
    name: { en: 'Broke the Moon', ja: '月を壊した' },
    trigger: { kind: 'click', text: 'Press the Moon in the hero scene (it says do not press).' },
    hints: [
      { en: 'Look for something that says not to press it.', ja: '「押さないで」と書かれたものを探してください。' },
      { en: 'It hangs in the picture at the top of the page, round and pale, shaped like the rock in the night sky.', ja: 'ページ上部の絵の中に浮かぶ、丸くて淡い、夜空の石の形をしたものです。' },
      { en: 'Press the Moon in the top picture.', ja: '上の絵の月を押してください。' },
    ],
    solved: { en: 'You pressed it. I said not to. Gravity has opinions now.', ja: '押しましたね。やめてと言ったのに。重力がご機嫌ななめです。' },
    word: 'moon',
  },
  {
    id: 'roll', ach: 'roll', core: true,
    name: { en: 'Rolled the barrel', ja: 'バレルロールをした' },
    trigger: { kind: 'word', text: 'Type roll, or the Konami code.' },
    hints: [
      { en: 'Try typing what a barrel does when you push it.', ja: '樽を押したときの動きを打ってみてください。' },
      { en: 'Four letters. Dice do it too.', ja: '4文字です。サイコロもやります。' },
      { en: 'Type: roll', ja: '「roll」と打ってください。' },
    ],
    solved: { en: 'Do a barrel roll. You did. I am dizzy.', ja: 'バレルロール、決まりました。目が回ります。' },
    word: 'roll',
  },
  {
    id: 'omae', ach: 'omae', core: true,
    name: { en: 'Heard the verdict', ja: '宣告を聞いた' },
    trigger: { kind: 'word', text: 'Type omae.' },
    hints: [
      { en: 'Try typing a rude Japanese word for "you".', ja: '失礼な言い方の日本語の「あなた」を打ってみてください。' },
      { en: 'Four letters in romaji. It starts with an O.', ja: 'ローマ字で4文字。Oで始まります。' },
      { en: 'Type: omae', ja: '「omae」と打ってください。' },
    ],
    solved: { en: 'Nani? Yes. Nani.', ja: 'なに？ はい。なに。' },
    word: 'omae',
  },
  {
    id: 'coffee', ach: 'coffee', core: true,
    name: { en: 'Caffeinated', ja: 'カフェイン注入' },
    trigger: { kind: 'word', text: 'Type coffee.' },
    hints: [
      { en: 'Try typing a drink.', ja: '飲み物の名前を打ってみてください。' },
      { en: 'It is brown, hot and six letters.', ja: '茶色くて、熱くて、6文字です。' },
      { en: 'Type: coffee', ja: '「coffee」と打ってください。' },
    ],
    solved: { en: 'Brewed. Do not ask the robot how it feels.', ja: '抽出完了。ロボットの気分は聞かないで。' },
    word: 'coffee',
  },
  {
    id: 'letters', ach: 'letters',
    name: { en: 'Scattered the name', ja: '名前を散らかした' },
    trigger: { kind: 'click', text: 'Click or tap the name Idris Sadiq (it also breaks by itself).' },
    hints: [
      { en: 'The biggest words on the page are touchy.', ja: 'ページで一番大きい文字は、さわられるのが苦手です。' },
      { en: 'Eleven letters, right at the top. Poke them.', ja: '一番上にある11文字です。つついてみてください。' },
      { en: 'Click the name "Idris Sadiq".', ja: '名前「Idris Sadiq」をクリックしてください。' },
    ],
    solved: { en: 'Eleven letters, all over the floor. Very dignified.', ja: '11文字が床に散らばりました。とても上品です。' },
  },
  {
    id: 'sim', ach: 'sim',
    name: { en: 'Poked a simulation', ja: 'シミュレーションを動かした' },
    trigger: { kind: 'open', text: 'Open a project and press Play on its simulation.' },
    hints: [
      { en: 'Some projects are more than pictures.', ja: '写真だけではないプロジェクトがあります。' },
      { en: 'Open a project that has a Simulation tab or a Play button.', ja: 'シミュレーションのタブか再生ボタンがあるプロジェクトを開いてください。' },
      { en: 'Open any project with a simulation and press Play.', ja: 'シミュレーションのあるプロジェクトを開いて再生を押してください。' },
    ],
    solved: { en: 'You touched the science. It touched back.', ja: '科学に触れました。科学も触れ返しました。' },
  },
  {
    id: 'finale', ach: 'finale',
    name: { en: 'Read all the way down', ja: '最後まで読んだ' },
    trigger: { kind: 'scroll', text: 'Scroll to the very bottom of the home page.' },
    hints: [
      { en: 'Good things come to those who reach the end.', ja: '最後までたどり着いた人にはいいことがあります。' },
      { en: 'The page has a bottom, and there is a thank-you waiting at it.', ja: 'ページには底があり、そこでお礼が待っています。' },
      { en: 'Scroll to the very bottom of the home page.', ja: 'ホームページの一番下までスクロールしてください。' },
    ],
    solved: { en: 'You made it to the end. Nobody does that.', ja: '最後まで来ましたね。そんな人、めったにいません。' },
  },
  {
    id: 'rick', ach: 'rick',
    name: { en: 'Got rolled', ja: 'ロールされた' },
    trigger: { kind: 'random', text: 'Keep scrolling: the page shakes, then a famous song plays.' },
    hints: [
      { en: 'Patience. Keep reading and the page will get ideas.', ja: '辛抱です。読み進めると、ページが何か思いつきます。' },
      { en: 'Scroll down for a while. The page gets shaky, then a song starts.', ja: 'しばらくスクロールしてください。ページが揺れて、曲が始まります。' },
      { en: 'Keep scrolling down the home page until it shakes. It will never give you up.', ja: 'ページが揺れるまで、ホームページを下へスクロールし続けてください。' },
    ],
    solved: { en: 'Never gonna give you up. Never gonna let you down.', ja: 'あなたを諦めません。がっかりもさせません。' },
    finalHintClip: true,
  },
  {
    id: 'moonup', ach: 'moonup',
    name: { en: 'Fell upwards', ja: '上に落ちた' },
    trigger: { kind: 'click', text: 'Press the Moon a second time.' },
    hints: [
      { en: 'Some buttons are worth pressing twice.', ja: '2回押す価値のあるボタンもあります。' },
      { en: 'The Moon again. After the first collapse, press it once more.', ja: 'また月です。最初の崩壊のあと、もう一度押してください。' },
      { en: 'Press the Moon a second time and fall upwards.', ja: '月を2回目に押して、上へ落ちてください。' },
    ],
    solved: { en: 'Up is the new down. I am filing a complaint with physics.', ja: '上が新しい下です。物理学に苦情を出しておきます。' },
  },
  {
    id: 'moon3', ach: 'moon3',
    name: { en: 'Pressed it a third time', ja: '3回目を押した' },
    trigger: { kind: 'click', text: 'Press the Moon a third time.' },
    hints: [
      { en: 'Two was not enough for you?', ja: '2回では足りませんでしたか？' },
      { en: 'The Moon button has one more trick. It needs a third press.', ja: '月のボタンにはもう1つ仕掛けがあります。3回目を押してください。' },
      { en: 'Press the Moon three times in total.', ja: '月を合計3回押してください。' },
    ],
    solved: { en: 'Three presses. You have a problem. I respect it.', ja: '3回押しましたね。重症です。尊敬します。' },
  },
  {
    id: 'crash', ach: 'crash',
    name: { en: 'Shot down a rocket', ja: 'ロケットを撃墜した' },
    trigger: { kind: 'click', text: 'Click a rocket or satellite that flies across the page.' },
    hints: [
      { en: 'Keep an eye on the sky now and then.', ja: '時々、空に目を向けてください。' },
      { en: 'Small things fly across the page. They are quick and not very bright.', ja: '小さなものがページを横切って飛びます。素早くて、あまり賢くありません。' },
      { en: 'Click a rocket or satellite as it flies across.', ja: '横切って飛ぶロケットか衛星をクリックしてください。' },
    ],
    solved: { en: 'Direct hit. Captain Pip would have wanted it this way. No, he would not.', ja: '命中。ピップ船長はこうなってほしかった……いえ、そんなことはありません。' },
  },
  {
    id: 'evicted', ach: 'evicted',
    name: { en: 'Evicted by the robot', ja: 'ロボットに追い出された' },
    trigger: { kind: 'click', text: 'Click the pet robot many times in a row.' },
    hints: [
      { en: 'The little robot has a limit. Nobody has found it politely.', ja: '小さなロボットには限界があります。礼儀正しく見つけた人はいません。' },
      { en: 'Poke it. Keep poking. It gets angrier each time.', ja: 'つついてください。つつき続けてください。そのたびに怒ります。' },
      { en: 'Click the pet robot again and again until it throws you out.', ja: 'ペットロボットを何度もクリックして、追い出されてください。' },
    ],
    solved: { en: 'Out you go. Please come back. I did not mean it.', ja: 'お帰りください。……戻ってきてください。本気ではありません。' },
  },
  {
    id: 'cena', ach: 'cena',
    name: { en: 'Heard a name', ja: '名前を聞いた' },
    trigger: { kind: 'random', text: 'A random jumpscare once per visit.' },
    hints: [
      { en: 'You cannot see it coming. That is the point.', ja: '来るのは予測できません。それがポイントです。' },
      { en: 'It arrives on its own, loud, sometime after you have settled in.', ja: 'あなたがくつろいだ頃に、勝手に、大きな音で現れます。' },
      { en: 'Wait and explore. It shows up by itself, once per visit.', ja: '待って探索してください。1回の訪問につき1度、勝手に現れます。' },
    ],
    solved: { en: 'And his name is... well. You heard it.', ja: 'その名は……まあ、聞こえましたよね。' },
    finalHintClip: true,
  },
  {
    id: 'featured', ach: 'featured',
    name: { en: 'Opened every featured project', ja: '主な3件をすべて開いた' },
    trigger: { kind: 'open', text: 'Open all three featured projects: 8-bit computer, RoboDog, self-balancing swarm.' },
    hints: [
      { en: 'The big cards at the top of Work are the stars.', ja: 'Workの一番上の大きなカードが主役です。' },
      { en: 'There are three big featured cards. Open each one.', ja: '大きな注目カードが3枚あります。それぞれ開いてください。' },
      { en: 'Open the 8-bit computer, RoboDog and the self-balancing swarm.', ja: '8ビットコンピュータ、RoboDog、自己バランスのスウォームを開いてください。' },
    ],
    solved: { en: 'All three stars seen. They enjoyed the attention.', ja: '主役の3つを全部見ました。注目されて満足そうです。' },
  },
  {
    id: 'twin', ach: 'twin',
    name: { en: 'Ran the PID twin', ja: 'PIDツインを動かした' },
    trigger: { kind: 'open', text: 'Open the PID project and run the digital twin.' },
    hints: [
      { en: 'A digital twin lives in one of the projects.', ja: 'デジタルツインが、あるプロジェクトの中にいます。' },
      { en: 'Think servo, think tuning. The PID project has a rig to run.', ja: 'サーボとチューニングです。PIDのプロジェクトには動かせる装置があります。' },
      { en: 'Open the PID project and run its servo twin.', ja: 'PIDのプロジェクトを開いて、サーボのツインを動かしてください。' },
    ],
    solved: { en: 'The twin is running. The original is jealous.', ja: 'ツインが動いています。本物は嫉妬しています。' },
  },
  {
    id: 'about', ach: 'about',
    name: { en: 'Read the About story', ja: '自己紹介を読んだ' },
    trigger: { kind: 'idle', text: 'Stay in the About section for a moment.' },
    hints: [
      { en: 'Someone wrote a whole story about themselves. Take a minute.', ja: '自分についての話がまるごと書かれています。少し時間をとってください。' },
      { en: 'It is right under Work, with five paragraphs.', ja: 'Workのすぐ下にあり、5つの段落があります。' },
      { en: 'Scroll to About and stay there for a moment.', ja: 'Aboutまでスクロールして、少しとどまってください。' },
    ],
    solved: { en: 'You read it. All five paragraphs. Idris is touched.', ja: '読みましたね。5段落すべて。Idrisは感激しています。' },
  },
  {
    id: 'cv', ach: 'cv',
    name: { en: 'Found the CV', ja: '履歴書を見つけた' },
    trigger: { kind: 'click', text: 'Open the CV (PDF).' },
    hints: [
      { en: 'Somewhere there is a boring but important document.', ja: 'どこかに、地味だけれど大切な書類があります。' },
      { en: 'Look near the top, beside the Email button.', ja: '一番上のメールボタンの隣を見てください。' },
      { en: 'Click CV (PDF) in the hero.', ja: 'ヒーローの「CV (PDF)」をクリックしてください。' },
    ],
    solved: { en: 'CV found. Hire him. I am only saying.', ja: '履歴書、発見。採用してください。言ってみただけです。' },
  },
  {
    id: 'legend', ach: 'legend', meta: true, finalHintClip: false,
    name: { en: 'Saw a legendary line', ja: '伝説の一言を見た' },
    trigger: { kind: 'random', text: 'A very rare gold comment from the pet robot.' },
    hints: [
      { en: 'Pure luck. Only some comments are gold.', ja: '完全に運です。金色のコメントはごくわずかです。' },
      { en: 'One comment in two hundred is legendary. Stay around and read them.', ja: '200回に1回、伝説のコメントが出ます。ここにいて読んでください。' },
      { en: 'There is no shortcut. Stay, explore and read the comments until one turns gold.', ja: '近道はありません。探索しながらコメントを読み、金色になるのを待ってください。' },
    ],
    solved: { en: 'A legendary line. I have never been so proud.', ja: '伝説の一言。こんなに誇らしいことはありません。' },
  },
  {
    id: 'idris', ach: 'idris',
    name: { en: 'Summoned the supreme one', ja: '至高の存在を召喚した' },
    trigger: { kind: 'word', text: 'Type idris (any case), here or in the command box.' },
    hints: [
      { en: 'Try saying the name of the person who built all this.', ja: 'これを作った人の名前を呼んでみてください。' },
      { en: 'The name on the page. Five letters, lowercase is fine.', ja: 'ページにある名前です。5文字で、小文字で大丈夫です。' },
      { en: 'Type: idris', ja: '「idris」と打ってください。' },
    ],
    solved: { en: 'You rang? The supreme one has arrived.', ja: 'お呼びですか？ 至高の存在が到着しました。' },
    word: 'idris',
  },
  {
    id: 'cat', ach: 'cat',
    name: { en: 'Cat person', ja: '猫好き' },
    trigger: { kind: 'word', text: 'Type cat (or tap the cat chip in the command box).' },
    hints: [
      { en: 'The internet runs on one animal. Type it.', ja: 'インターネットを動かしているのは、ある動物です。それを打ってください。' },
      { en: 'Three letters. It purrs. It ignores you.', ja: '3文字です。喉を鳴らします。あなたを無視します。' },
      { en: 'Type: cat', ja: '「cat」と打ってください。' },
    ],
    solved: { en: 'A cat. The close button will make you work for it.', ja: '猫です。閉じるボタンは、簡単には押させません。' },
    word: 'cat',
  },
  {
    id: 'cookie', ach: 'cookie',
    name: { en: 'Shared a cookie', ja: 'クッキーを分け合った' },
    trigger: { kind: 'idle', text: 'The cookie banner shows up by itself; let the pet robot deal with it.' },
    hints: [
      { en: 'Something sweet will turn up on its own. Do not rush it.', ja: '甘いものが勝手に現れます。急がないで。' },
      { en: 'A cookie banner appears after a minute or two. The pet robot has feelings about it.', ja: '1〜2分すると、クッキーのバナーが出ます。ペットロボットには思うところがあります。' },
      { en: 'Wait for the cookie banner, then watch what the pet robot does with it.', ja: 'クッキーのバナーを待ち、ペットロボットがどうするか見ましょう。' },
    ],
    solved: { en: 'Sorry. It was delicious.', ja: 'ごめんなさい。おいしかったです。' },
  },
  {
    id: 'asked', ach: 'asked', finalHintClip: false, rewardsClip: true,
    name: { en: 'Asked nicely', ja: 'ちゃんとお願いした' },
    trigger: { kind: 'meta', text: 'Watch the "tell me, tell me" clip the hint robot plays when one achievement is left.' },
    hints: [
      { en: 'Only the hint robot can give you this one, and only at the very end.', ja: 'これをくれるのはヒントロボットだけで、それも最後の最後です。' },
      { en: 'Find everything else first. When only one is left, ask the hint robot for help.', ja: 'まず他をすべて見つけてください。残り1つになったら、ヒントロボットに頼んでください。' },
      { en: 'Leave one achievement undiscovered and ask the hint robot about it.', ja: '1つだけ未発見のまま残し、それについてヒントロボットに聞いてください。' },
    ],
    solved: { en: 'You asked properly. Now you may have the hint.', ja: 'ちゃんとお願いできましたね。ではヒントをどうぞ。' },
  },
  {
    id: 'everything', ach: 'everything', meta: true, finalHintClip: false,
    name: { en: 'Found everything', ja: 'すべて見つけた' },
    trigger: { kind: 'meta', text: 'Find the four core secrets: Moon, roll, omae and coffee.' },
    hints: [
      { en: 'This one comes by itself once the big four are found.', ja: '大きな4つを見つければ、これは自然に付いてきます。' },
      { en: 'Four secrets matter most: a button, and three typed words.', ja: '大事な秘密は4つです。ボタン1つと、打つ言葉3つ。' },
      { en: 'Find the Moon, then type roll, omae and coffee.', ja: '月を見つけ、roll、omae、coffeeを打ってください。' },
    ],
    solved: { en: 'You found everything. Go outside. Touch a robot.', ja: '全部見つけました。外に出て、ロボットに触れてきてください。' },
  },
]

export const SECRET_IDS = SECRETS.map((s) => s.id)
/** Achievement id -> display name, for the achievements list. */
export const ACH_NAMES: Record<string, L> = Object.fromEntries(SECRETS.map((s) => [s.ach, s.name]))
export const ACH_TOTAL = SECRETS.length
/** The original four secrets: when all are found, the ending card opens. */
export const CORE_ACH = SECRETS.filter((s) => s.core).map((s) => s.ach)
export const byAch = (ach: string) => SECRETS.find((s) => s.ach === ach)

/** The next secret to hint at: not found yet, puzzles before meta entries, in registry order. */
export function nextToHint(found: readonly string[]): SecretEntry | undefined {
  const left = SECRETS.filter((s) => !found.includes(s.ach))
  return left.find((s) => !s.meta) ?? left[0]
}
/** The one undiscovered achievement, if exactly one is left (for the final hint clip). */
export function lastLeft(found: readonly string[]): SecretEntry | undefined {
  const left = SECRETS.filter((s) => !found.includes(s.ach) && !s.rewardsClip)
  return left.length === 1 ? left[0] : undefined
}
