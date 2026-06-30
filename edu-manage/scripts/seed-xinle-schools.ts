// scripts/seed-xinle-schools.ts
// 新乐中考可报名学校数据 — 由牧哲学堂《石家庄县区中考信息提取表》整理，共 109 所
// 学校名严格使用原始名称，不做归一化合并（如"二南"与"二中实验"是不同学校）。
// 可报名 55 所 / 不可报名 54 所。
// 分数线等字段不在此脚本写入：可报名学校的分数线由现有 seed-schools.ts 或后续单独补充；
// 不可报名学校仅标记 xinleAccessible=false，不需要分数线。
//
// 运行：npx tsx scripts/seed-xinle-schools.ts
// 注意：此脚本 upsert（按 schoolId），不会删除其它已有学校；只新增/更新这 109 所。

import { PrismaClient } from '@prisma/client'

// 志愿学校数据在【初中库 muzhe_chuzhong】。
// 显式连接初中库，不依赖 DATABASE_URL 默认连接，避免写错库。
const juniorUrl = process.env.DATABASE_URL_JUNIOR
if (!juniorUrl) throw new Error('DATABASE_URL_JUNIOR 未配置，无法连接初中库')
const prisma = new PrismaClient({ datasources: { db: { url: juniorUrl } } })

type XinleSchool = {
  schoolId: string
  name: string
  batch: string        // 批次：第一批 省级示范性高中 / 第二批 非省级示范性高中
  category: string     // 类别：驻县四校【分配生】/ 民办省级示范高中【分配生】/ 17县区公办普通高中 等
  xinleAccessible: boolean  // 新乐考生是否可报名
}

// 由 type 字段推导大类：用于家长端"公办/民办"筛选
function deriveType(category: string): string {
  if (category.includes('民办')) return '民办'
  if (category.includes('省级示范') || category.includes('驻县')) return '省示范'
  return '公办普高'
}

