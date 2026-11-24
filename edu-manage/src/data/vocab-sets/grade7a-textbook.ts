import type { VocabEntry } from './grade7a'

type WordRow = readonly [headword: string, pos: string, meanings: string, note?: string]

interface PageGroup {
  unit: string
  sourcePage: number
  bookPage: number | null
  words: readonly WordRow[]
}

/**
 * 逐项整理自用户提供的《人教版七年级英语上册》词汇索引第 119–127 页。
 * 词性和释义按原词条压缩记录；多个义项以中文分号分隔，词形/变体记在 note。
 */
const PAGE_GROUPS: readonly PageGroup[] = [
  {
    unit: 'Starter Unit 1 Hello!', sourcePage: 119, bookPage: 1,
    words: [
      ['hello', 'interj.', '你好；喂'], ['how', 'adv.', '怎样；如何'],
      ['do', 'aux v. & v.', '做；干', '第三人称单数形式：does'],
      ['you', 'pron.', '你；您；你们'], ['people', 'n.', '人；人们'], ['hi', 'interj.', '嗨；喂'],
      ['good', 'adj.', '好的'], ['morning', 'n.', '早晨；上午'], ['and', 'conj.', '和；又'],
    ],
  },
  {
    unit: 'Starter Unit 1 Hello!', sourcePage: 119, bookPage: 2,
    words: [
      ['Ms', 'n.', '女士', '用于女子的姓氏或姓名前，不指明婚否'], ['class', 'n.', '班级；课'],
      ['sit', 'v.', '坐'], ['down', 'adv.', '下；向下'], ['please', 'interj.', '请', '用于客气地请求或吩咐'],
      ['can', 'modal v.', '能；会'], ['say', 'v.', '说'], ['to', 'prep.', '朝；至', '常用于原形动词之前，表示该动词为不定式'],
      ['the', 'art.', '指已提到或易领会到的人或事物'], ['I', 'pron.', '我'], ['am', 'v.', '是'],
      ['thank', 'v.', '感谢；谢谢'], ['now', 'adv.', '现在；目前'], ['my', 'pron.', '我的'],
      ['name', 'n.', '名字；名称'], ['is', 'v.', '是'], ['nice', 'adj.', '令人愉快的；宜人的'],
      ['meet', 'v.', '遇见；相逢'], ['so', 'conj.', '用来引出评论或问题；所以', 'adv. 这么；那么'],
      ['what', 'pron. & adj.', '什么'], ['your', 'pron.', '你的；您的；你们的'], ['too', 'adv.', '也；又；太'],
    ],
  },
  {
    unit: 'Starter Unit 1 Hello!', sourcePage: 119, bookPage: 4,
    words: [
      ['a', 'art.', '一个', '用于单数可数名词前，表示未曾提到的人、事、物；an 为元音音素开头单词前的形式'],
      ['are', 'v.', '是'], ['goodbye', 'interj. & n.', '再见；再会'], ['may', 'modal v.', '可以；可能'],
      ['have', 'v.', '有', '第三人称单数形式：has'], ['call', 'v. & n.', '把……叫作；（给……）打电话；呼唤；打电话；大声呼叫'],
      ['me', 'pron.', '我', 'I 的宾格'], ['fine', 'adj.', '健康的；美好的'], ['great', 'adj.', '美妙的；伟大的'],
      ['that', 'pron.', '那；那个'], ['let', 'v.', '允许；让'], ['us', 'pron.', '我们', 'we 的宾格'],
      ['go', 'v.', '去；走'], ['bye', 'interj.', '再见', '等同于 goodbye'],
    ],
  },
  {
    unit: 'Starter Unit 1 Hello!', sourcePage: 120, bookPage: 5,
    words: [
      ['it', 'pron.', '它'], ['time', 'n.', '时间；次'], ['for', 'prep.', '为了；给；对'],
    ],
  },
  {
    unit: 'Starter Unit 2 Keep Tidy!', sourcePage: 120, bookPage: 7,
    words: [
      ['keep', 'v.', '（使）保持；保留'], ['tidy', 'adj.', '整洁的；井井有条的'],
      ['in', 'prep.', '在……里；表示某事完成或发生的方式'], ['schoolbag', 'n.', '书包'],
      ['cap', 'n.', '帽子；棒球帽', '无帽边或有帽舌的帽子'], ['ruler', 'n.', '尺；直尺'], ['pencil', 'n.', '铅笔'],
    ],
  },
  {
    unit: 'Starter Unit 2 Keep Tidy!', sourcePage: 120, bookPage: 8,
    words: [
      ['brown', 'adj. & n.', '棕色（的）；褐色（的）'], ['black', 'adj. & n.', '黑色（的）'],
      ['yellow', 'adj. & n.', '黄色（的）'], ['orange', 'adj. & n.', '橙红色（的）；橘黄色（的）；橙子；柑橘'],
      ['green', 'adj. & n.', '绿色（的）'], ['blue', 'adj. & n.', '蓝色（的）'], ['white', 'adj. & n.', '白色（的）'],
      ['red', 'adj. & n.', '红色（的）'], ['colour', 'n.', '颜色', '美式拼写：color'],
      ['trousers', 'n.', '裤子', '复数形式'], ['they', 'pron.', '他们（她、它）'],
      ['bicycle', 'n.', '自行车；脚踏车', '也作 bike'], ['shoe', 'n.', '鞋'],
    ],
  },
  {
    unit: 'Starter Unit 2 Keep Tidy!', sourcePage: 120, bookPage: 10,
    words: [
      ['where', 'adv.', '在哪里；到哪里'], ['put', 'v.', '放'], ['bed', 'n.', '床'], ['desk', 'n.', '书桌'],
      ['chair', 'n.', '椅子'], ['book', 'n.', '书'], ['box', 'n.', '箱；盒；方框'], ['sock', 'n.', '短袜'],
      ['some', 'adj. & pron.', '一些；某些；有些；有的'], ['pair', 'n.', '一双；一对'], ['of', 'prep.', '属于（某人）；关于（某人）'],
      ['on', 'prep.', '在……上'], ['under', 'prep.', '在……下'], ['mum', 'n.', '妈妈', '也作 mom'],
      ['not', 'adv.', '不；没有'], ['find', 'v.', '找到；发现'], ['new', 'adj.', '新的；刚出现的'],
      ['no', 'interj. & adj.', '不；不要；没有；不是'], ['here', 'adv.', '在这里'], ['room', 'n.', '房间'],
      ['OK', 'interj. & adj. & adv.', '好；行；可以'], ['sorry', 'adj.', '抱歉的；惋惜的'],
    ],
  },
  {
    unit: 'Starter Unit 2 Keep Tidy!', sourcePage: 120, bookPage: 11,
    words: [
      ['dad', 'n.', '爸爸'], ['glasses', 'n.', '眼镜', '复数形式'], ['see', 'v.', '看见'],
      ['them', 'pron.', '他们（她、它）', 'they 的宾格'], ['wait', 'v.', '等待；等候'], ['minute', 'n.', '分；分钟'],
      ['head', 'n.', '头'], ['welcome', 'adj. & interj. & v. & n.', '受欢迎的；欢迎'],
      ['her', 'pron.', '她的'], ['nose', 'n.', '鼻子'],
    ],
  },
  {
    unit: 'Starter Unit 3 Welcome!', sourcePage: 121, bookPage: 13,
    words: [
      ['cat', 'n.', '猫'], ['these', 'pron.', '这些'], ['plant', 'n. & v.', '植物；种植'],
      ['baby', 'n.', '动物幼崽；婴儿'], ['chicken', 'n.', '鸡；鸡肉'], ['dog', 'n.', '狗'], ['rabbit', 'n.', '兔子'],
      ['tomato', 'n.', '西红柿', '复数形式：tomatoes'], ['flower', 'n.', '花'], ['apple', 'n.', '苹果'],
      ['tree', 'n.', '树'], ['this', 'pron.', '这；这个'], ['those', 'pron.', '那些'],
    ],
  },
  {
    unit: 'Starter Unit 3 Welcome!', sourcePage: 121, bookPage: 14,
    words: [
      ['animal', 'n.', '动物'], ['duck', 'n.', '鸭子'], ['potato', 'n.', '土豆', '复数形式：potatoes'],
      ['many', 'adj. & pron.', '许多'], ['grandpa', 'n.', '爷爷；外公', '等同于 grandfather'],
    ],
  },
  {
    unit: 'Starter Unit 3 Welcome!', sourcePage: 121, bookPage: 16,
    words: [
      ['farm', 'n.', '农场'], ['cow', 'n.', '奶牛'], ['small', 'adj.', '小的'], ['lake', 'n.', '湖'],
      ['house', 'n.', '房子'], ['horse', 'n.', '马'], ['sheep', 'n.', '羊；绵羊', '复数形式：sheep'],
      ['big', 'adj.', '大的'], ['look', 'v.', '看'], ['uncle', 'n.', '舅父；叔父；伯父；姑父；姨父'],
      ['grass', 'n.', '草'], ['kind', 'n. & adj.', '种类；体贴的；亲切的'], ['he', 'pron.', '他'],
      ['pig', 'n.', '猪'], ['there', 'adv.', '在那里'], ['behind', 'prep.', '在……的后面'],
      ['home', 'n.', '家'], ['beautiful', 'adj.', '美丽的'],
      ['like', 'v. & prep.', '喜欢；例如；像……一样'],
    ],
  },
  {
    unit: 'Starter Unit 3 Welcome!', sourcePage: 121, bookPage: 17,
    words: [
      ['his', 'pron.', '他的'], ['at', 'prep.', '向；朝；在（某处、某时间或时刻）'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 121, bookPage: 19,
    words: [
      ['we', 'pron.', '我们'], ['make', 'v.', '使成为；制造'], ['friend', 'n.', '朋友'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 121, bookPage: 20,
    words: [
      ['get', 'v.', '去取（或带来）；得到'], ['know', 'v.', '知道'], ['from', 'prep.', '从……来；从……开始'],
      ['old', 'adj.', '老的；旧的'], ['last', 'adj.', '最后的；末尾的'], ['year', 'n.', '年'], ['yes', 'interj.', '是的；可以'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 121, bookPage: 21,
    words: [
      ['Mr', 'n.', '先生', '用于男子的姓氏或姓名前'], ['our', 'pron.', '我们的'],
      ['English', 'n. & adj.', '英语；英格兰人；英语的；英格兰的'], ['teacher', 'n.', '教师'],
      ['which', 'pron.', '哪一个；哪些'], ['who', 'pron.', '谁；什么人'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 122, bookPage: 22,
    words: [
      ['job', 'n.', '工作'], ['student', 'n.', '学生'], ['age', 'n.', '年龄'], ['she', 'pron.', '她'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 122, bookPage: 23,
    words: [
      ['favourite', 'adj.', '最喜欢的；最爱的', '美式拼写：favorite'], ['pet', 'n.', '宠物'],
      ['very', 'adv.', '很；非常'], ['cute', 'adj.', '可爱的'], ['much', 'adv. & pron. & adj.', '非常；十分；许多；大量；多少'],
      ['school', 'n.', '学校'], ['China', 'n.', '中国'], ['panda', 'n.', '熊猫'], ['hot', 'adj.', '热的；炎热的'],
      ['also', 'adv.', '也；而且'], ['live', 'v.', '居住；生活'], ['with', 'prep.', '和……在一起；带有；使用'],
      ['parent', 'n.', '父（母）亲'], ['Chinese', 'n. & adj.', '中国人；汉语；中国的'], ['food', 'n.', '食物'],
      ['lot', 'pron.', '大量；许多'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 122, bookPage: 24,
    words: [
      ['about', 'prep. & adv.', '关于；大约'], ['wall', 'n.', '墙'], ['all', 'pron. & adj.', '所有（的）；全部（的）'],
      ['hour', 'n.', '小时'], ['ago', 'adv.', '以前'], ['family', 'n.', '家庭'], ['bird', 'n.', '鸟'],
      ['speak', 'v.', '说（某种语言）；说话'], ['sport', 'n.', '运动'], ['often', 'adv.', '时常；常常'],
      ['play', 'v.', '玩'], ['after', 'prep. & conj.', '在……以后'], ['want', 'v.', '想要'], ['be', 'v.', '是'],
      ['place', 'n.', '地方；地点'],
    ],
  },
  {
    unit: 'Unit 1 You and Me', sourcePage: 122, bookPage: 25,
    words: [
      ['music', 'n.', '音乐'], ['love', 'v. & n.', '喜爱；爱'], ['write', 'v.', '写'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 122, bookPage: 28,
    words: [
      ['or', 'conj.', '或者；也不（用于否定句）'], ['mother', 'n.', '母亲'],
      ['child', 'n.', '儿童；小孩', '复数形式：children'], ['sister', 'n.', '姐；妹'], ['brother', 'n.', '兄；弟'],
      ['cousin', 'n.', '堂兄（弟、姊、妹）；表兄（弟、姊、妹）'], ['aunt', 'n.', '姑（姨、伯、婶、舅）母'],
      ['grandmother', 'n.', '奶奶；外婆', '也作 grandma'], ['come', 'v.', '来；来到'],
      ['ping-pong', 'n.', '乒乓球运动'], ['whose', 'pron.', '谁的'], ['well', 'interj. & adv. & adj.', '嗯；好吧；好；令人满意地；健康的'],
      ['every', 'adj.', '每一；每个'], ['day', 'n.', '一天；白天'], ['week', 'n.', '周'],
      ['fish', 'v. & n.', '钓鱼；鱼；鱼肉'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 123, bookPage: 29,
    words: [
      ['father', 'n.', '父亲；爸爸'], ['piano', 'n.', '钢琴', '复数形式：pianos'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 123, bookPage: 30,
    words: [
      ['basketball', 'n.', '篮球；篮球运动'], ['read', 'v.', '读；阅读'], ['garden', 'v. & n.', '做园艺工作；种植花木；园圃；庭园'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 123, bookPage: 31,
    words: [
      ['classroom', 'n.', '教室'], ['their', 'pron.', '他们（她、它）们的'],
      ['clean', 'adj. & v.', '干净的；使……干净；打扫'], ['little', 'adj.', '小的；年幼的'], ['ball', 'n.', '球'],
      ['playground', 'n.', '游乐场；操场'], ['wear', 'v.', '穿；戴'], ['talk', 'v. & n.', '说话；交谈'],
      ['tall', 'adj.', '高的'], ['short', 'adj.', '短的；矮的'], ['hair', 'n.', '头发'], ['long', 'adj.', '长的'],
      ['quiet', 'adj.', '安静的'], ['girl', 'n.', '女孩'], ['but', 'conj.', '但是'], ['any', 'adj. & pron.', '任何（的）；任一（的）'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 123, bookPage: 32,
    words: [
      ['photo', 'n.', '照片', '等同于 photograph；复数形式 photos'], ['pink', 'adj. & n.', '粉红色（的）'],
      ['left', 'n. & adv.', '左边；向左边'], ['right', 'n. & adv. & adj.', '右边；向右边；正确的；适当的'],
      ['always', 'adv.', '总是'], ['story', 'n.', '故事'], ['night', 'n.', '夜晚'], ['middle', 'n. & adj.', '中间；中间的'],
    ],
  },
  {
    unit: "Unit 2 We're Family!", sourcePage: 123, bookPage: 33,
    words: [
      ['think', 'v.', '思考'], ['football', 'n.', '足球；足球运动'], ['happy', 'adj.', '快乐的'], ['eye', 'n.', '眼睛'],
      ['clever', 'adj.', '聪明的'], ['next', 'adj. & adv. & n.', '下一个（的）'], ['him', 'pron.', '他', 'he 的宾格'],
      ['help', 'v. & n.', '帮助'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 123, bookPage: 36,
    words: [
      ['front', 'n.', '前面'], ['art', 'n.', '艺术；美术'], ['between', 'prep.', '在……之间'], ['library', 'n.', '图书馆'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 123, bookPage: 37,
    words: [
      ['blackboard', 'n.', '黑板'], ['up', 'adv.', '向上'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 123, bookPage: 38,
    words: [
      ['back', 'n. & adj. & adv.', '后面；背部；后面的；背后的；回来；回原处'], ['clock', 'n.', '时钟；钟'],
      ['map', 'n.', '地图'], ['computer', 'n.', '电脑'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 123, bookPage: 39,
    words: [
      ['window', 'n.', '窗户'], ['science', 'n.', '科学'], ['picture', 'n.', '照片；图画'], ['famous', 'adj.', '著名的'],
      ['table', 'n.', '桌子'], ['today', 'adv. & n.', '在今天；今天'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 124, bookPage: 40,
    words: [
      ['email', 'n. & v.', '电子邮件；（给某人）发电子邮件'], ['answer', 'v. & n.', '回答；答复；答案'],
      ['question', 'n.', '问题'], ['exercise', 'n. & v.', '运动；锻炼；练习'], ['way', 'n.', '方式；道路'],
    ],
  },
  {
    unit: 'Unit 3 My School', sourcePage: 124, bookPage: 41,
    words: [
      ['best', 'adj. & adv.', '最好的；最好'], ['because', 'conj.', '因为'], ['why', 'adv.', '为什么'],
      ['dear', 'adj.', '亲爱的'], ['tell', 'v.', '告诉'], ['interesting', 'adj.', '有趣的'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 43,
    words: [
      ['subject', 'n.', '学科；科目'], ['learn', 'v.', '学习；得知'], ['maths', 'n.', '数学', '等同于 mathematics 或 math'],
      ['PE', 'n.', '体育', '等同于 physical education'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 44,
    words: [
      ['hard', 'adj. & adv.', '困难的；努力地'], ['difficult', 'adj.', '困难的'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 45,
    words: [
      ['sure', 'adv.', '当然；一定'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 46,
    words: [
      ['easy', 'adj.', '容易的'], ['use', 'v. & n.', '使用；利用；使用；用途'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 47,
    words: [
      ['give', 'v.', '给；送给；供给'], ['idea', 'n.', '想法；主意'], ['listen', 'v.', '听'], ['draw', 'v.', '画画'],
      ['travel', 'v. & n.', '旅行；游历'], ['walk', 'v. & n.', '行走；步行'], ['afternoon', 'n.', '下午'],
      ['then', 'adv.', '那时；然后；那么'], ['Miss', 'n.', '小姐；女士', '对未婚女子的礼貌称呼'],
      ['work', 'v. & n.', '工作'], ['sometimes', 'adv.', '有时'], ['feel', 'v.', '感觉；觉得'],
    ],
  },
  {
    unit: 'Unit 4 My Favourite Subject', sourcePage: 124, bookPage: 48,
    words: [
      ['busy', 'adj.', '忙碌的；无暇的'], ['study', 'v. & n.', '学习；研究'], ['song', 'n.', '歌曲'],
      ['out', 'adv. & prep.', '（从……里）出来；出去'],
    ],
  },
  {
    unit: 'Unit 5 Fun Clubs', sourcePage: 124, bookPage: 53,
    words: [
      ['sing', 'v.', '唱歌'],
    ],
  },
  {
    unit: 'Unit 5 Fun Clubs', sourcePage: 124, bookPage: 54,
    words: [
      ['swim', 'v. & n.', '游泳'], ['run', 'v. & n.', '跑；跑步'], ['fast', 'adv. & adj.', '快地；快的'], ['dance', 'v. & n.', '跳舞'],
    ],
  },
  {
    unit: 'Unit 5 Fun Clubs', sourcePage: 124, bookPage: 55,
    words: [
      ['fly', 'v.', '飞'], ['watch', 'v. & n.', '注视；观看；表；手表'], ['cake', 'n.', '蛋糕'], ['cook', 'v. & n.', '做饭；厨师'],
    ],
  },
  {
    unit: 'Unit 5 Fun Clubs', sourcePage: 124, bookPage: 56,
    words: [
      ['noodle', 'n.', '面条', '通常用复数形式'], ['open', 'v. & adj.', '打开；开放的；敞开的'],
      ['take', 'v.', '拍照；拿；取；买下'], ['visit', 'v. & n.', '参观；拜访'], ['park', 'n.', '公园'],
    ],
  },
  {
    unit: 'Unit 5 Fun Clubs', sourcePage: 124, bookPage: 57,
    words: [
      ['when', 'adv.', '什么时候'], ['share', 'v.', '分享；合用；分担'],
    ],
  },
  {
    unit: 'Unit 6 A Day in the Life', sourcePage: 124, bookPage: 60,
    words: [
      ['o’clock', 'adv.', '……点钟', '表示整点'], ['half', 'n. & pron.', '一半；半；半数'],
      ['dress', 'v. & n.', '穿衣服；连衣裙'], ['breakfast', 'n.', '早餐'],
      ['before', 'prep. & conj. & adv.', '在……以前；以前'], ['begin', 'v.', '开始'],
    ],
  },
  {
    unit: 'Unit 6 A Day in the Life', sourcePage: 125, bookPage: 61,
    words: [
      ['dinner', 'n.', '正餐；主餐'], ['early', 'adj. & adv.', '早的；早期的；提前；在早期'],
    ],
  },
  {
    unit: 'Unit 6 A Day in the Life', sourcePage: 125, bookPage: 62,
    words: [
      ['ask', 'v.', '询问；请求'], ['lunch', 'n.', '午餐'],
    ],
  },
  {
    unit: 'Unit 6 A Day in the Life', sourcePage: 125, bookPage: 63,
    words: [
      ['film', 'n.', '电影'],
    ],
  },
  {
    unit: 'Unit 6 A Day in the Life', sourcePage: 125, bookPage: 64,
    words: [
      ['lesson', 'n.', '课；一节课'], ['ice', 'n.', '冰；冰块'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 67,
    words: [
      ['birthday', 'n.', '生日'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 68,
    words: [
      ['month', 'n.', '月份'], ['gift', 'n.', '礼物'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 69,
    words: [
      ['party', 'n.', '聚会'], ['buy', 'v.', '买'], ['shop', 'n. & v.', '商店；逛商店；在商店购物'],
      ['woman', 'n.', '女人', '复数形式：women'], ['candle', 'n.', '蜡烛'], ['will', 'modal v.', '将要；会'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 70,
    words: [
      ['egg', 'n.', '蛋'], ['juice', 'n.', '果汁'], ['milk', 'n.', '牛奶'], ['candy', 'n.', '糖果'], ['drink', 'n. & v.', '饮品；喝'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 71,
    words: [
      ['card', 'n.', '厚纸片；卡片'], ['doll', 'n.', '玩偶；玩具娃娃'],
      ['Mrs', 'n.', '夫人；太太', '对已婚妇女的礼貌称呼'], ['eat', 'v.', '吃'],
      ['wish', 'v. & n.', '希望；祝愿；愿望'], ['nurse', 'n.', '护士'],
    ],
  },
  {
    unit: 'Unit 7 Happy Birthday!', sourcePage: 125, bookPage: 72,
    words: [
      ['hear', 'v.', '听到'], ['door', 'n.', '门'],
    ],
  },
  {
    unit: '参考词表·基数词', sourcePage: 126, bookPage: null,
    words: [
      ['one', 'num.', '一'], ['two', 'num.', '二'], ['three', 'num.', '三'], ['four', 'num.', '四'],
      ['five', 'num.', '五'], ['six', 'num.', '六'], ['seven', 'num.', '七'], ['eight', 'num.', '八'],
      ['nine', 'num.', '九'], ['ten', 'num.', '十'], ['eleven', 'num.', '十一'], ['twelve', 'num.', '十二'],
      ['thirteen', 'num.', '十三'], ['fourteen', 'num.', '十四'], ['fifteen', 'num.', '十五'], ['sixteen', 'num.', '十六'],
      ['seventeen', 'num.', '十七'], ['eighteen', 'num.', '十八'], ['nineteen', 'num.', '十九'], ['twenty', 'num.', '二十'],
      ['thirty', 'num.', '三十'], ['forty', 'num.', '四十'], ['fifty', 'num.', '五十'], ['sixty', 'num.', '六十'],
      ['seventy', 'num.', '七十'], ['eighty', 'num.', '八十'], ['ninety', 'num.', '九十'], ['hundred', 'num.', '百'],
      ['thousand', 'num.', '千'], ['million', 'num.', '百万'],
    ],
  },
  {
    unit: '参考词表·序数词', sourcePage: 126, bookPage: null,
    words: [
      ['first', 'num.', '第一'], ['second', 'num.', '第二'], ['third', 'num.', '第三'], ['fourth', 'num.', '第四'],
      ['fifth', 'num.', '第五'], ['sixth', 'num.', '第六'], ['seventh', 'num.', '第七'], ['eighth', 'num.', '第八'],
      ['ninth', 'num.', '第九'], ['tenth', 'num.', '第十'], ['eleventh', 'num.', '第十一'], ['twelfth', 'num.', '第十二'],
      ['thirteenth', 'num.', '第十三'], ['fourteenth', 'num.', '第十四'], ['fifteenth', 'num.', '第十五'], ['sixteenth', 'num.', '第十六'],
      ['seventeenth', 'num.', '第十七'], ['eighteenth', 'num.', '第十八'], ['nineteenth', 'num.', '第十九'], ['twentieth', 'num.', '第二十'],
      ['thirtieth', 'num.', '第三十'], ['fortieth', 'num.', '第四十'], ['fiftieth', 'num.', '第五十'], ['sixtieth', 'num.', '第六十'],
      ['seventieth', 'num.', '第七十'], ['eightieth', 'num.', '第八十'], ['ninetieth', 'num.', '第九十'], ['hundredth', 'num.', '第一百'],
      ['thousandth', 'num.', '第一千'], ['millionth', 'num.', '第一百万'],
    ],
  },
  {
    unit: '参考词表·月份', sourcePage: 127, bookPage: null,
    words: [
      ['January', 'n.', '一月'], ['February', 'n.', '二月'], ['March', 'n.', '三月'], ['April', 'n.', '四月'],
      ['May', 'n.', '五月'], ['June', 'n.', '六月'], ['July', 'n.', '七月'], ['August', 'n.', '八月'],
      ['September', 'n.', '九月'], ['October', 'n.', '十月'], ['November', 'n.', '十一月'], ['December', 'n.', '十二月'],
    ],
  },
  {
    unit: '参考词表·星期', sourcePage: 127, bookPage: null,
    words: [
      ['Monday', 'n.', '星期一'], ['Tuesday', 'n.', '星期二'], ['Wednesday', 'n.', '星期三'],
      ['Thursday', 'n.', '星期四'], ['Friday', 'n.', '星期五'], ['Saturday', 'n.', '星期六'], ['Sunday', 'n.', '星期天'],
    ],
  },
]

function normalizeWord(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'")
}

function stableId(unit: string, headword: string): string {
  const identity = `${unit}\u001f${normalizeWord(headword)}`
  let hash = 2166136261
  for (let index = 0; index < identity.length; index += 1) {
    hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619)
  }
  return `g7a-t-${(hash >>> 0).toString(36)}`
}

export const GRADE7A_TEXTBOOK_VOCAB: VocabEntry[] = PAGE_GROUPS.flatMap((group) =>
  group.words.map(([headword, pos, meaningText, note]) => ({
    id: stableId(group.unit, headword),
    grade: '初一',
    volume: '上册',
    unit: group.unit,
    section: group.sourcePage < 126 ? 'Vocabulary from Primary School' : 'Reference Word List',
    headword,
    pos,
    meanings: meaningText.split('；').map((meaning) => meaning.trim()).filter(Boolean),
    ...(note ? { note } : {}),
    ...(group.bookPage === null ? {} : { bookPage: group.bookPage }),
    sourcePage: group.sourcePage,
  })),
)
