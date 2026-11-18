import type { PracticeQuestion, PracticeSet } from '../parent-practice-bank'

const catalogUrl = 'https://jx.panqjy.cn/catalog/list?book_id=3002645'
const edition = '人教版 · 2026 春学年版'
const liquidPressureLocator = '第九章 压强 / 第2节 液体的压强'
const balanceLocator = '第八章 运动和力 / 第2节 二力平衡'
const pressureLocator = '第九章 压强 / 第1节 压强'

function sourceRef(locator: string, questionId: string, note: string) {
  return `牧哲学堂物理题库；教材：${edition}《物理八年级下册》；目录定位：${locator}；目录证据（新版目录）：${catalogUrl}；考查内容：${note}；题目编号：${questionId}`
}

const liquidPressureSetId = 'physics-expansion-2026-10-liquid-pressure'

export const physicsExpansionSets202610: PracticeSet[] = [
  {
    id: liquidPressureSetId,
    grade: '初二',
    subject: '物理',
    volume: '下册',
    chapter: '第九章 压强',
    section: '第2节 液体的压强',
    edition,
    sourceNote: `牧哲学堂原创中考能力拓展题；按${edition}《物理八年级下册》“${liquidPressureLocator}”定位。目录证据（新版目录）：${catalogUrl}。题组涵盖压强计情境、单位计算、深度关系和液体压强方向解释。`,
    catalogEvidence: {
      kind: 'public_directory_url',
      ref: catalogUrl,
      locator: liquidPressureLocator,
    },
    knowledgePoints: [
      {
        id: `${liquidPressureSetId}-kp1`,
        title: '液体压强的计算',
        content: '静止液体中，深度 h 处由液体产生的压强 p=ρgh；ρ 是液体密度，g 是重力与质量的比值，h 是该点到自由液面的竖直深度。SI 单位分别为 kg/m³、N/kg、m，压强单位为 Pa。',
      },
      {
        id: `${liquidPressureSetId}-kp2`,
        title: '液体压强与深度、密度的关系',
        content: '在同一种静止液体中，液体压强随深度增大而增大；同一深度处，液体密度越大，压强越大。同种液体同一深度各方向的压强相等，容器形状和底面积不决定该处压强。',
      },
      {
        id: `${liquidPressureSetId}-kp3`,
        title: '液体内部压强的方向',
        content: '静止液体内部向各个方向都有压强；同一点处压强大小不因测量方向改变。液体对容器壁的压力方向垂直于接触面，不能把“压强向各方向”误解成容器壁所受压力都竖直向下。',
      },
    ],
    questions: [
      {
        id: `${liquidPressureSetId}-q1`,
        type: 'single_choice',
        knowledgePointId: `${liquidPressureSetId}-kp1`,
        prompt: '水下 0.20 m 深处某点的液体压强约为多少？取水的密度 ρ=1.0×10³ kg/m³、g=10 N/kg，忽略大气压。',
        options: ['2.0×10³ Pa。', '2.0×10² Pa。', '2.0×10⁴ Pa。', '1.0×10⁵ Pa。'],
        answerIndex: 0,
        explanation: '液体产生的压强用 p=ρgh 计算，代入 ρ=1.0×10³ kg/m³、g=10 N/kg、h=0.20 m，得 p=1.0×10³×10×0.20=2.0×10³ Pa。单位相乘为 (kg/m³)(N/kg)(m)=N/m²=Pa。深度要用竖直距离且换成米；本题求液体压强，不另加大气压。',
        difficulty: '基础',
        sourceRef: sourceRef(liquidPressureLocator, `${liquidPressureSetId}-q1`, '液体压强公式及国际单位换算'),
      },
      {
        id: `${liquidPressureSetId}-q2`,
        type: 'single_choice',
        knowledgePointId: `${liquidPressureSetId}-kp2`,
        prompt: '三个形状和底面积都不同的容器装有静止的水，水深均为 0.30 m。忽略容器内气体压强差，比较各容器底部水产生的压强，正确的是哪一项？',
        options: ['三者相等。', '底面积最大的容器中压强最大。', '底面积最小的容器中压强最大。', '压强随容器形状不同而不同。'],
        answerIndex: 0,
        explanation: '三处液体都是水，密度 ρ 相同，底部深度 h 也相同，所以由 p=ρgh 可知液体压强相等。压强单位为 Pa；底面积和容器形状不会出现在液体压强公式中。易错点是把液体对底的压力 F 与压强 p 混淆：压力还要结合受力面积，压强则由液体密度和深度决定。',
        difficulty: '基础',
        sourceRef: sourceRef(liquidPressureLocator, `${liquidPressureSetId}-q2`, '同种液体同一深度的压强相等及容器形状无关性'),
      },
      {
        id: `${liquidPressureSetId}-q3`,
        type: 'single_choice',
        knowledgePointId: `${liquidPressureSetId}-kp2`,
        prompt: '水和植物油中各取一处，距各自液面都为 0.40 m。已知水的密度为 1.0×10³ kg/m³、植物油密度为 0.8×10³ kg/m³，取 g=10 N/kg。哪一判断正确？',
        options: ['水中该点压强较大，约为 4.0×10³ Pa。', '植物油中该点压强较大，约为 3.2×10³ Pa。', '两点压强相等，均为 4.0×10³ Pa。', '两点压强相等，均为 3.2×10³ Pa。'],
        answerIndex: 0,
        explanation: '用 p=ρgh 分别计算：水中 p水=1.0×10³×10×0.40=4.0×10³ Pa，植物油中 p油=0.8×10³×10×0.40=3.2×10³ Pa。因此水中压强较大。这里两处深度和 g 相同，比较结果由密度决定；密度必须用 kg/m³，压强结果用 Pa，不能只比较液体名称或容器大小。',
        difficulty: '提升',
        sourceRef: sourceRef(liquidPressureLocator, `${liquidPressureSetId}-q3`, '液体密度影响液体内部压强'),
      },
      {
        id: `${liquidPressureSetId}-q4`,
        type: 'single_choice',
        knowledgePointId: `${liquidPressureSetId}-kp3`,
        prompt: '把一个可转动的压强探头固定在静止水中某一位置，再改变探头朝向而不改变位置。关于该点液体压强，正确的是哪一项？',
        options: ['读数不因探头朝向改变；液体内部同一点向各方向都有压强。', '探头朝上时读数为零。', '探头朝下时读数才最大。', '只有探头竖直向下时液体才有压强。'],
        answerIndex: 0,
        explanation: '静止液体内部同一点向各个方向都有压强，且同一点的压强大小相等，因此只改变探头朝向、保持位置不变时，读数不变。压强的 SI 单位仍是 Pa；压强是标量，方向信息体现在液体对某一受力面的压力方向上。不要把液体压强误认为只沿竖直向下存在。',
        difficulty: '提升',
        sourceRef: sourceRef(liquidPressureLocator, `${liquidPressureSetId}-q4`, '静止液体内部压强的方向性及同一点压强大小'),
      },
    ],
  },
]

