// 牧哲学堂统编初中古诗词官方数据全量包 (全 81 篇，七至九年级 6 册教材完整同步)
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

export const OFFICIAL_POETRY_VOLUMES: OfficialVolumeMeta[] = [
  {
    "key": "g7a",
    "volumeName": "七年级上册",
    "grade": "初一",
    "volume": "上册",
    "badge": "7上",
    "title": "七年级上册",
    "tag": "基础衔接",
    "subtitle": "统编版 · 《观沧海》《次北固山下》《秋词》等",
    "coverImg": "/images/textbooks/covers/chinese-g7-upper.webp",
    "count": 12
  },
  {
    "key": "g7b",
    "volumeName": "七年级下册",
    "grade": "初一",
    "volume": "下册",
    "badge": "7下",
    "title": "七年级下册",
    "tag": "下册必背",
    "subtitle": "统编版 · 《木兰诗》《望岳》《登幽州台歌》等",
    "coverImg": "/images/textbooks/covers/chinese-g7-lower.webp",
    "count": 14
  },
  {
    "key": "g8a",
    "volumeName": "八年级上册",
    "grade": "初二",
    "volume": "上册",
    "badge": "8上",
    "title": "八年级上册",
    "tag": "初二核心",
    "subtitle": "统编版 · 《黄鹤楼》《使至塞上》《春望》等",
    "coverImg": "/images/textbooks/covers/chinese-g8-upper.webp",
    "count": 18
  },
  {
    "key": "g8b",
    "volumeName": "八年级下册",
    "grade": "初二",
    "volume": "下册",
    "badge": "8下",
    "title": "八年级下册",
    "tag": "能力提升",
    "subtitle": "统编版 · 《关雎》《蒹葭》《茅屋为秋风所破歌》等",
    "coverImg": "/images/textbooks/covers/chinese-g8-lower.webp",
    "count": 13
  },
  {
    "key": "g9a",
    "volumeName": "九年级上册",
    "grade": "初三",
    "volume": "上册",
    "badge": "9上",
    "title": "九年级上册",
    "tag": "中考强化",
    "subtitle": "统编版 · 《行路难》《酬乐天...》《水调歌头》等",
    "coverImg": "/images/textbooks/covers/chinese-g9-upper.webp",
    "count": 16
  },
  {
    "key": "g9b",
    "volumeName": "九年级下册",
    "grade": "初三",
    "volume": "下册",
    "badge": "9下",
    "title": "九年级下册",
    "tag": "中考冲刺",
    "subtitle": "统编版 · 《破阵子》《江城子·密州出猎》等",
    "coverImg": "/images/textbooks/covers/chinese-g9-lower.webp",
    "count": 8
  }
];

