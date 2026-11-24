import { articleSections } from './ai-article'
import { findSimilarComments } from './comment-similarity'
import { isGroupNarrativeSentence } from './feedback-quality'
import { parseGeneratedKnowledgeCard, type KnowledgePointCard } from './knowledge-point-cards'
import { TEACHER_SUPPORT_TAGS } from './student-feedback-tags'
import { normalizePersonalizedLearningExtension, type PersonalizedLearningExtension } from './personalized-learning'

/**
 * 教师反馈对话式 AI 的共享服务端逻辑。
 * 学生真实姓名与数据库 ID 一律不发送给外部模型，统一映射为 S1/S2/S3；
 * 收到结果后由服务端映射回 studentId，前端只拿到脱敏后的最终文章。
 */

export type ChatStudent = { id: string; name: string; observation: string }
export type ChatArticleItem = { studentId: string; article: string; personalizedLearning?: PersonalizedLearningExtension | null }
export type ChatFailedItem = { studentId: string; error: string }

export const CHAT_HISTORY_MAX = 6
export const CHAT_USER_INPUT_MAX = 600
export const CHAT_DRAFT_MAX = 900

export type AiProvider = 'doubao' | 'deepseek' | 'kimi'

export function resolveAIProvider(): AiProvider {
  // 速度优先：DeepSeek 实测最快（生产 25-78s）；豆包为回退（ARK key 存在时仍可用）
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY) return 'doubao'
  if (process.env.KIMI_API_KEY) return 'kimi'
  return 'deepseek'
}

export function aiProviderLabel(provider: AiProvider) {
  return provider === 'doubao' ? '豆包' : provider === 'deepseek' ? 'DeepSeek' : 'Kimi'
}

export type ChatModelInput = {
  mode: 'generate' | 'followup'
  subject: string
  grade: string
  edition: string
  lessonNote: string
  /** 教师发现知识点识别偏差后指定的复核主题；只约束识别，不作为课堂事实展示。 */
  topicCorrection?: { lessonTopic: string; previousTopic: string }
  verifiedCard?: KnowledgePointCard | null
  students: Array<{ key: string; level: string; observation: string; mastery?: string; tags?: string[]; teachingActions?: string[] }>
  /** 追问时：最近对话（服务端已限长） */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  /** 追问时：当前目标学生的草稿原文（脱敏后），供 AI 修改参考 */
  drafts?: Array<{ key: string; draft: string }>
  targetKeys?: string[]
  correction?: string
  /** 该年级该学科的候选知识点词表（帮助 AI 严格识别上课内容） */
  knowledgeCandidates?: string[]
  /** 教师从教材目录选择的册次与章节，作为本次详解的范围约束 */
  selectedTextbookChapters?: string[]
  /** 与所选目录条目精确对应的本地知识参考；保留审核状态供 prompt 约束使用 */
  textbookKnowledgeReferences?: Array<{
    chapterTitle: string
    reviewStatus: string
    sourceReference: string
    knowledgePoints: Array<{
      title: string
      content: string
      practiceNotes?: Array<{ content: string; questionId?: string; setId?: string; sourceRef?: string }>
    }>
  }>
}

function textbookChapterScopePrompt(input: ChatModelInput) {
  const chapters = input.selectedTextbookChapters?.filter(Boolean) || []
  const references = input.textbookKnowledgeReferences || []
  const lines = chapters.length ? [
    `【教师选定的教材册次与章节】${chapters.join('；')}`,
    '教材章节仅用于限定教材参考范围，不要引入课堂记录之外的内容；若老师明确记录本节讲了课外拓展、自编材料或目录外主题，以课堂记录为准，不得强行归入所选章节。',
  ] : []
  if (references.length) {
    const hasDraftReferences = references.some((reference) => reference.reviewStatus === 'DRAFT_NEEDS_SUBJECT_REVIEW')
    const hasPublishedBankReferences = references.some((reference) => reference.reviewStatus === 'PUBLISHED_QUESTION_BANK_DERIVED')
    const statusLabel = (status: string) => {
      if (status === 'DRAFT_NEEDS_SUBJECT_REVIEW') return '待学科复核'
      if (status === 'PUBLISHED_QUESTION_BANK_DERIVED') return '已发布题库衍生'
      return status
    }
    const referenceLines = references.flatMap((reference) => [
      `【${reference.chapterTitle}｜${statusLabel(reference.reviewStatus)}｜来源：${reference.sourceReference}】`,
      ...reference.knowledgePoints.flatMap((point) => [
        `- ${point.title}：${point.content}`,
        ...(point.practiceNotes || []).map((note) => `  题库解析线索：${note.content}`),
      ]),
    ])
    lines.push(
      '【本地教材知识参考】以下是与所选教材目录对应的内部知识摘要。仅挑选课堂要点明确涉及的内容，不能把整章知识都写成已经讲过；老师明确输入的知识点优先。',
      ...(hasPublishedBankReferences ? ['“已发布题库衍生”内容来自通过题库发布审核的本地题组及其解析，仅作为知识参考，不是教材原文。'] : []),
      ...(hasDraftReferences ? ['“待学科复核”内容只作候选线索；除非教师课堂要点明确印证，否则不要将其写成已讲授的知识事实。'] : []),
      '所有参考都必须与教师本次输入和课堂记录一致；不确定或不匹配的内容不要使用。',
      ...referenceLines,
    )
  }
  return lines
}

