// Facts come from the portfolio deck copy, LinkedIn and Idris's own answers.
// Rules: no invented numbers; deck wording wins for status; OPEN items are hidden in production builds.
// NEEDS-NATIVE-REVIEW: every `ja` string is a draft and must be reviewed by a native Japanese speaker.
export type L = { en: string; ja: string }

export type Status =
  | 'BUILT' | 'GRANT' | 'IN DEVELOPMENT' | 'PROPOSED' | 'SIMULATED' | 'CONCEPTUAL' | 'INDUSTRY' | 'INTERNSHIP' | 'OPEN'

export const statusLabel: Record<Status, L> = {
  BUILT: { en: 'Built', ja: '製作済み' },
  GRANT: { en: 'Grant · prototype', ja: '助成・試作中' },
  'IN DEVELOPMENT': { en: 'In development', ja: '開発中' },
  PROPOSED: { en: 'Proposed', ja: '提案段階' },
  SIMULATED: { en: 'Proposed · simulated', ja: '提案・シミュレーション済み' },
  CONCEPTUAL: { en: 'Conceptual · untested', ja: '概念検討・未検証' },
  INDUSTRY: { en: 'Research placement', ja: '研究インターン' },
  INTERNSHIP: { en: 'Industry internship', ja: '企業インターン' },
  OPEN: { en: 'Details to be added', ja: '詳細は追って追加' },
}

// TODO(idris): a photo of me with one of my robots for the hero (answer 12). RoboDog stands in until then.
export const hero = {
  name: 'Idris Sadiq',
  line: {
    en: 'I build robots from circuit to code, hoping one day to reach outer space.',
    ja: '回路からコードまで、ロボットを作っています。いつか宇宙に届くことを夢見ています。',
  },
  sub: {
    en: 'Final-year B.E. EEE student, SRM Easwari Engineering College, Chennai.',
    ja: 'SRM Easwari 工科大学（チェンナイ）電気電子工学科 学部4年。',
  },
}

/** About: three short paragraphs in my own voice (docs/VOICE.md). Facts only; open questions live in docs/ANSWERS-NEEDED.md. */
// About is Idris's own wording (Round 3), so it keeps its contractions. TODO(idris): one line on why Japan (answers 3 and 4).
export const aboutText: L[] = [
  {
    en: 'I\u2019ve always been fascinated by how things work. Ever since I was young, I\u2019ve loved building things, taking them apart, experimenting with whatever I could get my hands on, and occasionally breaking a few along the way. That curiosity grew into a passion for robotics.',
    ja: '昔から、ものの仕組みに強く惹かれてきました。幼いころから、何かを作ったり、分解したり、手に入るものを使って試したり、ときには壊してしまったりしてきました。その好奇心が、ロボティクスへの情熱になりました。',
  },
  {
    en: 'I study Electrical and Electronics Engineering, but what I enjoy most is the process of building. Designing a robot from scratch, figuring out why a sensor isn\u2019t behaving, tuning a controller, or spending hours on a stubborn circuit: I find the process just as exciting as the result.',
    ja: '電気電子工学を学んでいますが、一番好きなのは作る過程です。ロボットをゼロから設計すること、センサーがうまく動かない理由を探ること、コントローラを調整すること、手ごわい回路に何時間も向き合うこと。結果と同じくらい、その過程にわくわくします。',
  },
  {
    en: 'Over the years I\u2019ve explored mobile robots, autonomous navigation, embedded systems, control systems, computer vision and neuro-robotics, through internships and my own projects.',
    ja: 'これまで、インターンや個人のプロジェクトを通じて、移動ロボット、自律ナビゲーション、組込みシステム、制御システム、コンピュータビジョン、ニューロロボティクスに取り組んできました。',
  },
  {
    en: 'What I love most about robotics is how it brings so many disciplines together. Electronics, mechanics, software, maths and a bit of creativity combine into something that actually moves, senses and interacts with the world.',
    ja: 'ロボティクスで一番好きなのは、多くの分野が一つにまとまるところです。電子回路、機構、ソフトウェア、数学、そして少しの創造性が組み合わさって、実際に動き、感じ取り、世界と関わるものになります。',
  },
  {
    en: 'I\u2019m especially drawn to autonomous systems, swarm robotics, space robotics and adaptive machines. There is still so much I want to learn, build, break and figure out, and that is what keeps me coming back.',
    ja: '特に、自律システム、群ロボット、宇宙ロボティクス、適応型の機械に惹かれています。学びたいこと、作りたいもの、壊して理解したいことがまだたくさんあり、それが私を引き戻し続けています。',
  },
]

export type Loop = 'sense' | 'decide' | 'act' | 'coordinate'
export const loopLabel: Record<Loop, L> = {
  sense: { en: 'Senses the world', ja: '周囲を感じ取る' },
  decide: { en: 'Decides and controls', ja: '判断・制御する' },
  act: { en: 'Moves and acts', ja: '動いて作用する' },
  coordinate: { en: 'Works with others', ja: '他と協調する' },
}

export type SimKey = 'pid' | 'cpu8' | 'pipe' | 'swarm' | 'gait' | 'dog' | 'spider' | 'arena' | 'gaitsignal' | 'net'

export type Media = {
  src: string // basename in /media/img, without -640/-1280 suffix
  w: number
  h: number
  alt: L
  caption?: L
  label?: L // e.g. "Concept render"
  widths?: number[] // available widths, default [640, 1280]
}

export type Project = {
  slug: string
  tier: 'flagship' | 'grant' | 'foundation'
  eyebrow: L
  title: L
  status: Status
  loops: Loop[]
  blurb: L
  summary: { objective?: L; method?: L; status?: L; mine?: L }
  media?: Media[]
  videos?: { src: string; poster: string; caption: L }[]
  sim?: SimKey
  credit?: L
  tags: string[]
  link?: { href: string; label: L }
  leadVideo?: boolean // show the first video above the pictures
  paper?: { href: string; label: L; abstract: L; venue: L }
  more?: { title: L; body: L }[] // short extra sections shown in a "Details" disclosure on the project page
}

const IMG = (src: string, w: number, h: number, alt: L, extra: Partial<Media> = {}): Media => ({ src, w, h, alt, ...extra })

