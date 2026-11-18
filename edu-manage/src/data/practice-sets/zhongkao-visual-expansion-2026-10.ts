import type { PracticeQuestion, PracticeSet } from '../parent-practice-bank'
import currentJuniorCatalog from '../../../data/textbooks/current-junior-textbook-catalog-2026.json'

type CatalogEntry = { title: string; path?: string[] }
type CatalogVolume = {
  subject: string
  title: string
  publisher: string
  termLabel?: string
  sourceReferences?: Array<{ url: string }>
  entries: CatalogEntry[]
}

const volumes = (currentJuniorCatalog as { volumes: CatalogVolume[] }).volumes

function findVolume(subject: string, volumeTitle: string) {
  const volume = volumes.find((item) => item.subject === subject && item.title === volumeTitle)
  if (!volume) throw new Error(`找不到现行教材目录：${subject}/${volumeTitle}`)
  return volume
}

function normalizeTitle(value: string) {
  return value.replace(/[\s\u3000]+/g, '')
}

function makeSet(input: {
  id: string
  subject: string
  volumeTitle: string
  entryTitle: string
  evidence: string
  examStyle: string
  knowledgePoints: Array<{ title: string; content: string }>
  questions: Array<Omit<PracticeQuestion, 'id' | 'sourceRef'> & { sourceRef?: string }>
}): PracticeSet {
  const volume = findVolume(input.subject, input.volumeTitle)
  const entry = volume.entries.find((item) => normalizeTitle(item.title) === normalizeTitle(input.entryTitle))
  if (!entry) throw new Error(`现行教材目录中找不到课次：${input.subject}/${input.volumeTitle}/${input.entryTitle}`)

  const locator = (entry.path?.length ? entry.path : [entry.title]).join(' / ')
  const directoryUrl = volume.sourceReferences?.[0]?.url
  if (!directoryUrl) throw new Error(`缺少目录来源：${input.subject}/${input.volumeTitle}`)

  const gradeLabel = volume.title.startsWith('七年级') ? '初一'
    : volume.title.startsWith('八年级') ? '初二'
      : '初三'
  const volumeLabel = volume.title.replace(/^(七|八|九)年级/, '')
  const knowledgePoints = input.knowledgePoints.map((point, index) => ({
    id: `${input.id}-kp${index + 1}`,
    ...point,
  }))
  const sourceNote = [
    `教材：${volume.publisher}《${volume.title}》${volume.termLabel ? `（${volume.termLabel}）` : ''}`,
    `现行目录：${directoryUrl}；课次定位：${locator}`,
    `知识核对：${input.evidence}`,
    `题目设计：${input.examStyle}`,
    '牧哲学堂原创题；按目录所列知识范围命题，不照录教材或第三方题库。',
  ].join('；')

  return {
    id: input.id,
    grade: gradeLabel,
    subject: input.subject,
    volume: volumeLabel,
    chapter: entry.path?.[0] ?? entry.title,
    section: entry.path?.slice(1).join(' / ') || entry.title,
    edition: `${volume.publisher}${volume.termLabel ? `（${volume.termLabel}）` : ''}`,
    sourceNote,
    catalogEvidence: { kind: 'public_directory_url', ref: directoryUrl, locator },
    publishable: true,
    reviewedBy: 'Codex 内容校验',
    reviewedAt: '2026-10-14',
    knowledgePoints,
    questions: input.questions.map((question, index) => ({
      ...question,
      id: `${input.id}-q${index + 1}`,
      sourceRef: question.sourceRef || `${sourceNote}#${input.id}-q${index + 1}`,
    })),
  }
}

const quadraticId = 'visual-zk-math-9b-quadratic-application-202610'
const tangentId = 'visual-zk-math-9b-circle-tangent-202610'
const resistanceId = 'visual-zk-physics-9-resistance-measurement-202610'
const solubilityId = 'visual-zk-chemistry-9b-solubility-curve-202610'