export function buildChatSystemPrompt(input: ChatModelInput) {
  const lines = [
    '你是一位资深学科老师，正在帮任课老师给家长写真实、具体的课堂反馈。语气像当面聊学生，避免工作报告和模板腔。',
    '只可使用教师输入的课堂要点、每名学生自己对应的观察与表现档位；知识概念可客观解释。不得编造任何课堂事件、分数、名次、答题数量、进步、作业或掌握程度。档位只定语气，不证明具体事实。',
    '学生之间严格隔离，绝不能挪用另一名学生的观察。教师输入中明确提到某学生的表现（如“步骤清楚”“计算粗心”“变号出错”“很积极”等）必须保留事实，可以改写成自然、完整的家长沟通语句，不要照搬残句。',
    `【学生信息】以下每名学生一行、严格对应自己的素材，写反馈时只能使用该生自己那一行的内容，禁止混用或张冠李戴：${input.students.map((s) => `${s.key}同学｜档位 ${s.level}；${s.observation.includes('教师未提供') ? '个人观察 无' : `个人观察 ${s.observation}`}${s.mastery ? `；掌握程度 ${s.mastery}` : ''}${s.tags?.length ? `；课堂表现标签 ${s.tags.join('、')}` : ''}`).join('\n')}`,
    '【补充说明优先】某生有"个人观察"文字时，该生反馈的个人表现段必须主要依据这段原话展开，标签与档位只作补充印证；没有个人观察时才按表现档位与标签生成。',
    '【禁串学生】课堂要点中提到的学生表现严格按姓名归属（脱敏名如 S1同学 即第一名学生），只写入对应学生的反馈，任何学生的反馈都不得出现其他学生的表现细节（如把 S1 的低烧、S2 的超纲题写进 S3 的文章）。某学生既没有个人观察也没有表现标签时，第二段直接跳过个人表现，从知识点过渡到建议，宁可段落短，严禁借用、改写或虚构其他学生的表现来填充。',
    '【差异化】多名学生同时生成时，每位学生的反馈要在个人表现、掌握判断、课后建议的角度与用词上明显不同（同一节课知识点相同是正常的），避免读起来像批量群发。',
    '【禁群体指代】每份个人反馈只能写目标学生本人的表现，以该生（S1同学/孩子）为主语。全文任何位置不得出现“有同学”“也有同学”“还有同学”“部分同学”“有些同学”“大多数同学”“个别同学”“其他同学”等群体泛指句式，不得用“从课堂整体情况看，有同学…也有同学…”的罗列写法；若老师未提供该生个人表现，不写个人表现段落，直接从知识点过渡到建议。',
    '【禁推测口吻】掌握判断必须用教师确定的语气直接陈述（如“目前对…已基本掌握”“总体掌握不错”），不得用“结合该生…特点，可以判断/推测/可能…”“从该生表现来看，或许/可能掌握…”等推测句式；老师对学生的掌握情况是已知事实，不需要系统推断。',
    '【禁串学生】课堂要点（【本课内容】）中提到的学生表现严格按姓名归属，只写入对应学生的反馈，严禁借用其他学生的表现（如把另一名同学的低烧、走神、超纲题写进本文）。该学生没有个人观察与表现标签时，第二段直接跳过个人表现，从知识点过渡到建议，宁可段落短，严禁借用或虚构表现填充。',,
    '【硬性禁止】全文任何位置都不得出现“没有观察记录”“暂无观察”“尚未观察”“未提供观察”“本次未记录”“未记录”“无法判断”“暂无法”“没有记录”“未能观察”“未能记录”“暂不展开”“先不展开”“不展开个人表现”“个人表现方面的描述”等任何回避性表述。若某名学生确实没有个人观察：不要声明“没有记录”，直接基于该生的掌握程度与课堂练习完成情况写实（如“从课堂练习完成情况看，孩子对…已基本掌握”），或省略个人表现段落、直接从知识点过渡到建议段落，用引导性口吻（如“建议课后先回顾…，再练习…，遇到问题随时找老师”）给出具体复习建议，不得声称已了解其掌握程度。',
    '每份 article 是一篇连贯流畅的反馈文章（250-450字），写成 2-4 个自然段，禁止使用“本节课学习内容：”“课堂反馈：”“孩子掌握情况：”等小标题或标签。第一段讲本节课的知识点与公式（把关键公式、方法步骤直接写进正文，如“配方法：把方程配成完全平方式后直接开平方”“ax²+bx+c=0（a≠0）”），第二段写该生有证据的个人表现（来自老师输入），第三段给谨慎的掌握判断与具体建议；信息少时宁可短，不凑字数。',
    'S1/S2 等匿名代号只用于区分 JSON 中的学生条目，正文不得出现任何匿名代号或数据库信息；正文用“孩子”称呼。不要输出真实姓名。禁用孩子同学、这位同学、该同学、宝贝、小朋友，以及最好、第一、保证提分等夸大词。',
    '输出纯 JSON，不要用 Markdown：topic（给家长的知识点概述）、intro（1-3句概述）、card（topic、definition、formulas字符串数组、可选example含question/steps/answer）、articles数组（每项含 key 与 article）。',
    '【知识点识别】topic 必须与课堂要点讲的内容严格一致，识别输入中最核心的知识点术语，使用规范学科名称（如“代数式”“一元二次方程”“细胞结构”“时态变化”）。输入明确讲的是哪个知识点，topic 就必须是它，绝不能发散成后续章节或邻近知识点（例如输入讲“代数式”，topic 必须是“代数式”，绝不能写成“一元一次方程”）；输入提到多个时取最重要的一个；输入没有明确术语时，结合学科与候选列表推断，不能留空、不能把整句话当 topic。',
    '老师明确写出课外拓展、自编材料、校本内容，或写出教材目录未收录的主题时，必须按老师的原始主题和课堂描述整理；不能因为候选列表中没有该主题，就替换成相近的课内知识点。',
    ...(input.knowledgeCandidates?.length
      ? [`【相关知识点参考】以下是基于本课文字和已选教材章节匹配出的参考项，不是完整教材目录。若老师明确说出了知识点，topic 必须保留老师说的规范名称；只有课堂要点表达含糊时才从这些参考项中选择最贴合的一项，不要为了匹配列表而改成其他章节：${input.knowledgeCandidates.join('、')}`]
      : []),
    ...textbookChapterScopePrompt(input),
    '【内容充实】definition 用 2-3 句话讲清概念、适用条件与常见易错点。formulas 按学科输出：数学、物理、化学等理科写 2-4 条关键公式或解题步骤；语文、英语等语言与文科类写 2-4 条核心方法要点（如句式结构、时态变化规则、表现手法、答题框架）。example 给出完整题干、3-6 步解答步骤与最终答案，内容具体充实。',
    '【篇幅】每份 article 全文 250-450 字：第一段知识点与公式 90-150 字，第二段个人表现 60-130 字，第三段掌握判断与建议 60-130 字；写实、具体、可读，不要两三行敷衍。',
    '【观察只写一次】老师提供的个人表现（如“上课认真听讲”）只在个人表现段自然表达一次。不要把老师原句单独放在文章开头，也不要在开头和个人表现段重复同一事实；如需改写，保留原意即可。',
    input.verifiedCard
      ? '输入附有人工核实卡片。必须原样使用其定义、公式与例题，不改写卡片，不生成额外教材原文。'
      : `没有人工核实卡片。生成的是参考讲解，不得声称来自${input.edition}教材原文，不编页码、章号或来源。例题如果生成，应是明确的示例，不冒充教材例题；不确定的公式和例题可留空。`,
    '不声称实时联网查阅资料。',
  ]
  if (input.mode === 'followup') {
    lines.push(...[
      `老师发来了修改要求。只修改 articles 数组中 key 属于 [${input.targetKeys?.join(',') || '全部'}] 的学生；未列出的学生保持原文不变。`,
      '修改时保持连贯文章风格，只按老师的指令调整语气、详略或某位学生的建议；没有要求修改的内容不要擅自改动。',
      input.drafts?.length
        ? `【以草稿为基准】以下 JSON 是目标学生当前的草稿原文（S1同学 等代号对应 articles 的 key）：${JSON.stringify(input.drafts)}。修改必须保持草稿的知识点主题（如草稿讲的是“一元二次方程配方法”，修改后仍是这个主题，绝不能换成其他章节知识点）与已确认的事实与结构，只按老师的指令调整详略、语气或建议；草稿就是老师已认可的内容。`
        : '',
    ].filter(Boolean))
  }
  return lines.join('\n')
}