export const projects: Project[] = [
  {
    slug: 'pid',
    tier: 'flagship',
    eyebrow: { en: 'Research', ja: '研究' },
    title: { en: 'Auto-tuning PID controller and servo digital twin', ja: 'PID自動調整と、サーボのデジタルツイン' },
    status: 'IN DEVELOPMENT',
    loops: ['decide', 'act'],
    blurb: {
      en: 'An interactive tool that auto-tunes PID gains for motor control, with a browser-based interface for visualising the response live (currently in development).',
      ja: 'モーター制御のPIDゲインを自動調整し、応答をブラウザ上でライブ表示する対話型ツール（開発中）。',
    },
    summary: {
      objective: { en: 'Tune a servo’s PID gains automatically, including when the load changes.', ja: '負荷が変わっても、サーボのPIDゲインを自動で調整する。' },
      status: {
        en: 'Simulation only: nothing is validated on hardware yet.',
        ja: 'シミュレーションのみで、実機での検証はまだです。',
      },
      mine: {
        en: 'I wrote the specification and the evaluation rules, and I review every result.',
        ja: '仕様と評価ルールを書き、すべての結果を自分で確認しています。',
      },
    },
    more: [
      { title: { en: 'Simulation result in detail', ja: 'シミュレーション結果の詳細' }, body: { en: 'In simulation a residual PPO policy beats a tuned constant by roughly 0.5 to 0.6 median return, but a larger search for the constant alone recovers most of that gain. The paper draft says so.', ja: 'シミュレーションでは残差PPO方策が調整済み定数を中央値リターンで約0.5〜0.6上回りますが、定数のみをより広く探索すると大半が回復します。論文草稿にもそう記しています。' } },
      { title: { en: 'The twin', ja: 'デジタルツイン' }, body: { en: 'A physics-based model of a geared DC servo: 12 V, 180:1 gearbox, encoder. A fixed-gain PID is the baseline; reinforcement-learning agents adjust the gains on top of it.', ja: 'ギア付きDCサーボ（12V、減速比180:1、エンコーダ）の物理ベースのモデル。固定ゲインPIDを基準に、強化学習エージェントがゲインを調整します。' } },
    ],
    media: [IMG('image16', 1918, 904, { en: 'Screenshot of the servo PID digital-twin interface: servo with horn arm, gain sliders and response charts.', ja: 'サーボPIDデジタルツインの画面：サーボとアーム、ゲインのスライダー、応答グラフ。' }, { caption: { en: 'The original browser tool', ja: '元のブラウザツール' } })],
    videos: [
      { src: 'rl-pid', poster: 'rlpid-poster', caption: { en: 'Short demo: a payload change, then RL auto-tune (simulation)', ja: '短い紹介：負荷変更とRL自動調整（シミュレーション）' } },
      { src: 'pid-demo', poster: 'image16', caption: { en: 'Recording of the original tool', ja: '元のツールの録画' } },
    ],
    sim: 'pid',
    tags: ['PID', 'reinforcement learning', 'simulation'],
  },
  {
    slug: 'swarm',
    tier: 'flagship',
    eyebrow: { en: 'Final-year project', ja: '卒業研究' },
    title: { en: 'Decentralized self-balancing swarm', ja: '分散型の自己平衡ロボット群' },
    status: 'PROPOSED',
    loops: ['sense', 'decide', 'coordinate'],
    blurb: {
      en: 'Multiple robot units maintaining balance and coordinating with each other without a central controller. Specifically proposed for lunar and extra-terrestrial exploration.',
      ja: '複数のロボットがバランスを保ちつつ、中央制御なしで互いに協調します。月面など地球外探査向けに提案しています。',
    },
    summary: {
      objective: { en: 'Small robots are agile but weak; large ones are capable but bulky. Combine independent balancing, coordination and, later, docking.', ja: '小型ロボットは機敏だが非力、大型は高性能だが大きい。独立した自己平衡、協調、そして将来の結合を一つにまとめる。' },
      method: {
        en: 'Three two-wheeled inverted-pendulum robots on ESP32 boards with an IMU, balanced by a dual-loop PID. They share state over ESP-NOW and infrared links, with no camera. A two-robot docking proof of concept is the stretch goal.',
        ja: 'IMU付きESP32搭載の倒立振子型二輪ロボット3台を二重ループPIDで制御。ESP-NOWと赤外線でカメラなしに状態を共有。2台の結合実証が発展目標。',
      },
      status: {
        en: 'Designed and simulated. Hardware tests are still to come, and scaling to many units is future work.',
        ja: '設計とシミュレーションまで。実機試験はこれからで、多数台への拡張は今後の課題です。',
      },
    },
    media: [
      IMG('image13', 1527, 861, { en: 'Diagram of the three stages: independent operation, swarm coordination, combined platform.', ja: '3段階の図：独立動作、群協調、結合プラットフォーム。' }, { label: { en: 'Illustration', ja: 'イラスト' } }),
      IMG('swarm-bot-top', 800, 719, { en: 'Top view of one two-wheeled balancing robot: a white printed frame, two motors with wheels, a battery and a control board with wiring.', ja: '倒立振子型二輪ロボット1台を真上から見た写真：白い造形フレーム、モーター2つと車輪、バッテリー、配線された制御基板。' }, { widths: [640], caption: { en: 'One balancing unit, from above', ja: '倒立振子ユニット1台を上から' } }),
    ],
    videos: [{ src: 'swarm-bot-720', poster: 'swarm-bot-poster', caption: { en: 'One unit on the carpet, standing on its two wheels', ja: '絨毯の上で二輪で立つユニット1台' } }],
    sim: 'swarm',
    tags: ['multi-agent', 'balance control', 'ESP-NOW'],
  },
  {
    slug: 'net',
    tier: 'flagship',
    eyebrow: { en: 'Conference paper · conceptual', ja: '会議論文・概念検討' },
    title: { en: 'Adaptive swarm-actuated net system', ja: '適応型スウォーム作動ネットシステム' },
    status: 'CONCEPTUAL',
    loops: ['coordinate'],
    blurb: {
      en: 'A conceptual paper I wrote. The design is not yet tested.',
      ja: '私が書いた概念検討の論文です。設計はまだ検証していません。',
    },
    summary: {
      method: { en: 'Satellite nodes with an active intercept mesh panel, managed by a decentralised swarm rule.', ja: '能動的な捕獲メッシュパネルを持つ衛星ノットを、分散型のスウォーム制御で管理する。' },
      status: { en: 'Conceptual and untested.', ja: '概念検討・未検証。' },
    },
    paper: {
      href: 'papers/ASANS-ICCORSE-2026.pdf',
      label: { en: 'Read the paper (PDF)', ja: '論文を読む（PDF）' },
      venue: { en: 'ICCORSE 2026, 12 May 2026 (proceedings page)', ja: 'ICCORSE 2026（2026年5月12日）掲載ページ' },
      abstract: {
        en: 'Orbital debris threatens satellites, and a single net or a rigid arm struggles with a tumbling target. This paper proposes the Adaptive Swarm-Actuated Net System: a group of small satellites that deploy, shape and tension one flexible net together. It covers the architecture, the workflow and the control strategy, and discusses the hard parts: orbital dynamics, communication limits and nonlinear net behaviour. It is a conceptual paper, and the design is not yet tested.',
        ja: '軌道上のデブリは衛星の脅威ですが、単一のネットや剛体アームでは回転する標的への対応が難しくなります。本論文では、小型衛星の群れが1枚の柔軟なネットを一緒に展開し、形を整え、張力を調整する「適応型スウォーム作動ネットシステム」を提案します。構成、運用の流れ、制御方針を示し、軌道力学、通信の制約、ネットの非線形な挙動といった難所を議論します。概念検討の論文であり、設計はまだ検証していません。',
      },
    },
    media: [IMG('image17', 2858, 1472, { en: 'Illustration: satellite swarm nodes with an active intercept mesh panel around debris.', ja: 'イラスト：デブリを囲む、衛星ノードと能動捕獲メッシュパネル。' }, { label: { en: 'Illustration', ja: 'イラスト' } })],
    sim: 'net',
    tags: ['space robotics', 'swarm'],
  },
  {
    slug: 'gait',
    tier: 'grant',
    eyebrow: { en: 'IEEE EPICS grant', ja: 'IEEE EPICS 助成' },
    title: { en: 'Wearable G.A.I.T. device', ja: 'ウェアラブル G.A.I.T. デバイス' },
    status: 'GRANT',
    loops: ['sense', 'decide'],
    blurb: {
      en: 'G.A.I.T. Assist is a gesture-based AI wristband helping Parkinson’s patients reclaim daily independence, backed by a $3,000 team grant from EPICS in IEEE.',
      ja: 'G.A.I.T. Assist は、パーキンソン病の方の日常の自立を支える、ジェスチャーベースのAIリストバンドです。EPICS in IEEE のチーム助成（3,000米ドル）を受けています。',
    },
    summary: {
      objective: { en: 'Tell an intentional gesture from a tremor, and trigger a simple action such as switching an appliance.', ja: '意図的なジェスチャーと震えを区別し、家電の切替などの操作につなげる。' },
      method: { en: 'A wrist-worn ESP32-S3 board with an IMU and on-device classification (TinyML).', ja: '手首装着のESP32-S3基板、IMU、端末上での分類（TinyML）。' },
      status: { en: 'Prototype in development. Team grant, Jon C. Taenzer Memorial Fund (2026). I am now building a v2 prototype: smaller, with better sensors and a housing.', ja: '試作開発中。チーム助成（Jon C. Taenzer Memorial Fund、2026年）。現在、より小型で、センサーを改良し、筐体をつけたv2試作を製作中です。' },
      mine: { en: 'Hardware Team Lead.', ja: 'ハードウェアチームリーダー。' },
    },
    media: [
      IMG('image14', 1536, 1024, { en: 'Concept render of the final proposed wristband.', ja: '最終提案版リストバンドのコンセプト画像。' }, { label: { en: 'Concept render', ja: 'コンセプト画像' }, caption: { en: 'Final proposed version', ja: '最終提案版' } }),
      IMG('image15', 1555, 1600, { en: 'Prototype board: ESP32 development board with an MPU-6050 sensor on perfboard.', ja: '試作基板：ESP32開発ボードとMPU-6050をユニバーサル基板に搭載。' }, { caption: { en: 'Prototype in development (ESP32 + MPU-6050)', ja: '試作中（ESP32 + MPU-6050）' } }),
    ],
    sim: 'gaitsignal',
    tags: ['wearable', 'IMU', 'TinyML'],
  },
  {
    slug: 'abb',
    tier: 'grant',
    eyebrow: { en: 'Research internship', ja: '研究インターン' },
    title: { en: 'Research internship, ABB Global CoE (hosted at Easwari)', ja: '研究インターン：ABB Global CoE（Easwari内）' },
    status: 'INDUSTRY',
    loops: ['act', 'sense'],
    blurb: {
      en: 'I work with an industrial robot cell built for 3D bin-picking. I am learning how robots see, identify and pick up objects in cluttered, unstructured bins, using SICK vision systems and ABB\u2019s PickMaster and PLB environment for vision, object detection and motion planning. It is where I get to see robotics concepts turn into real industrial work.',
      ja: '3Dビンピッキング用の産業用ロボットセルで取り組んでいます。散らかった、整理されていないビンの中の物を、ロボットがどう見て、識別し、つかむのかを学んでいます。SICKのビジョンシステムと、ABBのPickMasterおよびPLB環境で、視覚、物体検出、動作計画を扱います。ロボティクスの概念が実際の産業の仕事になる場面を見られる場所です。',
    },
    summary: { status: { en: 'Since July 2026.', ja: '2026年7月から。' } },
    media: [IMG('image18', 1712, 856, { en: 'Workcell with an industrial robot arm, a parts bin and a chute.', ja: '産業用ロボットアーム、部品ビン、シュートのあるワークセル。' })],
    sim: undefined,
    tags: ['industrial robot', 'bin picking'],
  },
  {
    slug: 'cpu8',
    tier: 'foundation',
    eyebrow: { en: 'Passion project', ja: '個人プロジェクト' },
    title: { en: '8-bit computer', ja: '8ビットコンピュータ' },
    status: 'IN DEVELOPMENT',
    loops: ['decide'],
    blurb: {
      en: 'A computer built from individual logic chips on breadboards, following Ben Eater\u2019s design.',
      ja: 'Ben Eater氏の設計に沿って、個別のロジックICをブレッドボード上に組み上げたコンピュータです。',
    },
    summary: {
      objective: { en: 'See every part of a computer working, one wire at a time.', ja: 'コンピュータのすべての部分が動く様子を、配線1本ずつ確かめる。' },
      method: {
        en: 'A clock steps the machine. Registers hold values, an ALU adds and subtracts, and a shared bus carries data between them. I program it with switches, one instruction at a time.',
        ja: 'クロックが動作を1ステップずつ進めます。レジスタが値を保持し、ALUが加減算を行い、共有バスがそれらの間でデータを運びます。プログラムはスイッチで、1命令ずつ入力します。',
      },
      status: {
        en: 'What I learned: a loose wire can look like a design flaw, and a camera on the bench finds it faster than staring. Days 1 to 9 so far include RAM debugging, display multiplexing and a 2 AM substitution for JK flip-flops. Built with Pervin Korino Dasan.',
        ja: '学んだこと：緩んだ配線は設計の欠陥に見えることがあり、作業台に置いたカメラのほうが、じっと見るより早く見つけてくれます。9日目までに、RAMのデバッグ、表示のマルチプレクス、深夜2時のJKフリップフロップ代替がありました。Pervin Korino Dasanと製作しています。',
      },
    },
    media: [IMG('image5r', 1514, 1280, { en: 'The 8-bit computer on breadboards, seen from above: clock, registers, ALU and bus wired with coloured jumpers, with a microcontroller board at the side.', ja: '真上から見た、ブレッドボード上の8ビットコンピュータ：クロック、レジスタ、ALU、バスが色分けされたジャンパー線で配線され、横にマイコン基板があります。' }),
      IMG('eightbit-day1', 720, 720, { en: 'Breadboards from Day 1 of the build: logic gate and 555 timer tests wired up beside a development board.', ja: '製作1日目のブレッドボード：ロジックゲートと555タイマーの動作確認。' }, { widths: [640], caption: { en: 'Day 1: gates and 555 timer circuits', ja: '1日目：ゲートと555タイマー回路' } })],
    sim: 'cpu8',
    credit: { en: 'Design: Ben Eater', ja: '設計：Ben Eater' },
    tags: ['digital logic', 'debugging'],
  },
  {
    slug: 'robodog',
    tier: 'foundation',
    eyebrow: { en: 'Personal project', ja: '個人プロジェクト' },
    title: { en: 'RoboDog', ja: 'RoboDog' },
    status: 'IN DEVELOPMENT',
    loops: ['act'],
    blurb: {
      en: 'A 3D-printed quadruped, now with a pair of eyes. The mechanism is James Bruton\u2019s open design; the electronics and software are mine.',
      ja: '3Dプリントの四足ロボットに、目がつきました。機構はJames Brutonさんのオープンな設計で、電子回路とソフトウェアは自作です。',
    },
    summary: {
      method: {
        en: 'A custom 2S2P 18650 pack with a 20 A BMS, a soldered ESP32 board driving 6 servos and 2 OLED eyes, and a browser-based servo calibration tool.',
        ja: '20 A BMS付きの自作2S2P 18650バッテリー、6サーボと2つのOLEDの目を駆動するはんだ付けのESP32基板、ブラウザ型サーボ校正ツール。',
      },
      status: {
        en: 'In development; dog-like behaviour comes next. Lessons so far: the \u201c360°\u201d servos were the wrong type, and a flicker was one loose ground pin.',
        ja: '開発中で、次は犬らしい挙動です。これまでの学び：「360°」サーボは種類違いで、画面のちらつきは接地ピン1本の緩みでした。',
      },
    },
    media: [
      IMG('dog-eyes-1', 1600, 719, { en: 'RoboDog on a workshop table with two glowing blue OLED eyes on its head, orange legs and a black electronics bay.', ja: '作業台の上のRoboDog。頭に青く光る2つのOLEDの目、オレンジの脚、黒い電装部。' }, { widths: [640, 1280], caption: { en: 'RoboDog with its eyes on', ja: '目が点いたRoboDog' } }),
      IMG('dog-eyes-2', 1600, 719, { en: 'RoboDog from a slightly different angle, the blue eyes lit and the wiring visible behind the cover.', ja: '少し角度を変えたRoboDog。青い目が点き、カバーの奥に配線が見えます。' }, { widths: [640, 1280] }),
      IMG('dog-eyes-3', 1600, 719, { en: 'RoboDog facing the camera, eyes lit, standing on its orange and blue legs.', ja: 'カメラに向かって立つRoboDog。目が点き、オレンジと青の脚で立っています。' }, { widths: [640, 1280] }),
      IMG('dog-eyes-4', 1600, 719, { en: 'RoboDog seen from the side with the electronics bay open to the control board.', ja: '電装部を開けて制御基板が見える、RoboDogの側面。' }, { widths: [640, 1280] }),
      IMG('image7', 1600, 1185, { en: 'Dog-inspired quadruped robot with an acrylic-covered electronics bay and orange 3D-printed legs.', ja: 'アクリルカバーの電装部とオレンジの3Dプリント脚を持つ犬型四足ロボット。' }, { caption: { en: 'Earlier version with the acrylic cover', ja: 'アクリルカバーつきの初期版' } }),
      IMG('li-dog-bench', 800, 359, { en: 'RoboDog parts on the bench: orange and blue printed legs, yellow plates, servos and the ESP32 perfboard.', ja: '作業台の上のRoboDogの部品：オレンジと青の脚、黄色のプレート、サーボ、ESP32のユニバーサル基板。' }, { widths: [640], caption: { en: 'On the bench', ja: '作業台の上' } }),
      IMG('li-cad-dog', 832, 703, { en: 'CAD render of the RoboDog legs and plates in orange and blue.', ja: 'オレンジと青のRoboDogの脚とプレートのCADレンダリング。' }, { widths: [640], caption: { en: 'In CAD', ja: 'CADモデル' } }),
      IMG('li-cad-part', 800, 743, { en: 'A printed part modelled in Fusion: a box with large round openings.', ja: 'Fusionでモデリングした、大きな丸い開口を持つ箱状の部品。' }, { widths: [640], caption: { en: 'A custom part in Fusion', ja: 'Fusionでのオリジナル部品' } }),
      IMG('li-battery', 800, 600, { en: 'A custom 2S2P pack of four 18650 cells with a 20 A protection board, wired with red and black leads.', ja: '20A保護基板付きの、18650セル4本によるオリジナルの2S2Pバッテリーパック。' }, { widths: [640], caption: { en: 'Custom 2S2P battery pack with a 20 A BMS', ja: '20A BMS付きのオリジナル2S2Pバッテリーパック' } }),
      IMG('li-calib-pins', 480, 1039, { en: 'Screenshot of the RoboDog calibration tool on a phone: pin assignment, wiggle test and neutral trim for each servo.', ja: 'スマートフォン上のRoboDog校正ツールの画面：サーボごとのピン割り当て、ウィグルテスト、中立位置の調整。' }, { widths: [640], caption: { en: 'Calibration tool: pins and neutral', ja: '校正ツール：ピンと中立位置' } }),
      IMG('li-calib-legs', 480, 1039, { en: 'Screenshot of the calibration tool: a table of legs with state, neutral and up and down pulse widths, and jog buttons.', ja: '校正ツールの画面：各脚の状態、中立、上下のパルス幅の表とジョグボタン。' }, { widths: [640], caption: { en: 'Calibration tool: leg table', ja: '校正ツール：脚の表' } }),
      IMG('li-calib-log', 480, 1039, { en: 'Screenshot of the calibration tool debug log showing legs reaching home and moving up and down.', ja: '各脚がホームに到達し上下に動く様子を示す、校正ツールのデバッグログの画面。' }, { widths: [640], caption: { en: 'Calibration tool: live debug log', ja: '校正ツール：リアルタイムのデバッグログ' } }),
    ],
    sim: 'dog',
    credit: { en: 'RoboDog design: James Bruton (open source)', ja: 'RoboDog 設計：James Bruton（オープンソース）' },
    tags: ['legged', 'ESP32', 'servo'],
  },
  {
    slug: 'spider',
    tier: 'foundation',
    eyebrow: { en: 'Personal project', ja: '個人プロジェクト' },
    title: { en: 'Spider quadruped', ja: 'クモ型四足ロボット' },
    status: 'IN DEVELOPMENT',
    loops: ['act'],
    blurb: {
      en: 'A spider-inspired quadruped with two servos in each leg, walking on a granite floor on a tether.',
      ja: '1脚に2つのサーボを持つ、クモ型の四足ロボット。ケーブルをつないだまま、御影石の床を歩きます。',
    },
    summary: {
      method: {
        en: 'Four legs, each with a hip servo that swings the leg and a knee servo that lifts it: eight servos in total, wired to one controller.',
        ja: '4本の脚はそれぞれ、脚を振る股関節サーボと持ち上げる膝サーボを持ち、合計8個のサーボを1つのコントローラにつないでいます。',
      },
      status: { en: 'Walking under cable power. Gait tuning is still going on.', ja: 'ケーブル給電で歩行中です。歩容の調整は続けています。' },
    },
    media: [
      IMG('image6', 1080, 758, { en: 'Spider-inspired quadruped robot.', ja: 'クモ型の四足ロボット。' }, { caption: { en: 'The spider quadruped', ja: 'クモ型四足ロボット' }, widths: [640] }),
    ],
    leadVideo: true,
    videos: [{ src: 'spider-walk-720', poster: 'spider-walk-poster', caption: { en: 'The spider walking across a granite floor', ja: '御影石の床を歩くクモ型ロボット' } }],
    sim: 'spider',
    tags: ['legged', 'servo', 'gait'],
  },
  {
    slug: 'vehicles',
    tier: 'foundation',
    eyebrow: { en: 'Personal projects', ja: '個人プロジェクト' },
    title: { en: 'Bluetooth-controlled vehicle builds', ja: 'Bluetooth操作の車両製作' },
    status: 'BUILT',
    loops: ['act', 'sense'],
    blurb: {
      en: 'A running series of Bluetooth-controlled builds: a 2-wheel car with a castor, a 4-wheel car and a tracked tank. Chassis, drivetrain and control electronics built and tuned and tested.',
      ja: 'Bluetooth操作の車両を継続的に製作：キャスター付き2輪車、4輪車、クローラー型。シャーシ、駆動系、制御回路を製作し、調整・試験しています。',
    },
    summary: { method: { en: 'The tracked tank is the rover built for the Smart India Hackathon (September 2025): an on-board camera reads the grain size of beach sand across intertidal zones, which helps to predict and monitor weather and erosion patterns.', ja: 'クローラー型のロボットは、Smart India Hackathon（2025年9月）向けに製作したローバーです。車載カメラで潮間帯ごとの砂の粒径を読み取り、天候や侵食パターンの予測と監視に役立てます。' } },
    media: [
      IMG('image8', 1056, 719, { en: 'Two-wheel car with a castor: four 18650 cells, buck converter, ESP32 and motor driver on perfboard.', ja: 'キャスター付き2輪車：18650セル4本、降圧コンバータ、ESP32、モータードライバをユニバーサル基板に実装。' }, { caption: { en: '2-wheel car with a castor', ja: 'キャスター付き2輪車' }, widths: [640] }),
      IMG('image10', 1627, 952, { en: 'Tracked tank-style robot.', ja: 'クローラー型の戦車ロボット。' }, { caption: { en: 'Tracked tank', ja: 'クローラー型の戦車' } }),
      IMG('image9', 924, 598, { en: 'Four-wheel acrylic car.', ja: 'アクリル製4輪の車。' }, { caption: { en: '4-wheel acrylic car', ja: 'アクリル製の4輪車' }, widths: [640] }),
    ],
    sim: 'arena',
    tags: ['Bluetooth', 'drivetrain', 'ESP32'],
  },
  {
    slug: 'pipe',
    tier: 'foundation',
    eyebrow: { en: 'Hackathon idea proposal', ja: 'ハッカソン提案' },
    title: { en: 'In-pipe leak inspection robot', ja: '管内リーク検査ロボット' },
    status: 'SIMULATED',
    loops: ['sense', 'decide'],
    blurb: {
      en: 'A proposed mechanism for navigating pipe interiors, modelled and simulated before any physical build.',
      ja: '配管内を移動する機構の提案。実機を作る前にモデル化とシミュレーションを行いました。',
    },
    summary: { status: { en: 'Proposed. Modelled and simulated; not built.', ja: '提案段階。モデル化とシミュレーションまでで、製作はしていません。' } },
    leadVideo: true,
    videos: [{ src: 'pipe-sim-720', poster: 'pipe-sim-poster', caption: { en: 'The in-pipe robot simulation', ja: '管内ロボットのシミュレーション' } }],
    media: [
      IMG('image11', 1920, 1051, { en: 'Blender render of the in-pipe robot design concept.', ja: '管内ロボットの設計コンセプトのBlenderレンダリング。' }, { label: { en: 'Design concept', ja: '設計コンセプト' } }),
      IMG('image12', 1920, 1080, { en: 'Still from the Python pipeline-scan simulation.', ja: 'Pythonによる配管スキャンのシミュレーション画面。' }, { caption: { en: 'Python simulation', ja: 'Pythonシミュレーション' } }),
    ],
    sim: 'pipe',
    tags: ['simulation', 'Blender', 'Python'],
  },
  {
    slug: 'stepscribe',
    tier: 'foundation',
    eyebrow: { en: 'Tooling', ja: 'ツール' },
    title: { en: 'stepscribe-cad', ja: 'stepscribe-cad' },
    status: 'BUILT',
    loops: ['decide'],
    blurb: {
      en: 'Reads a STEP file and extracts its real geometry (holes, assemblies, kinematics) so an AI assistant can reason about a CAD model. Built to avoid re-describing the same model in every conversation. Existing tools may cover parts of this; the aim was a small offline tool that fits my own workflow.',
      ja: 'STEPファイルから実際の形状情報（穴、アセンブリ、運動学）を抽出し、AIアシスタントがCADモデルを理解できるようにするツールです。毎回同じモデルを説明し直す手間をなくすために作りました。既存のツールが一部を担える可能性もありますが、自分の作業に合う小さなオフラインツールを目指しました。',
    },
    summary: {
      method: { en: 'Runs offline, with a command line, a local web page, an MCP server and a Claude Code plugin. Published on PyPI as stepscribe-cad.', ja: 'オフラインで動作。コマンドライン、ローカルWebページ、MCPサーバ、Claude Codeプラグインを備え、PyPIに stepscribe-cad として公開。' },
      status: { en: 'Not yet checked against a CAD system for accuracy; verify important numbers there.', ja: 'CADシステムとの精度照合は未実施のため、重要な数値は別途確認してください。' },
    },
    videos: [{ src: 'stepscribe', poster: 'stepscribe-poster', caption: { en: 'Short demo: a STEP file in, a readable description out', ja: '短い紹介：STEPファイルを入力し、読みやすい説明を出力' } }],
    link: { href: 'https://github.com/idris-botics/stepscribe-cad', label: { en: 'Source on GitHub', ja: 'GitHubのソース' } },
    tags: ['CAD', 'MCP', 'Python'],
  },
  {
    slug: 'stocksite',
    tier: 'foundation',
    eyebrow: { en: 'Outside robotics', ja: 'ロボット以外' },
    title: { en: 'Stock and catalogue website', ja: '在庫・カタログのウェブサイト' },
    status: 'BUILT',
    loops: ['decide'],
    blurb: {
      en: 'Outside robotics, I built a stock and catalogue website for my father\u2019s business. The hard part was not the code. It was understanding how a real shop tracks its products, and designing something that people with no technical background could use every day.',
      ja: 'ロボット以外にも、父の事業のための在庫・カタログのウェブサイトを作りました。難しかったのはコードではなく、実際のお店が商品をどう管理しているかを理解し、技術の知識がない人が毎日使えるものを設計することでした。',
    },
    summary: {},
    tags: ['web', 'catalogue'],
  },
  {
    slug: 'subtlebotic',
    tier: 'foundation',
    eyebrow: { en: 'Internship', ja: 'インターン' },
    title: { en: 'Neuro-robotics internship, Subtlebotic', ja: 'ニューロロボティクスのインターン（Subtlebotic）' },
    status: 'INTERNSHIP',
    loops: ['sense', 'act'],
    blurb: {
      en: 'I helped build and prototype electronics for neuro-robotics, brain-computer interfaces and assistive medical devices. That meant circuit design, choosing components, wiring up sensors, embedded code and a lot of debugging, turning early ideas into prototypes that actually worked. It was my first real look at where electronics, robotics and neuroscience meet, and at building things for people.',
      ja: 'ニューロロボティクス、ブレイン・コンピュータ・インターフェース、医療支援機器のための電子回路の製作と試作を手伝いました。回路設計、部品選定、センサーの配線、組込みコード、そしてたくさんのデバッグを通じて、初期のアイデアを実際に動く試作に変えていきました。電子回路、ロボティクス、神経科学が出会う場所と、人のために作ることを、初めてしっかり見た経験です。',
    },
    summary: {
      objective: { en: 'The textbook boost converter has four parts; the real one needed a switching IC, a feedback network, ratings and layout.', ja: '教科書の昇圧回路は部品4点ですが、実機にはスイッチングIC、帰還回路、定格選定、レイアウトが必要でした。' },
      method: { en: 'Three designs with schematics, EasyEDA layouts and reports: an XL6009 boost converter, a BQ24074 battery charger with protection, and a 555-based long-press switch.', ja: '回路図・EasyEDAレイアウト・報告書付きの3設計：XL6009昇圧回路、保護付きBQ24074充電回路、555タイマーの長押しスイッチ。' },
      status: { en: 'Design work and reports. My breadboard attempt at the boost converter did not work, which taught me why layout matters.', ja: '設計と報告書まで。昇圧回路のブレッドボード試作は動かず、レイアウトの重要性を学びました。' },
    },
    media: [
      IMG('sub-3d-boost', 2160, 937, { en: '3D view of the XL6009 boost converter board with an electrolytic capacitor, inductor, regulator IC and two resistors.', ja: 'XL6009昇圧コンバータ基板の3D表示。電解コンデンサ、インダクタ、レギュレータIC、抵抗2本。' }, { caption: { en: 'XL6009 boost converter board, 3D view', ja: 'XL6009昇圧コンバータ基板（3D表示）' } }),
      IMG('sub-sch-boost', 1418, 1003, { en: 'EasyEDA schematic of the XL6009 boost converter: input capacitors, 47 microhenry inductor, Schottky diode, feedback divider and output capacitors.', ja: 'XL6009昇圧コンバータのEasyEDA回路図：入力コンデンサ、47µHインダクタ、ショットキーダイオード、帰還分圧、出力コンデンサ。' }, { caption: { en: 'Boost converter schematic', ja: '昇圧コンバータの回路図' } }),
      IMG('sub-pcb-boost', 2782, 960, { en: 'PCB layout of the boost converter with top and bottom copper routing.', ja: '上下層の配線を示した昇圧コンバータのPCBレイアウト。' }, { caption: { en: 'Boost converter PCB layout', ja: '昇圧コンバータのPCBレイアウト' } }),
      IMG('sub-sch-bms', 2003, 1417, { en: 'EasyEDA schematic of the battery management system: BQ24074 charger, DW01A protection IC and 8205A dual MOSFET.', ja: 'バッテリー管理システムのEasyEDA回路図：BQ24074充電IC、DW01A保護IC、8205Aデュアル MOSFET。' }, { caption: { en: 'Battery management system schematic', ja: 'バッテリー管理システムの回路図' } }),
      IMG('sub-pcb-bms', 1211, 960, { en: 'PCB layout of the battery management board with the charger IC, protection IC, MOSFET and status LEDs.', ja: '充電IC、保護IC、MOSFET、ステータスLEDを配置したバッテリー管理基板のPCBレイアウト。' }, { widths: [640], caption: { en: 'Battery management PCB layout', ja: 'バッテリー管理基板のPCBレイアウト' } }),
      IMG('sub-pcb-longpress', 1337, 960, { en: 'PCB layout of the 555-based long-press switch with the tactile switch, timer IC, LED and timing components.', ja: 'タクタイルスイッチ、タイマーIC、LED、タイミング部品を配置した555ロングプレススイッチのPCBレイアウト。' }, { caption: { en: 'Long-press switch PCB layout', ja: 'ロングプレススイッチのPCBレイアウト' } }),
    ],
    tags: ['schematic', 'PCB', 'EasyEDA'],
  },
]

