export interface IrregularVerb {
  id: string
  base: string           // 原形
  past: string           // 过去式
  pastParticiple: string // 过去分词
  meaning: string        // 中文释义
  pattern: 'AAA' | 'ABA' | 'AAB' | 'ABB' | 'ABC' | 'SPECIAL'
  priority: 'HIGH' | 'CORE' | 'EXPAND' // 教学优先级，不代表真题频次统计
  tip?: string           // 易错提示或规律口诀
  example?: string       // 中考典型语境例句
}

export const IRREGULAR_VERBS: IrregularVerb[] = [
  // ==================== AAA 型（原形、过去式、过去分词完全相同） ====================
  { id: 'v-cost', base: 'cost', past: 'cost', pastParticiple: 'cost', meaning: '花费；值（多少钱）', pattern: 'AAA', priority: 'HIGH', tip: '物作主语，常见结构：sth. cost (sb.) money' },
  { id: 'v-cut', base: 'cut', past: 'cut', pastParticiple: 'cut', meaning: '切；割；削', pattern: 'AAA', priority: 'HIGH', tip: '过去式/分词均不双写字母，均为 cut' },
  { id: 'v-hit', base: 'hit', past: 'hit', pastParticiple: 'hit', meaning: '击打；碰撞；撞击', pattern: 'AAA', priority: 'HIGH', tip: '现在分词要双写 t (hitting)，但过去式/分词为原形 hit' },
  { id: 'v-hurt', base: 'hurt', past: 'hurt', pastParticiple: 'hurt', meaning: '伤害；疼痛；受伤', pattern: 'AAA', priority: 'HIGH', tip: '及物/不及物均可，过去式不变' },
  { id: 'v-let', base: 'let', past: 'let', pastParticiple: 'let', meaning: '让；允许', pattern: 'AAA', priority: 'HIGH', tip: 'let sb. do sth. 过去式同原形' },
  { id: 'v-put', base: 'put', past: 'put', pastParticiple: 'put', meaning: '放置；放下', pattern: 'AAA', priority: 'HIGH', tip: '现在分词 putting 双写 t，过去式保持 put' },
  { id: 'v-read', base: 'read', past: 'read', pastParticiple: 'read', meaning: '阅读；看懂', pattern: 'AAA', priority: 'HIGH', tip: '拼写完全一致，但过去式与分词读音变 /red/（红色的发音）' },
  { id: 'v-set', base: 'set', past: 'set', pastParticiple: 'set', meaning: '设置；放置；日落', pattern: 'AAA', priority: 'CORE', tip: 'set up / set off 常考短语，变位全同' },
  { id: 'v-shut', base: 'shut', past: 'shut', pastParticiple: 'shut', meaning: '关闭；关上', pattern: 'AAA', priority: 'CORE', tip: 'shut the door，过去式和分词仍为 shut' },
  { id: 'v-spread', base: 'spread', past: 'spread', pastParticiple: 'spread', meaning: '传播；扩散；展开', pattern: 'AAA', priority: 'CORE', tip: 'spread information 变位全同' },

  // ==================== ABA 型（原形与过去分词相同） ====================
  { id: 'v-become', base: 'become', past: 'became', pastParticiple: 'become', meaning: '变成；成为', pattern: 'ABA', priority: 'HIGH', tip: '中间变 a，分词复归 come' },
  { id: 'v-come', base: 'come', past: 'came', pastParticiple: 'come', meaning: '来；到达', pattern: 'ABA', priority: 'HIGH', tip: '过去式 came，分词恢复为 come' },
  { id: 'v-run', base: 'run', past: 'ran', pastParticiple: 'run', meaning: '跑；奔跑；经营', pattern: 'ABA', priority: 'HIGH', tip: '过去式 ran，分词恢复为 run' },
  { id: 'v-overcome', base: 'overcome', past: 'overcame', pastParticiple: 'overcome', meaning: '克服；解决', pattern: 'ABA', priority: 'CORE', tip: '复合词变位规则继承 come' },

  // ==================== ABB 型（过去式与过去分词相同） ====================
  // 1. -ought / -aught 词形组
  { id: 'v-buy', base: 'buy', past: 'bought', pastParticiple: 'bought', meaning: '买；购买', pattern: 'ABB', priority: 'HIGH', tip: '注意与 bring 区分：buy 没有 r，变 bought' },
  { id: 'v-bring', base: 'bring', past: 'brought', pastParticiple: 'brought', meaning: '带来；拿来', pattern: 'ABB', priority: 'HIGH', tip: 'bring 自带 r，过去式是 brought' },
  { id: 'v-think', base: 'think', past: 'thought', pastParticiple: 'thought', meaning: '思考；认为', pattern: 'ABB', priority: 'HIGH', tip: 'th 开头，后缀 -ought' },
  { id: 'v-fight', base: 'fight', past: 'fought', pastParticiple: 'fought', meaning: '战斗；打仗；斗争', pattern: 'ABB', priority: 'CORE', tip: 'fight - fought - fought' },
  { id: 'v-catch', base: 'catch', past: 'caught', pastParticiple: 'caught', meaning: '抓住；赶上（车）', pattern: 'ABB', priority: 'HIGH', tip: '注意是 -aught 不是 -ought！' },
  { id: 'v-teach', base: 'teach', past: 'taught', pastParticiple: 'taught', meaning: '教授；讲授', pattern: 'ABB', priority: 'HIGH', tip: '注意是 -aught 不是 -ought！' },

  // 2. 元音改变 + t 族
  { id: 'v-feel', base: 'feel', past: 'felt', pastParticiple: 'felt', meaning: '感觉；摸起来', pattern: 'ABB', priority: 'HIGH', tip: '双 e 变单 e，加 t' },
  { id: 'v-keep', base: 'keep', past: 'kept', pastParticiple: 'kept', meaning: '保持；保存；继续', pattern: 'ABB', priority: 'HIGH', tip: 'keep - kept - kept' },
  { id: 'v-sleep', base: 'sleep', past: 'slept', pastParticiple: 'slept', meaning: '睡觉', pattern: 'ABB', priority: 'HIGH', tip: 'sleep - slept - slept' },
  { id: 'v-sweep', base: 'sweep', past: 'swept', pastParticiple: 'swept', meaning: '扫；打扫', pattern: 'ABB', priority: 'CORE', tip: 'sweep the floor -> swept' },
  { id: 'v-leave', base: 'leave', past: 'left', pastParticiple: 'left', meaning: '离开；留下；遗忘', pattern: 'ABB', priority: 'HIGH', tip: 'leave for / leave behind，变位为 left' },
  { id: 'v-meet', base: 'meet', past: 'met', pastParticiple: 'met', meaning: '遇见；相逢；开会', pattern: 'ABB', priority: 'HIGH', tip: '双 e 变单 e：met' },
  { id: 'v-mean', base: 'mean', past: 'meant', pastParticiple: 'meant', meaning: '意思是；意味着', pattern: 'ABB', priority: 'HIGH', tip: '拼写只加 t，但读音由 /iː/ 变短元音 /e/' },

  // 3. d 结尾变 t 族
  { id: 'v-build', base: 'build', past: 'built', pastParticiple: 'built', meaning: '建造；建立', pattern: 'ABB', priority: 'HIGH', tip: '结尾 d 变成 t：built' },
  { id: 'v-lend', base: 'lend', past: 'lent', pastParticiple: 'lent', meaning: '借出；贷出', pattern: 'ABB', priority: 'HIGH', tip: 'lend sb. sth. 借出，变 lent' },
  { id: 'v-send', base: 'send', past: 'sent', pastParticiple: 'sent', meaning: '发送；寄送；派遣', pattern: 'ABB', priority: 'HIGH', tip: 'send an email 变 sent' },
  { id: 'v-spend', base: 'spend', past: 'spent', pastParticiple: 'spent', meaning: '花费（时间/金钱）', pattern: 'ABB', priority: 'HIGH', tip: '人作主语：sb. spend ... on / in doing，变 spent' },

  // 4. 去元音或元音变化族
  { id: 'v-feed', base: 'feed', past: 'fed', pastParticiple: 'fed', meaning: '喂养；饲养', pattern: 'ABB', priority: 'CORE', tip: 'feed on 以...为食，双 e 变单 e' },
  { id: 'v-lead', base: 'lead', past: 'led', pastParticiple: 'led', meaning: '领导；引导；通向', pattern: 'ABB', priority: 'HIGH', tip: 'lead to 导致，变 led' },
  { id: 'v-lose', base: 'lose', past: 'lost', pastParticiple: 'lost', meaning: '丢失；失败；迷路', pattern: 'ABB', priority: 'HIGH', tip: 'lose one\'s way 变 lost' },
  { id: 'v-shoot', base: 'shoot', past: 'shot', pastParticiple: 'shot', meaning: '射击；投篮；拍摄', pattern: 'ABB', priority: 'CORE', tip: '双 o 变单 o：shot' },
  { id: 'v-find', base: 'find', past: 'found', pastParticiple: 'found', meaning: '找到；发现', pattern: 'ABB', priority: 'HIGH', tip: '注意与原形 found（创办）辨析！' },
  { id: 'v-hear', base: 'hear', past: 'heard', pastParticiple: 'heard', meaning: '听见；听说', pattern: 'ABB', priority: 'HIGH', tip: '只加 d，读音变 /hɜːd/' },
  { id: 'v-hold', base: 'hold', past: 'held', pastParticiple: 'held', meaning: '拿着；容纳；举行', pattern: 'ABB', priority: 'HIGH', tip: 'hold a meeting 变 held' },
  { id: 'v-make', base: 'make', past: 'made', pastParticiple: 'made', meaning: '制作；使，让', pattern: 'ABB', priority: 'HIGH', tip: 'make sb. do sth. 变 made' },
  { id: 'v-pay', base: 'pay', past: 'paid', pastParticiple: 'paid', meaning: '支付；付钱', pattern: 'ABB', priority: 'HIGH', tip: 'y 变 aid：pay for 变 paid' },
  { id: 'v-say', base: 'say', past: 'said', pastParticiple: 'said', meaning: '说；讲', pattern: 'ABB', priority: 'HIGH', tip: 'y 变 aid，读音 /sed/' },
  { id: 'v-sell', base: 'sell', past: 'sold', pastParticiple: 'sold', meaning: '卖；出售', pattern: 'ABB', priority: 'HIGH', tip: 'ell 变 old：sold' },
  { id: 'v-tell', base: 'tell', past: 'told', pastParticiple: 'told', meaning: '告诉；辨别', pattern: 'ABB', priority: 'HIGH', tip: 'tell sb. to do 变 told' },
  { id: 'v-stand', base: 'stand', past: 'stood', pastParticiple: 'stood', meaning: '站立；忍受', pattern: 'ABB', priority: 'HIGH', tip: 'can\'t stand doing，变 stood' },
  { id: 'v-understand', base: 'understand', past: 'understood', pastParticiple: 'understood', meaning: '理解；明白', pattern: 'ABB', priority: 'HIGH', tip: '变位继承 stand：understood' },
  { id: 'v-win', base: 'win', past: 'won', pastParticiple: 'won', meaning: '赢得；获胜', pattern: 'ABB', priority: 'HIGH', tip: 'win the match 变 won（读音同 one）' },
  { id: 'v-get', base: 'get', past: 'got', pastParticiple: 'got', meaning: '得到；变得；到达', pattern: 'ABB', priority: 'HIGH', tip: '英式分词常用 got，美式分词可用 gotten' },
  { id: 'v-have', base: 'have', past: 'had', pastParticiple: 'had', meaning: '有；吃；经历', pattern: 'ABB', priority: 'HIGH', tip: 'have/has 过去式分词均为 had' },
  { id: 'v-dig', base: 'dig', past: 'dug', pastParticiple: 'dug', meaning: '挖；掘', pattern: 'ABB', priority: 'CORE', tip: 'i 变 u：dug' },
  { id: 'v-stick', base: 'stick', past: 'stuck', pastParticiple: 'stuck', meaning: '粘贴；坚持；卡住', pattern: 'ABB', priority: 'CORE', tip: 'stick to doing 坚持，变 stuck' },
  { id: 'v-sit', base: 'sit', past: 'sat', pastParticiple: 'sat', meaning: '坐；使就座', pattern: 'ABB', priority: 'HIGH', tip: 'sit down 坐下；过去式和过去分词均为 sat' },
  { id: 'v-shine', base: 'shine', past: 'shone', pastParticiple: 'shone', meaning: '发光；照耀', pattern: 'ABB', priority: 'CORE', tip: '教材常见过去式、过去分词均为 shone' },
  { id: 'v-oversleep', base: 'oversleep', past: 'overslept', pastParticiple: 'overslept', meaning: '睡过头；睡得过久', pattern: 'ABB', priority: 'CORE', tip: '复合词变位沿用 sleep：overslept' },
  { id: 'v-burn', base: 'burn', past: 'burnt', pastParticiple: 'burnt', meaning: '燃烧；烧伤', pattern: 'ABB', priority: 'CORE', tip: '教材列 burnt；burned 也是可接受的另一种形式' },

  // ==================== AAB 型（原形与过去式相同） ====================
  { id: 'v-beat', base: 'beat', past: 'beat', pastParticiple: 'beaten', meaning: '敲打；击败；（心脏）跳动', pattern: 'AAB', priority: 'CORE', tip: '过去式 beat 不变，过去分词为 beaten' },

  // ==================== ABC 型（原形、过去式、过去分词完全不同） ====================
  // 1. i - a - u 族（经典音变规律）
  { id: 'v-begin', base: 'begin', past: 'began', pastParticiple: 'begun', meaning: '开始；着手', pattern: 'ABC', priority: 'HIGH', tip: '口诀：i 变 a 再变 u' },
  { id: 'v-drink', base: 'drink', past: 'drank', pastParticiple: 'drunk', meaning: '喝；饮', pattern: 'ABC', priority: 'HIGH', tip: 'drink - drank - drunk' },
  { id: 'v-ring', base: 'ring', past: 'rang', pastParticiple: 'rung', meaning: '（铃）响；打电话', pattern: 'ABC', priority: 'HIGH', tip: '2024 河北中考词语运用出现 the bell rang；记 ring - rang - rung' },
  { id: 'v-sing', base: 'sing', past: 'sang', pastParticiple: 'sung', meaning: '唱歌；鸣叫', pattern: 'ABC', priority: 'HIGH', tip: 'sing - sang - sung' },
  { id: 'v-sink', base: 'sink', past: 'sank', pastParticiple: 'sunk', meaning: '下沉；消沉', pattern: 'ABC', priority: 'CORE', tip: 'sink - sank - sunk' },
  { id: 'v-swim', base: 'swim', past: 'swam', pastParticiple: 'swum', meaning: '游泳', pattern: 'ABC', priority: 'HIGH', tip: 'swim - swam - swum' },

  // 2. ow/aw 变 ew - own/awn 族
  { id: 'v-blow', base: 'blow', past: 'blew', pastParticiple: 'blown', meaning: '吹；刮风', pattern: 'ABC', priority: 'HIGH', tip: 'blow - blew - blown' },
  { id: 'v-draw', base: 'draw', past: 'drew', pastParticiple: 'drawn', meaning: '画；拉；拖', pattern: 'ABC', priority: 'HIGH', tip: 'draw - drew - drawn' },
  { id: 'v-fly', base: 'fly', past: 'flew', pastParticiple: 'flown', meaning: '飞；飞行', pattern: 'ABC', priority: 'HIGH', tip: 'fly - flew - flown' },
  { id: 'v-grow', base: 'grow', past: 'grew', pastParticiple: 'grown', meaning: '种植；成长；变得', pattern: 'ABC', priority: 'HIGH', tip: 'grow up 长大，grew - grown' },
  { id: 'v-know', base: 'know', past: 'knew', pastParticiple: 'known', meaning: '知道；了解', pattern: 'ABC', priority: 'HIGH', tip: 'be known for 著名，knew - known' },
  { id: 'v-throw', base: 'throw', past: 'threw', pastParticiple: 'thrown', meaning: '扔；掷；抛', pattern: 'ABC', priority: 'HIGH', tip: 'throw away 扔掉，threw - thrown' },

  // 3. 过去分词以 -(e)n 结尾族
  { id: 'v-break', base: 'break', past: 'broke', pastParticiple: 'broken', meaning: '打破；弄坏；折断', pattern: 'ABC', priority: 'HIGH', tip: 'break - broke - broken' },
  { id: 'v-choose', base: 'choose', past: 'chose', pastParticiple: 'chosen', meaning: '选择；挑选', pattern: 'ABC', priority: 'HIGH', tip: '双 o 变单 o：chose，分词加 n：chosen' },
  { id: 'v-drive', base: 'drive', past: 'drove', pastParticiple: 'driven', meaning: '驾驶；驱赶', pattern: 'ABC', priority: 'HIGH', tip: 'drive - drove - driven（读音 /ˈdrɪvn/）' },
  { id: 'v-eat', base: 'eat', past: 'ate', pastParticiple: 'eaten', meaning: '吃', pattern: 'ABC', priority: 'HIGH', tip: 'eat - ate - eaten' },
  { id: 'v-fall', base: 'fall', past: 'fell', pastParticiple: 'fallen', meaning: '落下；跌倒；秋天', pattern: 'ABC', priority: 'HIGH', tip: 'fall in love / fall down 变 fell - fallen' },
  { id: 'v-forget-full', base: 'forget', past: 'forgot', pastParticiple: 'forgotten', meaning: '遗忘；忘记', pattern: 'ABC', priority: 'HIGH', tip: '过去分词常用 forgotten；英式英语也可见 forgot 作过去分词' },
  { id: 'v-freeze', base: 'freeze', past: 'froze', pastParticiple: 'frozen', meaning: '结冰；冻结', pattern: 'ABC', priority: 'CORE', tip: 'freeze - froze - frozen' },
  { id: 'v-give', base: 'give', past: 'gave', pastParticiple: 'given', meaning: '给予；提供', pattern: 'ABC', priority: 'HIGH', tip: 'give - gave - given' },
  { id: 'v-forgive', base: 'forgive', past: 'forgave', pastParticiple: 'forgiven', meaning: '原谅；宽恕', pattern: 'ABC', priority: 'CORE', tip: '继承 give：forgave - forgiven' },
  { id: 'v-hide', base: 'hide', past: 'hid', pastParticiple: 'hidden', meaning: '隐藏；躲藏', pattern: 'ABC', priority: 'HIGH', tip: '分词双写 d：hidden' },
  { id: 'v-ride', base: 'ride', past: 'rode', pastParticiple: 'ridden', meaning: '骑；乘', pattern: 'ABC', priority: 'HIGH', tip: 'ride a bike，分词双写 d：ridden' },
  { id: 'v-rise', base: 'rise', past: 'rose', pastParticiple: 'risen', meaning: '升起；增加', pattern: 'ABC', priority: 'HIGH', tip: '不及物动词，rose - risen' },
  { id: 'v-see', base: 'see', past: 'saw', pastParticiple: 'seen', meaning: '看见；领会', pattern: 'ABC', priority: 'HIGH', tip: 'see - saw - seen' },
  { id: 'v-shake', base: 'shake', past: 'shook', pastParticiple: 'shaken', meaning: '摇晃；握手', pattern: 'ABC', priority: 'CORE', tip: 'shake hands，shook - shaken' },
  { id: 'v-speak', base: 'speak', past: 'spoke', pastParticiple: 'spoken', meaning: '说话；说语言', pattern: 'ABC', priority: 'HIGH', tip: 'speak - spoke - spoken' },
  { id: 'v-steal', base: 'steal', past: 'stole', pastParticiple: 'stolen', meaning: '偷盗；窃取', pattern: 'ABC', priority: 'CORE', tip: 'steal - stole - stolen' },
  { id: 'v-take', base: 'take', past: 'took', pastParticiple: 'taken', meaning: '拿；带；花费', pattern: 'ABC', priority: 'HIGH', tip: 'take - took - taken' },
  { id: 'v-mistake', base: 'mistake', past: 'mistook', pastParticiple: 'mistaken', meaning: '弄错；误解', pattern: 'ABC', priority: 'CORE', tip: 'mistake A for B，mistook - mistaken' },
  { id: 'v-wake', base: 'wake', past: 'woke', pastParticiple: 'woken', meaning: '唤醒；醒来', pattern: 'ABC', priority: 'HIGH', tip: 'wake up 醒来，woke - woken' },
  { id: 'v-wear', base: 'wear', past: 'wore', pastParticiple: 'worn', meaning: '穿着；戴着；磨损', pattern: 'ABC', priority: 'HIGH', tip: 'wear - wore - worn' },
  { id: 'v-write', base: 'write', past: 'wrote', pastParticiple: 'written', meaning: '书写；写作', pattern: 'ABC', priority: 'HIGH', tip: '过去分词双写 t：written' },

  // 4. 其他 ABC 型动词
  { id: 'v-be', base: 'be', past: 'was/were', pastParticiple: 'been', meaning: '是；存在', pattern: 'ABC', priority: 'HIGH', tip: 'be 的一般现在时按主语变为 am/is/are；过去式按主语变为 was/were' },
  { id: 'v-do', base: 'do', past: 'did', pastParticiple: 'done', meaning: '做；干', pattern: 'ABC', priority: 'HIGH', tip: 'do - did - done' },
  { id: 'v-go', base: 'go', past: 'went', pastParticiple: 'gone', meaning: '去；走', pattern: 'ABC', priority: 'HIGH', tip: 'have been to（去过已回）与 have gone to（去了未归）' },

  // ==================== SPECIAL 特殊易混辨析 ====================
  { id: 'v-lie-down', base: 'lie (躺/位于)', past: 'lay', pastParticiple: 'lain', meaning: '躺下；位于', pattern: 'SPECIAL', priority: 'HIGH', tip: '【躺/位于】不规则：lie - lay - lain - lying' },
  { id: 'v-lie-tell', base: 'lie (撒谎)', past: 'lied', pastParticiple: 'lied', meaning: '说谎', pattern: 'SPECIAL', priority: 'HIGH', tip: '【撒谎】是规则动词：lie - lied - lied - lying' },
  { id: 'v-lay-put', base: 'lay (放置/下蛋)', past: 'laid', pastParticiple: 'laid', meaning: '产卵；下蛋；摆放', pattern: 'SPECIAL', priority: 'HIGH', tip: '【放/下蛋】及物动词：lay - laid - laid - laying' },
  { id: 'v-hang-suspend', base: 'hang (悬挂)', past: 'hung', pastParticiple: 'hung', meaning: '悬挂；吊', pattern: 'SPECIAL', priority: 'CORE', tip: '【挂衣服/挂灯笼】不规则：hang - hung - hung' },
  { id: 'v-hang-death', base: 'hang (绞死)', past: 'hanged', pastParticiple: 'hanged', meaning: '绞刑；上吊', pattern: 'SPECIAL', priority: 'CORE', tip: '【绞死】指处死是规则动词：hang - hanged - hanged' },
]