/**
 * 并发模式：为单个学生生成一篇反馈文章的 system prompt。
 * 文章直接输出给家长看的连贯段落（第一段知识点与公式、第二段个人表现、第三段掌握判断与建议）。
 */
export function buildArticleSystemPrompt(
  input: ChatModelInput,
  student: { key: string; level: string; observation: string; mastery?: string; tags?: string[]; teachingActions?: string[] },
  options: { classroomOnly?: boolean } = {},
) {
  const classroomOnly = options.classroomOnly === true
  const allowedSupportTags = new Set<string>(TEACHER_SUPPORT_TAGS)
  const teachingActions = student.teachingActions?.length
    ? student.teachingActions
    : (student.tags || []).filter((tag) => allowedSupportTags.has(tag))
  const lines = [
    classroomOnly
      ? '你是一位资深学科老师，正在帮任课老师把本节课的课堂内容整理成给家长看的中性反馈草稿。此模式没有个人表现依据，只能总结课程内容和练习建议。'
      : '你是一位资深学科老师，正在帮任课老师给一位学生的家长写真实、具体的课堂反馈。语气像当面聊学生，避免工作报告和模板腔。',
    ...(classroomOnly ? [
      '【只写课堂内容】只可使用老师输入的课堂要点与客观知识概念；不得描述或推断任何学生的参与、表现、掌握程度、进步、分数、作业完成情况或课堂事件。不要用学生姓名、代号、孩子或该生作为主语。',
      '围绕本课主题用 1-2 个自然段概括学到的核心内容和关键方法，并给出具体、可执行的课后复习或练习建议。不要照抄知识详解卡，也不要添加输入中没有的知识点。',
      '反馈应简洁完整，约 120-240 字；不使用小标题或标签，直接写成家长可读的自然段。',
    ] : [
      '只可使用下面教师输入的课堂要点与该学生的个人观察、表现档位、掌握程度、课堂表现标签；知识概念可客观解释。不得编造任何课堂事件、分数、名次、答题数量、进步、作业或掌握程度。档位只定语气，不证明具体事实。',
      '【补充说明优先】该生有"个人观察"文字时，个人表现段必须主要依据这段原话展开，掌握程度与标签只作补充印证；没有个人观察时才按表现档位与标签生成，且不得编造具体表现。',
      '【只写当前学生】这篇反馈只针对当前这一个学生，以“孩子”或“该生”为主语；严禁出现“孩子们”“同学们”“学生们”“全班”“大家”“有的孩子/同学……还有的孩子/同学……”以及“从课堂整体情况看……”等群体描述或多名学生并列表现。其他已勾选学生必须分别生成，不能把他们的情况合并到当前文章。若老师没有提供该生个人表现，不要编造或写群体替代内容，直接从本课知识点过渡到建议。',
      '【禁推测口吻】掌握判断必须用教师确定的语气直接陈述（如“目前对…已基本掌握”“总体掌握不错”），不得用“结合该生…特点，可以判断/推测/可能…”“从该生表现来看，或许/可能掌握…”等推测句式；老师对学生的掌握情况是已知事实，不需要系统推断。',
      '输出一篇连贯流畅的反馈文章（250-450字），写成 2-4 个自然段，禁止使用“本节课学习内容：”“课堂反馈：”“孩子掌握情况：”等小标题或标签，直接写成给家长看的自然段落。',
      '第一段讲本节课的知识点与公式（把关键公式、方法步骤直接写进正文，如“配方法：把方程配成完全平方式后直接开平方”“ax²+bx+c=0（a≠0）”；语文英语等文科写核心方法要点）；第二段写该学生有证据的个人表现（事实完整保留，口语、残句可自然改写）；第三段给谨慎的掌握判断与具体建议。',
      '【硬性禁止】全文任何位置都不得出现“没有观察记录”“暂无观察”“尚未观察”“未提供观察”“本次未记录”“未记录”“无法判断”“暂无法”“没有记录”“未能观察”“未能记录”“暂不展开”“先不展开”“不展开个人表现”“个人表现方面的描述”等任何回避性表述。若老师未提供该生个人观察：不要声明“没有记录”，直接基于该生掌握程度与课堂练习完成情况写实（如“从课堂练习完成情况看，孩子对…已部分掌握”），或省略个人表现段落、直接从知识点过渡到建议段落；可以写“老师会在后续课堂继续关注孩子的掌握情况”，但不得声称已了解其掌握程度。',
    ]),
    '【教师短句自然整合】老师输入的口语、残句或简短提醒（例如“但是还是课下多背背”）只作为意思参考，不要原句照搬，也不要单独放在扩写文章前面。学生表现观察只在个人表现段自然表达一次；不得先把老师的原句放在文章开头，再在后文用近义句重复。先围绕本课知识写清完整反馈，再把有用的表现和复习建议自然整合进对应段落；只保留原意，不补造学生事实。',
    `【本课内容】${input.lessonNote}`,
    ...textbookChapterScopePrompt(input),
    ...(!classroomOnly ? [
      `【该生观察】${student.observation || '（老师未填写该生个人观察；不要声明“没有记录”，直接基于掌握程度与课堂表现标签写实，或省略个人表现段）'}`,
      `【该生表现档位】${student.level}`,
      ...(student.mastery ? [`【该生掌握程度】${student.mastery}`] : []),
      ...(student.tags?.length ? [`【该生课堂表现标签】${student.tags.join('、')}`] : []),
      ...(teachingActions.length ? [`【老师本节实际采用的辅导方式】${teachingActions.join('、')}`] : []),
    ] : []),
    ...(input.knowledgeCandidates?.length
      ? [`【相关知识点参考】以下是基于本课文字和已选教材章节匹配出的参考项，不是完整教材目录。若老师明确说出了知识点，topic 必须保留老师说的规范名称；只有课堂要点表达含糊时才从这些参考项中选择最贴合的一项，不要为了匹配列表而改成其他章节：${input.knowledgeCandidates.join('、')}`]
      : []),
    ...(!classroomOnly ? [
      '【知识点识别】输入讲的是课本章节/单元大类名时，正文第一段就以该章节名为纲展开（如“这节课围绕几何图形的初步认识展开”），不要改写成子知识点名称。',
      '正文用单数的“孩子”或“该生”称呼即可（家长阅读视角），不要输出姓名、不要用 S1/S2 等代号；代号仅用于 JSON key，严禁写入 article 正文。禁用“孩子们/同学们/学生们”、孩子同学、这位同学、该同学、宝贝、小朋友，以及最好、第一、保证提分等夸大词。',
    ] : []),
    ...(input.topicCorrection ? [`【教师复核知识点】教师确认课堂主题为“${input.topicCorrection.lessonTopic}”，此前识别为“${input.topicCorrection.previousTopic}”。本次应按教师复核的主题重新组织知识点表述；课堂活动和学生表现仍只能依据下面的原始课堂记录，不得把复核指令本身写进反馈正文。`] : []),
    '【专属补充模块】同时填写 personalizedLearning 对象，供家长查看孩子自己的学习路线。insight 只能概括本生明确记录的掌握与表现；focus 选出最值得继续练的一点；practiceTask 写一项 5-10 分钟可执行的针对练习；parentPrompt 写家长能直接问孩子的一句话；successCheck 写可以观察到的完成标准；nextLessonFollowup 根据老师勾选的下次课关注内容写一项衔接安排。后三项属于建议，须针对本节topic与该生的标签组合。只允许复述老师记录的事实，不补造答题数量、分数、进步、课堂反应、作业完成或辅导效果；不得把建议写成已经发生的事实。没有对应依据的事实字段留空，建议字段仍可围绕知识点与已选关注项给出具体做法。补充内容不用学生姓名或匿名代号，也不要出现“AI生成”等说明。',
    `输出纯 JSON，不要用 Markdown：{"key": "${student.key}", "article": "整篇文章", "personalizedLearning": {"insight": "本节个体化结论", "focus": "当前突破点", "practiceTask": "家庭短练习", "parentPrompt": "家长提问", "successCheck": "完成标志", "nextLessonFollowup": "下次课跟进安排"}}。article 保持现有结构与要求，必须包含自然段，段落之间用换行分隔；不加小标题、不使用“课堂反馈”等标签。personalizedLearning 必须单独于 article，禁止把补充模块拼进或改写 article。`,
    '不声称实时联网查阅资料。',
  ]
  if (input.mode === 'followup') {
    const draft = input.drafts?.find((item) => item.key === student.key)?.draft || ''
    lines.push(
      `老师发来了修改要求：${input.correction || '（见历史对话）'}`,
      `只修改该学生的这篇文章，必须以当前草稿为基础：保持草稿的知识点主题与已确认事实不变，只按老师的指令调整语气或详略；当前草稿：${draft ? JSON.stringify(draft) : '（无草稿）'}。`,
    )
  }
  return lines.join('\n')
}

