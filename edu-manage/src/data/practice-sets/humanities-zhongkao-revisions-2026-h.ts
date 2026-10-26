import type { PracticeQuestion } from '../parent-practice-bank'

type QuestionRevision = Partial<PracticeQuestion>

function withMaterial(material: string, task: string) {
  return `${material}\n\n${task}`
}

function sourceRef(group: string, task: string) {
  return `牧哲学堂原创模拟材料/河北中考道德与法治/九年级上册/${group}#${task}`
}

const historyMaterial = `【模拟材料一：县史展策划单】展览组把课本时间轴列为四段：新民主主义革命时期；社会主义革命和建设时期；改革开放和社会主义现代化建设时期；新时代中国特色社会主义时期。展览还选取本县的家庭口述与公共档案：一位老人回忆过去取水要走较远的路，后来村里建成集中供水点；档案记录了通村道路、公共文化室等服务逐步完善。材料只展示本县的若干变化，不代表所有地区的具体经历完全相同。

【模拟材料二：学生整理记录】九年级学生协助整理口述档案。遇到两位讲述者对某项工程年份的说法不一致时，他们把问题标为“待核对”，再查阅档案和报刊记录；暴雨导致展厅漏水时，学生和工作人员先保护原始资料，调整展期并及时告知居民。`

const theoryMaterial = `【模拟材料一：县域调研记录】研究小组对 120 户居民进行问卷调查，允许每户多选：68 户希望公交时刻更方便，52 户关注老年助餐，43 户关注河岸环境。县里在三个村试行延长一条公交线、增设助餐点和修复河岸步道。一个季度内记录到公交乘坐 2400 人次、助餐 670 人次。居民还反映一班车与就医时间不匹配，工作人员随后调整了发车时刻。材料没有提供试点前的乘坐量或对照村数据。

【模拟材料二：课程学习卡】课本指出，习近平新时代中国特色社会主义思想是一个系统完整、逻辑严密、内涵丰富、博大精深的科学理论体系；它是当代中国马克思主义、二十一世纪马克思主义，是中华文化和中国精神的时代精华，必须长期坚持并不断发展。学习小组把这张课程卡与调研材料一起讨论，但没有把某一项地方措施称为理论本身。`

const modernizationMaterial = `【模拟材料一：课程时间轴】从二〇二〇年到二〇三五年，基本实现社会主义现代化；从二〇三五年到本世纪中叶，把我国建成富强民主文明和谐美丽的社会主义现代化强国。

【模拟材料二：清河县发展观察（编题用模拟资料）】五个村接入一条公交线路；30 户小农户通过合作社共同销售农产品，并按约定分享收益；村图书室每周开展一次阅读活动；河岸修复区栽种本地植物，农田试用节水灌溉。材料能说明当地正在推进若干发展工作，不能单独证明国家某一阶段目标已经实现。

【模拟材料三：班级讨论记录】甲同学说：“公交线路增加了，说明我国已经完成现代化。”乙同学说：“一地的项目可以体现现代化某些方面，但判断国家发展目标还要看时间阶段和更广泛的证据。”`

