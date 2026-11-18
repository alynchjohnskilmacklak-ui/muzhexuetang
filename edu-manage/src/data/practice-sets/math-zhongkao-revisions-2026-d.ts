import type { PracticeQuestion } from '../parent-practice-bank'

const samplingSource = '牧哲学堂原创拓展题/2026-10/河北中考导向/数学/九年级上册/第二十三章数据分析与统计估计/23.6用样本推断总体'

type QuestionRevision = Partial<PracticeQuestion>

function samplingRef(id: string) {
  return `${samplingSource}#${id}`
}

/** Original mixed-format revisions for sample-based population inference. */
export const mathZhongkaoQuestionRevisions2026D: Record<string, QuestionRevision> = {
  // 九年级上册：第二十三章数据分析与统计估计 / 23.6 用样本推断总体（原知识点 ID：yangben）
  'math-9-1-6-q1': {
    type: 'single_choice',
    knowledgePointId: 'yangben',
    prompt: '某厂生产同型号灯泡20 000只，随机抽取80只测量使用寿命。以“灯泡的使用寿命”为调查指标，本次调查的样本是',
    options: ['这20 000只灯泡的使用寿命数据。', '被抽取的80只灯泡的使用寿命数据。', '这批灯泡中的任意一只灯泡。', '80只灯泡使用寿命的平均数。'],
    answerIndex: 1,
    explanation: '总体是这批灯泡使用寿命的全体数据，样本是实际抽取的80只灯泡对应的寿命数据；任意一只灯泡对应一个个体，80只数据的平均数是样本统计量。',
    difficulty: 'MEDIUM',
    sourceRef: samplingRef('math-9-1-6-q1'),
  },
  'math-9-1-6-q2': {
    type: 'multiple_choice',
    knowledgePointId: 'yangben',
    prompt: '为估计全市九年级学生每日课外作业时间的平均值，下列抽样方案中较有代表性的是（多选）',
    options: [
      '只在一所市区重点中学随机抽取400名学生。',
      '按城乡和学校类型分层，再在各层按学生人数比例随机抽取学生。',
      '在学校公众号发布问卷，由愿意答题的学生自行填写。',
      '从全市学校名录中随机抽取若干学校，再按人数比例随机抽取入选学校的九年级学生。',
    ],
    answerIndices: [1, 3],
    explanation: 'B通过城乡、学校类型分层并按人数比例随机抽样，D采用先随机抽学校、再随机抽学生的两阶段抽样，都覆盖了较广的目标群体。A只调查一所特定学校，C由学生自愿参与，容易产生选择偏差。合理抽样能提高代表性，但不能保证每次样本都完全一致于总体。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q2'),
  },
  'math-9-1-6-q3': {
    type: 'fill_blank',
    knowledgePointId: 'yangben',
    prompt: '某市从居民家庭中随机抽取300户，调查后发现其中210户能够正确分类回收生活垃圾。样本中正确分类回收的比例为____%。',
    correctAnswer: '70',
    acceptedAnswers: ['70', '70%'],
    explanation: '样本比例为210÷300=0.7=70%。这里求的是样本中的比例；若用它估计总体比例，结论仍是近似值。',
    difficulty: 'MEDIUM',
    sourceRef: samplingRef('math-9-1-6-q3'),
  },
  'math-9-1-6-q4': {
    type: 'short_answer',
    knowledgePointId: 'yangben',
    prompt: '某批共有12 000个螺栓，从整批产品中随机抽取400个检验，发现12个不合格。（1）用样本不合格率估计这批螺栓的不合格率；（2）估计这批螺栓中不合格品的数量；（3）说明估计值为何不一定等于实际数量。',
    correctAnswer: '参考答案：（1）12/400=3%；（2）12 000×3%=360个；（3）样本只是总体的一部分，抽样有随机波动，所以推断值是近似估计，不保证与实际数量完全相等。评分要点：样本比例正确（1分），估计总数正确（1分），说明随机抽样误差或样本与总体差异（1分）。',
    gradingMode: 'self_check',
    explanation: '样本不合格率为12÷400=0.03=3%，据此估计总体不合格数为12 000×0.03=360个。该数值是按样本比例推断的近似值；换一批随机样本，样本比例可能略有变化。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q4'),
  },
  'math-9-1-6-q5': {
    type: 'single_choice',
    knowledgePointId: 'yangben',
    prompt: '从某校全体九年级学生中随机抽取40人，记录他们每天课外阅读时长，结果如下表。用样本平均数估计该校九年级学生的平均阅读时长，估计值为\n\n阅读时长（h）：0.5，1，1.5，2\n人数：8，20，8，4',
    options: ['0.95 h。', '1.05 h。', '1.1 h。', '1.25 h。'],
    answerIndex: 2,
    explanation: '样本平均数为(0.5×8+1×20+1.5×8+2×4)÷40=(4+20+12+8)÷40=44÷40=1.1 h。用随机样本平均数估计总体平均数，结果为约1.1 h。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q5'),
  },
  'math-9-1-6-q6': {
    type: 'multiple_choice',
    knowledgePointId: 'yangben',
    prompt: '一项网络投票有1 000名自愿参与者，其中68%支持某方案。关于这项结果，下列说法合理的是（多选）',
    options: [
      '可以说在这1 000名参与者中，支持者占68%。',
      '可以据此断定全市居民中恰有68%支持该方案。',
      '自愿参与可能造成选择偏差，样本未必能代表全市居民。',
      '若要推断全市居民的态度，应从全市居民中用较合理的随机抽样方案取样。',
    ],
    answerIndices: [0, 2, 3],
    explanation: '68%是这1 000名自愿参与者中的样本比例。自愿投票者可能与未参与者有系统差异，因此不能直接断定总体比例恰为68%；从目标总体合理随机抽样，通常更有利于获得具有代表性的样本。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q6'),
  },
  'math-9-1-6-q7': {
    type: 'fill_blank',
    knowledgePointId: 'yangben',
    prompt: '某池塘进行标记重捕：第一次捕捞并标记300条鱼后放回，待鱼群充分混合后，第二次随机捕捞250条，其中有标记的15条。假设期间鱼群数量基本稳定、标记不影响捕捞，则估计池塘中约有____条鱼。',
    correctAnswer: '5000',
    acceptedAnswers: ['5000', '5 000', '约5000', '约5 000'],
    explanation: '设鱼塘鱼数为N。若标记鱼在鱼群中充分混合且再次被捕概率相近，则标记鱼比例约等于第二次捕捞中的标记比例：300/N≈15/250。解得N≈300×250÷15=5 000条。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q7'),
  },
  'math-9-1-6-q8': {
    type: 'short_answer',
    knowledgePointId: 'yangben',
    prompt: '某县有20 000户家庭，其中城镇家庭占75%，农村家庭占25%。按城乡分层随机抽样后，样本中城镇家庭150户，年用电量平均为2 400 kWh；农村家庭50户，年用电量平均为1 600 kWh。（1）估计全县家庭年均用电量；（2）估计全县家庭年用电总量；（3）写出一项估计局限。',
    correctAnswer: '参考答案：（1）2 400×75%+1 600×25%=2 200 kWh；（2）20 000×2 200=44 000 000 kWh；（3）样本均值和分层样本均值仍会受随机抽样波动、样本覆盖或家庭用电差异影响，因此总体估计不一定与真实值完全相同。评分要点：按总体城乡比例加权（1分），年均值2 200 kWh（1分），总量44 000 000 kWh（1分），指出合理的抽样或模型局限（1分）。',
    gradingMode: 'self_check',
    explanation: '分层样本的两组样本量是按总体比例75%:25%抽取的，可用总体权重估计全县均值：2 400×0.75+1 600×0.25=2 200 kWh。再乘以20 000户，估计年用电总量为44 000 000 kWh。即使按比例分层，样本数据仍存在随机波动，估计不是精确普查结果。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q8'),
  },
  'math-9-1-6-q9': {
    type: 'single_choice',
    knowledgePointId: 'yangben',
    prompt: '对同一批产品分别进行两次独立随机抽样：抽取80件时发现3件不合格，抽取800件时发现34件不合格。下列说法最恰当的是',
    options: [
      '总体不合格率一定恰好等于第二个样本的4.25%。',
      '两个样本率可因随机波动而不同，较大的代表性样本通常能使估计更稳定，但不能保证每次都更接近真值。',
      '只要样本容量增加，样本率就必定等于总体率。',
      '样本率不同说明抽样调查不能用于推断总体。',
    ],
    answerIndex: 1,
    explanation: '两个样本的不合格率分别为3÷80=3.75%和34÷800=4.25%，不同样本出现差异是随机抽样误差的一种表现。增大样本容量通常有助于提高估计稳定性，但单次抽样不能保证样本率恰好等于总体率，也不能保证每次都更接近总体真值。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q9'),
  },
  'math-9-1-6-q10': {
    type: 'short_answer',
    knowledgePointId: 'yangben',
    prompt: '从一批食品包装中随机抽取5包，测得净含量（g）为9、10、10、11、10。按“各数据与平均数差的平方的平均数”计算方差。（1）求样本平均数和样本方差；（2）分别用它们估计这批包装净含量的总体平均数和总体方差；（3）说明该推断的一项局限。',
    correctAnswer: '参考答案：（1）样本平均数为(9+10+10+11+10)÷5=10 g；方差为[(9−10)²+(10−10)²+(10−10)²+(11−10)²+(10−10)²]÷5=2÷5=0.4 g²。（2）估计总体平均数约为10 g，总体方差约为0.4 g²。（3）样本量只有5，且抽样有随机波动，估计值可能与总体真实参数不同。评分要点：均值计算正确（1分），按题定公式得方差0.4 g²（1分），用样本统计量作总体估计（1分），指出合理局限（1分）。',
    gradingMode: 'self_check',
    explanation: '样本平均数为10 g，五个数据相对平均数的偏差平方为1、0、0、1、0，故样本方差为(1+0+0+1+0)÷5=0.4 g²。按样本统计量估计，总体平均数约10 g、总体方差约0.4 g²。由于样本容量较小，随机波动可能较明显，不能把估计值当作总体真实参数。',
    difficulty: 'EXAM',
    sourceRef: samplingRef('math-9-1-6-q10'),
  },
}
