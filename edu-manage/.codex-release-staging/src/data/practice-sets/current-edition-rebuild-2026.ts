import type { PracticeSet } from '../parent-practice-bank'

type QuestionSeed = {
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
  point: number
}

type SetSeed = Omit<PracticeSet, 'knowledgePoints' | 'questions'> & {
  points: Array<[string, string]>
  questions: QuestionSeed[]
}

function makeSet(seed: SetSeed): PracticeSet {
  const { points, questions, ...metadata } = seed
  const knowledgePoints = points.map(([title, content], index) => ({
    id: `${seed.id}-kp${index + 1}`,
    title,
    content,
  }))

  return {
    ...metadata,
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
      sourceRef: `${seed.sourceNote}#${seed.id}-q${index + 1}`,
    })),
  }
}

const civicsSource = '本地新版统编道德与法治七上课本，PDF SHA-256 fca36b87643836e40a4baffb0183f9557ff9d8337b49e52891b44b3d7f66422b'
const civicsDirectory = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=9'
const civicsNote = `${civicsSource}；依目录与正文主题自编，未照录教材；目录交叉核对：${civicsDirectory}`

const civicsSets: SetSeed[] = [
  {
    id: 'rebuild-2026-politics-7a-u1-l1', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第一单元 少年有梦', section: '第一课 开启初中生活', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['适应初中生活', '主动了解新环境，积极参与学习和集体生活，在体验中发现成长机会。'], ['规划初中生活', '结合个人实际设置阶段目标，把规划落实为可执行的日常行动。']],
    questions: [
      { prompt: '小宁刚升入初中，发现课程和活动都比小学多。他最适合先做什么？', options: ['回避新任务，等老师逐项安排', '了解课程与校园安排，列出一周计划并及时调整', '只参加自己熟悉的活动', '把所有时间都用来做难题'], answerIndex: 1, explanation: '适应新阶段需要主动了解环境并规划时间；计划应结合实际、能够执行，也可以根据体验调整。', point: 0 },
      { prompt: '学校开放社团体验日，小宁想知道自己是否喜欢科学实验。哪种做法更能帮助他认识初中生活？', options: ['只看社团宣传，不参加体验', '参加体验并记录自己的兴趣与收获', '因为不熟悉就马上放弃', '只询问同学选了哪个社团'], answerIndex: 1, explanation: '亲身参与并反思体验，能帮助学生发现兴趣、了解学校生活并获得成长。', point: 0 },
      { prompt: '小宁把“本学期学会独立整理学习资料”作为目标。哪项安排最能把目标落到行动上？', options: ['等到期末再集中整理', '每天放学后整理当天资料，每周检查一次', '只在考试前问同学借笔记', '把目标改成“以后要努力”'], answerIndex: 1, explanation: '把具体目标分解为稳定的小行动并定期检查，才便于落实和改进。', point: 1 },
      { prompt: '小宁制定计划后发现每天安排过满，常常无法完成。更合理的调整是？', options: ['认定自己不适合做计划', '保留最重要的任务，给休息和突发情况留出时间', '取消全部课外活动和休息', '把未完成任务全部推到周末'], answerIndex: 1, explanation: '有效规划要符合实际，区分轻重缓急并留出弹性，避免只追求表面上的满档安排。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u1-l2', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第一单元 少年有梦', section: '第二课 正确认识自我', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['多角度认识自己', '通过自我评价、他人评价和实际表现等途径认识自己的特点。'], ['做更好的自己', '接纳真实的自己，发挥优势，并通过努力改进需要提升的方面。']],
    questions: [
      { prompt: '小雨觉得自己“不擅长表达”。一次小组汇报后，同学指出她准备充分、表达清楚。她怎样看待这条评价更合适？', options: ['只要别人夸奖就说明评价一定正确', '结合这次表现和自己的体验，进一步了解表达能力', '认为同学是在客套，不再听取意见', '以后只做不需要合作的任务'], answerIndex: 1, explanation: '他人评价能提供认识自己的新视角，但还要结合具体事实和自我感受综合判断。', point: 0 },
      { prompt: '小雨在数学推理上有优势，但容易忘记检查步骤。做更好的自己可以从哪项行动开始？', options: ['放弃数学，避免暴露不足', '发挥推理优势，同时养成逐步检查的习惯', '只关注自己的优点，不再改进', '要求同学替自己检查所有作业'], answerIndex: 1, explanation: '做更好的自己既要发挥优势，也要正视并改进不足，努力是持续的过程。', point: 1 },
      { prompt: '同学给小雨提出两条意见：一条指出作业常漏单位，并举出例子；另一条只说“你什么都做不好”。哪条更值得她认真参考？', options: ['第一条，因为它具体且有事实依据', '第二条，因为语气更严厉', '两条都必须完全接受', '两条都应立即拒绝'], answerIndex: 0, explanation: '评价是否有帮助，要看是否客观、具体并能帮助改进，而不是看语气是否严厉。', point: 0 },
      { prompt: '小雨想提高整理能力，连续两天没有做到。更能体现“做更好的自己”的做法是？', options: ['宣布自己永远做不到', '分析遗漏原因，把整理任务改为每天固定五分钟', '把所有资料交给家长整理', '只在老师检查前临时收拾'], answerIndex: 1, explanation: '发现问题后调整方法、继续行动，比自我否定或依赖他人更有助于成长。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u1-l3', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第一单元 少年有梦', section: '第三课 梦想始于当下', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['树立梦想', '把个人发展与现实生活联系起来，形成积极、可持续的目标。'], ['学习成就梦想', '学习能增长知识和能力，逐步为实现目标积累条件。']],
    questions: [
      { prompt: '小航梦想成为工程师。他现在最适合做哪件事来接近这个梦想？', options: ['只把梦想写在墙上，不再安排行动', '认真学习并参加科学实践，逐步培养解决问题的能力', '要求学校保证自己将来成为工程师', '因为目标很远就不再尝试'], answerIndex: 1, explanation: '梦想需要行动支撑；学习和实践能帮助积累知识、能力与经验。', point: 0 },
      { prompt: '小航认为“学习只是为了考试”。哪种理解更完整？', options: ['学习能增长知识、提升能力，也帮助我们认识世界和规划未来', '学习只对排名有用', '只要记住答案就不需要理解', '学习与生活中的问题没有关系'], answerIndex: 0, explanation: '学习不仅服务于考试，还能提升能力、拓展认识并为未来发展打基础。', point: 1 },
      { prompt: '小航给自己设定“本周每天读十分钟科普文章”的小目标。这种安排的优点是？', options: ['把长远兴趣转化为可坚持的具体行动', '保证他立刻实现职业梦想', '不需要再学习其他课程', '目标越小就越没有价值'], answerIndex: 0, explanation: '稳定、具体的小行动能让梦想从愿望逐步转化为现实积累，但不能保证一蹴而就。', point: 0 },
      { prompt: '一次科学实验没有成功，小航想直接放弃。更合理的态度是？', options: ['把失败当作改进方法的线索，分析原因后再试', '认定梦想不可能实现', '隐瞒结果，假装成功', '把失败归咎于所有组员'], answerIndex: 0, explanation: '学习和实践会遇到困难，分析问题、调整方法并坚持行动能促进成长。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u2-l4', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第二单元 成长的时空', section: '第四课 幸福和睦的家庭', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['家的意味', '家庭提供亲情支持和生活联结，成员之间应相互关爱与承担责任。'], ['让家更美好', '尊重、沟通、分担和理解能促进家庭成员和睦相处。']],
    questions: [
      { prompt: '父母工作繁忙，周末仍抽时间听小杰讲学校的事。这最能体现家庭生活中的什么？', options: ['家庭只承担经济供给', '亲情交流与相互关心', '家庭成员必须兴趣相同', '孩子无需承担任何责任'], answerIndex: 1, explanation: '家庭不仅是共同生活的场所，也承载情感交流、关爱和支持。', point: 0 },
      { prompt: '小杰和家人因家务分工发生争执。哪种做法更有助于让家更美好？', options: ['不沟通，等别人主动解决', '平静说明各自困难，共同商量公平可行的分工', '把家务都推给最忙的人', '用冷战迫使对方让步'], answerIndex: 1, explanation: '平等沟通、相互理解并共同承担责任，有助于改善家庭关系。', point: 1 },
      { prompt: '小杰发现奶奶不熟悉视频通话，于是耐心教她联系远方亲人。这说明他？', options: ['通过实际行动增进家庭成员间的联结', '把家庭责任全部转给长辈', '认为家庭成员不需要沟通', '只在有奖励时才帮助家人'], answerIndex: 0, explanation: '主动帮助家人保持联系，是关爱家庭成员、增进亲情的具体行动。', point: 1 },
      { prompt: '关于“幸福和睦的家庭”，下列理解更恰当的是？', options: ['家庭和睦意味着从不出现分歧', '家庭成员相互关心、尊重并愿意沟通解决分歧', '只有家长需要为家庭付出', '家人必须赞同彼此的每个决定'], answerIndex: 1, explanation: '和睦家庭并非没有分歧，而是能够尊重彼此并通过沟通处理问题。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u2-l5', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第二单元 成长的时空', section: '第五课 和谐的师生关系', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['认识老师', '教师承担教书育人职责，教师的风格可以不同，尊重差异有助于学习。'], ['珍惜师生情谊', '坦诚、礼貌地表达想法并主动沟通，有助于建立良好师生关系。']],
    questions: [
      { prompt: '新来的老师讲解方式与以前不同，小林一开始不适应。哪种做法更合适？', options: ['先了解老师的讲解特点，尝试调整听课和提问方式', '认定只有一种讲课方式才正确', '拒绝听课并要求更换老师', '把不适应归咎于同桌'], answerIndex: 0, explanation: '教师有不同的教学风格，主动了解并调整学习方式能帮助建立积极的师生关系。', point: 0 },
      { prompt: '小林对一次作业评分有疑问，怎样向老师表达更有助于解决问题？', options: ['课后礼貌说明疑问，并请老师指出评分依据', '在班级群里嘲笑老师', '不问原因，直接给自己加分', '让同学替自己去争吵'], answerIndex: 0, explanation: '尊重、清楚地表达疑问并寻求解释，体现了有效沟通。', point: 1 },
      { prompt: '老师指出小林小组实验记录不完整，并建议补充数据。小林最合理的回应是？', options: ['结合记录检查遗漏，必要时向老师请教', '认为老师不喜欢自己，拒绝修改', '删去所有数据避免被批评', '要求组员承担全部责任'], answerIndex: 0, explanation: '把指导意见用于改进学习，是珍惜师生交流和学习机会的表现。', point: 1 },
      { prompt: '同一位老师对不同学生采用不同的帮助方式，可能是因为？', options: ['老师可以根据学生特点提供适合的指导', '老师必须对每个人说完全相同的话', '教师只需要关注成绩最高的学生', '学生不需要表达自己的困难'], answerIndex: 0, explanation: '理解教师工作的差异性，有助于学生主动沟通并接受适合自己的指导。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u2-l6', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第二单元 成长的时空', section: '第六课 友谊之树常青', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['友谊的真谛', '真诚、尊重、理解和支持是友谊的重要基础。'], ['交友的智慧', '交往中保持原则与边界，遇到分歧时坦诚沟通。']],
    questions: [
      { prompt: '小安考试失利，朋友没有嘲笑他，而是陪他分析错题。这个做法体现了友谊中的？', options: ['相互支持与真诚关心', '要求朋友成绩必须相同', '替朋友承担所有责任', '只在顺利时交往'], answerIndex: 0, explanation: '朋友在困难时给予理解和支持，是友谊的重要表现。', point: 0 },
      { prompt: '朋友让小安替他隐瞒损坏公物的事实。小安怎样做更合适？', options: ['为了友谊答应隐瞒', '拒绝欺骗，并建议朋友主动说明和承担责任', '把事情发到网上让大家围观', '以后不再和任何人交朋友'], answerIndex: 1, explanation: '友谊需要真诚，也应坚持原则；帮助朋友改正比包庇更有益。', point: 1 },
      { prompt: '小安和朋友因社团选择意见不同。更能维护友谊的做法是？', options: ['尊重彼此选择，说明理由并继续友好相处', '要求朋友必须选择同一社团', '用沉默惩罚对方', '在同学面前散布对方的隐私'], answerIndex: 0, explanation: '友谊不是控制或占有，尊重差异并沟通能使关系更健康。', point: 1 },
      { prompt: '网络上新认识的网友提出索要住址和家庭信息，正确做法是？', options: ['为了显得信任而全部提供', '保护个人信息，必要时向家长或老师求助', '先把同学的住址发给网友', '随意点击对方发来的文件'], answerIndex: 1, explanation: '网络交友需要提高安全意识，不随意泄露个人信息或点击来源不明内容。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u2-l7', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第二单元 成长的时空', section: '第七课 在集体中成长', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['集体生活成就我', '集体为个人发展提供交往、合作和展示能力的机会。'], ['共建美好集体', '成员共同遵守规则、承担责任、互相协作，推动集体发展。']],
    questions: [
      { prompt: '班级准备参加科技节，小林擅长绘图，主动为小组设计展示海报。这说明集体生活？', options: ['能让成员在合作中发挥特长并发展自己', '要求每个人做完全相同的事', '只对组长有帮助', '会妨碍个人成长'], answerIndex: 0, explanation: '集体提供合作和展示的机会，成员也能在参与中发展个人能力。', point: 0 },
      { prompt: '小组约定每人完成一部分实验报告，有人没有按时提交。最合适的处理是？', options: ['小组一起确认困难、提醒责任并调整分工', '把报告全部删掉', '公开嘲笑未完成的同学', '以后不再制定任何规则'], answerIndex: 0, explanation: '共同承担责任、沟通解决问题，能维护规则并促进集体合作。', point: 1 },
      { prompt: '小林希望在小组讨论中表达不同意见。哪种方式兼顾个人想法与集体合作？', options: ['说明理由并倾听其他成员意见', '打断所有人直到大家接受', '不说明原因就退出小组', '把不同意见藏起来再私下抱怨'], answerIndex: 0, explanation: '表达个人意见与尊重、倾听他人可以同时做到，有助于形成更好的集体决定。', point: 1 },
      { prompt: '班级集体活动中，哪项行为最有利于形成良好氛围？', options: ['只做容易被表扬的任务', '遵守共同约定，主动补位并尊重每位成员', '把失败都归咎于他人', '让少数同学承担全部工作'], answerIndex: 1, explanation: '良好集体需要成员共同参与、相互尊重并承担责任。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u3-l8', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第三单元 珍爱我们的生命', section: '第八课 生命可贵', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['认识生命', '生命具有独特性和不可逆性，尊重生命也包括关爱自己与他人。'], ['敬畏生命', '面对他人生命时保持关切，在力所能及范围内提供帮助并注意安全。']],
    questions: [
      { prompt: '同学因身体条件不同，无法参加某项跑步比赛。班级应怎样做？', options: ['嘲笑他不够努力', '尊重差异，帮助他找到适合参与的活动方式', '要求他不再参加任何集体活动', '只让身体条件相同的人参加班级活动'], answerIndex: 1, explanation: '生命各有特点，应尊重差异并为每个人提供适当参与和发展的机会。', point: 0 },
      { prompt: '在路边看到有人摔倒，自己不清楚伤情。哪种做法更体现关爱生命且稳妥？', options: ['立即围观拍摄', '先确保自身安全，及时联系成年人或急救人员', '随意搬动伤者', '假装没有看见'], answerIndex: 1, explanation: '关爱他人生命时也要讲求科学方法；及时寻求专业帮助并确保安全。', point: 1 },
      { prompt: '小琳为了赶时间，准备在车流中横穿马路。她应当？', options: ['只要跑得快就可以', '遵守交通信号，选择安全过街设施', '跟着陌生人随意穿行', '戴耳机后快速通过'], answerIndex: 1, explanation: '尊重和珍爱生命要落实在日常安全行为中，遵守交通规则能降低风险。', point: 1 },
      { prompt: '关于生命的独特性，下列理解正确的是？', options: ['每个人的经历和特点都完全相同', '每个生命都有自身特点，值得尊重和珍惜', '只有取得成绩的人生才有价值', '生命遇到困难时可以随意放弃'], answerIndex: 1, explanation: '生命各有特点和发展可能，不能以单一标准否定生命的价值。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u3-l9', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第三单元 珍爱我们的生命', section: '第九课 守护生命安全', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['增强安全意识', '主动识别生活中的风险，遵守安全规则并预防事故。'], ['提高防护能力', '学习求助和应急方法，遇到危险时冷静、及时向可信成年人或专业人员求助。']],
    questions: [
      { prompt: '放学时遇到暴雨积水，回家路线的一段道路已被水淹没。小明应当？', options: ['试探水深后快速趟过', '绕行安全路线并告知家长或老师', '跟随人群进入积水路段', '在水中边走边使用手机'], answerIndex: 1, explanation: '不确定的积水路段可能有暗坑或电力风险，应避免涉险并及时告知成年人。', point: 0 },
      { prompt: '陌生人自称是家长同事，要求小明独自跟他离开学校。小明首先应？', options: ['直接跟随以表示礼貌', '留在学校安全区域并向老师核实、联系家长', '把家庭地址告诉对方', '先上车再考虑'], answerIndex: 1, explanation: '面对身份未经核实的接送请求，应留在安全地点并通过可信渠道确认。', point: 1 },
      { prompt: '同学在实验中不慎打翻玻璃器皿。正确的第一步是？', options: ['徒手捡碎片', '提醒周围同学避开并请老师按实验安全要求处理', '把碎片扫到桌下', '继续实验不作处理'], answerIndex: 1, explanation: '实验事故应先避免他人受伤，再向老师求助并按规范清理。', point: 1 },
      { prompt: '学习安全知识后，哪种做法最能提升实际防护能力？', options: ['只记住口号，不参加演练', '熟悉求助方式并认真参加学校安全演练', '把所有危险都交给别人处理', '认为事故只会发生在别人身上'], answerIndex: 1, explanation: '掌握步骤并通过演练熟悉流程，能帮助学生在突发情境中更有序地行动。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u3-l10', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第三单元 珍爱我们的生命', section: '第十课 保持身心健康', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['爱护身体', '合理饮食、睡眠、运动和安全习惯是维护身体健康的基础。'], ['滋养心灵', '关注情绪变化，采用积极方式调节；需要时及时向可信的人求助。']],
    questions: [
      { prompt: '小然连续熬夜复习，白天常常注意力不集中。更好的调整是？', options: ['继续减少睡眠以多做题', '安排规律作息，保证睡眠并分段复习', '每天只靠饮料提神', '停止所有学习活动'], answerIndex: 1, explanation: '充足休息有助于身体和学习状态；合理安排学习与睡眠比持续熬夜更可行。', point: 0 },
      { prompt: '比赛失利后，小然感到失落。哪种做法更有助于滋养心灵？', options: ['承认情绪，和信任的人交流并总结经验', '假装自己从不难过', '把失利归咎于队友并辱骂他们', '以后拒绝参加任何活动'], answerIndex: 0, explanation: '接纳情绪、表达感受并寻求支持，有助于积极调节和恢复。', point: 1 },
      { prompt: '小然长期因焦虑无法入睡，尝试自我调节后仍没有改善。她应当？', options: ['认为求助很丢脸而独自承受', '及时告诉家长或老师，寻求合适的帮助', '停止与所有人交流', '用网络上的偏方替代专业建议'], answerIndex: 1, explanation: '持续影响生活的情绪困扰需要及时向可信成年人求助，必要时寻求专业支持。', point: 1 },
      { prompt: '下列哪组做法更有利于保持身心健康？', options: ['规律运动、均衡饮食、合理休息并保持适度社交', '每天久坐到深夜，只在考试前运动', '情绪不好时迁怒他人', '身体不舒服也不告诉任何人'], answerIndex: 0, explanation: '身心健康需要身体照护、情绪调节、休息和积极交往等方面共同维护。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u4-l11', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第四单元 追求美好人生', section: '第十一课 确立人生目标', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['探问人生目标', '思考个人兴趣、能力与社会需要，有助于形成有意义的目标。'], ['树立正确目标', '目标应积极、合理并能引导持续行动，而非只追求外在比较。']],
    questions: [
      { prompt: '小周选定目标时，只因为“同学都想当网红”。哪种思考能帮助他形成更适合自己的目标？', options: ['了解自己的兴趣和能力，并考虑目标所需的实际努力', '只比较哪个目标更容易出名', '让同学替自己决定一生', '选择最能让别人羡慕的职业'], answerIndex: 0, explanation: '人生目标应联系自身特点和现实条件，也要通过实践不断认识和调整。', point: 0 },
      { prompt: '小周想成为医生，近期目标是“把生物成绩提高一点”。怎样使目标更清晰？', options: ['写明本月每周复习安排和检查方式', '改成“以后一定会成功”', '只记录目标，不采取行动', '要求老师保证成绩提高'], answerIndex: 0, explanation: '阶段目标越具体、越可检查，越能指导实际行动。', point: 1 },
      { prompt: '关于人生目标，下列理解更恰当的是？', options: ['目标一旦确定就永远不能调整', '目标能为行动提供方向，也可根据成长和实践作合理调整', '目标只需满足别人的期待', '目标越多越容易实现'], answerIndex: 1, explanation: '目标提供方向，但随着认识和条件变化，合理反思与调整也是必要的。', point: 1 },
      { prompt: '小周发现自己的目标与目前能力差距较大。最有建设性的做法是？', options: ['放弃目标并否定自己', '把远期目标拆成阶段任务，逐步积累所需能力', '要求别人替自己完成准备', '假装差距不存在'], answerIndex: 1, explanation: '阶段化行动可以帮助学生把较长远的目标转化为可实践的成长过程。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u4-l12', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第四单元 追求美好人生', section: '第十二课 端正人生态度', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['积极的人生态度', '积极态度体现在面对问题时愿意行动、学习和承担责任。'], ['对待顺境和逆境', '顺境中保持清醒，逆境中分析原因、寻求支持并继续努力。']],
    questions: [
      { prompt: '小雨做小组项目时遇到资料不足。积极的人生态度表现为？', options: ['等待别人解决所有问题', '主动查找可靠资料并与组员讨论下一步', '把任务放弃并责怪环境', '编造资料让项目看起来完整'], answerIndex: 1, explanation: '积极态度不是否认困难，而是面对问题、采取负责且可行的行动。', point: 0 },
      { prompt: '连续几次测验成绩提高后，小雨开始不做复习。怎样看待顺境更合适？', options: ['把进步当作继续努力的基础，保持踏实和自我检查', '认为以后不需要学习', '把成绩全部归功于运气', '嘲笑暂时落后的同学'], answerIndex: 0, explanation: '顺境中保持清醒、继续努力，能避免因一时顺利而松懈。', point: 1 },
      { prompt: '小雨在演讲比赛中没有获奖。哪种做法更有助于面对逆境？', options: ['分析反馈、练习薄弱环节，并决定是否继续参赛', '认定自己没有任何优点', '指责评委并拒绝听建议', '以后不再尝试新事物'], answerIndex: 0, explanation: '从挫折中总结经验、调整方法并继续行动，是面对逆境的建设性方式。', point: 1 },
      { prompt: '同学遭遇困难时，小雨说“只要乐观就一定没问题”。这句话有什么不足？', options: ['忽略了实际困难和寻求支持、采取行动的需要', '说明她过于认真', '表明她不该关心同学', '说明乐观与行动完全相同'], answerIndex: 0, explanation: '积极态度不等于空泛乐观，还需要正视困难、采取行动并在需要时求助。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u4-l13', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第四单元 追求美好人生', section: '第十三课 实现人生价值', edition: '统编版（人民教育出版社） · 2024 秋学年版',
    sourceNote: civicsNote,
    points: [['劳动创造价值', '劳动既创造生活成果，也体现个人能力和对社会的贡献。'], ['奉献成就人生', '在关心他人、服务集体和社会的行动中实现有意义的价值。']],
    questions: [
      { prompt: '学校图书角常有书籍摆放混乱，小敏主动利用值日时间整理并制作借阅提示。这体现了？', options: ['劳动与服务能创造实际价值', '只有有报酬的工作才有意义', '集体事务与个人无关', '劳动只是在完成老师命令'], answerIndex: 0, explanation: '劳动能改善共同环境，服务集体也是创造价值的具体方式。', point: 0 },
      { prompt: '小敏认为“只有做出惊天动地的大事，人生才有价值”。更恰当的认识是？', options: ['日常认真学习、劳动和帮助他人也能体现价值', '人生价值只由收入决定', '普通人的行动都没有意义', '只有被别人看见的付出才算价值'], answerIndex: 0, explanation: '人生价值可以体现在平凡而负责的学习、劳动和服务中。', point: 1 },
      { prompt: '同学因受伤暂时无法搬运动物资，小敏组织同学重新分工并承担登记。她的做法体现了？', options: ['根据实际需要承担责任并服务集体', '只有亲自搬运才算奉献', '把责任全部交给受伤同学', '为了表扬而拒绝合作'], answerIndex: 0, explanation: '奉献可以结合个人能力与实际需要，用适当方式支持他人和集体。', point: 1 },
      { prompt: '关于劳动和人生价值，下列说法更合理的是？', options: ['劳动只为了获得奖励', '认真劳动、创造和服务能让个人成长并为他人带来帮助', '只有成年人劳动才有价值', '学习与劳动没有联系'], answerIndex: 1, explanation: '劳动能促进个人成长，也能创造成果、服务他人和社会。', point: 0 },
    ],
  },
]

const civicsReviewSets: SetSeed[] = [
  {
    id: 'rebuild-2026-politics-7a-u1-review', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第一单元 少年有梦', section: '单元思考与行动', edition: '统编版（人民教育出版社） · 2024 秋学年版', sourceNote: civicsNote,
    points: [['适应与规划', '适应新阶段需要主动体验、认识自我并制定可执行计划。'], ['梦想与学习', '把目标转化为持续学习和实践，逐步积累实现梦想的条件。']],
    questions: [
      { prompt: '刚入学的小组需要共同完成校园介绍。小安擅长观察，主动记录校园设施并参与讲解。这一经历可能帮助他？', options: ['认识新环境并发现自身能力', '避免与同学合作', '立即确定一生的职业', '不再需要规划学习'], answerIndex: 0, explanation: '主动参与新生活能帮助学生认识环境、锻炼能力并发现兴趣。', point: 0 },
      { prompt: '小安希望提高英语阅读能力，哪项计划最便于检查？', options: ['每天读一篇适合自己水平的短文并记录新词', '以后要认真学英语', '考试前一天读很多文章', '让同学保证自己的成绩'], answerIndex: 0, explanation: '具体、持续并可记录的行动有助于落实计划和观察进步。', point: 0 },
      { prompt: '小安的长期梦想暂时没有实现，他怎样理解学习与梦想的关系？', options: ['学习能积累知识和能力，是逐步接近目标的重要途径', '学习只有在梦想实现后才有用', '只要有梦想就不需要学习', '学习会阻止梦想实现'], answerIndex: 0, explanation: '学习帮助个人增长知识、能力，为未来发展和实现目标积累条件。', point: 1 },
      { prompt: '计划实施一周后，小安发现每天安排的任务太多。正确的做法是？', options: ['回顾完成情况，调整任务数量和顺序', '认定计划没有意义并彻底放弃', '取消睡眠时间补足任务', '把所有未完成任务交给同学'], answerIndex: 0, explanation: '计划要根据实际执行情况持续调整，而不是追求不现实的安排。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u2-review', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第二单元 成长的时空', section: '单元思考与行动', edition: '统编版（人民教育出版社） · 2024 秋学年版', sourceNote: civicsNote,
    points: [['关系中的成长', '家庭、师生、友谊和集体交往都需要关爱、尊重、沟通与责任。'], ['交往边界', '友好相处不等于放弃原则，网络交往尤其要保护个人信息。']],
    questions: [
      { prompt: '小林和同学合作时发现分工不均。哪种办法同时体现沟通与集体责任？', options: ['共同核对任务量并重新协商分工', '让最安静的同学承担全部任务', '不说明情况，直接退出', '在网络上公开指责组员'], answerIndex: 0, explanation: '坦诚沟通并共同承担责任，有利于解决问题和维护合作关系。', point: 0 },
      { prompt: '朋友要求小林发送家庭住址以证明信任。小林应当？', options: ['拒绝泄露敏感信息并说明安全考虑', '立即发送所有家庭信息', '把父母联系方式也发给朋友', '以同样方式索要朋友密码'], answerIndex: 0, explanation: '健康友谊也要尊重安全边界，不能以信任为由要求泄露隐私。', point: 1 },
      { prompt: '老师指出小林的作业有错误，他想弄明白原因。最适当的做法是？', options: ['课后礼貌请教并认真订正', '故意不交后续作业', '在同学面前嘲讽老师', '要求同学替自己向老师争论'], answerIndex: 0, explanation: '主动、尊重地沟通并改进，是珍惜师生交流的表现。', point: 0 },
      { prompt: '小林在家庭中承担每周整理自己的书桌，并主动帮助家人分担一项家务。这体现了？', options: ['家庭成员可以通过责任与关爱共同营造和睦生活', '家务只能由家长完成', '家庭和睦不需要沟通', '个人成长与家庭生活无关'], answerIndex: 0, explanation: '家庭成员共同承担责任、彼此关心，有助于让家庭生活更加和睦。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u3-review', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第三单元 珍爱我们的生命', section: '单元思考与行动', edition: '统编版（人民教育出版社） · 2024 秋学年版', sourceNote: civicsNote,
    points: [['生命与尊重', '珍惜自己和他人的生命，尊重差异并在能力范围内提供帮助。'], ['安全与健康', '预防风险、掌握求助方法并保持身心健康的生活习惯。']],
    questions: [
      { prompt: '同学在实验室闻到刺激性气味，不确定是否有危险。首先应？', options: ['立即提醒老师并按实验室应急要求离开或处理', '继续操作确认气味来源', '靠近容器闻得更仔细', '把情况拍下来发到社交平台'], answerIndex: 0, explanation: '遇到不明风险应先确保安全并报告老师，不能擅自靠近或继续操作。', point: 1 },
      { prompt: '一位同学因焦虑主动向老师求助。其他同学怎样做更合适？', options: ['尊重其隐私并给予支持', '把情况当作笑话传播', '要求他立即停止所有活动', '未经同意公开他的谈话内容'], answerIndex: 0, explanation: '尊重隐私、给予支持有助于保护同学的身心健康。', point: 1 },
      { prompt: '小晴发现同伴在网络上发布了包含住址的照片。她可以？', options: ['提醒同伴及时删除并告诉可信成年人', '把照片转发给更多人', '公开评论住址细节', '下载保存后分享'], answerIndex: 0, explanation: '及时保护个人信息并向可信成年人求助，能降低隐私和安全风险。', point: 1 },
      { prompt: '下列哪项最全面体现珍爱生命？', options: ['维护身体健康、关注情绪、遵守安全规则并尊重他人生命', '只关心成绩，不考虑身体状况', '只要自己安全就可以忽视他人', '遇到困难时拒绝任何帮助'], answerIndex: 0, explanation: '珍爱生命包括身体、心理和安全等方面，也包含对他人生命的尊重。', point: 0 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-u4-review', grade: '初一', subject: '政治', volume: '上册',
    chapter: '第四单元 追求美好人生', section: '单元思考与行动', edition: '统编版（人民教育出版社） · 2024 秋学年版', sourceNote: civicsNote,
    points: [['目标与行动', '有意义的人生目标要联系实际，并通过持续行动逐步实现。'], ['劳动与价值', '劳动、担当和服务能促进个人成长并为他人和集体创造价值。']],
    questions: [
      { prompt: '小航想改善班级阅读角，先询问同学需要，再制定整理与借阅计划。这一过程体现了？', options: ['目标结合实际需要并转化为行动', '只要有想法就不必了解需求', '个人目标不能考虑他人', '计划越复杂越有价值'], answerIndex: 0, explanation: '了解实际需要、制定可行计划并付诸行动，能使目标更有意义。', point: 0 },
      { prompt: '小航帮助同学整理资料，但没有得到表扬。他仍觉得这件事值得做，因为？', options: ['帮助集体解决实际问题本身就能体现责任和价值', '只有表扬才能证明行动有意义', '奉献必须获得奖励', '集体事务不需要个人参与'], answerIndex: 0, explanation: '劳动和服务的价值不只由外在奖励决定，也体现在解决问题和帮助他人。', point: 1 },
      { prompt: '小航目标很多，常常无法坚持。更可行的调整是？', options: ['选出当前最重要的一项，分解成小步骤并定期回顾', '继续增加更多目标', '把目标全部交给家长安排', '不再制定任何目标'], answerIndex: 0, explanation: '聚焦重点、逐步行动和定期反思能提高目标的可执行性。', point: 0 },
      { prompt: '关于顺境、逆境与人生价值，哪项理解更恰当？', options: ['顺境中继续努力，逆境中总结和求助，日常劳动也能创造价值', '顺境时无需努力，逆境时只能放弃', '人生价值只在获得奖项时产生', '困难越多越说明人生没有价值'], answerIndex: 0, explanation: '积极人生态度既包括顺境中的踏实，也包括逆境中的行动；价值能在平凡劳动和奉献中体现。', point: 1 },
    ],
  },
  {
    id: 'rebuild-2026-politics-7a-book-review', grade: '初一', subject: '政治', volume: '上册',
    chapter: '本册综合', section: '本册综合', edition: '统编版（人民教育出版社） · 2024 秋学年版', sourceNote: civicsNote,
    points: [['自我与目标', '认识自己、规划行动、学习成长相互联系。'], ['关系与责任', '在家庭、师生、友谊和集体生活中尊重他人并承担责任。'], ['生命与价值', '珍惜生命、提升安全能力，通过劳动和服务创造价值。']],
    questions: [
      { prompt: '小宁参加班级项目时，发现自己擅长搜集资料但不擅长公开表达。他怎样做能促进个人与集体共同成长？', options: ['承担资料整理任务，同时逐步练习汇报', '拒绝参加项目', '把所有任务交给表达能力强的同学', '只选择容易得到表扬的工作'], answerIndex: 0, explanation: '认识自身特点、发挥优势并在实践中改进不足，能让个人发展与集体需要相结合。', point: 0 },
      { prompt: '朋友因考试失利很沮丧，同时不愿立刻讨论原因。小宁最合适的做法是？', options: ['先给予理解和陪伴，尊重对方节奏，再在合适时提供支持', '强迫朋友马上接受自己的计划', '把朋友的成绩告诉全班', '批评朋友不够坚强'], answerIndex: 0, explanation: '关心朋友要尊重其感受和边界，给予支持而不是控制或传播隐私。', point: 1 },
      { prompt: '学校准备安全疏散演练，有同学认为“只是演练，不必认真”。正确认识是？', options: ['演练能帮助熟悉流程、提升突发情况下的防护能力', '只有真的发生事故才需要学习安全方法', '演练会妨碍所有学习', '安全完全由老师负责'], answerIndex: 0, explanation: '认真参加演练能帮助学生熟悉应急流程，提高自我保护和互助能力。', point: 2 },
      { prompt: '小宁为社区图书角整理书籍并帮助老人使用借阅设备。这个行动最能说明？', options: ['个人可以通过劳动和服务为他人及社会创造价值', '只有大型活动才能体现人生价值', '服务他人会阻碍个人成长', '劳动只有获得报酬才有意义'], answerIndex: 0, explanation: '日常劳动和服务能够解决实际需要，也体现个人担当与价值。', point: 2 },
    ],
  },
]

const englishSource = 'https://jx.panqjy.cn/books/3002346/（人教版2024九年级下册公开目录）；原创题按单元主题与义务教育英语课程标准编制，不照录教材'

function englishSet(
  id: string,
  unit: string,
  section: 'Section A' | 'Section B',
  theme: string,
  questions: QuestionSeed[],
): SetSeed {
  return {
    id, grade: '初三', subject: '英语', volume: '下册',
    chapter: unit, section,
    edition: '人教版（人民教育出版社） · 2027 春学期版',
    sourceNote: englishSource,
    points: [[`${theme}主题词汇`, `在${theme}情境中理解词义并选择恰当表达。`], ['语篇理解与表达', `围绕${theme}主题提取信息、组织表达并结合语境判断。`]],
    questions,
  }
}

const englishSets: SetSeed[] = [
  englishSet('rebuild-2026-english-9b-u1-a', 'Unit 1 Let’s Celebrate!', 'Section A', '节日与庆祝', [
    { prompt: 'Our class will ______ the Lantern Festival with riddles and a small display.', options: ['celebrate', 'borrow', 'repair', 'invite'], answerIndex: 0, explanation: 'celebrate a festival 表示“庆祝节日”，符合句意。', point: 0 },
    { prompt: 'Mia asks, “What do people usually do during the festival?” Which reply gives a custom?', options: ['Many families share a special meal.', 'The library closes at five.', 'My pencil is blue.', 'The bus is behind the school.'], answerIndex: 0, explanation: '问题询问节日习俗，分享节日餐食是与节庆相关的回答。', point: 0 },
    { prompt: 'Read: “Families hang red lanterns, prepare food, and visit relatives. The festival is a time to share good wishes.” What is the main idea?', options: ['A family is moving house.', 'People celebrate together and share wishes.', 'Lanterns are difficult to make.', 'Relatives should not visit.'], answerIndex: 1, explanation: '语段列举挂灯笼、准备食物和拜访亲友，中心是共同庆祝并传递祝愿。', point: 1 },
    { prompt: 'Which question is the best follow-up when learning about another family’s festival tradition?', options: ['Why is your pencil red?', 'What does this tradition mean to your family?', 'How many windows are in the room?', 'Where did you buy your shoes?'], answerIndex: 1, explanation: '询问习俗的意义能进一步了解节日文化，而不是转向无关细节。', point: 1 },
  ]),
  englishSet('rebuild-2026-english-9b-u1-b', 'Unit 1 Let’s Celebrate!', 'Section B', '节日与庆祝', [
    { prompt: 'Read: “At our school festival, students bring food from home. We label each dish and ask about ingredients before sharing.” Why do students label the dishes?', options: ['To help everyone know what the food contains.', 'To make the dishes heavier.', 'To choose a new classroom.', 'To finish the festival earlier.'], answerIndex: 0, explanation: '标注食物和询问配料能帮助参与者了解食物内容。', point: 1 },
    { prompt: 'Which sentence shows respect for a different festival custom?', options: ['Your custom is strange, so stop it.', 'Could you tell me what this custom means?', 'Everyone must celebrate in the same way.', 'I will laugh before I learn about it.'], answerIndex: 1, explanation: '礼貌询问习俗含义体现尊重和跨文化理解。', point: 0 },
    { prompt: 'A student is writing a short invitation for a festival event. Which detail is most useful?', options: ['The event time and place', 'A list of unrelated homework', 'A private password', 'A story about a different class'], answerIndex: 0, explanation: '邀请需要包含参加者能够据此行动的时间和地点等关键信息。', point: 1 },
    { prompt: 'Choose the best ending for a festival message: “We hope you can join us and ______.”', options: ['share the joy of the day', 'forget the meeting time', 'hide the room number', 'leave all the work to others'], answerIndex: 0, explanation: 'share the joy of the day 与节日邀请语境和积极语气一致。', point: 0 },
  ]),
  englishSet('rebuild-2026-english-9b-u2-a', 'Unit 2 A Look into the Past', 'Section A', '历史与过去', [
    { prompt: 'The museum guide showed us a map that was made hundreds of years ago. The map is a historical ______.', options: ['record', 'recipe', 'uniform', 'promise'], answerIndex: 0, explanation: 'record 可表示记录或史料，符合古地图保存历史信息的语境。', point: 0 },
    { prompt: 'Which sentence correctly describes a completed event in the past?', options: ['The team visited the old bridge last Friday.', 'The team visits the bridge tomorrow.', 'The team is visit the bridge now.', 'The team will visited the bridge.'], answerIndex: 0, explanation: 'last Friday 指过去时间，谓语应使用一般过去时 visited。', point: 1 },
    { prompt: 'Read: “The stone bridge was built near the river. Traders used it to carry goods between the two towns.” What was one use of the bridge?', options: ['It helped traders move goods.', 'It taught children to swim.', 'It stored all the town’s books.', 'It was used as a modern airport.'], answerIndex: 0, explanation: '文中明确说商人用桥在两座城镇之间运送货物。', point: 1 },
    { prompt: 'A timeline shows 1912, 1930, and 1945 from left to right. Which event happened earliest?', options: ['The event in 1945', 'The event in 1930', 'The event in 1912', 'The events happened together'], answerIndex: 2, explanation: '按时间先后排序，1912 年早于 1930 年和 1945 年。', point: 0 },
  ]),
  englishSet('rebuild-2026-english-9b-u2-b', 'Unit 2 A Look into the Past', 'Section B', '历史与过去', [
    { prompt: 'Read: “When people study an old object, they compare it with letters, maps, and other records.” What does “compare” mean here?', options: ['Look at things to find similarities or differences', 'Throw something away', 'Paint every object', 'Buy an object online'], answerIndex: 0, explanation: 'compare 表示比较，结合语境是把文物与其他史料对照研究。', point: 0 },
    { prompt: 'A student writes a paragraph about an old building. Which order is clearest?', options: ['Introduce it, give two facts about its past, then explain why it matters today', 'List unrelated words, then stop', 'Give the conclusion before naming the building and omit evidence', 'Repeat the title in every sentence'], answerIndex: 0, explanation: '先介绍对象，再提供历史事实，最后说明意义，信息组织更清楚。', point: 1 },
    { prompt: 'Read: “The diary was written by a nurse who worked at the station.” Who wrote the diary?', options: ['A nurse', 'A station building', 'A map maker', 'A museum visitor today'], answerIndex: 0, explanation: '句子中的 who 指 nurse，说明日记作者是一位护士。', point: 1 },
    { prompt: 'Which question helps check whether a historical claim is supported?', options: ['What source gives evidence for this claim?', 'What color is your schoolbag?', 'Can we skip the dates?', 'Who likes this story best?'], answerIndex: 0, explanation: '核对史料来源和证据，是判断历史说法是否有依据的有效问题。', point: 1 },
  ]),
  englishSet('rebuild-2026-english-9b-u3-a', 'Unit 3 A Taste of Art', 'Section A', '艺术欣赏', [
    { prompt: 'The guide asked us to ______ the painting carefully before we discussed it.', options: ['observe', 'waste', 'cancel', 'deliver'], answerIndex: 0, explanation: 'observe carefully 表示仔细观察，适合欣赏绘画的语境。', point: 0 },
    { prompt: 'Which sentence gives an opinion and a reason about an artwork?', options: ['I like the painting because its colors create a calm feeling.', 'The painting is on the wall.', 'The room opens at nine.', 'The ticket is in my pocket.'], answerIndex: 0, explanation: '句子表达喜欢的观点，并用色彩带来的感受说明理由。', point: 1 },
    { prompt: 'Read: “The artist used dark blue and a small light near the window. The room feels quiet but hopeful.” What creates the hopeful feeling?', options: ['The small light near the window', 'The size of the ticket', 'The name of the room', 'The number of visitors'], answerIndex: 0, explanation: '语段把“quiet but hopeful”的感受与窗边的小灯联系起来。', point: 1 },
    { prompt: 'A classmate likes traditional music, while you prefer modern music. What is the best response?', options: ['Ask what the classmate enjoys about it.', 'Say only your taste is correct.', 'Stop the classmate from listening.', 'Make fun of the music.'], answerIndex: 0, explanation: '通过尊重地询问理由，可以交流不同的艺术体验。', point: 0 },
  ]),
  englishSet('rebuild-2026-english-9b-u3-b', 'Unit 3 A Taste of Art', 'Section B', '艺术欣赏', [
    { prompt: 'Read: “At first, Leo saw only bright shapes. After learning about the painter’s hometown, he noticed the river and bridges in the picture.” What changed Leo’s understanding?', options: ['Learning about the painter’s background', 'The picture becoming smaller', 'A new ticket price', 'The gallery closing'], answerIndex: 0, explanation: '了解画家的家乡后，Leo 能把画中的形状与河流和桥联系起来。', point: 1 },
    { prompt: 'Which phrase is useful when describing how a piece of music makes you feel?', options: ['It makes me feel peaceful.', 'It is under the desk.', 'I forgot my address.', 'The bus leaves at noon.'], answerIndex: 0, explanation: 'makes me feel peaceful 直接描述音乐带来的感受。', point: 0 },
    { prompt: 'A short art review should mainly include ______.', options: ['what the work is like and why the writer responds to it', 'only the writer’s home address', 'a list of unrelated school rules', 'the price of every object in town'], answerIndex: 0, explanation: '艺术评论要介绍作品特点并说明个人感受或判断的依据。', point: 1 },
    { prompt: 'Read: “The dancers move slowly at first, then the music becomes faster.” Which word best describes the change?', options: ['gradually', 'never', 'yesterday', 'empty'], answerIndex: 0, explanation: 'gradually 表示逐渐地，适合描述音乐和动作由慢到快的变化。', point: 0 },
  ]),
  englishSet('rebuild-2026-english-9b-u4-a', 'Unit 4 Reduce, Reuse, Recycle', 'Section A', '环保行动', [
    { prompt: 'Before throwing away a glass jar, we can wash it and use it again. This is an example of ______.', options: ['reuse', 'pollute', 'waste', 'damage'], answerIndex: 0, explanation: 'reuse 表示再次使用，符合清洗后继续使用玻璃罐的做法。', point: 0 },
    { prompt: 'Which action can reduce single-use plastic at school?', options: ['Bring a reusable water bottle.', 'Take a new plastic cup every hour.', 'Leave wrappers on the playground.', 'Use more bags than needed.'], answerIndex: 0, explanation: '重复使用水瓶能够减少一次性塑料制品的使用。', point: 0 },
    { prompt: 'Read: “The class put paper, cans, and food waste into different bins.” Why did they use different bins?', options: ['To sort waste for suitable treatment or recycling', 'To make the classroom darker', 'To mix every kind of waste', 'To hide the bins from visitors'], answerIndex: 0, explanation: '分类投放有助于不同种类的废弃物得到合适处理和回收。', point: 1 },
    { prompt: 'Choose the best advice for saving electricity: “When you leave the room, ______.”', options: ['turn off the lights', 'open every window at night', 'leave all devices on', 'use two lamps instead of one'], answerIndex: 0, explanation: '离开房间时关灯是减少不必要用电的可行做法。', point: 1 },
  ]),
  englishSet('rebuild-2026-english-9b-u4-b', 'Unit 4 Reduce, Reuse, Recycle', 'Section B', '环保行动', [
    { prompt: 'Read: “Our school started a bottle-return box. In one month, students returned 240 bottles, and the school used the money to buy trees.” What happened first?', options: ['Students returned bottles.', 'The school bought trees.', 'The trees produced bottles.', 'The project ended before it began.'], answerIndex: 0, explanation: '语段先写学生归还瓶子，再写学校用所得款项购买树木。', point: 1 },
    { prompt: 'Which sentence uses “should” to give reasonable environmental advice?', options: ['We should sort paper and plastic before recycling them.', 'We should throw every bottle into the river.', 'We should leave the lights on all day.', 'We should use more disposable bags.'], answerIndex: 0, explanation: 'should 表示建议，分类回收纸张和塑料是合理环保建议。', point: 0 },
    { prompt: 'A poster says “Bring your own cup and cut down on waste.” What is its purpose?', options: ['Encourage people to reduce waste', 'Invite people to a sports match', 'Explain how to repair a computer', 'Ask people to buy more disposable cups'], answerIndex: 0, explanation: '自带杯子能够减少一次性用品，海报目的是倡导减少废弃物。', point: 1 },
    { prompt: 'Which is the clearest order for a small recycling project?', options: ['Find a problem, plan an action, do it, and check the result', 'Check a result before choosing a problem', 'Buy materials without a plan and stop', 'Write a title and leave out the action'], answerIndex: 0, explanation: '项目通常按发现问题、计划、实施和评估结果的顺序推进。', point: 1 },
  ]),
  englishSet('rebuild-2026-english-9b-u5-a', 'Unit 5 Open to New Beginnings', 'Section A', '毕业与新起点', [
    { prompt: 'At the end-of-year meeting, Mei wants to talk about what she has learned. Which opening is most suitable?', options: ['This year, I learned to work with others and ask for help.', 'The kitchen is next to the garden.', 'Please close the window.', 'My pencil is shorter than yours.'], answerIndex: 0, explanation: '回顾学习收获适合作为学年总结的开头。', point: 0 },
    { prompt: 'Which phrase best completes the sentence about a future plan: “After graduation, I hope ______ a local science club.”', options: ['to join', 'joined yesterday', 'joining last week', 'to joined'], answerIndex: 0, explanation: 'hope 后常接不定式，hope to join 表示“希望加入”。', point: 1 },
    { prompt: 'A student thanks a teacher for patient help. Which sentence is most appropriate?', options: ['Thank you for encouraging me when I found the work difficult.', 'You must give me a higher score.', 'I never listened to your advice.', 'The classroom has four doors.'], answerIndex: 0, explanation: '该句具体表达感谢，并说明老师帮助自己的方面，语气恰当。', point: 1 },
    { prompt: 'Which plan is the most realistic for improving public speaking next term?', options: ['Practise a short talk each week and ask for feedback.', 'Become perfect in one day.', 'Avoid speaking for the whole term.', 'Wait for others to practise for me.'], answerIndex: 0, explanation: '每周练习并获取反馈是具体、可持续的改进计划。', point: 0 },
  ]),
  englishSet('rebuild-2026-english-9b-u5-b', 'Unit 5 Open to New Beginnings', 'Section B', '毕业与新起点', [
    { prompt: 'Read: “Nora kept a notebook of small successes. When a new task seemed difficult, she read it and remembered that practice had helped before.” What helped Nora?', options: ['Remembering earlier progress', 'Avoiding every new task', 'Throwing away her notebook', 'Waiting for someone else to act'], answerIndex: 0, explanation: '笔记记录了她过去的进步，帮助她相信练习能够带来改善。', point: 1 },
    { prompt: 'Which detail best supports a short speech about “a new beginning”?', options: ['One challenge you faced and one goal you plan to work toward', 'A long list of unrelated prices', 'Someone else’s private password', 'A story with no connection to the topic'], answerIndex: 0, explanation: '真实经历和后续目标都能支撑“新起点”主题。', point: 1 },
    { prompt: 'Choose the best linking word: “I was nervous at first. ______, my classmates’ support helped me finish the presentation.”', options: ['However', 'Because', 'Before', 'Unless'], answerIndex: 0, explanation: '前后句构成转折关系，However 最合适。', point: 0 },
    { prompt: 'Which ending best fits a message to classmates before graduation?', options: ['I hope we keep learning, helping others, and moving forward.', 'I will forget everything we did together.', 'No one should try anything new.', 'Please do not read the message.'], answerIndex: 0, explanation: '该句积极回顾共同经历并表达面向未来的祝愿，符合毕业寄语语境。', point: 0 },
  ]),
]

type ChoiceQuestionDraft = Omit<QuestionSeed, 'options' | 'answerIndex'> & {
  correct: string
  distractors: string[]
}

const civics9bSourceNote = [
  '按人教版（2024修订）统编《道德与法治》九年级下册公开目录逐课自编，目录标注2027春学期预排；未沿用本地旧版九下电子课本内容',
  '目录： https://jx.panqjy.cn/jiaoan/daofa/czrjbjnjxc-b3002351.html',
  '出版社对新版“单元思考与行动”栏目说明： https://www.pep.com.cn/xw/zt/hd/sktbjc/zcjd/202606/t20260612_2006848.html',
].join('；')

function distributeAnswerChoices(drafts: ChoiceQuestionDraft[]): QuestionSeed[] {
  const answerPositions = [1, 3, 0, 2]
  return drafts.map((draft, index) => {
    const answerIndex = answerPositions[index % answerPositions.length]
    const options = draft.distractors.slice(0, 3)
    options.splice(answerIndex, 0, draft.correct)
    return {
      prompt: draft.prompt,
      explanation: draft.explanation,
      point: draft.point,
      options,
      answerIndex,
    }
  })
}

function civics9bSet(
  id: string,
  unit: string,
  lesson: string,
  points: Array<[string, string]>,
  questions: ChoiceQuestionDraft[],
): SetSeed {
  return {
    id,
    grade: '初三',
    subject: '政治',
    volume: '下册',
    chapter: unit,
    section: lesson,
    edition: '统编版（人民教育出版社，2024修订；2027春学期九下目录预排）',
    sourceNote: civics9bSourceNote,
    points,
    questions: distributeAnswerChoices(questions),
  }
}

const civics9bUnit1 = '第一单元 我们共同的世界'
const civics9bUnit2 = '第二单元 建设美好世界'
const civics9bUnit3 = '第三单元 争做时代新人'

const civics9bSets: SetSeed[] = [
  civics9bSet('rebuild-2026-politics-9b-l1', civics9bUnit1, '第一课 生活在同一个地球', [
    ['人类共有的家园', '国家和民族共同生活在相互联系的世界中，应在尊重差异的基础上交流合作。'],
    ['人类命运休戚与共', '全球性问题会跨越国界影响各国，需要共同面对并通过合作寻求解决。'],
  ], [
    { prompt: '小林发现家中使用的运动鞋由不同国家参与设计、生产和运输。这最能说明什么？', correct: '各国生产与生活相互联系，世界是紧密联系的整体', distractors: ['各国经济完全彼此隔绝', '商品只由一个国家独立完成', '跨国联系只影响企业，不影响居民'], explanation: '跨国分工和贸易把各国生产、消费联系起来，普通人的生活也会受到影响。', point: 0 },
    { prompt: '面对跨境传染病、气候变化等共同挑战，各国更有效的做法是？', correct: '加强信息交流与协作，共同采取行动', distractors: ['隐瞒信息并拒绝合作', '把问题完全推给其他国家', '停止一切国际沟通'], explanation: '全球性挑战具有跨境影响，交流信息、协调行动更有利于共同应对。', point: 1 },
    { prompt: '“人类共有的家园”这一观点提醒我们？', correct: '尊重各国差异，同时认识彼此相互依存', distractors: ['要求所有国家生活方式完全相同', '只关注本国，不关心世界变化', '把文化差异都看成冲突来源'], explanation: '共同家园并不意味着抹平差异，而是承认多样性并在相互联系中合作。', point: 0 },
    { prompt: '某地洪灾后，多国机构提供救援物资和技术支持。这体现了？', correct: '面对人类共同风险，各方可以互助合作', distractors: ['灾害只属于发生地，与他国无关', '国际援助必然取代当地救灾', '合作会让灾害影响自动消失'], explanation: '灾害可能带来跨境影响，国际协作能够提供支持，但仍需与当地救援相结合。', point: 1 },
    { prompt: '一项国际科技变化影响了本地就业和消费。对此认识正确的是？', correct: '世界变化会通过多种渠道影响个人生活', distractors: ['国际事件永远不会影响个人', '只有外交人员才与世界相连', '个人生活完全由国际贸易决定'], explanation: '贸易、技术、信息等联系会影响个人选择，但不意味着个人生活只由某一因素决定。', point: 0 },
    { prompt: '不同国家对某一全球问题看法不同，怎样推进合作更可取？', correct: '在平等沟通中寻找共同利益和可行方案', distractors: ['要求一方无条件接受另一方所有主张', '停止对话直到各方完全一致', '只用经济压力迫使对方表态'], explanation: '尊重差异、平等协商，有助于找到各方都能参与的共同解决办法。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l2', civics9bUnit1, '第二课 当今世界时代潮流', [
    ['动荡变革的世界', '世界发展伴随机遇与风险，各国相互依存，同时存在冲突、差异和不确定性。'],
    ['不可阻挡的历史潮流', '和平、发展、合作、共赢仍是时代潮流，国际合作有助于应对共同问题。'],
  ], [
    { prompt: '世界经济联系加深的同时，一些地区仍发生冲突和动荡。这说明？', correct: '世界既有合作发展的趋势，也面临复杂风险和挑战', distractors: ['全球联系已经消除了冲突', '所有国家的发展水平都相同', '世界变化只会带来机遇'], explanation: '相互联系与风险挑战可以同时存在，认识世界要看到复杂性。', point: 0 },
    { prompt: '多国围绕公共卫生、气候和贸易问题开展协商，体现了哪一发展取向？', correct: '通过合作处理共同问题', distractors: ['以孤立代替交往', '用冲突替代协商', '要求各国放弃自身发展'], explanation: '合作协商能汇集资源、降低分歧，符合共同应对全球问题的需要。', point: 1 },
    { prompt: '面对国际形势的不确定性，青少年应当怎样看待世界？', correct: '保持开放视野，增强辨别信息和应对变化的能力', distractors: ['只相信未经核实的网络消息', '认为个人无需了解世界', '因有风险而拒绝学习新知识'], explanation: '开放而审慎地认识世界，有助于理解变化并提升适应能力。', point: 0 },
    { prompt: '某国主张通过对话处理贸易争端，并遵守共同商定的规则。这有利于？', correct: '减少冲突、稳定预期并推动合作', distractors: ['保证所有分歧立即消失', '让各国不再需要协商', '使规则只约束弱小国家'], explanation: '协商和共同规则不能消灭一切分歧，但能为解决分歧提供稳定方式。', point: 1 },
    { prompt: '“和平与发展仍是时代主题”意味着？', correct: '多数国家和人民仍期待和平环境与发展机会', distractors: ['世界已不存在战争和贫困', '各国利益已经完全相同', '发展可以脱离安全与合作'], explanation: '时代主题反映长期共同愿望和发展方向，并不表示现实问题已经消失。', point: 1 },
    { prompt: '某地发生冲突后，国际社会推动停火谈判和人道援助。此举更符合？', correct: '以和平方式缓解冲突并关注民生', distractors: ['扩大冲突以解决争端', '禁止受影响民众获得帮助', '以单方面封锁代替谈判'], explanation: '停火协商和人道援助有助于减少伤害、创造和平解决问题的条件。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l3', civics9bUnit1, '第三课 以联合国为核心的国际体系', [
    ['走近联合国', '联合国是政府间国际组织，宗旨包括维护国际和平与安全、促进国际合作。'],
    ['当代国际体系', '国际体系由国家、国际组织、国际规则等多方面构成，主权平等和规则协商具有重要意义。'],
  ], [
    { prompt: '联合国处理国际争端、开展人道救援，主要体现其什么作用？', correct: '为维护和平安全和促进国际合作提供平台', distractors: ['成为凌驾于所有国家之上的世界政府', '代替各国决定全部国内政策', '保证国际争端从此不再发生'], explanation: '联合国是重要的政府间国际组织和多边合作平台，但不是世界政府，也不能保证争端绝不发生。', point: 0 },
    { prompt: '各国在联合国框架下就共同问题交换意见，体现了？', correct: '多边协商有助于协调不同国家的立场', distractors: ['国际问题只能由一个国家决定', '协商要求各国利益完全相同', '国际组织可以取消国家主权'], explanation: '多边平台为不同国家表达意见、寻找共同方案提供渠道。', point: 1 },
    { prompt: '国际关系中坚持国家主权平等，意味着？', correct: '国家不因大小强弱而失去平等参与国际事务的权利', distractors: ['所有国家在经济实力上必须相同', '强国可以不受国际规则约束', '小国不能参与国际协商'], explanation: '主权平等强调国家法律地位平等，不等于各国实力相同。', point: 1 },
    { prompt: '一项国际规则由多国协商形成并共同遵守，最重要的意义是？', correct: '为交往合作提供相对稳定、可预期的依据', distractors: ['让各国不再有任何分歧', '只在发生争端时才需要规则', '允许参与国随时忽略承诺'], explanation: '共同规则帮助各方形成稳定预期、处理争端并开展合作。', point: 1 },
    { prompt: '某国不同意一项国际提议，选择在多边会议上提出理由并协商。这说明？', correct: '存在分歧时仍可通过制度化渠道沟通', distractors: ['加入国际组织就必须放弃所有不同意见', '分歧只能通过冲突解决', '国际协商不允许表达异议'], explanation: '多边协商允许表达分歧并寻求可接受的解决方案。', point: 0 },
    { prompt: '对“以联合国为核心的国际体系”理解正确的是？', correct: '联合国在多边事务中发挥重要作用，但国际体系还包括国家和其他规则机制', distractors: ['世界上只有联合国一个国际组织', '联合国可以取代每个国家的政府', '所有国际规则都只适用于联合国机构'], explanation: '联合国是国际体系的重要核心平台之一，国际关系还由国家、规则和其他机制共同构成。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l4', civics9bUnit2, '第四课 胸怀“两个大局”', [
    ['深度联动的“两个大局”', '把握民族复兴战略全局和世界百年未有之大变局，认识国内发展与国际环境相互影响。'],
    ['于变局中开新局', '在机遇与挑战并存的环境中保持战略定力，主动识变、应变、求变。'],
  ], [
    { prompt: '理解“两个大局”，需要把哪些方面联系起来观察？', correct: '中华民族伟大复兴的战略全局与世界百年未有之大变局', distractors: ['个人考试成绩与家庭收入', '城市交通与校园社团', '一个国家的历史与自然地理'], explanation: '“两个大局”指民族复兴战略全局和世界百年未有之大变局，要联系国内外发展环境。', point: 0 },
    { prompt: '国际科技变化影响我国产业升级，说明？', correct: '国内发展与国际环境存在深度联系', distractors: ['国内发展可以完全脱离世界', '国际环境只影响外交活动', '技术变化不会影响经济发展'], explanation: '科技、产业和市场的跨境联系表明国内发展与世界变化相互影响。', point: 0 },
    { prompt: '面对机遇和挑战同时出现，哪种态度更符合“于变局中开新局”？', correct: '分析条件、发挥优势并针对风险做好准备', distractors: ['只看到困难而停止行动', '只谈机遇而忽视风险', '等待环境永远稳定后再发展'], explanation: '把握机遇也要准备应对风险，结合自身条件采取行动。', point: 1 },
    { prompt: '某企业因国际供应链变化调整技术和采购方案。其做法体现？', correct: '主动适应外部变化、增强发展韧性', distractors: ['外部变化只能被动接受', '停止创新就能消除风险', '风险应由消费者独自承担'], explanation: '识别变化、调整方案并增强自主能力，有助于提升应对风险的韧性。', point: 1 },
    { prompt: '观察国际形势时，既关注发展机会又关注不确定因素，主要是为了？', correct: '作出更全面、理性的判断和规划', distractors: ['证明所有变化都无法应对', '只选择有利于自己的信息', '回避国内发展任务'], explanation: '兼顾机遇与风险能减少片面判断，帮助合理规划行动。', point: 0 },
    { prompt: '中学生关心世界变化，最合适的方式是？', correct: '从可靠信息了解国际环境，并联系所学分析其影响', distractors: ['转发所有未经核实的消息', '把复杂问题简单归因于某个国家', '因年龄小而拒绝了解社会'], explanation: '使用可靠信息并结合知识理性分析，是认识“两个大局”的合适方式。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l5', civics9bUnit2, '第五课 坚持和平发展道路', [
    ['“国强必霸”不是历史定律', '国家发展道路由其价值追求和政策选择影响，强大并不必然导致侵略扩张。'],
    ['世界和平发展的建设者', '坚持和平发展、通过协商解决争端并参与国际合作，有利于共同发展。'],
  ], [
    { prompt: '把“国强必霸”当作必然规律，忽视了什么？', correct: '国家可以选择不同的发展道路和对外政策', distractors: ['国家实力会随时间变化', '历史上存在不同类型的国家', '国际交往需要规则'], explanation: '国家实力增长并不自动决定其行为，发展道路和政策选择同样重要。', point: 0 },
    { prompt: '两个国家因边界问题产生分歧，哪种做法更符合和平发展道路？', correct: '通过谈判、协商和规则机制寻求解决', distractors: ['立即扩大军事冲突', '停止所有民间联系并拒绝沟通', '强迫对方放弃全部主张'], explanation: '协商和规则机制有助于控制分歧、降低冲突风险。', point: 1 },
    { prompt: '和平与发展之间的关系应理解为？', correct: '和平环境有利于发展，发展也能为持久和平创造条件', distractors: ['和平和发展彼此毫无关系', '只有发展不需要和平', '只要和平就不必解决贫困问题'], explanation: '和平与发展相互联系；稳定环境促进发展，发展进步也有助于减少冲突根源。', point: 1 },
    { prompt: '某国在国际合作中重视互利共赢而不是零和对抗，表明？', correct: '可以在维护自身利益的同时扩大共同利益', distractors: ['参与合作必须放弃本国利益', '国家之间不存在共同利益', '合作只能让一方获益'], explanation: '合理合作可以兼顾自身利益与共同利益，不必把国际交往看成非赢即输。', point: 0 },
    { prompt: '面对国际争端，支持通过对话缓和局势的公民行动是？', correct: '了解事实、理性表达并尊重和平解决争端的努力', distractors: ['传播未经核实的冲突消息', '鼓动仇恨和报复', '把不同国家的普通民众一概敌视'], explanation: '理性表达和尊重和平解决方式，有助于营造理解与合作氛围。', point: 1 },
    { prompt: '坚持和平发展道路，要求国际交往中？', correct: '尊重各国合理关切，在平等基础上开展合作', distractors: ['只允许实力强的一方表达诉求', '把竞争都变成冲突', '认为国际规则没有作用'], explanation: '平等沟通、尊重合理关切并遵守共同规则，有利于和平合作。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l6', civics9bUnit2, '第六课 做负责任大国', [
    ['国际影响力不断增强', '参与国际事务、提供公共产品和扩大交流合作，会提升解决共同问题的能力。'],
    ['展现大国担当', '承担国际责任要从实际能力出发，以行动促进和平、发展和合作。'],
  ], [
    { prompt: '某国参与国际救援并提供医疗、技术支持，最能体现？', correct: '在力所能及范围内承担国际责任', distractors: ['国际责任只需口头表达', '承担责任意味着不再关注本国民生', '援助可以替代受援国自主发展'], explanation: '提供实际帮助体现责任担当，但合作还应尊重当地需要并支持其自主发展。', point: 1 },
    { prompt: '评价一国是否负责任，较合理的依据是？', correct: '看其是否以实际行动参与合作、维护共同利益', distractors: ['只看宣传口号数量', '只看国家面积大小', '看其是否从不表达自身利益'], explanation: '责任担当要看行动和实际贡献，不是只看口号，也不要求国家放弃自身合理利益。', point: 0 },
    { prompt: '一个国家参与制定公共卫生合作方案，有助于？', correct: '汇集经验与资源，共同应对跨境问题', distractors: ['保证今后不再出现任何疾病', '让所有国家使用完全相同的制度', '避免各国继续交流'], explanation: '国际合作能汇集各方资源与经验，提升共同应对问题的能力。', point: 0 },
    { prompt: '承担国际责任时，为什么要从实际能力出发？', correct: '使承诺与资源相匹配，提升行动的持续性和实效性', distractors: ['因为责任可以任意取消', '因为国际合作没有长期目标', '因为实际行动比口号更不重要'], explanation: '结合能力安排行动，既能履行责任，也能保证措施可持续、可落实。', point: 1 },
    { prompt: '面对国际合作项目，既维护国家利益又关注共同利益，说明？', correct: '国家利益与国际责任可以统筹兼顾', distractors: ['二者必然相互排斥', '承担国际责任必须损害本国发展', '只要合作就无需遵守约定'], explanation: '在平等互利和遵守规则的基础上，可以兼顾本国合理利益与共同利益。', point: 1 },
    { prompt: '普通中学生能够怎样培养国际视野与责任意识？', correct: '学习了解不同国家和文化，尊重差异并关注共同问题', distractors: ['把不了解的文化都视为落后', '只关心个人得失', '根据片面信息评价整个国家'], explanation: '了解世界、尊重差异并理性关注共同议题，是成长为负责任公民的基础。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l7', civics9bUnit2, '第七课 构建人类命运共同体', [
    ['积极贡献中国智慧', '面对全球共同问题，应倡导对话协商、交流互鉴和互利合作。'],
    ['携手共创美好世界', '构建人类命运共同体需要各国共同参与，也需要个人在生活中践行合作与尊重。'],
  ], [
    { prompt: '“人类命运共同体”理念强调？', correct: '各国面对共同挑战时应加强合作、实现共同发展', distractors: ['各国可以完全不相互依赖', '只有一个国家需要承担责任', '各国必须放弃自身文化'], explanation: '这一理念强调相互依存、共同应对挑战和共享发展成果，不要求抹去文化差异。', point: 0 },
    { prompt: '不同国家围绕减排目标协商并分享技术，最符合？', correct: '通过合作促进共同利益和可持续发展', distractors: ['把环境问题推给最弱势的国家', '让合作方停止发展', '以保密取代技术交流'], explanation: '共同议题需要协调行动与知识交流，合作有助于提高解决问题的效果。', point: 1 },
    { prompt: '“中国智慧”在处理全球问题时，更应体现为？', correct: '提出建设性思路并推动各方协商合作', distractors: ['替所有国家单方面作决定', '只表达立场而不参与行动', '要求各国照搬同一种发展模式'], explanation: '建设性方案要重视平等协商和共同参与，尊重各国实际情况。', point: 0 },
    { prompt: '文化交流中遇到与自己不同的习俗，较合适的态度是？', correct: '了解其背景，在尊重差异中开展交流', distractors: ['要求对方立即改变习俗', '用自己的习惯衡量并否定对方', '因差异而停止一切交往'], explanation: '尊重文化多样性有助于相互理解和交流互鉴。', point: 1 },
    { prompt: '构建人类命运共同体为什么需要各国共同参与？', correct: '全球问题跨越国界，任何一方都难以独自解决', distractors: ['国际合作不需要实际行动', '各国利益完全相同', '只有大国会受到全球问题影响'], explanation: '全球问题往往跨境影响，各国共同参与能形成更广泛的资源和行动。', point: 0 },
    { prompt: '中学生践行共同体意识，可以从哪项做起？', correct: '尊重不同文化、参与合作并以负责任方式使用网络信息', distractors: ['传播未经证实的仇恨言论', '认为国际问题与任何个人行为无关', '嘲笑与自己不同的生活方式'], explanation: '尊重、合作与负责任的信息行为，都是个人参与共同生活的具体方式。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l8', civics9bUnit3, '第八课 坚定理想信念', [
    ['理想信念关乎国家未来', '理想信念为个人成长和社会发展提供精神指引，应与现实行动相结合。'],
    ['筑牢理想信念根基', '坚定信念需要正确认识国情、明确价值追求并在实践中检验和坚持。'],
  ], [
    { prompt: '理想信念对个人成长的主要作用是？', correct: '帮助明确方向、增强克服困难的动力', distractors: ['保证所有愿望不经努力就实现', '代替知识学习和实际行动', '让人不再需要调整计划'], explanation: '理想信念能提供方向和精神动力，但仍需通过学习与行动逐步实现目标。', point: 0 },
    { prompt: '一名学生有远大理想，遇到暂时挫折后怎样做更合适？', correct: '分析困难、调整方法并继续朝目标努力', distractors: ['认定理想一定错误而彻底放弃', '隐瞒困难并停止学习', '要求他人替自己完成目标'], explanation: '坚定理想并不意味着方法不变，面对困难要及时反思、改进并继续行动。', point: 1 },
    { prompt: '把个人理想与国家发展联系起来，合理的理解是？', correct: '在服务社会和国家需要的过程中实现个人价值', distractors: ['个人兴趣必须完全消失', '国家发展与青年成长毫无关系', '只有从事某一种职业才能有价值'], explanation: '个人发展可以与社会需要相结合，但职业和成长路径可以多样。', point: 0 },
    { prompt: '以下哪项更能把理想信念转化为现实行动？', correct: '将目标分解为阶段任务并定期检查进展', distractors: ['反复想象成功但不安排行动', '只设定无法衡量的目标', '把失败都归因于环境'], explanation: '阶段任务和定期检查能让长远目标落实到可执行的日常行动。', point: 1 },
    { prompt: '判断一种理想是否适合自己，较理性的做法是？', correct: '结合兴趣、能力、现实条件和社会需要综合思考', distractors: ['只听从网络热门职业排名', '只看短期收入而不考虑能力', '认为目标越远大就越无需规划'], explanation: '理想需要价值追求，也要立足个人条件和现实环境进行规划。', point: 0 },
    { prompt: '学习先进人物事迹时，最适合转化成自身行动的是？', correct: '学习其坚持和担当精神，并结合自己的岗位做好具体事情', distractors: ['只记住人物姓名而不理解其行动', '要求自己立即达到同样成就', '认为普通日常任务不重要'], explanation: '榜样的意义在于学习可借鉴的精神品质，并落实到适合自身的行动。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l9', civics9bUnit3, '第九课 练就过硬本领', [
    ['勤学苦练 增强本领', '持续学习、实践锻炼和反思改进能够提升解决问题的能力。'],
    ['脚踏实地 做好生涯规划', '生涯规划要结合兴趣、能力、社会需要和阶段目标，并根据实际适时调整。'],
  ], [
    { prompt: '小周想提升实验操作能力，最有效的安排是？', correct: '按规范反复练习、记录问题并根据反馈改进', distractors: ['只阅读实验名称，不动手操作', '一次失败后认定自己没有能力', '请同学代做并直接抄结果'], explanation: '技能需要在规范实践、发现问题和持续改进中形成。', point: 0 },
    { prompt: '面对新技术带来的岗位变化，哪种学习方式更有帮助？', correct: '保持持续学习，更新知识并练习迁移应用', distractors: ['认为毕业后不再需要学习', '只背旧答案，不理解原理', '拒绝接触任何新工具'], explanation: '持续学习和迁移应用能帮助人适应知识、技术和职业环境的变化。', point: 0 },
    { prompt: '制定生涯规划时，哪些因素需要综合考虑？', correct: '个人兴趣、能力特长、现实条件和社会需要', distractors: ['只看同伴选择了什么', '只听从一时流行的职业名称', '只根据一次考试成绩决定终身职业'], explanation: '生涯规划应综合多方面因素，并允许在成长和实践中调整。', point: 1 },
    { prompt: '某学生尝试社团、课程项目和志愿活动后，更了解自己的兴趣。说明？', correct: '实践体验能帮助认识能力与职业兴趣', distractors: ['职业规划只能靠猜测', '参加活动会妨碍所有学习', '兴趣一旦发现就不能变化'], explanation: '多样体验能提供认识自我和职业领域的真实信息，规划也可据此修正。', point: 1 },
    { prompt: '一个阶段目标连续未完成，怎样调整更合理？', correct: '分析原因，把目标改成可执行的步骤并继续检查', distractors: ['把所有目标取消', '把责任都推给同学', '把规划写得更复杂但不行动'], explanation: '根据实际反馈调整步骤，有利于保持目标的现实性和执行力。', point: 0 },
    { prompt: '学习一种新技能时，以下哪项最能体现“练就过硬本领”？', correct: '理解原理、反复实践并能在新情境中解决问题', distractors: ['只记步骤但不明白原因', '只在熟悉题目中机械重复', '把学习成果完全交由他人评价'], explanation: '过硬本领不仅是记住步骤，还包括理解、熟练和灵活应用。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-l10', civics9bUnit3, '第十课 锤炼担当精神', [
    ['担当成就事业', '担当体现为面对职责不推诿、主动解决问题，并在实践中锻炼意志和能力。'],
    ['天下兴亡 匹夫有责', '个人成长与社会发展相连，青年可以从力所能及的学习、劳动和服务行动做起。'],
  ], [
    { prompt: '小组展示临近截止日期，负责整理资料的同学发现资料有缺项。体现担当的做法是？', correct: '及时说明问题、补充核实并与组员协作完成', distractors: ['隐瞒缺项并把责任推给组员', '直接退出小组任务', '随便填入未经核实的资料'], explanation: '担当包括正视问题、履行职责、及时补救并与他人合作。', point: 0 },
    { prompt: '以下哪项属于中学生力所能及的社会责任行动？', correct: '认真完成学习任务，参与公共服务并遵守公共规则', distractors: ['认为公共事务都与自己无关', '只有成年后才需要任何责任', '不顾安全地单独处理专业救援任务'], explanation: '学生可从学习、守规则和适度参与公共服务做起，同时应尊重能力和安全边界。', point: 1 },
    { prompt: '面对有难度的集体任务，担当精神更可能表现为？', correct: '主动承担适合自己的部分并对结果负责', distractors: ['只挑容易的任务并把难题留给别人', '等待他人完成后领取成绩', '因担心出错而拒绝所有任务'], explanation: '主动承担与自身能力相适应的职责，并对过程和结果负责，是担当的表现。', point: 0 },
    { prompt: '“天下兴亡，匹夫有责”对青少年的现实启示是？', correct: '把个人努力融入社会发展，从日常行动承担责任', distractors: ['个人不需要学习和成长', '只有从事公共职位才有责任', '个人可以替代所有社会组织'], explanation: '个人责任可从日常学习、劳动和服务开始，不等同于承担超出能力的全部事务。', point: 1 },
    { prompt: '小组项目遇到分歧，成员各自承担责任的同时应当？', correct: '倾听意见、协商分工并共同对成果负责', distractors: ['争夺功劳并拒绝沟通', '把全部责任转给组长', '因分歧立即放弃项目'], explanation: '责任担当与合作沟通相结合，能帮助团队解决问题并完成共同目标。', point: 1 },
    { prompt: '社会需要多种职业和劳动者，正确的职业态度是？', correct: '尊重不同职业劳动，并持续提升胜任岗位的能力', distractors: ['只尊重收入最高的职业', '认为职业选择后无需再学习', '把岗位价值简单按名气排序'], explanation: '社会运行需要多种职业，尊重劳动并持续学习有助于个人和社会发展。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-u1-review', civics9bUnit1, '单元思考与行动', [
    ['相互联系的世界', '理解共同家园、全球相互依存和世界变化带来的机遇与挑战。'],
    ['国际协作与规则', '通过多边协商、联合国平台和共同规则处理国际问题。'],
  ], [
    { prompt: '一条国际供应链因自然灾害中断，多个国家共同调整运输并共享信息。综合体现？', correct: '世界联系紧密，跨境风险需要协同应对', distractors: ['各国经济互不相关', '规则协商会阻止救援', '单一国家可以控制所有自然风险'], explanation: '供应链联系显示相互依存，协作和信息共享能提升应对跨境风险的能力。', point: 0 },
    { prompt: '面对国际争端，某国既表达自身立场又参与联合国协商。说明？', correct: '维护合理利益与多边协商可以同时进行', distractors: ['参与协商必须放弃立场', '国际组织会取消国家主权', '表达分歧就不能再合作'], explanation: '国家可以保留立场，同时利用多边机制沟通和寻求解决方案。', point: 1 },
    { prompt: '全球环境问题跨越国界，最有助于改善治理的是？', correct: '各方遵循共同约定并落实各自行动', distractors: ['只有受影响地区采取行动', '各方都等待别人先行动', '停止科学信息交流'], explanation: '共同规则提供合作框架，各方落实行动才能把协商转化为治理效果。', point: 1 },
    { prompt: '“共同家园”与“尊重差异”之间的关系是？', correct: '在承认多样性的基础上寻找合作空间', distractors: ['共同家园要求文化完全相同', '尊重差异意味着不需要交往', '存在差异就无法形成共同利益'], explanation: '多样性与共同利益可以并存，尊重差异能为交流合作创造基础。', point: 0 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-u2-review', civics9bUnit2, '单元思考与行动', [
    ['发展与国际环境', '统筹把握国内外形势，在变化中识别机遇、风险和可行动空间。'],
    ['和平合作与责任担当', '坚持和平发展，参与国际合作并以实际行动承担与能力相适应的责任。'],
  ], [
    { prompt: '某地区以对话缓和冲突，同时开展经济和教育合作。这样做有助于？', correct: '为和平与共同发展创造条件', distractors: ['保证以后不再有任何分歧', '使发展与和平彼此脱离', '取消参与方承担的义务'], explanation: '对话有助于减少冲突，合作能促进发展，二者可以相互支持。', point: 1 },
    { prompt: '面对产业转型和外部变化，我国发展中既要把握机遇又要？', correct: '正视风险、提升能力并做好必要准备', distractors: ['拒绝一切国际交往', '只追求短期速度而忽视质量', '等待外部环境完全不变'], explanation: '统筹机遇和风险、增强自身能力，有助于在变化中保持主动。', point: 0 },
    { prompt: '评价国际责任行动，最应关注？', correct: '是否基于实际能力、回应共同需要并持续落实', distractors: ['是否只强调口号', '是否完全不考虑受助方意见', '是否能一次解决所有世界问题'], explanation: '有效担当应回应实际需要、结合能力并落实行动，不夸大单次行动效果。', point: 0 },
    { prompt: '和平发展道路与互利共赢的关系可以概括为？', correct: '通过合作拓展共同利益，减少以冲突解决问题的做法', distractors: ['合作必然要求一方放弃发展', '和平发展就是不参与国际事务', '共同利益意味着所有国家利益完全一致'], explanation: '合作能拓展共同利益，但国家间仍有差异，需要在平等协商中处理。', point: 1 },
  ]),
  civics9bSet('rebuild-2026-politics-9b-u3-review', civics9bUnit3, '单元思考与行动', [
    ['理想、学习与成长', '把理想落实为学习、实践和可调整的生涯目标，持续锻炼本领。'],
    ['责任与时代担当', '在能力范围内主动履责、尊重劳动，并把个人成长融入社会发展。'],
  ], [
    { prompt: '小林希望将来从事科技工作，他制定每周实验学习计划并记录改进情况。这体现？', correct: '把理想转化为阶段行动并持续提升本领', distractors: ['理想已经自动实现', '职业规划不需要实践', '学习计划必须永远不作调整'], explanation: '阶段计划和实践记录有助于把理想落到行动，计划也应根据实际进展调整。', point: 0 },
    { prompt: '面对集体任务，主动承担能力范围内的职责并完成它，主要体现？', correct: '责任意识和担当精神', distractors: ['只追求个人名次', '回避困难的策略', '对他人意见一概拒绝'], explanation: '主动履行职责并对结果负责，是担当精神的具体表现。', point: 1 },
    { prompt: '生涯规划中发现自身兴趣和能力发生变化，比较合理的做法是？', correct: '结合新的体验与现实条件重新评估并适当调整', distractors: ['认为调整规划就等于失败', '无条件照搬同学的选择', '放弃所有学习目标'], explanation: '生涯规划需要根据新的认识和现实条件不断完善，不是一次决定终身不变。', point: 0 },
    { prompt: '个人理想与社会需要相结合，最合理的理解是？', correct: '在发挥个人特长的同时，为社会发展作出力所能及的贡献', distractors: ['每个人都必须选择相同职业', '个人兴趣完全不重要', '只有重大成就才算承担责任'], explanation: '个人发展路径可以多样，发挥特长并服务社会都能体现人生价值。', point: 1 },
  ]),
]

const geography7aSourceNote = '本地人教版七年级上册地理电子课本，第六章正文（PDF SHA-256 c0b5b8ef46904b0261625c2de5ee340cf81b3fb4f15cd50dd9f1ef84c88ff2ee，课本页110—116）；按正文主题原创命题。'

function geography7aSet(
  id: string,
  section: string,
  points: Array<[string, string]>,
  questions: ChoiceQuestionDraft[],
): SetSeed {
  return {
    id,
    grade: '初一',
    subject: '地理',
    volume: '上册',
    chapter: '第六章 发展与合作',
    section,
    edition: '人教版（人民教育出版社）',
    sourceNote: geography7aSourceNote,
    points,
    questions: distributeAnswerChoices(questions),
  }
}

const geography7aChapter6Sets: SetSeed[] = [
  geography7aSet('rebuild-2026-geography-7a-ch6-development-levels', '不同国家发展水平差异', [
    ['国家发展水平差异', '不同国家和地区在生活水平、教育、医疗等方面存在差异，发达国家与发展中国家也各有内部差异。'],
    ['人类发展指数', '人类发展指数综合考虑人均国民总收入、受教育程度和预期寿命，数值越高表示发展水平越高。'],
  ], [
    { prompt: '比较不同国家的发展水平时，哪组指标更全面？', correct: '收入、受教育程度和预期寿命', distractors: ['国土面积、首都人口和海岸线长度', '出口商品种类和国旗颜色', '人口总数、河流长度和气温'], explanation: '人类发展指数综合考虑收入、教育和预期寿命，能从多个方面反映发展水平。', point: 1 },
    { prompt: '某国人均收入较高，但教育和医疗服务覆盖不足。由此可知？', correct: '判断发展水平不宜只看单一经济指标', distractors: ['只要收入高，发展水平各方面必然相同', '教育和医疗与发展水平无关', '国家内部不可能存在发展差异'], explanation: '发展水平涉及经济、教育、医疗等方面，单一指标不能完整反映整体状况。', point: 1 },
    { prompt: '发达国家和发展中国家之间，哪种表述更准确？', correct: '两类国家在平均发展水平上有差异，类别内部也并非完全相同', distractors: ['每个发达国家所有地区都同样富裕', '每个发展中国家都具有完全相同的发展条件', '国家发展水平只由所在大洲决定'], explanation: '不同国家和地区的自然条件、发展历史及现实水平不同，同一类别内部也有差异。', point: 0 },
    { prompt: '某学生根据一张收入图就断定一个国家“各方面都发达”，这一结论的问题是？', correct: '证据维度不足，还应关注教育、医疗等指标', distractors: ['收入数据不能用于任何比较', '只有地图能判断发展水平', '发展水平无法通过资料了解'], explanation: '收入是重要信息，但全面比较还需要教育、医疗等多方面证据。', point: 1 },
    { prompt: '一个国家自然条件较好，是否就一定拥有较高发展水平？', correct: '不一定，发展还受开发历史、教育、经济和社会条件等影响', distractors: ['一定，自然条件完全决定发展水平', '不一定，因为自然条件与生活无关', '一定，只要有资源就无需合作'], explanation: '自然条件会产生影响，但发展还与历史、社会和经济等多种因素有关。', point: 0 },
    { prompt: '阅读国家发展水平专题图时，最合适的做法是？', correct: '先读图例和指标，再比较空间分布及差异', distractors: ['只看颜色最深的区域并推断全部原因', '不看图例，直接比较颜色名称', '根据一个国家推断整个大洲完全相同'], explanation: '读专题图要先理解图例和指标，再描述分布并谨慎分析原因。', point: 0 },
  ]),
  geography7aSet('rebuild-2026-geography-7a-ch6-global-economy', '联系日益紧密的全球经济', [
    ['全球经济联系', '现代交通运输和通信技术推动国家与地区之间的货物、人员、信息往来，促进经济全球化。'],
    ['区域合作方式', '发达国家与发展中国家之间的政治经济商谈通常称为“南北对话”，发展中国家之间的互助合作称为“南南合作”。'],
  ], [
    { prompt: '现代交通和通信技术发展带来的重要影响是？', correct: '加强国家和地区间联系，促进全球经济往来', distractors: ['使国际商品不再需要运输', '让各国生产完全相同的产品', '阻止人员和信息跨地区流动'], explanation: '飞机、高铁和互联网等发展，让人员、商品和信息交流更加便捷。', point: 0 },
    { prompt: '发达国家与发展中国家之间进行经济商谈，通常称为？', correct: '南北对话', distractors: ['南南合作', '东西交换', '区域内循环'], explanation: '教材将发达国家与发展中国家之间的政治、经济商谈称为“南北对话”。', point: 1 },
    { prompt: '两个发展中国家相互提供技术和培训支持，属于？', correct: '南南合作', distractors: ['南北对话', '国家内部协作', '单边封锁'], explanation: '发展中国家之间的互助合作称为“南南合作”。', point: 1 },
    { prompt: '不同国家共同生产一件复杂商品，说明全球经济具有怎样的特点？', correct: '生产环节可以跨越国界并依托各方优势协作', distractors: ['所有生产只能在一个国家完成', '国际分工会消除各国差异', '商品生产与交通条件无关'], explanation: '国际分工使设计、零部件生产、组装和销售等环节可以由不同国家参与。', point: 0 },
    { prompt: '全球自然资源、资金和技术分布不均衡时，国际交通运输的作用是？', correct: '便利不同国家间资源、货物和人员流动', distractors: ['使各国资源分布变得完全一样', '让国际贸易不再受任何条件影响', '取代所有国家的国内运输'], explanation: '运输帮助各地资源、商品和人员往来，为跨国经济活动创造条件。', point: 0 },
    { prompt: '比较“南北对话”和“南南合作”，正确的是？', correct: '二者按参与国家的发展类别区分，都是国际交往方式', distractors: ['二者都只指同一国家内部合作', '南北对话只发生在南半球', '南南合作只涉及发达国家'], explanation: '两种方式的区分依据是参与国家的发展类别，而不是简单的地理方位。', point: 1 },
  ]),
  geography7aSet('rebuild-2026-geography-7a-ch6-international-cooperation', '国际合作', [
    ['国际合作的意义', '国际合作能发挥各国优势、应对共同挑战，并推动更绿色、更平等和可持续的发展。'],
    ['全球性问题的共同应对', '环境变化、灾害、贫困和公共卫生等问题超越国界，需要多方合作与规则协调。'],
  ], [
    { prompt: '全球变暖、臭氧层破坏等问题为什么需要国际合作？', correct: '它们影响范围广，单个国家难以独自解决', distractors: ['它们只影响国际组织，不影响各国', '只有发展中国家会受到影响', '减少合作可以让污染自动消失'], explanation: '全球性环境问题跨越国界，需要多个国家共同减排、保护和治理。', point: 1 },
    { prompt: '教材以《蒙特利尔议定书》为例说明国际合作的作用，重点是？', correct: '多国采取协同行动有助于逐步淘汰破坏臭氧层的物质', distractors: ['单一国家可以独自制定全球气候规律', '国际协议能取消所有自然灾害', '各国无需落实协议内容'], explanation: '缔约国共同淘汰相关化学物质后，臭氧层得到恢复，说明合作行动可以产生效果。', point: 1 },
    { prompt: '一件商品的原料、设计、零件和组装来自多个国家。要让生产顺利进行，需要？', correct: '运输、信息和贸易规则等环节协调配合', distractors: ['各环节拒绝共享信息', '取消各国间的货物运输', '让所有生产环节停留在原料产地'], explanation: '跨国生产依赖交通、通信和贸易合作，环节协调有助于完成生产。', point: 0 },
    { prompt: '面对跨境公共卫生事件，各国共享科学信息并协调防控，主要体现？', correct: '通过合作处理共同风险并减少相互影响', distractors: ['公共卫生问题与国际联系无关', '交流信息会自动取代医疗服务', '各国应隐瞒风险以维护合作'], explanation: '信息共享与协调行动有助于共同应对跨境风险，但仍需各地落实具体措施。', point: 1 },
    { prompt: '跨国合作项目希望兼顾经济发展与环境保护，较合理的目标是？', correct: '在利用资源的同时降低环境影响并分享发展机会', distractors: ['只追求产量，不考虑长期影响', '要求参与国停止一切经济活动', '让环境成本全部由项目所在地承担'], explanation: '可持续合作要兼顾发展与环境，并公平分担责任、共享合理收益。', point: 0 },
    { prompt: '中学生讨论中欧班列对沿线地区的影响时，最合适的思路是？', correct: '结合运输效率、沿线贸易联系和合作机会分析', distractors: ['只根据列车名称判断经济效果', '把班列作用等同于所有国家发展水平相同', '忽略线路所经过的地区'], explanation: '分析交通线路的影响，要联系运输条件、沿线国家和地区的经济往来。', point: 0 },
  ]),
]

const chinese9bUnit6 = '第六单元'
const chinese9bSourceNote = [
  '按2026年更新的人教部编版九年级下册目录重建第六单元，目录标注为2027春学期预排',
  '目录与单元资源索引：https://jx.panqjy.cn/shiti/yuwen/czrjbbbjnjxc-b3002631.html',
  '题目依据新目录所列作品及通行原著内容原创编写；未使用本地2018版九下课本中已更换的旧单元篇目',
].join('；')

function chinese9bSet(
  id: string,
  section: string,
  points: Array<[string, string]>,
  questions: ChoiceQuestionDraft[],
): SetSeed {
  return {
    id,
    grade: '初三',
    subject: '语文',
    volume: '下册',
    chapter: chinese9bUnit6,
    section,
    edition: '统编版（人民教育出版社；2027春学期预排目录）',
    sourceNote: chinese9bSourceNote,
    points,
    questions: distributeAnswerChoices(questions),
  }
}

const chinese9bUnit6Sets: SetSeed[] = [
  chinese9bSet('rebuild-2026-chinese-9b-20-shengchen', '20 智取生辰纲 / 施耐庵', [
    ['情节与计谋', '作品围绕押送生辰纲与智取展开，利用环境、时机、人物判断和协作推动情节。'],
    ['人物与叙事', '对不同人物的行动和心理进行对照描写，表现押送双方的谋划与应对。'],
  ], [
    { prompt: '《智取生辰纲》题目中的“智取”，最突出地概括了哪种取胜方式？', correct: '观察情势、利用时机并协同谋划', distractors: ['依靠人数优势直接强攻', '凭借官府命令征收财物', '偶然遇到失主主动赠送'], explanation: '故事的关键在于押送方与取纲一方斗智，后者通过谋划、时机和协作实现目标。', point: 0 },
    { prompt: '故事把酷热天气和押送队伍的疲惫写得较突出，主要作用是？', correct: '交代人物处境，为后续计谋和情节转折作铺垫', distractors: ['证明天气是故事唯一的矛盾', '让读者无法判断人物行动', '与押送过程完全无关'], explanation: '环境描写影响人物的体力、判断和选择，也为情节发展提供条件。', point: 0 },
    { prompt: '阅读押送双方的言行变化，最适合用哪种方法分析人物？', correct: '结合具体行动、语言和处境判断其性格及谋划', distractors: ['只根据人物姓名判断善恶', '忽略情节，只统计出场次数', '把所有人物看作同一立场'], explanation: '人物形象要从语言、行动、心理及其所处情境综合分析。', point: 1 },
    { prompt: '作品用悬念表现“智取”过程，读者最需要关注？', correct: '双方如何判断局势、采取行动并造成情节变化', distractors: ['每个场景的天气是否相同', '人物衣服颜色是否反复出现', '故事发生后的人物年龄'], explanation: '悬念来自行动策略的较量，梳理判断、行动和结果有助于理解叙事。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-21-fanjin', '21 范进中举 / 吴敬梓', [
    ['讽刺艺术', '作品通过人物前后态度对照和夸张情节，揭示科举功名对人的异化。'],
    ['人物与社会', '范进、胡屠户等人物的言行反映功名前后的人情冷暖与社会风气。'],
  ], [
    { prompt: '胡屠户在范进中举前后的态度变化，主要形成了什么表达效果？', correct: '通过前后对照讽刺趋炎附势、以功名衡量人的风气', distractors: ['说明人物性格始终没有变化', '证明邻里关系完全不受功名影响', '突出自然景物的季节变化'], explanation: '态度反差揭示功名改变社会待遇，也讽刺势利的人情关系。', point: 0 },
    { prompt: '范进得知中举后出现失常举动，作者运用夸张情节主要是为了？', correct: '强化长期受功名压力后的荒诞感与讽刺意味', distractors: ['证明中举会使所有人患病', '转而描写医学知识', '说明范进从未在意科举'], explanation: '夸张写法突出人物命运的荒诞，深化对科举制度和功名观的批判。', point: 0 },
    { prompt: '读《范进中举》时，哪项最能体现讽刺小说的阅读方法？', correct: '联系人物言行反差与社会背景分析讽刺对象', distractors: ['只记住故事结局，不看人物变化', '把夸张情节当成新闻记录', '只摘抄所有对话而不分析'], explanation: '讽刺效果常由人物前后反差、夸张情节和社会环境共同构成。', point: 1 },
    { prompt: '作品写范进中举后有人送来财物与房屋，主要说明？', correct: '功名改变了他在社会关系中的地位和待遇', distractors: ['范进早已拥有大量产业', '邻里馈赠与中举没有关联', '作品主题是房屋建筑'], explanation: '周围人的态度和馈赠反映科举功名带来的社会地位变化。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-22-liujia', '22* 刘姥姥进大观园 / 曹雪芹', [
    ['人物观察', '通过刘姥姥的言行和不同人物的反应呈现人物性格与生活处境。'],
    ['场景与社会生活', '大观园宴饮场面中的器物、言谈和反应构成生活细节，也映照不同生活状态。'],
  ], [
    { prompt: '刘姥姥进大观园后以幽默言行逗笑众人，阅读时较合适的理解是？', correct: '她善于察言观色、调节场面，也显出生活经验', distractors: ['她完全不了解现场人物的反应', '她的所有言行都与情节无关', '她在场只为介绍园林建筑'], explanation: '刘姥姥的言行带有幽默感，也体现她对环境和他人反应的观察。', point: 0 },
    { prompt: '宴席上众人的笑态各不相同，作者细致描写这些反应有什么作用？', correct: '借不同反应表现人物性格和彼此关系', distractors: ['证明所有人物性格完全一样', '打断故事情节并取消人物塑造', '只为统计宴席人数'], explanation: '细节刻画使人物各有特点，也让场景更鲜活。', point: 1 },
    { prompt: '将刘姥姥的生活经验与大观园的富贵生活并置，能帮助读者？', correct: '观察不同生活处境之间的差异', distractors: ['认为所有人物的生活方式相同', '忽略场景对人物的影响', '把小说改读为园林说明文'], explanation: '两种生活经验的对照使场景具有社会观察意义，也丰富了人物塑造。', point: 1 },
    { prompt: '分析小说中的宴席细节，哪种做法最有效？', correct: '结合器物、言语和人物反应理解场景功能', distractors: ['只记住菜名，不看人物表现', '把每个细节都当作无关装饰', '只根据篇名推断人物结局'], explanation: '生活细节不仅构成场景，也可表现人物关系和生活差异。', point: 0 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-23-sangu', '23* 三顾茅庐 / 罗贯中', [
    ['礼贤与识人', '刘备多次拜访诸葛亮，表现出求贤若渴和尊重人才的态度。'],
    ['战略对话', '诸葛亮分析天下形势并提出谋划，展示其洞察力和长远眼光。'],
  ], [
    { prompt: '刘备多次前往拜访诸葛亮，最能体现？', correct: '求贤若渴并尊重人才', distractors: ['只为炫耀自己的地位', '不愿意听取他人意见', '试图回避治理事务'], explanation: '多次拜访表现刘备对人才的重视，也体现其求贤的诚意。', point: 0 },
    { prompt: '诸葛亮在对话中分析天下形势并提出长远谋划，主要表现其？', correct: '观察局势、综合判断和战略谋划能力', distractors: ['只关注眼前琐事', '拒绝了解各地形势', '完全依靠他人替他思考'], explanation: '分析各方形势并提出整体谋划，表现人物的远见和判断力。', point: 1 },
    { prompt: '“三顾茅庐”的故事中，求贤者与人才之间建立关系的关键是？', correct: '诚意尊重与彼此认可', distractors: ['单方面强迫对方服从', '只依靠物质条件交换', '双方从不交流想法'], explanation: '刘备的诚意和诸葛亮的战略见识，使双方逐步建立信任与合作。', point: 0 },
    { prompt: '阅读古典小说中的对话情节，哪项方法有助于分析人物？', correct: '关注对话内容、语气和前后行动之间的联系', distractors: ['只看说话字数多少', '忽略人物行动，只摘录名句', '不结合故事处境作判断'], explanation: '对话与行动共同表现人物性格、关系和情节发展。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-writing', '有创意地表达', [
    ['表达创意', '根据表达目的、对象和内容选择恰当形式，在清楚表达的基础上追求新意。'],
    ['修改表达', '创意应服务于主题，结构、视角和语言调整要让读者更容易理解。'],
  ], [
    { prompt: '写一篇介绍校园环保行动的文章，想增强表达的现场感，哪种安排更合适？', correct: '选取一次具体行动，用人物、细节和结果呈现过程', distractors: ['只罗列抽象口号，不写行动', '加入与主题无关的多个故事', '删去行动过程，只写标题'], explanation: '具体场景和细节能让主题更清晰，也使表达更有感染力。', point: 0 },
    { prompt: '同一主题可以写成书信、故事或倡议书，选择表达形式时首先要考虑？', correct: '写作目的、读者对象和内容特点', distractors: ['哪种形式最难写', '篇幅必须越长越好', '只模仿最近读到的文章'], explanation: '形式要服务于目的、对象和内容，不能为追求新奇而脱离主题。', point: 0 },
    { prompt: '初稿中有一个新奇比喻，但读者容易误解主题。修改时较合适的是？', correct: '保留有帮助的创意，并改写或删去造成歧义的部分', distractors: ['因为新奇就全部保留', '删除全文所有形象表达', '再加入更多不相关的比喻'], explanation: '创意表达仍需清楚准确；修改应兼顾新意和读者理解。', point: 1 },
    { prompt: '以下哪项最能体现“有创意地表达”而不偏离主题？', correct: '根据内容需要调整叙述视角或表达形式', distractors: ['堆砌生僻词语以显得特别', '加入与主题无关的情节', '故意隐去读者理解所需的信息'], explanation: '创意可以体现在视角和形式上，但应增强主题表达而非制造障碍。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-rulin', '《儒林外史》', [
    ['讽刺小说阅读', '《儒林外史》以人物群像和讽刺笔法呈现科举制度影响下的士人生活。'],
    ['人物与主题', '阅读时可联系人物言行、社会环境和叙事反差理解作品的批判意味。'],
  ], [
    { prompt: '阅读《儒林外史》时，概括作品讽刺意味较恰当的依据是？', correct: '结合人物言行、功名追求和社会环境分析', distractors: ['只按故事发生年代作判断', '只记住人物姓名，不看行为', '把小说情节当成作者的生活日记'], explanation: '讽刺意味常通过人物追逐功名的言行和社会环境的反差表现。', point: 0 },
    { prompt: '讽刺小说塑造人物群像的作用通常是？', correct: '从不同人物身上呈现某种社会风气或问题', distractors: ['让所有人物承担同一个情节功能', '取消个体性格差异', '只增加小说篇幅'], explanation: '人物群像能从多个侧面呈现社会现象，使主题更丰富。', point: 0 },
    { prompt: '分析作品中的夸张或对比手法时，最应关注？', correct: '它如何揭示人物特点并服务于作品主题', distractors: ['手法出现了多少次', '句子长度是否完全相等', '作品是否使用现代网络词语'], explanation: '修辞和叙事手法的价值要结合人物塑造及主题表达来判断。', point: 1 },
    { prompt: '整本书阅读计划中，哪种做法更利于形成整体认识？', correct: '记录主要人物、关键情节及其变化，并回看彼此联系', distractors: ['只读结尾后猜测全书内容', '只摘录陌生词语而不看情节', '把每章当作互不关联的短文'], explanation: '人物和情节线索有助于把握整本书结构及主题发展。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-nanan', '南安军 / 文天祥', [
    ['诗歌意象', '诗中通过山河、故乡和行旅等意象表现历史变迁与个人处境。'],
    ['情感与志向', '结合结尾表达理解诗人的忠贞气节和坚定志向。'],
  ], [
    { prompt: '文天祥《南安军》中“山河千古在，城郭一时非”形成的主要对照是？', correct: '山河长存与城郭变迁', distractors: ['白昼与黑夜', '春天与秋天', '远行与归隐'], explanation: '诗句以山河的长久和城郭的变化相对照，寄寓历史兴亡之感。', point: 0 },
    { prompt: '“饿死真吾志，梦中行采薇”主要表现诗人？', correct: '宁守气节、不改志向的决心', distractors: ['对饮食生活的喜爱', '盼望隐居山林享乐', '准备放弃自己的立场'], explanation: '结尾表达坚守志节的决心，“采薇”也关联古代忠贞不屈的文化意象。', point: 1 },
    { prompt: '理解《南安军》的情感，哪种做法更合适？', correct: '结合诗人生平处境和关键意象综合体会', distractors: ['只按题目猜测诗意', '忽略诗句中的历史感', '把诗歌读成地理说明文'], explanation: '诗歌情感常与写作处境、意象和关键语句相联系。', point: 1 },
    { prompt: '诗中“山河”意象除了描写自然景物，还能承载？', correct: '对历史、国家和故土的情感', distractors: ['对商品贸易路线的说明', '对天气变化的精确预报', '对人物外貌的直接描写'], explanation: '在诗歌语境中，山河意象可以寄托对故土与历史的感受。', point: 0 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-biejian', '别云间 / 夏完淳', [
    ['离别与故土', '诗歌写诀别故乡的沉痛，也表达对故土和国家的深厚感情。'],
    ['意象与志向', '末句借想象中的归来表达不屈信念和持续守望。'],
  ], [
    { prompt: '《别云间》写离别时，诗人最鲜明的情感基调是？', correct: '眷恋故乡并坚守志节', distractors: ['轻松游历后的喜悦', '对田园生活的满足', '对功名得失的漠不关心'], explanation: '诗歌既有离别故乡的悲痛，也表达不屈的志向和对国家的眷恋。', point: 0 },
    { prompt: '“无限山河泪，谁言天地宽”所表达的情绪更接近？', correct: '因山河受创、前路艰难而产生的悲愤', distractors: ['远足途中欣赏山水的闲适', '丰收后对天地的感激', '宴饮时对朋友的赞美'], explanation: '“山河泪”与“天地宽”的反问呈现沉重处境和悲愤心情。', point: 0 },
    { prompt: '诗末想象忠魂归来、继续守望，主要表现？', correct: '即使面临诀别仍保持不屈的信念', distractors: ['忘记故乡并远离现实', '希望别人替自己放弃理想', '只在意个人名利'], explanation: '结尾把现实离别与未来想象联系起来，表达坚贞的志向。', point: 1 },
    { prompt: '比较《别云间》与一般送别诗，理解其情感应特别关注？', correct: '诗人的处境、时代背景和故土情怀', distractors: ['诗中是否出现宴席', '诗歌的字数是否相同', '标题里是否有地名'], explanation: '理解这首诗要结合作者当时的处境和诗中家国情感。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-lishan', '山坡羊·骊山怀古 / 张养浩', [
    ['历史兴亡', '作品由骊山遗迹引出对历史盛衰的感慨，指出奢华与权势终会消散。'],
    ['曲的表达方式', '借景抒怀、议论和反复强化对历史规律的思考。'],
  ], [
    { prompt: '《山坡羊·骊山怀古》由骊山遗迹想到历代兴亡，主要运用了？', correct: '借古迹引发对历史盛衰的感慨', distractors: ['通过人物对白讲述爱情故事', '以实验数据说明地形变化', '只描写旅行路线而不表达感受'], explanation: '作品从骊山遗迹和历史联想展开，借古抒发对盛衰的思考。', point: 0 },
    { prompt: '曲中反复强调王朝兴亡最终归于尘土，意在说明？', correct: '奢华权势难以长久，历史盛衰值得反思', distractors: ['所有历史事件都没有差别', '自然景观不会发生变化', '个人必须追求奢侈生活'], explanation: '反复句式强化盛衰无常和对历史教训的思考。', point: 1 },
    { prompt: '理解这首曲子的主旨，哪种阅读路径较好？', correct: '联系景物、历史典故和议论性语句', distractors: ['只统计曲牌中出现的地名', '只按字面解释“土”字', '忽略结尾的历史判断'], explanation: '作品由景入史，再以议论深化主题，需联系多个层次理解。', point: 0 },
    { prompt: '作品对历史兴亡的感慨，最不适合概括为？', correct: '赞美统治者越奢侈越能长久统治', distractors: ['关注权势和繁华的消散', '借古迹思考历史教训', '表达盛衰变化带来的感慨'], explanation: '作品对奢华与权势的结局带有反思意味，并非赞美奢侈统治。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-yonglaba', '朝天子·咏喇叭 / 王磐', [
    ['讽刺对象', '作品借喇叭、唢呐的形象讽刺借权势扰民的宦官及其帮闲风气。'],
    ['语言与效果', '夸张、反复和形象化语言增强讽刺力度，表现百姓受到的侵扰。'],
  ], [
    { prompt: '《朝天子·咏喇叭》借喇叭声势大、作用有限的形象，主要讽刺？', correct: '借权势耀武扬威并扰害百姓的宦官', distractors: ['普通乐师认真练习技艺', '农民辛勤耕种田地', '行旅者在路上迷失方向'], explanation: '作品以喇叭的声势作比，讽刺借权势抬高身价、扰害百姓的宦官。', point: 0 },
    { prompt: '曲中写喇叭声使军民都感到忧惧，突出表现？', correct: '权势压迫给百姓和社会带来的影响', distractors: ['音乐演奏使人放松', '不同乐器音色的科学差别', '百姓主动要求增加赋税'], explanation: '军民的反应显示权势者的行为影响广泛，增强作品的批判意味。', point: 1 },
    { prompt: '作品把喇叭声写得夸张响亮，主要表达？', correct: '借声音特点影射人物声势和权力的膨胀', distractors: ['说明乐器制作的全部步骤', '营造安静祥和的山村景色', '表现作者对音乐理论的研究'], explanation: '夸张的声音描写构成比喻和讽刺，映照人物借权势扩张影响。', point: 0 },
    { prompt: '曲末“水尽鹅飞”的形象更接近于？', correct: '百姓受到侵扰后家业受损、难以安居的结果', distractors: ['河流干涸后开始捕鱼', '喇叭演奏结束后的欢庆', '官船行驶速度变快'], explanation: '结尾形象地写出侵扰造成的破坏，强化对扰民行为的批判。', point: 1 },
  ]),
  chinese9bSet('rebuild-2026-chinese-9b-u6-review', '单元综合与测试', [
    ['小说阅读方法', '关注情节、人物、环境与叙述方式之间的联系，理解作品主题。'],
    ['古诗词品读', '从意象、关键语句、表达手法和作者处境体会诗歌情感。'],
  ], [
    { prompt: '阅读《智取生辰纲》《范进中举》等小说，概括人物形象时应？', correct: '结合人物言行、情节变化和社会环境', distractors: ['只根据篇名判断人物性格', '忽略故事背景，只摘抄一句话', '把不同作品中的人物混为一谈'], explanation: '人物形象要从言行、情节和环境中综合分析，不同作品也需分别把握。', point: 0 },
    { prompt: '比较本单元几篇小说的讽刺或幽默效果，最适合关注？', correct: '叙事反差、人物反应和具体生活细节', distractors: ['课文页码的先后顺序', '人物姓名的字数', '每段标点符号的数量'], explanation: '反差、细节及人物反应往往构成小说的讽刺和幽默效果。', point: 0 },
    { prompt: '理解本单元古诗词中的家国情怀，哪种做法更合适？', correct: '联系关键意象、抒情语句和作者处境', distractors: ['只把诗句改写成日常对话', '只看诗题中的地名', '忽略语气和情感变化'], explanation: '关键意象、抒情语句与作者处境共同帮助理解诗歌情感。', point: 1 },
    { prompt: '把握小说与诗歌的表达差异，正确的是？', correct: '小说常借情节和人物展开，诗歌常凝练地借意象与语言抒情', distractors: ['小说没有人物，诗歌没有情感', '两种文体只能使用相同表达方式', '诗歌必须按故事顺序叙述'], explanation: '不同文体各有常见表达方式，阅读时应结合文本特点分析。', point: 1 },
  ]),
]

const history9bUnit5 = '第五单元 第二次世界大战后的世界变化'
const history9bSourceNote = [
  '按人教版（2024）九年级下册新教材目录重建本单元，册次标注为2027春学期预排',
  '新版目录：https://jx.panqjy.cn/catalog/list?book_id=3002432',
  '人民教育出版社修订教材结构说明：https://www.pep.com.cn/xw/zt/hd/sktbjc/zcjd/202606/t20260612_2006844.html',
  '依据新教材课次主题和初中世界史通行史实原创命题；未使用本地旧版九下教材的课次结构',
].join('；')

function history9bSet(
  id: string,
  lesson: string,
  points: Array<[string, string]>,
  questions: ChoiceQuestionDraft[],
): SetSeed {
  return {
    id,
    grade: '初三',
    subject: '历史',
    volume: '下册',
    chapter: history9bUnit5,
    section: lesson,
    edition: '人教版（2024修订；人民教育出版社；2027春学期预排）',
    sourceNote: history9bSourceNote,
    points,
    questions: distributeAnswerChoices(questions),
  }
}

const history9bUnit5Sets: SetSeed[] = [
  history9bSet('rebuild-2026-history-9b-u5-l16', '第16课 冷战的发生与两极格局的形成', [
    ['冷战形成', '二战后美苏国家利益和社会制度存在差异，双方采取遏制、结盟等方式展开长期对抗。'],
    ['两极格局', '北约与华约等军事政治集团的对峙推动两极格局形成，冷战并不等于全球没有局部战争。'],
  ], [
    { prompt: '历史上所说的“冷战”，主要指？', correct: '美苏以政治、经济、军事等方式对抗，但没有发生双方全面直接战争', distractors: ['二战期间所有国家都停止战斗', '世界各地从此不再发生局部冲突', '美国与苏联建立统一政府'], explanation: '冷战是美苏长期对抗的状态，不能误解为世界完全没有战争或冲突。', point: 0 },
    { prompt: '1947年美国提出遏制共产主义扩张的政策，通常称为？', correct: '杜鲁门主义', distractors: ['马歇尔计划', '凡尔赛条约', '门户开放政策'], explanation: '杜鲁门主义标志着美国对苏联冷战政策的重要展开。', point: 0 },
    { prompt: '北约与华约相继建立，最直接地反映了？', correct: '美苏两大阵营的军事对峙加深', distractors: ['欧洲国家全部结束军事合作', '世界各国实现政治制度统一', '联合国被两个军事集团取代'], explanation: '两大军事集团的形成加剧了对立，是两极格局发展的表现。', point: 1 },
    { prompt: '把冷战时期说成“没有任何战争”，错误在于？', correct: '美苏没有全面直接开战，但世界仍发生过局部战争和地区冲突', distractors: ['冷战只发生在二战以前', '美苏从未有过政治对抗', '冷战期间不存在任何军事集团'], explanation: '冷战的“冷”指美苏避免全面直接战争，不表示世界各地绝无武装冲突。', point: 1 },
  ]),
  history9bSet('rebuild-2026-history-9b-u5-l17', '第17课 二战后资本主义国家的变化', [
    ['经济恢复与发展', '战后西方国家通过重建、科技进步和政策调整推动经济发展，发展过程也存在周期性问题。'],
    ['国家调节与社会保障', '国家加强宏观调节并发展社会保障制度，以缓和社会矛盾、改善民生。'],
  ], [
    { prompt: '二战后部分资本主义国家加强政府对经济的调节，主要目的是？', correct: '稳定经济运行并缓解社会矛盾', distractors: ['取消所有市场活动', '阻止科技进步', '让政府完全退出公共事务'], explanation: '国家调节和公共政策旨在稳定经济、改善社会生活，并非取消市场。', point: 0 },
    { prompt: '社会保障制度扩大，主要体现了战后资本主义国家？', correct: '更加重视社会民生和风险保障', distractors: ['完全消除贫富差距', '停止发展生产和科技', '不再需要税收和公共服务'], explanation: '社会保障帮助应对失业、疾病等风险，但不能消除所有社会问题。', point: 1 },
    { prompt: '科技进步和生产方式变化对战后经济发展的作用是？', correct: '提高生产效率并带来新的产业发展机会', distractors: ['保证经济永远高速增长', '使各国发展水平立即相同', '让教育与劳动能力不再重要'], explanation: '科技进步能推动效率和产业变化，但经济增长仍受多种因素影响。', point: 0 },
    { prompt: '评价战后资本主义发展时，较全面的认识是？', correct: '既看到经济和社会政策变化，也看到危机与不平等仍然存在', distractors: ['只要经济增长，社会问题就全部消失', '社会保障意味着没有任何矛盾', '国家政策从未发生变化'], explanation: '历史变化往往同时包含进步、调整和持续存在的问题。', point: 1 },
  ]),
  history9bSet('rebuild-2026-history-9b-u5-l18', '第18课 社会主义的曲折发展与奋起', [
    ['战后社会主义发展', '二战后社会主义国家和运动发展壮大，不同国家根据条件探索发展道路。'],
    ['改革与挫折', '苏联和东欧的改革、社会变化及制度危机推动东欧剧变和苏联解体，反映出改革与治理面临的复杂问题。'],
  ], [
    { prompt: '二战后社会主义力量的发展，历史上主要表现为？', correct: '一些国家走上社会主义道路，社会主义国家之间扩大交流', distractors: ['所有国家都改用同一种制度', '社会主义运动在二战后立即消失', '联合国禁止国家间制度交流'], explanation: '战后世界格局变化使社会主义国家和运动得到发展，但各国发展道路并不完全相同。', point: 0 },
    { prompt: '研究苏联和东欧改革时，怎样的结论较合理？', correct: '改革需要结合实际、完善治理并回应社会发展问题', distractors: ['只要宣布改革就一定成功', '改革失败说明所有改革都没有意义', '制度变化与经济社会问题无关'], explanation: '改革成效受政策、制度和社会条件等多方面因素影响，不能简单绝对化。', point: 1 },
    { prompt: '1991年苏联解体，标志着？', correct: '苏联作为一个国家不复存在，也意味着两极格局进一步瓦解', distractors: ['第二次世界大战结束', '联合国成立', '北约立即解散'], explanation: '苏联解体是冷战后期的重要事件，推动两极格局最终瓦解。', point: 1 },
    { prompt: '解释东欧剧变和苏联解体，较完整的做法是？', correct: '联系经济、政治、社会及改革等多种因素分析', distractors: ['只用一个偶然事件说明全部原因', '把所有国家的情况视为完全相同', '忽略长期积累的矛盾'], explanation: '重大历史变化通常由长期矛盾、政策选择和社会环境等多种因素共同作用。', point: 0 },
  ]),
  history9bSet('rebuild-2026-history-9b-u5-l19', '第19课 亚非拉国家的成长', [
    ['民族独立运动', '二战后亚非拉民族解放运动高涨，许多国家摆脱殖民统治并探索发展道路。'],
    ['国际合作与自主发展', '新独立国家争取政治自主、维护经济权益，并以多种方式开展区域和国际合作。'],
  ], [
    { prompt: '二战后亚非拉国家民族解放运动发展的重要结果是？', correct: '许多国家摆脱殖民统治，获得独立', distractors: ['殖民体系在全球范围永久巩固', '所有新独立国家立即实现工业化', '联合国停止接纳新成员'], explanation: '战后民族解放运动推动殖民体系瓦解，许多亚非拉国家取得独立。', point: 0 },
    { prompt: '印度在1947年取得独立，在世界历史上属于？', correct: '亚洲民族独立运动的重要成果', distractors: ['美苏冷战军事集团成立', '欧洲一体化正式完成', '非洲殖民统治的开端'], explanation: '印度独立是二战后亚洲民族独立运动的重要事件。', point: 0 },
    { prompt: '新独立国家维护经济权益、争取自主发展的做法体现？', correct: '政治独立后还需要探索适合本国的发展道路', distractors: ['取得独立就自动解决所有发展问题', '发展只能依靠原殖民国家决定', '国际合作必然损害国家自主'], explanation: '政治独立是重要起点，各国仍需结合实际推进经济社会发展。', point: 1 },
    { prompt: '亚非拉国家开展区域合作，可能带来的作用是？', correct: '加强协商互助，提升维护共同利益的能力', distractors: ['取消所有国家的主权', '使各国经济条件立即完全相同', '停止与世界其他地区交往'], explanation: '合作有助于协商共同问题、维护利益，但不能自动消除发展差异。', point: 1 },
  ]),
]

export const currentEditionRebuildSets: PracticeSet[] = [
  ...civicsSets.map(makeSet),
  ...civicsReviewSets.map(makeSet),
  ...civics9bSets.map(makeSet),
  ...geography7aChapter6Sets.map(makeSet),
  ...chinese9bUnit6Sets.map(makeSet),
  ...history9bUnit5Sets.map(makeSet),
  ...englishSets.map(makeSet),
]