type ExplanationRevision = Partial<PracticeQuestion>

const balanceExplanations: Record<string, ExplanationRevision> = {
  'physics-8b-8-2-q1': {
    prompt: '物体处于平衡状态时，关于它所受合力的说法正确的是',
    options: ['合力一定为零。', '一定只受一对平衡力。', '合力一定不为零。', '一定不受任何力。'],
    answerIndex: 0,
    explanation: '平衡状态包括静止和匀速直线运动；物体处于平衡状态时，所受合力为零，合力单位是 N。平衡力可以是同一物体受两个力，也可能有多个力共同平衡，所以不能把“合力为零”误说成“一定只受一对力”或“不受力”。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q1', '平衡状态与合力为零；本题已将错误的“一定只受一对力”表述改正'),
  },
  'physics-8b-8-2-q2': {
    explanation: '二力平衡要求两个力作用在同一个物体上，大小相等、方向相反，并作用在同一直线上，四个条件缺一不可。满足条件时合力为零，力的单位为 N；只说等大反向还不充分，因为两力若分别作用在两个物体上，就属于相互作用力而非平衡力。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q2', '二力平衡的同体、等大、反向、共线条件'),
  },
  'physics-8b-8-2-q3': {
    explanation: '静止在桌面上的课本速度不变，所受合力为零，因此受到平衡力作用。下落的苹果和加速升空的火箭速度在变化；汽车匀速转弯虽速率不变，但运动方向改变，速度仍改变，合力不为零。判断是否平衡要看速度矢量是否恒定，而不能只看物体是否“在运动”。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q3', '静止及匀速直线运动对应合力为零'),
  },
  'physics-8b-8-2-q4': {
    explanation: '书静止在水平桌面上，书受到竖直向下的重力和桌面对书竖直向上的支持力，这两个力都作用在书上，大小相等、方向相反且共线，所以是一对平衡力。书对桌面的压力作用在桌子上，不能与书的重力组成平衡力；判断时先确认两个力是否作用于同一物体。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q4', '静置物体的重力与支持力构成平衡力'),
  },
  'physics-8b-8-2-q5': {
    explanation: '书对桌面的压力作用在桌子上，桌面对书的支持力作用在书上，二者分别作用于两个物体，大小相等、方向相反，是一对相互作用力。平衡力必须作用在同一物体上，所以不能把这对力称为书的平衡力；书本身的平衡力是重力和支持力。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q5', '压力和支持力作为相互作用力与平衡力的区别'),
  },
  'physics-8b-8-2-q6': {
    explanation: '物体做匀速直线运动，水平方向合力为零。水平拉力为 20 N，摩擦力方向与运动方向相反并与拉力平衡，因此摩擦力大小为 20 N；力的单位是 N。物体重 100 N 与水平面支持力在竖直方向平衡，这个竖直受力不改变水平方向的判断。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q6', '匀速直线运动中的水平二力平衡及摩擦力'),
  },
  'physics-8b-8-2-q7': {
    explanation: '货物匀速上升，速度保持不变，故合力为零；钢丝绳拉力与重力方向相反、大小相等。重力 G=mg=500 kg×10 N/kg=5000 N，所以拉力为 5000 N。质量单位 kg、g 的单位 N/kg，计算出的力必须用 N；“上升”不代表一定有向上的合力。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q7', '匀速上升时拉力与重力平衡及 G=mg'),
  },
  'physics-8b-8-2-q8': {
    explanation: '力的三要素是大小、方向和作用点。两个力三要素完全相同，说明它们方向相同，而二力平衡要求方向相反，因此这两个力一定不是平衡力。即使大小相等、作用点相同，也不能弥补方向条件不满足；同向力的合力不是零，合力单位为 N。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q8', '三要素相同的两个力不满足二力平衡的反向条件'),
  },
  'physics-8b-8-2-q9': {
    explanation: '物体匀速前进，水平方向合力为零，所以水平摩擦力与 20 N 推力等大反向，摩擦力为 20 N，合力为 0 N。竖直方向重力 50 N 与支持力也相互平衡；把水平力和竖直力混在一起相减是错误的，需按方向分析各分力后再判断总合力。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q9', '匀速运动时摩擦力、推力及合力'),
  },
  'physics-8b-8-2-q10': {
    explanation: '平衡力作用在同一个物体上，合力为零；相互作用力则分别作用在两个相互作用的物体上，大小相等、方向相反。二者大小和方向关系看起来相似，但受力对象不同，不能互换概念。分析一对力时可分别标出“施力物体”和“受力物体”，以免把压力与支持力当成同一物体的平衡力。',
    sourceRef: sourceRef(balanceLocator, 'physics-8b-8-2-q10', '平衡力与相互作用力的受力物体区别'),
  },
}

