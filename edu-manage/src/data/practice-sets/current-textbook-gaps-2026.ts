import type { PracticeSet } from '../parent-practice-bank'
import currentJuniorCatalog from '../../../data/textbooks/current-junior-textbook-catalog-2026.json'

type QuestionSeed = {
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
  point: number
}

type UnitSeed = {
  unit: number
  points: Array<[string, string]>
  questions: QuestionSeed[]
}

type EnglishVolumeSeed = {
  grade: '初一' | '初二' | '初三'
  volume: '上册' | '下册'
  officialResource: string
  directoryUrl: string
  units: UnitSeed[]
}

const pepEnglishIntro = 'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202510/t20251024_2004130.html'
const gradeNames = { 初一: '七年级', 初二: '八年级', 初三: '九年级' } as const
const englishVolumes: EnglishVolumeSeed[] = [
  {
    grade: '初一', volume: '下册',
    officialResource: 'https://www.pep.com.cn/zslth/yyptzy/czyy/7x/',
    directoryUrl: 'https://jx.panqjy.cn/catalog/list?book_id=3002342',
    units: [
      { unit: 1, points: [['动物主题词汇与原因表达', '用动物特征、喜好及 Because... 等表达说明人与动物的联系。'], ['描述与语篇信息', '从描述性细节中提取动物特点、人与动物的关系和作者态度。']], questions: [
        { prompt: '—Why do you like dolphins? —______ they are clever and friendly.', options: ['Because', 'But', 'Or', 'Before'], answerIndex: 0, explanation: '问句用 Why 询问原因，回答用 Because 引出理由。But 表示转折、Or 表示选择、Before 表示时间先后，都不能构成原因回答。', point: 0 },
        { prompt: 'A guide dog helps a person who cannot see well. Which word best describes the dog’s role?', options: ['helpful', 'careless', 'noisy', 'hungry'], answerIndex: 0, explanation: '句子说明导盲犬帮助视力不佳的人，因此 helpful（有帮助的）最贴合语境。这里考的是根据行为推断动物与人的关系，而不是只看动物外形。', point: 1 },
        { prompt: 'Choose the grammatically correct sentence.', options: ['My cat likes sleeping in a warm box.', 'My cat like sleeping in a warm box.', 'My cat is like sleep in a warm box.', 'My cat liking sleeps in a warm box.'], answerIndex: 0, explanation: '一般现在时中，第三人称单数主语 my cat 后的实义动词要加 -s；like 后接动名词 sleeping 表示“喜欢做某事”。其余选项分别漏了三单标记或把动词形式叠用。', point: 0 },
        { prompt: 'A notice says, “Please do not touch the young birds. Their parents are nearby.” What is the main reason for the rule?', options: ['To protect the birds and let their parents care for them.', 'To teach the birds to fly faster.', 'To make visitors leave the park.', 'To show that birds are pets.'], answerIndex: 0, explanation: 'notice 明确要求不要触碰幼鸟；结合 parents are nearby 可知目的是保护幼鸟、让亲鸟照料。不能把保护性规则误读成训练动物或驱赶游客。', point: 1 },
      ] },
      { unit: 2, points: [['规则与义务表达', '区分 must / mustn’t 表示必须或禁止，don’t have to 表示没有必要。'], ['规则的作用', '结合规则目的、适用对象和后果判断规则是否清楚、公平且可执行。']], questions: [
        { prompt: 'The school library is quiet. You ______ talk loudly there.', options: ['mustn’t', 'don’t have to', 'may', 'needn’t to'], answerIndex: 0, explanation: 'mustn’t 表示“禁止”，适用于图书馆保持安静的规则。don’t have to 是“不必”，并不等于禁止；needn’t 后也不能再接 to。', point: 0 },
        { prompt: 'Students ______ bring a dictionary today; the teacher has put one on every desk.', options: ['don’t have to', 'mustn’t', 'can’t', 'shouldn’t to'], answerIndex: 0, explanation: '桌上已经有词典，学生“没有必要自带”，所以用 don’t have to。mustn’t/can’t 表示不允许，语气与题意不同。', point: 0 },
        { prompt: 'Which class rule is clearest and fairest?', options: ['Everyone puts shared books back after using them.', 'Some students should be careful sometimes.', 'Only new students must keep the room clean.', 'Do whatever you like with shared things.'], answerIndex: 0, explanation: '有效规则要说明具体行为，并对使用公共资源的人一致适用。其余表达含糊、区别对待或完全没有约束，难以帮助大家形成可预期的秩序。', point: 1 },
        { prompt: 'A classmate says rules only take away freedom. Which response best explains why rules can help?', options: ['Clear rules protect everyone’s rights and make shared activities safer.', 'Rules are useful only when someone is punished.', 'Rules mean nobody may make choices.', 'Rules should change for each person every day.'], answerIndex: 0, explanation: '共同活动中，规则能减少冲突、保护安全与权利，让每个人更容易预期他人的行为。规则需要合理、公开、一视同仁；它并不意味着取消所有个人选择。', point: 1 },
      ] },
      { unit: 3, points: [['频率提问与副词', '用 How often 询问频率，并掌握频率副词在一般现在时句中的常见位置。'], ['运动与健康信息', '从频率、持续时间和活动类型等信息比较运动习惯，不凭单一数据作过度结论。']], questions: [
        { prompt: '—______ do you play badminton? —Twice a week.', options: ['How often', 'How long', 'How far', 'How many'], answerIndex: 0, explanation: 'Twice a week 表示发生频率，应用 How often 提问。How long 问时长，How far 问距离，How many 后接可数名词问数量。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['Leo usually walks to school.', 'Leo walks usually to school.', 'Leo is usually walk to school.', 'Leo usually walking to school.'], answerIndex: 0, explanation: 'usually 等频率副词通常放在实义动词之前，因此是 usually walks；主语 Leo 为第三人称单数，walk 要变为 walks。', point: 0 },
        { prompt: 'A chart shows that Mei exercises for 30 minutes on four days each week. Which conclusion is supported?', options: ['She exercises regularly during the week.', 'She exercises every day.', 'She never does any other activity.', 'She is healthier than every classmate.'], answerIndex: 0, explanation: '数据只支持“每周四天、每次30分钟”，可以说她规律锻炼；不能推成每天锻炼，也不能仅凭这一项数据比较所有人的健康状况。', point: 1 },
        { prompt: 'A student has not exercised for months and wants to start running. Which plan is more sensible?', options: ['Begin with a manageable pace and increase gradually.', 'Run as fast as possible for two hours on the first day.', 'Skip warming up so the run is shorter.', 'Exercise only when feeling severe pain.'], answerIndex: 0, explanation: '从可承受的强度开始、逐步增加，更有利于形成可持续习惯并降低突然过量运动的风险。题目考查健康主题下的理解与建议表达，不是要求用运动替代专业医疗建议。', point: 1 },
      ] },
      { unit: 4, points: [['食物名词与数量表达', '区分常见可数名词和不可数名词，正确使用 many / much 及 how many / how much。'], ['饮食选择与语篇', '根据菜单、食材和完整餐食的信息作判断，不把单一食物等同于健康饮食。']], questions: [
        { prompt: 'How ______ apples do we need for the fruit salad?', options: ['many', 'much', 'often', 'long'], answerIndex: 0, explanation: 'apples 是可数名词复数，询问数量用 How many。How much 通常修饰不可数名词；How often 和 How long 分别问频率与时长。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['There is some rice in the bowl.', 'There are some rice in the bowl.', 'There is many rice in the bowl.', 'There are a rice in the bowl.'], answerIndex: 0, explanation: 'rice 通常作不可数名词，there be 句型用 is，数量可用 some 修饰。不能因为一碗米饭在现实中能数碗，就把 rice 本身当成可数复数。', point: 0 },
        { prompt: 'Which meal plan contains a more balanced variety of foods?', options: ['Rice, vegetables, eggs and fruit.', 'Only sweet drinks.', 'Only fried potatoes.', 'Only one kind of candy.'], answerIndex: 0, explanation: '选项 A 同时包含主食、蔬菜、蛋类和水果，食物种类较丰富。其他选项只提供单一食物或饮料，不能据此构成多样的餐食。', point: 1 },
        { prompt: 'A menu says: “Vegetable soup: 2 bowls; bread: 4 pieces.” Which question asks about the soup quantity?', options: ['How much soup is there?', 'How many soup is there?', 'How often soup is there?', 'How long soup is there?'], answerIndex: 0, explanation: 'soup 在这里按“汤”整体作不可数名词，用 How much 提问；若要数碗，应问 How many bowls of soup。英语按名词表达的单位判断量词。', point: 0 },
      ] },
      { unit: 5, points: [['现在进行时', '用 be + 动词-ing 描述此刻正在进行的动作，并根据主语选择 am / is / are。'], ['居住环境与位置', '用常见方位表达说明物品或房间的位置，区分正在发生与日常习惯。']], questions: [
        { prompt: 'Look! The children ______ a large picture for the project.', options: ['are drawing', 'draw', 'draws', 'is drawing'], answerIndex: 0, explanation: 'Look! 提示动作此刻正在进行，使用现在进行时 be + doing；主语 the children 是复数，be 动词用 are。', point: 0 },
        { prompt: 'Choose the correct form.', options: ['I am writing a message now.', 'I is writing a message now.', 'I writing a message now.', 'I am write a message now.'], answerIndex: 0, explanation: '现在进行时要有 be 动词和动词-ing 两部分；主语 I 对应 am，write 去掉不发音的 e 后加 -ing，构成 writing。', point: 0 },
        { prompt: 'The pharmacy is across from the library. Where is the pharmacy?', options: ['On the opposite side of the street from the library.', 'Inside the library.', 'Behind every building in town.', 'Far above the library.'], answerIndex: 0, explanation: 'across from 表示“在……对面”，描述的是空间位置。它不表示在建筑内部、后方或上方。', point: 1 },
        { prompt: 'Which sentence describes what someone is doing at this moment?', options: ['Mum is talking to our neighbour now.', 'Mum talks to our neighbour every Sunday.', 'Mum talked to our neighbour yesterday.', 'Mum will talk to our neighbour tomorrow.'], answerIndex: 0, explanation: 'now 表示此刻，is talking 是现在进行时；every Sunday 对应习惯，yesterday 对应过去，tomorrow 对应将来。判断时要先找时间线索。', point: 1 },
      ] },
      { unit: 6, points: [['天气询问与描述', '用 What is the weather like? 询问天气，并以形容词或 It is ... 表达天气状况。'], ['天气信息与应对', '读懂天气现象、时间和建议之间的关系，区分天气描述与个人感受。']], questions: [
        { prompt: '—What’s the weather like outside? —______. Take an umbrella.', options: ['It’s rainy.', 'It’s a book.', 'It’s Monday.', 'It’s ten metres.'], answerIndex: 0, explanation: '问句询问天气，It’s rainy 描述下雨，也与“带伞”的语境吻合。其余分别是物品、日期和长度单位，回答类别不对应。', point: 0 },
        { prompt: 'Choose the natural weather expression.', options: ['It is cloudy this morning.', 'It is cloud this morning.', 'It has cloud this morning.', 'It clouds this morning.'], answerIndex: 0, explanation: 'cloudy 是形容词，可放在 be 动词后描述天气。cloud 是名词，不能直接替代形容词作表语。', point: 0 },
        { prompt: 'A forecast says the temperature will fall and rain may begin after 5 p.m. What is the best plan?', options: ['Carry an umbrella if you go out after 5 p.m.', 'Wear no coat because the weather cannot change.', 'Go outside only to test the forecast.', 'Tell everyone it has already rained all day.'], answerIndex: 0, explanation: '预报中的 after 5 p.m. 和 may begin 表示晚些时候可能下雨，带伞是与信息相符的准备。may 表示可能，不应误读为已经发生或百分之百确定。', point: 1 },
        { prompt: '“I enjoy sunny days, but my friend likes cool, cloudy weather.” What does this tell us?', options: ['People may have different feelings about the same kind of weather.', 'Everyone must like sunny weather.', 'Cloudy weather is always dangerous.', 'The friends live in different countries.'], answerIndex: 0, explanation: '句子直接说明两位朋友对天气的偏好不同，说明感受有个体差异。不能从偏好推断危险性或居住地点。', point: 1 },
      ] },
      { unit: 7, points: [['一般过去时', '用过去式叙述已经发生的特别经历，注意常见不规则动词和否定、疑问结构。'], ['经历复述与反思', '按时间顺序提取经历细节，并区分“发生了什么”与“从中学到什么”。']], questions: [
        { prompt: 'We ______ the science museum last Saturday.', options: ['visited', 'visit', 'visits', 'are visiting'], answerIndex: 0, explanation: 'last Saturday 指过去的具体时间，句子用一般过去时；visit 是规则动词，加 -ed 变为 visited。', point: 0 },
        { prompt: 'Choose the correct question about yesterday.', options: ['What did you learn yesterday?', 'What do you learned yesterday?', 'What did you learned yesterday?', 'What are you learn yesterday?'], answerIndex: 0, explanation: '一般过去时的特殊疑问句用 did + 主语 + 动词原形。助动词 did 已经承担过去时，后面的 learn 不再加 -ed。', point: 0 },
        { prompt: 'A diary says: “First we missed the bus. Then a neighbour drove us to the station. Finally we arrived on time.” What helped the students arrive on time?', options: ['A neighbour gave them a ride.', 'They caught the first bus.', 'The station was closed.', 'They changed the travel day.'], answerIndex: 0, explanation: 'Then 后面的信息说明邻居开车送他们到车站，这是及时到达的直接帮助。First、Then、Finally 是排序线索，阅读时要按事件先后找因果。', point: 1 },
        { prompt: 'After a group activity goes wrong, which reflection is most useful?', options: ['Name what happened, what you learned and what you will change next time.', 'Say the day was bad and write nothing else.', 'Blame one person without checking the events.', 'Pretend the problem never happened.'], answerIndex: 0, explanation: '有价值的反思把事实、收获和下一步行动联系起来，能把经历转化为学习。单纯抱怨、归咎或回避，都没有说明如何改进。', point: 1 },
      ] },
      { unit: 8, points: [['故事叙述与顺序', '理解人物、事件和顺序词，运用一般过去时讲述已经发生的故事。'], ['主题与寓意', '结合人物选择和结局判断故事传达的道理，避免脱离文本猜寓意。']], questions: [
        { prompt: 'Which phrase is commonly used to begin a traditional story?', options: ['Once upon a time,', 'At the traffic lights,', 'For two kilometres,', 'At half past eight,'], answerIndex: 0, explanation: 'Once upon a time 是故事开头常用语，意思是“从前”。其他选项分别涉及地点、距离和时间，不是典型的故事开篇语。', point: 0 },
        { prompt: 'The boy found a wallet, looked for its owner and returned it. Which lesson is best supported by his actions?', options: ['Honesty matters even when nobody is watching.', 'Keeping lost things is always helpful.', 'It is best not to speak to anyone.', 'A wallet should never be used.'], answerIndex: 0, explanation: '人物主动寻找失主并归还钱包，行动体现诚实。寓意应由人物行为支持，不能选择与情节无关的结论。', point: 1 },
        { prompt: 'Choose the correct past-tense sentence.', options: ['The travellers crossed the river before sunset.', 'The travellers cross the river yesterday.', 'The travellers crosses the river yesterday.', 'The travellers are cross the river yesterday.'], answerIndex: 0, explanation: 'before sunset 在故事叙述中说明过去动作，cross 的一般过去式为 crossed。yesterday 同样需要过去时，不能搭配一般现在时或错误的进行结构。', point: 0 },
        { prompt: 'A short play has several events. Which order makes the ending easiest to understand?', options: ['Introduce the characters, show the problem, then show how they solve it.', 'Show the solution first, hide the problem, then introduce nobody.', 'Repeat one event without showing what changes.', 'List character names without actions.'], answerIndex: 0, explanation: '观众通常需要先知道人物和处境，再看到冲突如何发展及解决，因果关系才清楚。故事结构不是固定模板，但关键事件要有可理解的联系。', point: 1 },
      ] },
    ],
  },
]

function getVolume(subject: string, title: string) {
  const volume = currentJuniorCatalog.volumes.find((item) => item.subject === subject && item.title === title)
  if (!volume) throw new Error(`Current textbook volume not found: ${subject}/${title}`)
  return volume
}

function placeCorrectOption(question: QuestionSeed, targetIndex: number) {
  const answer = question.options[question.answerIndex]
  const options = question.options.filter((_, index) => index !== question.answerIndex)
  options.splice(targetIndex, 0, answer)
  return { options, answerIndex: targetIndex }
}

function makeEnglishSet(book: EnglishVolumeSeed, unit: UnitSeed): PracticeSet {
  const title = `${gradeNames[book.grade]}${book.volume}`
  const volume = getVolume('英语', title)
  const entry = volume.entries.find((item) => {
    const path = item.path?.length ? item.path : [item.title]
    return path.length === 1 && new RegExp(`^Unit\\s+${unit.unit}\\b`, 'i').test(path[0])
  })
  if (!entry) throw new Error(`Unit ${unit.unit} not found in current PEP English catalog: ${title}`)
  const path = entry.path?.length ? entry.path : [entry.title]
  if (path.length !== 1) throw new Error(`Unexpected English unit hierarchy in ${title}: ${path.join(' / ')}`)

  const id = `current-catalog-2026-english-${book.grade}-${book.volume}-${unit.unit}`
  const knowledgePoints = unit.points.map(([pointTitle, content], index) => ({
    id: `${id}-kp${index + 1}`,
    title: pointTitle,
    content,
  }))
  const sourceNote = [
    '依据人教版（2024修订）初中英语相应册次与单元主题原创命题；题干、选项和解析均由牧哲学堂编写。',
    `人教社新版配套资源索引（单元与栏目交叉核对）：${book.officialResource}`,
    `现行目录转录来源（第三方，供目录标题交叉核对）：${book.directoryUrl}`,
    `人教社新版初中英语教材介绍：${pepEnglishIntro}`,
  ].join('；')

  return {
    id,
    grade: book.grade,
    subject: '英语',
    volume: book.volume,
    chapter: path[0],
    section: path[0],
    edition: [volume.publisher, volume.termLabel].filter(Boolean).join(' · '),
    sourceNote,
    knowledgePoints,
    questions: unit.questions.map((question, index) => {
      const choices = placeCorrectOption(question, (unit.unit + index + (book.volume === '下册' ? 1 : 0)) % question.options.length)
      return {
        id: `${id}-q${index + 1}`,
        type: 'single_choice',
        knowledgePointId: knowledgePoints[question.point]?.id ?? knowledgePoints[0].id,
        prompt: question.prompt,
        options: choices.options,
        answerIndex: choices.answerIndex,
        explanation: question.explanation,
        difficulty: index === 3 ? '提升' : '基础',
        sourceRef: `${sourceNote}#${id}-q${index + 1}`,
      }
    }),
  }
}

const geography7aQuestions: QuestionSeed[] = [
  { prompt: '比较不同国家的发展水平时，哪种做法更稳妥？', options: ['结合多项经济与社会指标，并说明指标的局限。', '只凭一个城市的一栋高楼判断全国。', '只看国名，不查任何资料。', '认为一个指标能解释所有人的生活。'], answerIndex: 0, explanation: '国家发展水平涉及经济、教育、医疗和生活条件等多个方面，单个指标只能反映部分信息。综合多项数据并说明局限，能避免把复杂差异简化成一个数字。', point: 0 },
  { prompt: '地理学习中的“南北差距”通常指什么？', options: ['发达国家与发展中国家之间的发展差异。', '北半球和南半球所有国家气温的差异。', '每个国家南部和北部城市之间的距离。', '地球南极和北极的昼夜长短。'], answerIndex: 0, explanation: '“南北差距”是对发达国家与发展中国家发展差异的惯用概括，不是严格按地理半球划分。判断概念要看教材语境，不能只按“南、北”字面理解。', point: 0 },
  { prompt: '一部手机的零件来自多个国家，在不同地区组装并销往世界各地。这说明什么？', options: ['各国通过国际分工和贸易形成相互联系。', '每个国家都能独立生产所有商品。', '国际合作使地理位置变得毫无意义。', '商品只能在生产零件的国家使用。'], answerIndex: 0, explanation: '零件、组装和销售跨越多个国家，反映了国际分工和贸易联系，也说明各地生产活动可能相互依赖。合作并没有消除地域差异，反而常利用不同地区的条件与优势。', point: 1 },
  { prompt: '为什么气候变化、海洋污染等问题需要国家间合作？', options: ['影响可能跨越国界，单个国家难以独自处理全部问题。', '这些问题只发生在一个城市。', '国家间合作可以取消所有自然过程。', '每个国家都能把影响完全留在本国境内。'], answerIndex: 0, explanation: '大气和海洋具有跨区域联系，污染和气候影响可能越过国界；监测、减排、治理与信息共享需要多方协作。合作不代表问题会立刻消失，但能协调行动并共同分担责任。', point: 1 },
]

function makeGeographySet(): PracticeSet {
  const volume = getVolume('地理', '七年级上册')
  const entry = volume.entries.find((item) => {
    const path = item.path?.length ? item.path : [item.title]
    return path.length === 1 && /^第六章\s*发展与合作$/.test(path[0])
  })
  if (!entry) throw new Error('Chapter 6 “发展与合作” not found in the current PEP geography catalog')
  const path = entry.path?.length ? entry.path : [entry.title]
  const id = 'current-catalog-2026-geography-7a-chapter6'
  const knowledgePoints = [
    { id: `${id}-kp1`, title: '国家发展差异', content: '比较国家发展状况时结合经济与社会指标，理解发展差异并避免单一指标或刻板标签。' },
    { id: `${id}-kp2`, title: '国际分工与合作', content: '从跨国生产、贸易和全球性问题理解国家间联系及合作的必要性。' },
  ]
  const officialGeoIntro = 'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202409/t20240918_1995544.html'
  const geographyStandard = 'https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582354066450.pdf'
  const directory = 'https://jx.panqjy.cn/catalog/list?book_id=3002640'
  const sourceNote = [
    '依人教版（2024修订）七年级上册“发展与合作”主题原创命题；题目用于训练指标阅读、区域联系与合作分析。',
    `人民教育出版社新版地理教材介绍：${officialGeoIntro}`,
    `教育部《义务教育地理课程标准（2022年版）》相关内容要求：${geographyStandard}`,
    `现行目录转录来源（第三方，供目录标题交叉核对）：${directory}`,
  ].join('；')
  return {
    id,
    grade: '初一',
    subject: '地理',
    volume: '上册',
    chapter: path[0],
    section: path[0],
    edition: [volume.publisher, volume.termLabel].filter(Boolean).join(' · '),
    sourceNote,
    knowledgePoints,
    questions: geography7aQuestions.map((question, index) => {
      const choices = placeCorrectOption(question, (index + 1) % question.options.length)
      return {
        id: `${id}-q${index + 1}`,
        type: 'single_choice',
        knowledgePointId: knowledgePoints[question.point].id,
        prompt: question.prompt,
        options: choices.options,
        answerIndex: choices.answerIndex,
        explanation: question.explanation,
        difficulty: index === 3 ? '提升' : '基础',
        sourceRef: `${sourceNote}#${id}-q${index + 1}`,
      }
    }),
  }
}

englishVolumes.push(
  {
    grade: '初二', volume: '上册',
    officialResource: 'https://www.pep.com.cn/zslth/yyptzy/czyy/8s/',
    directoryUrl: 'https://jx.panqjy.cn/catalog/list?book_id=3002343',
    units: [
      { unit: 1, points: [['假期经历与过去时', '用一般过去时复述已完成的旅行活动，并以具体时间或细节支撑回答。'], ['经历与收获', '从经历中提取事实、感受和收获，区分事实与个人评价。']], questions: [
        { prompt: '—Where did you go last summer? —I ______ to Qingdao with my family.', options: ['went', 'go', 'will go', 'am going'], answerIndex: 0, explanation: 'last summer 是明确的过去时间，回答要用一般过去时；go 的过去式是不规则变化 went。其余形式分别是现在、将来或现在进行时。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['We saw the old bridge yesterday.', 'We see the old bridge yesterday.', 'We did saw the old bridge yesterday.', 'We are see the old bridge yesterday.'], answerIndex: 0, explanation: 'yesterday 表示过去，see 的过去式是 saw。一般过去时肯定句直接用过去式；若用 did，后面才接动词原形。', point: 0 },
        { prompt: 'A travel note says, “The train was delayed, so we visited a small museum near the station.” What did the travellers do while waiting?', options: ['They visited a nearby museum.', 'They took an earlier train.', 'They went back home at once.', 'They missed the museum on purpose.'], answerIndex: 0, explanation: 'so 引出火车晚点后的结果，原文明确说他们参观了车站附近的小博物馆。阅读因果关系时应先找连接词，再确认事实细节。', point: 1 },
        { prompt: 'What is the best way to explain what a holiday taught you?', options: ['Give one experience and explain how it changed your thinking or action.', 'Only name the city without describing anything.', 'Say every holiday teaches the same lesson.', 'Describe a place you have never visited as a fact.'], answerIndex: 0, explanation: '经历与收获之间要有解释：先交代具体事件，再说明它带来的认识或行动变化。单独报地名或作没有依据的概括，不能说明学到了什么。', point: 1 },
      ] },
      { unit: 2, points: [['家务与能力表达', '用 can / can’t 说明能做或不能做的家务，并用频率短语谈日常分工。'], ['家庭合作与感受', '根据家庭成员的实际需要安排家务，理解分担责任与互相支持。']], questions: [
        { prompt: 'I can ______ the table before dinner.', options: ['set', 'sets', 'setting', 'to setting'], answerIndex: 0, explanation: '情态动词 can 后接动词原形，因此用 set。不能加第三人称 -s，也不能在 can 后接 to do。', point: 0 },
        { prompt: 'Which sentence correctly describes a weekly chore?', options: ['My brother takes out the rubbish twice a week.', 'My brother take out the rubbish twice a week.', 'My brother is take out the rubbish twice a week.', 'My brother taking out the rubbish twice a week.'], answerIndex: 0, explanation: '一般现在时表达固定习惯；主语 my brother 是第三人称单数，take 要变为 takes。twice a week 是频率短语，放在句末自然清楚。', point: 0 },
        { prompt: 'One parent is ill and the other has a late shift. What is the most helpful family plan?', options: ['Share the necessary chores and check who needs help.', 'Leave every task to the ill parent.', 'Argue about chores before doing anything.', 'Hide the chores so nobody can see them.'], answerIndex: 0, explanation: '家庭分工应考虑成员当时的能力和需要，并通过沟通完成必要任务。公平并不总是机械地平均分配，而是互相支持、共同承担。', point: 1 },
        { prompt: '—Could you help me carry these books? —______. Which reply accepts politely?', options: ['Sure. I can help you.', 'No, I am a book.', 'The books are yesterday.', 'I help you last week.'], answerIndex: 0, explanation: 'Sure. I can help you 是自然、礼貌的接受表达。其余选项语义或时态不合，未回应对方请求。', point: 1 },
      ] },
      { unit: 3, points: [['比较级结构', '用形容词比较级和 than 比较两个人或事物，注意规则变化及不规则形式。'], ['基于证据的比较', '比较时使用同一维度和可靠信息，不把局部差异扩大成整体判断。']], questions: [
        { prompt: 'Mia is 1.62 metres tall. Lily is 1.58 metres tall. Mia is ______ than Lily.', options: ['taller', 'tallest', 'more tall', 'as tall'], answerIndex: 0, explanation: '两人身高不同，句中有 than，应用比较级 taller。tall 的比较级直接加 -er；最高级 tallest 需要比较三者以上。', point: 0 },
        { prompt: 'Choose the correct comparison.', options: ['This road is wider than that one.', 'This road is more wide than that one.', 'This road is widest than that one.', 'This road wider that one.'], answerIndex: 0, explanation: 'wide 以不发音的 e 结尾，比较级直接加 r，构成 wider；than 引出比较对象。其他形式多加了 more、误用了最高级或漏掉 than。', point: 0 },
        { prompt: 'A survey shows that Kai reads 20 minutes a day and Bo reads 20 minutes a day. Which statement is supported?', options: ['They read for the same amount of time each day.', 'Kai reads more books than Bo.', 'Bo enjoys reading more than Kai.', 'One of them never reads.'], answerIndex: 0, explanation: '数据只比较每天阅读时长，两人都是20分钟，因此只能说时长相同。读了多少本、喜欢程度和是否阅读，都没有在数据中提供。', point: 1 },
        { prompt: 'Which sentence avoids an unfair conclusion?', options: ['Nora speaks more quietly than Ben in this recording.', 'Ben is worse than Nora at everything.', 'Nora is the best person because she is quieter.', 'A single test proves who is smarter in every subject.'], answerIndex: 0, explanation: 'A 只在“这段录音中的说话音量”这一明确维度上比较，结论范围与证据一致。把一次表现扩大为“各方面更差”或“最聪明”，都超出了证据。', point: 1 },
      ] },
      { unit: 4, points: [['植物和动物的特征', '用 can / cannot 描述生物能力或可观察特征，并结合语境辨析含义。'], ['生物与人的联系', '从具体用途、生态联系和依赖关系理解植物、动物与人类生活的联系。']], questions: [
        { prompt: 'Some plants ______ grow well in very dry places.', options: ['can', 'mustn’t', 'are', 'does'], answerIndex: 0, explanation: '句子说明某些植物具备在干燥环境中生长的能力，用 can grow。can 后接动词原形；are 和 does 都不能直接与 grow 组成这里所需的结构。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['A bee can carry pollen between flowers.', 'A bee cans carry pollen between flowers.', 'A bee can carries pollen between flowers.', 'A bee is can carry pollen between flowers.'], answerIndex: 0, explanation: 'can 是情态动词，不随主语变化，后面接动词原形 carry。句子描述传粉这一植物与动物之间的联系。', point: 0 },
        { prompt: 'Why can protecting pollinating insects also matter to people?', options: ['Some crops depend on pollination to produce fruit or seeds.', 'All food is made directly by insects.', 'Insects can replace every farm worker.', 'Pollination makes plants stop growing.'], answerIndex: 0, explanation: '一些作物需要传粉过程形成果实或种子，因此传粉昆虫与农业生产存在联系。不能推成所有食物都由昆虫制造，也不能认为昆虫能取代全部农业活动。', point: 1 },
        { prompt: 'A poster about a local animal should be based on which information?', options: ['Its real habitat, food and observable features.', 'A made-up story presented as scientific fact.', 'Only the animal’s colour, with no other details.', 'A claim that the animal is useful to every person in every way.'], answerIndex: 0, explanation: '科普海报应以可核实的栖息环境、食物和特征为依据，并选择与主题相关的信息。虚构故事可以用于文学创作，但不能冒充生物事实。', point: 1 },
      ] },
      { unit: 5, points: [['食谱步骤与祈使句', '用动词原形开头写操作步骤，并用 first / next / finally 等词标明顺序。'], ['食材与数量', '根据食材名词的可数性选择恰当量词，按步骤读懂简单食谱。']], questions: [
        { prompt: '______ the onions first, then add them to the pan.', options: ['Cut', 'Cuts', 'Cutting', 'To cuts'], answerIndex: 0, explanation: '食谱指令常用祈使句，以动词原形开头，因此用 Cut。步骤词 first 提示这是先进行的操作，不能把动词改成第三人称或动名词。', point: 0 },
        { prompt: 'We need two ______ and a little ______ for the recipe.', options: ['tomatoes; oil', 'tomato; oils', 'tomatoes; oils', 'tomato; oil'], answerIndex: 0, explanation: 'two 后接可数名词复数 tomatoes；a little 修饰不可数名词 oil。需要根据数量词判断名词形式，不能给不可数的食用油随意加复数。', point: 0 },
        { prompt: 'A recipe says, “Wash the vegetables. Next, cut them into small pieces. Finally, cook them.” What happens after washing?', options: ['The vegetables are cut into small pieces.', 'They are cooked before being washed.', 'The cook adds them to a dessert.', 'Nothing else happens.'], answerIndex: 0, explanation: 'Next 标记第二步：洗净后切成小块；Finally 才是烹饪。按顺序词还原步骤能避免把过程先后颠倒。', point: 1 },
        { prompt: 'What does a clear recipe need most?', options: ['Ingredients with amounts and steps in a workable order.', 'A list of ingredients with no instructions.', 'Steps such as “do something” without details.', 'Unrelated stories between every two actions.'], answerIndex: 0, explanation: '食谱既要告诉读者准备什么，也要说明大致用量和可执行的步骤顺序。缺少操作说明或使用含糊表达，读者就难以复现菜品。', point: 1 },
      ] },
      { unit: 6, points: [['计划表达与行动步骤', '用 be going to 表达已有打算，并把计划拆分为具体、可执行的步骤。'], ['问题解决与调整', '分析目标、时间和可用资源，根据实际进展调整计划。']], questions: [
        { prompt: 'Nina has bought paint and invited her team. She ______ a poster this afternoon.', options: ['is going to make', 'made', 'makes yesterday', 'has make'], answerIndex: 0, explanation: '已经准备材料并约好团队，说明这是事先安排的计划，用 be going to。主语 Nina 对应 is，后接动词原形 make。', point: 0 },
        { prompt: 'Choose a correct plan sentence.', options: ['We are going to review one unit each evening.', 'We going to review one unit each evening.', 'We are going review one unit each evening.', 'We are go to review one unit each evening.'], answerIndex: 0, explanation: 'be going to 的结构是 am / is / are + going to + 动词原形。主语 we 对应 are，后接 review；其余选项缺少 be 或误用了动词形式。', point: 0 },
        { prompt: 'A student has three assignments due on Friday. Which plan is most useful?', options: ['List each task, estimate the time and schedule work across the week.', 'Wait until Friday morning and guess what is unfinished.', 'Start all tasks at once without checking instructions.', 'Remove every break and sleep as little as possible.'], answerIndex: 0, explanation: '可执行的计划要先看清任务和截止日期，再估算时间并安排顺序；执行中还要检查进度。熬夜或同时启动所有任务，往往不利于专注和完成质量。', point: 1 },
        { prompt: 'The first study plan takes twice as long as expected. What should the student do?', options: ['Review the time estimates and adjust the remaining steps.', 'Keep the old plan without looking at the deadline.', 'Give up every subject immediately.', 'Hide the problem from the team.'], answerIndex: 0, explanation: '计划是帮助行动的工具，不是不能改变的承诺。发现时间估算不准时，应重新安排剩余任务并优先处理重要事项，同时留意截止时间。', point: 1 },
      ] },
      { unit: 7, points: [['将来预测表达', '用 will / may 等表达预测或可能性，结合上下文判断确定程度。'], ['未来准备与条件', '把预测与可采取的准备行动联系起来，不把预测误当作已发生事实。']], questions: [
        { prompt: 'I think more students ______ use digital dictionaries in the future.', options: ['will', 'did', 'are', 'were'], answerIndex: 0, explanation: 'in the future 表示将来，表达预测常用 will + 动词原形。did 和 were 指向过去，are 在这里缺少现在进行时所需的 -ing 形式。', point: 0 },
        { prompt: 'The sky is dark, but no rain has started. Which sentence shows possibility rather than certainty?', options: ['It may rain later.', 'It rained all day yesterday.', 'It rains every Monday.', 'It is raining now for sure.'], answerIndex: 0, explanation: 'may 表示“可能”，适合描述尚未发生、尚不能确定的天气。其他句子分别说过去事实、习惯或当前确定状态。', point: 0 },
        { prompt: 'A student predicts that a presentation file may not open at school. What is a sensible preparation?', options: ['Save a backup copy and check the file before class.', 'Delete the presentation now.', 'Assume every computer will work in exactly the same way.', 'Wait until the talk begins to check anything.'], answerIndex: 0, explanation: '预测有不确定性，准备备份并提前检查可以降低设备问题带来的影响。准备并不意味着断定文件一定会出错，而是针对可能风险做合理安排。', point: 1 },
        { prompt: 'Which statement keeps a prediction within the evidence?', options: ['The survey suggests that more students may choose the new club.', 'Every student will certainly join the club.', 'The club has already changed the whole school.', 'No one can ever know anything about the future.'], answerIndex: 0, explanation: 'suggests 和 may 都保留了预测的不确定性，且结论仍限于调查涉及的学生。把趋势说成“所有人一定会”属于过度推断。', point: 1 },
      ] },
      { unit: 8, points: [['交流与澄清', '用礼貌表达提出请求、确认信息或请对方重复，避免假装听懂。'], ['有效沟通策略', '通过倾听、复述和核对关键词减少误会，并根据场景选择合适方式。']], questions: [
        { prompt: 'You did not hear the room number. What is the most polite reply?', options: ['Could you say the room number again, please?', 'You are wrong, stop talking.', 'I know it, although I did not hear it.', 'The room number was yesterday.'], answerIndex: 0, explanation: 'Could you ... please? 是礼貌请求；明确说需要重复哪条信息，能帮助对方有效澄清。假装听懂会造成后续误会。', point: 0 },
        { prompt: 'Choose the correct sentence for checking information.', options: ['Do you mean the meeting starts at three?', 'You means the meeting starts at three?', 'Are you mean the meeting starts at three?', 'Does you mean the meeting starts at three?'], answerIndex: 0, explanation: '一般疑问句用助动词 do + 主语 + 动词原形 mean；主语 you 对应 do。问句是在核对听到的信息，不是直接指责对方。', point: 0 },
        { prompt: 'A classmate gives several instructions quickly. Which response best prevents a mistake?', options: ['Repeat the key steps in your own words and ask if they are right.', 'Nod without listening and begin immediately.', 'Change the steps without telling anyone.', 'Ask a different person to guess the instructions.'], answerIndex: 0, explanation: '用自己的话复述关键步骤并请对方确认，是有效的核对策略；它可以及早发现遗漏或理解偏差。点头本身并不能证明信息已被正确理解。', point: 1 },
        { prompt: 'Which message is best for a group project chat?', options: ['“I will finish the chart by 6 p.m. Please tell me if the labels need changing.”', '“Do everything.”', '“I sent something sometime.”', '“Nobody needs to know what I am doing.”'], answerIndex: 0, explanation: '清楚的信息交代了负责人、任务和时间，也邀请组员反馈。具体而礼貌的表达能让团队协调下一步，含糊命令或不告知进度则容易造成重复和遗漏。', point: 1 },
      ] },
    ],
  },

  {
    grade: '初二', volume: '下册',
    officialResource: 'https://www.pep.com.cn/zslth/yyptzy/czyy/8x/',
    directoryUrl: 'https://jx.panqjy.cn/catalog/list?book_id=3002344',
    units: [
      { unit: 1, points: [['休闲活动与兴趣', '用 enjoy / like 等表达个人爱好及常见活动，并区分活动与频率。'], ['兴趣与成长', '从具体例子说明兴趣如何带来技能、坚持或交流机会。']], questions: [
        { prompt: 'My sister enjoys ______ short stories in her free time.', options: ['reading', 'read', 'reads', 'to reading'], answerIndex: 0, explanation: 'enjoy 后通常接动名词，表示“喜欢做某事”，所以用 reading。不能直接接动词原形，也不能把 reads 的三单形式放在 enjoy 后。', point: 0 },
        { prompt: 'Which question asks about someone’s free-time habit?', options: ['What do you usually do after school?', 'Where were you born?', 'How much is this notebook?', 'What time did the shop close yesterday?'], answerIndex: 0, explanation: 'usually do after school 询问放学后的日常活动，符合休闲时间主题。其余分别问出生地点、价格和过去的关门时间。', point: 0 },
        { prompt: 'Sam joined a chess club, learned to plan ahead and made two friends. Which conclusion is best supported?', options: ['A hobby can develop skills and create chances to meet people.', 'Every hobby makes everyone a professional.', 'Chess is the only useful activity.', 'Sam no longer needs to study.'], answerIndex: 0, explanation: '例子明确给出计划能力和结交朋友两方面变化，因此能支持“兴趣可能促进技能和交流”。它不能推出人人都会成为专业选手或兴趣能替代学习。', point: 1 },
        { prompt: 'A student wants to try a new hobby but has little time. What is a practical first step?', options: ['Set a short regular time and see whether the activity fits.', 'Buy every piece of equipment before trying it.', 'Stop all other responsibilities immediately.', 'Decide that one missed day means failure.'], answerIndex: 0, explanation: '先安排短而稳定的体验时段，观察兴趣和时间是否合适，之后再调整，是成本较低的尝试方式。兴趣发展需要持续，但偶尔错过一天不代表无法继续。', point: 1 },
      ] },
      { unit: 2, points: [['健康建议与义务表达', '用 should 提建议，用 must / mustn’t 表达必要要求或禁止事项，并结合语境区分强弱。'], ['健康与安全判断', '识别问题情境，选择稳妥的一般建议；严重或持续不适应寻求成年人和专业人员帮助。']], questions: [
        { prompt: 'I have a sore throat. What is a reasonable general suggestion?', options: ['You should tell an adult and rest if you feel unwell.', 'You must take someone else’s medicine.', 'You should ignore every symptom.', 'You must play sports until you feel worse.'], answerIndex: 0, explanation: 'should 用来提出一般建议；告诉成年人并根据情况休息是稳妥的做法。不能自行服用他人药物，也不应把题目当成诊断或忽视持续、严重症状的理由。', point: 0 },
        { prompt: 'At the swimming pool, the sign says “______ run.”', options: ['Don’t', 'Doesn’t', 'Aren’t', 'Not to'], answerIndex: 0, explanation: '祈使句的否定形式用 Don’t + 动词原形，因此是 Don’t run。安全标识直接、简洁地说明禁止行为。', point: 0 },
        { prompt: 'A student feels dizzy during exercise. What should the student do first?', options: ['Stop, move to a safe place and tell a responsible adult.', 'Keep running to finish the target.', 'Hide the symptom from everyone.', 'Drink an unknown substance offered by a stranger.'], answerIndex: 0, explanation: '感到头晕时继续运动可能增加风险，应先停止并告知负责的成年人，必要时寻求专业帮助。题目考查安全应对，不要求学生自行判断病因。', point: 1 },
        { prompt: 'Which sentence correctly gives advice?', options: ['You should drink enough water during a hot day.', 'You should to drink enough water during a hot day.', 'You should drinks enough water during a hot day.', 'You are should drink enough water during a hot day.'], answerIndex: 0, explanation: 'should 是情态动词，后接动词原形 drink，不加 to 或 -s。句意是一般性的建议，而不是绝对保证某种行为能解决所有健康问题。', point: 0 },
      ] },
      { unit: 3, points: [['情绪表达与原因', '使用 make + 宾语 + 形容词等结构描述感受，并用 because 说明原因。'], ['积极应对问题', '识别情绪触发情境，选择沟通、休息或求助等合适策略。']], questions: [
        { prompt: 'The loud noise made the baby ______.', options: ['unhappy', 'unhappily', 'to unhappy', 'was unhappy'], answerIndex: 0, explanation: 'make + 宾语 + 形容词表示“使某人处于某种状态”，所以用 unhappy。make 在此结构中后接形容词作宾语补足语，不用副词或再加 was。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['I felt upset because I lost my notes.', 'I felt upset so I lost my notes because.', 'I feel upset yesterday because I lose my notes.', 'Because I lost my notes so I felt upset because.'], answerIndex: 0, explanation: 'because 引出原因，句子用 felt 和 lost 叙述过去发生的事。英语通常不在同一简单因果结构中重复使用 because 和 so 来连接同一组分句。', point: 0 },
        { prompt: 'A student is upset after making a mistake in a presentation. Which response may help the student stay positive?', options: ['Notice what went wrong, practise one part and ask for feedback.', 'Decide that one mistake proves nothing can improve.', 'Avoid every future presentation.', 'Blame the audience without reviewing the talk.'], answerIndex: 0, explanation: '把失误拆成可以练习的具体部分，并寻求反馈，能把情绪转为下一步行动。一次错误能提供改进信息，但不足以证明一个人永远做不好。', point: 1 },
        { prompt: 'Which reply shows empathy and invites a useful conversation?', options: ['“That sounds difficult. Would you like to tell me what happened?”', '“Your feelings are silly.”', '“I know everything, so be quiet.”', '“You must feel exactly like I do.”'], answerIndex: 0, explanation: '先承认对方的感受，再询问是否愿意讲述，既表达关心也尊重对方选择。替对方断定感受或嘲笑感受，可能让沟通更困难。', point: 1 },
      ] },
      { unit: 4, points: [['自然奇观的描述', '用形容词、比较表达和事实信息描述自然现象，明确比较对象与尺度。'], ['探索自然的理由', '从观察、测量和证据中形成解释，区分可观察事实与个人猜测。']], questions: [
        { prompt: 'Which sentence describes a natural feature correctly?', options: ['The waterfall is higher than the bridge.', 'The waterfall is high than the bridge.', 'The waterfall is highest than the bridge.', 'The waterfall higher the bridge.'], answerIndex: 0, explanation: 'high 的比较级为 higher，比较两者时用 higher than。最高级不能与 than 这样搭配，且比较结构需要完整的 be 动词和 than。', point: 0 },
        { prompt: 'Scientists want to compare how fast two seeds grow. Which method is fairest?', options: ['Use the same amount of water, light and time, then measure both.', 'Give one seed more sunlight and compare their colours.', 'Measure one seed today and the other next month.', 'Choose whichever result looks more surprising.'], answerIndex: 0, explanation: '公平比较要尽量控制水、光照和时间等条件，只观察想研究的差异，并用相同方法测量。改变多个条件或测量时点不同，就难以判断差异来自什么。', point: 1 },
        { prompt: 'The word “explore” in “Why do we explore nature?” is closest in meaning to ______.', options: ['study and learn about', 'hide from', 'damage on purpose', 'forget completely'], answerIndex: 0, explanation: 'explore 在自然主题中指观察、研究并了解未知或不熟悉的事物。它不是故意破坏，也不只是躲避或遗忘。', point: 0 },
        { prompt: 'A photograph shows a mountain after heavy rain. Which claim needs more evidence?', options: ['The mountain looks wet in this photograph.', 'Rain fell before the photograph was taken.', 'The rain caused every landslide in the region this year.', 'Clouds appear above the mountain.'], answerIndex: 2, explanation: '照片可以支持画面中可见的湿润地面和云层，但无法证明这一场雨造成区域全年所有滑坡。原因判断需要时间、地点和多项证据，而不是把相关现象直接当成唯一因果。', point: 1 },
      ] },
      { unit: 5, points: [['灾害与安全指令', '理解灾害发生前、发生时和发生后的行动顺序，并用清晰的祈使句表达步骤。'], ['风险准备', '根据官方预警和安全指引准备必要物品，不传播未经核实的灾情信息。']], questions: [
        { prompt: 'A storm warning says to stay indoors. Which instruction is clearest?', options: ['Stay away from windows and follow local safety information.', 'Go outside to take a closer photo.', 'Use the lift during a power cut.', 'Ignore all warnings until the storm ends.'], answerIndex: 0, explanation: '警报要求留在室内，应远离可能受损的窗户并关注当地权威信息。题目考查安全指令理解；实际行动还需服从当地应急部门的具体要求。', point: 0 },
        { prompt: 'Choose the correct warning sentence.', options: ['Don’t use the lift during a power cut.', 'Doesn’t use the lift during a power cut.', 'Not use the lift during a power cut.', 'You don’t to use the lift during a power cut.'], answerIndex: 0, explanation: '否定祈使句用 Don’t + 动词原形，语气简短明确，适合安全提示。其余结构缺少正确的祈使句形式。', point: 0 },
        { prompt: 'A family is preparing for a possible power outage. What is the most useful plan?', options: ['Prepare a torch, charged phone and necessary supplies, then check local guidance.', 'Use candles beside curtains and leave them unattended.', 'Wait until the lights go out to look for everything.', 'Share an unverified evacuation message as fact.'], answerIndex: 0, explanation: '手电、保持通信设备可用和必要物资能帮助应对停电；是否撤离应按当地权威通知执行。明火无人看管和转发未经核实消息都会增加风险。', point: 1 },
        { prompt: 'Why should people check where an emergency message came from?', options: ['False information can lead people to take unsafe actions.', 'Every message online is always correct.', 'The source never changes the meaning.', 'Checking a source makes a warning disappear.'], answerIndex: 0, explanation: '灾害信息可能影响路线、物资和安全决定，所以要核对发布者、时间和地点。转发前查证可以减少谣言造成的恐慌或错误行动。', point: 1 },
      ] },
      { unit: 6, points: [['文化差异与礼貌表达', '根据交际场景选择礼貌表达，理解不同文化习惯可能存在差异。'], ['尊重与沟通', '先询问、倾听和核实，不用单个例子概括整个国家或群体。']], questions: [
        { prompt: 'You are unsure whether to remove your shoes in a host’s home. What is a respectful question?', options: ['Would you like me to take my shoes off?', 'Everyone in your country does the same thing.', 'Your home is wrong.', 'I will decide what your custom is.'], answerIndex: 0, explanation: '礼貌询问主人偏好能避免凭猜测行事，也尊重对方家庭习惯。其余表达带有绝对化判断或冒犯语气。', point: 0 },
        { prompt: 'Choose the polite request.', options: ['Could you explain that custom to me, please?', 'Explain it now; your custom is strange.', 'You must have the same custom as I do.', 'Why are all people there identical?'], answerIndex: 0, explanation: 'Could you ... please? 语气礼貌，并把对方视为了解自己习俗的交流伙伴。对文化习惯的提问应避免嘲讽或把群体成员说成完全相同。', point: 0 },
        { prompt: 'A student meets one person from another country. What conclusion is safest?', options: ['This person has one individual experience; it may not describe everyone.', 'One person proves that every citizen behaves the same way.', 'People from different cultures cannot be friends.', 'The student should stop asking respectful questions.'], answerIndex: 0, explanation: '单个人的经历不能代表整个国家或文化群体。跨文化理解要结合多种信息，并允许个人差异存在，而不是用刻板印象替代了解。', point: 1 },
        { prompt: 'Two classmates misunderstand a greeting. What is the best next step?', options: ['Ask what the greeting means and explain how each person understood it.', 'Laugh at the other person and end the conversation.', 'Assume bad intentions without asking.', 'Tell the whole class that one culture is rude.'], answerIndex: 0, explanation: '询问表达的含义并说明各自理解，有助于区分语言差异与真实意图。没有核实前就断定对方恶意或给文化贴标签，会把误会扩大。', point: 1 },
      ] },
      { unit: 7, points: [['阅读经历与时态', '用现在完成时询问或描述阅读经历，谈到具体时间时用一般过去时补充事实。'], ['主题与证据理解', '依据人物、情节和文本线索解释作品内容，不凭书名臆断主题。']], questions: [
        { prompt: '—Have you ever read this book? —Yes, I ______ it last month.', options: ['read', 'have read', 'reads', 'am reading'], answerIndex: 0, explanation: '问句用现在完成时询问经历；回答补充 last month 这一过去的具体时间，应使用一般过去时。read 的过去式拼写不变，但读音和语法功能不同。', point: 0 },
        { prompt: 'Which sentence asks about life experience?', options: ['Have you ever visited a book fair?', 'Did you visit the book fair at 2 p.m. yesterday?', 'Are you visiting the book fair now?', 'Will you visit the book fair tomorrow?'], answerIndex: 0, explanation: 'Have you ever + 过去分词常用于询问截至目前是否有过某种经历。其余分别询问过去的具体时间、当前动作或将来安排。', point: 0 },
        { prompt: 'A story shows a character apologising after hurting a friend and then changing their behaviour. What theme is best supported?', options: ['Taking responsibility can help repair a relationship.', 'An apology means the past never happened.', 'Friends should never talk about problems.', 'Changing behaviour is always impossible.'], answerIndex: 0, explanation: '人物不仅道歉，还改变行为，因此文本支持承担责任、修复关系这一主题。应把主题建立在情节证据上，避免把寓意夸大成“过去从未发生”。', point: 1 },
        { prompt: 'A review says, “The ending surprised me because the narrator had hidden an important clue.” Which detail explains the reviewer’s reaction?', options: ['The narrator hid a clue before the ending.', 'The book has a blue cover.', 'The review was written on Tuesday.', 'The shop sells many other books.'], answerIndex: 0, explanation: 'because 后面直接给出惊讶的原因：叙述者先前隐藏了重要线索。封面、写作日期和书店信息都与这种阅读反应没有直接因果联系。', point: 1 },
      ] },
      { unit: 8, points: [['助人表达与动词结构', '掌握 help sb. (to) do 等常见表达，并用清楚的语言说明帮助内容。'], ['影响与合作', '从具体行动及其结果理解助人如何带来改变，并重视合作与实际需要。']], questions: [
        { prompt: 'Our class can help the shelter ______ food for the animals.', options: ['collect', 'collects', 'collecting', 'collected'], answerIndex: 0, explanation: 'help sb. do sth. 后接动词原形，也可以说 help sb. to do sth.；本句空格直接接 collect。', point: 0 },
        { prompt: 'Which sentence explains the purpose of an action?', options: ['We made a sign to help visitors find the donation box.', 'We made a sign yesterday at noon blue.', 'We are help visitors the donation box.', 'We helped because the sign is a box.'], answerIndex: 0, explanation: 'to help 表示制作指示牌的目的，结构是 to + 动词原形。句子也交代了具体行动和帮助对象，因此意思完整。', point: 0 },
        { prompt: 'A volunteer centre receives many donated books but few readers know about it. Which action addresses the problem directly?', options: ['Make a clear notice that tells people where and when they can visit.', 'Collect more books without telling anyone.', 'Hide the opening hours.', 'Stop asking readers what they need.'], answerIndex: 0, explanation: '问题是潜在读者不知道中心，清楚告知地点和开放时间能直接改善信息获取。继续堆积书本没有解决“读者找不到”的原因。', point: 1 },
        { prompt: 'How can a group check whether its helping project made a difference?', options: ['Compare the original need with what changed and ask the people involved.', 'Count only how many posters the group printed.', 'Assume good intentions guarantee success.', 'Ignore feedback after the project ends.'], answerIndex: 0, explanation: '项目成效要看实际需要是否得到改善，并听取受帮助者或参与者的反馈。活动数量和善意不能单独证明结果有效，复盘还能帮助下一次改进。', point: 1 },
      ] },
    ],
  },
  {
    grade: '初三', volume: '上册',
    officialResource: 'https://www.pep.com.cn/zslth/yyptzy/czyy/9s/',
    directoryUrl: 'https://jx.panqjy.cn/catalog/list?book_id=3002345',
    units: [
      { unit: 1, points: [['变化与现在完成时', '用现在完成时概括从过去延续到现在或对现在有影响的变化。'], ['趋势与证据', '用具体事实比较变化前后，避免把局部例子夸大为普遍结论。']], questions: [
        { prompt: 'Our town ______ a new library, so students have a quiet place to read.', options: ['has built', 'build', 'is build', 'will built'], answerIndex: 0, explanation: '新图书馆已经建成并对现在有影响，适合用现在完成时 has built；主语 our town 是第三人称单数。其余选项的时态或动词形式不正确。', point: 0 },
        { prompt: 'Choose the correct sentence about a change continuing to now.', options: ['People have used this bridge for many years.', 'People use this bridge for many years ago.', 'People are use this bridge since 2010.', 'People used this bridge since now.'], answerIndex: 0, explanation: 'for many years 表示一段持续时间，且桥至今仍在使用，因此现在完成时 have used 合适。一般过去时通常对应已经结束的过去时间，不能与这里的持续语境混用。', point: 0 },
        { prompt: 'A report says the number of library visitors rose after longer opening hours were introduced. Which conclusion is safest?', options: ['The report shows a rise after the change, but more evidence may be needed to prove the change caused it.', 'Longer opening hours always cause every library to become popular.', 'The report proves that all residents read more books.', 'Visitor numbers cannot be measured.'], answerIndex: 0, explanation: '数据呈现了先后变化，但要证明因果还要排除其他因素并看方法是否可靠。把一次观察推广到所有图书馆或所有居民，超出了题干证据。', point: 1 },
        { prompt: 'Which question best compares change over time?', options: ['What was the service like before, and what is it like now?', 'Which colour do you like most?', 'Who has the longest name?', 'How many letters are in “change”?'], answerIndex: 0, explanation: '比较变化需要明确前后两个时间点，并使用同一指标观察差异。其余问题并未收集变化前后的可比信息。', point: 1 },
      ] },
      { unit: 2, points: [['榜样人物与定语从句', '用 who / that 等从句补充人物信息，确保关系代词指向清楚。'], ['人物品质与证据', '从人物持续行动和具体事例归纳品质，而非只依据名气或一句评价。']], questions: [
        { prompt: 'A role model is someone ______ keeps learning after making a mistake.', options: ['who', 'where', 'when', 'what time'], answerIndex: 0, explanation: '先行词 someone 指人，定语从句中作主语，使用 who。where 和 when 分别指地点、时间，不能代替人的主语。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['The scientist who helped our school gave a talk.', 'The scientist which helped our school gave a talk.', 'The scientist who helped our school give a talk.', 'The scientist helped who our school gave a talk.'], answerIndex: 0, explanation: 'who 指代人，并在从句中作主语；主句谓语 gave 与主语 the scientist 对应。which 通常指物，其他选项从句结构不完整。', point: 0 },
        { prompt: 'A student is called a role model because she checks sources before sharing news and corrects her own mistakes. Which quality is best supported?', options: ['Responsibility and honesty.', 'Fame without evidence.', 'Speed at repeating rumours.', 'Refusal to learn.'], answerIndex: 0, explanation: '核实来源和承认改正错误都体现对信息与行动负责。判断人物品质要指向具体行为，不应仅凭称号或外在名气下结论。', point: 1 },
        { prompt: 'Which sentence best describes how to learn from an inspiring person?', options: ['Identify a specific action and consider how to practise a similar habit.', 'Copy every decision without considering the situation.', 'Remember only the person’s name.', 'Assume an admired person never makes mistakes.'], answerIndex: 0, explanation: '学习榜样重在理解行为背后的方法，并结合自身情况付诸行动。机械照搬所有决定或认为榜样从不犯错，都没有真正分析经历和条件。', point: 1 },
      ] },
      { unit: 3, points: [['学习策略与情态表达', '用 can / should 等表达能力和建议，并以清楚的行动说明策略。'], ['学习方法与反思', '根据任务目标选择复习、提问、练习和反馈等策略，用结果检查效果。']], questions: [
        { prompt: 'You want to remember new words. Which sentence gives a useful suggestion?', options: ['You should review them again after a short break.', 'You should to review them once and never check again.', 'You can remembers every word without practice.', 'You must forget the words before the test.'], answerIndex: 0, explanation: 'should 后接动词原形 review，表达建议；间隔后再次提取和复习能让学生检查是否真正记住。只看一遍并永不回顾，无法检验记忆效果。', point: 0 },
        { prompt: 'Choose the correct question about learning ability.', options: ['Can you explain how you solved the problem?', 'Do you can explain the problem?', 'Can you explains the problem?', 'Are you can explain the problem?'], answerIndex: 0, explanation: 'Can 放在主语前构成一般疑问句，后接主语和动词原形 explain。情态动词 can 本身承担助动功能，不再加 do 或 be。', point: 0 },
        { prompt: 'A learner gets many answers wrong on a practice set. What is the most useful next step?', options: ['Group the errors by reason, relearn the weak idea and try a new question.', 'Memorise the answer letters without reading explanations.', 'Repeat the same guesses faster.', 'Hide every wrong answer.'], answerIndex: 0, explanation: '错题先分类能帮助区分概念不清、计算失误和读题偏差，再针对薄弱点学习并用新题检验。只背选项字母没有建立可迁移的知识。', point: 1 },
        { prompt: 'How can a student tell whether a study method is working?', options: ['Check whether they can explain and use the idea on a new example.', 'Count only the minutes spent looking at a page.', 'Assume confidence always means mastery.', 'Avoid trying any questions.'], answerIndex: 0, explanation: '能用自己的话解释并在新情境中应用，比单纯看书时长更能检验理解。熟悉感和自信有时来自重复阅读，并不总能证明可以独立解决问题。', point: 1 },
      ] },
      { unit: 4, points: [['记忆与间接疑问句', '间接疑问句中保留疑问词，但从句使用陈述语序。'], ['记忆信息与线索', '用地点、时间和动作线索帮助回忆，并区分确定信息与不确定猜测。']], questions: [
        { prompt: 'Choose the correct indirect question.', options: ['Do you remember where you put the notebook?', 'Do you remember where did you put the notebook?', 'Do you remember where you puts the notebook?', 'Do you remember where are you put the notebook?'], answerIndex: 0, explanation: 'where 引导的间接疑问句使用陈述语序：where + 主语 + 谓语，即 where you put。疑问词并不会让从句倒装；外层的一般疑问句由 Do you remember 构成。', point: 0 },
        { prompt: 'Which sentence is grammatically correct?', options: ['I don’t know when the meeting begins.', 'I don’t know when does the meeting begin.', 'I don’t know when begins the meeting.', 'I don’t know when the meeting begin.'], answerIndex: 0, explanation: 'when 引导宾语从句时按陈述语序排列，主语 the meeting 在谓语 begins 前；第三人称单数主语的 begin 要加 -s。', point: 0 },
        { prompt: 'You cannot remember whether you turned off the classroom light. What should you do?', options: ['Check safely or ask the responsible person instead of claiming certainty.', 'Say “I definitely did” without checking.', 'Blame another student at once.', 'Ignore the question and spread a guess.'], answerIndex: 0, explanation: '记忆不确定时，应标明不确定并寻找可靠线索，例如安全检查或询问负责人。把猜测说成确定事实，会造成错误信息和责任归属问题。', point: 1 },
        { prompt: 'A classmate remembers an event differently from you. Which response is most reasonable?', options: ['Compare notes or other clues and allow that memory may be incomplete.', 'Insist that one person must be lying.', 'Change the notes so they match your memory.', 'Stop looking for any evidence.'], answerIndex: 0, explanation: '人的记忆可能遗漏细节，核对笔记、时间记录等外部线索有助于还原事实。不同记忆并不自动证明有人故意说谎，应先区分记忆差异与证据。', point: 1 },
      ] },
      { unit: 5, points: [['创意与条件句', '用 if 条件句描述条件和可能结果，注意条件从句与主句的动词时态。'], ['创意方案评估', '根据问题、目标和测试结果改进想法，不把新奇本身等同于有效。']], questions: [
        { prompt: 'If we ______ the idea with users, we will learn what needs to change.', options: ['test', 'will test', 'tested yesterday', 'are test'], answerIndex: 0, explanation: '表示真实可能条件的 if 从句通常用一般现在时，主句用 will + 动词原形，所以是 If we test ..., we will learn ...。不在 if 从句中机械重复 will。', point: 0 },
        { prompt: 'Choose the correct sentence.', options: ['If the first plan does not work, we will try another one.', 'If the first plan will not work, we try another one yesterday.', 'If the first plan not work, we will tried another one.', 'If does the first plan work, we will try another one.'], answerIndex: 0, explanation: 'if 从句用一般现在时 does not work，主句用 will try。条件句先说明可能出现的情况，再说明相应行动，动词形式要分别符合从句和主句结构。', point: 0 },
        { prompt: 'A team invents a bottle holder. Which test best checks whether the idea solves the problem?', options: ['Ask users to carry it during a normal walk and record what works or fails.', 'Choose the design only because it looks unusual.', 'Test it once while empty and claim it works for every load.', 'Avoid collecting feedback.'], answerIndex: 0, explanation: '测试应尽量贴近真实使用情境，记录优点和失效条件，再据此改进。外观新奇、单次空载测试，都不足以证明方案解决了实际问题。', point: 1 },
        { prompt: 'Which feedback is most useful for improving an idea?', options: ['“The clip opens when the bag is full; can it be tested with a stronger fastener?”', '“It is bad.”', '“It is perfect because my friend made it.”', '“Change something, but I will not say what.”'], answerIndex: 0, explanation: '具体反馈指出了使用情境、出现的问题和可检验的改进方向，便于团队进行下一轮测试。笼统评价或只因关系而赞扬，无法说明怎样改进。', point: 1 },
      ] },
      { unit: 6, points: [['太空主题与被动语态', '在重点突出对象或过程时识别 be + 过去分词结构，并核对主语与 be 的一致。'], ['科学信息与证据', '区分观测到的事实、科学解释和仍待验证的猜想。']], questions: [
        { prompt: 'Choose the correct sentence.', options: ['The Moon is observed by telescopes from Earth.', 'The Moon observed by telescopes from Earth.', 'The Moon is observe by telescopes from Earth.', 'The Moon are observed by telescopes from Earth.'], answerIndex: 0, explanation: '被动语态结构为 be + 过去分词；主语 the Moon 是单数，用 is，observe 的过去分词是 observed。by 短语说明实施观察的工具或主体。', point: 0 },
        { prompt: 'Complete the sentence: Many stars ______ in the night sky with a telescope.', options: ['can be seen', 'can see', 'is seeing', 'can saw'], answerIndex: 0, explanation: '句子强调星星“被看见”，用情态动词后的被动结构 can be + 过去分词，see 的过去分词是 seen。stars 为复数，但 can 后的 be 不随主语变化。', point: 0 },
        { prompt: 'A bright dot moves across a video of the sky. What is the best first response?', options: ['Collect the time, direction and other observations before deciding what it is.', 'Immediately announce that it is an alien spacecraft.', 'Delete observations that do not fit a guess.', 'Assume every bright dot is the same object.'], answerIndex: 0, explanation: '单段视频的信息有限，先记录时间、方向等可核查观察，再与可靠资料比较，才有条件提出解释。直接下结论或删去反例都不是科学的证据处理方法。', point: 1 },
        { prompt: 'Which statement separates evidence from a guess?', options: ['“The image shows a moving light; its exact source has not been confirmed.”', '“I have a guess, so it is a proven fact.”', '“The light must be an alien because it is bright.”', '“No observation is worth checking.”'], answerIndex: 0, explanation: '前半句描述图像可见信息，后半句说明来源仍未确认，清楚区分了观察与推断。亮度本身不能证明光源是什么，需要更多证据。', point: 1 },
      ] },
      { unit: 7, points: [['音乐主题词汇与感受', '用 rhythm、beat、melody 等词描述音乐特征，并根据语境选择恰当形容词。'], ['表达观点与依据', '将个人感受与可观察的节奏、音量或旋律线索联系起来。']], questions: [
        { prompt: 'A song has a strong, regular beat. Which description fits best?', options: ['The rhythm is easy to follow.', 'The song has no sound at all.', 'The melody is a kind of furniture.', 'The beat means the singer is late.'], answerIndex: 0, explanation: 'beat 指节拍，rhythm 指节奏；规律而明显的节拍通常更容易跟随。其他选项把音乐词汇与无关事物混为一谈。', point: 0 },
        { prompt: 'The music becomes softer near the end. Which sentence describes the change?', options: ['The music gets quieter near the end.', 'The music gets more quiet near the end.', 'The music gets quietest than before.', 'The music is quietly near the end.'], answerIndex: 0, explanation: 'quiet 的比较级是 quieter，gets quieter 表示声音逐渐变小。此处是在比较前后变化，不用最高级，也不把副词 quietly 放在系动词后作表语。', point: 0 },
        { prompt: 'Two students disagree about a piece of music. Which response keeps the discussion respectful?', options: ['“I hear a slower beat, so it feels calm to me. What do you notice?”', '“Only my opinion is allowed.”', '“Your taste proves you know nothing.”', '“We must all feel exactly the same.”'], answerIndex: 0, explanation: '说出自己听到的线索和感受，并邀请对方补充，可以解释观点而不否定他人。音乐感受有主观成分，但仍能用节奏、音量等听觉线索交流。', point: 1 },
        { prompt: 'A student writes, “I like the song because the melody rises slowly and the beat is gentle.” What supports the opinion?', options: ['Specific features of the music.', 'The number of pages in the textbook.', 'A guess about the singer’s private life.', 'The colour of the classroom wall.'], answerIndex: 0, explanation: '旋律上行和节拍柔和都是与音乐本身有关的具体特征，能说明听者为何喜欢。无关细节或对私人生活的猜测不能支撑对歌曲的评价。', point: 1 },
      ] },
      { unit: 8, points: [['比赛经历与现在完成时', '用现在完成时表达经历或成就；补充具体过去时间时改用一般过去时。'], ['团队合作与体育精神', '依据比赛中的行动评价合作、公平和坚持，不把胜负当作唯一价值。']], questions: [
        { prompt: '—Has your team ever won a school game? —Yes, it ______ one last month.', options: ['won', 'has won', 'wins', 'is winning'], answerIndex: 0, explanation: '问句用现在完成时问经历；回答给出 last month 这一具体过去时间，应使用一般过去时 won。win 的过去式和过去分词拼写相同，但时态取决于时间状语。', point: 0 },
        { prompt: 'Choose the correct sentence about experience.', options: ['I have played in three school matches.', 'I have play in three school matches.', 'I played in three matches since now.', 'I am played in three school matches.'], answerIndex: 0, explanation: '现在完成时结构为 have/has + 过去分词，play 的过去分词是 played。句子未给出已结束的具体过去时间，因此用来概括截至目前的经历。', point: 0 },
        { prompt: 'A player notices an opponent has fallen and pauses the game to help. What does this action show?', options: ['Fair play and respect for others.', 'That winning is the only goal.', 'That rules should be ignored.', 'That teamwork is impossible.'], answerIndex: 0, explanation: '暂停比赛帮助倒地对手体现尊重和公平竞赛精神。体育学习不仅看分数，也关注遵守规则、合作和对他人的态度。', point: 1 },
        { prompt: 'A young player wants to improve a weak pass. Which plan is most useful?', options: ['Practise the pass, ask a coach for feedback and check progress later.', 'Avoid passing whenever a game begins.', 'Say that practice never changes skill.', 'Blame teammates without reviewing the play.'], answerIndex: 0, explanation: '有针对性的练习、及时反馈和再次检查，能让球员知道动作是否改进。体育精神既包括尊重他人，也包括面对不足、持续学习；单纯回避或归咎他人无法解决技能问题。', point: 1 },
      ] },
    ],
  },

)

export const currentTextbookGapSets: PracticeSet[] = [
  ...englishVolumes.flatMap((book) => book.units.map((unit) => makeEnglishSet(book, unit))),
  makeGeographySet(),
]