export const timeline: { when: string; role: L; where: string }[] = [
  { when: '2026 Jul–', role: { en: 'Research Intern', ja: '研究インターン' }, where: 'ABB Global CoE, Easwari' },
  { when: '2026 May–', role: { en: 'Hardware Team Lead', ja: 'ハードウェアチームリーダー' }, where: 'EPICS in IEEE: G.A.I.T. Assist' },
  { when: '2025 Sep–Nov', role: { en: 'Electronics Hardware Intern', ja: '電子ハードウェアインターン' }, where: 'Subtlebotic' },
  { when: '2025 Aug–', role: { en: 'Head of Content', ja: 'コンテンツ責任者' }, where: 'SEEE, SRM Easwari' },
  { when: '2025 May–', role: { en: 'Documentation Head', ja: '記録責任者' }, where: 'Campus Life, SRM Easwari' },
  { when: '2024 Sep–', role: { en: 'Creative Head', ja: 'クリエイティブ責任者' }, where: 'Electronics Hobby Club' },
]

/** Certificates grouped by theme (not by date); newest first inside each group. Source: LinkedIn export, approved by Idris. */
export const learning: { theme: L; items: L[] }[] = [
  {
    theme: { en: 'Robotics and control', ja: 'ロボティクス・制御' },
    items: [
      { en: 'NPTEL Advanced Robotics (May 2026)', ja: 'NPTEL 先端ロボティクス（2026年5月）' },
      { en: 'NPTEL Computer Vision and Image Processing: Fundamentals and Applications (May 2026)', ja: 'NPTEL コンピュータビジョンと画像処理：基礎と応用（2026年5月）' },
      { en: 'NPTEL Industrial Robotics: Theories for Implementation (December 2025)', ja: 'NPTEL 産業用ロボティクス：実装のための理論（2025年12月）' },
      { en: 'NPTEL Principle of Hydraulic Machines and System Design (December 2025)', ja: 'NPTEL 油圧機械とシステム設計の原理（2025年12月）' },
      { en: 'NPTEL Experimental Robotics (May 2025)', ja: 'NPTEL 実験ロボティクス（2025年5月）' },
      { en: 'NPTEL Introduction to IoT, 90% (May 2025)', ja: 'NPTEL IoT入門 90%（2025年5月）' },
      { en: 'Robotics automation and software simulation with AI, industrial training (My Equation, September 2024)', ja: 'ロボット自動化とAIを用いたソフトウェアシミュレーション 産業研修（My Equation、2024年9月）' },
    ],
  },
  {
    theme: { en: 'Embedded and PCB', ja: '組込み・基板設計' },
    items: [
      { en: 'Altium Designer Essentials (April 2025) and PCB basic design course (March 2025)', ja: 'Altium Designer Essentials（2025年4月）、PCB基礎設計コース（2025年3月）' },
      { en: 'Cisco Computer Hardware Basics (May 2023)', ja: 'Cisco コンピュータハードウェア基礎（2023年5月）' },
    ],
  },
  {
    theme: { en: 'Japanese', ja: '日本語' },
    items: [
      { en: 'JLPT N5 passed (test taken August 2024); NAT-TEST 4Q passed (September 2025)', ja: 'JLPT N5合格（2024年8月受験）、NAT-TEST 4Q合格（2025年9月）' },
    ],
  },
  {
    theme: { en: 'Computing and business', ja: '計算機・ビジネス' },
    items: [
      { en: 'Cisco Python Essentials 1 and 2; Cybersecurity', ja: 'Cisco Python Essentials 1・2、サイバーセキュリティ' },
      { en: 'IBM India Research Lab lecture series on LLMs, generative AI, prompt engineering and RAG (PALS, February 2025)', ja: 'IBMインド研究所の連続講義：LLM、生成AI、プロンプトエンジニアリング、RAG（PALS、2025年2月）' },
      { en: 'NPTEL Entrepreneurship, 86% (November 2024)', ja: 'NPTEL 起業論 86%（2024年11月）' },
    ],
  },
]

