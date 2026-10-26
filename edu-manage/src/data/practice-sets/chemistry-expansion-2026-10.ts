import type { PracticeQuestion, PracticeSet } from '../parent-practice-bank'

const chemistryCatalogDirectory = 'https://jx.panqjy.cn/catalog/list?stage_id=2&subject_id=7'
const chemistryQuestionSource = '牧哲学堂原创拓展题/2026-10/化学/九年级上册/第三单元/课题2原子结构'

export const chemistryExpansionSets202610: PracticeSet[] = [
  {
    id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10',
    grade: '初三',
    subject: '化学',
    volume: '上册',
    chapter: '第三单元 物质构成的奥秘',
    section: '课题2 原子结构',
    edition: '人教版 · 2026 秋学年版',
    sourceNote: `牧哲学堂原创拓展题，按人教版九年级上册目录定位；题目围绕原子中微粒数关系、离子形成和核外电子排布设计。教材目录：${chemistryCatalogDirectory}`,
    catalogEvidence: {
      kind: 'public_directory_url',
      ref: chemistryCatalogDirectory,
      locator: '第三单元 物质构成的奥秘 / 课题2 原子结构',
    },
    knowledgePoints: [
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp1',
        title: '原子中的质子、中子和电子',
        content: '原子核由带正电的质子和不带电的中子构成，核外电子带负电。原子不显电性，所以中性原子的质子数等于核外电子数；质量数可用质子数与中子数之和表示。',
      },
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp2',
        title: '离子的形成与电荷',
        content: '原子得失电子后形成离子。失去电子形成带正电的阳离子，得到电子形成带负电的阴离子；形成离子时质子数不变，电子数改变，电荷数等于质子数与电子数之差。',
      },
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp3',
        title: '核外电子分层排布',
        content: '核外电子在不同电子层上排布。对初中常见前几种元素，可按由内向外的顺序理解排布，例如硫原子有16个电子，排布为2、8、6。',
      },
    ],
    questions: [
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q1',
        type: 'single_choice',
        knowledgePointId: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp1',
        prompt: '一个中性铝原子的原子核内有13个质子和14个中子。这个铝原子核外有多少个电子？',
        options: ['13个。', '14个。', '27个。', '0个。'],
        answerIndex: 0,
        explanation: '中性原子整体不带电，核内每个质子带一个单位正电，核外每个电子带一个单位负电，因此质子数等于电子数。该铝原子有13个质子，所以有13个电子。14是中子数，质子数与中子数之和27可表示质量数，二者都不是电子数。',
        difficulty: '基础',
        sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q1`,
      },
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q2',
        type: 'single_choice',
        knowledgePointId: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp2',
        prompt: '氯原子的核电荷数为17。它得到1个电子形成氯离子后，氯离子的质子数和电子数分别是多少？',
        options: ['17个质子、18个电子。', '18个质子、17个电子。', '17个质子、16个电子。', '16个质子、17个电子。'],
        answerIndex: 0,
        explanation: '核电荷数等于质子数，氯原子的质子数为17。原子得电子形成阴离子，但原子核没有改变，因此质子数仍为17；得到1个带负电的电子后，电子数由中性原子的17增加到18，净电荷为−1。得失电子不会把质子数也改变。',
        difficulty: '基础',
        sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q2`,
      },
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q3',
        type: 'single_choice',
        knowledgePointId: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp1',
        prompt: '钠元素有两种原子：钠-23的原子核内有11个质子，钠-24的原子核内也有11个质子。与钠-23相比，钠-24的原子核内多几个中子？',
        options: ['1个。', '11个。', '12个。', '23个。'],
        answerIndex: 0,
        explanation: '元素种类由质子数决定，两种钠原子的质子数都为11。钠-23和钠-24中的数字分别表示质量数，质量数等于质子数与中子数之和，所以两者的中子数分别为23−11=12和24−11=13。钠-24比钠-23多1个中子；不要把质量数直接当成中子数。',
        difficulty: '提升',
        sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q3`,
      },
      {
        id: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q4',
        type: 'single_choice',
        knowledgePointId: 'chemistry-9a-3-2-atomic-structure-expansion-2026-10-kp3',
        prompt: '硫原子的核电荷数为16，且硫原子呈电中性。按照由内向外的电子层顺序，它的核外电子排布是',
        options: ['2、8、6。', '2、6、8。', '8、8。', '2、8、8。'],
        answerIndex: 0,
        explanation: '硫原子核电荷数为16，表示核内有16个质子；原子中质子数等于电子数，因此核外共有16个电子。由内向外排布时，第一层先排2个，第二层排8个，剩下16−2−8=6个排在第三层，故为2、8、6。2、8、8合计18个电子，与硫原子的电子总数不符。',
        difficulty: '提升',
        sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q4`,
      },
    ],
  },
]