/** 并发模式：独立生成知识卡（topic + 定义/公式/例题）的 system prompt。 */
export function buildCardSystemPrompt(input: ChatModelInput) {
  const lines = [
    '你是一位资深学科老师。请从课堂要点中提取本节课最重要的一个知识点，并生成给家长看的、内容充实的知识卡。',
    '输出纯 JSON，不要用 Markdown：{"topic": "规范学科术语", "intro": "1-3句给家长的概述", "card": {"topic": "同topic", "definition": "2-3句话讲清概念、适用条件与常见易错点", "formulas": ["公式或方法要点1", "共2-4条"], "tips": ["易错点或学习建议1", "共2-4条，写孩子容易踩的坑和课后怎么练"], "example": {"question": "完整题干", "steps": ["步骤1", "共3-6步"], "answer": "最终答案"}}}',
    '【知识点识别】topic 必须与课堂要点讲的内容严格一致：输入明确讲“代数式”，topic 就必须是“代数式”，绝不能选“一元一次方程”或其他后续章节、邻近知识点。',
    '若输入中明确出现了某个知识点术语（如“一元二次不等式的解法”“配方法”“宾语从句”“细胞的结构”），topic 必须原样采用该术语本身；候选知识点列表只有在输入没有明确术语时才可参考，且参考时必须选与输入语义最贴合的候选，不得选语义偏移的邻近知识点（例如输入讲“解一元二次不等式、求根再画图写解集”时，不得把 topic 选成“一元二次不等式在实数集上的恒成立”）。',
    '若输入提到的是课本章节/单元大类名（如“几何图形的初步认识”“图形的相似”“解直角三角形”“透镜及其应用”“动物的运动和行为”），topic 必须原样取该章节名，不能换成章节下的子知识点（如“直线、射线、线段”“相似三角形”“锐角三角函数”“凸透镜成像规律”）。输入同时提到章节名与子知识点时，以章节名为准。',
    '若输入中出现明确的教学单元专名——语文课文名（如《藤野先生》《背影》《雨的四季》）、英语单元名（如 Unit 3 My School）、生物或文科的章节名（如“生物的遗传与变异”）——topic 必须原样取该专名，绝不能改用该课下的具体知识点/手法/语法点/子概念（如“人物形象分析”“名词”“there be 句型”）。',
    '老师明确写出课外拓展、自编材料、校本内容，或写出教材目录未收录的主题时，必须按老师的原始主题和课堂描述整理；不能因为候选列表中没有该主题，就替换成相近的课内知识点。',
    ...(input.topicCorrection ? [`【教师复核知识点】教师要求复核课堂主题为“${input.topicCorrection.lessonTopic}”（此前识别为“${input.topicCorrection.previousTopic}”）。请优先按老师核对后的主题生成知识卡，同时只根据课堂原始记录展开讲解，不要把复核指令当作课堂内容。`] : []),
    `【课堂要点】${input.lessonNote}`,
    ...textbookChapterScopePrompt(input),
    ...(input.knowledgeCandidates?.length
      ? [`【候选知识点】这是基于本课文字和已选教材章节匹配出的参考项，不是完整教材目录；仅用于没有明确术语时参考，优先选择最贴合输入的一个：${input.knowledgeCandidates.join('、')}`]
      : []),
    '数学、物理、化学等理科 formulas 写 2-4 条关键公式或解题步骤；语文、英语等语言与文科类写 2-4 条核心方法要点（如句式结构、时态变化规则、表现手法、答题框架）。example 给出完整题干、3-6 步解答步骤与最终答案，内容具体充实。tips 写 2-4 条该知识点常见的易错点与课后练习建议，让家长知道孩子容易错在哪、回家怎么练。',
    '不编造教材页码或来源；例题明确是示例，不冒充教材例题。不确定的公式和例题可留空。',
    '不声称实时联网查阅资料。',
  ]
  return lines.join('\n')
}