const pressureExplanations: Record<string, ExplanationRevision> = {
  'physics-8b-9-1-q1': {
    explanation: '压强定义为物体所受压力 F 与受力面积 S 的比值，公式 p=F/S。计算时 F 用 N、S 用 m²，所得 p 的单位是 Pa，且 1 Pa=1 N/m²。易错点是把面积换算漏掉，或把“物体底面积”直接代入而不核实实际接触面积；只有题目明确水平支持且无其他竖直作用时，支持压力才可由物重确定。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q1', '压强定义、公式与国际单位'),
  },
  'physics-8b-9-1-q2': {
    explanation: '在国际单位制中，压强单位是帕斯卡，符号 Pa；由 p=F/S 可见 1 Pa=1 N/m²。牛顿 N 是力的单位，焦耳 J 是能量的单位，瓦特 W 是功率的单位。书写计算结果时不能只写数值，还要保留 Pa，并确认代入的面积已换算为 m²。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q2', '压强的 SI 单位帕斯卡及单位换算'),
  },
  'physics-8b-9-1-q3': {
    explanation: '刀刃磨薄后，刀对物体的压力近似不变，而刃口实际受力面积变小。由 p=F/S 可知，在 F 不变时 S 越小，压强越大，因此磨薄刀刃是为了增大压强。压强用 Pa 表示；书包带、铁轨枕木和宽履带则通过增大接触面积来减小压强。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q3', '压力一定时减小受力面积可以增大压强'),
  },
  'physics-8b-9-1-q4': {
    explanation: '物体在水平桌面上静止且无其他竖直拉力时，对桌面的压力等于物重 100 N；实际接触面积为物体底面积 0.1 m²。因此 p=F/S=100 N÷0.1 m²=1000 N/m²=1000 Pa。桌面总面积 1 m²不是受力面积，不能代入公式；压强单位应写 Pa。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q4', '水平支持压力、接触面积与 p=F/S 的计算'),
  },
  'physics-8b-9-1-q5': {
    explanation: '受力面积是物体与支持面实际接触并相互挤压的面积。本题物体底面与桌面接触，故 S=0.1 m²；桌面虽有 1 m²，但没有被物体覆盖的部分不传递该物体的压力。求压强时用 p=F/S，面积应以 m²计，结果单位为 Pa。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q5', '受力面积应取物体与支持面的实际接触面积'),
  },
  'physics-8b-9-1-q6': {
    explanation: '坦克宽大履带把坦克对地面的压力分散到更大的接触面积上。由 p=F/S，在压力近似不变时 S 增大，地面受到的压强减小；单位仍为 Pa。菜刀、图钉和缝衣针都通过较小受力面积增大压强，方便切入或刺入，方向与本题要求相反。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q6', '压力近似不变时增大受力面积可减小压强'),
  },
  'physics-8b-9-1-q7': {
    explanation: '同一块砖的重力不变，水平地面支持它时压力大小相同。砖竖放时与地面接触的面最小，由 p=F/S 可知在 F 不变时面积越小压强越大，因此竖放对地面压强最大。压强单位为 Pa；这里比较压强不能只凭接触面积，而要同时确认压力相同。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q7', '压力相同时接触面积越小压强越大'),
  },
  'physics-8b-9-1-q8': {
    explanation: '人的重力 F=mg=60 kg×10 N/kg=600 N；站立时两只鞋共同接触地面，总面积 S=2×200 cm²=400 cm²=0.04 m²。于是 p=F/S=600 N÷0.04 m²=1.5×10⁴ Pa。不能只用一只鞋的面积，也不能把 cm² 的数值不换算就代入 SI 公式。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q8', '重力计算、双脚总接触面积与面积单位换算'),
  },
  'physics-8b-9-1-q9': {
    explanation: '正方体边长 10 cm=0.10 m，底面接触面积 S=(0.10 m)²=0.010 m²。物体静放在水平桌面上时，对桌面的压力等于重力 60 N，因此 p=F/S=60 N÷0.010 m²=6000 Pa。桌面面积 0.5 m²不是受力面积；先统一长度单位再平方很关键。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q9', '正方体接触面积、压力与压强计算'),
  },
  'physics-8b-9-1-q10': {
    explanation: '由 p=F/S 可知，只有在压力 F 一定时，受力面积 S 越小，压强才越大，所以“压力一定时，面积越小压强越大”正确。单说压力变大或面积变小，若另一个量也变化，就不能断定压强必然增大。压力方向垂直于接触面，未必总是竖直向下；压强单位为 Pa。',
    sourceRef: sourceRef(pressureLocator, 'physics-8b-9-1-q10', '压强公式中的变量关系及压力方向'),
  },
}