/** Publications and awards: their own section on the home page, after About. Newest or most important first inside each group. */
export type Honour = { group: 'pub' | 'award'; year: string; title: L; line: L; link?: { href: string; label: L } }
export const honours: Honour[] = [
  { group: 'pub', year: '2026', title: { en: 'Swarm-actuated net for space debris', ja: '宇宙デブリ捕獲のスウォーム作動ネット' }, line: { en: 'ICCORSE 2026, conceptual, untested.', ja: 'ICCORSE 2026。概念検討で、未検証です。' }, link: { href: 'papers/ASANS-ICCORSE-2026.pdf', label: { en: 'Read the paper (PDF)', ja: '論文を読む（PDF）' } } },
  { group: 'pub', year: '2025', title: { en: 'Rare-earth-free reluctance motor', ja: 'レアアースフリーのリラクタンスモータ' }, line: { en: 'ICUMSAT 2025, third author.', ja: 'ICUMSAT 2025、第3著者。' }, link: { href: 'papers/ICUMSAT-2025-abstract.pdf', label: { en: 'Abstract (PDF)', ja: 'アブストラクト（PDF）' } } },
  { group: 'award', year: '2026', title: { en: 'IEEE EPICS grant', ja: 'IEEE EPICS 助成' }, line: { en: 'USD 3,000, awarded. Hardware Team Lead.', ja: '3,000米ドルを獲得。ハードウェアチームリーダー。' } },
  { group: 'award', year: '2025', title: { en: 'InnovateX 2025', ja: 'InnovateX 2025' }, line: { en: 'IEEE hackathon, runner-up.', ja: 'IEEEハッカソン、準優勝。' } },
  { group: 'award', year: '2026', title: { en: 'India Innovates 2026', ja: 'India Innovates 2026' }, line: { en: 'National finalist.', ja: '全国ファイナリスト。' } },
]

