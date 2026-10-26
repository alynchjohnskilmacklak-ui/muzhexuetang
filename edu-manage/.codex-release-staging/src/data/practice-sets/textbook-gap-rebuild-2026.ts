import type { PracticeSet } from '../parent-practice-bank'

type ChoiceSeed = {
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
  point: number
}

type GapSeed = Omit<PracticeSet, 'knowledgePoints' | 'questions'> & {
  directoryUrl: string
  evidence: string[]
  points: Array<[string, string]>
  questions: ChoiceSeed[]
}

function makeSet(seed: GapSeed): PracticeSet {
  const { directoryUrl, evidence, points, questions, ...metadata } = seed
  const knowledgePoints = points.map(([title, content], index) => ({
    id: `${seed.id}-kp${index + 1}`,
    title,
    content,
  }))
  const sourceNote = [
    `现行教材目录：${directoryUrl}`,
    ...evidence.map((item) => `知识核对：${item}`),
    '牧哲学堂原创题，按现行课次主题编写；题干未照录教材或第三方题库。',
  ].join('；')

  return {
    ...metadata,
    edition: ({
      语文: '统编版（人教）',
      英语: '人教版',
      物理: '人教版',
      化学: '人教版',
      道德与法治: '统编版（人教）',
      政治: '统编版（人教）',
      历史: '统编版（人教）',
      地理: '人教版',
      数学: '冀教版（2024 修订目录）',
      生物: '冀少版',
    } as Record<string, string>)[metadata.subject] ?? '现行教材版本待核',
    sourceNote,
    knowledgePoints,
    questions: questions.map((question, index) => ({
      id: `${seed.id}-q${index + 1}`,
      type: 'single_choice',
      knowledgePointId: knowledgePoints[question.point]?.id ?? knowledgePoints[0].id,
      prompt: question.prompt,
      options: question.options,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
      difficulty: index === 3 ? '提升' : '基础',
      sourceRef: `${sourceNote}#${seed.id}-q${index + 1}`,
    })),
  }
}

type EnglishQuestionSeed = [prompt: string, answer: string, wrong1: string, wrong2: string, wrong3: string, explanation: string, point?: number]
type EnglishLeafSeed = {
  id: string
  volume: '上册' | '下册'
  chapter: string
  section: string
  directoryUrl?: string
  evidence: string
  points: Array<[string, string]>
  questions: EnglishQuestionSeed[]
}

function makeEnglishLeaf(seed: EnglishLeafSeed): GapSeed {
  let questionIndex = 0
  return {
    id: seed.id,
    grade: '初一',
    subject: '英语',
    volume: seed.volume,
    chapter: seed.chapter,
    section: seed.section,
    directoryUrl: seed.directoryUrl ?? (seed.volume === '上册' ? english7a : english7b),
    evidence: [seed.evidence],
    points: seed.points,
    questions: seed.questions.map(([prompt, answer, wrong1, wrong2, wrong3, explanation, point]) => {
      const answerIndex = questionIndex % 4
      questionIndex += 1
      const options = [wrong1, wrong2, wrong3]
      options.splice(answerIndex, 0, answer)
      return { prompt, options, answerIndex, explanation, point: point ?? 0 }
    }),
  }
}

type CivicLeafSeed = {
  id: string
  chapter: string
  section: string
  evidence: string
  points: Array<[string, string]>
  questions: EnglishQuestionSeed[]
}

function makeCivicLeaf(seed: CivicLeafSeed): GapSeed {
  let questionIndex = 0
  return {
    id: seed.id,
    grade: '初一',
    subject: '政治',
    volume: '上册',
    chapter: seed.chapter,
    section: seed.section,
    directoryUrl: politics7a,
    evidence: [seed.evidence],
    points: seed.points,
    questions: seed.questions.map(([prompt, answer, wrong1, wrong2, wrong3, explanation, point]) => {
      const answerIndex = questionIndex % 4
      questionIndex += 1
      const options = [wrong1, wrong2, wrong3]
      options.splice(answerIndex, 0, answer)
      return { prompt, options, answerIndex, explanation, point: point ?? 0 }
    }),
  }
}

type CatalogLeafQuestion = [string, string, string, string, string, string, number]

type CatalogLeafSeed = {
  id: string
  grade: string
  subject: string
  volume: string
  chapter: string
  section: string
  directoryUrl: string
  evidence: string
  points: Array<[string, string]>
  questions: CatalogLeafQuestion[]
}

function makeCatalogLeaf(seed: CatalogLeafSeed): GapSeed {
  return {
    ...seed,
    evidence: [seed.evidence],
    questions: seed.questions.map(([prompt, answer, wrong1, wrong2, wrong3, explanation, point], index) => {
      const answerIndex = index % 4
      const options = [wrong1, wrong2, wrong3]
      options.splice(answerIndex, 0, answer)
      return { prompt, options, answerIndex, explanation, point }
    }),
  }
}

const chinese7a = 'https://jx.panqjy.cn/yw/tb_b534_t4/p12/'
const chinese7aPepRevision = 'https://www.pep.com.cn/xw/zt/hd/12/zbtjc/202410/t20241015_1995856.html'
const chinese7aPepUsage = 'https://www.pep.com.cn/xw/zt/hd/sktbjc/jcsy/202606/t20260610_2006796.html'
const chinese7b = 'https://c1.ykt.cbern.com.cn/%E5%90%88%E5%B9%B6%E7%94%B5%E5%AD%90%E6%95%99%E6%9D%90/0321/%E7%BB%9F%E7%BC%96%E7%89%88/%E5%88%9D%E4%B8%AD/%E8%AF%AD%E6%96%87/%E4%B8%83%E5%B9%B4%E7%BA%A7/%E4%B9%89%E5%8A%A1%E6%95%99%E8%82%B2%E6%95%99%E7%A7%91%E4%B9%A6%C2%B7%E8%AF%AD%E6%96%87%E4%B8%83%E5%B9%B4%E7%BA%A7%E4%B8%8B%E5%86%8C.pdf'
const chinese7bPepRevision = 'https://www.pep.com.cn/xw/zt/hd/12/zbtjc/202505/t20250507_1999894.html'
const chinese8a = 'https://jx.panqjy.cn/catalog/list?book_id=3002628'
const chinese8aPep2025 = 'https://www.pep.com.cn/rjdt/mtbd/202509/t20250908_2003471.shtml'
const chinese8b = 'https://jx.panqjy.cn/catalog/list?book_id=3002629'
const chinese8Pep = 'https://www.pep.com.cn/rjyc/kcjc/gjkc/tbjc/yw8x/'
const english7a = 'https://c1.ykt.cbern.com.cn/edu_product/esp/assets/454dfc04-1259-20fe-cfa2-108408618de7.pkg/%E6%95%99%E6%9D%90-%E4%B9%89%E5%8A%A1%E6%95%99%E8%82%B2%E6%95%99%E7%A7%91%E4%B9%A6%20%E8%8B%B1%E8%AF%AD%20%E4%B8%83%E5%B9%B4%E7%BA%A7%20%E4%B8%8A%E5%86%8C.pdf'
const english7b = 'https://jx.panqjy.cn/catalog/list?book_id=3002342'
const english7Pep = 'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202510/t20251024_2004130.html'
const english8a = 'https://jx.panqjy.cn/catalog/list?book_id=3002343'
const english8b = 'https://jx.panqjy.cn/catalog/list?book_id=3002344'
const physics8a = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=6'
const physics8b = 'https://jx.panqjy.cn/catalog/list?book_id=3002645'
const politics8a = 'https://jx.panqjy.cn/catalog/list?book_id=3002348'
const geography8a = 'https://jx.panqjy.cn/catalog/list?book_id=3002429'
const geography8b = 'https://jx.panqjy.cn/catalog/list?book_id=3002430'
const biology8a = 'https://jx.panqjy.cn/albums-30391.html'
const biology8b = 'https://jx.panqjy.cn/albums-44772.html'
const math8b = 'https://jx.panqjy.cn/album-140750.html'
const politics7a = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=9'
const politics7aPep = 'https://www.pep.com.cn/xw/zt/hd/sktbjc/bxgs/202606/t20260610_2006805.html'
const politics7aEvidence = '人教社2024年秋启用的统编七上教材说明（' + politics7aPep + '）确认本册围绕自我成长、人际与集体关系、珍爱生命和人生追求四个主题；本组按现行目录框题独立原创设问。'

const chinese7aLeafRebuilds: GapSeed[] = [
  {
    id: 'leaf-rebuild-2026-chinese-7a-u1-reading-practice', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第一单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上新教材保留六单元并调整篇目；第一单元以朗读和语言品味为重点。`, `人教社教材使用材料（${chinese7aPepUsage}）说明阅读综合实践梳理单元阅读、连接阅读与表达，并强调朗读停连、重音和词句品味。`],
    points: [['朗读与语音', '根据句意、重音、停连和语气表达文本情感。'], ['语言品味', '从词语、句式和修辞理解景物描写的表达效果。']],
    questions: [
      { prompt: '朗读一段连续写到春、夏、秋、冬景物变化的文字时，怎样处理更能表现季节递进？', options: ['按景物转换安排停连，重音落在提示季节变化的词语上', '每个词都用相同重音，完全不作停顿', '只读最后一个季节，其余内容略去', '把句末语气一律读成疑问'], answerIndex: 0, explanation: '朗读要根据语意组织停连，并突出显示顺序和层次的词语；平均用力会削弱季节变化的结构。', point: 0 },
      { prompt: '面对写景句中连续出现的几个短分句，判断停顿位置时首先应依据什么？', options: ['句意和分句结构', '每行字数必须相同', '标点越多就越快读', '个人喜欢在哪停就在哪停'], answerIndex: 0, explanation: '停连服务于理解和表达，应先辨清句意及分句关系，再确定停顿长短。', point: 0 },
      { prompt: '分析景物描写中的比喻，哪种做法最完整？', options: ['指出本体、喻体及其共同特征，并联系上下文说明效果', '只背出喻体名称', '把比喻一概解释为夸张', '只判断句子长短'], answerIndex: 0, explanation: '理解比喻需说明相似点及其语境作用，不能停留在标签识别。', point: 1 },
      { prompt: '朗读描写轻柔春雨和明亮春景的句子，哪种处理最恰当？', options: ['语速平稳舒展，结合句意突出柔和而有生机的语气', '全段用急促高声读法', '每个名词都读成重音', '不顾句意把语调压成悲愤'], answerIndex: 0, explanation: '语速、音量和语气应与景物特点及作者情感相合，不能套用单一读法。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u1-writing-observation', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第一单元（阅读）', section: '写作：热爱写作，学会观察', directoryUrl: chinese7a,
    evidence: [`人教社七上新教材使用材料（${chinese7aPepUsage}）明确指出该写作专题由“热爱生活，热爱写作”调整为“热爱写作，学会观察”，并强调多角度观察、写出感受。`],
    points: [['观察与发现', '有目的地观察熟悉事物，留意变化和细节。'], ['观察记录转化为表达', '选择真实、具体的观察材料并表达个人感受。']],
    questions: [
      { prompt: '写一次校园植物的观察记录，哪种材料最能体现“学会观察”？', options: ['记录叶片颜色、形状及几天内的变化', '只写“植物很好看”', '照抄百科词条而不看实物', '只写自己猜测它明天会开花'], answerIndex: 0, explanation: '观察写作依靠对具体特征和变化的发现，判断或套话不能替代实际观察。', point: 0 },
      { prompt: '同一处雨景，想让描写更具体，较合适的观察方式是什么？', options: ['从声音、光线、地面变化等角度持续留意', '只看一眼便立即下结论', '只写“下雨了”并重复三遍', '只记录与雨无关的新闻'], answerIndex: 0, explanation: '多角度观察能获得更具体的材料，也便于选择最有表现力的细节。', point: 0 },
      { prompt: '观察记录中既写“树叶边缘有水珠”，又写“我担心小鸟找不到干燥的地方”，后一句主要属于什么？', options: ['观察后的感受和联想', '可直接测量的叶片形状', '人物对话的原话', '客观的时间标记'], answerIndex: 0, explanation: '水珠是观察到的现象；担心小鸟则呈现观察者由现象引发的感受。', point: 1 },
      { prompt: '准备把观察材料写成短文，哪一步最有助于避免内容空泛？', options: ['先列出真实发现的细节，再选与表达重点相关的材料', '先写结论，完全不需要观察', '把所有想到的内容不加选择地堆在一起', '只使用“非常、特别、十分”等程度词'], answerIndex: 0, explanation: '从真实细节中选择材料并围绕重点组织，才能把观察转化为具体表达。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u2-reading-practice', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上新教材保持阅读、写作等板块并更新篇目；单元阅读需联系文本证据理解人物情感。`],
    points: [['叙事细节', '结合人物言行和具体细节理解亲情主题。'], ['比较阅读', '比较不同文本表现亲情的角度和表达方式。']],
    questions: [
      { prompt: '阅读写亲人之间发生分歧的叙事文，判断人物情感时最可靠的依据是什么？', options: ['人物的言行、叙述细节及其前后变化', '只凭文章标题猜测', '只看篇幅长短', '把自己的经历当作文中事实'], answerIndex: 0, explanation: '人物情感应从文本证据推断，并结合语境和变化理解。', point: 0 },
      { prompt: '比较两篇表现亲情的文章，一篇用日常对话、一篇用回忆性细节。哪种比较结论更有依据？', options: ['指出各自采用的表达方式，并联系具体内容说明效果', '只说两篇都“很感人”', '仅比较作者姓名', '认为表达方式不同就不能比较'], answerIndex: 0, explanation: '比较阅读需指出相同或不同的表达方式，并以文本内容解释其作用。', point: 1 },
      { prompt: '叙事文中反复出现的一个生活动作，可能有什么作用？', options: ['表现人物习惯或情感，并照应前后情节', '一定只是凑字数', '只能交代天气', '必然表示故事已经结束'], answerIndex: 0, explanation: '反复出现的细节可能塑造人物、寄托情感或形成照应，应结合上下文判断。', point: 0 },
      { prompt: '概括家庭生活题材文章的中心时，哪种表述通常更准确？', options: ['结合关键事件和人物关系概括文章表达的情感或认识', '把每个情节逐字复述一遍', '只列出出现过的物品', '只写“这是一个故事”'], answerIndex: 0, explanation: '概括中心要从关键事件、人物关系和情感态度中提炼共同意思。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u2-writing-narrative', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '写作：学会记事', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认写作是七上独立基础板块；本组围绕叙事要素、顺序和细节设原创练习。`],
    points: [['叙事要素', '交代时间、地点、人物、起因、经过和结果。'], ['叙事详略', '围绕重点安排事件经过和关键细节。']],
    questions: [
      { prompt: '叙述一次班级活动，哪项信息能帮助读者理解事件为什么开始？', options: ['事情的起因', '与事件无关的天气知识', '作者最喜欢的颜色', '文章使用了几段'], answerIndex: 0, explanation: '起因交代事件发生的缘由，是理解叙事发展的重要信息。', point: 0 },
      { prompt: '写一次重要比赛，哪些内容适合详写？', options: ['最能体现比赛转折和人物感受的关键过程', '出发前所有无关琐事', '每位观众的完整履历', '与比赛毫无关系的新闻'], answerIndex: 0, explanation: '详写应服务于中心，关键转折和能表现人物的细节比无关背景更重要。', point: 1 },
      { prompt: '一篇记事短文读起来前后颠倒，最应先检查什么？', options: ['事件先后顺序及时间提示是否清楚', '每个句号的大小', '题目是否写在纸张正中', '是否每段都有相同字数'], answerIndex: 0, explanation: '叙事顺序混乱通常与事件次序和时间标记不清有关。', point: 1 },
      { prompt: '写“我终于向同学道歉”这一事件，哪种细节更能表现转变？', options: ['写出犹豫、开口和对方回应中的关键动作或话语', '只写“后来事情解决了”', '添加与道歉无关的长篇景物', '重复说明“我很紧张”而不举例'], answerIndex: 0, explanation: '能表现心理变化的动作、话语和回应使叙事过程具体可信。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u2-friends-project', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '专题学习活动：有朋自远方来', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认该专题学习活动保留在七上；练习依据资料搜集、交流表达和交友主题原创编写。`],
    points: [['资料搜集与核验', '记录资料来源，区分原始资料与转述内容。'], ['主题交流', '围绕交友主题组织观点并尊重不同经验。']],
    questions: [
      { prompt: '小组制作“交友故事”展板时，哪种做法最能保证资料可靠？', options: ['核对出处，记录作者或资料来源，再用自己的话整理', '把来源不明的网络句子直接署给名人', '只凭记忆写出年代和作者', '删除所有资料来源'], answerIndex: 0, explanation: '核对并记录出处能帮助验证信息，也避免误引和张冠李戴。', point: 0 },
      { prompt: '同学对“怎样交朋友”有不同看法，主持讨论时哪种做法更合适？', options: ['先复述对方观点，再用理由回应并允许差异', '打断对方并嘲笑其经历', '只让意见相同的人发言', '把讨论变成评判同学好坏'], answerIndex: 0, explanation: '有效交流需要倾听、准确回应和尊重差异。', point: 1 },
      { prompt: '介绍一则古代交友故事时，怎样避免把故事寓意说得过头？', options: ['先概括故事事实，再说明自己从中得到的启发', '把自己的评价说成故事原文', '不交代故事来源却称其为史实', '只抄标题并直接下结论'], answerIndex: 0, explanation: '事实概述与个人理解应区分，结论要能由故事内容支持。', point: 0 },
      { prompt: '为班级交友主题分享准备发言，哪种结构最清楚？', options: ['提出主题，举例说明，最后归纳自己的观点', '连续列出互不相关的名言', '先讲结论但不提供任何依据', '全程只重复活动名称'], answerIndex: 0, explanation: '主题、例证和结论构成清晰的交流结构，便于听众理解。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u3-reading-practice', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）指出七年级阅读重点包括整体感知、品味语言、概括中心和理清思路。`],
    points: [['整体感知', '抓住事件、人物和关键语句概括文本内容。'], ['阅读策略', '依据文本类型和阅读目的选择精读、略读等方法。']],
    questions: [
      { prompt: '阅读写童年经历的文章，想把握全文脉络，哪种做法更有效？', options: ['标出主要事件及其先后，留意人物认识的变化', '只统计生僻字数量', '跳过所有人物活动直接猜主题', '只读最后一句'], answerIndex: 0, explanation: '事件线索和人物变化能帮助读者整体感知文章结构与内容。', point: 0 },
      { prompt: '分析一句富有表现力的描写，哪种解释更完整？', options: ['结合上下文说明关键词语带来的形象或情感效果', '只说“用了修辞”便结束', '只解释标点名称', '把个人联想当成作者明说的事实'], answerIndex: 0, explanation: '品味语言需要联系语境，说明具体词句怎样形成表达效果。', point: 1 },
      { prompt: '概括一篇有多个生活片段的文章，最适合先做什么？', options: ['区分主要事件与补充片段，再概括共同指向', '把每句话逐字抄写', '删去人物和事件，只写文章很长', '仅凭作者年龄确定中心'], answerIndex: 0, explanation: '区分主次并归纳片段间的联系，有助于把握全文中心。', point: 0 },
      { prompt: '阅读文言短章和现代回忆散文时，哪种阅读安排更合理？', options: ['先通读了解大意，再对难词句或关键细节精读', '两类文本都只看标题', '文言文不需要理解语句', '现代文只能逐字查词典'], answerIndex: 0, explanation: '先整体把握、再对关键处深入阅读，能兼顾理解效率与准确性。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u3-writing-center', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读）', section: '写作：如何突出中心', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七年级写作独立设置，并以写作技能训练为目标。`],
    points: [['确定中心', '用一句明确的话概括文章主要表达的认识或感受。'], ['材料取舍', '围绕中心选择材料，安排详略并处理照应。']],
    questions: [
      { prompt: '题目要求写“让我难忘的一次帮助”，哪项材料最能突出中心？', options: ['重点写帮助发生时的具体困难、行动和自己的感受', '详写与帮助无关的旅游经历', '罗列所有认识的人', '只写事情发生的日期'], answerIndex: 0, explanation: '所选材料应紧扣“帮助”及其带来的影响，关键过程适合详写。', point: 1 },
      { prompt: '写作前已经确定中心是“坚持能帮助我克服困难”，哪种安排更恰当？', options: ['选择一次能体现坚持和变化的经历作为主线', '加入所有发生过的趣事，不作筛选', '每段表达相反的中心', '只写结尾口号'], answerIndex: 0, explanation: '明确中心后，应选取能支持中心的主要经历并保持内容一致。', point: 0 },
      { prompt: '文章中心不够突出，修改时最应该优先检查什么？', options: ['材料是否围绕中心，详略是否突出关键内容', '字体颜色是否每段不同', '是否增加更多无关事件', '标点是否全部改成逗号'], answerIndex: 0, explanation: '中心依靠材料和详略安排呈现，修改应先处理内容组织。', point: 1 },
      { prompt: '结尾怎样与文章中心形成照应而不显得生硬？', options: ['回扣关键经历，写出由经历引出的真实认识', '原样重复题目三遍', '突然加入另一件无关的事', '使用与正文相反的态度'], answerIndex: 0, explanation: '结尾通过回扣经历、深化认识来呼应中心，比机械重复更自然。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u3-reading-classic', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读）', section: '整本书阅读：《朝花夕拾》——精读、略读、浏览', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上整本书阅读书目包括《朝花夕拾》，并将整本书阅读纳入正式教学内容。`],
    points: [['整本书阅读', '把握作品基本内容、作者经验与篇章联系。'], ['阅读方法选择', '依据阅读目的在精读、略读和浏览之间切换。']],
    questions: [
      { prompt: '《朝花夕拾》的作者是谁？', options: ['鲁迅', '朱自清', '老舍', '冰心'], answerIndex: 0, explanation: '《朝花夕拾》是鲁迅的回忆性散文集。', point: 0 },
      { prompt: '阅读《朝花夕拾》中的一篇重点文章，想理解某个关键细节的表达作用，宜采用哪种方法？', options: ['精读相关段落，联系上下文作批注', '只浏览目录后直接下结论', '只看插图不读文字', '跳读所有关键段落'], answerIndex: 0, explanation: '分析细节需要精读文本并联系语境，批注可以记录疑问和发现。', point: 1 },
      { prompt: '想先了解整本《朝花夕拾》大致收录哪些内容，哪种方法更合适？', options: ['浏览目录、序跋和各篇标题，建立整体印象', '逐字抄写全书', '只精读最后一页', '仅查看书的页数'], answerIndex: 0, explanation: '浏览适合快速了解全书结构和主题范围，之后再选择篇章深入阅读。', point: 1 },
      { prompt: '制作读书卡片时，哪种记录最便于之后核对和交流？', options: ['记下篇名、关键内容、页码或位置及自己的疑问', '只写“很好看”', '把个人猜测标成书中原句', '不区分原文摘录与个人感想'], answerIndex: 0, explanation: '明确出处并区分摘录和感想，能让读书记录可查、可交流。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u3-poetry-recitation', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读）', section: '课外古诗词诵读：峨眉山月歌 / 李白；江南逢李龟年 / 杜甫；行军九日思长安故园 / 岑参；夜上受降城闻笛 / 李益', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上课外古诗词诵读仍为正式教材板块；诗题、作者按现行目录逐项对应。`],
    points: [['诗题与作者', '准确对应四首诗的题目和作者。'], ['意象与情感', '结合题目、时令和处境理解思乡、怀旧等情感。']],
    questions: [
      { prompt: '《峨眉山月歌》的作者是谁？', options: ['李白', '杜甫', '岑参', '李益'], answerIndex: 0, explanation: '现行目录将《峨眉山月歌》列于李白名下。', point: 0 },
      { prompt: '《江南逢李龟年》追忆昔日相逢，又写今日重逢，主要寄托了什么感受？', options: ['对时世变迁和个人漂泊的感慨', '对田园丰收的喜悦', '对边塞新城的赞美', '对登山比赛的兴奋'], answerIndex: 0, explanation: '诗中今昔相对，表达了经历世事变迁后的感慨与漂泊之情。', point: 1 },
      { prompt: '岑参《行军九日思长安故园》题目中的“九日”通常指哪个节日？', options: ['重阳节', '端午节', '中秋节', '元宵节'], answerIndex: 0, explanation: '农历九月初九为重阳节；诗题还交代了行军在外、思念故园的处境。', point: 0 },
      { prompt: '《夜上受降城闻笛》中，夜间闻笛这一情境最容易引发哪种情感联想？', options: ['边地将士的思乡之情', '新婚宴饮的欢快', '春耕丰收的自豪', '山林隐居的轻松'], answerIndex: 0, explanation: '诗歌借边地夜景和笛声表现戍边者的乡思。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u4-reading-practice', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）说明阅读单元通过文本、语文要素和写作建立联系；本组围绕人物品质与文本证据原创命题。`],
    points: [['人物形象', '从具体言行和关键细节概括人物品质。'], ['文本证据', '用准确的事件或语句支持阅读判断。']],
    questions: [
      { prompt: '阅读多篇写人物的文章后概括人物品质，哪种做法最可靠？', options: ['分别找出能表现品质的具体言行，再归纳共同点', '只凭人物职业判断性格', '只看作者姓名推测主题', '把赞美词越多的答案当作越准确'], answerIndex: 0, explanation: '人物评价应有文本依据，再由具体表现归纳品质。', point: 0 },
      { prompt: '比较纪实叙事和诗歌中的人物形象，哪项比较维度更有效？', options: ['人物处境、表达方式及其呈现出的精神特点', '只比较两篇字数', '只比较标题是否有标点', '只统计人物出现次数'], answerIndex: 0, explanation: '内容、处境和表达方式共同影响人物形象的呈现。', point: 1 },
      { prompt: '回答“作者如何表现人物的选择”时，哪种答案更有说服力？', options: ['指出关键行动或语言，并解释它与选择之间的联系', '只写“作者写得很好”', '复述与问题无关的背景', '只给出人物姓名'], answerIndex: 0, explanation: '用具体证据解释人物选择，才能回应问题并形成论证。', point: 1 },
      { prompt: '整理一个单元中不同体裁的文本，哪种方式更便于复习？', options: ['按人物、事件和表达方式建立联系，同时注明各文体特点', '将所有文本内容混成一段', '只背每篇第一句话', '把不同作者的经历当成同一件事'], answerIndex: 0, explanation: '建立主题联系的同时保留文体和篇目差异，能避免混淆。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u4-writing-structure', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读）', section: '写作：思路要清晰', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认写作板块按单元独立设置；本组考查材料排序、段落组织和过渡。`],
    points: [['组织思路', '依据时间、空间或逻辑关系安排内容顺序。'], ['段落衔接', '用照应和过渡帮助读者理解层次。']],
    questions: [
      { prompt: '写“第一次独自乘车”的经历，按什么顺序通常最清楚？', options: ['准备、乘车过程、到达后的结果', '先写结果，再写原因，最后删除经过', '按想到什么就插入什么的顺序', '按字数从少到多排列事件'], answerIndex: 0, explanation: '按事件发展顺序组织材料，读者容易理解经历的起因、经过和结果。', point: 0 },
      { prompt: '说明怎样制作一件手工作品，采用哪种结构最便于读者跟做？', options: ['按步骤先后说明，并用序数词或连接语标明次序', '先写结论，中间步骤随机排列', '只列材料名称，不写操作顺序', '把注意事项藏在无关段落中'], answerIndex: 0, explanation: '操作类说明依步骤展开，并用明确衔接语标序，便于读者执行。', point: 0 },
      { prompt: '文章从“准备”转到“比赛开始”，哪种句子能帮助自然衔接？', options: ['“第二天清晨，比赛终于开始了。”', '突然插入一段与比赛无关的食谱', '重复上一段的最后一个词十次', '不分段且删去所有时间提示'], answerIndex: 0, explanation: '清楚的时间提示能标明情节推进，让段落之间形成自然过渡。', point: 1 },
      { prompt: '完成初稿后发现读者不清楚事情先后，最合适的修改方法是什么？', options: ['调整段落顺序，并补充必要的时间或转折提示', '只把标题加粗', '增加与中心无关的描写', '删掉所有表示顺序的词'], answerIndex: 0, explanation: '理清顺序并补足提示，比只改形式更能解决思路不清的问题。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u4-reading-project', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读）', section: '专题学习活动：少年正是读书时', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认“少年正是读书时”保留为七上专题学习活动；本组围绕阅读计划、调查和资料表达命题。`],
    points: [['阅读计划', '根据阅读目标和可用时间安排可执行的阅读任务。'], ['调查与表达', '准确呈现调查结果，不把样本结论扩大为普遍事实。']],
    questions: [
      { prompt: '小组调查班级同学的阅读习惯，哪种报告表述最严谨？', options: ['说明调查对象、人数和统计结果，再限定结论范围', '把少数同学的回答说成全校情况', '不说明调查方法便断言所有人都如此', '只展示一个个例并称为普遍规律'], answerIndex: 0, explanation: '调查结论应与样本和方法相匹配，需交代调查范围并避免过度推广。', point: 1 },
      { prompt: '制定一个月的阅读计划，哪项安排更可执行？', options: ['明确书目、每周进度和记录方式，并预留调整时间', '只写“每天读很多书”', '要求一天读完整套丛书', '不设目标也不记录进度'], answerIndex: 0, explanation: '计划应具体、可检查，同时留有调整空间。', point: 0 },
      { prompt: '汇报调查图表时，怎样避免误读数据？', options: ['先说明图表的类别和数量，再比较差异', '只凭颜色深浅猜测结论', '忽略坐标刻度', '把百分数和人数直接当成同一单位'], answerIndex: 0, explanation: '读图需看清类别、单位、刻度和统计数量，再进行比较。', point: 1 },
      { prompt: '读书交流中介绍一本书，哪种内容最能帮助同学决定是否阅读？', options: ['简要介绍主题、阅读感受和适合关注的内容，不剧透关键结局', '只报书名和页数', '把结局全部讲完', '只评价封面颜色'], answerIndex: 0, explanation: '主题和真实阅读体验能提供有效信息，避免剧透则保留阅读兴趣。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u5-task2-observe-animals', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第五单元（活动·探究）', section: '任务二 亲近动物，丰富生命体验', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）明确第五单元任务二要求选择动物观察记录、总结观察所得，并养成亲近自然、尊重生命的意识。`],
    points: [['观察记录', '持续记录动物的可见行为和环境，不以猜测代替事实。'], ['尊重生命', '以不伤害动物、不破坏栖息环境为前提开展观察。']],
    questions: [
      { prompt: '观察校园中的鸟类并做记录，哪种方式符合尊重生命的原则？', options: ['保持适当距离，记录自然状态下的行为', '捕捉鸟类带回教室观察', '反复追赶它以获得更多动作', '拆毁巢穴检查内部'], answerIndex: 0, explanation: '教材任务强调观察与亲近自然，应以不干扰、不伤害动物为前提。', point: 1 },
      { prompt: '连续观察同一只小动物，哪种记录更便于比较变化？', options: ['注明日期、环境和实际看到的行为', '只写“它今天心情不好”', '把不同动物的行为混在一起', '省略观察时间和地点'], answerIndex: 0, explanation: '时间、环境和可观察行为是比较记录的基础；“心情不好”属于未经证实的判断。', point: 0 },
      { prompt: '记录“蜗牛移动了约几厘米”，怎样提高记录的可核验性？', options: ['说明观察时长和测量方法，并把估测标明为估测', '不记录单位，也不说明时间', '把推测写成精确实验数据', '只写“移动很多”'], answerIndex: 0, explanation: '方法、时间和单位能让观察数据更清楚；估测不应伪装成精确测量。', point: 0 },
      { prompt: '观察中发现动物躲藏起来，哪种处理更符合科学观察？', options: ['停止靠近，记录其反应并减少干扰', '继续触碰直到它不再躲避', '把躲藏解释成它喜欢被触摸', '改变环境迫使它活动'], answerIndex: 0, explanation: '动物躲藏可能是对干扰的反应，应减少干预并如实记录。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u5-task3-animal-narrative', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第五单元（活动·探究）', section: '任务三 记叙与动物的相处', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）明确任务三要求学习课文写法，记叙与动物相处的故事，以细节表现对象特点并表达态度。`],
    points: [['叙写动物相处经历', '围绕真实经历选取关键事件和细节。'], ['表达情感态度', '通过观察和行动呈现对动物的理解与尊重。']],
    questions: [
      { prompt: '写自己与动物相处的一件事，哪项材料最适合放在中心位置？', options: ['能体现相处过程和彼此变化的关键事件', '与动物无关的购物清单', '所有家庭成员的身高', '文章写作时的天气预报'], answerIndex: 0, explanation: '关键事件直接支撑叙事中心，其他无关信息应删减或略写。', point: 0 },
      { prompt: '想表现小狗听到熟悉脚步声后的反应，哪种细节最具体？', options: ['记录它竖耳、转身和跑到门边等可观察动作', '只写“它很开心”', '写作者猜测它想到了什么', '只写“这件事很好”'], answerIndex: 0, explanation: '可观察的动作细节能支撑情感判断，比直接贴标签更具体。', point: 1 },
      { prompt: '叙写与动物相处的故事，哪种结尾更能自然表达态度？', options: ['回到关键经历，写出自己由此形成的真实认识', '突然转写无关的旅行计划', '把同一句口号重复多次', '结尾否定全文经历'], answerIndex: 0, explanation: '结尾从经历中提炼认识，能自然呈现作者对动物和生命的态度。', point: 1 },
      { prompt: '为了让动物形象可信，写作时最应避免什么？', options: ['把没有观察到的行为或心理写成确定事实', '选择有代表性的动作细节', '交代相处的环境和过程', '区分观察事实与个人感受'], answerIndex: 0, explanation: '真实叙写要区分可观察事实和想象、感受，避免把猜测冒充事实。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u6-reading-practice', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）指出新教材通过阅读综合实践梳理单元阅读并连接语言运用；本组结合神话、童话和寓言阅读任务原创编写。`],
    points: [['想象性文本阅读', '区分现实依据、想象情节和文本主题。'], ['寓意理解', '结合人物言行和情节转折归纳寓意。']],
    questions: [
      { prompt: '阅读神话故事时，哪种判断方法最合适？', options: ['先辨认想象情节，再结合人物行动理解作品表达的愿望或主题', '把神话情节当作现代科学报告', '只统计人物出现次数', '忽略故事结尾'], answerIndex: 0, explanation: '神话有想象性，应在理解情节特点的基础上分析其文化想象和主题。', point: 0 },
      { prompt: '读寓言后概括寓意，哪种做法最有依据？', options: ['结合人物选择、情节结果和关键对比来归纳', '只凭题目猜一个道理', '把寓意说成与故事无关的口号', '只复述故事中的天气'], answerIndex: 0, explanation: '寓意通常由人物行为和结果共同呈现，概括时需联系关键情节。', point: 1 },
      { prompt: '比较童话与寓言，哪项说法较准确？', options: ['都可能运用想象，但寓言常借简短故事寄托劝诫或启示', '两者都必须是新闻纪实', '寓言不能出现动物', '童话只能用诗歌写成'], answerIndex: 0, explanation: '两类作品都可采用想象，寓言通常具有较鲜明的讽喻或启示意味。', point: 0 },
      { prompt: '同一故事中人物前后态度发生变化，分析变化时最应关注什么？', options: ['促使人物改变的事件、认识或新信息', '每一段的字数是否相等', '作者的出生年份', '书页的颜色'], answerIndex: 0, explanation: '人物变化往往由情节事件或认识变化推动，需联系前后情节判断。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u6-writing-association-imagination', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读）', section: '写作：发挥联想和想象', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上写作板块围绕语文能力设置；本组区分联想、想象并训练有依据的表达。`],
    points: [['联想与想象', '区分由相关事物引发的联想和对新情境的创造性想象。'], ['想象表达', '以现实经验为基础展开合理、连贯的想象。']],
    questions: [
      { prompt: '看到窗边一滴水珠，想到清晨的露珠，这主要属于什么？', options: ['由相似事物引发的联想', '与原事物完全无关的统计', '对事件顺序的复述', '人物对话的转述'], answerIndex: 0, explanation: '水珠与露珠形态相似，由此产生联系属于联想。', point: 0 },
      { prompt: '以“如果月亮能给地球写信”为题创作故事，主要运用了什么？', options: ['在现实知识基础上创造新情境的想象', '照抄观察记录', '按时间顺序复述新闻', '只替换几个近义词'], answerIndex: 0, explanation: '把月亮设定为写信者并创设情节，是基于现实经验展开的想象。', point: 0 },
      { prompt: '怎样让想象故事更连贯可信？', options: ['设定清楚的情境和规则，并让人物行动与情节发展相互照应', '每段突然换一套规则', '让结局与前文完全无关', '只增加奇怪名词而不交代联系'], answerIndex: 0, explanation: '想象可以奇特，但情境、规则和情节应保持基本连贯。', point: 1 },
      { prompt: '由“老旧车站”联想到“等待与告别”，怎样把联想写得更具体？', options: ['补写与车站相关的声音、人物动作或生活经历作为联系依据', '只写“我有联想”', '列出互不相关的词语', '把联想说成车站真实发生的历史'], answerIndex: 0, explanation: '具体感官细节或经历能呈现联想的触发点，避免无依据跳转。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u6-reading-classic', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读）', section: '整本书阅读：《西游记》', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认《西游记》为七上整本书阅读书目，并说明每册推荐整本书阅读。`],
    points: [['古典小说阅读', '识别主要人物、事件和反复出现的情节线索。'], ['阅读记录', '用章节位置和事件依据整理人物经历。']],
    questions: [
      { prompt: '《西游记》的作者通常署名为谁？', options: ['吴承恩', '罗贯中', '施耐庵', '曹雪芹'], answerIndex: 0, explanation: '《西游记》是中国古典长篇小说，通常署名吴承恩。', point: 0 },
      { prompt: '整理孙悟空在全书中的经历，哪种记录方式最清楚？', options: ['按章节顺序记录关键事件及人物关系变化', '只记录每章页数', '将不同人物的经历合成一条', '仅写结尾而不记过程'], answerIndex: 0, explanation: '按章节和事件顺序整理，能把握人物经历与情节推进。', point: 1 },
      { prompt: '阅读长篇小说时发现多个故事反复出现相似考验，这种重复可能有什么作用？', options: ['推动人物成长并形成全书的结构节奏', '说明每章都可以删掉', '只能用来填充页数', '证明人物关系从未变化'], answerIndex: 0, explanation: '重复的考验可形成结构节奏，也能呈现人物在经历中的变化。', point: 1 },
      { prompt: '讨论《西游记》人物形象时，哪种观点更有文本依据？', options: ['引用具体事件说明人物特点，并注意其前后变化', '只凭影视改编判断书中人物', '只用一个形容词概括全书', '把自己的想象当作原著情节'], answerIndex: 0, explanation: '人物分析需要回到原著中的具体事件，并关注人物行为和变化。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7a-u6-poetry-recitation', grade: '初一', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读）', section: '课外古诗词诵读：秋词（其一）/ 刘禹锡；夜雨寄北 / 李商隐；十一月四日风雨大作（其二）/ 陆游；潼关 / 谭嗣同', directoryUrl: chinese7a,
    evidence: [`人教社修订说明（${chinese7aPepRevision}）确认七上课外古诗词诵读为教材组成板块；四首诗的作者、篇名按现行目录核对。`],
    points: [['诗题与作者', '准确辨认四首诗的作者及基本内容。'], ['意象与情感', '联系秋景、夜雨、风雨和关隘意象理解诗歌情感。']],
    questions: [
      { prompt: '刘禹锡《秋词》（其一）对秋天的态度有什么鲜明特点？', options: ['一反常见悲秋，表现开阔昂扬的情感', '只写丰收后的忧愁', '把秋天写成无法出门的灾难', '完全不涉及秋景'], answerIndex: 0, explanation: '《秋词》（其一）以开阔昂扬的笔调赞美秋景，突破传统悲秋情绪。', point: 1 },
      { prompt: '李商隐《夜雨寄北》题目中的“寄北”提示了什么？', options: ['诗人写信寄给远方的人，表达思念与盼望相聚', '诗人正在北方举行宴会', '诗人记录北方地理测量', '诗人描写一次登山比赛'], answerIndex: 0, explanation: '题目显示写信对象远在北方，诗中夜雨情境与盼望相聚相连。', point: 0 },
      { prompt: '陆游《十一月四日风雨大作》（其二）中的风雨和“铁马冰河”想象主要表现什么？', options: ['年老多病仍心系抗敌报国的志愿', '对游山玩水的向往', '对丰收宴席的留恋', '对邻里争执的厌烦'], answerIndex: 0, explanation: '诗人借梦境想象驰骋疆场，表现虽年老仍不忘报国的情怀。', point: 1 },
      { prompt: '谭嗣同《潼关》中的“潼关”意象与诗歌整体气势相联系，最能体现哪种情怀？', options: ['冲破束缚、追求变革的豪迈气概', '对安静田园生活的满足', '对旧日宴游的怀念', '对考试失利的沮丧'], answerIndex: 0, explanation: '诗中风、山和关隘构成奔放有力的意象，表达追求冲决束缚的气势。', point: 1 },
    ],
  },
]

const chinese7bLeafRebuilds: GapSeed[] = [
  {
    id: 'leaf-rebuild-2026-chinese-7b-u1-reading-practice', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第一单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7b,
    evidence: ['人教社2024年版七下修订说明（' + chinese7bPepRevision + '）确认该册于2025年春季学期启用，并强调单元阅读与实践活动贯通；本组围绕人物阅读主题原创命题。'],
    points: [['人物阅读与文本证据', '联系传记、叙事和文言文本中的材料理解人物品质。'], ['比较阅读与表达', '比较不同文体的表现方式，并将发现转化为有依据的表达。']],
    questions: [
      { prompt: '阅读写人文章时，要说明人物严谨负责，哪种做法最有说服力？', options: ['引用文中具体行动并解释它如何体现这一特点', '只重复人物很严谨这一评价', '只列人物的职务和称号', '用与人物无关的逸闻替代课文细节'], answerIndex: 0, explanation: '人物评价应由文本中的言行细节支撑，并说明证据与判断之间的联系。', point: 0 },
      { prompt: '把传记叙事与文言故事放在一起阅读，最适合比较什么？', options: ['两种文体如何选择材料、安排叙述来表现人物', '两篇文章的标点是否完全相同', '哪一篇可以不看文本只背结论', '人物姓名的字数长短'], answerIndex: 0, explanation: '比较阅读关注文体特点和表达方式，不能脱离文本只作形式统计。', point: 1 },
      { prompt: '概括一个人物的精神品质时，下面哪种答案更完整？', options: ['先概括品质，再用一件典型事例说明', '只写伟大、优秀、值得学习', '把故事情节抄一遍但不作概括', '只用个人好恶给人物贴标签'], answerIndex: 0, explanation: '概括加典型事例既简明，又能让结论有据可依。', point: 0 },
      { prompt: '小组交流人物阅读成果，哪种发言结构更清楚？', options: ['提出判断—呈现文本依据—解释依据怎样支持判断', '先下结论，再不断重复结论', '只介绍作者生平，不提文章内容', '罗列感想但不说明对应文本'], answerIndex: 0, explanation: '清楚的交流需要观点、文本证据和推理说明形成完整链条。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u1-writing-character', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第一单元（阅读）', section: '写作：写出人物特点', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认本册写作训练与单元内容整合；本组围绕人物特点、典型材料和细节表达原创命题。'],
    points: [['典型材料选择', '选择最能表现人物特点的真实事件和言行。'], ['细节与人物形象', '用代表性的动作、语言和神态呈现人物，而非堆砌标签。']],
    questions: [
      { prompt: '要写一位做事有条理的同学，哪件事最适合作为主要材料？', options: ['他每次实验前按步骤检查器材并记录结果', '他有一支蓝色水笔', '他周末看过一场电影', '他喜欢吃面条'], answerIndex: 0, explanation: '材料要与人物特点紧密相关，能够直接支撑做事有条理的判断。', point: 0 },
      { prompt: '下面哪句话更能通过细节表现人物认真？', options: ['她把表格逐项核对，发现一处数字不符后重新查了原始记录', '她是一个十分认真的人', '她认真极了，认真得不得了', '她很认真，大家都知道'], answerIndex: 0, explanation: '具体行动展示认真如何发生，比抽象重复评价更有表现力。', point: 1 },
      { prompt: '写人物时，怎样安排材料更容易突出中心？', options: ['围绕一个主要特点选取一两件典型事例', '把从出生到现在的所有事情都写进去', '每段换一个互不相关的特点', '只写外貌，不写言行和经历'], answerIndex: 0, explanation: '围绕中心取舍材料，能避免文章散乱并突出人物特点。', point: 0 },
      { prompt: '初稿里连续写了很多外貌词，却看不出人物性格。修改时最应补充什么？', options: ['能体现性格的言行和事情经过', '更多无关的颜色和衣物名称', '重复出现的形容词', '作者对人物的空泛赞美'], answerIndex: 0, explanation: '人物特点主要通过具体言行和经历呈现，单纯外貌罗列难以完成刻画。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u2-reading-practice', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第二单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）说明教材依据单元主题优化选文组合；本组围绕革命历史题材、诗歌和叙事作品的比较阅读原创命题。'],
    points: [['主题与文本证据', '从语句、场景和人物行动中理解家国情怀与历史记忆。'], ['文体比较', '比较诗歌、叙事作品和古代叙事文本的表达方式。']],
    questions: [
      { prompt: '阅读表现革命经历的作品，概括人物精神时最应关注什么？', options: ['人物在具体处境中的选择、行动及其文本依据', '只看作品标题就判断全部内容', '只记作者出生年份', '把所有人物都概括成完全相同的形象'], answerIndex: 0, explanation: '人物精神应结合历史处境和具体行动理解，并由文本细节支撑。', point: 0 },
      { prompt: '比较诗歌与叙事散文表达情感的方式，哪项更恰当？', options: ['诗歌常借凝练语言和意象抒情，叙事散文常借事件与细节呈现情感', '诗歌只能讲故事，散文只能押韵', '两类作品都不需要关注语言', '只比较篇幅长短即可得出结论'], answerIndex: 0, explanation: '不同文体有不同的表达特点，比较时应联系语言、意象和叙事材料。', point: 1 },
      { prompt: '阅读描写离乡情感的文字，哪种理解步骤更可靠？', options: ['找出相关意象和语句，再结合语境解释情感', '只凭自己的生活经历替代文本', '先确定唯一情绪，再删去不符合的语句', '只数作品中感叹号的数量'], answerIndex: 0, explanation: '情感判断需要语句和语境共同支撑，不能只凭印象或形式特征。', point: 0 },
      { prompt: '同学把一首诗改写成叙事短文后，最适合比较哪一点？', options: ['改写时哪些凝练意象被展开，情感表达发生了什么变化', '两种文本的字数是否相等', '原诗和改写是否使用完全相同的标点', '改写后是否删除了所有形容词'], answerIndex: 0, explanation: '改写比较应观察文体转换对材料展开和情感表达的影响。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u2-writing-lyricism', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第二单元（阅读）', section: '写作：学习抒情', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认本册单元阅读与写作训练整合；本组考查真情实感、借景抒情和语言选择，题目为原创。'],
    points: [['真情实感', '由真实经历和具体感受出发，避免空洞口号。'], ['直接与间接抒情', '根据表达需要选择叙述、议论、景物描写等方式传达感情。']],
    questions: [
      { prompt: '写一次离别经历，哪种表达最容易让情感显得真实？', options: ['写清当时的具体场景、自己的感受和触发感受的细节', '连续写许多我非常感动却不交代原因', '套用与经历无关的名言', '把情绪夸大到与事实不符'], answerIndex: 0, explanation: '具体经历和细节能让情感有依托，避免只有空泛的情绪词。', point: 0 },
      { prompt: '窗外梧桐叶慢慢落下，我把没说出口的话折进信里，主要采用了哪种抒情方式？', options: ['借助景物和动作含蓄表达情感', '直接列举科学数据', '完全不含情感的客观说明', '只靠议论推导结论'], answerIndex: 0, explanation: '景物和动作承载了未直说的情绪，属于含蓄表达。', point: 1 },
      { prompt: '修改家乡真美，我爱家乡这句话，哪种做法最能增强感染力？', options: ['补写一个亲历的家乡场景及它带给自己的感受', '把美连续重复五次', '再添加几句空泛的赞美', '删去所有具体名词'], answerIndex: 0, explanation: '具体场景能呈现家乡特点，也使情感表达更可信。', point: 0 },
      { prompt: '一篇文章既要叙事又要抒情，怎样安排更自然？', options: ['让情感从事件和细节中生发，在关键处适度点明', '每叙述一句就插入一句感叹', '开头写结论后不再联系事情', '把所有抒情句集中堆在结尾'], answerIndex: 0, explanation: '抒情与事件相互照应，情感才会自然并与内容统一。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u2-activity-language-life', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第二单元（阅读）', section: '专题学习活动：我的语文生活', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认本册综合性学习内容经过改造；本组依据专题调查、资料核验和交流表达要求原创命题。'],
    points: [['生活中的语文调查', '从校园和家庭生活发现语言文字现象，设计可回答的问题。'], ['资料整理与交流', '核对来源、归类材料，并用清楚的结构呈现发现。']],
    questions: [
      { prompt: '调查校园标语中的用字情况，哪种调查问题最清楚、便于统计？', options: ['在指定区域抽查多少条标语，其中发现几处用字问题？', '你觉得校园里的字怎么样？', '大家是不是都很喜欢语文？', '校园里所有事情哪个最好？'], answerIndex: 0, explanation: '范围明确、结果可记录的问题便于收集和统计材料。', point: 0 },
      { prompt: '小组发现一处疑似用字错误，下一步怎样处理最稳妥？', options: ['查阅规范工具书或权威资料，核对语境后再记录', '马上拍照发布并断定对方错误', '只凭同学印象决定正误', '为使结论醒目而修改照片内容'], answerIndex: 0, explanation: '调查结论要经过可靠来源核验，并保留真实语境。', point: 1 },
      { prompt: '汇报调查结果时，哪种材料组织方式最容易让听众理解？', options: ['先说明调查范围和方法，再展示分类结果与例子', '只展示一张没有说明的照片', '先给出结论但不说如何调查', '按成员姓名随机排列所有素材'], answerIndex: 0, explanation: '交代范围、方法、结果和例证，能使调查过程与结论清楚可查。', point: 1 },
      { prompt: '采访家人了解家中常用语词的来历，哪种做法更合适？', options: ['事先说明主题、认真记录并在引用前核对原意', '未经同意公开家人的私人信息', '只记录符合预设结论的话', '把口述内容改写成完全不同的意思'], answerIndex: 0, explanation: '采访应尊重受访者，准确记录并忠实呈现口述信息。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u3-reading-practice', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认第三单元调整选文并强化内容整合；本组围绕叙事文本中的普通人物、细节和主题原创命题。'],
    points: [['叙事与人物理解', '从人物言行、叙述视角和事件变化中理解形象。'], ['细节与主题', '分析细节如何表现人物关系、生活处境和作品主题。']],
    questions: [
      { prompt: '阅读写普通人生活的作品，哪种方法更有助于理解人物形象？', options: ['联系具体事件、言行细节和人物所处环境综合判断', '只按人物身份作出固定评价', '只看文章最后一句', '用现实中同名人物的经历替代文本'], answerIndex: 0, explanation: '人物形象由言行、事件和环境共同呈现，应综合文本证据理解。', point: 0 },
      { prompt: '叙述者反复写一个人物帮助他人的小动作，这些细节可能有什么作用？', options: ['让人物特点和人与人之间的温情更具体', '只为增加字数，与主题必然无关', '证明文章改成了说明文', '让读者不必关注其他情节'], answerIndex: 0, explanation: '细节能具体呈现人物特点，也能帮助读者理解作品情感和主题。', point: 1 },
      { prompt: '概括一篇叙事作品的中心内容，哪种表述更合适？', options: ['用简洁语言交代主要人物、关键事件及其意义', '把每个段落都逐字复述', '只列出出现过的地名', '用一个与情节无关的道理替代内容'], answerIndex: 0, explanation: '内容概括应保留关键人物、事件和意义，做到简明而准确。', point: 0 },
      { prompt: '比较同一人物在故事开头和结尾的表现，最应关注什么？', options: ['经历了哪些事件、发生了怎样的变化以及变化依据', '两处文字是否用了相同数量的句号', '人物姓名出现了几次', '哪一处段落更长'], answerIndex: 0, explanation: '人物变化要联系事件发展和文本细节分析，不能只看形式数量。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u3-writing-detail', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读）', section: '写作：抓住细节', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）强调单元阅读与表达能力贯通；本组依据人物描写、细节选择和中心表达要求原创命题。'],
    points: [['细节选择', '选择真实、典型且与中心相关的动作、语言、神态或环境细节。'], ['细节表达效果', '用准确描写呈现人物状态，避免无关铺陈和失真夸饰。']],
    questions: [
      { prompt: '想表现同学比赛失利后仍然坚韧，哪处细节最有效？', options: ['他擦去汗水，重新摆好器材，又开始练习', '他穿着一双白色运动鞋', '操场旁有一棵树', '作者说他是最坚强的人'], answerIndex: 0, explanation: '重新练习的动作与坚韧这一中心直接相关，能让读者自行感受人物特点。', point: 0 },
      { prompt: '描写人物说话时，哪种写法更可能形成有效细节？', options: ['写出关键话语并结合语气或当时情境', '全文重复他说了很多话', '只写人物的身高和鞋码', '用与场景无关的长篇对话填满篇幅'], answerIndex: 0, explanation: '关键话语与情境结合，能呈现人物态度并推动读者理解。', point: 1 },
      { prompt: '一段动作描写很长，却与文章中心关系不大。修改时应怎样处理？', options: ['删减无关动作，保留最能表现中心的关键细节', '再添更多动作使段落更长', '把中心句删掉以掩盖偏题', '将动作顺序随机打乱'], answerIndex: 0, explanation: '细节要服务中心，取舍和压缩比单纯增加描写更有效。', point: 0 },
      { prompt: '写作中怎样避免细节描写显得虚假？', options: ['依据真实观察和合理情境，准确写出人物当时的表现', '为了感人而添加不可能发生的行为', '把每个细节都写得极端夸张', '只用抽象评价代替观察'], answerIndex: 0, explanation: '细节应来自真实观察或合理情境，不能为追求效果而失真。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u3-wholebook-xiangzi', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读）', section: '整本书阅读：《骆驼祥子》——圈点、批注、做笔记', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认《骆驼祥子》为本册整本书阅读内容；本组围绕持续阅读、圈点批注和人物变化原创命题。'],
    points: [['圈点批注', '围绕疑问、人物言行、关键语句和结构变化作有依据的阅读标记。'], ['人物与主题', '联系祥子的经历变化和社会环境理解人物及作品主题。']],
    questions: [
      { prompt: '阅读《骆驼祥子》时，哪条批注最能帮助后续分析人物？', options: ['记录祥子一次重要选择，并追问它与前后经历有何联系', '只在每页画相同长度的线', '把不理解的内容跳过且不留标记', '只抄页码而不写阅读想法'], answerIndex: 0, explanation: '围绕关键选择提出问题并联系前后情节，能支持持续的整本书阅读。', point: 0 },
      { prompt: '讨论祥子形象的变化，哪种论证方式更可靠？', options: ['用不同阶段的具体言行和遭遇作比较', '只用一句他变了作为结论', '只依据影视改编版本', '把人物变化归因于单一偶然事件而不查文本'], answerIndex: 0, explanation: '人物变化需要跨阶段比较文本证据，并结合故事经历分析。', point: 1 },
      { prompt: '整理整本书阅读笔记时，怎样做更便于复习和交流？', options: ['按人物、事件、疑问等主题分类，并保留页码或章节线索', '把所有摘抄混在一起且不标出处', '只保留最终评价，删去阅读过程', '只按书页颜色分类'], answerIndex: 0, explanation: '分类和位置线索能帮助读者回到原文核对，也便于组织交流。', point: 0 },
      { prompt: '分析小说主题时，怎样避免把人物评价和作品主题混为一谈？', options: ['先分析人物选择，再联系反复出现的处境与社会环境', '只给人物贴好或坏的标签', '只依据自己喜欢或讨厌某个角色', '不读情节而直接抄主题词'], answerIndex: 0, explanation: '主题分析需要从人物行动出发，并联系作品呈现的整体处境和环境。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u3-poetry', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读）', section: '课外古诗词诵读：竹里馆 / 王维；春夜洛城闻笛 / 李白；逢入京使 / 岑参；晚春 / 韩愈', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认课外古诗词诵读为教材板块；篇目与作者按现行目录核对，题目围绕意象、情感和诗句表达原创编写。'],
    points: [['诗歌意象与情境', '结合景物、声音和动作想象诗歌画面。'], ['情感与表达', '联系关键词和语境体会诗人情感，不脱离诗句作判断。']],
    questions: [
      { prompt: '读王维《竹里馆》时，理解幽静氛围最应关注哪类信息？', options: ['竹林、明月等景物与人物独坐、弹琴、长啸的情境', '诗中每个字的笔画数', '只看诗题中的竹字', '把诗句改写成热闹的市集场面'], answerIndex: 0, explanation: '景物和人物活动共同构成诗歌情境，不能只抓一个字词下结论。', point: 0 },
      { prompt: '李白《春夜洛城闻笛》借笛声触发的情感最接近哪一项？', options: ['听到熟悉曲调后引发的思乡之情', '对丰收景象的喜悦', '对山林隐居生活的赞美', '对春日竞赛的期待'], answerIndex: 0, explanation: '诗中笛声和折柳曲调关联离别思乡，情感判断应结合相关诗句。', point: 1 },
      { prompt: '岑参《逢入京使》中诗人托使者传递家书，最能体现什么处境？', options: ['远行途中思念亲人而又难以尽述', '在家中准备宴请宾客', '刚完成一次山间访友', '正为春日花开作细致观察'], answerIndex: 0, explanation: '托使者传书表现行旅中对家人的牵挂，也呈现仓促相逢的情境。', point: 1 },
      { prompt: '韩愈《晚春》写花木争妍的画面，哪种理解更恰当？', options: ['借拟人化描写呈现春光将尽时万物争相展现生机', '全诗只说明植物分类知识', '诗中花木被写成完全静止的标本', '诗歌意在精确测量一天的气温'], answerIndex: 0, explanation: '拟人化的花木描写使暮春景象富有动态和情趣。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u4-reading-practice', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第四单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）说明本册通过选文调整强化单元内容适配与贯通；本组围绕人物担当、言行准则和文本比较原创命题。'],
    points: [['跨文本整合', '围绕共同主题比较不同作品的事件、人物和表达方式。'], ['观点与依据', '从具体文本材料中提炼观点，并说明推理过程。']],
    questions: [
      { prompt: '比较写助人为乐的叙事作品与阐说道理的文章，哪种做法最有效？', options: ['分别找出事件细节和观点论据，再比较各自如何表达主题', '只比较标题字数', '只根据作者身份判断哪篇更有道理', '把两篇内容合并后不注明依据'], answerIndex: 0, explanation: '跨文本阅读需要尊重文体差异，并用具体材料支撑比较结论。', point: 0 },
      { prompt: '判断人物是否真正践行了自己的原则，最应依据什么？', options: ['他在具体情境中的选择和持续行动', '别人给他的称号', '文章篇幅长短', '读者是否熟悉这个人物'], answerIndex: 0, explanation: '原则是否落实要看人物在实际情境中的言行证据。', point: 1 },
      { prompt: '用古文中的观点指导现实生活时，哪种解释更合适？', options: ['先理解原文语境，再说明观点与现实情境的相同和不同', '脱离语境截取几个字作口号', '把古人的处境直接当作今天的制度', '只背译文而不理解观点'], answerIndex: 0, explanation: '联系现实需要先准确理解原意，再说明借鉴之处和情境差异。', point: 1 },
      { prompt: '小组形成单元阅读结论时，怎样避免观点空泛？', options: ['把结论分解为判断，每个判断配相应文本证据', '只使用很感人、很有意义等词', '不再回到文章核对内容', '把组员意见投票后当作事实'], answerIndex: 0, explanation: '清晰结论应由具体文本证据支持，并说明证据与观点的关系。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u4-writing-material', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第四单元（阅读）', section: '写作：怎样选材', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认单元写作与阅读能力训练相互联系；本组考查围绕中心选材、材料真实和详略安排，题目为原创。'],
    points: [['围绕中心选材', '选择能够直接表现写作中心且彼此有联系的材料。'], ['材料取舍与详略', '根据重要性安排篇幅，删除重复、偏题或失真的内容。']],
    questions: [
      { prompt: '作文中心是我学会了耐心，哪组材料最贴切？', options: ['记录练习一项技能时反复尝试、调整方法并逐渐进步', '写一次与耐心无关的购物经历', '罗列最喜欢的几种食物', '介绍天气预报的制作过程'], answerIndex: 0, explanation: '材料应能表现中心所说的变化，反复练习和调整直接体现耐心。', point: 0 },
      { prompt: '围绕第一次独立完成任务写作，哪种取舍更合理？', options: ['详写遇到的关键困难和解决过程，略写无关背景', '每个环节平均写相同篇幅', '删去任务过程，只保留一句结果', '加入与真实经历相矛盾的情节'], answerIndex: 0, explanation: '关键困难和解决过程最能体现中心，应详写；无关背景可以压缩。', point: 1 },
      { prompt: '初稿包含三件相似的小事，其中两件重复表现同一特点。修改时可以怎样做？', options: ['保留最典型的一件，另补能从不同角度支持中心的材料', '三件都完整写出且不作取舍', '全部删除，让文章只剩标题', '把重复事件改成没有发生过的故事'], answerIndex: 0, explanation: '材料要有代表性和一定变化，避免重复堆砌或编造失真。', point: 0 },
      { prompt: '写作中怎样检查材料是否偏题？', options: ['逐项说明每则材料与中心的关系，无法说明的就考虑删改', '只检查每段句子数量是否相等', '只看文章是否足够长', '比较标题和结尾是否押韵'], answerIndex: 0, explanation: '材料与中心之间要有明确联系，检查这种联系有助于发现偏题内容。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u4-activity-family-values', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第四单元（阅读）', section: '专题学习活动：孝亲敬老，传承家风', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认本册综合性学习内容经过改造；本组围绕家庭访谈、资料整理、尊重长辈和当代表达原创命题。'],
    points: [['采访与资料整理', '围绕家风主题设计问题，准确记录家庭故事并核对事实。'], ['传统与当代实践', '理解家风价值，并转化为尊重、关心长辈的具体行动。']],
    questions: [
      { prompt: '准备采访长辈了解家庭中的节俭故事，哪种提问最容易获得具体材料？', options: ['您能讲一件自己印象深刻的节俭经历吗，当时发生了什么？', '您是不是一直很节俭？', '您觉得所有年轻人都怎样？', '您能不能证明我们家最好？'], answerIndex: 0, explanation: '开放且聚焦具体经历的问题更便于受访者回忆和讲述事实。', point: 0 },
      { prompt: '把长辈的故事用于班级分享前，哪种做法更妥当？', options: ['核对记录、征求分享意愿，并保护不宜公开的隐私', '为故事增加戏剧情节而不告知', '公开全部家庭信息以增加真实感', '只保留符合自己观点的句子'], answerIndex: 0, explanation: '分享家庭材料应尊重受访者意愿，核实内容并保护隐私。', point: 0 },
      { prompt: '传承家风怎样从口号转化为日常行动？', options: ['把尊重、勤俭或守信落实到具体言行并持续实践', '只在演讲中说一次传统美德', '要求别人做到，自己不必遵守', '把家风理解为不能讨论和改进的旧习惯'], answerIndex: 0, explanation: '家风传承重在把积极价值落实到日常行为，也可以结合现实理解和完善。', point: 1 },
      { prompt: '制作家风主题展示，哪种结构更清楚？', options: ['说明主题和材料来源，讲述真实故事，再联系自己的行动', '只放装饰图片而不说明主题', '随机排列摘录并省略来源', '先作结论但不提供故事或行动'], answerIndex: 0, explanation: '主题、来源、故事和现实行动连贯起来，展示才有依据且便于理解。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u5-reading-practice', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第五单元（阅读）', section: '阅读综合实践', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认第五单元选文经过调整，以增强主题和语文要素的适配；本组围绕写景抒情、诗歌意象和哲理表达原创命题。'],
    points: [['意象与情感', '结合景物、语言和结构理解作品的情感变化。'], ['联读与主题', '比较不同作品如何由自然景象引出生命感受或思考。']],
    questions: [
      { prompt: '阅读写植物的散文，分析植物形象时哪种方法更合适？', options: ['联系植物的具体状态、作者经历和情感变化综合理解', '只查植物的生物学分类', '只看文章中植物出现的次数', '先确定主题再忽略相反的文本细节'], answerIndex: 0, explanation: '文学中的植物形象既有具体描写，也可能承载情感，需要结合全文理解。', point: 0 },
      { prompt: '比较两首写景诗中的相似景物，哪种结论最可靠？', options: ['结合语境和关键词说明同一景物在不同诗中作用可能不同', '认定相同景物必然表达相同情绪', '只统计景物名词数量', '不读诗句就依作者年代判断情感'], answerIndex: 0, explanation: '意象意义受语境和表达安排影响，不能把同一景物固定对应一种情绪。', point: 1 },
      { prompt: '作品由眼前花木写到生命感受，这种写法的关键是什么？', options: ['从景物特点出发，通过联想或象征形成自然的情感联系', '突然插入与文章无关的结论', '逐项说明所有植物的生长数据', '把景物描写删去只留议论'], answerIndex: 0, explanation: '景与情之间要建立可理解的联系，联想和象征不能脱离景物特征。', point: 0 },
      { prompt: '解释一首哲理诗的含意时，哪种步骤更稳妥？', options: ['先理解字面情境，再结合关键语句分析其中的思考', '只背一个固定主题标签', '把每个词都解释成抽象道理', '用个人经历完全替代诗句'], answerIndex: 0, explanation: '从字面情境到关键语句再到思想含意，能减少脱离文本的过度解读。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u5-writing-concise', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第五单元（阅读）', section: '写作：语言要简明', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）说明教材修订重视语言运用能力；本组围绕删去重复、保留关键信息和准确表达原创命题。'],
    points: [['删繁就简', '删去重复、空泛或无关内容，保留表达目的所需的信息。'], ['简明与准确', '简洁表达不能遗漏条件、改变意思或造成歧义。']],
    questions: [
      { prompt: '由于下雨的缘故，所以原定的活动因此推迟了。怎样修改更简明？', options: ['因为下雨，原定活动推迟了。', '由于下雨的缘故，所以活动因此推迟了。', '下雨了，下雨造成了活动推迟。', '原定活动由于下雨的缘故所以因此推迟了。'], answerIndex: 0, explanation: '删去重复的因果词语，保留原因和结果，句意仍完整。', point: 0 },
      { prompt: '通知写周三下午全体同学到报告厅参加讲座，为避免信息缺失还应优先核实什么？', options: ['具体时间、对象范围及是否需要携带材料等关键信息', '报告厅墙壁的颜色', '通知标题用了几种字体', '讲座期间天气是否晴朗'], answerIndex: 0, explanation: '简明表达仍需完整准确，时间和对象等关键信息不能因求短而遗漏。', point: 1 },
      { prompt: '修改一段反复说明同一意思的文字，最合理的做法是什么？', options: ['合并重复句，保留不同且必要的信息', '把每句话都删掉', '只保留最长的一句，不核对内容', '增加更多近义词重复强调'], answerIndex: 0, explanation: '简明修改要删重而不删掉必要信息，保证句意完整。', point: 0 },
      { prompt: '为什么简明不等于一味缩短句子？', options: ['过度删减可能丢失条件或造成歧义，表达还须准确清楚', '句子越短一定越难懂', '简明只适用于诗歌', '缩短文字必然会改变字体大小'], answerIndex: 0, explanation: '简明要求用较少而恰当的语言清楚传达完整意思，不能牺牲准确性。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u5-wholebook-steel', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第五单元（阅读）', section: '整本书阅读：《钢铁是怎样炼成的》', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认《钢铁是怎样炼成的》列入本册整本书阅读；本组围绕人物经历、关键选择、阅读笔记和主题理解原创命题。'],
    points: [['人物经历与选择', '结合保尔不同阶段的行动、困难和选择理解人物发展。'], ['整本书阅读证据', '用情节和文本线索支持对人物精神及作品主题的判断。']],
    questions: [
      { prompt: '分析保尔的成长变化，哪种阅读证据最有用？', options: ['比较他在不同阶段面对困难时的行动和选择', '只依据封面插图作判断', '只背诵一个人物评价词', '只统计每章页数'], answerIndex: 0, explanation: '人物成长应通过不同时期的具体经历和行动变化来说明。', point: 0 },
      { prompt: '做整本书阅读分享时，怎样使坚韧这一评价有依据？', options: ['选取关键情节，说明人物怎样面对挫折并继续行动', '不断重复他很坚韧', '只介绍作者国籍', '引用与人物无关的名言代替情节'], answerIndex: 0, explanation: '评价需要用具体情节展示人物面对困难的态度和行动。', point: 1 },
      { prompt: '记录阅读疑问后，哪种做法更能推动深入阅读？', options: ['继续读相关章节，回看前文并用新证据修正理解', '把疑问抄下后永远不再核对', '只问同学答案而不回到原书', '为了保持原判断而忽略后文'], answerIndex: 0, explanation: '整本书阅读需要持续验证和修正理解，证据来自全书关联。', point: 0 },
      { prompt: '讨论作品主题时，为什么要联系人物所处的时代和环境？', options: ['人物选择与环境相互作用，有助理解作品呈现的价值追求', '时代背景可以替代所有情节', '环境描写与人物无关', '只要知道年代就能确定全部主题'], answerIndex: 0, explanation: '时代环境有助于解释人物选择，但主题仍须结合全书情节和文本证据。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u6-task2-collect-organize', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第六单元（活动·探究·科技）', section: '任务二 搜集与整理', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）说明第六单元为活动·探究单元，整合阅读、资料搜集与实践任务；本组按科学探索主题的检索和整理要求原创命题。'],
    points: [['资料搜集与核验', '围绕探究问题选择相关、可信、可追溯的信息来源。'], ['分类整理与综合', '按主题和证据类型整理资料，区分事实、解释与个人判断。']],
    questions: [
      { prompt: '小组研究载人航天中的一项技术，开始搜集资料前最应先做什么？', options: ['把主题转化为清楚、范围适当的探究问题', '先复制所有搜索结果', '先决定结论再筛选材料', '只选择标题最吸引人的网页'], answerIndex: 0, explanation: '明确问题能帮助限定检索范围并判断资料是否相关。', point: 0 },
      { prompt: '两条网络资料对同一事实说法不一致，怎样核查更可靠？', options: ['追查原始发布机构和出处，并与其他可信资料交叉核对', '选择发布时间较晚的一条就停止核查', '按点赞数量决定真伪', '把两种说法拼成一个结论'], answerIndex: 0, explanation: '来源追溯和交叉核验有助于发现信息差异及其依据。', point: 0 },
      { prompt: '整理搜集到的材料时，怎样区分事实与解释？', options: ['记录事实出处，并标明哪些是作者分析或小组推断', '把所有文字都当作直接事实', '删除出处只保留自己的结论', '按网页颜色分类而不看内容'], answerIndex: 0, explanation: '保留来源并标清事实、解释和推断，才能让资料可核验。', point: 1 },
      { prompt: '资料很多但汇报时间有限，怎样取舍？', options: ['保留能回答探究问题且来源可靠的关键证据', '只保留篇幅最长的资料', '把所有材料不加整理地读一遍', '删去所有与预想结论不同的材料'], answerIndex: 0, explanation: '资料取舍要看与问题的相关性、可靠性和证明作用。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u6-task3-present', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第六单元（活动·探究·科技）', section: '任务三 表达与呈现', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）说明第六单元设置表达与呈现任务；本组围绕科学探究成果的受众、结构、证据和口头表达原创命题。'],
    points: [['探究成果表达', '围绕问题、方法、证据和结论组织简洁完整的成果介绍。'], ['交流与回应', '结合听众需要清楚表达，并根据问题回到资料核验。']],
    questions: [
      { prompt: '介绍一项科学探究成果，哪种组织顺序最便于听众理解？', options: ['提出问题—说明方法—展示证据—形成结论', '先展示结论后省略全部过程', '随机排列图片和数据', '只介绍小组成员不说明研究内容'], answerIndex: 0, explanation: '问题、方法、证据和结论构成清晰的探究表达链条。', point: 0 },
      { prompt: '展示图表中的数据时，哪种做法更准确？', options: ['说明数据来源、单位和比较对象，再解释它支持什么结论', '只放图表不标来源和单位', '挑选最醒目的一个数代表全部结果', '把相关性直接说成因果关系'], answerIndex: 0, explanation: '数据需要交代来源和含义，结论也不能超出数据支持范围。', point: 1 },
      { prompt: '听众提出报告中没有考虑的问题，汇报者怎样回应更合适？', options: ['先确认问题，再说明已有证据或承认仍需进一步核查', '随意编造答案保持自信', '打断对方并重复结论', '把问题归咎于听众没有认真听'], answerIndex: 0, explanation: '科学交流应依据证据回应，暂不能回答时应明确说明并继续核查。', point: 1 },
      { prompt: '为不同年级的听众介绍探究成果，应怎样调整表达？', options: ['保留关键概念和证据，并解释听众可能不熟悉的术语', '删除所有证据只讲故事', '故意使用更多复杂术语', '照读资料全文而不作说明'], answerIndex: 0, explanation: '表达需考虑听众知识背景，同时保留支撑结论的核心证据。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-7b-u6-poetry', grade: '初一', subject: '语文', volume: '下册',
    chapter: '第六单元（活动·探究·科技）', section: '课外古诗词诵读：泊秦淮；贾生；过松源晨炊漆公店（其五）；约客', directoryUrl: chinese7b,
    evidence: ['人教社七下修订说明（' + chinese7bPepRevision + '）确认本册第六单元后安排课外古诗词诵读；诗题按现行目录核对，题目围绕典故、议论、景象和语气原创编写。'],
    points: [['诗句与表达方式', '结合典故、景物和议论性语句理解诗歌内容。'], ['语气与情感', '从关键词和结尾表达体会讽喻、劝诫或等待等情绪。']],
    questions: [
      { prompt: '杜牧《泊秦淮》写夜泊秦淮及歌声，诗人主要借此表达什么？', options: ['借眼前景象讽喻沉溺享乐、无视现实忧患的社会风气', '赞美秦淮河水利工程', '说明夜间航行的技术方法', '记录愉快宴游而无其他意味'], answerIndex: 0, explanation: '诗歌由夜景和歌声引出讽喻，结尾指向对现实的忧思。', point: 1 },
      { prompt: '李商隐《贾生》借汉代贾谊的典故，重点讽刺什么？', options: ['看似重视贤才却未真正询问治国之道的做法', '贾谊拒绝接受所有建议', '百姓不愿学习历史', '诗人反对一切古代制度'], answerIndex: 0, explanation: '诗中借汉文帝召见贾谊却只问鬼神之事，寄寓对用人和治政的讽意。', point: 0 },
      { prompt: '杨万里《过松源晨炊漆公店（其五）》提醒行路者不要轻视后续山路，表达了什么道理？', options: ['认识事物不能因暂时顺利而掉以轻心', '只要走得快就一定没有困难', '旅行时不需要观察道路', '山路总是比平地容易'], answerIndex: 0, explanation: '诗句由山路经验引出对前路曲折的认识，提醒人保持审慎。', point: 1 },
      { prompt: '赵师秀《约客》结尾写等待时闲敲棋子，主要呈现怎样的情境？', options: ['客人未至时的寂静等待和略带焦灼的心绪', '热闹集市上的竞赛场面', '行军途中紧张的战斗', '春日踏青时的欢快聚会'], answerIndex: 0, explanation: '夜雨、蛙声与闲敲棋子共同营造等待中的静景和微妙心情。', point: 0 },
    ],
  },
]

const chinese8aLeafRebuilds: GapSeed[] = [
  {
    id: 'leaf-rebuild-2026-chinese-8a-u1-task2-interview', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第一单元（活动·探究·新闻）', section: '任务二 新闻采访', directoryUrl: chinese8a,
    evidence: ['本地目录按2025年秋学年八上版标注任务二；人教社2025新学期教材说明（' + chinese8aPep2025 + '）确认八上教材已更新，本组按新闻采访的策划、提问和核实要求原创。'],
    points: [['采访策划', '明确采访主题、对象、时间和用途，准备开放且聚焦的问题。'], ['采访记录与核验', '准确记录回答，核对事实并尊重受访者意愿。']],
    questions: [
      { prompt: '采访前要了解一次校园科技活动，哪种准备最有效？', options: ['明确主题和受访对象，先查背景并设计由浅入深的问题', '不做准备，到了现场再随意聊天', '先写好结论，再诱导受访者认同', '只准备与主题无关的个人问题'], answerIndex: 0, explanation: '主题、对象和背景明确后，问题更容易获得有用信息。', point: 0 },
      { prompt: '哪种采访问题更可能得到具体、可用的回答？', options: ['您能介绍一个活动中最难忘的环节及原因吗？', '活动是不是特别好？', '您同意我们写得很好，对吗？', '您觉得所有事情怎么样？'], answerIndex: 0, explanation: '开放而聚焦的问题避免简单的是非回答，也不预设受访者立场。', point: 0 },
      { prompt: '采访记录中涉及时间和数据，写成新闻前应怎样处理？', options: ['回看笔记并向可靠来源核实关键事实', '按记忆补出看起来合理的数字', '为了简短省略可能影响结论的条件', '把不同受访者的话拼成一句引语'], answerIndex: 0, explanation: '新闻事实必须可核验，关键时间和数据不能凭印象补写。', point: 1 },
      { prompt: '受访者提出某段谈话不要公开，采访者应怎样做？', options: ['尊重约定，不把该内容作为公开引语使用', '匿名后仍完整公开所有细节', '把受访者的意思改成相反观点', '先发布再征求同意'], answerIndex: 0, explanation: '采访应遵守与受访者的约定，并保护其合理权益。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u1-task3-news-writing', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第一单元（活动·探究·新闻）', section: '任务三 新闻写作', directoryUrl: chinese8a,
    evidence: ['人教社2025年教材更新报道（' + chinese8aPep2025 + '）确认八上教材启用更新版；本组依新闻写作的真实、准确、简明和结构要求原创。'],
    points: [['新闻结构', '围绕重要事实安排标题、导语和主体，突出最有新闻价值的信息。'], ['事实准确与简洁', '核实人物、时间、地点和数据，区分事实与评价。']],
    questions: [
      { prompt: '校园运动会消息的导语最应优先交代什么？', options: ['最重要的事件、时间地点和主要结果', '记者的全部个人感想', '与事件无关的学校历史', '所有参赛者的完整名单'], answerIndex: 0, explanation: '导语要简明呈现新闻中最重要的信息，引导读者了解事件。', point: 0 },
      { prompt: '新闻标题写“全校最精彩活动”，正文却只写一个班级的体验，主要问题是什么？', options: ['标题范围超过正文事实，容易误导读者', '标题字数太少', '正文没有使用感叹号', '标题没有交代作者年龄'], answerIndex: 0, explanation: '标题必须与实际报道范围和证据相符，不能夸大覆盖面。', point: 1 },
      { prompt: '采访稿中两位同学对参与人数说法不一致，写作时应怎样处理？', options: ['查活动记录或向组织者核实后再写准确数字', '随意选一个数字并作为事实', '把两个数字相加', '删去来源但保留数字'], answerIndex: 0, explanation: '有争议的数据应回到可靠记录核查，不能猜测或拼接。', point: 1 },
      { prompt: '新闻主体中的背景材料怎样安排更合适？', options: ['补充理解事件所需的背景，并保持与核心事实相关', '把所有背景都放在导语前', '加入大量无关趣闻', '用背景评价代替事件事实'], answerIndex: 0, explanation: '背景材料应帮助解释核心事实，篇幅和位置都要服务报道重点。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u2-reading-practice', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '阅读综合实践', directoryUrl: chinese8a,
    evidence: ['人教社统编教材修订说明指出八年级逐步建立传记等文章体式概念；本组结合本单元人物阅读任务原创命题，并按本地2025秋目录定位。'],
    points: [['传记阅读', '结合人物经历、时代背景和作者取材理解人物形象。'], ['材料与写法', '比较传记、回忆性文章等文本如何选择材料和表达评价。']],
    questions: [
      { prompt: '读传记时，判断人物特点最可靠的依据是什么？', options: ['人物经历、言行细节及其所处时代背景', '只看传记封面上的一句评价', '只根据作者姓名推断人物', '把传记中的每件小事都视为同样重要'], answerIndex: 0, explanation: '传记人物形象需要由经历、言行和时代语境共同支撑。', point: 0 },
      { prompt: '比较两篇写同一人物的文章，首先应注意什么？', options: ['作者的身份、取材角度和叙述目的是否不同', '两篇标题的字数是否相等', '哪篇使用的标点更多', '哪篇段落数量更多'], answerIndex: 0, explanation: '取材和叙述角度影响人物呈现，比较时应关注文本的选择与目的。', point: 1 },
      { prompt: '传记中出现直接引语，读者怎样理解更审慎？', options: ['结合上下文判断引语作用，并留意引语来源和叙述语境', '把每句话都当成作者亲耳听到', '只读引语，不读叙述部分', '把引语改写成自己的观点'], answerIndex: 0, explanation: '引语的意义和可信度要结合来源、语境和叙述方式理解。', point: 1 },
      { prompt: '概括人物一生时，为什么不能把所有经历简单罗列？', options: ['要筛选能表现人物发展和重要选择的关键经历', '经历越多越不需要中心', '传记只能写一个事件', '罗列年份就等于解释人物'], answerIndex: 0, explanation: '筛选关键经历并说明其联系，才能呈现人物发展而非堆砌信息。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u2-writing-biography', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '写作：学写传记', directoryUrl: chinese8a,
    evidence: ['人教社教材修订说明将传记列入八年级文章体式学习；本组按传记写作的材料核实、时间线和典型事例要求原创。'],
    points: [['材料核实与取舍', '通过可靠访谈、文献或记录核实经历，选择有代表性的材料。'], ['传记叙述', '按时间或主题组织经历，以事实和细节呈现人物特点。']],
    questions: [
      { prompt: '准备为一位社区志愿者写小传，哪种做法最应先完成？', options: ['访谈本人或熟悉其经历的人，并核对关键事实', '先写好赞美结论再寻找材料', '仅凭社交媒体头像推测经历', '为增强故事性补造情节'], answerIndex: 0, explanation: '传记以真实经历为基础，关键材料需通过可靠来源核实。', point: 0 },
      { prompt: '人物经历跨越多年，哪种组织方式更清楚？', options: ['按时间线梳理重要阶段，并突出有意义的转折', '把材料随机排列', '按采访者姓名排序事件', '只列出生和去世年份'], answerIndex: 0, explanation: '时间线能呈现经历发展和转折，帮助读者理解人物变化。', point: 1 },
      { prompt: '人物一生中有很多日常小事，传记应如何选择？', options: ['保留最能表现人物特点或重要选择的典型事例', '所有事情都用相同篇幅写出', '只写最轻松有趣但无关的事', '删除所有具体事实只作评价'], answerIndex: 0, explanation: '典型材料能集中呈现人物特点，避免传记成为流水账。', point: 0 },
      { prompt: '初稿引用了家人口述的一句话，发表前怎样处理更妥当？', options: ['核对原意和语境，必要时征求受访者确认', '改成更夸张的话以吸引读者', '删去出处并声称是本人亲历', '将口述和作者推测混写成事实'], answerIndex: 0, explanation: '口述材料应忠实记录并区分事实与作者解释。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u2-wholebook-redstar', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读）', section: '整本书阅读：《红星照耀中国》——怎样读红色经典作品', directoryUrl: chinese8a,
    evidence: ['本地2025秋版目录列出《红星照耀中国》整本书阅读专题；本组以纪实阅读、史料核对和人物分析为核心原创命题。'],
    points: [['纪实作品阅读', '区分作者观察、采访记录、历史背景和作者判断。'], ['红色经典研读', '用人物事迹和历史材料理解作品呈现的革命精神。']],
    questions: [
      { prompt: '阅读《红星照耀中国》时，判断一段内容属于现场观察还是背景说明，最应关注什么？', options: ['叙述者的经历线索、信息来源和上下文标记', '段落中形容词的数量', '书页的颜色', '只看章节标题'], answerIndex: 0, explanation: '纪实作品常交织观察、采访和背景材料，应依据叙述线索辨析。', point: 0 },
      { prompt: '讨论一位革命人物的形象，哪种发言更有依据？', options: ['引用书中记录的行动和谈话，并联系当时环境解释', '只复述网络上的简短评价', '根据影视形象判断原著', '用今天的生活经验直接替代历史背景'], answerIndex: 0, explanation: '人物分析应回到书中记录，并联系历史情境理解。', point: 1 },
      { prompt: '读到书中重要历史数据，哪种核验方式更可靠？', options: ['查找可追溯的史料或权威研究，并记录出处', '选择最符合预想的一组数字', '只看转发次数最多的帖子', '把不同年代的数据直接相加'], answerIndex: 0, explanation: '史实和数据应追溯来源，必要时用可靠资料交叉核对。', point: 0 },
      { prompt: '制作整本书阅读卡片时，怎样便于后续讨论？', options: ['记录主题、人物或事件、章节位置及自己的疑问', '只抄标题不保留页码', '把作者评论和自己的推测混为一谈', '只收集图片而不记文本线索'], answerIndex: 0, explanation: '可回查的章节线索和明确标记的疑问能支持持续阅读与交流。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u3-reading-practice', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古诗文）', section: '阅读综合实践', directoryUrl: chinese8a,
    evidence: ['本地目录将第三单元标为阅读与古诗文；人教社统编教材修订说明确认每册设置阅读综合实践，本组围绕景物描写、文言阅读和诗歌比较原创。'],
    points: [['古诗文理解', '结合语句、注释和上下文把握文言内容与诗歌情境。'], ['景物与表达', '分析景物描写如何组织空间、表现情感或服务叙事。']],
    questions: [
      { prompt: '读古诗文中的景物描写，推断作者情感时应怎样做？', options: ['结合具体景物、关键词和全篇语境分析', '把某种景物固定解释成一种情绪', '只根据作者年代猜测情感', '只统计景物名词数量'], answerIndex: 0, explanation: '景物意义受语境影响，应由具体词句和全篇内容共同支持。', point: 0 },
      { prompt: '比较两篇写山水的作品，哪种比较角度更有效？', options: ['比较观察视角、景物层次及语言表达效果', '比较作者姓名的长短', '只比较篇幅，不看内容', '认定相同景物必定写出相同感受'], answerIndex: 0, explanation: '观察视角、空间组织和语言能解释作品景物呈现的差异。', point: 1 },
      { prompt: '翻译文言句子时遇到省略成分，哪种处理更恰当？', options: ['依据上下文补出必要成分，同时保持原句意思', '不看上下文，随意增加新情节', '把每个字都机械对应成一个现代词', '省略所有难懂内容'], answerIndex: 0, explanation: '文言翻译需结合语境补足省略，但不能添加原文没有的新意思。', point: 0 },
      { prompt: '概括一篇古诗文的内容，哪种答案更稳妥？', options: ['准确概括主要景物或事件，并用关键语句说明依据', '只写一个宽泛主题词', '把注释照抄一遍', '用个人感受替代文章内容'], answerIndex: 0, explanation: '内容概括要紧扣文本信息，并以关键语句支撑理解。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u3-writing-scenery', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古诗文）', section: '写作：学习描写景物', directoryUrl: chinese8a,
    evidence: ['本地目录列明第三单元写作专题为学习描写景物；本组按观察顺序、感官细节和情景关系原创命题。'],
    points: [['观察顺序', '按空间、时间或视线变化组织景物，使描写层次清楚。'], ['景物与情感', '选择准确细节表现景物特点，并自然传达感受。']],
    questions: [
      { prompt: '描写校园从校门到操场的景色，哪种安排最清楚？', options: ['按行走路线依次写沿途景物及视线变化', '随机跳写几个互不相关的地点', '只列景物名称', '先写结论再重复相同句子'], answerIndex: 0, explanation: '明确的空间顺序能帮助读者形成连贯的景物画面。', point: 0 },
      { prompt: '哪处描写更能呈现雨后花园的具体特点？', options: ['叶缘挂着水珠，石阶间传来细细的滴水声', '花园非常美丽，非常漂亮', '这里的一切都令人感动', '花园有很多东西'], answerIndex: 0, explanation: '可观察的视觉和听觉细节比笼统评价更能呈现景物特征。', point: 1 },
      { prompt: '写景文章中加入感受，怎样才不显突兀？', options: ['让感受从所写景物和具体经历中自然生发', '每写一句景物就插入一句口号', '把景物删去只写感叹', '加入与景物无关的长篇议论'], answerIndex: 0, explanation: '情感与景物之间建立具体联系，表达会更自然可信。', point: 1 },
      { prompt: '初稿把远近景物混在一起，修改时可以怎样做？', options: ['按观察位置或由远及近重新排列，并补充必要过渡', '继续增加更多无关景物', '删去所有方位词', '把段落顺序完全随机化'], answerIndex: 0, explanation: '空间层次清楚、过渡恰当，读者才容易把握景物关系。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u3-activity-trust', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古诗文）', section: '专题学习活动：人无信不立', directoryUrl: chinese8a,
    evidence: ['本地目录列明专题学习活动人无信不立；本组围绕诚信案例调查、观点证据和校园倡议原创命题。'],
    points: [['诚信主题探究', '从传统故事、现实案例和规则中理解诚信的含义。'], ['资料与表达', '用可靠材料说明观点，提出可实行的诚信行动。']],
    questions: [
      { prompt: '小组探究校园诚信现象，哪种调查设计更有参考价值？', options: ['先明确问题和范围，匿名收集案例并说明调查方法', '只访问一位朋友就代表全校', '公开同学姓名和个人经历', '先决定谁不诚信再寻找材料'], answerIndex: 0, explanation: '明确范围、保护隐私并说明方法，能提高调查的可信度。', point: 0 },
      { prompt: '提出诚信倡议时，哪种表达更有说服力？', options: ['说明具体情境、诚信原则和可实行的行动', '只用很多感叹号要求大家诚实', '列举未经核实的传闻', '只批评别人而不给出做法'], answerIndex: 0, explanation: '清楚的理由和可执行行动能让倡议具体、可信。', point: 1 },
      { prompt: '引用传统故事说明诚信，怎样避免只讲故事不见观点？', options: ['先讲相关情节，再解释它与诚信原则的联系', '只复述全部情节不作说明', '把不同故事拼成一个故事', '用故事替代所有现实讨论'], answerIndex: 0, explanation: '材料之后需要解释它怎样支持观点，才能形成完整论证。', point: 0 },
      { prompt: '调查中出现与小组初步判断不同的材料，应该怎样做？', options: ['保留并核实这类材料，必要时修正原判断', '删除所有相反信息', '把材料改写成支持原结论的样子', '指责提供材料的人'], answerIndex: 0, explanation: '可靠探究应根据证据调整判断，而不是筛掉不合预期的信息。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u3-poetry', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古诗文）', section: '课外古诗词诵读：庭中有奇树（《古诗十九首》）；龟虽寿 / 曹操；赠从弟（其二）/ 刘桢；梁甫行 / 曹植', directoryUrl: chinese8a,
    evidence: ['本地目录逐项列出本册第三单元课外古诗词及作者；本组围绕思念、志向、坚贞和民生关怀原创命题。'],
    points: [['诗歌意象', '由植物、松柏和生活景象体会诗歌情境。'], ['情感与主旨', '联系诗句理解思念、理想、品格或社会关怀。']],
    questions: [
      { prompt: '《庭中有奇树》写庭中树木和折枝寄远，主要表达什么？', options: ['久别思念而希望把美好心意寄给远方之人', '庆祝秋日丰收', '描写一次登山比赛', '说明园艺种植方法'], answerIndex: 0, explanation: '折花寄远的动作把庭中景物与对远人的思念联系起来。', point: 0 },
      { prompt: '曹操《龟虽寿》写年老仍有志向，诗中强调什么？', options: ['人的志向和进取精神不因年岁增长而消失', '年老后不应再有理想', '只要长寿就不必努力', '自然景物不能变化'], answerIndex: 0, explanation: '诗歌借生命有限的感慨表达老当益壮、仍思进取的志向。', point: 1 },
      { prompt: '刘桢《赠从弟》（其二）借松柏在严寒中挺立，主要赞美什么？', options: ['在艰难环境中保持坚贞品格', '追求舒适安逸的生活', '对季节变化感到恐惧', '树木生长速度很快'], answerIndex: 0, explanation: '松柏经寒不凋的形象寄托了对坚定品格的赞美。', point: 0 },
      { prompt: '曹植《梁甫行》描写偏远地区百姓生活，诗歌表达了什么关切？', options: ['对民生艰难处境的关注', '对宫廷宴饮的赞美', '对个人游玩的留恋', '对丰收庆典的记录'], answerIndex: 0, explanation: '诗中写到百姓生活环境和处境，体现了对民生的关注。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u4-reading-practice', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读·散文）', section: '阅读综合实践', directoryUrl: chinese8a,
    evidence: ['人教社统编教材修订说明确认每册设置阅读综合实践；本组围绕散文中的人物、亲情、景物和语言线索开展原创练习。'],
    points: [['散文线索与结构', '借助人物、事件、物件或情感变化梳理文章脉络。'], ['语言与情感', '结合关键细节理解作者态度和作品情感。']],
    questions: [
      { prompt: '分析一篇回忆性散文的结构，哪种线索最可能帮助梳理全文？', options: ['反复出现的物件、人物关系或情感变化', '每段的字数是否相等', '标点符号的种类', '作者名字出现的次数'], answerIndex: 0, explanation: '散文常借具体线索组织材料，梳理线索有助理解结构。', point: 0 },
      { prompt: '理解一处看似平常的生活细节，哪种方法更合适？', options: ['联系上下文和人物关系，分析它在情感表达中的作用', '脱离文章只查物品价格', '认为所有细节都没有意义', '只看它出现在第几段'], answerIndex: 0, explanation: '细节意义常由上下文和人物关系共同决定。', point: 1 },
      { prompt: '散文先写眼前景物，再回忆往事，这样安排可能有什么效果？', options: ['由现实触发回忆，使今昔情境和情感形成联系', '证明文章必须按时间顺序写', '让读者不必关注回忆内容', '把散文变成说明书'], answerIndex: 0, explanation: '现实与回忆的转换可以建立情感联系并丰富文章结构。', point: 0 },
      { prompt: '概括散文的情感时，哪种答案更有根据？', options: ['结合关键语句和细节说明情感如何变化', '只写一个抽象情绪词', '只根据作者简介推断', '把自己的感受当作唯一结论'], answerIndex: 0, explanation: '情感概括要能回到文本说明依据和变化。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u4-writing-cohesion', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读·散文）', section: '写作：语言要连贯', directoryUrl: chinese8a,
    evidence: ['本地目录列明第四单元写作专题语言要连贯；本组按句间关系、指代衔接、顺序安排和过渡表达原创命题。'],
    points: [['句段衔接', '依据时间、空间、因果或递进关系安排句段。'], ['指代与过渡', '保持指代清楚，并使用必要的关联词和过渡语。']],
    questions: [
      { prompt: '说明一次实验过程，哪种句序更连贯？', options: ['先准备材料，再按步骤操作，最后记录现象', '先写结果，再写准备，最后跳回第一步', '按材料名称的笔画排序', '把每句话随机调换位置'], answerIndex: 0, explanation: '过程说明通常按操作先后排列，读者才能顺着步骤理解。', point: 0 },
      { prompt: '一段文字中连续出现“它”，读者不清楚指什么。修改时应怎样做？', options: ['在容易混淆处改用明确名称或补足指代对象', '再增加几个“它”', '删去所有名词', '把句子顺序随机调整'], answerIndex: 0, explanation: '指代明确能避免读者误解句子之间的联系。', point: 1 },
      { prompt: '两句话表达转折关系，哪种连接更准确？', options: ['虽然天气转冷，但是队员仍按计划完成训练', '因为天气转冷，所以但是队员完成训练', '天气转冷，首先然后队员训练', '天气转冷，换句话说，队员却训练'], answerIndex: 0, explanation: '关联词应准确体现转折关系，避免混用造成逻辑混乱。', point: 0 },
      { prompt: '段落之间主题相同但转换较突然，怎样修改更自然？', options: ['补充必要的承接句，说明前后内容的联系', '重复上一段全文', '加入无关的话题', '删掉所有段落标记'], answerIndex: 0, explanation: '承接语能提示内容推进关系，使段落过渡清楚。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u4-wholebook-redrock', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读·散文）', section: '整本书阅读：《红岩》', directoryUrl: chinese8a,
    evidence: ['本地2025秋版目录列出《红岩》整本书阅读；本组围绕长篇小说人物关系、情节证据和历史背景原创命题。'],
    points: [['人物与情节', '结合人物行动、关系变化和关键事件理解人物形象。'], ['历史背景与主题', '联系作品时代背景和全书情节理解理想信念主题。']],
    questions: [
      { prompt: '讨论《红岩》中的人物形象，哪种做法更有文本依据？', options: ['结合人物在关键情境中的选择和行动说明特点', '只根据影视演员形象评价人物', '只抄人物姓名和身份', '用一句口号替代情节分析'], answerIndex: 0, explanation: '人物形象应通过具体情节和行动来分析。', point: 0 },
      { prompt: '阅读长篇小说时画人物关系图，最适合记录什么？', options: ['人物之间的关系及其随情节发展的变化', '每章的页数和字体大小', '读者当天的天气', '所有人物名字的笔画顺序'], answerIndex: 0, explanation: '关系图有助于追踪人物联系和故事发展。', point: 1 },
      { prompt: '联系历史背景阅读小说，哪种做法更审慎？', options: ['用可靠背景资料辅助理解，同时回到小说情节核对', '把小说中的每个细节都当作档案原文', '让背景资料替代整本小说', '只依据网络评论判断主题'], answerIndex: 0, explanation: '历史背景能帮助理解，但文学作品和史料的性质不同，需相互参照。', point: 0 },
      { prompt: '为全书主题写读书札记，怎样组织论述更清楚？', options: ['提出主题理解，列举不同章节的情节证据并解释联系', '只写喜欢或不喜欢', '只复述结尾情节', '罗列所有角色而不说明主题'], answerIndex: 0, explanation: '跨章节证据和解释能展示主题如何贯穿全书。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u5-reading-practice', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第五单元（阅读·说明文）', section: '阅读综合实践', directoryUrl: chinese8a,
    evidence: ['人教社2025年教材更新报道（' + chinese8aPep2025 + '）确认八上新增科技题材选文；本组围绕说明对象、材料组织和说明语言原创命题。'],
    points: [['说明对象与结构', '抓住说明对象的主要特征，梳理说明顺序和结构层次。'], ['信息整合与语言', '区分事实与评价，理解说明方法及准确表达的作用。']],
    questions: [
      { prompt: '读科技类说明文时，概括说明对象的特征应主要依据什么？', options: ['文章反复说明的事实、数据和关键语句', '只看标题中的一个词', '读者对该对象的印象', '插图颜色是否鲜艳'], answerIndex: 0, explanation: '对象特征应从文本提供的事实和说明内容中归纳。', point: 0 },
      { prompt: '文章先介绍设备组成，再写工作过程，这种顺序主要依据什么？', options: ['先认识结构，再理解运行过程的逻辑', '作者姓名的排列顺序', '段落长度由短到长', '内容与说明对象无关'], answerIndex: 0, explanation: '结构到过程的安排帮助读者逐步理解设备如何运行。', point: 1 },
      { prompt: '说明文引用具体数据，最主要的作用是什么？', options: ['使说明更具体，并增强信息的可核查性', '保证结论一定正确而无需来源', '让文章自动变成议论文', '替代对说明对象的解释'], answerIndex: 0, explanation: '数据可使说明具体，但仍需准确并与说明内容相关。', point: 1 },
      { prompt: '阅读一篇介绍新科技成就的文章，哪种态度最恰当？', options: ['了解成就的同时关注文中证据、过程和信息来源', '只记住赞美性词语', '不看过程，直接接受所有结论', '把科普说明当作广告口号'], answerIndex: 0, explanation: '科学阅读既要理解成就，也要关注事实依据和说明过程。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u5-writing-feature', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第五单元（阅读·说明文）', section: '写作：说明事物要抓住特征', directoryUrl: chinese8a,
    evidence: ['本地目录列明第五单元说明文写作专题；本组围绕对象观察、特征筛选、说明顺序和方法选择原创命题。'],
    points: [['特征筛选', '从观察或资料中选择能区别说明对象的主要特征。'], ['说明方法与顺序', '依据对象特点选择恰当方法，并按便于理解的顺序组织内容。']],
    questions: [
      { prompt: '介绍一种校园植物，怎样才能抓住它的主要特征？', options: ['观察叶、花、季节变化等方面，并选择最有区别性的事实', '只写它很美很好看', '把其他植物的特征也混进来', '只写自己对植物的心情'], answerIndex: 0, explanation: '多角度观察后选择最有辨识度的事实，才能说明对象特点。', point: 0 },
      { prompt: '说明一个物体的外形和内部构造，哪种顺序通常更清楚？', options: ['先整体后局部，或按观察到的空间次序展开', '按词语字数排序', '先写结论再随机补充部件', '每段重复同一外形描述'], answerIndex: 0, explanation: '整体到局部或空间顺序能帮助读者建立清晰结构。', point: 1 },
      { prompt: '为说明两个物体大小差异，哪种方法最直接？', options: ['在条件一致时列出可核对的尺寸并作比较', '只说一个很大一个很小', '加入无关的故事', '用读者的身高代替测量'], answerIndex: 0, explanation: '准确数据和明确比较对象能具体说明大小差异。', point: 0 },
      { prompt: '说明稿中出现了很多特征，却没有重点。修改时应怎样做？', options: ['围绕说明目的删去次要或重复信息，突出主要特征', '继续加入所有想到的资料', '删除说明对象名称', '用形容词替代事实'], answerIndex: 0, explanation: '筛选信息并突出重点能让说明更准确、简明。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u5-activity-cultural-heritage', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第五单元（阅读·说明文）', section: '专题学习活动：身边的文化遗产', directoryUrl: chinese8a,
    evidence: ['本地目录列明专题学习活动身边的文化遗产；本组围绕实地观察、资料核验、文化价值和保护建议原创命题。'],
    points: [['文化遗产调查', '记录地点、历史线索、使用现状和资料来源。'], ['保护与传播', '在尊重事实和社区意愿的基础上提出可实行的保护建议。']],
    questions: [
      { prompt: '调查身边一处历史建筑，哪种记录最有助于后续核验？', options: ['记录地点、观察时间、可见特征并注明资料出处', '只写听来的传说且不记来源', '为照片添加无法证实的年代', '只记录自己喜欢的颜色'], answerIndex: 0, explanation: '具体观察记录和可追溯来源能支持后续核验。', point: 0 },
      { prompt: '两份资料对一处遗产的年代说法不同，下一步应怎样做？', options: ['查找主管部门或可靠文献记录，并标明暂时无法确定之处', '选一个更古老的年代吸引读者', '把两个年代平均后写入报告', '删除出处避免被追问'], answerIndex: 0, explanation: '年代信息应依据可靠来源，无法确认时应如实说明。', point: 1 },
      { prompt: '提出文化遗产保护建议时，哪种方案更可行？', options: ['说明具体问题、保护对象和可执行的维护或宣传行动', '只要求所有人都重视', '建议拆除原物后另建仿品', '不考虑使用者和社区意见'], answerIndex: 0, explanation: '可行建议需要对应真实问题，并考虑保护对象及相关群体。', point: 1 },
      { prompt: '制作遗产介绍展板，使用他人拍摄的照片时应怎样做？', options: ['确认授权或使用条件，并注明图片来源', '去掉水印后当作自己拍摄', '只要公开网页上的图片就不必标注', '把照片内容改成支持结论的样子'], answerIndex: 0, explanation: '使用资料和图片应遵守授权要求并清楚注明来源。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u6-reading-practice', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·古诗文）', section: '阅读综合实践', directoryUrl: chinese8a,
    evidence: ['人教社统编教材修订说明确认各单元阅读综合实践用于梳理和贯通学习；本组结合古诗文中的情境、语句和表达方式原创命题。'],
    points: [['古诗文梳理', '结合关键语句和上下文梳理内容、人物行动及结构。'], ['表达效果', '解释用词、句式或典故如何服务情境和主旨。']],
    questions: [
      { prompt: '阅读古诗文时遇到含义不确定的词语，哪种办法更可靠？', options: ['结合注释、上下文和句间关系推断，再回到全文检验', '只选择最常见的现代词义', '不读前后句直接猜测', '把词语解释成自己喜欢的意思'], answerIndex: 0, explanation: '词义判断需结合语境，并用全文信息检验推断。', point: 0 },
      { prompt: '分析一段文言叙事的情节变化，哪种方法更合适？', options: ['梳理人物行动和事件因果，概括关键转折', '只按每句字数排序', '跳过不熟悉的句子', '只看结尾猜测开头'], answerIndex: 0, explanation: '行动和因果关系构成叙事脉络，关键转折有助于理解全文。', point: 1 },
      { prompt: '诗文中用典，读者怎样理解其表达作用？', options: ['了解典故基本背景，再联系当前语境和作者表达目的', '只背典故出处不看诗句', '认定所有典故都表达赞美', '把典故当成与作品无关的装饰'], answerIndex: 0, explanation: '典故作用需要结合背景和作品语境判断，不能一概而论。', point: 0 },
      { prompt: '解释古诗文的表达效果，哪种回答更充分？', options: ['指出具体词句，说明它描写了什么并产生怎样的效果', '只写生动形象四个字', '只复述译文，不说明表达作用', '只写个人喜欢或不喜欢'], answerIndex: 0, explanation: '效果分析应有具体词句依据，并说明内容和表达作用。', point: 1 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u6-writing-appropriate', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·古诗文）', section: '写作：表达要得体', directoryUrl: chinese8a,
    evidence: ['本地目录列明第六单元写作专题表达要得体；本组围绕交流对象、场合、目的和措辞调整原创命题。'],
    points: [['对象与场合', '根据交际对象、关系和场合选择称呼、语气及表达方式。'], ['目的与措辞', '围绕沟通目的准确表达请求、感谢、提醒或建议。']],
    questions: [
      { prompt: '给不太熟悉的老师发消息请教作业问题，哪种开头更得体？', options: ['老师您好，我想请教一道作业题，您方便时能否帮我看看？', '喂，快告诉我这题答案。', '你必须马上回复我。', '老师我不说题目，你猜我想问什么。'], answerIndex: 0, explanation: '礼貌称呼、说明目的并尊重对方时间，符合交际对象和场合。', point: 0 },
      { prompt: '班级通知提醒同学按时交材料，哪种表达更清楚得体？', options: ['请在周五放学前把材料交到班长处，如有困难请提前说明。', '谁不交谁就很差劲。', '赶紧交，别问原因。', '大家都知道该怎么办，不用写时间。'], answerIndex: 0, explanation: '清楚说明时间、地点和沟通方式，语气也保持尊重。', point: 1 },
      { prompt: '向同学提出改进建议，怎样更容易被接受？', options: ['先说明具体情况，再用尊重的语气提出可操作建议', '当众给对方贴负面标签', '只说你做得不行', '在建议中加入无关的旧事'], answerIndex: 0, explanation: '针对具体事情提出可实行建议，避免伤害对方或偏离沟通目的。', point: 1 },
      { prompt: '同一句请求发给朋友和正式机构时，为什么措辞可能不同？', options: ['对象关系、场合和交际目的不同，需要调整称呼与语气', '语言得体只取决于句子长度', '正式场合可以省略所有关键信息', '对朋友必须使用公文格式'], answerIndex: 0, explanation: '得体表达要考虑对象、关系、场合和目的。', point: 0 },
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8a-u6-poetry', grade: '初二', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·古诗文）', section: '课外古诗词诵读：浣溪沙（一曲新词酒一杯）；采桑子（轻舟短棹西湖好）；相见欢（金陵城上西楼）；如梦令（常记溪亭日暮）', directoryUrl: chinese8a,
    evidence: ['本地目录逐项列出本册第六单元课外词作；本组按四首作品的景物、时间意识、家国情怀和叙事回忆原创命题。'],
    points: [['词中景物与情境', '由西湖、溪亭等画面理解词作的情境和语气。'], ['情感与思想', '结合关键句体会惜时、忧思、家国关怀和回忆之情。']],
    questions: [
      { prompt: '晏殊《浣溪沙》（一曲新词酒一杯）写花落、燕归，主要引发怎样的感受？', options: ['对时光流逝和美好难以挽留的感慨', '对战争胜利的欢呼', '对远行登山的兴奋', '对农事丰收的记录'], answerIndex: 0, explanation: '熟悉景物的变化触发词人对时光流逝和人生感受的思考。', point: 1 },
      { prompt: '欧阳修《采桑子》（轻舟短棹西湖好）描绘西湖景色，整体情调更接近哪一项？', options: ['轻快闲适，表现泛舟赏景的愉悦', '悲愤激昂，描写战场厮杀', '紧张焦急，记录赶路过程', '肃穆庄严，介绍礼仪制度'], answerIndex: 0, explanation: '轻舟、短棹和湖光景物共同营造悠然赏景的情境。', point: 0 },
      { prompt: '朱敦儒《相见欢》（金陵城上西楼）由登楼望景转向忧思，主要体现什么情感？', options: ['对国家局势和山河命运的忧虑', '对宴席美味的满足', '对童年游戏的怀念', '对田园丰收的喜悦'], answerIndex: 0, explanation: '词中由秋景转入中原局势和山河之思，寄寓家国忧患。', point: 1 },
      { prompt: '李清照《如梦令》（常记溪亭日暮）回忆游赏经历，哪种概括最符合词意？', options: ['追忆溪亭游玩和归舟情景，语气活泼而富有生活趣味', '说明一次正式朝会的流程', '描写冬日边塞行军', '议论国家制度的得失'], answerIndex: 0, explanation: '词作以回忆游赏经历展开，动作和场景带有轻快活泼的情趣。', point: 0 },
    ],
  },
]

const english7aLeafRebuilds: GapSeed[] = [
  ...([
    {
      id: 'leaf-rebuild-2026-english-7a-u1-get-to-know', volume: '上册', chapter: 'Unit 1 You and Me', section: 'How do we get to know each other?',
      evidence: '按国家中小学智慧教育平台七上电子课本和教育部教材目录核对；人教社初中英语新版结构说明用于核对现行单元任务。练习围绕初次见面、自我介绍和基础问答原创编写。',
      points: [['自我介绍', '使用姓名、年级、家乡和兴趣等信息进行简短介绍。'], ['初次交谈', '用礼貌问候和简单问题建立交流。']],
      questions: [
        ['Which is a polite way to introduce yourself?', 'Hello, I’m Emma. Nice to meet you.', 'Give me your name now.', 'You are Emma, right?', 'I do not know you.', '礼貌介绍先问候并提供自己的信息。'],
        ['A: Nice to meet you. B: ____', 'Nice to meet you, too.', 'I am thirteen.', 'It is my book.', 'At school.', 'Nice to meet you, too 是对初次见面的自然回应。'],
        ['Which question asks where a new friend comes from?', 'Where are you from?', 'How old is your bag?', 'What time is the library?', 'Who is your teacher like?', 'Where are you from 用来询问来自哪里。'],
        ['Which answer gives a clear self-introduction?', 'I’m Leo. I’m in Class 2, and I like drawing.', 'Yes, it is over there.', 'At half past seven.', 'Because it is blue.', '姓名、班级和兴趣都是介绍自己的相关信息。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u1-new-friend', volume: '上册', chapter: 'Unit 1 You and Me', section: 'What do we need to know about a new friend?',
      evidence: '依据国家平台七上英语目录中本单元的交友主题及人教社单元结构说明；题目围绕有意义的交友信息、兴趣描述和尊重交流原创编写。',
      points: [['了解朋友', '询问和介绍兴趣、特长及日常活动等合适信息。'], ['描述与比较', '用简单句说明共同点或不同点，尊重个人差异。']],
      questions: [
        ['Which is a suitable question when getting to know a classmate?', 'What do you like doing after school?', 'What is your home password?', 'How much money does your family have?', 'Can I read your private messages?', '兴趣和课外活动是合适的交友话题，私人信息不宜随意追问。'],
        ['Mia likes reading, and I like reading, too. What can we say?', 'We have the same hobby.', 'We are in different schools.', 'She is my English book.', 'Reading is a time.', '两人都喜欢阅读，说明有共同爱好。'],
        ['Which sentence describes a friend with a specific detail?', 'Ben often helps classmates with new words.', 'Ben is very, very nice.', 'Ben is a person.', 'Ben is the best because I say so.', '具体行为比空泛评价更能表现人物特点。'],
        ['Your new friend has a different hobby from yours. What is a friendly response?', 'That sounds interesting. Tell me more.', 'Your hobby is wrong.', 'You must like what I like.', 'I will not talk to you.', '尊重差异并主动倾听有助于建立友好交流。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u2-family-like', volume: '上册', chapter: 'Unit 2 We’re Family!', section: 'What is your family like?',
      evidence: '依据国家平台七上教材目录中家庭主题及人教社新版结构资料；题目围绕家庭成员、关系和简单事实描述原创编写。',
      points: [['家庭成员词汇', '用常见家庭称谓介绍家庭成员及彼此关系。'], ['家庭信息表达', '用清楚的简单句介绍家庭构成和共同生活。']],
      questions: [
        ['Your father’s mother is your ____.', 'grandmother', 'daughter', 'cousin', 'aunt', '父亲的母亲是祖母。'],
        ['Which sentence correctly describes a family?', 'There are four people in my family.', 'There is four people in my family.', 'My family are four people is.', 'Four people in family there.', '复数名词 people 与 there are 搭配。'],
        ['A: Who is the girl in the photo? B: ____', 'She is my sister.', 'It is my sister.', 'They are my sister.', 'He is my sister.', '用 she 指代照片中的女孩。'],
        ['Which question asks about family members?', 'Do you have any brothers or sisters?', 'What colour is your ruler?', 'Where is the playground?', 'When is the English lesson?', '该问句询问兄弟姐妹情况。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u2-family-values', volume: '上册', chapter: 'Unit 2 We’re Family!', section: 'What do you like about your family?',
      evidence: '依据国家平台七上教材目录的家庭主题；题目要求用具体行动表达家庭关系、感受和感谢，均为原创。',
      points: [['描述家庭特点', '用性格词语和具体事例介绍家人。'], ['表达情感', '说明欣赏或感谢家人的原因。']],
      questions: [
        ['Which sentence gives a reason for liking your family?', 'My family always listens to me when I need help.', 'My family is a word.', 'I like because family blue.', 'The family is under the desk.', '具体说明家人在需要时倾听，能支撑喜欢家庭的原因。'],
        ['Choose the correct possessive adjective: ____ brother is kind.', 'My', 'Me', 'I', 'Mine is', '名词 brother 前使用形容词性物主代词 my。'],
        ['Which is a kind way to show appreciation?', 'Thank you for helping me with my project.', 'You must help me every time.', 'I never notice your help.', 'Stop talking about it.', '感谢具体帮助比命令或忽视更得体。'],
        ['Which detail best shows that a family member is helpful?', 'She carries the books when my hands are full.', 'She has a blue coat.', 'She is a person in a room.', 'She likes a word.', '主动帮忙的具体行为能表现乐于助人。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u3-school-like', volume: '上册', chapter: 'Unit 3 My School', section: 'What is your school like?',
      evidence: '依据国家平台七上英语教材目录的校园主题；练习围绕校园设施、位置表达和学校特点原创编写。',
      points: [['校园设施', '识别常见校园场所并说明用途。'], ['位置表达', '用简单介词短语说明设施之间的位置关系。']],
      questions: [
        ['Where can students borrow books?', 'In the library.', 'In the playground.', 'In the dining hall.', 'In the office car park.', '图书馆是借阅图书的场所。'],
        ['The library is ____ the classroom and the music room.', 'between', 'under', 'during', 'because', 'between 用于说明位于两者之间。'],
        ['Choose the correct sentence about a school.', 'There is a science room on the second floor.', 'There are a science room on the second floor.', 'There be science room second floor.', 'It is science room between floor.', '单数名词 science room 与 there is 搭配。'],
        ['A visitor asks where the school office is. Which answer is clearest?', 'It is next to the main entrance.', 'It is very interesting.', 'At nine o’clock yesterday.', 'Because teachers work.', '位置介词短语能清楚回答地点问题。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u3-school-fun', volume: '上册', chapter: 'Unit 3 My School', section: 'What fun things do you do at school?',
      evidence: '依据国家平台七上英语教材目录的校园生活主题；题目围绕活动介绍、时间安排和校园参与原创编写。',
      points: [['校园活动', '介绍在学校参加的活动及其时间。'], ['表达感受', '说明喜欢某项活动的原因并回应同伴。']],
      questions: [
        ['Which is a school activity?', 'We play basketball after class.', 'We sleep in the library all day.', 'We eat lunch at midnight.', 'We drive to the moon.', '课后打篮球是合理的校园活动。'],
        ['A: What do you do after class? B: ____', 'I often play chess with my friends.', 'It is next to the gate.', 'She is my aunt.', 'Because Monday.', '回答应说明课后经常进行的活动。'],
        ['Which sentence gives a reason for enjoying a school activity?', 'I like the school show because I enjoy singing.', 'The school show under the desk.', 'I like because it yesterday.', 'Singing is next to Friday.', 'because 引出喜欢活动的原因。'],
        ['Your classmate invites you to join a game. Which response is friendly?', 'Sure, that sounds fun!', 'No, your game is stupid.', 'I am a classroom.', 'It is at the library yesterday.', '积极而礼貌地回应邀请有助于日常交流。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u4-subject-why', volume: '上册', chapter: 'Unit 4 My Favourite Subject', section: 'Why do you like this subject?',
      evidence: '依据国家平台七上英语教材目录中的学科主题；题目围绕学科名称、喜好和 because 理由表达原创编写。',
      points: [['学科与偏好', '说明最喜欢的学科并给出具体原因。'], ['问答表达', '使用 Why 和 because 进行简单交流。']],
      questions: [
        ['A: Why do you like science? B: ____', 'Because I enjoy doing experiments.', 'It is on the desk.', 'At half past eight.', 'She is my cousin.', 'because 后接喜欢科学的原因。'],
        ['Which subject often teaches students about maps and places?', 'Geography', 'Music', 'Art', 'PE', 'Geography 学习地图和地理空间知识。'],
        ['Choose the correct spelling of the school subject.', 'history', 'histry', 'hystory', 'historey', 'history 是“历史”的正确拼写。'],
        ['Which answer gives a clear preference and reason?', 'My favourite subject is art because I like drawing.', 'My favourite subject because drawing.', 'Art is under my schoolbag.', 'I favourite subject yesterday.', '完整句子说明偏好并用 because 给出理由。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u4-subject-learning', volume: '上册', chapter: 'Unit 4 My Favourite Subject', section: 'What can you learn from different subjects?',
      evidence: '依据国家平台七上英语教材目录的学科学习主题；题目考查不同学科内容与学习收获的匹配，均为原创。',
      points: [['学科内容', '把学科与典型学习内容正确联系起来。'], ['表达学习收获', '说明不同学科怎样帮助理解世界或发展能力。']],
      questions: [
        ['In which subject might students learn about plants and animals?', 'Science', 'History', 'Music', 'Art', '科学课程通常学习动植物等自然现象。'],
        ['Which subject helps students practise rhythm and singing?', 'Music', 'Geography', 'Maths', 'History', '音乐课包含节奏和歌唱学习。'],
        ['What can students learn from history?', 'How people lived and how events changed society.', 'How to swim faster in a pool.', 'How to paint a wall only.', 'How to find a football field.', '历史学习帮助了解过去的生活与社会变化。'],
        ['Which sentence connects a subject with a learning benefit?', 'Maths helps me think carefully and solve problems.', 'Maths is under my lunch.', 'I learn because subject yesterday.', 'Problems are my cousin.', '句子清楚说明数学带来的学习能力。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u5-choose-club', volume: '上册', chapter: 'Unit 5 Fun Clubs', section: 'How do you choose a school club?',
      evidence: '依据国家平台七上英语教材目录中的社团主题；题目围绕兴趣、能力、选择理由和社团咨询原创编写。',
      points: [['兴趣与选择', '根据个人兴趣或目标选择适合的社团。'], ['提出问题', '用简单疑问句了解社团活动和参与条件。']],
      questions: [
        ['You enjoy painting. Which club may suit you best?', 'The art club.', 'The chess club.', 'The running club.', 'The cooking club.', '喜欢绘画的学生可以优先了解美术社团。'],
        ['Which question helps you learn about a school club?', 'What activities do you do in the club?', 'Where is my family from?', 'How old is the blackboard?', 'Why is the window a club?', '询问社团活动内容与选择直接相关。'],
        ['Ben likes science and building models. What is a good reason to join a science club?', 'He can explore ideas and make models with others.', 'He can avoid every lesson.', 'He can change the school rules alone.', 'He can borrow everyone’s lunch.', '社团活动应与兴趣和学习目标相联系。'],
        ['A: Which club do you want to join? B: ____', 'I want to join the music club because I love singing.', 'It is behind the school.', 'My sister is twelve.', 'At the end of the day.', '回答交代社团选择及理由，信息完整。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u5-club-learning', volume: '上册', chapter: 'Unit 5 Fun Clubs', section: 'What can you learn in a school club?',
      evidence: '依据国家平台七上英语教材目录中的社团主题；题目围绕社团技能、can 表达及合作学习原创编写。',
      points: [['能力表达', '用 can/can’t 说明能做或正在学习的事情。'], ['合作学习', '说明参加社团能练习的技能和合作方式。']],
      questions: [
        ['Choose the correct sentence.', 'I can play the guitar.', 'I can to play the guitar.', 'I cans play the guitar.', 'I am can play the guitar.', '情态动词 can 后接动词原形。'],
        ['What can students learn in a drama club?', 'They can practise speaking and acting together.', 'They can learn to measure rainfall only.', 'They can borrow books without reading.', 'They can sleep during every meeting.', '戏剧社团可以练习表达、表演与合作。'],
        ['A: Can you swim? B: ____', 'Yes, I can, but I am still learning.', 'Yes, I do swimming yesterday.', 'Yes, I am a club.', 'No, because at school.', 'can 问句可用 Yes, I can 回答，并补充真实情况。'],
        ['Which sentence describes a useful club goal?', 'We work together to make a short film.', 'We never talk to each other.', 'We join a club to miss every class.', 'We choose a club because it has no name.', '共同制作短片体现合作和明确的学习目标。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u6-school-day', volume: '上册', chapter: 'Unit 6 A Day in the Life', section: 'How do you spend your school day?',
      evidence: '依据国家平台七上英语教材目录中的日常作息主题；题目围绕时间表达、日程顺序和一般现在时原创编写。',
      points: [['日常作息', '按时间顺序描述一天中的学习和生活活动。'], ['时间表达', '正确使用常见钟点表达并理解日程信息。']],
      questions: [
        ['Choose the correct sentence.', 'I get up at seven every morning.', 'I gets up at seven every morning.', 'I getting up at seven every morning.', 'I get up in seven every morning.', '第一人称一般现在时用动词原形，钟点前用 at。'],
        ['What time is 7:30?', 'Half past seven.', 'A quarter to seven.', 'Half past eight.', 'Seven past thirty.', '7:30 可以表达为 half past seven。'],
        ['Which activity usually comes first in a school day?', 'I get ready and have breakfast before school.', 'I go home after dinner before I wake up.', 'I start class at midnight.', 'I have lunch before I get up.', '早餐和上学通常在课堂学习之前。'],
        ['A: When do you have your first lesson? B: ____', 'At eight o’clock.', 'In the library yesterday.', 'Because it is maths.', 'She has a lesson.', '问句询问时间，答语应提供具体钟点。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u6-routines-different', volume: '上册', chapter: 'Unit 6 A Day in the Life', section: "How different are people's daily routines?",
      evidence: '依据国家平台七上英语教材目录的日常生活主题；题目围绕频率副词、第三人称表达和作息比较原创编写。',
      points: [['频率表达', '用频率副词描述习惯并注意其在句中的位置。'], ['比较日常安排', '理解并比较不同人的作息，不把个体差异绝对化。']],
      questions: [
        ['Choose the correct sentence.', 'She usually walks to school.', 'She walk usually to school.', 'She is usually walk to school.', 'She usually walking to school.', '一般现在时第三人称单数使用 walks，usually 常置于实义动词前。'],
        ['Which word means “not often”?', 'Sometimes', 'Always', 'Usually', 'Never ever means every day', 'sometimes 表示有时，频率低于 usually。'],
        ['Lily gets up at 6:30. Tom gets up at 7:00. What can we say?', 'Lily gets up earlier than Tom.', 'Tom gets up earlier than Lily.', 'They get up at the same time.', 'Lily never gets up.', '6:30 早于 7:00，因此 Lily 起得更早。'],
        ['Which question asks about how often someone does an activity?', 'How often do you exercise?', 'Where do you exercise?', 'Who is your exercise teacher?', 'What colour is your exercise book?', 'How often 用来询问活动发生的频率。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u7-birthday-celebrate', volume: '上册', chapter: 'Unit 7 Happy Birthday!', section: 'How do we celebrate birthdays?',
      evidence: '依据国家平台七上英语教材目录中的生日主题；题目围绕日期、庆祝安排、邀请和礼貌回应原创编写。',
      points: [['日期和庆祝活动', '理解生日日期并介绍常见庆祝方式。'], ['邀请与回应', '发出简单邀请并作出礼貌回应。']],
      questions: [
        ['Which question asks about a birthday date?', 'When is your birthday?', 'Where is your birthday?', 'Who birthday is blue?', 'How many birthday are you?', 'When 用来询问生日日期。'],
        ['Which is a polite birthday invitation?', 'Would you like to come to my birthday party?', 'You must come to my party.', 'Give me your gift tomorrow.', 'My party is your homework.', 'Would you like to 是礼貌邀请表达。'],
        ['A: Thanks for inviting me. B: ____', 'You’re welcome. I’m glad you can come.', 'You are a birthday.', 'It is under the cake.', 'No, I do not have a name.', '自然回应感谢并表达欢迎。'],
        ['Which detail is useful in a party invitation?', 'The date, time, place, and how to reply.', 'Only the colour of the paper.', 'A list of unrelated school subjects.', 'A secret password for another person.', '邀请需要包含日期、时间、地点等关键信息。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-u7-birthday-meaningful', volume: '上册', chapter: 'Unit 7 Happy Birthday!', section: 'How do you make your birthday meaningful?',
      evidence: '依据国家平台七上英语教材目录中的生日与生活主题；题目围绕关爱、感谢、合理安排和个人意义原创编写。',
      points: [['表达感谢和关爱', '用具体语言表达对家人或朋友的感谢。'], ['有意义的庆祝', '从分享、陪伴或帮助等行动思考庆祝的意义。']],
      questions: [
        ['Which birthday plan focuses on sharing with others?', 'I visit my grandparents and spend time with them.', 'I throw away the food after the party.', 'I invite nobody and complain all day.', 'I buy things without thinking.', '陪伴家人是有意义的生日安排。'],
        ['Which sentence expresses thanks clearly?', 'Thank you for making my birthday special.', 'You birthday is a ruler.', 'I thanks you yesterday every.', 'Because the party under.', 'Thank you for... 是表达感谢的正确结构。'],
        ['A friend cannot come to your party. What is a kind reply?', 'That’s OK. I hope we can celebrate another time.', 'You are not my friend now.', 'You must come even if you are ill.', 'I will never speak to you.', '体谅朋友情况并另约时间更友善得体。'],
        ['What can make a birthday meaningful?', 'Doing something kind and enjoying time with people we care about.', 'Receiving the most expensive gift only.', 'Making everyone follow one person’s plan.', 'Eating without sharing.', '生日的意义也可来自关爱、分享和陪伴。'],
      ],
    },
  ] as EnglishLeafSeed[]).map(makeEnglishLeaf),
]

const english7aSupplementLeafRebuilds: GapSeed[] = [
  ...([
    {
      id: 'leaf-rebuild-2026-english-7a-reading-plus', volume: '上册', chapter: '*Reading Plus', section: '*Reading Plus',
      evidence: '国家平台七上教材扫描件将 Reading Plus 列为扩展阅读板块；本组以略读、寻读和文本推断策略原创命题，不假称复现教材选文。',
      points: [['扩展阅读策略', '先获取主旨，再定位细节，并用上下文推断词义。'], ['文本证据', '从阅读材料中寻找信息支持理解和推断。']],
      questions: [
        ['You have one minute to read a new passage. What should you do first?', 'Read the title and first sentences to find the topic.', 'Look up every word before reading.', 'Copy the last line only.', 'Count the number of commas.', '先浏览标题和关键句有助于快速把握主旨。'],
        ['A passage says “Mia packed an umbrella. Dark clouds covered the sky.” What can we infer?', 'Mia thinks it may rain.', 'Mia is going swimming.', 'Mia lost her bag.', 'Mia is buying a cake.', '雨伞和乌云是推断可能下雨的文本线索。'],
        ['You need to find a person’s age in a passage. Which reading strategy is best?', 'Scan for numbers and age words.', 'Read every sentence aloud three times.', 'Start translating from the final paragraph.', 'Ignore all numbers.', '寻读能快速定位数字和年龄信息。'],
        ['You meet an unknown word in a story. What is a useful first step?', 'Use the nearby sentences and examples to guess its meaning.', 'Stop reading the whole passage.', 'Choose a meaning without checking context.', 'Assume every unknown word is a name.', '上下文和例句可以帮助推断生词含义。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-listening-scripts', volume: '上册', chapter: 'Listening Scripts', section: 'Listening Scripts',
      evidence: '国家平台七上英语教材扫描件列出 Listening Scripts；本组只训练听力材料的主旨、细节和复听核对策略，不伪造教材音频原文。',
      points: [['听力理解', '先判断场景和说话人，再捕捉时间、地点等关键词。'], ['复听核对', '根据上下文和问题复核听到的信息。']],
      questions: [
        ['Before listening to a dialogue, what is a helpful first step?', 'Read the questions and notice what information to listen for.', 'Close the book and forget the topic.', 'Choose answers before hearing anything.', 'Write a story unrelated to the audio.', '先看问题能帮助明确听力关注点。'],
        ['You hear “The meeting starts at a quarter past nine.” What time is it?', '9:15', '9:45', '8:15', '10:15', 'a quarter past nine 表示九点十五分。'],
        ['You are unsure whether a speaker said “Tuesday” or “Thursday”. What should you do?', 'Listen again and use the surrounding information to check.', 'Guess from the first letter only.', 'Select both days.', 'Ignore the question.', '复听并结合上下文能帮助区分相近信息。'],
        ['A short dialogue mentions a bus stop, a ticket, and a city map. What is it probably about?', 'Getting around a city.', 'Choosing a birthday cake.', 'Doing a science experiment.', 'Describing a family photo.', '这些关键词共同指向城市出行场景。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-pronunciation', volume: '上册', chapter: 'Pronunciation', section: 'Pronunciation',
      evidence: '国家平台七上英语教材扫描件列出 Pronunciation 板块；本组训练音节、词重音和语调等基础发音意识，不超出初中入门层次。',
      points: [['语音意识', '注意音节和词重音，模仿标准示范读音。'], ['语调与理解', '结合问句类型和语意使用自然语调。']],
      questions: [
        ['Which practice can help you learn a new word’s pronunciation?', 'Listen to a reliable model and repeat the sounds carefully.', 'Read the spelling silently once and guess.', 'Change the word to a familiar one.', 'Ignore the final sound.', '听取标准示范并跟读能帮助建立准确读音。'],
        ['When a word has more than one syllable, what should you notice?', 'Which syllable is stressed.', 'How many letters are blue.', 'Whether the word is at the end of a page.', 'The speaker’s favourite subject.', '多音节词要注意重读音节。'],
        ['Which sentence usually has rising intonation at the end?', 'Are you ready?', 'I am ready.', 'My name is Anna.', 'We have English today.', '一般疑问句常使用句末升调。'],
        ['Why should you practise sentence stress?', 'It helps listeners notice important information.', 'It changes every noun into a verb.', 'It makes all words equally loud.', 'It removes the meaning of a sentence.', '句子重音能突出关键信息，帮助听者理解。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-grammar', volume: '上册', chapter: 'Grammar', section: 'Grammar',
      evidence: '国家平台七上英语教材扫描件将 Grammar 列为语法整理板块；本组使用七年级基础句型和名词、代词、be 动词等原创练习。',
      points: [['基础句型', '掌握 be 动词、代词和常见疑问句的基本搭配。'], ['语法在语境中的运用', '依据主语、名词单复数和句意选择正确形式。']],
      questions: [
        ['Choose the correct sentence.', 'She is my classmate.', 'She are my classmate.', 'She am my classmate.', 'She be my classmate.', '第三人称单数 she 与 is 搭配。'],
        ['This is ____ schoolbag. The schoolbag belongs to me.', 'my', 'me', 'I', 'mine is', '名词前使用形容词性物主代词 my。'],
        ['Choose the correct question.', 'Are they in Class 3?', 'Is they in Class 3?', 'They are in Class 3?', 'Do they are in Class 3?', '主语 they 的 be 动词疑问句使用 are 提前。'],
        ['There ____ two books on the desk.', 'are', 'is', 'am', 'be', 'two books 是复数，there be 结构使用 are。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-vocabulary-units', volume: '上册', chapter: 'Vocabulary in Each Unit', section: 'Vocabulary in Each Unit',
      evidence: '国家平台七上英语教材扫描件列出 Vocabulary in Each Unit；本组围绕单元主题词汇、语境选词和常见搭配原创命题。',
      points: [['主题词汇', '将家庭、校园、学科、活动和日常生活词汇放入语境理解。'], ['词汇搭配', '根据句意选择自然、准确的词语搭配。']],
      questions: [
        ['My mother’s sister is my ____.', 'aunt', 'uncle', 'brother', 'grandfather', '母亲的姐妹是 aunt。'],
        ['We borrow books from the ____.', 'library', 'playground', 'kitchen', 'bus stop', '借书通常在 library。'],
        ['Choose the natural phrase.', 'do homework', 'make homework', 'play homework', 'go homework', 'do homework 是常见搭配。'],
        ['The sentence is “I ____ breakfast at seven.” Which word fits?', 'have', 'draw', 'read', 'open', 'have breakfast 是常用搭配。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7a-vocabulary-az', volume: '上册', chapter: 'Vocabulary A-Z', section: 'Vocabulary A-Z',
      evidence: '国家平台七上英语教材扫描件列出 Vocabulary A-Z 词汇表；本组练习按字母序查词、利用词性和例句理解词义，题目为原创。',
      points: [['词汇表使用', '按字母顺序查找单词并利用词性、释义和例句。'], ['词义辨析', '结合语境选择符合句意的词义和用法。']],
      questions: [
        ['Which word comes first in an A-Z word list?', 'apple', 'school', 'family', 'zoo', '词汇按首字母顺序排列，a 在 f、s、z 之前。'],
        ['In a dictionary entry, what does “n.” usually show?', 'The word is a noun.', 'The word is a number.', 'The word is a question.', 'The word is a name only.', '词典缩写 n. 通常表示名词。'],
        ['A dictionary example says “They play tennis after school.” What does “play” mean here?', 'Take part in a game or sport.', 'Make a school building.', 'Read a dictionary.', 'Sleep in a classroom.', '例句中 play 与 tennis 搭配，表示进行运动。'],
        ['You need the meaning of “quiet”. Which entry information is most useful?', 'Its definition and example sentence.', 'The colour of the page.', 'The number of letters in “quiet”.', 'The word printed below it.', '释义和例句能帮助理解词义及实际用法。'],
      ],
    },
  ] as EnglishLeafSeed[]).map(makeEnglishLeaf),
]

const english7bLeafRebuilds: GapSeed[] = [
  ...([
    {
      id: 'leaf-rebuild-2026-english-7b-u1-project-zoo', volume: '下册', chapter: 'Unit 1 Animal Friends', section: 'Project: Design a zoo',
      evidence: '本地现行七下目录列出该项目；人教社新版英语教材结构说明用于核对项目式学习板块。题目围绕动物需求、栖息环境和园区介绍原创编写。',
      points: [['动物与栖息环境', '根据动物特点设计合适、安全的生活空间。'], ['项目表达', '用地图、标签和简短说明介绍设计。']],
      questions: [
        ['What should you consider first when designing a space for an animal?', 'Its habitat and living needs.', 'Only the colour of the gate.', 'The visitors’ favourite songs.', 'How to keep the animal without food.', '动物的生活需求和栖息环境是设计的重要依据。'],
        ['Which sign is most useful beside a penguin habitat?', 'Please keep the area cool and do not feed the animals.', 'This is a music classroom.', 'The library closes at five.', 'Please leave all doors open.', '提示应与企鹅的生活环境和游客行为相关。'],
        ['A zoo map shows the lion area next to the exit. Which sentence describes it?', 'The lion area is next to the exit.', 'The lion area are the exit.', 'The exit is eating a lion.', 'There next to lion.', '单数主语 area 与 is 搭配，并用 next to 表示位置。'],
        ['How can a group present its zoo plan clearly?', 'Show the map and explain why each habitat suits the animals.', 'Read unrelated words without showing the plan.', 'Hide the animal names.', 'Let one person speak while others change the map.', '展示地图并解释设计理由，能清楚呈现项目成果。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u2-project-class-rules', volume: '下册', chapter: 'Unit 2 No Rules, No Order', section: 'Project: Make class rules',
      evidence: '本地现行七下目录列出制定班级规则项目；人教社新版英语教材结构说明确认初中英语新教材采用项目任务。题目围绕规则表述、公平性和合作制定原创。',
      points: [['规则表达', '使用清楚、可执行的语言描述班级规则。'], ['协商与责任', '讨论规则目的、公平性和共同遵守方式。']],
      questions: [
        ['Which class rule is the clearest?', 'Please put your rubbish in the bin.', 'Be better in every possible way.', 'Do something sometime.', 'The classroom is a rule.', '规则应明确说明要做的行为。'],
        ['Choose the correct sentence.', 'Students must listen when a classmate is speaking.', 'Students must to listen when a classmate is speaking.', 'Students must listens to a classmate.', 'Students are must listen.', '情态动词 must 后接动词原形。'],
        ['Why should students discuss class rules together?', 'So the rules can be clear, fair, and understood by everyone.', 'So only one student can make every decision.', 'So the class can avoid all learning.', 'So the rules can change every minute.', '共同讨论有助于理解规则并考虑公平性。'],
        ['A rule is difficult for some students to follow. What is a good next step?', 'Discuss the problem and revise the rule fairly.', 'Blame the students without listening.', 'Hide the rule from the class.', 'Add more unclear words.', '发现问题后共同讨论并公平修订更合理。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u3-project-exercise-habits', volume: '下册', chapter: 'Unit 3 Keep Fit', section: 'Project: Compare exercise habits',
      evidence: '本地现行七下目录列出比较锻炼习惯项目；题目训练调查提问、频率表达、数据概括和健康交流。',
      points: [['调查与频率', '使用 how often 和频率表达收集运动习惯信息。'], ['比较与结论', '依据实际数据比较并提出合理的健康建议。']],
      questions: [
        ['Which question is best for a survey about exercise habits?', 'How often do you exercise each week?', 'What colour is your sports bag?', 'Where did you buy your lunch?', 'Who is the tallest person in the class?', '该问题直接调查运动频率。'],
        ['A chart shows that 8 students walk to school and 3 ride a bike. Which statement is correct?', 'More students walk to school than ride a bike.', 'More students ride a bike than walk.', 'No students walk to school.', 'The chart shows everyone runs.', '8 大于 3，因此步行人数更多。'],
        ['Choose the correct sentence.', 'He exercises twice a week.', 'He exercise twice a week.', 'He exercising twice a week.', 'He do exercises twice a week.', '第三人称单数一般现在时中 exercise 加 -s。'],
        ['Which advice is reasonable after the survey?', 'Try to include regular activity in your week.', 'Stop sleeping so you can exercise all night.', 'Exercise only once a year.', 'Never drink water after exercise.', '规律活动是合理建议，极端做法不健康。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u4-project-menu', volume: '下册', chapter: 'Unit 4 Eat Well', section: 'Project: Create a restaurant menu',
      evidence: '本地现行七下目录列出餐馆菜单项目；题目围绕食物词汇、健康搭配、菜单信息和礼貌点餐原创编写。',
      points: [['菜单设计', '组织主食、蔬菜和饮品等信息，兼顾清楚与健康。'], ['点餐交流', '理解菜单项目并使用礼貌的点餐表达。']],
      questions: [
        ['Which menu is the most balanced?', 'Rice, vegetables, fish, and water.', 'Only three cakes and soda.', 'Only one kind of candy.', 'A plate with no food name.', '主食、蔬菜、蛋白质食物和水搭配较均衡。'],
        ['Choose the correct sentence.', 'How much is the soup?', 'How many is the soup?', 'How much are the soup?', 'How soup costs are?', '不可数名词 soup 询问价格可用 How much is...?'],
        ['A customer wants to order politely. What can they say?', 'I’d like a bowl of noodles, please.', 'Give noodles now!', 'You must bring me food.', 'I am a menu yesterday.', 'I’d like... please 是礼貌点餐表达。'],
        ['What information should a menu show clearly?', 'The dish name and its price.', 'The server’s favourite song only.', 'A list of unrelated school rules.', 'The weather from last month.', '菜名和价格是菜单中的关键信息。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u5-project-flats', volume: '下册', chapter: 'Unit 5 Here and Now', section: 'Project: Draw a group of flats',
      evidence: '本地现行七下目录列出住宅布局图项目；题目训练房间词汇、位置介词、there be 句型和图示说明。',
      points: [['居住空间词汇', '认识常见房间、家具和住宅设施。'], ['布局描述', '使用 there be 和位置表达说明平面图。']],
      questions: [
        ['Where do people usually cook dinner?', 'In the kitchen.', 'In the bedroom.', 'In the bathroom.', 'In the lift.', 'kitchen 是做饭的厨房。'],
        ['Choose the correct sentence for a flat plan.', 'There is a sofa in the living room.', 'There are a sofa in the living room.', 'There is sofa are living room.', 'There be sofas is a room.', '单数名词 sofa 与 there is 搭配。'],
        ['The table is ____ the sofa and the window.', 'between', 'during', 'because', 'always', 'between 表示位于沙发和窗户之间。'],
        ['How can you make a flat drawing easy to understand?', 'Add room labels and explain where the furniture is.', 'Remove all labels and names.', 'Draw furniture outside the page.', 'Use the same word for every room.', '房间标签和家具位置说明能帮助读者理解平面图。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u6-project-weather-report', volume: '下册', chapter: 'Unit 6 Rain or Shine', section: 'Project: Give a live weather report',
      evidence: '本地现行七下目录列出天气播报项目；题目围绕天气词汇、温度、未来预报和出行建议原创编写。',
      points: [['天气信息', '听懂或报告天气状况、温度和时间地点。'], ['播报与建议', '根据天气信息提供清楚、合理的生活建议。']],
      questions: [
        ['Which sentence describes rain?', 'It is raining, so take an umbrella.', 'It is sunny with no clouds.', 'It is snowing in the kitchen.', 'The wind is eating lunch.', '下雨时带伞是与天气相符的建议。'],
        ['The temperature is 5°C. What should a weather report say?', 'It is quite cold; wear a warm coat.', 'It is very hot; wear a swimsuit.', 'It is dry inside the fridge.', 'The temperature is a classroom.', '5°C 属于较冷的天气，保暖建议合理。'],
        ['Which phrase is useful for talking about tomorrow’s forecast?', 'It will be cloudy tomorrow.', 'It was cloudy tomorrow.', 'It clouds every tomorrow.', 'Tomorrow is cloud yesterday.', 'will be 可用于表达未来天气预报。'],
        ['What makes a weather report easy to follow?', 'Give the place, time, weather, and useful advice in order.', 'Use weather words without naming the place.', 'Change the temperature each time you speak.', 'Read the report as fast as possible.', '按地点、时间、天气和建议组织信息会更清楚。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u7-project-chain-story', volume: '下册', chapter: 'Unit 7 A Day to Remember', section: 'Project: Write a chain story about a memorable day',
      evidence: '本地现行七下目录列出难忘一天接龙故事项目；题目训练过去时、时间顺序、情节衔接和合作续写原创。',
      points: [['叙事顺序', '使用时间连接词安排事件的先后和因果。'], ['故事接续', '延续已有情节和人物信息，保持语篇连贯。']],
      questions: [
        ['Which phrase helps show what happened next?', 'After that,', 'Under the desk,', 'Because blue,', 'At the library’s age,', 'After that 用来连接后续事件。'],
        ['Choose the correct past-tense sentence.', 'We visited the museum last Saturday.', 'We visit the museum last Saturday.', 'We visiting the museum last Saturday.', 'We visits the museum last Saturday.', 'last Saturday 表示过去时间，动词使用过去式 visited。'],
        ['A chain story begins with “Lily missed the bus.” What is a logical next event?', 'She called her dad and explained what happened.', 'She was already on a plane to the moon.', 'The bus turned into a birthday cake.', 'The story changed to a different family with no link.', '打电话说明情况能自然承接错过公交的情节。'],
        ['How can a group keep a chain story coherent?', 'Remember the characters and events written by earlier group members.', 'Change the main character in every sentence.', 'Ignore the story’s setting.', 'Write unrelated endings at the same time.', '续写时需保持人物和已发生事件一致。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-u8-project-short-play', volume: '下册', chapter: 'Unit 8 Once upon a Time', section: 'Project: Create and perform a short play',
      evidence: '本地现行七下目录列出短剧创编与表演项目；题目围绕角色、对话、舞台提示和团队呈现原创编写。',
      points: [['剧本结构', '通过角色、对话和必要的舞台提示呈现故事。'], ['表演协作', '合理分工、清楚发音并配合舞台行动。']],
      questions: [
        ['What does a character’s name before a line show in a play script?', 'Who is speaking.', 'Where the audience sits.', 'How many pages the play has.', 'Which subject the class studies.', '角色名标明接下来由谁说话。'],
        ['Which line is a stage direction?', '[She opens the door and looks outside.]', '“Where are you going?”', 'I like apples.', 'The story is very old.', '方括号中的动作说明属于舞台提示。'],
        ['A short play feels confusing because characters appear without introduction. What can help?', 'Introduce the main characters and their roles at the beginning.', 'Remove every character name.', 'Make all characters say the same line.', 'Change the setting in each sentence.', '介绍人物和角色能帮助观众理解剧情。'],
        ['How can a group prepare for a clear performance?', 'Practise the lines, timing, and actions together.', 'Let everyone speak at once.', 'Skip rehearsal and hide the script.', 'Ask the audience to guess every word.', '排练台词、节奏和动作有助于清晰呈现。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-english-7b-reading-plus', volume: '下册', chapter: '*Reading Plus（选学）', section: '*Reading Plus（选学）',
      evidence: '本地现行七下目录标注 Reading Plus 为选学阅读；本组训练主旨、细节和语境推断策略，不声称复现教材选文。',
      points: [['扩展阅读', '通过略读和寻读获取主旨及指定细节。'], ['语境推断', '利用上下文和文本证据理解信息与词义。']],
      questions: [
        ['You want to know what a passage is mainly about. What should you do?', 'Read the title and the main ideas of the paragraphs.', 'Count every letter in the first sentence.', 'Read only the last word.', 'Look at the page number.', '标题和段落主旨有助于把握全文主题。'],
        ['A passage says “Sam put on boots and carried a snow shovel.” What is likely true?', 'There is snow or icy weather.', 'Sam is going swimming.', 'Sam is setting a birthday table.', 'Sam is drawing a school map.', '靴子和雪铲是判断天气寒冷或有雪的线索。'],
        ['You need to find where an event happened. Which strategy is useful?', 'Scan the text for place names and location phrases.', 'Translate every word before looking for places.', 'Read the passage backwards.', 'Ignore all names.', '寻读地名和地点短语能快速定位地点信息。'],
        ['A word is unfamiliar, but the next sentence gives an example. What can you do?', 'Use the example and surrounding sentences to infer the meaning.', 'Stop and skip the whole page.', 'Choose the longest dictionary meaning.', 'Assume the word means “school”.', '上下文示例有助于推断生词含义。'],
      ],
    },
  ] as EnglishLeafSeed[]).map(makeEnglishLeaf),
]

const politics7aLeafRebuilds: GapSeed[] = [
  ...([
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l1-middle-school', chapter: '第一单元 少年有梦 / 第一课 开启初中生活', section: '奏响中学序曲', evidence: politics7aEvidence,
      points: [['新阶段与新机会', '认识初中生活带来的学习、交往和实践机会。'], ['积极适应', '以主动、开放的态度迎接新环境和新要求。']],
      questions: [
        ['初中生活带来的新变化，哪项最能体现成长机会？', '可以参加社团、探索新知识并尝试社会实践', '只要换一套课本，其他都不会变化', '所有学习任务都会自动完成', '不需要认识新同学和新老师', '课程、社团和实践为发展兴趣、能力及交往提供新机会。'],
        ['面对初中课程和活动增加，较积极的做法是什么？', '了解学校资源并主动尝试适合自己的学习和活动', '因为不熟悉就拒绝一切新事物', '等别人替自己作完所有选择', '只关注同学的成绩变化', '主动了解并参与有助于适应新阶段。'],
        ['小明既感到期待又有些紧张，这说明他应该怎样看待开学？', '把紧张当作适应新环境时可能出现的感受，并逐步熟悉生活', '说明他不适合上初中', '必须马上消除所有情绪', '只能通过逃避新任务解决', '新阶段出现复杂感受并不异常，可以通过行动逐步适应。'],
        ['初中生获得更多自主空间后，怎样体现新的身份责任？', '安排好学习生活，并对自己的选择和行为负责', '把所有决定都交给父母', '认为自由意味着不必遵守规则', '只完成自己喜欢的活动', '自主发展与责任相连，需要管理时间并承担行为后果。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l1-planning', chapter: '第一单元 少年有梦 / 第一课 开启初中生活', section: '规划初中生活', evidence: politics7aEvidence,
      points: [['规划目标', '根据实际情况设定清楚、合理且有阶段性的目标。'], ['行动与调整', '把目标落实为具体行动，定期回顾并作必要调整。']],
      questions: [
        ['哪一项更像可执行的初中生活计划？', '每天整理课堂笔记，周末复盘本周薄弱内容', '以后我要做所有事情都第一名', '等到学期末再想想要做什么', '每天学习到深夜，不安排休息', '具体行动和时间安排使计划更容易落实。'],
        ['计划中的目标远超目前能力且没有步骤，最合适的修改方式是什么？', '分解成可实现的阶段目标并安排练习', '保留空泛目标，不需要行动', '把目标改成完全不努力', '要求别人代替自己完成', '阶段目标让长期方向与当前行动连接起来。'],
        ['执行计划一段时间后发现课外时间估计错误，应怎样做？', '检查原因并调整安排，再继续落实重点目标', '认为计划一旦写下就绝不能改变', '把所有计划全部放弃', '隐瞒问题并责怪同学', '合理规划需要根据执行情况复盘和调整。'],
        ['为什么计划要结合自己的实际情况？', '合适的目标能调动行动，也更有可能坚持完成', '计划只要写得越长就越有效', '计划不需要考虑时间和能力', '所有人必须使用完全相同的计划', '考虑个人基础和资源有助于提高计划的可行性。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l2-self-knowledge', chapter: '第一单元 少年有梦 / 第二课 正确认识自我', section: '认识自己', evidence: politics7aEvidence,
      points: [['多角度认识自我', '结合自我观察、他人评价和实际表现形成较完整认识。'], ['客观对待评价', '既听取有价值的意见，也避免用单一评价定义自己。']],
      questions: [
        ['同学想更全面地认识自己的合作能力，哪种做法最有帮助？', '回顾合作经历，也听取可信同伴的具体反馈', '只看一次考试分数', '只听最熟悉的一位朋友说法', '根据网络点赞数判断', '自我观察、实际表现和他人反馈可以相互补充。'],
        ['别人提出具体、善意的建议时，较合适的回应是什么？', '先认真倾听，再结合事实判断是否采纳', '立即认为对方一定正确', '因为不舒服就拒绝思考', '把建议转述成对自己的全部评价', '理性对待评价既不盲从，也不因情绪完全排斥。'],
        ['小华数学暂时不擅长，哪种自我认识更客观？', '我目前这部分还需要练习，但可以通过努力逐步改进', '我在所有方面都不行', '一次测验决定我永远学不会', '别人都比我优秀，所以我不必尝试', '把当前困难和整体能力区分开，认识会更客观。'],
        ['为什么认识自己需要结合实际行动？', '行动表现能提供了解兴趣、能力和不足的具体依据', '行动会妨碍别人评价自己', '只要记住一个形容词就够了', '实际表现与自我认识没有关系', '持续观察真实行为有助于形成具体、可信的自我认识。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l2-better-self', chapter: '第一单元 少年有梦 / 第二课 正确认识自我', section: '做更好的自己', evidence: politics7aEvidence,
      points: [['接纳与改进', '接纳真实的自己，同时以行动改进可以改变的方面。'], ['发展潜能', '通过学习、实践和持续尝试发展自身潜能。']],
      questions: [
        ['接纳自己是否意味着不再改变？', '不是，接纳现状的同时仍可努力改进不足', '是，接纳后不需要任何行动', '只有先变得完美才能接纳自己', '接纳自己要求拒绝他人帮助', '接纳自我与积极改进并不矛盾。'],
        ['小组展示时小林害怕发言，怎样做更可能逐步进步？', '先准备简短内容，在小组中练习，再尝试全班发言', '以后永远不参加表达活动', '要求同学替自己完成所有发言', '一次紧张就认定自己没有表达能力', '循序渐进的练习能积累经验、发展能力。'],
        ['哪种做法更有利于发现自己的潜能？', '主动参加新活动并回顾自己学会了什么', '只重复最熟悉的事情', '等别人替自己发现所有优点', '因为第一次做不好就马上放弃', '尝试和反思可以帮助认识并发展潜能。'],
        ['和过去的自己比较进步，主要有什么意义？', '看见努力带来的变化，增强继续改进的信心', '证明自己永远不会遇到困难', '说明不再需要新的目标', '让别人都必须和自己比较', '关注自身进步有助于保持动力，而不是否认挑战。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l3-dreams', chapter: '第一单元 少年有梦 / 第三课 梦想始于当下', section: '做有梦想的少年', evidence: politics7aEvidence,
      points: [['梦想与现实', '把个人梦想同自身实际、社会需要和长期努力联系起来。'], ['梦想指引行动', '用清晰方向激励当下学习和实践。']],
      questions: [
        ['怎样看待梦想与现实之间的差距？', '把差距转化为可以逐步完成的学习和实践任务', '有差距就说明梦想没有价值', '只等待环境替自己实现梦想', '为了梦想放弃所有现实责任', '梦想需要面对现实并通过持续行动逐步接近。'],
        ['哪种梦想更容易成为行动方向？', '我希望成为能解决实际问题的工程师，先学好数学和科学', '我希望所有人都听我的', '我希望明天不做任何事却获得成功', '我希望从不遇到新任务', '清晰方向和当前行动使梦想具有可实践性。'],
        ['少年树立梦想时，怎样处理个人理想与社会需要的关系？', '努力提升自己，也思考如何用所学服务他人和社会', '只考虑名气，不考虑责任', '认为个人发展与社会毫无关系', '要求别人替自己实现理想', '个人理想可以在承担责任和服务社会中获得更丰富的意义。'],
        ['朋友的梦想与自己的不同，较合适的态度是什么？', '尊重差异，并鼓励彼此为各自目标努力', '要求朋友必须追求同一个目标', '嘲笑不熟悉的梦想', '只比较谁的梦想更容易出名', '尊重个体差异有助于形成积极支持的关系。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u1-l3-learning-dream', chapter: '第一单元 少年有梦 / 第三课 梦想始于当下', section: '学习成就梦想', evidence: politics7aEvidence,
      points: [['学习与发展', '认识学习为成长、探索和实现人生目标提供重要基础。'], ['学会学习', '主动发现问题、合理安排并坚持改进学习方法。']],
      questions: [
        ['学习怎样帮助人逐步接近梦想？', '增长知识和能力，使目标逐步转化为现实行动', '保证所有愿望不经努力就实现', '让人不必参与社会生活', '只用于和别人比较分数', '学习能发展实现目标所需的知识、能力和方法。'],
        ['复习后仍有一类题目经常出错，下一步较有效的做法是什么？', '整理错因并针对薄弱点练习，再检查是否改进', '只抄正确答案，不分析原因', '以后跳过所有类似题目', '把错误归咎于整门学科', '分析错因并针对练习有助于改进学习。'],
        ['哪种做法体现主动学习？', '带着问题阅读材料并尝试用自己的话解释', '等待别人把所有知识讲完才开始思考', '只记页码不看内容', '遇到疑问就停止学习', '提出问题、理解并表达是主动学习的表现。'],
        ['学习计划中安排休息和复习的作用是什么？', '帮助维持学习状态并巩固所学内容', '保证不用再完成任务', '让每门课都可以不复习', '使计划不需要检查', '合理安排有助于持续学习和巩固知识。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l4-home-meaning', chapter: '第二单元 成长的时空 / 第四课 幸福和睦的家庭', section: '家的意味', evidence: politics7aEvidence,
      points: [['家的意义', '理解家庭给予成员归属、关爱和成长支持。'], ['家庭责任', '认识家庭生活需要成员相互关心并承担适当责任。']],
      questions: [
        ['小安搬家后仍把家人互相支持称作家的重要意义，体现什么？', '家既有生活空间，也包含亲情、归属和支持', '家只由房屋面积决定', '有了网络就不需要家人', '家庭成员无需互相关心', '家庭的意义不只在居住空间，也在亲情和相互支持。'],
        ['家人遇到困难时，哪种做法更能体现家庭关爱？', '主动倾听并在能力范围内提供帮助', '嘲笑对方不够坚强', '只关心自己的安排', '要求家人隐瞒所有问题', '理解和适当帮助体现家庭成员间的关爱。'],
        ['为什么家庭责任需要成员共同承担？', '共同分担能增进理解并让家庭生活更有秩序', '责任只属于年龄最大的成员', '做家务会取消亲情', '只要住在一起就不需要沟通', '共同承担责任有助于维持家庭生活并增进成员关系。'],
        ['哪项最能体现对家庭长辈的尊重？', '耐心听取长辈讲述，并礼貌表达自己的想法', '认为长辈的所有意见都不必听', '只在需要帮助时联系长辈', '替长辈决定所有事情而不沟通', '尊重包括倾听、交流和关心，而非简单替代对方作决定。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l4-family-better', chapter: '第二单元 成长的时空 / 第四课 幸福和睦的家庭', section: '让家更美好', evidence: politics7aEvidence,
      points: [['家庭沟通', '用倾听、表达和协商处理家庭成员间的分歧。'], ['共同建设家庭', '成员根据能力分担责任，营造相互支持的家庭氛围。']],
      questions: [
        ['家人对周末安排意见不同，哪种处理方式更合适？', '说清各自需要并协商一个大家都能接受的安排', '大声争吵直到一方沉默', '假装同意后故意不参加', '让最小的家庭成员独自决定', '表达需要并协商有助于处理分歧。'],
        ['哪项行动有助于让家庭生活更有秩序？', '家庭成员商量家务分工并按约定完成', '所有家务都等一个人处理', '每个人都不说自己的安排', '认为家庭规则只适用于别人', '协商分工和履行约定有助于共同建设家庭。'],
        ['数字设备怎样更好地服务家庭沟通？', '用视频通话关心异地家人，同时安排面对面交流', '用设备替代所有关心和倾听', '未经同意公开家人隐私', '只在需要钱时联系家人', '技术可以拓展联系，但真诚沟通仍需要关注和尊重。'],
        ['家庭成员提出不同意见时，哪种表达更有建设性？', '我担心时间不够，我们能不能一起调整计划？', '你从来都不对。', '我不听，也不解释。', '你们必须照我的安排做。', '说明具体担心并提出协商建议更容易解决问题。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l5-near-teachers', chapter: '第二单元 成长的时空 / 第五课 和谐的师生关系', section: '走近老师', evidence: politics7aEvidence,
      points: [['理解教师职业', '认识教师承担教学和育人职责，工作方式可能各有特点。'], ['尊重与沟通', '尊重老师并通过恰当沟通增进理解。']],
      questions: [
        ['不同老师的课堂风格不一样，较合适的认识是什么？', '老师可以有不同教学方式，学生应主动适应并有效学习', '只有一种风格的老师才合格', '不喜欢风格就不必学习', '教学方式必须完全相同，否则无法评价老师', '不同风格不等于教学质量必然不同，可尝试理解并适应。'],
        ['想进一步理解课堂上没听懂的内容，怎样与老师交流？', '课后具体说明疑问并请老师解释', '当众打断并责怪老师', '在网上散布未经核实的猜测', '只说“我不会”，却不说明具体问题', '具体、尊重地提出疑问便于沟通和解决问题。'],
        ['老师指出小明作业中的错误，哪种反应更有助于学习？', '先了解错误原因，再根据反馈订正', '认为批评说明老师不关心自己', '把作业丢掉不再查看', '删掉错题记录，避免再次看到错误', '反馈可以帮助发现问题并改进学习。'],
        ['教师除了传授知识，还承担什么重要职责？', '引导学生成长并帮助发展能力和品格', '替学生决定所有人生选择', '保证学生永远不遇到困难', '学校只要求教师传授知识，不涉及学生成长', '教师在教学过程中也承担育人和成长引导职责。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l5-treasuring-relationship', chapter: '第二单元 成长的时空 / 第五课 和谐的师生关系', section: '珍惜师生情谊', evidence: politics7aEvidence,
      points: [['教学相长', '师生在教与学的互动中交流、反馈并共同进步。'], ['化解误会', '及时、诚恳沟通，尊重事实并理解彼此立场。']],
      questions: [
        ['学生向老师反馈自己哪里没有听懂，这有什么积极意义？', '师生能据此交流并改进教学和学习', '这会让学习完全不再需要努力', '老师必须替学生完成作业', '学生不应表达学习困难', '反馈帮助双方发现问题并改进教与学。'],
        ['小红误以为老师批评了她，怎样澄清更恰当？', '找合适时间说明自己的理解并认真听老师解释', '在班级群里先指责老师', '故意不完成后续任务', '让同学替自己传播猜测', '直接、尊重地沟通比传播猜测更能澄清误会。'],
        ['哪种行为更能珍惜师生情谊？', '尊重老师，也诚实表达学习中的困难和建议', '为了讨好老师隐瞒所有问题', '认为师生之间不能有不同意见', '只在成绩好时才礼貌交流', '良好师生关系建立在尊重和真诚交流上。'],
        ['老师邀请学生共同讨论班级阅读活动，学生参与体现什么？', '师生合作能促进理解和共同成长', '学生参与会取消教师职责', '只有老师能提出任何想法', '活动与学习没有关系', '共同参与有助于形成积极互动。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l6-meaning-friendship', chapter: '第二单元 成长的时空 / 第六课 友谊之树常青', section: '友谊的真谛', evidence: politics7aEvidence,
      points: [['友谊特质', '友谊建立在真诚、尊重、理解和相互支持之上。'], ['友谊与边界', '珍惜朋友同时尊重差异和个人边界。']],
      questions: [
        ['哪种关系最体现真诚友谊？', '朋友既能分享快乐，也能坦诚提醒彼此注意的问题', '朋友必须永远同意对方', '朋友之间不能有个人空间', '只有一起竞争才算友谊', '真诚支持也包括善意提醒，并尊重彼此。'],
        ['朋友没有选择你推荐的活动，怎样理解更合适？', '尊重朋友的兴趣不同，可以继续商量共同活动', '认定朋友不再珍惜友谊', '强迫朋友参加', '停止所有沟通', '尊重差异有助于维持平等、健康的友谊。'],
        ['朋友遇到困难时，哪种支持较恰当？', '认真倾听并询问对方需要什么帮助', '替对方公开私人经历', '只说你早就应该知道', '要求对方马上照自己的办法做', '倾听并了解真实需要，比未经同意替对方作决定更尊重。'],
        ['友谊为什么不意味着占有或控制对方？', '每个人都需要自主空间，友谊应建立在平等和尊重上', '朋友之间从不交流', '控制对方能保证关系永远不变', '朋友不应拥有其他关系', '尊重个人边界是健康关系的重要基础。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l6-friendship-wisdom', chapter: '第二单元 成长的时空 / 第六课 友谊之树常青', section: '交友的智慧', evidence: politics7aEvidence,
      points: [['建立和维护友谊', '主动、真诚交往，并在冲突中保持沟通和尊重。'], ['网络交友安全', '谨慎保护个人信息，线下见面前征求监护人意见并做好安全防护。']],
      questions: [
        ['朋友间发生误会，哪种做法更有助于解决？', '冷静后说明自己的感受，也听对方解释', '把误会内容转发给全班', '立即删除朋友且不说明原因', '假装同意但继续传播猜测', '坦诚沟通并倾听可以帮助澄清事实。'],
        ['网上新认识的人索要家庭住址和账号密码，应该怎样做？', '不提供敏感信息，并告诉可信任的成年人', '为了证明信任立即发送', '先发密码再问对方是谁', '把家人的证件照片也发过去', '保护隐私并寻求可信成年人帮助更安全。'],
        ['网上朋友邀请独自去陌生地点见面，较稳妥的做法是什么？', '不独自赴约，先和家长或可信成年人商量', '不告诉任何人就马上出发', '把定位关掉避免家人知道', '带上所有个人证件和密码', '线下见面有风险，应告知监护人并采取安全措施。'],
        ['同学希望你为维护友谊替他隐瞒欺负别人的行为，怎样做更合适？', '不帮助伤害他人，并鼓励他停止行为、寻求老师帮助', '把欺负行为录下来传播取笑', '认为朋友要求就必须答应', '加入欺负以证明忠诚', '友谊不能成为伤害他人的理由，应寻求适当支持。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l7-collective-self', chapter: '第二单元 成长的时空 / 第七课 在集体中成长', section: '集体生活成就我', evidence: politics7aEvidence,
      points: [['集体与成长', '集体生活提供交往、合作和发展能力的机会。'], ['个人与规则', '在共同规则中承担责任、发展个性并尊重他人。']],
      questions: [
        ['参加班级小组活动，怎样更可能锻炼合作能力？', '主动承担适合自己的任务并与组员沟通进度', '等待别人完成全部任务', '只关心自己的展示部分', '故意不遵守小组约定', '合作需要承担任务并保持沟通。'],
        ['集体规则与个人偏好不一致时，较合适的做法是什么？', '理解规则目的，必要时通过合理方式提出建议', '只要不喜欢就拒绝所有规则', '要求其他成员单独服从自己', '隐瞒违反规则的行为', '遵守共同规则的同时可以通过适当渠道提出改进意见。'],
        ['为什么集体生活可能帮助个人发展？', '成员能在合作、交往和承担责任中学习新能力', '加入集体后个人不再需要选择', '集体会替每个人完成所有任务', '成员必须放弃所有兴趣', '集体提供实践和交往机会，个人仍能发展特点。'],
        ['组员的想法与多数人不同，怎样处理更尊重？', '给对方表达机会，再根据共同目标讨论方案', '立即排除不同意见', '要求少数人不得发言', '把讨论变成个人攻击', '倾听不同意见有助于形成更周全的集体决定。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u2-l7-build-collective', chapter: '第二单元 成长的时空 / 第七课 在集体中成长', section: '共建美好集体', evidence: politics7aEvidence,
      points: [['共同愿景', '成员围绕共同目标形成责任和行动方向。'], ['合作与规则', '公平参与、互相支持并共同维护集体秩序。']],
      questions: [
        ['小组想共同完成读书展示，哪种做法更能共建良好集体？', '共同明确目标、分配任务并互相检查支持', '只让一人完成所有工作', '成员各做各的且不沟通', '只评选最受欢迎的组员', '共同目标、分工和合作能推动集体任务完成。'],
        ['班级规则怎样更容易被大家认同并遵守？', '成员共同讨论清楚、公平且可执行的规则', '规则只由个别人随意决定', '每个人有不同且不公开的规则', '规则只要求部分同学遵守', '共同参与制定并确保公平有助于理解和遵守规则。'],
        ['同学完成任务遇到困难，集体可以怎样做？', '提供力所能及的帮助，同时尊重对方承担责任', '公开嘲笑并让他退出', '替他隐瞒所有问题', '要求其他成员停止工作', '互助支持与责任并行，有助于共同完成目标。'],
        ['发生意见冲突时，怎样维护集体关系？', '围绕事情和共同目标协商，不给同学贴标签', '把不同意见变成人身攻击', '要求一方永远沉默', '把冲突传播到网络上', '就事论事并协商能保护成员尊严和集体合作。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l8-recognize-life', chapter: '第三单元 珍爱我们的生命 / 第八课 生命可贵', section: '认识生命', evidence: politics7aEvidence,
      points: [['生命的特点', '理解生命独特、宝贵且每个人的成长经历不同。'], ['珍爱生命', '尊重自己和他人的生命，认真对待日常生活。']],
      questions: [
        ['为什么说每个人的生命都具有独特性？', '成长经历、兴趣和特点各不相同', '所有人必须有完全相同的经历', '生命价值由考试排名决定', '只有成年人的生命才独特', '个体经历和特点不同，体现生命的独特性。'],
        ['认识生命有限，怎样做更积极？', '珍惜时间，认真学习并关心身边的人', '因此不再制定任何目标', '认为努力都没有意义', '只关注别人是否成功', '认识生命有限可以促使人珍惜时间并积极生活。'],
        ['同学的成长经历与你不同，较合适的态度是什么？', '尊重差异并尝试理解对方的处境', '嘲笑与自己不同的经历', '认为不同就代表不值得交往', '要求对方改变全部特点', '尊重差异有助于理解和关心他人。'],
        ['哪种行为体现对生命的珍爱？', '注意日常安全并在遇到困难时寻求帮助', '为了逞强故意尝试危险行为', '不顾他人安危开玩笑', '认为安全提醒总是多余的', '主动保护自己和他人是珍爱生命的实际表现。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l8-revere-life', chapter: '第三单元 珍爱我们的生命 / 第八课 生命可贵', section: '敬畏生命', evidence: politics7aEvidence,
      points: [['尊重生命', '尊重生命的尊严和安全，不轻视自己或他人的生命。'], ['关切他人', '在能力范围内帮助他人，同时采取安全、理性的方式。']],
      questions: [
        ['路边有人摔倒，最稳妥的做法是什么？', '先确认现场安全，再询问需要并及时求助', '不看情况就移动伤者', '围观拍摄并发到网上', '假装没有看见', '先确保安全并寻求适当帮助能体现对生命的关切。'],
        ['敬畏生命主要意味着什么？', '认识生命宝贵，并尊重自己和他人的安全与尊严', '只保护自己的物品', '认为他人的困难都与自己无关', '任何情况下都不求助', '敬畏生命要求珍惜自身并关切他人生命。'],
        ['朋友为了取乐想做危险挑战，怎样回应更恰当？', '明确劝阻，并建议选择安全的活动', '为证明友谊跟着参加', '先拍视频再考虑风险', '鼓励更多同学加入', '制止危险行为并提出安全替代方式更负责任。'],
        ['救助他人时为什么也要注意自身安全？', '安全、理性的帮助更可能持续有效，也避免造成新的伤害', '帮助者不需要任何保护', '只要热心就无需了解情况', '安全和关爱彼此矛盾', '关爱他人不意味着忽视自身安全。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l9-safety-awareness', chapter: '第三单元 珍爱我们的生命 / 第九课 守护生命安全', section: '增强安全意识', evidence: politics7aEvidence,
      points: [['识别风险', '留意环境中的安全提示和可能的危险因素。'], ['防范意识', '不轻信陌生要求，遇到风险及时告知可信成年人。']],
      questions: [
        ['看到楼梯口地面湿滑的提示牌，怎样做更安全？', '放慢脚步并绕开湿滑区域', '跑过去看谁滑倒', '把提示牌移走方便拍照', '闭着眼睛继续走', '留意提示并采取谨慎行动可以减少风险。'],
        ['陌生人在网上要求你提供家庭地址，应该怎样做？', '不提供并告诉家长或可信任的成年人', '发送地址换取礼物', '同时发送家人的电话号码', '关闭安全设置后回复', '不泄露个人信息并向成年人求助是安全做法。'],
        ['安全意识包含什么？', '提前发现风险并思考如何避免或降低危险', '只在事故发生后才注意规则', '认为危险只会发生在别人身上', '为了方便忽略警示信息', '安全意识强调风险预见和防范。'],
        ['同学提出从护栏外侧攀爬拍照，怎样回应更合适？', '拒绝危险做法，并建议在安全地点拍摄', '为拍照效果一起攀爬', '要求同学把手机递给你后继续', '认为护栏只是装饰', '拒绝冒险并选择安全替代方式能保护大家。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l9-protection-skills', chapter: '第三单元 珍爱我们的生命 / 第九课 守护生命安全', section: '提高防护能力', evidence: politics7aEvidence,
      points: [['应对与求助', '遇到危险时保持冷静，及时向可信成年人或专业人员求助。'], ['防护能力', '通过学习和练习掌握适合情境的安全方法。']],
      questions: [
        ['在公共场所与家人走散，较稳妥的做法是什么？', '留在安全地点并向工作人员或警察求助', '跟随第一个主动搭话的陌生人离开', '独自跑出场馆四处寻找', '把家人信息发给所有路人', '留在安全处向可信工作人员求助能减少风险。'],
        ['遇到自己无法处理的危险情况，应当怎样做？', '尽快向可信成年人或相应专业人员求助', '为了面子独自冒险处理', '隐瞒情况直到问题扩大', '让年幼同学替自己承担风险', '及时求助是防护能力的重要部分。'],
        ['为什么需要提前学习和练习防护方法？', '了解步骤后遇到情况更可能冷静采取合适行动', '练习能保证永远不会遇到危险', '学过一次就不必遵守其他安全规则', '防护知识只对成年人有用', '熟悉方法有助于在风险出现时作出更合适的反应。'],
        ['火警警报响起时，哪种做法更稳妥？', '听从现场指引，从安全通道有序离开并求助', '乘坐电梯返回取物', '躲在走廊拍视频', '推挤他人抢先离开', '有序听从指引并使用安全通道能降低二次风险。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l10-care-body', chapter: '第三单元 珍爱我们的生命 / 第十课 保持身心健康', section: '爱护身体', evidence: politics7aEvidence,
      points: [['身体健康', '重视规律作息、适量活动和日常安全等生活习惯。'], ['及时求助', '身体不适或遇到健康问题时向家长、老师或专业人员说明。']],
      questions: [
        ['哪种日常安排更有利于保持身体健康？', '规律睡眠、合理饮食并安排适量活动', '长期熬夜并取消休息', '只吃自己喜欢的一种食物', '身体不舒服也从不告诉任何人', '规律作息、饮食和活动是健康生活的基本组成。'],
        ['运动时感到明显不适，较合适的做法是什么？', '停止活动并及时告诉老师或家长', '为了不落后继续强撑', '不告诉任何人并加快运动', '把不适当作比赛规则', '及时停止并求助比勉强坚持更安全。'],
        ['为什么要合理安排学习和休息？', '身体需要恢复，良好状态有助持续学习和生活', '休息会让所有知识消失', '学习越久身体一定越健康', '睡眠与成长完全没有关系', '合理休息有助于身体恢复和保持日常状态。'],
        ['同学受伤后不愿告诉老师，怎样劝说更合适？', '关心询问并陪他向老师或家长说明情况', '嘲笑他不够勇敢', '让他继续参加剧烈活动', '把受伤照片发到群里', '及时说明情况便于得到适当帮助，也应保护隐私。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u3-l10-nourish-mind', chapter: '第三单元 珍爱我们的生命 / 第十课 保持身心健康', section: '滋养心灵', evidence: politics7aEvidence,
      points: [['心理与精神生活', '通过阅读、兴趣、交往和反思丰富内心生活。'], ['情绪与支持', '接纳情绪，采用合适方式调节并在需要时寻求帮助。']],
      questions: [
        ['考试失利后心情低落，哪种做法更有助于调整？', '整理原因、给自己时间并和可信任的人交流', '认为一次失利决定一生', '把情绪发泄到同学身上', '拒绝任何帮助并放弃学习', '反思原因、调节情绪和寻求支持都是积极做法。'],
        ['哪项活动有助于丰富精神生活？', '阅读、运动或参与有意义的兴趣活动', '只比较谁拥有更多物品', '长时间刷信息而不休息', '阻止自己尝试新兴趣', '有益的兴趣和文化活动能丰富内心体验。'],
        ['朋友愿意倾听你的烦恼时，较合适的做法是什么？', '说明自己的感受，也尊重朋友能提供帮助的范围', '要求朋友替自己解决所有问题', '把朋友的倾听当作可以公开的秘密', '因此停止与家人老师沟通', '表达感受并尊重边界有助于获得支持。'],
        ['滋养心灵为什么不仅是追求短暂快乐？', '还包括发展兴趣、价值追求和积极面对生活的能力', '心灵成长只看买了多少东西', '长期逃避困难就能解决问题', '兴趣越多越不需要责任', '精神成长包含持续的兴趣、价值和面对生活的能力。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l11-ask-life-goals', chapter: '第四单元 追求美好人生 / 第十一课 确立人生目标', section: '探问人生目标', evidence: politics7aEvidence,
      points: [['人生目标的意义', '思考希望成为怎样的人以及希望为生活、社会做出什么贡献。'], ['目标与实际', '从兴趣、能力、条件和社会需要等方面审视目标。']],
      questions: [
        ['探问人生目标时，哪类问题最值得认真思考？', '我希望成为什么样的人，想怎样对他人和社会负责', '怎样才能永远不承担任何责任', '怎样让别人替我决定所有事情', '怎样只获得称赞而不付出行动', '人生目标与个人发展、责任和价值追求相关。'],
        ['一个目标听起来很吸引人，但与本人兴趣和能力差距较大，怎样处理？', '进一步了解并制定成长步骤，也评估目标是否需要调整', '因为有差距就立即放弃一切方向', '假装已经具备所有能力', '要求别人保证自己成功', '审视实际情况并规划成长路径比空想或仓促放弃更合理。'],
        ['人生目标为什么可以随着认识加深而调整？', '新的经历和认识能帮助我们更清楚地判断适合的方向', '目标一旦写下就永远不能思考', '调整说明过去所有努力都无效', '目标只能由别人确定', '目标可以在持续反思中优化，方向与行动都需要学习。'],
        ['哪种目标更能体现对社会的关注？', '提升专业能力后用所学解决实际问题、服务他人', '只追求个人排名，不考虑行为影响', '要求他人替自己承担工作', '把成功等同于拥有最多物品', '个人成长也可以与服务社会和解决实际问题联系。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l11-correct-life-goal', chapter: '第四单元 追求美好人生 / 第十一课 确立人生目标', section: '树立正确的人生目标', evidence: politics7aEvidence,
      points: [['目标方向', '把个人理想同健康成长、现实责任和社会发展联系起来。'], ['目标落实', '把较长远的方向转化为现阶段可行动的计划。']],
      questions: [
        ['哪种人生目标更积极且有现实行动基础？', '我想成为能帮助解决环境问题的人，现在先学习相关知识并参加实践', '我只想出名，不必学习或负责', '我希望别人替我完成所有目标', '我希望永远不改变也不尝试', '目标与学习和实践相连，既有方向也有行动。'],
        ['长远目标很大时，怎样开始落实？', '确定近期可做的小目标并持续检查进展', '等待机会自动出现', '每天更换一个完全不同的目标', '只把目标写在纸上不行动', '近期行动帮助把长远方向转化为现实过程。'],
        ['树立人生目标时为什么要考虑社会需要？', '个人成长可以在承担责任、服务他人中体现价值', '个人目标必须由社会替代', '社会需要与个人发展一定冲突', '考虑社会就不必认识自己', '个人发展与社会责任可以相互支持。'],
        ['发现自己的目标缺少必要能力时，较合适的做法是什么？', '找出需要学习的能力并安排逐步提升', '隐瞒不足并拒绝练习', '认为目标已不可能实现', '要求同伴承担自己的学习任务', '明确能力差距有助于形成具体的成长安排。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l12-positive-attitude', chapter: '第四单元 追求美好人生 / 第十二课 端正人生态度', section: '拥有积极的人生态度', evidence: politics7aEvidence,
      points: [['积极态度', '以希望、行动和责任面对学习生活中的挑战。'], ['现实行动', '承认困难并寻找可以改变的部分，而非消极等待。']],
      questions: [
        ['小组项目进展不顺，积极的人生态度更接近哪种做法？', '分析问题、听取成员意见并调整下一步行动', '认为一次困难证明永远不会成功', '责怪所有组员后退出', '假装没有问题也不沟通', '积极态度包含面对问题并采取实际行动。'],
        ['积极乐观是否等于忽视困难？', '不是，要看到困难并寻找可行办法', '是，只要不提问题就不会有困难', '是，所有计划都会自动成功', '不是，所以遇到困难必须立刻放弃', '乐观应建立在认识现实和主动应对之上。'],
        ['考试前发现复习内容还有不足，哪种态度更有帮助？', '制定剩余时间的重点复习计划并保持适当休息', '认定努力已经没有意义', '停止复习并指责试题', '熬夜到天亮且不安排休息', '聚焦可改进部分并合理安排时间更有助于应对。'],
        ['哪句话更能体现积极而理性的自我鼓励？', '这次没有做好，我可以找出原因并继续练习', '我必须每次都完美，否则一切失败', '问题不用解决，明天自然消失', '只要别人改变，我就不必行动', '承认不足并看到继续努力的可能性，体现积极理性。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l12-adversity', chapter: '第四单元 追求美好人生 / 第十二课 端正人生态度', section: '正确对待顺境和逆境', evidence: politics7aEvidence,
      points: [['顺境与责任', '处于有利条件时珍惜机会并持续努力，不自满懈怠。'], ['逆境与成长', '遇到挫折时分析原因、寻求支持并积累经验。']],
      questions: [
        ['条件顺利时，怎样做更能把握机会？', '保持努力并继续学习，不因暂时顺利而自满', '认为以后不需要任何准备', '把成功全部归功于自己', '停止承担原有责任', '顺境中仍需努力和责任感，才能用好机会。'],
        ['遇到暂时挫折后，哪种做法更能帮助成长？', '总结原因、调整方法并在需要时寻求帮助', '认定自己永远没有能力', '把困难隐瞒到无法处理', '因为一次失败就放弃所有目标', '复盘和求助有助于从挫折中积累经验。'],
        ['为什么不应把逆境自动看成成功保证？', '逆境本身不会带来成长，还需要正确应对和行动', '逆境一定使人失败', '只要遇到困难就不用努力', '成长只发生在顺境', '困难是否转化为经验与人的应对方式有关。'],
        ['朋友因失败而沮丧，怎样支持更合适？', '倾听感受，鼓励他分析可改进之处并寻找支持', '嘲笑他遇到困难', '要求他马上忘记所有感受', '替他决定并完成所有事情', '理解感受并支持其采取行动，比否定或包办更有帮助。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l13-labor-value', chapter: '第四单元 追求美好人生 / 第十三课 实现人生价值', section: '在劳动中创造人生价值', evidence: politics7aEvidence,
      points: [['劳动与价值', '认识劳动创造生活条件，也能体现责任、能力和对他人的贡献。'], ['尊重劳动者', '尊重不同岗位劳动者并认真完成力所能及的劳动。']],
      questions: [
        ['哪种认识更符合劳动的价值？', '劳动不仅创造生活，也能锻炼能力并为他人作出贡献', '劳动只看是否得到表扬', '只有收入最高的工作有价值', '学生不需要参与任何劳动', '劳动有生活、能力和社会贡献等多方面意义。'],
        ['班级值日时，怎样体现尊重劳动？', '按分工认真完成任务，并感谢共同维护环境的人', '把清洁工作都留给一位同学', '认为劳动岗位低人一等', '故意弄脏后让别人打扫', '认真参与并尊重劳动者体现责任和公平。'],
        ['为什么不同岗位的劳动者都值得尊重？', '各类劳动以不同方式支持社会生活运转', '只有公众熟悉的职业才有贡献', '劳动者的价值只由制服决定', '岗位不同就不能相互合作', '社会生活需要多种岗位共同协作。'],
        ['小林做家务时发现步骤不熟，较合适的态度是什么？', '请教家人并练习把事情做好', '因此认为自己永远不能劳动', '要求家人以后全部代做', '故意把任务交给更忙的人', '劳动能力可以通过学习和练习逐渐提升。'],
      ],
    },
    {
      id: 'leaf-rebuild-2026-politics-7a-u4-l13-contribution', chapter: '第四单元 追求美好人生 / 第十三课 实现人生价值', section: '在奉献中成就精彩人生', evidence: politics7aEvidence,
      points: [['奉献与社会', '在力所能及的行动中关心他人、参与公共生活。'], ['价值与行动', '根据真实需要持续行动，而不把奉献等同于追求名声。']],
      questions: [
        ['参加志愿服务前，哪种准备更负责任？', '了解服务对象的真实需要并确认自己能承担的任务', '先拍宣传照再决定是否帮助', '不听组织安排自行改变服务内容', '只考虑能否得到奖励', '了解需求和任务有助于让服务真正有效。'],
        ['哪种行动能体现日常奉献？', '主动帮助同学理解一道题并耐心解释', '只在有人拍照时帮忙', '要求接受帮助的人必须公开感谢', '把他人的困难当作笑话', '力所能及的日常支持也能体现关心和奉献。'],
        ['奉献是否等同于放弃个人成长？', '不是，个人提升可以与服务他人和社会相结合', '是，奉献要求停止学习', '是，帮助他人必然伤害自己', '不是，所以只需关注个人利益', '个人成长与社会贡献可以相互促进。'],
        ['开展服务后发现原计划没有解决实际需要，怎样做更合适？', '听取反馈并调整方式，再评估效果', '坚持原方案，不管结果如何', '责怪服务对象没有配合', '不再了解任何情况', '根据真实反馈调整可以提高服务效果。'],
      ],
    },
  ] as CivicLeafSeed[]).map(makeCivicLeaf),
]

const math8a = 'https://www.renjiaoshe.com/jiaocai/3302.html'
const chinese9a = 'https://jx.panqjy.cn/catalog/list?book_id=3002630'
const english9a = 'https://jx.panqjy.cn/catalog/list?book_id=3002345'
const english9b = 'https://jx.panqjy.cn/books/3002346/'
const physics9 = 'https://zxkeben.szxuexiao.com/rj_9nianji_wl.html'
const chemistry9a = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=7'
const chemistry9b = 'https://jx.panqjy.cn/catalog/list?book_id=3002426'
const politics9a = 'https://jx.panqjy.cn/catalog/list?book_id=3002350'
const politics9b = 'https://jx.panqjy.cn/jiaoan/daofa/czrjbjnjxc-b3002351.html'
const history9a = 'https://jx.panqjy.cn/catalog/list?book_id=3002431'
const history9b = 'https://jx.panqjy.cn/catalog/list?book_id=3002432'
const math9a = 'https://jx.panqjy.cn/album-156111.html'
const math9b = 'https://jx.panqjy.cn/shiti/shuxue/czjjbjnjxc-c4099362/'
const history7a = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=8'
const history7b = 'https://jx.panqjy.cn/catalog/list?book_id=3002458'
const history8a = 'https://jx.panqjy.cn/catalog/list?book_id=3002459'
const history8b = 'https://jx.panqjy.cn/catalog/list?book_id=3002460'
const chinese9b = 'https://jx.panqjy.cn/shiti/yuwen/czrjbbbjnjxc-b3002631.html'
const geography7a = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=10'
const geography7b = 'https://jx.panqjy.cn/dl/tb_c4954_t4/'
const math7a = 'https://www.haoduoyun.cc/book/jjb/shuxue/vy7s/147.shtml'
const math7b = 'https://www.renjiaoshe.com/jiaocai/3301.html'
const biology7a = 'https://www.yeyulingfeng.com/wendang/91248275.html'
const biology7b = 'https://www.renjiaoshe.com/jiaocai/3488.html'

const history7LeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-history-7a-method-artifacts', grade: '初一', subject: '历史', volume: '上册',
    chapter: '学史方法：（一）如何从出土文物中获取信息', section: '学史方法：（一）如何从出土文物中获取信息', directoryUrl: history7a,
    evidence: '统编版七上现行目录设有出土文物史料研习专题；围绕史料实证、信息边界与多源互证原创设问。',
    points: [['文物史料信息', '从器物材质、形制、制作痕迹和出土环境提取可观察信息。'], ['证据与推断', '把直接观察与历史解释区分开，并结合其他史料验证推断。']],
    questions: [
      ['考古人员发现一件带有磨损痕迹的石器，首先可以较稳妥地记录什么？', '石器的形状、材质和磨损位置等可观察特征', '制造者当时的姓名和家庭住址', '所有使用者的完整想法', '该器物一定属于某位君主', '先记录可直接观察的信息，再据此提出有限推断。', 0],
      ['要推测遗址居民如何使用一件器物，哪种做法证据更充分？', '结合器物用途特征、出土位置和同类遗物综合分析', '只凭器物颜色猜测', '把现代用途直接当作古代用途', '不查看遗址环境就下定论', '器物特征与出土环境、同类材料可以相互补充。', 1],
      ['一件陶器出土于居住遗址，这能直接证明哪项？', '该陶器曾出现在这一遗址的相关地层中', '遗址居民都使用同一种陶器', '每个居民都亲手制作过它', '遗址居民已经留下文字记录', '出土位置是直接证据，但不能自动证明每个人的行为。', 0],
      ['两件文物的用途解释互相矛盾时，怎样处理更符合史料实证？', '重新核对出土层位、器物特征及相关材料', '选择听起来最有趣的解释', '把不支持原结论的材料删去', '不再说明推断依据', '检验材料并公开推断依据，才能修正解释。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-history-7a-method-dating', grade: '初一', subject: '历史', volume: '上册',
    chapter: '学史方法：（二）如何掌握历史纪年法', section: '学史方法：（二）如何掌握历史纪年法', directoryUrl: history7a,
    evidence: '统编版七上现行目录设置历史纪年法专题；题目练习公元纪年、年代顺序与时间轴判读。',
    points: [['公元纪年顺序', '辨认公元前与公元后的先后关系，理解公元前数字越大年代越早。'], ['时间轴表达', '按事件发生时间排列并注明年代，避免把朝代先后当作年份计算。']],
    questions: [
      ['下列年代中，按从早到晚排列正确的是哪一项？', '公元前300年—公元前200年—公元前100年', '公元前100年—公元前200年—公元前300年', '公元前200年—公元前300年—公元前100年', '公元前100年—公元前300年—公元前200年', '公元前年代数字越大，距今通常越早。', 0],
      ['公元前221年发生的事件与公元前206年的事件相比，哪项判断正确？', '公元前221年更早', '公元前206年更早', '二者相隔221年', '仅凭纪年无法判断先后', '在公元前，较大的年份数代表更早的时间。', 0],
      ['制作跨越公元前后事件的时间轴，哪种标注最清楚？', '标出公元前年份和公元年份，并按时间顺序排列', '删去“公元前”字样以节省空间', '把年份数字从大到小排列而不区分公元前后', '按事件名称笔画排序', '跨越公元前后时必须保留纪年性质，不能只比较数字。', 1],
      ['小组把公元前1046年排在公元前771年之后，错误原因是什么？', '把公元前的数字大小误当成时间先后顺序', '把年和月混为一谈', '把地图方向看反了', '把历史事件误作地理现象', '公元前1046年早于公元前771年。', 0],
    ],
  },
  {
    id: 'leaf-rebuild-2026-history-7a-method-maps', grade: '初一', subject: '历史', volume: '上册',
    chapter: '学史方法：（三）如何阅读历史地图', section: '学史方法：（三）如何阅读历史地图', directoryUrl: history7a,
    evidence: '统编版七上现行目录设有历史地图阅读专题；围绕地图时段、图例、方位和空间变化原创设问。',
    points: [['历史地图要素', '结合标题、年代、图例和方位读取历史空间信息。'], ['时空对应', '将地图所示区域与对应历史时期联系起来，不把不同时期的疆域混为一谈。']],
    questions: [
      ['阅读一幅标注“战国形势”的历史地图，首先应核对什么？', '地图标题和所示历史时期', '地图颜色是否鲜艳', '地图绘制者的籍贯', '地图上文字的字体大小', '标题和年代限定地图表达的时段。', 0],
      ['历史地图中的不同颜色分别代表不同政权，理解颜色含义应查看什么？', '图例', '比例尺', '纸张边缘', '地图折痕', '图例说明符号和颜色所代表的对象。', 0],
      ['两幅地图分别表示秦统一前后，比较疆域变化时怎样做更可靠？', '确认两图时期和图例一致后再比较政权范围', '不看年代直接比较颜色深浅', '把两图上的所有边界视为同时存在', '只按地图面积猜测人口数量', '先保证比较对象和时段对应，才能说明空间变化。', 1],
      ['历史地图上的河流和山脉信息最适合帮助研究什么？', '政权地理位置、交通条件和活动空间', '每个统治者的具体性格', '某场战役中每名士兵的姓名', '文献作者是否诚实', '自然地理要素能提供空间背景，但不能单独证明人物动机。', 0],
    ],
  },
  {
    id: 'leaf-rebuild-2026-history-7a-book-review', grade: '初一', subject: '历史', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history7a,
    evidence: '依据统编版七上史前、夏商周、秦汉和三国两晋南北朝四个时段组织综合题，覆盖本册主线。',
    points: [['朝代与时段主线', '按时间顺序理解史前社会、早期王朝、秦汉统一与魏晋南北朝政权变化。'], ['制度与交流', '从制度、经济、科技文化和民族交往理解历史发展。']],
    questions: [
      ['下列历史时序排列正确的是哪一项？', '史前时期—夏商周—秦汉—三国两晋南北朝', '秦汉—史前时期—夏商周—三国两晋南北朝', '夏商周—秦汉—史前时期—三国两晋南北朝', '三国两晋南北朝—秦汉—夏商周—史前时期', '本册以从史前到魏晋南北朝的时间顺序展开。', 0],
      ['秦统一中国后，历史发展出现的重要变化是什么？', '建立起统一的多民族国家发展格局', '中国历史从此不再发生社会变化', '各地从此不再有任何差异', '所有地方事务都由普通家庭决定', '秦统一推动了统一多民族国家的发展。', 1],
      ['学习春秋战国到秦汉的变化，哪种概括更符合本册主线？', '从诸侯纷争与社会变革走向统一国家的建立和巩固', '从统一王朝走向史前采集社会', '从文字社会退回到没有生产活动', '从农业社会直接进入工业社会', '春秋战国的社会变革与秦汉统一相衔接。', 0],
      ['魏晋南北朝时期的历史特征，哪项概括较恰当？', '政权分立与民族交融并存，科技文化继续发展', '全国长期保持秦朝时期的统一局面', '各民族之间完全隔绝且没有交往', '社会生活停止变化', '本册第四单元主题就是政权分立与民族交融。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-history-7b-book-review', grade: '初一', subject: '历史', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history7b,
    evidence: '依据统编版七下隋唐、辽宋夏金元、明清（至鸦片战争前）三个单元组织综合题。',
    points: [['朝代时序与阶段特征', '按隋唐、辽宋夏金元、明清的顺序梳理制度、经济与社会变化。'], ['统一多民族国家发展', '从民族交往、边疆治理、对外交往与社会经济理解历史联系。']],
    questions: [
      ['下列本册历史时序排列正确的是哪一项？', '隋唐—辽宋夏金元—明清（至鸦片战争前）', '明清—隋唐—辽宋夏金元', '辽宋夏金元—明清—隋唐', '隋唐—明清—辽宋夏金元', '本册按隋唐、辽宋夏金元、明清三个时期展开。', 0],
      ['唐朝与周边民族的交往、宋元时期民族政权并立与交往，共同说明什么？', '民族之间既有差异，也存在持续交往和交流', '民族交往只发生在一个朝代', '政权边界从未发生变化', '不同民族之间没有任何经济联系', '教材分别呈现了不同阶段的民族交往和关系发展。', 1],
      ['学习宋元时期经济和对外交流，最合适的综合方法是什么？', '把经济发展、交通贸易和不同地区联系放在时代背景中分析', '只记住一个人物名字，不联系其他史事', '把后世科技成就都归到宋朝', '认为经济发展与社会环境毫无关系', '综合分析需要联系时代背景、经济活动和交流渠道。', 1],
      ['本册明清单元包含边疆治理、对外关系和科技文化等内容，复习时应怎样组织？', '按主题建立联系，同时保留各事件的时代顺序', '把所有事件都说成发生在同一年', '只背地名而不区分史事', '用现代国界替代历史疆域', '主题联系与时间顺序并重，才能避免割裂知识。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const geography7LeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-geography-7a-opening', grade: '初一', subject: '地理', volume: '上册',
    chapter: '与同学们谈地理', section: '与同学们谈地理', directoryUrl: geography7a,
    evidence: '依据人教版2024七上目录导言内容，考查地理学习对象、地图与实地观察方法。',
    points: [['地理学习对象', '认识地理环境中的自然要素、人类活动及其相互关系。'], ['观察与表达', '结合地图、实地观察和资料记录描述地理现象。']],
    questions: [
      ['地理课要研究的内容主要包括什么？', '地理环境及人类活动与环境的关系', '只研究地名的写法', '只记录每天的新闻标题', '只背诵国家名称而不看位置', '地理学习关注自然环境、人类活动及其相互联系。', 0],
      ['小组调查校园周边地形和交通，哪种做法更适合地理学习？', '结合地图、现场观察和记录整理发现', '只凭记忆画图且不核实', '只抄同学结论不看地点', '把没有测量的距离写成精确数值', '地图与实地观察互相补充，记录应能核验。', 1],
      ['同一地区的自然环境与居民生产生活之间，哪种判断更合理？', '二者可能相互影响，需要结合具体条件分析', '自然环境对生活永远没有影响', '所有地区居民生活方式完全相同', '人类活动不会改变地理环境', '地理强调自然环境与人类活动的联系。', 0],
      ['阅读一张陌生地区地图时，第一步较适合做什么？', '看地图标题、图例和方向等基本信息', '先猜测地图作者的年龄', '把图例全部忽略', '只看颜色深浅决定路线', '地图要素帮助准确理解地图表示的内容。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-ch1-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第一章 地球', section: '本章复习与测试', directoryUrl: geography7a,
    evidence: '依据人教版七上第一章“地球”的现行目录，对宇宙环境、地球仪和地球运动进行综合复习。',
    points: [['地球与地球仪', '借助经纬网定位并描述地球在宇宙中的基本环境。'], ['地球运动', '区分地球自转和公转及其基本地理意义。']],
    questions: [
      ['用经纬网确定地点位置时，通常需要同时读取什么？', '经度和纬度', '海拔和人口', '气温和降水', '比例尺和图例', '经纬度共同用于描述地表位置。', 0],
      ['地球自转产生的主要地理现象是什么？', '昼夜更替和地方时差异', '四季更替', '大陆漂移', '地形起伏', '地球自转使不同经度地区出现时间差异和昼夜交替。', 1],
      ['地球公转与哪种现象关系密切？', '一年中季节变化和昼夜长短变化', '一天内昼夜更替', '月球自转方向变化', '海陆分布位置改变', '地球公转和地轴倾斜共同造成季节及昼夜长短变化。', 0],
      ['在地球仪上，连接南北两极并指示南北方向的线是？', '经线', '纬线', '等高线', '河流线', '经线连接南北两极，纬线环绕地球。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-ch2-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第二章 地图', section: '本章复习与测试', directoryUrl: geography7a,
    evidence: '依据人教版七上第二章地图目录，综合训练地图阅读、等高线地形图和地图选择。',
    points: [['地图基本要素', '结合方向、比例尺和图例读取地图信息。'], ['地形图与地图选择', '从等高线疏密和数值判断地势，并按任务选择合适地图。']],
    questions: [
      ['地图比例尺表示什么？', '图上距离与实地距离的缩小比例', '地图上最高点的海拔', '某地区人口密度', '地图方向与地形颜色的关系', '比例尺表示图上距离和实地距离的比例关系。', 0],
      ['等高线越密集，通常表示该处地势怎样？', '坡度较陡', '坡度较缓', '海拔完全相同', '一定是河流下游', '相邻等高线间距较小时，单位水平距离内高差较大。', 1],
      ['计划乘坐公交在城市中换乘，最适合优先查看哪种地图？', '城市交通线路图', '世界气候类型图', '地形剖面图', '世界人口分布图', '地图要与解决的问题相匹配。', 0],
      ['在等高线地形图中判定山顶，哪项信息最有帮助？', '闭合等高线内部数值向中心增大', '所有线都平行海岸', '图例中出现蓝色', '比例尺分母最大', '山顶常表现为由外向内海拔逐渐升高的闭合等高线。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-campus-project', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第二章 地图', section: '跨学科主题学习 美化校园', directoryUrl: geography7a,
    evidence: '依据人教版七上“美化校园”跨学科主题任务，结合校园测绘、空间表达与方案评估原创设问。',
    points: [['校园空间调查', '用方向、比例尺和图例记录校园设施的位置与联系。'], ['方案比较与应用', '根据实际需求比较规划方案并说明空间布局依据。']],
    questions: [
      ['绘制校园花坛和道路简图，哪项最有助于他人读图？', '标明方向、主要图例并保持大致比例关系', '只画花坛不标位置', '随意改变道路相对方向', '把不同设施都用同一符号表示且不解释', '地图需要方向、图例和合理空间关系。', 0],
      ['学校准备新增休息区，选址时哪种资料更有用？', '校园平面图及师生实际通行和使用情况', '世界人口金字塔', '某地年平均气温图', '没有位置标注的校园宣传照片', '规划应结合位置资料与真实使用需求。', 1],
      ['两种校园绿化方案面积相近，比较哪项更能支持合理选择？', '遮阴效果、通行影响和养护条件', '方案名称的字数', '设计图纸的颜色数量', '绘图者最喜欢哪种颜色', '空间规划要依据功能与现场条件评估。', 0],
      ['把测量得到的校园距离绘到图上，首先要统一什么？', '图上与实地距离的比例尺', '不同学生的身高', '地图纸张的颜色', '校门的开放时间', '比例尺帮助把实地距离按统一比例缩绘。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-ch3-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第三章 陆地和海洋', section: '本章复习与测试', directoryUrl: geography7a,
    evidence: '依据人教版七上第三章目录，整合大洲大洋、世界地形和海陆变迁。',
    points: [['海陆分布与地形', '认识大洲大洋分布及世界主要地形类型。'], ['海陆变迁证据', '结合地质和地理证据理解地表海陆分布会发生变化。']],
    questions: [
      ['世界上面积最大的大洲是？', '亚洲', '欧洲', '南美洲', '大洋洲', '亚洲是世界面积最大的大洲。', 0],
      ['世界上面积最大的大洋是？', '太平洋', '大西洋', '印度洋', '北冰洋', '太平洋面积最大。', 1],
      ['喜马拉雅山脉属于哪类地形？', '山地', '平原', '盆地', '高原', '山地地表起伏大、海拔较高，常呈脉状分布。', 0],
      ['海岸附近发现与远离海洋地区相似的古生物化石，可能说明什么？', '地表环境和海陆分布曾经发生变化', '所有大陆从未移动', '海水从未进入陆地', '化石只能在现代海洋形成', '化石和地层等证据可帮助解释地表环境变化。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-ch4-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第四章 天气与气候', section: '本章复习与测试', directoryUrl: geography7a,
    evidence: '依据人教版七上第四章目录，综合天气、气温、降水和世界气候判读。',
    points: [['天气与气候', '天气反映短时大气状况，气候反映多年平均特征。'], ['气温降水与气候', '用气温曲线和降水量柱状图识别气候特征。']],
    questions: [
      ['“今天有阵雨，明天转晴”描述的是？', '天气', '气候', '地形', '植被带', '短时间内的大气状况属于天气。', 0],
      ['某地多年平均夏季炎热多雨、冬季温和少雨，描述的是？', '气候特征', '一次天气过程', '某天的天气预报', '一天内的气温变化', '多年平均的大气状况属于气候。', 1],
      ['一天中气温通常最高的时段大约在？', '午后', '日出前后', '午夜', '正午太阳高度刚达到最大的一刻', '地面吸收太阳辐射后继续增温，气温最高常出现在午后。', 0],
      ['判断某地降水季节分配，最直接应比较什么？', '各月降水量', '各月人口数', '每月经度变化', '各月昼夜方向', '降水量柱状图展示各月降水多少与季节变化。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-ch5-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '第五章 居民与文化', section: '本章复习与测试', directoryUrl: geography7a,
    evidence: '依据人教版七上第五章目录，围绕人口、人种、城乡聚落和文化多样性组织综合复习。',
    points: [['居民分布与聚落', '分析人口分布差异及自然、社会经济条件对聚落的影响。'], ['文化多样性', '尊重不同地区文化传统，理解文化与自然及历史环境的联系。']],
    questions: [
      ['世界人口分布较稠密的地区通常具有哪种共同条件？', '气候较适宜、地形和生产生活条件较便利', '全年严寒且缺水', '地势极高且交通困难', '远离水源且没有生产活动', '自然条件和社会经济条件共同影响人口分布。', 0],
      ['传统聚落沿河流分布，可能与哪项有关？', '水源、交通和生产生活需要', '河流能决定每个人的职业', '沿河地区永远不会发生洪水', '聚落只能在平原之外形成', '水源和交通便利会影响聚落选址，但还需考虑风险。', 1],
      ['面对不同地区的节日和饮食习惯，较合适的态度是？', '了解其形成背景并尊重文化差异', '只接受自己熟悉的习俗', '把一种文化简单分成高低优劣', '要求各地习俗完全相同', '文化多样性需要了解与尊重。', 0],
      ['城镇和乡村聚落在职能上可能存在差异，哪项判断更合理？', '城镇通常服务和非农活动较集中，乡村与农业生产联系较密切', '二者建筑、人口和功能完全相同', '乡村没有任何公共服务', '城镇不需要周边乡村提供产品', '城乡聚落职能有差异，也通过联系互相支持。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-food-crops-project', grade: '初一', subject: '地理', volume: '上册',
    chapter: '跨学科主题学习 探索外来食料作物传播史', section: '跨学科主题学习 探索外来食料作物传播史', directoryUrl: geography7a,
    evidence: '依据人教版七上跨学科主题目录，结合作物原产地、传播路线与历史地图证据设计探究题。',
    points: [['作物原产与传播', '区分作物的原产地、传播路线和在新地区的种植扩展。'], ['跨学科证据', '综合历史记录、地图和作物分布材料解释传播过程。']],
    questions: [
      ['玉米、马铃薯等作物传入亚洲前，其重要原产区域主要在？', '美洲', '南极洲', '北冰洋沿岸', '欧洲北部', '玉米和马铃薯等作物起源于美洲，后经交流传播到其他地区。', 0],
      ['研究一种外来食料作物如何传入中国，哪组证据最有帮助？', '历史文献、传播路线地图和作物种植分布材料', '只看当前超市价格', '只统计作物叶片颜色', '只凭一个地名猜测传播路线', '多类型材料相互印证能更可靠地还原传播过程。', 1],
      ['一种作物已经在某地广泛种植，是否说明它一定起源于当地？', '不能，原产地与后来种植地区可能不同', '能，种植范围就是原产范围', '能，传播后原产地会自动改变', '不能，因为作物不会迁移', '引种和传播会使种植范围扩大，但不改变作物原产地。', 0],
      ['比较作物传播路线时，地图最适合展示哪类信息？', '不同地点之间的空间联系和可能传播方向', '作物的全部基因序列', '某个人当时的内心想法', '未来每年的市场价格', '地图表达空间位置和路线，其他信息要用相应资料核实。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7a-book-review', grade: '初一', subject: '地理', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: geography7a,
    evidence: '依据人教版七上地球、地图、陆地和海洋、天气与气候、居民与文化、发展合作等单元组织综合题。',
    points: [['地理工具与自然环境', '运用经纬网、地图、气候和地形知识解释空间差异。'], ['人地关系与区域联系', '联系居民文化、区域发展和国际合作理解地理现象。']],
    questions: [
      ['要比较两个城市的纬度位置，应使用哪种信息？', '两地的纬度坐标', '两地的海拔颜色', '当地人口年龄结构', '城市建筑高度', '纬度坐标用于描述南北位置。', 0],
      ['某区域人口密集且夏季降水集中，解释其生产生活状况时应怎样做？', '综合考虑自然条件、资源和社会经济活动', '只用一个季节的天气决定所有结论', '忽略地形和水源条件', '认为人口分布与环境完全无关', '地理现象通常由多种条件共同影响。', 1],
      ['学习全球经济联系，哪项最能体现区域间相互依赖？', '不同地区通过贸易、交通和信息交流联系起来', '每个国家完全不与其他地区往来', '自然资源在各地分布完全相同', '地图上的国界会阻断所有交流', '全球经济联系通过多种跨区域活动形成。', 0],
      ['自然环境与人类活动关系的正确认识是？', '人类利用环境，同时也要关注活动对环境的影响', '人类活动永远不会改变环境', '自然环境只受人口数量影响', '只要发展经济就不必考虑资源条件', '合理理解人地关系要同时关注环境条件和人类影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-ch6-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第六章 我们生活的大洲——亚洲', section: '章节综合与测试', directoryUrl: geography7b,
    evidence: '依据人教版七下亚洲章节目录，综合亚洲位置、范围、地形、气候、河流和人口区域差异。',
    points: [['亚洲位置与范围', '结合经纬度、海陆位置和区域边界描述亚洲范围。'], ['亚洲自然环境', '联系地形、气候和河流分布理解亚洲自然环境的区域差异。']],
    questions: [
      ['亚洲北、东、南三面濒临的大洋依次是？', '北冰洋、太平洋、印度洋', '大西洋、太平洋、北冰洋', '印度洋、大西洋、太平洋', '太平洋、北冰洋、大西洋', '亚洲北临北冰洋、东临太平洋、南临印度洋。', 0],
      ['亚洲地势中部高、四周低，对河流流向有什么影响？', '许多大河由中部流向周边海洋', '河流都由海洋流向中部', '河流只能向北流', '河流不受地势影响', '地势总体特征影响河流的流向和流域分布。', 1],
      ['亚洲跨纬度范围广，最可能造成哪种结果？', '南北气候和自然景观差异显著', '所有地区昼夜长短完全一样', '全年各地气温相同', '所有河流结冰期相同', '纬度跨度大使太阳辐射和气候呈现明显差异。', 0],
      ['描述亚洲地理位置时，哪组信息最完整？', '半球位置、纬度范围和周边海陆位置', '只说亚洲面积很大', '只列举一个国家首都', '只说明某条河流长度', '完整位置描述需要经纬度和海陆等信息。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-ch7-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第七章 我们邻近的国家和地区', section: '章节综合与测试', directoryUrl: geography7b,
    evidence: '依据人教版七下邻近国家目录，综合日本、东南亚、印度和俄罗斯的区位与区域特征。',
    points: [['邻近区域区位', '运用地图比较日本、东南亚、印度和俄罗斯的地理位置。'], ['自然环境与发展', '联系地形、气候、资源和人口理解区域生产生活特征。']],
    questions: [
      ['日本多火山、地震，主要因为它位于？', '板块交界附近', '世界最大沙漠中心', '大陆内部稳定地带', '赤道无风带', '日本位于环太平洋地震火山带，板块活动较活跃。', 0],
      ['东南亚位于亚洲与大洋洲、太平洋与印度洋之间，地理位置的重要性体现在？', '是海上交通和区域交往的重要通道', '完全远离海洋', '全年受极地气候控制', '所有国家都位于大陆内部', '东南亚处于多条海上交通路线交会区域。', 1],
      ['印度农业受季风影响较明显，哪种风险需要关注？', '季风降水年际变化可能导致旱涝灾害', '全年没有降水', '冬季一定持续暴雨', '地形完全阻断季节风', '季风强弱和进退变化会影响降水及农业生产。', 0],
      ['俄罗斯地跨亚欧两洲，分析其交通和开发条件时应关注什么？', '国土广大、气候差异和资源空间分布', '国土全部位于热带海岛', '人口只分布在北冰洋沿岸', '各地区自然条件完全一样', '国土辽阔带来区域差异，资源、气候与交通需综合考察。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-ch8-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第八章 东半球其他的国家和地区', section: '章节综合与测试', directoryUrl: geography7b,
    evidence: '依据人教版七下东半球区域目录，综合中东、欧洲西部、撒哈拉以南非洲和澳大利亚。',
    points: [['区域差异比较', '比较不同区域的自然条件、资源、人口与生产活动。'], ['区域联系与发展', '从资源、贸易和环境角度理解区域发展面临的机遇与问题。']],
    questions: [
      ['中东地处亚、欧、非交界并连接多条海上航线，体现了什么特点？', '地理位置重要，区域联系广泛', '完全与其他地区隔绝', '全年由极地冰雪覆盖', '没有任何陆上交通联系', '中东位于重要的洲际和海上交通联系地带。', 0],
      ['欧洲西部许多地区发展乳畜业，常与哪种条件相关？', '温带海洋性气候较适宜多汁牧草生长', '全年高温干旱且无草场', '永久冻土广泛分布', '所有地区都位于热带雨林', '温和湿润的气候有利于牧草生长和乳畜业发展。', 1],
      ['撒哈拉以南非洲经济发展面临的一个问题是？', '部分国家出口商品种类较单一，易受国际市场影响', '所有国家没有矿产资源', '完全没有农业生产条件', '各国之间没有任何贸易', '单一经济结构可能使出口收入受国际市场波动影响。', 0],
      ['澳大利亚被称为“骑在羊背上的国家”和“坐在矿车上的国家”，反映其？', '畜牧业和矿产资源开发在经济中较突出', '农业和矿业从未发展', '人口全部集中在内陆沙漠', '只依靠热带雨林伐木', '这些称呼概括了澳大利亚传统畜牧业和矿业特色。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-ch9-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第九章 西半球的国家', section: '章节综合与测试', directoryUrl: geography7b,
    evidence: '依据人教版七下西半球国家目录，比较美国和巴西的区位、农业、工业与自然环境。',
    points: [['美国区域特征', '结合地形、农业区分布和产业联系理解美国经济特点。'], ['巴西自然与经济', '联系热带自然环境、亚马孙流域和人口经济分布分析巴西。']],
    questions: [
      ['美国农业生产专业化程度较高，哪项有助于解释这种布局？', '不同地区自然条件和市场联系存在差异', '全国气候、土壤和地形完全相同', '农业生产不需要交通运输', '所有农作物都只种在城市中心', '自然条件与市场共同影响农业地域分工。', 0],
      ['美国人口和城市较多分布在较适宜开发的地区，说明分析人口分布要考虑？', '自然条件、交通和经济发展等因素', '只看国家面积', '只看地图颜色', '只统计山脉名称', '人口分布是多种自然和社会经济条件共同作用的结果。', 1],
      ['亚马孙热带雨林具有重要生态价值，保护时应兼顾什么？', '生态系统保护与当地居民合理发展需求', '立即砍伐全部森林', '禁止任何科学调查', '只关注木材短期销售收入', '雨林保护需要兼顾生态功能和可持续发展。', 0],
      ['巴西人口与经济活动主要集中在东南沿海一带，分析原因时应考虑？', '历史开发、交通条件和产业集聚等因素', '该地区远离海岸', '全国气候毫无差异', '亚马孙河流经所有城市', '人口和产业分布与开发历史、区位和交通有关。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-ch10-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第十章 极地地区', section: '章节综合与测试', directoryUrl: geography7b,
    evidence: '依据人教版七下极地地区目录，区分南极与北极自然环境、科考活动和环境保护。',
    points: [['极地环境差异', '比较南极地区与北极地区的位置、海陆组成和自然环境。'], ['科学考察与保护', '理解极地科考价值并遵守国际合作和环境保护要求。']],
    questions: [
      ['南极地区主体是大陆，北极地区主体是？', '被海洋环绕的北冰洋及其周边地区', '被大陆环绕的南极洲', '一片热带草原', '赤道附近群岛', '南极以大陆为主体，北极以北冰洋为主体。', 0],
      ['南极地区气候酷寒、降水稀少，常被称为？', '白色荒漠', '世界雨极', '热带雨林', '风暴最多的赤道地区', '南极寒冷干燥，降水少，因此有“白色荒漠”之称。', 1],
      ['在南极开展科学考察时，哪种做法最合适？', '按计划收集数据并严格处理废弃物、保护环境', '留下生活垃圾作为标记', '捕捉野生动物作为纪念', '随意扩大活动范围', '极地环境脆弱，科考应遵守规范并减少干扰。', 0],
      ['北极地区有北极熊，南极地区有企鹅，体现了什么？', '两地生态环境和物种分布存在差异', '两种动物都只生活在热带', '动物分布与自然环境无关', '南北极属于同一块大陆', '南北极位置和环境不同，动物分布也有差异。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-geography-7b-book-review', grade: '初一', subject: '地理', volume: '下册',
    chapter: '全册综合', section: '全册综合', directoryUrl: geography7b,
    evidence: '依据人教版七下亚洲、邻近国家、东半球区域、西半球国家和极地地区五章组织全册综合题。',
    points: [['区域定位与比较', '通过地图定位亚洲及代表国家和地区，比较自然环境与人类活动。'], ['区域联系与可持续发展', '从资源、贸易、生态和国际合作角度分析区域发展问题。']],
    questions: [
      ['比较日本和俄罗斯时，哪项区位差异判断正确？', '日本是四面临海的岛国，俄罗斯国土横跨亚欧大陆', '日本是世界上面积最大的内陆国', '俄罗斯全部位于南半球', '两国都位于非洲大陆', '两国在海陆位置和国土范围上差异明显。', 0],
      ['亚洲许多大河自中部流向周边，分析这种格局应优先结合？', '地势中部高、四周低的总体特点', '人口年龄结构', '语言分布', '国家边界颜色', '地势差异影响河流流向和水系分布。', 1],
      ['区域发展与生态保护之间，较可持续的做法是？', '评估资源环境承载力并采用合理开发方式', '不调查环境就扩大开采', '认为资源可以无限使用', '把所有区域都改造成同一种产业', '可持续发展要求把资源利用与环境影响一并考虑。', 0],
      ['学习世界区域地理，为什么要把位置、自然环境和经济活动结合起来？', '它们相互联系，共同影响区域特征和发展方式', '它们彼此无关，不能放在一起分析', '只有国家名称有地理意义', '经济活动不受环境和交通影响', '综合区域分析要联系位置、环境条件与人类活动。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const math7LeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-math-7a-negative-history', grade: '初一', subject: '数学', volume: '上册',
    chapter: '一 有理数', section: '我国古代关于负数及有理数加减的记载', directoryUrl: math7a,
    evidence: '依据冀教版2024七上目录中的数学史阅读条目，联系负数表示相反意义的量及有理数加减。',
    points: [['负数的实际意义', '用正数和负数表示具有相反意义的量。'], ['有理数加减的应用', '根据情境确定符号并正确进行有理数加减运算。']],
    questions: [
      ['账面“收入80元、支出30元”若以收入记为正数，收支合计怎样表示？', '+80+(-30)=+50（元）', '+80+30=+110（元）', '-80+30=-50（元）', '-80-30=-110（元）', '收入和支出方向相反，支出记为负数，合计为50元收入。', 0],
      ['用数轴表示温度从-4℃升高7℃，结果是多少？', '3℃', '-11℃', '-3℃', '11℃', '升高7℃对应加7，-4+7=3。', 1],
      ['一笔账户余额为-12元，又存入20元，余额为？', '8元', '-32元', '-8元', '32元', '-12+20=8，余额转为正数。', 0],
      ['使用负数记录“低于海平面5米”时，海平面高度记为0，正确表示是？', '-5米', '+5米', '5米但不标方向', '0米', '低于基准面用负数表示。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-tangram', grade: '初一', subject: '数学', volume: '上册',
    chapter: '二 几何图形的初步认识', section: '数学活动 有趣的七巧板', directoryUrl: math7a,
    evidence: '依据冀教版2024七上七巧板活动目录，考查基本图形识别、拼组和面积关系。',
    points: [['图形拼组', '识别七巧板中的三角形、平行四边形和正方形等基本图形。'], ['图形变换与面积', '通过平移、旋转和翻转拼组图形，理解拼合不改变各块面积。']],
    questions: [
      ['把七巧板中的一块三角形旋转后放入新位置，它的面积怎样变化？', '面积不变', '面积变为原来的2倍', '面积减半', '仅旋转角度就会改变面积', '旋转改变位置和方向，不改变图形面积。', 0],
      ['用两块全等直角三角形拼成一个平行四边形，拼合时应使它们？', '沿一条对应斜边相接并方向相反', '只把顶点碰在一起', '重叠全部面积', '将其中一块剪去一半', '两块全等三角形可沿对应边拼成平行四边形。', 1],
      ['比较两个由同一副七巧板拼成的图案，哪项一定相同？', '两图所用全部拼板的总面积', '图案的周长一定相同', '图案的外轮廓一定相同', '图案的对称轴条数一定相同', '拼板面积总和相同，但外轮廓和周长可能不同。', 0],
      ['设计七巧板图案时，先标出每块板的边界有什么作用？', '检查是否重叠或留下空隙，并说明拼组关系', '使所有图形自动变成圆形', '保证图案周长最短', '改变每块板的面积', '标出边界便于验证拼接是否完整。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-algebra-origin', grade: '初一', subject: '数学', volume: '上册',
    chapter: '三 代数式', section: '读一读 代数学的来源', directoryUrl: math7a,
    evidence: '依据冀教版2024七上“代数学的来源”阅读栏目，练习以字母表示数和表达数量关系。',
    points: [['字母表示数', '用字母表示未知数或可变化的数，概括一般数量关系。'], ['代数表达', '把文字描述转化成代数式并解释式中运算的实际意义。']],
    questions: [
      ['每本练习册a元，购买5本共需多少元？', '5a元', 'a+5元', 'a/5元', '5+a元', '总价等于单价乘数量。', 0],
      ['一个数x的3倍比它大8，较合适的代数式是？', '3x-x=8', '3+x=8', 'x-3=8', '3x+8=x', '“3倍比它大8”表示3x比x大8。', 1],
      ['长方形长为m、宽为n，它的周长可表示为？', '2(m+n)', 'mn', 'm+n', '2m+n', '周长是两条长和两条宽之和。', 0],
      ['用字母表示“连续两个整数”，可以写成？', 'n和n+1', 'n和2n', 'n和n-1/2', 'n和n²', '相邻整数相差1，可用n与n+1表示。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-legend-project', grade: '初一', subject: '数学', volume: '上册',
    chapter: '三 代数式', section: '数学活动 古老的传说 今日的思索', directoryUrl: math7a,
    evidence: '依据冀教版七上综合实践“古老的传说 今日的思索”目录，训练从叙述中提取数量关系并用字母表达。',
    points: [['故事数量关系建模', '从文字叙述中识别数量、倍数和差量关系。'], ['代数式解释与验证', '用代数式表示规律，并以具体数值检验表达是否符合题意。']],
    questions: [
      ['传说中某物数量为x，另一物数量是它的2倍，第二种数量应表示为？', '2x', 'x+2', 'x/2', 'x²', '“是它的2倍”用2x表示。', 0],
      ['一段故事说“先增加5，再乘以3”，初始数量为n，结果应写成？', '3(n+5)', '3n+5', 'n+15', '3n-5', '先增加5后整体乘3，应给n+5加括号。', 1],
      ['故事里的总数为a，分给4人且平均分，每人所得是？', 'a/4', 'a-4', '4a', 'a+4', '平均分成4份，用总数除以4。', 0],
      ['某规律用代数式2n+1表示，n=4时结果为？', '9', '10', '7', '12', '代入n=4，2×4+1=9。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-four-equals-one', grade: '初一', subject: '数学', volume: '上册',
    chapter: '五 一元一次方程', section: '读一读 4=1?', directoryUrl: math7a,
    evidence: '依据冀教版七上“4=1?”阅读栏目，围绕等式性质和非法除以零识别伪证明。',
    points: [['等式性质', '对等式两边进行相同的合法运算，等式关系保持不变。'], ['检验推理步骤', '检查约分、除法等运算的条件，特别留意除数不能为零。']],
    questions: [
      ['伪证明经过某一步把等式两边同除以a-b，已知a=b。错误在于？', '除数a-b等于0，不能作除数', '等式两边不能同时除以正数', '减法不满足交换律', '等式两边不能同时出现字母', 'a=b时a-b=0，除以零没有意义。', 0],
      ['由x+2=7求x，哪一步合法？', '等式两边同时减2，得到x=5', '只把左边的2移走但不改变右边', '等式两边同时乘0并保留唯一解', '把7改成-7', '等式两边同时减去相同的数，等式仍成立。', 1],
      ['检验一段代数推导是否可靠，哪种做法最有效？', '逐步检查每次变形的依据和运算条件', '只看最后答案是否整齐', '省略所有中间步骤', '认为出现等号就一定正确', '伪证明常在某个不合法变形处出错。', 0],
      ['方程3x=12两边同时除以3，结果是？', 'x=4', 'x=9', 'x=36', 'x=15', '除以非零数3可得x=12÷3=4。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-accountant', grade: '初一', subject: '数学', volume: '上册',
    chapter: '五 一元一次方程', section: '做个小小会计师', directoryUrl: math7a,
    evidence: '依据冀教版七上“一元一次方程应用”实践栏目，使用收支、总量和单价数量关系设计计算题。',
    points: [['收支与总量', '按统一符号记录收入、支出和结余，检查总量关系。'], ['方程解决账目问题', '根据单价、数量、总价和预算之间的等量关系列方程。']],
    questions: [
      ['班费原有120元，买文具花去38元，又收到同学补交的20元，现有多少元？', '102元', '98元', '178元', '62元', '结余为120-38+20=102元。', 0],
      ['每支笔4元，买x支共花28元，方程应列为？', '4x=28', 'x+4=28', '4+x=28', '28x=4', '总价等于单价乘数量。', 1],
      ['活动收入95元，支出67元，结余占收入多少元？', '28元', '162元', '32元', '67元', '结余等于收入减支出，95-67=28。', 0],
      ['一盒彩笔比一支笔贵16元，彩笔盒价格为x元，单支笔价格可表示为？', 'x-16元', 'x+16元', '16x元', 'x/16元', '“彩笔盒比单支贵16元”，所以单支价格少16元。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7a-space-station-orbit', grade: '初一', subject: '数学', volume: '上册',
    chapter: '五 一元一次方程', section: '天宫空间站轨道长度变了多少', directoryUrl: math7a,
    evidence: '依据冀教版七上轨道长度实践条目，以明确给定的假设数据训练用一元一次方程表示变化量。',
    points: [['未知变化量建模', '把变化前后数量关系转化为含一个未知数的等量关系。'], ['一元一次方程求解', '解出变化量后代回原情境检查单位和结果是否合理。']],
    questions: [
      ['假设轨道长度由44,000千米变为43,760千米，缩短了多少千米？', '240千米', '760千米', '43,760千米', '87,760千米', '缩短量为44,000-43,760=240千米。', 0],
      ['轨道原长L千米，缩短x千米后为43,760千米，正确等量关系是？', 'L-x=43,760', 'L+x=43,760', 'x-L=43,760', 'Lx=43,760', '缩短后长度等于原长减去缩短量。', 1],
      ['已知L=44,000，方程44,000-x=43,760的解是？', 'x=240', 'x=43,760', 'x=87,760', 'x=760', '移项或用差计算可得x=240。', 0],
      ['求出缩短量后，哪项检查最合理？', '把缩短量加回新长度，检验是否得到原长度', '确认缩短量大于原长度', '删去单位再比较数字', '把新长度当作缩短量', '43,760+240=44,000，符合题意。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch6-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第六章 二元一次方程组', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第六章目录，综合二元一次方程组解法、检验和实际问题建模。',
    points: [['方程组的解', '方程组的解必须同时满足组内每一个方程。'], ['消元与应用', '用代入或加减消元求解，并按数量关系列方程组。']],
    questions: [
      ['方程组x+y=7，x-y=1的解是？', 'x=4，y=3', 'x=3，y=4', 'x=5，y=2', 'x=2，y=5', '两式相加得2x=8，故x=4、y=3。', 0],
      ['检验一组数是否为方程组的解，应如何做？', '代入组内每个方程检查是否都成立', '只检查第一个方程', '只检查两个未知数是否为整数', '把两个方程相减后不再检验', '方程组的解必须同时满足每一个方程。', 1],
      ['已知2x+y=11且x=4，则y为？', '3', '7', '11', '19', '代入得8+y=11，所以y=3。', 0],
      ['笔记本每本4元、签字笔每支3元，买3本和2支共18元，另买2本和3支共17元。设笔记本单价a、签字笔单价b，方程组是？', '3a+2b=18，2a+3b=17', '3a+2b=17，2a+3b=18', 'a+b=18，a-b=17', '6a+5b=18，5a+6b=17', '按每次购买的数量分别写总价关系。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch7-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第七章 相交线与平行线', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第七章目录，复习相交线角关系、平行线判定与性质。',
    points: [['相交线角关系', '识别对顶角、邻补角并利用角度关系计算。'], ['平行线判定与性质', '用同位角、内错角和同旁内角关系判定或推导平行。']],
    questions: [
      ['两条直线相交，一个角为50°，它的对顶角为？', '50°', '130°', '90°', '40°', '对顶角相等。', 0],
      ['一个角为50°，与它相邻且组成平角的角为？', '130°', '50°', '230°', '90°', '邻补角之和为180°，180°-50°=130°。', 1],
      ['两条直线被第三条直线所截，一对同位角相等，可以判定两直线？', '平行', '垂直', '重合', '长度相等', '同位角相等是判定两直线平行的条件之一。', 0],
      ['两条直线被截，同旁内角分别为70°和110°，可以判定两直线？', '平行', '相交且垂直', '重合', '一定不平行', '同旁内角互补可判定两直线平行。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch8-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第八章 整式的乘法', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第八章目录，练习幂的运算、单项式乘多项式和乘法公式。',
    points: [['整式乘法', '运用乘法分配律和同底数幂运算规则进行整式乘法。'], ['乘法公式', '识别并应用平方差公式和完全平方公式。']],
    questions: [
      ['2x(3x²-x+4)展开后是？', '6x³-2x²+8x', '6x²-2x+8', '5x³+3x²+6x', '6x³-x²+4x', '把2x分别乘括号中的每一项。', 0],
      ['(x+2)(x+3)展开后是？', 'x²+5x+6', 'x²+6x+5', 'x²+5', '2x²+5x+6', '利用分配律得到x²+3x+2x+6。', 1],
      ['(a+b)(a-b)等于？', 'a²-b²', 'a²+b²', 'a²-2ab+b²', 'a²+2ab+b²', '这是平方差公式。', 0],
      ['(x-4)²展开后是？', 'x²-8x+16', 'x²-16', 'x²+8x+16', 'x²-4x+16', '完全平方公式为(x-4)²=x²-8x+16。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch9-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第九章 因式分解', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第九章目录，复习提公因式法、公式法及因式分解检验。',
    points: [['提公因式法', '把各项的公因式提出，将多项式写成因式乘积。'], ['公式法与检验', '识别平方差和完全平方结构，并通过乘法展开检验结果。']],
    questions: [
      ['6x²+9x提取公因式后是？', '3x(2x+3)', '3(2x²+9x)', 'x(6x+9)', '9x(6x+1)', '6x²和9x的最大公因式是3x。', 0],
      ['x²-25因式分解为？', '(x-5)(x+5)', '(x-5)²', '(x+25)(x-1)', 'x(x-25)', 'x²-25是平方差，a²-b²=(a-b)(a+b)。', 1],
      ['x²+6x+9因式分解为？', '(x+3)²', '(x+9)(x-1)', '(x+3)(x-3)', 'x(x+6)+9', '这是完全平方三项式。', 0],
      ['检验因式分解x²-4=(x-2)(x+2)，怎样做？', '把右边乘开并确认等于左边', '把两个因式相加', '只比较常数项', '把x都替换成0后不再判断', '展开右边得到x²-4即可验证。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch10-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第十章 三角形', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第十章目录，练习三角形边角关系及角平分线、中线和高等线段。',
    points: [['三角形边角关系', '运用内角和、外角关系和三角形三边关系进行判断。'], ['特殊线段与全等', '区分角平分线、中线和高，利用对应关系分析三角形。']],
    questions: [
      ['三角形两个内角分别为45°和65°，第三个内角为？', '70°', '80°', '90°', '110°', '三角形内角和为180°，第三角为180°-45°-65°=70°。', 0],
      ['三角形两边长分别为4和7，第三边x满足？', '3<x<11', 'x>11', 'x<3', 'x=3或x=11', '三角形任意两边之差小于第三边，第三边小于两边之和。', 1],
      ['三角形的中线是？', '连接一个顶点与对边中点的线段', '平分一个角并垂直于对边的线段', '连接两个边中点的线段', '与三边都平行的线段', '中线连接顶点和对边中点。', 0],
      ['三角形一个外角为120°，与它不相邻的两个内角和为？', '120°', '60°', '180°', '240°', '三角形外角等于与它不相邻的两个内角之和。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-ch11-review', grade: '初一', subject: '数学', volume: '下册',
    chapter: '第十一章 一元一次不等式和一元一次不等式组', section: '回顾与反思', directoryUrl: math7b,
    evidence: '依据冀教版2024七下第十一章目录，复习不等式性质、解集表示和实际应用。',
    points: [['不等式性质', '对不等式两边同加、同减或同乘正数方向不变，乘除负数需改变方向。'], ['不等式组与应用', '求各不等式解集的公共部分，并用情境检验解集合理性。']],
    questions: [
      ['解不等式3x-2>7，结果是？', 'x>3', 'x<3', 'x>5', 'x<5', '3x>9，两边除以正数3得x>3。', 0],
      ['解不等式-2x<6时，正确结果是？', 'x>-3', 'x<-3', 'x>3', 'x<3', '两边除以负数-2时不等号方向改变。', 1],
      ['不等式组x>1且x≤4的解集是？', '1<x≤4', 'x≤1', 'x>4', 'x<1或x>4', '解集取两个条件的公共部分。', 0],
      ['一张票x元，买3张不超过60元，怎样表示预算条件？', '3x≤60', 'x+3≤60', '3+x=60', '60x≤3', '三张票的总价不超过60元。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-periscope-project', grade: '初一', subject: '数学', volume: '下册',
    chapter: '项目学习 主题活动（一）潜望镜里的数学', section: '项目学习 主题活动（一）潜望镜里的数学', directoryUrl: math7b,
    evidence: '依据冀教版2024七下潜望镜主题活动，联系平行线、角关系和几何图形表达光路模型。',
    points: [['潜望镜几何模型', '用线段、直线和角表示镜面及光线传播路径。'], ['角关系与验证', '利用平行线性质分析两次反射后的方向变化并检查模型。']],
    questions: [
      ['潜望镜内两块平面镜通常平行放置，光线经两次反射后能够？', '改变传播方向并从观察口进入眼睛', '自动变成声音', '不经过任何镜面就转弯', '使光线停止传播', '平面镜改变光线传播方向，两次反射使观察者看到目标。', 0],
      ['两块平行镜被同一条光线方向线段模型截得，分析角度关系时可使用？', '平行线的同位角或内错角性质', '三角形三边关系', '圆的周长公式', '有理数乘法法则', '平行镜面构成平行线模型，可用截线角关系推理。', 1],
      ['设计潜望镜光路图时，哪项最能检查路径是否合理？', '画出入射光线、镜面和反射后的光线路径', '只画潜望镜外壳颜色', '不标镜面位置', '把光线画成穿过不透明镜面', '光路图要明确表示镜面位置和光线方向。', 0],
      ['把一束光线对平面镜的入射角增大，反射角怎样变化？', '反射角随之增大且仍等于入射角', '反射角保持为0°', '反射角必定变为90°', '反射角与入射角之和永远为90°', '反射定律指出反射角等于入射角。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-math-7b-water-outlet-project', grade: '初一', subject: '数学', volume: '下册',
    chapter: '项目学习 主题活动（二）水管出水口设置在哪里最好', section: '项目学习 主题活动（二）水管出水口设置在哪里最好', directoryUrl: math7b,
    evidence: '依据冀教版七下水管出水口主题活动，将实际位置选择转化为可测量的距离和条件关系。',
    points: [['位置问题数学化', '明确供水点、使用地点、距离和约束条件，再建立可比较的数学模型。'], ['方案比较与说明', '依据计算、图示和现实限制比较位置方案，并解释选择依据。']],
    questions: [
      ['选择水管出水口位置前，哪项信息最需要先收集？', '用水点位置、连接距离和施工限制', '只收集管道颜色', '只记录天气预报', '只统计附近树木种类', '位置优化要先明确服务对象和实际约束。', 0],
      ['两个用水点在同一直线上，若希望两边连接管总长度尽量短，出水口位置比较应依据？', '到两个用水点的距离之和', '出水口名称的字数', '地图上符号的颜色', '两处用水点的面积差', '总管长由出水口到各用水点的距离共同决定。', 1],
      ['一个方案距离短但无法施工，另一个稍长且能安全连接，选择时应？', '同时考虑距离目标和施工安全等限制条件', '只选图上距离最短的方案', '忽略水压和安全要求', '不记录比较理由', '实际最优方案必须满足现实约束。', 0],
      ['小组要说明所选出水口为何合适，哪种表达最有说服力？', '标出候选位置、距离数据、约束条件和比较过程', '只说“看起来不错”', '只贴一张没有比例的照片', '不提供计算或测量依据', '明确数据与比较过程可以支持可复核的方案说明。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const biology7LeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-biology-7a-u1-summary', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第一单元 生物体的结构层次', section: '单元总结', directoryUrl: biology7a,
    evidence: '按冀少版2024七上第一单元目录及教育部2024义务教育用书目录（确认冀少版出版信息）整理，复习细胞到生物体的层次。',
    points: [['结构层次', '理解细胞、组织、器官、系统和生物体之间的层次关系。'], ['结构与功能', '用结构和功能相适应的观点解释细胞、组织和器官的作用。']],
    questions: [
      ['人体从细胞到个体的结构层次顺序正确的是？', '细胞→组织→器官→系统→人体', '组织→细胞→器官→人体→系统', '细胞→器官→组织→系统→人体', '系统→组织→器官→细胞→人体', '多个细胞形成组织，组织构成器官，器官组成系统并共同构成个体。', 0],
      ['具有相似结构和功能的细胞组合在一起，通常形成？', '组织', '器官', '系统', '个体', '组织由形态相似、结构和功能相同或相近的细胞构成。', 1],
      ['胃属于哪一结构层次？', '器官', '细胞', '组织', '系统', '胃由多种组织构成并完成一定功能，属于器官。', 0],
      ['判断某结构属于器官，最关键的依据是什么？', '由多种组织构成并共同完成一定功能', '只含有一种细胞', '一定能独立生活', '一定能进行光合作用', '器官通常由不同组织构成并协同完成特定功能。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-moss-ferns', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第二节 植物', section: '一、苔藓植物和蕨类植物', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上植物类群目录，对照苔藓与蕨类的形态、生活环境和繁殖特征。',
    points: [['苔藓植物特征', '苔藓植株较矮小，多生活在阴湿处，通常没有真正的根和输导组织。'], ['蕨类植物特征', '蕨类有根、茎、叶和输导组织，依靠孢子繁殖，常见于阴湿环境。']],
    questions: [
      ['苔藓植物常生活在阴湿处，主要原因之一是？', '生殖过程和生活需要较湿润的环境', '必须依靠海水完成光合作用', '没有叶绿素只能寄生', '只能在沙漠中吸收地下水', '苔藓植物生殖和生长与湿润环境关系密切。', 0],
      ['苔藓植物与蕨类植物相比，苔藓通常？', '没有真正的根，植株较矮小', '具有发达的花和果实', '以种子繁殖', '具有木质化树干', '苔藓没有真正的根和输导组织，通常较矮小。', 1],
      ['蕨类植物叶片背面常可观察到褐色斑点，这些结构通常与什么有关？', '孢子囊群', '果实成熟', '花粉形成', '种子储藏', '蕨类通过孢子繁殖，孢子囊常成群分布在叶片背面。', 0],
      ['下列植物中，属于蕨类植物的是？', '肾蕨', '葫芦藓', '小麦', '松树', '肾蕨有根、茎、叶并以孢子繁殖，属于蕨类。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-seed-plants', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第二节 植物', section: '二、种子植物', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上种子植物目录，考查种子结构、裸子与被子植物差别及种子传播。',
    points: [['种子植物繁殖', '种子含有胚，胚在适宜条件下可发育成新植物。'], ['裸子与被子植物', '比较种子是否被果皮包被等特征区分两类植物。']],
    questions: [
      ['种子中将来发育成新植物幼体的主要结构是？', '胚', '果皮', '种皮', '胚乳外的空气', '胚包括胚芽、胚轴、胚根和子叶等部分。', 0],
      ['被子植物与裸子植物的主要区别之一是？', '被子植物的种子外有果皮包被', '裸子植物一定没有根', '被子植物都生活在水中', '裸子植物都没有叶片', '果皮包被种子是被子植物的重要特征。', 1],
      ['下列植物属于裸子植物的是？', '松树', '桃树', '豌豆', '棉花', '松的种子裸露，不由果皮包被，属于裸子植物。', 0],
      ['种子萌发通常需要哪组基本条件？', '适宜的水分、温度和充足空气', '强光、肥料和果实', '低温、无水和密闭环境', '只要种皮破损即可', '种子萌发需要适宜的水分、温度和空气。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-nematodes-annelids', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第三节 无脊椎动物', section: '一、线虫动物和环节动物', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上无脊椎动物目录，比较线虫与环节动物的身体结构和代表动物。',
    points: [['线虫动物', '线虫身体细长、两端渐尖，身体不分节，常见蛔虫等代表。'], ['环节动物', '环节动物身体由许多相似体节构成，蚯蚓是常见代表。']],
    questions: [
      ['线虫动物与环节动物最明显的身体结构差异是？', '环节动物身体有许多体节，线虫身体不分节', '线虫有脊柱而环节动物没有', '线虫有羽毛而环节动物有鳞片', '环节动物都生活在海洋', '身体是否分节是区分这两类动物的重要特征。', 0],
      ['蛔虫属于哪类动物？', '线虫动物', '环节动物', '软体动物', '节肢动物', '蛔虫身体细长、不分节，属于线虫动物。', 1],
      ['观察蚯蚓时，身体上许多相似环节体现了什么特征？', '身体分节', '具有外骨骼', '有羽毛覆盖', '由贝壳包裹', '蚯蚓属于身体分节的环节动物。', 0],
      ['蚯蚓生活在潮湿土壤中，实验观察后应怎样处理？', '保持体表湿润并放回适宜环境', '长时间放在干燥阳光下', '用盐水浸泡后观察', '把它放入密闭无空气容器', '蚯蚓需要湿润体表进行气体交换，应减少伤害并及时放回。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-arthropods', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第三节 无脊椎动物', section: '二、节肢动物', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上节肢动物目录，考查外骨骼、分节和附肢特征及昆虫识别。',
    points: [['节肢动物共同特征', '身体分节、具有外骨骼和分节的附肢。'], ['昆虫识别', '昆虫通常具有头、胸、腹三部分和三对足。']],
    questions: [
      ['节肢动物名称中的“节肢”主要指？', '身体分节且附肢分节', '身体由一个细胞构成', '具有脊柱和四肢', '体表有羽毛', '节肢动物的附肢分节，身体也呈现分节特征。', 0],
      ['节肢动物体表的外骨骼有何作用？', '保护身体并减少水分散失', '代替所有内部器官', '使动物不需要生长', '让身体内部没有肌肉', '外骨骼可支持、保护身体并帮助减少水分蒸发。', 1],
      ['昆虫成虫通常有几对足？', '三对', '一对', '两对', '四对', '昆虫胸部通常有三对足。', 0],
      ['蜘蛛有四对足但没有翅，判断其不属于昆虫的重要依据是？', '足的对数和身体分区特征不符合昆虫特征', '蜘蛛不属于动物', '所有节肢动物都必须有翅', '蜘蛛生活在陆地上', '昆虫通常三对足，蜘蛛属于蛛形类节肢动物。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-fish', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第四节 脊椎动物', section: '一、鱼类', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上鱼类目录，结合鱼的水生生活、鳃呼吸、鳍运动和结构适应。',
    points: [['鱼类结构特征', '多数鱼类用鳃呼吸，以鳍辅助游泳并维持运动方向。'], ['结构与水生生活', '流线型身体、鳞片和鳍等结构与水中生活相适应。']],
    questions: [
      ['鱼在水中获取氧气的主要器官是？', '鳃', '肺', '气囊', '皮肤表面全部区域', '鱼类主要通过鳃从水中获取溶解氧。', 0],
      ['鱼鳍的主要作用是？', '辅助游泳、转向和保持身体平衡', '进行光合作用', '制造消化液', '形成体内骨髓', '不同鱼鳍在推进、转向和维持平衡方面发挥作用。', 1],
      ['鱼身体呈流线型，对水中运动有什么帮助？', '减小游动时受到的水阻力', '使鱼不再需要鳃', '保证鱼永远不会沉入水底', '使鱼可以在空气中呼吸', '流线型身体有助于减小水中运动阻力。', 0],
      ['观察鱼的鳃丝时发现其数量多且鲜红，最合理的解释是？', '鳃丝面积较大且血液丰富，利于气体交换', '鳃丝用来咀嚼食物', '鳃丝负责产生鳞片', '鳃丝使鱼在陆地上行走', '较大的鳃表面积和丰富血流有利于氧气交换。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-amphibians-reptiles', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第四节 脊椎动物', section: '二、两栖类和爬行类', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上两栖类和爬行类目录，比较生活环境、皮肤特征与生殖发育。',
    points: [['两栖类', '两栖动物幼体多生活在水中用鳃呼吸，成体多用肺并可通过皮肤辅助呼吸。'], ['爬行类', '爬行动物皮肤较干燥、有角质鳞片或甲，主要用肺呼吸。']],
    questions: [
      ['青蛙的幼体和成体在呼吸器官方面通常有什么不同？', '幼体主要用鳃，成体主要用肺并可借助皮肤', '幼体用肺，成体用鳃', '幼体和成体都用羽毛呼吸', '各阶段都不需要氧气', '青蛙经历变态发育，幼体与成体的生活和呼吸方式不同。', 0],
      ['爬行动物适应陆地生活的特点之一是？', '皮肤较干燥并有角质鳞片或甲', '体表必须始终保持湿润', '成体用鳃呼吸', '没有任何防止水分散失的结构', '角质覆盖有助于减少体表水分散失。', 1],
      ['下列动物中属于爬行动物的是？', '蜥蜴', '青蛙', '鲤鱼', '蚯蚓', '蜥蜴用肺呼吸、体表有角质鳞片，属于爬行动物。', 0],
      ['两栖动物的生殖发育常与水环境相关，主要是因为？', '受精卵和幼体通常需要在水中发育', '成体只能生活在海底', '它们没有任何呼吸器官', '它们必须用种子繁殖', '两栖类的卵和幼体多依赖水环境。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-birds', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第四节 脊椎动物', section: '三、鸟类', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上鸟类目录，复习羽毛、喙、前肢和呼吸循环等适应特征。',
    points: [['鸟类外部特征', '鸟类体表有羽毛，前肢变为翼，喙的形态与取食方式相关。'], ['飞行适应', '轻而坚实的骨骼、发达胸肌和高效呼吸循环有助于飞行。']],
    questions: [
      ['鸟类体表覆盖的羽毛主要有助于？', '保温并参与飞行相关功能', '进行光合作用', '代替所有骨骼', '从水中吸收氧气', '羽毛具有保温和形成翼面等作用。', 0],
      ['鸟的前肢适应飞行后形成了？', '翼', '鳃', '触角', '鳍', '鸟类前肢变为翼。', 1],
      ['鸟类的喙形态不同，常与什么有关？', '食物种类和取食方式', '鸟是否属于动物', '鸟生活的经纬度数值', '鸟的羽毛颜色必然相同', '喙的形态与取食方式相适应。', 0],
      ['鸟类飞行时需要较多氧气，哪种特点有助于满足需要？', '较高效的呼吸和循环系统', '完全停止血液循环', '只依靠皮肤呼吸', '飞行时不需要能量', '飞行耗能较高，需要呼吸和循环系统有效供氧。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-mammals', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 第一章 藻类、植物和动物 / 第四节 脊椎动物', section: '四、哺乳类', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上哺乳类目录，考查乳腺、毛发、牙齿分化和代表动物识别。',
    points: [['哺乳类主要特征', '雌性哺乳动物具有乳腺，可分泌乳汁哺育幼体，体表通常有毛。'], ['牙齿与生活方式', '哺乳动物牙齿常有分化，结构与食性及生活方式相关。']],
    questions: [
      ['哺乳动物最具代表性的特征之一是？', '雌性具有乳腺并以乳汁哺育幼体', '所有种类都能飞行', '幼体都生活在水中', '体表一定覆盖羽毛', '乳腺和哺乳是哺乳类名称及其重要特征的来源。', 0],
      ['哺乳动物体表的毛发通常有助于？', '保温和感受外界刺激', '进行光合作用', '替代肺进行呼吸', '制造骨骼', '毛发能够保温，也可参与触觉感受。', 1],
      ['兔子的门齿适于啃咬植物，说明牙齿结构与什么相适应？', '食性和取食方式', '所在国家的面积', '昼夜长短', '体内血型', '不同牙齿形态适应不同食物和取食功能。', 0],
      ['下列动物中属于哺乳动物的是？', '鲸', '鲨鱼', '乌龟', '鸽子', '鲸用肺呼吸、以乳汁哺育幼体，属于哺乳动物。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-silkworm-project', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 跨学科实践活动', section: '饲养家蚕，了解我国的养蚕历史', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上养蚕实践活动目录，结合家蚕生长记录、完全变态发育和蚕桑文化资料。',
    points: [['家蚕发育过程', '家蚕经历卵、幼虫、蛹和成虫四个阶段，属于完全变态发育。'], ['观察记录与历史资料', '持续观察并记录生长变化，结合可靠资料了解养蚕活动。']],
    questions: [
      ['家蚕的发育顺序正确的是？', '卵→幼虫→蛹→成虫', '卵→蛹→幼虫→成虫', '幼虫→卵→成虫→蛹', '蛹→成虫→卵→幼虫', '家蚕经历卵、幼虫、蛹和成虫四个阶段。', 0],
      ['家蚕幼虫取食桑叶，饲养时最重要的日常管理之一是？', '提供适量新鲜桑叶并保持饲养环境适宜', '把幼虫长期浸在水中', '停止记录发育变化', '每天频繁移动并摇晃蚕盒', '稳定食物和环境有利于家蚕正常生长，也便于观察。', 1],
      ['小组比较家蚕不同发育阶段，哪种记录方法更可靠？', '按日期记录形态、取食和行为并配合照片', '只在最后凭记忆写结论', '把不同个体观察结果混在一起不标日期', '只记录喜欢的阶段', '连续、有日期的观察记录便于比较发育变化。', 0],
      ['要了解我国养蚕历史，哪种资料使用方式更合适？', '查阅可信历史资料并注明来源，与观察记录区分', '把传说直接当作准确年代', '只依据一条未经核实的网络留言', '用现代饲养结果代替全部历史证据', '历史解释需核实来源，观察证据与历史材料应分别说明。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-yeast-project', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性 / 跨学科实践活动', section: '制作馒头，比较不同酵母菌种的发酵效果', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上酵母菌实践活动目录，考查酵母菌、发酵现象和单一变量实验设计。',
    points: [['酵母菌与发酵', '酵母菌利用糖类进行发酵，可产生二氧化碳并使面团膨松。'], ['公平比较实验', '比较酵母菌种时控制面粉、温度、用量和发酵时间等条件。']],
    questions: [
      ['酵母菌发酵使面团膨松，主要因为产生了什么？', '二氧化碳气体', '氧气', '氮气', '水蒸气以外的金属颗粒', '发酵产生的二氧化碳在面团中形成气泡，使其膨松。', 0],
      ['比较两种酵母菌的发酵效果，哪项设计最公平？', '除酵母菌种类外，其余条件保持相同', '每组使用不同面粉和不同水量', '一组放冰箱、一组放暖气旁', '一组发酵一小时、另一组一天', '控制其他条件相同，才能把结果差异归因于酵母菌种类。', 1],
      ['实验中用相同大小的面团并记录膨胀高度，主要是为了？', '用可比较的指标评价发酵效果', '保证两种酵母菌完全相同', '使实验不需要设置对照', '改变面团中的糖含量', '统一初始面团并测量高度，可定量比较变化。', 0],
      ['酵母菌属于哪类生物？', '真菌', '动物', '绿色植物', '细菌中的蓝细菌', '酵母菌是单细胞真菌。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7a-u2-summary', grade: '初一', subject: '生物', volume: '上册',
    chapter: '第二单元 生物的多样性', section: '单元总结', directoryUrl: biology7a,
    evidence: '依据冀少版2024七上第二单元目录，综合植物、动物、微生物、分类和生物资源保护。',
    points: [['生物类群与分类', '依据结构特征识别常见植物、动物和微生物类群。'], ['多样性与保护', '理解生物多样性的价值，关注珍稀资源和外来物种风险。']],
    questions: [
      ['下列哪组包含的生物类群跨度最大？', '蕨类植物、节肢动物和真菌', '松树、杉树和柏树', '鲤鱼、鲫鱼和鲢鱼', '猫、狗和兔', '第一组分别代表植物、动物和真菌等不同类群。', 0],
      ['对校园发现的未知小动物进行分类，较合理的第一步是？', '观察并记录可比较的形态结构特征', '先根据名字猜测所属类群', '只看它出现的颜色', '立即判断它是否有害', '分类需要以可观察的特征为依据。', 1],
      ['引入外来物种前开展风险评估，主要是为了？', '降低其扩散并影响本地生态系统的风险', '保证物种一定能迅速繁殖', '让本地物种全部消失', '避免任何生物调查', '外来物种可能破坏生态平衡，需评估和防控。', 0],
      ['保护生物多样性的做法是？', '保护栖息地并合理利用生物资源', '随意捕捉珍稀动物', '向自然环境释放未经评估的生物', '破坏湿地扩大短期用地', '保护栖息地和可持续利用有利于维护生物多样性。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-mouth-digestion', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第一章 消化系统与营养摄取 / 第三节 食物的消化和营养物质的吸收', section: '一、食物在口腔内的消化', directoryUrl: biology7b,
    evidence: '依据冀少版2024七下口腔消化目录，结合牙齿咀嚼、唾液作用及馒头淀粉探究。',
    points: [['口腔中的消化', '牙齿和舌参与食物的机械性消化，唾液中的酶可初步分解淀粉。'], ['实验变量控制', '探究唾液作用时保持馒头量、温度和时间等条件一致。']],
    questions: [
      ['细嚼馒头一段时间后尝到淡甜味，主要与什么有关？', '唾液中的酶将部分淀粉分解成有甜味的糖类', '牙齿把淀粉变成脂肪', '胃液进入口腔分解蛋白质', '唾液把水变成葡萄糖', '唾液淀粉酶可使淀粉发生初步分解。', 0],
      ['牙齿咀嚼食物属于哪种消化？', '机械性消化', '化学性消化', '营养物质吸收', '血液循环', '咀嚼把食物切碎并与唾液混合，属于机械性消化。', 1],
      ['比较唾液和清水对馒头碎屑的作用，哪种设置较公平？', '两组馒头量、温度和时间相同，仅一组加入唾液', '两组温度、馒头量和时间都不同', '一组加唾液并加热，另一组放冰箱', '只比较不同大小的馒头块', '只改变是否加入唾液，才能检验唾液的影响。', 0],
      ['在适宜温度下，馒头碎屑与唾液充分混合后滴加碘液，预期现象更可能是？', '蓝色减弱或不出现明显蓝色', '立即出现大量红色血细胞', '碘液变成氧气', '馒头完全转化为脂肪', '淀粉被部分分解后，遇碘显蓝的现象会减弱。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-stomach-digestion', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第一章 消化系统与营养摄取 / 第三节 食物的消化和营养物质的吸收', section: '二、食物在胃肠内的消化', directoryUrl: biology7b,
    evidence: '依据冀少版2024胃肠消化目录，复习胃和小肠中的消化过程及胆汁、消化液作用。',
    points: [['胃肠消化', '胃和小肠通过运动及消化液共同完成食物的进一步消化。'], ['消化液作用', '胃液参与蛋白质消化，胆汁乳化脂肪，小肠内多种酶继续分解营养物质。']],
    questions: [
      ['胃液中的胃蛋白酶主要参与哪类营养物质的初步消化？', '蛋白质', '淀粉', '脂肪酸', '维生素', '胃蛋白酶参与蛋白质的消化。', 0],
      ['胆汁帮助脂肪消化的主要方式是？', '将脂肪乳化成小滴，增大与消化酶接触的面积', '直接把脂肪变成葡萄糖', '把蛋白质合成脂肪', '使脂肪不再需要消化', '胆汁乳化脂肪，但本身不含消化酶。', 1],
      ['小肠适合进行消化和吸收，原因之一是？', '有较长的消化道和丰富的消化液参与', '没有任何内壁结构', '食物在小肠中不发生变化', '小肠内没有血管', '小肠具有较长的消化过程并接受多种消化液。', 0],
      ['将食物中的大分子营养物质逐步分解为可吸收的小分子，属于？', '消化', '呼吸', '排泄', '循环', '消化将食物中的大分子物质分解为可吸收的小分子。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-nutrient-absorption', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第一章 消化系统与营养摄取 / 第三节 食物的消化和营养物质的吸收', section: '三、营养物质的吸收', directoryUrl: biology7b,
    evidence: '依据冀少版2024营养物质吸收目录，结合小肠绒毛、毛细血管和营养物质进入循环。',
    points: [['营养物质吸收', '消化后的营养物质穿过消化道壁进入血液或淋巴等循环系统。'], ['小肠吸收结构', '小肠内表面积大、壁薄且有丰富毛细血管，适于吸收。']],
    questions: [
      ['小肠绒毛数量多、表面积大，有利于？', '增加营养物质吸收的面积', '使食物不再被消化', '阻止血液流动', '减少小肠内表面积', '较大的内表面积有利于营养物质吸收。', 0],
      ['葡萄糖被小肠吸收后，通常首先进入？', '毛细血管中的血液', '气管中的空气', '胃腔中的食物', '胆囊中的胆汁', '葡萄糖等小分子营养物质可通过小肠壁进入血液。', 1],
      ['下列哪项最能说明“吸收”与“消化”的区别？', '消化分解食物，吸收使营养物质进入体内循环', '消化和吸收都是咀嚼', '吸收只发生在口腔', '消化只发生在血管中', '消化是分解过程，吸收是营养物质进入循环的过程。', 0],
      ['小肠绒毛壁很薄且内部有毛细血管，这种结构有利于？', '营养物质较快进入血液', '把血液变成消化液', '使食物从小肠返回口腔', '完全阻止物质通过', '薄壁和丰富血流有利于物质交换和运输。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-blood', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第二章 循环系统与物质运输 / 第一节 血液循环系统的组成', section: '一、血液', directoryUrl: biology7b,
    evidence: '依据冀少版2024血液目录，考查血浆、红细胞、白细胞和血小板的基本功能。',
    points: [['血液组成', '血液由血浆和血细胞组成，血细胞包括红细胞、白细胞和血小板。'], ['血细胞功能', '红细胞运输氧，白细胞参与防御，血小板参与止血和凝血。']],
    questions: [
      ['血浆的主要功能之一是？', '运载血细胞并运输营养物质和代谢废物', '产生神经冲动', '直接完成肺通气', '制造骨骼关节', '血浆是血液的液体成分，具有运输作用。', 0],
      ['红细胞中含有血红蛋白，主要帮助血液运输？', '氧', '胆汁', '淀粉', '尿液', '血红蛋白能与氧结合，帮助运输氧。', 1],
      ['身体某处受伤后白细胞参与抵御病原体，体现其哪种功能？', '防御和保护', '运输氧气', '形成骨骼', '分泌消化液', '白细胞参与免疫防御。', 0],
      ['血小板在止血过程中发挥的作用是？', '参与凝血和止血', '把氧气运到组织', '分解食物中的淀粉', '产生听觉信号', '血小板参与凝血过程，有助于止血。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-blood-vessels', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第二章 循环系统与物质运输 / 第一节 血液循环系统的组成', section: '二、血管', directoryUrl: biology7b,
    evidence: '依据冀少版2024血管目录，区分动脉、静脉和毛细血管的血流方向及结构功能。',
    points: [['血管类型', '动脉将血液从心脏送出，静脉将血液送回心脏。'], ['毛细血管交换', '毛细血管壁薄、管径小，适于血液与组织细胞进行物质交换。']],
    questions: [
      ['动脉的定义主要依据血液流动方向，指？', '把血液从心脏送往全身的血管', '把血液送回心脏的血管', '只存在于肺中的血管', '任何最细小的血管', '动脉是将血液由心脏运出的血管。', 0],
      ['静脉的主要血流方向是？', '从身体各处流回心脏', '从心脏流向身体各处', '只在肺泡内循环', '永远不与毛细血管相连', '静脉把血液送回心脏。', 1],
      ['毛细血管适于物质交换的特点是？', '管壁薄、血流速度较慢且分布广', '管壁厚且弹性最大', '管腔极宽且没有内皮', '只由骨组织构成', '薄壁和缓慢血流有利于物质交换。', 0],
      ['判断一条血管是动脉还是静脉，最关键要看？', '血液相对心脏的流动方向', '血液颜色是否红', '血管位于皮肤表面还是深处', '它是否靠近骨骼', '动静脉名称依据血流方向，而不是单纯依据含氧量。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-heart', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第二章 循环系统与物质运输 / 第一节 血液循环系统的组成', section: '三、心脏', directoryUrl: biology7b,
    evidence: '依据冀少版2024心脏目录，复习心脏腔室、瓣膜和心脏泵血方向。',
    points: [['心脏结构', '心脏分为左右两侧及心房、心室，瓣膜帮助血液定向流动。'], ['泵血功能', '心室收缩将血液泵出心脏，心房与心室协同完成循环。']],
    questions: [
      ['心脏中防止血液倒流的结构主要是？', '瓣膜', '肺泡', '胃腺', '耳蜗', '瓣膜开放和关闭可帮助血液按一定方向流动。', 0],
      ['心室收缩时，血液通常被？', '泵出心脏进入动脉', '从动脉吸回心房', '送入气管', '推入消化道', '心室收缩产生压力，把血液泵入动脉。', 1],
      ['心脏左右两侧的血液通常？', '分别在各自一侧流动，正常情况下不直接混合', '在心脏内始终完全混合', '都只能流向胃', '都不能进入血管', '左右心腔由间隔分开，血液在两侧分别流动。', 0],
      ['心脏能持续推动血液循环，主要体现它是？', '血液循环的动力器官', '消化系统的吸收器官', '呼吸系统的通气管道', '人体最大的骨骼', '心脏有节律地收缩和舒张，推动血液循环。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-lung-gas-exchange', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第三章 呼吸系统与气体交换 / 第二节 呼吸的过程', section: '一、肺与外界的气体交换', directoryUrl: biology7b,
    evidence: '依据冀少版2024肺与外界气体交换目录，结合胸廓、膈肌运动和肺内气压变化。',
    points: [['吸气和呼气', '吸气时胸廓扩大、肺内气压降低，空气进入肺；呼气过程相反。'], ['呼吸肌运动', '膈肌和肋间肌收缩、舒张改变胸腔容积，带动肺通气。']],
    questions: [
      ['吸气时膈肌通常怎样运动？', '收缩并向下移动', '舒张并向上隆起', '停止运动且胸腔变小', '收缩后把肺挤出胸腔', '膈肌收缩变平并下降，胸腔容积增大。', 0],
      ['吸气时肺内气压与外界相比通常？', '较低，空气进入肺', '较高，空气进入肺', '始终相等且空气不流动', '与气压无关', '肺内气压低于外界时，空气进入肺。', 1],
      ['呼气时胸廓容积通常如何变化？', '减小', '增大', '保持不变', '变成零', '呼气时胸廓回缩，胸腔容积减小。', 0],
      ['测量吸气和呼气时胸围变化，主要观察什么？', '胸廓扩大和缩小的外部表现', '血液中白细胞数量', '胃内食物种类', '耳膜振动次数', '胸围变化可反映胸廓容积随呼吸发生的变化。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-tissue-gas-exchange', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第三章 呼吸系统与气体交换 / 第二节 呼吸的过程', section: '二、体内的气体交换', directoryUrl: biology7b,
    evidence: '依据冀少版2024体内气体交换目录，复习肺泡与血液、血液与组织细胞间的气体扩散。',
    points: [['肺泡处交换', '氧由肺泡扩散进入血液，二氧化碳由血液进入肺泡。'], ['组织处交换', '氧由血液进入组织细胞，细胞产生的二氧化碳进入血液。']],
    questions: [
      ['肺泡与血液进行气体交换时，氧气主要由哪里进入哪里？', '由肺泡进入血液', '由血液进入肺泡', '由组织细胞进入胃', '由气管进入骨髓', '肺泡内氧浓度较高，氧扩散进入周围毛细血管血液。', 0],
      ['组织细胞产生的二氧化碳通常先进入？', '周围毛细血管中的血液', '肺泡之外的空气直接越过血管', '食物和消化液', '骨骼内部空腔', '二氧化碳由组织细胞扩散入血液，再运至肺部排出。', 1],
      ['气体在肺泡和血液之间交换的主要方式是？', '扩散', '主动吞咽', '神经传导', '骨骼收缩', '气体由浓度较高处向较低处扩散。', 0],
      ['呼出的气体中二氧化碳较吸入气体增多，主要因为？', '组织细胞产生的二氧化碳经血液运到肺并排出', '空气在肺内变成了食物', '血液停止循环后释放二氧化碳', '肺把氧气制造成二氧化碳', '细胞呼吸产生的二氧化碳由血液带到肺部排出。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-vision', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第五章 人体生命活动的调节 / 第三节 感觉的形成', section: '一、视觉', directoryUrl: biology7b,
    evidence: '依据冀少版2024视觉目录，考查光线成像、视网膜感受和视觉信息传递。',
    points: [['眼球成像', '角膜、晶状体等结构使光线聚焦，在视网膜上形成物像。'], ['视觉形成', '视网膜感受光刺激，神经信号经视觉神经传至大脑形成视觉。']],
    questions: [
      ['眼球中形成物像的部位是？', '视网膜', '虹膜', '眼睑', '视神经', '外界物体反射的光线经屈光结构后在视网膜形成物像。', 0],
      ['视觉信息从视网膜传向大脑，主要经过？', '视神经', '听小骨', '气管', '食道', '视神经把视网膜产生的神经冲动传向大脑。', 1],
      ['晶状体通过改变曲度帮助看清远近物体，这种调节主要使物像？', '清晰落在视网膜上', '落在耳蜗内', '形成在角膜外面', '直接进入血液', '晶状体调节屈光能力，使物像尽可能清晰地落在视网膜上。', 0],
      ['长时间近距离用眼后，保护视力的合理做法是？', '适当休息并保持正确读写距离和光线', '在黑暗中继续近距离看屏幕', '揉眼直到发红', '只用一只眼看书', '休息、正确距离和适宜照明有助于减轻眼疲劳。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-hearing', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 第五章 人体生命活动的调节 / 第三节 感觉的形成', section: '二、听觉', directoryUrl: biology7b,
    evidence: '依据冀少版2024听觉目录，复习耳的结构、声音振动传递和听觉保护。',
    points: [['听觉传导', '声波引起鼓膜振动，经听小骨传递到内耳并刺激听觉感受器。'], ['听觉保护', '避免长时间高强度噪声和不当掏耳，保护耳及听觉。']],
    questions: [
      ['声波进入耳后，首先引起明显振动的结构是？', '鼓膜', '视网膜', '鼻黏膜', '舌面', '声波使鼓膜振动，再经听小骨等结构向内传递。', 0],
      ['听觉感受器主要位于耳的哪一部分？', '内耳', '耳廓外侧皮肤', '鼻腔', '喉部', '内耳中的听觉感受器把机械刺激转化为神经信号。', 1],
      ['长时间处于很强的噪声环境中，可能损害？', '听觉系统', '消化酶', '骨骼长度', '血型', '持续强噪声可能损伤听觉结构和功能。', 0],
      ['耳朵进水或发痒时，较安全的做法是？', '避免用尖锐物深入耳道，必要时寻求成人或专业帮助', '用硬物用力掏耳', '把液体随意滴入耳道', '持续制造很大声音测试耳朵', '避免尖锐物损伤耳道和鼓膜。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-smoking-project', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 跨学科实践活动', section: '制作实验装置，模拟吸烟有害健康', directoryUrl: biology7b,
    evidence: '依据冀少版2024模拟吸烟实践活动目录，联系呼吸系统健康、模型局限和变量控制。',
    points: [['吸烟与呼吸健康', '烟草烟雾中的有害物质会损害呼吸道和肺部健康。'], ['模型实验解释', '利用装置模拟污染物沉积时，应说明模型所代表的过程和局限。']],
    questions: [
      ['模拟吸烟装置中棉花变黄或变黑，最适合说明什么？', '烟雾中有颗粒物可在模拟材料上沉积', '人体肺能够自动过滤所有有害物质', '吸烟只影响棉花不影响人体', '棉花颜色能测出所有疾病概率', '模型可显示烟雾颗粒沉积，但不能直接复制人体全部反应。', 0],
      ['用模型比较两种过滤材料时，怎样使比较较公平？', '保持烟雾量、抽吸次数和装置条件相同，只改变材料', '每次使用不同装置和不同烟量', '一组使用材料，另一组改变温度和时间', '只挑选颜色最深的一次结果', '控制其他变量，才可比较材料差异。', 1],
      ['依据模型实验说明吸烟危害时，哪种表述最严谨？', '模型展示部分颗粒沉积现象，人体健康风险还需结合医学证据说明', '棉花变色证明所有吸烟者都会患同一种病', '模型与人体完全相同', '一次实验能说明全部长期影响', '模型有助于理解但有局限，结论不能超过证据范围。', 0],
      ['保护呼吸系统的做法是？', '远离烟草烟雾并保持空气流通', '主动吸入更多烟雾', '在雾霾天剧烈户外运动', '用香味掩盖烟雾即可消除危害', '减少烟草烟雾和污染暴露有助于保护呼吸健康。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-biology-7b-eye-model-project', grade: '初一', subject: '生物', volume: '下册',
    chapter: '第三单元 人体的结构与功能 / 跨学科实践活动', section: '制作可调节的眼球成像模型，提出保护眼健康的方法', directoryUrl: biology7b,
    evidence: '依据冀少版2024可调节眼球模型实践活动目录，训练透镜成像观察、模型解释和视力保护。',
    points: [['眼球成像模型', '用透镜模拟晶状体、屏幕模拟视网膜，观察物距和焦距对成像的影响。'], ['模型边界与护眼', '模型用于解释成像关系，护眼建议需结合正确用眼习惯和专业检查。']],
    questions: [
      ['可调节眼球成像模型中，屏幕通常用来模拟眼球的？', '视网膜', '角膜', '虹膜', '眼睑', '视网膜是眼球内接受物像的结构。', 0],
      ['模型中透镜相当于眼球中的哪一结构？', '晶状体', '视神经', '耳蜗', '鼓膜', '透镜模拟晶状体的折光作用。', 1],
      ['屏幕上物像模糊时，调整模型的哪项可帮助理解眼球调节？', '改变透镜曲度或透镜与屏幕间距并观察成像', '改变屏幕颜色但不改变光路', '堵住所有入射光', '把模型倒过来就不需成像', '模型可通过调节焦距或位置观察清晰成像条件。', 0],
      ['眼球模型不能完全代表真实视觉过程，原因是？', '模型简化了眼球结构和神经信息处理', '真实眼睛没有晶状体', '视网膜不参与视觉', '光线不能进入眼球', '模型能解释部分光学现象，但真实视觉还涉及神经和大脑。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const chinese8bLeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-chinese-8b-purpose-audience', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第一单元（阅读·民俗）', section: '写作：考虑目的和对象', directoryUrl: chinese8b,
    evidence: '按人教社八下正式教材目录与2026学年本地目录定位写作板块，考查写作目的、读者对象和表达选择。',
    points: [['写作目的', '明确写作要解决的问题和希望达到的表达效果。'], ['读者对象', '根据读者的年龄、经验和需要选择材料、语气与说明方式。']],
    questions: [
      ['为一年级学生介绍端午节习俗，哪种写法更合适？', '用清楚的短句介绍习俗做法和节日意义', '大量使用未解释的民俗学术语', '只写作者个人对节日的评价', '把所有习俗混成没有顺序的一段', '面对低年级读者要选择易懂材料并交代必要背景。', 0],
      ['同一活动分别写给同学和社区老人，材料选择可能不同，主要因为？', '读者的经验和关注点不同', '汉字在不同读者面前含义完全相反', '写作对象不能影响表达', '所有文章都必须使用相同语气', '读者对象会影响材料取舍和表达方式。', 1],
      ['写一则提醒居民节约用水的通知，最应优先保证什么？', '事项、对象和行动要求清楚明确', '加入与通知无关的长篇故事', '只写口号不说明做法', '使用含糊的时间地点', '实用通知要让读者看懂需要做什么、何时做。', 0],
      ['修改文章时发现例子很多却没有回应写作目的，较好的处理是？', '删减无关例子并补充与目的相关的说明', '继续增加更多无关例子', '删掉标题和段落顺序', '把读者对象改成所有人而不调整内容', '材料应服务写作目的并照顾读者需要。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-expository-order', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第二单元（阅读·说明文）', section: '写作：说明的顺序', directoryUrl: chinese8b,
    evidence: '按人教社八下正式教材目录与2026学年本地目录定位说明文写作板块，练习顺序安排与说明目的。',
    points: [['说明顺序', '依据事物特征和说明目的安排时间、空间或逻辑顺序。'], ['结构与衔接', '使用清晰的层次和过渡，使读者能顺着说明线索理解内容。']],
    questions: [
      ['介绍古建筑从外到内的布局，最适合采用哪种顺序？', '空间顺序', '随机顺序', '按字数多少排序', '只按作者心情排序', '介绍空间布局时可按方位和观察路线组织材料。', 0],
      ['说明一项实验的操作过程，通常适合怎样安排？', '按时间先后或操作步骤顺序', '按地点名称笔画顺序', '把结论放在每一步之间随机出现', '先列所有工具再不说明操作', '过程说明需要让读者能依次理解和复现步骤。', 1],
      ['介绍“为什么会出现彩虹”，下列哪种组织方式较清楚？', '先说明现象，再解释光线和水滴作用的原因', '先列出无关人物，再谈结论', '把不同原因随机排列', '只用比喻而不说明过程', '解释事理可按现象、条件和成因之间的逻辑关系组织。', 0],
      ['一篇说明文段落衔接生硬，修改时最有帮助的是？', '补充能体现前后关系的过渡语并检查层次', '删去所有段落标题', '重复同一个结论多次', '调整字体颜色代替修改内容', '过渡语和清晰层次能提示材料之间的关系。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-low-carbon-project', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第二单元（阅读·说明文）', section: '专题学习活动：绿水青山，低碳生活', directoryUrl: chinese8b,
    evidence: '按人教社八下专题学习活动目录定位“绿水青山，低碳生活”，练习资料核验、说明表达与行动倡议。',
    points: [['资料搜集与核验', '围绕低碳生活主题搜集可靠材料并标明来源。'], ['倡议表达', '提出具体、可实行的行动建议，说明行动与环境影响的关系。']],
    questions: [
      ['小组准备介绍校园节能情况，哪种资料最适合用作事实依据？', '注明时间、范围和来源的用电记录', '没有来源的网络转发图片', '只凭一位同学的印象', '与校园无关的广告宣传', '可核查的数据比未经说明的印象更适合作为事实依据。', 0],
      ['倡议同学减少一次性用品，哪种建议更具体？', '自带水杯和餐具，并说明适用场景', '大家都要保护环境', '以后再也不使用任何物品', '只写“低碳很重要”不提做法', '具体行动建议更便于读者理解和实行。', 1],
      ['把网络文章中的统计数字用于展示前，应该？', '核对发布机构、统计范围和时间', '只挑最醒目的数字', '删掉来源让版面更整齐', '把不同口径数据直接相加', '核查口径和来源可避免误用数据。', 0],
      ['专题活动汇报结束时，哪种结尾最有行动指导性？', '总结发现并提出一两项可持续执行的校园行动', '只重复活动标题', '宣布所有问题已经彻底解决', '增加与主题无关的笑话', '总结发现并提出可实行的下一步，能把调查转化为行动。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-book-review-writing', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读·古诗文）', section: '写作：学写读后感', directoryUrl: chinese8b,
    evidence: '按人教社八下写作板块目录定位读后感写作，强调阅读内容、个人感受与文本依据相结合。',
    points: [['感受与文本联系', '由作品内容引发真实感受，并回到文本寻找依据。'], ['读后感结构', '概述相关内容后重点写感受和思考，避免把读后感写成情节复述。']],
    questions: [
      ['写读后感时，哪种做法最能使感受有依据？', '结合作品中的具体情节或语句解释自己的感受', '只写“我很感动”不说明原因', '把整本书逐页复述一遍', '引用与作品无关的名言代替阅读', '具体文本证据能说明感受从何而来。', 0],
      ['读后感中作品内容概述的主要作用是？', '交代引发思考的内容，并为自己的感受作铺垫', '代替全部感受和分析', '尽量复述每个细节', '证明作者已经背完整本书', '概述应服务于感受和思考，不宜喧宾夺主。', 1],
      ['读完一篇文章后形成了与同学不同的看法，写作时应？', '说明自己的观点并引用相应文本依据', '断言同学一定没有认真读', '删去所有不同意见', '只写结论不提供理由', '观点可以不同，但需要有文本依据和清楚论证。', 0],
      ['修改读后感时发现全文都是故事梗概，最应补充什么？', '阅读后的体验、分析及其与文本的联系', '更多与作品无关的背景知识', '与主题无关的景物描写', '反复抄写故事结尾', '读后感要突出读者的感受和思考。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-classic-talk', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读·古诗文）', section: '整本书阅读：《经典常谈》——怎样读知识性作品', directoryUrl: chinese8b,
    evidence: '按人教社八下整本书阅读目录定位《经典常谈》阅读任务，考查目录导航、专题阅读和资料核验。',
    points: [['知识性作品阅读', '先借助目录和序言了解全书结构，再围绕问题选择章节阅读。'], ['信息整理与表达', '区分作者观点、历史材料和个人推断，并记录可回查的出处。']],
    questions: [
      ['面对《经典常谈》这样的知识性作品，开始阅读时哪种方法较有效？', '先看序言和目录，再根据兴趣或问题制定阅读顺序', '从任意一页开始后不再查看结构', '只背书名不读正文', '先把目录撕掉避免分心', '序言和目录有助于了解全书结构并安排专题阅读。', 0],
      ['整理某一文化专题的读书卡片，哪项记录最便于回到原文核对？', '观点摘要、章节位置和关键依据', '只写“很有意思”', '只记录页码但不记主题', '把自己的推测写成作者原话', '摘要和出处线索能支持核查与交流。', 1],
      ['读书时遇到陌生的历史术语，较合适的处理方式是？', '查阅可靠工具书或注释，并记录来源', '按字面随意猜测并当作结论', '跳过后在汇报中编造解释', '用现代词语替换原术语而不说明', '借助注释和可靠资料核实概念。', 0],
      ['向同学介绍整本书阅读收获，哪种表达更可信？', '区分书中信息、引用依据和自己的理解', '把个人猜想说成书中事实', '只列出阅读天数', '不提阅读过哪些章节', '说明信息来源和个人理解，能使阅读分享清楚可信。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-poetry-unit3', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第三单元（阅读·古诗文）', section: '课外古诗词诵读：式微；子衿；送杜少府之任蜀州；望洞庭湖赠张丞相', directoryUrl: chinese8b,
    evidence: '按人教社八下课外古诗词诵读目录核对四首篇目与作者，围绕情境、情感和表达选择原创题。',
    points: [['诗歌情境与情感', '结合意象、语气和关键内容理解诗歌所写处境及情感。'], ['作品比较', '比较不同诗歌的表达目的、情感基调和语言特点。']],
    questions: [
      ['《式微》反复追问“胡不归”，主要传达了怎样的情绪？', '劳役者盼望早日归家的急切与忧苦', '游子庆祝科举高中', '诗人赞美边塞丰收', '作者描写登山观海的轻松心情', '诗歌通过反复追问表现劳作艰苦和归家愿望。', 0],
      ['《送杜少府之任蜀州》表达离别之情时，整体基调更接近？', '开阔豁达，珍重友情', '怨恨朋友远行且不再相见', '描写田园劳作的辛苦', '赞美宫廷宴饮的奢华', '诗歌将离别情意写得开阔，强调友谊不因距离而断。', 1],
      ['《子衿》主要表现的情感是？', '对所思念之人的牵挂', '对战争胜利的庆贺', '对农事丰收的赞叹', '对登楼远望的厌倦', '诗中反复表达对所思之人的思念。', 0],
      ['《望洞庭湖赠张丞相》除描写洞庭湖景象外，还表达了什么愿望？', '希望得到引荐、施展政治抱负', '希望放弃一切社会交往', '希望回乡种桑养蚕', '希望学习制作乐器', '诗人借望湖和临渊之意表达求仕愿望。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-speech-draft', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第四单元（活动·探究·演讲）', section: '任务二 撰写演讲稿', directoryUrl: chinese8b,
    evidence: '按人教社八下演讲活动目录定位撰写演讲稿任务，考查观点、材料、结构和口语表达。',
    points: [['演讲稿结构', '围绕中心观点安排开头、主体论证和结尾，突出层次。'], ['论据与听众', '选择真实、相关的材料支撑观点，使用听众易理解的语言。']],
    questions: [
      ['演讲稿的开头最重要的作用之一是？', '引出主题并吸引听众继续聆听', '把所有论据一次性堆在一起', '介绍与主题无关的全部经历', '宣布听众必须同意结论', '开头要建立主题并引起听众关注。', 0],
      ['为“坚持阅读有助于成长”这一观点选择论据，哪项最有说服力？', '提供与阅读习惯和成长相关的具体事例或可靠数据', '只重复“阅读很重要”', '引用与阅读无关的比赛成绩', '使用无法核实的夸张数字', '论据应与观点相关且真实可核查。', 1],
      ['演讲稿主体部分材料很多，怎样安排更清楚？', '按分论点归类材料并使用过渡语连接', '按材料长度随机排列', '把同一事实重复多次', '完全删去观点只保留故事', '按论证层次组织材料能增强逻辑。', 0],
      ['面向同龄学生演讲，语言表达较适合？', '准确、自然并适当联系同学熟悉的生活经验', '只使用听众不懂的术语', '故意夸大事实以制造效果', '全篇使用命令语气', '结合听众经验能让表达清楚，同时仍要准确。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-speech-contest', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第四单元（活动·探究·演讲）', section: '任务三 举办演讲比赛', directoryUrl: chinese8b,
    evidence: '按人教社八下演讲活动目录定位演讲比赛任务，练习倾听、现场表达、评价与反馈。',
    points: [['现场演讲', '根据演讲内容和听众反应调整语速、停顿、重音和姿态。'], ['评价与反馈', '从观点、材料、结构和表达效果提出具体、尊重的反馈。']],
    questions: [
      ['演讲者发现听众对一个关键概念不熟悉，较好的现场调整是？', '用简短例子解释概念再继续论述', '加快语速跳过关键内容', '批评听众没有认真听', '临时改讲完全无关的话题', '补充简明例子有助于听众理解。', 0],
      ['评价同学的演讲，哪种反馈最有帮助？', '指出具体有效之处，并提出可操作的改进建议', '只说“好”或“不好”', '评价演讲者的外貌而不谈表达', '用嘲笑语气模仿失误', '具体、尊重并可行动的建议便于改进。', 1],
      ['比赛组织者安排评委时，怎样能减少评分偏差？', '提前明确统一的评价标准并保持记录', '每位评委临时采用不同标准', '只按演讲时长排名', '不记录分数并凭印象决定', '统一标准和记录有助于公平比较。', 0],
      ['演讲中适度停顿的作用通常是？', '强调要点并给听众理解时间', '让观点自动成立', '替代所有论据', '保证每句话都变成疑问句', '恰当停顿有助于突出重点和处理信息。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-travel-writing', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第五单元（阅读·游记）', section: '写作：学写游记', directoryUrl: chinese8b,
    evidence: '按人教社八下游记写作目录定位游记写作，考查游踪、观察顺序、景物特点与个人感受。',
    points: [['游踪和顺序', '按行踪或观察顺序组织材料，使地点转换清晰。'], ['景物与感受', '选择有特点的景物并融入真实感受，避免堆砌景点名称。']],
    questions: [
      ['写游记时交代“从山门经过石桥，最后到达寺院”，主要帮助读者了解？', '游踪和空间顺序', '人物年龄变化', '故事的因果关系', '诗歌的押韵方式', '地点转换线索能呈现游览路线。', 0],
      ['描写一处瀑布，哪种写法更容易表现景物特点？', '写出水流、声音、光影等具体观察并说明感受', '只列出景点名称', '连续使用“很美”而无细节', '介绍与瀑布无关的购物经历', '具体观察和感受能使景物描写生动而可信。', 1],
      ['游记中并非每个景点都详细描写，主要是因为？', '要根据中心和特点取舍材料', '景点越多文章一定越好', '游记不能写路线', '写作必须平均分配每处篇幅', '材料取舍应服务文章中心和表达重点。', 0],
      ['从一个观景点转到另一个地点时，哪种衔接较清楚？', '交代行进方向或路线，并自然引出下一处景物', '突然换地点而不作提示', '重复上一段全部句子', '插入无关的说明书', '清楚的过渡能帮助读者跟随游览路线。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-insects-book', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第五单元（阅读·游记）', section: '整本书阅读：《昆虫记》', directoryUrl: chinese8b,
    evidence: '按人教社八下整本书阅读目录定位《昆虫记》，结合科学观察、说明与文学表达进行阅读训练。',
    points: [['科学观察', '关注作者长期观察所得的昆虫习性、形态和生存行为。'], ['科普表达', '体会科学事实与生动叙述如何结合，并用文本证据支持理解。']],
    questions: [
      ['阅读《昆虫记》时，怎样理解作者对昆虫行为的判断更可靠？', '结合观察记录和书中具体描述核对依据', '只凭昆虫名称猜测', '把所有昆虫都看成同一种习性', '用动画片情节代替书中材料', '作者的观察和具体描述是理解昆虫行为的依据。', 0],
      ['《昆虫记》既有科学内容又有生动描写，阅读时可以关注？', '事实观察与表达方式如何配合', '只统计每章页数', '把文学描写都当作实验数据', '只记人物名字而不看昆虫', '作品将观察所得与形象表达结合起来。', 1],
      ['做整本书阅读笔记，哪种记录更有用？', '按昆虫种类、行为和相关章节整理观察信息', '只记读完日期', '把所有内容写成一句“很有趣”', '只抄封面宣传语', '分类整理并保留章节线索便于复习和回查。', 0],
      ['同学认为书中某种昆虫“总是”采取一种行为，讨论时应？', '查找书中不同情境的描写，避免把个别观察扩大为绝对规律', '不核对文本就接受结论', '只用自己的养宠经历替代', '删掉不符合结论的内容', '科学阅读要注意条件和证据范围，避免过度概括。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-responsible-expression', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第六单元（阅读·古诗文）', section: '写作：负责任地表达', directoryUrl: chinese8b,
    evidence: '按人教社八下写作板块目录定位负责任地表达，考查事实核验、隐私尊重和观点措辞。',
    points: [['事实核验', '表达事实性信息前核对来源、时间和上下文。'], ['责任与分寸', '尊重他人隐私，区分事实与观点，避免无依据传播和伤害性表达。']],
    questions: [
      ['准备转发一则涉及同学的消息，发布前最负责任的做法是？', '核实真实性并征得当事人同意，避免泄露隐私', '先转发再看内容是否属实', '删掉来源让消息更可信', '补充未证实的细节吸引关注', '核实事实并尊重隐私是负责任表达的基本要求。', 0],
      ['写评论时，哪种写法能清楚区分事实和观点？', '先说明可核实的情况，再标明自己的判断和理由', '把猜测直接写成事实', '只用“大家都知道”代替证据', '隐去时间地点和来源', '事实、判断和理由分清楚，表达才更可信。', 1],
      ['发现自己发布的信息有误，较合适的处理是？', '及时更正并说明更正内容', '悄悄删除后继续传播旧截图', '责怪读者没有核实', '再编造一个解释掩盖错误', '及时更正能减少错误信息继续扩散。', 0],
      ['批评一种做法时，哪种表达更负责任？', '具体指出行为及影响，避免给人贴侮辱性标签', '公开发布当事人家庭隐私', '用夸张传闻代替事实', '攻击对方人格而不讨论问题', '针对行为和影响表达意见，比人身攻击更有建设性。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-harmony-project', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第六单元（阅读·古诗文）', section: '专题学习活动：以和为贵', directoryUrl: chinese8b,
    evidence: '按人教社八下专题学习活动目录定位“以和为贵”，围绕经典理解、倾听协商与冲突解决设计题目。',
    points: [['“和”思想理解', '结合具体语境理解和而不同、以理相待等含义。'], ['协商解决问题', '尊重差异、倾听理由并寻找可执行的共同方案。']],
    questions: [
      ['小组成员对活动方案意见不同，怎样做更符合“以和为贵”？', '先倾听各自理由，再比较条件并协商方案', '要求少数人不再发言', '把意见不同当成对人的否定', '不讨论就由声音最大的人决定', '尊重差异并协商具体方案有助于维护合作。', 0],
      ['“和而不同”更接近哪种理解？', '保持合作与尊重，同时允许合理差异', '所有人必须有完全相同的想法', '只要意见不同就不能相处', '为了表面和气不许提出问题', '和谐不等于消除一切差异。', 1],
      ['调解同学间的误会，哪种做法较有效？', '分别了解事实和双方感受，再帮助他们沟通', '只听一方说法就公开定责', '把私人矛盾发到班级群', '要求双方立即承认自己错了', '了解事实并促进直接沟通，有助于澄清误会。', 0],
      ['合作讨论中出现分歧，哪种表达既坚定又尊重？', '“我有不同看法，能否一起比较这两种方案的依据？”', '“你们都不懂，不必再说。”', '“谁不同意就退出小组。”', '“我不听解释，按我的来。”', '说明分歧并提出共同核对的办法，有助于理性协商。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-chinese-8b-poetry-unit6', grade: '初二', subject: '语文', volume: '下册',
    chapter: '第六单元（阅读·古诗文）', section: '课外古诗词诵读：题破山寺后禅院；送友人；卜算子·黄州定慧院寓居作；卜算子·咏梅', directoryUrl: chinese8b,
    evidence: '按人教社八下课外古诗词诵读目录核对四首篇目和作者，考查意象、情感与不同作品表达。',
    points: [['意象与情境', '结合景物、动作和语气想象诗词情境并体会情感。'], ['诗词比较', '联系写作对象和处境比较送别、闲居与咏物等主题。']],
    questions: [
      ['《题破山寺后禅院》描写清幽寺院环境，主要营造了怎样的氛围？', '幽静清寂、富有禅意', '繁华喧闹、急促紧张', '悲壮激烈、战事迫近', '热闹喜庆、宴饮欢歌', '山寺、幽径和钟磬等意象共同营造清幽氛围。', 0],
      ['《送友人》中的浮云、落日等意象主要服务于什么内容？', '表现送别时对友人的牵挂和惜别之情', '描写农田丰收的忙碌', '说明天文现象变化规律', '赞美宫廷建筑宏伟', '诗人借自然意象表达离别情感。', 1],
      ['苏轼《卜算子·黄州定慧院寓居作》中的孤鸿意象常被用来寄托？', '孤高自守、孤独清冷的心境', '春日丰收的喜悦', '对热闹市集的赞美', '远行求学的轻松', '孤鸿形象与词人孤独、坚守的情绪相照应。', 0],
      ['陆游《卜算子·咏梅》借梅花写品格，重点赞美？', '历经磨难仍保持高洁坚贞', '追逐名利并随势改变', '惧怕寒冷而避开风雪', '繁花盛开时争夺位置', '词中梅花即使零落仍保持香气，象征坚贞品格。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const english8ProjectLeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-english-8a-unit1-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 1 Happy Holiday', section: 'Project: Make a holiday to-do list', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，任务围绕假期计划、时间安排和清单表达。',
    points: [['Holiday plans', 'Use clear verbs and time expressions to state planned holiday activities.'], ['To-do list organization', 'Arrange activities by date or priority and include realistic details.']],
    questions: [
      ['Which sentence is best for a holiday to-do list?', 'Visit the science museum on Tuesday morning.', 'The museum yesterday very beautiful.', 'I am visit Tuesday.', 'Tuesday because holiday.', 'A to-do item uses a clear action and a time expression.', 0],
      ['Which question helps you find out a friend’s holiday plan?', 'What are you going to do during the holiday?', 'Where did you went last year?', 'How many does the holiday?', 'Why are you go tomorrow?', '“Be going to” can ask about a planned future activity.', 1],
      ['Which item is the most specific?', 'Read two chapters at the library on Friday afternoon.', 'Read something sometime.', 'Do many things.', 'Holiday is good.', 'A useful list item includes an action and enough time or place detail.', 0],
      ['You have three activities on one day. What should you check before finishing the list?', 'Whether the times fit and allow travel or rest.', 'Whether every activity has the same name.', 'Whether the list has no dates.', 'Whether all activities happen at once.', 'A realistic schedule checks time, travel and breaks.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit2-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 2 Home Sweet Home', section: 'Project: Find out who does the most chores at home', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，任务围绕家务调查、频率提问和结果比较。',
    points: [['Chores and frequency', 'Ask and answer about household chores with clear frequency expressions.'], ['Survey results', 'Collect comparable answers and report results without changing the data.']],
    questions: [
      ['Which question is best for a chores survey?', 'How often do you wash the dishes?', 'How many are you wash?', 'When you dishes does?', 'Do you often washing?', '“How often” asks about frequency.', 0],
      ['Which answer gives a clear frequency?', 'I take out the rubbish twice a week.', 'I am rubbish.', 'Twice the rubbish.', 'I take yesterday.', '“Twice a week” clearly reports how often an activity happens.', 1],
      ['To compare who does the most chores, the group should first?', 'Ask everyone the same questions and record the answers.', 'Ask each person different questions.', 'Guess from who talks the most.', 'Leave some answers out without a reason.', 'Using the same questions makes the survey results comparable.', 0],
      ['Which sentence reports a survey result carefully?', 'In our group, Mia does the most chores according to our answers.', 'Everyone in the city does exactly the same chores.', 'Mia never helps because she missed one answer.', 'The survey proves all families are identical.', 'A report should stay within the survey’s actual sample and evidence.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit3-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 3 Same or Different?', section: 'Project: See who changed the most', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，围绕过去与现在的变化及比较表达。',
    points: [['Talking about change', 'Use accurate past and present forms to describe changes over time.'], ['Comparing people', 'Use comparative forms with a clear basis for comparison.']],
    questions: [
      ['Which sentence clearly compares a change from last year to now?', 'Leo is taller now than he was last year.', 'Leo taller last year now.', 'Leo is tall than last year.', 'Leo was more tall now.', '“Taller than” compares height, and the time reference is clear.', 0],
      ['Which question is suitable for finding out how someone has changed?', 'What were you like when you were ten?', 'What you like ten?', 'How are you change yesterday?', 'What did you are?', 'The past form “were” asks about an earlier state.', 1],
      ['Choose the correct comparative form: “My handwriting is ___ than before.”', 'neater', 'neatest', 'more neatest', 'neatlier', 'The comparative form of “neat” is “neater”.', 0],
      ['When presenting a “who changed the most” result, what should you do?', 'Explain which features you compared and give examples.', 'Compare people without saying what changed.', 'Use only a photograph with no explanation.', 'Claim everyone changed in the same way.', 'A clear comparison states its basis and supporting examples.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit4-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 4 Amazing Plants and Animals', section: 'Project: Make a poster about a plant or an animal', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，练习动植物信息筛选、海报标题与说明。',
    points: [['Poster information', 'Choose a few accurate facts that support the poster’s main message.'], ['Captions and sources', 'Use concise English captions and identify reliable information sources.']],
    questions: [
      ['Which title is most suitable for a poster about pandas?', 'Pandas: Amazing Animals of China', 'I Have a Pencil', 'The Long History of My School Bag', 'Some Words with No Topic', 'A poster title should tell readers its subject.', 0],
      ['Which caption gives a clear fact?', 'A giant panda mainly eats bamboo.', 'Pandas are very thing.', 'It live on bamboo yesterday.', 'Panda because amazing.', 'The sentence has a clear subject, verb and factual meaning.', 1],
      ['Before adding a surprising animal fact, students should?', 'Check it with a reliable source and keep the source information.', 'Copy it from an anonymous comment.', 'Change the number to make it more exciting.', 'Leave out where the fact came from.', 'Reliable sources help prevent incorrect information.', 0],
      ['What makes a poster easier to read?', 'A clear heading, short captions and well-chosen pictures.', 'One very long paragraph in tiny print.', 'Pictures that do not match the topic.', 'No title or labels.', 'Clear visual hierarchy and concise captions help readers follow information.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit5-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 5 What a Delicious Meal!', section: 'Project: Create a recipe for a tasty dish', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，考查食材、数量、祈使句和步骤顺序。',
    points: [['Recipe language', 'Name ingredients and give quantities with suitable countable or uncountable forms.'], ['Cooking instructions', 'Use imperative verbs and sequence words to present steps in order.']],
    questions: [
      ['Which instruction belongs in a recipe?', 'Chop the onions and add them to the pan.', 'Chops the onion yesterday.', 'The onions is add pan.', 'You chopping in the pan?', 'Imperatives give direct instructions, beginning with a base verb.', 0],
      ['Choose the correct amount: “Add ___ water to the pot.”', 'some', 'a few', 'many', 'two waters', '“Water” is uncountable here, so “some water” is natural.', 1],
      ['Which sequence word best introduces the final cooking step?', 'Finally,', 'Because,', 'Although,', 'Unless,', '“Finally” signals the last step in a sequence.', 0],
      ['A recipe lists ingredients but gives no cooking steps. What is missing?', 'Instructions telling the reader what to do and in what order.', 'A second dish name.', 'A list of unrelated places.', 'A paragraph about yesterday’s weather.', 'Recipes need ordered actions as well as ingredients.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit6-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 6 Plan for Yourself', section: 'Project: Make plans for solving problems', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，围绕问题分析、建议和可执行计划。',
    points: [['Giving advice', 'Use polite and suitable expressions to suggest ways of solving problems.'], ['Action plans', 'Break a problem into steps and set realistic actions and time frames.']],
    questions: [
      ['Your friend often forgets homework. Which suggestion is most helpful?', 'You could write each assignment in a planner.', 'You should forget it again.', 'You must never study.', 'You are problem yesterday.', '“Could” gives a practical suggestion.', 0],
      ['Which sentence states a clear first step?', 'First, list the tasks you need to finish today.', 'Problem very difficult.', 'You can maybe something.', 'First yesterday because.', 'A clear plan begins with a specific action.', 1],
      ['A good plan for solving a problem should be?', 'Realistic, ordered and possible to check.', 'Impossible to finish and without steps.', 'Only a slogan with no action.', 'Different every hour without a reason.', 'A useful plan has feasible steps and a way to review progress.', 0],
      ['Which response is polite when you disagree with a suggested solution?', 'I see your point, but could we try another way?', 'You are wrong and cannot speak.', 'I no listen you.', 'Your idea yesterday.', 'This phrase disagrees while keeping the conversation respectful.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit7-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 7 When Tomorrow Comes', section: 'Project: Create a picture about the future', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，练习未来预测、计划和图文说明。',
    points: [['Future forms', 'Use future forms to make predictions or describe planned actions.'], ['Picture description', 'Connect a future image with clear details and an understandable message.']],
    questions: [
      ['Choose a sentence that makes a prediction about the future.', 'People will use cleaner buses in many cities.', 'People used cleaner buses tomorrow.', 'People are clean bus yesterday.', 'People will using buses.', '“Will use” is a correct form for a future prediction.', 0],
      ['Which sentence describes a personal plan?', 'I am going to draw a picture of a green city.', 'I going draw yesterday.', 'I was draw tomorrow.', 'I am go to a picture.', '“Be going to” can describe an intention or plan.', 1],
      ['A picture about the future will be clearer if it includes?', 'Specific details that show what may change and why.', 'Only an unexplained color.', 'Several unrelated objects with no message.', 'A title that hides the topic.', 'Specific visual details help communicate the intended idea.', 0],
      ['Which caption matches a picture of rooftop gardens in a future city?', 'Many buildings will have gardens on their roofs.', 'The roof garden yesterday are many.', 'Buildings has garden in past tomorrow.', 'A garden because roof.', 'The caption uses a clear future statement matching the image.', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-english-8a-unit8-project', grade: '初二', subject: '英语', volume: '上册',
    chapter: 'Unit 8 Let\'s Communicate!', section: 'Project: Tell a chain story', directoryUrl: english8a,
    evidence: '依据人教社新修订初中英语教材介绍和八上目录；Project为选学活动，练习故事衔接、时态一致和倾听接续。',
    points: [['Chain-story coherence', 'Each new sentence should connect logically with the previous event.'], ['Narrative language', 'Keep tense and character details consistent while adding a new event.']],
    questions: [
      ['A chain story begins, “Mia found a small key under the tree.” Which next sentence connects best?', 'She picked it up and wondered which door it could open.', 'The key is a very word.', 'Yesterday the weather because.', 'Mia never saw a tree but the sentence ends.', 'The next sentence continues the same character and event.', 0],
      ['When continuing a story told in the past, which verb form is usually consistent?', 'found', 'finds tomorrow', 'is finding yesterday', 'will found', 'Past-tense narration commonly uses “found”.', 1],
      ['What should each speaker do in a chain-story activity?', 'Listen to the previous part before adding a connected event.', 'Repeat the whole story without adding anything.', 'Change every character and setting randomly.', 'Ignore what the previous speaker said.', 'Listening keeps the shared story coherent.', 0],
      ['Which linking word best shows the next event in a story?', 'Then,', 'Because of the blue,', 'Although yesterday?', 'Under the sentence,', '“Then” clearly introduces the next event.', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const english8bSupplementLeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-english-8b-appendices', grade: '初二', subject: '英语', volume: '下册',
    chapter: '*Reading Plus（选学）；附录：Listening Scripts、Grammar、Vocabulary in Each Unit、Vocabulary A–Z、Vocabulary from Primary School、Irregular Verbs',
    section: '*Reading Plus（选学）；附录：Listening Scripts、Grammar、Vocabulary in Each Unit、Vocabulary A–Z、Vocabulary from Primary School、Irregular Verbs', directoryUrl: english8b,
    evidence: '按人教社新修订初中英语教材说明及八下本地目录定位选学拓展阅读和附录，练习听力、语法和词汇工具使用。',
    points: [['附录使用', '利用听力原文、语法归纳和词汇表查找复习信息。'], ['不规则动词', '识别常见不规则动词的过去式并结合语境使用。']],
    questions: [
      ['You missed one word in a listening exercise. Which appendix can help you check the audio text?', 'Listening Scripts', 'Vocabulary A–Z', 'Irregular Verbs', 'The unit picture list', 'Listening Scripts provide the written version of listening material.', 0],
      ['Choose the correct past form: “We ___ our grandparents last Sunday.”', 'visited', 'visit', 'visiting', 'visits', '“Last Sunday” calls for the past-tense form “visited”.', 1],
      ['Which pair shows an irregular verb and its correct past form?', 'go — went', 'play — playeded', 'study — studyed', 'make — maked', '“Went” is the irregular past form of “go”.', 0],
      ['You want to find the meaning and spelling of a word quickly. Which tool is most useful?', 'An alphabetical vocabulary list or dictionary section.', 'A listening script with no word list.', 'A chapter picture with no labels.', 'A list of irregular verbs only.', 'Alphabetical vocabulary sections make words easier to locate.', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const physics8aLeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-physics-8a-preface-world', grade: '初二', subject: '物理', volume: '上册',
    chapter: '绪言 科学探索之旅', section: '奇妙的物理世界', directoryUrl: physics8a,
    evidence: '依据人教版2024八上目录与国家中小学智慧教育平台电子教材（https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets_document/e5618f17-c06e-4c4c-944e-0ee8ced25391.pkg/pdf.pdf），围绕观察、现象和证据提问。',
    points: [['物理现象观察', '从生活现象中发现与声、光、热、运动和物质性质相关的问题。'], ['证据与解释', '用观察或实验事实支持解释，区分现象记录与猜测。']],
    questions: [
      ['观察早晨草叶上出现露珠，首先能直接记录的现象是？', '草叶表面出现了液态小水滴', '水滴一定来自植物主动制造', '露珠一定在零点时形成', '所有叶片都以相同速度结露', '先记录可观察现象，再寻找形成原因。', 0],
      ['提出“声音能否通过不同材料传播”的问题后，下一步较合适的是？', '设计可比较的实验并记录听到的差异', '先接受一个未经检验的答案', '只凭一次偶然经历下结论', '改变多个条件却不记录', '可检验的问题需要通过设计和记录来研究。', 1],
      ['下列哪项属于物理学研究的生活现象？', '镜中出现物体的像', '一句话的语法结构', '一段历史年号的排列', '一首诗的押韵形式', '光的反射成像是常见物理现象。', 0],
      ['观察结果与原先猜想不一致时，较科学的做法是？', '检查实验条件和记录，并根据证据修正解释', '删除不一致的数据', '坚持猜想并忽略观察', '把结果改成预期的样子', '科学解释应接受证据检验并可被修正。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-preface-study', grade: '初二', subject: '物理', volume: '上册',
    chapter: '绪言 科学探索之旅', section: '怎样学好物理', directoryUrl: physics8a,
    evidence: '依据人教版2024八上绪言目录和电子教材，练习提出问题、观察实验、测量及交流证据。',
    points: [['科学探究过程', '围绕问题经历猜想、设计实验、收集证据和交流结论。'], ['规范测量记录', '使用合适工具和单位，记录测量条件与结果。']],
    questions: [
      ['探究摆动快慢可能与摆长有关，怎样设计比较更合理？', '只改变摆长，其他条件尽量相同并重复测量', '同时改变摆长和摆球质量且不记录', '每种摆长只测一次并凭感觉判断', '不计时直接猜最快的一组', '控制其他条件并重复测量有助于比较摆长影响。', 0],
      ['测量长度时，记录“桌面长120”还缺少什么？', '单位', '物体颜色', '观察者年龄', '测量日期的天气', '数值必须配合单位才能明确长度。', 1],
      ['实验中得到几组数据后，怎样判断结论是否稳定？', '比较多次测量并关注数据间的一致性', '只保留最符合猜想的一次', '把所有数值随意平均而不看条件', '删除误差说明', '重复测量能帮助判断数据规律和不确定性。', 0],
      ['与同学交流实验结论时，哪种表达最完整？', '说明问题、方法、测量结果和结论依据', '只说“我觉得如此”', '只展示结论不提供记录', '隐去实验条件', '完整交流要让他人了解结论如何由证据得到。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch1-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第一章 机械运动', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上第一章目录，综合长度时间测量、运动描述、速度和速度测量。',
    points: [['运动描述与测量', '使用参照物描述运动，规范测量长度和时间。'], ['速度计算', '用速度等于路程除以时间分析匀速运动和平均速度。']],
    questions: [
      ['一辆车在30秒内行驶180米，平均速度是多少？', '6米/秒', '150米/秒', '30米/秒', '5米/秒', '速度为路程除以时间，180÷30=6米/秒。', 0],
      ['同一列火车相对站台在运动，相对车厢里的乘客可能是？', '静止', '一定以相同速度运动', '不存在运动状态', '只做圆周运动', '运动和静止取决于所选参照物。', 1],
      ['测量一本书的长度，刻度尺应怎样放置？', '刻度线沿被测长度，零刻度或清晰刻度与起点对齐', '斜放并离开书边', '只用尺子末端估计', '让刻度线与书长垂直', '刻度尺要与被测长度平行并准确读数。', 0],
      ['小车前半程速度较快、后半程较慢，整个过程的平均速度应如何求？', '总路程除以总时间', '两段速度直接相加', '只用前半程速度', '只看最后一秒的速度', '平均速度按总路程与总时间之比计算。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-soundproof-project', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第二章 声现象', section: '第5节 跨学科实践：制作隔音房间模型', directoryUrl: physics8a,
    evidence: '依据人教版2024八上声现象目录及隔音房间模型实践活动，考查声传播、材料比较与控制变量。',
    points: [['声音传播与减弱', '声音由振动产生并通过介质传播，隔声和吸声材料可影响传播。'], ['模型比较', '比较材料隔音效果时控制声源、距离和测量条件。']],
    questions: [
      ['制作隔音房间模型时，软质多孔材料常有助于？', '吸收部分声能，减弱室内反射声', '使声源不再振动', '让声音传播速度变为零', '把声音转变成光', '多孔材料可吸收部分声能，改善反射和传播效果。', 0],
      ['比较纸板和泡沫材料的隔音效果，怎样做较公平？', '保持声源音量、位置和测量距离相同，只更换材料', '每种材料使用不同音量和距离', '一组在室内测，另一组在室外测', '不记录实验条件', '控制其他条件后才能比较材料的影响。', 1],
      ['“隔音”设计最主要想达到什么结果？', '减少声音从声源一侧传到另一侧', '增加声音振动幅度', '使所有声音都不能在空气中传播', '改变声音的颜色', '隔音结构的目标是降低声音传播到需要安静的区域。', 0],
      ['模型测量发现泡沫房间内声音更小，可以得出怎样的结论？', '在本次模型条件下泡沫结构使测得声音减弱', '泡沫能消除所有环境中的一切噪声', '所有真实房间都必须使用同样厚度泡沫', '实验结果不需要重复验证', '结论范围应与模型和实验条件相符。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch2-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第二章 声现象', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上第二章目录，复习声音产生传播、音调响度音色及噪声控制。',
    points: [['声音特性', '音调与频率有关，响度与振幅等因素有关，音色用于区分声音特色。'], ['传播与控制', '声音传播需要介质，控制噪声可从声源、传播途径和接收处入手。']],
    questions: [
      ['用力拨动同一根琴弦，使其振动幅度变大，声音通常会变得？', '更响', '音调必定更高', '传播方向反转', '音色变成光线', '振幅变大通常使响度增大。', 0],
      ['同一音调下，小提琴和长笛听起来不同，主要因为？', '音色不同', '它们的声音都没有频率', '响度永远相等', '声音传播速度不同', '不同发声体的材料和振动方式会形成不同音色。', 1],
      ['声音不能在真空中传播，主要因为？', '真空中没有传播声音所需的介质', '声音只在水里传播', '声音是光的一种', '真空会使声源停止振动', '声波传播需要介质。', 0],
      ['住宅窗户加装密封层以减少道路噪声，主要控制环节是？', '声音传播途径', '声源振动频率', '人的耳朵结构', '车辆发动机质量', '改善门窗密封能减少噪声经传播路径进入室内。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch3-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第三章 物态变化', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上物态变化目录，综合温度、熔化凝固、汽化液化、升华凝华和厨房实践。',
    points: [['六种物态变化', '根据吸热放热及状态变化识别熔化、凝固、汽化、液化、升华和凝华。'], ['实验与生活应用', '用温度和状态变化解释日常现象，并注意实验条件。']],
    questions: [
      ['冬天窗玻璃内侧出现水珠，主要发生了哪种物态变化？', '水蒸气液化', '冰熔化', '水凝固', '干冰升华', '室内水蒸气遇冷变为液态小水滴，属于液化。', 0],
      ['晶体熔化过程中持续吸热时，温度通常？', '保持在熔点附近不变，直到熔化完成', '一直迅速升高', '立刻降到零摄氏度', '与熔化过程无关', '晶体熔化时继续吸热但温度通常保持在熔点。', 1],
      ['湿衣服在通风处干得较快，主要因为？', '通风加快衣物表面水分蒸发', '风把液态水变成冰', '空气停止流动', '水发生凝固', '空气流动带走水蒸气，有利于蒸发继续进行。', 0],
      ['冬天衣柜中的樟脑丸逐渐变小，涉及的物态变化是？', '升华', '凝华', '液化', '凝固', '樟脑由固态直接变为气态，属于升华。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-kitchen-project', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第三章 物态变化', section: '第5节 跨学科实践：探索厨房中的物态变化问题', directoryUrl: physics8a,
    evidence: '依据人教版2024八上厨房物态变化实践活动，考查烹饪中的汽化、液化、热传递和实验改进。',
    points: [['厨房物态变化', '观察蒸发、沸腾、液化等过程并用物态变化知识解释。'], ['实践与安全', '提出改进建议时同时考虑效果、能量利用和操作安全。']],
    questions: [
      ['锅盖内侧形成水珠，主要是因为？', '水蒸气遇冷液化', '液态水凝固成固体', '锅盖发生熔化', '水蒸气直接变成金属', '水蒸气接触较冷锅盖放热液化。', 0],
      ['加热汤时盖上锅盖通常有助于缩短加热时间，原因之一是？', '减少热量散失并使锅内条件更利于加热', '使汤的质量自动变为零', '让液体不再吸收热量', '使水的比热容变为零', '锅盖可减少热量向外散失。', 1],
      ['厨房里湿布晾在通风处比塞在密闭柜中干得快，主要因为？', '空气流动促进水分蒸发', '湿布中的水发生凝固', '通风降低了水的质量', '空气把水变成了油', '通风带走湿布周围水蒸气，有利于蒸发。', 0],
      ['改进厨房实验时发现用玻璃器皿加热可能烫伤，合理措施是？', '使用隔热工具并在成人或教师指导下操作', '徒手触摸热器皿', '把热水直接倒向同学', '取消所有安全说明', '物态变化探究应遵守加热和防烫安全要求。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch4-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第四章 光现象', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上第四章目录，综合光沿直线传播、反射、平面镜成像、折射和色散。',
    points: [['光传播与反射', '识别光沿直线传播条件并运用反射规律分析光路。'], ['成像与折射', '描述平面镜成像特点，认识光从一种介质进入另一种介质时的折射。']],
    questions: [
      ['小孔成像能够形成倒立的像，主要说明光？', '在同种均匀介质中沿直线传播', '只能沿曲线传播', '不需要传播介质', '遇到任何物体都会停止', '小孔成像是光沿直线传播的现象。', 0],
      ['光线射到平面镜上，反射角与入射角的关系是？', '反射角等于入射角', '反射角总是90°', '反射角比入射角大一倍', '二者没有固定关系', '光的反射遵循反射角等于入射角。', 1],
      ['平面镜所成的像通常是？', '正立、等大的虚像', '倒立、缩小的实像', '正立、放大的实像', '倒立、等大的实像', '平面镜成正立、等大的虚像，像与物关于镜面对称。', 0],
      ['白光通过三棱镜后出现彩色光带，说明白光？', '由不同颜色的光组成并发生色散', '只含一种颜色', '是声音的一种', '不能发生折射', '不同颜色的光折射程度不同，形成色散。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-telescope-project', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第五章 透镜及其应用', section: '第5节 跨学科实践：制作望远镜', directoryUrl: physics8a,
    evidence: '依据人教版2024八上制作望远镜实践活动，结合凸透镜会聚光线和目镜观察成像。',
    points: [['望远镜光学结构', '物镜收集远处物体的光，目镜帮助观察物镜形成的像。'], ['模型制作与调试', '通过调节透镜间距和观察位置，使目标像清晰可见。']],
    questions: [
      ['制作简易望远镜时，靠近远处物体的一组透镜通常称为？', '物镜', '目镜', '滤纸', '光屏', '物镜朝向被观察的远处物体。', 0],
      ['简易折射望远镜中的凸透镜主要作用之一是？', '使光线发生折射并形成像', '吸收所有光线', '只改变声音传播方向', '把物体直接移到眼前', '凸透镜通过折射光线参与成像。', 1],
      ['调试望远镜时，图像模糊，较合适的处理是？', '缓慢调节透镜间距并观察清晰度变化', '用手挡住全部入射光', '随意敲击透镜', '不对准目标就立即判断失败', '透镜间距和对准状况会影响观察清晰度。', 0],
      ['制作望远镜模型时，哪项安全做法正确？', '不使用望远镜直接观察太阳', '用透镜长时间直视太阳', '把透镜放在明火上加热', '用破损玻璃片作目镜', '透镜会聚光线可能伤害眼睛，不应直视太阳。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch5-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第五章 透镜及其应用', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上第五章目录，复习透镜作用、凸透镜成像规律、眼睛与眼镜。',
    points: [['透镜与成像', '凸透镜对光有会聚作用，成像性质与物距和焦距关系有关。'], ['眼睛与矫正', '晶状体调节光线在视网膜上成像，近视通常用凹透镜矫正。']],
    questions: [
      ['凸透镜对平行于主光轴的光线通常有何作用？', '会聚到焦点附近', '使其全部反射回光源', '使其变成声音', '让它们停止运动', '凸透镜对光有会聚作用。', 0],
      ['近视眼看远处物体不清楚，常用哪种透镜矫正？', '凹透镜', '凸透镜', '平面镜', '三棱镜', '凹透镜使光线适当发散，帮助像落在视网膜上。', 1],
      ['凸透镜成像实验中，光屏上得到清晰的像，说明像是？', '实像', '虚像', '声音像', '没有形成像', '能呈现在光屏上的像是实像。', 0],
      ['照相机镜头利用凸透镜成像，拍摄远处物体时像通常？', '倒立、缩小并成在感光元件上', '正立、放大且无法记录', '与物体完全等大且在镜前', '只形成虚像', '照相机利用凸透镜在像面形成倒立缩小的实像。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-ch6-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '第六章 质量与密度', section: '复习与提高', directoryUrl: physics8a,
    evidence: '依据人教版2024八上第六章目录，综合质量、密度、测量固体液体密度和密度应用。',
    points: [['质量与密度', '质量表示物体所含物质多少，密度等于质量与体积之比。'], ['测量与应用', '通过测量质量和体积求密度，并正确使用单位。']],
    questions: [
      ['质量80克、体积20立方厘米的物体，密度是多少？', '4克/立方厘米', '60克/立方厘米', '100克/立方厘米', '0.25克/立方厘米', '密度=质量÷体积=80÷20=4克/立方厘米。', 0],
      ['同一块铁从地球带到月球，物体的质量通常？', '不变', '变为原来的六分之一', '变为零', '必定增大', '质量是物体本身的一种属性，通常不随位置改变。', 1],
      ['测量不规则小石块体积，常用的方法是？', '用量筒测量排开液体体积的变化', '只用天平测质量后直接当作体积', '用刻度尺量颜色', '把石块放在空量筒里不读数', '排水法可由液面变化测出不规则固体体积。', 0],
      ['已知物体密度和体积，求质量应使用？', '质量=密度×体积', '质量=密度÷体积', '质量=体积÷密度', '质量=密度+体积', '由密度公式ρ=m/V可得m=ρV。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8a-book-review', grade: '初二', subject: '物理', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: physics8a,
    evidence: '依据人教版2024八上绪言及机械运动、声、物态变化、光、透镜、质量密度六章目录组织综合题。',
    points: [['测量与运动', '把规范测量、运动描述和速度计算用于实际情境。'], ['声光热与物质', '联系声音、光现象、物态变化、透镜成像和物质密度解释现象。']],
    questions: [
      ['一辆车行驶150米用时30秒，其平均速度是？', '5米/秒', '180米/秒', '30米/秒', '0.2米/秒', '150÷30=5米/秒。', 0],
      ['冰块在室温下逐渐变成水，发生的物态变化是？', '熔化', '凝固', '液化', '凝华', '固态冰变为液态水是熔化。', 1],
      ['用凸透镜将远处物体成像在光屏上，像的性质通常是？', '倒立、缩小的实像', '正立、放大的虚像', '正立、等大的虚像', '不能形成像', '远处物体经凸透镜可在像面形成倒立缩小实像。', 0],
      ['判断实验结论是否可信，较合适的方法是？', '检查测量条件、重复实验并用数据支持解释', '只记住结论不看数据', '删除不符合想法的结果', '把单位省略后比较数值', '物理结论应由规范条件下可重复的证据支持。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const physics8bLeafRebuilds: GapSeed[] = ([
  {
    id: 'leaf-rebuild-2026-physics-8b-ch7-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第七章 力', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第七章目录，复习力的作用效果、力的单位、弹力、重力和摩擦力。',
    points: [['力的作用效果', '力可以改变物体的运动状态，也可以使物体发生形变。'], ['常见力', '认识弹力、重力和摩擦力的产生条件及方向特点。']],
    questions: [
      ['用手捏橡皮泥后形状改变，说明力可以？', '使物体发生形变', '改变物体质量', '使物体消失', '改变物体颜色必然变亮', '力能够改变物体的形状。', 0],
      ['力的国际单位是？', '牛顿（N）', '焦耳（J）', '瓦特（W）', '帕斯卡（Pa）', '力的单位是牛顿，符号N。', 1],
      ['物体受到的重力方向通常是？', '竖直向下', '垂直斜面向外', '沿水平方向', '始终指向北方', '重力方向竖直向下。', 0],
      ['水平地面上的箱子被向右推仍静止，地面对箱子的摩擦力方向通常是？', '向左', '向右', '竖直向上', '没有任何方向', '静摩擦力阻碍箱子相对地面向右运动的趋势。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-ch8-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第八章 运动和力', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第八章目录，综合牛顿第一定律、惯性和二力平衡。',
    points: [['惯性与运动状态', '物体具有保持原来运动状态不变的性质，力是改变运动状态的原因。'], ['平衡力', '物体在平衡力作用下保持静止或匀速直线运动。']],
    questions: [
      ['汽车突然刹车时，乘客身体向前倾，主要因为乘客具有？', '惯性', '弹性', '浮力', '电荷', '乘客原来随车向前运动，因惯性仍保持原运动状态。', 0],
      ['物体在水平方向只受两个力且保持静止，这两个力可能是？', '大小相等、方向相反并作用在同一物体上', '大小方向都相同', '作用在不同物体上且大小不同', '一个力竖直向上、另一个力竖直向下但不相等', '二力平衡需大小相等、方向相反且作用在同一直线上。', 1],
      ['物体做匀速直线运动时，合力为？', '零', '一定向前', '一定向后', '不断增大', '匀速直线运动意味着运动状态不变，合力为零。', 0],
      ['足球被踢出后继续向前运动，不能说明？', '物体的运动需要持续的向前推力维持', '足球具有惯性', '足球受力情况可能发生变化', '地面摩擦会影响运动', '力可以改变运动状态，但物体可凭惯性继续运动。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-pump-project', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第九章 压强', section: '第4节 跨学科实践：制作简易活塞式抽水机', directoryUrl: physics8b,
    evidence: '依据人教版2024八下活塞式抽水机实践活动，结合大气压、活塞运动和单向阀模型。',
    points: [['活塞式抽水机', '活塞往复改变筒内压强，单向阀控制水流方向。'], ['大气压作用', '筒内压强降低时，外界大气压可推动水进入抽水机。']],
    questions: [
      ['活塞上提使泵筒内压强降低时，水被推入泵筒的主要原因是？', '外界大气压作用在水面上', '水自己向低处停止流动', '活塞产生了重力消失', '泵筒内形成新的水源', '水面受到大气压，压强差促使水进入较低压强的泵筒。', 0],
      ['简易抽水机中的单向阀主要作用是？', '让水按预定方向流动并减少回流', '把水加热沸腾', '改变水的化学组成', '使水不受重力', '阀门控制流向，使活塞运动时水逐步上升。', 1],
      ['制作模型发现活塞周围漏气，抽水效果变差，原因可能是？', '筒内难以形成足够的压强变化', '水的质量自动增加', '大气压变为零', '阀门不再需要工作', '漏气会削弱活塞造成的压强差。', 0],
      ['试验抽水模型时，哪项做法更安全？', '使用清洁水和稳固器材，避免对着他人快速喷射', '用嘴吸管道中的实验水', '把尖锐器件对准同学', '在电器旁泼水', '模型实验需要注意器材、液体和喷射方向安全。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-ch9-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第九章 压强', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第九章目录，综合固体压强、液体压强和大气压强。',
    points: [['压强计算与应用', '压强等于压力除以受力面积，液体压强随深度和液体密度变化。'], ['大气压强', '大气对浸在其中的物体施加压强，压强差可产生吸附或抽水现象。']],
    questions: [
      ['100牛的压力作用在0.02平方米的面积上，压强是多少？', '5000帕', '2帕', '200帕', '0.0002帕', 'p=F/S=100÷0.02=5000帕。', 0],
      ['同种液体中，深度增加到原来的2倍，液体压强通常？', '增大到原来的2倍', '减小到原来的1/2', '保持不变', '变为零', '同种液体中液体压强与深度成正比。', 1],
      ['刀刃磨得锋利一些，切菜更省力，主要因为？', '受力面积减小，压强增大', '压力一定减小为零', '物体质量减少', '液体压强消失', '相同压力作用在较小面积上会产生较大压强。', 0],
      ['吸盘能吸附在光滑墙面上，主要与什么有关？', '吸盘内外压强差及外界大气压', '墙面会主动拉住吸盘', '吸盘质量变成零', '墙面没有受到任何力', '排出部分空气后，外界大气压把吸盘压向墙面。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-hydrometer-project', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第十章 浮力', section: '第4节 跨学科实践：制作微型密度计', directoryUrl: physics8b,
    evidence: '依据人教版2024八下微型密度计实践活动，结合漂浮条件、浮力和液体密度比较。',
    points: [['密度计原理', '密度计漂浮时浮力等于自身重力，浸入深度反映液体密度。'], ['刻度标定', '在已知密度液体中标定位置，再比较未知液体中的漂浮位置。']],
    questions: [
      ['同一支密度计漂浮在较大密度的液体中，通常会？', '浸入得较浅，露出液面的部分较多', '完全沉底', '浸入得更深且露出更少', '浮力必定变为零', '液体密度较大时，同体积排液提供较大浮力，因此排开液体体积更小。', 0],
      ['密度计漂浮稳定时，浮力与密度计重力的关系是？', '大小相等', '浮力为重力的两倍', '重力为零', '二者方向相同且不平衡', '漂浮时竖直方向受力平衡，浮力等于重力。', 1],
      ['制作微型密度计并比较液体，哪种标定做法较合理？', '先在密度已知的液体中标记液面位置', '只凭外观颜色标刻度', '每次改变密度计质量但不记录', '把刻度按字母顺序排列', '已知液体可提供刻度位置与密度的对应依据。', 0],
      ['两个液体中密度计浸入深度不同，比较时应保持什么不变？', '使用同一支密度计并确保其静止漂浮', '每次换成不同质量密度计', '只观察容器颜色', '在一个液体中按压密度计底部', '同一支密度计在静止漂浮状态下便于比较液体密度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-ch10-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第十章 浮力', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第十章目录，复习浮力产生原因、阿基米德原理及物体浮沉条件。',
    points: [['浮力与排液', '浸在液体中的物体上下表面压力差形成浮力，浮力与排开液体重力相关。'], ['浮沉与漂浮', '比较浮力和重力可判断物体上浮、下沉或漂浮状态。']],
    questions: [
      ['物体浸在水中受到的浮力方向是？', '竖直向上', '竖直向下', '水平向左', '沿水流方向', '浮力方向与重力相反，竖直向上。', 0],
      ['阿基米德原理表明，浮力大小等于？', '物体排开液体所受的重力', '物体自身质量', '液体总体积', '容器底面积', '浮力等于物体排开液体的重力。', 1],
      ['物体漂浮在水面静止时，浮力与重力关系是？', '浮力等于重力', '浮力小于重力', '浮力大于重力且持续上升', '二者都为零', '漂浮静止时物体处于受力平衡。', 0],
      ['一个物体在液体中下沉，可能的原因是？', '物体所受重力大于浮力', '浮力方向向下且总为零', '液体没有密度', '物体不受任何力', '重力大于浮力时，合力向下，物体可能下沉。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-ch11-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第十一章 功和机械能', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第十一章目录，综合功、功率相关应用及动能和势能。',
    points: [['功的计算', '力使物体沿力的方向移动距离时，功与力和距离有关。'], ['机械能', '认识动能、重力势能和弹性势能及其相互转化。']],
    questions: [
      ['沿力的方向用30牛的力推动物体移动2米，做功多少？', '60焦耳', '15焦耳', '32焦耳', '0焦耳', 'W=Fs=30×2=60焦耳。', 0],
      ['举高的篮球具有重力势能，主要因为它？', '相对地面处于较高位置', '一定正在高速旋转', '质量变成零', '不受重力作用', '物体被举高后具有与位置有关的重力势能。', 1],
      ['滚下斜坡的小球速度增大时，主要表现为？', '重力势能转化为动能', '动能全部转化为质量', '声能转化为高度', '机械能必定凭空产生', '小球下降时重力势能减少，动能通常增加。', 0],
      ['人用力推墙但墙没有移动，这个推力对墙是否做了机械功？', '没有，因为墙沿力的方向没有移动距离', '做了无限大的功', '做功等于墙的质量', '做功取决于墙的颜色', '机械功需要力作用下物体沿力的方向发生位移。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-balance-project', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第十二章 简单机械', section: '第2节 跨学科实践：制作简易杆秤', directoryUrl: physics8b,
    evidence: '依据人教版2024八下简易杆秤实践活动，联系杠杆平衡条件、秤砣位置和刻度标定。',
    points: [['杆秤杠杆模型', '杆秤利用支点两侧力与力臂的平衡关系测量物体质量。'], ['标定与使用', '用已知质量物体标定刻度，并保持提纽位置和秤砣状态符合设计。']],
    questions: [
      ['简易杆秤属于哪类简单机械？', '杠杆', '滑轮组', '斜面', '轮轴中的齿轮', '杆秤依靠杠杆平衡原理工作。', 0],
      ['杠杆平衡时，支点两侧力与力臂满足？', '动力×动力臂=阻力×阻力臂', '动力+阻力=动力臂', '两侧力臂必须相等', '支点到两端距离都为零', '杠杆平衡条件是力与对应力臂的乘积相等。', 1],
      ['已知质量的物体可用于杆秤制作中的哪项工作？', '标定秤砣位置与刻度的对应关系', '让杆秤不再需要支点', '改变物体的重力方向', '使刻度与质量无关', '已知物体提供可比较的测量标准。', 0],
      ['使用杆秤测量时，哪种做法能保持测量条件一致？', '固定提纽位置并等秤杆静止平衡后读数', '不断移动支点同时读数', '秤杆倾斜时任意估读', '每次更换不同长度的秤杆不重新标定', '稳定平衡且支点位置固定有助于正确读数。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-ch12-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '第十二章 简单机械', section: '复习与提高', directoryUrl: physics8b,
    evidence: '依据人教版2024八下第十二章目录，综合杠杆、滑轮和斜面等简单机械及实际应用。',
    points: [['简单机械工作特点', '用杠杆平衡、滑轮结构和斜面长度解释省力与改变方向。'], ['功与效率意识', '简单机械可改变力或距离关系，实际使用还需考虑摩擦和能量损失。']],
    questions: [
      ['定滑轮在理想情况下主要作用是？', '改变用力方向', '省一半的力', '改变物体质量', '使绳子不受力', '定滑轮主要改变拉力方向，通常不省力。', 0],
      ['使用动滑轮提升重物，理想情况下通常可以？', '用较小的力提升，但需要拉动较长的绳子', '不需要做任何功', '同时减少所有能量消耗为零', '改变重物质量', '动滑轮省力但需要较长拉绳距离。', 1],
      ['沿较长斜面把重物推到同一高度，通常所需推力较小，是因为？', '用较长的距离换取较小的力', '重物质量变小', '重力消失', '斜面自动提供能量', '斜面可省力，但移动距离变长。', 0],
      ['实际机械效率低于100%，主要因为？', '存在摩擦等能量损失', '能量可以凭空消失且无原因', '输入功永远为零', '机械没有任何作用', '摩擦和形变等会使部分输入能量转化为其他形式。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-physics-8b-book-review', grade: '初二', subject: '物理', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: physics8b,
    evidence: '依据人教版2024八下力、运动和力、压强、浮力、功和机械能、简单机械六章目录组织综合题。',
    points: [['受力与运动', '用受力分析解释物体运动状态、惯性和浮沉。'], ['压强、能量与机械', '综合压强、功、机械能和简单机械解释生活中的力学现象。']],
    questions: [
      ['物体静止在水平桌面上，桌面对物体的支持力与重力通常？', '大小相等、方向相反', '方向相同且大小不同', '都向下', '都为零', '物体静止且竖直方向受力平衡，支持力等于重力。', 0],
      ['潜水员下潜得更深，水对其压强通常？', '增大', '减小到零', '保持不变且与深度无关', '变成大气压的一半', '液体压强随深度增加而增大。', 1],
      ['使用滑轮组提升重物时，若提升高度不变而省力，通常需要？', '拉动更长的绳子', '物体质量自动减小', '不再克服重力', '完全不做功', '省力机械通常以较长作用距离为代价。', 0],
      ['解释“船能浮在水面上”，综合分析应关注？', '浮力与重力的平衡及排开水的情况', '船体颜色和名称', '水面温度单一因素', '船上乘客的身高', '漂浮状态要比较浮力与重力，并联系排开液体。', 1],
    ],
  },
] as CatalogLeafSeed[]).map(makeCatalogLeaf)

const math9LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-math-9a-project-estimate-fish-distance', grade: '初三', subject: '数学', volume: '上册',
    chapter: '项目学习：主题研究（一）如何估计湖泊中鱼的数量；（二）测量不可直接到达两点间的距离',
    section: '项目学习：主题研究（一）如何估计湖泊中鱼的数量；（二）测量不可直接到达两点间的距离', directoryUrl: math9a,
    evidence: '按冀教版（2024）九上目录原文定位两个项目；以标记重捕抽样估计和相似三角形间接测量设计原创题。',
    points: [['抽样估计', '标记重捕法依据标记比例估计总体数量，需满足随机混合等假设。'], ['间接测量', '通过相似三角形对应边比例，可测量不可直接到达的距离。']],
    questions: [
      ['第一次捕获并标记40条鱼放回，充分混合后再捕获50条，其中有10条带标记。按标记重捕模型估计湖中鱼约有？', '200条', '20条', '80条', '250条', '标记比例约为40/N≈10/50，解得N≈200。', 0],
      ['标记重捕估计中，标记鱼需要与未标记鱼充分混合，主要是为了？', '使第二次抽样中标记鱼比例能代表总体标记比例', '让标记鱼全部游到岸边', '使总体鱼数自动保持不变', '避免记录第二次捕获的数量', '充分混合有助于让样本中标记比例反映总体情况。', 1],
      ['用相似三角形测量一条无法直接跨越的河宽，关键是？', '构造可测量的对应边并证明两个三角形相似', '只测一次角度而不建立图形关系', '把图纸距离直接当成实际距离', '假定河两岸必然平行且不说明依据', '需通过相似关系建立已测边与未知边的比例。', 0],
      ['上述两个项目的结果报告都应说明？', '测量或抽样步骤、使用的模型假设及可能误差', '只写最终答案不交代数据', '把估计值说成精确计数', '删除与结论不同的测量结果', '模型估计受取样和测量误差影响，应说明方法、假设和误差。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-ch29-review', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第二十九章 直线与圆的位置关系', section: '回顾与反思', directoryUrl: math9b,
    evidence: '按冀教版（2024）九下目录定位章末回顾；综合点线位置、切线判定和圆内接正多边形。',
    points: [['直线与圆', '圆心到直线距离与半径的大小关系决定相交、相切或相离。'], ['切线与圆周', '切线垂直于过切点的半径，正多边形可用圆心角研究。']],
    questions: [
      ['圆的半径为5，圆心到直线的距离为3，这条直线与圆？', '相交', '相切', '相离', '无法确定任何关系', '圆心到直线距离3小于半径5，因此直线与圆相交。', 0],
      ['圆的半径为5，圆心到直线的距离为5，这条直线与圆？', '相切', '相交于两点', '相离', '直线一定经过圆心', '圆心到直线距离等于半径时直线与圆相切。', 1],
      ['圆在点T处的切线与半径OT的关系是？', '垂直', '平行', '夹角为45°', '没有固定关系', '切线垂直于过切点的半径。', 0],
      ['半径为6的圆中，圆心到某直线距离为8，位置关系是？', '相离', '相切', '相交', '直线经过圆心', '圆心到直线距离大于半径，直线与圆相离。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-ch30-review', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十章 二次函数', section: '回顾与反思', directoryUrl: math9b,
    evidence: '按冀教版（2024）九下目录定位二次函数章末回顾；围绕图像、顶点、最值及与方程的联系。',
    points: [['二次函数图像', '二次函数图像为抛物线，顶点和对称轴反映函数变化特征。'], ['函数与方程', '方程 ax²+bx+c=0 的实根对应抛物线与x轴交点的横坐标。']],
    questions: [
      ['函数 y=(x−2)²+1 的顶点坐标是？', '(2，1)', '(−2，1)', '(2，−1)', '(1，2)', '顶点式 y=(x−h)²+k 的顶点为(h，k)。', 0],
      ['函数 y=−2(x+1)²+3 的图像开口方向是？', '向上', '向下', '向左', '向右', '二次项系数为负，抛物线开口向下。', 1],
      ['抛物线 y=x²−4 与x轴交点的横坐标满足？', 'x²−4=0，即 x=±2', 'x²−4=1，即 x=±√5', 'x−4=0，即 x=4', 'x²+4=0，故没有实数根', '令y=0得到x²−4=0，解得x=±2。', 0],
      ['抛物线 y=−(x−3)²+5 的最大值为？', '5', '3', '−3', '−5', '开口向下且顶点纵坐标为5，所以最大值为5。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-ch31-review', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十一章 随机事件的概率', section: '回顾与反思', directoryUrl: math9b,
    evidence: '按冀教版（2024）九下目录定位概率章末回顾；涵盖随机事件、频率估计和简单列举。',
    points: [['概率意义', '随机事件概率描述长期重复试验中发生可能性的大小。'], ['频率估计', '试验次数较多时频率可用于估计概率，但单次结果仍不确定。']],
    questions: [
      ['抛掷一枚质地均匀的硬币，正面朝上的理论概率为？', '1/2', '1/4', '1', '0', '硬币两面等可能，正面概率为1/2。', 0],
      ['重复进行公平骰子试验，某点数的频率长期接近1/6，这说明？', '频率可估计该点数的概率，但每次结果仍随机', '之后每次必定掷出该点数', '短期频率必须恰好等于1/6', '骰子已经不再公平', '频率稳定可帮助估计概率，但不能预测下一次的确定结果。', 1],
      ['从数字1、2、3中随机抽取一个数字，抽到偶数的概率是？', '1/3', '1/2', '2/3', '1', '三个等可能结果中只有2是偶数，所以概率为1/3。', 0],
      ['用列举法计算两个硬币同时抛掷时“恰有一个正面”的概率，可能结果数为？', '4种等可能结果', '2种结果且都不是正面', '1种结果', '无限多种结果', '两个硬币可列出正正、正反、反正、反反四种等可能结果。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-ch32-review', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十二章 投影与视图', section: '回顾与反思', directoryUrl: math9b,
    evidence: '按冀教版（2024）九下目录定位章末回顾；考查中心投影、平行投影、三视图和展开图。',
    points: [['投影', '投影形状和大小与光线方向、投影面及物体位置有关。'], ['三视图', '主视图、俯视图和左视图从不同方向表达立体图形。']],
    questions: [
      ['太阳光近似看作平行光时，物体在地面上的影子属于？', '平行投影', '中心投影', '轴对称变换', '旋转投影', '太阳光线到达地面时可近似视为平行光，因此为平行投影。', 0],
      ['用手电筒照射物体并在墙上形成影子，属于？', '中心投影', '平行投影', '中心对称', '轴对称', '手电筒光源可视为点光源，光线从一点发散，形成中心投影。', 1],
      ['观察正放的长方体，俯视图通常表示？', '从上向下看到的平面形状', '从正面看到的形状', '从左侧看到的形状', '内部所有棱的真实长度总和', '俯视图表示从上方观察立体图形得到的平面图形。', 0],
      ['某立体图形的三视图尺寸相互矛盾时，最可能说明？', '视图或尺寸标注中至少有一处不一致', '三视图不需要对应同一物体', '所有立体图形都只有一种视图', '俯视图可以替代所有尺寸', '三视图应表达同一立体，相关长度和位置需相互对应。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-project-buffon', grade: '初三', subject: '数学', volume: '下册',
    chapter: '项目学习——主题研究（一）蒲丰投针试验与圆周率π', section: '项目学习——主题研究（一）蒲丰投针试验与圆周率π', directoryUrl: math9b,
    evidence: '按冀教版九下项目学习目录原文定位；围绕随机模拟、频率估计和实验误差设计原创题。',
    points: [['随机模拟', '大量随机试验的频率可用于估计相关概率。'], ['实验估计与误差', '估计结果受试验次数和操作偏差影响，应报告数据与方法。']],
    questions: [
      ['蒲丰投针试验中，增加重复投掷次数通常有助于？', '使频率估计更稳定，但不能保证每次都更接近理论值', '让投针结果变成确定事件', '消除所有操作误差', '不再需要概率模型', '更多重复一般改善频率估计的稳定性，但随机波动仍存在。', 0],
      ['投针试验前，针长与平行线间距的关系必须？', '按所用概率模型记录并满足其设定条件', '任意变化且不记录', '保证针每次都垂直落下', '只选择容易得到预期结果的针', '估计公式依赖模型假设，针长和线距需符合并记录。', 1],
      ['实验估计π与常数π不完全相同，较合理的解释是？', '有限样本的随机波动和操作误差会影响估计值', 'π会随实验地点改变', '概率公式不适用于随机试验', '所有结果都应手工改成3.14', '有限次数试验会有随机误差，不能人为修改观测结果。', 0],
      ['小组比较两次试验结果时，最重要的是？', '报告试验次数、条件和实际记录，再讨论差异', '只保留更接近预期的一次', '删去试验次数较多的数据', '隐藏针长和线距', '透明报告方法和原始结果，才能合理分析估计差异。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-math-9b-project-billiards', grade: '初三', subject: '数学', volume: '下册',
    chapter: '项目学习——主题研究（二）台球中的数学', section: '项目学习——主题研究（二）台球中的数学', directoryUrl: math9b,
    evidence: '按冀教版九下项目学习目录原文定位；用反射角、对称变换和路径长度分析台球路线。',
    points: [['反射与对称', '理想反射满足入射角等于反射角，可通过对称变换展开路径。'], ['路径优化', '把反射路径转化为直线路径有助于比较路线长度。']],
    questions: [
      ['理想台球碰到直边反弹，入射角与反射角通常满足？', '相等', '互为余角', '反射角恒为90°', '入射角与反射角之和恒为360°', '理想镜面反射模型中入射角等于反射角。', 0],
      ['把球桌边界外的目标点关于桌边作对称点，分析反弹路线的好处是？', '把反射折线路径转化为一条直线路径', '使所有球速变为相同', '消除球桌边界', '改变入射角定义', '对称展开后，满足反射规律的最短折线路径对应直线。', 1],
      ['若球从桌面一点出发，经边界反弹一次到达目标点，构造模型时需要？', '明确边界位置并将目标点按边界作对称', '忽略球桌边界和目标位置', '将球的轨迹假定为圆弧', '只用球的颜色确定路线', '边界反射问题可通过对称点构造几何路径。', 0],
      ['把理想几何模型用于真实台球运动时，应说明？', '摩擦、旋转和碰撞等因素可能使实际轨迹偏离模型', '真实台球永远满足无误差直线反射', '球桌材料不会影响运动', '模型不需要测量数据', '实际运动存在摩擦和旋转等因素，理想模型有适用范围。', 1],
    ],
  },
]

const history9LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-history-9a-horizontal-links', grade: '初三', subject: '历史', volume: '上册',
    chapter: '学史方法（一）如何建立历史的横向联系', section: '学史方法（一）如何建立历史的横向联系', directoryUrl: history9a,
    evidence: '按统编版2026秋九上目录原文定位学史方法；原创题训练跨区域比较和同一时期横向联系。',
    points: [['历史横向联系', '在同一时期比较不同地区的政治、经济和文化变化，须统一时间尺度。'], ['比较方法', '比较应有明确维度，结合具体证据并说明差异和联系。']],
    questions: [
      ['比较同一时期不同地区的社会发展，首先应做到？', '确认比较的时间范围和共同维度', '只挑选一方的材料', '把相隔数百年的事件当作同时发生', '忽略各地区的具体条件', '横向比较要先统一时段，再选取可比维度。', 0],
      ['研究工业革命时期不同地区的变化，哪种做法较合理？', '比较技术、生产和社会影响，并结合当地背景解释差异', '把所有地区的发展过程视为完全相同', '只根据一件机器判断全部社会变化', '不区分材料的年代', '比较既要看共同变化，也应解释地区条件造成的差异。', 1],
      ['两地区某项制度名称相同，能否据此断定其作用相同？', '不能，还需比较制度内容、实施背景和实际效果', '能，名称相同就表示作用相同', '能，只需比较地图大小', '不能，因为历史制度无法研究', '相同名称不等于内容和效果相同，需进一步核对证据。', 0],
      ['建立世界历史横向联系图时，较清晰的表达是？', '在共同时间轴上按地区标注事件并注明材料来源', '每个地区使用不同时间单位且不作说明', '只放图片不写日期', '把推测和史实混在同一栏', '统一时间尺度、分地区呈现并注明来源，便于比较。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9a-manifesto', grade: '初三', subject: '历史', volume: '上册',
    chapter: '（二）如何研读经典著作——以阅读《共产党宣言》为例', section: '（二）如何研读经典著作——以阅读《共产党宣言》为例', directoryUrl: history9a,
    evidence: '按统编版2026秋九上目录原文定位经典著作研读活动；依据著作写作背景、作者观点和历史影响设问。',
    points: [['著作研读', '研读经典著作要辨析写作背景、核心观点、对象和时代影响。'], ['文本与历史', '文本内容是重要史料，需结合作者、年代及其他史料解释。']],
    questions: [
      ['研读《共产党宣言》时，了解其写作年代和社会背景有何帮助？', '帮助解释文本关注的问题及其历史意义', '可以据此免读文本内容', '能证明书中每项观点都在当时立即实现', '可把后来的事件当作作者写作时的背景', '文本应放回其产生的时代背景中理解。', 0],
      ['将经典著作作为史料使用时，较严谨的做法是？', '区分文本原意、作者立场和后来的解释', '把任何版本的概述都当作原文', '只摘取支持自己观点的一句话', '忽略文本成书时间', '区分原文与后世解读，注意作者立场及文本背景。', 1],
      ['判断一部著作对历史的影响，最适合补充哪类证据？', '同时代传播、读者反应和相关社会行动的材料', '只看现代书籍封面颜色', '只看作者出生地气温', '用一条网络评论代替全部历史证据', '传播和社会反应资料有助于考察著作的实际影响。', 0],
      ['同学引用《共产党宣言》中的一句话作结论，最需要检查？', '引文是否准确、上下文是什么以及能否支撑该结论', '字体是否足够醒目', '是否省略作者和出处', '结论是否足够绝对', '引用应核对原文语境、准确性和论证关联。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9a-world-timeline', grade: '初三', subject: '历史', volume: '上册',
    chapter: '世界历史大事年表（上）', section: '世界历史大事年表（上）', directoryUrl: history9a,
    evidence: '按统编版九上目录附录定位世界历史大事年表上；围绕古代文明、交流和时序阅读。',
    points: [['历史时序', '时间轴帮助判断事件先后，但不能替代背景和因果解释。'], ['文明交流', '地理环境与交流路径影响各地区文明发展和相互联系。']],
    questions: [
      ['使用大事年表时，横向排列的同一时期事件表示？', '这些事件时间相近，仍需分别分析其背景和联系', '这些事件必然存在直接因果关系', '这些事件发生在同一地点', '所有事件都由同一人物推动', '同时发生不等于彼此存在直接因果，仍要核实历史联系。', 0],
      ['古代文明发展与地理环境之间，较合理的认识是？', '地形、水源和交通条件会影响生产生活，但不能单独决定全部历史', '自然环境完全决定所有制度', '文明发展与环境毫无联系', '环境相同的地区历史必定完全相同', '地理条件是重要因素之一，历史还受社会和人类活动影响。', 1],
      ['大事年表中的年代写法不同时，研究者首先应？', '统一纪年方式并核对事件年代', '直接把数字大小当作先后顺序', '删除全部不熟悉的年代', '默认不同历法可以直接相减', '统一纪年并核对换算后，才能准确比较时间。', 0],
      ['关于古代文明间的交流，较有依据的结论应来自？', '文物、文字记录和交通路线等多种证据互证', '只凭相似图案断定一方必然复制另一方', '只依据现代国界推断古代往来', '忽略文物出土地点', '多类证据有助于判断交流路径、年代和可能影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9a-whole-book', grade: '初三', subject: '历史', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history9a,
    evidence: '按统编版2026秋九上目录定位本册综合；综合世界古代文明、交流与历史解释能力。',
    points: [['文明发展与交流', '世界历史呈现多区域文明发展，并通过交流、冲突和迁徙相互联系。'], ['时空观念', '解释历史事件需定位时间与空间并使用相关史料。']],
    questions: [
      ['研究两处古代遗址间是否存在贸易往来，较可靠的证据组合是？', '出土物、文字记载和交通地理资料相互印证', '只根据两地现代直线距离判断', '只凭器物颜色相近下结论', '不核对遗址年代', '多类证据与年代和路线相互印证，才能增强贸易解释。', 0],
      ['一项古代制度在不同地区表现不同，比较时应？', '联系当地政治、经济和文化背景分析', '把一个地区的制度名称直接套用到另一地区', '只比较统治者姓名', '不区分制度形成和后续变化', '同类制度会受地区背景影响，需比较具体内容和变化。', 1],
      ['某历史结论与一份考古材料不一致，研究者适宜？', '重新核查材料年代、出土背景和原有解释', '销毁不一致材料', '自动相信最早出现的结论', '把材料改写成符合结论的内容', '新证据可推动检验和修正历史解释。', 0],
      ['构建本册世界史时间轴时，哪项能提升解释质量？', '按时间排序并标出区域、主要变化和证据来源', '只列人物姓名不写年代', '把所有地区压缩为单线发展', '将推测年代标为精确史实', '时序、空间和证据标注能帮助呈现复杂的历史发展。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9b-history-essay', grade: '初三', subject: '历史', volume: '下册',
    chapter: '学史方法（一）如何写作历史小论文', section: '学史方法（一）如何写作历史小论文', directoryUrl: history9b,
    evidence: '按统编版2026春九下目录定位历史小论文写作活动；训练论点、史料、论证与引用。',
    points: [['历史论证', '历史小论文要提出明确论点，以可靠史实展开论证并回应问题。'], ['引用史料', '引用应准确标注出处，区分材料原文与作者解释。']],
    questions: [
      ['历史小论文中最适合作为中心论点的是？', '能够回应题目且可用史料论证的明确判断', '没有限定范围的个人好恶', '与题目无关的口号', '把所有材料简单罗列而不作判断', '中心论点应明确回应问题，并能由史实支撑。', 0],
      ['一段材料支持论文观点时，写作者还应？', '解释材料如何支持论点并说明来源', '只贴材料不作分析', '删除与材料相关的年代和作者', '把材料中的观点说成自己的直接观察', '论证需要说明证据与观点之间的联系并标明来源。', 1],
      ['两份史料对同一事件的叙述不同，论文中较好的处理是？', '比较来源和背景，说明差异并审慎使用', '只引用更符合结论的一份', '把两个版本拼成一句话', '隐去两份材料的出处', '史料差异需要解释其来源、立场和局限。', 0],
      ['历史论文结尾最适合？', '归纳论证所得并回应开头提出的问题', '新增无关材料且不说明', '只重复题目标题', '提出没有证据的新结论', '结尾应基于前文论证总结并回应研究问题。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9b-online-resources', grade: '初三', subject: '历史', volume: '下册',
    chapter: '（二）如何运用网络资源', section: '（二）如何运用网络资源', directoryUrl: history9b,
    evidence: '按统编版2026春九下目录定位网络资源使用方法；关注来源、作者、时间及数字史料核验。',
    points: [['网络史料判断', '使用网络材料须核验发布机构、作者、日期和原始出处。'], ['数字信息引用', '截图、数据库和网页引用需保留链接、检索时间及必要上下文。']],
    questions: [
      ['网页转述一份历史档案，但没有说明档案收藏机构，下一步宜？', '追查原始档案或权威目录并核对转述内容', '直接将网页标题当作档案原文', '复制后删除网页链接', '只依据点赞数量判断可靠性', '追溯原始出处有助于核实转述是否准确。', 0],
      ['引用网络数据库中的历史数据，较规范的做法是？', '记录数据库名称、数据条目、链接和访问日期', '只保存搜索结果标题', '把访问时间改成资料形成时间', '省略数据单位和范围', '完整引用信息便于他人复核数据来源和口径。', 1],
      ['网上出现一张历史照片但没有年代和地点，研究者应？', '查找图片原始发布信息并与其他材料交叉核实', '依照片服饰猜出具体事件后定论', '把图片裁剪后去掉水印', '将其直接标注为教材配图', '缺少来源的图片需要补查出处、年代和背景。', 0],
      ['两个网页转述同一档案且措辞相同，是否必然构成两份独立证据？', '不一定，可能共同复制同一来源，应追查原始材料', '一定，两网页就代表两份独立档案', '一定，网页数量越多越准确', '无论如何都不能使用网络史料', '转载内容可能来自同一原始来源，需追溯证据链。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9b-world-timeline', grade: '初三', subject: '历史', volume: '下册',
    chapter: '世界历史大事年表（下）', section: '世界历史大事年表（下）', directoryUrl: history9b,
    evidence: '按统编版九下目录附录定位世界历史大事年表下；围绕近现代世界史时序与联系设题。',
    points: [['近现代时序', '时间顺序帮助理解工业化、世界大战及战后国际格局的变化。'], ['全球联系', '近现代事件跨越区域，需辨析相互影响并避免简单因果。']],
    questions: [
      ['将工业革命、第一次世界大战、第二次世界大战和联合国成立按时间先后排列，正确的是？', '工业革命—第一次世界大战—第二次世界大战—联合国成立', '联合国成立—工业革命—第二次世界大战—第一次世界大战', '第一次世界大战—工业革命—联合国成立—第二次世界大战', '第二次世界大战—第一次世界大战—工业革命—联合国成立', '工业革命早于两次世界大战，联合国成立于第二次世界大战结束后。', 0],
      ['大事年表显示两个事件时间相近，不能单凭这一点断定？', '其中一个事件必然是另一个事件的原因', '两个事件需要分别定位时空', '事件年代可以相互比较', '还需查阅相关史料', '时间接近不等于存在直接因果，因果关系需其他证据。', 1],
      ['对比两次世界大战的影响，哪种结论更严谨？', '结合战争背景、参战范围和战后变化分别分析', '认为两次战争原因和结果完全相同', '只比较战争名称长短', '只根据一国的记忆判断全球影响', '比较历史事件须结合具体背景和多地区影响。', 0],
      ['用年表解释国际格局变化时，较有帮助的补充是？', '地图、条约文本和经济社会数据等相关史料', '无日期的图片装饰', '仅按当代国家边界作推断', '把后来的概念直接套到早期事件', '多类资料可帮助解释年表事件之间的联系和影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-history-9b-whole-book', grade: '初三', subject: '历史', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history9b,
    evidence: '按统编版2026春九下目录定位全册综合；原创题整合近现代世界史时空观念和史料实证。',
    points: [['世界近现代变化', '工业化、民族国家发展、世界大战和国际合作塑造近现代世界。'], ['多源历史解释', '对全球历史变化的解释须结合多地区证据及其时空背景。']],
    questions: [
      ['说明工业化如何改变世界，最完整的分析应联系？', '生产方式、社会结构、交通贸易和各地区发展差异', '只描述一台机器的外观', '只使用一个国家某一年的数据', '认为工业化对所有人影响完全相同', '工业化产生多层次影响，且不同地区和群体经历存在差异。', 0],
      ['研究国际组织在战后发挥的作用，哪项材料更有帮助？', '组织章程、会议记录和具体行动案例相互参照', '只看组织徽标', '只凭一句宣传口号', '忽略组织成立时间和背景', '制度文本与实际行动材料可共同说明组织作用。', 1],
      ['一份历史解释强调单一原因，研究者应？', '检查是否还有经济、政治、社会等其他因素和证据', '直接接受最简短的解释', '删除不符合的事实', '用今天的观点替代历史情境', '复杂历史变化往往需综合多种因素与材料。', 0],
      ['制作全册世界史复习图，最合理的结构是？', '时间轴结合区域地图、主题线索和关键证据', '只按人物姓名字母顺序排列', '将各洲历史拆开且不标时间', '只写年代不写事件', '时序、空间和主题线索共同呈现有助于理解世界历史联系。', 1],
    ],
  },
]

const politics9aLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-daofa-9a-unit1-summary', grade: '初三', subject: '道德与法治', volume: '上册',
    chapter: '第一单元 坚持党的全面领导', section: '单元思考与行动', directoryUrl: politics9a,
    evidence: '按统编版九上目录原文定位单元思考与行动；综合党的领导、国家治理和依法履责主题。',
    points: [['党的领导', '坚持党的领导是中国特色社会主义最本质的特征和制度优势。'], ['依法参与', '公民通过法定制度和程序参与国家治理、依法表达意见。']],
    questions: [
      ['社区居民希望改进公共服务，较合适的参与方式是？', '通过居民议事、意见征集等法定和有序渠道提出建议', '编造信息强迫工作人员接受', '破坏公共设施引起关注', '公布他人隐私施加压力', '有序参与和依法表达有助于公共事务治理。', 0],
      ['谈到党的领导与国家治理，较准确的理解是？', '党的领导通过制度和法定程序落实到国家治理实践', '党的领导意味着法律对任何人都不适用', '国家治理只靠个人临时决定', '公民无需遵守法律和制度', '党的领导与依法治国相统一，治理通过法定制度和程序运行。', 1],
      ['对一项公共政策提出意见时，公民应？', '基于事实说明问题并使用适当渠道表达', '散布未经核实的消息', '威胁不同意见者', '伪造调查数据', '理性、有依据地表达并依法参与公共事务。', 0],
      ['评价基层治理成效，较可靠的依据是？', '结合公开政策、服务落实情况和群众反馈综合判断', '只看一条宣传标语', '只根据个人一次偶遇作整体结论', '不核实信息就传播评价', '多渠道事实和实际服务表现有助于全面判断治理成效。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9a-unit2-summary', grade: '初三', subject: '道德与法治', volume: '上册',
    chapter: '第二单元 进入新时代', section: '单元思考与行动', directoryUrl: politics9a,
    evidence: '按统编版九上目录原文定位单元思考与行动；围绕新时代发展、人民生活和高质量发展。',
    points: [['新时代发展', '认识发展成就和挑战要结合阶段特征、客观数据与现实问题。'], ['以人民为中心', '发展成果应持续增进民生福祉并促进社会公平。']],
    questions: [
      ['比较一个地区十年间的发展变化，较可靠的方法是？', '使用同口径的统计数据并结合居民生活和发展背景', '只比较两个年份的宣传图片', '选择不同统计口径的数字直接相减', '只依据个人印象作判断', '同口径数据和具体背景能支持较客观的比较。', 0],
      ['推动高质量发展时，经济增长与民生改善的关系应理解为？', '发展应不断回应人民对美好生活的需要', '只追求数字增长而不考虑群众生活', '民生改善与发展无关', '所有地区都必须使用同一发展路径', '发展的目标和评价要关注人民生活与可持续进步。', 1],
      ['面对发展中的问题，较负责任的认识是？', '承认问题并分析原因，以改革和实践推动解决', '因为取得成就就认为没有问题', '只传播未经证实的负面信息', '把所有问题归结为一个简单原因', '全面看待成就和挑战，并基于事实研究解决办法。', 0],
      ['介绍新时代社会变化时，材料选择应？', '兼顾事实数据、具体案例和不同群体的实际感受', '只选取一个极端案例代表所有人', '不标明数据来源和时间', '把个人观点当作统计结论', '多类型材料并注明来源能避免以偏概全。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9a-unit3-summary', grade: '初三', subject: '道德与法治', volume: '上册',
    chapter: '第三单元 奋进新征程', section: '单元思考与行动', directoryUrl: politics9a,
    evidence: '按统编版九上目录原文定位单元思考与行动；综合改革发展、共同富裕和现代化建设相关主题。',
    points: [['发展与改革', '改革和创新推动发展，政策调整要回应现实需要并依法推进。'], ['共同发展', '促进共同发展要兼顾效率、公平、区域协调和基本公共服务。']],
    questions: [
      ['一项改革措施在试点中发现问题，合理的改进过程是？', '收集事实反馈、评估影响并按程序优化方案', '隐瞒问题并要求照搬到所有地区', '不分析就停止所有改革', '只依据个别传言作决定', '改革需要在实践中评估并按程序调整完善。', 0],
      ['促进区域协调发展，较合适的思路是？', '结合各地条件完善基础设施、公共服务和合作机制', '要求不同地区采用完全相同的产业结构', '只支持已经最发达的地区', '忽略地区间资源和发展差异', '区域发展要立足差异、加强协作并改善公共服务。', 1],
      ['评价共同发展成果时，除总量指标外还应关注？', '收入分配、公共服务可及性和群体实际获得感', '只看最高收入者的增长', '只比较城市建筑高度', '不考虑农村和欠发达地区', '公平共享还需观察不同群体和地区获得发展成果的情况。', 0],
      ['公民为现代化建设贡献力量，符合实际的做法是？', '提升本领、诚信劳动并在岗位和社会生活中尽责', '等待他人承担所有责任', '以违法方式追求个人利益', '只评价他人而不付诸行动', '个人可通过学习、劳动和负责行动参与社会发展。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9a-unit4-summary', grade: '初三', subject: '道德与法治', volume: '上册',
    chapter: '第四单元 共圆中国梦', section: '单元思考与行动', directoryUrl: politics9a,
    evidence: '按统编版九上目录原文定位单元思考与行动；围绕中国梦、个人理想、实干与青年责任。',
    points: [['理想与奋斗', '个人理想与国家发展相联系，需要通过持续学习和实践实现。'], ['实干担当', '把目标转化为可执行计划，在实际行动中承担责任。']],
    questions: [
      ['个人职业理想与社会需要相结合，较可行的做法是？', '了解自身兴趣和能力，同时调查行业变化与社会需求', '只追随网络热度而不作了解', '认为理想一旦确定就不能调整', '将所有职业价值只用收入判断', '合理规划需要同时认识自己、社会需求和现实发展条件。', 0],
      ['把长期理想落实到行动，较有效的方式是？', '设定阶段目标、安排时间并定期复盘调整', '只写愿望而不制定步骤', '等到条件完全完美才开始', '用一次结果判断一生是否成功', '分阶段行动和复盘能使长期目标逐步落实。', 1],
      ['面对实现目标过程中的困难，正确态度是？', '分析困难、寻求帮助并坚持合理可行的努力', '把失败归咎于他人并停止尝试', '为了成功不惜违反规则', '隐瞒问题不作调整', '奋斗应坚持目标，也要依法行事并根据实际改进方法。', 0],
      ['共圆中国梦与青少年成长之间的联系是？', '青少年可通过学习本领、服务社会和承担责任贡献力量', '个人成长与国家发展永远无关', '只有成年后才有社会责任', '只要表达愿望就已完成责任', '个人奋斗和社会责任可以在学习、劳动和服务中相结合。', 1],
    ],
  },
]

const politics9bLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-home', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第一课 生活在同一个地球', section: '人类共有的家园', directoryUrl: politics9b,
    evidence: '按统编版2027春九下公开目录原文定位；以人类共同家园、资源环境和相互依存为主题原创设问。',
    points: [['共同家园', '人类生活在同一个地球，生态环境和发展问题具有跨区域联系。'], ['共同责任', '面对共同挑战，各国需加强合作并尊重不同国家实际情况。']],
    questions: [
      ['空气污染物跨越行政边界影响多个地区，说明？', '人类共同生活在相互联系的地球环境中', '环境问题只影响污染源所在地', '自然环境与人类活动完全无关', '治理污染不需要跨地区合作', '大气流动会使环境影响跨区域传播，治理需要协作。', 0],
      ['利用地球资源时，较可持续的做法是？', '节约资源并兼顾当代发展与生态保护', '不考虑资源总量而无限开采', '把污染转移到其他地区就算解决', '只追求短期收益', '可持续利用需协调资源需求、生态保护和长远发展。', 1],
      ['面对跨国自然灾害风险，国家间合作的意义在于？', '共享预警和救援信息，降低共同风险', '消除所有国家的差异', '让任何一国失去自主权', '只在灾害结束后交流', '风险具有跨区域影响，及时合作可增强防灾减灾能力。', 0],
      ['描述地球环境问题时，哪种判断更全面？', '联系自然过程、人类活动和跨区域影响分析', '只责怪单一群体且不核实证据', '把所有环境变化都归因于一个因素', '只用个人感受代替监测资料', '综合自然、人类活动和数据有助于解释共同环境问题。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-common-future', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第一课 生活在同一个地球', section: '人类命运休戚与共', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位；围绕全球挑战相互关联、人类命运休戚与共设计题目。',
    points: [['命运相连', '公共卫生、气候和安全等全球性问题会影响多个国家和人民。'], ['国际合作', '通过对话、协作和规则共同应对全球性挑战。']],
    questions: [
      ['全球性传染病防控需要国际合作，主要因为？', '疾病传播可能跨境，信息和防控行动相互影响', '各国公共卫生条件完全相同', '合作能让所有风险立刻消失', '疾病传播只取决于国界线', '传染病传播不受国界限制，沟通协作有助于防控。', 0],
      ['面对气候变化等共同挑战，各国较合理的做法是？', '在共同目标下协商责任和行动方式', '拒绝交流并把影响转嫁给他国', '只让一个国家承担全部责任', '不考虑发展阶段和实际能力', '共同挑战需要合作，同时要考虑各国实际情况和能力。', 1],
      ['“人类命运休戚与共”对青少年的启示是？', '关注全球问题，以理性和友善态度参与交流', '认为国际问题与个人行为毫无关系', '以偏见评价不同文化群体', '传播未经核实的跨国冲突消息', '青少年可以通过学习、交流和负责任传播增进理解。', 0],
      ['跨文化交流中遇到不同生活习惯，适当态度是？', '尊重差异、平等交流并了解具体背景', '把自己的习惯视为唯一正确标准', '用个别例子概括整个民族', '拒绝了解对方的解释', '尊重文化多样性有助于平等沟通和相互理解。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-world-change', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第二课 当今世界时代潮流', section: '动荡变革的世界', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位；以全球联系、风险交织和时代变化的复杂性设计题目。',
    points: [['世界变化', '当今世界联系日益紧密，同时面临多种交织的风险和挑战。'], ['理性判断', '分析国际问题需核实事实、辨析原因并避免简单化判断。']],
    questions: [
      ['国际供应链某一环节受阻并影响多个国家，反映？', '经济联系使各国发展相互影响', '各国经济已经彼此隔绝', '任何局部事件都不会外溢', '全球联系只存在于文化领域', '供应链跨区域运行，一处变化可能影响相关国家。', 0],
      ['看到一条关于国际冲突的短视频，理性做法是？', '核实发布来源、时间和其他可靠报道后再判断', '立刻转发并配上确定结论', '只依据评论区点赞数量判断', '剪掉上下文让内容更醒目', '国际信息需要核实来源、时间及上下文，谨慎传播。', 1],
      ['面对全球风险和不确定性，国家间沟通的价值是？', '增进信息互通并寻找减少冲突和风险的办法', '保证各国利益完全一致', '替代所有国内治理', '让各国不再有不同意见', '沟通有助于降低误判并探索共同解决办法，但不消除差异。', 0],
      ['对当今世界趋势作判断，较可靠的方法是？', '结合多地区事实和较长时间的数据观察', '只依赖一次新闻事件', '把预测当成已经发生的事实', '只使用未经核实的个人账号', '趋势判断需多来源、跨时间的证据支撑。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-historical-trend', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第二课 当今世界时代潮流', section: '不可阻挡的历史潮流', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位；围绕和平、发展、合作及世界联系的时代趋势设问。',
    points: [['和平与发展', '和平、发展与合作是时代主题，仍需各方持续努力。'], ['开放合作', '开放合作能够促进交流互鉴和共同发展，也需遵守国际规则。']],
    questions: [
      ['不同国家通过贸易和科技交流实现互利，体现？', '开放合作可以增进联系并促进共同发展', '合作必然消除所有竞争', '各国必须放弃自身文化', '交流只能带来冲突', '国际合作能带来互利机会，但仍需妥善处理竞争与规则。', 0],
      ['维护世界和平需要？', '通过对话协商、遵守国际法和共同努力减少冲突', '依靠单方面威胁解决所有分歧', '认为和平会自动永久维持', '切断国家间一切沟通', '和平需要持续的对话、规则和实际努力。', 1],
      ['“合作是时代潮流”并不意味着？', '国家间不会存在利益差异或矛盾', '各国可在共同利益上寻求合作', '国际规则有助于协调关系', '沟通有助于减少误解', '合作趋势不等于利益完全一致，差异仍需协商解决。', 0],
      ['青年参与国际交流时，较好的做法是？', '尊重事实和规则，平等分享并认真倾听', '把未经核实的传言当作本国立场', '以侮辱性言语回应分歧', '要求他人完全放弃不同意见', '平等、理性和尊重有助于交流互鉴。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-un', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第三课 以联合国为核心的国际体系', section: '走近联合国', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位联合国专题；以联合国宗旨、职能与国际合作为基础原创设问。',
    points: [['联合国宗旨', '联合国致力于维护国际和平与安全、促进国际合作。'], ['多边合作', '联合国为各国开展对话、协调和合作提供重要平台。']],
    questions: [
      ['联合国建立的重要宗旨之一是？', '维护国际和平与安全', '管理所有国家的国内事务', '取代各国政府', '保证成员国不存在任何分歧', '维护国际和平与安全是联合国宗旨之一。', 0],
      ['联合国大会等机制的重要作用是？', '为成员国提供讨论和协调国际事务的平台', '替所有国家直接制定国内法律', '自动解决所有国际争端', '取消国家主权', '联合国为多边讨论和国际合作提供制度平台。', 1],
      ['了解联合国某项决议的内容，应优先查阅？', '联合国官方文件和可靠的决议文本', '无署名的二手截图', '与决议无关的个人评论', '没有日期的转发消息', '官方决议文本有助于核对文件内容和通过时间。', 0],
      ['联合国开展人道主义援助时，合作的意义是？', '协调资源并支持受影响民众获得援助', '让援助者获得受援国全部决策权', '保证灾害不再发生', '免除所有国家履行国际义务', '国际协调可提高援助效率，但不能消除灾害本身。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-international-system', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第一单元 我们共同的世界 / 第三课 以联合国为核心的国际体系', section: '当代国际体系', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位当代国际体系；围绕主权平等、国际规则与多边主义设问。',
    points: [['国际规则', '国际体系以国际法和多边机制为重要基础。'], ['主权平等', '国家不论大小强弱，在国际法上的主权平等应得到尊重。']],
    questions: [
      ['国家间处理共同事务时，遵守国际规则有助于？', '形成稳定预期并协调不同国家的行动', '保证各国利益永远完全一致', '取消所有国家主权', '替代各国国内法律的全部作用', '规则有助于协调关系和形成可预期的合作秩序。', 0],
      ['主权平等原则意味着？', '各国主权应受尊重，不能仅凭国力大小否定其平等地位', '国土面积大的国家可任意支配他国', '国家必须放弃全部自主权', '不同国家不能开展合作', '主权平等是国际关系基本原则之一。', 1],
      ['面对跨国问题，多边机制的优势是？', '让多个相关方在共同规则下协商并协调行动', '只让一个国家决定所有结果', '无须公开任何信息', '自动消除各方利益差异', '多边机制为相关方协商提供平台，但仍需持续谈判。', 0],
      ['评价一项国际安排是否符合规则，首先应？', '查阅相关条约、决议和各方承担的义务', '只看新闻标题是否支持自己', '依据国家大小判断合法性', '把个别网络发言当作正式文件', '需要依据正式文本和相关国际法规则进行判断。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-two-overall-situation', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第四课 胸怀“两个大局”', section: '深度联动的“两个大局”', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位“两个大局”主题；以国内发展和国际环境相互影响设问。',
    points: [['内外联动', '国内发展与国际环境相互联系，分析问题需兼顾国内外条件。'], ['统筹发展与安全', '把握发展机遇时应识别外部风险并提升应对能力。']],
    questions: [
      ['国际市场变化影响国内企业生产，说明？', '国内发展与国际环境存在联系和互动', '国内经济可以完全不受世界影响', '所有企业受到的影响必然相同', '国际变化只影响旅游业', '贸易与产业链联系使国际变化可能影响国内发展。', 0],
      ['统筹国内发展和国际环境，较适当的做法是？', '扩大开放合作并增强风险识别和应对能力', '因存在风险而停止一切国际交流', '忽视外部变化只追求短期增长', '把风险全部转嫁给个人', '统筹发展与安全需在合作中识别和应对风险。', 1],
      ['判断国际变化对某行业的影响，最好？', '结合产业数据、政策环境和上下游联系分析', '只看一条个别企业消息', '以未经核实的网络传言作预测', '忽略时间和行业差异', '多来源数据和产业关联分析能支持更可靠判断。', 0],
      ['“两个大局”相互联动提醒我们？', '观察国内问题时也要关注国际背景和影响', '国际因素可以解释一切国内问题', '国内因素和国际因素永远互不相关', '无需根据新情况调整政策', '内外因素相互影响，但具体问题仍需结合证据分析。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-open-new-situation', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第四课 胸怀“两个大局”', section: '于变局中开新局', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位变局与发展主题；考查识别机遇、应对风险和创新实践。',
    points: [['机遇与挑战', '变化既带来新的发展机会，也可能伴随风险和不确定性。'], ['开拓新局', '结合实际提升创新能力，在依法合规基础上把握机遇。']],
    questions: [
      ['新技术改变行业后，企业想把握机遇，合理做法是？', '调查需求、提升技术能力并评估风险后稳步创新', '不研究市场就投入全部资源', '拒绝学习新技术', '忽略知识产权和安全规范', '把握机遇需基于调查、能力建设和风险评估。', 0],
      ['面对外部不确定因素，组织制定计划时应？', '准备多种情景方案并定期根据证据调整', '只设一种方案且拒绝复盘', '把预测结果当作必然事实', '隐瞒风险以避免讨论', '情景规划和复盘能增强应变能力。', 1],
      ['“于变局中开新局”并不等于？', '只要勇于尝试就可以忽视法律和安全', '主动学习有助于适应变化', '创新可推动新的发展空间', '评估风险是负责任的决策', '创新和行动仍须依法合规并控制风险。', 0],
      ['评价一项创新项目是否可持续，应综合考虑？', '需求、资源、社会影响和长期维护能力', '只看启动时是否新奇', '只统计宣传次数', '不考虑使用者和环境', '可持续项目要兼顾需求、资源和长期影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-peace-development', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第五课 坚持和平发展道路', section: '“国强必霸”不是历史定律', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位和平发展主题；围绕国家发展道路、历史解释和和平合作原创设问。',
    points: [['和平发展', '国家发展道路并非只有一种，国力增长不必然导致对外扩张。'], ['历史判断', '分析国家行为需依据具体政策、制度和历史证据。']],
    questions: [
      ['判断“国强必霸”是否为必然规律，较严谨的方法是？', '比较不同时期国家的政策和行为，检验是否存在多种路径', '只举一个历史例子就认定普遍规律', '把国家实力当作唯一原因', '忽略和平合作的历史事实', '历史规律判断需要多案例和具体政策证据，不能从单例推断。', 0],
      ['坚持和平发展道路通常强调？', '通过合作共赢促进自身发展并维护世界和平', '以强迫他国服从作为发展的唯一方式', '拒绝参与任何国际合作', '把国家间竞争转化为冲突', '和平发展强调合作、互利和通过和平方式处理关系。', 1],
      ['分析某国外交政策时，哪些材料更有价值？', '正式政策文件、条约实践和长期行动记录', '只看一条脱离上下文的新闻标题', '只凭网络评论区判断', '仅用经济总量推断全部外交行为', '正式文件和持续行动能更充分反映政策和实践。', 0],
      ['面对国际分歧，和平解决的途径包括？', '对话协商、调解和依照国际规则处理', '威胁攻击对方民众', '传播煽动仇恨的谣言', '拒绝任何沟通渠道', '对话、协商和规则有助于和平处理分歧。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-builder-world-peace', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第五课 坚持和平发展道路', section: '世界和平发展的建设者', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位世界和平发展主题；以国际合作和青年行动设计题目。',
    points: [['和平建设', '维护和平需要国家间对话合作，也需要社会成员反对仇恨和暴力。'], ['发展合作', '教育、卫生、减贫和科技合作可促进共同发展。']],
    questions: [
      ['参与国际救灾合作，最能体现建设者作用的是？', '在受援方需求和规则基础上协调专业救援资源', '把援助附加为控制当地事务的条件', '不核实需求就重复运送物资', '以救灾名义传播未经核实的信息', '有效援助应尊重受援方需求并依法协调资源。', 0],
      ['校园开展跨文化和平交流，合理活动是？', '倾听不同观点、核实信息并合作完成共同任务', '用刻板印象评价同学', '禁止提出不同意见', '把争论升级为人身攻击', '平等交流与合作能增进理解并减少偏见。', 1],
      ['国际发展合作要取得实际效果，通常需要？', '明确共同目标、参与方责任和持续跟踪机制', '只宣布目标而不落实项目', '不考虑当地条件', '只统计出席人数', '合作项目需要可执行目标、责任分工与结果评估。', 0],
      ['维护和平与个人日常行为的联系是？', '理性沟通、尊重他人并拒绝传播仇恨信息', '认为网络言论不需要承担责任', '把未经核实的冲突视频当作事实扩散', '以侮辱回应分歧', '日常尊重和负责任的信息行为有助于营造和平氛围。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-international-influence', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第六课 做负责任大国', section: '国际影响力不断增强', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位负责任大国主题；用国际合作参与和实际成效设问。',
    points: [['国际参与', '国际影响力体现在参与全球治理、提供公共产品和开展务实合作。'], ['负责任行动', '国际行动应遵守国际规则，兼顾能力、承诺和实际成效。']],
    questions: [
      ['判断一国国际影响力，较全面的依据是？', '结合国际参与、合作贡献和实际结果综合观察', '只比较国土面积', '只数出席国际会议的照片', '仅凭网络热度作结论', '影响力需要从参与、贡献和结果等多方面观察。', 0],
      ['参与国际组织工作时，符合负责任态度的是？', '遵守共同规则、提出建设性建议并履行承诺', '只要求他国承担义务', '随意退出已作出的承诺', '拒绝听取其他成员意见', '负责任参与需遵守规则、积极协商并兑现承诺。', 1],
      ['某项国际合作项目公布后，评价其成效应关注？', '目标完成情况、受益群体和后续影响', '新闻报道数量', '启动仪式规模', '项目名称是否醒目', '实际成效要看目标和受益情况，而非宣传规模。', 0],
      ['提供国际公共产品的意义之一是？', '帮助应对共同问题并促进国际合作', '保证提供方获得对他国的控制权', '消除不同国家的利益差异', '替代所有国家自身努力', '公共产品可服务共同利益，但仍需合作方共同参与。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-big-country-responsibility', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第六课 做负责任大国', section: '展现大国担当', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位大国担当主题；以共同责任、能力原则和实际行动为核心。',
    points: [['大国担当', '承担国际责任应与维护共同利益、国家能力和国际规则相结合。'], ['合作方式', '通过协商、援助和经验分享推动共同应对挑战。']],
    questions: [
      ['面对跨国公共卫生风险，负责任的国际行动包括？', '分享防控经验并在规则下开展合作', '隐瞒风险信息以获取短期利益', '阻止其他地区获得必要援助', '传播未经核实的病例数字', '信息共享和规则合作有助于共同防控跨境风险。', 0],
      ['体现大国担当的行动更可能是？', '在自身能力范围内履行承诺并支持共同解决问题', '无视国际规则单方面作出决定', '只追求本国短期利益', '以援助为由干涉他国内政', '担当需结合能力、规则和共同利益。', 1],
      ['国际援助项目出现执行困难时，合适做法是？', '与合作方评估困难并协商调整实施方案', '隐瞒问题直到项目结束', '撤走全部资源且不说明原因', '将责任全部推给受援社区', '协商评估和调整有助于项目持续并回应实际需求。', 0],
      ['评估一项大国担当行动是否有效，应？', '核对承诺、执行过程和对共同问题的实际贡献', '只看发布声明的次数', '只依据外界赞美或批评', '忽略受影响群体反馈', '应将承诺与落实和实际影响相比较。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-china-wisdom', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第七课 构建人类命运共同体', section: '积极贡献中国智慧', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位中国智慧主题；围绕协商、合作和共同发展的理念设问。',
    points: [['中国智慧', '以对话协商、合作共赢和共同发展理念参与全球治理。'], ['共同价值', '提出倡议需尊重各国平等参与并转化为可执行合作。']],
    questions: [
      ['多国共同治理跨境河流水资源，符合协商合作的方式是？', '共享监测信息并协商合理用水和保护方案', '由一方单独决定所有国家的用水', '隐瞒上游水质监测结果', '以威胁替代协商', '跨境资源问题需要相关方共享信息并协商规则。', 0],
      ['向国际社会提出合作倡议后，还需要？', '听取各方意见并推动形成具体项目和落实机制', '把倡议当作已经实现的成果', '拒绝其他国家参与讨论', '只发布口号不设置行动安排', '倡议需要平等协商并转化为可落实的合作行动。', 1],
      ['“合作共赢”在国际项目中的体现是？', '参与方共同明确利益、责任和成果分享办法', '一方获益并把成本转给他方', '只关注项目发起者的宣传', '不让受影响社区表达意见', '合作共赢要求兼顾各方合理利益并明确责任。', 0],
      ['介绍某项国际倡议时，为准确说明实际进展，应？', '区分倡议目标、已签署安排和已经完成的项目', '把所有意向都称为已完成成果', '不核实参与方和时间', '只引用社交媒体评论', '清楚区分目标、协议与实际成果能避免夸大。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-shared-world', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第二单元 建设美好世界 / 第七课 构建人类命运共同体', section: '携手共创美好世界', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位共创美好世界主题；综合共同挑战、尊重差异与青年行动。',
    points: [['共同未来', '构建共同未来需要各国协商合作、尊重差异并承担相应责任。'], ['青年行动', '青年可通过学习、交流和务实行动促进相互理解与可持续发展。']],
    questions: [
      ['共同应对气候风险时，促进合作的做法是？', '交流减排与适应经验，协商各方可承担的行动', '只要求其他国家行动', '不分享灾害预警信息', '将生态成本转移到弱势地区', '共同挑战需要信息共享和考虑各方实际能力的合作。', 0],
      ['不同国家对一项全球议题有不同看法，合适的处理方式是？', '平等沟通、理解分歧并寻找共同利益', '把不同意见视为敌意', '拒绝提供任何证据', '公开侮辱对方群体', '平等对话可以理解差异并探索合作空间。', 1],
      ['青少年参与国际交流项目，负责任的做法是？', '尊重文化差异、准确表达并保护他人隐私', '未经同意公开参与者信息', '故意传播刻板印象', '用未经核实的资料代表他人发言', '跨文化交流需要准确、尊重并保护个人信息。', 0],
      ['评价“共创美好世界”的行动是否有效，宜关注？', '是否回应真实需求、实现合作目标并持续改善', '宣传口号是否押韵', '参与活动的照片数量', '是否由单一国家独自决定', '效果应根据需求回应、目标完成和持续影响判断。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-national-future', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第八课 坚定理想信念', section: '理想信念关乎国家未来', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位理想信念主题；联系个人理想、国家发展和青年责任。',
    points: [['理想与国家', '个人理想可与国家和社会发展需要相联系。'], ['价值选择', '理想信念帮助明确方向，也需以现实学习和实践为基础。']],
    questions: [
      ['青少年讨论个人理想与国家未来的关系，较合理的认识是？', '个人可把成长目标与社会需要相结合并努力实践', '个人目标必然与社会发展无关', '只要有理想就不需要学习', '国家发展只由少数人决定', '个人理想可以通过学习、劳动和服务社会融入国家发展。', 0],
      ['理想信念发挥积极作用，需要？', '转化为具体目标和长期行动', '只停留在口头表达', '拒绝根据现实调整计划', '把目标强加给他人', '理想需要通过实践行动落实，并在现实中不断完善。', 1],
      ['选择未来发展方向时，较好的思路是？', '了解自身特点、社会需要和可行路径后作出规划', '只按同伴选择照搬', '只听取一条未经核实的建议', '认为任何规划都不应调整', '规划要结合自身条件、社会需求和变化。', 0],
      ['坚定理想信念并不意味着？', '可以不尊重规则或忽略具体条件', '遇到困难时仍保持合理目标', '愿意为目标持续学习', '把个人成长与社会责任联系起来', '理想信念要与规则、责任和现实行动相结合。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-build-belief', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第八课 坚定理想信念', section: '筑牢理想信念根基', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位理想信念根基主题；围绕价值判断、学习实践和理性坚持设题。',
    points: [['信念根基', '理想信念建立在正确价值认识、持续学习和实践体验之上。'], ['理性坚持', '坚持目标同时应根据证据和现实条件调整实现路径。']],
    questions: [
      ['筑牢理想信念根基，较有效的做法是？', '主动学习、参与实践并持续反思自己的价值选择', '只记住口号而不理解含义', '拒绝接触不同事实', '通过贬低他人表达坚定', '学习与实践能帮助形成稳定、理性的价值认识。', 0],
      ['实现长期目标遇到客观条件变化时，合理做法是？', '保持目标方向并调整具体路径和阶段计划', '无论条件如何都拒绝任何调整', '因为遇到困难就放弃所有目标', '把困难归咎于同伴', '坚持方向和灵活调整路径可以同时做到。', 1],
      ['判断一种网络观点是否符合自己的价值判断，最好？', '核实事实并结合规则、责任和他人权利分析', '只看转发量', '只因熟人支持就认定正确', '先转发再考虑后果', '价值判断应以事实和原则为依据，也考虑行动影响。', 0],
      ['坚定信念与尊重他人意见之间的关系是？', '可以坚持原则，同时倾听证据并理性讨论', '坚持信念就必须拒绝所有讨论', '听取意见等于放弃立场', '不同意见必须受到惩罚', '理性交流允许坚持原则，也要求尊重事实与他人。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-practice-skills', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第九课 练就过硬本领', section: '勤学苦练 增强本领', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位增强本领主题；以学习方法、实践技能和持续成长原创设问。',
    points: [['能力提升', '知识学习与实践训练相结合，才能不断提升解决问题的能力。'], ['终身学习', '技术和社会持续变化，持续学习有助于适应未来发展。']],
    questions: [
      ['想提高实验操作能力，最有效的学习安排是？', '先理解原理，再在安全指导下反复练习和复盘', '只背仪器名称不动手', '跳过安全要求追求速度', '只看一次演示就认为已经掌握', '理解、规范练习和复盘有助于形成稳定技能。', 0],
      ['学习一项新技能时，遇到错误结果更好的做法是？', '记录过程、查找原因并调整方法后再次练习', '删除记录并假装成功', '把错误全部归因于设备', '停止学习且不寻求帮助', '反思和修正错误是提升技能的重要环节。', 1],
      ['团队完成实践任务时，怎样提升整体本领？', '明确分工、互相反馈并让每人承担相应责任', '由一人包办所有工作', '不沟通且重复劳动', '隐藏困难避免求助', '分工合作和反馈能支持共同学习与任务完成。', 0],
      ['评价学习是否进步，较可靠的依据是？', '阶段目标完成情况、作品质量和反思记录', '只看学习时长而不看效果', '只听一句表扬', '与不同起点的人比较单一分数', '多方面证据可更全面反映能力变化。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-career-plan', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第九课 练就过硬本领', section: '脚踏实地 做好生涯规划', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位生涯规划主题；联系兴趣能力、社会需求和阶段行动。',
    points: [['生涯规划', '规划应结合兴趣、能力、价值追求和社会发展需要。'], ['动态调整', '职业和社会环境会变化，规划需要分阶段行动并适时评估。']],
    questions: [
      ['初中生制定生涯探索计划，较合适的起点是？', '了解兴趣和能力，并收集职业与学习路径信息', '现在就认定终身职业且不再了解', '只根据网络收入排行选择', '替同学决定未来方向', '生涯探索需要认识自己、收集信息并了解现实路径。', 0],
      ['发现原先职业目标与自身能力和兴趣不匹配，合理做法是？', '反思原因、补充信息并调整阶段计划', '认为调整就是失败', '隐瞒问题继续投入不适合的路径', '把决定完全交给同伴', '动态规划允许依据新认识调整实现路径。', 1],
      ['了解某职业真实工作内容，较可靠的方式是？', '查阅权威职业信息并访谈从业者、体验相关实践', '只依据影视剧中的角色形象', '只看一条广告', '把个别从业者经历当成全部情况', '多来源信息和实践体验能减少职业认知偏差。', 0],
      ['生涯规划中的阶段目标应？', '具体、可检查并与长期方向和当前条件相衔接', '过于笼统且无法判断是否完成', '只规定他人的行动', '不考虑时间和资源', '可检查的阶段目标便于落实、复盘和调整。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-responsibility', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第十课 锤炼担当精神', section: '担当成就事业', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位担当精神主题；以责任、行动、协作和结果评估设计原创题。',
    points: [['担当精神', '担当体现在面对责任主动行动，并在实践中解决问题。'], ['责任与能力', '承担责任应量力而行、遵守规则并与他人协同。']],
    questions: [
      ['小组活动临近截止仍有任务未完成，体现担当的做法是？', '主动说明进度、协调分工并完成自己承诺的任务', '隐瞒进度直到最后一刻', '把责任推给缺席同学', '擅自删除未完成部分', '担当包含如实沟通、履行承诺和协同解决问题。', 0],
      ['承担超出自身能力的公共任务时，负责任的做法是？', '说明能力边界并寻求合适协助，确保任务安全完成', '不懂也不求助独自冒险', '把工作交给未成年人且不监督', '编造完成情况', '责任行动需量力而行并在需要时寻求专业支持。', 1],
      ['评价一个团队项目是否体现担当，较合适的依据是？', '成员是否履责、遇到问题是否协作解决并完成目标', '只看发起人的口号', '只看团队照片数量', '只看是否获得奖品', '履责过程、协作和实际成果共同反映担当。', 0],
      ['在公共空间发现安全隐患，适当行动是？', '在确保自身安全的前提下提醒他人并报告管理人员', '擅自拆卸设备', '拍视频传播但不告知管理人员', '认为与自己无关而忽视', '担当要兼顾安全、及时提醒和通过合适渠道报告。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-daofa-9b-duty-to-country', grade: '初三', subject: '道德与法治', volume: '下册',
    chapter: '第三单元 争做时代新人 / 第十课 锤炼担当精神', section: '天下兴亡 匹夫有责', directoryUrl: politics9b,
    evidence: '按统编版2027春九下目录原文定位家国责任主题；联系公民责任、劳动实践和社会参与。',
    points: [['家国责任', '国家发展与每位社会成员的责任和实践相关。'], ['行动落实', '爱国情感可通过守法、学习、劳动和服务社会等行动体现。']],
    questions: [
      ['青少年把责任落实在日常生活中，较实际的方式是？', '认真学习、遵守规则并参与力所能及的公共服务', '只发布口号而不履行承诺', '认为国家发展与个人行为无关', '为表达情感而破坏公共设施', '爱国与责任可落实为学习、守法和服务社会等实际行动。', 0],
      ['参与社区公共服务时，怎样体现负责任？', '按约定完成任务并尊重服务对象的意愿和隐私', '未经允许公开受助者信息', '承诺无法做到的长期服务', '以服务为由要求他人服从', '服务社会需要守信、尊重并保护个人隐私。', 1],
      ['劳动实践对青年成长的意义之一是？', '在真实任务中锻炼本领并理解责任和协作', '劳动只为获得评奖照片', '劳动可以替代全部知识学习', '只有有报酬的劳动才有价值', '劳动实践能促进能力发展并培养责任意识。', 0],
      ['当个人计划与公共规则发生冲突时，适当做法是？', '依法调整计划并通过合理渠道表达诉求', '为自己方便而随意违反规则', '把责任推给管理者', '公开他人隐私迫使规则改变', '承担社会责任应尊重法律规则并理性表达诉求。', 1],
    ],
  },
]

const english9aAppendixLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-english-9a-reference-appendices', grade: '初三', subject: '英语', volume: '上册',
    chapter: '*Reading Plus（选学）；附录：Listening Scripts、Grammar、Vocabulary in Each Unit、Vocabulary A–Z、Vocabulary from Primary School、Irregular Verbs',
    section: '*Reading Plus（选学）；附录：Listening Scripts、Grammar、Vocabulary in Each Unit、Vocabulary A–Z、Vocabulary from Primary School、Irregular Verbs', directoryUrl: english9a,
    evidence: '按人教版（2024）九上目录原文定位选学阅读及附录；围绕听力核对、语法索引、词汇查找和不规则动词复习设题。',
    points: [['学习工具使用', '听力原文、语法索引和词汇表可用于复核、扩展和自主订正。'], ['词形变化', '不规则动词需结合原形、过去式和过去分词在语境中识记。']],
    questions: [
      ['完成听力练习后使用 Listening Scripts 订正，较有效的方法是？', '先独立作答，再定位关键词和误听处并记录原因', '只抄全文而不核对自己的答案', '先读脚本后把听力答案全部猜成相同选项', '跳过不懂的表达且不复习', '先独立完成再对照原文，有助于定位听辨问题。', 0],
      ['查找一个单词在本册各单元中的具体用法，优先使用？', 'Vocabulary in Each Unit', '目录页码代替词汇表', '随机选择一个语法例句', '只查看小学词汇表', '按单元编排的词汇表便于回到对应学习语境。', 1],
      ['动词 go 的过去式和过去分词分别是？', 'went；gone', 'goed；goed', 'gone；went', 'goes；going', 'go 是不规则动词，过去式 went，过去分词 gone。', 0],
      ['利用 Grammar 附录复习一个语法点后，检验掌握情况的好方法是？', '自己造句并检查形式和语境是否匹配', '只记住标题不做使用练习', '把附录中的所有规则套进每句话', '忽略例句中的上下文', '主动造句和核查语境能检验是否真正会用。', 1],
    ],
  },
]

const physics9LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-physics-heat-engine-model', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第十四章　内能的利用', section: '第4节　跨学科实践：制作简易热机模型', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位热机跨学科实践；题目围绕能量转化、效率和低压安全模型。',
    points: [['热机与能量', '热机将内能转化为机械能，能量转化过程伴随能量散失。'], ['模型探究', '模型需明确能量输入、输出和安全边界，不能直接接触高温高压装置。']],
    questions: [
      ['热机工作时发生的主要能量转化是？', '内能转化为机械能', '机械能全部转化为电能', '化学能转化为声能且无热量变化', '光能转化为质量', '热机利用内能做功，将一部分内能转化为机械能。', 0],
      ['热机效率通常小于100%，主要因为？', '部分能量散失到周围环境或用于克服摩擦', '能量守恒定律不成立', '所有燃料都不会释放能量', '机械能无法测量', '实际热机存在散热、摩擦等能量损失。', 1],
      ['制作简易热机模型时最重要的安全要求是？', '使用低风险材料和低压方案，并在教师指导下操作', '密封加热容器后持续增大压力', '徒手接触高温部件检查效果', '把易燃物放在火焰旁测试', '热机涉及热和压力，模型实践应避免高压和高温危险。', 0],
      ['比较两种模型的能量利用情况，应测量或估算？', '输入能量和有用输出能量，并说明误差', '只测模型颜色', '只记录持续时间且不看能量输入', '把未测出的数据写成精确值', '效率需比较有用输出与输入能量，并报告测量依据。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-physics-dimmer', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第十六章　电压 电阻', section: '第5节　跨学科实践：制作简易调光台灯', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位调光台灯实践；采用低压模型考查电阻、串联电路与电路安全。',
    points: [['电阻调光', '改变电路电阻可改变电流，从而影响灯泡亮度。'], ['电路安全', '学生模型应使用安全低压电源，连接或调整电路前先断开电源。']],
    questions: [
      ['在低压串联灯电路中增大可变电阻，灯泡电流通常会？', '减小，灯泡可能变暗', '增大到无限大', '保持不变且与电阻无关', '变成零电压但电流更大', '串联总电阻增大时，在电源电压一定条件下电流减小。', 0],
      ['调整模型电路中的接线前，应先？', '断开电源并确认电路处于安全状态', '用手捏住裸露导线再换线', '把电源电压调到最大', '将湿手放在开关附近', '断电后再调整线路可降低触电和短路风险。', 1],
      ['制作调光模型时使用低压电源的主要原因是？', '降低触电风险，适合教学演示和实验操作', '低压电路不受欧姆定律约束', '低压灯泡一定更亮', '低压可代替家庭供电标准', '低压模型降低实验风险，不能直接代替家庭电路。', 0],
      ['调光效果不明显时，较好的改进方式是？', '在断电条件下检查接线和电阻变化范围并记录结果', '直接改接家庭市电插座', '边通电边触摸电阻丝', '忽略电路图并随意增加导线', '检查模型应在断电时进行，并依据电路图和测量结果改进。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-physics-save-electricity', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第十八章　电功率', section: '第3节　跨学科实践：为家庭节约用电提建议', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位家庭节电建议实践；用电功率、使用时间和电能计算支持建议。',
    points: [['电能计算', '一段时间消耗的电能与用电器功率和使用时间有关。'], ['节电建议', '评价节电效果需比较用电量并关注实际使用需求。']],
    questions: [
      ['一台功率为100瓦的电器连续工作2小时，消耗电能是？', '0.2千瓦时', '2千瓦时', '20千瓦时', '200千瓦时', '100瓦=0.1千瓦，电能W=Pt=0.1×2=0.2千瓦时。', 0],
      ['比较两种家庭节电方案，最有依据的做法是？', '在相同时间和使用需求下比较实测或估算电能', '只看宣传口号是否醒目', '把不同月份的账单直接比较而不考虑天气', '只根据电器外观判断功率', '比较应控制使用条件并关注实际耗电量。', 1],
      ['同一电器功率不变，使用时间减半，消耗电能通常会？', '减半', '增加一倍', '保持不变', '变为零', '电能W=Pt，功率不变时电能与使用时间成正比。', 0],
      ['向家庭提出节电建议时，还应考虑？', '安全、舒适和真实用电需求，避免不合理断电', '只追求电量越低越好', '擅自拆除保护装置', '让所有电器同时超负荷运行', '节电建议需兼顾安全、需求和实际效果。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-physics-home-circuit-design', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第十九章　生活用电', section: '第3节　跨学科实践：为家庭电路做设计', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位家庭电路设计实践；强调并联供电、过载保护及禁止学生接触市电。',
    points: [['家庭电路', '家庭用电器通常并联接入，使各支路可独立工作。'], ['用电安全', '电路需有过载保护和可靠接地，家庭市电施工应交由专业人员。']],
    questions: [
      ['家庭中各用电器通常采用并联连接，优点是？', '各支路可独立工作，互不影响正常使用', '所有用电器必定同时开关', '每个用电器都分到零电压', '电流不再需要回路', '并联支路有各自通路，单个用电器开关通常不影响其他支路。', 0],
      ['家庭电路中的保险装置或断路器主要用于？', '电流异常过大时切断电路，保护线路安全', '提高电源电压', '让电能表停止记录', '替代所有电器的开关', '过载保护装置可在异常电流情况下切断线路。', 1],
      ['学生制作家庭电路示意模型，安全做法是？', '使用安全低压模拟电源，不接触实际市电线路', '直接拆开墙内插座测量', '用湿手测试开关是否漏电', '绕过断路器观察线路发热', '家庭市电具有触电风险，课堂模型应使用安全低压方案。', 0],
      ['设计家庭电路时为金属外壳电器考虑接地，主要是为了？', '在绝缘故障时为故障电流提供保护通路', '提高用电器额定功率', '降低电能表精度', '让外壳持续带电', '接地保护有助于故障时降低外壳危险电压并配合保护装置动作。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-physics-dc-motor', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第二十章　电与磁', section: '第5节　跨学科实践：制作简易直流电动机', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位直流电动机实践；考查通电导体受力、能量转化及低压安全。',
    points: [['磁场对电流的作用', '通电导体在磁场中会受到力的作用，力的方向与电流和磁场方向有关。'], ['电动机原理', '电动机将电能转化为机械能，转动线圈需适当改变电流方向。']],
    questions: [
      ['简易直流电动机线圈转动的直接原因是？', '通电线圈在磁场中受到力的作用', '线圈无需电流便自动持续转动', '磁铁把电能消耗掉', '线圈只受到重力而不受磁力', '通电导体在磁场中受力，线圈两侧受力可形成转动。', 0],
      ['改变线圈中的电流方向，磁场方向不变，受力方向通常会？', '反向', '保持不变且与电流无关', '立即变为零重力', '只改变线圈颜色', '通电导体受力方向与电流方向有关，电流反向时受力方向反向。', 1],
      ['直流电动机工作时，主要能量转化是？', '电能转化为机械能', '机械能转化为核能', '内能全部转化为质量', '声能转化为电能', '电动机利用电流和磁场作用产生转动，将电能转化为机械能。', 0],
      ['调试线圈模型时，线圈发热明显，应？', '及时断电检查，避免长时间大电流通过', '继续提高电源电压', '用手触摸裸露接点检查温度', '短接电源两端使电流更大', '线圈发热可能来自电流过大，应断电并按安全方案检查。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-physics-energy-plan', grade: '初三', subject: '物理', volume: '全一册',
    chapter: '第二十二章　能源与可持续发展', section: '第3节　跨学科实践：为节约能源设计方案', directoryUrl: physics9,
    evidence: '按人教版九年级全一册目录定位能源节约方案实践；围绕能源效率、资源利用和方案评估。',
    points: [['能源利用', '提高能源效率、减少不必要消耗有助于节约能源。'], ['方案评价', '比较能源方案需考虑可行性、投入、实际节能量和环境影响。']],
    questions: [
      ['教室照明节能方案中，最直接可测量的评价指标是？', '改造前后相同使用条件下的电能消耗', '灯具外壳的颜色', '宣传海报的尺寸', '每天开关灯次数但不记录时间', '在使用需求相近时比较电能消耗能直接评价节电效果。', 0],
      ['提高建筑保温性能通常有助于？', '减少室内外热交换，降低采暖或制冷需求', '使墙体不再有质量', '保证室温无需任何能源永远不变', '增加所有电器的额定功率', '保温可减缓热传递，减少维持室温所需的能源。', 1],
      ['比较两种能源方案的环境影响，应？', '结合能源来源、转换效率和生命周期影响分析', '只比较启动时声音大小', '只看设备宣传的额定功率', '忽略生产和运行阶段差异', '完整评价应考虑能源来源、使用效率及相关环境影响。', 0],
      ['设计学校节能方案时，较负责任的步骤是？', '调查实际使用情况、估算节能量并试行评估', '未经测量就更换全部设备', '为节能拆除安全照明', '只按一次观察决定长期投入', '基于调查和试行评估可提高方案的可行性与安全性。', 1],
    ],
  },
]

const chemistry9aLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-introduction', grade: '初三', subject: '化学', volume: '上册',
    chapter: '绪言 化学使世界变得更加绚丽多彩', section: '绪言 化学使世界变得更加绚丽多彩', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位绪言；围绕物质、变化、化学研究和生活应用设问。',
    points: [['化学研究', '化学研究物质的组成、结构、性质及变化规律。'], ['化学与生活', '化学知识用于材料、能源、健康和环境等领域。']],
    questions: [
      ['化学主要研究的对象是？', '物质的组成、结构、性质及其变化规律', '只有天体运动轨道', '只研究文字的语法规则', '只记录生物种类名称', '化学研究物质及其变化规律。', 0],
      ['判断蜡烛燃烧属于化学变化的重要依据是？', '燃烧过程中生成了新物质', '蜡烛形状变短', '蜡烛位置发生移动', '石蜡由固态熔化为液态', '生成新物质是判断化学变化的关键依据。', 1],
      ['开发新材料时，化学知识可以帮助研究？', '材料的组成、性质和用途之间的联系', '材料名称的笔画数', '使用者的身高', '实验室门窗的颜色', '材料组成和性质影响加工方式与实际用途。', 0],
      ['学习化学实验时，正确的科学态度是？', '仔细观察并如实记录现象，再依据证据作解释', '先确定结论再修改观察结果', '只记录符合猜想的现象', '把实验操作当作无需思考的步骤', '化学学习以观察、记录和证据推理为基础。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit1-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第一单元 走进化学世界', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位第一单元复习；综合变化性质、实验观察和基本操作安全。',
    points: [['变化与性质', '物理变化没有生成新物质，化学变化生成新物质；性质描述物质的特征。'], ['实验安全', '按规范取用药品、使用仪器并处理实验废弃物。']],
    questions: [
      ['下列现象中属于化学变化的是？', '铁钉生锈', '冰块融化', '玻璃破碎', '水蒸发', '铁生锈生成了与铁不同的新物质。', 0],
      ['描述“铜能导电”属于物质的？', '物理性质', '化学变化', '化学性质', '实验现象的名称', '导电性不需要通过化学变化表现，属于物理性质。', 1],
      ['取用实验室中的药品，正确做法是？', '按规定用量取用，剩余药品不放回原瓶', '用手直接抓取固体药品', '尝药品判断性质', '把多余药液倒回原试剂瓶', '规范取用和处理药品可以避免污染和安全风险。', 0],
      ['观察实验现象与作出解释的关系，正确的是？', '先客观记录现象，再用证据和原理解释', '把猜测直接写成实验现象', '只记录预期结果', '现象和结论无需区分', '客观记录与解释分开有助于科学推理。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-oxygen-lab', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第二单元 空气和氧气', section: '实验活动1 氧气的实验室制取与性质', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上实验活动目录定位；考查制氧气、检验与验满及实验安全。',
    points: [['氧气制取', '实验室可用过氧化氢在二氧化锰催化下分解制取氧气。'], ['气体检验', '氧气能使带火星木条复燃，检验与验满应在规定位置操作。']],
    questions: [
      ['用过氧化氢制取氧气时，二氧化锰的作用是？', '催化作用', '反应的唯一生成物', '氧气的来源元素', '用于检验氢气', '二氧化锰加快过氧化氢分解，反应前后自身质量和化学性质不变。', 0],
      ['检验一瓶气体是否为氧气，可使用？', '带火星的木条', '湿润的蓝色石蕊试纸', '澄清石灰水直接观察气体颜色', '燃着的镁条伸入瓶中', '氧气能使带火星木条复燃。', 1],
      ['用排水法收集氧气时，通常因为氧气？', '不易溶于水且不与水发生明显反应', '比水重且易溶于水', '能使水立即变成氢气', '无色就一定适合排水收集', '气体不易溶于水且性质稳定时，可考虑排水法收集。', 0],
      ['实验结束停止加热并用排水法收气时，正确的规范要点是？', '先将导管移出水面，再停止加热', '先熄灭酒精灯且导管留在水中', '用手堵住导管口收集余气', '立即触摸热试管判断温度', '先移出导管可防止水倒吸进入受热的试管。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-air-monitor', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第二单元 空气和氧气', section: '跨学科实践活动1 微型空气质量“检测站”的组装与使用', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位空气质量检测实践；关注传感器指标、对照测量和数据局限。',
    points: [['空气质量监测', '监测结果需注明地点、时间、指标、单位和设备信息。'], ['数据解释', '单一传感器读数不能代表所有污染物或完整空气质量。']],
    questions: [
      ['记录微型检测站的空气数据时，哪些信息有助于解释结果？', '地点、时间、监测指标和单位', '只记录颜色不写时间', '仅写设备外壳的尺寸', '不说明测量地点和传感器类型', '环境监测数据需要时间、地点、指标及设备背景。', 0],
      ['一种传感器只测颗粒物读数，能否据此代表空气中全部污染物？', '不能，还需要其他指标和测量信息', '能，颗粒物读数等于所有气体浓度', '能，只要测量一次', '不能，因为空气质量无法测量', '不同污染物需要相应指标，单一读数不能代表全部空气质量。', 1],
      ['比较校园两个地点的颗粒物读数，较公平的做法是？', '尽量在相近时间和相同设备设置下重复测量', '一处测早晨、一处测深夜且不说明', '每处更换不同型号设备', '只挑选最高的一个读数', '统一条件并重复测量可降低时间和设备差异的影响。', 0],
      ['微型空气检测站显示的数据与官方监测不同，合适的处理是？', '检查校准、采样条件和指标口径，并说明设备精度', '直接删除不一致的数据', '把两组数据取平均并称为官方结果', '认定其中一方一定造假', '需核对设备校准和监测口径，不能将简易设备等同于标准站。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit2-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第二单元 空气和氧气', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第二单元目录定位复习；综合空气组成、氧气性质、制取和环境监测。',
    points: [['空气和氧气', '空气是混合物，氧气支持燃烧但本身不燃烧。'], ['环境与实验', '依据氧气性质选择检验方法，空气质量需多指标评价。']],
    questions: [
      ['空气中含量最多的气体是？', '氮气', '氧气', '二氧化碳', '稀有气体总和', '空气按体积分数约78%为氮气、约21%为氧气。', 0],
      ['关于氧气性质，正确的是？', '氧气能支持燃烧，但通常不能说氧气本身可燃', '氧气本身是常见燃料', '氧气不能与任何物质反应', '氧气有刺激性气味', '氧气有助燃性但不是可燃物。', 1],
      ['要比较两地空气质量，较全面的做法是？', '比较多项污染物指标并记录相同时间范围', '只比较空气颜色', '仅依据当天是否刮风', '只测氧气体积分数', '空气质量评价需结合多个污染物指标和一致的时间口径。', 0],
      ['氧气验满时，带火星木条应放在？', '集气瓶口', '集气瓶底部液体中', '发生装置导管内部', '试剂瓶外侧', '氧气密度通常大于空气，验满时在集气瓶口检验。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-atom-model', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第三单元 物质构成的奥秘', section: '跨学科实践活动2 制作模型并展示科学家探索物质组成与结构的历程', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位物质结构模型活动；强调模型依据、历史证据与模型局限。',
    points: [['微观模型', '模型帮助表征不可直接观察的微观结构，但会简化真实对象。'], ['科学史与证据', '科学认识随新证据和实验发展，模型会被检验和修正。']],
    questions: [
      ['制作原子结构模型时，说明模型局限的原因是？', '模型是对微观结构的简化表达，不能呈现全部真实特征', '原子可以直接用肉眼观察', '模型不需要任何证据', '所有模型都与真实物体尺寸相同', '模型帮助理解但会简化对象，需说明不能表达的内容。', 0],
      ['科学家根据新实验修正物质结构模型，说明科学认识？', '会依据新证据不断发展和完善', '一旦提出就永远不能改变', '与实验结果无关', '只能由模型图案决定', '科学模型需要接受证据检验，并可随新证据修正。', 1],
      ['展示物质结构探索历程时，较有说服力的材料是？', '按时间介绍模型、关键实验和模型解释的变化', '只展示最终模型不说明证据', '把不同年代的科学家说成同时工作', '用个人喜好替代实验结果', '科学史展示应联系年代、实验和模型变化。', 0],
      ['为避免把模型误当成实物，讲解者应？', '说明比例、符号含义和模型未表达的部分', '隐去图例和比例', '称颜色就是原子真实颜色', '不解释球棍代表什么', '模型需标注符号含义、比例与简化条件。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit3-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第三单元 物质构成的奥秘', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第三单元目录定位复习；围绕原子、分子、元素和物质分类设计原创题。',
    points: [['微观粒子', '分子、原子和离子是构成物质的微观粒子，化学变化中原子重新组合。'], ['元素和物质', '元素按核内质子数分类，纯净物可分为单质和化合物。']],
    questions: [
      ['化学变化中，保持不变并重新组合的是？', '原子', '分子种类', '物质的颜色', '物质的状态', '化学变化中分子可分，原子种类和数目保持不变并重新组合。', 0],
      ['水分子由氢原子和氧原子构成，水属于？', '化合物', '单质', '混合物', '元素', '水由不同元素组成且是纯净物，属于化合物。', 1],
      ['元素种类由原子中的哪项决定？', '质子数', '中子数总和', '电子层数', '原子质量数', '元素是具有相同质子数的一类原子的总称。', 0],
      ['氦气由氦元素组成且只含一种元素，属于？', '单质', '化合物', '混合物', '溶液', '只由一种元素组成的纯净物叫单质。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-water-lab', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第四单元 自然界的水', section: '实验活动2 水的组成及变化的探究', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上实验活动目录定位水组成探究；依据电解现象、气体体积关系和安全要求设题。',
    points: [['水的组成', '电解水生成氢气和氧气，体积比约为2∶1，表明水由氢、氧元素组成。'], ['宏微观解释', '化学变化中分子分解，原子重新组合形成新分子。']],
    questions: [
      ['电解水时，负极产生的气体主要是？', '氢气', '氧气', '氮气', '二氧化碳', '电解水负极产生氢气，正极产生氧气。', 0],
      ['电解水所得氢气与氧气的体积比约为？', '2∶1', '1∶2', '1∶1', '3∶1', '氢气与氧气体积比约为2∶1，符合水的化学组成关系。', 1],
      ['电解水实验说明水由哪些元素组成？', '氢元素和氧元素', '氮元素和氧元素', '氢元素和碳元素', '只由氧元素组成', '水分解生成氢气和氧气，说明水由氢、氧元素组成。', 0],
      ['电解水过程中发生化学变化的微观本质是？', '水分子分解，原子重新组合形成氢分子和氧分子', '原子变成不同元素的原子', '只有水的状态发生变化', '水分子数目和种类均保持不变', '化学变化中分子可分，原子重新组合形成新分子。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-water-quality', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第四单元 自然界的水', section: '跨学科实践活动3 水质检测及自制净水器', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位水质检测与净水实践；区分过滤、消毒和水质指标。',
    points: [['净水方法', '过滤可除去不溶性固体，不能单独去除所有溶解物或微生物。'], ['水质检测', '浊度、酸碱性等指标各有适用范围，饮用水安全需按规范检测。']],
    questions: [
      ['过滤浑浊水的主要作用是？', '除去水中不溶性固体颗粒', '除去所有溶解的盐类', '保证杀灭所有微生物', '将水分解成氢气和氧气', '过滤主要分离不溶性固体，不能去除所有溶解物。', 0],
      ['用简易滤层处理后的清水看起来透明，能否据此认定可直接饮用？', '不能，还需按规范检测并确认微生物和化学指标安全', '能，透明就表示没有任何有害物质', '能，只要没有气味', '不能，因为所有净水方法都无效', '外观不能充分判断饮用水安全，需检测多项指标。', 1],
      ['比较两种滤材效果时，较合理的设计是？', '使用相同水样和流量，重复记录处理前后指标', '两种滤材分别处理完全不同的水样', '只看滤材颜色', '仅凭一次尝味判断', '控制水样和条件并用指标比较，可减少实验偏差。', 0],
      ['饮用水检测项目应根据什么确定？', '检测目的、相关标准和可能的污染来源', '滤水器的外观颜色', '实验者最喜欢的指标', '只根据水的透明度', '检测项目需结合用途和规范，外观不能替代安全指标。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit4-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第四单元 自然界的水', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第四单元目录定位复习；整合水的组成、净化、节约和资源保护。',
    points: [['自然界的水', '水的组成、净化和利用可从物质变化及水资源保护角度综合分析。'], ['节水与保护', '节约用水和减少污染有助于保护有限的淡水资源。']],
    questions: [
      ['下列做法有助于保护水资源的是？', '减少污水排放并提高水的利用效率', '将实验废液直接倒入河流', '长时间放水清洗少量物品', '把净水设备当作污染源治理的替代品', '减少污染和提高利用效率有助于水资源保护。', 0],
      ['水电解和水蒸发的区别，正确的是？', '电解生成新物质，蒸发只是状态变化', '两者都只发生物理变化', '两者都生成氢气和氧气', '蒸发会改变水分子的元素组成', '电解水是化学变化，蒸发是水的状态变化。', 1],
      ['硬水软化、过滤和消毒的作用？', '各不相同，应根据水质问题选择相应处理方法', '完全相同，可以互相替代', '过滤能完成所有处理', '消毒可除去所有无机盐', '不同处理方法针对不同问题，不能互相替代。', 0],
      ['宣传节约用水时，哪类建议最可执行？', '说明具体用水情境和可落实的节水做法', '只写“节约”但不给行动', '倡导将废水直接排入下水道不处理', '宣称每种废水都可直接饮用', '具体情境和行动建议有助于落实节水目标。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-oxygen-device', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第五单元 化学反应的定量关系', section: '跨学科实践活动4 基于特定需求设计和制作简易供氧器', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位简易供氧器设计实践；围绕需求、反应产气、定量和安全验证设题。',
    points: [['反应定量', '依据化学方程式系数关系估算反应物与生成物的物质比例。'], ['装置设计', '供氧模型要明确产气原理、流速控制、测试方法和安全边界。']],
    questions: [
      ['设计简易供氧器前，首先应明确？', '使用需求、供氧时间和安全条件', '装置颜色和包装图案', '不经验证的最大产气量', '将纯氧装入密闭高压容器', '装置设计需先明确用途、性能要求和风险控制。', 0],
      ['用化学反应估算供氧量时，最重要的依据是？', '配平后的化学方程式及反应物用量', '试剂瓶的颜色', '实验者的呼吸速度', '未配平的反应式', '配平化学方程式给出反应物和生成物的粒子比例。', 1],
      ['验证供氧模型性能，较科学的做法是？', '用安全条件测量气体产生速率和总量并重复记录', '只看气泡是否好看', '不测量就宣称达到医疗标准', '让人员直接吸入未经验证的气体', '性能需以安全测量数据验证，模型不能冒充医疗设备。', 0],
      ['氧气支持燃烧，因此供氧装置周围应？', '远离明火和易燃物并遵守教师给出的安全要求', '用明火检查装置是否漏气', '将油脂涂在接触氧气的部件上', '把装置放在火源旁加热', '氧气助燃，装置周围需严防明火和可燃物。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit5-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第五单元 化学反应的定量关系', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第五单元目录定位复习；围绕质量守恒、方程式配平和反应比例关系设题。',
    points: [['质量守恒', '化学反应前后原子种类和数目不变，因此总质量守恒。'], ['方程式定量', '化学方程式系数表示粒子数目关系，可用于简单定量计算。']],
    questions: [
      ['化学反应前后总质量守恒的微观原因是？', '原子种类、数目和质量在反应前后保持不变', '反应物分子没有发生变化', '所有生成物质量都为零', '化学反应没有能量变化', '原子重新组合但总数和种类不变，故总质量守恒。', 0],
      ['配平化学方程式时，可以改变的是？', '化学式前的化学计量数', '物质的化学式下标', '元素符号的大小写', '反应物和生成物中的原子种类', '配平通过调整化学式前系数守恒原子数，不能改化学式。', 1],
      ['方程式 2H₂+O₂→2H₂O 中，反应物氢分子与氧分子数目比为？', '2∶1', '1∶2', '2∶2', '1∶1', '化学方程式系数表明氢分子与氧分子数目比为2∶1。', 0],
      ['反应容器敞口时产生气体逸出，称量结果可能看似质量减少。对此应？', '把逸出气体也纳入系统或使用密闭装置再分析', '认定质量守恒定律失效', '删除气体生成的事实', '只测量反应物固体', '测量系统边界需包含逸出气体，才能完整比较反应前后总质量。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-co2-lab', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第六单元 碳和碳的氧化物', section: '实验活动3 二氧化碳的实验室制取与性质', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上实验活动目录定位二氧化碳制取与性质；考查气体制备、检验和安全操作。',
    points: [['二氧化碳制备', '实验室常用大理石或石灰石与稀盐酸反应制取二氧化碳。'], ['性质检验', '二氧化碳使澄清石灰水变浑浊，通常不支持燃烧。']],
    questions: [
      ['实验室制取二氧化碳通常选用的药品是？', '大理石或石灰石与稀盐酸', '氯化钠与水', '铜和稀盐酸', '氧气和石灰水', '碳酸钙与稀盐酸反应可生成二氧化碳。', 0],
      ['检验二氧化碳常用的试剂是？', '澄清石灰水', '紫色石蕊试纸直接证明全部气体', '无水硫酸铜', '碘液', '二氧化碳使澄清石灰水变浑浊。', 1],
      ['收集二氧化碳时可以考虑向上排空气法，主要因为二氧化碳？', '密度比空气大且能溶于水，不宜大量用排水法', '密度比空气小且难溶于水', '能使氧气变成氮气', '本身具有颜色', '二氧化碳密度比空气大并能溶于水，常用向上排空气法。', 0],
      ['实验室制取二氧化碳时，不能用浓盐酸代替稀盐酸的主要原因是？', '浓盐酸易挥发，可能使气体混有氯化氢', '浓盐酸不能与碳酸钙反应', '浓盐酸会使石灰石变成氧气', '稀盐酸无法产生任何气体', '浓盐酸挥发会使收集气体不纯。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-low-carbon', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第六单元 碳和碳的氧化物', section: '跨学科实践活动5 基于碳中和理念设计低碳行动方案', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位碳中和实践；区分排放和吸收、核算边界与可验证行动。',
    points: [['碳排放分析', '低碳方案需界定排放来源、活动范围和统计时间。'], ['行动评估', '节能、交通和资源利用等措施应通过可比数据评估效果。']],
    questions: [
      ['设计班级低碳行动方案，首先需要？', '明确统计范围、基准时间和主要排放来源', '只选择最容易宣传的措施', '不收集活动数据', '把所有环境问题都称为碳排放', '明确边界和基准有助于核算并比较行动效果。', 0],
      ['比较步行和乘车到校的碳排放时，应？', '说明距离、出行人数、交通方式和估算依据', '只记录天气状况', '用不同时间段数据直接比较而不说明', '把估算结果称作精确实测值', '排放估算依赖活动数据和方法假设，需如实说明。', 1],
      ['下列哪项行动通常能直接减少不必要的能源消耗？', '离开教室时关闭不需要的照明设备', '无人使用时仍长期开启所有设备', '为减少碳排放而损坏安全设施', '把可重复利用物品一次性丢弃', '减少无效用能是可执行的节能行动。', 0],
      ['报告低碳方案成效时，较可信的做法是？', '用相同口径的前后数据并说明估算不确定性', '只展示口号和活动照片', '只选最有利的一天的数据', '将估算值表述为绝对精确值', '同口径比较和误差说明能增强结果可信度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit6-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第六单元 碳和碳的氧化物', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第六单元目录定位复习；综合碳单质、碳氧化物、反应和环境问题。',
    points: [['碳及其氧化物', '不同碳单质性质与结构相关，二氧化碳可参与碳循环。'], ['实验和环境', '依据气体性质进行制取、检验，并关注碳排放及环境影响。']],
    questions: [
      ['金刚石和石墨都是由碳元素组成但性质不同，主要原因是？', '碳原子的排列结构不同', '两者所含元素完全不同', '石墨不是由原子构成', '金刚石含有水分子', '同种元素形成的物质可因原子排列结构不同而性质不同。', 0],
      ['二氧化碳通入澄清石灰水后变浑浊，主要生成？', '碳酸钙沉淀', '氯化钠晶体', '氧气', '铁锈', '二氧化碳与石灰水中的氢氧化钙反应生成碳酸钙沉淀。', 1],
      ['关于一氧化碳的安全认识，正确的是？', '一氧化碳有毒，使用燃烧设备需保持通风并防止泄漏', '一氧化碳无色无味所以没有危险', '一氧化碳可直接作为室内安全气体', '闻不到气味就能确认空气安全', '一氧化碳无色无味且有毒，需防范不完全燃烧和泄漏。', 0],
      ['减少化石燃料燃烧产生的二氧化碳，可能采取？', '提高能源利用效率并使用合适的低碳能源', '增加无效燃烧时间', '忽略能源转换效率', '只更改燃料名称', '节能提效和能源结构调整有助于降低排放。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-combustion-lab', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第七单元 能源的合理利用与开发', section: '实验活动4 燃烧条件的探究', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上实验活动目录定位燃烧条件探究；题目考查可燃物、氧气、着火点和安全。',
    points: [['燃烧条件', '通常燃烧需要可燃物、与氧气接触并达到着火点。'], ['灭火原理', '移走可燃物、隔绝氧气或降温至着火点以下可灭火。']],
    questions: [
      ['通常物质燃烧需要的条件组合是？', '可燃物、氧气和达到着火点', '水、二氧化碳和低温', '可燃物和氮气即可', '氧气和水即可', '燃烧通常要求有可燃物、氧气并达到着火点。', 0],
      ['用湿布覆盖小范围油锅火焰并关闭热源，主要灭火原理是？', '隔绝氧气并降低温度', '增加可燃物', '提高油的着火点', '向锅内加入更多空气', '覆盖可隔绝空气，降温也可使温度低于着火点。', 1],
      ['探究温度是否影响燃烧时，实验设计应？', '控制可燃物和供氧条件，比较温度变化的影响', '同时改变材料、氧气和温度', '只观察一次且不设对照', '让实验在无人看护下进行', '控制其他变量并设置对照才便于判断温度作用。', 0],
      ['实验室探究燃烧时，首要安全做法是？', '遵守教师指导并远离易燃物，备好规范灭火措施', '用大火提高实验速度', '将燃烧物放在纸堆旁', '离开实验台让火焰自行熄灭', '燃烧实验有火灾风险，需要按规范控制并做好防护。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-fuel-history', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第七单元 能源的合理利用与开发', section: '跨学科实践活动6 调查家用燃料的变迁与合理使用', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录原文定位家用燃料调查；联系燃料变化、燃烧排放和安全使用。',
    points: [['燃料与能源', '不同燃料的来源、燃烧产物和使用条件存在差异。'], ['安全与环境', '燃气使用应保持通风、检查设备并遵守安全规范。']],
    questions: [
      ['调查家庭燃料变迁时，较完整的记录应包括？', '燃料种类、使用年代、用途和相关环境影响', '只记录炉灶的颜色', '只询问一户且推断全国情况', '不说明信息来源', '燃料调查需收集时间、用途和影响等多方面资料。', 0],
      ['使用燃气灶时闻到异常气味，适当做法是？', '避免明火和电器开关操作，及时通风并联系专业人员', '点火检查是否漏气', '立即打开电风扇开关', '继续使用并忽略气味', '疑似燃气泄漏时应避免火花并按安全规范处理、求助。', 1],
      ['比较两种家用燃料的环境影响，较合理的方法是？', '考虑燃烧排放、使用效率和燃料来源', '只比较燃料名称长短', '只看炉具价格', '忽略使用量和燃烧条件', '燃料环境影响与排放、效率和来源共同相关。', 0],
      ['访谈家庭成员了解燃料使用史时，调查者应？', '标明访谈时间和对象，并用其他资料交叉核对', '把个人回忆当作全国统计', '修改回答使其更符合预期', '不经同意公开家庭隐私', '口述材料应记录来源、尊重隐私并与其他证据核验。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-unit7-review', grade: '初三', subject: '化学', volume: '上册',
    chapter: '第七单元 能源的合理利用与开发', section: '本单元复习与测试', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上第七单元目录定位复习；整合燃烧、燃料、能源利用和环境影响。',
    points: [['燃烧和灭火', '燃烧与可燃物、氧气和温度相关，灭火通过破坏条件实现。'], ['能源与环境', '合理利用能源需兼顾效率、安全、资源和环境影响。']],
    questions: [
      ['下列措施能降低燃料不完全燃烧风险的是？', '保证燃烧设备通风并定期检查', '封闭所有进气口且继续燃烧', '拆除排烟设施', '在室内使用有故障的燃烧设备', '充足供氧和设备维护有助于安全、充分燃烧。', 0],
      ['灭火的基本原理是？', '破坏燃烧条件中的至少一个', '不断增加氧气', '持续提高可燃物温度', '补充更多燃料', '隔绝氧气、降低温度或移走可燃物都可达到灭火目的。', 1],
      ['评价能源使用方案时，较全面的指标包括？', '效率、成本、可靠性和环境影响', '只看燃料颜色', '只考虑一次购买价格', '只比较设备重量', '能源方案要综合使用效率和经济、环境因素。', 0],
      ['可再生能源与化石燃料的比较，正确做法是？', '结合资源条件、供能稳定性和环境影响分析', '认为所有地区都能使用同一种能源', '不考虑电网和储能条件', '仅凭名称判断能源一定无影响', '能源选择需联系当地资源条件及系统运行需要。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9a-whole-book', grade: '初三', subject: '化学', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: chemistry9a,
    evidence: '按人教版（2024）九上目录定位本册综合；题目跨化学实验、物质构成、反应定量、水与能源。',
    points: [['化学知识整合', '将微观粒子、物质性质、化学变化和定量关系联系起来。'], ['实验探究', '设计实验需控制变量、规范操作并如实处理数据。']],
    questions: [
      ['解释一个化学实验结果时，最可靠的过程是？', '记录现象、核对实验条件并用化学原理解释', '先写结论再选择数据', '删除与预测不一致的现象', '只凭气味确定所有物质', '实验解释应建立在真实记录和原理分析之上。', 0],
      ['化学反应前后总质量守恒，可用于检查？', '化学方程式是否符合原子数守恒', '物质的颜色是否相同', '反应器皿是否同样大小', '气体是否有气味', '配平方程式需要使反应前后各元素原子数相等。', 1],
      ['净水实验得到透明水样后，下一步较科学的是？', '按检测目的检查水质指标，不凭外观判断安全', '直接品尝水样', '称透明度就能确认全部指标', '宣称滤材已去除所有物质', '外观透明不能代替针对性水质检测。', 0],
      ['实验中出现与预期不同的结果，正确做法是？', '检查装置和数据、重复实验并据证据修正解释', '修改原始数据使其符合预期', '隐瞒实验过程', '立即认定化学规律错误', '核查条件、重复验证和修正解释符合科学探究要求。', 1],
    ],
  },
]

const chemistry9bLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit8-consolidation', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第八单元 金属和金属材料', section: '整理与提升', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第八单元目录定位整理提升；综合金属性质、活动性、锈蚀和资源保护。',
    points: [['金属性质', '金属具有一定的导电、导热和延展性，不同金属化学性质有差异。'], ['保护与利用', '防锈、回收和合理开采有助于节约金属资源。']],
    questions: [
      ['铁制品防锈的常见方法是？', '保持干燥并形成隔绝水和氧气的保护层', '长期浸在盐水中', '刮去保护层后放在潮湿处', '与酸长期接触', '隔绝水和氧气可减缓铁锈蚀。', 0],
      ['铁能与稀盐酸反应生成氢气，而铜通常不与稀盐酸反应，说明？', '铁的金属活动性比铜强', '铜比铁活泼', '两种金属都不发生变化', '盐酸不能与任何金属反应', '铁能置换酸中的氢，活动性强于铜。', 1],
      ['废旧金属回收的意义之一是？', '减少矿产资源消耗并降低废弃物处理压力', '让金属元素消失', '保证所有金属可无限循环且无能耗', '替代所有材料', '回收可节约资源，但过程仍需能耗和污染控制。', 0],
      ['比较金属材料用途时，较合理的依据是？', '结合硬度、导电性、密度、耐腐蚀性和成本需求', '只看材料颜色', '只用一种性质决定全部用途', '忽略使用环境', '材料选择需要把多种性能和实际需求一起考虑。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-metals-lab', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第八单元 金属和金属材料', section: '实验活动5 常见金属的物理性质和化学性质', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下实验活动目录定位金属性质实验；强调观察、对照和药品安全。',
    points: [['物理性质比较', '可通过颜色、硬度、导电性和密度等观察或测量金属物理性质。'], ['化学性质探究', '通过控制条件比较金属与酸或盐溶液的反应。']],
    questions: [
      ['比较铁、铜导电性时，较公平的实验应？', '使用尺寸相近样品和相同电路条件', '一根金属很长、另一根很短且不作修正', '只凭外观颜色判断', '让样品接入不同电源', '控制样品尺寸和电路条件有助于比较材料导电性。', 0],
      ['金属与酸反应实验中，应避免？', '用手直接接触药品或靠近试管口闻气体', '按要求少量取用药品', '佩戴必要防护并听从指导', '如实记录实验现象', '化学药品和可能生成的气体需按规范操作，不能直接接触或近距离闻气。', 1],
      ['观察金属与稀酸反应是否产生气泡，哪种做法更利于比较？', '控制酸的种类、浓度和金属表面积相近', '每种金属用不同酸且不同用量', '只测量反应前颜色', '同时加热其中一个试管', '控制变量有助于比较不同金属的反应差异。', 0],
      ['实验后若观察到金属表面变化，结论应？', '结合对照和重复结果说明，不把一次现象夸大', '立即推广为所有金属都相同', '忽略可能的表面污染', '只记录预先猜想的结果', '结论需要与实验条件相对应，并通过重复或对照支持。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-waste-sorting', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第八单元 金属和金属材料', section: '跨学科实践活动7 垃圾的分类与回收利用', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下跨学科实践目录定位垃圾分类与回收；从材料组成、可回收性和调查证据设问。',
    points: [['材料回收', '分类回收要依据材料类型、当地分类规则和污染程度。'], ['循环利用', '回收利用可节约资源，但需考虑收集、运输和处理成本。']],
    questions: [
      ['进行校园垃圾分类调查时，最可靠的记录方式是？', '按统一类别连续记录并注明地点、时间和判定规则', '只调查一个垃圾桶后代表全校', '不区分材料类别', '把不同时间数据混在一起', '统一标准、地点和时间有助于调查数据可比较。', 0],
      ['被食物严重污染的包装物是否一定可以直接回收？', '不一定，要依据材料和当地回收规则判断', '一定可以和所有纸张混在一起', '所有包装物都不能回收', '只看包装颜色判断', '污染程度和当地处理要求会影响回收方式。', 1],
      ['金属回收有助于减少原生矿石开采，因为？', '回收材料可作为再生产的原料来源之一', '回收会生成新的金属元素', '金属元素不能循环使用', '矿石开采与材料需求无关', '回收金属可补充原料并减少部分原生资源需求。', 0],
      ['向同学推广垃圾分类时，哪种材料更有说服力？', '结合本校分类数据和清晰的投放指引', '只写抽象口号', '用未经核实的全国数字替代本校情况', '故意隐瞒分类规则差异', '本地调查和明确指引更便于理解与行动。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit8-review', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第八单元 金属和金属材料', section: '单元综合与测试', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第八单元目录定位单元综合；综合金属活动性、性质、锈蚀与资源利用。',
    points: [['金属活动性', '金属活动性可通过与酸或盐溶液的反应比较。'], ['金属资源', '合理利用和保护金属资源需要防锈、回收和改进生产。']],
    questions: [
      ['把锌片放入硫酸铜溶液中，可能观察到？', '锌表面析出红色铜，溶液颜色逐渐变浅', '铜片溶解并产生氢气', '锌片完全不变且溶液变红', '生成金属钠', '锌比铜活泼，可置换出铜。', 0],
      ['铝制品表面形成致密氧化膜，这层膜通常能？', '阻止内部铝继续与外界物质接触而减缓腐蚀', '使铝变成非金属元素', '保证任何条件下都不腐蚀', '使铝完全溶于水', '致密氧化膜可起保护作用，但并非所有环境下都绝对耐腐蚀。', 1],
      ['保护铁桥免受锈蚀，适当措施是？', '涂漆并定期维护，减少水和氧气接触', '长期积水并刮掉保护层', '让铁桥与盐长期接触', '加速表面磨损', '涂层可隔绝水和氧气，维护能及时修补损伤。', 0],
      ['比较金属活动性时，若两种金属都能与稀盐酸反应，应？', '设计其他合适的对照实验或查阅可靠数据继续比较', '据此断定活动性完全相同', '只看气泡颜色', '用手触摸反应液温度决定顺序', '相同现象未必能区分活动性强弱，需进一步设计比较。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit9-consolidation', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第九单元 溶液', section: '整理与提升', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第九单元目录定位整理提升；综合溶液组成、溶解度和溶质质量分数。',
    points: [['溶液组成', '溶液由溶质和溶剂组成，具有均一性和稳定性。'], ['浓度与溶解度', '溶质质量分数表示溶质质量占溶液质量的比例。']],
    questions: [
      ['在一定温度下，一杯均一的食盐水中，任意取出部分溶液，其溶质质量分数通常？', '与原溶液相同', '一定变为零', '一定加倍', '与取出体积无关且无法确定', '均一溶液各部分组成相同，因此质量分数相同。', 0],
      ['溶质质量分数的计算式是？', '溶质质量÷溶液质量×100%', '溶液质量÷溶质质量×100%', '溶剂质量÷溶液体积', '溶质质量÷溶剂质量×100%', '质量分数等于溶质质量占溶液质量的比例。', 1],
      ['某温度下的不饱和溶液还能继续溶解溶质，说明？', '溶液中溶质尚未达到该温度的溶解度限度', '该溶液一定是纯溶剂', '溶解度与温度无关', '溶液不能形成均一体系', '不饱和溶液在该温度下还可继续溶解溶质。', 0],
      ['比较物质在水中的溶解度时，必须注明？', '温度', '容器颜色', '搅拌者姓名', '试剂标签字体', '固体溶解度随温度变化，比较时要注明温度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-saline-solution', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第九单元 溶液', section: '实验活动6 一定溶质质量分数的氯化钠溶液的配制', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下实验活动目录定位定量配液；围绕计算、称量、量取、溶解和误差分析设题。',
    points: [['溶液配制', '配制步骤包括计算、称量或量取、溶解、装瓶和贴标签。'], ['质量分数', '溶质质量分数等于溶质质量除以溶液总质量。']],
    questions: [
      ['配制50克、溶质质量分数为6%的氯化钠溶液，需要氯化钠？', '3克', '6克', '44克', '50克', '50×6%=3克氯化钠，其余为水。', 0],
      ['上述配液中需要水的质量为？', '47克', '3克', '50克', '53克', '溶液质量减去溶质质量，50−3=47克水。', 1],
      ['将称好的氯化钠倒入烧杯并加入水后，通常用玻璃棒？', '搅拌以加快溶解', '加热至沸腾以增加溶质', '刮擦烧杯称量质量', '测定水的体积', '玻璃棒搅拌可加快溶解，操作应避免液体飞溅。', 0],
      ['量取水时仰视量筒读数，实际量取的液体体积相对读数通常？', '偏大', '偏小', '一定相等', '变为零', '仰视读数会使读数偏小，按读数取液时实际体积偏大。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-salt-purification', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第九单元 溶液', section: '实验活动7 粗盐中难溶性杂质的去除', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下实验活动目录定位粗盐提纯；考查溶解、过滤、蒸发和规范操作。',
    points: [['粗盐提纯', '可通过溶解、过滤和蒸发等步骤除去难溶性杂质。'], ['过滤操作', '过滤时滤纸紧贴漏斗，液体沿玻璃棒引流且液面低于滤纸边缘。']],
    questions: [
      ['粗盐提纯中，过滤步骤的主要作用是？', '除去不溶于水的固体杂质', '除去所有可溶性盐', '使氯化钠分解', '增加溶液中的杂质', '过滤能分离不溶性固体与液体。', 0],
      ['过滤时液面应？', '低于滤纸边缘', '高于滤纸边缘', '与漏斗外沿齐平', '完全淹没漏斗柄', '液面高于滤纸边缘可能使液体绕过滤纸而导致滤液不纯。', 1],
      ['蒸发结晶时，看到较多晶体析出后通常应？', '停止加热并利用余热蒸干或继续结晶', '立即加入大量冷水', '将蒸发皿密封加压', '徒手拿起热蒸发皿', '接近蒸干时停止加热可利用余热并降低液体飞溅风险。', 0],
      ['过滤得到的滤液仍有可溶性杂质，原因是？', '过滤不能除去溶解在水中的物质', '滤纸可以把所有离子都挡住', '氯化钠不溶于水', '过滤改变了元素种类', '过滤针对不溶物，溶解的离子仍会通过滤纸。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-sea-salt', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第九单元 溶液', section: '跨学科实践活动8 海洋资源的综合利用与制盐', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下跨学科实践目录定位海洋资源与制盐；联系蒸发、结晶、资源利用和生态保护。',
    points: [['海水制盐', '蒸发水分可使溶液浓缩，达到条件后氯化钠晶体析出。'], ['资源综合利用', '海洋资源开发需兼顾利用效率、环境影响和生态保护。']],
    questions: [
      ['海水晒盐过程中，促使食盐晶体析出的主要过程是？', '水分蒸发使溶液浓缩至结晶', '氯化钠转变成氧气', '海水冷却后所有物质都消失', '过滤把溶解的氯化钠直接截留', '水分蒸发使氯化钠溶液逐渐浓缩并析晶。', 0],
      ['海水中除氯化钠外还含有多种资源，综合利用时应？', '评估资源价值、处理成本和生态影响', '只取一种资源而把剩余物直接排放', '假设海洋资源无限且无需保护', '忽略沿海生态和居民需求', '综合利用需要兼顾资源、环境和社会条件。', 1],
      ['在相同温度下比较两种溶液是否饱和，关键是？', '判断溶液能否继续溶解该溶质', '只比较溶液颜色', '只看容器大小', '比较溶质名称的长短', '饱和状态是在一定温度下不能继续溶解该溶质。', 0],
      ['制盐调查报告引用海水盐度数据时，较规范的做法是？', '注明数据地点、时间、单位和来源', '只写数字不说明测量区域', '将不同季节数据当作相同条件', '用估计值冒充现场测量', '数据需有时间、地点、单位和来源才能复核。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit9-review', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第九单元 溶液', section: '单元综合与测试', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第九单元目录定位单元综合；融合溶解度、质量分数、配液和分离方法。',
    points: [['溶液定量', '使用溶液质量、溶质质量和质量分数建立数量关系。'], ['分离方法', '过滤、蒸发等方法依据混合物中各成分性质选择。']],
    questions: [
      ['将20克食盐溶于80克水中，所得溶液中溶质质量分数为？', '20%', '25%', '80%', '4%', '溶液总质量100克，质量分数为20÷100×100%=20%。', 0],
      ['把一定量水加入氯化钠溶液后，溶质质量分数通常？', '减小', '增大', '保持不变且与加水量无关', '变成100%', '溶质质量不变而溶液总质量增加，质量分数减小。', 1],
      ['从食盐水中得到食盐晶体，可采用？', '蒸发水分使溶液浓缩并结晶', '过滤掉溶解的氯化钠', '用磁铁吸出氯化钠', '通入氧气分解氯化钠', '蒸发水分可使溶解的食盐结晶析出。', 0],
      ['配制溶液计算质量分数时，分母应是？', '溶液总质量', '溶剂质量', '烧杯质量', '溶质体积', '质量分数以溶液总质量为分母。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit10-consolidation', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十单元 常见的酸、碱、盐', section: '整理与提升', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第十单元目录定位整理提升；综合酸碱性质、中和反应及盐类应用。',
    points: [['酸碱性质', '酸、碱具有不同的组成和性质，可用指示剂等方法检验酸碱性。'], ['中和反应', '酸与碱反应生成盐和水，需依据现象或指标判断反应过程。']],
    questions: [
      ['紫色石蕊试液遇酸性溶液通常变为？', '红色', '蓝色', '无色且不能判断', '绿色', '紫色石蕊在酸性溶液中变红。', 0],
      ['酸和碱发生中和反应，常见生成物是？', '盐和水', '氧气和氢气', '金属和氧气', '只有二氧化碳', '中和反应是酸与碱反应生成盐和水。', 1],
      ['用pH试纸测定溶液酸碱性时，规范做法是？', '用洁净玻璃棒取样滴到试纸上并与标准比色卡比较', '将试纸直接伸入原试剂瓶', '用手指蘸取后尝味', '把试纸浸泡在所有待测液中重复使用', '规范取样可避免污染试剂并提高测量可信度。', 0],
      ['判断中和反应是否恰好完成，较可靠的方式是？', '根据指示剂变化或测定溶液pH并结合操作记录', '只看混合液体积变大', '观察容器是否透明', '闻气味判断酸碱是否完全反应', '需使用适当指示或测量方法，不能凭外观或气味判断。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-acid-base-lab', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十单元 常见的酸、碱、盐', section: '实验活动8 常见酸、碱的化学性质', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下实验活动目录定位酸碱性质实验；突出少量取用、指示剂判断和个人防护。',
    points: [['酸碱检验', '指示剂颜色变化可用于判断溶液酸碱性。'], ['实验安全', '酸、碱具有腐蚀性，需佩戴防护用品并避免接触皮肤和眼睛。']],
    questions: [
      ['探究稀盐酸和氢氧化钠溶液的性质，最适合使用的辅助判断物之一是？', '酸碱指示剂', '食盐晶体颜色', '磁铁', '温度计的品牌', '指示剂可帮助观察溶液酸碱性变化。', 0],
      ['实验时酸液不慎溅到皮肤，首先应？', '立即用大量流动清水冲洗并报告教师', '用手擦干后继续实验', '用碱液随意中和皮肤', '用纸覆盖不处理', '皮肤接触化学品应及时用大量清水冲洗并寻求指导。', 1],
      ['用玻璃棒蘸取待测液检测时，应？', '每种溶液使用洁净工具，避免交叉污染', '用同一根未清洗玻璃棒反复取不同试剂', '将玻璃棒插回原试剂瓶', '用手搅拌待测液', '分开取样并清洁工具可防止试剂交叉污染。', 0],
      ['比较酸和碱与指示剂的颜色变化，应？', '使用相同指示剂和相近操作条件，记录颜色', '每组使用不同浓度且不作说明', '只写预期颜色不观察', '用嘴尝试待测溶液', '统一指示剂和操作条件可使结果便于比较。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-soil-ph', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十单元 常见的酸、碱、盐', section: '跨学科实践活动9 探究土壤酸碱性对植物生长的影响', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下跨学科实践目录定位土壤酸碱性探究；通过对照、重复和安全取样研究植物生长。',
    points: [['土壤酸碱性', '土壤pH是影响植物生长的环境因素之一，适宜范围因植物而异。'], ['变量控制', '实验应控制种子、光照、水分等因素并设置重复和对照。']],
    questions: [
      ['研究土壤酸碱性对植物生长的影响，较合理的设计是？', '使用相同植物和环境，只改变土壤pH条件并设置对照', '每组更换不同植物、光照和浇水量', '只观察一株且不记录', '同时改变pH、温度和种子种类', '控制其他条件并只改变研究因素，才能分析pH影响。', 0],
      ['不同植物对土壤pH的适宜范围可能不同，因此结论应？', '说明所研究植物和实验条件，不随意推广到所有植物', '认定所有植物最适pH完全相同', '不记录所用植物种类', '把一次结果当作普遍规律', '结论适用范围需与植物种类和实验条件相符。', 1],
      ['比较幼苗生长情况时，较适合记录的指标是？', '固定时间测量株高、叶片数等指标', '只记录实验者喜好', '每天使用不同量尺且不校准', '只拍照片不标日期', '可量化并定时记录的指标便于比较。', 0],
      ['取土样和使用pH试剂时，应？', '戴好防护并遵守教师指导，避免接触或食用样品', '用手直接尝土壤判断酸碱', '在无指导下混合所有试剂', '将剩余样品带入口袋接触食物', '土壤和试剂需按实验安全要求处理，不能尝食。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit10-review', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十单元 常见的酸、碱、盐', section: '单元综合与测试', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第十单元目录定位单元综合；整合酸碱指示、pH、中和及盐类应用。',
    points: [['酸碱盐转化', '酸、碱、盐之间可发生多种反应，需依据反应条件和证据判断。'], ['生产生活应用', '酸碱性调节需结合对象、用量和安全规范。']],
    questions: [
      ['某溶液pH小于7，通常说明该溶液呈？', '酸性', '碱性', '中性', '一定是盐溶液', '常温下pH小于7通常表示酸性。', 0],
      ['酸性土壤需要改良时，应先？', '检测土壤pH并依据规范选择适量改良措施', '直接大量加入任意化学品', '仅凭土壤颜色决定', '向土壤倒入浓酸', '改良前需检测并按规范控制材料和用量。', 1],
      ['酸与活泼金属反应时，可能生成？', '盐和氢气', '盐和氧气', '水和氮气', '只有碳酸钙', '活泼金属与酸反应通常生成盐和氢气。', 0],
      ['实验得到pH约为7的溶液，正确解释是？', '在常温测量条件下接近中性，但仍需结合测量精度', '必定不含任何溶质', '一定是纯水', '说明pH试纸可以测出所有物质', 'pH接近7表示近中性，测量精度和其他溶质仍需考虑。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit11-consolidation', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十一单元 化学与社会', section: '整理与提升', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第十一单元目录定位整理提升；综合化学与健康、材料、能源及社会生活。',
    points: [['化学与健康', '合理营养和正确使用化学产品有助于健康，需以可靠信息为依据。'], ['化学与社会', '材料和能源选择需兼顾性能、资源、安全和环境影响。']],
    questions: [
      ['阅读食品包装上的营养标签，较正确的做法是？', '结合营养成分和建议摄入量作合理选择', '认为添加“化学”二字的食品都不能食用', '只看包装颜色判断营养', '忽略成分表和保质信息', '营养标签提供成分信息，应结合实际需求和规范理解。', 0],
      ['选用新材料时，除性能外还应考虑？', '安全性、资源消耗、回收方式和环境影响', '只考虑外观是否新颖', '只看名称是否含有“高科技”', '忽略生产和使用条件', '材料选择需要综合性能、安全、资源和环境。', 1],
      ['关于“天然”与“安全”的关系，正确认识是？', '安全性要依据成分、剂量和使用方式评估', '天然物质一定无毒', '合成物质一定有害', '是否安全只看包装上的宣传', '天然或合成不能单独决定安全，需根据实际证据评价。', 0],
      ['调查化学产品对社会生活的影响时，较好的资料来源是？', '产品说明、可靠检测资料和规范来源', '无署名的广告转发', '未经核实的个人传言', '只看产品名称', '可靠资料和检测证据有助于客观评估产品影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-aerospace-material-energy', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十一单元 化学与社会', section: '跨学科实践活动10 调查我国航天科技领域中新型材料、新型能源的应用', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下跨学科实践目录定位航天材料与能源调查；考查材料性能、能量需求和信息核验。',
    points: [['材料性能', '航天材料需结合强度、质量、耐热和环境适应等需求选择。'], ['能源技术', '能源技术评价应说明能量密度、可靠性和安全条件。']],
    questions: [
      ['调查航天器材料的用途，合理的比较维度包括？', '质量、强度、耐热性和任务环境', '只比较材料颜色', '只看材料名称长度', '只用室温下的硬度推断全部性能', '材料需要满足任务中的多种性能要求。', 0],
      ['一种材料在高温环境下性能稳定，并不自动说明它？', '在所有环境和用途下都最合适', '可能适用于某些高温部件', '需要进一步测试耐热性', '还要考虑质量和强度', '材料选择需匹配具体环境和综合性能。', 1],
      ['调查某项航天能源技术时，较可靠的信息来源是？', '科技机构或正式技术资料，并核对发布时间和应用背景', '无来源短视频', '只依据产品广告口号', '把实验室概念当成已部署技术', '技术信息需核验来源、时间及成熟度。', 0],
      ['介绍新型能源的应用时，应区分？', '实验研究、工程验证和实际应用阶段', '能源名称的中英文写法', '设备颜色和展示灯光', '任何能量都不需要储存或管理', '准确说明技术阶段可避免把研究进展夸大为成熟应用。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-unit11-review', grade: '初三', subject: '化学', volume: '下册',
    chapter: '第十一单元 化学与社会', section: '单元综合与测试', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下第十一单元目录定位单元综合；综合物质性质、健康、材料、能源与证据判断。',
    points: [['化学与生活', '将化学知识用于生活决策时需考虑物质性质、使用剂量和安全要求。'], ['综合评价', '技术选择要权衡性能、资源、成本和环境影响。']],
    questions: [
      ['判断一种化学产品的安全使用方法，应优先查看？', '产品标签、规范说明和可靠安全资料', '只看网络评论数量', '只凭气味判断成分', '不看使用剂量', '标签和规范说明提供用途、剂量及风险信息。', 0],
      ['两种能源方案性能相近，选择时还应？', '比较资源来源、可靠性、成本和环境影响', '只选宣传最响亮的方案', '忽略安全性', '把估算数据当作实测', '能源决策应综合考虑多方面因素。', 1],
      ['“某材料很轻”能否单独证明适合航天器？', '不能，还要考察强度、耐热和任务环境等要求', '能，轻材料一定满足全部需要', '不能，因为质量与用途无关', '能，只要颜色合适', '应用需要综合性能匹配，而非依靠单项特点。', 0],
      ['化学社会议题出现相互矛盾的网络说法，较好的处理是？', '比较来源、证据和适用条件后再作判断', '转发最吸引眼球的说法', '只选符合已有看法的信息', '把所有说法平均后当结论', '证据来源和适用条件决定信息的可信度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-whole-book', grade: '初三', subject: '化学', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下目录定位本册综合；整合金属、溶液、酸碱盐与化学社会应用。',
    points: [['知识联系', '物质的性质决定其反应和用途，定量关系与实验条件共同支持判断。'], ['科学决策', '化学应用要兼顾证据、安全、资源和环境影响。']],
    questions: [
      ['选择一种金属制作户外支架，应综合考虑？', '强度、耐腐蚀性、质量、成本和回收方式', '只看金属的颜色', '只看熔点而不考虑环境', '只看材料名称', '户外材料需要满足力学、环境和经济等多种要求。', 0],
      ['配制一定质量分数溶液时，若实际加入水过多，溶质质量分数会？', '偏小', '偏大', '保持不变', '变成零且无溶质', '水多使溶液总质量增大而溶质不变，质量分数减小。', 1],
      ['酸碱实验出现异常现象时，较科学的做法是？', '检查药品标签、用量和操作条件，再重复验证', '尝试闻气味识别所有试剂', '把现象改成预期结果', '混合更多未知化学品', '核对试剂和条件并安全重复实验有助于查明原因。', 0],
      ['评价化学技术是否适合社会应用，应？', '同时考察实际性能、安全、资源成本和环境影响', '只关注实验室单次成功', '忽略废物和使用风险', '用广告替代证据', '技术应用需要综合证据和多项社会影响评价。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-solubility-table', grade: '初三', subject: '化学', volume: '下册',
    chapter: '附录Ⅰ 部分酸、碱和盐的溶解性表（室温）', section: '附录Ⅰ 部分酸、碱和盐的溶解性表（室温）', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下附录原文定位室温溶解性表；训练查表、识别沉淀和注明温度条件。',
    points: [['溶解性表查阅', '按阳离子和阴离子交叉查找化合物的溶解性。'], ['条件与应用', '溶解性表有适用温度和物质范围，沉淀判断需结合反应条件。']],
    questions: [
      ['使用溶解性表判断某盐是否易溶，通常要找到？', '阳离子所在行与阴离子所在列的交叉项', '表格标题的字体颜色', '物质名称的第一个字', '任意一个相邻格子', '溶解性表按阴、阳离子组合交叉查阅。', 0],
      ['溶解性表标题注明“室温”，意味着？', '查表结论对应表注明的温度条件', '温度永远不会影响任何物质溶解度', '表中所有物质必须加热', '表中数据能代表所有温度', '表格结论需结合其温度条件使用。', 1],
      ['判断复分解反应是否可能生成沉淀时，溶解性表可帮助？', '判断生成物中是否有难溶物', '确定所有反应的速率', '测出溶液准确pH', '直接得到反应热', '若生成物含难溶物，可能形成沉淀推动反应。', 0],
      ['某离子组合在附录表中未列出时，最妥当的做法是？', '查阅可靠资料或实验依据，不随意外推', '将空白格一律视为易溶', '将空白格一律视为沉淀', '根据字体大小判断', '附录覆盖范围有限，未列出时应另查资料核实。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chemistry-9b-glossary', grade: '初三', subject: '化学', volume: '下册',
    chapter: '附录Ⅱ 名词索引', section: '附录Ⅱ 名词索引', directoryUrl: chemistry9b,
    evidence: '按人教版（2024）九下附录原文定位名词索引；训练按术语查找定义、辨析概念并回到正文语境。',
    points: [['术语查找', '名词索引按术语帮助定位相关知识内容和页码。'], ['概念使用', '术语定义应结合教材上下文和实验条件理解。']],
    questions: [
      ['使用名词索引查找“溶质质量分数”，最直接的用途是？', '定位术语在教材中的相关解释或页码', '自动替代所有计算过程', '证明某溶液一定饱和', '查找人物出生年月', '名词索引帮助读者快速定位概念说明。', 0],
      ['查到某术语的页码后，理解概念的较好方式是？', '阅读定义、例子和相关实验上下文', '只看术语拼音', '只记页码不读解释', '把其他学科的同名词义直接套用', '概念需要联系教材中的定义和使用情境理解。', 1],
      ['若索引中出现两个近似术语，读者应？', '分别核对定义和适用条件，比较区别', '认为它们一定完全同义', '只选字数较短的术语', '忽略正文中的使用方式', '相近术语可能条件不同，应回到定义和正文辨析。', 0],
      ['在化学报告中使用专业术语，较准确的做法是？', '按教材定义使用并让术语与实验事实相符', '用术语替代全部证据', '把术语当作结论的证明', '不区分物质名称和实验现象', '术语应准确描述事实，但不能代替数据和论证。', 1],
    ],
  },
]

const chinese9aLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-poetry-recitation', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第一单元（活动·探究·诗歌）', section: '任务二 诗歌朗诵', directoryUrl: chinese9a,
    evidence: '按统编版2026秋九上目录原文定位诗歌朗诵任务；题目考查节奏、重音、情感依据和排练反馈。',
    points: [['朗诵表达', '朗诵通过停连、重音、语速和语气呈现诗歌情感。'], ['文本依据', '朗诵设计应依据诗歌意象、语义和情感变化，不宜任意夸张。']],
    questions: [
      ['朗诵一首情感由平静转为激昂的诗歌，较合适的处理是？', '依据诗意逐步调整语速、重音和音量', '从头到尾使用同一音量', '每句都大声喊读', '不看诗意只追求速度', '朗诵要随情感变化调整表达，而非一味提高音量。', 0],
      ['诗句中的停顿设计首先应依据？', '语义关系和诗歌节奏', '每行字数必须相等', '朗诵者的呼吸随意决定', '标点符号以外绝不允许停顿', '停连要兼顾语义、节奏与表达需要。', 1],
      ['小组互评朗诵时，最有帮助的反馈是？', '指出具体一处停顿或重音及其表达效果', '只说“很好”或“不好”', '评价朗诵者外貌', '建议所有诗都用同一种语气', '具体、可执行的反馈便于有针对性地改进。', 0],
      ['排练时发现某处重音让诗意变得生硬，较好的做法是？', '回到上下文检查语意，再调整重音和语气', '坚持原处理不再讨论', '删去这一句', '提高音量掩盖问题', '朗诵应服务诗意，需结合上下文反复调整。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-create-poetry', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第一单元（活动·探究·诗歌）', section: '任务三 尝试创作', directoryUrl: chinese9a,
    evidence: '按统编版2026秋九上目录原文定位诗歌创作任务；原创设问关注意象、节奏、凝练表达和修改。',
    points: [['诗歌构思', '诗歌可借助具体意象、节奏和凝练语言表达感受。'], ['修改完善', '创作后应检查意象关联、用词准确和表达是否含混。']],
    questions: [
      ['写一首表现雨后校园的短诗，哪种写法更能形成具体意象？', '描写湿润树叶、积水倒影等可感细节', '只反复写“我很开心”', '堆叠与校园无关的抽象词', '把不同时间的景物混在一起且不说明', '具体可感的细节更容易构成鲜明意象。', 0],
      ['修改诗歌时发现两个意象彼此无关，较合适的做法是？', '删改或补充过渡，使意象共同服务主题', '再增加更多无关意象', '删除题目并不作调整', '把所有词语改成同一长度', '意象应围绕主题形成联系，修改可增强整体性。', 1],
      ['诗歌语言追求凝练，通常意味着？', '用较少而准确的语言表达丰富内容', '尽可能省略所有信息', '只使用生僻词', '每行都必须押同一个韵', '凝练不等于空缺，要做到简洁且有表现力。', 0],
      ['同伴提出某处用词不准确，作者较好的处理方式是？', '比较词语含义和上下文效果后决定是否修改', '认为所有建议都必须照搬', '拒绝阅读自己的作品', '只改标点而不核对词义', '修改应依据表达效果和语境，而非机械接受或拒绝建议。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-clear-viewpoint', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读·议论文）', section: '写作：观点要明确', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位议论文写作任务；围绕中心论点明确、分论点一致和表达范围设计题目。',
    points: [['中心论点', '中心论点应明确回应题目并贯穿全文。'], ['分论点', '分论点应从不同角度支撑中心论点，彼此有逻辑联系。']],
    questions: [
      ['题目要求讨论“中学生是否应坚持课外阅读”，哪句话最像明确论点？', '中学生坚持适量课外阅读，有助于拓展视野并提升理解能力', '阅读是一个常见活动', '每个人都有不同的书', '今天的天气适合读书', '明确论点应直接回应争议问题并表达可论证的判断。', 0],
      ['一篇文章的中心论点是“学校应增加科学实践机会”，哪项最能作为分论点？', '实践活动能让学生运用知识解决真实问题', '学校有许多教学楼', '有些学生喜欢体育比赛', '科学史中出现过很多人物', '分论点应直接支撑中心论点，说明实践机会的价值。', 1],
      ['发现文章各段分别讨论阅读、食堂和校服，却没有共同观点，应？', '重新确定中心论点并删改偏离主题的内容', '保留全部段落并增加更长结尾', '只改文章标题', '把三个话题都写成中心论点而不说明关系', '材料需要围绕同一中心组织。', 0],
      ['论点写成“所有人都必须喜欢同一本书”，主要问题是？', '判断过于绝对，范围和依据不合理', '表达太明确', '缺少修辞手法', '使用了书籍这个名词', '论点应有合理范围，避免无法证明的绝对化表述。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-self-improvement-activity', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第二单元（阅读·议论文）', section: '专题学习活动：君子自强不息', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位专题学习活动；以典籍、人物事例和现实行动讨论自强不息。',
    points: [['主题探究', '阐释自强不息应结合具体人物、行动和时代背景。'], ['资料表达', '专题成果需标明资料来源，并区分事实、评价和个人观点。']],
    questions: [
      ['小组探究“自强不息”，哪种材料组合更能支持结论？', '典籍语句、人物事例和当代实践相互参照', '只列出名人姓名', '只写自己的感受不举例', '复制无来源的网络段落', '不同类型材料可以共同说明主题，并呈现其时代差异。', 0],
      ['分析一位人物克服困难的经历时，应？', '交代具体困难、采取的行动及其影响', '把成功归因于单一口号', '忽略人物所处时代和条件', '只写结果不说明过程', '具体背景和行动过程能使分析更有依据。', 1],
      ['专题展示引用网络资料，至少应做到？', '标明来源并核对内容准确性', '删除作者和链接', '把转发次数当作真实性', '将评价写成史实', '标明并核实资料来源有助于读者复查。', 0],
      ['“自强”与“接受帮助”的关系，合理理解是？', '自强不等于拒绝合作，主动学习和求助也可成为行动的一部分', '接受帮助就一定不自强', '自强意味着不需要他人', '只有一次成功才算自强', '自强强调主动努力，并不排斥合理合作与学习。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-evidence-in-argument', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古代散文）', section: '写作：议论要言之有据', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位议论写作任务；重点训练材料真实性、关联性和分析过程。',
    points: [['论据选择', '论据应真实、具体并与中心论点相关。'], ['分析论据', '写作需说明事实如何支持观点，而非只堆叠材料。']],
    questions: [
      ['论点是“稳定阅读习惯有助于提升理解能力”，哪项最适合作为论据？', '记录一个班级持续阅读实践及阅读理解变化的数据', '某位名人最喜欢的运动', '一段没有来源的网络留言', '一张与阅读无关的风景照片', '论据需与阅读和理解能力有关，并具有可核验依据。', 0],
      ['列举完事例后，议论文还应？', '分析事例中的关键事实如何支持论点', '立即换到一个无关话题', '只重复事例中的人物姓名', '省略观点和论据之间的联系', '论证需解释论据与论点之间的逻辑关系。', 1],
      ['使用调查数据作论据时，较规范的做法是？', '交代调查对象、时间、样本和来源', '只摘取最有利的一个数字', '不说明单位和统计范围', '把小样本结果说成所有人的结论', '数据需要口径和来源，避免超范围推断。', 0],
      ['“大家都这么说，所以这个观点一定正确”主要缺少？', '可靠证据和有效推理', '感叹号', '文章标题', '排比句', '多数人意见本身不能代替事实证据和逻辑论证。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-extracurricular-poetry-1', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第三单元（阅读·古代散文）', section: '课外古诗词诵读（一）：月夜忆舍弟；长沙过贾谊宅；左迁至蓝关示侄孙湘；商山早行', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位四首课外古诗词；以作者、题材、意象和情感辨析原创设题，不摘录诗句。',
    points: [['诗歌比较阅读', '结合题目、意象和写作背景比较不同诗歌的情感。'], ['作者与作品', '辨析杜甫、刘长卿、韩愈、温庭筠的作品及表达侧重。']],
    questions: [
      ['《月夜忆舍弟》表达思念亲人的情感，作者是？', '杜甫', '刘长卿', '韩愈', '温庭筠', '《月夜忆舍弟》为杜甫作品，表达战乱背景下的思亲之情。', 0],
      ['《长沙过贾谊宅》借凭吊古人寄寓感慨，作者是？', '刘长卿', '杜甫', '温庭筠', '韩愈', '《长沙过贾谊宅》是刘长卿的作品。', 1],
      ['《左迁至蓝关示侄孙湘》与作者遭贬谪的经历相关，作者是？', '韩愈', '杜甫', '刘长卿', '温庭筠', '韩愈被贬潮州途中创作此诗，题目点明行程和赠答对象。', 0],
      ['《商山早行》通过旅途晨景表现羁旅感受，作者是？', '温庭筠', '韩愈', '刘长卿', '杜甫', '《商山早行》为温庭筠作品，描写早行所见并寄寓羁旅情思。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-short-fiction', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读·小说）', section: '写作：学写小小说', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位小小说写作任务；围绕有限篇幅、情节转折、人物细节和结尾效果设题。',
    points: [['小小说构思', '小小说篇幅有限，宜围绕核心事件组织人物、冲突和细节。'], ['情节表达', '关键转折应有铺垫，结尾应与前文照应并留有回味。']],
    questions: [
      ['写一篇篇幅很短的校园小说，最适合先确定？', '一个核心冲突和能够推动情节的关键选择', '所有人物的完整成长史', '与主题无关的场景数量', '每段必须介绍一个新人物', '小小说需集中笔墨围绕核心事件展开。', 0],
      ['小说结尾出现意外转折，怎样才不显得突兀？', '在前文埋下可回看的细节或线索', '完全不交代人物和情境', '删去所有铺垫', '结尾改写成另一个故事', '合理转折需要前文线索支撑。', 1],
      ['有限篇幅中塑造人物，较有效的方法是？', '选择能表现性格的动作、语言或细节', '罗列人物全部外貌特征', '反复说明人物“很好”', '添加无关背景知识', '具有代表性的细节比泛泛介绍更有表现力。', 0],
      ['修改小小说时发现情节支线没有服务核心冲突，应？', '删减或改写支线，使情节更集中', '继续增加支线人物', '在结尾解释所有无关细节', '取消核心事件', '集中叙事有助于突出主要冲突和主题。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-jane-eyre-reading', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第四单元（阅读·小说）', section: '整本书阅读：《简·爱》——怎样读外国小说', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位《简·爱》整本书阅读；以第一人称叙述、人物成长和外国小说阅读策略设题。',
    points: [['整本书阅读', '阅读长篇小说要关注人物发展、情节结构、叙述视角和时代背景。'], ['人物理解', '简·爱的人物形象可从自尊、独立、情感选择和成长经历分析。']],
    questions: [
      ['阅读《简·爱》时，第一人称叙述视角的作用之一是？', '让读者通过叙述者经历和感受接近人物内心', '使小说不再需要其他人物', '保证叙述者说的每件事都是全知视角事实', '让情节只发生在一个地点', '第一人称便于呈现叙述者的所见所感，但视角仍有限。', 0],
      ['分析简·爱的人物形象，较有依据的做法是？', '联系她在关键关系和选择中的语言、行动及变化', '只依据书名猜测性格', '只看某一个次要人物的评价', '忽略人物成长过程', '人物形象需要结合多个情节中的言行和变化。', 1],
      ['阅读外国小说时，遇到不熟悉的社会背景，适合？', '查阅可靠背景资料并联系文本理解，不用背景替代文本', '完全不读文本只看介绍', '用今天的生活经验直接否定作品', '把所有文化差异都当成错误', '背景资料辅助理解，但人物和主题仍需回到文本。', 0],
      ['整本书阅读笔记更有价值的写法是？', '记录关键情节、人物变化及自己的文本依据', '抄写每页所有句子', '只写“好看”或“不好看”', '按照影视改编补写原著情节', '有证据的阅读记录便于回顾人物和主题。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-reasoned-argument', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第五单元（阅读·议论文）', section: '写作：论证要合理', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位论证写作任务；考查论点论据关联、推理完整和反方意见回应。',
    points: [['论证逻辑', '论证需使论点、论据和推理过程相互匹配。'], ['回应异议', '合理回应不同意见能说明观点的条件和适用范围。']],
    questions: [
      ['论点是“校内应设置安静阅读区”，哪项论据最相关？', '调查显示有不少学生需要安静空间完成阅读和自主学习', '学校操场的面积较大', '很多人喜欢热闹的音乐', '某位同学最爱红色书包', '相关论据应直接说明设立阅读区的需求。', 0],
      ['文章只列出三则事例，却没有解释它们与观点的关系，主要问题是？', '论证过程不完整，论据和论点之间缺少分析', '论据数量一定太少', '文章使用了事实材料', '观点位置不在标题中', '列举事例后仍需分析其如何支持论点。', 1],
      ['回应“阅读区可能影响教室使用”的意见，较合理的做法是？', '承认空间限制并提出分时或分区等可行方案', '说提出异议的人都不爱学习', '忽略空间条件不作回答', '改变讨论主题', '回应异议应正视条件并提出有针对性的办法。', 0],
      ['由“我认识的一位同学喜欢阅读”推出“所有学生都喜欢阅读”，问题在于？', '个别事例不足以支持关于所有学生的普遍结论', '使用了人物事例', '观点表达太清楚', '缺少排比句', '普遍判断需要具有代表性的证据。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-digital-age-project', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第五单元（阅读·议论文）', section: '专题学习活动：我们的数字时代', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位数字时代专题活动；聚焦信息核验、数据解释、隐私和有依据的表达。',
    points: [['数字阅读', '网络信息需核查来源、时间、证据和上下文。'], ['信息伦理', '收集和展示数据应保护隐私并说明统计范围。']],
    questions: [
      ['小组制作“数字设备使用情况”报告，调查前应？', '明确问题、调查对象、匿名方式和数据使用范围', '收集同学账号密码', '不说明用途就公开个体记录', '只问几名朋友后代表全年级', '调查应明确范围并保护个人信息。', 0],
      ['网上两篇文章对同一新闻说法不同，较好的处理是？', '追查原始来源、发布时间和其他可靠报道', '只转发标题更夸张的一篇', '把两种说法拼在一起', '根据评论数量判断事实', '核对来源和背景有助于辨别网络信息。', 1],
      ['用图表呈现调查结果时，应？', '标明样本数量、统计口径和数据来源', '省略坐标单位和样本范围', '只展示支持结论的数据', '把估计数据标成精确普查结果', '清楚标注范围和方法能防止误读。', 0],
      ['展示同学的网络发言作为案例前，应？', '征得同意并删除可识别个人身份的信息', '直接公开姓名和头像', '截去上下文改变原意', '在没有授权时公开私信', '信息活动需尊重隐私和表达者权益。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-deep-thinking', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·史传古文+诗词曲）', section: '写作：学会深入思考', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位深入思考写作任务；训练追问原因、辨析条件、多角度分析和证据支持。',
    points: [['深入思考', '从现象追问原因、条件和影响，避免停留在简单判断。'], ['多角度分析', '结合不同立场和证据，说明观点的适用范围。']],
    questions: [
      ['写作讨论“手机是否影响学习”，要深入分析应？', '区分使用目的、时长、内容和学习情境', '仅凭一个同学的经历下结论', '直接认定手机只有好处或只有坏处', '不核实任何事实', '影响可能受用途和情境影响，应分条件分析。', 0],
      ['从“校门口拥堵”继续深入思考，最适合追问？', '拥堵与到校时间、道路设计和接送方式有哪些关系', '校门的颜色是否醒目', '哪个同学最早到校', '把拥堵形容得更夸张', '追问成因和条件有助于从现象进入分析。', 1],
      ['为了检验自己最初的观点，作者可以？', '主动寻找不同证据并检查原有假设', '只保留赞同观点的例子', '拒绝阅读反方材料', '把意见不同的人描述为不理性', '检验假设需要考虑支持和不支持观点的证据。', 0],
      ['一段分析反复使用“所以”却缺少因果证据，说明？', '连接词不能代替完整推理和证据', '只要连接词多论证就充分', '结论必须放在每句话开头', '证据与观点没有关系', '论证是否合理取决于证据和逻辑，不是连接词数量。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-tang-poetry-reading', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·史传古文+诗词曲）', section: '整本书阅读：《唐诗三百首》', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位《唐诗三百首》整本书阅读；关注选篇、体裁、主题比较和阅读札记。',
    points: [['诗歌选集阅读', '阅读选集可比较诗人、题材、意象和体裁特征。'], ['阅读记录', '摘录、赏析和个人感受应区分并记录作品出处。']],
    questions: [
      ['阅读《唐诗三百首》时，比较不同作品较适合关注？', '意象、题材、语言和情感表达的异同', '只比较诗题字数', '只统计诗人姓氏', '把不同朝代作品混为一谈', '多维比较有助于理解诗歌风格和主题。', 0],
      ['整理诗歌阅读札记时，引用作品应？', '注明篇名和作者，并把原文摘录与个人赏析区分开', '不写作者和篇名', '把自己的解释放进引号当作原句', '只保留网上流传的无出处版本', '明确出处并区分引文和赏析，便于核对。', 1],
      ['比较两首同题材诗歌，发现情感不同，说明？', '同一题材也会因背景、意象和表达方式不同呈现差异', '题材相同就必须表达完全相同的感情', '诗歌不能表达情感', '其中一首一定不属于唐诗', '题材只是阅读线索，具体情感需依据作品分析。', 0],
      ['逐步建立自己的诗歌阅读线索，较好的做法是？', '按主题或体裁整理作品并记录比较发现', '随机抄录句子而不留出处', '只背作者列表', '只看选集封面', '有结构地整理能支持长期比较与回顾。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9a-extracurricular-poetry-2', grade: '初三', subject: '语文', volume: '上册',
    chapter: '第六单元（阅读·史传古文+诗词曲）', section: '课外古诗词诵读（二）：咸阳城东楼；无题（相见时难别亦难）；浣溪沙（漠漠轻寒上小楼）；丑奴儿·书博山道中壁', directoryUrl: chinese9a,
    evidence: '按统编版九上目录原文定位四首课外古诗词；围绕作者、意象和情感对照设计原创题。',
    points: [['作品辨析', '作品题目、作者和体裁可作为理解的基本线索。'], ['情感分析', '从环境、人物处境和语言特点推断诗词情感。']],
    questions: [
      ['《咸阳城东楼》的作者是？', '许浑', '李商隐', '秦观', '辛弃疾', '《咸阳城东楼》为唐代诗人许浑作品。', 0],
      ['《无题》（相见时难别亦难）的作者是？', '李商隐', '许浑', '辛弃疾', '秦观', '该首《无题》为李商隐作品。', 1],
      ['《浣溪沙》（漠漠轻寒上小楼）的作者是？', '秦观', '辛弃疾', '许浑', '李商隐', '该首《浣溪沙》为秦观作品。', 0],
      ['《丑奴儿·书博山道中壁》通过今昔感受变化表达复杂心境，作者是？', '辛弃疾', '秦观', '李商隐', '许浑', '《丑奴儿·书博山道中壁》为辛弃疾词作。', 1],
    ],
  },
]

const chinese9bLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-moon-night', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读 / 3* 短诗五首', section: '月夜 / 沈尹默', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位《月夜》；原创赏析题关注月色、并立意象与克制含蓄的情感。',
    points: [['意象与情感', '短诗借月色、树影和人物关系形成宁静而含蓄的氛围。'], ['细节解读', '结合意象关系理解诗中人物的孤独感和自我坚守。']],
    questions: [
      ['赏析《月夜》中的树与人的并置，较有依据的理解是？', '借相邻而不相倚的形象表现克制、孤独的情绪', '说明人物正在园林中进行植物分类', '证明诗歌写的是热闹的集体活动', '表明树木是作品唯一的叙述者', '并置关系服务于诗歌含蓄、疏离的情感表达。', 0],
      ['诗中清冷月色对整体氛围的作用更接近？', '营造静谧、略带寂寥的环境', '制造喜庆喧闹的气氛', '转为说明天气预报', '突出强烈的战争场面', '月夜环境强化了作品沉静含蓄的情绪。', 1],
      ['分析这首短诗的情感时，较好的方法是？', '联系意象、人物姿态和语气综合判断', '只看题目中的一个字', '把作者生平直接当作诗句含义', '忽略形象之间的关系', '诗歌理解应回到文本意象和表达方式。', 0],
      ['短诗语言简洁，阅读时更应注意？', '意象之间的照应和未明说的情感空间', '只统计诗行的字数', '要求每个意象只有一种固定含义', '补写成散文后忽略原诗', '凝练短诗常通过意象关系形成含蓄表达。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-xiaohong-tomb', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读 / 3* 短诗五首', section: '萧红墓畔口占 / 戴望舒', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位《萧红墓畔口占》；围绕凭吊、红山茶意象和沉静追思设题，不照录诗句。',
    points: [['悼念诗阅读', '凭吊诗常以地点、行动和具体物象寄托对逝者的怀念。'], ['意象含义', '理解意象要联系题目、情境和全诗情感基调。']],
    questions: [
      ['题目中的“墓畔”交代了诗歌的重要情境，作品整体情感更接近？', '沉静克制的追思与悼念', '热烈庆功', '轻松幽默的游玩', '对自然地理的客观说明', '凭吊情境与诗中行动共同形成克制的追思之情。', 0],
      ['诗中红山茶一类具体物象在悼念情境中的作用是？', '把抽象怀念转化为可感的纪念行动', '说明人物正在进行商业交易', '与逝者完全无关的装饰', '证明作品属于说明文', '具体物象承载了纪念和寄托情感的作用。', 1],
      ['理解诗中对友人的怀念，最应联系？', '题目、凭吊地点和诗中呈现的行动', '只依据诗歌行数', '只查作者其他作品的标题', '读者个人对花色的偏好', '文本情境与行动为情感解读提供直接依据。', 0],
      ['这首诗没有铺陈强烈哭诉，仍能表达深切感情，主要依靠？', '简洁的场景和含蓄的物象寄托情思', '大量议论直接说明历史背景', '夸张描写热闹场面', '连续列举人物生平资料', '克制表达与具体意象共同形成含蓄力量。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-duanzhang', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读 / 3* 短诗五首', section: '断章 / 卞之琳', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位卞之琳《断章》；题目原创聚焦观察视角变化、相对关系和画面层次，不复现诗句。',
    points: [['视角转换', '观察者与被观察对象的角色会随视角变化而转换。'], ['关系与意蕴', '诗歌通过看与被看、景物与人物的关系引发多层理解。']],
    questions: [
      ['读《断章》时，关注“看风景的人”与“风景中的人”的位置变化，可以发现？', '观察者和被观察者可能互相转换', '所有人物始终处于同一固定角色', '作品只在描写旅游路线', '诗中人物彼此毫无关系', '视角转换提示人与景物、观察者之间存在相对关系。', 0],
      ['这首诗留下多种解读空间，较合理的阅读态度是？', '以诗中关系和意象为依据，允许有证据的多种阐释', '认为只有作者生平能决定唯一答案', '任意解释而不联系文本', '拒绝分析诗歌结构', '开放阐释仍需文本依据。', 1],
      ['诗歌的画面感主要由什么形成？', '人物、景物和观察视角之间的关系', '连续的科学数据表格', '对历史年代的罗列', '人物外貌的长篇介绍', '关系和视角组织出诗歌中的画面层次。', 0],
      ['说明自己对诗歌的理解时，最有说服力的是？', '指出相关意象或视角变化并解释其含义', '只说“我觉得如此”', '引用与作品无关的故事', '把任何联想都说成作者本意', '阐释应以文本细节为依据并说明推理过程。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-wind-rain', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读 / 3* 短诗五首', section: '风雨吟 / 芦荻', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位芦荻《风雨吟》；围绕风雨意象、行旅者处境和象征意味原创设题。',
    points: [['意象与象征', '风雨等自然意象可表现现实处境，也可寄托人生感受。'], ['主体体验', '分析诗歌应关注说话者面对环境时的姿态和情绪变化。']],
    questions: [
      ['《风雨吟》中风雨景象与行旅者形象相结合，较恰当的理解是？', '自然风雨也映照了人物面对现实压力的感受', '作品只介绍气象观测方法', '风雨完全不影响人物处境', '诗中人物正在描绘晴朗郊游', '自然环境与人物处境相互映照，形成象征意味。', 0],
      ['把自然风雨理解为人生处境的象征，判断依据应来自？', '意象与人物行动、情绪之间的联系', '仅凭标题中有“风雨”二字', '作者的出生地天气', '读者任意添加的情节', '象征性理解需要文本中意象和人物经验相互支撑。', 1],
      ['诗歌中的“我”面对艰难环境仍继续前行，可能表现？', '在压力中保持行动和思考的姿态', '已经完全消除所有困难', '对环境毫无感受', '只是在记录交通路线', '人物姿态能表达面对困境时的精神状态。', 0],
      ['比较这首诗与纯粹天气记录，主要差异是？', '诗歌将景象与主体感受、象征意义结合', '诗歌不能描写自然景物', '天气记录一定包含人物心理', '两者都只能提供气温数字', '诗歌除描景外还通过景物表达情感和思考。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unity-poem', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读 / 3* 短诗五首', section: '统一 / 聂鲁达', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位聂鲁达《统一》；题目围绕自然事物的共同性与关联结构原创编写，不照录译文。',
    points: [['整体与联系', '诗歌可从自然事物的差异和共同联系中表达整体意识。'], ['结构分析', '关注意象之间的并列、递进或照应，有助于把握主旨。']],
    questions: [
      ['阅读《统一》时，留意不同自然事物之间的关联，更有助于理解？', '诗歌借多样事物共同构成整体的思考', '作品只在列举物种名称', '各意象之间没有任何关系', '诗歌说明一种实验操作步骤', '意象间的联系呈现了整体与统一的主题。', 0],
      ['一首诗先呈现多种各异形象，再强调它们的共同联系，结构效果是？', '由差异引向整体认识', '从结论转为完全无关的内容', '取消所有意象', '只提供时间顺序', '结构推动读者从多样事物中发现联系。', 1],
      ['比较不同译本的表达时，读者应？', '关注译文如何传达主要意象和关系，并注明版本', '认为译本措辞完全相同', '把译者的词句都当作原文语言', '忽略翻译对节奏和语义的影响', '译本措辞会不同，应结合版本和核心意象比较。', 0],
      ['概括诗歌主旨时，最好的依据是？', '反复出现或相互照应的意象及其关系', '只看作者国籍', '只统计标点数量', '与文本无关的个人经历', '主旨概括需从全诗意象组织和表达关系中归纳。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-language-expression', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 写作', section: '提高语言的表现力', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录原文定位语言表现力写作任务；训练具体化、句式变化和语境匹配。',
    points: [['语言表现力', '准确的动词、感官细节和恰当句式可以增强表达效果。'], ['修改表达', '修辞应服务内容和语境，不能为华丽而堆砌。']],
    questions: [
      ['把“花开了”改得更有画面感，哪项更有效？', '清晨，窗边的花瓣在微风里缓缓舒展', '花开了，花开了，花开了', '花是植物的一部分', '我觉得花开很花开', '加入时间、动作和感官细节能使画面更具体。', 0],
      ['说明文中使用比喻时，首先应保证？', '比喻贴切且不影响事实准确', '比喻越多越好', '把科学概念改成不准确说法', '每句话必须使用修辞', '修辞服务表达，说明事实仍要准确。', 1],
      ['修改一段重复使用“很好”的文字，可采用？', '根据具体对象改用准确的动作、状态或感受词', '所有“很好”都换成生僻词', '删去全部谓语', '增加更多相同形容词', '针对对象选择具体词语可提升表达准确度。', 0],
      ['一段叙述句式单调，修改时较合适的是？', '在不改变意思的前提下调整长短句和语序', '把每句都改成同样长度', '增加无关感叹号', '故意打乱语序让读者猜', '句式变化应服务节奏和语意。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unit1-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元', section: '单元综合与测试', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第一单元目录定位综合测试；整合现代诗意象、视角、情感和语言表达。',
    points: [['现代诗阅读', '从意象、视角、节奏和情感联系入手理解现代诗。'], ['表达与鉴赏', '鉴赏结论要引用文本特点并清楚说明理由。']],
    questions: [
      ['阅读一首短诗时，哪种做法最能帮助把握含蓄情感？', '联系关键意象、说话者处境和语气变化', '只按字面把诗改写成天气报告', '忽略诗中重复或转折', '先套用固定答案再找词句', '意象与说话者处境共同支持情感判断。', 0],
      ['不同读者对现代诗有不同理解，合理的评价标准是？', '解释是否能得到诗歌细节和结构的支持', '是否与多数人的第一印象完全一样', '是否使用了最多术语', '是否只给出唯一答案', '解读可以多样，但需要文本依据和连贯推理。', 1],
      ['修改一段现代诗赏析，发现观点后没有证据，应？', '补充相关意象或结构细节并解释其作用', '只增加感叹号', '删去中心判断', '引用无关作品代替分析', '赏析需要用具体文本特征支撑判断。', 0],
      ['概括本单元诗歌的共同阅读方法，较恰当的是？', '从语言和意象出发，结合情境分析表达效果', '只背作者年代不读作品', '把每首诗解释成相同主题', '忽略朗读和节奏', '语言、意象与情境是理解诗歌的重要线索。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-topic-choice', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第二单元 / 写作', section: '审题立意', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第二单元目录原文定位审题立意；练习关键词辨析、材料范围和中心确立。',
    points: [['审题', '审题要抓住对象、范围、限制条件和核心关键词。'], ['立意', '中心立意应来自题意和真实材料，避免偏题或空泛。']],
    questions: [
      ['题目要求“写一次让我学会倾听的经历”，审题时最应抓住？', '具体经历以及“学会倾听”的变化', '只写一篇关于音乐的议论文', '泛写所有成长经历', '只介绍倾听的词典定义', '题目限定经历和成长变化，应围绕二者选材。', 0],
      ['从一则“修伞老人帮助陌生人”的材料立意，较合适的是？', '从具体行动中提炼互助、尊重或善意主题', '直接写天气预报', '只介绍雨伞的制造工艺', '讨论与材料无关的考试成绩', '立意要从材料内容中提炼并保持关联。', 1],
      ['写作题中出现“选择一件小事”，这项要求提示？', '选材范围应集中，不宜堆砌许多事件', '必须写一生中的所有经历', '不得写人物行动', '可以忽略“小事”这一限制', '限制词界定选材范围，应按要求集中叙述。', 0],
      ['确定中心后发现所选材料不能支撑主题，较好的做法是？', '更换或补充材料，确保内容与立意相连', '保留材料并强行贴上结论', '删除题目要求', '把主题改成与任务无关的方向', '材料与立意应相互支撑，必要时重新选择。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-school-years-activity', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第二单元 / 专题学习活动', section: '岁月如歌——我们的初中生活', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位初中生活专题活动；考查访谈、资料整理、叙事顺序和隐私保护。',
    points: [['专题活动', '回顾校园生活可通过访谈、照片、作品等材料整理共同记忆。'], ['资料伦理', '展示同学经历和影像时应征得同意并保护个人隐私。']],
    questions: [
      ['制作班级成长纪念册前，较好的资料收集方式是？', '征得同学同意后收集照片、作品和回忆并核实时间', '未经同意公开所有私人聊天', '把网络图片冒充班级照片', '删掉资料来源和人物信息', '收集需尊重同意并确保资料真实。', 0],
      ['访谈同学回忆某次活动时，采访者应？', '提出开放问题并记录对方愿意分享的内容', '强迫对方回答不愿谈的话题', '替受访者编造回答', '只问能得到“是”或“否”的问题', '开放式提问和尊重意愿更有助于真实表达。', 1],
      ['纪念册按时间整理照片和作品，主要帮助？', '呈现集体生活的过程和变化', '证明所有同学经历完全相同', '去掉每件作品的作者', '把不同年份的事情混为一谈', '时间顺序便于呈现经历的发展。', 0],
      ['同学不希望自己的照片公开展示，活动组应？', '尊重意愿并选择其他材料或遮去可识别信息', '认为纪念活动可以忽略个人选择', '仍将照片上传公开平台', '把拒绝者姓名标注出来', '个人影像使用需尊重本人意愿和隐私。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unit2-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第二单元', section: '单元综合与测试', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第二单元目录定位综合测试；综合审题立意、校园回忆和材料组织。',
    points: [['写作构思', '围绕题目限制确定中心，再筛选能体现中心的材料。'], ['活动表达', '访谈和回忆资料需核实、尊重隐私并有序呈现。']],
    questions: [
      ['一篇回忆文章有许多事件，读者却看不出中心，修改时应？', '围绕明确主题筛选材料并调整详略', '继续增加更多事件', '删除所有细节', '只改变标题字体', '材料取舍和详略安排应服务文章中心。', 0],
      ['文章引用同学的回忆与个人记忆不一致，作者应？', '核对时间和其他记录，必要时注明不同记忆', '把其中一方强改成一致', '隐去所有信息来源', '用最生动的说法代替事实', '回忆可能不同，应核实并如实呈现资料差异。', 1],
      ['审题后确定“成长来自承担责任”为中心，哪类材料最合适？', '一件自己承担任务并发生变化的具体经历', '一段无关的天气描写', '一份没有说明的名人名录', '与责任无关的菜谱', '具体经历可体现承担责任与成长的关系。', 0],
      ['专题活动成果既要有感染力又要可信，应该？', '结合真实材料、清楚说明来源并注意表达顺序', '编造更感人的情节', '只放装饰图片', '隐去事件时间和参与者授权', '真实、可核对且组织清楚的材料更有感染力和可信度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-yujia-qiusi', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 阅读 / 12 词四首', section: '渔家傲·秋思 / 范仲淹', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位范仲淹《渔家傲·秋思》；题目围绕边塞景象、思乡和守边责任原创设问。',
    points: [['边塞词意境', '边地景象与军旅生活共同构成苍凉、紧张的氛围。'], ['情感层次', '作品兼有思乡情绪和守边责任感。']],
    questions: [
      ['《渔家傲·秋思》中的边塞环境描写主要作用是？', '营造苍凉氛围并烘托戍边生活的艰苦', '介绍江南园林布局', '表现节日游园的欢乐', '说明农业灌溉过程', '边地景象服务于军旅处境和情感表达。', 0],
      ['词中人物的思乡情感与守边责任并存，说明？', '作品呈现了个人情感和家国责任的交织', '人物已经不再思念家乡', '守边生活毫无困难', '两种情感完全不能共存', '思乡与责任形成复杂而真实的情感层次。', 1],
      ['读边塞词时，理解情感较好的方法是？', '联系景物、军旅处境和人物心境', '只看词牌名称', '忽略边地环境', '把词作当成地理说明文', '景物与处境共同提示词中情感。', 0],
      ['概括这首词的基调，较恰当的是？', '苍凉沉郁中带有坚守责任的力量', '轻松诙谐且毫无忧思', '欢快闲适的田园小调', '冷静记录气温变化', '边塞环境与人物责任共同形成沉郁而有力量的基调。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-jiangchengzi-mizhou', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 阅读 / 12 词四首', section: '江城子·密州出猎 / 苏轼', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位苏轼《江城子·密州出猎》；关注出猎场面、豪迈风格与报国愿望。',
    points: [['词境与风格', '出猎场面展现豪迈气势，词中也寄托建功报国的愿望。'], ['表达手法', '通过动作、场景和夸张表达人物精神状态。']],
    questions: [
      ['《江城子·密州出猎》开篇写出猎场面，主要营造？', '气势开阔、意气风发的氛围', '闲居独处的清冷氛围', '市井买卖的热闹场景', '儿童游戏的轻松气氛', '出猎场面塑造了豪迈、昂扬的词境。', 0],
      ['词人借出猎表达的不只是游乐，还包含？', '渴望报效国家、建功立业的愿望', '想要离开所有社会责任', '对园艺技巧的兴趣', '对商业贸易的计划', '词作将豪迈场景与报国愿望相结合。', 1],
      ['分析词中夸张表达时，应？', '结合人物气概和上下文理解其表现作用', '按真实物理数据判断是否可能', '认为夸张会使作品没有意义', '只统计句中数字', '文学夸张常用于强化情感和人物气势。', 0],
      ['概括作品中的抒情主人公形象，较准确的是？', '胸怀抱负、希望有所作为的豪迈形象', '畏惧一切行动的隐居者', '只关心宴饮的旁观者', '没有任何情感的记录者', '出猎行动和报国愿望共同塑造豪迈人物形象。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-pozhenzi', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 阅读 / 12 词四首', section: '破阵子·为陈同甫赋壮词以寄之 / 辛弃疾', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位辛弃疾《破阵子·为陈同甫赋壮词以寄之》；比较理想壮景与现实失意。',
    points: [['理想与现实', '作品以雄壮的军旅想象表达报国理想，并呈现理想难以实现的现实。'], ['结构转折', '结尾处的情绪转折能改变前文壮阔描写的理解。']],
    questions: [
      ['《破阵子》前部呈现军旅壮景，结尾转向现实感慨，其作用是？', '形成理想与现实的反差，深化悲愤和无奈', '说明作品转为喜剧', '证明前文景象全部是现场新闻记录', '改变作品体裁为说明文', '情绪转折使壮志难酬的感受更加突出。', 0],
      ['词中的壮阔军旅场景更适合理解为？', '词人理想和抱负的想象性呈现', '普通宴会的真实记录', '对农事流程的描述', '与人物愿望无关的背景装饰', '军旅想象承载报国愿望。', 1],
      ['理解作品结尾，最需要回看？', '前文的壮志描写与现实处境之间的对照', '词牌字数是否整齐', '作者朋友的外貌', '与作品无关的地名', '结尾情感依赖前文理想与现实的反差。', 0],
      ['这首词的“壮”不仅指场面宏大，还包括？', '人物理想、情感力量和报国抱负', '句子数量较多', '用词全部生僻', '没有任何现实感受', '作品的壮阔既体现在场景，也体现在抱负和情感。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-manjianghong', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 阅读 / 12 词四首', section: '满江红（小住京华）/ 秋瑾', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位秋瑾《满江红（小住京华）》；关注女性主体意识、家国情怀和理想追求。',
    points: [['主体意识', '词作表达女性不甘受传统角色束缚、追求自我价值的意识。'], ['家国情怀', '个人理想与时代责任、家国情怀相互交织。']],
    questions: [
      ['《满江红（小住京华）》中抒情主人公的选择表现出？', '不甘于狭窄生活空间并追求更广阔的人生价值', '只想逃避一切责任', '满足于被动接受安排', '对社会与家国毫无关切', '词作表达突破局限、实现自我价值的愿望。', 0],
      ['理解秋瑾词作中的家国情怀，应联系？', '个人处境、时代背景和投身公共事业的志向', '只看词中地点名称', '只用现代日常心情解释全部内容', '忽略作者的时代选择', '个人理想和时代背景共同构成作品情感。', 1],
      ['这首词的豪迈语气与个人感伤并存，说明？', '人物情感具有复杂层次，并非单一情绪', '作品前后互相矛盾而没有主题', '只有豪迈是真实的', '感伤部分可以全部忽略', '豪情与感伤共同呈现人物处境和理想。', 0],
      ['写读后感时评价作品中的女性主体意识，较好的方法是？', '结合人物言行和时代语境说明自己的判断', '只写“很勇敢”不举依据', '用今天的概念替代文本细节', '只评价词牌名称', '文本细节和时代语境可支撑评价。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-layout', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 写作', section: '布局谋篇', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录原文定位布局谋篇写作任务；考查材料顺序、详略、过渡和照应。',
    points: [['篇章结构', '文章结构应服务中心，合理安排开头、主体和结尾。'], ['材料组织', '按时间、逻辑或重要程度安排材料，并处理详略。']],
    questions: [
      ['写一次科学调查经历，按过程呈现时较清楚的顺序是？', '提出问题、设计调查、记录结果、总结发现', '先给结论、再写无关人物、最后提出问题', '把所有材料随机排列', '只写结尾不交代调查', '按实际过程组织能帮助读者理解研究如何开展。', 0],
      ['文章主体有三件事，但只有一件直接体现中心，详略安排应？', '重点写相关事件，压缩次要内容', '三件事平均写成同样长', '删掉最能支撑中心的事件', '增加更多不相关经历', '详略由材料与中心的关联程度决定。', 1],
      ['段落之间缺少衔接，修改时可以？', '补充能说明前后关系的过渡句或调整顺序', '重复上一段全部内容', '把段落标题全部删去', '增加无关的修辞句', '过渡要体现段落之间的逻辑联系。', 0],
      ['结尾照应开头的作用之一是？', '收束全文并强化中心', '引入完全无关的新主题', '替代主体论证', '改变所有事实顺序', '照应可形成结构完整感并突出主题。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-shuihu-reading', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 整本书阅读', section: '《水浒传》 怎样读古典长篇小说', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位《水浒传》整本书阅读；关注章回结构、人物群像、情节关联和历史小说辨析。',
    points: [['章回小说阅读', '古典长篇小说可通过章回线索、人物关系和重要事件梳理结构。'], ['人物与主题', '分析人物需综合其行动、语言、关系变化和情节后果。']],
    questions: [
      ['阅读《水浒传》时制作人物关系图，主要帮助？', '梳理人物联系和情节发展脉络', '证明所有人物同时出现', '替代阅读原著', '把不同章回合并为同一事件', '关系图帮助把握群像和情节之间的联系。', 0],
      ['判断一位人物的性格，较可靠的依据是？', '结合多处言行、选择及其造成的后果', '只依据人物绰号', '只听另一人物的单句评价', '把影视改编完全当作原著', '人物性格需从多处情节与行动综合概括。', 1],
      ['读古典长篇小说时遇到陌生词语或礼俗，适合？', '查阅可靠注释并结合上下文理解', '立即按现代同形词义解释', '跳过所有情节信息', '只用影视版本补充原著', '注释和上下文可帮助理解古今词义与文化背景。', 0],
      ['讨论小说人物行为时，兼顾文本与价值判断的做法是？', '说明行为发生的情境、文本依据及其影响', '只贴上“好人”或“坏人”标签', '把虚构情节当作真实档案', '忽略行为造成的后果', '分析应结合情境、证据和影响，避免简单标签化。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-dingfengbo', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 课外古诗词诵读', section: '定风波（莫听穿林打叶声）/ 苏轼', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位苏轼《定风波》；围绕风雨行路、心境转变和旷达态度原创设题。',
    points: [['景与心境', '风雨行路的具体经历引出对外部困境和内心态度的思考。'], ['旷达表达', '作品表现面对风雨时保持从容、积极的精神姿态。']],
    questions: [
      ['《定风波》把风雨行路写成个人处境的映照，主要表现？', '面对外部困境仍保持从容的心境', '希望永久避开所有生活经历', '对风雨作纯气象说明', '人物完全没有任何感受', '风雨既是自然景象，也引出对处境和心境的表达。', 0],
      ['词中旷达态度更适合理解为？', '经历风雨后仍能调整心态并继续前行', '否认困难客观存在', '要求他人承担全部困难', '对现实完全麻木', '旷达并非没有困难，而是在困境中保持从容。', 1],
      ['景物描写在词中的作用是？', '由途中所见引出对人生处境的体会', '提供精确的降雨量数据', '说明旅行路线长度', '与作者心情毫无关系', '景物与心境相互映照，推动情感表达。', 0],
      ['概括作品主旨时，较恰当的表述是？', '在风雨和人生波折中保持坦然、坚定的态度', '任何困难都会立即消失', '所有人都应避免出门', '自然景色无需联系情感', '词作呈现的是面对波折时的从容态度。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-linjiangxian', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 课外古诗词诵读', section: '临江仙·夜登小阁，忆洛中旧游 / 陈与义', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位陈与义《临江仙》；联系登阁所见、往日游历与今昔之感设计题目。',
    points: [['今昔对照', '作品把当下夜登小阁与往日经历联系起来，形成追忆和感慨。'], ['历史感受', '个人回忆与时代变迁交织，增强词作的沉郁意味。']],
    questions: [
      ['题目中“忆旧游”提示读者关注？', '当下情境与往日经历之间的对照', '一场即将发生的比赛', '对植物种类的说明', '人物职业的变化统计', '题目提示今昔联系是理解作品的重要线索。', 0],
      ['作品将个人旧游与时代变迁联系起来，情感层次会？', '由个人追忆扩展到对世事变化的感慨', '只剩下景物说明', '完全没有怀旧情绪', '变成喜剧对白', '个人记忆与时代经历交织，丰富了情感层次。', 1],
      ['夜登小阁的当下景象在词中主要起？', '触发回忆并承接现实与往事', '提供建筑施工说明', '取代所有历史内容', '说明人物从未有过往事', '当下所见成为回忆展开的契机。', 0],
      ['读这首词时，理解沉郁感较好的方法是？', '结合作者所处时代和词中今昔转换', '只统计地名数量', '只看词牌的声调', '忽略叙述时间变化', '时代背景与今昔结构有助于理解情感。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-taichangyin', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 课外古诗词诵读', section: '太常引·建康中秋夜为吕叔潜赋 / 辛弃疾', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位辛弃疾《太常引》；围绕中秋月夜、想象手法和现实关切原创设问。',
    points: [['想象与寄托', '词人借月夜想象表达现实中难以实现的愿望和关切。'], ['意象组织', '明月、桂影等意象连接中秋景物与家国情怀。']],
    questions: [
      ['《太常引》借助月宫想象寄托愿望，主要表现？', '把现实关切和理想追求融入浪漫想象', '对天文学仪器作使用说明', '单纯记录月相变化', '人物只想谈论饮食', '月宫想象承载现实情感和理想寄托。', 0],
      ['理解词中的中秋月夜意象，应联系？', '团圆文化、现实处境和词人的情感愿望', '只比较月亮大小', '只查月相日期', '忽略词中其他景物', '传统节日意象与现实情感共同构成词意。', 1],
      ['浪漫想象在作品中的作用是？', '突破现实限制，表达难以直说的愿望', '使作品完全脱离现实情感', '证明月宫真实存在', '替代全部景物描写', '想象手法帮助寄托理想，并不等于真实记录。', 0],
      ['分析词作的家国关怀，较好的依据是？', '联系词人处境、月夜意象和理想表达', '只凭作品标题中的地点', '将读者个人愿望当作作者本意', '不阅读作品正文', '家国情怀判断应结合文本和背景证据。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-huanxisha-nalan', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元 / 课外古诗词诵读', section: '浣溪沙（身向云山那畔行）/ 纳兰性德', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位纳兰性德《浣溪沙》；关注行旅、边地环境和羁旅情绪。',
    points: [['行旅词阅读', '旅途景象和行者处境可共同表现羁旅中的孤寂与感慨。'], ['景情关系', '边地空间、天气和行进状态参与构成作品氛围。']],
    questions: [
      ['《浣溪沙》（身向云山那畔行）中的边地行旅情境，容易带出？', '远行者的羁旅感受和对处境的思考', '繁华宴会的热闹', '城市商业经营说明', '室内读书的安静生活', '行旅空间与远行者身份共同呈现羁旅情绪。', 0],
      ['分析边地景物时，应避免？', '脱离行者处境，只把意象当作地理名词罗列', '联系空间和心境', '关注景物组合', '考虑词的情感基调', '景物解读需联系主体感受，不能只做名词罗列。', 1],
      ['词中行进方向和路途环境的描写，主要帮助？', '呈现人物身处远方的空间感和心理状态', '精确测量地形高度', '说明交通工具制造工艺', '消除作品中的情感', '空间和行程描写可烘托人物感受。', 0],
      ['比较本词与普通风景介绍，文学表达的特点是？', '景物选择服务于主体情绪和作品氛围', '所有景物都只提供客观数据', '没有任何观察者', '不需要语言节奏', '文学景物描写通常与感受和情境相联系。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unit3-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第三单元', section: '单元综合与测试', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第三单元目录定位综合测试；整合词作情感、意象、今昔结构和篇章写作。',
    points: [['古典诗词鉴赏', '从意象、典故、节奏和情感变化入手鉴赏诗词。'], ['阅读与写作', '比较阅读发现异同，写作中据中心安排材料和层次。']],
    questions: [
      ['比较本单元两首词的情感，最可靠的依据是？', '联系具体意象、人物处境和情感转折', '只看作者姓名是否相同', '只比较词牌字数', '把所有边塞或月夜作品说成同一种情绪', '情感比较应建立在文本细节和情境分析上。', 0],
      ['诗词赏析中引用典故后，还应？', '说明典故与当前情境、作者表达之间的关系', '只写典故出处不作分析', '用典故替代全篇理解', '把典故人物当作现实叙述者', '典故分析要解释其在作品语境中的作用。', 1],
      ['写作布局时，哪种安排更能突出中心？', '按逻辑关系组织材料并对关键部分详写', '所有材料随机排列', '最重要内容一笔带过', '每段写一个无关主题', '结构和详略都要围绕中心安排。', 0],
      ['同一意象在不同作品中含义不完全相同，说明？', '需结合具体语境和作品整体理解意象', '意象有固定不变的唯一含义', '读者无需查看上下文', '作品题材决定全部细节', '意象意义会受语境和全篇结构影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-tan-dushu', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第四单元 / 阅读 / 13 短文两篇', section: '谈读书 / 培根', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位培根《谈读书》；原创题考查议论层次、读书作用分类和类比表达。',
    points: [['观点与论证', '议论性散文通过明确观点和分层论述表达认识。'], ['读书方法', '读书应结合目的、内容和实际运用选择方法。']],
    questions: [
      ['阅读《谈读书》时，梳理作者观点最有效的方法是？', '标出分层论述的中心意思及它们之间的关系', '只统计出现的书名', '只读每段最后一个字', '忽略文章结构', '梳理论述层次有助于把握观点组织方式。', 0],
      ['面对不同阅读目的，较合理的读书态度是？', '根据需要选择精读、浏览或思考讨论等方法', '所有书都必须用同一种速度通读', '只看封面判断内容', '把读书完全当作记忆比赛', '阅读方法可以依内容和目的调整。', 1],
      ['引用培根的观点写读后感时，应？', '准确转述并说明自己赞同或补充的理由', '把自己的话说成作者原句', '只写作者姓名不谈观点', '不区分引用和评论', '读后感应区分原文观点与个人回应。', 0],
      ['文章用类比帮助说明读书作用，读者应关注？', '类比两端的相似点以及它如何支持观点', '只记住比喻对象的颜色', '认为类比就是科学实验', '忽略上下文论证', '类比要看相似关系及其论证作用。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-buqiu-shenjie', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第四单元 / 阅读 / 13 短文两篇', section: '不求甚解 / 马南邨', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录定位马南邨《不求甚解》；关注标题辨析、阅读态度及论证语境。',
    points: [['标题辨析', '理解文章标题需结合正文语境，不能只按字面作极端解释。'], ['阅读态度', '阅读既需把握整体，也要对关键内容深入理解和思考。']],
    questions: [
      ['理解《不求甚解》的标题，最应避免？', '只按字面理解成读书可以不思考或不求理解', '结合正文辨析标题含义', '关注作者对读书方法的讨论', '比较不同阅读情境', '标题含义需结合全文，不能作绝对化字面解释。', 0],
      ['阅读文章讨论“理解”的观点时，较合理的态度是？', '把握整体内容，并对关键问题深入思考', '只追求逐字解释而不看全文', '完全不读难懂内容', '只记标题不看论证', '整体理解与关键处深入思考可以兼顾。', 1],
      ['若有人把“不求甚解”解释成“阅读无需准确”，应？', '回到文章语境检查这种解释是否符合作者论证', '直接将标题当成唯一依据', '忽略全文观点', '把个人偏好当作作者本意', '应依据正文论证而非孤立标题判断。', 0],
      ['比较《谈读书》和《不求甚解》，有价值的角度是？', '两篇文章如何认识阅读目的、方法和思考', '只比较篇名字数', '只比较作者籍贯', '认为相同主题必然观点完全相同', '比较同一主题下的不同论证角度能深化理解。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-revision-polish', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第四单元 / 写作', section: '修改润色', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下目录原文定位修改润色任务；聚焦内容、结构、语言、标点和读者反馈。',
    points: [['文章修改', '修改可从立意、材料、结构、语言和格式等层面逐步进行。'], ['润色表达', '准确词语、句式变化和规范标点提升表达清晰度。']],
    questions: [
      ['修改作文时发现两段内容重复且偏离中心，应先？', '删减重复内容并重新检查材料与中心的关系', '先换一种字体', '给每句都加感叹号', '只改标题不看正文', '内容和结构问题应先于表面修饰处理。', 0],
      ['同伴指出一句话有歧义，较好的修改方式是？', '补足对象或调整语序，使意思明确', '保留歧义增加神秘感', '删除所有主语', '只在句末加省略号', '修改应让句意清晰并符合写作目的。', 1],
      ['润色时把“走得很快”改成具体动作描写，主要作用是？', '增强画面感并使表达更具体', '必然改变事件事实', '让文章不再有中心', '替代所有内容分析', '具体动作可以提升表达的形象性。', 0],
      ['完成修改后，最后还应检查？', '错别字、标点、格式及修改后是否影响原意', '只检查纸张颜色', '删除所有段落标记', '把修订痕迹留给读者猜测', '校对细节能保证文本规范且意思准确。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unit4-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第四单元', section: '单元综合与测试', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第四单元目录定位综合测试；整合读书议论、标题理解和文章修改。',
    points: [['议论性散文', '准确概括观点并结合论证方式理解作者表达。'], ['写作修改', '内容、结构和语言修改应相互配合，保持观点与材料一致。']],
    questions: [
      ['概括议论性散文的中心观点，较好的依据是？', '全文反复论述的判断及分层材料', '只看一个修辞词', '只依据标题字面', '只看最后一句而不顾全文', '中心观点应结合全文和论证层次概括。', 0],
      ['读书方法的讨论中出现看似矛盾的观点，读者应？', '比较观点适用的目的和语境后再判断', '选择一句并忽略另一篇', '认为作者一定互相抄写', '不读文章直接作结论', '阅读观点需关注语境和适用范围。', 1],
      ['文章修改后发现新段落没有证据支持，应？', '补充可靠材料或收窄观点范围', '保留原结论并删除质疑', '只添加形容词', '把标题改成问题句', '论点和材料需匹配，证据不足时应补充或调整观点。', 0],
      ['一次完整的修改润色包括？', '检查内容、结构、语言和格式', '只改变字体大小', '只增加段落数量', '只看是否写满页数', '完整修改不止校对表面错误，也检查内容结构。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-rehearsal', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第五单元', section: '任务二 准备与排练', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第五单元目录定位准备与排练任务；考查文本分析、角色分工、排练计划和安全。',
    points: [['戏剧准备', '演出准备包括理解剧本、分配角色、安排调度和准备道具。'], ['合作排练', '排练中需倾听反馈、调整节奏并保障人员和道具安全。']],
    questions: [
      ['排演一段戏剧前，演员首先应？', '理解人物关系、行动目的和场景变化', '只背台词不理解情节', '先布置无关道具', '统一用同一种语气读完', '理解人物和情境能支持有依据的表演设计。', 0],
      ['排练时间有限，剧组制定计划时较合理的是？', '明确分工、重点场次和排练顺序', '让所有人同时做同一件事', '直到演出前才第一次合练', '不考虑道具和场地', '计划和分工有助于提高排练效率。', 1],
      ['观众听不清某句台词，排练时应？', '调整发音、音量和面向观众的站位', '删掉所有台词', '让观众自行猜测', '提高背景音乐音量', '清晰表达需要兼顾声音和舞台位置。', 0],
      ['搬运布景和道具时，应？', '按分工安全搬运并检查通道和固定情况', '奔跑穿过拥挤舞台', '把重物堆在出口', '不固定易倒道具', '演出准备需把设备和通道安全纳入计划。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-performance-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第五单元', section: '任务三 演出与评议', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第五单元目录定位演出与评议任务；围绕现场表达、观众反馈和具体改进设题。',
    points: [['舞台表达', '表演需让台词、动作、语气和人物情境相协调。'], ['评议反馈', '评议应依据具体表现提出清楚、尊重且可操作的建议。']],
    questions: [
      ['观看戏剧演出时，哪项最适合作为评价依据？', '台词表达、人物动作与情节是否协调', '演员服装是否最昂贵', '观众中谁坐在第一排', '舞台灯光颜色是否最多', '评价应聚焦作品表达和舞台效果。', 0],
      ['给同学演出提出改进建议，较合适的表达是？', '指出具体场景和可调整的语气或动作', '只说“演得不好”', '评价演员的外貌', '在未观看时猜测问题', '具体、尊重的建议便于改进。', 1],
      ['演出后复盘时，较有帮助的证据包括？', '观众反馈、排练记录和现场表现观察', '只有演员的单一印象', '与演出无关的考试成绩', '事后编造的掌声次数', '多方面记录能支持更完整的复盘。', 0],
      ['评议表演时既指出亮点又指出问题，作用是？', '帮助团队保持有效做法并明确下一步改进', '让评价变得不客观', '取消团队合作', '替代表演本身', '平衡反馈能支持团队继续提升。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-chinese-9b-unit5-review', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第五单元', section: '单元综合与测试', directoryUrl: chinese9b,
    evidence: '按统编版2026更新九下第五单元目录定位综合测试；整合戏剧文本理解、排演合作和演后评议。',
    points: [['戏剧综合', '戏剧学习兼顾文本阅读、舞台呈现、团队合作和观众交流。'], ['评价改进', '依据可观察的表现提出具体建议并用于后续修订。']],
    questions: [
      ['由剧本到舞台演出，团队需要完成？', '理解文本、设计动作调度、排练并现场呈现', '只抄写剧本封面', '只制作海报不排练', '忽略角色关系直接上台', '演出把文本理解转化为舞台行动和表达。', 0],
      ['排演中演员对角色理解不同，较好的处理是？', '回到剧本和情境讨论证据，再协商表演方案', '由声音最大的人决定', '删除有分歧的角色', '不看剧本按个人经验演', '文本证据和协商能帮助团队形成连贯表达。', 1],
      ['评议演出时提出“第三场对话节奏偏快，可在转折处留出停顿”，属于？', '具体且可操作的反馈', '与演出无关的评价', '针对演员外貌的评论', '无法核实的泛泛结论', '反馈指出场景、表现和可调整的方法。', 0],
      ['单元综合活动最能体现的学习方式是？', '阅读、表达、合作实践和反思结合', '只背术语不实践', '只看演出不分析', '只评价他人不参与', '戏剧单元把阅读、表达、实践和反思联系起来。', 1],
    ],
  },
]

const politics8aLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g8-daofa-8a-unit1-summary', grade: '初二', subject: '道德与法治', volume: '上册',
    chapter: '第一单元 走进社会生活', section: '单元思考与行动', directoryUrl: politics8a,
    evidence: '统编版（2024）八上目录明确设置本单元思考与行动；综合社会生活、亲社会行为与网络文明。',
    points: [['社会生活与成长', '个人在社会关系中成长，亲社会行为有助于融入社会。'], ['网络文明', '合理利用网络，遵守规则并共同营造清朗网络空间。']],
    questions: [
      ['参加社区志愿服务后，发现独居老人需要定期探访。最恰当的做法是？', '在征得同意后与社区协商持续、适度的帮助', '未经允许公开老人住址以号召围观', '替老人作出所有生活决定', '只拍照发布，不再跟进实际需要', '亲社会行为应尊重他人并通过合适渠道持续落实。', 0],
      ['同学在班级群转发未经核实的“紧急通知”，你应先？', '核验发布来源和事实，再决定是否转发', '立即转发到所有群扩大影响', '补上夸张标题吸引关注', '把质疑者的个人信息发出', '网络信息传播前要核实来源，避免制造或扩散谣言。', 1],
      ['社会生活中每个人承担的角色会变化，这说明？', '人的成长与社会关系和社会生活密切相关', '人的行为完全不受社会影响', '只有成年后才参与社会生活', '不同角色的责任永远相同', '人在不同关系和情境中承担相应角色。', 0],
      ['发现网络讨论出现人身攻击，哪种回应更合适？', '围绕事实理性表达并提醒遵守网络规则', '跟着辱骂并公布对方隐私', '编造经历反击对方', '号召同学刷屏压制不同观点', '文明表达、尊重他人并依法使用网络。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-daofa-8a-unit2-summary', grade: '初二', subject: '道德与法治', volume: '上册',
    chapter: '第二单元 维护社会秩序', section: '单元思考与行动', directoryUrl: politics8a,
    evidence: '统编版（2024）八上目录原文定位；综合社会规则、文明交往与法治素养。',
    points: [['规则与秩序', '社会规则明确行为边界，维护有序的社会生活。'], ['道德与法治', '诚信、礼貌和依法办事共同支持文明社会交往。']],
    questions: [
      ['图书馆有人持续大声通话，维护公共秩序的合理做法是？', '礼貌提醒其遵守场所规则，必要时请工作人员协助', '抢走手机并删除通话记录', '拍下对方证件并公开传播', '所有人一起大声回应', '先以文明方式提醒，必要时求助管理人员。', 0],
      ['同学借用物品后按约定时间归还，这主要体现？', '诚信和对约定的尊重', '用规则限制他人自由', '只有受到处罚才守约', '与社会交往无关的个人偏好', '信守承诺有助于建立可信赖的社会关系。', 1],
      ['遇到不熟悉的办事规定，最稳妥的做法是？', '查询正式规定或向相关部门咨询后依法办理', '听从未经核实的网络传言', '伪造材料绕过程序', '认为规则只约束别人', '依法办事应了解并遵守有效规则。', 0],
      ['排队时有人试图插队，其他人维护秩序的适当方式是？', '平和指出排队规则并按秩序办理', '推搡对方使其离开', '堵住所有人的通道', '把对方姓名和照片发到网上', '遵守规则并文明沟通能减少冲突、维护秩序。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-daofa-8a-unit3-summary', grade: '初二', subject: '道德与法治', volume: '上册',
    chapter: '第三单元 勇担社会责任', section: '单元思考与行动', directoryUrl: politics8a,
    evidence: '统编版（2024）八上目录原文定位；综合自由平等、公平正义与积极奉献社会。',
    points: [['责任与奉献', '承担力所能及的责任并服务社会，行动应合法、尊重他人。'], ['公平正义', '公平对待他人，面对不公可通过合理合法途径维护正义。']],
    questions: [
      ['小组作业中一名同学因病缺席，较负责任的安排是？', '了解其情况后重新分工，并让其承担适合的任务', '直接把全部责任推给缺席同学', '隐瞒分工并给其记零分', '替他伪造已经完成的材料', '承担责任要兼顾实际情况、公平和团队目标。', 0],
      ['看到公共设施被损坏，维护正义的适当方式是？', '保护现场并向管理部门反映，提供真实情况', '自行惩罚被怀疑的人', '传播未经核实的指控', '破坏更多设施表示抗议', '通过合法途径反映事实，避免侵害他人权利。', 1],
      ['帮助同学时，哪种做法更能体现尊重与责任？', '先了解对方需要，再提供力所能及的帮助', '不询问就替对方公开隐私求助', '承诺无法完成的长期照料', '以帮助为由要求对方服从自己', '帮助应尊重自主、保护隐私并量力而行。', 0],
      ['学校评选志愿服务先进个人，公平做法是？', '按公开、一致的标准核实服务情况', '只依据与评委的亲疏关系', '临时更改标准偏向某人', '公开候选人的无关隐私', '公平评价需要标准明确、程序一致且尊重隐私。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-daofa-8a-unit4-summary', grade: '初二', subject: '道德与法治', volume: '上册',
    chapter: '第四单元 维护国家利益', section: '单元思考与行动', directoryUrl: politics8a,
    evidence: '统编版（2024）八上目录原文定位；综合国家利益、国防建设与总体国家安全观。',
    points: [['国家利益', '国家利益关系人民共同利益，维护国家利益应依法、理性履责。'], ['国家安全', '国家安全涉及多个领域，公民应增强意识并依法维护安全。']],
    questions: [
      ['在网络平台发现疑似泄露国家秘密的信息，适当做法是？', '不下载、不传播，并通过正规渠道报告', '转发给更多人请其辨认', '自行整理后上传公开网盘', '在评论区补充可能的敏感细节', '不扩散疑似涉密内容并向正规渠道报告更稳妥。', 0],
      ['国防和军队建设的根本意义之一是？', '维护国家主权、安全和发展利益', '取代社会生活中的全部公共服务', '保证每个人从此不受任何规则约束', '让公民不再承担社会责任', '国防建设服务于国家安全和发展利益。', 1],
      ['维护国家安全与普通公民的关系，正确的是？', '维护国家安全是全社会共同责任，公民可依法履责', '国家安全只与军队有关', '只有发生战争时才需要关注安全', '发现风险也不应向任何部门报告', '国家安全涵盖多领域，公民应依法参与维护。', 0],
      ['个人利益与国家利益发生矛盾时，公民应？', '依法处理关系，在重大关头自觉维护国家利益', '以违法方式报复他人', '传播未经核实的敏感消息', '认为维护国家利益只需口头表态', '维护国家利益应通过合法行动并落实责任。', 1],
    ],
  },
]

const history8LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g8-history-8a-whole-book', grade: '初二', subject: '历史', volume: '上册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history8a,
    evidence: '依据统编版2025年秋启用八上目录的近代史时序编写全册综合题；覆盖民族危机、探索与抗争。',
    points: [['时序与阶段', '依据史实排列近代中国重大事件，并辨析不同阶段特征。'], ['史料与解释', '区分史料信息和解释，使用多项证据说明历史变化。']],
    questions: [
      ['下列事件按发生先后排列，正确的是？', '鸦片战争—洋务运动—辛亥革命—五四运动', '辛亥革命—鸦片战争—五四运动—洋务运动', '洋务运动—五四运动—鸦片战争—辛亥革命', '五四运动—辛亥革命—洋务运动—鸦片战争', '鸦片战争始于1840年，洋务运动在19世纪60年代兴起，辛亥革命发生于1911年，五四运动发生于1919年。', 0],
      ['近代中国多次探索救亡图存道路，比较不同运动时最适合关注？', '其主张、参与力量、采取方式及历史影响', '只比较事件名称的字数', '只依据某一人物的个人评价', '忽略时代背景并视为完全相同', '把运动放回时代背景，比较目标、力量和结果才能解释差异。', 1],
      ['研究某次条约对中国主权的影响，较可靠的做法是？', '阅读条约条款并与相关地图、档案等互证', '只依据后人一句概括', '把现代国界直接套用于当时', '只选支持预设结论的材料', '条文和多种相关史料可互相印证对主权变化的解释。', 0],
      ['一份报刊记载与一份回忆录对同一事件说法不同，研究者应？', '考察作者、成文时间、目的和其他史料后再判断', '自动认定回忆录一定真实', '删除其中一份材料', '把两种说法拼在一起当作事实', '史料有立场与局限，需要考察来源并交叉验证。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-history-8b-whole-book', grade: '初二', subject: '历史', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: history8b,
    evidence: '依据统编版2026年春启用八下目录的中华人民共和国历史时序编写全册综合题。',
    points: [['现代化进程', '结合阶段背景理解国家建设、改革开放和新时代发展的进程。'], ['证据解释', '用时间线、数据和史料解释历史变化并审视材料来源。']],
    questions: [
      ['下列新中国历史事件按时间先后排列，正确的是？', '新中国成立—抗美援朝—三大改造基本完成—改革开放', '改革开放—新中国成立—三大改造基本完成—抗美援朝', '三大改造基本完成—抗美援朝—改革开放—新中国成立', '抗美援朝—改革开放—新中国成立—三大改造基本完成', '1949年新中国成立，1950年抗美援朝开始，1956年三大改造基本完成，1978年改革开放起步。', 0],
      ['比较改革开放前后某行业的发展，哪类材料最有助于分析变化？', '同口径的统计资料并结合政策和社会背景', '不同时期口径不明的单个数字', '只选一个成功案例代表全部', '只凭今天的印象回忆过去', '同口径数据结合历史背景能减少误读并支持解释。', 1],
      ['研究新中国工业化进程时，解释“一五”计划应联系？', '当时的经济基础、建设目标和重点工程', '只联系数十年后的网络技术', '与国家发展条件无关的偶然天气', '某一家庭的消费偏好', '政策与成就要结合当时条件和发展目标理解。', 0],
      ['口述史访谈者讲述亲历的历史事件，使用时应？', '注明讲述者和访谈时间，并与档案、统计等材料互证', '把所有回忆直接当作完整客观记录', '隐去材料来源并改写成亲历者原话', '只保留符合研究者预期的片段', '口述材料有独特价值也有记忆局限，应注明来源并互证。', 1],
    ],
  },
]

const geography8LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g8-geography-8a-harness-silt', grade: '初二', subject: '地理', volume: '上册',
    chapter: '第二章　中国的自然环境', section: '【跨学科主题学习】探究"束水攻沙"原理', directoryUrl: geography8a,
    evidence: '按人教版八上目录原文定位跨学科主题；以河流水动力、地形和工程治理的关系设计探究题。',
    points: [['河流与地形', '河流流速、流量、河床形态和泥沙搬运之间存在联系。'], ['工程探究', '解释工程原理要结合水文地理条件，并用可观察证据验证。']],
    questions: [
      ['在流量等条件相近时，河道收窄通常会使局部水流速度怎样变化？', '通常增大，水流携带和冲刷泥沙的能力可能增强', '必然降为零，泥沙全部沉积', '与河道宽窄完全无关', '只会改变水的颜色，不影响流动', '束水通过改变过水断面影响流速，具体效果仍受河道条件制约。', 0],
      ['验证“束水”对泥沙搬运的影响，较合理的实验设计是？', '保持水量、坡度和泥沙相近，只改变河槽宽度并重复观察', '同时改变水量、坡度、河槽材料和泥沙量', '每次只记录操作者的感受', '只做一次且不记录条件', '控制其他变量、设置重复并记录结果，才能比较河槽宽度的作用。', 1],
      ['将模型河槽实验结果用于真实河流治理时，必须考虑？', '真实河流的流量变化、地貌、泥沙来源和生态影响', '模型尺寸与真实河道永远相同', '只看某一时刻的水面颜色', '模型实验能直接替代所有现场评估', '实验模型提供线索，工程决策还需真实水文、地形和生态资料。', 0],
      ['解释束水攻沙现象时，哪项结论最严谨？', '在特定条件下收窄河道可增加流速，但效果需由数据检验', '任何河道收窄都会永久消除淤积', '河道越窄对所有河段越安全', '仅凭名称即可证明工程效果', '科学解释应说明条件和证据，避免把局部规律说成绝对结论。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-geography-8a-irrigation-heritage', grade: '初二', subject: '地理', volume: '上册',
    chapter: '第三章　中国的自然资源', section: '【跨学科主题学习】认识我国的"世界灌溉工程遗产"', directoryUrl: geography8a,
    evidence: '按人教版八上目录原文定位跨学科主题；综合水资源、地形、农业和工程遗产保护。',
    points: [['水资源利用', '灌溉工程反映水资源的时空分布及人类对水资源的调配。'], ['区域与可持续发展', '工程效益应与区域地形、生产生活和生态保护共同考察。']],
    questions: [
      ['比较两处灌溉工程的选址，哪组资料最有帮助？', '地形、水源季节变化、耕地分布和居民用水资料', '只比较两地名称的字数', '只看工程照片的颜色', '只询问一位游客是否喜欢', '工程选址与水源、地形、农业和人口等区域条件有关。', 0],
      ['一项传统灌溉工程既服务农业又具有遗产价值，保护规划应？', '兼顾灌溉功能、遗产本体、生态和当地居民需求', '只保留外观而停止一切维护', '只追求短期用水量不评估环境', '禁止居民了解工程历史', '可持续保护要兼顾工程使用、文化价值和生态社会效益。', 1],
      ['判断某地农业灌溉对水资源压力的影响，较合适的指标是？', '结合水源补给、取用量、灌溉效率和季节变化分析', '只看某一天是否下雨', '只计算当地水渠的条数', '仅凭作物颜色作结论', '水资源压力取决于供给、需求、效率和时间分布等因素。', 0],
      ['制作工程遗产主题地图时，最重要的基础做法是？', '核对地图比例尺、方向、图例和遗产位置来源', '省略比例尺并随意移动位置', '把不同年份资料当作同一年', '只用装饰图标不标注含义', '规范地图要素和可追溯的位置来源支持准确表达。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-geography-8b-solar-terms', grade: '初二', subject: '地理', volume: '下册',
    chapter: '第六章　中国的地理差异', section: '【跨学科主题学习】了解二十四节气', directoryUrl: geography8b,
    evidence: '按人教版八下目录原文定位跨学科主题；结合季节变化、太阳视运动、物候和农业活动。',
    points: [['季节与太阳辐射', '太阳高度和昼夜长短的季节变化影响各地获得的太阳辐射。'], ['节气与地域', '节气所反映的物候和农事会因纬度、海拔和气候差异而变化。']],
    questions: [
      ['二十四节气在我国各地的农事提示不能完全照搬，主要因为？', '各地纬度、海拔和气候条件不同，物候进程有差异', '节气名称在不同地区会改变汉字读音', '太阳在各地都停止运动', '农业活动与气温和降水没有关系', '节气是季节规律的概括，地方气候会影响物候和农事安排。', 0],
      ['比较不同地区同一节气的物候，最有用的记录是？', '多年同一时期的温度、植物物候和地点信息', '一张无日期的单地照片', '只记录观察者喜欢的现象', '把不同月份记录合并不标地点', '时间和地点连续、可比较的记录能支持物候分析。', 1],
      ['北半球中纬度地区夏季白昼通常较长，主要与什么有关？', '地球公转过程中地轴倾斜导致昼夜长短季节变化', '地球自转在夏季停止', '月球遮住夜晚的时间变短', '经度决定某地一年四季昼夜长短完全相同', '地轴倾斜和地球公转共同造成季节性的昼夜长短变化。', 0],
      ['用节气资料开展农业调查时，哪种结论较可靠？', '将当地多年气象与物候记录结合后说明适用范围', '用一个村某一年的情况代表全国', '只根据节气名称推断每天天气', '把相关变化直接认定为单一因果', '结合多年的地方记录并说明范围可避免过度概括。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-geography-8b-place-names', grade: '初二', subject: '地理', volume: '下册',
    chapter: '第八章　南方地区', section: '【跨学科主题学习】认识地名的由来和演变', directoryUrl: geography8b,
    evidence: '按人教版八下目录原文定位跨学科主题；以地名、自然环境、聚落发展和历史资料开展区域调查。',
    points: [['地名与区域特征', '地名可能记录自然地理、人类活动和历史文化信息。'], ['资料互证', '地名解释需核对地图、地方志、访谈等来源及其时间。']],
    questions: [
      ['某地地名含“港”字，研究其由来最稳妥的做法是？', '结合历史地图、地方志和当地访谈核对不同解释', '仅凭字面认定那里现在一定临海', '只采用社交媒体上最流行的说法', '把现代地貌直接当作古代地貌', '地名可能保留历史信息，但需要多源资料验证。', 0],
      ['同一地点在不同时期地图上名称不同，可能反映？', '行政区划、语言习惯或聚落发展发生变化', '地图上的地点必然移动了', '早期地图一定全部错误', '地名变化与人类活动无关', '地名及其书写会随行政、文化和聚落变迁而演变。', 1],
      ['绘制本地地名调查图时，如何标注更有研究价值？', '注明位置、资料来源、名称变更时间及解释可信度', '只标最吸引人的传说', '隐去资料来源和调查时间', '把推测写成已经证实的事实', '明确来源、时间和证据状态有助于读者判断解释。', 0],
      ['两位受访者对某地名由来记忆不同，调查者应？', '保留差异并查找文献和地图等独立材料核验', '强迫其中一人改变说法', '选择更有趣的讲法当作定论', '删去所有访谈记录', '访谈是重要线索，但需要尊重差异并继续寻找证据。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-geography-8b-map-legend', grade: '初二', subject: '地理', volume: '下册',
    chapter: '附录　本书常用地图图例', section: '附录　本书常用地图图例', directoryUrl: geography8b,
    evidence: '按人教版八下目录附录原文定位；考查图例识读及地图表达的基本规范。',
    points: [['图例识读', '图例说明地图符号所表示的地理事物或现象。'], ['地图表达', '点、线、面符号及比例尺应与地图主题和范围相适应。']],
    questions: [
      ['阅读一幅地图时，图例最主要的作用是？', '说明地图符号代表的地理事物或现象', '显示地图绘制者的姓名', '自动给出所有地理事物的精确高度', '代替地图标题和方向', '图例帮助读者把符号与实际地理事物对应起来。', 0],
      ['在区域图上表示一条铁路，通常适合使用哪类符号？', '线状符号', '点状符号', '面积晕染且无边界', '文字段落代替空间位置', '铁路具有延伸形态，通常以线状符号表示。', 1],
      ['两幅地图图例相同但比例尺不同，比较两地距离时应？', '分别读取各自比例尺后再计算实际距离', '直接比较纸面距离数值', '忽略比例尺并比较颜色深浅', '认定两幅图的地图范围完全相同', '地图距离换算实际距离必须使用对应地图的比例尺。', 0],
      ['图上某符号含义不清，最合理的读图步骤是？', '查看图例、标题、注记和地图来源后再解释', '凭个人经验随意猜测', '把符号当作所有地图通用含义', '删掉符号后继续下结论', '结合图例与地图主题、注记和来源才能正确理解符号。', 1],
    ],
  },
]

const math8LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch12-review', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十二章 分式和分式方程', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位章末复习；综合分式运算、分式方程及应用，并检查定义域与增根。',
    points: [['分式运算', '分母不为零，运算时注意因式分解、约分和通分。'], ['分式方程', '解方程后需检验，实际问题还要检查结果是否符合情境。']],
    questions: [
      ['化简 (x²−9)/(x−3)，其成立条件和结果是？', 'x≠3，化简为 x+3', 'x=3，化简为 x−3', '任意 x，化简为 x+3', 'x≠−3，化简为 x−3', 'x²−9=(x−3)(x+3)，约去因式前必须保留原分母限制 x≠3。', 0],
      ['解分式方程后，为什么还要代入原方程检验？', '通分可能引入使原分母为零的增根', '检验可以把所有解都变成整数', '分式方程的解不需要满足等式', '检验只为改变方程的次数', '去分母可能产生不满足原方程定义域的解，必须检验。', 1],
      ['方程 1/x=1/4 的解是？', 'x=4', 'x=0', 'x=−4', '无解', 'x≠0，交叉相乘得 x=4，代回原式成立。', 0],
      ['一项工程原计划每天完成 x 件，实际每天多完成 2 件。表示实际完成 60 件所需天数可写成？', '60/(x+2)，且 x>0', '60/x+2，且 x>0', '(60/x)+2，且 x>0', '60/(x−2)，且 x<0', '实际日效率为 x+2，工作时间等于总量除以效率。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch13-review', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十三章 全等三角形', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位全等三角形章末复习；围绕命题证明、判定和尺规作图。',
    points: [['全等判定', '三边、两边及其夹角、一边及其两角等条件可判定三角形全等。'], ['证明与作图', '证明须明确已知、依据和结论，尺规作图需按步骤构造。']],
    questions: [
      ['已知两三角形的两边及其夹角分别相等，可使用哪种判定？', 'SAS（边角边）', 'SSA（边边角）在一般情形下必然全等', '只凭一组对应边相等', '只凭周长相等', '两边及其夹角分别相等可由SAS判定全等。', 0],
      ['两个三角形已知两角分别相等和一边对应相等，可以判定全等的依据是？', 'AAS或ASA，取决于已知边的位置', '只要两角相等就一定全等', '只要面积相等就一定全等', '必须知道三条边才可判断', '两角和一边对应相等可转化为ASA或AAS判定。', 1],
      ['证明两个三角形全等时，最关键的是？', '明确对应顶点，并逐项说明判定条件及依据', '只画出外观相似的图形', '把待证结论直接写成已知', '只说明两个三角形面积相同', '几何证明要说明对应关系并满足有效判定条件。', 0],
      ['只知道两三角形的两边和其中一条边的对角分别相等，一般不能直接用SSA判定，原因是？', '这些条件可能对应不止一种三角形形状', 'SSA必然说明两三角形面积为零', '两边长度不能用于几何判断', '角相等就说明两三角形相似但不能使用任何边', 'SSA在一般情形可能出现不同形状，不能作为普遍全等判定。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch14-reflection', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十四章 实数', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位实数章末复习；综合平方根、立方根、有理数与无理数。',
    points: [['实数分类', '实数由有理数和无理数组成，有限小数与无限循环小数为有理数。'], ['根式与估算', '利用平方、立方关系判断根的意义并估计无理数大小。']],
    questions: [
      ['下列数中属于无理数的是？', '√2', '−3', '0.25', '0.333…（循环）', '√2不能表示为两个整数之比，是无理数；循环小数是有理数。', 0],
      ['√49 的值是？', '7', '−7', '±7', '49', '√49表示49的算术平方根，取非负值7。', 1],
      ['立方根 ∛(−8) 等于？', '−2', '2', '−4', '无意义', '(−2)³=−8，因此∛(−8)=−2。', 0],
      ['比较 √10 与 3 的大小，正确的是？', '√10>3', '√10=3', '√10<3', '无法比较', '10>9且平方根函数在非负数上递增，所以√10>√9=3。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch14-exercises', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十四章 实数', section: '复习题', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位实数复习题；检查平方根、立方根、近似数和实数比较。',
    points: [['平方根与立方根', '平方根针对平方关系，立方根保留被开方数的正负信息。'], ['近似与比较', '用相邻完全平方数夹逼无理数，并按需要合理取近似值。']],
    questions: [
      ['若 x²=16，则 x 的值为？', '4 或 −4', '只有4', '只有−4', '16 或 −16', '平方为16的实数有两个，即±4。', 0],
      ['把 √30 估计到整数，结果更接近？', '5', '4', '6', '7', '25<30<36，所以5<√30<6，且√30约为5.48，更接近5。', 1],
      ['0.1010010001…（小数点后1之间的0逐渐增多）属于？', '无理数', '有限小数', '无限循环小数', '整数', '该无限小数不循环，因此不能表示为分数，是无理数。', 0],
      ['计算 |−√3| 的结果是？', '√3', '−√3', '3', '−3', '绝对值表示到0的距离，|−√3|=√3。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch15-review', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十五章 二次根式', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位二次根式章末复习；强调被开方数非负、化简及运算条件。',
    points: [['二次根式条件', '在实数范围内，根号下的被开方数须为非负数。'], ['根式运算', '先化为最简二次根式，再依据乘除和同类根式规则运算。']],
    questions: [
      ['要使 √(x−2) 在实数范围内有意义，x 应满足？', 'x≥2', 'x≤2', 'x>−2', 'x 为任意实数', '被开方数 x−2≥0，所以 x≥2。', 0],
      ['化简 √12 的结果是？', '2√3', '3√2', '√6', '12√2', '√12=√(4×3)=2√3。', 1],
      ['计算 3√2+2√2，结果为？', '5√2', '5√4', '6√2', '5√2²', '同类二次根式合并系数，3√2+2√2=5√2。', 0],
      ['若 a≥0，则 √(a²) 等于？', 'a', '±a', 'a²', '√a', '√(a²)=|a|，已知a≥0，故等于a。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch16-review', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十六章 轴对称和中心对称', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位轴对称和中心对称章末复习；考查对称性质与变换识别。',
    points: [['轴对称', '关于对称轴对称的对应点连线被对称轴垂直平分。'], ['中心对称', '关于中心对称的对应点连线经过对称中心且被其平分。']],
    questions: [
      ['点 A 与点 A′ 关于直线 l 轴对称，则直线 l 是线段 AA′ 的？', '垂直平分线', '角平分线', '中线但不一定垂直', '平行线', '轴对称对应点的连线被对称轴垂直平分。', 0],
      ['图形绕某点旋转180°后与自身重合，说明该图形具有？', '以该点为对称中心的中心对称性', '只能有轴对称性', '平移对称性', '没有任何对称性', '绕一点旋转180°重合即关于该点中心对称。', 1],
      ['关于中心 O 对称的点 P、P′满足？', 'O 是线段 PP′ 的中点', 'OP 与 OP′ 必定垂直', 'P 与 P′ 到任意直线距离相等', 'O 必须在线段外', '中心对称点连线经过对称中心，且中心是其中点。', 0],
      ['一个图形既关于某条直线轴对称，又关于某点中心对称，正确判断是？', '两种对称描述对应不同变换，需分别验证', '有轴对称就必然关于任意点中心对称', '有中心对称就必然只有一条对称轴', '两种对称的对应点关系完全相同', '轴对称与中心对称定义不同，不能仅凭一种推出另一种。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-ch17-review', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十七章 特殊三角形', section: '回顾与反思', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位特殊三角形章末复习；围绕等腰、直角三角形性质及判定。',
    points: [['等腰三角形', '等腰三角形两底角相等，顶角平分线具有对称性。'], ['直角三角形', '勾股定理联系三边长度，逆定理可判定直角。']],
    questions: [
      ['等腰三角形的顶角为40°，每个底角为？', '70°', '40°', '80°', '140°', '两底角相等且内角和为180°，每个底角=(180°−40°)/2=70°。', 0],
      ['直角三角形两条直角边长分别为6和8，斜边长为？', '10', '14', '7', '√14', '由勾股定理，斜边²=6²+8²=100，斜边长为10。', 1],
      ['三边长为5、12、13的三角形是直角三角形，因为？', '5²+12²=13²', '5+12=13', '5²+13²=12²', '三边均为奇数', '满足勾股定理逆定理，最长边13所对角为直角。', 0],
      ['等腰三角形的一个底角是50°，顶角为？', '80°', '50°', '100°', '130°', '两个底角均为50°，顶角=180°−50°−50°=80°。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-project-spaceflight', grade: '初二', subject: '数学', volume: '上册',
    chapter: '项目学习 主题探究（一）探秘中国载人航天工程中的航天技术', section: '项目学习 主题探究（一）探秘中国载人航天工程中的航天技术', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位项目学习；原创建模题要求用比例、数据和几何关系解释航天技术资料。',
    points: [['数学建模', '把真实问题抽象成变量、数量关系和可检验的数学模型。'], ['数据表达', '说明数据单位、来源和假设，并用适当图表呈现结果。']],
    questions: [
      ['制作载人飞船某部件的等比例模型，图上长度2.4厘米表示实际1.2米，比例尺是？', '1∶50', '1∶5', '1∶500', '50∶1', '1.2米=120厘米，2.4∶120=1∶50。', 0],
      ['项目组比较多次测得的舱门宽度，最应先确认？', '测量单位、测量位置和工具是否一致', '每次都要更换单位不作换算', '只选最大值作为标准', '不记录测量方法', '统一测量口径才能比较数据并控制误差。', 1],
      ['用图表呈现不同年份的发射次数变化，较合适的是？', '注明年份和单位的折线图或柱状图', '没有坐标和单位的装饰图', '只展示一个年份的圆形照片', '将次数与质量混作同一数值', '按时间比较数量变化时应使用标明坐标和单位的图表。', 0],
      ['项目模型与真实航天器存在尺寸差异，报告中应？', '说明比例尺和简化假设，并指出模型不能代表的部分', '声称模型的材料和性能与真实航天器完全相同', '隐藏比例尺让图形看起来更大', '把估算数据写成实测结果', '模型依赖比例和假设，需明确其适用范围及局限。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8a-project-design', grade: '初二', subject: '数学', volume: '上册',
    chapter: '项目学习 主题探究（二）最优设计方案', section: '项目学习 主题探究（二）最优设计方案', directoryUrl: math8a,
    evidence: '按冀教版八上目录原文定位项目学习；围绕目标约束、方案比较和最优化决策设计原创题。',
    points: [['约束条件', '实际设计需把材料、尺寸、成本和功能要求表达为约束。'], ['优化与论证', '比较可行方案的目标值，并解释选择依据和适用条件。']],
    questions: [
      ['设计长方形围栏，周长固定为40米，面积最大时长和宽应为？', '10米和10米', '12米和8米', '15米和5米', '18米和2米', '固定周长下矩形面积在正方形时最大，边长均为10米。', 0],
      ['预算不超过500元且至少需要覆盖20平方米，选择材料方案前应？', '先把预算和面积要求作为约束，再比较可行方案', '只选择单价最低而不看覆盖面积', '忽略预算后再向供应商追加费用', '用材料颜色代替面积计算', '可行方案必须同时满足资源限制与功能要求。', 1],
      ['两种设计方案都满足约束，方案甲成本420元、方案乙成本460元，若目标是降低成本，应？', '选择方案甲，并确认两者功能标准相同', '不比较成本，随机选择', '选择成本更高的方案', '把成本单位删掉再判断', '在满足相同功能条件时，成本较低的方案更符合目标。', 0],
      ['项目报告提出“方案最优”，最有说服力的依据是？', '列出约束、计算过程、比较标准和候选方案数据', '只写“我们觉得最好”', '只展示最终作品照片', '隐藏不利于结论的测量数据', '最优结论须由明确标准、可核验计算和方案比较支撑。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-math-8b-project-integrated', grade: '初二', subject: '数学', volume: '下册',
    chapter: '项目学习：主题探究（一）体育健身运动时的心率与年龄的关系；（二）如何近似计算湖面的面积；（三）八年级学生视力情况调查',
    section: '项目学习：主题探究（一）体育健身运动时的心率与年龄的关系；（二）如何近似计算湖面的面积；（三）八年级学生视力情况调查', directoryUrl: math8b,
    evidence: '按冀教版八下目录原文定位三个综合项目；考查统计抽样、近似测量、变量关系及数据伦理。',
    points: [['统计调查', '抽样方法、样本代表性和隐私保护影响调查结论质量。'], ['近似测量与模型', '把不规则图形分割或网格化，报告估算方法和误差范围。']],
    questions: [
      ['调查八年级学生视力状况，哪种抽样方式较有代表性？', '覆盖不同班级并随机抽取学生，记录抽样方法', '只调查视力较好的同一兴趣小组', '只询问调查者的亲友', '先看结果再删除不符合预期的数据', '覆盖群体差异并随机抽样有助于降低选择偏差。', 0],
      ['估算不规则湖面的面积，可把地图覆盖网格并统计格子，较合理的做法是？', '说明网格边长，统计完整格与部分格并估算误差', '只数湖岸外的格子', '不记录地图比例尺', '把每个部分格都当作完整格且不说明', '网格估算要用比例尺换算并说明边界处理和误差。', 1],
      ['研究运动心率与年龄的关系时，比较数据应尽量控制？', '运动强度、测量时点和测量方法等条件', '只控制学生姓名的书写方式', '让不同年龄组做完全不同的运动', '只挑选最高心率记录', '测量条件一致才能更合理地分析年龄与心率数据关系。', 0],
      ['发布视力调查结果时，为保护同学隐私，应？', '报告汇总统计，不公开可识别个人身份的数据', '附上每名学生姓名和具体视力', '公开病历照片让结论更可信', '把少数群体数据与姓名关联', '汇总发布并去标识化可减少个人信息暴露。', 1],
    ],
  },
]

const biology8LeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-first-aid-practice', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第四单元 疾病预防与人体健康', section: '跨学科实践活动：模拟呼吸道异物梗阻急救', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位跨学科实践；题目聚焦急救知识的安全学习、情境识别和规范演练。',
    points: [['急救学习安全', '急救实践需在教师或专业人员指导下，依据规范流程开展模拟演练。'], ['健康责任', '出现危急情况应尽快联系专业急救服务，并避免未经训练的危险操作。']],
    questions: [
      ['开展呼吸道异物梗阻急救模拟活动，首先应做到？', '由教师说明安全边界和规范流程，使用合适模型练习', '让学生相互用真实异物进行尝试', '不说明风险就进行比赛', '把模拟动作直接用于真实患者而不求助', '急救知识训练应使用模型并在受训人员指导下开展。', 0],
      ['遇到疑似严重呼吸道梗阻的真实紧急情况，学生最应优先做什么？', '立即呼叫当地急救服务并寻求受训成年人帮助', '围观拍摄并上传视频', '让患者独处等待症状自行消失', '尝试未经学习的复杂操作', '真实急症应迅速联系专业急救人员并听从规范指导。', 1],
      ['模拟急救活动结束后，检查学习效果的合适方式是？', '复盘风险识别、求助流程和每一步操作依据', '只比较谁动作最快', '把模型操作等同于真实临床处置', '忽略错误步骤以免影响成绩', '复盘依据和安全流程比单纯比速度更能巩固正确知识。', 0],
      ['教学模型与真实人体存在差异，学习者应理解？', '模型用于练习流程，真实情况需按规范评估并求助专业人员', '模型的每种操作都适用于所有真实患者', '练习过一次就可独立处理任何急症', '模型不需要教师监督', '模型用于教学演示，不能替代真实急救培训和专业判断。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-unit4-summary', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第四单元 疾病预防与人体健康', section: '单元总结', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上第四单元目录定位单元总结；综合传染病预防、免疫与健康生活。',
    points: [['疾病预防', '依据传播途径和病原体特点采取适宜的卫生与预防措施。'], ['免疫与健康', '免疫系统参与防御，健康生活和科学求助支持身心健康。']],
    questions: [
      ['预防经空气飞沫传播的传染病，较有效的组合措施是？', '保持通风、注意呼吸道卫生并按建议采取防护', '所有人共用未清洁的饮水杯', '患病时隐瞒情况并参加集体活动', '只靠一种措施应对所有病原体', '措施应针对传播途径并配合卫生习惯和适当防护。', 0],
      ['接种疫苗预防某些传染病，主要作用是？', '使机体获得针对特定病原体的免疫保护', '立即治疗所有已经发生的疾病', '替代所有卫生习惯', '保证今后不会感染任何病原体', '疫苗针对特定病原体提供免疫保护，但不能预防所有疾病。', 1],
      ['发现同学患有需要报告的传染病时，负责任的做法是？', '保护隐私并按学校和卫生部门要求及时报告、采取措施', '在网络公开姓名和诊断信息', '散布未经证实的治疗方法', '故意隐瞒并继续参加集体活动', '及时按规范报告有助于防控，同时要保护个人隐私。', 0],
      ['保持健康生活方式的意义，正确的是？', '合理作息、营养和运动有助于维持健康，但不能替代必要诊疗', '规律作息可以治愈所有传染病', '只要运动就不需要接种疫苗', '健康完全由个人意志决定', '健康受多种因素影响，生活方式有帮助但不代替医学诊治。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-seed-structure', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活 / 第一章 绿色开花植物的一生 / 第一节 种子的萌发', section: '一、种子的结构', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位种子结构；考查种皮、胚及子叶或胚乳的基本功能。',
    points: [['种子基本结构', '种子由种皮和胚等结构组成，胚将来发育为新植物体。'], ['营养储备', '子叶或胚乳储存营养，为胚萌发初期提供物质基础。']],
    questions: [
      ['种子中将来发育成新植物体的主要结构是？', '胚', '种皮', '果皮', '胚乳外壁', '胚包含幼根、胚芽、胚轴和子叶，是新植物体的幼体。', 0],
      ['种皮对种子的主要作用是？', '保护内部结构', '直接吸收土壤中的矿物质并形成叶片', '将光能转化为种子', '负责花粉传播', '种皮包在种子外部，主要起保护作用。', 1],
      ['种子萌发初期所需营养通常来自？', '子叶或胚乳中储存的营养物质', '成熟叶片的光合作用', '土壤中的石块', '种皮进行的光合作用', '幼苗尚未形成有效光合器官时利用子叶或胚乳储备。', 0],
      ['观察种子剖面时，判断胚的依据更适合是？', '找到具有幼根、胚芽等结构的幼小植物体', '把所有白色部分都称为种皮', '把种子外壳当作胚', '只凭种子大小判断胚的位置', '胚由幼根、胚芽、胚轴和子叶等部分构成。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-seed-conditions', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活 / 第一章 绿色开花植物的一生 / 第一节 种子的萌发', section: '二、种子萌发的条件', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位种子萌发条件；围绕水分、空气、适宜温度和实验控制。',
    points: [['萌发条件', '有生活力的种子萌发一般需要适量水分、充足空气和适宜温度。'], ['实验设计', '比较单一条件影响时应设置对照并控制其他变量。']],
    questions: [
      ['探究水分是否影响种子萌发，较合理的对照设置是？', '两组种子数量和其他条件相同，只让一组获得适量水分', '两组种子种类、温度和光照全都不同', '一组用活种子，另一组用煮熟的种子并改变水分', '只观察一粒种子且不记录条件', '单因素对照要使两组除水分外尽量保持相同。', 0],
      ['种子萌发通常需要的外界条件组合是？', '适量水分、充足空气和适宜温度', '大量水淹没、完全无空气和极低温', '强光照且不需要水分', '只需要土壤肥沃而无其他条件', '萌发需要水、空气和适宜温度，过量水可能导致缺氧。', 1],
      ['煮熟的种子通常不能萌发，主要原因是？', '胚已失去生活力', '种皮颜色变深', '种子没有接触阳光', '土壤中缺少花粉', '高温破坏胚的生活力，不能正常萌发。', 0],
      ['实验中若种子数量过少，最可能带来的问题是？', '偶然差异较大，结论不够稳定', '必然证明假设正确', '可以省去对照组', '会使温度自动保持恒定', '增加重复和样本量能降低偶然误差对判断的影响。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-photosynthesis-products', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活 / 第三章 植物与生物圈的碳氧平衡 / 第一节 光合作用', section: '一、光合作用的产物和条件', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位光合作用产物和条件；以淀粉检验与对照实验设问。',
    points: [['光合作用产物', '绿色植物光合作用制造有机物并释放氧气。'], ['实验条件', '光是光合作用的重要条件，可通过对照实验检验有机物形成。']],
    questions: [
      ['验证叶片在光下制造淀粉，碘液遇到含淀粉部位通常会？', '变成蓝色或蓝黑色', '保持无色且证明没有淀粉', '变成红色并证明含氧气', '立即使叶片产生种子', '碘液可用于检验淀粉，出现蓝色或蓝黑色为阳性现象。', 0],
      ['一片叶部分遮光、部分见光后检测淀粉，若只有见光部分显色，说明？', '光是该实验条件下形成淀粉的重要条件', '叶片所有部分都没有叶绿体', '遮光部分制造了更多淀粉', '碘液能使叶片进行光合作用', '遮光和见光部分形成对照，结果支持光对淀粉形成的作用。', 1],
      ['植物光合作用制造的主要有机物可概括为？', '糖类等有机物', '矿物质颗粒', '二氧化碳本身', '土壤沙粒', '光合作用利用无机物合成糖类等有机物。', 0],
      ['检测叶片淀粉前进行暗处理，主要目的是？', '消耗叶片中原有的部分淀粉储备', '让叶片立刻产生更多氧气', '去除叶片所有叶绿素', '使实验组没有任何细胞', '暗处理可减少原有淀粉对实验结果的干扰。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-photosynthesis-materials', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活 / 第三章 植物与生物圈的碳氧平衡 / 第一节 光合作用', section: '二、光合作用的原料', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位光合作用原料；围绕二氧化碳、水和实验变量设计。',
    points: [['光合作用原料', '绿色植物利用二氧化碳和水作为光合作用的原料。'], ['原料验证', '实验中改变二氧化碳供应并设置对照，可检验其对有机物形成的影响。']],
    questions: [
      ['绿色植物光合作用的主要原料是？', '二氧化碳和水', '氧气和葡萄糖', '氮气和淀粉', '矿物质和氧气', '光合作用以二氧化碳和水为原料合成有机物。', 0],
      ['用氢氧化钠溶液吸收密闭装置中的二氧化碳，实验中应设置对照的原因是？', '比较缺少二氧化碳与正常供应时有机物形成的差异', '保证两组都没有光照', '使实验不需要检测叶片', '让温度和水分不再重要', '对照组帮助判断二氧化碳供应是否影响实验结果。', 1],
      ['水分供应不足可能影响光合作用，因为水？', '是光合作用的原料之一，也影响植物正常生理活动', '是叶片制造叶绿素的唯一物质', '会直接变成土壤中的氧气', '只负责把种子固定在土壤里', '水既参与光合作用，也关系植物细胞和物质运输等生理过程。', 0],
      ['实验装置中若一组同时改变二氧化碳、光照和温度，结果不易解释，原因是？', '多个变量一起改变，无法确定是哪一因素造成差异', '变量越多结论必然越准确', '光合作用不受环境条件影响', '实验组不需要重复', '控制变量有助于把结果差异归因于所研究的因素。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-photosynthesis-location', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活 / 第三章 植物与生物圈的碳氧平衡 / 第一节 光合作用', section: '三、光合作用的场所', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位光合作用场所；联系叶绿体、叶绿素及绿色组织。',
    points: [['光合作用场所', '光合作用主要在植物细胞的叶绿体中进行。'], ['叶绿素作用', '叶绿素吸收光能，为光合作用提供能量条件。']],
    questions: [
      ['植物细胞中进行光合作用的主要场所是？', '叶绿体', '线粒体', '细胞核', '液泡', '叶绿体是绿色植物细胞进行光合作用的主要场所。', 0],
      ['叶片呈绿色与哪种结构和物质关系最密切？', '叶绿体中的叶绿素', '细胞核中的染色体', '液泡中的淀粉颗粒', '根毛中的细胞壁', '叶绿素存在于叶绿体中，使许多叶片呈绿色并吸收光能。', 1],
      ['叶片通常适合进行光合作用，主要因为？', '含有较多叶绿体并能获得光照', '所有细胞都没有细胞核', '叶片不需要水和二氧化碳', '叶片只承担吸收矿物质的功能', '叶片通常含有叶绿体且是光合作用的重要器官。', 0],
      ['同一植物的非绿色组织通常不能像绿色叶片那样进行光合作用，重要原因是？', '缺少进行光合作用所需的叶绿体或叶绿素', '不含任何细胞', '不能吸收任何物质', '一定没有线粒体', '缺少叶绿体或叶绿素会影响利用光能进行光合作用。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-hydroponics-practice', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活', section: '跨学科实践活动：制作装置，探究植物无土栽培条件的控制', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上目录原文定位无土栽培实践；综合植物必需条件、营养液配置控制和实验观察。',
    points: [['植物生长条件', '无土栽培仍须提供水、矿质营养、适宜温度和光等条件。'], ['对照与控制', '比较营养液或环境条件时，需控制其他变量并记录生长指标。']],
    questions: [
      ['植物无土栽培能正常生长，说明？', '土壤不是植物生长的唯一必需物，水和矿质营养仍须提供', '植物生长不需要水', '植物只能从土壤获得光能', '根不再需要吸收任何物质', '无土栽培用营养液等提供生长所需水分和矿质营养。', 0],
      ['比较两种营养液对幼苗生长的影响，较好的设计是？', '幼苗种类、数量和环境相同，只改变营养液并重复测量', '两组使用不同物种且放在不同温度环境', '只观察一株并凭印象判断', '同时改变光照、温度和营养液', '控制其他条件并重复测量，才能更可靠地比较营养液影响。', 1],
      ['记录无土栽培幼苗的生长情况，较合适的指标是？', '按相同时间间隔测量株高、叶片数等可比较指标', '只记录操作者的喜好', '每天更换测量工具且不校准', '只拍摄不同距离的照片', '统一指标和测量间隔便于客观比较生长变化。', 0],
      ['营养液浓度配制过高可能造成不利影响，项目中应？', '按方案测量并设置适宜范围，持续观察幼苗状态', '认为浓度越高生长一定越快', '不记录浓度和用量', '将未标识溶液交由同学饮用', '植物生长受浓度范围影响，配制和标识都要遵循实验安全要求。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8a-unit5-summary', grade: '初二', subject: '生物', volume: '上册',
    chapter: '第五单元 植物的生活', section: '单元总结', directoryUrl: biology8a,
    evidence: '按冀少版（2024）八上第五单元目录定位单元总结；整合种子萌发、植物生长和光合作用等知识。',
    points: [['植物生活过程', '种子萌发、根茎叶生长及生殖构成植物生活的重要环节。'], ['物质与能量', '光合作用制造有机物，呼吸作用释放能量，植物与环境持续交换物质。']],
    questions: [
      ['种子萌发、幼苗生长与开花结果之间的关系，正确的是？', '植物经历连续的生活过程，各阶段需要相应结构和条件', '种子萌发后不再需要根和叶', '开花结果与前期生长完全无关', '任何种子都能在任何条件下萌发', '植物各阶段相互联系，生长发育受遗传和环境条件共同影响。', 0],
      ['植物通过光合作用和呼吸作用参与生物圈物质循环，正确的是？', '光合作用固定二氧化碳并制造有机物，呼吸作用分解有机物释放能量', '两者都是只吸收氧气且不产生任何物质', '呼吸作用只在夜间发生', '光合作用不需要光能', '光合作用与呼吸作用在物质转化和能量变化上各有作用。', 1],
      ['叶片制造的有机物可以支持植物其他器官的生长，主要因为？', '有机物可通过植物体内运输系统运往其他部位', '叶片会把有机物变成土壤', '植物各器官彼此没有联系', '只有花能获得有机物', '植物体内物质运输使叶片制造的有机物可被其他器官利用。', 0],
      ['综合解释一株植物生长不良的原因，最合适的思路是？', '分别检查水、光、温度、矿质营养和生物因素等证据', '只凭叶片颜色确定唯一原因', '认定植物一定缺少土壤', '不观察环境条件直接更换品种', '植物生长受多因素影响，需要结合观察和实验逐项分析。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8b-geologic-time-model', grade: '初二', subject: '生物', volume: '下册',
    chapter: '第六单元 生物的遗传与进化', section: '跨学科实践活动：制作地质年代模型，展现生物进化历程', directoryUrl: biology8b,
    evidence: '按冀少版（2024）八下目录原文定位地质年代模型实践；结合化石证据、地层顺序和时间比例表达。',
    points: [['进化证据', '化石和地层等证据帮助认识生物演化及其时间顺序。'], ['模型表达', '时间轴模型需说明比例尺、关键事件来源和简化之处。']],
    questions: [
      ['制作地质年代时间轴模型，比例尺最主要的作用是？', '把漫长地质时间按统一尺度转换为可表示的长度', '证明所有生物同时出现', '替代化石和地层证据', '表示生物体的实际体积', '比例尺使不同时间跨度能够在同一模型中按比例呈现。', 0],
      ['在未受明显扰动的沉积地层中，较深层通常形成得？', '较早，但需结合地层是否完整和是否被扰动判断', '较晚且无需任何条件', '与较浅层一定同一时间', '只能由现代生物形成', '地层叠覆关系可帮助判断相对先后，但需检查地质扰动。', 1],
      ['化石记录能为生物进化研究提供什么？', '过去生物形态及其在地层中出现的历史证据', '每个古代个体的完整生活经历', '生物演化的全部遗传信息', '所有物种从未发生变化的证明', '化石提供形态和地质背景证据，但并不包含每个个体的全部信息。', 0],
      ['模型把数百万年压缩到一米长的纸带，报告中应？', '标出时间尺度和取舍依据，避免把示意长度当真实时间间隔', '省略比例尺以免看出误差', '把所有事件等距排列', '把估算的年代写成无误差精确值', '时间模型是按比例的简化表示，须说明尺度和资料不确定性。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8b-biotic-factors', grade: '初二', subject: '生物', volume: '下册',
    chapter: '第七单元 生物与环境 / 第一章 生态系统 / 第二节 生物对生物和环境的影响', section: '一、生物因素对生物的影响', directoryUrl: biology8b,
    evidence: '按冀少版（2024）八下目录原文定位生物因素；考查种间关系及通过对照观察分析种群变化。',
    points: [['生物因素', '食物、竞争、捕食和寄生等生物之间关系会影响生物生存。'], ['生态观察', '解释种群变化需区分生物因素与温度、水分等非生物因素。']],
    questions: [
      ['田间害虫数量下降后，捕食这些害虫的鸟类数量也可能变化，体现？', '生物之间的捕食关系会影响种群数量', '生物数量永远互不影响', '只有温度能改变种群数量', '鸟类与害虫属于同一物种', '捕食关系会影响捕食者和被捕食者的数量变化。', 0],
      ['两种植物争夺相同的光照和水分，最可能体现的关系是？', '竞争', '互利共生必然', '捕食', '寄生', '不同生物利用相同且有限的资源时可能发生竞争。', 1],
      ['观察昆虫数量变化时，除食物变化外还应记录？', '温度、降水和栖息地等环境条件', '观察者的座位颜色', '无关地点的交通情况', '只记录数量最高的一天', '非生物环境也会影响昆虫数量，需结合多项因素分析。', 0],
      ['关于生物因素影响种群数量，正确的研究结论应？', '依据连续观察或对照实验，并说明结论适用范围', '凭一次偶然观察断定普遍规律', '把相关关系直接说成唯一因果', '忽略不符合预期的数据', '可靠解释需要证据、对照和对适用范围的说明。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8b-adaptation-impact', grade: '初二', subject: '生物', volume: '下册',
    chapter: '第七单元 生物与环境 / 第一章 生态系统 / 第二节 生物对生物和环境的影响', section: '二、生物对环境的适应和影响', directoryUrl: biology8b,
    evidence: '按冀少版（2024）八下目录原文定位生物对环境的适应和影响；区分适应特征与环境作用。',
    points: [['适应环境', '适应特征有利于生物在特定环境中生存和繁殖。'], ['生物影响环境', '生物活动也会改变环境，影响程度需依据具体生态证据判断。']],
    questions: [
      ['沙漠植物叶片退化为刺状可能有助于？', '减少水分散失，适应干旱环境', '增加叶片蒸腾以储存水分', '使植物不再需要光合作用', '保证植物不受任何天敌影响', '叶片缩小可减少蒸腾面积，是干旱环境中的适应特征之一。', 0],
      ['下列关于适应的表述较科学的是？', '适应特征是在特定环境中有利于生存和繁殖的特征', '生物会因需要而在一生中定向产生遗传新器官', '一种特征在所有环境中都最有利', '个体适应环境就意味着环境不能改变', '适应具有环境关联性，不同环境中的有利特征可能不同。', 1],
      ['植物根系生长可能改变土壤结构，这体现？', '生物能够对环境产生影响', '只有非生物因素会影响生态系统', '土壤结构与生物完全无关', '植物只适应环境而不会改变环境', '生物既适应环境，也可能通过生命活动影响环境。', 0],
      ['调查某种生物是否适应当地环境，较合理的做法是？', '比较其结构、行为与当地条件，并收集生存繁殖证据', '只凭外观颜色作结论', '认定观察一次就能证明适应', '忽略其他可能影响生存的因素', '适应判断需要将特征与环境条件及生存证据联系起来。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8b-pollution-practice', grade: '初二', subject: '生物', volume: '下册',
    chapter: '第七单元 生物与环境', section: '跨学科实践活动：设计制作装置，探究某种环境污染的成因', directoryUrl: biology8b,
    evidence: '按冀少版（2024）八下目录原文定位污染成因探究实践；要求安全取样、控制变量和记录数据。',
    points: [['污染探究', '研究污染成因要明确问题、观察指标、对照条件和数据来源。'], ['实验安全', '不接触来源不明的污染物，按教师指导使用安全替代材料和防护。']],
    questions: [
      ['设计模拟水体污染实验时，首先要保证？', '使用安全替代材料并在教师指导下规范操作', '直接取用不明工业废水开展课堂实验', '不做风险评估就让学生嗅闻样品', '将实验液倒入自然水体观察影响', '课堂探究需控制风险，未知污染物应避免直接接触和排放。', 0],
      ['比较某种污染物浓度对植物生长的影响，较合理的设计是？', '设置不同浓度处理和清水对照，其他条件尽量相同', '每组使用不同植物、光照和温度', '只观察一株处理植物', '改变浓度同时改变浇水量且不记录', '对照与变量控制使不同处理间结果更可解释。', 1],
      ['观察污染模拟实验对植物的影响，可选择的量化指标是？', '定时测量株高、叶片数或叶片状态并记录', '只写“看起来不好”', '用不同时间拍摄且不标注尺度', '记录实验者对颜色的喜好', '量化且定时记录有助于重复比较和分析。', 0],
      ['由模拟实验推断真实生态环境污染成因时，应？', '说明模型限制，并结合现场数据和其他来源验证', '把模型结果直接当作真实环境的完整结论', '忽略污染物在自然界中的迁移差异', '只保留支持预设结论的结果', '模型只能简化真实环境，结论需用现场证据和其他资料核验。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g8-biology-8b-unit7-summary', grade: '初二', subject: '生物', volume: '下册',
    chapter: '第七单元 生物与环境', section: '单元总结', directoryUrl: biology8b,
    evidence: '按冀少版（2024）八下第七单元目录定位单元总结；整合生态系统组成、关系、物质循环和生态安全。',
    points: [['生态系统', '生态系统由生物成分和非生物环境构成，生物之间存在多种联系。'], ['生态安全', '保护生态系统需综合考虑物种、环境、资源利用和人类活动。']],
    questions: [
      ['一个池塘生态系统包括哪些基本部分？', '生物成分和水、阳光、空气等非生物环境', '只有鱼类和水草', '只有水和泥沙', '只有生产者而无消费者和分解者', '生态系统包括生物群落及其生活的非生物环境。', 0],
      ['食物链“草→兔→鹰”中，箭头通常表示？', '物质和能量流动的方向，即被吃与捕食的关系方向', '动物奔跑的方向', '生物进化的年代顺序', '个体迁徙方向', '食物链箭头从被捕食者指向捕食者，表示物质和能量流动方向。', 1],
      ['生态系统中能量沿食物链传递时，通常会？', '逐级减少，部分能量以热等形式散失', '逐级增加且没有损失', '只在分解者体内循环而不传递', '完全不受生物活动影响', '能量传递存在损耗，营养级越高可利用能量通常越少。', 0],
      ['评价一项开发活动是否影响区域生态安全，较全面的做法是？', '调查物种、栖息地、水土和人类利用等多方面变化', '只统计项目建设速度', '只看一个物种某一天的数量', '不收集开发前后的资料', '生态安全评估需要多指标、跨时间并结合区域背景。', 1],
    ],
  },
]

type English9bUnitSeed = {
  title: string
  topic: string
  words: Array<[string, string]>
  passage: string
  readingQuestions: CatalogLeafQuestion[]
}

const english9bUnits: English9bUnitSeed[] = [
  {
    title: 'Unit 1 Let’s Celebrate!', topic: 'celebrations and traditions',
    words: [
      ['celebration', 'an event or activity held to mark a special occasion'], ['festival', 'a special day or period celebrated by a community'],
      ['tradition', 'a custom continued by people over a long time'], ['reunion', 'a meeting of people who have been apart'],
      ['symbol', 'a sign or object that represents an idea'], ['lantern', 'a portable light with a protective covering'],
      ['custom', 'a usual way of behaving in a particular society'], ['lunar', 'related to the moon'],
      ['admire', 'to respect or enjoy someone or something'], ['wish', 'a hope for something good to happen'],
    ],
    passage: 'Mina’s grandparents live far away. Every Spring Festival, the family calls them before dinner. They prepare a small lantern together because its light reminds them of hope and reunion.',
    readingQuestions: [
      ['Why does the family call Mina’s grandparents before dinner?', 'They live far away, so the call helps the family share the celebration', 'They want to cancel the festival', 'They need to borrow a lantern', 'They are studying the moon'],
      ['What does the lantern remind the family of?', 'Hope and reunion', 'A history test', 'A museum visit', 'A recycling plan'],
      ['When does the family call the grandparents?', 'Before dinner during the Spring Festival', 'After a school exhibition', 'Every morning before class', 'Only when the lantern is broken'],
      ['Which detail shows that the family values staying connected?', 'They call the grandparents who live far away', 'They leave the dinner unfinished', 'They stop preparing the lantern', 'They avoid sharing the celebration'],
    ].map(([prompt, answer, wrong1, wrong2, wrong3]) => [`${'Read the passage: '}${'Mina’s grandparents live far away. Every Spring Festival, the family calls them before dinner. They prepare a small lantern together because its light reminds them of hope and reunion.'}\n${prompt}`, answer, wrong1, wrong2, wrong3, '根据短文中的时间、人物和细节作答。', 1] as CatalogLeafQuestion),
  },
  {
    title: 'Unit 2 A Look into the Past', topic: 'history and the past',
    words: [
      ['past', 'the time before the present'], ['ancient', 'belonging to a very distant time in history'],
      ['artifact', 'an object made or used by people in the past'], ['history', 'the study of past events and people'],
      ['evidence', 'facts or objects that help show whether something is true'], ['record', 'to write down or preserve information'],
      ['research', 'careful study to discover facts about a subject'], ['dynasty', 'a series of rulers from the same family'],
      ['monument', 'a building or structure that remembers an event or person'], ['historian', 'a person who studies and writes about the past'],
    ],
    passage: 'A class visited a local museum. They compared an old map with objects found nearby. The guide explained that one object alone cannot tell the whole story, so researchers use several kinds of evidence.',
    readingQuestions: [
      ['What did the students compare at the museum?', 'An old map and objects found nearby', 'Two modern shopping lists', 'A lantern and a recipe', 'Two future plans'],
      ['Why do researchers use several kinds of evidence?', 'One object alone may not tell the whole story', 'Maps cannot show any places', 'Museums do not keep objects', 'The past has no connection to evidence'],
      ['Where did the class learn about the objects?', 'At a local museum', 'At a sports center', 'In a recycling factory', 'At a graduation party'],
      ['Which skill did the students practise?', 'Comparing sources to learn about the past', 'Guessing without checking', 'Changing the objects', 'Memorizing a future schedule'],
    ].map(([prompt, answer, wrong1, wrong2, wrong3]) => [`Read the passage: A class visited a local museum. They compared an old map with objects found nearby. The guide explained that one object alone cannot tell the whole story, so researchers use several kinds of evidence.\n${prompt}`, answer, wrong1, wrong2, wrong3, '短文指出学生比较地图和实物，并说明多种史料互证的作用。', 1] as CatalogLeafQuestion),
  },
  {
    title: 'Unit 3 A Taste of Art', topic: 'art and creative expression',
    words: [
      ['artwork', 'a painting, drawing, sculpture, or other work of art'], ['artist', 'a person who creates works of art'],
      ['portrait', 'a picture of a person, especially the face'], ['sculpture', 'a work of art made by shaping a material'],
      ['exhibition', 'a public display of works or objects'], ['gallery', 'a place where works of art are shown'],
      ['admire', 'to look at something with pleasure or respect'], ['creative', 'using imagination to make something new'],
      ['masterpiece', 'a work considered an artist’s finest or most important'], ['traditional', 'connected with customs or styles passed down over time'],
    ],
    passage: 'The school gallery displayed portraits made by students. Visitors left notes about the colors and feelings in each picture. The artists later revised the labels so viewers could better understand their ideas.',
    readingQuestions: [
      ['What did the school gallery display?', 'Portraits made by students', 'Historical maps from the museum', 'Household recycling bins', 'A list of graduation goals'],
      ['What did visitors write notes about?', 'The colors and feelings in each picture', 'The cost of school uniforms', 'The history of a river', 'The number of lanterns'],
      ['Why did the artists revise the labels?', 'To help viewers understand their ideas better', 'To hide the pictures', 'To change the gallery location', 'To stop visitors from reading'],
      ['Which activity is part of sharing art with an audience?', 'Explaining the ideas behind a work', 'Removing every label', 'Ignoring audience questions', 'Replacing the pictures with test scores'],
    ].map(([prompt, answer, wrong1, wrong2, wrong3]) => [`Read the passage: The school gallery displayed portraits made by students. Visitors left notes about the colors and feelings in each picture. The artists later revised the labels so viewers could better understand their ideas.\n${prompt}`, answer, wrong1, wrong2, wrong3, '短文说明展品、观众反馈和艺术家修改说明文字的原因。', 1] as CatalogLeafQuestion),
  },
  {
    title: 'Unit 4 Reduce, Reuse, Recycle', topic: 'reducing waste and recycling',
    words: [
      ['reduce', 'to make something smaller in amount or size'], ['reuse', 'to use something again instead of throwing it away'],
      ['recycle', 'to process used materials so they can be used again'], ['waste', 'materials or things that are no longer wanted'],
      ['resource', 'a useful supply of something'], ['material', 'the substance used to make something'],
      ['reusable', 'able to be used again'], ['pollution', 'harmful substances or effects in the environment'],
      ['sort', 'to put things into groups by type'], ['environment', 'the natural world and the conditions around us'],
    ],
    passage: 'At lunch, students sorted paper, cans, and food waste into separate bins. Their class reused clean jars as plant pots. They learned that recycling works best when people first reduce what they buy.',
    readingQuestions: [
      ['What did the students do with clean jars?', 'They reused them as plant pots', 'They mixed them with food waste', 'They threw them into the river', 'They used them as paper'],
      ['Why did the students sort the waste?', 'To put different materials into separate groups', 'To make every item become food', 'To stop the class from buying anything', 'To mix cans and paper together'],
      ['According to the passage, what should people do before relying on recycling?', 'Reduce what they buy', 'Buy more single-use items', 'Avoid sorting materials', 'Throw away reusable jars'],
      ['Which materials are mentioned as separate waste types?', 'Paper, cans, and food waste', 'Glass, books, and clothes only', 'Water, air, and sunlight', 'Paintings, maps, and portraits'],
    ].map(([prompt, answer, wrong1, wrong2, wrong3]) => [`Read the passage: At lunch, students sorted paper, cans, and food waste into separate bins. Their class reused clean jars as plant pots. They learned that recycling works best when people first reduce what they buy.\n${prompt}`, answer, wrong1, wrong2, wrong3, '短文按分类、重复利用和减少购买说明减废行动。', 1] as CatalogLeafQuestion),
  },
  {
    title: 'Unit 5 Open to New Beginnings', topic: 'new beginnings and future plans',
    words: [
      ['beginning', 'the time when something starts'], ['goal', 'something a person hopes to achieve'],
      ['milestone', 'an important event or stage in progress'], ['prepare', 'to make plans or arrangements for something'],
      ['confidence', 'a feeling of trust in one’s own ability'], ['challenge', 'a difficult task that tests ability'],
      ['skill', 'the ability to do something well'], ['opportunity', 'a situation that makes it possible to do something'],
      ['choice', 'an act of selecting between possibilities'], ['future', 'the time that is to come'],
    ],
    passage: 'Before graduation, Lina wrote three goals for the next year. She asked a teacher about different courses and practised speaking in public. After learning what she enjoyed, she revised her plan.',
    readingQuestions: [
      ['What did Lina write before graduation?', 'Three goals for the next year', 'A list of museum artifacts', 'A recycling report', 'A festival menu'],
      ['Why did Lina revise her plan?', 'She learned more about what she enjoyed', 'She lost the course list', 'The teacher cancelled graduation', 'She stopped practising'],
      ['Who did Lina ask about different courses?', 'A teacher', 'A museum guide', 'A gallery visitor', 'A festival host'],
      ['Which action helped Lina prepare for the future?', 'She explored courses and practised speaking', 'She avoided setting goals', 'She copied another person’s plan', 'She stopped learning after graduation'],
    ].map(([prompt, answer, wrong1, wrong2, wrong3]) => [`Read the passage: Before graduation, Lina wrote three goals for the next year. She asked a teacher about different courses and practised speaking in public. After learning what she enjoyed, she revised her plan.\n${prompt}`, answer, wrong1, wrong2, wrong3, '短文根据目标、咨询、练习和调整计划等信息作答。', 1] as CatalogLeafQuestion),
  },
]

const english9bSectionPaths = [
  'Section A / 1a–1d', 'Section A / 2a–2d', 'Section A / 3a–3d', 'Section A / Grammar Focus',
  'Section B / 1a–1f', 'Section B / Vocabulary in Use', 'Section B / 3a–3c', 'Project', 'Reading Plus', '单元综合与测试',
]

const english9bGrammarChecks: CatalogLeafQuestion[] = [
  ['Choose the correct sentence.', 'The celebration begins at sunset.', 'The celebration begin at sunset.', 'The celebration are begin at sunset.', 'The celebration beginning at sunset.', '第三人称单数主语的一般现在时谓语加-s。', 0],
  ['Choose the correct sentence.', 'Old photographs are kept in the museum.', 'Old photographs is kept in the museum.', 'Old photographs are keep in the museum.', 'Old photographs kept in the museum by every day.', '复数主语的被动语态使用 are 加过去分词。', 0],
  ['Choose the correct sentence.', 'She has collected postcards for years.', 'She have collected postcards for years.', 'She has collect postcards for years.', 'She collecting postcards for years.', '现在完成时中第三人称单数主语用 has 加过去分词。', 0],
  ['Choose the correct sentence.', 'If we reuse the jars, we will reduce waste.', 'If we reuses the jars, we will reduce waste.', 'If we reused the jars, we will reduces waste.', 'If we reuse the jars, we reduced waste tomorrow.', '真实条件句中 if 从句用一般现在时，主句可用 will 加动词原形。', 0],
  ['Choose the correct sentence.', 'The artist who designed the poster is our classmate.', 'The artist which designed the poster is our classmate.', 'The artist who design the poster are our classmate.', 'The artist designed who the poster is our classmate.', '先行词指人时，定语从句可用 who 引导。', 0],
  ['Choose the correct sentence.', 'We decided to visit the exhibition.', 'We decided visiting to the exhibition.', 'We decide to visited the exhibition.', 'We decided visit the exhibition yesterday.', 'decide 后常接不定式 to do。', 0],
  ['Choose the correct sentence.', 'Although the task was difficult, the team finished it.', 'Although the task was difficult, but the team finished it.', 'Although the task difficult, the team finishes it yesterday.', 'The team finished it although but difficult.', 'although 引导让步状语从句时，主句前不再使用 but。', 0],
  ['Choose the correct sentence.', 'This route is safer than the old one.', 'This route is safest than the old one.', 'This route is more safer than the old one.', 'This route is safe than the old one.', '比较级 safer 后用 than，不能再加 more。', 0],
  ['Choose the correct sentence.', 'Many customs have changed over time.', 'Much customs has changed over time.', 'Many custom have change over time.', 'Many customs is changed over time.', 'many 修饰可数名词复数，主语 customs 与 have 搭配。', 0],
  ['Choose the correct sentence.', 'The students were talking when the bell rang.', 'The students was talking when the bell rang.', 'The students were talk when the bell rang.', 'The students talked when the bell was ring.', '过去进行时表示过去某时正在进行的动作，结构为 were doing。', 0],
]

const english9bLeafRebuilds: CatalogLeafSeed[] = english9bUnits.flatMap((unit, unitIndex) =>
  english9bSectionPaths.map((path, sectionIndex) => {
    const word = unit.words[sectionIndex]
    const distractors = [unit.words[(sectionIndex + 1) % 10][0], unit.words[(sectionIndex + 2) % 10][0], unit.words[(sectionIndex + 3) % 10][0]]
    const vocabularyQuestion: CatalogLeafQuestion = [
      `Which word best matches this meaning in the context of ${unit.topic}: “${word[1]}”?`,
      word[0], distractors[0], distractors[1], distractors[2],
      `本题按单词释义选择：${word[0]} 表示“${word[1]}”。`, 0,
    ]
    const parts = `${unit.title} / ${path}`.split(' / ')
    const grammar = english9bGrammarChecks[(unitIndex + sectionIndex) % english9bGrammarChecks.length]
    const reading = unit.readingQuestions[(sectionIndex + unitIndex) % unit.readingQuestions.length]
    const skillQuestions: CatalogLeafQuestion[] = [
      ['When listening to a short talk about this celebration, what should you note first?', 'The main event and one supporting detail', 'Every word spoken, even when it is unclear', 'Only the speaker’s accent', 'An unrelated personal story', '听力先抓主题和关键信息，再核对细节。', 1],
      ['After a dialogue about the past, which response shows active listening?', 'Ask a relevant question about the evidence mentioned', 'Change the subject without replying', 'Repeat an unverified date as a fact', 'Ignore the other speaker', '追问相关证据能体现理解并推动交流。', 1],
      ['When reading a short text about art, the best first step is to?', 'Identify the main idea before checking details', 'Translate every word before noticing the topic', 'Read only the final punctuation mark', 'Ignore the title and paragraph', '先把握主旨，再定位细节信息。', 1],
      ['When checking a grammar example, you should?', 'Read the whole sentence and check how the form works in context', 'Choose a form without reading the subject', 'Copy a rule without looking at examples', 'Ignore the meaning of the sentence', '语法形式需要结合主语和语境判断。', 1],
      ['While listening to a discussion about recycling, which note is most useful?', 'The problem, the suggested action, and one reason', 'The color of the classroom wall', 'A guess about the speaker’s age', 'A word unrelated to the discussion', '记录问题、建议和理由有助于复述听力内容。', 1],
      ['To learn a new word from a sentence, first use?', 'The surrounding words and the sentence meaning', 'The number of letters alone', 'A random translation unrelated to context', 'The punctuation mark only', '结合上下文推断词义，再用词典核对。', 1],
      ['Which order makes a short paragraph about a future plan easiest to follow?', 'Goal, supporting steps, and a concluding sentence', 'Conclusion, unrelated details, and a missing topic', 'Three repeated topic sentences', 'A list of words with no links', '清楚的段落通常先提出主题，再用细节支撑并收束。', 1],
      ['When planning a class project about this unit topic, the group should first?', 'Agree on a question, roles, sources, and a schedule', 'Start collecting unrelated pictures', 'Let one student do every task without a plan', 'Present results before gathering information', '项目应先明确问题、分工、资料来源和时间安排。', 1],
      ['When reading an extra passage, how can you infer an unfamiliar word?', 'Use nearby clues and then check whether the meaning fits', 'Select the longest option automatically', 'Skip every sentence around it', 'Assume it has the same meaning as a similar-looking word', '可结合语境线索推断词义，并检查是否符合上下文。', 1],
      ['Before choosing an answer in a unit review, it is best to?', 'Check the key detail and make sure the choice answers the question', 'Choose the first familiar word', 'Ignore the question stem', 'Change answers only because a friend did', '综合题应回到题干和关键信息核对答案。', 1],
    ]
    const skill = skillQuestions[sectionIndex]
    const grammarQuestion: CatalogLeafQuestion = [`${grammar[0]} (${unit.topic})`, grammar[1], grammar[2], grammar[3], grammar[4], grammar[5], grammar[6]]
    return {
      id: `leaf-rebuild-2026-g9-english-9b-unit${unitIndex + 1}-section${sectionIndex + 1}`,
      grade: '初三', subject: '英语', volume: '下册', chapter: parts.slice(0, -1).join(' / '), section: parts[parts.length - 1],
      directoryUrl: english9b,
      evidence: '按人教版（2024）九年级下册现行目录的单元和栏目原文定位；题目为围绕节日、历史、艺术、环保或成长主题原创编写。',
      points: [['Vocabulary and language use', `结合${unit.topic}理解词义、句子结构和语境。`], ['Reading and communication', '练习抓主旨、找细节、表达观点和完成任务。']],
      questions: [vocabularyQuestion, grammarQuestion, reading, skill],
    }
  }),
)

const english9bDramaLeafRebuilds: CatalogLeafSeed[] = [
  {
    id: 'leaf-rebuild-2026-g9-english-9b-drama-deer', grade: '初三', subject: '英语', volume: '下册',
    chapter: 'Drama（选学）', section: 'The Nine-Coloured Deer', directoryUrl: english9b,
    evidence: '按人教版（2024）九下选学戏剧目录定位《The Nine-Coloured Deer》；原创题关注人物动机、舞台提示与主题。',
    points: [['Drama reading', '结合人物语言、舞台提示和情节变化理解戏剧。'], ['Theme and evidence', '从角色选择和后果中提炼主题，并用文本细节说明。']],
    questions: [
      ['When reading a scene in The Nine-Coloured Deer, what can a stage direction help the reader understand?', 'How a character moves or feels on stage', 'The exact price of every costume', 'The story’s real-world publication date', 'A fact that the dialogue never supports', '舞台提示帮助理解动作、语气和场景。', 0],
      ['Which action best supports a discussion of a character’s motivation?', 'Use the character’s words and choices as evidence', 'Guess only from the character’s name', 'Ignore what happens in the scene', 'Copy another reader’s opinion', '人物动机应由言行和情节证据支持。', 1],
      ['In a play, a change in a character’s decision often helps develop?', 'The conflict and the theme', 'The page number only', 'The spelling of every word', 'The size of the stage', '人物选择的变化推动冲突并呈现主题。', 0],
      ['When performing a scene, the actors should?', 'Use dialogue and stage directions to guide voice and movement', 'Read every line in the same tone', 'Remove the conflict from the scene', 'Ignore the other characters', '表演需结合台词和舞台提示设计语气与动作。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-english-9b-drama-necklace', grade: '初三', subject: '英语', volume: '下册',
    chapter: 'Drama（选学）', section: 'The Necklace', directoryUrl: english9b,
    evidence: '按人教版（2024）九下选学戏剧目录定位《The Necklace》；原创题考查情节因果、人物选择与戏剧效果。',
    points: [['Plot and character', '根据冲突、人物选择及后果梳理戏剧情节。'], ['Interpretation', '联系结局和前文线索理解反讽或主题，避免脱离文本猜测。']],
    questions: [
      ['To explain why a character makes a choice in The Necklace, a reader should?', 'Connect the choice with the character’s words and the events before it', 'Use only the title and ignore the scenes', 'Assume every character has the same motive', 'Choose an explanation without evidence', '解释人物选择需联系前文情节和角色言行。', 0],
      ['A surprising ending is most effective when it?', 'Changes how the audience understands earlier events', 'Repeats the opening without adding meaning', 'Introduces details unrelated to the plot', 'Hides every character’s choice', '反转结局会促使观众重新理解前文线索。', 1],
      ['When a character’s words differ from what the audience knows, the play may create?', 'Dramatic irony', 'A shopping list', 'A change of tense only', 'A stage direction with no effect', '观众掌握的信息与角色不同可能形成戏剧反讽。', 0],
      ['Which is the strongest way to support an interpretation of the play?', 'Point to a line or action and explain how it supports the idea', 'Say “I just know” without evidence', 'Use a scene from another story', 'Ignore the ending', '文本细节加解释可以支撑对戏剧的理解。', 1],
    ],
  },
  {
    id: 'leaf-rebuild-2026-g9-english-9b-whole-book', grade: '初三', subject: '英语', volume: '下册',
    chapter: '本册综合', section: '本册综合', directoryUrl: english9b,
    evidence: '按人教版（2024）九下目录定位本册综合；原创综合题覆盖节日文化、历史阅读、艺术、环境行动和成长规划。',
    points: [['Integrated language skills', '综合运用词汇、语法、听读策略和书面表达。'], ['Cross-cultural communication', '交流文化与公共议题时应理解语境、尊重差异并核实信息。']],
    questions: [
      ['A class is writing about a local festival for international visitors. Which plan is clearest?', 'Explain when it happens, describe two customs, and give their meaning', 'List unfamiliar words without explanation', 'Write only the writer’s favorite food', 'Copy a rumor about the festival', '面向跨文化读者应交代时间、习俗和意义。', 0],
      ['When using a source for a short report about the past, students should?', 'Check who published it and compare important facts with another reliable source', 'Use the first result without checking', 'Remove the date and author', 'Treat every online post as a primary source', '核对发布者并交叉验证可提高资料可靠性。', 1],
      ['Which sentence gives a practical environmental suggestion?', 'Our class can reuse clean jars and sort paper for recycling.', 'Our class should mix all waste together.', 'Our class can ignore the amount of waste.', 'Our class must throw reusable items away.', '具体、可执行的行动建议更适合环保主题表达。', 0],
      ['A paragraph about a future goal is easiest to follow when it includes?', 'A clear goal, reasons or steps, and a concluding idea', 'Several unrelated sentences', 'Only a list of difficult words', 'A conclusion before the topic is introduced', '段落应围绕明确主题组织理由和步骤。', 1],
    ],
  },
]

export const textbookGapRebuildSets: PracticeSet[] = [
  ...chinese7aLeafRebuilds.map(makeSet),
  ...chinese7bLeafRebuilds.map(makeSet),
  ...english7aLeafRebuilds.map(makeSet),
  ...english7aSupplementLeafRebuilds.map(makeSet),
  ...english7bLeafRebuilds.map(makeSet),
  ...politics7aLeafRebuilds.map(makeSet),
  ...history7LeafRebuilds.map(makeSet),
  ...geography7LeafRebuilds.map(makeSet),
  ...math7LeafRebuilds.map(makeSet),
  ...biology7LeafRebuilds.map(makeSet),
  ...chinese8aLeafRebuilds.map(makeSet),
  ...chinese8bLeafRebuilds.map(makeSet),
  ...english8ProjectLeafRebuilds.map(makeSet),
  ...english8bSupplementLeafRebuilds.map(makeSet),
  ...physics8aLeafRebuilds.map(makeSet),
  ...physics8bLeafRebuilds.map(makeSet),
  ...politics8aLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...history8LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...geography8LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...math8LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...biology8LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...math9LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...history9LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...politics9aLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...politics9bLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...english9aAppendixLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...physics9LeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...chemistry9aLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...chemistry9bLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...chinese9aLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...chinese9bLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...english9aAppendixLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...english9bLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  ...english9bDramaLeafRebuilds.map(makeCatalogLeaf).map(makeSet),
  makeSet({
    id: 'gap-rebuild-2026-chinese-9b-yinfu-poem', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第一单元 / 阅读', section: '2* 啊，我们踯躅于黑暗的丛林里！/ 殷夫',
    directoryUrl: chinese9b,
    evidence: ['新版目录将该篇列为九年级下册第一单元阅读篇目，作者署名为殷夫。', '按题目语义考查“踯躅”、第一人称复数和意象推断；不把题目推断冒充为诗句原文。'],
    points: [
      ['题目词义', '结合语境理解“踯躅”所表达的行走状态。'],
      ['意象与表达', '从标题中的词语组合推断作品所营造的处境和情感。'],
    ],
    questions: [
      { prompt: '《啊，我们踯躅于黑暗的丛林里！》的作者是下列哪一位？', options: ['殷夫', '巴金', '舒婷', '阿城'], answerIndex: 0, explanation: '现行九年级下册目录在篇名后标注作者为殷夫。', point: 0 },
      { prompt: '结合标题，“踯躅”最接近下面哪种意思？', options: ['徘徊，缓慢地走', '迅速奔跑', '高声呼喊', '安然休息'], answerIndex: 0, explanation: '“踯躅”指徘徊或慢步行走，带有行进不易、迟疑沉重的意味。', point: 0 },
      { prompt: '标题使用“我们”而不是“我”，最直接的表达效果是什么？', options: ['把表达视角扩展为共同经历者的声音', '说明诗歌只描写一个人的日常旅行', '把作品改成第三人称叙事', '表示叙述者不参与作品情境'], answerIndex: 0, explanation: '“我们”是第一人称复数，容易形成共同处境、共同发声的效果。', point: 1 },
      { prompt: '仅根据标题中的“踯躅”和“黑暗的丛林”，哪种理解最稳妥？', options: ['行进者面对复杂艰难的处境，前路并不明朗', '人物正在明亮花园中轻松漫步', '标题明确交代了真实森林的地理位置', '作品写的是一次没有阻碍的郊游'], answerIndex: 0, explanation: '“踯躅”与“黑暗”共同提示行进艰难和环境复杂；仅凭标题不能推出具体地点或完整情节。', point: 1 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-chinese-9b-bajin-youth', grade: '初三', subject: '语文', volume: '下册',
    chapter: '第二单元 / 阅读', section: '7* 我是青年 / 巴金',
    directoryUrl: chinese9b,
    evidence: ['新版目录将该篇列为九年级下册第二单元阅读篇目，作者署名为巴金。', '参考本篇现行课件索引：https://jx.panqjy.cn/kejian/yuwen/czrjbbbjnjxc-c4098898/；据巴金小说《家》中觉慧相关情节核对人物与主题，题目只作必要的短语转述。'],
    points: [
      ['人物与文本', '识别巴金《家》中觉慧的青年形象及其表达。'],
      ['反复与语气', '体会反复表达中人物心理由摇摆走向坚定的变化。'],
      ['作品主题', '理解青年对自主生活和个人幸福的追求。'],
    ],
    questions: [
      { prompt: '《我是青年》篇名后的作者署名是谁？', options: ['巴金', '鲁迅', '曹禺', '阿城'], answerIndex: 0, explanation: '现行九年级下册目录在篇名后标注作者为巴金。', point: 0 },
      { prompt: '联系巴金小说《家》中的相关情节，文中“我”对应的人物是？', options: ['高觉慧', '高觉新', '高觉民', '冯乐山'], answerIndex: 0, explanation: '《家》中反复确认“我是青年”并追求自主生活的是高觉慧。', point: 0 },
      { prompt: '若节选中同一句自我确认先后带有迟疑、愤激、领悟和坚定等语气，反复的主要作用是？', options: ['呈现人物心理变化并强化自我确认', '说明人物忘记了前文内容', '把人物对话变成客观说明', '削弱句子与人物情绪的联系'], answerIndex: 0, explanation: '相同语句在语气上的变化，能呈现人物内心由动摇到坚定的过程。', point: 1 },
      { prompt: '结合觉慧反抗旧家庭束缚的行动，下列哪项最能概括这一形象的追求？', options: ['争取自主生活，追求个人幸福', '维护家长绝对权威', '逃避一切社会责任', '恢复旧式家族秩序'], answerIndex: 0, explanation: '觉慧不愿受旧家庭制度支配，表现出对自主生活与个人幸福的追求。', point: 2 },
    ],
  }),

  makeSet({
    id: 'gap-rebuild-2026-math-8a-14-4-approximate-number', grade: '初二', subject: '数学', volume: '上册',
    chapter: '第十四章 实数', section: '14.4 近似数', directoryUrl: math8a,
    evidence: ['冀教版八年级上册目录对应第十四章 14.4“近似数”；题目用常规四舍五入和有效数字概念。'],
    points: [['近似数', '按指定精确度取近似值，并辨析近似数末尾的零所表示的精度。']],
    questions: [
      { prompt: '把 12.345 四舍五入到百分位，所得近似数是？', options: ['12.34', '12.35', '12.3', '12.345'], answerIndex: 1, explanation: '百分位是小数点后第二位，千分位数字为 5，百分位进 1，得到 12.35。', point: 0 },
      { prompt: '把 0.0739 精确到两个有效数字，结果是？', options: ['0.07', '0.073', '0.074', '0.0739'], answerIndex: 2, explanation: '前两个有效数字是 7 和 3，下一位是 9，故 3 进为 4，得 0.074。', point: 0 },
      { prompt: '3.14159 精确到十分位的近似数是？', options: ['3.1', '3.14', '3.2', '3.15'], answerIndex: 0, explanation: '十分位是 1，百分位是 4，小于 5，因此十分位不变，结果为 3.1。', point: 0 },
      { prompt: '把一个测量结果写成近似数 4.30，与写成 4.3 相比，4.30 通常多传达了什么信息？', options: ['精确到百分位，末尾的 0 表示精度', '数值大小变成了 430', '它一定是精确值而非近似值', '它比 4.3 大 0.01'], answerIndex: 0, explanation: '4.30 与 4.3 数值相等，但 4.30 的末尾零可表示结果记录到百分位，精度表达不同。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9a-26-2-trig-values', grade: '初三', subject: '数学', volume: '上册',
    chapter: '第二十六章 解直角三角形', section: '26.2 特殊角的三角函数值', directoryUrl: math9a,
    evidence: ['冀教版九年级上册 2024 修订目录收录 26.2；特殊角三角函数值按 30°、45°、60° 基本值核算。'],
    points: [['特殊角三角函数值', '熟记 30°、45°、60° 的正弦、余弦和正切值。']],
    questions: [
      { prompt: 'sin 30° 等于？', options: ['1/2', '√2/2', '√3/2', '1'], answerIndex: 0, explanation: '30° 的正弦值为 1/2。', point: 0 },
      { prompt: 'cos 60° 等于？', options: ['√3/2', '1/2', '√2/2', '1'], answerIndex: 1, explanation: 'cos 60° = sin 30° = 1/2。', point: 0 },
      { prompt: 'tan 45° 等于？', options: ['0', '1/2', '1', '√3'], answerIndex: 2, explanation: '45° 直角三角形的两条直角边相等，因此 tan 45°=1。', point: 0 },
      { prompt: '在锐角三角形的特殊角中，sin 60° 的值是？', options: ['1/2', '√2/2', '√3/2', '1'], answerIndex: 2, explanation: 'sin 60° = √3/2；与 cos 30° 的值相同。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9a-28-1-circle-basics', grade: '初三', subject: '数学', volume: '上册',
    chapter: '第二十八章 圆', section: '28.1 圆的基本概念和性质', directoryUrl: math9a,
    evidence: ['冀教版九年级上册 2024 修订目录对应 28.1；题目限于圆心、半径、弦和直径的基本定义。'],
    points: [['圆的基本概念', '理解圆心、半径、弦、直径之间的定义关系。']],
    questions: [
      { prompt: '在同一个圆中，连接圆心与圆上一点的线段称为？', options: ['半径', '弦', '切线', '弧'], answerIndex: 0, explanation: '圆心到圆上一点的线段是半径。', point: 0 },
      { prompt: '下列哪条弦一定是圆的直径？', options: ['经过圆心的弦', '最长的弧', '与半径垂直的切线', '圆外两点间的线段'], answerIndex: 0, explanation: '直径是经过圆心的弦；并非每条弦都经过圆心。', point: 0 },
      { prompt: '同圆或等圆中，半径的数量关系是？', options: ['都相等', '长度各不相同', '只有相邻半径相等', '直径与半径相等'], answerIndex: 0, explanation: '同一个圆的所有半径相等；等圆的半径也相等。', point: 0 },
      { prompt: '若圆的半径为 6 cm，则它的直径为？', options: ['3 cm', '6 cm', '12 cm', '36 cm'], answerIndex: 2, explanation: '直径等于半径的 2 倍，因此直径为 12 cm。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9a-28-2-three-points-circle', grade: '初三', subject: '数学', volume: '上册',
    chapter: '第二十八章 圆', section: '28.2 三点确定一个圆', directoryUrl: math9a,
    evidence: ['冀教版九年级上册 2024 修订目录对应 28.2；圆心可由三角形两边的垂直平分线交点确定。'],
    points: [['三点确定圆', '不共线三点确定唯一圆；圆心是三角形各边垂直平分线的交点。']],
    questions: [
      { prompt: '三个点确定唯一一个圆的条件是？', options: ['三个点不在同一直线上', '三个点在同一直线上', '其中两个点重合即可', '三个点任意即可，包括重合'], answerIndex: 0, explanation: '不共线的三点构成三角形，存在唯一外接圆；共线三点不能确定圆。', point: 0 },
      { prompt: '三角形外接圆的圆心位于？', options: ['三边垂直平分线的交点', '三条高的交点', '三条中线的交点', '三条角平分线的交点'], answerIndex: 0, explanation: '外心到三个顶点距离相等，因此在各边垂直平分线上，是垂直平分线的交点。', point: 0 },
      { prompt: '锐角三角形的外心位于？', options: ['三角形内部', '三角形外部', '最长边上', '任一顶点上'], answerIndex: 0, explanation: '锐角三角形三边的垂直平分线交点在三角形内部。', point: 0 },
      { prompt: '直角三角形的外接圆圆心位于？', options: ['斜边中点', '直角顶点', '三角形内部任意点', '最长直角边的中点'], answerIndex: 0, explanation: '直角三角形斜边所对的外接圆直径为斜边，圆心是斜边中点。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9a-28-5-arc-sector', grade: '初三', subject: '数学', volume: '上册',
    chapter: '第二十八章 圆', section: '28.5 弧长和扇形面积的计算', directoryUrl: math9a,
    evidence: ['冀教版九年级上册 2024 修订目录对应 28.5；弧长和扇形面积按圆心角占 360° 的比例计算。'],
    points: [['弧长和扇形面积', '掌握弧长 l=nπr/180 与扇形面积 S=nπr²/360 的关系。']],
    questions: [
      { prompt: '半径为 r、圆心角为 n° 的扇形弧长公式是？', options: ['nπr/180', 'nπr²/360', '2πr²', 'πr²/n'], answerIndex: 0, explanation: '弧长等于圆周长 2πr 乘以 n/360，化简得 nπr/180。', point: 0 },
      { prompt: '半径为 r、圆心角为 n° 的扇形面积公式是？', options: ['nπr²/360', 'nπr/180', '2πr', 'πr²/n'], answerIndex: 0, explanation: '扇形面积等于圆面积 πr² 乘以 n/360。', point: 0 },
      { prompt: '半径为 4 的圆中，圆心角 90° 的扇形面积为？', options: ['2π', '4π', '8π', '16π'], answerIndex: 1, explanation: '90° 占整圆的 1/4，面积为 π×4²÷4=4π。', point: 0 },
      { prompt: '半径为 6、圆心角为 60° 的扇形弧长为？', options: ['π', '2π', '3π', '6π'], answerIndex: 1, explanation: '弧长为 60×π×6÷180=2π。', point: 0 },
    ],
  }),

  makeSet({
    id: 'gap-rebuild-2026-math-9b-29-2-tangent-property', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第二十九章 直线与圆的位置关系', section: '29.2 切线的性质和判定', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 29.2；切线判定、性质和勾股关系逐题核算。'],
    points: [['切线判定与性质', '切线垂直于过切点的半径；圆心到直线的距离等于半径时直线与圆相切。']],
    questions: [
      { prompt: '直线 l 与圆 O 相切于点 A，则 OA 与 l 的位置关系是？', options: ['OA⊥l', 'OA∥l', 'OA=l', '无法确定'], answerIndex: 0, explanation: '圆的切线垂直于经过切点的半径。', point: 0 },
      { prompt: '圆 O 的半径为 5 cm，圆心 O 到直线 l 的距离为 5 cm，则 l 与圆 O？', options: ['相切', '相交于两点', '相离', '一定经过圆心'], answerIndex: 0, explanation: '圆心到直线的距离等于半径，直线与圆相切。', point: 0 },
      { prompt: '判断“直线 l 是圆 O 的切线”，已知点 A 在圆上，最直接的判定条件是？', options: ['OA⊥l', 'OA∥l', 'A 不在 l 上', 'l 与圆心距离为 0'], answerIndex: 0, explanation: '若半径 OA 的端点 A 在圆上且 OA 垂直于 l，则 l 是圆的切线。', point: 0 },
      { prompt: '点 P 在圆外，PA 是圆 O 的切线，切点为 A。若 OA=3、OP=5，则 PA=？', options: ['2', '3', '4', '8'], answerIndex: 2, explanation: 'OA⊥PA，△OAP 为直角三角形，PA²=OP²−OA²=25−9=16，故 PA=4。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-29-3-tangent-length', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第二十九章 直线与圆的位置关系', section: '29.3 切线长定理', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 29.3；同一点引圆的两条切线段相等。'],
    points: [['切线长定理', '从圆外一点引圆的两条切线，切线长相等；圆心与外点的连线平分夹角。']],
    questions: [
      { prompt: '从圆外一点 P 向圆引两条切线，切点分别为 A、B，则？', options: ['PA=PB', 'PA>PB', 'PA<PB', 'PA+PB 等于半径'], answerIndex: 0, explanation: '从圆外一点引圆的两条切线，切线长相等，即 PA=PB。', point: 0 },
      { prompt: 'P 为圆外一点，PA、PB 是切线。直线 OP 与哪条角平分线重合？', options: ['∠APB 的平分线', '∠AOB 的外角平分线', '∠OAP 的平分线', '与上述角均无关'], answerIndex: 0, explanation: '△OAP 与 △OBP 全等，OP 平分两切线所成的 ∠APB。', point: 0 },
      { prompt: '若从 P 引圆的两条切线 PA、PB，且 PA=7 cm，则 PB=？', options: ['3.5 cm', '7 cm', '14 cm', '不能确定'], answerIndex: 1, explanation: '由切线长定理，PA=PB，因此 PB=7 cm。', point: 0 },
      { prompt: '圆 O 半径为 6，P 为圆外一点，PA 为切线且 PA=8，则 OP=？', options: ['8', '10', '12', '14'], answerIndex: 1, explanation: 'OA⊥PA，△OAP 为直角三角形，OP²=6²+8²=100，所以 OP=10。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-29-4-regular-polygon-circle', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第二十九章 直线与圆的位置关系', section: '29.4 正多边形与圆', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 29.4；按正多边形中心角及内切、外接圆性质命题。'],
    points: [['正多边形与圆', '正 n 边形中心角为 360°/n；外接圆半径连结顶点，内切圆半径垂直边。']],
    questions: [
      { prompt: '正六边形的每个中心角等于？', options: ['45°', '60°', '90°', '120°'], answerIndex: 1, explanation: '正 n 边形中心角为 360°/n，正六边形的中心角为 360°÷6=60°。', point: 0 },
      { prompt: '正多边形内切圆的圆心到每条边的距离？', options: ['相等', '随边的位置改变', '等于边长', '一定为 0'], answerIndex: 0, explanation: '正多边形各边到中心的距离相等，该距离就是内切圆半径。', point: 0 },
      { prompt: '正方形边长为 a，其外接圆半径为？', options: ['a/2', 'a/√2', 'a', '√2a'], answerIndex: 1, explanation: '正方形对角线为 a√2，外接圆直径等于对角线，故半径为 a√2/2=a/√2。', point: 0 },
      { prompt: '正多边形的外接圆圆心到一个顶点的线段是？', options: ['外接圆半径', '内切圆半径', '边心距', '对角线'], answerIndex: 0, explanation: '外接圆圆心到正多边形顶点的距离就是外接圆半径。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-30-4-quadratic-roots', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十章 二次函数', section: '30.4 二次函数与一元二次方程的关系', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 30.4；二次函数图像与方程根用 x 轴交点对应。'],
    points: [['函数图像与方程根', '方程 ax²+bx+c=0 的实数根对应抛物线 y=ax²+bx+c 与 x 轴交点的横坐标。']],
    questions: [
      { prompt: '方程 x²−5x+6=0 的两个根对应抛物线 y=x²−5x+6 与 x 轴的？', options: ['两个交点的横坐标', '顶点的纵坐标', '对称轴的纵坐标', '焦点坐标'], answerIndex: 0, explanation: '令 y=0 就得到 x²−5x+6=0，所以方程实根就是抛物线与 x 轴交点的横坐标。', point: 0 },
      { prompt: '抛物线 y=x²+1 与 x 轴有几个交点？', options: ['0 个', '1 个', '2 个', '3 个'], answerIndex: 0, explanation: 'x²+1=0 没有实数解，函数值恒大于 0，因此图像与 x 轴没有交点。', point: 0 },
      { prompt: '若 y=ax²+bx+c 的图像与 x 轴有两个不同交点，则 ax²+bx+c=0？', options: ['有两个不相等的实数根', '有一个实数根', '没有实数根', '一定有两个相等的实数根'], answerIndex: 0, explanation: '每个 x 轴交点对应一个实数根，两个不同交点对应两个不相等的实数根。', point: 0 },
      { prompt: '抛物线 y=x²−4x+4 与 x 轴的位置关系是？', options: ['相切于 (2，0)', '有两个不同交点', '没有交点', '与 x 轴重合'], answerIndex: 0, explanation: 'x²−4x+4=(x−2)²，只有一个二重实根 x=2，图像与 x 轴相切于 (2，0)。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-31-3-simple-probability', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十一章 随机事件的概率', section: '31.3 简单随机事件概率的计算', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 31.3；所给随机试验均为有限且等可能的基本结果。'],
    points: [['简单随机事件概率', '在有限等可能结果中，事件概率等于有利结果数除以基本结果总数。']],
    questions: [
      { prompt: '袋中有 3 个红球、2 个蓝球，球除颜色外相同，随机摸出 1 个，摸到红球的概率是？', options: ['1/5', '2/5', '3/5', '3/2'], answerIndex: 2, explanation: '5 个球等可能被摸到，其中 3 个有利结果，因此概率为 3/5。', point: 0 },
      { prompt: '掷一枚质地均匀的骰子一次，点数大于 4 的概率是？', options: ['1/6', '1/3', '1/2', '2/3'], answerIndex: 1, explanation: '基本结果为 1 至 6 共 6 个，大于 4 的结果有 5、6 两个，概率为 2/6=1/3。', point: 0 },
      { prompt: '同时抛两枚相同且均匀的硬币，至少出现一个正面的概率是？', options: ['1/4', '1/2', '3/4', '1'], answerIndex: 2, explanation: '四个等可能结果为正正、正反、反正、反反，其中前三个满足条件，概率为 3/4。', point: 0 },
      { prompt: '转盘被平均分成 8 个扇形，其中 3 个涂红色。指针落在各扇形的可能性相同，落在红色区域的概率是？', options: ['3/8', '5/8', '1/3', '8/3'], answerIndex: 0, explanation: '8 个等可能区域中有 3 个红色区域，概率为 3/8。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-32-2-views', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十二章 投影与视图', section: '32.2 视图', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 32.2；三视图均按正投影方向判读。'],
    points: [['三视图', '主视图、左视图和俯视图分别从物体正面、左侧和上方观察所得。']],
    questions: [
      { prompt: '从物体正前方观察得到的视图称为？', options: ['主视图', '左视图', '俯视图', '展开图'], answerIndex: 0, explanation: '主视图是从物体正面观察得到的平面图形。', point: 0 },
      { prompt: '从物体上方观察得到的视图称为？', options: ['主视图', '左视图', '俯视图', '侧面展开图'], answerIndex: 2, explanation: '俯视图是从物体上方观察得到的平面图形。', point: 0 },
      { prompt: '一个正放的圆柱体，从正上方观察，其俯视图是？', options: ['圆', '矩形', '三角形', '扇形'], answerIndex: 0, explanation: '沿圆柱轴线方向从上方看，圆形底面投影为圆。', point: 0 },
      { prompt: '一个正放的长方体，长、宽、高分别为 5、3、2。从正上方观察，其俯视图的长和宽是？', options: ['5 和 3', '5 和 2', '3 和 2', '三个数都不可见'], answerIndex: 0, explanation: '俯视图显示长方体底面，边长对应长和宽，高度方向不出现在俯视图中。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-math-9b-32-3-surface-unfolding', grade: '初三', subject: '数学', volume: '下册',
    chapter: '第三十二章 投影与视图', section: '32.3 直棱柱和圆锥的侧面展开图', directoryUrl: math9b,
    evidence: ['冀教版（2024）九年级下册完整目录对应 32.3；棱柱侧面展开矩形宽为底面周长，圆锥扇形半径为母线长。'],
    points: [['直棱柱展开图', '直棱柱侧面展开后是矩形，一边为高，另一边为底面周长。'], ['圆锥展开图', '圆锥侧面展开为扇形，扇形半径等于母线长，弧长等于底面圆周长。']],
    questions: [
      { prompt: '直棱柱的侧面展开图中，矩形的一条边长对应棱柱的？', options: ['高', '底面面积', '底面内切圆半径', '体积'], answerIndex: 0, explanation: '直棱柱侧面的矩形一边是棱柱的高，另一边等于底面周长。', point: 0 },
      { prompt: '圆锥侧面展开成扇形后，扇形半径等于圆锥的？', options: ['母线长', '底面半径', '高', '底面直径'], answerIndex: 0, explanation: '圆锥侧面上从顶点到圆锥底边的斜线段展开后成为扇形半径，即母线长。', point: 1 },
      { prompt: '圆锥侧面展开所得扇形的弧长与什么相等？', options: ['圆锥底面圆的周长', '底面圆的面积', '圆锥的高', '圆锥的体积'], answerIndex: 0, explanation: '展开前后侧面边界长度不变，扇形弧长等于圆锥底面圆周长。', point: 1 },
      { prompt: '圆锥底面半径为 3，母线长为 5，其侧面积为？', options: ['8π', '15π', '25π', '30π'], answerIndex: 1, explanation: '侧面积等于展开扇形面积，也可用 πrl 计算：π×3×5=15π。', point: 1 },
    ],
  }),

  makeSet({
    id: 'gap-rebuild-2026-history-7a-origin-formation', grade: '初一', subject: '历史', volume: '上册',
    chapter: '第一单元 史前时期：原始社会与中华文明的起源', section: '第3课 中华文明的起源与形成', directoryUrl: history7a,
    evidence: ['现行统编历史目录中该课位于第一单元；考古遗址、器物与聚落是认识史前社会的重要实物史料。'],
    points: [['史前考古与文明起源', '通过遗址、器物和聚落遗存认识史前社会的发展与区域文化交流。']],
    questions: [
      { prompt: '研究史前时期社会生活，哪类材料通常最能提供直接的实物证据？', options: ['考古遗址和出土器物', '后世文学作品中的想象', '现代影视剧对白', '没有出处的网络传闻'], answerIndex: 0, explanation: '史前时期缺少同时代文字记载，遗址、器物等考古材料是认识社会生活的重要实物证据。', point: 0 },
      { prompt: '不同地区出现各具特色的新石器文化，最合理的历史认识是？', options: ['中华文明起源呈现多元区域发展并不断交流', '各地区完全隔绝且毫无联系', '所有文化都在同一天出现', '只有一种遗址才代表文明起源'], answerIndex: 0, explanation: '区域文化各有特点，同时存在交流融合，体现中华文明起源多元一体的发展特征。', point: 0 },
      { prompt: '农业生产和定居生活发展后，史前聚落最可能出现的变化是？', options: ['人口和生产活动逐渐稳定，聚落规模扩大', '所有人立即改为游牧', '陶器和生产工具全部消失', '人们不再进行区域交流'], answerIndex: 0, explanation: '农业与定居使食物来源和生活地点更稳定，推动聚落发展并形成更复杂的社会生活。', point: 0 },
      { prompt: '考古发现中，同一聚落的墓葬随葬品差异明显，研究者可以据此谨慎推断？', options: ['社会成员间可能已出现财富或身份差异', '墓葬一定属于不同国家', '墓主人都生活在同一家庭', '随葬品差异能证明所有人的职业'], answerIndex: 0, explanation: '墓葬随葬品差异可作为社会分化的线索，但不能单凭这一项证据确定所有个人身份。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-7a-silk-road', grade: '初一', subject: '历史', volume: '上册',
    chapter: '第三单元 秦汉时期：统一多民族封建国家的建立和巩固', section: '第14课 沟通中外文明的丝绸之路', directoryUrl: history7a,
    evidence: ['中国民族报关于西域都护府的史料梳理记载张骞两次出使西域及公元前60年西域都护府设立：https://www.neac.gov.cn/seac/c103064/202101/1144132.shtml'],
    points: [['张骞通西域', '张骞出使西域为汉朝与西域各地建立联系创造条件。'], ['丝绸之路交流', '丝绸之路促进东西方商品、技术和文化交流。']],
    questions: [
      { prompt: '汉武帝时期，两次出使西域并为汉朝与西域加强联系作出重要贡献的人物是？', options: ['张骞', '班超', '郑和', '玄奘'], answerIndex: 0, explanation: '张骞两次出使西域，为汉朝加强与西域的联系打下基础。', point: 0 },
      { prompt: '汉代陆上丝绸之路由长安出发，向西主要经过？', options: ['河西走廊和西域，通往中亚等地', '辽东后直接抵达日本', '岭南后横渡太平洋', '东北草原后进入朝鲜半岛'], answerIndex: 0, explanation: '陆上丝绸之路从长安向西，经河西走廊和西域，连接中亚及更远地区。', point: 1 },
      { prompt: '西汉设置西域都护府的时间是？', options: ['公元前60年', '公元前221年', '公元25年', '公元184年'], answerIndex: 0, explanation: '公元前60年西汉设西域都护府，管理西域事务。', point: 0 },
      { prompt: '丝绸之路的历史作用，哪项概括最恰当？', options: ['促进沿线商品和文化交流', '只用于汉朝内部粮食运输', '使各地不再发生任何冲突', '仅供军队单向调动'], answerIndex: 0, explanation: '丝绸之路连接不同地区，推动商品往来和文化交流，影响不限于单一用途。', point: 1 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-7b-yuan-unification', grade: '初一', subject: '历史', volume: '下册',
    chapter: '第二单元 辽宋夏金元时期：民族关系发展和社会变化', section: '第11课 元朝的统一', directoryUrl: history7b,
    evidence: ['现行统编历史目录对应第11课；中央民族大学民族报与台湾事务办公室公开史料用于核对元代中央机构及澎湖巡检司。', '参考：https://www.neac.gov.cn/seac/ztzl/gsz/lsyg.shtml；https://www.fjtb.gov.cn/history/201306/t20130607_4292403.htm'],
    points: [['元朝统一与制度', '元朝建立行省制度，并通过中央机构加强对边疆地区的管理。'], ['台湾地区行政管理', '元朝在澎湖设立巡检司，管理澎湖及相关岛屿事务。']],
    questions: [
      { prompt: '元朝建立的时间和建立者对应正确的是？', options: ['1271年，忽必烈', '960年，赵匡胤', '1368年，朱元璋', '1279年，成吉思汗'], answerIndex: 0, explanation: '忽必烈于1271年建立元朝；1279年元军灭南宋，完成全国统一。', point: 0 },
      { prompt: '元朝为加强地方治理而推行的重要制度是？', options: ['行省制度', '郡县制的首次创立', '分封制', '三省六部制的废除与恢复'], answerIndex: 0, explanation: '元朝在地方设置行中书省，行省制度成为重要的地方行政制度。', point: 0 },
      { prompt: '元朝设置澎湖巡检司，主要说明？', options: ['中央政府在澎湖及台湾相关地区设置行政管理机构', '元朝将台湾划给日本管理', '台湾成为元朝首都', '澎湖巡检司负责管理西藏'], answerIndex: 0, explanation: '澎湖巡检司管理澎湖、台湾相关岛屿事务，是元代行政管理的史实。', point: 1 },
      { prompt: '元朝设置宣政院主要加强了对哪一地区的管理？', options: ['西藏地区', '东北地区', '台湾地区', '河西走廊'], answerIndex: 0, explanation: '元朝设宣政院管理西藏地区事务；澎湖巡检司则负责澎湖及相关岛屿。', point: 1 },
    ],
  }),

  makeSet({
    id: 'gap-rebuild-2026-history-8a-self-strengthening-frontier', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第二单元 早期现代化的初步探索和民族危机加剧', section: '第4课 洋务运动和边疆危机', directoryUrl: history8a,
    evidence: ['西北民族事务部门公开史料核对左宗棠收复新疆和1884年新疆建省：https://www.neac.gov.cn/seac/xwzx/200305/1010521.shtml。洋务运动内容按现行统编课次主题梳理。'],
    points: [['洋务运动', '洋务派以“自强”“求富”为口号，兴办近代军事工业和民用企业。'], ['边疆危机与新疆建省', '左宗棠收复新疆后，清政府于1884年在新疆建省。']],
    questions: [
      { prompt: '洋务运动前期提出的口号是？', options: ['自强', '平均地权', '师夷长技以制夷', '驱除鞑虏'], answerIndex: 0, explanation: '洋务运动前期以“自强”为口号，后期提出“求富”，兴办军事工业和民用企业。', point: 0 },
      { prompt: '洋务运动后期“求富”口号下兴办的主要是？', options: ['民用企业', '科举考场', '地方行省', '新式政党'], answerIndex: 0, explanation: '洋务派后期兴办轮船、矿务、纺织等民用企业，以求富强并支持军事工业。', point: 0 },
      { prompt: '清政府于哪一年在新疆建省？', options: ['1861年', '1875年', '1881年', '1884年'], answerIndex: 3, explanation: '左宗棠收复新疆后，清政府于1884年正式在新疆建省。', point: 1 },
      { prompt: '对洋务运动历史作用的认识，哪项较为全面？', options: ['引进技术、创办近代企业，推动近代化探索，但没有根本改变旧制度', '彻底实现了国家独立和富强', '废除了所有封建制度并建立共和国', '使列强停止对中国的侵略'], answerIndex: 0, explanation: '洋务运动推动了近代工业、交通和教育等方面的探索，但未能从根本上改变当时的社会制度和民族危机。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-sino-japanese-war', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第二单元 早期现代化的初步探索和民族危机加剧', section: '第5课 甲午中日战争与列强瓜分中国狂潮', directoryUrl: history8a,
    evidence: ['现行统编历史目录明确本课内容；《马关条约》主要条款及战后列强争夺按统编教材常见史实核对。'],
    points: [['甲午中日战争', '甲午中日战争发生于1894—1895年，清军战败。'], ['《马关条约》', '《马关条约》割让台湾等地、赔款并允许日本在通商口岸开设工厂。']],
    questions: [
      { prompt: '甲午中日战争发生于哪一时期？', options: ['1894—1895年', '1840—1842年', '1856—1860年', '1900—1901年'], answerIndex: 0, explanation: '甲午中日战争于1894年爆发，1895年清政府战败后签订《马关条约》。', point: 0 },
      { prompt: '《马关条约》签订后，清政府被迫割让给日本的是？', options: ['台湾全岛及澎湖列岛', '香港岛', '外兴安岭以南', '九龙司地方一区'], answerIndex: 0, explanation: '《马关条约》规定清政府割让辽东半岛、台湾全岛及所有附属各岛屿、澎湖列岛等。', point: 1 },
      { prompt: '《马关条约》允许日本在通商口岸开设工厂，反映列强侵华方式进一步转向？', options: ['资本输出', '只进行朝贡贸易', '停止经济侵略', '以传教取代一切侵略'], answerIndex: 0, explanation: '允许外国在华设厂便利了资本输出，显示列强经济侵略方式加深。', point: 1 },
      { prompt: '甲午战败和《马关条约》签订后，中国面临的局势是？', options: ['民族危机加深，列强掀起瓜分中国的狂潮', '立即实现完全独立', '列强全部撤出中国', '清政府随即废除帝制'], answerIndex: 0, explanation: '战败与巨额赔款、割地等条款加深民族危机，列强随后加紧争夺在华权益。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-boxer-allied-invasion', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第二单元 早期现代化的初步探索和民族危机加剧', section: '第7课 义和团运动和八国联军侵华', directoryUrl: history8a,
    evidence: ['外交部公开近代外交史料记载1900年八国联军侵华及1901年《辛丑条约》主要后果：https://quiz.hk.ocmfa.gov.cn/chn/dejjs/ckzl2008/zgjxdwjs/200611/t20061117_7501803.htm'],
    points: [['义和团运动与侵华', '义和团运动兴起于民族危机背景下；1900年八国联军侵华。'], ['《辛丑条约》', '1901年《辛丑条约》加重中国负担并损害主权。']],
    questions: [
      { prompt: '八国联军侵华战争发生于哪一年？', options: ['1894年', '1898年', '1900年', '1911年'], answerIndex: 2, explanation: '1900年，英、美、俄、日、法、德、意、奥组成八国联军侵华。', point: 0 },
      { prompt: '八国联军侵华后，清政府被迫签订的条约是？', options: ['《南京条约》', '《马关条约》', '《辛丑条约》', '《尼布楚条约》'], answerIndex: 2, explanation: '清政府于1901年被迫签订《辛丑条约》。', point: 1 },
      { prompt: '《辛丑条约》签订后，列强获得的一项特权是？', options: ['在北京使馆界驻兵', '在中国设立行省', '管理中国科举考试', '废除清政府'], answerIndex: 0, explanation: '《辛丑条约》允许列强在北京使馆区驻兵，并规定拆毁相关炮台等。', point: 1 },
      { prompt: '《辛丑条约》对清政府和中国主权造成的影响是？', options: ['清政府进一步成为列强控制中国的工具，民族危机加深', '中国收回所有租界', '清政府立即转为共和政府', '中国取得完整关税自主权'], answerIndex: 0, explanation: '巨额赔款和驻兵等条款严重损害主权，清政府统治受到列强进一步控制。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-tongmenghui', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第三单元 资产阶级民主革命与中华民国的建立', section: '第8课 中国同盟会', directoryUrl: history8a,
    evidence: ['中国政协辛亥革命史料及广东省档案馆记载中国同盟会于1905年在日本东京成立并宣传三民主义：https://www.cppcc.gov.cn/zxww/xinhai100/gmfc/index.shtml；https://www.da.gd.gov.cn/portal_home/wap/archivesDetail/4087'],
    points: [['中国同盟会', '孙中山等于1905年在日本东京建立中国同盟会。'], ['革命纲领', '同盟会纲领后来被阐发为民族、民权、民生三大主义。']],
    questions: [
      { prompt: '中国同盟会成立于？', options: ['1901年北京', '1905年日本东京', '1911年武昌', '1912年南京'], answerIndex: 1, explanation: '1905年8月，孙中山等人在日本东京成立中国同盟会。', point: 0 },
      { prompt: '中国同盟会的成立者和领导者主要是？', options: ['孙中山等革命者', '李鸿章等洋务派', '康有为等维新派', '袁世凯等北洋军阀'], answerIndex: 0, explanation: '孙中山联合多个革命团体成员建立中国同盟会。', point: 0 },
      { prompt: '孙中山把同盟会纲领阐发为哪三项主义？', options: ['民族、民权、民生', '民主、科学、自由', '自强、求富、变法', '联俄、联共、扶助农工'], answerIndex: 0, explanation: '民族、民权、民生合称三民主义。', point: 1 },
      { prompt: '中国同盟会的成立最能说明当时革命活动出现了什么变化？', options: ['革命力量开始走向联合并形成全国性组织', '革命者放弃建立共和国的目标', '清政府已经完成政治改革', '各革命团体转为支持君主专制'], answerIndex: 0, explanation: '同盟会联合多个革命团体，推动资产阶级民主革命力量走向组织化和联合。', point: 1 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-restoration-warlords', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第三单元 资产阶级民主革命与中华民国的建立', section: '第10课 帝制复辟与军阀割据', directoryUrl: history8a,
    evidence: ['现行统编历史目录将袁世凯复辟与北洋军阀割据编为本课；时间线按1915—1916年史实核对。'],
    points: [['帝制复辟', '袁世凯于1915年复辟帝制，遭到反对后于1916年取消帝制。'], ['军阀割据', '袁世凯死后，北洋军阀分裂并控制不同地区。']],
    questions: [
      { prompt: '袁世凯复辟帝制发生于？', options: ['1912年', '1915年', '1919年', '1926年'], answerIndex: 1, explanation: '袁世凯于1915年宣布恢复帝制，遭到护国运动反对后于1916年取消帝制。', point: 0 },
      { prompt: '护国运动反对的主要政治事件是？', options: ['袁世凯复辟帝制', '洋务派创办民用企业', '清政府设立总理衙门', '北伐战争开始'], answerIndex: 0, explanation: '护国运动以维护共和、反对袁世凯复辟帝制为目标。', point: 0 },
      { prompt: '袁世凯死后中国政局的突出特点是？', options: ['北洋军阀割据混战', '全国立即实现长期统一', '清朝恢复稳定统治', '各省停止军事活动'], answerIndex: 0, explanation: '袁世凯死后北洋军阀分裂，各派控制不同地区并争夺权力。', point: 1 },
      { prompt: '帝制复辟与军阀割据说明辛亥革命后民主共和面临的主要困难是？', options: ['共和制度受到专制势力和军事割据的破坏', '中国已实现政治民主化', '外国列强不再干涉中国', '地方军队完全服从民选议会'], answerIndex: 0, explanation: '帝制复辟和军阀割据破坏共和政治，说明民主共和道路曲折。', point: 1 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-cooperation-northern-expedition', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第五单元 从国共合作到农村革命根据地的建立', section: '第13课 国共合作与北伐战争', directoryUrl: history8a,
    evidence: ['人民政协文史资料核对1924年黄埔军校与第一次国共合作、1926年北伐的背景和目标：https://www.cppcc.gov.cn/zxww/2021/07/01/ARTI1625108792099337.shtml'],
    points: [['第一次国共合作', '国共合作推动革命统一战线形成，黄埔军校为革命培养军事人才。'], ['北伐战争', '北伐战争于1926年开始，主要目标是打倒北洋军阀。']],
    questions: [
      { prompt: '黄埔军校创办于哪一年，主要为哪一事业培养军事人才？', options: ['1924年，为国民革命培养军官', '1911年，为清政府培养新军', '1927年，为北洋军阀培养军官', '1937年，为抗日战争培养海军'], answerIndex: 0, explanation: '黄埔军校1924年在广州创办，服务于国民革命并培养军官。', point: 0 },
      { prompt: '北伐战争开始于哪一年？', options: ['1919年', '1924年', '1926年', '1931年'], answerIndex: 2, explanation: '国民革命军于1926年开始北伐。', point: 1 },
      { prompt: '北伐战争的主要目标是？', options: ['推翻北洋军阀统治，推动国家统一', '恢复清朝帝制', '镇压五四运动', '建立地方割据政权'], answerIndex: 0, explanation: '北伐旨在打倒北洋军阀、推动国家统一，并反对帝国主义在华势力。', point: 1 },
      { prompt: '第一次国共合作和北伐战争之间的关系，哪项正确？', options: ['国共合作推动了国民革命的发展，北伐是其重要军事行动', '北伐发生在国共合作之前二十年', '国共合作以支持北洋军阀为目标', '北伐结束后才成立黄埔军校'], answerIndex: 0, explanation: '第一次国共合作推动国民革命，黄埔军校培养军官，北伐是这一时期的重要军事行动。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8a-jinggangshan-road', grade: '初二', subject: '历史', volume: '上册',
    chapter: '第五单元 从国共合作到农村革命根据地的建立', section: '第14课 毛泽东开辟井冈山道路', directoryUrl: history8a,
    evidence: ['现行课次内容参考2024版本课目录与教学资源：https://jx.panqjy.cn/doc-18850417.html；重点史事包括南昌起义、八七会议、秋收起义、三湾改编和井冈山会师。'],
    points: [['武装起义与战略转向', '秋收起义受挫后，毛泽东率部向农村山区转移。'], ['井冈山道路', '建立农村革命根据地并探索工农武装割据道路。']],
    questions: [
      { prompt: '南昌起义发生于哪一天，后来成为人民军队纪念日？', options: ['1927年8月1日', '1927年9月9日', '1928年4月28日', '1931年11月7日'], answerIndex: 0, explanation: '南昌起义发生于1927年8月1日，后来将8月1日定为建军节。', point: 0 },
      { prompt: '秋收起义后，毛泽东率部转向农村山区，主要体现了什么战略探索？', options: ['从城市武装起义转向创建农村革命根据地', '放弃武装斗争并解散部队', '立即攻占南京建立中央政府', '转而支持北洋军阀'], answerIndex: 0, explanation: '起义受挫后转向敌人力量相对薄弱的农村山区，开启创建革命根据地的探索。', point: 0 },
      { prompt: '三湾改编的重要意义之一是？', options: ['确立党对军队的组织领导，加强基层建设', '废除中国共产党组织', '恢复清朝八旗制度', '建立北洋军阀政府'], answerIndex: 0, explanation: '三湾改编加强党对军队的组织领导，推动“支部建在连上”等制度落实。', point: 1 },
      { prompt: '毛泽东与朱德会师后，井冈山革命根据地的建设有助于探索？', options: ['农村包围城市、武装夺取政权的革命道路', '依靠外国军队推翻清朝', '只通过议会选举实现革命', '以沿海通商口岸为唯一根据地'], answerIndex: 0, explanation: '井冈山等农村革命根据地的实践，为农村包围城市、武装夺取政权的道路提供了重要探索。', point: 1 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-history-8b-socialist-system', grade: '初二', subject: '历史', volume: '下册',
    chapter: '第一单元 中华人民共和国成立和社会主义制度的建立', section: '第3课 社会主义制度的建立', directoryUrl: history8b,
    evidence: ['教育部历史课程标准要求了解“一五计划”和社会主义三大改造，认识社会主义制度基本确立；中央政府驻港联络办史料核对1956年底三大改造基本完成：https://www.moe.gov.cn/s78/A07/A07_sjhj/201612/W020161230533292513993.pdf；https://www.locpg.gov.cn/jsdt/2019-09/16/c_1210281798.htm'],
    points: [['三大改造', '农业、手工业和资本主义工商业的社会主义改造于1956年底基本完成。'], ['改造形式与制度结果', '农业合作化、公私合营等方式推动生产资料所有制发生变化，社会主义基本制度建立。']],
    questions: [
      { prompt: '我国对农业、手工业和资本主义工商业的社会主义改造，合称？', options: ['三大改造', '土地改革', '改革开放', '一五计划'], answerIndex: 0, explanation: '农业、手工业和资本主义工商业的社会主义改造合称三大改造。', point: 0 },
      { prompt: '三大改造基本完成的时间是？', options: ['1949年底', '1952年底', '1956年底', '1966年底'], answerIndex: 2, explanation: '到1956年底，三大改造基本完成，社会主义基本制度建立。', point: 0 },
      { prompt: '三大改造中的资本主义工商业改造，主要采取的形式之一是？', options: ['公私合营', '分封制', '租庸调制', '家庭联产承包责任制'], answerIndex: 0, explanation: '国家通过公私合营等形式对资本主义工商业进行社会主义改造。', point: 0 },
      { prompt: '三大改造基本完成后，我国生产资料所有制发生的重要变化是？', options: ['社会主义公有制占主体地位', '土地全部转为私人地主所有', '资本主义私有制成为唯一形式', '生产资料所有制没有发生变化'], answerIndex: 0, explanation: '三大改造基本完成后，生产资料公有制占主体，标志着社会主义基本制度建立。', point: 1 },
    ],
  }),

  makeSet({
    id: 'gap-rebuild-2026-geography-7b-asia-location-range', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第六章 我们生活的大洲——亚洲', section: '第一节 位置和范围', directoryUrl: geography7b,
    evidence: ['人教版七年级下册目录将本节列在第六章；地理位置、范围和尺度按地图判读与初中地理常识命题。'],
    points: [['亚洲的地理位置', '从半球位置、海陆位置和纬度位置描述亚洲。'], ['亚洲的范围', '亚洲面积广阔，跨越较大的纬度和经度范围。']],
    questions: [
      { prompt: '从海陆位置看，亚洲东部濒临？', options: ['太平洋', '大西洋', '印度洋', '地中海'], answerIndex: 0, explanation: '亚洲东临太平洋，北临北冰洋，南临印度洋。', point: 0 },
      { prompt: '亚洲是世界上面积最大的？', options: ['大洲', '大洋', '岛屿', '半岛'], answerIndex: 0, explanation: '亚洲是世界上面积最大、人口最多的大洲。', point: 1 },
      { prompt: '亚洲地域辽阔、跨越的纬度范围大，最直接造成？', options: ['各地热量条件差异显著', '全洲只有一种气候', '全洲昼夜长度完全一致', '所有河流都向东流'], answerIndex: 0, explanation: '纬度跨度大导致太阳辐射和热量条件差异显著，进而影响气候类型和自然环境。', point: 1 },
      { prompt: '描述一个大洲的地理位置，较完整的一组要素是？', options: ['半球位置、纬度位置和海陆位置', '人口、语言和首都', '矿产、农业和工业', '地形、河流和植被'], answerIndex: 0, explanation: '地理位置通常从半球、纬度和海陆位置等方面描述。', point: 0 },
    ],
  }),
  makeSet({
    id: 'gap-rebuild-2026-geography-7b-middle-east', grade: '初一', subject: '地理', volume: '下册',
    chapter: '第八章 东半球其他的国家和地区', section: '第一节 中东', directoryUrl: geography7b,
    evidence: ['人教版七年级下册目录将“中东”列为第八章第一节；区域位置、石油运输和水资源问题按区域地理常识核对。'],
    points: [['中东位置', '中东位于亚洲西南部及非洲东北部附近，是亚、欧、非联系的重要区域。'], ['资源与交通', '波斯湾沿岸石油资源丰富，霍尔木兹海峡连接波斯湾与外海。']],
    questions: [
      { prompt: '中东地区位于哪几个大洲的交会附近？', options: ['亚洲、欧洲、非洲', '亚洲、北美洲、南美洲', '欧洲、南美洲、大洋洲', '非洲、南极洲、北美洲'], answerIndex: 0, explanation: '中东处于亚洲西南部、欧洲东南部和非洲东北部附近，地理位置重要。', point: 0 },
      { prompt: '霍尔木兹海峡连接波斯湾与？', options: ['阿曼湾', '红海', '地中海', '黑海'], answerIndex: 0, explanation: '霍尔木兹海峡位于波斯湾出口，向外连接阿曼湾，是重要海上通道。', point: 1 },
      { prompt: '中东长期是世界重要石油产区和输出地，石油主要集中在？', options: ['波斯湾及其沿岸地区', '地中海北岸', '里海以北的北欧地区', '红海西岸的高山地区'], answerIndex: 0, explanation: '中东石油资源主要分布在波斯湾及其沿岸，油气外运依赖海上交通。', point: 1 },
      { prompt: '中东许多地区水资源紧张，主要自然原因之一是？', options: ['降水少、蒸发强，部分地区为热带沙漠气候', '全年被冰雪覆盖', '地处赤道雨林且降水过多', '河流密布且水量全年充沛'], answerIndex: 0, explanation: '中东许多地区气候干旱，降水少而蒸发强，水资源供需矛盾突出。', point: 0 },
    ],
  }),
]
