import type { PracticeQuestion, PracticeSet } from '../parent-practice-bank'

type ExplanationRevision = Partial<PracticeQuestion>

const catalogUrl = 'https://www.haoduoyun.cc/book/jjb/shuxue/vy7s/147.shtml'
const edition = '冀教版 · 2022课标新版'
const locator = '五 一元一次方程 / 3 解一元一次方程'
const setId = 'math-expansion-2026-10-solving-linear-equations'
const sourceBase = '牧哲学堂原创拓展题/2026-10/数学/七年级上册/五/3解一元一次方程'

function sourceRef(id: string) {
  return `${sourceBase}#${id}`
}

const quadraticSourceBase = '牧哲学堂原创拓展题/2026-10/数学/九年级全一册/第二十四章 一元二次方程/24.2 解一元二次方程'

function quadraticSourceRef(id: string) {
  return `${quadraticSourceBase}#${id}`
}

export const mathExpansionSets202610: PracticeSet[] = [
  {
    id: setId,
    grade: '初一',
    subject: '数学',
    volume: '上册',
    chapter: '第五章 一元一次方程',
    section: '5.3 解一元一次方程',
    edition,
    sourceNote: `牧哲学堂原创中考能力拓展题；按${edition}七年级上册“${locator}”定位。目录证据：${catalogUrl}。题组覆盖情境建模、去分母、等价变形纠错和方程解的情况判断。`,
    catalogEvidence: {
      kind: 'public_directory_url',
      ref: catalogUrl,
      locator,
    },
    knowledgePoints: [
      {
        id: `${setId}-kp1`,
        title: '去括号与移项',
        content: '解含括号的一元一次方程时，先依据分配律去括号，再把含未知数的项和常数项分别整理。等式两边同时加、减同一个数或式子，所得方程与原方程同解；移项时符号改变。',
      },
      {
        id: `${setId}-kp2`,
        title: '去分母与系数化为一',
        content: '方程含分数时，可将等式两边同时乘各分母的最小公倍数；等号两边每一项都要乘这个数，包括括号外的常数项。合并同类项后，再用非零系数除等式两边。',
      },
      {
        id: `${setId}-kp3`,
        title: '小数方程与等式检验',
        content: '含小数系数时，可把小数化成分数或同乘适当的10的幂来消去小数。每一步都保持等式两边相等；求得解后代回原方程检验，可以发现符号、括号和小数计算错误。',
      },
      {
        id: `${setId}-kp4`,
        title: '方程解的情况',
        content: '化简后若未知数项消去并得到恒等式，则任意数都是方程的解；若得到矛盾的数值等式，则方程无解。不能在未知数系数为0时继续除以该系数。',
      },
    ],
    questions: [
      {
        id: `${setId}-q1`,
        type: 'single_choice',
        knowledgePointId: `${setId}-kp1`,
        prompt: '解方程：3(2x−1)−2(x+4)=2x+1，x=（ ）。',
        options: ['6', '−6', '5', '11'],
        answerIndex: 0,
        explanation: '先用分配律去括号：6x−3−2x−8=2x+1，合并左边同类项得4x−11=2x+1。两边同时减去2x、再同时加11，得到2x=12，所以x=6。代回原式，左边3×11−2×10=13，右边2×6+1=13，检验成立。去括号时−2(x+4)中的常数项是−8，容易误写成+8。',
        difficulty: 'MEDIUM',
        sourceRef: sourceRef(`${setId}-q1`),
      },
      {
        id: `${setId}-q2`,
        type: 'single_choice',
        knowledgePointId: `${setId}-kp3`,
        prompt: '解方程：0.4(x−3)+0.2=0.3x−1.3，x=（ ）。',
        options: ['−3', '3', '−0.3', '−1'],
        answerIndex: 0,
        explanation: '两边同时乘10消去小数，得4(x−3)+2=3x−13。去括号并合并常数：4x−12+2=3x−13，即4x−10=3x−13；两边同时减3x、加10，得x=−3。代回原式，左边0.4×(−6)+0.2=−2.2，右边0.3×(−3)−1.3=−2.2。乘10时等式两边的每一项都要乘10。',
        difficulty: 'MEDIUM',
        sourceRef: sourceRef(`${setId}-q2`),
      },
      {
        id: `${setId}-q3`,
        type: 'single_choice',
        knowledgePointId: `${setId}-kp2`,
        prompt: '解方程：(x+2)/4+(x−1)/6=2，x=（ ）。',
        options: ['4', '−4', '5', '2'],
        answerIndex: 0,
        explanation: '分母4和6的最小公倍数是12。等式两边同时乘12，得到3(x+2)+2(x−1)=24；这里第一项乘12后是3(x+2)，第二项是2(x−1)。去括号并合并同类项：3x+6+2x−2=24，即5x+4=24，所以5x=20、x=4。检验：6/4+3/6=1.5+0.5=2。去分母时不能只乘分子，也不能漏乘等号右边的2。',
        difficulty: 'MEDIUM',
        sourceRef: sourceRef(`${setId}-q3`),
      },
      {
        id: `${setId}-q4`,
        type: 'single_choice',
        knowledgePointId: `${setId}-kp4`,
        prompt: '方程5(x−2)−2(2x−1)=x+8的解的情况是（ ）。',
        options: ['无解', 'x=0', 'x=8', '任意有理数都是解'],
        answerIndex: 0,
        explanation: '去括号得5x−10−4x+2=x+8，左边合并为x−8，于是x−8=x+8。两边同时减去x后得到−8=8，这是不成立的数值等式，因此方程无解。这里未知数项消去后出现矛盾，不能把x的系数当作非零数继续除；若得到恒等式才表示任意数都满足。',
        difficulty: 'EXAM',
        sourceRef: sourceRef(`${setId}-q4`),
      },
    ],
  },
]