export const physicsExplanationRevisions202610: Record<string, ExplanationRevision> = {
  'physics-expansion-2026-10-liquid-pressure-q1': {
    type: 'short_answer',
    prompt: '水库巡检人员在水面下 2.4 m 处读取水压数据。已知水的密度为 1.0×10³ kg/m³，取 g=10 N/kg，求该处水产生的压强，并写出所用的深度。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: 'p=ρgh=1.0×10³×10×2.4=2.4×10⁴ Pa；h 为该点到自由液面的竖直距离 2.4 m。',
    gradingMode: 'self_check',
    explanation: '液体压强只计液体产生的部分，用 p=ρgh。代入得 2.4×10⁴ Pa；深度是从自由液面到该点的竖直距离，不是沿容器壁或斜坡量出的距离。量纲为 (kg/m³)(N/kg)(m)=N/m²=Pa。',
    difficulty: '提升',
    sourceRef: sourceRef(liquidPressureLocator, 'physics-expansion-2026-10-liquid-pressure-q1', '带单位的液体压强计算与深度辨析'),
  },
  'physics-expansion-2026-10-liquid-pressure-q2': {
    type: 'fill_blank',
    prompt: '同一杯静水中，甲点距液面 0.20 m，乙点距液面 0.60 m。忽略大气压，乙点的液体压强是甲点的 ____ 倍。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '3',
    acceptedAnswers: ['3', '3倍'],
    gradingMode: 'exact',
    explanation: '同种液体中 ρ、g 相同，液体压强与深度 h 成正比，所以 p乙/p甲=h乙/h甲=0.60/0.20=3。比较压强倍数时，不必先求出两个压强的具体数值。',
    difficulty: '基础',
    sourceRef: sourceRef(liquidPressureLocator, 'physics-expansion-2026-10-liquid-pressure-q2', '同种液体压强与深度成正比'),
  },
  'physics-expansion-2026-10-liquid-pressure-q3': {
    type: 'single_choice',
    prompt: '用压强计测静止液体。已知水的密度为 1.0×10³ kg/m³、植物油密度为 0.75×10³ kg/m³，取 g=10 N/kg。探头在水中距液面 0.30 m 时读数为 3.0 kPa；在植物油中距液面 0.40 m 时读数也约为 3.0 kPa。最合理的解释是',
    options: ['两处压强相同，因为水的密度较大而深度较浅。', '两处压强相同，说明液体压强与密度和深度都无关。', '植物油密度较大，抵消了较大的深度。', '相同读数只能说明两个容器底面积相同。'],
    answerIndex: 0,
    explanation: '水中 p=ρgh=1.0×10³×10×0.30=3.0×10³ Pa；植物油中按 ρ=0.75×10³ kg/m³ 计算，p=0.75×10³×10×0.40=3.0×10³ Pa。两处读数相同，是密度较大的液体对应较小深度，乘积 ρh 相同；容器底面积不决定液体内部某点的压强。',
    difficulty: '提升',
    sourceRef: sourceRef(liquidPressureLocator, 'physics-expansion-2026-10-liquid-pressure-q3', '结合压强计读数比较不同液体中的压强'),
  },
  'physics-expansion-2026-10-liquid-pressure-q4': {
    type: 'short_answer',
    prompt: '某同学认为静止液体只对容器底部有向下的压强，对侧壁没有压强。用“把压强计探头固定在水中同一点并转动探头”的实验说明他的说法哪里不对，并说明液体对容器壁的压力方向。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '同一点液体压强计读数不因探头朝向改变而改变，说明静止液体内部向各个方向都有压强，且同一点压强大小相等。液体对容器壁的压力垂直于接触面。',
    gradingMode: 'self_check',
    explanation: '保持探头位置不变只改变受压面朝向，若压强计读数相同，就说明同一点液体压强不因方向而改变。静止液体内部向各方向都有压强；液体对容器壁的压力则垂直于接触面，侧壁所受压力不一定竖直向下。',
    difficulty: '提升',
    sourceRef: sourceRef(liquidPressureLocator, 'physics-expansion-2026-10-liquid-pressure-q4', '用探头方向变化验证同一点液体压强及容器壁压力方向'),
  },
  ...balanceExplanations,
  ...pressureExplanations,
  'physics-9q-15-3-q6': {
    prompt: '如图，甲、乙是楼道声控灯的两种接法。S声在有声音时闭合，S光在光线暗时闭合。若灯L仅在两种条件同时满足时点亮，则下列对甲、乙两图开关连接方式的判断正确的是（　）。',
    options: ['甲串联、乙并联', '甲并联、乙串联', '甲、乙均为串联', '甲、乙均为并联'],
    answerIndex: 0,
    imageUrl: '/images/practice/physics-sound-light-switches-series-parallel.svg',
    explanation: '看图中的节点和电流路径：甲中电流必须依次经过S声、S光和灯L，两开关串联，只有两种条件同时满足时才形成通路；乙中两开关位于并联支路，只要其中一个开关闭合就可能形成通路。因此甲串联、乙并联，选A。',
    sourceRef: '人教版九年级全一册第十五章第3节《串联电路和并联电路》；原创电路识图题。',
  },
  'physics-9q-15-3-q7': {
    prompt: '如图，教室照明电路中开关S位于干路。闭合S后，若L₁所在支路断开，L₂仍能发光，则L₁、L₂的连接方式是（　）。',
    imageUrl: '/images/practice/physics-classroom-lamps-parallel.svg',
    answerIndex: 1,
    explanation: '图中L₁、L₂分别位于两条支路，并连接在同一对节点之间；L₁支路断开不会切断L₂支路，因此两灯并联。开关S位于干路，能同时控制两灯。',
    sourceRef: '人教版九年级全一册第十五章第3节《串联电路和并联电路》；依据教室照明电路的并联特点绘制示意图，牧哲学堂原创图示，非中考真题。',
  },
  'physics-9q-17-1-q6': {
    prompt: '如图，定值电阻A、B的I-U图线都经过原点，图线A比图线B更陡。由此可判断（　）。',
    imageUrl: '/images/practice/physics-ohm-law-i-u-lines.svg',
  },
  'physics-9q-17-4-q4': {
    prompt: '如图，R₁=5 Ω与R₂=15 Ω串联接在8 V电源上，电路中的电流为（　）。',
    imageUrl: '/images/practice/physics-series-resistors-5-15-8v.svg',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/05-物理/牧哲学堂资料/九年级上册/牧哲学堂九年级全一册物理2025版资料（教师版）.md，“专题15 欧姆定律”；依据题设参数绘制串联电路图，非河北中考真题。',
  },
  'physics-9q-17-4-q5': {
    prompt: '如图，R₁=5 Ω与R₂=15 Ω串联接在8 V电源上，R₁两端电压为（　）。',
    imageUrl: '/images/practice/physics-series-resistors-5-15-8v.svg',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/05-物理/牧哲学堂资料/九年级上册/牧哲学堂九年级全一册物理2025版资料（教师版）.md，“专题15 欧姆定律”；依据题设参数绘制串联电路图，非河北中考真题。',
  },
  'physics-9q-17-4-q6': {
    prompt: '如图，R₁=10 Ω与R₂=40 Ω并联接在6 V电源上，通过R₁的电流为（　）。',
    imageUrl: '/images/practice/physics-parallel-resistors-10-40-6v.svg',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/05-物理/牧哲学堂资料/九年级上册/牧哲学堂九年级全一册物理2025版资料（教师版）.md，“专题15 欧姆定律”；依据题设参数绘制并联电路图，非河北中考真题。',
  },
  'physics-9q-17-4-q7': {
    prompt: '如图，R₁=10 Ω与R₂=40 Ω并联接在6 V电源上，通过R₂的电流为（　）。',
    imageUrl: '/images/practice/physics-parallel-resistors-10-40-6v.svg',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/05-物理/牧哲学堂资料/九年级上册/牧哲学堂九年级全一册物理2025版资料（教师版）.md，“专题15 欧姆定律”；依据题设参数绘制并联电路图，非河北中考真题。',
  },
  'physics-8a-4-3-q5': {
    prompt: '一人身高1.7 m，站在竖直平面镜前。该人在镜中的像高为（　）。',
  },
  'physics-8a-5-3-q5': {
    prompt: '凸透镜焦距为10 cm，物体距透镜30 cm，所成实像的像距范围为（　）。',
  },
  'physics-8a-6-4-q5': {
    prompt: '一个铁球质量为158 g、总体积为30 cm³，已知ρ铁=7.9 g/cm³。铁球空心部分的体积为（　）。',
  },
  'physics-8b-8-3-q5': {
    prompt: '用10 N水平力推一个重50 N的箱子，箱子在水平地面上匀速滑动。若将推力增大到15 N且箱子仍在滑动，箱子受到的滑动摩擦力为（　）。',
  },
  'physics-8b-9-1-q5': {
    prompt: '一个重100 N的物体放在水平桌面上，物体底面积0.1 m²、桌面面积1 m²。计算物体对桌面的压强时，受力面积应取（　）。',
  },
  'physics-8b-10-2-q5': {
    prompt: '一个体积为1×10⁻³ m³的物体浸没在水中，ρ水=1×10³ kg/m³、g=10 N/kg。若该物体只有一半体积浸在水中，所受浮力为（　）。',
  },
  'physics-8b-10-3-q5': {
    prompt: '一个实心物体重5 N，体积为0.5×10⁻³ m³，取g=10 N/kg。该物体的密度为（　）。',
  },
  'physics-8b-12-3-q6': {
    prompt: '用滑轮组提升重物，承担重物和动滑轮总重的绳段数n=3。若物重G=60 N，且不计滑轮重和摩擦，则拉力F为（　）。',
  },
  'physics-8b-12-4-q5': {
    prompt: '一台机械工作时总功为500 J，其中有用功为400 J。该机械的额外功为（　）J。',
  },
  'physics-8b-12-4-q9': {
    prompt: '用滑轮组将重900 N的物体匀速提升2 m，拉力做的总功为2400 J。若承担物重的绳段数n=3，则拉力F为（　）N。',
  },
  'physics-9q-14-2-q9': {
    prompt: '某四冲程汽油机飞轮转速为1200 r/min。该汽油机每秒完成的工作循环数为（　）。',
  },
  'physics-9q-16-4-q5': {
    prompt: '某滑动变阻器铭牌标有“20 Ω　2 A”。其中“2 A”表示（　）。',
  },
  'physics-9q-18-4-q5': {
    prompt: '一个10 Ω的导体通过2 A电流，通电1 min产生热量。若电流增大为原来的2倍、通电时间和电阻保持不变，产生的热量为原来的（　）倍。',
  },
  'physics-9q-18-4-q9': {
    prompt: '如图，R₁=5 Ω与R₂=10 Ω并联在同一电源两端。通电时间相同，产生热量较多的是（　）。',
    imageUrl: '/images/practice/physics-parallel-heating-5-10ohm.svg',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/05-物理/牧哲学堂资料/九年级上册/牧哲学堂九年级全一册物理2025版资料（教师版）.md，“考点四 焦耳定律”；据并联电路和焦耳定律重绘示意图，非河北中考真题。',
  },
  'current-catalog-2026-physics-9c-save-electricity-deep-q3': {
    prompt: '一台1.5 kW电暖器每天少用2 h，一个月按30天计算，电价为0.56元/(kW·h)。一个月约节省电费多少元？',
  },
}