export interface IrregularVerbPronunciation {
  base: string
  past: string
  pastParticiple: string
}

/** 英式宽式 IPA；read、lead、be 等同形或多形项目按具体词形分别标注。 */
export const IRREGULAR_VERB_IPA: Record<string, IrregularVerbPronunciation> = {
  'v-cost': { base: '/kɒst/', past: '/kɒst/', pastParticiple: '/kɒst/' },
  'v-cut': { base: '/kʌt/', past: '/kʌt/', pastParticiple: '/kʌt/' },
  'v-hit': { base: '/hɪt/', past: '/hɪt/', pastParticiple: '/hɪt/' },
  'v-hurt': { base: '/hɜːt/', past: '/hɜːt/', pastParticiple: '/hɜːt/' },
  'v-let': { base: '/let/', past: '/let/', pastParticiple: '/let/' },
  'v-put': { base: '/pʊt/', past: '/pʊt/', pastParticiple: '/pʊt/' },
  'v-read': { base: '/riːd/', past: '/red/', pastParticiple: '/red/' },
  'v-set': { base: '/set/', past: '/set/', pastParticiple: '/set/' },
  'v-shut': { base: '/ʃʌt/', past: '/ʃʌt/', pastParticiple: '/ʃʌt/' },
  'v-spread': { base: '/spred/', past: '/spred/', pastParticiple: '/spred/' },
  'v-become': { base: '/bɪˈkʌm/', past: '/bɪˈkeɪm/', pastParticiple: '/bɪˈkʌm/' },
  'v-come': { base: '/kʌm/', past: '/keɪm/', pastParticiple: '/kʌm/' },
  'v-run': { base: '/rʌn/', past: '/ræn/', pastParticiple: '/rʌn/' },
  'v-overcome': { base: '/ˌəʊvəˈkʌm/', past: '/ˌəʊvəˈkeɪm/', pastParticiple: '/ˌəʊvəˈkʌm/' },
  'v-buy': { base: '/baɪ/', past: '/bɔːt/', pastParticiple: '/bɔːt/' },
  'v-bring': { base: '/brɪŋ/', past: '/brɔːt/', pastParticiple: '/brɔːt/' },
  'v-think': { base: '/θɪŋk/', past: '/θɔːt/', pastParticiple: '/θɔːt/' },
  'v-fight': { base: '/faɪt/', past: '/fɔːt/', pastParticiple: '/fɔːt/' },
  'v-catch': { base: '/kætʃ/', past: '/kɔːt/', pastParticiple: '/kɔːt/' },
  'v-teach': { base: '/tiːtʃ/', past: '/tɔːt/', pastParticiple: '/tɔːt/' },
  'v-feel': { base: '/fiːl/', past: '/felt/', pastParticiple: '/felt/' },
  'v-keep': { base: '/kiːp/', past: '/kept/', pastParticiple: '/kept/' },
  'v-sleep': { base: '/sliːp/', past: '/slept/', pastParticiple: '/slept/' },
  'v-sweep': { base: '/swiːp/', past: '/swept/', pastParticiple: '/swept/' },
  'v-leave': { base: '/liːv/', past: '/left/', pastParticiple: '/left/' },
  'v-meet': { base: '/miːt/', past: '/met/', pastParticiple: '/met/' },
  'v-mean': { base: '/miːn/', past: '/ment/', pastParticiple: '/ment/' },
  'v-build': { base: '/bɪld/', past: '/bɪlt/', pastParticiple: '/bɪlt/' },
  'v-lend': { base: '/lend/', past: '/lent/', pastParticiple: '/lent/' },
  'v-send': { base: '/send/', past: '/sent/', pastParticiple: '/sent/' },
  'v-spend': { base: '/spend/', past: '/spent/', pastParticiple: '/spent/' },
  'v-feed': { base: '/fiːd/', past: '/fed/', pastParticiple: '/fed/' },
  'v-lead': { base: '/liːd/', past: '/led/', pastParticiple: '/led/' },
  'v-lose': { base: '/luːz/', past: '/lɒst/', pastParticiple: '/lɒst/' },
  'v-shoot': { base: '/ʃuːt/', past: '/ʃɒt/', pastParticiple: '/ʃɒt/' },
  'v-find': { base: '/faɪnd/', past: '/faʊnd/', pastParticiple: '/faʊnd/' },
  'v-hear': { base: '/hɪə/', past: '/hɜːd/', pastParticiple: '/hɜːd/' },
  'v-hold': { base: '/həʊld/', past: '/held/', pastParticiple: '/held/' },
  'v-make': { base: '/meɪk/', past: '/meɪd/', pastParticiple: '/meɪd/' },
  'v-pay': { base: '/peɪ/', past: '/peɪd/', pastParticiple: '/peɪd/' },
  'v-say': { base: '/seɪ/', past: '/sed/', pastParticiple: '/sed/' },
  'v-sell': { base: '/sel/', past: '/səʊld/', pastParticiple: '/səʊld/' },
  'v-tell': { base: '/tel/', past: '/təʊld/', pastParticiple: '/təʊld/' },
  'v-stand': { base: '/stænd/', past: '/stʊd/', pastParticiple: '/stʊd/' },
  'v-understand': { base: '/ˌʌndəˈstænd/', past: '/ˌʌndəˈstʊd/', pastParticiple: '/ˌʌndəˈstʊd/' },
  'v-win': { base: '/wɪn/', past: '/wʌn/', pastParticiple: '/wʌn/' },
  'v-get': { base: '/ɡet/', past: '/ɡɒt/', pastParticiple: '/ɡɒt/' },
  'v-have': { base: '/hæv/', past: '/hæd/', pastParticiple: '/hæd/' },
  'v-dig': { base: '/dɪɡ/', past: '/dʌɡ/', pastParticiple: '/dʌɡ/' },
  'v-stick': { base: '/stɪk/', past: '/stʌk/', pastParticiple: '/stʌk/' },
  'v-sit': { base: '/sɪt/', past: '/sæt/', pastParticiple: '/sæt/' },
  'v-shine': { base: '/ʃaɪn/', past: '/ʃɒn/', pastParticiple: '/ʃɒn/' },
  'v-oversleep': { base: '/ˌəʊvəˈsliːp/', past: '/ˌəʊvəˈslept/', pastParticiple: '/ˌəʊvəˈslept/' },
  'v-burn': { base: '/bɜːn/', past: '/bɜːnt/', pastParticiple: '/bɜːnt/' },
  'v-beat': { base: '/biːt/', past: '/biːt/', pastParticiple: '/ˈbiːtən/' },
  'v-begin': { base: '/bɪˈɡɪn/', past: '/bɪˈɡæn/', pastParticiple: '/bɪˈɡʌn/' },
  'v-drink': { base: '/drɪŋk/', past: '/dræŋk/', pastParticiple: '/drʌŋk/' },
  'v-ring': { base: '/rɪŋ/', past: '/ræŋ/', pastParticiple: '/rʌŋ/' },
  'v-sing': { base: '/sɪŋ/', past: '/sæŋ/', pastParticiple: '/sʌŋ/' },
  'v-sink': { base: '/sɪŋk/', past: '/sæŋk/', pastParticiple: '/sʌŋk/' },
  'v-swim': { base: '/swɪm/', past: '/swæm/', pastParticiple: '/swʌm/' },
  'v-blow': { base: '/bləʊ/', past: '/bluː/', pastParticiple: '/bləʊn/' },
  'v-draw': { base: '/drɔː/', past: '/druː/', pastParticiple: '/drɔːn/' },
  'v-fly': { base: '/flaɪ/', past: '/fluː/', pastParticiple: '/fləʊn/' },
  'v-grow': { base: '/ɡrəʊ/', past: '/ɡruː/', pastParticiple: '/ɡrəʊn/' },
  'v-know': { base: '/nəʊ/', past: '/njuː/', pastParticiple: '/nəʊn/' },
  'v-throw': { base: '/θrəʊ/', past: '/θruː/', pastParticiple: '/θrəʊn/' },
  'v-break': { base: '/breɪk/', past: '/brəʊk/', pastParticiple: '/ˈbrəʊkən/' },
  'v-choose': { base: '/tʃuːz/', past: '/tʃəʊz/', pastParticiple: '/ˈtʃəʊzən/' },
  'v-drive': { base: '/draɪv/', past: '/drəʊv/', pastParticiple: '/ˈdrɪvən/' },
  'v-eat': { base: '/iːt/', past: '/et/ (also /eɪt/)', pastParticiple: '/ˈiːtən/' },
  'v-fall': { base: '/fɔːl/', past: '/fel/', pastParticiple: '/ˈfɔːlən/' },
  'v-forget-full': { base: '/fəˈɡet/', past: '/fəˈɡɒt/', pastParticiple: '/fəˈɡɒtən/ (also forgot /fəˈɡɒt/)' },
  'v-freeze': { base: '/friːz/', past: '/frəʊz/', pastParticiple: '/ˈfrəʊzən/' },
  'v-give': { base: '/ɡɪv/', past: '/ɡeɪv/', pastParticiple: '/ˈɡɪvən/' },
  'v-forgive': { base: '/fəˈɡɪv/', past: '/fəˈɡeɪv/', pastParticiple: '/fəˈɡɪvən/' },
  'v-hide': { base: '/haɪd/', past: '/hɪd/', pastParticiple: '/ˈhɪdən/' },
  'v-ride': { base: '/raɪd/', past: '/rəʊd/', pastParticiple: '/ˈrɪdən/' },
  'v-rise': { base: '/raɪz/', past: '/rəʊz/', pastParticiple: '/ˈrɪzən/' },
  'v-see': { base: '/siː/', past: '/sɔː/', pastParticiple: '/siːn/' },
  'v-shake': { base: '/ʃeɪk/', past: '/ʃʊk/', pastParticiple: '/ˈʃeɪkən/' },
  'v-speak': { base: '/spiːk/', past: '/spəʊk/', pastParticiple: '/ˈspəʊkən/' },
  'v-steal': { base: '/stiːl/', past: '/stəʊl/', pastParticiple: '/ˈstəʊlən/' },
  'v-take': { base: '/teɪk/', past: '/tʊk/', pastParticiple: '/ˈteɪkən/' },
  'v-mistake': { base: '/mɪˈsteɪk/', past: '/mɪˈstʊk/', pastParticiple: '/mɪˈsteɪkən/' },
  'v-wake': { base: '/weɪk/', past: '/wəʊk/', pastParticiple: '/ˈwəʊkən/' },
  'v-wear': { base: '/weə/', past: '/wɔː/', pastParticiple: '/wɔːn/' },
  'v-write': { base: '/raɪt/', past: '/rəʊt/', pastParticiple: '/ˈrɪtn/' },
  'v-be': { base: '/biː/', past: 'was /wɒz/ · were /wɜː/', pastParticiple: '/biːn/ (also /bɪn/)' },
  'v-do': { base: '/duː/', past: '/dɪd/', pastParticiple: '/dʌn/' },
  'v-go': { base: '/ɡəʊ/', past: '/went/', pastParticiple: '/ɡɒn/' },
  'v-lie-down': { base: '/laɪ/', past: '/leɪ/', pastParticiple: '/leɪn/' },
  'v-lie-tell': { base: '/laɪ/', past: '/laɪd/', pastParticiple: '/laɪd/' },
  'v-lay-put': { base: '/leɪ/', past: '/leɪd/', pastParticiple: '/leɪd/' },
  'v-hang-suspend': { base: '/hæŋ/', past: '/hʌŋ/', pastParticiple: '/hʌŋ/' },
  'v-hang-death': { base: '/hæŋ/', past: '/hæŋd/', pastParticiple: '/hæŋd/' },
}