const cleanValue = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/**
 * 并发模式：解析单篇文章输出 {"key","article"}，并完成称呼/禁词/诚实性校验。
 */
export function parseSingleArticle(raw: string, student: ChatStudent, studentKey = 'S1'): ChatArticleItem {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('未能返回可识别的反馈内容，请重试')
  let data: unknown
  try {
    data = JSON.parse(raw.slice(start, end + 1))
  } catch {
    throw new Error('反馈数据返回格式不完整，请重试')
  }
  if (!data || typeof data !== 'object') throw new Error('反馈内容为空，请重试')
  const record = data as { article?: unknown; personalizedLearning?: unknown }
  let body = cleanValue(record.article, 1400)
  if (!body) throw new Error('反馈内容为空，请重试')
  // 兜底清洗：删除任何含"未记录/无法判断/暂无法/群体指代/推测句式"的整句（prompt 已禁止，此处双保险）；
  // 同时保留并规范段落，避免把模型生成的三段反馈压成一整段。
  const GUESS_TONE = /(结合该生|结合其特点|可以判断|推测|可能掌握|或许掌握|表明其|说明其)/
  const rejectedSentence = (sentence: string) =>
    /(本次未记录|未记录|无法判断|暂无法|没有记录|未能观察|未能记录|没有.{0,8}观察记录|暂无.{0,8}观察|尚未.{0,6}观察|未提供.{0,4}观察|暂不展开|先不展开|不展开个人表现|个人表现方面.{0,6}描述)/.test(sentence)
    || isGroupNarrativeSentence(sentence)
    || GUESS_TONE.test(sentence)
    || [...sentence.matchAll(/S\d+(?:同学)?/g)].some((match) => match[0].replace(/同学$/, '') !== studentKey)
  const sourceParagraphs = body
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.split(/(?<=[。！？])\s*/g).map((sentence) => sentence.trim()).filter(Boolean))
    .filter((paragraph) => paragraph.length)
  const keptParagraphs = sourceParagraphs.map((paragraph) => paragraph.filter((sentence) => !rejectedSentence(sentence))).filter((paragraph) => paragraph.length)
  const keptSentences = keptParagraphs.flat()
  const groupSentences = (sentences: string[], groupCount: number) => {
    const groups = Array.from({ length: groupCount }, () => [] as string[])
    sentences.forEach((sentence, index) => groups[Math.floor(index * groupCount / sentences.length)].push(sentence))
    return groups.filter((group) => group.length).map((group) => group.join(''))
  }
  const paragraphs = keptParagraphs.length === 1 && keptSentences.length > 1
    ? groupSentences(keptSentences, Math.min(3, keptSentences.length))
    : keptParagraphs.length > 4
      ? groupSentences(keptSentences, Math.min(3, keptSentences.length))
      : keptParagraphs.map((paragraph) => paragraph.join(''))
  body = paragraphs.join('\n\n').trim()
  if (!body) throw new Error('反馈内容为空，请重试')
  const ownAlias = new RegExp(`${studentKey}(?!\\d)(?:同学)?`, 'g')
  let named = body.replace(ownAlias, `${student.name}同学`)
    .replaceAll('这位同学', `${student.name}同学`).replaceAll('该同学', `${student.name}同学`)
  named = named.replaceAll('孩子同学', `${student.name}同学`)
  named = named.replace(/孩子(?![们])/g, `${student.name}同学`)
  if (forbidden.test(named)) {
    throw new Error('生成的反馈含不合适措辞，请重试')
  }
  const personalizedLearning = normalizePersonalizedLearningExtension(record.personalizedLearning)
  const normalizedPersonalizedLearning = personalizedLearning
    ? Object.fromEntries(Object.entries(personalizedLearning).map(([field, value]) => [
      field,
      value.replaceAll(`${studentKey}同学`, '孩子').replaceAll(studentKey, '孩子'),
    ])) as PersonalizedLearningExtension
    : null
  return { studentId: student.id, article: named, personalizedLearning: normalizedPersonalizedLearning }
}

