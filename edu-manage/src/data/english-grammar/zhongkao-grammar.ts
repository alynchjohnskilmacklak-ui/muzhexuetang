export interface GrammarItem {
  id: string
  title: string
  category: 'TENSE' | 'CLAUSE' | 'PITFALL'
  categoryLabel: string
  formula: string
  summary: string
  mindmapNotes: string[]
  contrast: {
    wrong: string
    right: string
    analysis: string
  }
  examples: string[]
  testQuestion?: {
    question: string
    options: string[]
    answer: number
    explanation: string
  }
}

/**
 * 按 2022 年版义务教育英语课程标准附录 4 的语法项目整理，
 * 对齐 2024 年修订版教材使用范围。练习题是原创题型微练，不标作原卷真题；
 * “理解性”要求的项目会在卡片说明中标出，避免把拓展内容说成必考频次。
 */
export const ZHONGKAO_GRAMMAR: GrammarItem[] = [
  // 动词：课标列出的六种时态、被动语态、情态动词与非谓语形式
  {
    id: 'g-present-simple',
    title: '一般现在时：事实、习惯与单三',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: '主语 + 动词原形 / 第三人称单数；疑问、否定用 do / does',
    summary: '表示经常性动作、习惯、客观事实或相对稳定的状态。先看主语，再决定谓语形式。',
    mindmapNotes: [
      '常见语境：every day, often, usually, on Mondays；也用于客观事实。',
      '主语是 he / she / it 或单数名词时，实义动词通常加 -s / -es；have 变 has。',
      '实义动词疑问、否定借助 do / does；does 后的实义动词恢复原形。',
      'be 动词句直接用 am / is / are，不再添加 do / does。',
    ],
    contrast: {
      wrong: 'Does your brother likes science?',
      right: 'Does your brother like science?',
      analysis: 'does 已承担第三人称单数标记，后面的实义动词用原形。',
    },
    examples: [
      'My sister walks to school every day.',
      'Water boils at 100°C.',
      'Do they have English on Friday?',
    ],
    testQuestion: {
      question: 'The school bus ____ at 7:20 every morning.',
      options: ['leave', 'leaves', 'is leaving', 'left'],
      answer: 1,
      explanation: 'every morning 表示规律性安排，主语 The school bus 是单数，谓语用 leaves。',
    },
  },
  {
    id: 'g-present-continuous',
    title: '现在进行时：此刻与暂时进行',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'am / is / are + 动词-ing',
    summary: '表示说话时正在进行的动作，也可表示现阶段暂时发生的情况；部分动词还可用于近期已安排的活动。',
    mindmapNotes: [
      '常见提示：now, right now, at the moment, Look! / Listen!',
      '构成：be 动词随主语变化，主要动词使用 -ing 形式。',
      '写 -ing 时留意规则：make → making，run → running，lie → lying。',
      'know, like, need 等表示状态的动词通常不用进行时表达一般状态。',
    ],
    contrast: {
      wrong: 'I am knowing the answer now.',
      right: 'I know the answer now.',
      analysis: 'know 通常表示认知状态，不用于此处的进行时。',
    },
    examples: [
      'Listen! Someone is knocking at the door.',
      'We are learning a new unit this week.',
      'They are meeting the coach after school today.',
    ],
    testQuestion: {
      question: 'Listen! Someone ____ at the door.',
      options: ['knocks', 'is knocking', 'knocked', 'has knocked'],
      answer: 1,
      explanation: 'Listen! 提示动作正在发生，使用 am / is / are + doing；Someone 作单数看待。',
    },
  },
  {
    id: 'g-simple-past',
    title: '一般过去时：过去发生的动作',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: '肯定句：动词过去式；疑问 / 否定：did + 动词原形',
    summary: '表示过去某个时间发生并结束的动作或存在的状态。根据语境判断时间，不只依赖单个标志词。',
    mindmapNotes: [
      '常见提示：yesterday, last week, two days ago, in 2024。',
      '规则动词加 -ed；不规则动词使用各自的过去式。',
      '实义动词疑问、否定用 did；did 后的动词恢复原形。',
      'be 动词过去式为 was / were，疑问句将 was / were 提前。',
    ],
    contrast: {
      wrong: 'Where did your family went last summer?',
      right: 'Where did your family go last summer?',
      analysis: 'did 已表示过去，后面的主要动词用原形 go。',
    },
    examples: [
      'We visited the science museum last Saturday.',
      'The bell rang while the students were leaving.',
      'Did you see the notice yesterday?',
    ],
    testQuestion: {
      question: 'My family ____ to Xi’an last summer.',
      options: ['go', 'goes', 'went', 'has gone'],
      answer: 2,
      explanation: 'last summer 指已经结束的过去时间，go 的过去式是 went。',
    },
  },
  {
    id: 'g-past-continuous',
    title: '过去进行时：过去某时正在发生',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'was / were + 动词-ing',
    summary: '表示过去某一时刻或某一段时间正在进行的动作。与一般过去时连用时，常写背景动作和插入事件。',
    mindmapNotes: [
      '常见提示：at 8 yesterday evening, at that time, this time yesterday。',
      '一个动作持续进行时，另一个动作发生：持续动作常用过去进行时，短暂事件常用一般过去时。',
      'while 常连接持续动作；when 可引出动作发生的时间点，具体时态仍要看句意。',
      '两件事在过去同时持续进行时，两边都可用过去进行时。',
    ],
    contrast: {
      wrong: 'I was doing my homework when the lights were going out.',
      right: 'I was doing my homework when the lights went out.',
      analysis: '做作业是当时正在持续的背景动作；灯熄灭是发生在那一刻的事件。',
    },
    examples: [
      'At 8 yesterday evening, we were having dinner.',
      'While Mum was cooking, I was setting the table.',
      'I was reading when the phone rang.',
    ],
    testQuestion: {
      question: 'I ____ my homework when the lights went out.',
      options: ['do', 'did', 'was doing', 'have done'],
      answer: 2,
      explanation: 'when 引出的灯熄灭是过去的短暂事件；主句表示当时正在做作业，用 was doing。',
    },
  },
  {
    id: 'g-future-tense',
    title: '一般将来时：预测、意愿与计划',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'will + 动词原形；am / is / are going to + 动词原形',
    summary: '表达将来的动作、预测、临时决定或已有计划。根据说话情境选择结构，不把所有将来表达都机械替换成 will。',
    mindmapNotes: [
      'will 常用于临时决定、承诺或一般预测。',
      'be going to 常用于已有打算，或根据眼前迹象作出的预测。',
      '现在进行时可表示已安排的近期活动，如 We are visiting Grandma tomorrow.',
      '时间、条件状语从句中表示将来时，通常在从句用一般现在时。',
    ],
    contrast: {
      wrong: 'Look at those dark clouds! It will raining soon.',
      right: 'Look at those dark clouds! It is going to rain soon.',
      analysis: 'be going to 后接动词原形；根据眼前乌云作预测时可用 be going to。',
    },
    examples: [
      'I will help you carry the books.',
      'They are going to plant trees this weekend.',
      'We are taking the train tomorrow morning.',
    ],
    testQuestion: {
      question: 'Look at those dark clouds! It ____ soon.',
      options: ['rains', 'is raining', 'is going to rain', 'rained'],
      answer: 2,
      explanation: '根据眼前的乌云作将来预测，使用 is going to + 动词原形。',
    },
  },
  {
    id: 'g-present-perfect',
    title: '现在完成时：经历、结果与持续',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'have / has + 过去分词',
    summary: '把过去发生的动作和现在联系起来，可表示经历、结果或持续到现在的状态；要结合时间状语和句意判断。',
    mindmapNotes: [
      '常见提示：already, yet, just, ever, never；具体搭配仍以句意为准。',
      'for + 一段时间；since + 时间点或过去发生的从句。',
      '延续一段时间时，瞬间动作常换成状态表达：buy → have, die → be dead。',
      'have been to 表示去过并已回来；have gone to 表示去了、目前不在这里。',
      '现在完成时通常不与明确结束的过去时间连用，如 yesterday、in 2020。',
    ],
    contrast: {
      wrong: 'I have bought this bike for three years.',
      right: 'I have had this bike for three years.',
      analysis: 'buy 表示买下这一瞬间；描述拥有了三年，应使用延续性动词 have。',
    },
    examples: [
      'I have already finished my homework.',
      'She has lived here since she was six.',
      'Where is Ben? He has gone to the library.',
    ],
    testQuestion: {
      question: 'Mina ____ English for three years, and she is still taking lessons.',
      options: ['studies', 'studied', 'has studied', 'is studying'],
      answer: 2,
      explanation: 'for three years 表示从过去持续到现在，后句明确她仍在上课，使用 has studied。',
    },
  },
  {
    id: 'g-passive-voice',
    title: '被动语态：看主语与动作关系',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'be（按时态和主语变化）+ 及物动词过去分词',
    summary: '主语是动作承受者、且需要突出动作对象时使用。时态体现在 be 动词上，by 短语可按需省略。',
    mindmapNotes: [
      '一般现在时：am / is / are + done；一般过去时：was / were + done。',
      '一般将来时：will be + done；情态动词后：情态动词 + be + done。',
      '被动结构的主要动词用过去分词；先确认原句动词能否带宾语。',
      'happen、take place 等不及物用法没有直接宾语，不能照搬被动结构。',
    ],
    contrast: {
      wrong: 'A traffic accident was happened near the school.',
      right: 'A traffic accident happened near the school.',
      analysis: 'happen 在此表示“发生”，是不及物用法，不构成被动语态。',
    },
    examples: [
      'The classroom is cleaned every afternoon.',
      'The old bridge was built in 1998.',
      'The results will be announced tomorrow.',
    ],
    testQuestion: {
      question: 'The old bridge ____ in 2020.',
      options: ['build', 'is built', 'was built', 'has built'],
      answer: 2,
      explanation: 'bridge 是 build 的承受者，且 in 2020 指过去，使用一般过去时被动语态 was built。',
    },
  },
  {
    id: 'g-modal-verbs',
    title: '情态动词：语气与动词原形',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: '情态动词 + 动词原形；have to + 动词原形',
    summary: '情态动词表达能力、许可、可能、建议、义务等语气。判断时要关注说话者的意思和情境。',
    mindmapNotes: [
      'can / could 可表示能力或请求；may 可表示许可或可能；should 常表示建议。',
      'must 表示较强的义务或推断；have to 常强调外部要求。',
      'mustn’t 表示禁止；don’t have to 表示不必，两者含义不同。',
      '情态动词后接动词原形；must 的否定推断常用 can’t 表示“不可能”。',
    ],
    contrast: {
      wrong: 'You don’t have to enter the lab. The sign says it is forbidden.',
      right: 'You mustn’t enter the lab. The sign says it is forbidden.',
      analysis: '此处是“禁止进入”，用 mustn’t；don’t have to 表示“没有必要”，不表示禁止。',
    },
    examples: [
      'Could you help me with this box?',
      'You should save your work before closing the computer.',
      'We have to wear safety glasses in the lab.',
    ],
    testQuestion: {
      question: 'You ____ use a dictionary during the test. It is not allowed.',
      options: ['must', 'mustn’t', 'don’t have to', 'could'],
      answer: 1,
      explanation: 'It is not allowed 表示不允许，应用 mustn’t；don’t have to 表示“不必”。',
    },
  },
  {
    id: 'g-non-finite-verbs',
    title: '非谓语动词：to do 与 doing',
    category: 'TENSE',
    categoryLabel: '动词体系',
    formula: 'to do 表目的或跟在特定动词后；doing 可作主语、宾语或跟在特定搭配后',
    summary: '一个句子已有谓语时，其他动词形式要看它在句中的作用和前面词语的搭配。课标附录将 -ing / -ed 形式列为理解性项目。',
    mindmapNotes: [
      'want, hope, decide, plan 等后常接 to do；enjoy, finish, practice 等后常接 doing。',
      'ask / tell / want + 人 + to do；不定式也可表示目的：She went out to buy some food.',
      'stop to do 是停下手头的事去做另一件事；stop doing 是停止正在做的事。',
      'look forward to 中的 to 是介词，后接名词或 doing。',
    ],
    contrast: {
      wrong: 'He enjoys to read stories to the children.',
      right: 'He enjoys reading stories to the children.',
      analysis: 'enjoy 后接动名词 doing，不接不定式 to do。',
    },
    examples: [
      'We decided to take the early train.',
      'Reading before bed helps me relax.',
      'She stopped to buy a bottle of water.',
      'Please stop talking while the teacher is speaking.',
    ],
    testQuestion: {
      question: 'My sister enjoys ____ stories to children.',
      options: ['read', 'to read', 'reading', 'reads'],
      answer: 2,
      explanation: 'enjoy 后接动名词，故用 reading。',
    },
  },

  // 句型与从句：依课标项目关注结构、语序和语境中的意义
  {
    id: 'g-sentence-patterns',
    title: '简单句基本句型与 there be',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '主谓 / 主系表 / 主谓宾 / 主谓双宾 / 主谓宾补 / there be',
    summary: '分析句子时先找谓语，再判断主语、宾语、表语或补足语。there be 用于表达某处存在某物。',
    mindmapNotes: [
      '主谓：The bus arrived.；主系表：The soup tastes delicious.',
      '主谓宾：We visited the museum.；主谓双宾：Dad gave me a camera.',
      '主谓宾补：The news made everyone happy.；宾语补足语说明宾语状态或结果。',
      'there be 表示“某处有……”，be 动词通常与后面最近的名词保持单复数一致。',
    ],
    contrast: {
      wrong: 'The news made everyone happily.',
      right: 'The news made everyone happy.',
      analysis: 'everyone 是宾语，后面需要形容词作宾语补足语，说明 everyone 的状态。',
    },
    examples: [
      'The baby smiled.',
      'Your idea sounds useful.',
      'There are two maps and a notebook on the desk.',
    ],
    testQuestion: {
      question: 'The good news made everyone ____.',
      options: ['happily', 'happiness', 'happy', 'to happy'],
      answer: 2,
      explanation: 'made everyone 后接宾语补足语；形容词 happy 描述 everyone 的状态。',
    },
  },
  {
    id: 'g-question-forms',
    title: '疑问句与反意疑问句',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '一般疑问句：助动词 / be / 情态动词 + 主语；反意疑问句：前肯后否，前否后肯',
    summary: '先确认句子谓语类型，再决定疑问句所需的助动词。反意疑问句的附加部分要与前句的人称、时态和助动词对应。',
    mindmapNotes: [
      'be 动词、助动词、情态动词可直接提前；一般现在时和一般过去时的实义动词借助 do / does / did。',
      '特殊疑问词作主语时，语序通常不倒装：Who called you?',
      '反意疑问句通常前肯后否、前否后肯；附加问句沿用前句的助动词。',
      '常见特殊形式需单独记忆，如 Let’s ..., shall we?；I am ..., aren’t I?',
    ],
    contrast: {
      wrong: 'You have finished the project, don’t you?',
      right: 'You have finished the project, haven’t you?',
      analysis: '前句是肯定的现在完成时，反意部分沿用助动词 have，并变为否定形式。',
    },
    examples: [
      'Does your cousin live near the station?',
      'Where did they put the tickets?',
      'You have finished your project, haven’t you?',
    ],
    testQuestion: {
      question: 'You have finished your project, ____?',
      options: ['haven’t you', 'don’t you', 'aren’t you', 'won’t you'],
      answer: 0,
      explanation: '前句是肯定的现在完成时，反意部分用 have 的否定形式 haven’t you。',
    },
  },
  {
    id: 'g-object-clause',
    title: '宾语从句：连接词、语序与时态',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '主句 + 引导词 + 主语 + 谓语',
    summary: '宾语从句在主句中作宾语。先依据从句含义选择引导词，再使用陈述语序，最后结合实际时间判断时态。',
    mindmapNotes: [
      '陈述内容常用 that；一般疑问含义常用 if / whether；特殊疑问按 what / where / when 等选词。',
      '从句用陈述语序：引导词 + 主语 + 谓语，不保留直接疑问句的倒装。',
      '主句是过去时，常需按语境调整从句时态；客观事实或现在仍成立的内容可用一般现在时。',
      'Could you tell me 中的 could 常用于礼貌请求，不自动表示从句内容发生在过去。',
    ],
    contrast: {
      wrong: 'Could you tell me where is the science museum?',
      right: 'Could you tell me where the science museum is?',
      analysis: 'where 引导宾语从句，从句使用“主语 + 谓语”的陈述语序。',
    },
    examples: [
      'I know that she is good at drawing.',
      'Do you remember where we parked the car?',
      'He asked whether the room was ready.',
      'Our teacher said that the Earth moves around the Sun.',
    ],
    testQuestion: {
      question: 'The museum is open now, and I need directions. Could you tell me ____?',
      options: [
        'where is the science museum',
        'where the science museum is',
        'where was the science museum',
        'where the science museum was yesterday',
      ],
      answer: 1,
      explanation: '询问现在科学博物馆的位置，从句用陈述语序和一般现在时，选 where the science museum is。',
    },
  },
  {
    id: 'g-adverbial-clause',
    title: '状语从句：时间、条件与逻辑关系',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '连词 + 完整句子；先判断从句表达的时间或逻辑关系',
    summary: '时间、条件、原因、让步、结果和目的等状语从句，通过连词表达句子之间的逻辑关系。',
    mindmapNotes: [
      'when, before, after, until, as soon as 可引导时间状语从句；if, unless 可引导条件状语从句。',
      '时间或条件从句谈将来时，主句可用将来时，从句通常用一般现在时表达将来。',
      'because 表原因，although / though 表让步，so that 可表目的；选择时看两句的逻辑。',
      'if 在条件状语从句中表示“如果”；在宾语从句中可表示“是否”，不能混为一类。',
    ],
    contrast: {
      wrong: 'We will start as soon as everyone will arrive.',
      right: 'We will start as soon as everyone arrives.',
      analysis: 'as soon as 引导时间状语从句，谈将来时从句通常用一般现在时。',
    },
    examples: [
      'I will call you when I get to the station.',
      'Unless we hurry, we will miss the bus.',
      'Although the path was steep, the children reached the top.',
      'We spoke quietly so that the baby could sleep.',
    ],
    testQuestion: {
      question: 'We will start the game as soon as everyone ____ here.',
      options: ['will arrive', 'arrives', 'arrived', 'will arrives'],
      answer: 1,
      explanation: 'as soon as 引导时间状语从句，主句表示将来，从句使用一般现在时 arrives。',
    },
  },
  {
    id: 'g-attributive-clause',
    title: '定语从句：关系代词指人或物',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '先行词 + who / which / that + 从句',
    summary: '限定性定语从句修饰前面的名词。先找先行词，再看从句缺少的人或物。',
    mindmapNotes: [
      '先行词指人时，常用 who 或 that；指物时，常用 which 或 that。',
      '关系代词在从句中作主语时不能省略；作宾语时有时可省略。',
      '先行词与关系代词在从句中承担不同角色，避免重复主语或宾语。',
      '本卡聚焦课标列明的 who、which、that 限定性定语从句。',
    ],
    contrast: {
      wrong: 'The girl which won the speech contest is my cousin.',
      right: 'The girl who won the speech contest is my cousin.',
      analysis: '先行词 the girl 指人，且关系代词在从句中作主语，用 who 或 that。',
    },
    examples: [
      'The book that you lent me is very useful.',
      'I met a teacher who speaks three languages.',
      'This is the park which we visited last weekend.',
    ],
    testQuestion: {
      question: 'The student ____ won the speech contest is in my class.',
      options: ['who', 'which', 'whom', 'whose'],
      answer: 0,
      explanation: '先行词 the student 指人，且在从句中作主语，选 who。',
    },
  },
  {
    id: 'g-compound-sentences',
    title: '并列句与连词：连接平行信息',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '完整分句 + and / but / or / so + 完整分句',
    summary: '并列连词连接语法地位相同的词、短语或分句。根据前后关系选择连词，并留意避免重复表达同一逻辑。',
    mindmapNotes: [
      'and 连接补充信息；but 表转折；or 表选择或“否则”；so 表结果。',
      'because 引导原因从句，so 引导结果分句；标准书面语中通常不在同一因果结构中重复使用 because 和 so。',
      'although / though 引导让步从句，通常不与 but 在同一结构中重复表达转折。',
      '判断连词时先说清两部分是并列、转折、选择、因果还是让步。',
    ],
    contrast: {
      wrong: 'Although it was raining, but we continued the match.',
      right: 'Although it was raining, we continued the match.',
      analysis: 'although 已经引出让步关系，主句通常不再加 but。',
    },
    examples: [
      'You can take the bus, or you can walk with us.',
      'The road is short, but it is quite steep.',
      'The shop was closed, so we went home.',
    ],
    testQuestion: {
      question: 'The shop was closed, ____ we had to buy food somewhere else.',
      options: ['so', 'but', 'because', 'although'],
      answer: 0,
      explanation: '商店关门是原因，去别处买东西是结果；连接两个并列分句表示结果，用 so。',
    },
  },
  {
    id: 'g-imperatives-exclamations',
    title: '祈使句与感叹句',
    category: 'CLAUSE',
    categoryLabel: '句型与从句',
    formula: '祈使句：动词原形；What + 名词短语；How + 形容词 / 副词',
    summary: '祈使句常用于建议、请求或指令；感叹句突出名词短语或形容词、副词所表达的情感。',
    mindmapNotes: [
      '肯定祈使句通常以动词原形开头；否定形式常用 Don’t + 动词原形。',
      'Let’s 开头的建议句，反意疑问部分常用 shall we。',
      'What + a / an + 形容词 + 单数可数名词；不可数名词和复数名词前不加 a / an。',
      'How + 形容词 / 副词 + 主语 + 谓语。',
    ],
    contrast: {
      wrong: 'What a useful advice it is!',
      right: 'What useful advice it is!',
      analysis: 'advice 是不可数名词，感叹句中不加不定冠词 a。',
    },
    examples: [
      'Please keep the door open.',
      'Don’t forget to bring your notebook.',
      'How quickly the time passes!',
    ],
    testQuestion: {
      question: '____ useful advice it is!',
      options: ['What', 'What a', 'How', 'What an'],
      answer: 0,
      explanation: 'advice 是不可数名词，使用 What + 形容词 + 不可数名词。',
    },
  },

  // 词法与句法：在句中判断词形、搭配和一致关系
  {
    id: 'g-nouns',
    title: '名词：单复数、可数性与所有格',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '名词形式要匹配数量、限定词和所属关系',
    summary: '名词考点集中在可数与不可数、单复数变化以及所有格形式；先识别名词，再看它与上下文的搭配。',
    mindmapNotes: [
      '可数名词单数通常需要限定词；many / a few 修饰可数名词复数。',
      'much / a little 修饰不可数名词；some / any 要结合肯定、否定和疑问语境判断。',
      '特殊复数需记忆：child → children, man → men, tooth → teeth；sheep 单复数同形。',
      '单数名词所有格常加 ’s；以 s 结尾的复数名词所有格通常只加撇号。',
    ],
    contrast: {
      wrong: 'There are many informations about the event online.',
      right: 'There is a lot of information about the event online.',
      analysis: 'information 通常作不可数名词，不用 many 修饰，也不加复数 -s。',
    },
    examples: [
      'Two children are waiting outside.',
      'We do not have much time before the show.',
      'The students’ projects are on the wall.',
    ],
    testQuestion: {
      question: 'The farmer keeps three ____ on the farm.',
      options: ['sheep', 'sheeps', 'sheep’s', 'sheepes'],
      answer: 0,
      explanation: 'sheep 的单数和复数同形；three 后需要复数含义，但形式仍是 sheep。',
    },
  },
  {
    id: 'g-pronouns',
    title: '代词：主格、宾格、物主与反身',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '代词形式由句中位置和所表达的所属关系决定',
    summary: '先判断空格在句中作主语、宾语还是表示所属，再选择相应的人称代词、物主代词或反身代词。',
    mindmapNotes: [
      '人称代词主格作主语；宾格常放在动词或介词之后。',
      '形容词性物主代词后接名词；名词性物主代词可独立使用。',
      '反身代词可表示主语和宾语为同一人，也常见于 by oneself。',
      '指示代词 this / that / these / those，疑问代词 who / what / which，以及不定代词都要按句中功能选择。',
    ],
    contrast: {
      wrong: 'The players helped ourselves to some fruit.',
      right: 'The players helped themselves to some fruit.',
      analysis: 'help oneself to sth 表示“随便吃 / 用某物”；主语和宾语是同一群人，使用反身代词。',
    },
    examples: [
      'Could you pass the note to him?',
      'This blue notebook is mine.',
      'We made the model by ourselves.',
    ],
    testQuestion: {
      question: 'The artist showed ____ new painting to the visitors.',
      options: ['her', 'hers', 'she', 'herself'],
      answer: 0,
      explanation: '空格后有名词 new painting，需要形容词性物主代词 her。',
    },
  },
  {
    id: 'g-articles',
    title: '冠词：a / an、the 与零冠词',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '不定冠词看首音；定冠词看特指；零冠词看泛指或固定用法',
    summary: '冠词由名词的可数性、单复数以及上下文是否特指决定。a / an 取决于后续词的起始音，不只看首字母。',
    mindmapNotes: [
      'a / an 用于首次提及的单数可数名词或职业名称；根据读音选择。',
      'the 用于双方已知或上下文特指的人或事物，也用于部分固定表达。',
      '复数可数名词和不可数名词表示泛指时通常不加冠词。',
      '专有名词、学科、三餐、球类等用法要结合固定搭配记忆。',
    ],
    contrast: {
      wrong: 'My sister is an university student.',
      right: 'My sister is a university student.',
      analysis: 'university 以 /juː/ 开头，是辅音音素，前面用 a。',
    },
    examples: [
      'Leo wants to be an engineer.',
      'The moon looks bright tonight.',
      'My brother plays basketball after school.',
    ],
    testQuestion: {
      question: 'Mia wants to be ____ engineer when she grows up.',
      options: ['a', 'an', 'the', '不填'],
      answer: 1,
      explanation: 'engineer 是以元音音素开头的单数可数名词，此处表示职业，用 an。',
    },
  },
  {
    id: 'g-adjective-adverb',
    title: '形容词与副词：看修饰对象',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '形容词修饰名词或作表语；副词常修饰动词、形容词或其他副词',
    summary: '词形题先判断空格在句中的功能，再选形容词、副词或名词形式；不能只靠词尾判断。',
    mindmapNotes: [
      '名词前常用形容词；be, look, sound, smell, taste, feel 后作表语时常用形容词。',
      '修饰动作时常用副词；副词也可修饰形容词或其他副词。',
      '部分词形不按 -ly 变化：fast, hard, late 等需辨义记忆。',
      '感官动词作系动词时接形容词，如 The soup smells good.',
    ],
    contrast: {
      wrong: 'The speaker explained the rules clear.',
      right: 'The speaker explained the rules clearly.',
      analysis: 'clear 修饰动词 explained，需要使用副词 clearly。',
    },
    examples: [
      'The classroom is quiet.',
      'The students listened carefully.',
      'This exercise is surprisingly easy.',
    ],
    testQuestion: {
      question: 'The speaker explained the rules ____ so everyone understood.',
      options: ['clear', 'clearly', 'clearer', 'clearness'],
      answer: 1,
      explanation: '空格修饰动词 explained，应用副词 clearly。',
    },
  },
  {
    id: 'g-comparison',
    title: '形容词与副词的比较等级',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '比较级 + than；as + 原级 + as；the + 最高级',
    summary: '比较等级由比较对象和句意决定。先找 than、as ... as 或范围，再选择原级、比较级或最高级。',
    mindmapNotes: [
      '短词常加 -er / -est；较长的词常用 more / most；拼写有若干变化。',
      '常见不规则形式：good / well → better → best；bad / badly → worse → worst。',
      'as ... as 中间用形容词或副词原级；否定形式常见 not as / so ... as。',
      '比较级前可用 much, even, a little 等修饰；不要重复使用 more 和 -er。',
    ],
    contrast: {
      wrong: 'This route is more shorter than the old one.',
      right: 'This route is shorter than the old one.',
      analysis: 'short 的比较级为 shorter，不再加 more。',
    },
    examples: [
      'Today is much warmer than yesterday.',
      'Maya runs as quickly as her sister.',
      'It is the most peaceful place in the town.',
    ],
    testQuestion: {
      question: 'This route is ____ than the one we took yesterday.',
      options: ['short', 'shorter', 'shortest', 'more short'],
      answer: 1,
      explanation: 'than 表示两者比较，short 的比较级为 shorter。',
    },
  },
  {
    id: 'g-prepositions',
    title: '介词：时间、地点与常用搭配',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '介词 + 名词 / 代词 / 动名词；按时间、位置和搭配选择',
    summary: '介词用法需要结合它与名词、动词或形容词的搭配。时间和地点的 in / on / at 是基础辨析。',
    mindmapNotes: [
      '时间：at 常接时刻；on 常接具体某一天；in 常接月份、年份、季节或较长时段。',
      '地点：at 可指具体点位；on 常指表面；in 常指内部或较大区域。',
      '介词后接名词、代词或动名词；不要直接接动词原形。',
      '固定搭配按词组整体记忆，如 listen to, arrive at / in, be interested in。',
    ],
    contrast: {
      wrong: 'Our English lesson begins in 8:30 on Friday.',
      right: 'Our English lesson begins at 8:30 on Friday.',
      analysis: '具体时刻 8:30 前用 at；具体星期 Friday 前用 on。',
    },
    examples: [
      'The school year starts in September.',
      'The notice is on the classroom door.',
      'She is interested in learning Japanese.',
    ],
    testQuestion: {
      question: 'Our English lesson begins ____ 8:30 on Friday.',
      options: ['in', 'on', 'at', 'for'],
      answer: 2,
      explanation: '具体时刻前用 at；星期前用 on。',
    },
  },
  {
    id: 'g-numerals',
    title: '数词：基数词、序数词与日期',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '基数词表示数量；序数词表示顺序、日期或名次',
    summary: '根据句意判断所需的是数量还是顺序。序数词常与 the 连用，但物主代词等限定词出现时不重复加 the。',
    mindmapNotes: [
      'one → first, two → second, three → third, five → fifth, eight → eighth, nine → ninth。',
      '整十序数词常以 -ieth 结尾；复合序数词通常只把个位改成序数词。',
      '日期常用序数词；读日期时月份在前、日子在后。',
      'hundred, thousand 等前有具体数字时通常不加复数 -s；表示概数时可用 hundreds of。',
    ],
    contrast: {
      wrong: 'Our school library opened on September one.',
      right: 'Our school library opened on September first.',
      analysis: '日期中的日通常使用序数词；September 1st 也可写作 September 1。',
    },
    examples: [
      'She finished third in the race.',
      'My birthday is on May 12th.',
      'More than two hundred students joined the event.',
    ],
    testQuestion: {
      question: 'The school library opened on September 1st. It opened on the ____ day of September.',
      options: ['one', 'first', 'once', 'firstly'],
      answer: 1,
      explanation: '表示日期顺序用序数词 first；此处有 the，使用 the first day。',
    },
  },
  {
    id: 'g-word-formation',
    title: '构词法：根据句子位置判断词形',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '词根 + 前缀 / 后缀 / 词性转换；先判断句中所需词性',
    summary: '语篇填词常需要在同一词根的名词、动词、形容词和副词之间转换。先看空格的句法位置，再核对词义。',
    mindmapNotes: [
      '冠词、形容词性物主代词等后面常接名词；名词前可用形容词修饰。',
      '情态动词后用动词原形；be 后可接形容词或分词，需结合句意判断。',
      '修饰动作通常用副词，但 hard、fast 等形式要根据具体词义判断。',
      '常见派生词缀包括 -tion / -ment（名词）、-ful / -less（形容词）、-ly（副词）；有例外。',
    ],
    contrast: {
      wrong: 'Her pronounce of the new words is clear.',
      right: 'Her pronunciation of the new words is clear.',
      analysis: '形容词性物主代词 Her 后需要名词；pronounce 的名词形式是 pronunciation。',
    },
    examples: [
      'The children answered the question correctly.',
      'We need more information about the trip.',
      'The new plan is helpful for beginners.',
    ],
    testQuestion: {
      question: 'Her ____ of the new words is clear. (pronounce)',
      options: ['pronounce', 'pronunciation', 'pronounced', 'pronouncing'],
      answer: 1,
      explanation: 'Her 后需要名词作主语中心词；pronounce 的名词形式是 pronunciation。',
    },
  },
  {
    id: 'g-subject-verb-agreement',
    title: '主谓一致：先找真正的主语',
    category: 'PITFALL',
    categoryLabel: '词法与句法',
    formula: '谓语形式与主语的人称、数和句意保持一致',
    summary: '主谓一致在课标附录中列为理解性项目。本卡用常见句型练习先定位主语，再核对谓语形式。',
    mindmapNotes: [
      'each / every 等作主语中心词时通常看作单数；主语后面的介词短语一般不改变主语数。',
      'there be 句型中，be 通常与后面最近的并列名词保持一致。',
      'a number of + 复数名词常接复数谓语；the number of + 复数名词通常接单数谓语。',
      '时间、距离、金钱等作为整体数量时，谓语形式要依据句意判断。',
    ],
    contrast: {
      wrong: 'Each of the students have a library card.',
      right: 'Each of the students has a library card.',
      analysis: '主语中心词是 each，作单数看待；of the students 是介词短语，不决定谓语数。',
    },
    examples: [
      'The teacher with her students is cleaning the classroom.',
      'There are two notebooks and a pen on the desk.',
      'The number of visitors is growing.',
    ],
    testQuestion: {
      question: 'The current class list shows that each student ____ a library card.',
      options: ['has', 'have', 'had', 'having'],
      answer: 0,
      explanation: 'each classroom window 是单数主语，且 current school map 指现在的情况，谓语用 has。',
    },
  },
]