/** 在册次单元词表中可定位的词条；未列出的条目显示为补充辨析。 */
export const IRREGULAR_VERB_BOOK_REFERENCE: Record<string, string> = {
  'v-cost': '八上 Unit 8', 'v-hit': '八下 Unit 2', 'v-let': '七上 Starter Unit 1', 'v-put': '七上 Starter Unit 2', 'v-read': '七上 Unit 1', 'v-set': '七下 Unit 8', 'v-shut': '八下 Unit 3',
  'v-become': '七下 Unit 2', 'v-come': '七上 Unit 1', 'v-run': '七上 Unit 5', 'v-buy': '七上 Unit 7', 'v-think': '七上 Unit 1', 'v-fight': '八上 Unit 1', 'v-teach': '七下 Unit 7',
  'v-feel': '七上 Unit 4', 'v-keep': '七上 Starter Unit 2', 'v-leave': '七下 Unit 2', 'v-meet': '七上 Starter Unit 1', 'v-mean': '八下 Unit 3', 'v-build': '七下 Unit 2', 'v-lend': '七下 Unit 2',
  'v-feed': '七下 Unit 2', 'v-lose': '七下 Unit 3', 'v-shoot': '八上 Unit 4', 'v-find': '七上 Starter Unit 2', 'v-hear': '七上 Unit 7', 'v-hold': '七下 Unit 5', 'v-make': '七上 Unit 1',
  'v-pay': '八上 Unit 8', 'v-say': '七上 Starter Unit 1', 'v-tell': '七上 Unit 3', 'v-understand': '七下 Unit 2', 'v-get': '七上 Unit 1', 'v-have': '七上 Starter Unit 1', 'v-dig': '九下 Unit 2',
  'v-stick': '八上 Unit 6', 'v-sit': '七上 Starter Unit 1', 'v-shine': '七下 Unit 5', 'v-burn': '八下 Unit 2', 'v-beat': '八下 Unit 5', 'v-begin': '七上 Unit 6', 'v-drink': '七上 Unit 7',
  'v-ring': '八下 Unit 3', 'v-sing': '七上 Unit 5', 'v-swim': '七上 Unit 5', 'v-draw': '七上 Unit 4', 'v-fly': '七上 Unit 5', 'v-know': '七上 Unit 1', 'v-throw': '八下 Unit 2',
  'v-drive': '七下 Unit 5', 'v-eat': '七上 Unit 7', 'v-forget-full': '八上 Unit 1', 'v-give': '七上 Unit 4', 'v-forgive': '八下 Unit 3', 'v-hide': '八下 Unit 5', 'v-ride': '七下 Unit 5',
  'v-see': '七上 Starter Unit 2', 'v-shake': '八下 Unit 6', 'v-speak': '七上 Unit 1', 'v-steal': '八下 Unit 7 / 九下 Unit 1', 'v-take': '七上 Unit 5', 'v-wear': '七上 Unit 1', 'v-write': '七上 Unit 1',
  'v-be': '七上 Unit 1', 'v-do': '七上 Starter Unit 1', 'v-go': '七上 Starter Unit 1',
  'v-lead': '九上 Unit 1',
}