export const XINLE_SCHOOLS: XinleSchool[] = [
  { schoolId: 'hs001', name: '正定中学', batch: '第一批 省级示范性高中', category: '驻县四校【分配生】', xinleAccessible: true },
  { schoolId: 'hs002', name: '石家庄实验中学', batch: '第一批 省级示范性高中', category: '驻县四校【分配生】', xinleAccessible: true },
  { schoolId: 'hs003', name: '石家庄第二实验中学', batch: '第一批 省级示范性高中', category: '驻县四校【分配生】', xinleAccessible: true },
  { schoolId: 'hs004', name: '辛集中学', batch: '第一批 省级示范性高中', category: '驻县四校【分配生】', xinleAccessible: true },
  { schoolId: 'hs005', name: '二南', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs006', name: '精英中学', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs007', name: '润德学校', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs008', name: '正中实验', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs009', name: '一中实验', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs010', name: '敬业中学', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs011', name: '行唐启明', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs012', name: '精英新华', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs013', name: '卓越西校区', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs014', name: '卓越东校区', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs015', name: '金石中学', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs016', name: '联邦外国语', batch: '第一批 省级示范性高中', category: '民办省级示范高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs017', name: '新乐一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: true },
  { schoolId: 'hs018', name: '新乐二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: true },
  { schoolId: 'hs019', name: '新乐三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: true },
  { schoolId: 'hs020', name: '新乐四中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: true },
  { schoolId: 'hs021', name: '新世纪外国语', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs022', name: '西山学校', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs023', name: '私立一中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs024', name: '云德学校', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs025', name: '翰林学校', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs026', name: '精英未来', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs027', name: '玉成中学', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs028', name: '华西', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs029', name: '华英', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs030', name: '耀华', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs031', name: '云臻实验', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs032', name: '无极文苑', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs033', name: '正定弘文', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs034', name: '同文中学', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs035', name: '高新精英', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs036', name: '金石实验', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs037', name: '习德高中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs038', name: '云臻高中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs039', name: '正泽高中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs040', name: '新伏羲', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs041', name: '新星学校', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs042', name: '创新天卉', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs043', name: '北华中学', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs044', name: '高新区国杰', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs045', name: '外国语附中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs046', name: '麒麟高中', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs047', name: '赞皇润文', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs048', name: '石家庄翼明', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs049', name: '藁城府兴', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs050', name: '行唐同济', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs051', name: '行唐龙州', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs052', name: '行唐曙光', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs053', name: '高邑龙凤', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs054', name: '康福外国语', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs055', name: '浩文中学', batch: '第二批 非省级示范性高中', category: '民办非省级示范性高中', xinleAccessible: true },
  { schoolId: 'hs056', name: '藁城一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs057', name: '藁城九中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs058', name: '赵县中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs059', name: '赵县实验', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs060', name: '正定一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs061', name: '栾城中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs062', name: '鹿泉一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs063', name: '无极中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs064', name: '无极二中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs065', name: '平山中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs066', name: '元氏一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs067', name: '行唐一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs068', name: '灵寿中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs069', name: '晋州一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs070', name: '晋州二中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs071', name: '井陉一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs072', name: '赞皇中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs073', name: '深泽中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs074', name: '高邑一中', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs075', name: '矿区中学', batch: '第一批 省级示范性高中', category: '17县区公办省级示范性高中【分配生】', xinleAccessible: false },
  { schoolId: 'hs076', name: '一中', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs077', name: '一中滨河', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs078', name: '二中', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs079', name: '二中铭德', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs080', name: '五中', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs081', name: '15中', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs082', name: '24中', batch: '第一批 省级示范性高中', category: '新三区【藁城 鹿泉 栾城】', xinleAccessible: false },
  { schoolId: 'hs083', name: '鹿泉二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs084', name: '鹿泉三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs085', name: '正定三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs086', name: '正定五中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs087', name: '正定七中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs088', name: '藁城二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs089', name: '藁城三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs090', name: '藁城十中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs091', name: '平山实验', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs092', name: '平山外国语', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs093', name: '平山回舍', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs094', name: '晋州十中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs095', name: '元氏四中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs096', name: '元氏三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs097', name: '元氏十中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs098', name: '元氏音体美', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs099', name: '行唐三中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs100', name: '行唐六中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs101', name: '井陉二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs102', name: '栾城二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs103', name: '灵寿陈庄', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs104', name: '赵县六中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs105', name: '赵县庆阳', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs106', name: '赵县石塔', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs107', name: '矿区二中', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs108', name: '鹿泉实验', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
  { schoolId: 'hs109', name: '灵寿松阳', batch: '第二批 非省级示范性高中', category: '17县区公办普通高中', xinleAccessible: false },
]

async function main() {
  let created = 0, updated = 0
  for (const s of XINLE_SCHOOLS) {
    const existing = await prisma.highSchoolInfo.findUnique({ where: { schoolId: s.schoolId } })
    await prisma.highSchoolInfo.upsert({
      where: { schoolId: s.schoolId },
      // 重要：只写入本次相关字段，不覆盖已有的分数线等数据（update 仅更新这几项）
      update: {
        name: s.name,
        batch: s.batch,
        category: s.category,
        xinleAccessible: s.xinleAccessible,
        type: deriveType(s.category),
      },
      create: {
        schoolId: s.schoolId,
        name: s.name,
        fullName: s.name,
        type: deriveType(s.category),
        location: '',
        batch: s.batch,
        category: s.category,
        xinleAccessible: s.xinleAccessible,
        tongZhao: 0,          // 分数线占位，可报名学校后续补真实值；不可报名学校无需
      },
    })
    existing ? updated++ : created++
  }
  console.log(`完成：新增 ${created} 所，更新 ${updated} 所，共 ${XINLE_SCHOOLS.length} 所`)
  console.log(`可报名 ${XINLE_SCHOOLS.filter(s=>s.xinleAccessible).length} 所，不可报名 ${XINLE_SCHOOLS.filter(s=>!s.xinleAccessible).length} 所`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