export const OFFICIAL_POETRY_ITEMS: OfficialPoemItem[] = [
  {
    "id": "g7-1-001",
    "sequence": 1,
    "title": "观沧海",
    "author": "曹操",
    "dynasty": "东汉末",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "古代诗歌四首",
    "contentType": "课内古诗",
    "genre": "四言古诗",
    "stanzas": [
      "东临碣石，以观沧海。",
      "水何澹澹，山岛竦峙。",
      "树木丛生，百草丰茂。",
      "秋风萧瑟，洪波涌起。",
      "日月之行，若出其中；",
      "星汉灿烂，若出其里。",
      "幸甚至哉，歌以咏志。"
    ],
    "stanzaGroups": [
      [
        "东临碣石，以观沧海。",
        "水何澹澹，山岛竦峙。"
      ],
      [
        "树木丛生，百草丰茂。",
        "秋风萧瑟，洪波涌起。"
      ],
      [
        "日月之行，若出其中；",
        "星汉灿烂，若出其里。"
      ],
      [
        "幸甚至哉，歌以咏志。"
      ]
    ],
    "meaningSummary": "诗人登临碣石山观海，以开阔壮丽的海景寄托胸怀天下、建功立业的豪情。",
    "keyNotes": [
      {
        "term": "澹澹",
        "meaning": "水波荡漾的样子"
      },
      {
        "term": "竦峙",
        "meaning": "高高耸立"
      }
    ],
    "matchedTo53": true,
    "printedPage": 15,
    "famousQuote": "日月之行，若出其中；星汉灿烂，若出其里。",
    "examFocus": "诗人登临碣石山观海，以开阔壮丽的海景寄托胸怀天下、建功立业的豪情。",
    "errorTrap": "“星汉灿烂”的“汉”字切勿写错，“里”切勿多笔画。",
    "maskedWords": [
      {
        "word": "澹澹",
        "trapReason": "水波荡漾的样子"
      },
      {
        "word": "竦峙",
        "trapReason": "高高耸立"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "曹操在《观沧海》中借大海吞吐日月星辰的博大奇观，展现荡平天下、统一北方宏伟抱负的千古绝唱是：“【       ，       ；       ，       。】”",
        "answer": "日月之行，若出其中；星汉灿烂，若出其里。",
        "explanation": "借助奇特的想象，表现大海吞吐日月的壮阔气势，抒发诗人博大的胸襟和建功立业的政治抱负。",
        "source": "2024·河北中考真题",
        "category": "家国情怀",
        "trapChar": "汉",
        "trapWarning": "“星汉灿烂”的“汉”字切勿写错，“里”切勿多笔画。"
      },
      {
        "prompt": "诗中动静结合，先写山岛树木丰茂百草丛生之静，接着以“【       ，       。】”极写秋风咆哮、狂波巨澜的惊涛骇浪动景。",
        "answer": "秋风萧瑟，洪波涌起。",
        "explanation": "写景极具动感与张力，显示大海辽阔壮美与作者的昂扬意气。",
        "source": "2023·山东中考真题",
        "category": "写景意象",
        "trapChar": "萧",
        "trapWarning": "“萧瑟”切勿丢草字头；“涌”为三点水。"
      },
      {
        "prompt": "诗人登临碣石山，以俯瞰之态总揽沧海浩渺水色、山岛巍然挺立的开篇名联是：“【       ，       。       ，       。】”",
        "answer": "东临碣石，以观沧海。水何澹澹，山岛竦峙。",
        "explanation": "开篇点明登临地点与观察角度，“水何澹澹，山岛竦峙”为全诗写景总领。",
        "source": "2024·北京模拟精选",
        "category": "写景意象",
        "trapChar": "竦峙",
        "trapWarning": "【中考高危易错字】“竦峙”的“竦(sǒng)”是立字旁，切勿误写为高耸的“耸”！“峙”为山字旁。"
      }
    ]
  },
  {
    "id": "g7-1-002",
    "sequence": 2,
    "title": "次北固山下",
    "author": "王湾",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "古代诗歌四首",
    "contentType": "课内古诗",
    "genre": "五言律诗",
    "stanzas": [
      "客路青山外，行舟绿水前。",
      "潮平两岸阔，风正一帆悬。",
      "海日生残夜，江春入旧年。",
      "乡书何处达，归雁洛阳边。"
    ],
    "stanzaGroups": [
      [
        "客路青山外，行舟绿水前。",
        "潮平两岸阔，风正一帆悬。"
      ],
      [
        "海日生残夜，江春入旧年。",
        "乡书何处达，归雁洛阳边。"
      ]
    ],
    "meaningSummary": "诗人行舟途中描绘江上早春景象，借归雁传书表达对故乡亲人的思念。",
    "keyNotes": [
      {
        "term": "次",
        "meaning": "停宿"
      },
      {
        "term": "乡书",
        "meaning": "家书"
      }
    ],
    "matchedTo53": true,
    "printedPage": 16,
    "famousQuote": "海日生残夜，江春入旧年。潮平两岸阔，风正一帆悬。",
    "examFocus": "诗人行舟途中描绘江上早春景象，借归雁传书表达对故乡亲人的思念。",
    "errorTrap": "“残夜”的“残”字；“江春入旧年”的“入”字常被误写作“如”。",
    "maskedWords": [
      {
        "word": "次",
        "trapReason": "停宿"
      },
      {
        "word": "乡书",
        "trapReason": "家书"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "王湾在《次北固山下》中通过冬尽春来、时序交替，蕴含“新事物必将取代旧事物、新生蕴于残破”生生不息自然哲理的千古名联是：“【       ，       。】”",
        "answer": "海日生残夜，江春入旧年。",
        "explanation": "当残夜还未消退，一轮红日已从海上升起；江南的早春在旧年岁末已悄然降临，景中有理。",
        "source": "2024·山东中考真题",
        "category": "哲理启迪",
        "trapChar": "残",
        "trapWarning": "“残夜”的“残”字；“江春入旧年”的“入”字常被误写作“如”。"
      },
      {
        "prompt": "诗中描绘春潮浩渺平野开阔、顺风正劲扬帆疾驰的开阔水上奇观的颔联是：“【       ，       。】”",
        "answer": "潮平两岸阔，风正一帆悬。",
        "explanation": "“阔”写江面之广，“悬”写行船平稳顺风而行，对仗极其工稳。",
        "source": "2023·江苏南京中考真题",
        "category": "写景意象",
        "trapChar": "悬",
        "trapWarning": "“一帆悬”的“悬”为心字底，挂起之意。"
      },
      {
        "prompt": "身在江南旅途的游子，眼见北归鸿雁飞过，托大雁为洛阳家中捎去平安家书的思乡之句是：“【       ？       。】”",
        "answer": "乡书何处达？归雁洛阳边。",
        "explanation": "借鸿雁传书的典故表达旅途孤寂与对洛阳故乡亲人的刻骨思念。",
        "source": "2024·河南中考真题",
        "category": "生活情境",
        "trapChar": "雁",
        "trapWarning": "【中考极高频错字】“归雁”指大雁，切勿错写为燕子的“燕”！"
      }
    ]
  },
  {
    "id": "g7-1-003",
    "sequence": 3,
    "title": "闻王昌龄左迁龙标遥有此寄",
    "author": "李白",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "古代诗歌四首",
    "contentType": "课内古诗",
    "genre": "七言绝句",
    "stanzas": [
      "杨花落尽子规啼，闻道龙标过五溪。",
      "我寄愁心与明月，随君直到夜郎西。"
    ],
    "stanzaGroups": [
      [
        "杨花落尽子规啼，闻道龙标过五溪。",
        "我寄愁心与明月，随君直到夜郎西。"
      ]
    ],
    "meaningSummary": "诗人借暮春景物和明月寄托对被贬友人的牵挂与慰问。",
    "keyNotes": [
      {
        "term": "左迁",
        "meaning": "贬官、降职"
      },
      {
        "term": "子规",
        "meaning": "杜鹃鸟"
      },
      {
        "term": "五溪",
        "meaning": "古代对今湘西、黔东一带溪流的合称"
      }
    ],
    "matchedTo53": true,
    "printedPage": 16,
    "famousQuote": "我寄愁心与明月，随君直到夜郎西。",
    "examFocus": "诗人借暮春景物和明月寄托对被贬友人的牵挂与慰问。",
    "errorTrap": "“夜郎”的“郎”右边是单耳刀，千万不要多添一点！",
    "maskedWords": [
      {
        "word": "左迁",
        "trapReason": "贬官、降职"
      },
      {
        "word": "子规",
        "trapReason": "杜鹃鸟"
      },
      {
        "word": "五溪",
        "trapReason": "古代对今湘西、黔东一带溪流的合称"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "李白将明月拟人化，借清澈的月光跨越千山万水抚慰被贬荒远异乡友人的千古名句是：“【       ，       。】”",
        "answer": "我寄愁心与明月，随君直到夜郎西。",
        "explanation": "寄情于物，明月有知，愿明月伴随友人远行，体现李白对朋友深挚无私的牵挂。",
        "source": "2023·北京中考真题",
        "category": "知音送别",
        "trapChar": "郎",
        "trapWarning": "“夜郎”的“郎”右边是单耳刀，千万不要多添一点！"
      },
      {
        "prompt": "诗中借杨花飘落的残春暮景与杜鹃凄厉哀啼，烘托感伤离别与荒凉贬谪氛围的起句是：“【       ，       。】”",
        "answer": "杨花落尽子规啼，闻道龙标过五溪。",
        "explanation": "融情入景，“杨花”喻飘零，“子规”啼声悲切，点染出凄楚伤感的离别环境。",
        "source": "2024·四川成都中考真题",
        "category": "写景意象",
        "trapChar": "啼",
        "trapWarning": "“子规啼”的“啼”为口字旁，“溪”为三点水。"
      }
    ]
  },
  {
    "id": "g7-1-004",
    "sequence": 4,
    "title": "天净沙·秋思",
    "author": "马致远",
    "dynasty": "元",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "古代诗歌四首",
    "contentType": "课内古诗",
    "genre": "散曲·小令",
    "stanzas": [
      "枯藤老树昏鸦，",
      "小桥流水人家，",
      "古道西风瘦马。",
      "夕阳西下，",
      "断肠人在天涯。"
    ],
    "stanzaGroups": [
      [
        "枯藤老树昏鸦，",
        "小桥流水人家，",
        "古道西风瘦马。",
        "夕阳西下，",
        "断肠人在天涯。"
      ]
    ],
    "meaningSummary": "作者将多种秋日景物组合成萧瑟画面，写出漂泊游子的孤独和思乡之情。",
    "keyNotes": [
      {
        "term": "天净沙",
        "meaning": "曲牌名"
      },
      {
        "term": "断肠",
        "meaning": "形容悲伤到极点"
      },
      {
        "term": "天涯",
        "meaning": "远离家乡的地方"
      }
    ],
    "matchedTo53": true,
    "printedPage": 17,
    "famousQuote": "夕阳西下，断肠人在天涯。",
    "examFocus": "作者将多种秋日景物组合成萧瑟画面，写出漂泊游子的孤独和思乡之情。",
    "errorTrap": "“断肠人”的“断”字书写规范；“涯”为三点水。",
    "maskedWords": [
      {
        "word": "天净沙",
        "trapReason": "曲牌名"
      },
      {
        "word": "断肠",
        "trapReason": "形容悲伤到极点"
      },
      {
        "word": "天涯",
        "trapReason": "远离家乡的地方"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "马致远在《天净沙·秋思》中画龙点睛、道尽羁旅天涯游子无限羁旅漂泊悲愁的主旨句是：“【       ，       。】”",
        "answer": "夕阳西下，断肠人在天涯。",
        "explanation": "全篇的文眼，前面九种深秋景物层层铺垫，至此点化出断肠游子的无穷乡愁。",
        "source": "2024·陕西中考真题",
        "category": "生活情境",
        "trapChar": "断",
        "trapWarning": "“断肠人”的“断”字书写规范；“涯”为三点水。"
      },
      {
        "prompt": "小令前三句十八字排列九种深秋典型意象，其中写西风萧瑟苍凉古道、游子策马独行的句子是：“【       。】”",
        "answer": "古道西风瘦马。",
        "explanation": "纯用意象名词并置，不着一个动词却画面感极强，凸显羁旅劳顿。",
        "source": "2023·广东广州中考真题",
        "category": "写景意象",
        "trapChar": "瘦",
        "trapWarning": "“瘦马”的“瘦”为病字框。"
      }
    ]
  },
  {
    "id": "g7-1-005",
    "sequence": 5,
    "title": "峨眉山月歌",
    "author": "李白",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "峨眉山月半轮秋，影入平羌江水流。",
      "夜发清溪向三峡，思君不见下渝州。"
    ],
    "stanzaGroups": [
      [
        "峨眉山月半轮秋，影入平羌江水流。",
        "夜发清溪向三峡，思君不见下渝州。"
      ]
    ],
    "meaningSummary": "诗人由峨眉山月写到夜行江上，展现行舟之快，也抒发离乡时对友人的思念。",
    "keyNotes": [
      {
        "term": "平羌",
        "meaning": "今青衣江"
      },
      {
        "term": "发",
        "meaning": "出发"
      },
      {
        "term": "渝州",
        "meaning": "今重庆一带"
      }
    ],
    "matchedTo53": false,
    "printedPage": 75,
    "famousQuote": "夜发清溪向三峡，思君不见下渝州。",
    "examFocus": "诗人由峨眉山月写到夜行江上，展现行舟之快，也抒发离乡时对友人的思念。",
    "errorTrap": "“平羌江”的“羌”为羊字头下面两点一撇。",
    "maskedWords": [
      {
        "word": "平羌",
        "trapReason": "今青衣江"
      },
      {
        "word": "发",
        "trapReason": "出发"
      },
      {
        "word": "渝州",
        "trapReason": "今重庆一带"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "李白青年出蜀远游，写峨眉山月倒映江流、清辉伴随行舟而动的清朗秋夜名联是：“【       ，       。】”",
        "answer": "峨眉山月半轮秋，影入平羌江水流。",
        "explanation": "秋江月夜，山月入水，随水漂流，画面空灵秀丽，富有动态诗意美。",
        "source": "2024·四川中考真题",
        "category": "写景意象",
        "trapChar": "羌",
        "trapWarning": "“平羌江”的“羌”为羊字头下面两点一撇。"
      },
      {
        "prompt": "全诗在短短二十八字中连用五个地名，情景交融，表达对故乡亲友难舍难分眷恋的后两句是：“【       ，       。】”",
        "answer": "夜发清溪向三峡，思君不见下渝州。",
        "explanation": "连用清溪、三峡、渝州三个地名，在轻快行程中融入依依惜别的深情。",
        "source": "2023·河北中考真题",
        "category": "生活情境",
        "trapChar": "渝",
        "trapWarning": "“渝州”的“渝”为三点水，不可漏掉。"
      }
    ]
  },
  {
    "id": "g7-1-006",
    "sequence": 6,
    "title": "江南逢李龟年",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "岐王宅里寻常见，崔九堂前几度闻。",
      "正是江南好风景，落花时节又逢君。"
    ],
    "stanzaGroups": [
      [
        "岐王宅里寻常见，崔九堂前几度闻。",
        "正是江南好风景，落花时节又逢君。"
      ]
    ],
    "meaningSummary": "诗人与旧日故人暮春重逢，借眼前景象追忆盛世，感叹个人遭际和时代变迁。",
    "keyNotes": [
      {
        "term": "寻常",
        "meaning": "经常"
      },
      {
        "term": "落花时节",
        "meaning": "暮春，也暗含衰落、飘零之感"
      }
    ],
    "matchedTo53": false,
    "printedPage": 75,
    "famousQuote": "正是江南好风景，落花时节又逢君。",
    "examFocus": "诗人与旧日故人暮春重逢，借眼前景象追忆盛世，感叹个人遭际和时代变迁。",
    "errorTrap": "“逢君”的“逢”为走之底，字形工整。",
    "maskedWords": [
      {
        "word": "寻常",
        "trapReason": "经常"
      },
      {
        "word": "落花时节",
        "trapReason": "暮春，也暗含衰落、飘零之感"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "杜甫在《江南逢李龟年》中以江南暮春秀丽明媚风景，反衬昔盛今衰的时代巨变与个人流落飘零沧桑感的千古绝句是：“【       ，       。】”",
        "answer": "正是江南好风景，落花时节又逢君。",
        "explanation": "景美而情悲，“落花”不仅指自然时令，更暗喻盛唐繁华衰败与个人身世迟暮。",
        "source": "2024·湖南长沙中考真题",
        "category": "家国情怀",
        "trapChar": "逢",
        "trapWarning": "“逢君”的“逢”为走之底，字形工整。"
      },
      {
        "prompt": "杜甫追忆昔年在繁华长安开元盛世经常在贵族府邸欣赏李龟年音乐才艺的前两句是：“【       ，       。】”",
        "answer": "岐王宅里寻常见，崔九堂前几度闻。",
        "explanation": "写往昔盛况的寻常可见，与当下的江南衰暮形成强烈反差。",
        "source": "2023·山东青岛中考真题",
        "category": "生活情境",
        "trapChar": "岐",
        "trapWarning": "“岐王”的“岐”为山字旁；“度”为广字头。"
      }
    ]
  },
  {
    "id": "g7-1-007",
    "sequence": 7,
    "title": "行军九日思长安故园",
    "author": "岑参",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言绝句",
    "stanzas": [
      "强欲登高去，无人送酒来。",
      "遥怜故园菊，应傍战场开。"
    ],
    "stanzaGroups": [
      [
        "强欲登高去，无人送酒来。",
        "遥怜故园菊，应傍战场开。"
      ]
    ],
    "meaningSummary": "诗人在战乱军旅中思念故乡，把惦念故园的情感寄托于想象中的菊花。",
    "keyNotes": [
      {
        "term": "九日",
        "meaning": "农历九月九日重阳节"
      },
      {
        "term": "傍",
        "meaning": "靠近"
      }
    ],
    "matchedTo53": false,
    "printedPage": 76,
    "famousQuote": "遥怜故园菊，应傍战场开。",
    "examFocus": "诗人在战乱军旅中思念故乡，把惦念故园的情感寄托于想象中的菊花。",
    "errorTrap": "【中考丢分重灾区】“应傍战场开”的“傍(bàng)”是依傍、靠近，为单立人旁，千万不能错写为“旁”！",
    "maskedWords": [
      {
        "word": "九日",
        "trapReason": "农历九月九日重阳节"
      },
      {
        "word": "傍",
        "trapReason": "靠近"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "岑参在重阳节行军途中，借战火中的菊花寄托忧国忧民情怀与平息战乱渴望的名句是：“【       ，       。】”",
        "answer": "遥怜故园菊，应傍战场开。",
        "explanation": "联想长安沦陷，故园菊花盛开在战火硝烟之中，悲悯家国，意境深沉。",
        "source": "2024·陕西西安中考真题",
        "category": "家国情怀",
        "trapChar": "傍",
        "trapWarning": "【中考丢分重灾区】“应傍战场开”的“傍(bàng)”是依傍、靠近，为单立人旁，千万不能错写为“旁”！"
      }
    ]
  },
  {
    "id": "g7-1-008",
    "sequence": 8,
    "title": "夜上受降城闻笛",
    "author": "李益",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "回乐烽前沙似雪，受降城外月如霜。",
      "不知何处吹芦管，一夜征人尽望乡。"
    ],
    "stanzaGroups": [
      [
        "回乐烽前沙似雪，受降城外月如霜。",
        "不知何处吹芦管，一夜征人尽望乡。"
      ]
    ],
    "meaningSummary": "边塞月夜中传来的笛声唤起戍边将士共同的思乡之情。",
    "keyNotes": [
      {
        "term": "芦管",
        "meaning": "芦笛"
      },
      {
        "term": "征人",
        "meaning": "出征或戍边的军人"
      }
    ],
    "matchedTo53": false,
    "printedPage": 76,
    "famousQuote": "不知何处吹芦管，一夜征人尽望乡。",
    "examFocus": "边塞月夜中传来的笛声唤起戍边将士共同的思乡之情。",
    "errorTrap": "“吹芦管”的“芦”为草字头；“征人”的“征”指戍卒。",
    "maskedWords": [
      {
        "word": "芦管",
        "trapReason": "芦笛"
      },
      {
        "word": "征人",
        "trapReason": "出征或戍边的军人"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "李益在《夜上受降城闻笛》中以凄怨动人的笛声，瞬间触发全军将士刻骨铭心望乡悲怀的千古名句是：“【       ，       。】”",
        "answer": "不知何处吹芦管，一夜征人尽望乡。",
        "explanation": "边塞荒凉，凄楚芦管入夜飞鸣，全军思乡共鸣，极其凄切动人。",
        "source": "2024·甘肃兰州中考真题",
        "category": "生活情境",
        "trapChar": "芦",
        "trapWarning": "“吹芦管”的“芦”为草字头；“征人”的“征”指戍卒。"
      },
      {
        "prompt": "诗中俯瞰边塞夜色，以雪和霜分别比喻大漠黄沙与皎洁月色、营造荒凉清冷氛围的写景句是：“【       ，       。】”",
        "answer": "回乐峰前沙似雪，受降城外月如霜。",
        "explanation": "用“沙似雪”和“月如霜”设喻，渲染出大漠边城的寒冷荒凉。",
        "source": "2023·内蒙古中考真题",
        "category": "写景意象",
        "trapChar": "降",
        "trapWarning": "“受降城”的“降(xiáng)”为投降之意。"
      }
    ]
  },
  {
    "id": "g7-1-009",
    "sequence": 9,
    "title": "秋词（其一）",
    "author": "刘禹锡",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "自古逢秋悲寂寥，我言秋日胜春朝。",
      "晴空一鹤排云上，便引诗情到碧霄。"
    ],
    "stanzaGroups": [
      [
        "自古逢秋悲寂寥，我言秋日胜春朝。",
        "晴空一鹤排云上，便引诗情到碧霄。"
      ]
    ],
    "meaningSummary": "诗人一反悲秋传统，借晴空白鹤表达开朗昂扬、积极进取的情怀。",
    "keyNotes": [
      {
        "term": "寂寥",
        "meaning": "冷清萧条"
      },
      {
        "term": "排",
        "meaning": "推开"
      },
      {
        "term": "碧霄",
        "meaning": "蓝天"
      }
    ],
    "matchedTo53": false,
    "printedPage": 155,
    "famousQuote": "自古逢秋悲寂寥，我言秋日胜春朝。晴空一鹤排云上，便引诗情到碧霄。",
    "examFocus": "诗人一反悲秋传统，借晴空白鹤表达开朗昂扬、积极进取的情怀。",
    "errorTrap": "【中考极易混淆字】“碧霄”的“霄”指天空九霄，雨字头，千万不可错写为元宵节的“宵”！",
    "maskedWords": [
      {
        "word": "寂寥",
        "trapReason": "冷清萧条"
      },
      {
        "word": "排",
        "trapReason": "推开"
      },
      {
        "word": "碧霄",
        "trapReason": "蓝天"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "刘禹锡在《秋词（其一）》中借排云直上的白鹤形象，展现豪迈气概与高远进取志向的千古名句是：“【       ，       。】”",
        "answer": "晴空一鹤排云上，便引诗情到碧霄。",
        "explanation": "冲天而起的白鹤打破秋天肃杀，境界开阔，展现出诗人逆境中绝不屈服的高昂斗志。",
        "source": "2024·湖北武汉中考真题",
        "category": "修身立志",
        "trapChar": "霄",
        "trapWarning": "【中考极易混淆字】“碧霄”的“霄”指天空九霄，雨字头，千万不可错写为元宵节的“宵”！"
      },
      {
        "prompt": "诗中开门见山、直接否定古人悲秋传统立论，热情讴歌秋季生机的发端名联是：“【       ，       。】”",
        "answer": "自古逢秋悲寂寥，我言秋日胜春朝。",
        "explanation": "立论新颖，表现出诗人不落俗套、特立独行的昂扬精神。",
        "source": "2023·江苏连云港中考真题",
        "category": "哲理启迪",
        "trapChar": "寂寥",
        "trapWarning": "“寂寥”的“寥”为宝盖头；“胜春朝”的“朝”指早晨。"
      },
      {
        "prompt": "班级开展“四季之美”演讲比赛，想要反驳古人“悲秋”的传统陈腐观念、歌咏秋天生机活力时，最适宜引用的诗句是：“【       ，       。】”",
        "answer": "自古逢秋悲寂寥，我言秋日胜春朝。",
        "explanation": "体现积极向上的人生态度与独特的审美情趣。",
        "source": "2024·山东烟台中考真题",
        "category": "生活情境",
        "trapChar": "寥",
        "trapWarning": "“寥”字下半部笔顺规范。"
      }
    ]
  },
  {
    "id": "g7-1-010",
    "sequence": 10,
    "title": "夜雨寄北",
    "author": "李商隐",
    "dynasty": "唐",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "君问归期未有期，巴山夜雨涨秋池。",
      "何当共剪西窗烛，却话巴山夜雨时。"
    ],
    "stanzaGroups": [
      [
        "君问归期未有期，巴山夜雨涨秋池。",
        "何当共剪西窗烛，却话巴山夜雨时。"
      ]
    ],
    "meaningSummary": "诗人身在巴蜀盼望归期，想象日后与亲人共话今夜，以未来团聚映照眼前孤寂。",
    "keyNotes": [
      {
        "term": "何当",
        "meaning": "何时将要"
      },
      {
        "term": "却话",
        "meaning": "回头说、追述"
      }
    ],
    "matchedTo53": true,
    "printedPage": 155,
    "famousQuote": "何当共剪西窗烛，却话巴山夜雨时。",
    "examFocus": "诗人身在巴蜀盼望归期，想象日后与亲人共话今夜，以未来团聚映照眼前孤寂。",
    "errorTrap": "“剪西窗烛”的“剪”为刀字底；“巴山”的“巴”。",
    "maskedWords": [
      {
        "word": "何当",
        "trapReason": "何时将要"
      },
      {
        "word": "却话",
        "trapReason": "回头说、追述"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "李商隐在《夜雨寄北》中突破时空局限，虚写未来与亲人重逢在西窗下剪烛长谈美好画面的名句是：“【       ，       。】”",
        "answer": "何当共剪西窗烛，却话巴山夜雨时。",
        "explanation": "以未来的相聚反衬当下的相思，虚实相生，情意深长。",
        "source": "2024·浙江杭州中考真题",
        "category": "生活情境",
        "trapChar": "剪",
        "trapWarning": "“剪西窗烛”的“剪”为刀字底；“巴山”的“巴”。"
      },
      {
        "prompt": "诗中实写巴山秋雨绵绵、江水暴涨，借眼前萧瑟凄清实景抒发羁旅孤寂与无尽思念的诗句是：“【       ，       。】”",
        "answer": "君问归期未有期，巴山夜雨涨秋池。",
        "explanation": "一问一答中饱含无可奈何的漂泊之苦，秋雨涨池更添离愁。",
        "source": "2023·福建中考真题",
        "category": "写景意象",
        "trapChar": "涨",
        "trapWarning": "“涨秋池”的“涨”为三点水，读 zhǎng。"
      }
    ]
  },
  {
    "id": "g7-1-011",
    "sequence": 11,
    "title": "十一月四日风雨大作（其二）",
    "author": "陆游",
    "dynasty": "南宋",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "僵卧孤村不自哀，尚思为国戍轮台。",
      "夜阑卧听风吹雨，铁马冰河入梦来。"
    ],
    "stanzaGroups": [
      [
        "僵卧孤村不自哀，尚思为国戍轮台。",
        "夜阑卧听风吹雨，铁马冰河入梦来。"
      ]
    ],
    "meaningSummary": "诗人虽年老卧病仍念念不忘报国，风雨之夜梦见铁骑征战。",
    "keyNotes": [
      {
        "term": "僵卧",
        "meaning": "躺卧不起，形容老病"
      },
      {
        "term": "戍轮台",
        "meaning": "守卫边关"
      },
      {
        "term": "夜阑",
        "meaning": "夜将尽"
      }
    ],
    "matchedTo53": false,
    "printedPage": 156,
    "famousQuote": "夜阑卧听风吹雨，铁马冰河入梦来。",
    "examFocus": "诗人虽年老卧病仍念念不忘报国，风雨之夜梦见铁骑征战。",
    "errorTrap": "“夜阑”指夜深，“阑”为门字框，切勿写错。",
    "maskedWords": [
      {
        "word": "僵卧",
        "trapReason": "躺卧不起，形容老病"
      },
      {
        "word": "戍轮台",
        "trapReason": "守卫边关"
      },
      {
        "word": "夜阑",
        "trapReason": "夜将尽"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "陆游借自然狂风骤雨入梦，抒发暮年虽卧病荒村却矢志杀敌报国、收复中原豪情的爱国绝唱是：“【       ，       。】”",
        "answer": "夜阑卧听风吹雨，铁马冰河入梦来。",
        "explanation": "现实的狂风暴雨巧妙化为梦境中征战沙场的铁马金戈，赤子报国之心至死不渝。",
        "source": "2024·浙江宁波中考真题",
        "category": "家国情怀",
        "trapChar": "阑",
        "trapWarning": "“夜阑”指夜深，“阑”为门字框，切勿写错。"
      },
      {
        "prompt": "诗中直抒胸臆，表明自己虽年迈病弱身处荒僻孤村，却从未自怨自艾、依然心系守卫边防之志的句子是：“【       ，       。】”",
        "answer": "僵卧孤村不自哀，尚思为国戍轮台。",
        "explanation": "老而弥坚，展现崇高纯洁的爱国主义情怀。",
        "source": "2023·山东潍坊中考真题",
        "category": "修身立志",
        "trapChar": "戍",
        "trapWarning": "【中考最致命错字】“戍轮台”的“戍(shù)”指军队守卫，十字横下有一点！切勿错写为“戊(wù)”或“戌(xū)”！"
      }
    ]
  },
  {
    "id": "g7-1-012",
    "sequence": 12,
    "title": "潼关",
    "author": "谭嗣同",
    "dynasty": "清",
    "volume": "七年级上册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "终古高云簇此城，秋风吹散马蹄声。",
      "河流大野犹嫌束，山入潼关不解平。"
    ],
    "stanzaGroups": [
      [
        "终古高云簇此城，秋风吹散马蹄声。",
        "河流大野犹嫌束，山入潼关不解平。"
      ]
    ],
    "meaningSummary": "诗人写潼关山河的雄奇奔放，借山水表达冲决束缚、追求自由的少年意气。",
    "keyNotes": [
      {
        "term": "终古",
        "meaning": "久远"
      },
      {
        "term": "簇",
        "meaning": "簇拥"
      },
      {
        "term": "束",
        "meaning": "拘束"
      }
    ],
    "matchedTo53": false,
    "printedPage": 156,
    "famousQuote": "河流大野犹嫌束，山入潼关不解平。",
    "examFocus": "诗人写潼关山河的雄奇奔放，借山水表达冲决束缚、追求自由的少年意气。",
    "errorTrap": "“犹嫌束”的“嫌”为女字旁，嫌恶之意；“解”为懂得之意。",
    "maskedWords": [
      {
        "word": "终古",
        "trapReason": "久远"
      },
      {
        "word": "簇",
        "trapReason": "簇拥"
      },
      {
        "word": "束",
        "trapReason": "拘束"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "谭嗣同在《潼关》中展现冲决一切封建罗网羁绊、追求个性解放豪迈气概的千古名句是：“【       ，       。】”",
        "answer": "河流大野犹嫌束，山入潼关不解平。",
        "explanation": "借黄河与秦岭雄险磅礴的气势，喻指青年志士冲决一切束缚的变革决心。",
        "source": "2024·陕西中考真题",
        "category": "修身立志",
        "trapChar": "嫌",
        "trapWarning": "“犹嫌束”的“嫌”为女字旁，嫌恶之意；“解”为懂得之意。"
      }
    ]
  },
  {
    "id": "g7-2-001",
    "sequence": 1,
    "title": "木兰诗",
    "author": "北朝民歌",
    "dynasty": "南北朝",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "木兰诗",
    "contentType": "课内诗歌",
    "genre": "乐府民歌·叙事诗",
    "stanzas": [
      "唧唧复唧唧，木兰当户织。",
      "不闻机杼声，唯闻女叹息。",
      "问女何所思，问女何所忆。",
      "女亦无所思，女亦无所忆。",
      "昨夜见军帖，可汗大点兵。",
      "军书十二卷，卷卷有爷名。",
      "阿爷无大儿，木兰无长兄。",
      "愿为市鞍马，从此替爷征。",
      "东市买骏马，西市买鞍鞯。",
      "南市买辔头，北市买长鞭。",
      "旦辞爷娘去，暮宿黄河边。",
      "不闻爷娘唤女声，但闻黄河流水鸣溅溅。",
      "旦辞黄河去，暮至黑山头。",
      "不闻爷娘唤女声，但闻燕山胡骑鸣啾啾。",
      "万里赴戎机，关山度若飞。",
      "朔气传金柝，寒光照铁衣。",
      "将军百战死，壮士十年归。",
      "归来见天子，天子坐明堂。",
      "策勋十二转，赏赐百千强。",
      "可汗问所欲，木兰不用尚书郎。",
      "愿驰千里足，送儿还故乡。",
      "爷娘闻女来，出郭相扶将。",
      "阿姊闻妹来，当户理红妆。",
      "小弟闻姊来，磨刀霍霍向猪羊。",
      "开我东阁门，坐我西阁床。",
      "脱我战时袍，著我旧时裳。",
      "当窗理云鬓，对镜帖花黄。",
      "出门看火伴，火伴皆惊忙。",
      "同行十二年，不知木兰是女郎。",
      "雄兔脚扑朔，雌兔眼迷离。",
      "双兔傍地走，安能辨我是雄雌？"
    ],
    "stanzaGroups": [
      [
        "唧唧复唧唧，木兰当户织。",
        "不闻机杼声，唯闻女叹息。"
      ],
      [
        "问女何所思，问女何所忆。",
        "女亦无所思，女亦无所忆。",
        "昨夜见军帖，可汗大点兵。",
        "军书十二卷，卷卷有爷名。",
        "阿爷无大儿，木兰无长兄。",
        "愿为市鞍马，从此替爷征。"
      ],
      [
        "东市买骏马，西市买鞍鞯。",
        "南市买辔头，北市买长鞭。",
        "旦辞爷娘去，暮宿黄河边。",
        "不闻爷娘唤女声，但闻黄河流水鸣溅溅。",
        "旦辞黄河去，暮至黑山头。",
        "不闻爷娘唤女声，但闻燕山胡骑鸣啾啾。"
      ],
      [
        "万里赴戎机，关山度若飞。",
        "朔气传金柝，寒光照铁衣。",
        "将军百战死，壮士十年归。"
      ],
      [
        "归来见天子，天子坐明堂。",
        "策勋十二转，赏赐百千强。",
        "可汗问所欲，木兰不用尚书郎。",
        "愿驰千里足，送儿还故乡。"
      ],
      [
        "爷娘闻女来，出郭相扶将。",
        "阿姊闻妹来，当户理红妆。",
        "小弟闻姊来，磨刀霍霍向猪羊。",
        "开我东阁门，坐我西阁床。",
        "脱我战时袍，著我旧时裳。",
        "当窗理云鬓，对镜帖花黄。",
        "出门看火伴，火伴皆惊忙。",
        "同行十二年，不知木兰是女郎。"
      ],
      [
        "雄兔脚扑朔，雌兔眼迷离。",
        "双兔傍地走，安能辨我是雄雌？"
      ]
    ],
    "meaningSummary": "叙写木兰代父从军、征战归来和恢复女儿身的经历，赞美她的勇敢、孝心与机敏。",
    "keyNotes": [
      {
        "term": "市",
        "meaning": "买"
      },
      {
        "term": "戎机",
        "meaning": "战事"
      },
      {
        "term": "著",
        "meaning": "穿"
      },
      {
        "term": "帖花黄",
        "meaning": "贴上黄色的面饰"
      }
    ],
    "matchedTo53": true,
    "printedPage": 46,
    "famousQuote": "万里赴戎机，关山度若飞。朔气传金柝，寒光照铁衣。",
    "examFocus": "叙写木兰代父从军、征战归来和恢复女儿身的经历，赞美她的勇敢、孝心与机敏。",
    "errorTrap": "【全国中考最高频易错字】“金柝”的“柝(tuò)”是打更巡夜的梆木，为木字旁！切勿错写为拆除的“拆”！",
    "maskedWords": [
      {
        "word": "市",
        "trapReason": "买"
      },
      {
        "word": "戎机",
        "trapReason": "战事"
      },
      {
        "word": "著",
        "trapReason": "穿"
      },
      {
        "word": "帖花黄",
        "trapReason": "贴上黄色的面饰"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "《木兰诗》中极其凝练地概括木兰奔赴战场关山飞渡的矫健英姿，并烘托边塞行军极其艰苦苦寒军旅环境的对偶名联是：“【       ，       。       ，       。】”",
        "answer": "万里赴戎机，关山度若飞。朔气传金柝，寒光照铁衣。",
        "explanation": "前两句写行军奔赴之急迫迅捷，后两句借朔方寒气与更梆铜声烘托边关战争严酷。",
        "source": "2024·北京中考真题",
        "category": "写景意象",
        "trapChar": "柝",
        "trapWarning": "【全国中考最高频易错字】“金柝”的“柝(tuò)”是打更巡夜的梆木，为木字旁！切勿错写为拆除的“拆”！"
      },
      {
        "prompt": "写木兰征战十年立下赫赫战功，天子赏赐百千，她却辞官不就、只求早日重返故乡侍奉父母的质朴纯真名句是：“【       ，       ，       。】”",
        "answer": "木兰不用尚书郎，愿驰千里足，送儿还故乡。",
        "explanation": "不慕名利，淡泊高洁，表现了古代劳动人民儿女的朴实美好品质。",
        "source": "2023·河北中考真题",
        "category": "修身立志",
        "trapChar": "尚书郎",
        "trapWarning": "“驰千里足”的“驰”是马字旁飞驰之意。"
      },
      {
        "prompt": "成语“扑朔迷离”的出处，以兔子的奔跑隐喻女扮男装难以辨识雌雄的结尾诗句是：“【       ，       ；       ，       ？】”",
        "answer": "雄兔脚扑朔，雌兔眼迷离；双兔傍地走，安能辨我是雄雌？",
        "explanation": "巧妙借物喻人，风趣幽默，赞美木兰的智慧与乔装之妙。",
        "source": "2024·山东中考真题",
        "category": "生活情境",
        "trapChar": "辨",
        "trapWarning": "“辨别”的“辨”中间为言字旁；“傍”为单立人。"
      },
      {
        "prompt": "诗中运用互文修辞，极其凝练地概括战争旷日持久、战斗极其激烈残酷与将士九死一生的句子是：“【       ，       。】”",
        "answer": "将军百战死，壮士十年归。",
        "explanation": "互文手法，写尽将士舍生忘死保家卫国的悲壮惨烈。",
        "source": "2024·江苏苏州中考真题",
        "category": "家国情怀",
        "trapChar": "战",
        "trapWarning": "注意“百战死”与“十年归”互文见义。"
      }
    ]
  },
  {
    "id": "g7-2-002",
    "sequence": 2,
    "title": "竹里馆",
    "author": "王维",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言绝句",
    "stanzas": [
      "独坐幽篁里，弹琴复长啸。",
      "深林人不知，明月来相照。"
    ],
    "stanzaGroups": [
      [
        "独坐幽篁里，弹琴复长啸。",
        "深林人不知，明月来相照。"
      ]
    ],
    "meaningSummary": "诗人独坐幽深竹林，弹琴长啸，与明月相伴，写出宁静淡泊、自得其乐的心境。",
    "keyNotes": [
      {
        "term": "幽篁",
        "meaning": "幽深的竹林"
      },
      {
        "term": "长啸",
        "meaning": "撮口发出清越悠长的声音"
      }
    ],
    "matchedTo53": false,
    "printedPage": 93,
    "famousQuote": "深林人不知，明月来相照。",
    "examFocus": "诗人独坐幽深竹林，弹琴长啸，与明月相伴，写出宁静淡泊、自得其乐的心境。",
    "errorTrap": "“明月来相照”的“照”为四点底。",
    "maskedWords": [
      {
        "word": "幽篁",
        "trapReason": "幽深的竹林"
      },
      {
        "word": "长啸",
        "trapReason": "撮口发出清越悠长的声音"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "王维在《竹里馆》中写夜静人寂、只有一轮明月相伴知心的超脱空灵高雅心境的诗句是：“【       ，       。】”",
        "answer": "深林人不知，明月来相照。",
        "explanation": "超凡脱俗，以明月为知音，反映诗人安闲自得、宁静淡泊的心境。",
        "source": "2024·江苏苏州中考真题",
        "category": "修身立志",
        "trapChar": "照",
        "trapWarning": "“明月来相照”的“照”为四点底。"
      },
      {
        "prompt": "写诗人独自坐在幽深静谧竹林中悠闲弹琴、随性长啸的开篇诗句是：“【       ，       。】”",
        "answer": "独坐幽篁里，弹琴复长啸。",
        "explanation": "“幽篁”为深竹，“长啸”写舒畅快意，勾勒出隐者的高蹈情怀。",
        "source": "2023·广东深圳中考真题",
        "category": "生活情境",
        "trapChar": "篁",
        "trapWarning": "“幽篁”的“篁”为竹字头，皇字底。"
      }
    ]
  },
  {
    "id": "g7-2-003",
    "sequence": 3,
    "title": "春夜洛城闻笛",
    "author": "李白",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "谁家玉笛暗飞声，散入春风满洛城。",
      "此夜曲中闻折柳，何人不起故园情。"
    ],
    "stanzaGroups": [
      [
        "谁家玉笛暗飞声，散入春风满洛城。",
        "此夜曲中闻折柳，何人不起故园情。"
      ]
    ],
    "meaningSummary": "春夜笛声传遍洛阳，听到离别曲《折杨柳》，诗人由己及人地想到游子的故园之思。",
    "keyNotes": [
      {
        "term": "玉笛",
        "meaning": "对笛子的美称"
      },
      {
        "term": "折柳",
        "meaning": "指《折杨柳》曲，常寄托惜别之情"
      }
    ],
    "matchedTo53": false,
    "printedPage": 93,
    "famousQuote": "此夜曲中闻折柳，何人不起故园情。",
    "examFocus": "春夜笛声传遍洛阳，听到离别曲《折杨柳》，诗人由己及人地想到游子的故园之思。",
    "errorTrap": "“故园情”的“园”指家乡故里。",
    "maskedWords": [
      {
        "word": "玉笛",
        "trapReason": "对笛子的美称"
      },
      {
        "word": "折柳",
        "trapReason": "指《折杨柳》曲，常寄托惜别之情"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "李白在《春夜洛城闻笛》中听到哀婉的《折杨柳》古曲，瞬间触发客居洛阳游子无限乡愁的诗句是：“【       ，       。】”",
        "answer": "此夜曲中闻折柳，何人不起故园情。",
        "explanation": "“折柳”寓惜别与怀乡，笛声凄婉，唤醒全城游子共同的思乡情愫。",
        "source": "2024·安徽中考真题",
        "category": "生活情境",
        "trapChar": "园",
        "trapWarning": "“故园情”的“园”指家乡故里。"
      },
      {
        "prompt": "形容清脆玉笛声不知从哪户人家暗暗随春风飘荡而出、飞散在春夜洛阳城各个角落的诗句是：“【       ，       。】”",
        "answer": "谁家玉笛暗飞声，散入春风满洛城。",
        "explanation": "“暗飞声”写出春夜的寂静与笛声的悠扬穿透力。",
        "source": "2023·河南中考真题",
        "category": "写景意象",
        "trapChar": "洛",
        "trapWarning": "“洛城”的“洛”为三点水。"
      }
    ]
  },
  {
    "id": "g7-2-004",
    "sequence": 4,
    "title": "逢入京使",
    "author": "岑参",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "故园东望路漫漫，双袖龙钟泪不干。",
      "马上相逢无纸笔，凭君传语报平安。"
    ],
    "stanzaGroups": [
      [
        "故园东望路漫漫，双袖龙钟泪不干。",
        "马上相逢无纸笔，凭君传语报平安。"
      ]
    ],
    "meaningSummary": "诗人赴边途中遇到回京使者，思乡落泪却托人报平安，情感真挚而克制。",
    "keyNotes": [
      {
        "term": "龙钟",
        "meaning": "沾湿的样子"
      },
      {
        "term": "凭",
        "meaning": "烦劳、请托"
      },
      {
        "term": "传语",
        "meaning": "捎口信"
      }
    ],
    "matchedTo53": false,
    "printedPage": 94,
    "famousQuote": "马上相逢无纸笔，凭君传语报平安。",
    "examFocus": "诗人赴边途中遇到回京使者，思乡落泪却托人报平安，情感真挚而克制。",
    "errorTrap": "“凭君”的“凭”为任凭、托付之意。",
    "maskedWords": [
      {
        "word": "龙钟",
        "trapReason": "沾湿的样子"
      },
      {
        "word": "凭",
        "trapReason": "烦劳、请托"
      },
      {
        "word": "传语",
        "trapReason": "捎口信"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "岑参远赴西域边塞与返京使者在荒漠道中匆匆相遇，托人给长安家中报个平安的名句是：“【       ，       。】”",
        "answer": "马上相逢无纸笔，凭君传语报平安。",
        "explanation": "行色匆匆，语短情长，于朴实无华中道出深厚真挚的亲情。",
        "source": "2024·陕西中考真题",
        "category": "生活情境",
        "trapChar": "凭",
        "trapWarning": "“凭君”的“凭”为任凭、托付之意。"
      },
      {
        "prompt": "写诗人西行途中心中涌起漫漫离愁、泪眼迷离打湿衣袖的开篇名句是：“【       ，       。】”",
        "answer": "故园东望路漫漫，双袖龙钟泪不干。",
        "explanation": "“路漫漫”极言关山阻隔，“龙钟”写泪眼婆娑，真情毕露。",
        "source": "2023·湖北武汉中考真题",
        "category": "生活情境",
        "trapChar": "漫",
        "trapWarning": "“路漫漫”的“漫”为三点水。"
      }
    ]
  },
  {
    "id": "g7-2-005",
    "sequence": 5,
    "title": "晚春",
    "author": "韩愈",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "草树知春不久归，百般红紫斗芳菲。",
      "杨花榆荚无才思，惟解漫天作雪飞。"
    ],
    "stanzaGroups": [
      [
        "草树知春不久归，百般红紫斗芳菲。",
        "杨花榆荚无才思，惟解漫天作雪飞。"
      ]
    ],
    "meaningSummary": "诗人用拟人手法描写暮春百花争艳、杨花榆荚飞舞，表达对春天的留恋。",
    "keyNotes": [
      {
        "term": "榆荚",
        "meaning": "榆树的果实，俗称榆钱"
      },
      {
        "term": "惟解",
        "meaning": "只知道、只会"
      }
    ],
    "matchedTo53": false,
    "printedPage": 94,
    "famousQuote": "杨花榆荚无才思，惟解漫天作雪飞。",
    "examFocus": "诗人用拟人手法描写暮春百花争艳、杨花榆荚飞舞，表达对春天的留恋。",
    "errorTrap": "“榆荚”的“荚”为草字头，夹字底；“惟”为惟独。",
    "maskedWords": [
      {
        "word": "榆荚",
        "trapReason": "榆树的果实，俗称榆钱"
      },
      {
        "word": "惟解",
        "trapReason": "只知道、只会"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "韩愈在《晚春》中赋予杨花与榆钱以人的灵性，写它们随风狂舞如漫天飞雪争芳斗春景象的诗句是：“【       ，       。】”",
        "answer": "杨花榆荚无才思，惟解漫天作雪飞。",
        "explanation": "拟人手法，将无香无色的杨花榆钱化作飞雪争春，富有童趣与哲思。",
        "source": "2024·江西中考真题",
        "category": "写景意象",
        "trapChar": "荚",
        "trapWarning": "“榆荚”的“荚”为草字头，夹字底；“惟”为惟独。"
      }
    ]
  },
  {
    "id": "g7-2-006",
    "sequence": 6,
    "title": "登幽州台歌",
    "author": "陈子昂",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "古代诗歌五首",
    "contentType": "课内古诗",
    "genre": "古体诗",
    "stanzas": [
      "前不见古人，后不见来者。",
      "念天地之悠悠，独怆然而涕下！"
    ],
    "stanzaGroups": [
      [
        "前不见古人，后不见来者。",
        "念天地之悠悠，独怆然而涕下！"
      ]
    ],
    "meaningSummary": "诗人登台远望，感叹时间久远、天地辽阔而知音难遇，抒发孤独悲愤之情。",
    "keyNotes": [
      {
        "term": "悠悠",
        "meaning": "形容时间久远、空间广大"
      },
      {
        "term": "怆然",
        "meaning": "悲伤的样子"
      },
      {
        "term": "涕",
        "meaning": "眼泪"
      }
    ],
    "matchedTo53": true,
    "printedPage": 133,
    "famousQuote": "前不见古人，后不见来者。念天地之悠悠，独怆然而涕下！",
    "examFocus": "诗人登台远望，感叹时间久远、天地辽阔而知音难遇，抒发孤独悲愤之情。",
    "errorTrap": "【中考极高频错字】“独怆然而涕下”的“怆(chuàng)”为竖心旁，千万不要误写成走之旁或两点水！“涕”指眼泪。",
    "maskedWords": [
      {
        "word": "悠悠",
        "trapReason": "形容时间久远、空间广大"
      },
      {
        "word": "怆然",
        "trapReason": "悲伤的样子"
      },
      {
        "word": "涕",
        "trapReason": "眼泪"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "陈子昂俯仰古今感叹宇宙之浩渺而抒发贤才不遇、无尽孤寂悲愤的千古绝唱是：“【       ，       ！       ，       ！】”",
        "answer": "前不见古人，后不见来者。念天地之悠悠，独怆然而涕下！",
        "explanation": "将个人的悲剧置于无限广袤的宇宙时空之中，沉雄悲壮，感染力极强。",
        "source": "2024·北京中考真题",
        "category": "修身立志",
        "trapChar": "怆",
        "trapWarning": "【中考极高频错字】“独怆然而涕下”的“怆(chuàng)”为竖心旁，千万不要误写成走之旁或两点水！“涕”指眼泪。"
      }
    ]
  },
  {
    "id": "g7-2-007",
    "sequence": 7,
    "title": "望岳",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "古代诗歌五首",
    "contentType": "课内古诗",
    "genre": "五言古诗",
    "stanzas": [
      "岱宗夫如何？齐鲁青未了。",
      "造化钟神秀，阴阳割昏晓。",
      "荡胸生曾云，决眦入归鸟。",
      "会当凌绝顶，一览众山小。"
    ],
    "stanzaGroups": [
      [
        "岱宗夫如何？齐鲁青未了。",
        "造化钟神秀，阴阳割昏晓。"
      ],
      [
        "荡胸生曾云，决眦入归鸟。",
        "会当凌绝顶，一览众山小。"
      ]
    ],
    "meaningSummary": "诗人描写泰山雄伟神奇的景象，并以登顶愿望表达不畏艰难、勇于攀登的抱负。",
    "keyNotes": [
      {
        "term": "岱宗",
        "meaning": "泰山"
      },
      {
        "term": "钟",
        "meaning": "聚集"
      },
      {
        "term": "曾",
        "meaning": "同“层”"
      },
      {
        "term": "会当",
        "meaning": "终当、终要"
      }
    ],
    "matchedTo53": true,
    "printedPage": 134,
    "famousQuote": "会当凌绝顶，一览众山小。",
    "examFocus": "诗人描写泰山雄伟神奇的景象，并以登顶愿望表达不畏艰难、勇于攀登的抱负。",
    "errorTrap": "“凌绝顶”的“凌”是两点水，切勿写为冰冻的“冷”或“菱”。",
    "maskedWords": [
      {
        "word": "岱宗",
        "trapReason": "泰山"
      },
      {
        "word": "钟",
        "trapReason": "聚集"
      },
      {
        "word": "曾",
        "trapReason": "同“层”"
      },
      {
        "word": "会当",
        "trapReason": "终当、终要"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "杜甫在《望岳》中化用孔子“登泰山而小天下”，表达勇攀高峰、俯视一切困难卓越气概的千古名句是：“【       ，       。】”",
        "answer": "会当凌绝顶，一览众山小。",
        "explanation": "全诗的高潮与主旨，青年杜甫昂扬进取、敢于攀登人生顶峰的宏伟抱负。",
        "source": "2024·山东中考真题",
        "category": "修身立志",
        "trapChar": "凌",
        "trapWarning": "“凌绝顶”的“凌”是两点水，切勿写为冰冻的“冷”或“菱”。"
      },
      {
        "prompt": "诗人远望泰山神奇秀美，以崇山峻岭的神奇造化、一山割分阴阳晨昏的雄奇名联是：“【       ，       。】”",
        "answer": "造化钟神秀，阴阳割昏晓。",
        "explanation": "“钟”字将大自然拟人化，“割”字夸张写出泰山遮天蔽日的巍峨。",
        "source": "2023·河北中考真题",
        "category": "写景意象",
        "trapChar": "钟",
        "trapWarning": "“钟神秀”的“钟”是聚集之意，金字旁。"
      },
      {
        "prompt": "校训墙上勉励学子树立远大理想、不惧挫折勇攀科学文化高峰时，最常引用的杜甫名句是：“【       ，       。】”",
        "answer": "会当凌绝顶，一览众山小。",
        "explanation": "既是写景也是写志，具有普遍的人生启迪意义。",
        "source": "2024·江苏南京中考真题",
        "category": "生活情境",
        "trapChar": "览",
        "trapWarning": "“一览”的“览”切勿丢笔画。"
      }
    ]
  },
  {
    "id": "g7-2-008",
    "sequence": 8,
    "title": "登飞来峰",
    "author": "王安石",
    "dynasty": "北宋",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "古代诗歌五首",
    "contentType": "课内古诗",
    "genre": "七言绝句",
    "stanzas": [
      "飞来山上千寻塔，闻说鸡鸣见日升。",
      "不畏浮云遮望眼，自缘身在最高层。"
    ],
    "stanzaGroups": [
      [
        "飞来山上千寻塔，闻说鸡鸣见日升。",
        "不畏浮云遮望眼，自缘身在最高层。"
      ]
    ],
    "meaningSummary": "诗人登高望远，借“不畏浮云”表达远见卓识和坚定自信。",
    "keyNotes": [
      {
        "term": "千寻",
        "meaning": "极言塔高"
      },
      {
        "term": "缘",
        "meaning": "因为"
      },
      {
        "term": "浮云",
        "meaning": "既指眼前景物，也可比喻困难或障碍"
      }
    ],
    "matchedTo53": true,
    "printedPage": 134,
    "famousQuote": "不畏浮云遮望眼，自缘身在最高层。",
    "examFocus": "诗人登高望远，借“不畏浮云”表达远见卓识和坚定自信。",
    "errorTrap": "“自缘身在”的“缘”是因为之意，绞丝旁。",
    "maskedWords": [
      {
        "word": "千寻",
        "trapReason": "极言塔高"
      },
      {
        "word": "缘",
        "trapReason": "因为"
      },
      {
        "word": "浮云",
        "trapReason": "既指眼前景物，也可比喻困难或障碍"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "王安石借登山明志，蕴含“站得高才能看得远，只要站得最高就不惧一切奸邪与阻挠”辩证哲理的名联是：“【       ，       。】”",
        "answer": "不畏浮云遮望眼，自缘身在最高层。",
        "explanation": "不仅是登高写实，更是改革家拨云见日、坚持推行新法的大无畏政治魄力。",
        "source": "2024·浙江中考真题",
        "category": "哲理启迪",
        "trapChar": "缘",
        "trapWarning": "“自缘身在”的“缘”是因为之意，绞丝旁。"
      }
    ]
  },
  {
    "id": "g7-2-009",
    "sequence": 9,
    "title": "游山西村",
    "author": "陆游",
    "dynasty": "南宋",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "古代诗歌五首",
    "contentType": "课内古诗",
    "genre": "七言律诗",
    "stanzas": [
      "莫笑农家腊酒浑，丰年留客足鸡豚。",
      "山重水复疑无路，柳暗花明又一村。",
      "箫鼓追随春社近，衣冠简朴古风存。",
      "从今若许闲乘月，拄杖无时夜叩门。"
    ],
    "stanzaGroups": [
      [
        "莫笑农家腊酒浑，丰年留客足鸡豚。",
        "山重水复疑无路，柳暗花明又一村。"
      ],
      [
        "箫鼓追随春社近，衣冠简朴古风存。",
        "从今若许闲乘月，拄杖无时夜叩门。"
      ]
    ],
    "meaningSummary": "诗人记叙山村淳朴好客的风俗和优美风光，也写出困境中出现转机的哲理。",
    "keyNotes": [
      {
        "term": "腊酒",
        "meaning": "腊月酿制的酒"
      },
      {
        "term": "足鸡豚",
        "meaning": "备足鸡肉、猪肉"
      },
      {
        "term": "无时",
        "meaning": "没有固定时间，随时"
      }
    ],
    "matchedTo53": true,
    "printedPage": 135,
    "famousQuote": "山重水复疑无路，柳暗花明又一村。",
    "examFocus": "诗人记叙山村淳朴好客的风俗和优美风光，也写出困境中出现转机的哲理。",
    "errorTrap": "“柳暗花明”的“暗”为日字旁，绿树浓荫茂密之貌。",
    "maskedWords": [
      {
        "word": "腊酒",
        "trapReason": "腊月酿制的酒"
      },
      {
        "word": "足鸡豚",
        "trapReason": "备足鸡肉、猪肉"
      },
      {
        "word": "无时",
        "trapReason": "没有固定时间，随时"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "陆游在《游山西村》中描绘山路曲折峰回路转，后常用来比喻在重重困境中忽然出现转机希望的千古名联是：“【       ，       。】”",
        "answer": "山重水复疑无路，柳暗花明又一村。",
        "explanation": "写景中蕴含着深刻的人生哲理：困难逆境中往往孕育着新的希望。",
        "source": "2024·江苏中考真题",
        "category": "哲理启迪",
        "trapChar": "暗",
        "trapWarning": "“柳暗花明”的“暗”为日字旁，绿树浓荫茂密之貌。"
      },
      {
        "prompt": "描绘江南乡村丰收年景、淳朴热情的村民倾尽家中腊酒鸡肉盛情款待客人的开篇名联是：“【       ，       。】”",
        "answer": "莫笑农家腊酒浑，丰年留客足鸡豚。",
        "explanation": "勾勒出江南农村淳朴祥和的民风民俗。",
        "source": "2023·四川成都中考真题",
        "category": "生活情境",
        "trapChar": "豚",
        "trapWarning": "“足鸡豚”的“豚”指小猪，月字旁加豕。"
      }
    ]
  },
  {
    "id": "g7-2-010",
    "sequence": 10,
    "title": "己亥杂诗（其五）",
    "author": "龚自珍",
    "dynasty": "清",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "古代诗歌五首",
    "contentType": "课内古诗",
    "genre": "七言绝句",
    "stanzas": [
      "浩荡离愁白日斜，吟鞭东指即天涯。",
      "落红不是无情物，化作春泥更护花。"
    ],
    "stanzaGroups": [
      [
        "浩荡离愁白日斜，吟鞭东指即天涯。",
        "落红不是无情物，化作春泥更护花。"
      ]
    ],
    "meaningSummary": "诗人辞官离京时心怀离愁，却表示即使离开官场仍愿为国家和社会尽力。",
    "keyNotes": [
      {
        "term": "吟鞭",
        "meaning": "诗人的马鞭"
      },
      {
        "term": "落红",
        "meaning": "落花，诗中寄托奉献之情"
      }
    ],
    "matchedTo53": true,
    "printedPage": 135,
    "famousQuote": "落红不是无情物，化作春泥更护花。",
    "examFocus": "诗人辞官离京时心怀离愁，却表示即使离开官场仍愿为国家和社会尽力。",
    "errorTrap": "“落红”指飘落的花瓣；“化作”切勿写为“画作”。",
    "maskedWords": [
      {
        "word": "吟鞭",
        "trapReason": "诗人的马鞭"
      },
      {
        "word": "落红",
        "trapReason": "落花，诗中寄托奉献之情"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "龚自珍以落花为喻，表明自己虽辞官离京归乡却依然心系培育人才、愿为国家改革奉献余热的名句是：“【       ，       。】”",
        "answer": "落红不是无情物，化作春泥更护花。",
        "explanation": "“落红”暗喻自身虽离开朝廷，“护花”体现无私奉献的献身精神。",
        "source": "2024·北京中考真题",
        "category": "家国情怀",
        "trapChar": "落红",
        "trapWarning": "“落红”指飘落的花瓣；“化作”切勿写为“画作”。"
      }
    ]
  },
  {
    "id": "g7-2-011",
    "sequence": 11,
    "title": "泊秦淮",
    "author": "杜牧",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "烟笼寒水月笼沙，夜泊秦淮近酒家。",
      "商女不知亡国恨，隔江犹唱后庭花。"
    ],
    "stanzaGroups": [
      [
        "烟笼寒水月笼沙，夜泊秦淮近酒家。",
        "商女不知亡国恨，隔江犹唱后庭花。"
      ]
    ],
    "meaningSummary": "诗人夜泊秦淮，借歌女唱亡国之音，委婉批评沉溺享乐、漠视国事的统治者。",
    "keyNotes": [
      {
        "term": "商女",
        "meaning": "歌女"
      },
      {
        "term": "后庭花",
        "meaning": "《玉树后庭花》的简称，后世常称亡国之音"
      }
    ],
    "matchedTo53": true,
    "printedPage": 174,
    "famousQuote": "商女不知亡国恨，隔江犹唱后庭花。",
    "examFocus": "诗人夜泊秦淮，借歌女唱亡国之音，委婉批评沉溺享乐、漠视国事的统治者。",
    "errorTrap": "“隔江犹唱”的“犹”为反犬旁。",
    "maskedWords": [
      {
        "word": "商女",
        "trapReason": "歌女"
      },
      {
        "word": "后庭花",
        "trapReason": "《玉树后庭花》的简称，后世常称亡国之音"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "杜牧夜泊秦淮河，借歌女讽刺晚唐统治阶级纸醉金迷、不顾国家存亡安危的千古绝唱是：“【       ，       。】”",
        "answer": "商女不知亡国恨，隔江犹唱后庭花。",
        "explanation": "借古讽今，曲笔写出达官贵族在国破边缘依旧荒淫宴乐的现实，极具批判力度。",
        "source": "2024·江苏南京中考真题",
        "category": "家国情怀",
        "trapChar": "隔",
        "trapWarning": "“隔江犹唱”的“犹”为反犬旁。"
      }
    ]
  },
  {
    "id": "g7-2-012",
    "sequence": 12,
    "title": "贾生",
    "author": "李商隐",
    "dynasty": "唐",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "宣室求贤访逐臣，贾生才调更无伦。",
      "可怜夜半虚前席，不问苍生问鬼神。"
    ],
    "stanzaGroups": [
      [
        "宣室求贤访逐臣，贾生才调更无伦。",
        "可怜夜半虚前席，不问苍生问鬼神。"
      ]
    ],
    "meaningSummary": "诗人借汉文帝夜问贾谊却只问鬼神，讽刺当时统治者不能真正关心民生。",
    "keyNotes": [
      {
        "term": "宣室",
        "meaning": "汉代宫殿中的正室"
      },
      {
        "term": "前席",
        "meaning": "向前移动座席，表示倾听"
      },
      {
        "term": "苍生",
        "meaning": "百姓"
      }
    ],
    "matchedTo53": false,
    "printedPage": 174,
    "famousQuote": "宣室求贤访逐臣，贾生才调更无伦。可怜夜半虚前席，不问苍生问鬼神。",
    "examFocus": "诗人借汉文帝夜问贾谊却只问鬼神，讽刺当时统治者不能真正关心民生。",
    "errorTrap": "重点掌握：“宣室”（汉代宫殿中的正室）的书写与释义。",
    "maskedWords": [
      {
        "word": "宣室",
        "trapReason": "汉代宫殿中的正室"
      },
      {
        "word": "前席",
        "trapReason": "向前移动座席，表示倾听"
      },
      {
        "word": "苍生",
        "trapReason": "百姓"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《贾生》中，作者李商隐表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "宣室求贤访逐臣，贾生才调更无伦。",
        "explanation": "诗人借汉文帝夜问贾谊却只问鬼神，讽刺当时统治者不能真正关心民生。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g7-2-013",
    "sequence": 13,
    "title": "过松源晨炊漆公店（其五）",
    "author": "杨万里",
    "dynasty": "南宋",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "莫言下岭便无难，赚得行人错喜欢。",
      "政入万山围子里，一山放出一山拦。"
    ],
    "stanzaGroups": [
      [
        "莫言下岭便无难，赚得行人错喜欢。",
        "政入万山围子里，一山放出一山拦。"
      ]
    ],
    "meaningSummary": "诗人写山路起伏提醒行人不要因眼前顺利而放松，蕴含做事须看长远的道理。",
    "keyNotes": [
      {
        "term": "赚得",
        "meaning": "骗得"
      },
      {
        "term": "错喜欢",
        "meaning": "空欢喜"
      },
      {
        "term": "政",
        "meaning": "同“正”"
      }
    ],
    "matchedTo53": false,
    "printedPage": 175,
    "famousQuote": "莫言下岭便无难，赚得行人错喜欢。政入万山围子里，一山放出一山拦。",
    "examFocus": "诗人写山路起伏提醒行人不要因眼前顺利而放松，蕴含做事须看长远的道理。",
    "errorTrap": "重点掌握：“赚得”（骗得）的书写与释义。",
    "maskedWords": [
      {
        "word": "赚得",
        "trapReason": "骗得"
      },
      {
        "word": "错喜欢",
        "trapReason": "空欢喜"
      },
      {
        "word": "政",
        "trapReason": "同“正”"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《过松源晨炊漆公店（其五）》中，作者杨万里表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "莫言下岭便无难，赚得行人错喜欢。",
        "explanation": "诗人写山路起伏提醒行人不要因眼前顺利而放松，蕴含做事须看长远的道理。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g7-2-014",
    "sequence": 14,
    "title": "约客",
    "author": "赵师秀",
    "dynasty": "南宋",
    "volume": "七年级下册",
    "grade": "初一",
    "gradeLabel": "七年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言绝句",
    "stanzas": [
      "黄梅时节家家雨，青草池塘处处蛙。",
      "有约不来过夜半，闲敲棋子落灯花。"
    ],
    "stanzaGroups": [
      [
        "黄梅时节家家雨，青草池塘处处蛙。",
        "有约不来过夜半，闲敲棋子落灯花。"
      ]
    ],
    "meaningSummary": "诗人以梅雨、蛙声和等待友人的细节，写出夜深人静时略带寂寞的闲情。",
    "keyNotes": [
      {
        "term": "黄梅时节",
        "meaning": "夏初梅雨季节"
      },
      {
        "term": "灯花",
        "meaning": "灯芯燃烧后结成的花状物"
      }
    ],
    "matchedTo53": false,
    "printedPage": 175,
    "famousQuote": "黄梅时节家家雨，青草池塘处处蛙。有约不来过夜半，闲敲棋子落灯花。",
    "examFocus": "诗人以梅雨、蛙声和等待友人的细节，写出夜深人静时略带寂寞的闲情。",
    "errorTrap": "重点掌握：“黄梅时节”（夏初梅雨季节）的书写与释义。",
    "maskedWords": [
      {
        "word": "黄梅时节",
        "trapReason": "夏初梅雨季节"
      },
      {
        "word": "灯花",
        "trapReason": "灯芯燃烧后结成的花状物"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《约客》中，作者赵师秀表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "黄梅时节家家雨，青草池塘处处蛙。",
        "explanation": "诗人以梅雨、蛙声和等待友人的细节，写出夜深人静时略带寂寞的闲情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-001",
    "sequence": 1,
    "title": "野望",
    "author": "王绩",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "唐诗五首",
    "contentType": "课内古诗",
    "genre": "五言律诗",
    "stanzas": [
      "东皋薄暮望，徙倚欲何依。",
      "树树皆秋色，山山唯落晖。",
      "牧人驱犊返，猎马带禽归。",
      "相顾无相识，长歌怀采薇。"
    ],
    "stanzaGroups": [
      [
        "东皋薄暮望，徙倚欲何依。",
        "树树皆秋色，山山唯落晖。"
      ],
      [
        "牧人驱犊返，猎马带禽归。",
        "相顾无相识，长歌怀采薇。"
      ]
    ],
    "meaningSummary": "诗人薄暮登高远望，面对秋景和归人反衬自己的孤独，借采薇典故表达隐逸之思。",
    "keyNotes": [
      {
        "term": "东皋",
        "meaning": "作者隐居之地"
      },
      {
        "term": "徙倚",
        "meaning": "徘徊"
      },
      {
        "term": "采薇",
        "meaning": "借指隐居不仕"
      }
    ],
    "matchedTo53": false,
    "printedPage": 69,
    "famousQuote": "东皋薄暮望，徙倚欲何依。树树皆秋色，山山唯落晖。",
    "examFocus": "诗人薄暮登高远望，面对秋景和归人反衬自己的孤独，借采薇典故表达隐逸之思。",
    "errorTrap": "重点掌握：“东皋”（作者隐居之地）的书写与释义。",
    "maskedWords": [
      {
        "word": "东皋",
        "trapReason": "作者隐居之地"
      },
      {
        "word": "徙倚",
        "trapReason": "徘徊"
      },
      {
        "word": "采薇",
        "trapReason": "借指隐居不仕"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《野望》中，作者王绩表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "东皋薄暮望，徙倚欲何依。",
        "explanation": "诗人薄暮登高远望，面对秋景和归人反衬自己的孤独，借采薇典故表达隐逸之思。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-002",
    "sequence": 2,
    "title": "黄鹤楼",
    "author": "崔颢",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "唐诗五首",
    "contentType": "课内古诗",
    "genre": "七言律诗",
    "stanzas": [
      "昔人已乘黄鹤去，此地空余黄鹤楼。",
      "黄鹤一去不复返，白云千载空悠悠。",
      "晴川历历汉阳树，芳草萋萋鹦鹉洲。",
      "日暮乡关何处是？烟波江上使人愁。"
    ],
    "stanzaGroups": [
      [
        "昔人已乘黄鹤去，此地空余黄鹤楼。",
        "黄鹤一去不复返，白云千载空悠悠。"
      ],
      [
        "晴川历历汉阳树，芳草萋萋鹦鹉洲。",
        "日暮乡关何处是？烟波江上使人愁。"
      ]
    ],
    "meaningSummary": "诗人由黄鹤楼传说转向眼前江景，抒发日暮时浓重的思乡之愁。",
    "keyNotes": [
      {
        "term": "历历",
        "meaning": "分明的样子"
      },
      {
        "term": "萋萋",
        "meaning": "草木茂盛的样子"
      },
      {
        "term": "乡关",
        "meaning": "故乡"
      }
    ],
    "matchedTo53": true,
    "printedPage": 70,
    "famousQuote": "晴川历历汉阳树，芳草萋萋鹦鹉洲。日暮乡关何处是？烟波江上使人愁。",
    "examFocus": "诗人由黄鹤楼传说转向眼前江景，抒发日暮时浓重的思乡之愁。",
    "errorTrap": "重点掌握：“历历”（分明的样子）的书写与释义。",
    "maskedWords": [
      {
        "word": "历历",
        "trapReason": "分明的样子"
      },
      {
        "word": "萋萋",
        "trapReason": "草木茂盛的样子"
      },
      {
        "word": "乡关",
        "trapReason": "故乡"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《黄鹤楼》中，作者崔颢表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "晴川历历汉阳树，芳草萋萋鹦鹉洲。",
        "explanation": "诗人由黄鹤楼传说转向眼前江景，抒发日暮时浓重的思乡之愁。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-003",
    "sequence": 3,
    "title": "使至塞上",
    "author": "王维",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "唐诗五首",
    "contentType": "课内古诗",
    "genre": "五言律诗",
    "stanzas": [
      "单车欲问边，属国过居延。",
      "征蓬出汉塞，归雁入胡天。",
      "大漠孤烟直，长河落日圆。",
      "萧关逢候骑，都护在燕然。"
    ],
    "stanzaGroups": [
      [
        "单车欲问边，属国过居延。",
        "征蓬出汉塞，归雁入胡天。"
      ],
      [
        "大漠孤烟直，长河落日圆。",
        "萧关逢候骑，都护在燕然。"
      ]
    ],
    "meaningSummary": "诗人出使边塞，写沿途所见的苍茫景色，也流露出漂泊之感和对边地军情的关注。",
    "keyNotes": [
      {
        "term": "问边",
        "meaning": "慰问边关守军"
      },
      {
        "term": "征蓬",
        "meaning": "飘飞的蓬草，常比喻远行之人"
      },
      {
        "term": "长河",
        "meaning": "黄河"
      }
    ],
    "matchedTo53": true,
    "printedPage": 70,
    "famousQuote": "大漠孤烟直，长河落日圆。",
    "examFocus": "诗人出使边塞，写沿途所见的苍茫景色，也流露出漂泊之感和对边地军情的关注。",
    "errorTrap": "重点掌握：“问边”（慰问边关守军）的书写与释义。",
    "maskedWords": [
      {
        "word": "问边",
        "trapReason": "慰问边关守军"
      },
      {
        "word": "征蓬",
        "trapReason": "飘飞的蓬草，常比喻远行之人"
      },
      {
        "word": "长河",
        "trapReason": "黄河"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《使至塞上》中，作者王维表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "大漠孤烟直，长河落日圆。",
        "explanation": "诗人出使边塞，写沿途所见的苍茫景色，也流露出漂泊之感和对边地军情的关注。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-004",
    "sequence": 4,
    "title": "渡荆门送别",
    "author": "李白",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "唐诗五首",
    "contentType": "课内古诗",
    "genre": "五言律诗",
    "stanzas": [
      "渡远荆门外，来从楚国游。",
      "山随平野尽，江入大荒流。",
      "月下飞天镜，云生结海楼。",
      "仍怜故乡水，万里送行舟。"
    ],
    "stanzaGroups": [
      [
        "渡远荆门外，来从楚国游。",
        "山随平野尽，江入大荒流。"
      ],
      [
        "月下飞天镜，云生结海楼。",
        "仍怜故乡水，万里送行舟。"
      ]
    ],
    "meaningSummary": "诗人初次出蜀远游，描绘江行途中景色的变化，并以故乡水抒写眷恋之情。",
    "keyNotes": [
      {
        "term": "从",
        "meaning": "往"
      },
      {
        "term": "大荒",
        "meaning": "辽远无际的原野"
      },
      {
        "term": "怜",
        "meaning": "喜爱"
      }
    ],
    "matchedTo53": false,
    "printedPage": 71,
    "famousQuote": "渡远荆门外，来从楚国游。山随平野尽，江入大荒流。",
    "examFocus": "诗人初次出蜀远游，描绘江行途中景色的变化，并以故乡水抒写眷恋之情。",
    "errorTrap": "重点掌握：“从”（往）的书写与释义。",
    "maskedWords": [
      {
        "word": "从",
        "trapReason": "往"
      },
      {
        "word": "大荒",
        "trapReason": "辽远无际的原野"
      },
      {
        "word": "怜",
        "trapReason": "喜爱"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《渡荆门送别》中，作者李白表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "渡远荆门外，来从楚国游。",
        "explanation": "诗人初次出蜀远游，描绘江行途中景色的变化，并以故乡水抒写眷恋之情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-005",
    "sequence": 5,
    "title": "钱塘湖春行",
    "author": "白居易",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "唐诗五首",
    "contentType": "课内古诗",
    "genre": "七言律诗",
    "stanzas": [
      "孤山寺北贾亭西，水面初平云脚低。",
      "几处早莺争暖树，谁家新燕啄春泥。",
      "乱花渐欲迷人眼，浅草才能没马蹄。",
      "最爱湖东行不足，绿杨阴里白沙堤。"
    ],
    "stanzaGroups": [
      [
        "孤山寺北贾亭西，水面初平云脚低。",
        "几处早莺争暖树，谁家新燕啄春泥。"
      ],
      [
        "乱花渐欲迷人眼，浅草才能没马蹄。",
        "最爱湖东行不足，绿杨阴里白沙堤。"
      ]
    ],
    "meaningSummary": "诗人沿西湖春行，抓住早莺、新燕、浅草等初春景物，表达对湖上春景的喜爱。",
    "keyNotes": [
      {
        "term": "水面初平",
        "meaning": "春水初涨，水面刚与湖岸齐平"
      },
      {
        "term": "云脚",
        "meaning": "低垂的云"
      },
      {
        "term": "没马蹄",
        "meaning": "刚能遮住马蹄"
      }
    ],
    "matchedTo53": true,
    "printedPage": 71,
    "famousQuote": "几处早莺争暖树，谁家新燕啄春泥。乱花渐欲迷人眼，浅草才能没马蹄。",
    "examFocus": "诗人沿西湖春行，抓住早莺、新燕、浅草等初春景物，表达对湖上春景的喜爱。",
    "errorTrap": "重点掌握：“水面初平”（春水初涨，水面刚与湖岸齐平）的书写与释义。",
    "maskedWords": [
      {
        "word": "水面初平",
        "trapReason": "春水初涨，水面刚与湖岸齐平"
      },
      {
        "word": "云脚",
        "trapReason": "低垂的云"
      },
      {
        "word": "没马蹄",
        "trapReason": "刚能遮住马蹄"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《钱塘湖春行》中，作者白居易表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "几处早莺争暖树，谁家新燕啄春泥。",
        "explanation": "诗人沿西湖春行，抓住早莺、新燕、浅草等初春景物，表达对湖上春景的喜爱。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-006",
    "sequence": 6,
    "title": "庭中有奇树",
    "author": "《古诗十九首》",
    "dynasty": "东汉",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言古诗",
    "stanzas": [
      "庭中有奇树，绿叶发华滋。",
      "攀条折其荣，将以遗所思。",
      "馨香盈怀袖，路远莫致之。",
      "此物何足贵？但感别经时。"
    ],
    "stanzaGroups": [
      [
        "庭中有奇树，绿叶发华滋。",
        "攀条折其荣，将以遗所思。"
      ],
      [
        "馨香盈怀袖，路远莫致之。",
        "此物何足贵？但感别经时。"
      ]
    ],
    "meaningSummary": "女子折花欲寄远人却无法送达，借花香盈袖写出离别已久、思念难寄的惆怅。",
    "keyNotes": [
      {
        "term": "华",
        "meaning": "花"
      },
      {
        "term": "遗",
        "meaning": "赠送"
      },
      {
        "term": "经时",
        "meaning": "历时很久"
      }
    ],
    "matchedTo53": false,
    "printedPage": 81,
    "famousQuote": "庭中有奇树，绿叶发华滋。攀条折其荣，将以遗所思。",
    "examFocus": "女子折花欲寄远人却无法送达，借花香盈袖写出离别已久、思念难寄的惆怅。",
    "errorTrap": "重点掌握：“华”（花）的书写与释义。",
    "maskedWords": [
      {
        "word": "华",
        "trapReason": "花"
      },
      {
        "word": "遗",
        "trapReason": "赠送"
      },
      {
        "word": "经时",
        "trapReason": "历时很久"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《庭中有奇树》中，作者《古诗十九首》表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "庭中有奇树，绿叶发华滋。",
        "explanation": "女子折花欲寄远人却无法送达，借花香盈袖写出离别已久、思念难寄的惆怅。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-007",
    "sequence": 7,
    "title": "龟虽寿",
    "author": "曹操",
    "dynasty": "东汉末",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "乐府诗",
    "stanzas": [
      "神龟虽寿，犹有竟时；",
      "腾蛇乘雾，终为土灰。",
      "老骥伏枥，志在千里；",
      "烈士暮年，壮心不已。",
      "盈缩之期，不但在天；",
      "养怡之福，可得永年。",
      "幸甚至哉，歌以咏志。"
    ],
    "stanzaGroups": [
      [
        "神龟虽寿，犹有竟时；",
        "腾蛇乘雾，终为土灰。"
      ],
      [
        "老骥伏枥，志在千里；",
        "烈士暮年，壮心不已。"
      ],
      [
        "盈缩之期，不但在天；",
        "养怡之福，可得永年。"
      ],
      [
        "幸甚至哉，歌以咏志。"
      ]
    ],
    "meaningSummary": "诗人先写生命终有尽头，再以老骥自喻，表达老当益壮、积极进取的精神。",
    "keyNotes": [
      {
        "term": "竟",
        "meaning": "终结"
      },
      {
        "term": "伏枥",
        "meaning": "伏在马槽边"
      },
      {
        "term": "养怡",
        "meaning": "调养身心"
      }
    ],
    "matchedTo53": false,
    "printedPage": 81,
    "famousQuote": "神龟虽寿，犹有竟时；腾蛇乘雾，终为土灰。",
    "examFocus": "诗人先写生命终有尽头，再以老骥自喻，表达老当益壮、积极进取的精神。",
    "errorTrap": "重点掌握：“竟”（终结）的书写与释义。",
    "maskedWords": [
      {
        "word": "竟",
        "trapReason": "终结"
      },
      {
        "word": "伏枥",
        "trapReason": "伏在马槽边"
      },
      {
        "word": "养怡",
        "trapReason": "调养身心"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《龟虽寿》中，作者曹操表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "神龟虽寿，犹有竟时；腾蛇乘雾，终为土灰。",
        "explanation": "诗人先写生命终有尽头，再以老骥自喻，表达老当益壮、积极进取的精神。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-008",
    "sequence": 8,
    "title": "赠从弟（其二）",
    "author": "刘桢",
    "dynasty": "东汉末",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言古诗",
    "stanzas": [
      "亭亭山上松，瑟瑟谷中风。",
      "风声一何盛，松枝一何劲！",
      "冰霜正惨凄，终岁常端正。",
      "岂不罹凝寒？松柏有本性。"
    ],
    "stanzaGroups": [
      [
        "亭亭山上松，瑟瑟谷中风。",
        "风声一何盛，松枝一何劲！"
      ],
      [
        "冰霜正惨凄，终岁常端正。",
        "岂不罹凝寒？松柏有本性。"
      ]
    ],
    "meaningSummary": "诗人以风雪中挺立的松柏比喻坚贞不屈的品格，并借此勉励堂弟。",
    "keyNotes": [
      {
        "term": "亭亭",
        "meaning": "挺拔的样子"
      },
      {
        "term": "一何",
        "meaning": "多么"
      },
      {
        "term": "罹凝寒",
        "meaning": "遭受严寒"
      }
    ],
    "matchedTo53": false,
    "printedPage": 82,
    "famousQuote": "亭亭山上松，瑟瑟谷中风。风声一何盛，松枝一何劲！",
    "examFocus": "诗人以风雪中挺立的松柏比喻坚贞不屈的品格，并借此勉励堂弟。",
    "errorTrap": "重点掌握：“亭亭”（挺拔的样子）的书写与释义。",
    "maskedWords": [
      {
        "word": "亭亭",
        "trapReason": "挺拔的样子"
      },
      {
        "word": "一何",
        "trapReason": "多么"
      },
      {
        "word": "罹凝寒",
        "trapReason": "遭受严寒"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《赠从弟（其二）》中，作者刘桢表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "亭亭山上松，瑟瑟谷中风。",
        "explanation": "诗人以风雪中挺立的松柏比喻坚贞不屈的品格，并借此勉励堂弟。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-009",
    "sequence": 9,
    "title": "梁甫行",
    "author": "曹植",
    "dynasty": "三国魏",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "乐府古题",
    "stanzas": [
      "八方各异气，千里殊风雨。",
      "剧哉边海民，寄身于草野。",
      "妻子象禽兽，行止依林阻。",
      "柴门何萧条，狐兔翔我宇。"
    ],
    "stanzaGroups": [
      [
        "八方各异气，千里殊风雨。",
        "剧哉边海民，寄身于草野。"
      ],
      [
        "妻子象禽兽，行止依林阻。",
        "柴门何萧条，狐兔翔我宇。"
      ]
    ],
    "meaningSummary": "诗人描写边海百姓居无定所、生活艰苦的境况，表达对百姓苦难的同情。",
    "keyNotes": [
      {
        "term": "剧",
        "meaning": "艰难"
      },
      {
        "term": "妻子",
        "meaning": "妻子儿女"
      },
      {
        "term": "林阻",
        "meaning": "山林险阻之地"
      }
    ],
    "matchedTo53": false,
    "printedPage": 82,
    "famousQuote": "八方各异气，千里殊风雨。剧哉边海民，寄身于草野。",
    "examFocus": "诗人描写边海百姓居无定所、生活艰苦的境况，表达对百姓苦难的同情。",
    "errorTrap": "重点掌握：“剧”（艰难）的书写与释义。",
    "maskedWords": [
      {
        "word": "剧",
        "trapReason": "艰难"
      },
      {
        "word": "妻子",
        "trapReason": "妻子儿女"
      },
      {
        "word": "林阻",
        "trapReason": "山林险阻之地"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《梁甫行》中，作者曹植表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "八方各异气，千里殊风雨。",
        "explanation": "诗人描写边海百姓居无定所、生活艰苦的境况，表达对百姓苦难的同情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-010",
    "sequence": 10,
    "title": "饮酒（其五）",
    "author": "陶渊明",
    "dynasty": "东晋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "诗词五首",
    "contentType": "课内古诗",
    "genre": "五言古诗",
    "stanzas": [
      "结庐在人境，而无车马喧。",
      "问君何能尔？心远地自偏。",
      "采菊东篱下，悠然见南山。",
      "山气日夕佳，飞鸟相与还。",
      "此中有真意，欲辨已忘言。"
    ],
    "stanzaGroups": [
      [
        "结庐在人境，而无车马喧。",
        "问君何能尔？心远地自偏。"
      ],
      [
        "采菊东篱下，悠然见南山。",
        "山气日夕佳，飞鸟相与还。"
      ],
      [
        "此中有真意，欲辨已忘言。"
      ]
    ],
    "meaningSummary": "诗人写归隐生活中的闲适与自然之美，表达心境超脱、领悟人生真意的感受。",
    "keyNotes": [
      {
        "term": "结庐",
        "meaning": "建造房舍"
      },
      {
        "term": "尔",
        "meaning": "如此、这样"
      },
      {
        "term": "忘言",
        "meaning": "心中领会真意，不必用语言表达"
      }
    ],
    "matchedTo53": true,
    "printedPage": 154,
    "famousQuote": "结庐在人境，而无车马喧。问君何能尔？心远地自偏。",
    "examFocus": "诗人写归隐生活中的闲适与自然之美，表达心境超脱、领悟人生真意的感受。",
    "errorTrap": "重点掌握：“结庐”（建造房舍）的书写与释义。",
    "maskedWords": [
      {
        "word": "结庐",
        "trapReason": "建造房舍"
      },
      {
        "word": "尔",
        "trapReason": "如此、这样"
      },
      {
        "word": "忘言",
        "trapReason": "心中领会真意，不必用语言表达"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《饮酒（其五）》中，作者陶渊明表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "结庐在人境，而无车马喧。",
        "explanation": "诗人写归隐生活中的闲适与自然之美，表达心境超脱、领悟人生真意的感受。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-011",
    "sequence": 11,
    "title": "春望",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "诗词五首",
    "contentType": "课内古诗",
    "genre": "五言律诗",
    "stanzas": [
      "国破山河在，城春草木深。",
      "感时花溅泪，恨别鸟惊心。",
      "烽火连三月，家书抵万金。",
      "白头搔更短，浑欲不胜簪。"
    ],
    "stanzaGroups": [
      [
        "国破山河在，城春草木深。",
        "感时花溅泪，恨别鸟惊心。"
      ],
      [
        "烽火连三月，家书抵万金。",
        "白头搔更短，浑欲不胜簪。"
      ]
    ],
    "meaningSummary": "诗人困居长安，见春城破败而忧时伤别，盼望家书并感叹自身衰老。",
    "keyNotes": [
      {
        "term": "烽火",
        "meaning": "这里借指战事"
      },
      {
        "term": "浑",
        "meaning": "简直"
      },
      {
        "term": "不胜簪",
        "meaning": "插不住簪子"
      }
    ],
    "matchedTo53": true,
    "printedPage": 96,
    "famousQuote": "国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。烽火连三月，家书抵万金。",
    "examFocus": "诗人困居长安，见春城破败而忧时伤别，盼望家书并感叹自身衰老。",
    "errorTrap": "重点掌握：“烽火”（这里借指战事）的书写与释义。",
    "maskedWords": [
      {
        "word": "烽火",
        "trapReason": "这里借指战事"
      },
      {
        "word": "浑",
        "trapReason": "简直"
      },
      {
        "word": "不胜簪",
        "trapReason": "插不住簪子"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《春望》中，作者杜甫表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "国破山河在，城春草木深。",
        "explanation": "诗人困居长安，见春城破败而忧时伤别，盼望家书并感叹自身衰老。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-012",
    "sequence": 12,
    "title": "雁门太守行",
    "author": "李贺",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "诗词五首",
    "contentType": "课内古诗",
    "genre": "七言古诗",
    "stanzas": [
      "黑云压城城欲摧，甲光向日金鳞开。",
      "角声满天秋色里，塞上燕脂凝夜紫。",
      "半卷红旗临易水，霜重鼓寒声不起。",
      "报君黄金台上意，提携玉龙为君死。"
    ],
    "stanzaGroups": [
      [
        "黑云压城城欲摧，甲光向日金鳞开。",
        "角声满天秋色里，塞上燕脂凝夜紫。"
      ],
      [
        "半卷红旗临易水，霜重鼓寒声不起。",
        "报君黄金台上意，提携玉龙为君死。"
      ]
    ],
    "meaningSummary": "诗人借浓重色彩和紧张战场场景描写守城将士，赞颂他们报效朝廷、慷慨赴战的决心。",
    "keyNotes": [
      {
        "term": "城欲摧",
        "meaning": "城墙仿佛将要坍塌"
      },
      {
        "term": "易水",
        "meaning": "借荆轲易水送别典故表达悲壮"
      },
      {
        "term": "玉龙",
        "meaning": "宝剑"
      }
    ],
    "matchedTo53": true,
    "printedPage": 155,
    "famousQuote": "黑云压城城欲摧，甲光向日金鳞开。",
    "examFocus": "诗人借浓重色彩和紧张战场场景描写守城将士，赞颂他们报效朝廷、慷慨赴战的决心。",
    "errorTrap": "重点掌握：“城欲摧”（城墙仿佛将要坍塌）的书写与释义。",
    "maskedWords": [
      {
        "word": "城欲摧",
        "trapReason": "城墙仿佛将要坍塌"
      },
      {
        "word": "易水",
        "trapReason": "借荆轲易水送别典故表达悲壮"
      },
      {
        "word": "玉龙",
        "trapReason": "宝剑"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《雁门太守行》中，作者李贺表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "黑云压城城欲摧，甲光向日金鳞开。",
        "explanation": "诗人借浓重色彩和紧张战场场景描写守城将士，赞颂他们报效朝廷、慷慨赴战的决心。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-013",
    "sequence": 13,
    "title": "赤壁",
    "author": "杜牧",
    "dynasty": "唐",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "诗词五首",
    "contentType": "课内古诗",
    "genre": "七言绝句",
    "stanzas": [
      "折戟沉沙铁未销，自将磨洗认前朝。",
      "东风不与周郎便，铜雀春深锁二乔。"
    ],
    "stanzaGroups": [
      [
        "折戟沉沙铁未销，自将磨洗认前朝。",
        "东风不与周郎便，铜雀春深锁二乔。"
      ]
    ],
    "meaningSummary": "诗人借一件沉埋江底的旧兵器议论赤壁之战，感叹历史成败也受机遇影响。",
    "keyNotes": [
      {
        "term": "折戟",
        "meaning": "折断的戟"
      },
      {
        "term": "前朝",
        "meaning": "赤壁之战所在的时代"
      },
      {
        "term": "周郎",
        "meaning": "周瑜"
      }
    ],
    "matchedTo53": true,
    "printedPage": 156,
    "famousQuote": "东风不与周郎便，铜雀春深锁二乔。",
    "examFocus": "诗人借一件沉埋江底的旧兵器议论赤壁之战，感叹历史成败也受机遇影响。",
    "errorTrap": "重点掌握：“折戟”（折断的戟）的书写与释义。",
    "maskedWords": [
      {
        "word": "折戟",
        "trapReason": "折断的戟"
      },
      {
        "word": "前朝",
        "trapReason": "赤壁之战所在的时代"
      },
      {
        "word": "周郎",
        "trapReason": "周瑜"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《赤壁》中，作者杜牧表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "东风不与周郎便，铜雀春深锁二乔。",
        "explanation": "诗人借一件沉埋江底的旧兵器议论赤壁之战，感叹历史成败也受机遇影响。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-014",
    "sequence": 14,
    "title": "渔家傲（天接云涛连晓雾）",
    "author": "李清照",
    "dynasty": "宋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "诗词五首",
    "contentType": "课内词",
    "genre": "词",
    "stanzas": [
      "天接云涛连晓雾，星河欲转千帆舞。",
      "仿佛梦魂归帝所，闻天语，殷勤问我归何处。",
      "我报路长嗟日暮，学诗谩有惊人句。",
      "九万里风鹏正举。风休住，蓬舟吹取三山去！"
    ],
    "stanzaGroups": [
      [
        "天接云涛连晓雾，星河欲转千帆舞。",
        "仿佛梦魂归帝所，闻天语，殷勤问我归何处。"
      ],
      [
        "我报路长嗟日暮，学诗谩有惊人句。",
        "九万里风鹏正举。风休住，蓬舟吹取三山去！"
      ]
    ],
    "meaningSummary": "词人借梦境展现辽阔奇幻的海天景象，抒写现实中的苦闷以及追求自由和理想的愿望。",
    "keyNotes": [
      {
        "term": "星河欲转",
        "meaning": "银河流转，指天快亮了"
      },
      {
        "term": "帝所",
        "meaning": "天帝居住的地方"
      },
      {
        "term": "谩",
        "meaning": "同“漫”，空、徒然"
      }
    ],
    "matchedTo53": true,
    "printedPage": 156,
    "famousQuote": "天接云涛连晓雾，星河欲转千帆舞。仿佛梦魂归帝所，闻天语，殷勤问我归何处。",
    "examFocus": "词人借梦境展现辽阔奇幻的海天景象，抒写现实中的苦闷以及追求自由和理想的愿望。",
    "errorTrap": "重点掌握：“星河欲转”（银河流转，指天快亮了）的书写与释义。",
    "maskedWords": [
      {
        "word": "星河欲转",
        "trapReason": "银河流转，指天快亮了"
      },
      {
        "word": "帝所",
        "trapReason": "天帝居住的地方"
      },
      {
        "word": "谩",
        "trapReason": "同“漫”，空、徒然"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《渔家傲（天接云涛连晓雾）》中，作者李清照表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "天接云涛连晓雾，星河欲转千帆舞。",
        "explanation": "词人借梦境展现辽阔奇幻的海天景象，抒写现实中的苦闷以及追求自由和理想的愿望。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-015",
    "sequence": 15,
    "title": "浣溪沙（一曲新词酒一杯）",
    "author": "晏殊",
    "dynasty": "北宋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·浣溪沙",
    "stanzas": [
      "一曲新词酒一杯，去年天气旧亭台。夕阳西下几时回？",
      "无可奈何花落去，似曾相识燕归来。小园香径独徘徊。"
    ],
    "stanzaGroups": [
      [
        "一曲新词酒一杯，去年天气旧亭台。夕阳西下几时回？"
      ],
      [
        "无可奈何花落去，似曾相识燕归来。小园香径独徘徊。"
      ]
    ],
    "meaningSummary": "词人面对熟悉的春景和流逝的时光，写出惋惜与欣慰交织的感受。",
    "keyNotes": [
      {
        "term": "香径",
        "meaning": "花草芳香的小路"
      },
      {
        "term": "似曾相识",
        "meaning": "仿佛曾经见过"
      }
    ],
    "matchedTo53": true,
    "printedPage": 163,
    "famousQuote": "一曲新词酒一杯，去年天气旧亭台。夕阳西下几时回？无可奈何花落去，似曾相识燕归来。小园香径独徘徊。",
    "examFocus": "词人面对熟悉的春景和流逝的时光，写出惋惜与欣慰交织的感受。",
    "errorTrap": "重点掌握：“香径”（花草芳香的小路）的书写与释义。",
    "maskedWords": [
      {
        "word": "香径",
        "trapReason": "花草芳香的小路"
      },
      {
        "word": "似曾相识",
        "trapReason": "仿佛曾经见过"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《浣溪沙（一曲新词酒一杯）》中，作者晏殊表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "一曲新词酒一杯，去年天气旧亭台。",
        "explanation": "词人面对熟悉的春景和流逝的时光，写出惋惜与欣慰交织的感受。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-016",
    "sequence": 16,
    "title": "采桑子（轻舟短棹西湖好）",
    "author": "欧阳修",
    "dynasty": "北宋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·采桑子",
    "stanzas": [
      "轻舟短棹西湖好，绿水逶迤，芳草长堤。隐隐笙歌处处随。",
      "无风水面琉璃滑，不觉船移，微动涟漪。惊起沙禽掠岸飞。"
    ],
    "stanzaGroups": [
      [
        "轻舟短棹西湖好，绿水逶迤，芳草长堤。隐隐笙歌处处随。"
      ],
      [
        "无风水面琉璃滑，不觉船移，微动涟漪。惊起沙禽掠岸飞。"
      ]
    ],
    "meaningSummary": "词人乘小舟游西湖，描写水面平静、芳草长堤、笙歌随行和沙鸟惊飞的春日景致。",
    "keyNotes": [
      {
        "term": "逶迤",
        "meaning": "弯曲绵延"
      },
      {
        "term": "涟漪",
        "meaning": "细小的波纹"
      },
      {
        "term": "短棹",
        "meaning": "短桨"
      }
    ],
    "matchedTo53": false,
    "printedPage": 163,
    "famousQuote": "轻舟短棹西湖好，绿水逶迤，芳草长堤。隐隐笙歌处处随。无风水面琉璃滑，不觉船移，微动涟漪。惊起沙禽掠岸飞。",
    "examFocus": "词人乘小舟游西湖，描写水面平静、芳草长堤、笙歌随行和沙鸟惊飞的春日景致。",
    "errorTrap": "重点掌握：“逶迤”（弯曲绵延）的书写与释义。",
    "maskedWords": [
      {
        "word": "逶迤",
        "trapReason": "弯曲绵延"
      },
      {
        "word": "涟漪",
        "trapReason": "细小的波纹"
      },
      {
        "word": "短棹",
        "trapReason": "短桨"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《采桑子（轻舟短棹西湖好）》中，作者欧阳修表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "轻舟短棹西湖好，绿水逶迤，芳草长堤。",
        "explanation": "词人乘小舟游西湖，描写水面平静、芳草长堤、笙歌随行和沙鸟惊飞的春日景致。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-017",
    "sequence": 17,
    "title": "相见欢（金陵城上西楼）",
    "author": "朱敦儒",
    "dynasty": "南宋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·相见欢",
    "stanzas": [
      "金陵城上西楼，倚清秋。",
      "万里夕阳垂地大江流。",
      "中原乱，簪缨散，几时收？",
      "试倩悲风吹泪过扬州。"
    ],
    "stanzaGroups": [
      [
        "金陵城上西楼，倚清秋。",
        "万里夕阳垂地大江流。"
      ],
      [
        "中原乱，簪缨散，几时收？",
        "试倩悲风吹泪过扬州。"
      ]
    ],
    "meaningSummary": "词人登楼远望，以苍凉江景寄托对中原沦陷的痛惜和收复失地的期盼。",
    "keyNotes": [
      {
        "term": "簪缨",
        "meaning": "达官贵人的冠饰，借指贵族官僚"
      },
      {
        "term": "倩",
        "meaning": "请、托"
      }
    ],
    "matchedTo53": false,
    "printedPage": 164,
    "famousQuote": "金陵城上西楼，倚清秋。万里夕阳垂地大江流。",
    "examFocus": "词人登楼远望，以苍凉江景寄托对中原沦陷的痛惜和收复失地的期盼。",
    "errorTrap": "重点掌握：“簪缨”（达官贵人的冠饰，借指贵族官僚）的书写与释义。",
    "maskedWords": [
      {
        "word": "簪缨",
        "trapReason": "达官贵人的冠饰，借指贵族官僚"
      },
      {
        "word": "倩",
        "trapReason": "请、托"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《相见欢（金陵城上西楼）》中，作者朱敦儒表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "金陵城上西楼，倚清秋。",
        "explanation": "词人登楼远望，以苍凉江景寄托对中原沦陷的痛惜和收复失地的期盼。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-1-018",
    "sequence": 18,
    "title": "如梦令（常记溪亭日暮）",
    "author": "李清照",
    "dynasty": "宋",
    "volume": "八年级上册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·如梦令",
    "stanzas": [
      "常记溪亭日暮，沉醉不知归路。",
      "兴尽晚回舟，误入藕花深处。",
      "争渡，争渡，惊起一滩鸥鹭。"
    ],
    "stanzaGroups": [
      [
        "常记溪亭日暮，沉醉不知归路。",
        "兴尽晚回舟，误入藕花深处。"
      ],
      [
        "争渡，争渡，惊起一滩鸥鹭。"
      ]
    ],
    "meaningSummary": "词人回忆一次溪亭游赏经历，以误入藕花深处和惊起鸥鹭写出轻快欢愉的情景。",
    "keyNotes": [
      {
        "term": "溪亭",
        "meaning": "临溪的亭子"
      },
      {
        "term": "藕花",
        "meaning": "荷花"
      },
      {
        "term": "争渡",
        "meaning": "奋力把船划出去"
      }
    ],
    "matchedTo53": false,
    "printedPage": 164,
    "famousQuote": "常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。",
    "examFocus": "词人回忆一次溪亭游赏经历，以误入藕花深处和惊起鸥鹭写出轻快欢愉的情景。",
    "errorTrap": "重点掌握：“溪亭”（临溪的亭子）的书写与释义。",
    "maskedWords": [
      {
        "word": "溪亭",
        "trapReason": "临溪的亭子"
      },
      {
        "word": "藕花",
        "trapReason": "荷花"
      },
      {
        "word": "争渡",
        "trapReason": "奋力把船划出去"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《如梦令（常记溪亭日暮）》中，作者李清照表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "常记溪亭日暮，沉醉不知归路。",
        "explanation": "词人回忆一次溪亭游赏经历，以误入藕花深处和惊起鸥鹭写出轻快欢愉的情景。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-001",
    "sequence": 1,
    "title": "关雎",
    "author": "《诗经·周南》",
    "dynasty": "先秦",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "诗经二首",
    "contentType": "课内古诗",
    "genre": "《诗经》·四言诗",
    "stanzas": [
      "关关雎鸠，在河之洲。",
      "窈窕淑女，君子好逑。",
      "参差荇菜，左右流之。",
      "窈窕淑女，寤寐求之。",
      "求之不得，寤寐思服。",
      "悠哉悠哉，辗转反侧。",
      "参差荇菜，左右采之。",
      "窈窕淑女，琴瑟友之。",
      "参差荇菜，左右芼之。",
      "窈窕淑女，钟鼓乐之。"
    ],
    "stanzaGroups": [
      [
        "关关雎鸠，在河之洲。",
        "窈窕淑女，君子好逑。"
      ],
      [
        "参差荇菜，左右流之。",
        "窈窕淑女，寤寐求之。"
      ],
      [
        "求之不得，寤寐思服。",
        "悠哉悠哉，辗转反侧。"
      ],
      [
        "参差荇菜，左右采之。",
        "窈窕淑女，琴瑟友之。"
      ],
      [
        "参差荇菜，左右芼之。",
        "窈窕淑女，钟鼓乐之。"
      ]
    ],
    "meaningSummary": "诗歌从雎鸠和鸣起兴，写男子对淑女的爱慕、追求，以及愿望实现后的欢喜。",
    "keyNotes": [
      {
        "term": "窈窕",
        "meaning": "文静美好的样子"
      },
      {
        "term": "好逑",
        "meaning": "好的配偶"
      },
      {
        "term": "寤寐",
        "meaning": "日日夜夜"
      }
    ],
    "matchedTo53": true,
    "printedPage": 71,
    "famousQuote": "关关雎鸠，在河之洲。窈窕淑女，君子好逑。",
    "examFocus": "诗歌从雎鸠和鸣起兴，写男子对淑女的爱慕、追求，以及愿望实现后的欢喜。",
    "errorTrap": "重点掌握：“窈窕”（文静美好的样子）的书写与释义。",
    "maskedWords": [
      {
        "word": "窈窕",
        "trapReason": "文静美好的样子"
      },
      {
        "word": "好逑",
        "trapReason": "好的配偶"
      },
      {
        "word": "寤寐",
        "trapReason": "日日夜夜"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《关雎》中，作者《诗经·周南》表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "关关雎鸠，在河之洲。",
        "explanation": "诗歌从雎鸠和鸣起兴，写男子对淑女的爱慕、追求，以及愿望实现后的欢喜。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-002",
    "sequence": 2,
    "title": "蒹葭",
    "author": "《诗经·秦风》",
    "dynasty": "先秦",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "诗经二首",
    "contentType": "课内古诗",
    "genre": "《诗经》·四言诗",
    "stanzas": [
      "蒹葭苍苍，白露为霜。",
      "所谓伊人，在水一方。",
      "溯洄从之，道阻且长。",
      "溯游从之，宛在水中央。",
      "蒹葭萋萋，白露未晞。",
      "所谓伊人，在水之湄。",
      "溯洄从之，道阻且跻。",
      "溯游从之，宛在水中坻。",
      "蒹葭采采，白露未已。",
      "所谓伊人，在水之涘。",
      "溯洄从之，道阻且右。",
      "溯游从之，宛在水中沚。"
    ],
    "stanzaGroups": [
      [
        "蒹葭苍苍，白露为霜。",
        "所谓伊人，在水一方。",
        "溯洄从之，道阻且长。",
        "溯游从之，宛在水中央。"
      ],
      [
        "蒹葭萋萋，白露未晞。",
        "所谓伊人，在水之湄。",
        "溯洄从之，道阻且跻。",
        "溯游从之，宛在水中坻。"
      ],
      [
        "蒹葭采采，白露未已。",
        "所谓伊人，在水之涘。",
        "溯洄从之，道阻且右。",
        "溯游从之，宛在水中沚。"
      ]
    ],
    "meaningSummary": "诗人反复追寻水边的伊人却始终难以接近，营造出朦胧优美又惆怅的意境。",
    "keyNotes": [
      {
        "term": "蒹葭",
        "meaning": "芦苇"
      },
      {
        "term": "溯洄",
        "meaning": "逆流而上"
      },
      {
        "term": "晞",
        "meaning": "干"
      },
      {
        "term": "湄、涘",
        "meaning": "水边"
      }
    ],
    "matchedTo53": true,
    "printedPage": 72,
    "famousQuote": "蒹葭苍苍，白露为霜。所谓伊人，在水一方。",
    "examFocus": "诗人反复追寻水边的伊人却始终难以接近，营造出朦胧优美又惆怅的意境。",
    "errorTrap": "重点掌握：“蒹葭”（芦苇）的书写与释义。",
    "maskedWords": [
      {
        "word": "蒹葭",
        "trapReason": "芦苇"
      },
      {
        "word": "溯洄",
        "trapReason": "逆流而上"
      },
      {
        "word": "晞",
        "trapReason": "干"
      },
      {
        "word": "湄、涘",
        "trapReason": "水边"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《蒹葭》中，作者《诗经·秦风》表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "蒹葭苍苍，白露为霜。",
        "explanation": "诗人反复追寻水边的伊人却始终难以接近，营造出朦胧优美又惆怅的意境。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-003",
    "sequence": 3,
    "title": "式微",
    "author": "《诗经·邶风》",
    "dynasty": "先秦",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "《诗经》·四言诗",
    "stanzas": [
      "式微式微，胡不归？",
      "微君之故，胡为乎中露？",
      "式微式微，胡不归？",
      "微君之躬，胡为乎泥中？"
    ],
    "stanzaGroups": [
      [
        "式微式微，胡不归？",
        "微君之故，胡为乎中露？"
      ],
      [
        "式微式微，胡不归？",
        "微君之躬，胡为乎泥中？"
      ]
    ],
    "meaningSummary": "诗歌以反复质问写劳役者在露水和泥地中辛苦劳作，表达对劳役生活的怨怼。",
    "keyNotes": [
      {
        "term": "式微",
        "meaning": "天黑了"
      },
      {
        "term": "胡",
        "meaning": "何、为什么"
      },
      {
        "term": "微君",
        "meaning": "如果不是君主"
      }
    ],
    "matchedTo53": false,
    "printedPage": 81,
    "famousQuote": "式微式微，胡不归？微君之故，胡为乎中露？",
    "examFocus": "诗歌以反复质问写劳役者在露水和泥地中辛苦劳作，表达对劳役生活的怨怼。",
    "errorTrap": "重点掌握：“式微”（天黑了）的书写与释义。",
    "maskedWords": [
      {
        "word": "式微",
        "trapReason": "天黑了"
      },
      {
        "word": "胡",
        "trapReason": "何、为什么"
      },
      {
        "word": "微君",
        "trapReason": "如果不是君主"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《式微》中，作者《诗经·邶风》表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "式微式微，胡不归？微君之故，胡为乎中露？。",
        "explanation": "诗歌以反复质问写劳役者在露水和泥地中辛苦劳作，表达对劳役生活的怨怼。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-004",
    "sequence": 4,
    "title": "子衿",
    "author": "《诗经·郑风》",
    "dynasty": "先秦",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "《诗经》·四言诗",
    "stanzas": [
      "青青子衿，悠悠我心。",
      "纵我不往，子宁不嗣音？",
      "青青子佩，悠悠我思。",
      "纵我不往，子宁不来？",
      "挑兮达兮，在城阙兮。",
      "一日不见，如三月兮！"
    ],
    "stanzaGroups": [
      [
        "青青子衿，悠悠我心。",
        "纵我不往，子宁不嗣音？"
      ],
      [
        "青青子佩，悠悠我思。",
        "纵我不往，子宁不来？"
      ],
      [
        "挑兮达兮，在城阙兮。",
        "一日不见，如三月兮！"
      ]
    ],
    "meaningSummary": "诗中女子等待恋人不至，思念、埋怨和焦急交织，最后直抒一日不见如隔三月之情。",
    "keyNotes": [
      {
        "term": "子衿",
        "meaning": "你的衣领"
      },
      {
        "term": "嗣音",
        "meaning": "继续传递音讯"
      },
      {
        "term": "挑达",
        "meaning": "独自徘徊的样子"
      }
    ],
    "matchedTo53": false,
    "printedPage": 81,
    "famousQuote": "青青子衿，悠悠我心。纵我不往，子宁不嗣音？",
    "examFocus": "诗中女子等待恋人不至，思念、埋怨和焦急交织，最后直抒一日不见如隔三月之情。",
    "errorTrap": "重点掌握：“子衿”（你的衣领）的书写与释义。",
    "maskedWords": [
      {
        "word": "子衿",
        "trapReason": "你的衣领"
      },
      {
        "word": "嗣音",
        "trapReason": "继续传递音讯"
      },
      {
        "word": "挑达",
        "trapReason": "独自徘徊的样子"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《子衿》中，作者《诗经·郑风》表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "青青子衿，悠悠我心。",
        "explanation": "诗中女子等待恋人不至，思念、埋怨和焦急交织，最后直抒一日不见如隔三月之情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-005",
    "sequence": 5,
    "title": "送杜少府之任蜀州",
    "author": "王勃",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "城阙辅三秦，风烟望五津。",
      "与君离别意，同是宦游人。",
      "海内存知己，天涯若比邻。",
      "无为在歧路，儿女共沾巾。"
    ],
    "stanzaGroups": [
      [
        "城阙辅三秦，风烟望五津。",
        "与君离别意，同是宦游人。"
      ],
      [
        "海内存知己，天涯若比邻。",
        "无为在歧路，儿女共沾巾。"
      ]
    ],
    "meaningSummary": "诗人送别友人赴蜀，劝慰彼此同为宦游之人，真挚友情能超越空间阻隔。",
    "keyNotes": [
      {
        "term": "城阙",
        "meaning": "帝王居住的城，借指长安"
      },
      {
        "term": "五津",
        "meaning": "岷江上的五个渡口，代指蜀地"
      },
      {
        "term": "宦游",
        "meaning": "外出求官或做官"
      }
    ],
    "matchedTo53": true,
    "printedPage": 82,
    "famousQuote": "海内存知己，天涯若比邻。",
    "examFocus": "诗人送别友人赴蜀，劝慰彼此同为宦游之人，真挚友情能超越空间阻隔。",
    "errorTrap": "重点掌握：“城阙”（帝王居住的城，借指长安）的书写与释义。",
    "maskedWords": [
      {
        "word": "城阙",
        "trapReason": "帝王居住的城，借指长安"
      },
      {
        "word": "五津",
        "trapReason": "岷江上的五个渡口，代指蜀地"
      },
      {
        "word": "宦游",
        "trapReason": "外出求官或做官"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《送杜少府之任蜀州》中，作者王勃表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "海内存知己，天涯若比邻。",
        "explanation": "诗人送别友人赴蜀，劝慰彼此同为宦游之人，真挚友情能超越空间阻隔。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-006",
    "sequence": 6,
    "title": "望洞庭湖上张丞相",
    "author": "孟浩然",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "八月湖水平，涵虚混太清。",
      "气蒸云梦泽，波撼岳阳城。",
      "欲济无舟楫，端居耻圣明。",
      "坐观垂钓者，徒有羡鱼情。"
    ],
    "stanzaGroups": [
      [
        "八月湖水平，涵虚混太清。",
        "气蒸云梦泽，波撼岳阳城。"
      ],
      [
        "欲济无舟楫，端居耻圣明。",
        "坐观垂钓者，徒有羡鱼情。"
      ]
    ],
    "meaningSummary": "诗人先写洞庭湖的壮阔景象，再以无舟渡湖为喻，含蓄表达希望得到举荐、施展抱负的愿望。",
    "keyNotes": [
      {
        "term": "涵虚",
        "meaning": "包含天空"
      },
      {
        "term": "云梦泽",
        "meaning": "古代大湖，这里指洞庭湖"
      },
      {
        "term": "济",
        "meaning": "渡"
      }
    ],
    "matchedTo53": false,
    "printedPage": 82,
    "famousQuote": "八月湖水平，涵虚混太清。气蒸云梦泽，波撼岳阳城。",
    "examFocus": "诗人先写洞庭湖的壮阔景象，再以无舟渡湖为喻，含蓄表达希望得到举荐、施展抱负的愿望。",
    "errorTrap": "重点掌握：“涵虚”（包含天空）的书写与释义。",
    "maskedWords": [
      {
        "word": "涵虚",
        "trapReason": "包含天空"
      },
      {
        "word": "云梦泽",
        "trapReason": "古代大湖，这里指洞庭湖"
      },
      {
        "word": "济",
        "trapReason": "渡"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《望洞庭湖上张丞相》中，作者孟浩然表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "八月湖水平，涵虚混太清。",
        "explanation": "诗人先写洞庭湖的壮阔景象，再以无舟渡湖为喻，含蓄表达希望得到举荐、施展抱负的愿望。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-007",
    "sequence": 7,
    "title": "石壕吏",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "唐诗三首",
    "contentType": "课内诗歌",
    "genre": "叙事诗",
    "stanzas": [
      "暮投石壕村，有吏夜捉人。",
      "老翁逾墙走，老妇出门看。",
      "吏呼一何怒！妇啼一何苦！",
      "听妇前致词：三男邺城戍。",
      "一男附书至，二男新战死。",
      "存者且偷生，死者长已矣！",
      "室中更无人，惟有乳下孙。",
      "有孙母未去，出入无完裙。",
      "老妪力虽衰，请从吏夜归。",
      "急应河阳役，犹得备晨炊。",
      "夜久语声绝，如闻泣幽咽。",
      "天明登前途，独与老翁别。"
    ],
    "stanzaGroups": [
      [
        "暮投石壕村，有吏夜捉人。",
        "老翁逾墙走，老妇出门看。"
      ],
      [
        "吏呼一何怒！妇啼一何苦！",
        "听妇前致词：三男邺城戍。",
        "一男附书至，二男新战死。",
        "存者且偷生，死者长已矣！",
        "室中更无人，惟有乳下孙。",
        "有孙母未去，出入无完裙。"
      ],
      [
        "老妪力虽衰，请从吏夜归。",
        "急应河阳役，犹得备晨炊。"
      ],
      [
        "夜久语声绝，如闻泣幽咽。",
        "天明登前途，独与老翁别。"
      ]
    ],
    "meaningSummary": "诗人借夜间差役抓丁和老妇应役的经历，展现战乱给普通百姓带来的沉重苦难。",
    "keyNotes": [
      {
        "term": "逾墙",
        "meaning": "翻墙"
      },
      {
        "term": "戍",
        "meaning": "驻守"
      },
      {
        "term": "老妪",
        "meaning": "老妇"
      },
      {
        "term": "幽咽",
        "meaning": "低沉轻微的哭声"
      }
    ],
    "matchedTo53": false,
    "printedPage": 142,
    "famousQuote": "暮投石壕村，有吏夜捉人。老翁逾墙走，老妇出门看。",
    "examFocus": "诗人借夜间差役抓丁和老妇应役的经历，展现战乱给普通百姓带来的沉重苦难。",
    "errorTrap": "重点掌握：“逾墙”（翻墙）的书写与释义。",
    "maskedWords": [
      {
        "word": "逾墙",
        "trapReason": "翻墙"
      },
      {
        "word": "戍",
        "trapReason": "驻守"
      },
      {
        "word": "老妪",
        "trapReason": "老妇"
      },
      {
        "word": "幽咽",
        "trapReason": "低沉轻微的哭声"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《石壕吏》中，作者杜甫表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "暮投石壕村，有吏夜捉人。",
        "explanation": "诗人借夜间差役抓丁和老妇应役的经历，展现战乱给普通百姓带来的沉重苦难。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-008",
    "sequence": 8,
    "title": "茅屋为秋风所破歌",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "唐诗三首",
    "contentType": "课内诗歌",
    "genre": "歌行体",
    "stanzas": [
      "八月秋高风怒号，卷我屋上三重茅。",
      "茅飞渡江洒江郊，高者挂罥长林梢，下者飘转沉塘坳。",
      "南村群童欺我老无力，忍能对面为盗贼。",
      "公然抱茅入竹去，唇焦口燥呼不得，归来倚杖自叹息。",
      "俄顷风定云墨色，秋天漠漠向昏黑。",
      "布衾多年冷似铁，娇儿恶卧踏里裂。",
      "床头屋漏无干处，雨脚如麻未断绝。",
      "自经丧乱少睡眠，长夜沾湿何由彻！",
      "安得广厦千万间，大庇天下寒士俱欢颜！",
      "风雨不动安如山。",
      "呜呼！何时眼前突兀见此屋，吾庐独破受冻死亦足！"
    ],
    "stanzaGroups": [
      [
        "八月秋高风怒号，卷我屋上三重茅。",
        "茅飞渡江洒江郊，高者挂罥长林梢，下者飘转沉塘坳。"
      ],
      [
        "南村群童欺我老无力，忍能对面为盗贼。",
        "公然抱茅入竹去，唇焦口燥呼不得，归来倚杖自叹息。"
      ],
      [
        "俄顷风定云墨色，秋天漠漠向昏黑。",
        "布衾多年冷似铁，娇儿恶卧踏里裂。",
        "床头屋漏无干处，雨脚如麻未断绝。",
        "自经丧乱少睡眠，长夜沾湿何由彻！"
      ],
      [
        "安得广厦千万间，大庇天下寒士俱欢颜！",
        "风雨不动安如山。",
        "呜呼！何时眼前突兀见此屋，吾庐独破受冻死亦足！"
      ]
    ],
    "meaningSummary": "诗人由自家茅屋被风雨所破写到天下寒士的困苦，抒发推己及人的忧民情怀和济世理想。",
    "keyNotes": [
      {
        "term": "挂罥",
        "meaning": "缠挂"
      },
      {
        "term": "俄顷",
        "meaning": "一会儿"
      },
      {
        "term": "何由彻",
        "meaning": "如何挨到头"
      },
      {
        "term": "大庇",
        "meaning": "广泛庇护"
      }
    ],
    "matchedTo53": true,
    "printedPage": 143,
    "famousQuote": "安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。",
    "examFocus": "诗人由自家茅屋被风雨所破写到天下寒士的困苦，抒发推己及人的忧民情怀和济世理想。",
    "errorTrap": "重点掌握：“挂罥”（缠挂）的书写与释义。",
    "maskedWords": [
      {
        "word": "挂罥",
        "trapReason": "缠挂"
      },
      {
        "word": "俄顷",
        "trapReason": "一会儿"
      },
      {
        "word": "何由彻",
        "trapReason": "如何挨到头"
      },
      {
        "word": "大庇",
        "trapReason": "广泛庇护"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《茅屋为秋风所破歌》中，作者杜甫表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。",
        "explanation": "诗人由自家茅屋被风雨所破写到天下寒士的困苦，抒发推己及人的忧民情怀和济世理想。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-009",
    "sequence": 9,
    "title": "卖炭翁",
    "author": "白居易",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "唐诗三首",
    "contentType": "课内诗歌",
    "genre": "叙事诗",
    "stanzas": [
      "卖炭翁，伐薪烧炭南山中。",
      "满面尘灰烟火色，两鬓苍苍十指黑。",
      "卖炭得钱何所营？身上衣裳口中食。",
      "可怜身上衣正单，心忧炭贱愿天寒。",
      "夜来城外一尺雪，晓驾炭车辗冰辙。",
      "牛困人饥日已高，市南门外泥中歇。",
      "翩翩两骑来是谁？黄衣使者白衫儿。",
      "手把文书口称敕，回车叱牛牵向北。",
      "一车炭，千余斤，宫使驱将惜不得。",
      "半匹红纱一丈绫，系向牛头充炭直。"
    ],
    "stanzaGroups": [
      [
        "卖炭翁，伐薪烧炭南山中。",
        "满面尘灰烟火色，两鬓苍苍十指黑。"
      ],
      [
        "卖炭得钱何所营？身上衣裳口中食。",
        "可怜身上衣正单，心忧炭贱愿天寒。",
        "夜来城外一尺雪，晓驾炭车辗冰辙。",
        "牛困人饥日已高，市南门外泥中歇。"
      ],
      [
        "翩翩两骑来是谁？黄衣使者白衫儿。",
        "手把文书口称敕，回车叱牛牵向北。",
        "一车炭，千余斤，宫使驱将惜不得。",
        "半匹红纱一丈绫，系向牛头充炭直。"
      ]
    ],
    "meaningSummary": "诗人描写卖炭老人辛苦烧炭却遭宫使掠夺，揭露宫市对百姓的压迫。",
    "keyNotes": [
      {
        "term": "何所营",
        "meaning": "做什么用"
      },
      {
        "term": "敕",
        "meaning": "皇帝的命令"
      },
      {
        "term": "直",
        "meaning": "同“值”，价钱"
      }
    ],
    "matchedTo53": true,
    "printedPage": 144,
    "famousQuote": "卖炭翁，伐薪烧炭南山中。满面尘灰烟火色，两鬓苍苍十指黑。",
    "examFocus": "诗人描写卖炭老人辛苦烧炭却遭宫使掠夺，揭露宫市对百姓的压迫。",
    "errorTrap": "重点掌握：“何所营”（做什么用）的书写与释义。",
    "maskedWords": [
      {
        "word": "何所营",
        "trapReason": "做什么用"
      },
      {
        "word": "敕",
        "trapReason": "皇帝的命令"
      },
      {
        "word": "直",
        "trapReason": "同“值”，价钱"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《卖炭翁》中，作者白居易表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "卖炭翁，伐薪烧炭南山中。",
        "explanation": "诗人描写卖炭老人辛苦烧炭却遭宫使掠夺，揭露宫市对百姓的压迫。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-010",
    "sequence": 10,
    "title": "题破山寺后禅院",
    "author": "常建",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "清晨入古寺，初日照高林。",
      "竹径通幽处，禅房花木深。",
      "山光悦鸟性，潭影空人心。",
      "万籁此都寂，但余钟磬音。"
    ],
    "stanzaGroups": [
      [
        "清晨入古寺，初日照高林。",
        "竹径通幽处，禅房花木深。"
      ],
      [
        "山光悦鸟性，潭影空人心。",
        "万籁此都寂，但余钟磬音。"
      ]
    ],
    "meaningSummary": "诗人晨游古寺，描写幽静清新的环境，写出亲近自然、远离尘俗的宁静感受。",
    "keyNotes": [
      {
        "term": "禅房",
        "meaning": "僧人居住的房舍"
      },
      {
        "term": "万籁",
        "meaning": "各种声响"
      },
      {
        "term": "钟磬",
        "meaning": "寺院中的钟和磬"
      }
    ],
    "matchedTo53": false,
    "printedPage": 156,
    "famousQuote": "清晨入古寺，初日照高林。竹径通幽处，禅房花木深。",
    "examFocus": "诗人晨游古寺，描写幽静清新的环境，写出亲近自然、远离尘俗的宁静感受。",
    "errorTrap": "重点掌握：“禅房”（僧人居住的房舍）的书写与释义。",
    "maskedWords": [
      {
        "word": "禅房",
        "trapReason": "僧人居住的房舍"
      },
      {
        "word": "万籁",
        "trapReason": "各种声响"
      },
      {
        "word": "钟磬",
        "trapReason": "寺院中的钟和磬"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《题破山寺后禅院》中，作者常建表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "清晨入古寺，初日照高林。",
        "explanation": "诗人晨游古寺，描写幽静清新的环境，写出亲近自然、远离尘俗的宁静感受。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-011",
    "sequence": 11,
    "title": "送友人",
    "author": "李白",
    "dynasty": "唐",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "青山横北郭，白水绕东城。",
      "此地一为别，孤蓬万里征。",
      "浮云游子意，落日故人情。",
      "挥手自兹去，萧萧班马鸣。"
    ],
    "stanzaGroups": [
      [
        "青山横北郭，白水绕东城。",
        "此地一为别，孤蓬万里征。"
      ],
      [
        "浮云游子意，落日故人情。",
        "挥手自兹去，萧萧班马鸣。"
      ]
    ],
    "meaningSummary": "诗人写青山白水中的送别场景，以浮云、落日和离群之马寄托依依惜别之情。",
    "keyNotes": [
      {
        "term": "孤蓬",
        "meaning": "飞蓬，常比喻远行的人"
      },
      {
        "term": "自兹去",
        "meaning": "从此离去"
      },
      {
        "term": "班马",
        "meaning": "离群的马"
      }
    ],
    "matchedTo53": false,
    "printedPage": 156,
    "famousQuote": "青山横北郭，白水绕东城。此地一为别，孤蓬万里征。",
    "examFocus": "诗人写青山白水中的送别场景，以浮云、落日和离群之马寄托依依惜别之情。",
    "errorTrap": "重点掌握：“孤蓬”（飞蓬，常比喻远行的人）的书写与释义。",
    "maskedWords": [
      {
        "word": "孤蓬",
        "trapReason": "飞蓬，常比喻远行的人"
      },
      {
        "word": "自兹去",
        "trapReason": "从此离去"
      },
      {
        "word": "班马",
        "trapReason": "离群的马"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《送友人》中，作者李白表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "青山横北郭，白水绕东城。",
        "explanation": "诗人写青山白水中的送别场景，以浮云、落日和离群之马寄托依依惜别之情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-012",
    "sequence": 12,
    "title": "卜算子·黄州定慧院寓居作",
    "author": "苏轼",
    "dynasty": "北宋",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·卜算子",
    "stanzas": [
      "缺月挂疏桐，漏断人初静。",
      "谁见幽人独往来，缥缈孤鸿影。",
      "惊起却回头，有恨无人省。",
      "拣尽寒枝不肯栖，寂寞沙洲冷。"
    ],
    "stanzaGroups": [
      [
        "缺月挂疏桐，漏断人初静。",
        "谁见幽人独往来，缥缈孤鸿影。"
      ],
      [
        "惊起却回头，有恨无人省。",
        "拣尽寒枝不肯栖，寂寞沙洲冷。"
      ]
    ],
    "meaningSummary": "词人借孤鸿夜飞、择枝不栖的形象，写被贬黄州时的孤独处境和坚守高洁品格的心志。",
    "keyNotes": [
      {
        "term": "漏断",
        "meaning": "深夜"
      },
      {
        "term": "幽人",
        "meaning": "幽居之人"
      },
      {
        "term": "省",
        "meaning": "知晓、理解"
      }
    ],
    "matchedTo53": false,
    "printedPage": 157,
    "famousQuote": "缺月挂疏桐，漏断人初静。谁见幽人独往来，缥缈孤鸿影。",
    "examFocus": "词人借孤鸿夜飞、择枝不栖的形象，写被贬黄州时的孤独处境和坚守高洁品格的心志。",
    "errorTrap": "重点掌握：“漏断”（深夜）的书写与释义。",
    "maskedWords": [
      {
        "word": "漏断",
        "trapReason": "深夜"
      },
      {
        "word": "幽人",
        "trapReason": "幽居之人"
      },
      {
        "word": "省",
        "trapReason": "知晓、理解"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《卜算子·黄州定慧院寓居作》中，作者苏轼表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "缺月挂疏桐，漏断人初静。",
        "explanation": "词人借孤鸿夜飞、择枝不栖的形象，写被贬黄州时的孤独处境和坚守高洁品格的心志。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g8-2-013",
    "sequence": 13,
    "title": "卜算子·咏梅",
    "author": "陆游",
    "dynasty": "南宋",
    "volume": "八年级下册",
    "grade": "初二",
    "gradeLabel": "八年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·卜算子",
    "stanzas": [
      "驿外断桥边，寂寞开无主。",
      "已是黄昏独自愁，更着风和雨。",
      "无意苦争春，一任群芳妒。",
      "零落成泥碾作尘，只有香如故。"
    ],
    "stanzaGroups": [
      [
        "驿外断桥边，寂寞开无主。",
        "已是黄昏独自愁，更着风和雨。"
      ],
      [
        "无意苦争春，一任群芳妒。",
        "零落成泥碾作尘，只有香如故。"
      ]
    ],
    "meaningSummary": "词人借风雨中孤独开放、凋零后香气依旧的梅花，寄托孤高坚贞、不改本心的品格。",
    "keyNotes": [
      {
        "term": "驿",
        "meaning": "驿站"
      },
      {
        "term": "一任",
        "meaning": "任凭"
      },
      {
        "term": "零落",
        "meaning": "凋谢"
      }
    ],
    "matchedTo53": false,
    "printedPage": 157,
    "famousQuote": "驿外断桥边，寂寞开无主。已是黄昏独自愁，更着风和雨。",
    "examFocus": "词人借风雨中孤独开放、凋零后香气依旧的梅花，寄托孤高坚贞、不改本心的品格。",
    "errorTrap": "重点掌握：“驿”（驿站）的书写与释义。",
    "maskedWords": [
      {
        "word": "驿",
        "trapReason": "驿站"
      },
      {
        "word": "一任",
        "trapReason": "任凭"
      },
      {
        "word": "零落",
        "trapReason": "凋谢"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《卜算子·咏梅》中，作者陆游表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "驿外断桥边，寂寞开无主。",
        "explanation": "词人借风雨中孤独开放、凋零后香气依旧的梅花，寄托孤高坚贞、不改本心的品格。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-001",
    "sequence": 1,
    "title": "行路难（其一）",
    "author": "李白",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词三首",
    "contentType": "课内古诗",
    "genre": "乐府古体诗",
    "stanzas": [
      "金樽清酒斗十千，玉盘珍羞直万钱。",
      "停杯投箸不能食，拔剑四顾心茫然。",
      "欲渡黄河冰塞川，将登太行雪满山。",
      "闲来垂钓碧溪上，忽复乘舟梦日边。",
      "行路难！行路难！多歧路，今安在？",
      "长风破浪会有时，直挂云帆济沧海。"
    ],
    "stanzaGroups": [
      [
        "金樽清酒斗十千，玉盘珍羞直万钱。",
        "停杯投箸不能食，拔剑四顾心茫然。"
      ],
      [
        "欲渡黄河冰塞川，将登太行雪满山。",
        "闲来垂钓碧溪上，忽复乘舟梦日边。"
      ],
      [
        "行路难！行路难！多歧路，今安在？",
        "长风破浪会有时，直挂云帆济沧海。"
      ]
    ],
    "meaningSummary": "诗人面对仕途阻碍而苦闷彷徨，最终以乘风破浪的信念表达对理想的坚定追求。",
    "keyNotes": [
      {
        "term": "珍羞",
        "meaning": "珍贵的菜肴"
      },
      {
        "term": "投箸",
        "meaning": "丢下筷子"
      },
      {
        "term": "济",
        "meaning": "渡"
      }
    ],
    "matchedTo53": true,
    "printedPage": 47,
    "famousQuote": "长风破浪会有时，直挂云帆济沧海。",
    "examFocus": "诗人面对仕途阻碍而苦闷彷徨，最终以乘风破浪的信念表达对理想的坚定追求。",
    "errorTrap": "重点掌握：“珍羞”（珍贵的菜肴）的书写与释义。",
    "maskedWords": [
      {
        "word": "珍羞",
        "trapReason": "珍贵的菜肴"
      },
      {
        "word": "投箸",
        "trapReason": "丢下筷子"
      },
      {
        "word": "济",
        "trapReason": "渡"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《行路难（其一）》中，作者李白表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "长风破浪会有时，直挂云帆济沧海。",
        "explanation": "诗人面对仕途阻碍而苦闷彷徨，最终以乘风破浪的信念表达对理想的坚定追求。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-002",
    "sequence": 2,
    "title": "酬乐天扬州初逢席上见赠",
    "author": "刘禹锡",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词三首",
    "contentType": "课内古诗",
    "genre": "七言律诗",
    "stanzas": [
      "巴山楚水凄凉地，二十三年弃置身。",
      "怀旧空吟闻笛赋，到乡翻似烂柯人。",
      "沉舟侧畔千帆过，病树前头万木春。",
      "今日听君歌一曲，暂凭杯酒长精神。"
    ],
    "stanzaGroups": [
      [
        "巴山楚水凄凉地，二十三年弃置身。",
        "怀旧空吟闻笛赋，到乡翻似烂柯人。"
      ],
      [
        "沉舟侧畔千帆过，病树前头万木春。",
        "今日听君歌一曲，暂凭杯酒长精神。"
      ]
    ],
    "meaningSummary": "诗人回顾贬谪经历和人事变迁，借沉舟、病树写出新旧更替，并表现乐观豁达。",
    "keyNotes": [
      {
        "term": "闻笛赋",
        "meaning": "向秀悼念旧友的典故"
      },
      {
        "term": "烂柯人",
        "meaning": "指久别返乡、恍如隔世之人"
      },
      {
        "term": "长精神",
        "meaning": "振作精神"
      }
    ],
    "matchedTo53": true,
    "printedPage": 59,
    "famousQuote": "沉舟侧畔千帆过，病树前头万木春。",
    "examFocus": "诗人回顾贬谪经历和人事变迁，借沉舟、病树写出新旧更替，并表现乐观豁达。",
    "errorTrap": "重点掌握：“闻笛赋”（向秀悼念旧友的典故）的书写与释义。",
    "maskedWords": [
      {
        "word": "闻笛赋",
        "trapReason": "向秀悼念旧友的典故"
      },
      {
        "word": "烂柯人",
        "trapReason": "指久别返乡、恍如隔世之人"
      },
      {
        "word": "长精神",
        "trapReason": "振作精神"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《酬乐天扬州初逢席上见赠》中，作者刘禹锡表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "沉舟侧畔千帆过，病树前头万木春。",
        "explanation": "诗人回顾贬谪经历和人事变迁，借沉舟、病树写出新旧更替，并表现乐观豁达。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-003",
    "sequence": 3,
    "title": "水调歌头（明月几时有）",
    "author": "苏轼",
    "dynasty": "北宋",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词三首",
    "contentType": "课内词",
    "genre": "词·水调歌头",
    "stanzas": [
      "明月几时有？把酒问青天。",
      "不知天上宫阙，今夕是何年。",
      "我欲乘风归去，又恐琼楼玉宇，高处不胜寒。",
      "起舞弄清影，何似在人间。",
      "转朱阁，低绮户，照无眠。",
      "不应有恨，何事长向别时圆？",
      "人有悲欢离合，月有阴晴圆缺，此事古难全。",
      "但愿人长久，千里共婵娟。"
    ],
    "stanzaGroups": [
      [
        "明月几时有？把酒问青天。",
        "不知天上宫阙，今夕是何年。",
        "我欲乘风归去，又恐琼楼玉宇，高处不胜寒。",
        "起舞弄清影，何似在人间。"
      ],
      [
        "转朱阁，低绮户，照无眠。",
        "不应有恨，何事长向别时圆？",
        "人有悲欢离合，月有阴晴圆缺，此事古难全。",
        "但愿人长久，千里共婵娟。"
      ]
    ],
    "meaningSummary": "词人由望月遐想转向思念亲人，最终以豁达胸襟祝愿天下离人长久团圆。",
    "keyNotes": [
      {
        "term": "把酒",
        "meaning": "端起酒杯"
      },
      {
        "term": "不胜寒",
        "meaning": "禁受不住寒冷"
      },
      {
        "term": "婵娟",
        "meaning": "这里指月亮"
      }
    ],
    "matchedTo53": true,
    "printedPage": 60,
    "famousQuote": "人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。",
    "examFocus": "词人由望月遐想转向思念亲人，最终以豁达胸襟祝愿天下离人长久团圆。",
    "errorTrap": "重点掌握：“把酒”（端起酒杯）的书写与释义。",
    "maskedWords": [
      {
        "word": "把酒",
        "trapReason": "端起酒杯"
      },
      {
        "word": "不胜寒",
        "trapReason": "禁受不住寒冷"
      },
      {
        "word": "婵娟",
        "trapReason": "这里指月亮"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《水调歌头（明月几时有）》中，作者苏轼表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "人有悲欢离合，月有阴晴圆缺，此事古难全。",
        "explanation": "词人由望月遐想转向思念亲人，最终以豁达胸襟祝愿天下离人长久团圆。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-004",
    "sequence": 4,
    "title": "月夜忆舍弟",
    "author": "杜甫",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "戍鼓断人行，边秋一雁声。",
      "露从今夜白，月是故乡明。",
      "有弟皆分散，无家问死生。",
      "寄书长不达，况乃未休兵。"
    ],
    "stanzaGroups": [
      [
        "戍鼓断人行，边秋一雁声。",
        "露从今夜白，月是故乡明。"
      ],
      [
        "有弟皆分散，无家问死生。",
        "寄书长不达，况乃未休兵。"
      ]
    ],
    "meaningSummary": "战乱中的秋夜，诗人听鼓望月，牵挂离散的兄弟和故乡，忧思深切。",
    "keyNotes": [
      {
        "term": "舍弟",
        "meaning": "对自己弟弟的谦称"
      },
      {
        "term": "戍鼓",
        "meaning": "戍楼上的鼓声"
      },
      {
        "term": "况乃",
        "meaning": "何况是"
      }
    ],
    "matchedTo53": false,
    "printedPage": 65,
    "famousQuote": "戍鼓断人行，边秋一雁声。露从今夜白，月是故乡明。",
    "examFocus": "战乱中的秋夜，诗人听鼓望月，牵挂离散的兄弟和故乡，忧思深切。",
    "errorTrap": "重点掌握：“舍弟”（对自己弟弟的谦称）的书写与释义。",
    "maskedWords": [
      {
        "word": "舍弟",
        "trapReason": "对自己弟弟的谦称"
      },
      {
        "word": "戍鼓",
        "trapReason": "戍楼上的鼓声"
      },
      {
        "word": "况乃",
        "trapReason": "何况是"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《月夜忆舍弟》中，作者杜甫表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "戍鼓断人行，边秋一雁声。",
        "explanation": "战乱中的秋夜，诗人听鼓望月，牵挂离散的兄弟和故乡，忧思深切。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-005",
    "sequence": 5,
    "title": "长沙过贾谊宅",
    "author": "刘长卿",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言律诗",
    "stanzas": [
      "三年谪宦此栖迟，万古惟留楚客悲。",
      "秋草独寻人去后，寒林空见日斜时。",
      "汉文有道恩犹薄，湘水无情吊岂知？",
      "寂寂江山摇落处，怜君何事到天涯。"
    ],
    "stanzaGroups": [
      [
        "三年谪宦此栖迟，万古惟留楚客悲。",
        "秋草独寻人去后，寒林空见日斜时。"
      ],
      [
        "汉文有道恩犹薄，湘水无情吊岂知？",
        "寂寂江山摇落处，怜君何事到天涯。"
      ]
    ],
    "meaningSummary": "诗人凭吊贾谊，借古人被贬的遭遇抒发怀才不遇、感伤自身的情怀。",
    "keyNotes": [
      {
        "term": "谪宦",
        "meaning": "被贬谪、降职"
      },
      {
        "term": "栖迟",
        "meaning": "停留"
      },
      {
        "term": "楚客",
        "meaning": "指贾谊"
      }
    ],
    "matchedTo53": false,
    "printedPage": 65,
    "famousQuote": "三年谪宦此栖迟，万古惟留楚客悲。秋草独寻人去后，寒林空见日斜时。",
    "examFocus": "诗人凭吊贾谊，借古人被贬的遭遇抒发怀才不遇、感伤自身的情怀。",
    "errorTrap": "重点掌握：“谪宦”（被贬谪、降职）的书写与释义。",
    "maskedWords": [
      {
        "word": "谪宦",
        "trapReason": "被贬谪、降职"
      },
      {
        "word": "栖迟",
        "trapReason": "停留"
      },
      {
        "word": "楚客",
        "trapReason": "指贾谊"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《长沙过贾谊宅》中，作者刘长卿表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "三年谪宦此栖迟，万古惟留楚客悲。",
        "explanation": "诗人凭吊贾谊，借古人被贬的遭遇抒发怀才不遇、感伤自身的情怀。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-006",
    "sequence": 6,
    "title": "左迁至蓝关示侄孙湘",
    "author": "韩愈",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "七言律诗",
    "stanzas": [
      "一封朝奏九重天，夕贬潮州路八千。",
      "欲为圣明除弊事，肯将衰朽惜残年！",
      "云横秦岭家何在？雪拥蓝关马不前。",
      "知汝远来应有意，好收吾骨瘴江边。"
    ],
    "stanzaGroups": [
      [
        "一封朝奏九重天，夕贬潮州路八千。",
        "欲为圣明除弊事，肯将衰朽惜残年！"
      ],
      [
        "云横秦岭家何在？雪拥蓝关马不前。",
        "知汝远来应有意，好收吾骨瘴江边。"
      ]
    ],
    "meaningSummary": "诗人因直言进谏遭贬，表达忠而获罪的愤懑，也写出前途艰险和对亲人的牵挂。",
    "keyNotes": [
      {
        "term": "左迁",
        "meaning": "贬官、降职"
      },
      {
        "term": "九重天",
        "meaning": "指朝廷"
      },
      {
        "term": "瘴江",
        "meaning": "瘴气弥漫的江南地区"
      }
    ],
    "matchedTo53": false,
    "printedPage": 66,
    "famousQuote": "一封朝奏九重天，夕贬潮州路八千。欲为圣明除弊事，肯将衰朽惜残年！",
    "examFocus": "诗人因直言进谏遭贬，表达忠而获罪的愤懑，也写出前途艰险和对亲人的牵挂。",
    "errorTrap": "重点掌握：“左迁”（贬官、降职）的书写与释义。",
    "maskedWords": [
      {
        "word": "左迁",
        "trapReason": "贬官、降职"
      },
      {
        "word": "九重天",
        "trapReason": "指朝廷"
      },
      {
        "word": "瘴江",
        "trapReason": "瘴气弥漫的江南地区"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《左迁至蓝关示侄孙湘》中，作者韩愈表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "一封朝奏九重天，夕贬潮州路八千。",
        "explanation": "诗人因直言进谏遭贬，表达忠而获罪的愤懑，也写出前途艰险和对亲人的牵挂。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-007",
    "sequence": 7,
    "title": "商山早行",
    "author": "温庭筠",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（一）",
    "contentType": "课外古诗词诵读",
    "genre": "五言律诗",
    "stanzas": [
      "晨起动征铎，客行悲故乡。",
      "鸡声茅店月，人迹板桥霜。",
      "槲叶落山路，枳花明驿墙。",
      "因思杜陵梦，凫雁满回塘。"
    ],
    "stanzaGroups": [
      [
        "晨起动征铎，客行悲故乡。",
        "鸡声茅店月，人迹板桥霜。"
      ],
      [
        "槲叶落山路，枳花明驿墙。",
        "因思杜陵梦，凫雁满回塘。"
      ]
    ],
    "meaningSummary": "诗人清晨赶路，以鸡声、茅店、晓月、板桥霜等景物写羁旅辛苦和思乡之情。",
    "keyNotes": [
      {
        "term": "征铎",
        "meaning": "远行车马上的铃铛"
      },
      {
        "term": "槲叶",
        "meaning": "槲树的叶子"
      },
      {
        "term": "杜陵",
        "meaning": "诗人长安附近的故乡"
      }
    ],
    "matchedTo53": false,
    "printedPage": 66,
    "famousQuote": "晨起动征铎，客行悲故乡。鸡声茅店月，人迹板桥霜。",
    "examFocus": "诗人清晨赶路，以鸡声、茅店、晓月、板桥霜等景物写羁旅辛苦和思乡之情。",
    "errorTrap": "重点掌握：“征铎”（远行车马上的铃铛）的书写与释义。",
    "maskedWords": [
      {
        "word": "征铎",
        "trapReason": "远行车马上的铃铛"
      },
      {
        "word": "槲叶",
        "trapReason": "槲树的叶子"
      },
      {
        "word": "杜陵",
        "trapReason": "诗人长安附近的故乡"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《商山早行》中，作者温庭筠表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "晨起动征铎，客行悲故乡。",
        "explanation": "诗人清晨赶路，以鸡声、茅店、晓月、板桥霜等景物写羁旅辛苦和思乡之情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-008",
    "sequence": 8,
    "title": "十五从军征",
    "author": "汉乐府",
    "dynasty": "汉代",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词曲五首",
    "contentType": "课内古诗",
    "genre": "乐府民歌",
    "stanzas": [
      "十五从军征，八十始得归。",
      "道逢乡里人：家中有阿谁？",
      "遥看是君家，松柏冢累累。",
      "兔从狗窦入，雉从梁上飞。",
      "中庭生旅谷，井上生旅葵。",
      "舂谷持作饭，采葵持作羹。",
      "羹饭一时熟，不知贻阿谁。",
      "出门东向看，泪落沾我衣。"
    ],
    "stanzaGroups": [
      [
        "十五从军征，八十始得归。",
        "道逢乡里人：家中有阿谁？",
        "遥看是君家，松柏冢累累。"
      ],
      [
        "兔从狗窦入，雉从梁上飞。",
        "中庭生旅谷，井上生旅葵。"
      ],
      [
        "舂谷持作饭，采葵持作羹。",
        "羹饭一时熟，不知贻阿谁。",
        "出门东向看，泪落沾我衣。"
      ]
    ],
    "meaningSummary": "老兵久征归乡，却见家园荒芜、亲人尽失，表现战争给百姓造成的深重灾难。",
    "keyNotes": [
      {
        "term": "始",
        "meaning": "才"
      },
      {
        "term": "冢",
        "meaning": "坟墓"
      },
      {
        "term": "旅谷",
        "meaning": "野生的谷子"
      },
      {
        "term": "贻",
        "meaning": "送给"
      }
    ],
    "matchedTo53": true,
    "printedPage": 150,
    "famousQuote": "十五从军征，八十始得归。道逢乡里人：家中有阿谁？",
    "examFocus": "老兵久征归乡，却见家园荒芜、亲人尽失，表现战争给百姓造成的深重灾难。",
    "errorTrap": "重点掌握：“始”（才）的书写与释义。",
    "maskedWords": [
      {
        "word": "始",
        "trapReason": "才"
      },
      {
        "word": "冢",
        "trapReason": "坟墓"
      },
      {
        "word": "旅谷",
        "trapReason": "野生的谷子"
      },
      {
        "word": "贻",
        "trapReason": "送给"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《十五从军征》中，作者汉乐府表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "十五从军征，八十始得归。",
        "explanation": "老兵久征归乡，却见家园荒芜、亲人尽失，表现战争给百姓造成的深重灾难。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-009",
    "sequence": 9,
    "title": "白雪歌送武判官归京",
    "author": "岑参",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词曲五首",
    "contentType": "课内古诗",
    "genre": "歌行体",
    "stanzas": [
      "北风卷地白草折，胡天八月即飞雪。",
      "忽如一夜春风来，千树万树梨花开。",
      "散入珠帘湿罗幕，狐裘不暖锦衾薄。",
      "将军角弓不得控，都护铁衣冷难着。",
      "瀚海阑干百丈冰，愁云惨淡万里凝。",
      "中军置酒饮归客，胡琴琵琶与羌笛。",
      "纷纷暮雪下辕门，风掣红旗冻不翻。",
      "轮台东门送君去，去时雪满天山路。",
      "山回路转不见君，雪上空留马行处。"
    ],
    "stanzaGroups": [
      [
        "北风卷地白草折，胡天八月即飞雪。",
        "忽如一夜春风来，千树万树梨花开。"
      ],
      [
        "散入珠帘湿罗幕，狐裘不暖锦衾薄。",
        "将军角弓不得控，都护铁衣冷难着。"
      ],
      [
        "瀚海阑干百丈冰，愁云惨淡万里凝。",
        "中军置酒饮归客，胡琴琵琶与羌笛。"
      ],
      [
        "纷纷暮雪下辕门，风掣红旗冻不翻。",
        "轮台东门送君去，去时雪满天山路。",
        "山回路转不见君，雪上空留马行处。"
      ]
    ],
    "meaningSummary": "诗人先写边塞奇寒和壮丽雪景，再写设宴送别，以雪中空留马迹收束惜别之情。",
    "keyNotes": [
      {
        "term": "白草",
        "meaning": "西北地区的一种草"
      },
      {
        "term": "瀚海",
        "meaning": "沙漠"
      },
      {
        "term": "掣",
        "meaning": "拉、扯"
      }
    ],
    "matchedTo53": true,
    "printedPage": 151,
    "famousQuote": "忽如一夜春风来，千树万树梨花开。",
    "examFocus": "诗人先写边塞奇寒和壮丽雪景，再写设宴送别，以雪中空留马迹收束惜别之情。",
    "errorTrap": "重点掌握：“白草”（西北地区的一种草）的书写与释义。",
    "maskedWords": [
      {
        "word": "白草",
        "trapReason": "西北地区的一种草"
      },
      {
        "word": "瀚海",
        "trapReason": "沙漠"
      },
      {
        "word": "掣",
        "trapReason": "拉、扯"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《白雪歌送武判官归京》中，作者岑参表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "忽如一夜春风来，千树万树梨花开。",
        "explanation": "诗人先写边塞奇寒和壮丽雪景，再写设宴送别，以雪中空留马迹收束惜别之情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-010",
    "sequence": 10,
    "title": "南乡子·登京口北固亭有怀",
    "author": "辛弃疾",
    "dynasty": "南宋",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词曲五首",
    "contentType": "课内词",
    "genre": "词·南乡子",
    "stanzas": [
      "何处望神州？满眼风光北固楼。",
      "千古兴亡多少事？悠悠。不尽长江滚滚流。",
      "年少万兜鍪，坐断东南战未休。",
      "天下英雄谁敌手？曹刘。生子当如孙仲谋。"
    ],
    "stanzaGroups": [
      [
        "何处望神州？满眼风光北固楼。",
        "千古兴亡多少事？悠悠。不尽长江滚滚流。"
      ],
      [
        "年少万兜鍪，坐断东南战未休。",
        "天下英雄谁敌手？曹刘。生子当如孙仲谋。"
      ]
    ],
    "meaningSummary": "词人登楼眺望，追怀孙权的英雄业绩，借古讽今，寄寓对南宋朝廷的期望。",
    "keyNotes": [
      {
        "term": "神州",
        "meaning": "中原地区"
      },
      {
        "term": "兜鍪",
        "meaning": "头盔，借指士兵"
      },
      {
        "term": "坐断",
        "meaning": "占据、割据"
      }
    ],
    "matchedTo53": true,
    "printedPage": 151,
    "famousQuote": "何处望神州？满眼风光北固楼。千古兴亡多少事？悠悠。不尽长江滚滚流。",
    "examFocus": "词人登楼眺望，追怀孙权的英雄业绩，借古讽今，寄寓对南宋朝廷的期望。",
    "errorTrap": "重点掌握：“神州”（中原地区）的书写与释义。",
    "maskedWords": [
      {
        "word": "神州",
        "trapReason": "中原地区"
      },
      {
        "word": "兜鍪",
        "trapReason": "头盔，借指士兵"
      },
      {
        "word": "坐断",
        "trapReason": "占据、割据"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《南乡子·登京口北固亭有怀》中，作者辛弃疾表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "何处望神州？满眼风光北固楼。",
        "explanation": "词人登楼眺望，追怀孙权的英雄业绩，借古讽今，寄寓对南宋朝廷的期望。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-011",
    "sequence": 11,
    "title": "过零丁洋",
    "author": "文天祥",
    "dynasty": "南宋",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词曲五首",
    "contentType": "课内古诗",
    "genre": "七言律诗",
    "stanzas": [
      "辛苦遭逢起一经，干戈寥落四周星。",
      "山河破碎风飘絮，身世浮沉雨打萍。",
      "惶恐滩头说惶恐，零丁洋里叹零丁。",
      "人生自古谁无死？留取丹心照汗青。"
    ],
    "stanzaGroups": [
      [
        "辛苦遭逢起一经，干戈寥落四周星。",
        "山河破碎风飘絮，身世浮沉雨打萍。"
      ],
      [
        "惶恐滩头说惶恐，零丁洋里叹零丁。",
        "人生自古谁无死？留取丹心照汗青。"
      ]
    ],
    "meaningSummary": "诗人回顾抗元经历和艰险处境，最后以舍生取义的誓言表达坚定的爱国气节。",
    "keyNotes": [
      {
        "term": "起一经",
        "meaning": "因精通经书而通过科举入仕"
      },
      {
        "term": "四周星",
        "meaning": "四年"
      },
      {
        "term": "汗青",
        "meaning": "史册"
      }
    ],
    "matchedTo53": true,
    "printedPage": 152,
    "famousQuote": "人生自古谁无死？留取丹心照汗青。",
    "examFocus": "诗人回顾抗元经历和艰险处境，最后以舍生取义的誓言表达坚定的爱国气节。",
    "errorTrap": "重点掌握：“起一经”（因精通经书而通过科举入仕）的书写与释义。",
    "maskedWords": [
      {
        "word": "起一经",
        "trapReason": "因精通经书而通过科举入仕"
      },
      {
        "word": "四周星",
        "trapReason": "四年"
      },
      {
        "word": "汗青",
        "trapReason": "史册"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《过零丁洋》中，作者文天祥表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "人生自古谁无死？留取丹心照汗青。",
        "explanation": "诗人回顾抗元经历和艰险处境，最后以舍生取义的誓言表达坚定的爱国气节。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-012",
    "sequence": 12,
    "title": "山坡羊·潼关怀古",
    "author": "张养浩",
    "dynasty": "元",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "诗词曲五首",
    "contentType": "课内散曲",
    "genre": "散曲·小令",
    "stanzas": [
      "峰峦如聚，波涛如怒，山河表里潼关路。",
      "望西都，意踌躇。",
      "伤心秦汉经行处，宫阙万间都做了土。",
      "兴，百姓苦；亡，百姓苦。"
    ],
    "stanzaGroups": [
      [
        "峰峦如聚，波涛如怒，山河表里潼关路。",
        "望西都，意踌躇。"
      ],
      [
        "伤心秦汉经行处，宫阙万间都做了土。",
        "兴，百姓苦；亡，百姓苦。"
      ]
    ],
    "meaningSummary": "作者凭吊潼关和历代兴亡，指出王朝更替中受苦的始终是百姓。",
    "keyNotes": [
      {
        "term": "西都",
        "meaning": "长安"
      },
      {
        "term": "踌躇",
        "meaning": "心绪不宁"
      },
      {
        "term": "山河表里",
        "meaning": "外有黄河、内有华山"
      }
    ],
    "matchedTo53": true,
    "printedPage": 153,
    "famousQuote": "兴，百姓苦；亡，百姓苦。",
    "examFocus": "作者凭吊潼关和历代兴亡，指出王朝更替中受苦的始终是百姓。",
    "errorTrap": "重点掌握：“西都”（长安）的书写与释义。",
    "maskedWords": [
      {
        "word": "西都",
        "trapReason": "长安"
      },
      {
        "word": "踌躇",
        "trapReason": "心绪不宁"
      },
      {
        "word": "山河表里",
        "trapReason": "外有黄河、内有华山"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《山坡羊·潼关怀古》中，作者张养浩表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "兴，百姓苦；亡，百姓苦。",
        "explanation": "作者凭吊潼关和历代兴亡，指出王朝更替中受苦的始终是百姓。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-013",
    "sequence": 13,
    "title": "咸阳城东楼",
    "author": "许浑",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言律诗",
    "stanzas": [
      "一上高城万里愁，蒹葭杨柳似汀洲。",
      "溪云初起日沉阁，山雨欲来风满楼。",
      "鸟下绿芜秦苑夕，蝉鸣黄叶汉宫秋。",
      "行人莫问当年事，故国东来渭水流。"
    ],
    "stanzaGroups": [
      [
        "一上高城万里愁，蒹葭杨柳似汀洲。",
        "溪云初起日沉阁，山雨欲来风满楼。"
      ],
      [
        "鸟下绿芜秦苑夕，蝉鸣黄叶汉宫秋。",
        "行人莫问当年事，故国东来渭水流。"
      ]
    ],
    "meaningSummary": "诗人登楼远望，由眼前山雨将至的景象联想到秦汉旧都的衰败和历史兴亡。",
    "keyNotes": [
      {
        "term": "汀洲",
        "meaning": "水边平地"
      },
      {
        "term": "秦苑",
        "meaning": "秦代宫苑"
      },
      {
        "term": "故国",
        "meaning": "旧都，指咸阳"
      }
    ],
    "matchedTo53": false,
    "printedPage": 159,
    "famousQuote": "一上高城万里愁，蒹葭杨柳似汀洲。溪云初起日沉阁，山雨欲来风满楼。",
    "examFocus": "诗人登楼远望，由眼前山雨将至的景象联想到秦汉旧都的衰败和历史兴亡。",
    "errorTrap": "重点掌握：“汀洲”（水边平地）的书写与释义。",
    "maskedWords": [
      {
        "word": "汀洲",
        "trapReason": "水边平地"
      },
      {
        "word": "秦苑",
        "trapReason": "秦代宫苑"
      },
      {
        "word": "故国",
        "trapReason": "旧都，指咸阳"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《咸阳城东楼》中，作者许浑表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "一上高城万里愁，蒹葭杨柳似汀洲。",
        "explanation": "诗人登楼远望，由眼前山雨将至的景象联想到秦汉旧都的衰败和历史兴亡。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-014",
    "sequence": 14,
    "title": "无题（相见时难别亦难）",
    "author": "李商隐",
    "dynasty": "唐",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "七言律诗",
    "stanzas": [
      "相见时难别亦难，东风无力百花残。",
      "春蚕到死丝方尽，蜡炬成灰泪始干。",
      "晓镜但愁云鬓改，夜吟应觉月光寒。",
      "蓬山此去无多路，青鸟殷勤为探看。"
    ],
    "stanzaGroups": [
      [
        "相见时难别亦难，东风无力百花残。",
        "春蚕到死丝方尽，蜡炬成灰泪始干。"
      ],
      [
        "晓镜但愁云鬓改，夜吟应觉月光寒。",
        "蓬山此去无多路，青鸟殷勤为探看。"
      ]
    ],
    "meaningSummary": "诗人写相聚与离别的艰难，借春蚕、蜡炬表达至死不渝的思念，并盼望传信相见。",
    "keyNotes": [
      {
        "term": "丝",
        "meaning": "谐音双关“思”"
      },
      {
        "term": "蓬山",
        "meaning": "传说中的仙山，这里指对方居所"
      },
      {
        "term": "青鸟",
        "meaning": "传信的使者"
      }
    ],
    "matchedTo53": true,
    "printedPage": 159,
    "famousQuote": "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。",
    "examFocus": "诗人写相聚与离别的艰难，借春蚕、蜡炬表达至死不渝的思念，并盼望传信相见。",
    "errorTrap": "重点掌握：“丝”（谐音双关“思”）的书写与释义。",
    "maskedWords": [
      {
        "word": "丝",
        "trapReason": "谐音双关“思”"
      },
      {
        "word": "蓬山",
        "trapReason": "传说中的仙山，这里指对方居所"
      },
      {
        "word": "青鸟",
        "trapReason": "传信的使者"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《无题（相见时难别亦难）》中，作者李商隐表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "相见时难别亦难，东风无力百花残。",
        "explanation": "诗人写相聚与离别的艰难，借春蚕、蜡炬表达至死不渝的思念，并盼望传信相见。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-015",
    "sequence": 15,
    "title": "浣溪沙（漠漠轻寒上小楼）",
    "author": "秦观",
    "dynasty": "北宋",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·浣溪沙",
    "stanzas": [
      "漠漠轻寒上小楼，晓阴无赖似穷秋。",
      "淡烟流水画屏幽。",
      "自在飞花轻似梦，无边丝雨细如愁。",
      "宝帘闲挂小银钩。"
    ],
    "stanzaGroups": [
      [
        "漠漠轻寒上小楼，晓阴无赖似穷秋。",
        "淡烟流水画屏幽。"
      ],
      [
        "自在飞花轻似梦，无边丝雨细如愁。",
        "宝帘闲挂小银钩。"
      ]
    ],
    "meaningSummary": "词人写清晨登楼所见的轻寒、淡烟、飞花和细雨，以细腻景物传达淡淡愁绪。",
    "keyNotes": [
      {
        "term": "漠漠",
        "meaning": "弥漫、广布的样子"
      },
      {
        "term": "无赖",
        "meaning": "这里指令人无奈"
      },
      {
        "term": "穷秋",
        "meaning": "深秋"
      }
    ],
    "matchedTo53": false,
    "printedPage": 160,
    "famousQuote": "漠漠轻寒上小楼，晓阴无赖似穷秋。淡烟流水画屏幽。",
    "examFocus": "词人写清晨登楼所见的轻寒、淡烟、飞花和细雨，以细腻景物传达淡淡愁绪。",
    "errorTrap": "重点掌握：“漠漠”（弥漫、广布的样子）的书写与释义。",
    "maskedWords": [
      {
        "word": "漠漠",
        "trapReason": "弥漫、广布的样子"
      },
      {
        "word": "无赖",
        "trapReason": "这里指令人无奈"
      },
      {
        "word": "穷秋",
        "trapReason": "深秋"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《浣溪沙（漠漠轻寒上小楼）》中，作者秦观表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "漠漠轻寒上小楼，晓阴无赖似穷秋。",
        "explanation": "词人写清晨登楼所见的轻寒、淡烟、飞花和细雨，以细腻景物传达淡淡愁绪。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-1-016",
    "sequence": 16,
    "title": "丑奴儿·书博山道中壁",
    "author": "辛弃疾",
    "dynasty": "南宋",
    "volume": "九年级上册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "上册",
    "textbookSection": "课外古诗词诵读（二）",
    "contentType": "课外古诗词诵读",
    "genre": "词·丑奴儿",
    "stanzas": [
      "少年不识愁滋味，爱上层楼。爱上层楼，为赋新词强说愁。",
      "而今识尽愁滋味，欲说还休。欲说还休，却道“天凉好个秋”。"
    ],
    "stanzaGroups": [
      [
        "少年不识愁滋味，爱上层楼。爱上层楼，为赋新词强说愁。"
      ],
      [
        "而今识尽愁滋味，欲说还休。欲说还休，却道“天凉好个秋”。"
      ]
    ],
    "meaningSummary": "词人以少年与如今对愁的不同感受作对比，写出历经世事后难以言说的沉郁。",
    "keyNotes": [
      {
        "term": "书",
        "meaning": "题写"
      },
      {
        "term": "强说愁",
        "meaning": "勉强写愁、说愁"
      },
      {
        "term": "欲说还休",
        "meaning": "想说却又停住"
      }
    ],
    "matchedTo53": false,
    "printedPage": 160,
    "famousQuote": "少年不识愁滋味，爱上层楼。爱上层楼，为赋新词强说愁。而今识尽愁滋味，欲说还休。欲说还休，却道“天凉好个秋”。",
    "examFocus": "词人以少年与如今对愁的不同感受作对比，写出历经世事后难以言说的沉郁。",
    "errorTrap": "重点掌握：“书”（题写）的书写与释义。",
    "maskedWords": [
      {
        "word": "书",
        "trapReason": "题写"
      },
      {
        "word": "强说愁",
        "trapReason": "勉强写愁、说愁"
      },
      {
        "word": "欲说还休",
        "trapReason": "想说却又停住"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《丑奴儿·书博山道中壁》中，作者辛弃疾表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "少年不识愁滋味，爱上层楼。",
        "explanation": "词人以少年与如今对愁的不同感受作对比，写出历经世事后难以言说的沉郁。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-001",
    "sequence": 1,
    "title": "渔家傲·秋思",
    "author": "范仲淹",
    "dynasty": "北宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "词四首",
    "contentType": "课内词",
    "genre": "词·渔家傲",
    "stanzas": [
      "塞下秋来风景异，衡阳雁去无留意。",
      "四面边声连角起，千嶂里，长烟落日孤城闭。",
      "浊酒一杯家万里，燕然未勒归无计。",
      "羌管悠悠霜满地，人不寐，将军白发征夫泪。"
    ],
    "stanzaGroups": [
      [
        "塞下秋来风景异，衡阳雁去无留意。",
        "四面边声连角起，千嶂里，长烟落日孤城闭。"
      ],
      [
        "浊酒一杯家万里，燕然未勒归无计。",
        "羌管悠悠霜满地，人不寐，将军白发征夫泪。"
      ]
    ],
    "meaningSummary": "词人描写边塞秋景和孤城闭守，写出将士思乡却因战事未成而不能归的复杂心情。",
    "keyNotes": [
      {
        "term": "边声",
        "meaning": "边塞特有的声音"
      },
      {
        "term": "千嶂",
        "meaning": "层层叠叠的山峰"
      },
      {
        "term": "燕然未勒",
        "meaning": "尚未建立战功、边患未平"
      }
    ],
    "matchedTo53": true,
    "printedPage": null,
    "famousQuote": "浊酒一杯家万里，燕然未勒归无计。羌管悠悠霜满地。",
    "examFocus": "词人描写边塞秋景和孤城闭守，写出将士思乡却因战事未成而不能归的复杂心情。",
    "errorTrap": "重点掌握：“边声”（边塞特有的声音）的书写与释义。",
    "maskedWords": [
      {
        "word": "边声",
        "trapReason": "边塞特有的声音"
      },
      {
        "word": "千嶂",
        "trapReason": "层层叠叠的山峰"
      },
      {
        "word": "燕然未勒",
        "trapReason": "尚未建立战功、边患未平"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《渔家傲·秋思》中，作者范仲淹表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "浊酒一杯家万里，燕然未勒归无计。",
        "explanation": "词人描写边塞秋景和孤城闭守，写出将士思乡却因战事未成而不能归的复杂心情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-002",
    "sequence": 2,
    "title": "江城子·密州出猎",
    "author": "苏轼",
    "dynasty": "北宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "词四首",
    "contentType": "课内词",
    "genre": "词·江城子",
    "stanzas": [
      "老夫聊发少年狂。左牵黄，右擎苍。",
      "锦帽貂裘，千骑卷平冈。",
      "为报倾城随太守，亲射虎，看孙郎。",
      "酒酣胸胆尚开张。鬓微霜，又何妨！",
      "持节云中，何日遣冯唐？",
      "会挽雕弓如满月，西北望，射天狼。"
    ],
    "stanzaGroups": [
      [
        "老夫聊发少年狂。左牵黄，右擎苍。",
        "锦帽貂裘，千骑卷平冈。"
      ],
      [
        "为报倾城随太守，亲射虎，看孙郎。",
        "酒酣胸胆尚开张。鬓微霜，又何妨！"
      ],
      [
        "持节云中，何日遣冯唐？",
        "会挽雕弓如满月，西北望，射天狼。"
      ]
    ],
    "meaningSummary": "词人描写出猎盛况，借孙权和冯唐典故抒写报国壮志及渴望得到重用的心情。",
    "keyNotes": [
      {
        "term": "擎苍",
        "meaning": "举着苍鹰"
      },
      {
        "term": "倾城",
        "meaning": "全城的人"
      },
      {
        "term": "天狼",
        "meaning": "此处指侵扰边境的敌人"
      }
    ],
    "matchedTo53": true,
    "printedPage": null,
    "famousQuote": "会挽雕弓如满月，西北望，射天狼。",
    "examFocus": "词人描写出猎盛况，借孙权和冯唐典故抒写报国壮志及渴望得到重用的心情。",
    "errorTrap": "重点掌握：“擎苍”（举着苍鹰）的书写与释义。",
    "maskedWords": [
      {
        "word": "擎苍",
        "trapReason": "举着苍鹰"
      },
      {
        "word": "倾城",
        "trapReason": "全城的人"
      },
      {
        "word": "天狼",
        "trapReason": "此处指侵扰边境的敌人"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《江城子·密州出猎》中，作者苏轼表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "会挽雕弓如满月，西北望，射天狼。",
        "explanation": "词人描写出猎盛况，借孙权和冯唐典故抒写报国壮志及渴望得到重用的心情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-003",
    "sequence": 3,
    "title": "破阵子·为陈同甫赋壮词以寄之",
    "author": "辛弃疾",
    "dynasty": "南宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "词四首",
    "contentType": "课内词",
    "genre": "词·破阵子",
    "stanzas": [
      "醉里挑灯看剑，梦回吹角连营。",
      "八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。",
      "马作的卢飞快，弓如霹雳弦惊。",
      "了却君王天下事，赢得生前身后名。",
      "可怜白发生！"
    ],
    "stanzaGroups": [
      [
        "醉里挑灯看剑，梦回吹角连营。",
        "八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。"
      ],
      [
        "马作的卢飞快，弓如霹雳弦惊。",
        "了却君王天下事，赢得生前身后名。",
        "可怜白发生！"
      ]
    ],
    "meaningSummary": "词人以梦境再现军营生活和战斗场面，表达收复失地、建功立业的壮志及理想落空的悲愤。",
    "keyNotes": [
      {
        "term": "八百里",
        "meaning": "指牛"
      },
      {
        "term": "麾下",
        "meaning": "部下"
      },
      {
        "term": "了却",
        "meaning": "完成"
      },
      {
        "term": "可怜",
        "meaning": "可惜"
      }
    ],
    "matchedTo53": true,
    "printedPage": null,
    "famousQuote": "了却君王天下事，赢得生前身后名。可怜白发生！",
    "examFocus": "词人以梦境再现军营生活和战斗场面，表达收复失地、建功立业的壮志及理想落空的悲愤。",
    "errorTrap": "重点掌握：“八百里”（指牛）的书写与释义。",
    "maskedWords": [
      {
        "word": "八百里",
        "trapReason": "指牛"
      },
      {
        "word": "麾下",
        "trapReason": "部下"
      },
      {
        "word": "了却",
        "trapReason": "完成"
      },
      {
        "word": "可怜",
        "trapReason": "可惜"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《破阵子·为陈同甫赋壮词以寄之》中，作者辛弃疾表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "了却君王天下事，赢得生前身后名。",
        "explanation": "词人以梦境再现军营生活和战斗场面，表达收复失地、建功立业的壮志及理想落空的悲愤。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-004",
    "sequence": 4,
    "title": "满江红（小住京华）",
    "author": "秋瑾",
    "dynasty": "清",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "词四首",
    "contentType": "课内词",
    "genre": "词·满江红",
    "stanzas": [
      "小住京华，早又是，中秋佳节。",
      "为篱下黄花开遍，秋容如拭。",
      "四面歌残终破楚，八年风味徒思浙。",
      "苦将侬，强派作蛾眉，殊未屑！",
      "身不得，男儿列；心却比，男儿烈。",
      "算平生肝胆，因人常热。",
      "俗子胸襟谁识我？英雄末路当磨折。",
      "莽红尘，何处觅知音？青衫湿！"
    ],
    "stanzaGroups": [
      [
        "小住京华，早又是，中秋佳节。",
        "为篱下黄花开遍，秋容如拭。"
      ],
      [
        "四面歌残终破楚，八年风味徒思浙。",
        "苦将侬，强派作蛾眉，殊未屑！"
      ],
      [
        "身不得，男儿列；心却比，男儿烈。",
        "算平生肝胆，因人常热。"
      ],
      [
        "俗子胸襟谁识我？英雄末路当磨折。",
        "莽红尘，何处觅知音？青衫湿！"
      ]
    ],
    "meaningSummary": "词人借中秋秋景抒发身为女子却胸怀男儿壮志的豪情，也写出知音难觅的孤独。",
    "keyNotes": [
      {
        "term": "京华",
        "meaning": "京城"
      },
      {
        "term": "蛾眉",
        "meaning": "女子细长而弯的眉毛，借指女子"
      },
      {
        "term": "殊未屑",
        "meaning": "很不屑"
      }
    ],
    "matchedTo53": true,
    "printedPage": null,
    "famousQuote": "小住京华，早又是，中秋佳节。为篱下黄花开遍，秋容如拭。",
    "examFocus": "词人借中秋秋景抒发身为女子却胸怀男儿壮志的豪情，也写出知音难觅的孤独。",
    "errorTrap": "重点掌握：“京华”（京城）的书写与释义。",
    "maskedWords": [
      {
        "word": "京华",
        "trapReason": "京城"
      },
      {
        "word": "蛾眉",
        "trapReason": "女子细长而弯的眉毛，借指女子"
      },
      {
        "word": "殊未屑",
        "trapReason": "很不屑"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《满江红（小住京华）》中，作者秋瑾表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "小住京华，早又是，中秋佳节。",
        "explanation": "词人借中秋秋景抒发身为女子却胸怀男儿壮志的豪情，也写出知音难觅的孤独。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-005",
    "sequence": 5,
    "title": "定风波（莫听穿林打叶声）",
    "author": "苏轼",
    "dynasty": "北宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读",
    "contentType": "课外古诗词诵读",
    "genre": "词·定风波",
    "stanzas": [
      "莫听穿林打叶声，何妨吟啸且徐行。",
      "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。",
      "料峭春风吹酒醒，微冷，山头斜照却相迎。",
      "回首向来萧瑟处，归去，也无风雨也无晴。"
    ],
    "stanzaGroups": [
      [
        "莫听穿林打叶声，何妨吟啸且徐行。",
        "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。"
      ],
      [
        "料峭春风吹酒醒，微冷，山头斜照却相迎。",
        "回首向来萧瑟处，归去，也无风雨也无晴。"
      ]
    ],
    "meaningSummary": "词人雨中徐行，面对风雨仍从容自若，借自然天气变化表达豁达的人生态度。",
    "keyNotes": [
      {
        "term": "吟啸",
        "meaning": "吟咏长啸"
      },
      {
        "term": "芒鞋",
        "meaning": "草鞋"
      },
      {
        "term": "料峭",
        "meaning": "形容微寒"
      }
    ],
    "matchedTo53": false,
    "printedPage": null,
    "famousQuote": "莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。",
    "examFocus": "词人雨中徐行，面对风雨仍从容自若，借自然天气变化表达豁达的人生态度。",
    "errorTrap": "重点掌握：“吟啸”（吟咏长啸）的书写与释义。",
    "maskedWords": [
      {
        "word": "吟啸",
        "trapReason": "吟咏长啸"
      },
      {
        "word": "芒鞋",
        "trapReason": "草鞋"
      },
      {
        "word": "料峭",
        "trapReason": "形容微寒"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《定风波（莫听穿林打叶声）》中，作者苏轼表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "莫听穿林打叶声，何妨吟啸且徐行。",
        "explanation": "词人雨中徐行，面对风雨仍从容自若，借自然天气变化表达豁达的人生态度。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-006",
    "sequence": 6,
    "title": "临江仙（夜登小阁，忆洛中旧游）",
    "author": "陈与义",
    "dynasty": "南宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读",
    "contentType": "课外古诗词诵读",
    "genre": "词·临江仙",
    "stanzas": [
      "忆昔午桥桥上饮，坐中多是豪英。",
      "长沟流月去无声。",
      "杏花疏影里，吹笛到天明。",
      "二十余年如一梦，此身虽在堪惊。",
      "闲登小阁看新晴。",
      "古今多少事，渔唱起三更。"
    ],
    "stanzaGroups": [
      [
        "忆昔午桥桥上饮，坐中多是豪英。",
        "长沟流月去无声。",
        "杏花疏影里，吹笛到天明。"
      ],
      [
        "二十余年如一梦，此身虽在堪惊。",
        "闲登小阁看新晴。",
        "古今多少事，渔唱起三更。"
      ]
    ],
    "meaningSummary": "词人追忆洛阳旧游和昔日豪英，感叹二十余年世事如梦，借渔歌表现旷达中的苍凉。",
    "keyNotes": [
      {
        "term": "午桥",
        "meaning": "洛阳附近的桥名"
      },
      {
        "term": "堪惊",
        "meaning": "令人惊叹、感慨"
      },
      {
        "term": "三更",
        "meaning": "深夜"
      }
    ],
    "matchedTo53": false,
    "printedPage": null,
    "famousQuote": "忆昔午桥桥上饮，坐中多是豪英。长沟流月去无声。",
    "examFocus": "词人追忆洛阳旧游和昔日豪英，感叹二十余年世事如梦，借渔歌表现旷达中的苍凉。",
    "errorTrap": "重点掌握：“午桥”（洛阳附近的桥名）的书写与释义。",
    "maskedWords": [
      {
        "word": "午桥",
        "trapReason": "洛阳附近的桥名"
      },
      {
        "word": "堪惊",
        "trapReason": "令人惊叹、感慨"
      },
      {
        "word": "三更",
        "trapReason": "深夜"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《临江仙（夜登小阁，忆洛中旧游）》中，作者陈与义表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "忆昔午桥桥上饮，坐中多是豪英。",
        "explanation": "词人追忆洛阳旧游和昔日豪英，感叹二十余年世事如梦，借渔歌表现旷达中的苍凉。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-007",
    "sequence": 7,
    "title": "太常引（建康中秋夜为吕叔潜赋）",
    "author": "辛弃疾",
    "dynasty": "南宋",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读",
    "contentType": "课外古诗词诵读",
    "genre": "词·太常引",
    "stanzas": [
      "一轮秋影转金波，飞镜又重磨。",
      "把酒问姮娥：被白发、欺人奈何？",
      "乘风好去，长空万里，直下看山河。",
      "斫去桂婆娑，人道是、清光更多。"
    ],
    "stanzaGroups": [
      [
        "一轮秋影转金波，飞镜又重磨。",
        "把酒问姮娥：被白发、欺人奈何？"
      ],
      [
        "乘风好去，长空万里，直下看山河。",
        "斫去桂婆娑，人道是、清光更多。"
      ]
    ],
    "meaningSummary": "词人借中秋问月表达年华易逝的感慨，并想象乘风俯瞰山河、扫除阴翳的豪情。",
    "keyNotes": [
      {
        "term": "姮娥",
        "meaning": "嫦娥"
      },
      {
        "term": "斫",
        "meaning": "砍、削"
      },
      {
        "term": "桂婆娑",
        "meaning": "月中桂树的枝叶"
      }
    ],
    "matchedTo53": false,
    "printedPage": null,
    "famousQuote": "一轮秋影转金波，飞镜又重磨。把酒问姮娥：被白发、欺人奈何？",
    "examFocus": "词人借中秋问月表达年华易逝的感慨，并想象乘风俯瞰山河、扫除阴翳的豪情。",
    "errorTrap": "重点掌握：“姮娥”（嫦娥）的书写与释义。",
    "maskedWords": [
      {
        "word": "姮娥",
        "trapReason": "嫦娥"
      },
      {
        "word": "斫",
        "trapReason": "砍、削"
      },
      {
        "word": "桂婆娑",
        "trapReason": "月中桂树的枝叶"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《太常引（建康中秋夜为吕叔潜赋）》中，作者辛弃疾表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "一轮秋影转金波，飞镜又重磨。",
        "explanation": "词人借中秋问月表达年华易逝的感慨，并想象乘风俯瞰山河、扫除阴翳的豪情。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  },
  {
    "id": "g9-2-008",
    "sequence": 8,
    "title": "浣溪沙（身向云山那畔行）",
    "author": "纳兰性德",
    "dynasty": "清",
    "volume": "九年级下册",
    "grade": "初三",
    "gradeLabel": "九年级",
    "semester": "下册",
    "textbookSection": "课外古诗词诵读",
    "contentType": "课外古诗词诵读",
    "genre": "词·浣溪沙",
    "stanzas": [
      "身向云山那畔行，北风吹断马嘶声，深秋远塞若为情！",
      "一抹晚烟荒戍垒，半竿斜日旧关城，古今幽恨几时平！"
    ],
    "stanzaGroups": [
      [
        "身向云山那畔行，北风吹断马嘶声，深秋远塞若为情！"
      ],
      [
        "一抹晚烟荒戍垒，半竿斜日旧关城，古今幽恨几时平！"
      ]
    ],
    "meaningSummary": "词人远行边塞，写晚烟、荒垒和斜日下的旧关城，抒发苍凉幽怨的感受。",
    "keyNotes": [
      {
        "term": "那畔",
        "meaning": "那边"
      },
      {
        "term": "戍垒",
        "meaning": "边防营垒"
      },
      {
        "term": "若为情",
        "meaning": "怎能不令人动情"
      }
    ],
    "matchedTo53": false,
    "printedPage": null,
    "famousQuote": "身向云山那畔行，北风吹断马嘶声，深秋远塞若为情！一抹晚烟荒戍垒，半竿斜日旧关城，古今幽恨几时平！",
    "examFocus": "词人远行边塞，写晚烟、荒垒和斜日下的旧关城，抒发苍凉幽怨的感受。",
    "errorTrap": "重点掌握：“那畔”（那边）的书写与释义。",
    "maskedWords": [
      {
        "word": "那畔",
        "trapReason": "那边"
      },
      {
        "word": "戍垒",
        "trapReason": "边防营垒"
      },
      {
        "word": "若为情",
        "trapReason": "怎能不令人动情"
      }
    ],
    "quizQuestions": [
      {
        "prompt": "在《浣溪沙（身向云山那畔行）》中，作者纳兰性德表达核心意境或广为传诵的千古名句是：“【       】”",
        "answer": "身向云山那畔行，北风吹断马嘶声，深秋远塞若为情！一抹晚烟荒戍垒，半竿斜日旧关城，古今幽恨几时平！。",
        "explanation": "词人远行边塞，写晚烟、荒垒和斜日下的旧关城，抒发苍凉幽怨的感受。",
        "source": "统编中考课标考点",
        "category": "写景意象"
      }
    ]
  }
];
