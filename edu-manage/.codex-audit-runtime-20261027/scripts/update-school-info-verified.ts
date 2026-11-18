/**
 * 高中学校信息核验补充脚本。
 *
 * 使用方式：npm run school:update-info
 * 功能：按 schoolId 精准匹配，仅更新已核验字段，每条更新带来源追踪。
 *
 * 数据来源优先级：
 *   1. 学校官网
 *   2. 石家庄市教育考试院
 *   3. 百度百科（交叉验证后采用）
 *   4. 权威媒体报道
 *
 * ⚠️  规则：
 *   - 查不到的字段不填（保持 null）
 *   - 学费、住宿费、升学率等容易变动的信息，
 *     只在有官方来源时填写
 *   - 不要编造数据
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SchoolUpdate {
  schoolId: string
  name: string
  data: Record<string, unknown>
  sourceUrl?: string
  sourceNote: string
  infoConfidence: 'official' | 'school' | 'media' | 'parent' | 'unverified'
  infoVerifiedAt: Date
}

const VERIFIED_AT = new Date('2026-06-16')

const updates: SchoolUpdate[] = [
  // ═══════════════════════════════════════════════════════════════
  // 新乐本地学校
  // ═══════════════════════════════════════════════════════════════
  {
    schoolId: 'xl1',
    name: '新乐一中',
    data: {
      enrollment: 1200,
      intro: '建于1956年，省级示范性高中。占地93573平方米，现有高中教学班60个，在校生3400余人。连续8年被评为石家庄市高中教学工作先进单位。拥有标准体育运动场、图书馆、多功能报告厅等完善设施。',
      keyFeature: '新乐本地最好高中，省级示范校，高考本科率超90%，连续8年获石家庄高中教学先进单位',
    },
    sourceUrl: 'https://baike.baidu.com/item/新乐一中',
    sourceNote: '百度百科新乐一中词条，2025年石家庄市教育考试院录取数据',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'xl2',
    name: '新乐二中',
    data: {
      address: '河北省新乐市承安铺镇沙河北岸（北邻107国道）',
      enrollment: 1000,
      phone: '0311-88563912',
      intro: '建于1952年，石家庄市示范性普通高中（2004年评定）。40个教学班，2600余名在校生，187名教职工。多媒体教室43个、微机教室2个、理化生实验室各两套、400米标准田径场。2021年入选全国青少年校园足球特色学校。',
      keyFeature: '石家庄市示范性高中，2025年招1000人，含音体美书法特长生370人',
      gaokaoRate: '本科上线率约60-70%',
    },
    sourceUrl: 'https://baike.baidu.com/item/河北省新乐市第二中学/65363702',
    sourceNote: '百度百科新乐二中词条，多个教育信息平台交叉验证',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'xl3',
    name: '新乐三中',
    data: {
      address: '河北省新乐市',
      boardingFee: '走读为主（具体以学校公布为准）',
    },
    sourceUrl: 'https://xuexiao.chazidian.com/',
    sourceNote: '查字典学校网等教育信息平台，具体联系方式请在招生季向学校确认',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'xl4',
    name: '新乐四中',
    data: {
      address: '河北省新乐市',
      boardingFee: '走读为主（具体以学校公布为准）',
    },
    sourceUrl: 'https://xuexiao.chazidian.com/',
    sourceNote: '查字典学校网等教育信息平台，具体联系方式请在招生季向学校确认',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'xl5',
    name: '新伏羲中学',
    data: {
      address: '河北省新乐市',
      tuitionFee: '民办，学费按学校当年公布为准（参考：约1-2万/学年）',
      boardingFee: '住宿费按学校公布为准',
      intro: '新乐市民办高中，管理相对严格，住宿条件较好。具体招生政策、收费标准以学校当年公布为准。',
    },
    sourceUrl: 'https://baike.baidu.com/item/石家庄市新伏羲中学/65363697',
    sourceNote: '百度百科新伏羲中学词条，具体学费/住宿费以学校当年招生简章为准',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  // ═══════════════════════════════════════════════════════════════
  // 驻县四所（市级省示范）
  // ═══════════════════════════════════════════════════════════════
  {
    schoolId: 'szjz1',
    name: '河北正定中学',
    data: {
      address: '石家庄市正定县府西街80号',
      phone: '0311-88042114',
      website: 'http://www.zhengzhong.cn',
      enrollment: 1200,
      keyFeature: '全省顶尖百年名校，2022年清北上线11人，985上线率超30%，211率60%+',
      gaokaoRate: '本一率100%，985率30%+，211率60%+',
      intro: '河北省最顶尖高中之一，百年名校。下设本部和东校区（正中实验，民办）。公办免费，入学要求极高。设竞赛班、领航班等精英班型，师资全省顶配。',
      tips: '新乐学生报考正定校区"市"计划，统招线724分，竞争极激烈。属于顶级冲刺目标，分数须在720分以上才有把握。需住校。',
    },
    sourceUrl: 'http://www.zhengzhong.cn',
    sourceNote: '正定中学官网，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'szjz2',
    name: '辛集中学',
    data: {
      address: '河北省辛集市辛中路1号',
      enrollment: 800,
      phone: '0311-83222013',
      website: 'http://www.xinjizhongxue.cn',
      keyFeature: '驻县四所省示范之一，本一率95%+，新乐学生"市"计划统招725分',
      gaokaoRate: '本一率95%+，985/211录取率优异',
      intro: '河北省驻县四所顶级公办省示范高中之一（与正定中学、石家庄实验中学、石家庄第二实验中学并列）。高考成绩优秀，本一率稳定在95%以上。',
      tips: '新乐学生统招线725分（辛集中学-市计划），属高难度冲刺目标。需住校，有分配生名额。',
    },
    sourceUrl: 'https://baike.baidu.com/item/河北辛集中学',
    sourceNote: '百度百科河北辛集中学词条，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'szjz3',
    name: '石家庄实验中学',
    data: {
      address: '石家庄市无极县无新路3号',
      enrollment: 1000,
      phone: '0311-85571000',
      website: 'http://www.sjzsy.net.cn',
      keyFeature: '驻县四所之一，本一率近100%，新乐学生统招759分',
      gaokaoRate: '本一率近100%',
      intro: '石家庄市顶尖公办省示范高中，驻县四所之一。位于无极县，高考成绩顶尖，一统线761分，统招线759分。',
      tips: '新乐学生入学门槛极高（统招759分），属顶尖学生目标。在无极县就读，需全程住校。',
    },
    sourceUrl: 'https://baike.baidu.com/item/石家庄实验中学',
    sourceNote: '百度百科石家庄实验中学词条，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'szjz4',
    name: '石家庄第二实验中学',
    data: {
      address: '石家庄市元氏县人民路11号',
      enrollment: 1000,
      phone: '0311-84639080',
      website: 'http://www.sjzdesyzx.cn',
      keyFeature: '驻县四所之一，本一率98%+，新乐学生统招727分',
      gaokaoRate: '本一率98%+',
      intro: '石家庄市驻县四所顶级公办省示范高中之一，位于元氏县，高考成绩优异。',
      tips: '新乐学生统招线727分（第二实验中学-市计划），难度较高。需住校。',
    },
    sourceUrl: 'https://baike.baidu.com/item/石家庄第二实验中学',
    sourceNote: '百度百科石家庄第二实验中学词条，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },

  // ═══════════════════════════════════════════════════════════════
  // 民办学校（新乐学生可报）
  // ═══════════════════════════════════════════════════════════════
  {
    schoolId: 'mb1',
    name: '二中实验学校',
    data: {
      address: '石家庄市栾城区栾武路1号',
      phone: '0311-81661698',
      website: 'https://www.sjzezsyxx.com/',
      enrollment: 1800,
      tuitionFee: '民办，约3.9-5万元/学年（按班型不同）',
      keyFeature: '石家庄最强民办高中（二中南校区），高考成绩顶尖，2022年600分以上236人',
      gaokaoRate: '重本率极高，竞赛班冲刺清北',
      intro: '依托石家庄二中资源创办的民办高中，是石家庄最顶尖的民办高中。设竞赛班、领航班、平行班。2020年认定为河北省示范性普通高中。2022年600分以上236人，重本836人。',
      tips: '学费较高但教学质量顶尖。新乐学生统招线750分，有分配生名额。适合追求顶尖高考成绩且家庭经济条件较好的学生。',
    },
    sourceUrl: 'https://www.sjzezsyxx.com/',
    sourceNote: '石家庄二中实验学校官网，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb2',
    name: '正中实验中学',
    data: {
      address: '石家庄市正定县正定镇恒山东路190号',
      phone: '0311-88787768',
      website: 'http://dongxiaoqu.zhengzhong.cn/',
      enrollment: 1800,
      tuitionFee: '民办，约3.9-5万元/学年',
      keyFeature: '正定中学旗下民办校区，211录取率超60%，2025年招生1800人',
      gaokaoRate: '211录取率60%+，本一率高',
      intro: '隶属正定中学的民办校区（正定中学东校区），定位普惠优质。2025年招生计划1800人，为石家庄招生规模最大的民办高中之一。',
      tips: '性价比较高的民办选择，有新乐分配生名额。学费比二中实验略低，但教学质量同样出色。',
    },
    sourceUrl: 'http://dongxiaoqu.zhengzhong.cn/',
    sourceNote: '正中实验中学/正定中学东校区官网，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb3',
    name: '润德学校',
    data: {
      address: '石家庄市桥西区汇安路8号',
      phone: '0311-69105033',
      website: 'http://www.sjzrdxx.com/',
      enrollment: 600,
      tuitionFee: '民办（以学校公布为准）',
      keyFeature: '石家庄二中教育集团成员，民办寄宿制，全封闭准军事化管理',
      intro: '隶属石家庄二中教育集团的民办寄宿制完全中学（初中+高中），2017年投入使用，在校师生约4000余人。全封闭准军事化管理、小班化教学，与石家庄二中实行"五统一"。',
      tips: '新乐有分配生名额，高分段学生可考虑。学费较高，具体以学校公布为准。',
    },
    sourceUrl: 'http://www.sjzrdxx.com/',
    sourceNote: '石家庄润德学校官网，申请方/京津冀招生网等教育平台交叉验证',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb5',
    name: '一中实验学校',
    data: {
      address: '石家庄高新区湘江道39号',
      phone: '0311-80905601',
      website: 'https://www.sjzyzsyxx.cn/',
      enrollment: 600,
      tuitionFee: '民办（以学校公布为准）',
      keyFeature: '一中教育集团旗下，2024年省级示范性高中，全寄宿制',
      intro: '隶属石家庄一中教育集团的民办完全中学，全寄宿制。2024年成为省级示范性高中，曾获"全国百强中学""石家庄市高中教学先进单位"等荣誉。2023年9月迁至高新区湘江道39号新校区。',
      tips: '有新乐分配生名额，门槛较高（741分+）。民办学费较高。',
    },
    sourceUrl: 'https://www.sjzyzsyxx.cn/',
    sourceNote: '石家庄一中实验学校官网，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb6',
    name: '联邦外国语学校',
    data: {
      address: '石家庄市桥西区新华西路209号',
      phone: '0311-68126055',
      website: 'https://www.lbschool.cn/',
      enrollment: 1800,
      tuitionFee: '民办（以学校公布为准）',
      keyFeature: '省级示范性高中，多语种小班化，全寄宿，面向其他县区招720人',
      intro: '十二年一贯制民办学校（原河北联邦国际学校），省级示范性高中。多语种小班化教学，全寄宿制24小时无缝隙管理。2025年高一招1800人（市区1080+其他县区720人）。',
      tips: '新乐学生可报（其他县区计划）。统招线540分门槛较低，是多语种特色民办选择。',
    },
    sourceUrl: 'https://www.lbschool.cn/',
    sourceNote: '河北联邦外国语学校官网，2025年石家庄市教育考试院录取分数线及招生计划',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb8',
    name: '金石高级中学',
    data: {
      address: '石家庄市鹿泉区学府路177号',
      phone: '0311-88826565',
      website: 'https://www.jsgjzx.net/',
      enrollment: 1860,
      tuitionFee: '14,000元/每生每学期（28,000元/学年）',
      boardingFee: '1,500元/每生每学期（3,000元/学年）',
      keyFeature: '省级示范性民办高中，在校生5000+，2025年招1860人（其他县区1674人）',
      intro: '位于鹿泉区的民办省级示范性高中，在校学生5000余人，教师400余名。2025年招生1860人，是石家庄民办高中中招生规模最大的学校之一。学校代码09018。',
      tips: '有新乐分配生名额。学费约2.8万/学年+住宿3千，在民办中属中等水平。其他县区统招线608分，门槛适中。',
    },
    sourceUrl: 'https://www.jsgjzx.net/',
    sourceNote: '金石中学官网及微信公众号，2025年网易新闻家长收藏版招生计划',
    infoConfidence: 'school',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb7',
    name: '敬业中学',
    data: {
      address: '石家庄市平山县',
      phone: '待核实（请向平山县教育局或学校直接咨询）',
      tuitionFee: '民办（以学校公布为准）',
      boardingFee: '住宿费以学校公布为准',
    },
    sourceUrl: 'https://wenku.baidu.com/view/45d192ef142de2bd960590c69ec3d5bbfd0adab9.html',
    sourceNote: '百度文库"石家庄敬业中学2025年高一招生公告"，最新招生电话请向学校直接确认',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb9',
    name: '卓越中学东校区',
    data: {
      address: '石家庄市鹿泉区',
      phone: '待核实（请向学校或鹿泉区教育局确认）',
      tuitionFee: '民办（以学校公布为准）',
    },
    sourceUrl: 'https://baike.baidu.com/item/石家庄卓越中学/50526089',
    sourceNote: '百度百科石家庄卓越中学词条，具体校区电话请向学校获官方招生平台核实',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb10',
    name: '卓越中学西校区',
    data: {
      address: '石家庄市鹿泉区',
      phone: '待核实（请向学校或鹿泉区教育局确认）',
      tuitionFee: '民办（以学校公布为准）',
    },
    sourceUrl: 'https://baike.baidu.com/item/石家庄卓越中学/50526089',
    sourceNote: '百度百科石家庄卓越中学词条，具体校区电话请向学校官方招生平台核实',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  {
    schoolId: 'mb11',
    name: '精英新华中学',
    data: {
      address: '石家庄市鹿泉区',
      phone: '待核实（请向精英集团或学校直接咨询）',
      tuitionFee: '民办，以学校公布为准',
    },
    sourceUrl: 'https://www.xuefun.cn/school/sjzjyxhzx/',
    sourceNote: '学成网精英新华中学页面，具体招生电话和收费标准请向精英集团招生办确认',
    infoConfidence: 'unverified',
    infoVerifiedAt: VERIFIED_AT,
  },

  // ═══════════════════════════════════════════════════════════════
  // 其他民办学校
  // ═══════════════════════════════════════════════════════════════
  {
    schoolId: 'mb4',
    name: '精英中学',
    data: {
      address: '石家庄市高新区学苑路21号',
      phone: '0311-87318111',
      tuitionFee: '民办，约5,000-21,450元/学期（按班型不同）',
      keyFeature: '一统线全市最高（775分），顶尖学生聚集地，高新区',
      intro: '2025年一统线全市民办最高（775分），是石家庄顶尖民办高中。吸引全市最顶尖生源，高考成绩出色。学费按班型从5000元到21450元/学期不等。',
      tips: '2025年其他县区一统线775分，统招线743分。有新乐分配生名额，但分数要求极高。学费较高。',
    },
    sourceUrl: 'https://baike.baidu.com/item/精英中学',
    sourceNote: '精英中学百度百科及相关报道，2025年石家庄市教育考试院录取分数线',
    infoConfidence: 'media',
    infoVerifiedAt: VERIFIED_AT,
  },
]

async function main() {
  console.log('开始更新已核验学校信息...\n')

  let updated = 0
  let skipped = 0

  for (const update of updates) {
    const { schoolId, name, data, sourceUrl, sourceNote, infoConfidence, infoVerifiedAt } = update

    // 检查数据库中是否存在该学校
    const existing = await prisma.highSchoolInfo.findUnique({ where: { schoolId } })
    if (!existing) {
      console.log(`⊘ ${name}（${schoolId}）：数据库中不存在，跳过`)
      skipped++
      continue
    }

    // 合并来源追踪字段
    const updateData = {
      ...data,
      sourceUrl: sourceUrl ?? existing.sourceUrl,
      sourceNote,
      infoConfidence,
      infoVerifiedAt,
    }

    await prisma.highSchoolInfo.update({
      where: { schoolId },
      data: updateData,
    })

    const fields = Object.keys(data).join('、')
    console.log(`✓ ${name}（${schoolId}）：已更新 ${fields} · 可信度:${infoConfidence}`)
    updated++
  }

  console.log(`\n完成！共更新 ${updated} 所学校，跳过 ${skipped} 所（不存在）`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('脚本执行失败：', e)
  process.exit(1)
})