export const chemistryExplanationRevisions202610: Record<string, Partial<PracticeQuestion>> = {
  'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q1': {
    type: 'fill_blank',
    prompt: '铝原子的质子数为 13，质量数为 27。该原子形成 Al³⁺ 后，质子数为 ____，中子数为 ____，电子数为 ____。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '13；14；10',
    acceptedAnswers: ['13, 14, 10', '13、14、10', '13；14；10'],
    gradingMode: 'exact',
    explanation: '质子数为13；中子数=质量数−质子数=27−13=14。形成 Al³⁺ 是失去3个电子，原子核不变，电子数从中性铝原子的13变成10。',
    difficulty: '提升',
    sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q1`,
  },
  'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q2': {
    type: 'short_answer',
    prompt: '氯原子的核电荷数为17。它形成 Cl⁻ 后，原子核没有变化。请说明电子数怎样变化、离子带什么电，并说明原因。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '氯原子得到1个电子，电子数由17变为18；质子数仍为17，电子比质子多1个，所以 Cl⁻ 带一个单位负电荷。',
    gradingMode: 'self_check',
    explanation: '完整作答需包含“得到1个电子”“质子数不变为17”“电子数为18”“因电子比质子多1个而带负电”这几层关系。离子形成改变的是核外电子数，不是原子核中的质子数。',
    difficulty: '提升',
    sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q2`,
  },
  'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q3': {
    type: 'single_choice',
    prompt: '某微粒记录表如下：甲含 11 个质子、12 个中子；乙含 11 个质子、13 个中子；丙含 12 个质子、12 个中子。哪一判断正确？',
    options: ['甲和乙属于同一种元素的不同原子。', '甲和丙属于同一种元素，因为中子数相同。', '乙和丙的质子数相同。', '甲、乙、丙都属于同一种元素。'],
    answerIndex: 0,
    explanation: '元素种类由质子数决定。甲、乙的质子数同为11，属于钠元素，但中子数不同；丙的质子数为12，属于另一种元素。判断元素种类不能看中子数或质量数。',
    difficulty: '提升',
    sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q3`,
  },
  'chemistry-9a-3-2-atomic-structure-expansion-2026-10-q4': {
    type: 'fill_blank',
    prompt: '硫原子的核电荷数为16，原子呈电中性。它的核外电子排布为 ____；最外层有 ____ 个电子。',
    options: undefined,
    answerIndex: undefined,
    correctAnswer: '2、8、6；6',
    acceptedAnswers: ['2,8,6；6', '2、8、6；6', '2 8 6；6'],
    gradingMode: 'exact',
    explanation: '中性硫原子有16个电子。由内向外第一层排2个、第二层排8个，剩下6个在第三层，因此排布为2、8、6，最外层有6个电子。',
    difficulty: '提升',
    sourceRef: `${chemistryQuestionSource}#chemistry-9a-3-2-atomic-structure-expansion-2026-10-q4`,
  },
  'chemistry-9a-2-3-q1': {
    explanation: '加热高锰酸钾时，固体粉末可能被气流带进导管；试管口放棉花是为了拦住粉末，避免导管堵塞并影响氧气导出。棉花不是用来防止水倒吸的，防倒吸要在实验结束时先把导管从水面下移出。',
  },
  'chemistry-9a-2-3-q2': {
    explanation: '氧气不易溶于水，因此可用排水法收集；氧气的密度比空气略大，也可用向上排空气法收集。两种方法依据的是不同性质：前者依据溶解性，后者依据气体密度。向下排空气法适用于密度比空气小的气体，不适合氧气。',
  },
  'chemistry-9a-2-3-q3': {
    explanation: '催化剂能改变反应速率，但不改变反应物完全反应时生成物的总量；在反应前后，催化剂的质量和化学性质不变。选项A错在把催化作用限定为“只能加快”，催化剂也可能减慢反应；选项C把速率变化误当成产量增加；没有催化剂时反应未必不能发生，只是可能较慢。',
  },
  'chemistry-9a-2-3-q4': {
    explanation: '实验结束要先把导管从水槽中移出，再熄灭酒精灯。若先熄灯，试管内气体冷却、压强减小，水可能沿导管倒吸进仍较热的试管，使试管骤冷而破裂。先移出导管可切断水倒吸的通路。',
  },
  'chemistry-9a-2-3-q5': {
    explanation: '分解反应的特征是由一种反应物生成两种或两种以上物质。过氧化氢分解可表示为2H₂O₂ → 2H₂O + O₂，符合“一变多”；碳、铁、磷与氧气的选项都是两种反应物生成一种主要产物，属于化合反应。',
  },
  'chemistry-9a-2-3-q6': {
    explanation: '二氧化锰在这里作催化剂，能加快过氧化氢分解，却不提供氧原子，也不决定完全反应后的氧气总量。忘加二氧化锰时，过氧化氢仍能分解，只是速率明显减慢；在过氧化氢用量相同且最终完全分解的前提下，理论生成的氧气总量不变。',
  },
  'chemistry-9a-2-3-q7': {
    explanation: '氧气验满时，把带火星的木条放在集气瓶口；若木条复燃，说明瓶口逸出的气体能支持燃烧，瓶内氧气已收集满。把木条伸入瓶内只能检验瓶内有没有氧气，不能判断是否装满；澄清石灰水用于检验二氧化碳。',
  },
  'chemistry-9a-2-3-q8': {
    explanation: '过氧化氢溶液与二氧化锰接触即可产生氧气，反应不需要持续加热，因此适合使用固体与液体接触、无需加热的发生装置。这样可省去加热步骤，操作较简便并节约能源。装置选择描述的是制气条件；反应还会生成水，不能据此说产物只有氧气。',
  },
  'chemistry-9a-2-3-q9': {
    explanation: '高锰酸钾不是惰性的二氧化锰替代物：加热时它自身会分解，放出氧气并生成锰酸钾和二氧化锰；新生成的二氧化锰又可催化氯酸钾分解。因此混入高锰酸钾后，既有它自身分解贡献的氧气，又有二氧化锰促进氯酸钾分解，表现为反应更快、最终氧气总量增加。',
  },
  'chemistry-9a-2-3-q10': {
    explanation: '在过氧化氢分解中，二氧化锰起催化作用，能提高反应速率，所以选项C正确。催化剂在反应前后质量和化学性质保持不变，因此“质量减少”和“化学性质改变”不正确；它不作为净消耗的反应物写入总反应式。',
  },
}