/** Learning out in the field, one event per line. */
export const fieldEvents: L[] = [
  { en: 'IISc EE Summer School 2025 (IEEE Bangalore Section)', ja: 'IISc EEサマースクール2025（IEEE Bangalore Section）' },
  { en: 'Automation Expo South 2025, Chennai', ja: 'Automation Expo South 2025（チェンナイ）' },
  { en: 'Automotive Testing Expo India (April 2025)', ja: 'Automotive Testing Expo India（2025年4月）' },
  { en: 'IMTEX 2026', ja: 'IMTEX 2026' },
  { en: 'NCTPS-II power plant visit (SCADA)', ja: 'NCTPS-II発電所見学（SCADA）' },
  { en: 'Umagine TN 2026', ja: 'Umagine TN 2026' },
  { en: 'Earlier: STEM Centre India robotics and coding, grades 5 to 8 (LEGO NXT, EV3)', ja: '幼少期：STEM Centre Indiaのロボット・コーディング教室（5〜8年生、LEGO NXT・EV3）' },
]

/** The Calm home page shows three featured builds as image-first tiles and the rest as a strip. Everything else lives in the project window. */
// Featured: Idris's three proudest builds (answer 6): the 8-bit computer, RoboDog and the self-balancing swarm.
export const featured = ['cpu8', 'robodog', 'swarm']
/** The order of the project pages: the featured three first, then the rest. Previous and next follow it. */
export const order = [...featured, ...projects.map((p) => p.slug).filter((x) => !featured.includes(x))]

