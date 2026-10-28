import type { PracticeQuestion } from '../parent-practice-bank'

const frequencySource = '牧哲学堂原创拓展题/2026-10/河北中考导向/数学/九年级全一册/第三十一章随机事件的概率/31.4用频率估计概率'

type QuestionRevision = Partial<PracticeQuestion>

function frequencyRef(id: string) {
  return `${frequencySource}#${id}`
}

/** Mixed-format, context-based revisions for estimating probability from frequency. */
export const mathZhongkaoQuestionRevisions2026F: Record<string, QuestionRevision> = {
  // 九年级全一册：第三十一章随机事件的概率 / 31.4 用频率估计概率（保留原知识点 ID：pinlv）
  'math-9-9-4-q1': {
    type: 'single_choice',
    knowledgePointId: 'pinlv',
    prompt: '某枚硬币连续抛掷时，记录到前100、300、800、2000次试验中正面朝上的次数依次为53、153、401、1009。按2000次试验的结果估计正面朝上的概率，用小数表示为',
    options: ['0.5045。', '0.505。', '0.4955。', '0.53。'],
    answerIndex: 0,
    explanation: '按2000次试验的频率估计，正面朝上的概率约为1009÷2000=0.5045。前几次试验的频率会波动；有限次试验得到的是估计值。',
    difficulty: 'MEDIUM',
    sourceRef: frequencyRef('math-9-9-4-q1'),
  },
  'math-9-9-4-q2': {
    type: 'fill_blank',
    knowledgePointId: 'pinlv',
    prompt: '某生产线随机抽检500只灯泡，其中472只合格、28只不合格。按“合格品频率、不合格品频率”的顺序填写：____；____。',
    correctAnswer: '0.944；0.056',
    acceptedAnswers: ['0.944, 0.056', '0.944，0.056', '94.4%；5.6%'],
    explanation: '合格品频率为472÷500=0.944，不合格品频率为28÷500=0.056，两者之和为1。',
    difficulty: 'MEDIUM',
    sourceRef: frequencyRef('math-9-9-4-q2'),
  },
  'math-9-9-4-q3': {
    type: 'multiple_choice',
    knowledgePointId: 'pinlv',
    prompt: '关于用频率估计概率，下列说法正确的是（多选）',
    options: [
      '同一随机试验进行了n次，事件A发生m次，则这n次试验中A发生的频率为m/n。',
      '随着试验次数增加，频率必定每一次都比上一次更接近概率。',
      '试验次数较多时，频率通常能更好地反映概率，但有限次试验仍可能有波动。',
      '某次试验中A发生的频率是0.4，就能断定A发生的概率恰好是0.4。',
    ],
    answerIndices: [0, 2],
    explanation: '频率等于事件发生次数除以试验总次数，A正确。大量重复试验中频率通常会稳定在概率附近，但不会保证逐次单调接近，也不能把某一次有限试验的频率当成精确概率，故B、D错误。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q3'),
  },
  'math-9-9-4-q4': {
    type: 'short_answer',
    knowledgePointId: 'pinlv',
    prompt: '种子公司从同一批15000粒种子中随机抽取500粒进行发芽试验，其中438粒发芽。\n（1）估计这批种子的发芽率；\n（2）估计这批种子中约有多少粒能发芽；\n（3）说明估计数量为何不一定等于实际发芽数量。',
    correctAnswer: '参考答案：（1）438÷500=0.876，即87.6%；（2）15000×0.876=13140粒；（3）样本是随机抽取的，样本结果会有随机波动，按样本频率推得的总体数量是近似估计。评分要点：发芽率正确（1分），估计数量正确（1分），说明随机抽样波动或估计并非精确值（1分）。',
    gradingMode: 'self_check',
    explanation: '样本发芽频率为438÷500=0.876，据此估计总体发芽率为87.6%，发芽数量约为15000×0.876=13140粒。实际总体比例可能与样本比例不同，因此该数量是估计值。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q4'),
  },
  'math-9-9-4-q5': {
    type: 'single_choice',
    knowledgePointId: 'pinlv',
    prompt: '同一生产线在相同条件下随机抽检两批产品。甲样本40件中有7件不合格，乙样本600件中有81件不合格。用抽检结果估计该生产线产品的不合格率，下列说法较合理的是',
    options: [
      '甲样本的不合格率较大，所以它一定更接近总体不合格率。',
      '乙样本的不合格率为13.5%，样本量较大，因此它一定等于总体不合格率。',
      '乙样本的不合格率为13.5%，较大的随机样本通常能提供更稳定的估计，但不能保证这一次一定更接近总体值。',
      '把两个样本的不合格率取平均，得到的15.5%就是总体不合格率。',
    ],
    answerIndex: 2,
    explanation: '甲、乙样本不合格率分别为7÷40=17.5%和81÷600=13.5%。在抽样方法合理、条件相同的前提下，样本量较大时频率通常更稳定；但随机抽样仍会有波动，不能据此保证乙样本值恰好更接近总体值。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q5'),
  },
  'math-9-9-4-q6': {
    type: 'fill_blank',
    knowledgePointId: 'pinlv',
    prompt: '某景区在相同条件下重复开展抽签体验280次，其中抽中蓝签21次。按这组试验数据估计抽中蓝签的概率为____（用小数表示）。',
    correctAnswer: '0.075',
    acceptedAnswers: ['0.075', '7.5%', '0.0750'],
    explanation: '抽中蓝签的频率为21÷280=0.075，因此估计概率约为0.075。',
    difficulty: 'MEDIUM',
    sourceRef: frequencyRef('math-9-9-4-q6'),
  },
  'math-9-9-4-q7': {
    type: 'multiple_choice',
    knowledgePointId: 'pinlv',
    prompt: '同一条件下分别进行40次、400次、4000次重复试验，事件A发生的次数依次为28次、224次、1988次。下列说法正确的是（多选）',
    options: [
      '三组试验的频率依次为0.70、0.56、0.497。',
      '4000次试验中事件A的频率为0.497。',
      '三组频率必须按从大到小的顺序逐步接近事件A的概率。',
      '4000次试验的频率通常更有参考价值，但不能据此断定事件A的概率恰好是0.497。',
    ],
    answerIndices: [0, 1, 3],
    explanation: '三组频率分别为28÷40=0.70、224÷400=0.56、1988÷4000=0.497。频率不会保证按某个方向单调变化；较多次试验通常能提供更稳定的估计，但有限次试验仍不等于精确概率。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q7'),
  },
  'math-9-9-4-q8': {
    type: 'single_choice',
    knowledgePointId: 'pinlv',
    prompt: '某抽奖设备在相同条件下试运行600次，中奖126次。若用中奖频率估计中奖概率，则正式运行240次时，按此估计中奖次数约为',
    options: ['50次。', '21次。', '126次。', '286次。'],
    answerIndex: 0,
    explanation: '试运行中奖频率为126÷600=0.21，估计正式运行240次的中奖次数约为240×0.21=50.4次，约50次。实际次数仍可能上下波动。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q8'),
  },
  'math-9-9-4-q9': {
    type: 'short_answer',
    knowledgePointId: 'pinlv',
    prompt: '某零件供应商称其产品的合格率为95%。质量人员从一批零件中随机抽取100件检验，发现91件合格。\n（1）本次抽检中零件合格的频率是多少？\n（2）仅凭这100件的结果，能否断定该批零件的真实合格概率一定低于95%？说明理由。',
    correctAnswer: '参考答案：（1）91÷100=0.91；（2）不能断定。100件样本的合格频率是0.91，但随机抽样会有波动，样本频率不一定等于总体概率。若要作出更可靠判断，可在相同检验标准下扩大随机样本并重复抽检。评分要点：频率0.91（1分），说明有限样本频率不等于总体概率、存在随机波动（1分）。',
    gradingMode: 'self_check',
    explanation: '本次样本合格频率为91÷100=0.91。即使抽样随机，样本比例也可能偏高或偏低；一次100件的结果不足以将真实概率精确确定为0.91，也不能单独证明真实概率一定低于95%。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q9'),
  },
  'math-9-9-4-q10': {
    type: 'short_answer',
    knowledgePointId: 'pinlv',
    prompt: '学校想估计全校学生购买某套餐的概率。调查小组只在周五放学时询问了120名参加体育社团的学生，其中72人表示会购买，并据此估计全校购买概率为0.6。\n（1）0.6是怎样得到的？\n（2）这项调查的估计可能有什么问题？提出一种改进抽样的方法，并说明改进后仍应怎样理解估计结果。',
    correctAnswer: '参考答案：（1）72÷120=0.6；（2）样本只来自周五放学时参加体育社团的学生，抽样对象和时间都可能造成选择偏差，未必代表全校学生。可按年级分层后，在不同年级、不同日期随机抽取学生调查；改进后由样本频率得到的仍是对总体概率的近似估计，不保证与真实值完全相等。评分要点：频率计算正确（1分），指出样本代表性不足或选择偏差（1分），给出合理随机抽样改进并说明估计仍有随机误差（1分）。',
    gradingMode: 'self_check',
    explanation: '样本中表示会购买的频率为72÷120=0.6。但样本集中在某一社团、某一时间，可能与全校学生的消费倾向不同。按年级等分层后随机抽取、覆盖不同日期可以改善代表性；随机抽样仍有波动，结论依然是估计。',
    difficulty: 'EXAM',
    sourceRef: frequencyRef('math-9-9-4-q10'),
  },
}
