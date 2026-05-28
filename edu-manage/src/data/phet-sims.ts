export type SimulationProvider = 'phet' | 'desmos' | 'geogebra' | 'external'

export interface PhETSim {
  id: string
  name: string
  description: string
  grade: string[]
  subject: string
  simId?: string
  hasChinese?: boolean
  tags: string[]
  category?: string
  provider?: SimulationProvider
  sourceUrl?: string
  embedUrl?: string
  externalOnly?: boolean
  language?: string
  icon?: string
  featured?: boolean
}

export function getSimUrl(simId: string, hasChinese: boolean): string {
  const lang = hasChinese ? 'zh_CN' : 'en'
  return `https://phet.colorado.edu/sims/html/${simId}/latest/${simId}_${lang}.html`
}

export function getResourceUrl(sim: PhETSim): string {
  if (sim.embedUrl) return sim.embedUrl
  if (sim.sourceUrl) return sim.sourceUrl
  return getSimUrl(sim.simId || '', sim.hasChinese ?? true)
}

export function getSourceUrl(sim: PhETSim): string {
  if (sim.sourceUrl) return sim.sourceUrl
  return getSimUrl(sim.simId || '', sim.hasChinese ?? true)
}

export function getProviderLabel(provider: SimulationProvider = 'phet') {
  if (provider === 'desmos') return 'Desmos'
  if (provider === 'geogebra') return 'GeoGebra'
  if (provider === 'external') return '外部资源'
  return 'PhET'
}

export const SUBJECT_SIM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '物理': { bg: 'rgba(24,144,255,.08)', text: '#1890ff', border: 'rgba(24,144,255,.2)' },
  '化学': { bg: 'rgba(114,46,209,.08)', text: '#722ed1', border: 'rgba(114,46,209,.2)' },
  '生物': { bg: 'rgba(19,194,194,.08)', text: '#13c2c2', border: 'rgba(19,194,194,.2)' },
  '数学': { bg: 'rgba(232,117,69,.08)', text: '#E87545', border: 'rgba(232,117,69,.2)' },
  '数学工具': { bg: 'rgba(94,106,210,.08)', text: '#5e6ad2', border: 'rgba(94,106,210,.2)' },
  '地理': { bg: 'rgba(82,196,26,.08)', text: '#52c41a', border: 'rgba(82,196,26,.2)' },
}

