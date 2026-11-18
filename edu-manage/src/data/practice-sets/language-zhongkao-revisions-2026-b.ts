import type { PracticeQuestion } from '../parent-practice-bank'

type QuestionRevision = Partial<PracticeQuestion>

function chineseGradeNinePoemSource(id: string) {
  return '牧哲学堂原创拓展题/河北中考题型参考2026/语文/九年级上册/第一单元/4乡愁（余光中）#' + id + '；原创设问与研读材料，诗句仅作必要短引'
}

/**
 * 《乡愁》第二轮改写。十题均保留原知识点 kp-9a-1-4，覆盖文学常识、
 * 字音、体裁、内容、意象、结构、情感、材料探究和比较阅读。
 */
export const languageZhongkaoQuestionRevisions2026B: Record<string, QuestionRevision> = {
  'chinese-9a-1-4-q1': {
    type: 'single_choice',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '九年级上册诗歌《乡愁》的作者是（　）',
    options: ['余光中', '艾青', '舒婷', '戴望舒'],
    answerIndex: 0,
    explanation: '《乡愁》的作者是余光中。文学常识题应准确对应作品与作者，不要把其他现代诗人的作品混淆。',
    difficulty: 'EASY',
    sourceRef: chineseGradeNinePoemSource('q1-作者与文学常识'),
  },
  'chinese-9a-1-4-q2': {
    type: 'single_choice',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '下列词语注音全部正确的一项是（　）',
    options: ['窄窄（zhǎi zhǎi）', '坟墓（fén mǔ）', '海峡（hǎi jiá）', '邮票（yóu piāo）'],
    answerIndex: 0,
    explanation: '“窄”读 zhǎi，A项正确。“墓”读 mù，不读 mǔ；“峡”读 xiá，不读 jiá；“票”读 piào，不读 piāo。',
    difficulty: 'MEDIUM',
    sourceRef: chineseGradeNinePoemSource('q2-重点字音辨析'),
  },
  'chinese-9a-1-4-q3': {
    type: 'fill_blank',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '《乡愁》以分行的诗句、凝练的意象和鲜明的节奏抒发情感，体裁属于________。',
    correctAnswer: '现代诗',
    acceptedAnswers: ['现代诗', '现代诗歌', '诗歌'],
    gradingMode: 'exact',
    explanation: '《乡愁》是一首现代诗。分行书写、凝练的语言和意象化表达是现代诗常见的形式特点；它不是散文、小说或戏剧。',
    difficulty: 'EASY',
    sourceRef: chineseGradeNinePoemSource('q3-体裁辨识'),
  },
  'chinese-9a-1-4-q4': {
    type: 'single_choice',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '诗中邮票、船票、坟墓、海峡等意象依次出现。对这一组意象的内容作用，理解最恰当的一项是（　）',
    options: ['随时间推移，乡愁由亲人间的离别逐渐扩展到对大陆、故乡的思念', '四种意象都只说明作者喜欢收集旧物', '诗歌只描写交通工具的变化，与情感无关', '这些意象彼此没有联系，不能构成内容线索'],
    answerIndex: 0,
    explanation: '四种意象与人生阶段相连，写出思念对象和空间范围的变化：由母亲、妻子等亲人间的分离，扩展到海峡两岸的阻隔和对大陆的思念。诗歌把个人情感与家国情怀联系起来。',
    difficulty: 'MEDIUM',
    sourceRef: chineseGradeNinePoemSource('q4-意象变化与内容线索'),
  },
  'chinese-9a-1-4-q5': {
    type: 'short_answer',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '诗中把乡愁写成“小小的邮票”。结合“邮票”这一具体物象，说明这种写法怎样表现情感。',
    correctAnswer: '评分要点（共3分）：①指出邮票是具体、可感的日常物件，使抽象的乡愁形象化（1分）；②联系邮寄书信，说明它表现相隔两地的人通过书信传递思念（1分）；③结合童年阶段或“小小”的特点，指出它写出年少时对母亲的牵挂和距离感（1分）。',
    gradingMode: 'self_check',
    explanation: '答题要从物象本身展开：邮票关联书信与两地相隔，使看不见的情感变得可感；再结合童年时与母亲分离的情境说明思念对象。只说“运用了比喻”而不解释表达效果，得分不完整。',
    difficulty: 'EXAM',
    sourceRef: chineseGradeNinePoemSource('q5-邮票意象的表达效果'),
  },
  'chinese-9a-1-4-q6': {
    type: 'multiple_choice',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '关于《乡愁》的结构和表达方式，符合诗歌特点的有（　）',
    options: ['四节按人生阶段推进，形成清楚的时间线索', '相近句式反复出现，形成回环、舒缓的节奏', '全诗主要依靠议论推理来证明一个观点', '四节采用互不相同的体裁，彼此没有结构联系'],
    answerIndices: [0, 1],
    explanation: '诗歌按照童年、成年、后来、现在的时间线索展开，并通过相近句式的反复形成整齐、回环的节奏。它以抒情和意象表达为主，不是议论文，也不是多种体裁拼接。',
    difficulty: 'MEDIUM',
    sourceRef: chineseGradeNinePoemSource('q6-时间顺序与复沓结构'),
  },
  'chinese-9a-1-4-q7': {
    type: 'short_answer',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '结合诗中至少两个不同人生阶段，概括《乡愁》情感内容的发展，并说明末节的思念对象发生了怎样的变化。',
    correctAnswer: '评分要点（共3分）：①能举出前面阶段对母亲或妻子的思念（1分）；②能指出末节把思念指向大陆、故乡或两岸阻隔（1分）；③概括情感由亲人离别之思扩展为家国之思（1分）。表述不必逐节复述，意思准确即可。',
    gradingMode: 'self_check',
    explanation: '诗歌先写亲人分离：童年思念母亲，成年思念妻子，后来又写生死相隔；末节将空间扩大到海峡两岸，思念由个人亲情延伸到对大陆和故乡的牵挂。作答需用阶段变化支持概括，不能只写“表达了乡愁”。',
    difficulty: 'EXAM',
    sourceRef: chineseGradeNinePoemSource('q7-情感发展与主题扩展'),
  },
  'chinese-9a-1-4-q8': {
    type: 'short_answer',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '朗读排练时，一位同学建议删去第三节的“坟墓”，认为它和前两节一样，只是“隔开两个人”。你是否赞同？结合前后意象的变化，说明“坟墓”在诗中的独特作用。',
    correctAnswer: '不赞同。“坟墓”把思念从邮票、船票所表现的两地分离推进到生死相隔，写出对母亲的追念和无法弥补的失去；它加深了乡愁的沉痛，也为末节由亲人离别转向大陆、故乡之思作情感铺垫。评分要点：①指出“坟墓”关联母亲去世或生死相隔（1分）；②说明它不同于前两节的空间分离，情感更沉痛（1分）；③联系后文，说明其在情感推进或结构衔接上的作用（1分）。',
    gradingMode: 'self_check',
    explanation: '这一意象不只是重复“相隔”：邮票和船票表现能够想象为可往来的空间距离，“坟墓”则意味着生死阻隔。分析时要说清这种变化如何加深情感，并推动诗意向末节拓展。',
    difficulty: 'EXAM',
    sourceRef: chineseGradeNinePoemSource('q8-材料探究与意象层次'),
  },
  'chinese-9a-1-4-q9': {
    type: 'short_answer',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '末节用“浅浅”修饰海峡，同时写到大陆在另一头。结合这两个表达，分析其中的情感张力。',
    correctAnswer: '评分要点（共3分）：①指出“浅浅”从字面写出海峡似乎不宽、距离似乎不远（1分）；②指出“大陆在另一头”仍呈现现实阻隔和不能相见（1分）；③说明近与远的反差表现思念之深、盼望接近故乡或大陆的情感（1分）。',
    gradingMode: 'self_check',
    explanation: '“浅浅”给人距离不远的感觉，但“在另一头”又明确写出隔绝，形成空间上似近、现实中仍远的反差。这种反差增强了末节的抒情力量，也让乡愁具有更开阔的家国意味。',
    difficulty: 'EXAM',
    sourceRef: chineseGradeNinePoemSource('q9-关键词与反差效果'),
  },
  'chinese-9a-1-4-q10': {
    type: 'short_answer',
    knowledgePointId: 'kp-9a-1-4',
    prompt: '比较阅读。材料：一位离乡多年的读者写道：“老屋门前的石阶还在，院里的树却高过了屋檐。每次收到母亲的来信，我都想起那盏晚饭前亮起的灯。”结合材料和《乡愁》，概括二者共同的情感，并说明《乡愁》在情感层次上的进一步拓展。',
    correctAnswer: '评分要点（共4分）：①指出材料和《乡愁》都表现了对故乡、亲人的思念（1分）；②结合材料写出对老屋、母亲或童年生活的怀念（1分）；③指出《乡愁》由亲人间的离别之思推进到对大陆、故乡的牵挂（1分）；④说明诗歌将个人亲情与家国情怀联系起来（1分）。',
    gradingMode: 'self_check',
    explanation: '材料通过老屋、树和母亲来信写个人的故乡记忆；《乡愁》也从亲人离别写起，但最后将思念指向大陆和两岸阻隔。比较题既要写共同点，也要写出诗歌情感范围的进一步拓展，不能只把两者都概括为“思乡”。',
    difficulty: 'EXAM',
    sourceRef: chineseGradeNinePoemSource('q10-比较阅读与情感层次'),
  },
}
