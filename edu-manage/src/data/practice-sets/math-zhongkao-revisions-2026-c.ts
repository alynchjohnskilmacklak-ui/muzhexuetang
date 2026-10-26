import type { PracticeQuestion } from '../parent-practice-bank'

const quadraticSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/数学/九年级下册/第三十章二次函数/30.2二次函数的图象和性质'

type QuestionRevision = Partial<PracticeQuestion>

function quadraticRef(id: string) {
  return `${quadraticSource}#${id}`
}

/** Original mixed-format replacements for the quadratic-function set. */
export const mathZhongkaoQuestionRevisions2026C: Record<string, QuestionRevision> = {
  // 九年级下册：第三十章二次函数 / 30.2 二次函数的图象和性质（原知识点 ID：ercitx）
  'math-9-8-2-q1': {
    type: 'single_choice',
    knowledgePointId: 'ercitx',
    prompt: '关于抛物线y=2(x−3)²−5，下列说法正确的是',
    options: ['开口向下，顶点为(3，−5)。', '对称轴为直线x=−3。', '当x=3时，函数取得最小值−5。', '函数值y的取值范围是y≤−5。'],
    answerIndex: 2,
    explanation: '该函数已写成顶点式，顶点为(3，−5)，对称轴为x=3。二次项系数2>0，抛物线开口向上，所以在x=3处取得最小值−5，值域为y≥−5。',
    difficulty: 'MEDIUM',
    sourceRef: quadraticRef('math-9-8-2-q1'),
  },
  'math-9-8-2-q2': {
    type: 'multiple_choice',
    knowledgePointId: 'ercitx',
    prompt: '函数y=−(x−1)²+4的图象具有下列哪些性质？（多选）',
    options: [
      '抛物线开口向下。',
      '对称轴为直线x=1。',
      '顶点坐标为(1，4)。',
      '函数值y的取值范围为y≥4。',
    ],
    answerIndices: [0, 1, 2],
    explanation: '由顶点式可读出顶点(1，4)、对称轴x=1；二次项系数为−1，故开口向下，顶点处取得最大值4，值域是y≤4。D把最大值方向写反。',
    difficulty: 'MEDIUM',
    sourceRef: quadraticRef('math-9-8-2-q2'),
  },
  'math-9-8-2-q3': {
    type: 'fill_blank',
    knowledgePointId: 'ercitx',
    prompt: '抛物线y=2x²−8x+5的对称轴为直线x=____。',
    correctAnswer: '2',
    acceptedAnswers: ['2', 'x=2', '直线x=2'],
    explanation: '对y=ax²+bx+c，对称轴为x=−b/(2a)。这里a=2、b=−8，所以x=−(−8)/(2×2)=2。',
    difficulty: 'MEDIUM',
    sourceRef: quadraticRef('math-9-8-2-q3'),
  },
  'math-9-8-2-q4': {
    type: 'short_answer',
    knowledgePointId: 'ercitx',
    prompt: '已知二次函数f(x)=x²−4x+1。将函数解析式化为顶点式，并写出顶点坐标、对称轴以及函数在对称轴两侧的增减性。',
    correctAnswer: '参考答案：f(x)=(x−2)²−3；顶点为(2，−3)，对称轴为x=2；当x≤2时，y随x增大而减小；当x≥2时，y随x增大而增大。评分要点：①正确配方；②顶点和对称轴正确；③说明左侧递减、右侧递增（端点x=2为最小值点）。',
    gradingMode: 'self_check',
    explanation: '配方得f(x)=(x−2)²−3，因此顶点为(2，−3)，对称轴为x=2。该抛物线开口向上，故在对称轴左侧随x增大而递减，在对称轴右侧随x增大而递增，并在x=2处取得最小值。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q4'),
  },
  'math-9-8-2-q5': {
    type: 'single_choice',
    knowledgePointId: 'ercitx',
    prompt: '二次函数y=−x²+4x+1在自变量0≤x≤5时的函数值取值范围是',
    options: ['−4≤y≤5。', '1≤y≤5。', '−4≤y≤1。', 'y≤5。'],
    answerIndex: 0,
    explanation: '配方得y=−(x−2)²+5，顶点横坐标2在区间[0，5]内，最大值为5。端点函数值为y(0)=1、y(5)=−4，故最小值为−4，值域为[−4，5]。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q5'),
  },
  'math-9-8-2-q6': {
    type: 'multiple_choice',
    knowledgePointId: 'ercitx',
    prompt: '某抛物线开口向下，对称轴为直线x=1，且经过点(−2，0)。下列结论正确的是（多选）',
    options: [
      '它与x轴的另一个交点为(4，0)。',
      '函数值在x<1时随x增大而减小。',
      '函数值在x>1时随x增大而减小。',
      '对任意实数x，函数值满足f(2−x)=f(x)。',
    ],
    answerIndices: [0, 2, 3],
    explanation: '对称轴x=1使交点横坐标−2与另一个交点横坐标关于1对称，故另一个为4。开口向下时，函数在x<1一侧递增，在x>1一侧递减。关于x=1对称的自变量为x和2−x，因此f(2−x)=f(x)。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q6'),
  },
  'math-9-8-2-q7': {
    type: 'fill_blank',
    knowledgePointId: 'ercitx',
    prompt: '抛物线y=−2x²+8x+c的最大值为7，则常数c=____。',
    correctAnswer: '−1',
    acceptedAnswers: ['−1', '-1'],
    explanation: '配方得y=−2(x−2)²+8+c。因为开口向下，最大值为8+c；令8+c=7，解得c=−1。',
    difficulty: 'MEDIUM',
    sourceRef: quadraticRef('math-9-8-2-q7'),
  },
  'math-9-8-2-q8': {
    type: 'short_answer',
    knowledgePointId: 'ercitx',
    prompt: '某物体抛出后离地高度h（m）与时间t（s）的关系为h=−5t²+20t，考虑0≤t≤4的运动过程。（1）物体何时达到最大高度，最大高度是多少？（2）物体在什么时刻离地15 m？写出计算过程。',
    correctAnswer: '参考答案：（1）t=2 s时达到最大高度20 m；（2）离地15 m的时刻为t=1 s和t=3 s。评分要点：①配方为h=−5(t−2)²+20，得顶点时间2 s和最大高度20 m；②令h=15，得到t²−4t+3=0；③解得t=1或3，单位正确。',
    gradingMode: 'self_check',
    explanation: '配方得h=−5(t−2)²+20，且0≤t≤4，所以顶点时刻t=2在考虑区间内，最大高度为20 m。令h=15，解−5t²+20t=15，化为(t−1)(t−3)=0，故t=1 s或3 s。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q8'),
  },
  'math-9-8-2-q9': {
    type: 'single_choice',
    knowledgePointId: 'ercitx',
    prompt: '一座拱形通道的截面可近似表示为y=−(x−4)²+16，其中x、y的单位均为m，地面为x轴，0≤x≤8。通道净空高度至少为12 m的地面位置范围是',
    options: ['2≤x≤6。', '0≤x≤2或6≤x≤8。', '3≤x≤5。', '0≤x≤8。'],
    answerIndex: 0,
    explanation: '净空高度至少12 m即y≥12。代入模型得−(x−4)²+16≥12，整理为(x−4)²≤4，所以2≤x≤6；该区间也满足题给定义域0≤x≤8。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q9'),
  },
  'math-9-8-2-q10': {
    type: 'short_answer',
    knowledgePointId: 'ercitx',
    prompt: '学校靠一面足够长的直墙围建矩形花圃，墙作为一边，另三边共用24 m围栏。设垂直墙的边长为x m，花圃面积为S m²。（1）写出S关于x的函数关系及x的取值范围；（2）求面积最大时的边长和最大面积，并说明理由。',
    correctAnswer: '参考答案：（1）另一边长为24−2x，S=x(24−2x)=−2x²+24x，0<x<12；（2）S=−2(x−6)²+72，因此x=6 m时面积最大，最大面积为72 m²；平行墙的边长为12 m。评分要点：①围栏关系及面积式正确；②自变量范围0<x<12；③配方或用顶点求最大值，得到x=6、S=72；④能由围栏关系求出另一边12 m并写对单位。',
    gradingMode: 'self_check',
    explanation: '两条垂直墙边各长x，平行墙的一边长为24−2x，故0<x<12且S=x(24−2x)=−2(x−6)²+72。抛物线开口向下，在允许范围内顶点x=6处取得最大面积72 m²；此时另一边长24−2×6=12 m。',
    difficulty: 'EXAM',
    sourceRef: quadraticRef('math-9-8-2-q10'),
  },
}