/** 第八批道法修订：保留原题 ID 与知识点，用模拟材料考查信息提取、教材关联、证据推断与行动设计。 */
export const humanitiesZhongkaoQuestionRevisions2026H: Record<string, QuestionRevision> = {
  // 道德与法治：九年级上册，第一单元第一课；原知识点 shuxiehuigongshishi / hongyangweidadangjingshen。
  'politics-9a-1-1-q1': {
    id: 'politics-9a-1-1-q1', type: 'single_choice', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '结合材料，下列对我国发展历程与本县变化的理解最恰当的是（ ）。'),
    options: [
      '本县供水点建成，可以概括全国各地公共服务变化的共同顺序。',
      '公共服务变化是观察历史的一个角度，因此可以代替对其他历史内容的考察。',
      '本县生活服务的变化是历史进程中的一个地方例证；教材指出，中国共产党领导中国人民在不同历史时期持续创造发展成就。',
      '口述和公共档案都可作为史料，通常不必再核对具体出处。',
    ], answerIndex: 2,
    explanation: '教材观点强调中国共产党领导中国人民在各历史时期创造发展成就。材料中的本县变化只能作为地方例证，不能据此推断各地经历完全相同，也不能把历史归结为单一工程。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q1-材料关联'),
  },
  'politics-9a-1-1-q2': {
    id: 'politics-9a-1-1-q2', type: 'short_answer', knowledgePointId: 'hongyangweidadangjingshen',
    prompt: withMaterial(historyMaterial, '从学生整理记录中任选一项行为，指出它可联系伟大建党精神的哪一项内容，并说明材料依据。不要把学生行为等同于历史人物的牺牲经历。（3分）'),
    correctAnswer: '评分要点（3分）：①指出行为，如遇年份矛盾时标注“待核对”并查档，或暴雨时优先保护原始资料、告知居民（1分）；②联系“坚持真理、坚守理想”或“践行初心、担当使命”等精神内容（1分）；③说明行为与精神的联系，如尊重事实、认真负责、服务群众（1分）。说明现代学生的日常行动是价值践行，不将其与历史牺牲经历简单等同。',
    gradingMode: 'self_check',
    explanation: '材料呈现的是学生在校史整理中的具体做法。可以用伟大建党精神的价值内涵分析行动，但应保留历史情境差异，不能夸大或等同。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/hongyangweidadangjingshen', 'q2-精神与行为'),
  },
  'politics-9a-1-1-q3': {
    id: 'politics-9a-1-1-q3', type: 'single_choice', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '策展人准备把课本时间轴改成展签。下列哪一排列顺序与材料一所列历史时期相符？（ ）。'),
    options: [
      '社会主义革命和建设时期→新民主主义革命时期→新时代中国特色社会主义时期→改革开放和社会主义现代化建设时期',
      '新民主主义革命时期→社会主义革命和建设时期→改革开放和社会主义现代化建设时期→新时代中国特色社会主义时期',
      '改革开放和社会主义现代化建设时期→新时代中国特色社会主义时期→新民主主义革命时期→社会主义革命和建设时期',
      '新时代中国特色社会主义时期→改革开放和社会主义现代化建设时期→社会主义革命和建设时期→新民主主义革命时期',
    ], answerIndex: 1,
    explanation: '材料一按从早到晚列出四个历史时期，展签应保持这一时间顺序。题目考查按教材历史阶段整理材料，而不是用本县个别生活变化替代国家历史分期。',
    difficulty: 'MEDIUM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q3-时间轴'),
  },
  'politics-9a-1-1-q4': {
    id: 'politics-9a-1-1-q4', type: 'short_answer', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '整理者把相互矛盾的年份标为“待核对”，再查阅档案和报刊。结合教材关于中国共产党领导人民创造发展成就的观点，说明核对史料对准确呈现本县发展历程有什么作用。（3分）'),
    correctAnswer: '评分要点（3分）：①指出核对可避免把有差异的口述年份直接当作确定事实（1分）；②说明档案、报刊等不同来源相互印证，有助于准确呈现本县的发展变化（1分）；③联系教材观点说明，可靠史料能帮助具体呈现党领导人民在当地推动发展的历程，避免以未经核实的细节歪曲或夸大事实（1分）。',
    gradingMode: 'self_check',
    explanation: '材料明确指出讲述者对年份说法不一致。标注待核对并查找档案、报刊，有助于区分待证信息与可靠事实。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q4-材料核验'),
  },
  'politics-9a-1-1-q5': {
    id: 'politics-9a-1-1-q5', type: 'multiple_choice', knowledgePointId: 'hongyangweidadangjingshen',
    prompt: withMaterial(historyMaterial, '学生讨论怎样完成档案展工作。下列做法中，能够体现伟大建党精神相关内涵的有（多选）。'),
    options: [
      '为让展览更感人，删去与预设结论不一致的记录。',
      '展期临近时保护原始资料并及时向居民说明，体现担当责任、服务他人。',
      '把一次志愿服务说成完成了历史上的全部使命。',
      '对年份冲突保留疑问并继续核实，体现尊重事实、坚持真理。',
    ], answerIndices: [1, 3],
    explanation: '尊重事实、核验来源可以联系坚持真理；保护资料、向居民说明情况体现责任担当。删改不合预期的证据和夸大个人行为都不符合材料分析要求。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/hongyangweidadangjingshen', 'q5-精神辨析'),
  },
  'politics-9a-1-1-q6': {
    id: 'politics-9a-1-1-q6', type: 'short_answer', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '材料一写到集中供水点、通村道路和公共文化室。任选一项，先概括它反映的生活变化，再联系教材中中国共产党初心使命的表述说明其意义。（3分）'),
    correctAnswer: '评分要点（3分）：①准确提取一项材料信息，如饮水更方便、交通联系改善或公共文化服务增加（1分）；②联系“为中国人民谋幸福、为中华民族谋复兴”的初心使命（1分）；③说明该变化与改善群众生活、回应人民需要之间的关系，并限定为本县材料所示的地方例证（1分）。',
    gradingMode: 'self_check',
    explanation: '答案需先引用材料事实，再联系教材观点；不能仅写口号，也不能把本县一项变化说成全国情况。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q6-初心使命与生活变化'),
  },
  'politics-9a-1-1-q7': {
    id: 'politics-9a-1-1-q7', type: 'single_choice', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '有同学据材料一得出结论：“本县公共服务改善了，所以全国所有地区都在同一时期以相同方式完成了这些变化。”对这一结论的评价最恰当的是（ ）。'),
    options: [
      '结论有一定依据，因为有代表性的县域变化能够概括各地的具体经历。',
      '结论可以成立，公共档案和口述材料有价值，适用范围不必另行说明。',
      '结论不成立，因为县域生活变化无法与国家发展进程形成联系。',
      '材料只提供本县若干变化，不能直接推出全国各地经历完全相同。',
    ], answerIndex: 3,
    explanation: '材料已说明这些是本县的若干变化，不能外推为所有地区同时、同样经历。地方材料可作为具体例证，但须说明证据范围。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q7-证据范围'),
  },
  'politics-9a-1-1-q8': {
    id: 'politics-9a-1-1-q8', type: 'short_answer', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '材料一按四个历史时期整理展签。说明这种分期呈现有什么作用，并指出为什么本县的几项生活变化不能替代完整的历史叙述。（3分）'),
    correctAnswer: '评分要点（3分）：①指出四个时期按时间顺序呈现，有助于把握历史发展的阶段和先后（1分）；②说明分期能帮助理解不同时期的历史任务与发展变化，避免把历史看成单一事件或工程（1分）；③指出本县材料只是地方的若干例证，不能覆盖各地区和各方面的完整历史（1分）。',
    gradingMode: 'self_check',
    explanation: '按时期整理便于把握历史发展的阶段性与连续性。本县生活变化能提供具体观察角度，但地方材料不能代替完整的历史进程。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q8-材料与观点'),
  },
  'politics-9a-1-1-q9': {
    id: 'politics-9a-1-1-q9', type: 'short_answer', knowledgePointId: 'hongyangweidadangjingshen',
    prompt: withMaterial(historyMaterial, '如果你是档案展学生志愿者，请提出一项能体现“践行初心、担当使命”或“对党忠诚、不负人民”相关价值的后续工作，并说明它如何回应材料中的实际需要。（3分）'),
    correctAnswer: '评分要点（3分）：①提出可行的具体行动，如为老人提供口述录音的文字稿、为居民设置易读展签、征求讲述者对公开内容的意见（1分）；②说明行动对象或实施方式与材料相符（1分）；③联系服务群众、认真负责或回应人民需要等价值内涵（1分）。仅写抽象口号不得满分。',
    gradingMode: 'self_check',
    explanation: '行动应基于展览服务对象和档案整理情境，具体到对象、步骤或反馈方式，并与精神内涵建立联系。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/hongyangweidadangjingshen', 'q9-行动设计'),
  },
  'politics-9a-1-1-q10': {
    id: 'politics-9a-1-1-q10', type: 'short_answer', knowledgePointId: 'shuxiehuigongshishi',
    prompt: withMaterial(historyMaterial, '展览结语拟写“百年发展离不开____”。请结合教材和材料补写一段 50 字左右的结语，既体现历史发展的领导力量和人民参与，也不把本县例子说成全国完整历史。（4分）'),
    correctAnswer: '评分要点（4分）：①体现中国共产党领导中国人民创造发展成就（1分）；②引用一项本县材料，如供水、道路或公共文化服务变化（1分）；③写出群众参与或发展为了人民等意思（1分）；④说明本县材料是具体例证，不代表全国历史全貌，表达连贯（1分）。',
    gradingMode: 'self_check',
    explanation: '结语既要呼应教材中的领导力量与人民主体，也要根据材料限定结论范围。',
    difficulty: 'EXAM', sourceRef: sourceRef('第一单元坚持党的全面领导/第一课百年大党风华正茂/politics-9a-1-1/shuxiehuigongshishi', 'q10-结语写作'),
  },

  // 道德与法治：九年级上册，第二单元第五课；原知识点 xitongkexuedelliluntixi / bixuchangqijianchidezhidaosixiang。
  'politics-9a-2-5-q1': {
    id: 'politics-9a-2-5-q1', type: 'single_choice', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '结合课程卡和县域调研记录，下列理解最准确的是（ ）。'),
    options: [
      '县里同时安排几项服务，说明这些地方措施本身就是一套完整的科学理论体系。',
      '课程卡已经说明理论内容，因此分析地方调研时不必再看需求和反馈。',
      '一项地方试点有使用记录，就足以说明课程卡中的理论内容都已落实。',
      '课程卡介绍的是科学理论体系；县域试点是地方实践案例，不能代替对理论整体内容的理解。',
    ], answerIndex: 3,
    explanation: '课程卡说明了习近平新时代中国特色社会主义思想的理论性质，县域试点则是地方实践材料。两者可以联系学习，但不能把若干地方措施等同于理论体系，也不能以一个案例替代理论学习。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q1-整体分析'),
  },
  'politics-9a-2-5-q2': {
    id: 'politics-9a-2-5-q2', type: 'short_answer', knowledgePointId: 'bixuchangqijianchidezhidaosixiang',
    prompt: withMaterial(theoryMaterial, '结合课程学习卡与县域调研材料，谈谈“必须长期坚持并不断发展”包含哪两层意思。回答时说明地方工作调整公交时刻，不等于地方在改写指导思想。（3分）'),
    correctAnswer: '评分要点（3分）：①长期坚持，指坚持这一重要指导思想的指导地位，不因一时情况随意放弃（1分）；②不断发展，指结合新的实践和时代任务深化认识、推进理论发展，而不是把理论当作僵化口号（1分）；③公交时刻调整是把工作方案按居民实际需要作具体改进，不等同于改写指导思想（1分）。',
    gradingMode: 'self_check',
    explanation: '课程卡给出“必须长期坚持并不断发展”的教材表述。地方调整具体服务安排属于改进实践方案，不能与理论本身的发展混为一谈。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/bixuchangqijianchidezhidaosixiang', 'q2-长期坚持与不断发展'),
  },
  'politics-9a-2-5-q3': {
    id: 'politics-9a-2-5-q3', type: 'single_choice', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '课程卡提示学习要把握思想体系的整体性。调研小组整理这份多选问卷时，以下哪项数据表述严谨？（ ）。'),
    options: [
      '三项户数相加超过 120 户，说明问卷数据必然错误。',
      '多选调查无法呈现居民对不同问题的关注情况。',
      '三项需求可能来自同一户居民，不能把三项户数相加后当作不同家庭总数。',
      '选择公交需求的 68 户，必然也都选择了助餐和河岸环境。',
    ], answerIndex: 2,
    explanation: '材料明确说明问卷允许多选，因此同一户可以关注多个问题。三项户数不能直接相加作为不同家庭数，但仍能呈现各类需求的数量。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q3-调查数据判读'),
  },
  'politics-9a-2-5-q4': {
    id: 'politics-9a-2-5-q4', type: 'short_answer', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '根据材料中的服务安排和居民反馈，概括县里试点采取的两种工作方法，并联系课程卡体现的整体性思路，说明为什么需要同时关注不同方面的需求。（3分）'),
    correctAnswer: '评分要点（3分）：①指出试点同时涉及公交、助餐、河岸环境等多个领域中的至少两项（1分）；②指出听取居民反馈并据此调整发车时刻，或结合问卷安排项目（1分）；③联系整体分析思路，说明不同需求相互关联，统筹考虑有助于更完整地回应居民生活需要，不能凭一项措施替代其他领域（1分）。',
    gradingMode: 'self_check',
    explanation: '材料体现了多领域安排和反馈调整。回答应从材料事实出发解释综合考虑的必要性，而不是只复述“系统完整”等概念。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q4-统筹与反馈'),
  },
  'politics-9a-2-5-q5': {
    id: 'politics-9a-2-5-q5', type: 'multiple_choice', knowledgePointId: 'bixuchangqijianchidezhidaosixiang',
    prompt: withMaterial(theoryMaterial, '结合课程卡，下列对“长期坚持并不断发展”的理解正确的有（多选）。'),
    options: [
      '既然要长期坚持，任何具体工作方案都不能根据情况调整。',
      '坚持指导思想的指导地位，同时认真学习其理论内容。',
      '结合新的实践和时代任务深化认识、推动理论发展。',
      '只要出现新问题，就可以随意放弃原有指导思想。',
    ], answerIndices: [1, 2],
    explanation: '长期坚持与不断发展是相统一的：既坚持指导地位，也结合新的实践不断深化发展；它不意味着具体方案一成不变，也不意味着随意放弃指导思想。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/bixuchangqijianchidezhidaosixiang', 'q5-观点辨析'),
  },
  'politics-9a-2-5-q6': {
    id: 'politics-9a-2-5-q6', type: 'short_answer', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '居民反映公交时刻与就医时间不匹配。结合课程卡所提示的整体分析思路，提出一套可操作的改进步骤，写出如何收集信息、协调相关服务并查看调整效果。（4分）'),
    correctAnswer: '评分要点（4分）：①向居民、卫生服务点或公交工作人员收集出行时间与就医时段信息（1分）；②在不影响基本运行条件下协商调整线路或发车时刻，并同步告知相关服务点和居民（1分）；③先试行并记录乘坐、就医衔接情况及居民反馈（1分）；④根据记录复核效果，必要时继续调整，不把一次调整视为所有问题已解决（1分）。',
    gradingMode: 'self_check',
    explanation: '方案应以材料中的具体矛盾为起点，兼顾乘客和就医时间，经过试行、记录和反馈再判断效果。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q6-解决实际问题'),
  },
  'politics-9a-2-5-q7': {
    id: 'politics-9a-2-5-q7', type: 'single_choice', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '有同学说：“试点记录了 2400 人次公交乘坐和 670 人次助餐，所以可以证明三个村的交通、养老和环境问题都已经解决。”对这一判断最合理的回应是（ ）。'),
    options: [
      '只要有人使用服务，就能证明该服务适合每一位居民。',
      '两项人次数据可以直接证明河岸环境已经改善。',
      '由于没有对照村，所有调研记录都没有参考价值。',
      '人次数据能说明服务被使用，但缺少基线和对照，不能据此证明所有问题都已解决。',
    ], answerIndex: 3,
    explanation: '记录反映一定时期内的服务使用次数，但没有试点前数据或对照村，不能证明因果效果，更不能据此判断所有问题已解决；材料仍可用于了解服务使用情况。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q7-数据结论边界'),
  },
  'politics-9a-2-5-q8': {
    id: 'politics-9a-2-5-q8', type: 'short_answer', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '课程卡称这一思想是“系统完整、逻辑严密”的科学理论体系。请从调研材料中找出一个“不能只看单项”的例子，解释整体分析能避免怎样的判断偏差。（3分）'),
    correctAnswer: '评分要点（3分）：①引用材料事实，如公交、助餐和河岸环境同时列入调查或试点（1分）；②说明单看公交人次不能代表养老、生态等方面的情况（1分）；③整体分析有助于避免以单一指标替代多方面需求或把局部结果夸大为总体成效（1分）。',
    gradingMode: 'self_check',
    explanation: '本题要求把教材中的“系统、整体”联系到具体材料，说明它怎样帮助准确判断，而不是单独抄写理论特征。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q8-整体判断'),
  },
  'politics-9a-2-5-q9': {
    id: 'politics-9a-2-5-q9', type: 'short_answer', knowledgePointId: 'bixuchangqijianchidezhidaosixiang',
    prompt: withMaterial(theoryMaterial, '如果把县里的公交试点直接照搬到一个人口分散、道路条件不同的地区，可能出现什么问题？结合“长期坚持并不断发展”说明应如何处理。（3分）'),
    correctAnswer: '评分要点（3分）：①指出条件不同，原方案可能与当地出行需求、道路条件不匹配（1分）；②说明应坚持科学理论的指导，同时从实际出发了解新情况、解决新问题（1分）；③提出调研、试行、评估或结合当地条件调整具体方案等可行做法（1分）。不能把调整地方方案说成放弃指导思想。',
    gradingMode: 'self_check',
    explanation: '材料中的具体服务方案针对当地调查结果。长期坚持指导思想不等于机械照搬某个地方做法；不断发展也不等于任意改变指导思想。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/bixuchangqijianchidezhidaosixiang', 'q9-情境迁移'),
  },
  'politics-9a-2-5-q10': {
    id: 'politics-9a-2-5-q10', type: 'short_answer', knowledgePointId: 'xitongkexuedelliluntixi',
    prompt: withMaterial(theoryMaterial, '班级要提交一份 60 字左右的调研结论，请写出一条有材料依据的结论和一条下一步需要补充的证据，并说明这样做为什么比单凭人次下结论更可靠。（4分）'),
    correctAnswer: '评分要点（4分）：①结论准确引用一项材料，如调查中不同需求户数、服务人次或公交时刻调整（1分）；②结论范围适当，不声称所有问题已解决或由单一措施造成（1分）；③提出需补充的证据，如试点前后同口径数据、居民满意度、对照地区或河岸监测记录（1分）；④说明多来源、可比较证据能更完整判断问题与措施效果（1分）。',
    gradingMode: 'self_check',
    explanation: '可靠的调研结论需要明确材料能支持什么、不能支持什么，并说明还需哪些数据；不能把使用人次直接当作成效证明。',
    difficulty: 'EXAM', sourceRef: sourceRef('第二单元进入新时代/第五课新时代的思想旗帜/politics-9a-2-5/xitongkexuedelliluntixi', 'q10-调研结论'),
  },

  // 道德与法治：九年级上册，第三单元第七课；原知识点 liubuzouzhanlve / zhongguoshixiandaihua。
  'politics-9a-3-7-q1': {
    id: 'politics-9a-3-7-q1', type: 'single_choice', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '根据课程时间轴，“两步走”战略的两个阶段目标对应正确的是（ ）。'),
    options: [
      '2020 年到 2035 年建成社会主义现代化强国；2035 年到本世纪中叶才开始基本实现社会主义现代化。',
      '2020—2035 年基本实现社会主义现代化；2035 年到本世纪中叶把我国建成富强民主文明和谐美丽的社会主义现代化强国。',
      '两个阶段都以 2035 年为终点，只是表述不同。',
      '第一阶段只要求经济发展，第二阶段不再涉及民主、文明、和谐与美丽。',
    ], answerIndex: 1,
    explanation: '课程时间轴明确了两个阶段及其目标。第一阶段到 2035 年基本实现社会主义现代化；第二阶段从 2035 年到本世纪中叶建成富强民主文明和谐美丽的社会主义现代化强国。',
    difficulty: 'MEDIUM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q1-两步走目标'),
  },
  'politics-9a-3-7-q2': {
    id: 'politics-9a-3-7-q2', type: 'short_answer', knowledgePointId: 'zhongguoshixiandaihua',
    prompt: withMaterial(modernizationMaterial, '从材料二选取两项事实，分别联系中国式现代化的两个特征，并解释对应关系。（4分）'),
    correctAnswer: '评分要点（4分）：两个“事实—特征”对应各2分：①30户小农户通过合作社共同销售并分享收益，可联系全体人民共同富裕的现代化，说明共享发展机会或收益（2分）；②图书室阅读活动可联系物质文明和精神文明相协调（2分）；③河岸修复、节水灌溉可联系人与自然和谐共生（2分）。任答两组，每组事实1分、特征与解释1分。',
    gradingMode: 'self_check',
    explanation: '回答必须从材料中选取事实，再联系中国式现代化的特征。地方项目只能说明相关实践方向，不能据此宣称全国目标已经实现。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/zhongguoshixiandaihua', 'q2-特征与证据'),
  },
  'politics-9a-3-7-q3': {
    id: 'politics-9a-3-7-q3', type: 'single_choice', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '假设清河县拟把“到 2028 年完成公交站无障碍改造”列为本地工作目标。对此认识正确的是（ ）。'),
    options: [
      '完成这一改造可作为地方发展的一项进展，但还需结合阶段目标和其他方面判断。',
      '地方工作目标只能安排到本世纪中叶，近期不宜设置节点。',
      '这是地方层面的具体任务，可以服务于发展目标，但不等同于国家“两步走”战略阶段目标。',
      '国家战略目标明确后，各地无需再根据本地需要安排具体工作。',
    ], answerIndex: 2,
    explanation: '国家战略明确长远阶段目标，地方可以结合实际设置可操作的近期任务。完成一项地方工作不能替代国家阶段目标的整体要求。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q3-战略与地方任务'),
  },
  'politics-9a-3-7-q4': {
    id: 'politics-9a-3-7-q4', type: 'short_answer', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '乙同学认为，一地出现几项新项目就能证明国家某一阶段目标已经完成。请运用时间轴和材料三指出这一判断的两处不足。（3分）'),
    correctAnswer: '评分要点（3分）：①国家“两步走”战略有明确的阶段时间和综合目标，不能由一项或几项地方项目替代（1分）；②清河县材料只是一地的局部观察，证据范围不足以证明国家整体目标完成（1分）；③还需依据更广泛、系统的国家发展证据和阶段目标进行判断（1分）。',
    gradingMode: 'self_check',
    explanation: '材料三提醒不能把地方项目直接等同于国家战略目标。判断发展阶段既要看时间节点，也要依据目标的整体性和证据范围。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q4-目标辨析'),
  },
  'politics-9a-3-7-q5': {
    id: 'politics-9a-3-7-q5', type: 'multiple_choice', knowledgePointId: 'zhongguoshixiandaihua',
    prompt: withMaterial(modernizationMaterial, '材料二中的事实可以直接联系中国式现代化的哪些特征？选择有材料依据的说法。（多选）'),
    options: [
      '合作社让小农户共同销售并按约定分享收益，可联系共同富裕的发展方向，但不能据此说当地已实现共同富裕。',
      '河岸修复与节水灌溉，体现人与自然和谐共生的发展方向。',
      '图书室开展阅读活动，足以说明当地居民的文化需求已经全面得到满足。',
      '开通公交线路，足以说明全体居民已经实现共同富裕。',
    ], answerIndices: [0, 1],
    explanation: '合作社收益共享的做法可联系共同富裕方向，河岸修复和节水灌溉可联系人与自然和谐共生；单项活动不能证明相关需求已全面满足或共同富裕已经实现。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/zhongguoshixiandaihua', 'q5-特征匹配'),
  },
  'politics-9a-3-7-q6': {
    id: 'politics-9a-3-7-q6', type: 'short_answer', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '结合“两步走”时间轴，给一名初中生提出一项近期可执行的学习或社会参与目标，并说明它如何与国家长远发展方向形成联系。不要把个人目标说成国家战略目标。（3分）'),
    correctAnswer: '评分要点（3分）：①目标具体可执行，如制定阶段学习计划、参加社区阅读服务、持续记录节水情况（1分）；②说明目标对应的能力、服务或绿色生活行动（1分）；③指出个人行动是在成长中为社会发展作准备或贡献，不能等同于国家战略目标（1分）。',
    gradingMode: 'self_check',
    explanation: '国家战略目标和个人成长目标层次不同。合理联系应体现个人可以通过持续学习、参与公共事务等方式为长远发展作准备，而不是夸大个人任务。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q6-个人行动'),
  },
  'politics-9a-3-7-q7': {
    id: 'politics-9a-3-7-q7', type: 'single_choice', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '县里另拟定补充方案：未来三年分批改造 12 个公交站点，提升老年人、残障人士等群体的出行便利。下列实施建议最合理的是（ ）。'),
    options: [
      '按站点客流量唯一排序，完成工程后主要核对施工进度。',
      '先调查站点使用需求和现状，按轻重缓急安排年度节点，分批改造并听取使用者反馈。',
      '优先选择施工最容易的站点，年底再依完成率决定是否调整计划。',
      '参考周边县的统一方案，确定改造顺序后不再收集各站点意见。',
    ], answerIndex: 1,
    explanation: '分阶段目标需要转化为结合实际的近期任务。先调查需求、合理排序、分批推进并收集反馈，有助于把三年计划落到实处并检视效果。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q7-地方实践与国家目标'),
  },
  'politics-9a-3-7-q8': {
    id: 'politics-9a-3-7-q8', type: 'short_answer', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '为把长远发展目标转化为可检查的年度工作，班级拟为材料中的河岸修复或节水灌溉设计一条跟踪记录。写出一项可观察指标和一种补充了解情况的方法，并说明为什么记录一段时间的变化比只记录项目投入更有参考价值。（4分）'),
    correctAnswer: '评分要点（4分）：①提出与项目相符、可持续记录的指标，如同一地块单位面积用水量、河岸本地植物成活情况或水质监测结果（1分）；②说明可采用前后同口径记录、定期监测或查阅运行台账等方法（1分）；③提出补充方法，如访谈农户、附近居民或管护人员，了解实际使用和变化（1分）；④说明连续指标和实际反馈有助于检视地方年度任务进展，是落实长远目标的阶段性依据，但不能单独替代国家长远目标的综合判断（1分）。',
    gradingMode: 'self_check',
    explanation: '年度指标能帮助把长远目标转化为可检查的基层工作。投入金额只能说明资源使用，持续记录环境或用水变化并结合使用者反馈，才更有助于了解项目运行情况。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q8-主题表达'),
  },
  'politics-9a-3-7-q9': {
    id: 'politics-9a-3-7-q9', type: 'short_answer', knowledgePointId: 'zhongguoshixiandaihua',
    prompt: withMaterial(modernizationMaterial, '根据材料二，写出一项不能仅凭这些资料判断的中国式现代化特征，并说明还需要什么证据。（3分）'),
    correctAnswer: '评分要点（3分）：①指出人口规模巨大或走和平发展道路等材料未直接呈现的特征（1分）；②说明材料二主要记录清河县本地公交、合作社、图书室和生态项目，不能直接证明该特征（1分）；③提出适当补充证据，如国家人口与公共服务的综合资料，或对外合作、和平发展相关的可靠材料（1分）。',
    gradingMode: 'self_check',
    explanation: '材料二可以联系共同发展、物质与精神文明协调、人与自然和谐共生等方面，但没有提供人口规模或对外发展情况的直接证据。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/zhongguoshixiandaihua', 'q9-证据边界'),
  },
  'politics-9a-3-7-q10': {
    id: 'politics-9a-3-7-q10', type: 'short_answer', knowledgePointId: 'liubuzouzhanlve',
    prompt: withMaterial(modernizationMaterial, '请用 60 字左右写一段“时间轴＋地方例子”的展板说明：写出“两步走”的一个阶段目标，引用清河县一项实践，并说明为什么这个例子不能单独证明国家阶段目标已经完成。（4分）'),
    correctAnswer: '评分要点（4分）：①准确写出一个阶段及目标，如 2020—2035 年基本实现社会主义现代化，或 2035 年到本世纪中叶建成社会主义现代化强国（1分）；②引用清河县一项准确事实（1分）；③说明该实践体现地方发展方向或具体工作（1分）；④指出一地、一项工作的证据范围有限，不能代替国家整体目标和更广泛证据（1分）。',
    gradingMode: 'self_check',
    explanation: '展板说明需要把战略时间目标与地方实践相联系，同时避免从局部案例推出国家目标已经完成。',
    difficulty: 'EXAM', sourceRef: sourceRef('第三单元奋进新征程/第七课擘画宏伟蓝图/politics-9a-3-7/liubuzouzhanlve', 'q10-材料写作'),
  },
}
