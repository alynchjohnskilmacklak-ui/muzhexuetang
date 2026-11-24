const fs = require('fs');
const path = require('path');

const allData = JSON.parse(fs.readFileSync('data/poetry-recitation/all-items.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('data/poetry-recitation/manifest.json', 'utf8'));

// 读取现有精修的题库与易错字库作为知识库
const existingDbPath = path.join(__dirname, '../src/data/poetry/junior-high-database.ts');
let existingDbContent = '';
if (fs.existsSync(existingDbPath)) {
  existingDbContent = fs.readFileSync(existingDbPath, 'utf8');
}

// 辅助映射：根据分册名称映射年级和学期
function parseVolumeMeta(volName) {
  if (volName.startsWith('七年级')) {
    return { grade: '初一', semester: volName.includes('上') ? '上册' : '下册', gradeLabel: '七年级' };
  }
  if (volName.startsWith('八年级')) {
    return { grade: '初二', semester: volName.includes('上') ? '上册' : '下册', gradeLabel: '八年级' };
  }
  return { grade: '初三', semester: volName.includes('上') ? '上册' : '下册', gradeLabel: '九年级' };
}

// 六本分册的基础元数据
const BOOK_VOLUMES = [
  {
    key: 'g7a',
    volumeName: '七年级上册',
    grade: '初一',
    volume: '上册',
    badge: '7上',
    title: '七年级上册',
    tag: '基础衔接',
    subtitle: '统编版 · 《观沧海》《次北固山下》《秋词》等',
    coverImg: '/images/textbooks/covers/chinese-g7-upper.webp',
    count: 12,
  },
  {
    key: 'g7b',
    volumeName: '七年级下册',
    grade: '初一',
    volume: '下册',
    badge: '7下',
    title: '七年级下册',
    tag: '下册必背',
    subtitle: '统编版 · 《木兰诗》《望岳》《登幽州台歌》等',
    coverImg: '/images/textbooks/covers/chinese-g7-lower.webp',
    count: 14,
  },
  {
    key: 'g8a',
    volumeName: '八年级上册',
    grade: '初二',
    volume: '上册',
    badge: '8上',
    title: '八年级上册',
    tag: '初二核心',
    subtitle: '统编版 · 《黄鹤楼》《使至塞上》《春望》等',
    coverImg: '/images/textbooks/covers/chinese-g8-upper.webp',
    count: 18,
  },
  {
    key: 'g8b',
    volumeName: '八年级下册',
    grade: '初二',
    volume: '下册',
    badge: '8下',
    title: '八年级下册',
    tag: '能力提升',
    subtitle: '统编版 · 《关雎》《蒹葭》《茅屋为秋风所破歌》等',
    coverImg: '/images/textbooks/covers/chinese-g8-lower.webp',
    count: 13,
  },
  {
    key: 'g9a',
    volumeName: '九年级上册',
    grade: '初三',
    volume: '上册',
    badge: '9上',
    title: '九年级上册',
    tag: '中考强化',
    subtitle: '统编版 · 《行路难》《酬乐天...》《水调歌头》等',
    coverImg: '/images/textbooks/covers/chinese-g9-upper.webp',
    count: 16,
  },
  {
    key: 'g9b',
    volumeName: '九年级下册',
    grade: '初三',
    volume: '下册',
    badge: '9下',
    title: '九年级下册',
    tag: '中考冲刺',
    subtitle: '统编版 · 《破阵子》《江城子·密州出猎》等',
    coverImg: '/images/textbooks/covers/chinese-g9-lower.webp',
    count: 8,
  },
];

// 高频名句与易错字备用词库
const FAMOUS_QUOTES = {
  '观沧海': '日月之行，若出其中；星汉灿烂，若出其里。',
  '次北固山下': '海日生残夜，江春入旧年。潮平两岸阔，风正一帆悬。',
  '闻王昌龄左迁龙标遥有此寄': '我寄愁心与明月，随君直到夜郎西。',
  '天净沙·秋思': '夕阳西下，断肠人在天涯。',
  '峨眉山月歌': '夜发清溪向三峡，思君不见下渝州。',
  '江南逢李龟年': '正是江南好风景，落花时节又逢君。',
  '行军九日思长安故园': '遥怜故园菊，应傍战场开。',
  '夜上受降城闻笛': '不知何处吹芦管，一夜征人尽望乡。',
  '秋词（其一）': '自古逢秋悲寂寥，我言秋日胜春朝。晴空一鹤排云上，便引诗情到碧霄。',
  '夜雨寄北': '何当共剪西窗烛，却话巴山夜雨时。',
  '十一月四日风雨大作（其二）': '夜阑卧听风吹雨，铁马冰河入梦来。',
  '潼关': '河流大野犹嫌束，山入潼关不解平。',
  '木兰诗': '万里赴戎机，关山度若飞。朔气传金柝，寒光照铁衣。',
  '竹里馆': '深林人不知，明月来相照。',
  '春夜洛城闻笛': '此夜曲中闻折柳，何人不起故园情。',
  '逢入京使': '马上相逢无纸笔，凭君传语报平安。',
  '晚春': '杨花榆荚无才思，惟解漫天作雪飞。',
  '登幽州台歌': '前不见古人，后不见来者。念天地之悠悠，独怆然而涕下！',
  '望岳': '会当凌绝顶，一览众山小。',
  '登飞来峰': '不畏浮云遮望眼，自缘身在最高层。',
  '游山西村': '山重水复疑无路，柳暗花明又一村。',
  '己亥杂诗（其五）': '落红不是无情物，化作春泥更护花。',
  '泊秦淮': '商女不知亡国恨，隔江犹唱后庭花。',
  '黄鹤楼': '晴川历历汉阳树，芳草萋萋鹦鹉洲。日暮乡关何处是？烟波江上使人愁。',
  '使至塞上': '大漠孤烟直，长河落日圆。',
  '钱塘湖春行': '几处早莺争暖树，谁家新燕啄春泥。乱花渐欲迷人眼，浅草才能没马蹄。',
  '春望': '国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。',
  '赤壁': '东风不与周郎便，铜雀春深锁二乔。',
  '雁门太守行': '黑云压城城欲摧，甲光向日金鳞开。',
  '关雎': '关关雎鸠，在河之洲。窈窕淑女，君子好逑。',
  '蒹葭': '蒹葭苍苍，白露为霜。所谓伊人，在水一方。',
  '送杜少府之任蜀州': '海内存知己，天涯若比邻。',
  '茅屋为秋风所破歌': '安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。',
  '行路难（其一）': '长风破浪会有时，直挂云帆济沧海。',
  '酬乐天扬州初逢席上见赠': '沉舟侧畔千帆过，病树前头万木春。',
  '水调歌头（明月几时有）': '人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。',
  '白雪歌送武判官归京': '忽如一夜春风来，千树万树梨花开。',
  '过零丁洋': '人生自古谁无死？留取丹心照汗青。',
  '山坡羊·潼关怀古': '兴，百姓苦；亡，百姓苦。',
  '渔家傲·秋思': '浊酒一杯家万里，燕然未勒归无计。羌管悠悠霜满地。',
  '江城子·密州出猎': '会挽雕弓如满月，西北望，射天狼。',
  '破阵子·为陈同甫赋壮词以寄之': '了却君王天下事，赢得生前身后名。可怜白发生！',
};

// 加载中考情境默写真题案例库
let zhongkaoCases = {};
const zhongkaoCasesPath = 'data/poetry-recitation/zhongkao-real-cases.json';
if (fs.existsSync(zhongkaoCasesPath)) {
  zhongkaoCases = JSON.parse(fs.readFileSync(zhongkaoCasesPath, 'utf8'));
}

// 处理 items
const processedItems = allData.items.map((raw) => {
  const meta = parseVolumeMeta(raw.volume);
  const stanzasFlat = Array.isArray(raw.stanzas[0]) ? raw.stanzas.flat() : raw.stanzas;
  
  // 查找高频名句，若无则使用首联或尾联
  const quote = FAMOUS_QUOTES[raw.title] || (stanzasFlat.length > 1 ? stanzasFlat.slice(0, 2).join('') : stanzasFlat[0] || '');
  
  // 易错字挖空推断：优先取 keyNotes 中的词
  const maskedWords = [];
  if (Array.isArray(raw.keyNotes)) {
    raw.keyNotes.forEach((kn) => {
      if (kn.term && kn.term.length <= 4) {
        maskedWords.push({
          word: kn.term,
          trapReason: kn.meaning,
        });
      }
    });
  }
  
  // 情境默写题：优先读取真实中考案例库，若无则使用优质默认情境题
  let quizQuestions = [];
  const realCases = zhongkaoCases[raw.title];
  if (realCases && realCases.length > 0) {
    quizQuestions = realCases.map((c) => ({
      prompt: c.prompt,
      answer: c.answer,
      explanation: c.explanation,
      source: c.source,
      category: c.category,
      trapChar: c.trapChar,
      trapWarning: c.trapWarning,
    }));
  } else {
    quizQuestions = [
      {
        prompt: `在《${raw.title}》中，作者${raw.author}表达核心意境或广为传诵的千古名句是：“【       】”`,
        answer: quote.split('。')[0] ? (quote.split('。')[0] + '。') : quote,
        explanation: raw.meaningSummary || '理解诗句主旨与作者情感。',
        source: '统编中考课标考点',
        category: '写景意象',
      }
    ];
  }

  // 综合防错警示：优先取真题案例中的丢分警示
  let enrichedErrorTrap = '';
  if (realCases && realCases[0] && realCases[0].trapWarning) {
    enrichedErrorTrap = realCases[0].trapWarning;
  } else if (raw.keyNotes && raw.keyNotes.length > 0) {
    enrichedErrorTrap = `重点掌握：“${raw.keyNotes[0].term}”（${raw.keyNotes[0].meaning}）的书写与释义。`;
  } else {
    enrichedErrorTrap = '书写时注意别字与漏字。';
  }

  return {
    id: raw.id,
    sequence: raw.sequence,
    title: raw.title,
    author: raw.author,
    dynasty: raw.dynasty,
    volume: raw.volume,
    grade: meta.grade,
    gradeLabel: meta.gradeLabel,
    semester: meta.semester,
    textbookSection: raw.textbookSection,
    contentType: raw.contentType,
    genre: raw.genre,
    stanzas: stanzasFlat,
    stanzaGroups: raw.stanzas,
    meaningSummary: raw.meaningSummary,
    keyNotes: raw.keyNotes || [],
    matchedTo53: Boolean(raw.crosswalk53 && raw.crosswalk53.matchedTo53MainBook),
    printedPage: raw.textbookSource ? raw.textbookSource.printedPage : null,
    famousQuote: quote,
    examFocus: raw.meaningSummary || '统编教材课标必背篇目，考查诗词朗读停顿与主旨把握。',
    errorTrap: enrichedErrorTrap,
    maskedWords: maskedWords.slice(0, 5),
    quizQuestions: quizQuestions,
  };
});

const tsCode = `// 牧哲学堂统编初中古诗词官方数据全量包 (全 81 篇，七至九年级 6 册教材完整同步)
// 来源：data/poetry-recitation/all-items.json (由统编教材 PDF 逐页校对)

export type OfficialPoemItem = {
  id: string
  sequence: number
  title: string
  author: string
  dynasty: string
  volume: string
  grade: '初一' | '初二' | '初三'
  gradeLabel: string
  semester: '上册' | '下册'
  textbookSection: string
  contentType: string
  genre: string
  stanzas: string[]
  stanzaGroups: string[][]
  meaningSummary: string
  keyNotes: Array<{ term: string; meaning: string }>
  matchedTo53: boolean
  printedPage: number | null
  famousQuote: string
  examFocus: string
  errorTrap: string
  maskedWords: Array<{ word: string; pinyin?: string; trapReason?: string }>
  quizQuestions: Array<{
    prompt: string
    answer: string
    explanation: string
    source?: string
    category?: '哲理启迪' | '写景意象' | '生活情境' | '家国情怀' | '修身立志' | '知音送别'
    trapChar?: string
    trapWarning?: string
  }>
}

export type OfficialVolumeMeta = {
  key: string
  volumeName: string
  grade: '初一' | '初二' | '初三'
  volume: '上册' | '下册'
  badge: string
  title: string
  tag: string
  subtitle: string
  coverImg: string
  count: number
}

export const OFFICIAL_POETRY_VOLUMES: OfficialVolumeMeta[] = ${JSON.stringify(BOOK_VOLUMES, null, 2)};

export const OFFICIAL_POETRY_ITEMS: OfficialPoemItem[] = ${JSON.stringify(processedItems, null, 2)};
`;

fs.writeFileSync('src/data/poetry/official-recitation-database.ts', tsCode, 'utf8');
console.log('Successfully generated src/data/poetry/official-recitation-database.ts with 81 items!');
