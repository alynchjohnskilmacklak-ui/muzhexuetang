// @ts-nocheck — 独立测试脚本（tsx 运行），不参与项目 tsc 检查
/**
 * 教师反馈 AI 知识点批量实测脚本（tsx 运行）
 * 用法: npx tsx _kp_batch.ts [批次名]
 * 批次: math(数学15) / science(物理化学15) / lang(语文英语生物40) / humanities(政治历史地理45) / all
 * 每用例: 1 次知识卡调用; 每 5 个用例抽 1 个文章生成(1 学生)
 */
import fs from 'fs'

// ---- 加载环境变量（不打印密钥）----
function loadEnvFile(p: string) {
  try {
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch { /* ignore */ }
}
loadEnvFile('.env')
loadEnvFile('.env.local')

const main = async () => {
const { buildCardSystemPrompt, buildArticleSystemPrompt, parseCardOnly, parseSingleArticle, resolveAIProvider } = await import('./src/lib/classroom-feedback/ai-chat.ts')
const { callDeepSeek, callDoubao } = await import('./src/lib/ai/client.ts')
const { getKnowledgePointOptions } = await import('./src/lib/classroom-feedback/subject-knowledge-points.ts')
const { textbookEdition } = await import('./src/lib/classroom-feedback/textbook-editions.ts')

const provider = resolveAIProvider()
console.log('provider =', provider)

type Case = { grade: string; subject: string; topic: string; note: string }

// ---- 用例库（全部来自 Obsidian 课本目录/资料/归纳）----
const CASES: Record<string, Case[]> = {
  xia: [
    // ===== 数学·下册（冀教版）=====
    { grade: '初一', subject: '数学', topic: '二元一次方程组', note: '这节课主要讲了二元一次方程组，学习了二元一次方程组的概念，代入消元法和加减消元法，还有列方程组解应用题。' },
    { grade: '初一', subject: '数学', topic: '相交线与平行线', note: '这节课主要讲了相交线与平行线，学习了对顶角、邻补角，垂线，平行线的判定与性质，还有平行线中的拐点问题。' },
    { grade: '初一', subject: '数学', topic: '整式的乘法', note: '这节课主要讲了整式的乘法，学习了同底数幂的乘法、幂的乘方、积的乘方，单项式乘单项式、多项式乘多项式。' },
    { grade: '初一', subject: '数学', topic: '因式分解', note: '这节课主要讲了因式分解，学习了提公因式法、公式法分解因式，平方差公式和完全平方公式的逆用。' },
    { grade: '初一', subject: '数学', topic: '一元一次不等式与一元一次不等式组', note: '这节课主要讲了一元一次不等式与一元一次不等式组，学习了不等式的性质，解不等式，还有不等式组的解集。' },
    { grade: '初二', subject: '数学', topic: '数据的收集与整理', note: '这节课主要讲了数据的收集与整理，学习了全面调查与抽样调查，频数分布直方图，还有平均数、中位数、众数。' },
    { grade: '初二', subject: '数学', topic: '平面直角坐标系', note: '这节课主要讲了平面直角坐标系，学习了有序数对、点的坐标，象限内点的坐标特征，还有用坐标表示地理位置。' },
    { grade: '初二', subject: '数学', topic: '函数', note: '这节课主要讲了函数，学习了变量与常量，函数的概念，函数图象，还有函数解析式与自变量的取值范围。' },
    { grade: '初二', subject: '数学', topic: '四边形', note: '这节课主要讲了四边形，学习了平行四边形的性质和判定，矩形的性质，菱形、正方形的性质，还有中位线定理。' },
    { grade: '初二', subject: '数学', topic: '四边形与函数综合', note: '这节课主要讲了四边形与函数综合，学习了在平面直角坐标系中求四边形面积，动点问题，还有函数图象与几何的综合应用。' },
    { grade: '初三', subject: '数学', topic: '直线与圆的位置关系', note: '这节课主要讲了直线与圆的位置关系，学习了相离相切相交的判定，切线的性质与判定，切线长定理。' },
    { grade: '初三', subject: '数学', topic: '二次函数', note: '这节课主要讲了二次函数，学习了二次函数的定义、图象和性质，顶点式、一般式，还有对称轴与最值。' },
    { grade: '初三', subject: '数学', topic: '随机事件的概率', note: '这节课主要讲了随机事件的概率，学习了随机事件、确定事件，概率的计算，列表法和树状图法求概率。' },
    { grade: '初三', subject: '数学', topic: '投影与视图', note: '这节课主要讲了投影与视图，学习了平行投影与中心投影，三视图，由三视图确定几何体。' },
    { grade: '初三', subject: '数学', topic: '二次函数的应用', note: '这节课主要讲了二次函数的应用，学习了用二次函数解决利润最大问题、面积问题，还有抛物线型的实际问题。' },
    // ===== 物理·下册（人教版；八下/九下目录文件缺章节，取教材标准章节）=====
    { grade: '初二', subject: '物理', topic: '力', note: '这节课主要讲了力，学习了力的概念、力的作用效果，力的三要素，力的示意图，还有弹力和重力。' },
    { grade: '初二', subject: '物理', topic: '运动和力', note: '这节课主要讲了运动和力，学习了牛顿第一定律、惯性，二力平衡，还有摩擦力及其影响因素。' },
    { grade: '初二', subject: '物理', topic: '压强', note: '这节课主要讲了压强，学习了压强的概念和公式p=F/S，增大减小压强的方法，液体压强的特点，还有大气压强。' },
    { grade: '初二', subject: '物理', topic: '浮力', note: '这节课主要讲了浮力，学习了浮力产生的原因，阿基米德原理，物体的浮沉条件，还有浮力的计算。' },
    { grade: '初二', subject: '物理', topic: '功和机械能', note: '这节课主要讲了功和机械能，学习了功的概念和公式W=Fs，功率P=W/t，动能势能，还有机械能及其转化。' },
    { grade: '初三', subject: '物理', topic: '信息的传递', note: '这节课主要讲了信息的传递，学习了电磁波的产生与传播，电磁波的波速波长频率，还有现代通信方式。' },
    { grade: '初三', subject: '物理', topic: '能源与可持续发展', note: '这节课主要讲了能源与可持续发展，学习了一次能源二次能源，不可再生能源，能源的利用效率，还有可持续发展。' },
    { grade: '初三', subject: '物理', topic: '核能', note: '这节课主要讲了核能，学习了核裂变和核聚变，链式反应，核电站的工作原理，还有核能的优缺点。' },
    { grade: '初三', subject: '物理', topic: '家庭用电', note: '这节课主要讲了家庭用电，学习了家庭电路的组成，火线零线，测电笔的使用，触电与安全用电。' },
    { grade: '初三', subject: '物理', topic: '电磁波', note: '这节课主要讲了电磁波，学习了电磁波的产生、传播速度，电磁波的波速公式c=λf，还有电磁波的应用。' },
    // ===== 化学·下册（人教版九下，目录缺章节，取教材标准章节）=====
    { grade: '初三', subject: '化学', topic: '金属和金属材料', note: '这节课主要讲了金属和金属材料，学习了金属的物理性质，合金，金属的化学性质，金属活动性顺序。' },
    { grade: '初三', subject: '化学', topic: '溶液', note: '这节课主要讲了溶液，学习了溶液的概念特征，饱和溶液与不饱和溶液，溶解度，溶质质量分数。' },
    { grade: '初三', subject: '化学', topic: '酸和碱', note: '这节课主要讲了酸和碱，学习了常见的酸盐酸硫酸，常见的碱氢氧化钠氢氧化钙，酸碱中和反应。' },
    { grade: '初三', subject: '化学', topic: '盐和化肥', note: '这节课主要讲了盐和化肥，学习了常见盐的性质，复分解反应，化肥的种类和鉴别，还有粗盐提纯。' },
    { grade: '初三', subject: '化学', topic: '化学与生活', note: '这节课主要讲了化学与生活，学习了人体中的化学元素，营养素蛋白质糖类油脂维生素，还有有机合成材料。' },
    // ===== 生物·下册（冀少版）=====
    { grade: '初一', subject: '生物', topic: '消化系统与营养摄取', note: '这节课主要讲了消化系统与营养摄取，学习了消化系统的组成，食物中的营养物质，消化和吸收的主要场所。' },
    { grade: '初一', subject: '生物', topic: '循环系统与物质运输', note: '这节课主要讲了循环系统与物质运输，学习了血液的组成，血管动脉静脉毛细血管，心脏的结构，血液循环。' },
    { grade: '初一', subject: '生物', topic: '呼吸系统与气体交换', note: '这节课主要讲了呼吸系统与气体交换，学习了呼吸道的作用，肺的结构，肺泡与血液的气体交换。' },
    { grade: '初一', subject: '生物', topic: '泌尿系统与废物排出', note: '这节课主要讲了泌尿系统与废物排出，学习了肾单位的结构，尿的形成过程，还有排尿的意义。' },
    { grade: '初一', subject: '生物', topic: '人体生命活动的调节', note: '这节课主要讲了人体生命活动的调节，学习了神经系统的组成，反射，激素调节，还有神经调节与激素调节的关系。' },
    { grade: '初二', subject: '生物', topic: '生物的生殖和发育', note: '这节课主要讲了生物的生殖和发育，学习了植物的无性生殖和有性生殖，昆虫、两栖动物、鸟的生殖发育过程。' },
    { grade: '初二', subject: '生物', topic: '生物的进化', note: '这节课主要讲了生物的进化，学习了生命起源的化学进化，生物进化的历程，自然选择学说。' },
    { grade: '初二', subject: '生物', topic: '生物与环境', note: '这节课主要讲了生物与环境，学习了生态因素，生物对环境的适应与影响，食物链食物网。' },
    { grade: '初二', subject: '生物', topic: '生态系统', note: '这节课主要讲了生态系统，学习了生态系统的组成，生产者消费者分解者，生态系统中的能量流动和物质循环。' },
    { grade: '初二', subject: '生物', topic: '人类活动对生物圈的影响', note: '这节课主要讲了人类活动对生物圈的影响，学习了环境污染，温室效应，还有保护生物圈的措施。' },
    // ===== 英语·下册（人教版2024）=====
    { grade: '初一', subject: '英语', topic: 'Unit 1 Animal friends（动物朋友）', note: '这节课主要讲了英语七下Unit 1 Animal friends，学习了动物词汇，一般现在时第三人称单数，还有描述动物的句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 2 No Rules, No Order（祈使句）', note: '这节课主要讲了英语七下Unit 2 No Rules, No Order，学习了祈使句的用法，情态动词have to/must，还有制定规则。' },
    { grade: '初一', subject: '英语', topic: 'Unit 3 Keep Fit（健康与运动）', note: '这节课主要讲了英语七下Unit 3 Keep Fit，学习了运动与健康词汇，频率副词的用法，还有表达建议的句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 4 Eat Well（饮食）', note: '这节课主要讲了英语七下Unit 4 Eat Well，学习了食物饮料词汇，可数名词与不可数名词，还有点餐句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 5 Here and Now（现在进行时）', note: '这节课主要讲了英语七下Unit 5 Here and Now，学习了现在进行时be+doing的用法，还有打电话用语。' },
    { grade: '初二', subject: '英语', topic: 'Unit 1 What\'s the matter?（健康与急救）', note: '这节课主要讲了英语八下Unit 1，学习了身体部位和疾病词汇，should的用法，还有提建议的句型。' },
    { grade: '初二', subject: '英语', topic: 'Unit 2 I\'ll help to clean up the city parks.（动词不定式）', note: '这节课主要讲了英语八下Unit 2，学习了志愿者活动词汇，动词不定式的用法，还有提供帮助的句型。' },
    { grade: '初二', subject: '英语', topic: 'Unit 3 Could you please clean your room?（礼貌请求）', note: '这节课主要讲了英语八下Unit 3，学习了两边请求的表达，Could you please...句型，还有家务劳动词汇。' },
    { grade: '初二', subject: '英语', topic: 'Unit 4 Why don\'t you talk to your parents?（建议句型）', note: '这节课主要讲了英语八下Unit 4，学习了建议句型Why don\'t you...，让步状语从句，还有亲子沟通话题。' },
    { grade: '初二', subject: '英语', topic: 'Unit 5 What were you doing when the rainstorm came?（过去进行时）', note: '这节课主要讲了英语八下Unit 5，学习了过去进行时was/were+doing，when与while引导的时间状语从句。' },
    { grade: '初三', subject: '英语', topic: 'Unit 1 Let\'s Celebrate!（节日与庆祝）', note: '这节课主要讲了英语九下Unit 1 Let\'s Celebrate!，学习了中外节日词汇，被动语态的复习，还有庆祝活动的表达。' },
    { grade: '初三', subject: '英语', topic: 'Unit 2 A Look into the Past（回望历史）', note: '这节课主要讲了英语九下Unit 2 A Look into the Past，学习了历史主题词汇，一般过去时与现在完成时的区别。' },
    { grade: '初三', subject: '英语', topic: 'Unit 3 A Taste of Art（艺术鉴赏）', note: '这节课主要讲了英语九下Unit 3 A Taste of Art，学习了艺术相关词汇，定语从句的复习，还有表达感受的句型。' },
    { grade: '初三', subject: '英语', topic: 'Unit 4 Reduce, Reuse, Recycle（环保）', note: '这节课主要讲了英语九下Unit 4 Reduce, Reuse, Recycle，学习了环保词汇，被动语态，还有提出环保倡议。' },
    { grade: '初三', subject: '英语', topic: 'Unit 5 Open to New Beginnings（展望未来）', note: '这节课主要讲了英语九下Unit 5 Open to New Beginnings，学习了毕业与未来话题词汇，宾语从句，还有展望未来的表达。' },
    // ===== 语文·下册（统编版；七下资料未列课文标题、九下无资料，取教材标准课文）=====
    { grade: '初一', subject: '语文', topic: '邓稼先', note: '这节课主要讲了杨振宁的《邓稼先》，学习了人物传记的特点，选取典型事例表现人物精神，还有对比手法的运用。' },
    { grade: '初一', subject: '语文', topic: '木兰诗', note: '这节课主要讲了北朝民歌《木兰诗》，学习了互文、顶真等修辞手法，文言实词，还有人物形象分析。' },
    { grade: '初一', subject: '语文', topic: '紫藤萝瀑布', note: '这节课主要讲了宗璞的《紫藤萝瀑布》，学习了托物言志的手法，景物描写，体会作者对生命感悟。' },
    { grade: '初一', subject: '语文', topic: '老王', note: '这节课主要讲了杨绛的《老王》，学习了散文的叙事特点，以小见大的写法，还有愧怍情感的解读。' },
    { grade: '初一', subject: '语文', topic: '河中石兽', note: '这节课主要讲了纪昀的《河中石兽》，学习了文言实词虚词，推理方法，还有"实践出真知"的道理。' },
    { grade: '初二', subject: '语文', topic: '社戏', note: '这节课主要讲了鲁迅的《社戏》，学习了小说的情节结构，人物形象，还有详略得当的写法。' },
    { grade: '初二', subject: '语文', topic: '安塞腰鼓', note: '这节课主要讲了刘成章的《安塞腰鼓》，学习了排比、反复的修辞，节奏与画面感，体会磅礴气势。' },
    { grade: '初二', subject: '语文', topic: '大自然的语言', note: '这节课主要讲了《大自然的语言》，学习了事理说明文的特点，说明方法，还有说明语言的准确性。' },
    { grade: '初二', subject: '语文', topic: '核舟记', note: '这节课主要讲了魏学洢的《核舟记》，学习了文言实词，空间顺序的说明方法，还有古代工艺之巧。' },
    { grade: '初二', subject: '语文', topic: '马说', note: '这节课主要讲了韩愈的《马说》，学习了文言虚词，托物寓意的写法，还有千里马与伯乐的关系。' },
    { grade: '初三', subject: '语文', topic: '鱼我所欲也', note: '这节课主要讲了《鱼我所欲也》（孟子），学习了文言实词虚词，比喻论证与对比论证，还有舍生取义的道理。' },
    { grade: '初三', subject: '语文', topic: '唐雎不辱使命', note: '这节课主要讲了《唐雎不辱使命》，学习了文言实词，对话描写，还有人物形象塑造。' },
    { grade: '初三', subject: '语文', topic: '送东阳马生序', note: '这节课主要讲了宋濂的《送东阳马生序》，学习了文言实词，对比手法，还有劝学的主旨。' },
    { grade: '初三', subject: '语文', topic: '曹刿论战', note: '这节课主要讲了《曹刿论战》，学习了文言实词，一鼓作气的含义，还有人物对话分析。' },
    { grade: '初三', subject: '语文', topic: '出师表', note: '这节课主要讲了诸葛亮的《出师表》，学习了文言实词虚词，议论抒情结合，还有忠君爱国的情感。' },
    // ===== 政治·下册（统编版标准章节；Obsidian 无分册目录）=====
    { grade: '初一', subject: '政治', topic: '青春时光', note: '这节课主要讲了青春时光，学习了青春的邀约，男生女生，青春的萌动，还有青春有格。' },
    { grade: '初一', subject: '政治', topic: '做情绪情感的主人', note: '这节课主要讲了做情绪情感的主人，学习了情绪的类型，情绪的管理，情感的作用。' },
    { grade: '初一', subject: '政治', topic: '在集体中成长', note: '这节课主要讲了在集体中成长，学习了集体的力量，集体生活成就我，还有集体建设。' },
    { grade: '初一', subject: '政治', topic: '法律与生活', note: '这节课主要讲了法律与生活，学习了法律的特征，法律的作用，还有与生活息息相关的法律。' },
    { grade: '初一', subject: '政治', topic: '走近法治天地', note: '这节课主要讲了走近法治天地，学习了法律是治国重器，依法办事，还有树立法治意识。' },
    { grade: '初二', subject: '政治', topic: '坚持宪法至上', note: '这节课主要讲了坚持宪法至上，学习了宪法的地位，宪法保障国家权力属于人民，还有宪法监督。' },
    { grade: '初二', subject: '政治', topic: '理解权利义务', note: '这节课主要讲了理解权利义务，学习了公民基本权利的内容，行使权利的界限，还有依法履行义务。' },
    { grade: '初二', subject: '政治', topic: '人民当家作主', note: '这节课主要讲了人民当家作主，学习了人民代表大会制度，基本政治制度，还有基本经济制度。' },
    { grade: '初二', subject: '政治', topic: '崇尚法治精神', note: '这节课主要讲了崇尚法治精神，学习了公平正义的价值，法治与自由的关系，还有守护公平正义。' },
    { grade: '初二', subject: '政治', topic: '我国国家机构', note: '这节课主要讲了我国国家机构，学习了国家权力机关、行政机关、司法机关的职权，还有国家机构的关系。' },
    { grade: '初三', subject: '政治', topic: '我们共同的世界', note: '这节课主要讲了我们共同的世界，学习了开放互动的世界，复杂多变的关系，还有世界舞台上的中国。' },
    { grade: '初三', subject: '政治', topic: '经济全球化', note: '这节课主要讲了经济全球化，学习了经济全球化的表现，影响，还有应对全球化的态度。' },
    { grade: '初三', subject: '政治', topic: '人类命运共同体', note: '这节课主要讲了人类命运共同体，学习了构建人类命运共同体的背景、内涵，还有中国担当。' },
    { grade: '初三', subject: '政治', topic: '走向未来的少年', note: '这节课主要讲了走向未来的少年，学习了少年的担当，职业准备，还有毕业季的成长。' },
    { grade: '初三', subject: '政治', topic: '文明与家园', note: '这节课主要讲了文明与家园，学习了中华文明与世界文明交流互鉴，还有生态文明建设。' },
    // ===== 历史·下册（统编版，来自归纳汇总分册标题）=====
    { grade: '初一', subject: '历史', topic: '繁盛一时的隋朝', note: '这节课主要讲了繁盛一时的隋朝，学习了隋朝的建立与统一，大运河的开通，还有隋炀帝的暴政。' },
    { grade: '初一', subject: '历史', topic: '贞观之治', note: '这节课主要讲了贞观之治，学习了唐太宗的治国措施，贞观之治的表现，还有"水能载舟亦能覆舟"。' },
    { grade: '初一', subject: '历史', topic: '开元盛世', note: '这节课主要讲了开元盛世，学习了唐玄宗前期的改革措施，开元盛世的繁荣表现，还有盛唐气象。' },
    { grade: '初一', subject: '历史', topic: '科举制的创立', note: '这节课主要讲了科举制的创立，学习了科举制的诞生过程，科举制的影响，还有与九品中正制的对比。' },
    { grade: '初一', subject: '历史', topic: '民族政权并立的时代', note: '这节课主要讲了民族政权并立的时代，学习了辽、宋、夏、金的并立，澶渊之盟，还有岳飞抗金。' },
    { grade: '初二', subject: '历史', topic: '中国人民站起来了', note: '这节课主要讲了中国人民站起来了，学习了开国大典，新中国成立的历史意义，还有西藏和平解放。' },
    { grade: '初二', subject: '历史', topic: '最可爱的人', note: '这节课主要讲了最可爱的人，学习了抗美援朝的背景、经过，黄继光邱少云的英雄事迹，还有抗美援朝精神。' },
    { grade: '初二', subject: '历史', topic: '土地改革', note: '这节课主要讲了土地改革，学习了土地改革的原因、过程，还有土地改革的历史意义。' },
    { grade: '初二', subject: '历史', topic: '改革开放', note: '这节课主要讲了改革开放，学习了十一届三中全会，家庭联产承包责任制，经济特区，还有改革开放的成就。' },
    { grade: '初二', subject: '历史', topic: '社会主义道路的探索', note: '这节课主要讲了社会主义道路的探索，学习了一五计划，三大改造，大跃进和人民公社化，还有文革的教训。' },
    { grade: '初三', subject: '历史', topic: '俄十月革命', note: '这节课主要讲了俄十月革命，学习了十月革命的背景、经过，苏维埃政权的建立，还有十月革命的历史意义。' },
    { grade: '初三', subject: '历史', topic: '对社会主义道路的探索', note: '这节课主要讲了对社会主义道路的探索，学习了新经济政策，苏联的工业化，农业集体化，还有斯大林模式。' },
    { grade: '初三', subject: '历史', topic: '罗斯福新政', note: '这节课主要讲了罗斯福新政，学习了经济大危机的背景，罗斯福新政的措施，还有新政的影响。' },
    { grade: '初三', subject: '历史', topic: '第二次世界大战', note: '这节课主要讲了第二次世界大战，学习了二战的背景，全面爆发，反法西斯联盟，还有二战的影响。' },
    { grade: '初三', subject: '历史', topic: '冷战', note: '这节课主要讲了冷战，学习了冷战的背景，杜鲁门主义，马歇尔计划，还有两极格局的形成。' },
    // ===== 地理·下册（人教版；Obsidian 无目录，取教材标准章节；九年级无地理新课）=====
    { grade: '初一', subject: '地理', topic: '日本', note: '这节课主要讲了日本，学习了日本的地理位置、领土组成，多火山地震的原因，还有发达的加工贸易经济。' },
    { grade: '初一', subject: '地理', topic: '俄罗斯', note: '这节课主要讲了俄罗斯，学习了俄罗斯的地理位置，地形气候特点，丰富的自然资源，还有交通运输。' },
    { grade: '初一', subject: '地理', topic: '撒哈拉以南非洲', note: '这节课主要讲了撒哈拉以南非洲，学习了黑种人的故乡，自然环境特点，单一商品经济的弊端，还有人口粮食环境问题。' },
    { grade: '初一', subject: '地理', topic: '澳大利亚', note: '这节课主要讲了澳大利亚，学习了澳大利亚的古老生物，农牧业和工矿业，还有人口城市分布。' },
    { grade: '初一', subject: '地理', topic: '巴西', note: '这节课主要讲了巴西，学习了巴西的位置，热带雨林的保护，工农业发展，还有人口城市分布。' },
    { grade: '初二', subject: '地理', topic: '北方地区', note: '这节课主要讲了北方地区，学习了北方地区的自然特征，黑土地黄土地，农业特点，还有东北三省。' },
    { grade: '初二', subject: '地理', topic: '南方地区', note: '这节课主要讲了南方地区，学习了南方地区的自然特征，水田农业，长江三角洲，还有港澳台。' },
    { grade: '初二', subject: '地理', topic: '西北地区', note: '这节课主要讲了西北地区，学习了西北地区的干旱特征，绿洲农业，塔里木盆地，还有荒漠化防治。' },
    { grade: '初二', subject: '地理', topic: '青藏地区', note: '这节课主要讲了青藏地区，学习了青藏地区的高寒特征，河谷农业，三江源自然保护区，还有高寒牧业。' },
    { grade: '初二', subject: '地理', topic: '中国在世界中', note: '这节课主要讲了中国在世界中，学习了我国发展成就，发展中面临的挑战，还有负责任大国形象。' },
    { grade: '初三', subject: '地理', topic: '大洲和大洋的分布', note: '这节课主要讲了大洲和大洋的分布，复习了七大洲四大洋的位置，洲界线，还有海陆分布特点。' },
    { grade: '初三', subject: '地理', topic: '等高线地形图', note: '这节课主要讲了等高线地形图，复习了等高线的判读，山顶山脊山谷鞍部陡崖的识别，还有地形剖面图。' },
    { grade: '初三', subject: '地理', topic: '中国的自然环境', note: '这节课主要讲了中国自然环境复习，梳理了地形气候河流的分布规律，还有自然环境的区域差异。' },
    { grade: '初三', subject: '地理', topic: '世界气候类型的判读', note: '这节课主要讲了世界气候类型的判读，复习了气温降水图的分析，气候类型的特征与分布，还有气候对人类的影响。' },
    { grade: '初三', subject: '地理', topic: '中国的区域差异', note: '这节课主要讲了中国区域差异复习，梳理了四大地理区域的分界线，秦岭淮河一线，还有区域因地制宜发展。' },
  ],
  verify2: [
    // lang 批次 22 个错配用例（专名优先规则验证）
    { grade: '初一', subject: '语文', topic: '雨的四季', note: '这节课主要讲了《雨的四季》，学习了名词的概念和分类，体会作者对四季雨景的描绘。' },
    { grade: '初二', subject: '语文', topic: '新闻（消息二则）', note: '这节课主要讲了新闻体裁，学习消息的结构特点，标题、导语、主体、背景、结语，还有新闻六要素。' },
    { grade: '初二', subject: '语文', topic: '藤野先生', note: '这节课主要讲了鲁迅的《藤野先生》，学习了回忆性散文的特点，典型事例与人物形象分析。' },
    { grade: '初二', subject: '语文', topic: '三峡（郦道元）', note: '这节课主要讲了郦道元的《三峡》，学习了文言文实词虚词，一词多义，还有写景的层次与手法。' },
    { grade: '初二', subject: '语文', topic: '背影（朱自清）', note: '这节课主要讲了朱自清的《背影》，学习了以小见大的写法，细节描写，体会父爱的深沉。' },
    { grade: '初二', subject: '语文', topic: '孟子三章（富贵不能淫）', note: '这节课主要讲了《孟子三章》，学习了文言文的通假字、词类活用，还有论证方法。' },
    { grade: '初三', subject: '语文', topic: '湖心亭看雪', note: '这节课主要讲了张岱的《湖心亭看雪》，学习了白描手法，文言文阅读方法，体会作者的故国之思。' },
    { grade: '初三', subject: '语文', topic: '故乡（鲁迅）', note: '这节课主要讲了鲁迅的《故乡》，学习了小说三要素，人物对比分析，闰土和杨二嫂的形象。' },
    { grade: '初三', subject: '语文', topic: '我的叔叔于勒（莫泊桑）', note: '这节课主要讲了莫泊桑的《我的叔叔于勒》，学习了小说情节结构，对比手法，人物形象的塑造。' },
    { grade: '初一', subject: '英语', topic: 'Unit 1 You and Me（人称代词与be动词）', note: '这节课主要讲了英语七上Unit 1 You and Me，学习了be动词am/is/are的用法，人称代词主格，还有自我介绍句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 2 We\'re Family（名词所有格）', note: '这节课主要讲了英语七上Unit 2 We\'re Family，学习了家庭成员词汇，名词所有格\'s的用法，还有描述家人的句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 3 My School（方位介词）', note: '这节课主要讲了英语七上Unit 3 My School，学习了学校场所词汇，方位介词in/on/under，还有there be句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 5 Fun Clubs（情态动词can）', note: '这节课主要讲了英语七上Unit 5 Fun Clubs，学习了can/can\'t表示能力的用法，社团活动词汇，还有can引导的一般疑问句。' },
    { grade: '初二', subject: '英语', topic: 'Unit 2 How often do you exercise?（频度副词）', note: '这节课主要讲了英语八上Unit 2，学习了频度副词always/usually/often/sometimes，How often句型，还有频率的表达。' },
    { grade: '初二', subject: '英语', topic: 'Unit 3 I\'m more outgoing than my sister.（比较级）', note: '这节课主要讲了英语八上Unit 3，学习了形容词比较级的构成与用法，than的句型，还有both/as...as结构。' },
    { grade: '初二', subject: '英语', topic: 'Unit 4 What\'s the best movie theater?（最高级）', note: '这节课主要讲了英语八上Unit 4，学习了形容词最高级的构成与用法，the+最高级句型，还有比较句式。' },
    { grade: '初三', subject: '英语', topic: 'Unit 3 Smart Learning（被动语态）', note: '这节课主要讲了英语九上Unit 3 Smart Learning，学习了一般现在时被动语态am/is/are+过去分词，还有学习方法词汇。' },
    { grade: '初三', subject: '英语', topic: 'Unit 5 Power of Ideas（条件状语从句）', note: '这节课主要讲了英语九上Unit 5 Power of Ideas，学习了if条件状语从句，主将从现，还有表达观点与建议的句型。' },
    { grade: '初三', subject: '英语', topic: 'Unit 6 Beyond Earth（情态动词表推测）', note: '这节课主要讲了英语九上Unit 6 Beyond Earth，学习了must/can\'t/might表推测的用法，还有宇宙探索相关词汇。' },
    { grade: '初一', subject: '生物', topic: '组织、器官、系统和生物体', note: '这节课主要讲了生物体的结构层次，学习了组织的概念与类型，器官系统，还有人体的八大系统。' },
    { grade: '初一', subject: '生物', topic: '生物资源及其保护', note: '这节课主要讲了生物资源及其保护，学习了生物多样性的概念，保护生物多样性的措施，还有自然保护区。' },
    { grade: '初二', subject: '生物', topic: '生物的遗传与变异', note: '这节课主要讲了生物的遗传与变异，学习了基因的显性和隐性，遗传图解，还有可遗传变异与不可遗传变异。' },
  ],
  verify: [
    { grade: '初一', subject: '数学', topic: '几何图形的初步认识', note: '这节课主要讲了几何图形的初步认识，认识了点、线、面、体，学习了直线、射线、线段的区别与联系，还有角的度量。' },
    { grade: '初三', subject: '数学', topic: '图形的相似', note: '这节课主要讲了图形的相似，学习了相似三角形的判定与性质，比例线段，还有相似三角形的应用。' },
    { grade: '初三', subject: '数学', topic: '解直角三角形', note: '这节课主要讲了锐角三角函数和解直角三角形，学习了sin、cos、tan的定义，还有解直角三角形的应用。' },
    { grade: '初二', subject: '物理', topic: '透镜及其应用', note: '这节课主要讲了透镜及其应用，学习了凸透镜凹透镜，焦点焦距，还有凸透镜成像规律。' },
    { grade: '初二', subject: '生物', topic: '动物的运动和行为', note: '这节课主要讲了动物的运动和行为，学习了运动系统的组成，骨关节肌肉，还有先天性行为和学习行为。' },
    { grade: '初三', subject: '化学', topic: '质量守恒定律', note: '这节课主要讲了质量守恒定律，学习了质量守恒定律的内容，微观解释，还有化学方程式配平。' },
  ],
  math: [
    // 初一数学（冀教版七上）
    { grade: '初一', subject: '数学', topic: '有理数', note: '这节课主要讲了有理数的概念和分类，重点练了有理数的加减乘除运算，还有数轴、相反数、绝对值的应用。' },
    { grade: '初一', subject: '数学', topic: '几何图形的初步认识', note: '这节课主要讲了几何图形的初步认识，认识了点、线、面、体，学习了直线、射线、线段的区别与联系。' },
    { grade: '初一', subject: '数学', topic: '代数式', note: '这节课主要讲了代数式，用字母表示数量关系，学习列代数式、代数式的值，还有代数式的书写规则。' },
    { grade: '初一', subject: '数学', topic: '整式的加减', note: '这节课主要讲了整式的加减，认识了单项式、多项式、同类项，学习了合并同类项和去括号法则。' },
    { grade: '初一', subject: '数学', topic: '一元一次方程', note: '这节课主要讲了一元一次方程，学习解一元一次方程的方法，等式的性质、移项变号，还有列方程解应用题。' },
    // 初二数学（冀教版八上）
    { grade: '初二', subject: '数学', topic: '分式和分式方程', note: '这节课主要讲了分式和分式方程，学习了分式的概念、分式的基本性质、约分通分，还有解分式方程。' },
    { grade: '初二', subject: '数学', topic: '全等三角形', note: '这节课主要讲了全等三角形，学习了全等三角形的判定方法，SSS、SAS、ASA、AAS，还有全等三角形的性质。' },
    { grade: '初二', subject: '数学', topic: '实数', note: '这节课主要讲了实数，学习了无理数的概念、平方根和立方根，还有实数的分类与运算。' },
    { grade: '初二', subject: '数学', topic: '二次根式', note: '这节课主要讲了二次根式，学习了二次根式的概念、性质，还有二次根式的乘除与加减运算。' },
    { grade: '初二', subject: '数学', topic: '一次函数', note: '这节课主要讲了一次函数，学习了正比例函数和一次函数的概念、图像和性质，还有待定系数法求解析式。' },
    // 初三数学（冀教版九上）
    { grade: '初三', subject: '数学', topic: '一元二次方程', note: '这节课主要讲了一元二次方程，学习了配方法、公式法解一元二次方程，判别式与根的关系，还有一元二次方程的应用。' },
    { grade: '初三', subject: '数学', topic: '图形的相似', note: '这节课主要讲了图形的相似，学习了相似三角形的判定与性质，比例线段，还有相似三角形的应用。' },
    { grade: '初三', subject: '数学', topic: '解直角三角形', note: '这节课主要讲了锐角三角函数和解直角三角形，学习了sin、cos、tan的定义，还有解直角三角形的应用。' },
    { grade: '初三', subject: '数学', topic: '反比例函数', note: '这节课主要讲了反比例函数，学习了反比例函数的概念、图像和性质，还有k值的意义与应用。' },
    { grade: '初三', subject: '数学', topic: '圆', note: '这节课主要讲了圆，学习了圆的有关概念，圆心角、圆周角定理，还有直线与圆的位置关系。' },
  ],
  science: [
    // 物理八上
    { grade: '初二', subject: '物理', topic: '机械运动', note: '这节课主要讲了机械运动，学习了参照物、速度的概念，速度公式v=s/t，还有匀速直线运动。' },
    { grade: '初二', subject: '物理', topic: '声现象', note: '这节课主要讲了声现象，学习了声音的产生与传播，声速、回声，还有声音的三个特性音调响度音色。' },
    { grade: '初二', subject: '物理', topic: '物态变化', note: '这节课主要讲了物态变化，学习了熔化凝固、汽化液化、升华凝华，还有吸热放热过程。' },
    { grade: '初二', subject: '物理', topic: '光现象', note: '这节课主要讲了光现象，学习了光的直线传播、光的反射定律、平面镜成像，还有光的折射。' },
    { grade: '初二', subject: '物理', topic: '透镜及其应用', note: '这节课主要讲了透镜及其应用，学习了凸透镜凹透镜，焦点焦距，还有凸透镜成像规律。' },
    // 物理九上
    { grade: '初三', subject: '物理', topic: '内能及其利用', note: '这节课主要讲了内能及其利用，学习了内能的概念、改变内能的方式，热机、热机的效率。' },
    { grade: '初三', subject: '物理', topic: '电流和电路', note: '这节课主要讲了电流和电路，学习了电流的形成、电路的基本组成、串联并联，还有电流表的使用。' },
    { grade: '初三', subject: '物理', topic: '欧姆定律', note: '这节课主要讲了欧姆定律，学习了电流电压电阻的关系，欧姆定律公式I=U/R，还有伏安法测电阻。' },
    { grade: '初三', subject: '物理', topic: '电功率', note: '这节课主要讲了电功率，学习了电功率的概念、公式P=UI，电功、电能表，还有额定功率与实际功率。' },
    { grade: '初三', subject: '物理', topic: '电与磁', note: '这节课主要讲了电与磁，学习了磁现象、电流的磁效应，电磁铁，还有电动机与发电机原理。' },
    // 化学九上
    { grade: '初三', subject: '化学', topic: '物质的变化和性质', note: '这节课主要讲了物质的变化和性质，学习了物理变化与化学变化的区别，还有物理性质与化学性质。' },
    { grade: '初三', subject: '化学', topic: '空气', note: '这节课主要讲了空气，学习了空气的组成，氧气氮气稀有气体的性质和用途，还有空气污染与防治。' },
    { grade: '初三', subject: '化学', topic: '氧气', note: '这节课主要讲了氧气，学习了氧气的物理性质、化学性质，碳硫铁在氧气中燃烧的现象，还有化合反应。' },
    { grade: '初三', subject: '化学', topic: '分子和原子', note: '这节课主要讲了分子和原子，学习了分子的特征，分子与原子的区别，还有化学变化的微观本质。' },
    { grade: '初三', subject: '化学', topic: '质量守恒定律', note: '这节课主要讲了质量守恒定律，学习了质量守恒定律的内容，微观解释，还有化学方程式配平。' },
  ],
  lang: [
    // 语文初一（统编版七上）
    { grade: '初一', subject: '语文', topic: '春（朱自清）', note: '这节课主要讲了朱自清的《春》，学习了写景散文的朗读节奏，体会拟人手法的表达效果，还有重点词语。' },
    { grade: '初一', subject: '语文', topic: '济南的冬天（老舍）', note: '这节课主要讲了老舍的《济南的冬天》，学习了对比和拟人的写法，体会济南冬天温晴的特点。' },
    { grade: '初一', subject: '语文', topic: '雨的四季', note: '这节课主要讲了《雨的四季》，学习了名词的概念和分类，体会作者对四季雨景的描绘。' },
    { grade: '初一', subject: '语文', topic: '古代诗歌四首', note: '这节课主要讲了《古代诗歌四首》，学习了观沧海、次北固山下、闻王昌龄左迁龙标遥有此寄、天净沙秋思，体会情景交融。' },
    { grade: '初一', subject: '语文', topic: '从百草园到三味书屋', note: '这节课主要讲了鲁迅的《从百草园到三味书屋》，学习了文章结构，景物描写的方法，还有表现手法。' },
    // 语文初二（统编版八上）
    { grade: '初二', subject: '语文', topic: '新闻（消息二则）', note: '这节课主要讲了新闻体裁，学习消息的结构特点，标题、导语、主体、背景、结语，还有新闻六要素。' },
    { grade: '初二', subject: '语文', topic: '藤野先生', note: '这节课主要讲了鲁迅的《藤野先生》，学习了回忆性散文的特点，典型事例与人物形象分析。' },
    { grade: '初二', subject: '语文', topic: '三峡（郦道元）', note: '这节课主要讲了郦道元的《三峡》，学习了文言文实词虚词，一词多义，还有写景的层次与手法。' },
    { grade: '初二', subject: '语文', topic: '背影（朱自清）', note: '这节课主要讲了朱自清的《背影》，学习了以小见大的写法，细节描写，体会父爱的深沉。' },
    { grade: '初二', subject: '语文', topic: '孟子三章（富贵不能淫）', note: '这节课主要讲了《孟子三章》，学习了文言文的通假字、词类活用，还有论证方法。' },
    // 语文初三（统编版九上）
    { grade: '初三', subject: '语文', topic: '岳阳楼记', note: '这节课主要讲了范仲淹的《岳阳楼记》，学习了文言虚词实词，骈散结合的语言特点，还有先天下之忧而忧的忧乐情怀。' },
    { grade: '初三', subject: '语文', topic: '醉翁亭记', note: '这节课主要讲了欧阳修的《醉翁亭记》，学习了文言字词，游记的写景手法，醉翁之意不在酒的深意。' },
    { grade: '初三', subject: '语文', topic: '湖心亭看雪', note: '这节课主要讲了张岱的《湖心亭看雪》，学习了白描手法，文言文阅读方法，体会作者的故国之思。' },
    { grade: '初三', subject: '语文', topic: '故乡（鲁迅）', note: '这节课主要讲了鲁迅的《故乡》，学习了小说三要素，人物对比分析，闰土和杨二嫂的形象。' },
    { grade: '初三', subject: '语文', topic: '我的叔叔于勒（莫泊桑）', note: '这节课主要讲了莫泊桑的《我的叔叔于勒》，学习了小说情节结构，对比手法，人物形象的塑造。' },
    // 英语初一（人教版七上 Unit 主题）
    { grade: '初一', subject: '英语', topic: 'Unit 1 You and Me（人称代词与be动词）', note: '这节课主要讲了英语七上Unit 1 You and Me，学习了be动词am/is/are的用法，人称代词主格，还有自我介绍句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 2 We\'re Family（名词所有格）', note: '这节课主要讲了英语七上Unit 2 We\'re Family，学习了家庭成员词汇，名词所有格\'s的用法，还有描述家人的句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 3 My School（方位介词）', note: '这节课主要讲了英语七上Unit 3 My School，学习了学校场所词汇，方位介词in/on/under，还有there be句型。' },
    { grade: '初一', subject: '英语', topic: 'Unit 4 My Favourite Subject（一般现在时）', note: '这节课主要讲了英语七上Unit 4 My Favourite Subject，学习了学科词汇，一般现在时的肯定否定疑问句，还有频率副词。' },
    { grade: '初一', subject: '英语', topic: 'Unit 5 Fun Clubs（情态动词can）', note: '这节课主要讲了英语七上Unit 5 Fun Clubs，学习了can/can\'t表示能力的用法，社团活动词汇，还有can引导的一般疑问句。' },
    // 英语初二（人教版八上）
    { grade: '初二', subject: '英语', topic: 'Unit 1 Where did you go on vacation?（一般过去时）', note: '这节课主要讲了英语八上Unit 1，学习了假期活动词汇，一般过去时的用法，不规则动词过去式，还有复合不定代词。' },
    { grade: '初二', subject: '英语', topic: 'Unit 2 How often do you exercise?（频度副词）', note: '这节课主要讲了英语八上Unit 2，学习了频度副词always/usually/often/sometimes，How often句型，还有频率的表达。' },
    { grade: '初二', subject: '英语', topic: 'Unit 3 I\'m more outgoing than my sister.（比较级）', note: '这节课主要讲了英语八上Unit 3，学习了形容词比较级的构成与用法，than的句型，还有both/as...as结构。' },
    { grade: '初二', subject: '英语', topic: 'Unit 4 What\'s the best movie theater?（最高级）', note: '这节课主要讲了英语八上Unit 4，学习了形容词最高级的构成与用法，the+最高级句型，还有比较句式。' },
    { grade: '初二', subject: '英语', topic: 'Unit 5 Do you want to watch a game show?（动词不定式）', note: '这节课主要讲了英语八上Unit 5，学习了电视节目词汇，want to do结构，动词不定式的用法，还有表达观点的句型。' },
    // 英语初三（人教版九上）
    { grade: '初三', subject: '英语', topic: 'Unit 1 The Changing World（现在完成时）', note: '这节课主要讲了英语九上Unit 1 The Changing World，学习了现在完成时的构成have/has+过去分词，还有already/yet的用法。' },
    { grade: '初三', subject: '英语', topic: 'Unit 2 Inspiring People（定语从句）', note: '这节课主要讲了英语九上Unit 2 Inspiring People，学习了定语从句的基本结构，关系代词who/that/which的用法。' },
    { grade: '初三', subject: '英语', topic: 'Unit 3 Smart Learning（被动语态）', note: '这节课主要讲了英语九上Unit 3 Smart Learning，学习了一般现在时被动语态am/is/are+过去分词，还有学习方法词汇。' },
    { grade: '初三', subject: '英语', topic: 'Unit 5 Power of Ideas（条件状语从句）', note: '这节课主要讲了英语九上Unit 5 Power of Ideas，学习了if条件状语从句，主将从现，还有表达观点与建议的句型。' },
    { grade: '初三', subject: '英语', topic: 'Unit 6 Beyond Earth（情态动词表推测）', note: '这节课主要讲了英语九上Unit 6 Beyond Earth，学习了must/can\'t/might表推测的用法，还有宇宙探索相关词汇。' },
    // 生物初一（冀少版七上）
    { grade: '初一', subject: '生物', topic: '细胞', note: '这节课主要讲了细胞，学习了动植物细胞的结构，细胞壁细胞膜细胞质细胞核，还有显微镜的使用。' },
    { grade: '初一', subject: '生物', topic: '微生物', note: '这节课主要讲了微生物，学习了细菌、真菌、病毒的结构特点，还有微生物与人类的关系。' },
    { grade: '初一', subject: '生物', topic: '组织、器官、系统和生物体', note: '这节课主要讲了生物体的结构层次，学习了组织的概念与类型，器官系统，还有人体的八大系统。' },
    { grade: '初一', subject: '生物', topic: '生物的分类和鉴别', note: '这节课主要讲了生物的分类和鉴别，学习了生物分类的等级，界门纲目科属种，还有检索表的使用。' },
    { grade: '初一', subject: '生物', topic: '生物资源及其保护', note: '这节课主要讲了生物资源及其保护，学习了生物多样性的概念，保护生物多样性的措施，还有自然保护区。' },
    // 生物初二（冀少版八上/八下常用章节，目录文件缺章节故取常用）
    { grade: '初二', subject: '生物', topic: '动物的主要类群（无脊椎动物）', note: '这节课主要讲了无脊椎动物，学习了腔肠动物、扁形动物、环节动物、节肢动物的主要特征。' },
    { grade: '初二', subject: '生物', topic: '脊椎动物（鱼类两栖爬行）', note: '这节课主要讲了脊椎动物，学习了鱼类、两栖类、爬行类的主要特征，还有与人类生活的关系。' },
    { grade: '初二', subject: '生物', topic: '动物的运动和行为', note: '这节课主要讲了动物的运动和行为，学习了运动系统的组成，骨关节肌肉，还有先天性行为和学习行为。' },
    { grade: '初二', subject: '生物', topic: '生物的遗传与变异', note: '这节课主要讲了生物的遗传与变异，学习了基因的显性和隐性，遗传图解，还有可遗传变异与不可遗传变异。' },
    { grade: '初二', subject: '生物', topic: '传染病与免疫', note: '这节课主要讲了传染病与免疫，学习了传染病流行的三个环节，预防措施，还有特异性免疫与非特异性免疫。' },
  ],
  humanities: [
    // 政治（人教版归纳，跨年级各取5个常见章节）
    { grade: '初一', subject: '政治', topic: '宪法', note: '这节课主要讲了宪法，学习了宪法的地位与作用，宪法规定国家的根本制度、根本任务，还有公民的基本权利和义务。' },
    { grade: '初一', subject: '政治', topic: '公民人身权利', note: '这节课主要讲了公民的人身权利，学习了生命健康权、肖像权、名誉权、姓名权、隐私权，还有人身自由受法律保护。' },
    { grade: '初一', subject: '政治', topic: '消费者权益', note: '这节课主要讲了消费者权益，学习了消费者依法享有的权利，知情权、自主选择权、公平交易权，还有维权途径。' },
    { grade: '初一', subject: '政治', topic: '基本经济制度', note: '这节课主要讲了我国的基本经济制度，学习了公有制为主体、多种所有制经济共同发展，还有分配制度。' },
    { grade: '初一', subject: '政治', topic: '税收', note: '这节课主要讲了税收，学习了税收的种类，增值税、消费税、所得税，还有依法纳税的义务。' },
    { grade: '初二', subject: '政治', topic: '公民基本权利', note: '这节课主要讲了公民的基本权利，学习了选举权和被选举权、政治自由、监督权，还有行使权利的界限。' },
    { grade: '初二', subject: '政治', topic: '公民基本义务', note: '这节课主要讲了公民的基本义务，学习了维护国家统一和民族团结，遵守宪法法律，还有依法服兵役。' },
    { grade: '初二', subject: '政治', topic: '违法行为与法律责任', note: '这节课主要讲了违法行为，学习了违宪行为、民事违法、行政违法、刑事违法的区别，还有法律责任。' },
    { grade: '初二', subject: '政治', topic: '正当防卫', note: '这节课主要讲了正当防卫，学习了正当防卫的条件，还有防卫过当的认定。' },
    { grade: '初二', subject: '政治', topic: '劳动者的权利', note: '这节课主要讲了劳动者的权利，学习了平等就业权、取得劳动报酬权、休息休假权，还有劳动合同。' },
    { grade: '初三', subject: '政治', topic: '社会主义精神文明建设', note: '这节课主要讲了社会主义精神文明建设，学习了思想道德建设和教育科学文化建设，还有社会主义核心价值观。' },
    { grade: '初三', subject: '政治', topic: '民族精神', note: '这节课主要讲了伟大民族精神，学习了团结统一、爱好和平、勤劳勇敢、自强不息的精神内涵。' },
    { grade: '初三', subject: '政治', topic: '一国两制', note: '这节课主要讲了一国两制，学习了一个中国的原则，港澳台特别行政区的高度自治。' },
    { grade: '初三', subject: '政治', topic: '综合国力', note: '这节课主要讲了综合国力，学习了综合国力的主要内容，政治力、经济力、科技力、国防力。' },
    { grade: '初三', subject: '政治', topic: '可持续发展', note: '这节课主要讲了可持续发展，学习了人口资源环境问题，生态文明建设，还有绿色发展理念。' },
    // 历史（统编版归纳，各册取5课）
    { grade: '初一', subject: '历史', topic: '祖国境内的远古居民', note: '这节课主要讲了祖国境内的远古居民，学习了元谋人、北京人，还有人和动物的根本区别。' },
    { grade: '初一', subject: '历史', topic: '夏、商、西周的兴亡', note: '这节课主要讲了夏商西周的兴亡，学习了夏朝建立、世袭制代替禅让制，还有西周分封制。' },
    { grade: '初一', subject: '历史', topic: '华夏之祖', note: '这节课主要讲了华夏之祖，学习了黄帝炎帝，尧舜禹的禅让，还有夏朝的建立。' },
    { grade: '初一', subject: '历史', topic: '春秋战国的纷争', note: '这节课主要讲了春秋战国的纷争，学习了春秋五霸、战国七雄，还有商鞅变法。' },
    { grade: '初一', subject: '历史', topic: '秦统一六国', note: '这节课主要讲了秦统一六国，学习了秦朝的统一、郡县制，还有巩固统一的措施。' },
    { grade: '初二', subject: '历史', topic: '鸦片战争', note: '这节课主要讲了鸦片战争，学习了鸦片战争的背景、经过，还有南京条约的内容与影响。' },
    { grade: '初二', subject: '历史', topic: '洋务运动', note: '这节课主要讲了洋务运动，学习了洋务运动的口号、主要内容，还有对近代化的作用。' },
    { grade: '初二', subject: '历史', topic: '戊戌变法', note: '这节课主要讲了戊戌变法，学习了变法的背景、内容，还有戊戌六君子。' },
    { grade: '初二', subject: '历史', topic: '辛亥革命', note: '这节课主要讲了辛亥革命，学习了同盟会的建立、武昌起义，还有辛亥革命的功绩与局限。' },
    { grade: '初二', subject: '历史', topic: '五四运动', note: '这节课主要讲了五四运动，学习了五四运动的背景、经过、意义，还有新民主主义革命的开始。' },
    { grade: '初三', subject: '历史', topic: '文艺复兴运动', note: '这节课主要讲了文艺复兴运动，学习了文艺复兴的背景、核心思想，还有但丁、达芬奇的代表作品。' },
    { grade: '初三', subject: '历史', topic: '新航路的开辟', note: '这节课主要讲了新航路的开辟，学习了迪亚士、达伽马、哥伦布、麦哲伦的航行，还有新航路开辟的影响。' },
    { grade: '初三', subject: '历史', topic: '英国资产阶级革命', note: '这节课主要讲了英国资产阶级革命，学习了革命的原因、过程，还有权利法案与君主立宪制。' },
    { grade: '初三', subject: '历史', topic: '法国大革命', note: '这节课主要讲了法国大革命，学习了革命的背景、过程，人权宣言，还有拿破仑帝国。' },
    { grade: '初三', subject: '历史', topic: '工业革命', note: '这节课主要讲了工业革命，学习了珍妮机、蒸汽机，铁路时代，还有工业革命的影响。' },
    // 地理（人教版常用章节；Obsidian 无课本目录 md）
    { grade: '初一', subject: '地理', topic: '地球和地球仪', note: '这节课主要讲了地球和地球仪，学习了地球的形状大小，经纬线、经纬度，还有东西半球南北半球的划分。' },
    { grade: '初一', subject: '地理', topic: '地图', note: '这节课主要讲了地图，学习了地图的三要素，比例尺、方向、图例，还有地图的选择与应用。' },
    { grade: '初一', subject: '地理', topic: '大洲和大洋', note: '这节课主要讲了大洲和大洋，学习了七大洲四大洋的名称分布，还有洲界线和海陆分布。' },
    { grade: '初一', subject: '地理', topic: '天气与气候', note: '这节课主要讲了天气与气候，学习了天气与气候的区别，气温降水的变化，还有影响气候的因素。' },
    { grade: '初一', subject: '地理', topic: '人口与人种', note: '这节课主要讲了人口与人种，学习了世界人口的分布，人口增长过快过慢的问题，还有三大人种。' },
    { grade: '初二', subject: '地理', topic: '中国的疆域', note: '这节课主要讲了中国的疆域，学习了我国的地理位置，领土四端，邻国与临海，还有行政区划。' },
    { grade: '初二', subject: '地理', topic: '中国的地形', note: '这节课主要讲了中国的地形，学习了我国地势三级阶梯，主要山脉走向，四大高原四大盆地三大平原。' },
    { grade: '初二', subject: '地理', topic: '中国的气候', note: '这节课主要讲了中国的气候，学习了我国气温降水分布特点，季风气候显著，还有气候类型。' },
    { grade: '初二', subject: '地理', topic: '中国的河流', note: '这节课主要讲了中国的水资源与河流，学习了长江黄河的水文特征，还有水资源分布与节约用水。' },
    { grade: '初二', subject: '地理', topic: '中国的交通', note: '这节课主要讲了中国的主要交通运输方式，学习了铁路干线分布，交通运输方式的选择，还有交通运输网。' },
    { grade: '初三', subject: '地理', topic: '世界的气候类型', note: '这节课主要讲了世界的气候类型，学习了热带雨林气候、温带海洋性气候等主要气候类型的分布与特征。' },
    { grade: '初三', subject: '地理', topic: '东南亚', note: '这节课主要讲了东南亚，学习了东南亚的位置范围，马六甲海峡，热带经济作物，还有华人华侨。' },
    { grade: '初三', subject: '地理', topic: '中东', note: '这节课主要讲了中东，学习了中东的地理位置，石油资源，水资源，还有宗教文化冲突。' },
    { grade: '初三', subject: '地理', topic: '欧洲西部', note: '这节课主要讲了欧洲西部，学习了欧洲西部的位置范围，气候类型，畜牧业，还有旅游业。' },
    { grade: '初三', subject: '地理', topic: '中国的四大地理区域', note: '这节课主要讲了中国的四大地理区域，学习了北方地区、南方地区、西北地区、青藏地区的划分与特征。' },
  ],
}

// ---- 测试执行 ----
const batch = process.argv[2] || 'math'
const chosen = batch === 'all' ? [...CASES.math, ...CASES.science, ...CASES.lang, ...CASES.humanities] : CASES[batch] || CASES.mathconsole.log(`批次 ${batch}: ${chosen.length} 个用例`)

const call = async (params: { system: string; user: string; maxTokens: number; temperature: number }) =>
  provider === 'doubao' ? callDoubao({ ...params, jsonMode: true }) : callDeepSeek({ ...params, jsonMode: true })

const callWithRetry = async (params: { system: string; user: string; maxTokens: number; temperature: number }, retries = 3) => {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try { return await call(params) }
    catch (error) { lastError = error; await new Promise((r) => setTimeout(r, 1200 * (attempt + 1))) }
  }
  throw lastError
}

const results: any[] = []
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

for (let i = 0; i < chosen.length; i++) {
  const c = chosen[i]
  const edition = textbookEdition(c.grade, c.subject) || '人教版'
  const candidates = getKnowledgePointOptions(c.subject, c.grade).slice(0, 12)
  const input = {
    mode: 'generate' as const,
    subject: c.subject,
    grade: c.grade,
    edition,
    lessonNote: c.note,
    verifiedCard: null,
    students: [{ key: 'S1', level: 'OKAY' as const, observation: '学生认真听讲，能跟上老师节奏，主动举手回答问题，计算步骤清楚。' }],
    knowledgeCandidates: candidates,
  }
  const started = Date.now()
  let cardRaw = ''
  let cardErr = ''
  try {
    cardRaw = await callWithRetry({ system: buildCardSystemPrompt(input), user: JSON.stringify({ grade: c.grade, subject: c.subject, edition, lessonNote: c.note }), maxTokens: 2400, temperature: 0.3 })
  } catch (e) { cardErr = e instanceof Error ? e.message : String(e) }
  const cardResult = parseCardOnly(cardRaw, { edition, grade: c.grade, subject: c.subject, verifiedCard: null })
  const card = cardResult.card

  const topic = card?.topic || cardResult.topic
  const topicHit = c.topic.split(/[（(]/)[0].trim()
  const topicMatch = topic && (topic.includes(topicHit) || topicHit.includes(topic) || topic.includes(c.topic) || c.topic.includes(topic))

  const row: any = {
    grade: c.grade, subject: c.subject, expect: c.topic, topic, match: !!topicMatch,
    formulas: card?.formulas?.length ?? 0, tips: card?.tips?.length ?? 0, example: card?.example ? 1 : 0,
    defLen: (card?.definition || '').length, cardErr, ms: Date.now() - started,
  }
  results.push(row)
  console.log(`[${i + 1}/${chosen.length}] ${c.grade}·${c.subject}·期望「${c.topic}」→ topic「${topic || '(空)'}」${topicMatch ? '✓' : '✗ MISMATCH'} 公式${row.formulas} tips${row.tips} 例${row.example} ${(row.ms / 1000).toFixed(0)}s`)

  // 每 5 个用例抽 1 个文章生成（1 学生）
  if ((i + 1) % 5 === 0) {
    const artInput = { ...input, students: [{ key: 'S1', level: 'OKAY' as const, observation: '学生听讲认真，主动举手，计算步骤清楚，但书写略潦草。' }] }
    try {
      const artRaw = await callWithRetry({ system: buildArticleSystemPrompt(artInput, { key: 'S1', level: 'OKAY', observation: '学生听讲认真，主动举手，计算步骤清楚，但书写略潦草。' }), user: JSON.stringify({ grade: c.grade, subject: c.subject, edition, lessonNote: c.note }), maxTokens: 2200, temperature: 0.3 })
      const parsed = parseSingleArticle(artRaw, { id: 'test-student-1', name: '马子墨', observation: '' })
      const bad = /本节课学习内容[:：]|课堂反馈[:：]|孩子掌握情况[:：]|本次未记录|未记录|无法判断|暂无法/.test(parsed.article)
      row.articleLen = parsed.article.length
      row.articleBad = bad
      row.articleNamed = parsed.article.includes('马子墨同学')
      console.log(`   → 文章 ${parsed.article.length}字 含姓名${row.articleNamed ? '✓' : '✗'} 含小标题/未记录${bad ? '✗' : '✓'} | ${parsed.article.slice(0, 60)}…`)
    } catch (e) {
      row.articleErr = e instanceof Error ? e.message : String(e)
      console.log(`   → 文章失败: ${row.articleErr}`)
    }
  }
  await sleep(600) // 温和限速
}

// ---- 汇总 ----
const ok = results.filter((r) => r.match && r.formulas >= 1 && !r.cardErr)
const mismatch = results.filter((r) => !r.match)
const noFormula = results.filter((r) => r.match && r.formulas === 0)
const failed = results.filter((r) => r.cardErr)
console.log('\n===== 汇总 =====')
console.log(`总用例: ${results.length} | 识别+公式全通过: ${ok.length} | 识别错配: ${mismatch.length} | 无公式: ${noFormula.length} | 卡生成失败: ${failed.length}`)
if (mismatch.length) {
  console.log('\n— 识别错配明细 —')
  mismatch.forEach((r) => console.log(`  ${r.grade}·${r.subject} 期望「${r.expect}」→「${r.topic || '(空)'}」`))
}
if (noFormula.length) {
  console.log('\n— 无公式（理科应≥1） —')
  noFormula.forEach((r) => console.log(`  ${r.grade}·${r.subject}「${r.topic}」formulas=${r.formulas}`))
}
if (failed.length) {
  console.log('\n— 失败明细 —')
  failed.forEach((r) => console.log(`  ${r.grade}·${r.subject}「${r.expect}」: ${r.cardErr.slice(0, 80)}`))
}
fs.writeFileSync('_kp_report.json', JSON.stringify({ batch, provider, results }, null, 2))
console.log('\n报告已写入 _kp_report.json')
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
