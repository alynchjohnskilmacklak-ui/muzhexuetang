export type ServiceCatalogItem = {
  slug: string
  index: string
  title: string
  shortTitle: string
  category: '课程辅导' | '升学规划' | '长期成长'
  audience: string
  summary: string
  highlights: string[]
  imageCount?: number
  imageWidth?: number
  imageHeight?: number
  imageAssetSlug?: string
  imageFiles?: number[]
  markdownFile?: string
  markdownStartHeading?: string
  markdownEndHeading?: string
  detailMarkdown?: string
  featured?: boolean
}

// Bump this value whenever bundled service posters are replaced so clients do
// not reuse year-long immutable-cache entries for an older image revision.
export const SERVICE_ASSET_VERSION = '20260821-3'
export const SERVICE_ASSET_BASE = '/business-assets/services'

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    slug: 'seasonal-bootcamp', index: '01', title: '初中、高中寒暑假冲刺预备课', shortTitle: '寒暑假冲刺预备课',
    category: '课程辅导', audience: '初一至高三', featured: true, imageCount: 5, imageWidth: 1491, imageHeight: 1055, markdownFile: 'seasonal-bootcamp.md',
    summary: '利用寒暑假的完整学习周期，集中复习、查漏补缺、专项训练，并为新学期提前做好衔接。',
    highlights: ['集中学习与系统复习', '小班教学与多师陪学', '家长端实时查看学习过程'],
  },
  {
    slug: 'one-to-one', index: '02', title: '各年级一对一冲刺、巩固辅导', shortTitle: '一对一冲刺辅导',
    category: '课程辅导', audience: '小学至高中', featured: true, imageCount: 5, imageWidth: 1448, imageHeight: 1086, markdownFile: 'one-to-one.md',
    summary: '从学情诊断出发，把时间集中在真正需要提升的知识点上，支持一对一、一对二和一对三灵活约课。',
    highlights: ['先诊断再制定方案', '每节课结构化反馈', '成绩与知识点持续留痕'],
  },
  {
    slug: 'evening-study', index: '03', title: '晚间课业辅导营', shortTitle: '晚间课业辅导营',
    category: '长期成长', audience: '需要晚间作业辅导的学生', featured: true, imageCount: 4, imageWidth: 1122, imageHeight: 1402, markdownFile: 'evening-study.md',
    summary: '不只是看着写作业，而是先梳理、随时答疑、完成后检查，并把作业前后照片与老师说明同步给家长。',
    highlights: ['当天问题当天解决', '作业前后对比可查', '线下与线上师资共同兜底'],
  },
  {
    slug: 'weekend-pioneer', index: '04', title: '周末先锋营', shortTitle: '周末先锋营',
    category: '长期成长', audience: '希望周周清、提前学的学生', featured: true, imageCount: 4, imageWidth: 1122, imageHeight: 1402, markdownFile: 'weekend-pioneer.md',
    summary: '用周末半天解决本周疑难点、巩固薄弱知识，并提前预备下周新课，让孩子一周一清。',
    highlights: ['本周问题集中清理', '夯实基础不欠账', '提前预习建立信心'],
  },
  {
    slug: 'zhongkao-planning', index: '05', title: '中考升学规划', shortTitle: '中考升学规划',
    category: '升学规划', audience: '初中学生与家长', imageCount: 4, imageWidth: 1122, imageHeight: 1402,
    markdownFile: 'zhongkao-planning.md',
    summary: '结合成绩、位次、学校信息和家庭目标，帮助家长看懂升学路径并提前准备关键选择。',
    highlights: ['学情与目标定位', '本地学校信息梳理', '志愿模拟与方案复核'],
    detailMarkdown: `## 服务内容

- 梳理学生当前成绩、位次、优势学科与薄弱环节，明确阶段目标；
- 解读本地中考政策、招生批次和学校培养特点，减少信息差；
- 结合一分一档、招生计划和往年情况进行志愿模拟；
- 形成保底、稳妥、冲刺三个层次的升学方案，并在关键节点复核。

## 我们更关注什么

升学规划不只是填一张表。我们更关注孩子适合什么样的学校、未来三年如何衔接，以及家庭能够接受的通勤、住宿和培养方向。`,
  },
  {
    slug: 'gaokao-consulting', index: '06', title: '高考志愿咨询', shortTitle: '高考志愿咨询',
    category: '升学规划', audience: '高中学生与家长', imageCount: 5, imageWidth: 1122, imageHeight: 1402,
    markdownFile: 'gaokao-consulting.md',
    summary: '围绕成绩位次、选科组合、院校层次和专业方向，协助家庭形成有梯度、可复核的志愿方案。',
    highlights: ['院校与专业双向筛选', '冲稳保梯度设计', '填报前逐项复核'],
    detailMarkdown: `## 咨询流程

1. 了解学生成绩位次、选科组合、兴趣方向和家庭诉求；
2. 筛选适配的院校层次、城市范围与专业方向；
3. 对招生章程、专业限制和培养方式进行重点核对；
4. 形成冲刺、稳妥、保底相结合的志愿草案；
5. 正式填报前再次检查顺序、代码和关键限制。

## 服务原则

尊重学生意愿，不以所谓热门专业替代个人选择；重要招生信息以当年官方发布内容为准。`,
  },
  {
    slug: 'single-enrollment', index: '07', title: '单招文化课辅导', shortTitle: '单招文化课辅导',
    category: '升学规划', audience: '准备高职单招的学生', imageCount: 5, imageWidth: 1122, imageHeight: 1402,
    markdownFile: 'single-enrollment.md',
    summary: '围绕单招文化课要求进行基础诊断、重点复习和阶段测试，把有限时间集中在高频考点上。',
    highlights: ['入学基础诊断', '文化课重点复习', '阶段测试及时调整'],
    detailMarkdown: `## 课程方向

- 根据目标院校与考试要求梳理文化课范围；
- 从基础题和高频考点开始，补齐知识断点；
- 按阶段安排练习、讲评和模拟，及时调整复习节奏；
- 家长端同步查看考勤、课堂反馈和阶段表现。

## 适合的学生

适合已经明确单招方向，希望系统补齐文化课基础、提高答题稳定性并建立复习节奏的学生。`,
  },
  {
    slug: 'postgraduate-public-courses', index: '08', title: '考研公共课辅导（数学、英语）', shortTitle: '考研公共课辅导',
    category: '课程辅导', audience: '准备研究生考试的在校生与毕业生', imageCount: 6, imageWidth: 1122, imageHeight: 1402,
    markdownFile: 'postgraduate-and-alumni.md', markdownStartHeading: '# 第一部分 考研公共课辅导（数学、英语）', markdownEndHeading: '# 第二部分 211、985 直系学长学姐资源对接',
    summary: '提供考研数学、英语的阶段规划、知识梳理和针对性答疑，帮助建立长期、可执行的复习节奏。',
    highlights: ['数学与英语重点梳理', '阶段计划与进度复盘', '薄弱环节针对性答疑'],
    detailMarkdown: `## 辅导内容

- 根据考试时间、当前基础和目标分数制定阶段计划；
- 数学侧重概念体系、典型题型、计算能力和错题复盘；
- 英语侧重词汇、长难句、阅读方法、写作积累与真题训练；
- 定期核对完成情况，避免计划过满或复习节奏失控。

## 服务方式

可根据基础选择阶段课程或个性化辅导，具体科目、频次和课时由咨询后确定。`,
  },
  {
    slug: 'alumni-network', index: '09', title: '211、985直系学长学姐资源对接', shortTitle: '高校学长学姐资源',
    category: '长期成长', audience: '需要院校与专业经验参考的学生', imageCount: 1, imageWidth: 1122, imageHeight: 1402,
    imageAssetSlug: 'postgraduate-public-courses', imageFiles: [5],
    markdownFile: 'postgraduate-and-alumni.md', markdownStartHeading: '# 第二部分 211、985 直系学长学姐资源对接',
    summary: '在双方知情同意的前提下，对接相关院校直系学长学姐，了解真实的学习、专业和校园体验。',
    highlights: ['院校与专业经验交流', '真实学习路径参考', '尊重隐私、经同意后对接'],
    detailMarkdown: `## 可以了解什么

- 院校真实学习节奏、课程难度与校园生活；
- 相关专业的培养内容、学习方法和发展方向；
- 从高中到大学的衔接经验，以及常见误区；
- 备考、复试或入学准备中的个人经验。

## 隐私与边界

学长学姐联系方式属于个人信息，不会在业务页面直接公开。需要对接时，由牧哲学堂确认需求并征得双方同意后建立联系。经验分享仅供参考，招生政策和录取结果以官方信息为准。`,
  },
]

export function getServiceBySlug(slug: string) {
  return serviceCatalog.find((item) => item.slug === slug)
}