/**
 * 并发模式：解析知识卡输出 {"topic","intro","card"}。卡缺失或损坏时降级为 null。
 */
export function parseCardOnly(
  raw: string,
  context: { edition: string; grade: string; subject: string; verifiedCard?: KnowledgePointCard | null },
): { card: KnowledgePointCard | null; topic: string; knowledge: string } {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return { card: null, topic: '', knowledge: '' }
  let data: unknown
  try {
    data = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return { card: null, topic: '', knowledge: '' }
  }
  const result = data as { topic?: unknown; intro?: unknown; knowledge?: unknown; card?: unknown }
  const card = context.verifiedCard || parseGeneratedKnowledgeCard(result.card, context)
  const topic = card?.topic || cleanValue(result.topic, 80)
  const knowledge = cleanValue(result.intro || result.knowledge, 450)
  return { card, topic, knowledge }
}

export function anonymizeText(value: string, students: ChatStudent[]) {
  return students.reduce(
    (current, student, index) => student.name.length >= 2 ? current.replaceAll(student.name, `S${index + 1}`) : current,
    value,
  )
}

export function anonymizeAndRedactContacts(value: string, students: ChatStudent[]) {
  return anonymizeText(value, students)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[联系方式已隐藏]')
    .replace(/(^|[^\d])((?:\+?86[-\s]?)?1[3-9]\d{9})(?!\d)/g, '$1[联系方式已隐藏]')
}