export const PHET_SIMS: PhETSim[] = [
  { id: 'p01', name: '力和运动基础', description: '推拉物体，探究力与运动的关系，理解牛顿第一、第二定律', grade: ['初二', '初三'], subject: '物理', simId: 'forces-and-motion-basics', hasChinese: true, tags: ['力', '运动', '牛顿定律'] },
  { id: 'p02', name: '密度', description: '通过测量质量和体积，探究不同物质的密度特性', grade: ['初一', '初二'], subject: '物理', simId: 'density', hasChinese: true, tags: ['密度', '质量', '体积'] },
  { id: 'p03', name: '浮力', description: '探究物体在液体中的浮力大小与哪些因素有关', grade: ['初二'], subject: '物理', simId: 'buoyancy', hasChinese: true, tags: ['浮力', '阿基米德', '液体'] },
  { id: 'p04', name: '压强', description: '探究液体压强、大气压强，理解帕斯卡定律', grade: ['初二'], subject: '物理', simId: 'under-pressure', hasChinese: true, tags: ['压强', '液体', '大气压'] },
  { id: 'p05', name: '绳波', description: '在绳子上产生波，探究波的振幅、频率和波长关系', grade: ['初二', '初三'], subject: '物理', simId: 'wave-on-a-string', hasChinese: true, tags: ['波', '振动', '频率', '波长'] },
  { id: 'p06', name: '声音', description: '探究声音的产生、传播和影响因素，感受频率与音调关系', grade: ['初二'], subject: '物理', simId: 'sound', hasChinese: true, tags: ['声音', '频率', '音调', '响度'] },
  { id: 'p07', name: '光的折射', description: '探究光在不同介质中的折射现象，理解折射定律', grade: ['初二', '初三'], subject: '物理', simId: 'bending-light', hasChinese: true, tags: ['光', '折射', '反射', '透镜'] },
  { id: 'p08', name: '电路构建工具包（直流）', description: '用虚拟器件搭建电路，探究串联并联、欧姆定律', grade: ['初三'], subject: '物理', simId: 'circuit-construction-kit-dc', hasChinese: true, tags: ['电路', '电阻', '电流', '欧姆定律'] },
  { id: 'p09', name: '法拉第电磁感应', description: '探究磁场变化产生感应电流的现象，理解电磁感应原理', grade: ['初三'], subject: '物理', simId: 'faradays-law', hasChinese: true, tags: ['电磁感应', '磁场', '电流'] },
  { id: 'p10', name: '能量滑板公园：基础版', description: '探究动能与势能的相互转化，理解机械能守恒', grade: ['初三'], subject: '物理', simId: 'energy-skate-park-basics', hasChinese: true, tags: ['能量', '动能', '势能', '守恒'] },
  { id: 'c01', name: '物质的状态：基础版', description: '观察固液气三态的微观结构，理解物质状态变化', grade: ['初三'], subject: '化学', simId: 'states-of-matter-basics', hasChinese: true, tags: ['物质状态', '固态', '液态', '气态'] },
  { id: 'c02', name: '构建原子', description: '通过添加质子、中子、电子构建原子，了解元素和离子', grade: ['初三'], subject: '化学', simId: 'build-an-atom', hasChinese: true, tags: ['原子', '质子', '中子', '电子'] },
  { id: 'c03', name: '酸碱溶液', description: '探究酸碱溶液的pH值，理解强酸弱酸和强碱弱碱', grade: ['初三'], subject: '化学', simId: 'acid-base-solutions', hasChinese: true, tags: ['酸碱', 'pH', '溶液'] },
  { id: 'c04', name: '反应物、产物和剩余物', description: '探究化学反应中的量的关系，理解化学计量', grade: ['初三'], subject: '化学', simId: 'reactants-products-and-leftovers', hasChinese: true, tags: ['化学反应', '计量', '方程式'] },
  { id: 'c05', name: '摩尔浓度', description: '探究溶液浓度与溶质、溶剂量的关系', grade: ['初三'], subject: '化学', simId: 'molarity', hasChinese: true, tags: ['浓度', '溶液', '摩尔'] },
  { id: 'b01', name: '自然选择', description: '模拟生物进化中的自然选择过程，理解适者生存', grade: ['初一', '初二', '初三'], subject: '生物', simId: 'natural-selection', hasChinese: true, tags: ['进化', '自然选择', '遗传'] },
  { id: 'b02', name: '基因表达要素', description: '探究DNA、RNA和蛋白质合成过程，理解基因表达', grade: ['初三'], subject: '生物', simId: 'gene-expression-essentials', hasChinese: false, tags: ['DNA', 'RNA', '蛋白质', '基因'] },
  { id: 'b03', name: '膜通道', description: '探究细胞膜的渗透和扩散过程', grade: ['初一', '初二'], subject: '生物', simId: 'membrane-channels', hasChinese: false, tags: ['细胞膜', '渗透', '扩散'] },
  { id: 'm01', name: '面积建造', description: '通过搭建形状探索面积与周长的关系', grade: ['初一'], subject: '数学', simId: 'area-builder', hasChinese: true, tags: ['面积', '周长', '几何'] },
  { id: 'm02', name: '分数学习', description: '直观理解分数的意义，练习分数比较和运算', grade: ['初一'], subject: '数学', simId: 'fractions-intro', hasChinese: true, tags: ['分数', '运算', '比较'] },
  { id: 'm03', name: '等式探索器', description: '通过天平模型理解等式和方程的概念', grade: ['初一', '初二'], subject: '数学', simId: 'equality-explorer', hasChinese: true, tags: ['方程', '等式', '代数'] },
  { id: 'm04', name: '图像直线', description: '探究直线方程 y=mx+b 中参数对图像的影响', grade: ['初二', '初三'], subject: '数学', simId: 'graphing-lines', hasChinese: true, tags: ['一次函数', '直线', '斜率'] },
  { id: 'm05', name: '函数绘图器', description: '探究各种函数的图像特征，支持多种函数类型', grade: ['初三'], subject: '数学', simId: 'graphing-quadratics', hasChinese: true, tags: ['二次函数', '抛物线', '函数'] },
  { id: 'm06', name: '比例推理', description: '探究比例关系，理解正比例和反比例', grade: ['初一', '初二'], subject: '数学', simId: 'proportion-playground', hasChinese: true, tags: ['比例', '正比', '反比'] },
  { id: 'g01', name: '温室效应', description: '探究温室气体对地球气温的影响，理解全球变暖机制', grade: ['初一', '初二', '初三'], subject: '地理', simId: 'greenhouse-effect', hasChinese: true, tags: ['温室效应', '气候变化', '大气'] },
  { id: 'g02', name: '我的太阳系', description: '模拟太阳系行星运动，探究引力与轨道的关系', grade: ['初一'], subject: '地理', simId: 'my-solar-system', hasChinese: true, tags: ['太阳系', '行星', '引力', '轨道'] },
  { id: 'g03', name: '地球对月球', description: '探究月球绕地球运行的轨道和引力特征', grade: ['初一'], subject: '地理', simId: 'gravity-and-orbits', hasChinese: true, tags: ['月球', '轨道', '引力'] },
  {
    id: 'desmos-graphing-calculator',
    name: 'Desmos 图形计算器',
    subject: '数学',
    category: '数学工具',
    grade: ['初一', '初二', '初三'],
    description: '用于函数图像、方程、不等式、数形结合探索，适合初中函数与图像教学。',
    tags: ['函数', '图像', '方程', '数形结合'],
    provider: 'desmos',
    sourceUrl: 'https://www.desmos.com/calculator?lang=zh-CN',
    embedUrl: 'https://www.desmos.com/calculator?lang=zh-CN',
    language: 'zh_CN',
    icon: '',
    featured: true,
  },
  {
    id: 'geogebra-geometry',
    name: 'GeoGebra 几何工具',
    subject: '数学',
    category: '数学工具',
    grade: ['初一', '初二', '初三'],
    description: '用于几何作图、动态几何、图形变换和几何性质探索，适合三角形、圆、函数图像等内容。',
    tags: ['几何', '作图', '图形变换', '动态几何'],
    provider: 'geogebra',
    sourceUrl: 'https://www.geogebra.org/geometry?lang=zh_CN',
    embedUrl: 'https://www.geogebra.org/geometry?lang=zh_CN',
    language: 'zh_CN',
    icon: '',
    featured: true,
  },
  {
    id: 'geogebra-calculator-suite',
    name: 'GeoGebra 计算器套件',
    subject: '数学',
    category: '数学工具',
    grade: ['初一', '初二', '初三'],
    description: '集合图形、几何、CAS、3D、统计等工具，适合数学综合探究。',
    tags: ['函数', '几何', '统计', '代数'],
    provider: 'geogebra',
    sourceUrl: 'https://www.geogebra.org/calculator?lang=zh_CN',
    embedUrl: 'https://www.geogebra.org/calculator?lang=zh_CN',
    language: 'zh_CN',
    icon: '',
    featured: true,
  },
]

export function getSimsBySubject(subject: string): PhETSim[] {
  return PHET_SIMS.filter((sim) => sim.subject === subject)
}

export function getSimsByGrade(grade: string): PhETSim[] {
  return PHET_SIMS.filter((sim) => sim.grade.includes(grade))
}

export const SIM_SUBJECTS = ['物理', '化学', '生物', '数学', '地理'] as const
export const SIM_GRADES = ['初一', '初二', '初三'] as const
export const SIM_PROVIDERS = ['phet', 'desmos', 'geogebra'] as const