export const mathExplanationRevisions202610: Record<string, ExplanationRevision> = {
  'math-9-2-2-q1': {
    type: 'single_choice',
    prompt: '学校给矩形种植区铺设防草布，已知长比宽多 3 m、面积为 40 m²。设宽为 x m，符合题意的宽是',
    options: ['5 m', '8 m', '−5 m', '−8 m'],
    answerIndex: 0,
    explanation: '列方程 x(x+3)=40，整理为 x²+3x−40=0=(x+8)(x−5)，得 x=−8 或 x=5。宽是长度单位并且为正数，因此取 x=5 m；对应长为8 m，面积检验为40 m²。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q1'),
  },
  'math-9-2-2-q2': {
    type: 'fill_blank',
    prompt: '方程 x²−6x+5=0 的两个根从小到大依次是 ____、____。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '1；5',
    acceptedAnswers: ['1,5', '1、5', '1；5'],
    gradingMode: 'exact',
    explanation: '把左边因式分解为(x−1)(x−5)=0，因此x=1或x=5。按从小到大填写为1、5；可代入原方程检验两根均成立。',
    difficulty: '基础',
    sourceRef: quadraticSourceRef('math-9-2-2-q2'),
  },
  'math-9-2-2-q3': {
    type: 'multiple_choice',
    prompt: '方程 x²+6x+2=0。下列关于配方和求根的结论正确的有（多选）',
    options: ['配方可得 (x+3)²=7。', '两根为 −3+√7 和 −3−√7。', '判别式为 28。', '两根为 −3+√28 和 −3−√28。'],
    answerIndices: [0, 1, 2],
    explanation: '移项并配方：x²+6x=−2，两边加9得(x+3)²=7，所以x=−3±√7。判别式为6²−4×1×2=28。选项D把判别式28直接当作开方后的数，少了先开平方这一步。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q3'),
  },
  'math-9-2-2-q4': {
    type: 'short_answer',
    prompt: '一列相邻的正整数相乘，积为72。设较小的整数为 x，请列一元二次方程并求这两个正整数，说明为何要舍去另一个代数根。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '列方程 x(x+1)=72，即 x²+x−72=0=(x+9)(x−8)。根为 x=−9 或 x=8。题意要求正整数，舍去−9，故两数为8和9。',
    gradingMode: 'self_check',
    explanation: '数量关系为较小整数乘以紧邻的下一个整数，故为x(x+1)=72。解方程得−9和8。−9虽为代数根，却不符合“正整数”这一题意条件，只有8可用，对应相邻正整数8和9。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q4'),
  },
  'math-9-2-2-q5': {
    type: 'fill_blank',
    prompt: '方程 2x²−3x−2=0 的较大根是 ____。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '2',
    acceptedAnswers: ['2'],
    gradingMode: 'exact',
    explanation: '因式分解得(2x+1)(x−2)=0，根为−1/2和2，故较大根为2。代入原方程可验证两根都使等式成立。',
    difficulty: '基础',
    sourceRef: quadraticSourceRef('math-9-2-2-q5'),
  },
  'math-9-2-2-q6': {
    type: 'short_answer',
    prompt: '小林解方程 x²=5x 时，直接约去等式两边的 x，得到 x=5。请指出这一做法遗漏的解，并写出完整解法。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '应先移项并因式分解：x²−5x=0，即x(x−5)=0。由两个因式分别为0，得x=0或x=5。不能直接约去x，因为尚未知道x≠0。',
    gradingMode: 'self_check',
    explanation: '方程两边同除以x只在已知x不为0时等价。原方程本身允许x=0，因此直接约去x会漏根。移项得x(x−5)=0，利用“两个因式的积为0”可得两个解0和5。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q6'),
  },
  'math-9-2-2-q7': {
    type: 'single_choice',
    prompt: '若一元二次方程 x²+kx+4=0 有两个相等的实数根，则 k 的值为',
    options: ['k=0', 'k=4', 'k=4 或 k=−4', 'k=−4'],
    answerIndex: 2,
    explanation: '两个相等实根的判别条件是判别式等于0。这里Δ=k²−4×1×4=k²−16，令Δ=0得k²=16，所以k=4或k=−4。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q7'),
  },
  'math-9-2-2-q8': {
    type: 'short_answer',
    prompt: '不使用求根公式，判断方程 3x²−6x+5=0 是否有实数根，并写出判断依据。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '判别式 Δ=b²−4ac=(−6)²−4×3×5=36−60=−24<0，因此方程没有实数根。',
    gradingMode: 'self_check',
    explanation: '对一元二次方程ax²+bx+c=0，判别式小于0时没有实数根。本题Δ=36−60=−24，故无实数根；无需继续套用求根公式。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q8'),
  },
  'math-9-2-2-q9': {
    type: 'short_answer',
    prompt: '用公式法解方程 2x²−4x−1=0。写出判别式、代入求根公式的过程，并把结果化简。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: 'a=2，b=−4，c=−1，Δ=(−4)²−4×2×(−1)=24。x=[4±√24]/4=1±√6/2。',
    gradingMode: 'self_check',
    explanation: '公式法需要先确定a、b、c的符号，尤其本题c=−1。判别式为24，代入求根公式得x=(4±√24)/4；因√24=2√6，化简为1±√6/2。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q9'),
  },
  'math-9-2-2-q10': {
    type: 'short_answer',
    prompt: '某校园活动的门票原价 20 元，原计划售出 400 张。估算每降价 1 元可多售出 20 张。若实际总收入为 7920 元，设降价 x 元，列方程并求符合题意的降价额。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '收入方程为(20−x)(400+20x)=7920。化简得8000−20x²=7920，即x²=4，x=±2。因降价额x≥0，取x=2元。此时票价18元、售出440张，收入为7920元。',
    gradingMode: 'self_check',
    explanation: '票价为20−x，销量为400+20x，收入等于单价乘销量。展开时一次项抵消，得到8000−20x²=7920，解得x=±2。负值表示涨价而不是降价，故只取2元；把票价18元和销量440张代回，乘积为7920元。',
    difficulty: '提升',
    sourceRef: quadraticSourceRef('math-9-2-2-q10'),
  },
  [`${setId}-q1`]: {
    type: 'short_answer',
    prompt: '学校活动组购买篮球和跳绳。篮球单价比跳绳贵 80 元，买 2 个篮球和 4 根跳绳共花 760 元。设跳绳单价为 x 元，请列方程并求两种单价。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '设跳绳单价为 x 元，则篮球单价为 (x+80) 元。列方程 2(x+80)+4x=760，解得 x=100。因此跳绳 100 元/根，篮球 180 元/个。',
    gradingMode: 'self_check',
    explanation: '数量关系是“2个篮球的总价+4根跳绳的总价=760元”。由篮球单价比跳绳高80元，可设跳绳为 x 元、篮球为 x+80 元，得 2(x+80)+4x=760，解得 x=100。代回检验：2×180+4×100=760，符合题意。',
    difficulty: '提升',
    sourceRef: sourceRef(`${setId}-q1`),
  },
  [`${setId}-q2`]: {
    type: 'fill_blank',
    prompt: '解方程 0.4(x−3)+0.2=0.3x−1.3，x=____。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '-3',
    acceptedAnswers: ['-3', '−3'],
    gradingMode: 'exact',
    explanation: '方程两边同乘10，得4(x−3)+2=3x−13；去括号并合并常数得4x−10=3x−13，所以 x=−3。代回原方程两边都等于−2.2。去分母或消小数时，等号两边每一项都必须乘相同的数。',
    difficulty: '基础',
    sourceRef: sourceRef(`${setId}-q2`),
  },
  [`${setId}-q3`]: {
    type: 'single_choice',
    prompt: '解方程 (x+2)/4+(x−1)/6=2 时，小明两边同乘 12，却写成 3(x+2)+2(x−1)=2。错误原因是',
    options: ['去分母时等式右边的 2 也要乘 12，应为 24。', '分母不能用最小公倍数消去。', '第二项应乘 3 而不是乘 2。', '括号里的 x 也应乘 12。'],
    answerIndex: 0,
    explanation: '等式两边同乘12时，右边常数2也必须乘12，所以正确方程应为3(x+2)+2(x−1)=24。解得5x+4=24，x=4。去分母时等式每一项都要乘相同的最小公倍数。',
    difficulty: '提升',
    sourceRef: sourceRef(`${setId}-q3`),
  },
  [`${setId}-q4`]: {
    type: 'short_answer',
    prompt: '判断方程 2(x+3)−2x=6 的解的情况。请化简方程，并解释为什么不能在化简过程中把含 x 的项消去后继续“除以 x 的系数”求唯一解。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '化简左边得 2x+6−2x=6，即 6=6，这是恒等式，因此任意数都是方程的解。x 的系数消去后为 0，不能再除以 0。',
    gradingMode: 'self_check',
    explanation: '展开并合并同类项后，含 x 的项抵消，得到 6=6，对所有 x 都成立，所以方程有无穷多个解。若化简后得到如 6=8 这样的矛盾等式则无解；两种情形都不能把 0 当作除数。',
    difficulty: '提升',
    sourceRef: sourceRef(`${setId}-q4`),
  },
  'math-7a-5-3-q1': {
    explanation: '方程x+5=2两边同时减去5，得x=2−5=−3。把−3代回左边：−3+5=2，与右边相同，所以解正确。移项只是“两边同时做同一运算”的简写；常数5移到等号另一边时要变成−5。',
    sourceRef: sourceRef('math-7a-5-3-q1'),
  },
  'math-7a-5-3-q2': {
    explanation: '方程3x=12两边同时除以3，得x=12÷3=4。检验：3×4=12，等式成立。这里除数3不为0；不要把“系数化为1”误当成两边都减去3。',
    sourceRef: sourceRef('math-7a-5-3-q2'),
  },
  'math-7a-5-3-q3': {
    explanation: '方程2x−1=5两边同时加1，得2x=6；再同时除以2，得x=3。代回检查：2×3−1=6−1=5。把−1移到右边时应变成+1，因此右边是5+1=6。',
    sourceRef: sourceRef('math-7a-5-3-q3'),
  },
  'math-7a-5-3-q4': {
    explanation: '从4x−3=2x+7开始，两边同时减去2x，得2x−3=7；两边再同时加3，得2x=10；同时除以2，得到x=5。检验：左边4×5−3=17，右边2×5+7=17。移项时每一项都要改变符号，等式两边也可以直接做相同的加减运算。',
    sourceRef: sourceRef('math-7a-5-3-q4'),
  },
  'math-7a-5-3-q5': {
    explanation: '先用分配律展开左边：3(x−2)=3x−6，所以3x−6=x+4。两边同时减x、加6，得2x=10，故x=5。代回原方程：3(5−2)=9，5+4=9，等式成立。括号前的3必须分别乘x和−2，不能只乘x。',
    sourceRef: sourceRef('math-7a-5-3-q5'),
  },
  'math-7a-5-3-q6': {
    explanation: '方程(x−1)/2=1两边同时乘2，得到x−1=2；再两边同时加1，得x=3。检验：(3−1)/2=2/2=1。去分母时整项(x−1)/2都乘2，不能把分母消去后仍保留原来的“−1”在分子之外。',
    sourceRef: sourceRef('math-7a-5-3-q6'),
  },
  'math-7a-5-3-q7': {
    explanation: '分母3和2的最小公倍数是6，两边同乘6：2(2x−1)−3(x+1)=6。去括号得4x−2−3x−3=6，合并后为x−5=6，所以x=11。检验原式： (22−1)/3−(11+1)/2=21/3−12/2=7−6=1。第二个分式前有减号，乘6后是−3(x+1)，展开时两项都带负号。',
    sourceRef: sourceRef('math-7a-5-3-q7'),
  },
  'math-7a-5-3-q8': {
    prompt: '解方程：0.1x−0.2÷0.02−(x+1)÷0.5=−21.5，x=（ ）。',
    options: ['5', '−5', '1', '3'],
    answerIndex: 0,
    explanation: '先算常数商并改写除以0.5：0.2÷0.02=10，(x+1)÷0.5=2(x+1)。方程化为0.1x−10−2(x+1)=−21.5，去括号得0.1x−10−2x−2=−21.5，即−1.9x−12=−21.5。两边同时加12，得−1.9x=−9.5；两边同时除以−1.9，得x=5。代回检验：0.5−10−12=−21.5。原题右边若为3，按标准运算顺序并不能得到5；本题已把右边修正为−21.5以保持选项5为正确解。',
    sourceRef: sourceRef('math-7a-5-3-q8'),
  },
  'math-7a-5-3-q9': {
    explanation: '先解3x−2=4x+1：两边同时减4x、加2，得−x=3，所以x=−3。两个方程的解相同，因此把−3代入2x+m=2：−6+m=2，解得m=8。分别检验：3(−3)−2=−11且4(−3)+1=−11；2(−3)+8=2。',
    sourceRef: sourceRef('math-7a-5-3-q9'),
  },
  'math-7a-5-3-q10': {
    explanation: '小明漏乘的是右边常数项−1。按他的错误步骤，两边乘6后写成2(2y−1)=3(y+a)−1；已知y=2是这个错误方程的解，代入得6=3(2+a)−1，解得a=1/3。回到原方程正确去分母时，−1也必须乘6：2(2y−1)=3(y+1/3)−6。展开并合并得4y−2=3y−5，因此y=−3。检验原式两边都等于−7/3。去分母时等式右边的每一项都要乘6，不能只乘含字母的分式。',
    sourceRef: sourceRef('math-7a-5-3-q10'),
  },
  'math-9-3-5-q4': {
    prompt: '如图，在△ABC和△DEF中，∠A=∠D，AB=4 cm、DE=2 cm、AC=6 cm、DF=3 cm，则这两个三角形（　）。',
    imageUrl: '/images/practice/math-similar-triangles-sas-q4.svg',
    explanation: '由图可知∠A与∠D分别是两组已知边的夹角。AB/DE=4/2=2，AC/DF=6/3=2，且∠A=∠D，因此由SAS相似判定，△ABC∽△DEF；相似比为2，所以不全等。',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/九年级上册/第二十五章《图形的相似知识归纳与题型突破》（教师版）“相似三角形判定定理3”；按定理与原题数据重绘示意图并改编，非中考真题。',
  },
  'math-7a-1-7-q10': {
    prompt: '某出租车一天行驶里程依次为+9、−3、−5、+4、−8、+6、−3、−6、−4、+10 km（向东为正）。若每千米耗油0.1 L，这天共耗油（　）L。',
  },
  'math-8b-19-4-q10': {
    prompt: '某水箱前4 min只进水，水量从0 L增至20 L；随后6 min既进水又放水，水量增至32 L。进水速度保持不变，则后6 min的放水速度为（　）L/min。',
  },
  'math-8b-20-4-q9': {
    prompt: '甲公司按1.5元/km收费；乙公司每月收800元租车费，另按0.5元/km收费。两公司月费用相等时，月行驶里程x为（　）km。',
  },
  'math-8b-22-4-q9': {
    prompt: '如图，某校150名学生一分钟跳绳次数的频数分布直方图中，各组组距均为20次。以100次及以上为达标，达标率约为（　）。',
    imageUrl: '/images/practice/math-jump-rope-frequency-histogram.svg',
    explanation: '100次及以上对应后四组，人数为51+45+27+9=132人。达标率为132÷150×100%=88%，选A。',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/八年级下册/第十八章《数据的收集与整理》（教师版）“知识点四 频数分布直方图”；据频数分布图知识原创改编，数据与图示重绘，非河北中考真题。',
  },
  'leaf-rebuild-2026-g9-math-9a-project-estimate-fish-distance-q4': {
    prompt: '在“用相似三角形测量河宽”和“用抽样估算鱼塘鱼数”这两类估算任务的结果报告中，都应说明（　）。',
  },
  'math-8b-19-2-q5': {
    prompt: '如图，甲、乙、丙、丁分别表示四个候选图象。能表示y是x的函数的是（　）。',
    options: ['甲图', '乙图', '丙图', '丁图'],
    answerIndex: 1,
    imageUrl: '/images/practice/math-function-vertical-line-test-options.svg',
    explanation: '用竖线检验：乙图中任取一个x值，竖线至多与图象有一个交点，因此每个x只对应一个y，乙图表示y是x的函数。甲图的竖直线、丙图的圆和丁图的开口向右抛物线，都有竖线与图象相交于两个不同点的情形，不能表示y是x的函数。',
    sourceRef: '本地资料：1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/八年级下册/第二十章 函数（单元复习 6个知识点+13类题型突破）（教师版）.md，“知识点02 函数的概念”与“图象法”；原创图示，非河北中考真题。',
  },
}