const forbidden = /孩子同学|宝贝|小朋友|保证提分|全班最强|望再接再厉|表现不错.{0,8}继续加油/

export type PerStudentParseResult = {
  ok: ChatArticleItem[]
  failed: ChatFailedItem[]
  card: KnowledgePointCard | null
  topic: string
  knowledge: string
  similarityWarnings: Array<{ studentIdA: string; studentIdB: string; score: number }>
}

/**
 * 逐条解析豆包返回的 articles，允许部分失败：
 * 成功项映射回 studentId 并完成称呼/标记/诚实性校验；
 * 失败项记录可理解的错误，不整批丢弃。
 */
export function parsePerStudentArticles(
  raw: string,
  selected: ChatStudent[],
  context: { edition: string; grade: string; subject: string; verifiedCard?: KnowledgePointCard | null; hasLessonNote?: boolean },
): PerStudentParseResult {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('未能返回可识别的反馈内容，请重试')
  }
  let data: unknown
  try {
    data = JSON.parse(raw.slice(start, end + 1))
  } catch {
    throw new Error('反馈数据返回格式不完整，请重试')
  }
  if (!data || typeof data !== 'object') throw new Error('反馈内容为空，请重试')

  const result = data as { topic?: unknown; knowledge?: unknown; intro?: unknown; card?: unknown; articles?: unknown }
  const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
  const card = context.verifiedCard || parseGeneratedKnowledgeCard(result.card, context)
  const topic = card?.topic || clean(result.topic, 80)
  const knowledge = clean(result.intro || result.knowledge, 450)
  const rows = Array.isArray(result.articles) ? result.articles : []
  // 知识卡片缺失时不阻断文章解析（老师仍能拿到反馈草稿，前端知识区留空）

  const ok: ChatArticleItem[] = []
  const failed: ChatFailedItem[] = []
  const rowMap = new Map<string, { article?: unknown }>()
  for (const row of rows) {
    if (row && typeof row === 'object') {
      const record = row as { key?: unknown; article?: unknown }
      if (typeof record.key === 'string') rowMap.set(record.key, record)
    }
  }

  selected.forEach((student, index) => {
    const key = `S${index + 1}`
    const row = rowMap.get(key)
    const rawBody = clean(row?.article, 1400)
    // 兜底清洗：删除"未记录/群体指代/推测句式"整句（prompt 已禁止，此处双保险）
    const GUESS_TONE = /(结合该生|结合其特点|可以判断|推测|可能掌握|或许掌握|表明其|说明其)/
    const body = rawBody
      .split(/(?<=[。！？])|\r?\n+/g)
      .filter((sentence) => !/(本次未记录|未记录|无法判断|暂无法|没有记录|未能观察|未能记录|没有.{0,8}观察记录|暂无.{0,8}观察|尚未.{0,6}观察|未提供.{0,4}观察|暂不展开|先不展开|不展开个人表现|个人表现方面.{0,6}描述)/.test(sentence))
      .filter((sentence) => !isGroupNarrativeSentence(sentence))
      .filter((sentence) => !GUESS_TONE.test(sentence))
      .filter((sentence) => ![...sentence.matchAll(/S\d+(?:同学)?/g)].some((match) => match[0].replace(/同学$/, '') !== key))
      .join('')
      .trim()
    // 先替换当前学生的代号与老师输入中常见的“这位同学/该同学”为本名，再做校验
    // （“这位同学”是老师输入原文，模型复述时不应触发禁词）
    // 含其他学生代号（S2/S3…）的整句已在上方按句过滤移除，避免把他人信息混入本篇反馈
    let named = body.replaceAll(`${key}同学`, `${student.name}同学`)
      .replaceAll('这位同学', `${student.name}同学`)
      .replaceAll('该同学', `${student.name}同学`)
    named = named.replace(new RegExp(`${key}(?!\\d)`, 'g'), `${student.name}同学`)
    // “孩子”→真实姓名（家长看到自己孩子名字，避免群发感）；群体句已在前面整句移除
    named = named.replaceAll('孩子同学', `${student.name}同学`)
    named = named.replace(/孩子(?![们])/g, `${student.name}同学`)
    if (!named) {
      failed.push({ studentId: student.id, error: `第 ${index + 1} 位学生（${student.name}）的反馈内容为空，未自动填入` })
      return
    }
    // 只有极端不合适的称呼或虚假承诺才拦截；格式、称呼等小问题不拦截，老师可继续编辑
    if (forbidden.test(named)) {
      failed.push({ studentId: student.id, error: `第 ${index + 1} 位学生（${student.name}）的反馈包含不合适的称呼或承诺，未自动填入` })
      return
    }
    ok.push({ studentId: student.id, article: named })
  })

  const similarityWarnings = findSimilarComments(ok.map((item) => ({
    studentId: item.studentId,
    comment: articleSections(item.article)?.[1] || '',
  })), 0.55)

  return { ok, failed, card, topic, knowledge, similarityWarnings }
}
