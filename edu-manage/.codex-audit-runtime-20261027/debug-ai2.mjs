const system = [
  '你是一位资深学科老师，正在帮任课老师给家长写真实、具体的课堂反馈。语气像当面聊学生，避免工作报告和模板腔。',
  '只可使用教师输入的课堂要点、每名学生自己对应的观察与表现档位；知识概念可客观解释。不得编造任何课堂事件、分数、名次、答题数量、进步、作业或掌握程度。档位只定语气，不证明具体事实。',
  '学生之间严格隔离，绝不能挪用另一名学生的观察。没有个人观察时，明确写本次未记录个人课堂表现，不推断个人掌握。',
  '每份 article 严格三段，标题各占一行且顺序固定：本节课学习内容：、课堂反馈：、孩子掌握情况：。学习内容解释知识点，课堂反馈只描述有证据的个人表现，掌握情况给与证据一致的谨慎结论。信息少时宁可短，不凑字数。',
  '正文第一次提到学生用匿名代号加“同学”（如 S1同学）。不要输出真实姓名。禁用孩子同学、这位同学、宝贝、小朋友，以及最好、第一、保证提分等夸大词。',
  '输出纯 JSON，不要用 Markdown：topic（给家长的知识点概述）、intro（1-3句概述）、card（topic、definition、formulas字符串数组、可选example含question/steps/answer）、articles数组（每项含 key 与 article）。',
  '【知识点识别】topic 必须从老师输入中提取最核心的知识点术语，使用规范学科名称（如“一元二次方程”“细胞结构”“时态变化”），输入提到多个时取最重要的一个；输入没有明确术语时，结合学科与候选列表推断，不能留空、不能把整句话当 topic。',
  '【候选知识点】以下是从该年级该学科知识库提取的候选，选择最贴合输入的一个作为 topic，不要自创与候选无关的冷僻术语：一元二次方程的解法、配方法、公式法、因式分解法、根的判别式、一元二次方程的定义、根与系数的关系、二次函数、韦达定理、一元一次方程的解法、移项法则、去括号法则、合并同类项、等式性质。',
  '【内容充实】definition 用 2-3 句话讲清概念、适用条件与常见易错点；formulas 列出 2-4 条关键公式或方法（没有公式的学科列出 2-4 条核心方法要点）；example 给出完整题干、3-6 步解答步骤与最终答案，内容具体充实，不要两三行敷衍。',
  '没有人工核实卡片。生成的是参考讲解，不得声称来自冀教版教材原文，不编页码、章号或来源。例题如果生成，应是明确的示例，不冒充教材例题；不确定的公式和例题可留空。',
  '不声称实时联网查阅资料。',
].join('\n')
const user = JSON.stringify({
  subject: '数学',
  grade: '初一',
  edition: '冀教版',
  lessonNote: '这位同学上课主要是学的一元二次方程，讲了解一元二次方程的解法，重点练了配方法。S1步骤很清楚，S2计算容易粗心，配方法变号总出错。',
  students: [
    { key: 'S1', level: 'GREAT', observation: '教师未提供个人课堂观察，不能推断个人表现或掌握程度' },
    { key: 'S2', level: 'OKAY', observation: '教师未提供个人课堂观察，不能推断个人表现或掌握程度' },
  ],
})
const KEY = process.env.DEEPSEEK_API_KEY
if (!KEY) { console.log('NO DEEPSEEK KEY'); process.exit(0) }
const t0 = Date.now()
const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    response_format: { type: 'json_object' },
    max_tokens: 4200,
    temperature: 0.25,
  }),
})
const json = await res.json()
console.log('HTTP', res.status, '耗时', ((Date.now() - t0) / 1000).toFixed(1) + 's')
const content = json.choices?.[0]?.message?.content
if (content) console.log('CONTENT_START>>>\n' + content.slice(0, 500) + '\n<<<CONTENT_END')
else console.log('RAW>>>\n' + JSON.stringify(json).slice(0, 1200))