// `clip` is a 4 to 5 s seamless loop of the site's own simulation, cut with HyperFrames (project-videos/tile-clips). G.A.I.T. has no simulation footage yet.
// TODO(idris): real footage of the wristband or the swarm hardware running.
export const tiles: Record<string, { short: L; line?: L; did?: L; strip: L; tag?: L; clip?: string }> = {
  pid: {
    short: { en: 'PID digital twin', ja: 'PIDデジタルツイン' },
    line: { en: 'A servo twin that tunes its own PID gains.', ja: 'PIDゲインを自動調整するサーボのツイン。' },
    did: { en: 'I wrote the specification and the evaluation rules.', ja: '仕様と評価ルールを書きました。' },
    strip: { en: 'Servo PID auto-tuning', ja: 'サーボのPID自動調整' },
    clip: 'tile-pid',
  },
  swarm: {
    short: { en: 'Self-balancing swarm', ja: '自己平衡スウォーム' },
    line: { en: 'Three balancing robots that coordinate without a central controller.', ja: '中央制御なしで協調する、倒立振子型ロボット3台。' },
    did: { en: 'Final-year project, designed and simulated.', ja: '卒業研究。設計とシミュレーションまで。' },
    strip: { en: 'Balancing robots that coordinate', ja: '協調する倒立振子ロボット' },
    clip: 'tile-swarm',
  },
  gait: {
    short: { en: 'G.A.I.T. Assist', ja: 'G.A.I.T. Assist' },
    line: { en: 'A wristband that tells an intended gesture from a tremor.', ja: '意図したジェスチャーと震えを見分けるリストバンド。' },
    did: { en: 'Hardware Team Lead, EPICS grant.', ja: 'ハードウェアチームリーダー、EPICS助成。' },
    strip: { en: 'Gesture wristband, EPICS grant', ja: 'ジェスチャー検知リストバンド' },
  },
  net: { short: { en: 'Net system for debris', ja: 'デブリ捕獲ネット' }, strip: { en: 'Debris net, concept', ja: 'デブリ捕獲の概念' } },
  abb: { short: { en: 'ABB research placement', ja: 'ABB 研究インターン' }, strip: { en: 'Bin-picking cell', ja: 'ビンピッキングセル' } },
  cpu8: {
    short: { en: '8-bit computer', ja: '8ビットコンピュータ' },
    line: { en: 'A computer built from logic chips, programmed with switches.', ja: 'ロジックICで組んだ、スイッチでプログラムするコンピュータ。' },
    did: { en: 'Built wire by wire with Pervin Korino Dasan.', ja: 'Pervin Korino Dasanと、配線を1本ずつ組みました。' },
    strip: { en: 'Built from logic chips', ja: 'ロジックICから製作' } },
  robodog: {
    short: { en: 'RoboDog', ja: 'RoboDog' },
    line: { en: 'A printed quadruped with working eyes.', ja: '目が光る、3Dプリントの四足ロボット。' },
    did: { en: 'I built its electronics, code and calibration tool.', ja: '電子回路、コード、校正ツールを自作しました。' },
    strip: { en: 'Printed quadruped', ja: '3Dプリント四足' } },
  spider: { short: { en: 'Spider quadruped', ja: 'クモ型四足ロボット' }, strip: { en: 'Eight servos', ja: 'サーボ8個' } },
  stocksite: { short: { en: 'Stock website', ja: '在庫サイト' }, strip: { en: 'Family shop catalogue', ja: '家族の店のカタログ' } },
  vehicles: { short: { en: 'Bluetooth vehicles', ja: 'Bluetooth車両' }, strip: { en: 'Cars and a rover', ja: '車とローバー' } },
  pipe: { short: { en: 'Pipe robot', ja: '管内検査ロボット' }, strip: { en: 'Pipe robot, simulated', ja: '管内ロボット（模擬）' } },
  stepscribe: { short: { en: 'stepscribe-cad', ja: 'stepscribe-cad' }, strip: { en: 'CAD for AI, v2 coming', ja: 'AI向けCAD、v2開発中' } },
  subtlebotic: { short: { en: 'Neuro-robotics internship', ja: 'ニューロロボティクスのインターン' }, strip: { en: 'Electronics for BCI', ja: 'BCI向け電子回路' } },
}

