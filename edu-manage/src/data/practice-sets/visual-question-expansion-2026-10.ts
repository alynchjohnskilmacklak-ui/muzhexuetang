import type { PracticeSet } from '../parent-practice-bank'

const mathSetId = 'visual-math-9-similarity-materials-202610'
const physicsSetId = 'visual-physics-zk-diagram-2024-hebei-202610'

const visualQuestionExpansionDraft202610: PracticeSet[] = [
  {
    id: mathSetId,
    grade: '初三',
    subject: '数学',
    volume: '上册',
    chapter: '第二十五章 图形的相似',
    section: '相似与平行线图示专项',
    edition: '牧哲学堂校内题型资料改编',
    sourceNote: '依据牧哲学堂九年级上册《第二十五章 图形的相似知识归纳与题型突破（单元复习 8类题型清单）（教师版）》的配图和相似题型改编；图片均为对应题目的独立几何示意图。改编题，非中考真题。',
    publishable: true,
    reviewedBy: 'Codex 内容校验',
    reviewedAt: '2026-10-16',
    knowledgePoints: [
      {
        id: `${mathSetId}-kp1`,
        title: '平行线分线段成比例',
        content: '一组平行线截两条直线，所得对应线段成比例；读图时先按交点顺序确定对应线段，再列比例式。',
      },
      {
        id: `${mathSetId}-kp2`,
        title: '相似三角形的性质',
        content: '相似三角形的对应边之比相等；对应高、周长的比等于相似比，面积比等于相似比的平方。',
      },
    ],
    questions: [
      {
        id: `${mathSetId}-q1`,
        type: 'single_choice',
        knowledgePointId: `${mathSetId}-kp1`,
        prompt: '如图，a∥b∥c，两条截线m、n分别交a、b、c于A、C、E和B、D、F。若AC=4 cm，CE=6 cm，BD=2 cm，则DF=（ ）。',
        options: ['2 cm', '3 cm', '4 cm', '6 cm'],
        answerIndex: 1,
        imageUrl: '/images/practice/math-parallel-transversals-local.png',
        difficulty: 'EXAM',
        explanation: '三条平行线截两条直线，截得的对应线段成比例，因此 AC/CE=BD/DF。代入 4/6=2/DF，解得 DF=3 cm。列比例时要按交点顺序对应 AC↔BD、CE↔DF。',
        sourceRef: '1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/九年级上册/第二十五章 图形的相似知识归纳与题型突破（单元复习 8类题型清单）（教师版）.md；第25章“平行线分线段成比例”巩固训练第1题图（image251.png）；按图改编，非中考真题。',
      },
      {
        id: `${mathSetId}-q2`,
        type: 'single_choice',
        knowledgePointId: `${mathSetId}-kp1`,
        prompt: '如图，四边形DCBA为平行四边形，F、A、B在同一直线上且A在F与B之间，直线FC交DA于E。若FA:AB=3:4，则FE:FC=（ ）。',
        options: ['3:7', '4:7', '3:4', '4:3'],
        answerIndex: 0,
        imageUrl: '/images/practice/math-parallelogram-transversal-local.png',
        difficulty: 'EXAM',
        explanation: '平行四边形对边平行，所以 AE∥BC；又 F、A、B共线，F、E、C共线，因此 △FAE∽△FBC。对应边成比例：FE/FC=FA/FB。由 FA:AB=3:4 且 FB=FA+AB，得 FA:FB=3:7，所以 FE:FC=3:7。',
        sourceRef: '1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/九年级上册/第二十五章 图形的相似知识归纳与题型突破（单元复习 8类题型清单）（教师版）.md；第25章“平行线分线段成比例”巩固训练第2题图（image263.png）；补入线段比后改编，非中考真题。',
      },
      {
        id: `${mathSetId}-q3`,
        type: 'single_choice',
        knowledgePointId: `${mathSetId}-kp2`,
        prompt: '如图，在△ABC中，D在AB上，E在AC上，DE∥BC；F在BC上，AF交DE于G。若AD:DB=2:3，则△AEG与△ACF的面积比为（ ）。',
        options: ['4:25', '2:5', '4:5', '4:9'],
        answerIndex: 0,
        imageUrl: '/images/practice/math-similarity-triangle-local.png',
        difficulty: 'EXAM',
        explanation: '由 DE∥BC，△ADE∽△ABC，所以 AE:AC=AD:AB=2:(2+3)=2:5。又 EG∥CF、A、G、F共线，因此 △AEG∽△ACF，相似比为2:5。面积比等于相似比的平方，故 S△AEG:S△ACF=4:25。',
        sourceRef: '1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/九年级上册/第二十五章 图形的相似知识归纳与题型突破（单元复习 8类题型清单）（教师版）.md；第25章“平行线分线段成比例”巩固训练第3题图（image284.png）；数值条件改编，非中考真题。',
      },
      {
        id: `${mathSetId}-q4`,
        type: 'single_choice',
        knowledgePointId: `${mathSetId}-kp2`,
        prompt: '如图，每个小方格的边长为1。按A↔D、B↔E、C↔F对应，△ABC与△DEF的面积比 S△ABC:S△DEF=（ ）。',
        options: ['1:2', '2:1', '4:1', '1:4'],
        answerIndex: 1,
        imageUrl: '/images/practice/math-similar-triangles-grid-local.png',
        difficulty: 'EXAM',
        explanation: '按网格数格可得 AB=2、BC=2√2、AC=2√5，DE=√2、EF=2、DF=√10；对应边比均为√2，因此两个三角形相似且相似比为√2。面积比为相似比的平方，S△ABC:S△DEF=(√2)²=2:1。',
        sourceRef: '1010、牧哲学堂教育系统/02-数学/牧哲学堂资料/九年级上册/第二十五章 图形的相似知识归纳与题型突破（单元复习 8类题型清单）（教师版）.md；第25章“题型七 三角形相似的判定与性质”例题图（image390.png）；按图改编，非中考真题。',
      },
    ],
  },
  {
    id: physicsSetId,
    grade: '初三',
    subject: '物理',
    volume: '全一册',
    chapter: '中考图示题专项',
    section: '电路识图、凸透镜、杠杆与电磁学',
    edition: '2024年河北省中考物理题图改编',
    sourceNote: '题图来源均核对自《2024年河北省中考理综物理试题（解析版）.md》所附对应题号；以下题目依据图和相关考点改编，不作为中考真题原题发布。',
    publishable: true,
    reviewedBy: 'Codex 内容校验',
    reviewedAt: '2026-10-16',
    knowledgePoints: [
      {
        id: `${physicsSetId}-kp1`,
        title: '电路结构识别',
        content: '识别电路时先标出节点，再追踪各元件两端是否接在相同两节点；电流表近似导线，电压表近似断路。',
      },
      {
        id: `${physicsSetId}-kp2`,
        title: '凸透镜成像实验',
        content: '物距大于一倍焦距时可在光屏上形成实像；固定物屏间距且已成放大实像时，透镜另一清晰成像位置靠近光屏一侧。',
      },
      {
        id: `${physicsSetId}-kp3`,
        title: '杠杆平衡调节',
        content: '杠杆未挂物体时应通过调节平衡螺母使其水平平衡；螺母向支点靠近会减小该侧力臂。',
      },
      {
        id: `${physicsSetId}-kp4`,
        title: '磁场对通电导体的作用',
        content: '通电导体在磁场中受到力的作用；磁场方向不变时，电流方向改变，导体受力方向随之改变。',
      },
    ],
    questions: [
      {
        id: `${physicsSetId}-q1`,
        type: 'single_choice',
        knowledgePointId: `${physicsSetId}-kp1`,
        prompt: '如图，闭合开关S；已知a接电流表、b接电压表。R₂与R₃的连接方式是（ ）。',
        options: ['并联', '串联', 'R₂被导线短接', '无法判断'],
        answerIndex: 0,
        imageUrl: '/images/practice/physics-hebei2024-meter-circuit.png',
        difficulty: 'EXAM',
        explanation: '先看两端节点：R₂左端和R₃上端接在同一个中间节点；R₂右端经导线与R₃下端接在同一个右侧节点。因此R₂和R₃接在相同的两个节点之间，属于并联。电流表a近似导线，会旁路R₁；电压表b所在支路断开，但不改变R₂、R₃各自连接的两个节点。',
        sourceRef: '《2024年河北省中考理综物理试题（解析版）.md》第15题电路图（image33.png）；据原题图改编成节点识图题，非原题复现。',
      },
      {
        id: `${physicsSetId}-q2`,
        type: 'single_choice',
        knowledgePointId: `${physicsSetId}-kp1`,
        prompt: '如图，若S₁、S₂均闭合，L₁与L₂的连接方式是（ ）。',
        options: ['并联', '串联', '只有L₁接入电路', '无法根据图判断'],
        answerIndex: 0,
        imageUrl: '/images/practice/physics-hebei2024-switch-branches.png',
        difficulty: 'EXAM',
        explanation: 'S₁、S₂均闭合后，L₁和L₂各在一条支路上，且每条支路的两端都分别接到同一对左右节点，因此两灯并联。判断串并联要看各元件两端节点，不要只按图形上下位置判断。',
        sourceRef: '《2024年河北省中考理综物理试题（解析版）.md》第23题拓展电路图（image94.png）；据原题图改编成串并联识图题，非原题复现。',
      },
      {
        id: `${physicsSetId}-q3`,
        type: 'single_choice',
        knowledgePointId: `${physicsSetId}-kp2`,
        prompt: '如图，凸透镜在当前位置时，光屏上得到清晰的放大实像。保持蜡烛和光屏位置不变，向哪一侧移动透镜，能在光屏上再次得到清晰的像？（ ）。',
        options: ['向左', '向右', '透镜不动即可', '不能再次成像'],
        answerIndex: 1,
        imageUrl: '/images/practice/physics-hebei2024-convex-lens.png',
        difficulty: 'EXAM',
        explanation: '物屏间距固定时，凸透镜通常有两个能在屏上成清晰像的位置；两处的物距和像距互换。当前像是放大的，说明物距较小、像距较大；另一位置的透镜要向屏一侧移动，即向右，形成缩小的清晰实像。',
        sourceRef: '《2024年河北省中考理综物理试题（解析版）.md》第18题第（2）问图（image55.png）；保留原问考点并改为单选，非原题复现。',
      },
      {
        id: `${physicsSetId}-q4`,
        type: 'single_choice',
        knowledgePointId: `${physicsSetId}-kp3`,
        prompt: '如图，杠杆右侧略向下倾斜。若左侧平衡螺母已调到最左端，还需调节右侧平衡螺母使杠杆水平，应向哪边移动？（ ）。',
        options: ['向左，靠近支点O', '向右，远离支点O', '向左、向右都可以', '只需升高支架'],
        answerIndex: 0,
        imageUrl: '/images/practice/physics-hebei2024-lever.png',
        difficulty: 'EXAM',
        explanation: '右侧下沉说明右侧转动效果偏大。把右侧平衡螺母向左移、靠近支点O，会减小右侧力臂，从而减小右侧力矩，使杠杆恢复水平平衡。',
        sourceRef: '《2024年河北省中考理综物理试题（解析版）.md》第22题第（1）问图（image63.png）；据原题情境整理为单选，非原题复现。',
      },
      {
        id: `${physicsSetId}-q5`,
        type: 'single_choice',
        knowledgePointId: `${physicsSetId}-kp4`,
        prompt: '如图，闭合开关后导体ab在磁场中受力运动。保持磁场方向不变，仅将电源正负极对调，导体ab的运动方向将（ ）。',
        options: ['反向', '保持不变', '立即停止且不再受力', '只改变运动快慢，方向不变'],
        answerIndex: 0,
        imageUrl: '/images/practice/physics-hebei2024-magnetic-force.png',
        difficulty: 'EXAM',
        explanation: '对调电源正负极会改变导体ab中的电流方向，磁场方向保持不变。根据通电导体在磁场中受力方向与电流方向、磁场方向有关，电流反向而磁场不变时，导体受力方向反向，所以运动方向反向。',
        sourceRef: '《2024年河北省中考理综物理试题（解析版）.md》第13题C项装置图（image18.png）；由“通电导体在磁场中受力”考点改编，非原题复现。',
      },
    ],
  },
]

