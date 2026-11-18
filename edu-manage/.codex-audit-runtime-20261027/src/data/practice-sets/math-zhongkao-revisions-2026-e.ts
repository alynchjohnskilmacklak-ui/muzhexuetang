import type { PracticeQuestion } from '../parent-practice-bank'

const circlePositionSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/数学/九年级下册/第二十九章直线与圆的位置关系/29.1直线与圆的位置关系'

type QuestionRevision = Partial<PracticeQuestion>

function circlePositionRef(id: string) {
  return `${circlePositionSource}#${id}`
}

/** Original mixed-format revisions for line-circle position and its metric tests. */
export const mathZhongkaoQuestionRevisions2026E: Record<string, QuestionRevision> = {
  // 九年级下册：第二十九章直线与圆的位置关系 / 29.1（原知识点 ID：weizhi）
  'math-9-7-1-q1': {
    type: 'single_choice',
    knowledgePointId: 'weizhi',
    prompt: '圆O的半径为6 cm，圆心O到直线l的距离为4 cm。直线l与圆O的位置关系是',
    options: ['相离。', '相切。', '相交于两个点。', '无法确定。'],
    answerIndex: 2,
    explanation: '设圆心到直线的距离为d、半径为r。这里d=4 cm<r=6 cm，因此直线与圆有两个公共点，即相交。',
    difficulty: 'MEDIUM',
    sourceRef: circlePositionRef('math-9-7-1-q1'),
  },
  'math-9-7-1-q2': {
    type: 'multiple_choice',
    knowledgePointId: 'weizhi',
    prompt: '设圆O的半径r>0，圆心到直线l的距离为d。下列判断正确的是（多选）',
    options: [
      'd=0时，直线经过圆心，与圆有两个公共点。',
      'd>r时，直线与圆没有公共点。',
      'd=r时，直线与圆只有一个公共点。',
      'd<r时，直线与圆没有公共点。',
    ],
    answerIndices: [0, 1, 2],
    explanation: '直线与圆的位置由d与r的大小关系确定：d<r时相交于两点，d=r时相切于一点，d>r时相离。因r>0，d=0表示直线经过圆心，故有两个公共点。',
    difficulty: 'MEDIUM',
    sourceRef: circlePositionRef('math-9-7-1-q2'),
  },
  'math-9-7-1-q3': {
    type: 'fill_blank',
    knowledgePointId: 'weizhi',
    prompt: '圆O的直径为26 cm，直线l与圆交于A、B两点。从O向l作垂线，垂足为H，已知OH=5 cm，则弦AB的长为____ cm。',
    correctAnswer: '24',
    acceptedAnswers: ['24', '24cm', '24 cm'],
    explanation: '半径OA=13 cm。圆心到弦的垂线平分弦，所以AH=AB/2。直角三角形OHA中，AH=√(OA²−OH²)=√(13²−5²)=12 cm，故AB=24 cm。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q3'),
  },
  'math-9-7-1-q4': {
    type: 'short_answer',
    knowledgePointId: 'weizhi',
    prompt: '圆O的半径为5 cm。过O作直线l的垂线，垂足为H，且H在l上、OH=5 cm。判断直线l与圆O的位置关系，并写出完整理由。',
    correctAnswer: '参考答案：直线l与圆O相切于H。评分要点：①OH等于半径5 cm，所以H在圆O上；②OH⊥l；③利用“经过半径外端且垂直于这条半径的直线是圆的切线”判定l为圆O的切线。',
    gradingMode: 'self_check',
    explanation: '因为OH=5 cm等于圆O的半径，H在圆上；又OH⊥l，且垂足H正是半径的外端点。满足“半径外端与直线垂直”的切线判定条件，因此l与圆O相切于H。只知道圆心到直线的距离等于半径也可判定相切，但不能仅凭直线经过圆上一点就判定相切。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q4'),
  },
  'math-9-7-1-q5': {
    type: 'single_choice',
    knowledgePointId: 'weizhi',
    prompt: '以O为原点、半径为5的圆，与直线l_k：y=k的位置关系由参数k决定。使l_k与圆相切的k值是',
    options: ['k=5。', 'k=−5。', 'k=5或k=−5。', '−5<k<5。'],
    answerIndex: 2,
    explanation: '圆心(0，0)到水平直线y=k的距离为|k|。相切当且仅当|k|=r=5，所以k=5或k=−5。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q5'),
  },
  'math-9-7-1-q6': {
    type: 'multiple_choice',
    knowledgePointId: 'weizhi',
    prompt: '圆O的半径为13 cm，直线l与圆交于A、B两点，M是弦AB的中点，AB=10 cm。下列结论正确的是（多选）',
    options: [
      'OM⊥l。',
      'OM=12 cm。',
      '直线l与圆O相切。',
      '因圆心到l的距离小于半径，l与圆O相交于两个点。',
    ],
    answerIndices: [0, 1, 3],
    explanation: '圆心与弦中点的连线垂直于弦AB，也就是垂直于l。AM=5 cm，OA=13 cm，在直角三角形OMA中，OM=√(13²−5²)=12 cm。因为12<13，l与圆相交而非相切。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q6'),
  },
  'math-9-7-1-q7': {
    type: 'fill_blank',
    knowledgePointId: 'weizhi',
    prompt: '圆O的半径为8 cm，圆心到直线l_t的距离为d=|t−1| cm，其中t为实数。直线l_t与圆O相交于两个不同的点时，t的取值范围为____。',
    correctAnswer: '−7<t<9',
    acceptedAnswers: ['−7<t<9', '-7<t<9', '(-7,9)'],
    explanation: '相交于两个不同的点当且仅当d<r。故|t−1|<8，即−8<t−1<8，解得−7<t<9。端点t=−7或9时d=r，位置关系变为相切，应排除。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q7'),
  },
  'math-9-7-1-q8': {
    type: 'short_answer',
    knowledgePointId: 'weizhi',
    prompt: '已知圆O半径为5 cm，点P在圆外且OP=13 cm。请用直尺和圆规作出过P的圆O的两条切线，并写出作图步骤及切线判定理由。',
    correctAnswer: '作法：①连接OP，作线段OP的垂直平分线，交OP于M；②以M为圆心、MO为半径作圆，该圆经过O、P；③设此圆与圆O交于T1、T2，连接PT1、PT2。理由：T1、T2在以OP为直径的圆上，故∠OT1P=∠OT2P=90°；又OT1、OT2是圆O的半径，所以PT1⊥OT1、PT2⊥OT2，分别是圆O在T1、T2处的切线。评分要点：作出OP中点M（1分）；作直径为OP的辅助圆并标出交点T1、T2（1分）；连接PT1、PT2（1分）；说明直角及半径垂直切线判定（1分）。',
    gradingMode: 'self_check',
    explanation: '以OP为直径作辅助圆，辅助圆与圆O的交点T满足∠OTP=90°，所以OT⊥PT。由于T在圆O上，OT是圆O的半径，故PT是圆O的切线。OP=13 cm>r=5 cm，P确在圆外；两圆有两个交点，因此能作出两条不同切线。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q8'),
  },
  'math-9-7-1-q9': {
    type: 'single_choice',
    knowledgePointId: 'weizhi',
    prompt: '圆O的半径为4 cm，点P在直线l上且OP=4 cm。仅根据这些信息，能确定的结论是',
    options: ['l一定与圆O相切。', 'l一定与圆O相交于两个点。', 'l与圆O至少有一个公共点，可能相切也可能相交。', 'l与圆O相离。'],
    answerIndex: 2,
    explanation: 'OP等于半径，说明P在圆O上；又P在l上，所以P是公共点。若l垂直OP，则l相切；若不垂直，则还会与圆有另一个交点而相交。没有给出垂直条件，不能断定一定相切。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q9'),
  },
  'math-9-7-1-q10': {
    type: 'short_answer',
    knowledgePointId: 'weizhi',
    prompt: '圆形喷灌装置以O为中心，喷水覆盖范围是半径10 m的圆形区域。一条笔直的田间道路l距O为6 m。（1）判断道路与覆盖边界的交点个数；（2）求道路上位于覆盖范围内的路段长度。请写出计算依据。',
    correctAnswer: '参考答案：（1）d=6 m<r=10 m，道路与圆形边界有两个交点；（2）从O向l作垂线，垂足为H，则H平分弦AB。AH=√(10²−6²)=8 m，所以覆盖范围内的路段AB=16 m。评分要点：比较d与r并正确判断两个交点（1分）；说明垂线平分弦或形成直角三角形（1分）；求半弦8 m（1分）；得路段长16 m（1分）。',
    gradingMode: 'self_check',
    explanation: '圆心到道路的距离6 m小于喷灌半径10 m，所以直线与覆盖边界相交于A、B两点。圆心到弦AB的垂线平分弦，直角三角形OHA中AH=√(OA²−OH²)=√(100−36)=8 m，故道路在圆形覆盖区域内的弦长AB=2×8=16 m。',
    difficulty: 'EXAM',
    sourceRef: circlePositionRef('math-9-7-1-q10'),
  },
}