export const zhongkaoVisualExpansionSets202610: PracticeSet[] = [
  makeSet({
    id: quadraticId,
    subject: '数学',
    volumeTitle: '九年级下册',
    entryTitle: '30.3 二次函数的应用',
    evidence: '现行冀教版九年级下册目录将实际建模列于二次函数应用；图中坐标、拱顶和截距由本组题目条件给定。',
    examStyle: '函数图像识读、实际情境建模、交点与最值计算；选择、填空和解答按中考常见设问组织，多项选择仅作知识辨析练习。',
    knowledgePoints: [
      { title: '二次函数模型与图像', content: '根据顶点、对称轴和已知点确定解析式，再借助图像解释变量的实际意义。' },
      { title: '函数图像与实际范围', content: '把高度条件转化为函数不等式，求出横坐标范围，并结合对称性解释实际宽度。' },
    ],
    questions: [
      {
        type: 'single_choice',
        knowledgePointId: `${quadraticId}-kp1`,
        prompt: '某拱门截面近似抛物线，地面为 x 轴。图中顶点为 P(0，8)，与地面交于 A(-4，0)、B(4，0)。当横坐标 x=2 m 时，该处拱门高度为（ ）。',
        options: ['4 m', '6 m', '7 m', '8 m'],
        answerIndex: 1,
        imageUrl: '/images/practice/zhongkao-parabolic-arch.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】根据二次函数图像确定解析式，并计算指定自变量对应的函数值。\n【从哪里入手】图像关于 y 轴对称，顶点是 (0，8)，所以可设 y=ax²+8；再把已知交点 B(4，0)代入求 a。\n【解题步骤】① 0=16a+8，解得 a=-1/2。② x=2 时，y=-1/2×2²+8=6。③ 高度取正值，故拱门高度为 6 m。\n【易错提醒】不要把横坐标 2 直接当成高度；代入的是 x，算出的 y 才是高度。',
      },
      {
        type: 'multiple_choice',
        knowledgePointId: `${quadraticId}-kp1`,
        prompt: '仍用图示拱门模型 y=-1/2x²+8。下列说法正确的是（多选）（ ）。',
        options: [
          '对称轴是 y 轴，即 x=0',
          '拱顶高度为 8 m',
          '拱门与地面的交点横坐标是 -2 和 2',
          '当 x=2 时，拱门高度为 6 m',
        ],
        answerIndices: [0, 1, 3],
        imageUrl: '/images/practice/zhongkao-parabolic-arch.svg',
        difficulty: 'MEDIUM',
        explanation: '【考查知识点】二次函数的对称轴、顶点、零点与函数值。\n【从哪里入手】先把每个说法对应到图像或解析式的一个特征，逐项代入检查。\n【解题步骤】① y=-1/2x²+8 的对称轴为 x=0，A正确。② 顶点为 (0，8)，最大高度是 8 m，B正确。③ 令 y=0，得 x²=16，所以交点横坐标为 -4 和 4，C错误。④ x=2 时 y=6，D正确。故选 A、B、D。\n【易错提醒】零点要令 y=0 求出，不能从图中误读刻度。',
      },
      {
        type: 'fill_blank',
        knowledgePointId: `${quadraticId}-kp2`,
        prompt: '车辆通行区域要求拱门高度不低于 7.5 m。由图像从左到右看，满足条件的横坐标范围端点是 ____ m 和 ____ m。',
        correctAnswer: ['-1', '1'],
        acceptedAnswers: ['-1,1', '-1；1'],
        imageUrl: '/images/practice/zhongkao-parabolic-arch.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】将实际高度限制转化为二次函数不等式，并利用对称性确定区间。\n【从哪里入手】“高度不低于 7.5 m”对应 y≥7.5；区间端点在图像与水平线 y=7.5 的交点处。\n【解题步骤】① 解方程 -1/2x²+8=7.5。② 得 x²=1，交点横坐标为 -1 和 1。③ 抛物线在两交点之间高于 7.5 m，因此端点从左到右为 -1、1。\n【易错提醒】答案要按横坐标从小到大填写；这里求的是区间端点，不是区间长度。',
      },
      {
        type: 'short_answer',
        knowledgePointId: `${quadraticId}-kp2`,
        prompt: '若通行净高要求为 7.5 m，求满足净高的拱门水平宽度，并写出求解过程。',
        correctAnswer: '2 m。令 -1/2x²+8=7.5，得 x=-1 或 x=1；满足 y≥7.5 的区间为 [-1，1]，宽度为 1-(-1)=2 m。',
        gradingMode: 'self_check',
        imageUrl: '/images/practice/zhongkao-parabolic-arch.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】用函数不等式解决拱门净高与通行宽度问题。\n【从哪里入手】先求达到临界高度 7.5 m 的两个交点，再判断它们之间是不是符合净高要求的区域。\n【解题步骤】① 令 -1/2x²+8=7.5，解得 x=±1。② 因为抛物线开口向下，且顶点高度 8 m，大于 7.5 m，所以区间 [-1，1] 内都满足条件。③ 宽度=1-(-1)=2 m。\n【易错提醒】横坐标区间长度要用右端点减左端点；不要只写一个端点或把答案写成 1 m。',
      },
    ],
  }),
  makeSet({
    id: tangentId,
    subject: '数学',
    volumeTitle: '九年级下册',
    entryTitle: '29.2 切线的性质和判定',
    evidence: '题目只使用圆的切线、半径垂直切线及勾股定理；图中切点与半径关系按题设标注。',
    examStyle: '圆的切线识别、几何证明与直角三角形计算；单选、填空和证明解答按中考常见设问组织，多项选择仅作知识辨析练习。',
    knowledgePoints: [
      { title: '切线的性质与判定', content: '圆的切线垂直于过切点的半径；经过半径外端且垂直于这条半径的直线是圆的切线。' },
      { title: '圆外一点的两条切线', content: '从圆外一点引圆的两条切线，切线长相等；圆心到切点的半径与切线组成直角三角形。' },
    ],
    questions: [
      {
        type: 'single_choice',
        knowledgePointId: `${tangentId}-kp1`,
        prompt: '如图，AP 是 ⊙O 的切线，切点为 P。若 OP=6 cm，AP=8 cm，则 OA 的长为（ ）。',
        options: ['7 cm', '10 cm', '12 cm', '14 cm'],
        answerIndex: 1,
        imageUrl: '/images/practice/zhongkao-circle-tangent.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】切线的性质与勾股定理。\n【从哪里入手】先连接圆心 O 与切点 P。半径 OP 垂直于切线 AP，因此 △OPA 是直角三角形，OA 是斜边。\n【解题步骤】OA²=OP²+AP²=6²+8²=100，所以 OA=10 cm。\n【易错提醒】OA 是斜边，不能用两条直角边相减；长度取正值。',
      },
      {
        type: 'multiple_choice',
        knowledgePointId: `${tangentId}-kp2`,
        prompt: '如图，从圆外一点 A 向 ⊙O 引两条切线，切点分别为 P、Q。下列结论正确的是（多选）（ ）。',
        options: [
          'AP=AQ',
          'OP⊥AP 且 OQ⊥AQ',
          'OA⊥AP',
          'OA 平分 ∠PAQ',
        ],
        answerIndices: [0, 1, 3],
        imageUrl: '/images/practice/zhongkao-circle-tangent.svg',
        difficulty: 'MEDIUM',
        explanation: '【考查知识点】圆外一点的两条切线长相等，切点半径垂直切线。\n【从哪里入手】逐项区分“切点处的半径”和“圆心到外点的连线”：垂直关系发生在切点处。\n【解题步骤】① 同一点 A 引出的两条切线满足 AP=AQ。② OP、OQ 分别是切点半径，所以 OP⊥AP、OQ⊥AQ。③ OA 一般不垂直单条切线，C错误。④ △OPA 与 △OQA 可由斜边 OA 相等、直角边 OP=OQ 判定全等，因此 OA 平分 ∠PAQ。\n【易错提醒】不要把“半径垂直切线”错写成“圆心连外点垂直切线”。',
      },
      {
        type: 'fill_blank',
        knowledgePointId: `${tangentId}-kp1`,
        prompt: '如图，OA=13 cm，⊙O 的半径 OP=5 cm，AP 是切线，则 AP=____ cm。',
        correctAnswer: '12',
        acceptedAnswers: ['12cm', '12 cm'],
        imageUrl: '/images/practice/zhongkao-circle-tangent.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】切线性质与勾股定理逆向求直角边。\n【从哪里入手】△OPA 在 P 处为直角，已知斜边 OA 和一条直角边 OP，求另一条直角边 AP。\n【解题步骤】AP²=OA²-OP²=13²-5²=169-25=144，AP=12 cm。\n【易错提醒】此处是“斜边平方减直角边平方”，不能把 13-5 直接相减。',
      },
      {
        type: 'short_answer',
        knowledgePointId: `${tangentId}-kp2`,
        prompt: '如图，AP、AQ 分别与 ⊙O 相切于 P、Q。若 OP=5 cm、AP=12 cm，请证明 AP=AQ，并求 OA。',
        correctAnswer: '连接 OQ。OP⊥AP，OQ⊥AQ；OA 为公共斜边，OP=OQ=5 cm，所以 Rt△OPA≌Rt△OQA（HL），得 AP=AQ。由勾股定理 OA=√(5²+12²)=13 cm。',
        gradingMode: 'self_check',
        imageUrl: '/images/practice/zhongkao-circle-tangent.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】切线长定理、切线性质、直角三角形全等和勾股定理。\n【从哪里入手】分别连接圆心到两个切点，得到两条由切线与半径组成的直角三角形；先证全等，再计算 OA。\n【解题步骤】① 因为 AP、AQ 为切线，OP⊥AP、OQ⊥AQ。② 在 Rt△OPA 与 Rt△OQA 中，斜边 OA 公共，OP=OQ=5 cm，所以两三角形由 HL 全等。③ 对应边 AP=AQ。④ 在 Rt△OPA 中，OA²=OP²+AP²=5²+12²=169，因此 OA=13 cm。\n【易错提醒】写 HL 全等时必须明确两三角形都是直角三角形，并指出斜边和一条直角边分别相等。',
      },
    ],
  }),
  makeSet({
    id: resistanceId,
    subject: '物理',
    volumeTitle: '九年级全一册',
    entryTitle: '第3节　电阻的测量',
    evidence: '按人教版九年级欧姆定律实验内容组织，电路图中的电流表串联、电压表并联、滑动变阻器串联连接。',
    examStyle: '实验探究常见的电路识图、仪器连接、安全操作、表格处理和误差分析；多项选择仅作实验操作辨析练习。',
    knowledgePoints: [
      { title: '伏安法测电阻', content: '用电压表测量待测电阻两端电压，用电流表测通过电阻的电流，根据 R=U/I 计算电阻。' },
      { title: '实验操作与数据处理', content: '闭合开关前将滑动变阻器调到最大阻值；改变电压进行多次测量并求平均值，可减小偶然误差。' },
    ],
    questions: [
      {
        type: 'single_choice',
        knowledgePointId: `${resistanceId}-kp1`,
        prompt: '按图连接电路，测得待测电阻两端电压 U=2.4 V，通过它的电流 I=0.30 A，则待测电阻 R 为（ ）。',
        options: ['6 Ω', '8 Ω', '12 Ω', '24 Ω'],
        answerIndex: 1,
        imageUrl: '/images/practice/zhongkao-ohm-resistance-circuit.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】欧姆定律的变形公式 R=U/I，以及电流表、电压表的测量对象。\n【从哪里入手】确认 U 和 I 都是待测电阻 Rx 对应的测量值，再代入 R=U/I。\n【解题步骤】R=2.4 V÷0.30 A=8 Ω。\n【易错提醒】不要把电阻写成 U×I；单位 V/A 化简为 Ω。',
      },
      {
        type: 'multiple_choice',
        knowledgePointId: `${resistanceId}-kp2`,
        prompt: '利用图示电路测电阻，下列操作或结论正确的是（多选）（ ）。',
        options: [
          '闭合开关前，滑动变阻器接入电路的阻值应调到最大',
          '移动滑片改变 Rx 两端电压，可进行多次测量',
          '只测一次即可把该次读数当作无误差的精确值',
          '电压表应串联在 Rx 所在支路中',
        ],
        answerIndices: [0, 1],
        imageUrl: '/images/practice/zhongkao-ohm-resistance-circuit.svg',
        difficulty: 'MEDIUM',
        explanation: '【考查知识点】伏安法实验的安全操作、电路连接和减小误差的方法。\n【从哪里入手】先检查“开关闭合前”的安全要求，再判断电表的连接位置和多次测量的作用。\n【解题步骤】① 闭合前把滑动变阻器调到最大阻值，能限制电流，A正确。② 移动滑片改变 Rx 两端电压并重复测量，可用多组数据求平均，B正确。③ 一次测量不能消除偶然误差，C错误。④ 电压表应并联在 Rx 两端，D错误。\n【易错提醒】电流表串联，电压表并联；滑片“最大阻值端”要结合实际接线柱判断。',
      },
      {
        type: 'fill_blank',
        knowledgePointId: `${resistanceId}-kp1`,
        prompt: '某次实验中 U=1.8 V、I=0.20 A，待测电阻为 ____ Ω。',
        correctAnswer: '9',
        acceptedAnswers: ['9Ω', '9 Ω'],
        imageUrl: '/images/practice/zhongkao-ohm-resistance-circuit.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】伏安法测电阻的计算依据是欧姆定律的变形公式 R=U/I，电阻单位为欧姆（Ω）。\n【从哪里入手】先确认题目给的是待测电阻两端的电压 U 和通过它的电流 I，再判断应使用“电压除以电流”。\n【解题步骤】① 写出 R=U/I。② 代入 R=1.8 V÷0.20 A。③ 计算得 R=9 Ω，并用 V/A=Ω 检查单位。\n【易错提醒】不能把 U、I 相乘；1.8÷0.20=9，注意 0.20 A 表示 0.2 A。',
      },
      {
        type: 'short_answer',
        knowledgePointId: `${resistanceId}-kp2`,
        prompt: '某同学记录了三组实验数据：U/V 为 1.0、1.5、2.0；I/A 为 0.10、0.15、0.20。求三次测得的电阻及其平均值，并说明多次测量的作用。',
        correctAnswer: '三次电阻均为 10 Ω，平均值为 10 Ω。多次测量取平均值可减小偶然误差。',
        gradingMode: 'self_check',
        imageUrl: '/images/practice/zhongkao-ohm-resistance-circuit.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】伏安法测电阻的数据处理，以及多次测量求平均值减小偶然误差。\n【从哪里入手】对每一组数据分别计算 U/I；不要先把电压、电流分别平均后再跳过过程。\n【解题步骤】① R₁=1.0÷0.10=10 Ω。② R₂=1.5÷0.15=10 Ω。③ R₃=2.0÷0.20=10 Ω。④ 平均值=(10+10+10)÷3=10 Ω。⑤ 多次测量取平均可减小偶然误差，但不能消除系统误差。\n【易错提醒】不要把“多次测量”说成能消除一切误差；还要确认实验中电阻温度没有明显改变。',
      },
    ],
  }),
  makeSet({
    id: solubilityId,
    subject: '化学',
    volumeTitle: '九年级下册',
    entryTitle: '课题2 溶解度',
    evidence: '题目按人教版九年级溶解度曲线知识设计；图中 A、B 的数值是为本题自拟的读图数据，不代表具体物质的实测溶解度。',
    examStyle: '溶解度曲线图像识读、温度变化下饱和状态判断、结晶量和溶质质量分数计算；多项选择仅作曲线信息辨析练习。',
    knowledgePoints: [
      { title: '溶解度曲线的读图', content: '曲线上某点表示相应温度下的饱和溶液；曲线高低比较同温度下溶解度，交点表示两物质该温度下溶解度相等。' },
      { title: '温度变化与结晶', content: '降温时溶解度减小，原饱和溶液中超过新温度溶解度的溶质析出；溶质质量分数按溶质质量除以溶液质量计算。' },
    ],
    questions: [
      {
        type: 'single_choice',
        knowledgePointId: `${solubilityId}-kp2`,
        prompt: '图示 A 物质在 60 ℃ 时的溶解度为 60 g/100 g 水，在 20 ℃ 时为 20 g/100 g 水。将含 200 g 水的 60 ℃ A 饱和溶液降温到 20 ℃，忽略水的蒸发，析出晶体的质量为（ ）。',
        options: ['40 g', '60 g', '80 g', '120 g'],
        answerIndex: 2,
        imageUrl: '/images/practice/zhongkao-solubility-curves.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】由溶解度曲线读取不同温度下的溶解度，并按水的质量比例计算降温结晶量。\n【从哪里入手】先求同一份水在高、低温时分别能溶解多少 A，再用高温溶质量减去低温仍能溶解的质量。\n【解题步骤】① 60 ℃ 时，200 g 水能溶解 60×200÷100=120 g A。② 20 ℃ 时，200 g 水最多能溶解 20×200÷100=40 g A。③ 析出质量=120-40=80 g，选 C。\n【易错提醒】溶解度按每 100 g 水定义，200 g 水要乘 2；结晶量不是高温溶解度本身，也不是溶液总质量的变化。',
      },
      {
        type: 'multiple_choice',
        knowledgePointId: `${solubilityId}-kp1`,
        prompt: '根据图示 A、B 两条溶解度曲线，下列判断正确的是（多选）（ ）。',
        options: [
          '20 ℃ 时，B 的溶解度大于 A',
          '40 ℃ 时，A 与 B 的溶解度相等',
          '60 ℃ 时，A 的溶解度大于 B',
          '只要两条曲线相交，任意温度下两物质的溶解度都相等',
        ],
        answerIndices: [0, 1, 2],
        imageUrl: '/images/practice/zhongkao-solubility-curves.svg',
        difficulty: 'MEDIUM',
        explanation: '【考查知识点】比较指定温度下的溶解度，并理解曲线交点的意义。\n【从哪里入手】先看题目指定的温度，再沿竖直方向读两条曲线的高低；交点只表示交点对应温度。\n【解题步骤】① 20 ℃ 时 B 曲线在 A 上方，A正确。② 两线在 40 ℃ 相交，表示该温度下溶解度相等，B正确。③ 60 ℃ 时 A 曲线在 B 上方，C正确。④ 相交只说明一个交点温度下相等，D错误。\n【易错提醒】溶解度比较必须在同一温度下进行，不能只看曲线整体趋势。',
      },
      {
        type: 'fill_blank',
        knowledgePointId: `${solubilityId}-kp2`,
        prompt: '由图读出 40 ℃ 时 A 的溶解度为 40 g/100 g 水，则该温度下 A 饱和溶液的溶质质量分数约为 ____%。（结果保留一位小数）',
        correctAnswer: '28.6',
        acceptedAnswers: ['28.6%', '28.57', '28.57%'],
        imageUrl: '/images/practice/zhongkao-solubility-curves.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】区分溶解度与溶质质量分数，并进行百分数计算。\n【从哪里入手】40 g 溶质对应 100 g 水，所以饱和溶液质量是 40+100=140 g。\n【解题步骤】溶质质量分数=40÷140×100%≈28.571…%，保留一位小数为 28.6%。\n【易错提醒】不能把溶解度 40 g 直接写成 40%；分母应是溶液质量，不是水的质量。',
      },
      {
        type: 'short_answer',
        knowledgePointId: `${solubilityId}-kp1`,
        prompt: '将 20 ℃ 的 B 饱和溶液升温到 60 ℃，不加入或移走溶质和水。说明溶液是否仍饱和、溶质质量分数是否变化，并结合图像说明理由。',
        correctAnswer: '升温后变为不饱和溶液；溶质质量分数不变。升温前后溶质和水的质量均未改变，实际溶质质量分数不变；但 B 在 60 ℃ 的溶解度大于 20 ℃，原有溶质量低于 60 ℃ 的溶解限度。',
        gradingMode: 'self_check',
        imageUrl: '/images/practice/zhongkao-solubility-curves.svg',
        difficulty: 'EXAM',
        explanation: '【考查知识点】温度改变对溶解度、饱和状态和实际溶质质量分数的不同影响。\n【从哪里入手】把“溶解度（某温度下最多能溶多少）”和“这杯溶液实际含多少溶质”分开判断。\n【解题步骤】① 图中 B 曲线从 20 ℃ 到 60 ℃ 上升，说明 B 的溶解度增大。② 没有加入或移走溶质、水，溶质质量和溶液总质量都不变，所以实际溶质质量分数不变。③ 升温后原有溶质量低于新的溶解度，因此溶液变为不饱和。\n【易错提醒】溶解度变化不等于溶液中溶质质量自动变化；温度改变本身不会凭空改变质量分数。',
      },
    ],
  }),
]