const focusedSubjectVisualSets202610: PracticeSet[] = [
  {
    id: 'visual-biology-textbook-figure-reading-202610',
    grade: '初一', subject: '生物', volume: '上册', chapter: '第一章 生物的类群', section: '图示判读：共同特征与牙齿结构',
    edition: '牧哲学堂资料（学生版）配图改编',
    sourceNote: '依据本地《第一章 生物的类群（知识清单）（学生版）》第26题与兔、狼牙齿示意图改编，保留原图证据并改写题干；非中考真题。',
    publishable: true, reviewedBy: 'Codex 内容校验', reviewedAt: '2026-10-17',
    knowledgePoints: [
      { id: 'visual-biology-textbook-figure-reading-202610-kp1', title: '生物共同特征识图', content: '比较不同类群时，先从图示关系定位共同部分，再用生殖、体温、呼吸等特征排除选项。' },
      { id: 'visual-biology-textbook-figure-reading-202610-kp2', title: '哺乳动物牙齿与食性', content: '食肉动物犬齿发达，适于撕裂食物；草食动物门齿和臼齿适于取食、研磨植物。' },
    ],
    questions: [
      {
        id: 'visual-biology-textbook-figure-reading-202610-q1', type: 'single_choice', knowledgePointId: 'visual-biology-textbook-figure-reading-202610-kp1',
        prompt: '图中阴影区表示盾蝽与杜鹃鸟共同具有的特征。下列哪一项可填入阴影区？',
        options: ['体温不恒定', '飞行器官是翼', '气囊辅助呼吸', '生殖方式为卵生'], answerIndex: 3,
        imageUrl: '/images/practice/real/biology-textbook-shared-traits-venn.png', difficulty: 'MEDIUM',
        explanation: '盾蝽和杜鹃鸟都通过产卵繁殖。体温不恒定不适用于鸟类，翼和气囊是鸟类特征，因此只有“卵生”属于二者共同特征。',
        sourceRef: '1010、牧哲学堂教育系统/04-生物/牧哲学堂资料/七年级上册/第一章 生物的类群（知识清单）（学生版）.md，第26题（2024九年级·福建专题练习）配图 image6.png；据题图改编，非中考真题。',
      },
      {
        id: 'visual-biology-textbook-figure-reading-202610-q2', type: 'single_choice', knowledgePointId: 'visual-biology-textbook-figure-reading-202610-kp2',
        prompt: '图示为兔和狼的牙齿。若北极熊主要以动物为食，按食性判断，其牙齿组成最接近（ ）。',
        options: ['兔', '狼', '二者完全相同', '仅凭食性无法判断'], answerIndex: 1,
        imageUrl: '/images/practice/real/biology-textbook-mammal-teeth.png', difficulty: 'MEDIUM',
        explanation: '狼的犬齿发达，适于撕裂肉类；兔主要取食植物，门齿和臼齿适于切断、研磨植物。北极熊以动物为食，牙齿结构与狼更接近。',
        sourceRef: '1010、牧哲学堂教育系统/04-生物/牧哲学堂资料/七年级上册/第一章 生物的类群（知识清单）（学生版）.md，“兔和狼的牙齿组成示意图”image10.png及北极熊食性填空；改编，非中考真题。',
      },
    ],
  },
  {
    id: 'visual-history-hebei-2024-image-reading-202610',
    grade: '初三', subject: '历史', volume: '全一册', chapter: '现代世界史与新中国建设', section: '河北中考真题图像史料判读',
    edition: '2024年河北省中考历史真题改编',
    sourceNote: '取自2024年河北省中考历史原卷第5、9题配图，答案按解析版核对；题干作轻微改写。',
    publishable: true, reviewedBy: 'Codex 内容校验', reviewedAt: '2026-10-17',
    knowledgePoints: [
      { id: 'visual-history-hebei-2024-image-reading-202610-kp1', title: '人物贡献与新中国建设', content: '结合人物图像与其代表性贡献，判断农业科技、国防科技和经济改革等历史作用。' },
      { id: 'visual-history-hebei-2024-image-reading-202610-kp2', title: '斯大林格勒战役', content: '斯大林格勒战役是第二次世界大战的重要转折点。' },
    ],
    questions: [
      {
        id: 'visual-history-hebei-2024-image-reading-202610-q1', type: 'single_choice', knowledgePointId: 'visual-history-hebei-2024-image-reading-202610-kp1',
        prompt: '观察图中两位劳动模范，结合其代表性贡献判断：他们的杰出贡献都直接有利于我国（ ）。',
        options: ['解决粮食问题', '提升科技水平', '更新军事装备', '改革经济体制'], answerIndex: 1,
        imageUrl: '/images/practice/real/history-hebei-2024-q5-figures.png', difficulty: 'EXAM',
        explanation: '图中人物分别代表杂交水稻研究与科学技术领域的突出贡献。结合人物及其贡献，应选“提升科技水平”。河北省中考解析版答案为B。',
        sourceRef: '2024年河北省中考历史真题（原卷版）第5题配图 image3.png；答案据解析版第5题（B）核对。',
      },
      {
        id: 'visual-history-hebei-2024-image-reading-202610-q2', type: 'single_choice', knowledgePointId: 'visual-history-hebei-2024-image-reading-202610-kp2',
        prompt: '图示为1942年苏军在斯大林格勒地区的反攻。该军事行动（ ）。',
        options: ['使第二次世界大战达到最大规模', '加速了世界反法西斯同盟的建立', '是第二次世界大战的转折点', '标志着欧洲第二战场的开辟'], answerIndex: 2,
        imageUrl: '/images/practice/real/history-hebei-2024-q9-stalingrad-map.png', difficulty: 'EXAM',
        explanation: '根据图中斯大林格勒位置和苏军反攻方向可判断为斯大林格勒战役。该战役扭转了苏德战场局势，是第二次世界大战的重要转折点。河北省中考解析版答案为C。',
        sourceRef: '2024年河北省中考历史真题（原卷版）第9题斯大林格勒战役示意图 image4.png；答案据解析版第9题（C）核对。',
      },
    ],
  },
  {
    id: 'visual-geography-textbook-map-chart-reading-202610',
    grade: '初二', subject: '地理', volume: '上册', chapter: '中国的人口与土地资源', section: '人口分布图与土地利用统计图',
    edition: '人教版八年级上册教材图表改编',
    sourceNote: '分别依据人教版八年级上册图1.13《中国人口的分布》和图3.9《中国土地利用类型的构成》改编；非中考真题。',
    publishable: true, reviewedBy: 'Codex 内容校验', reviewedAt: '2026-10-17',
    knowledgePoints: [
      { id: 'visual-geography-textbook-map-chart-reading-202610-kp1', title: '人口密度图判读', content: '结合人口密度图例和城市位置，比较不同地区人口分布疏密。' },
      { id: 'visual-geography-textbook-map-chart-reading-202610-kp2', title: '土地利用构成图计算', content: '从统计图读取各土地利用类型的比例，并根据题意合并计算。' },
    ],
    questions: [
      {
        id: 'visual-geography-textbook-map-chart-reading-202610-q1', type: 'single_choice', knowledgePointId: 'visual-geography-textbook-map-chart-reading-202610-kp1',
        prompt: '读图1.13，图中哪一组城市都位于人口密度较高的区域？（ ）',
        options: ['乌鲁木齐、拉萨', '北京、上海', '拉萨、兰州', '昆明、乌鲁木齐'], answerIndex: 1,
        imageUrl: '/images/practice/geo-8a1-2-fig1-13.png', difficulty: 'MEDIUM',
        explanation: '图例显示北京、上海所在区域人口密度较高；拉萨和乌鲁木齐所在区域颜色较浅，人口密度较低。',
        sourceRef: '人教版八年级上册地理第一章第二节图1.13《中国人口的分布》（教材第13页，PDF第18页）；据人口密度分布图改编，非中考真题。',
      },
      {
        id: 'visual-geography-textbook-map-chart-reading-202610-q2', type: 'single_choice', knowledgePointId: 'visual-geography-textbook-map-chart-reading-202610-kp2',
        prompt: '读图3.9，林地和草地占土地利用类型的比例合计约为（ ）。',
        options: ['46.36%', '56.34%', '66.34%', '79.02%'], answerIndex: 2,
        imageUrl: '/images/practice/geo-8a3-1-fig3-9.png', difficulty: 'MEDIUM',
        explanation: '图中林地为31.86%，草地为34.48%。合计31.86%＋34.48%=66.34%。',
        sourceRef: '人教版八年级上册地理第三章第二节图3.9《中国土地利用类型的构成》（教材第68页，PDF第73页）；按图表数据改编，非中考真题。',
      },
    ],
  },
]