/** Path: a short timeline. Awards sit in the same list. */
// TODO(idris): JLPT level and date, and the master's start date (answer 11).
export const pathRows: { when: string; text: L }[] = [
  { when: '2026 Jul', text: { en: 'Research intern, ABB Global CoE, Easwari', ja: '研究インターン、ABB Global CoE（Easwari）' } },
  { when: '2026 May', text: { en: 'Hardware Team Lead, G.A.I.T. Assist', ja: 'ハードウェアチームリーダー（G.A.I.T. Assist）' } },
  { when: '2025 Sep', text: { en: 'Intern, Subtlebotic', ja: 'インターン、Subtlebotic' } },
  { when: '2025 Aug', text: { en: 'Head of Content, SEEE', ja: 'コンテンツ責任者、SEEE' } },
  { when: '2024 Sep', text: { en: 'Creative Head, Electronics Hobby Club', ja: 'クリエイティブ責任者、Electronics Hobby Club' } },
]

/** Beyond the lab: a photo strip with short captions. Only photos already published on the site. */
export const strip: { media: Media; caption: L; link?: { href: string; label: L }; video?: { src: string; poster: string; label: L } }[] = [
  { media: IMG('li-emcee', 624, 360, { en: 'The author on stage at the lectern during the First-Year Inauguration of Easwari Engineering College.', ja: 'Easwari Engineering Collegeの新入生歓迎式典で、演台に立つ本人。' }, { widths: [640] }), caption: { en: 'Emcee, first-year inauguration', ja: '新入生歓迎式典の司会' }, link: { href: 'https://www.youtube.com/watch?v=mXb8H1wp9NQ', label: { en: 'Watch the recording on YouTube', ja: 'YouTubeで録画を見る' } } },
  { media: IMG('li-podcast-logo', 1280, 720, { en: 'The Elite Encounters set: the author and a guest at the desk, with the show logo on the screen behind them.', ja: 'Elite Encountersの収録風景：机を挟んで座る本人とゲスト、背後のスクリーンに番組ロゴ。' }, { widths: [640, 1280] }), caption: { en: 'Hosting a college podcast', ja: '大学のポッドキャスト司会' }, link: { href: 'https://youtu.be/Q-IukgMDHOI', label: { en: 'Watch the episode on YouTube', ja: 'YouTubeでエピソードを見る' } } },
  { media: IMG('li-print-result', 480, 640, { en: 'The printed dragon keychain in orange and blue on a tiled table.', ja: 'オレンジと青で印刷されたドラゴンのキーホルダー。' }, { widths: [640] }), caption: { en: 'My first 3D print', ja: '初めての3Dプリント' } },
  { media: IMG('li-soccer', 1534, 700, { en: 'The author’s small two-wheeled robot with a castor wheel pushing a ball across a black pitch with white markings, with a person holding its control cable.', ja: '白いラインの入った黒いピッチ上でボールを押す、本人の、キャスター付き二輪の小型ロボットと、その操作ケーブルを持つ人。' }, { widths: [640, 1280] }), caption: { en: 'Robo Soccer: a hard loss', ja: 'ロボサッカー：大敗' },
    // the full run; the label is the honest version of the story. TODO(idris): the year, the event and what failed on the bot (hidden until given).
    video: { src: 'soccer-run', poster: 'soccer-run-poster', label: { en: 'The full Robo Soccer run. I lost badly, and the people there were kind and took pity on my bot.', ja: 'ロボサッカーの試合の全記録。大敗でした。会場の皆さんは親切で、私のロボットを気の毒に思ってくれました。' } } },
]

// TODO(idris): the new podcast (name, date, link). Hidden until filled in; add it to `strip` above when known (docs/ANSWERS-NEEDED.md).

// Update `asOf` whenever these numbers are re-checked in the apps (guide §24.10).
export const habits = {
  asOf: '2026-11-04',
  duolingoDays: 1239,
  leetcode: { solved: 587, activeDays: 276, maxStreak: 74 },
}

export const links = {
  linkedin: 'https://www.linkedin.com/in/idris-sadiq-934697213/',
  github: 'https://github.com/idris-botics',
  email: 'idris.connected@gmail.com',
}