type LocatedGroup = {
  id: string
  grade: string
  volume: string
  chapter: string
  section: string
  knowledgePointIndexes: number[]
  questionIndexes: number[]
}

function locateQuestionGroups(sourceSetId: string, groups: LocatedGroup[]): PracticeSet[] {
  const source = visualQuestionExpansionDraft202610.find((set) => set.id === sourceSetId)
  if (!source) return []

  return groups.map((group) => {
    const { knowledgePointIndexes, questionIndexes, ...location } = group
    const points = knowledgePointIndexes.flatMap((index) => {
      const point = source.knowledgePoints[index]
      return point ? [point] : []
    })
    const knowledgePoints = points.map((point, index) => ({ ...point, id: `${group.id}-kp${index + 1}` }))
    const knowledgePointIds = new Map(points.map((point, index) => [point.id, knowledgePoints[index].id]))
    const questions = questionIndexes.flatMap((index) => {
      const question = source.questions[index]
      return question ? [{
        ...question,
        knowledgePointId: knowledgePointIds.get(question.knowledgePointId) ?? knowledgePoints[0]?.id ?? question.knowledgePointId,
      }] : []
    })

    return {
      ...source,
      ...location,
      knowledgePoints,
      questions,
    }
  })
}

export const visualQuestionExpansionSets202610: PracticeSet[] = [
  ...focusedSubjectVisualSets202610,
  ...locateQuestionGroups(mathSetId, [
    {
      id: `${mathSetId}-ratio`, grade: '初三', volume: '上册', chapter: '第二十五章 图形的相似',
      section: '25.2 平行线分线段成比例', knowledgePointIndexes: [0], questionIndexes: [0, 1],
    },
    {
      id: `${mathSetId}-judgment`, grade: '初三', volume: '上册', chapter: '第二十五章 图形的相似',
      section: '25.5 相似三角形的判定', knowledgePointIndexes: [1], questionIndexes: [3],
    },
    {
      id: `${mathSetId}-properties`, grade: '初三', volume: '上册', chapter: '第二十五章 图形的相似',
      section: '25.6 相似三角形的性质', knowledgePointIndexes: [1], questionIndexes: [2],
    },
  ]),
  ...locateQuestionGroups(physicsSetId, [
    {
      id: `${physicsSetId}-circuit`, grade: '初三', volume: '全一册', chapter: '第十五章　电流和电路',
      section: '第3节　串联电路和并联电路', knowledgePointIndexes: [0], questionIndexes: [0, 1],
    },
    {
      id: `${physicsSetId}-lens`, grade: '初二', volume: '上册', chapter: '第五章 透镜及其应用',
      section: '第3节 凸透镜成像的规律', knowledgePointIndexes: [1], questionIndexes: [2],
    },
    {
      id: `${physicsSetId}-lever`, grade: '初二', volume: '下册', chapter: '第十二章 简单机械',
      section: '第1节 杠杆', knowledgePointIndexes: [2], questionIndexes: [3],
    },
    {
      id: `${physicsSetId}-magnetic-force`, grade: '初三', volume: '全一册', chapter: '第二十章　电与磁',
      section: '第4节　电动机', knowledgePointIndexes: [3], questionIndexes: [4],
    },
  ]),
]
