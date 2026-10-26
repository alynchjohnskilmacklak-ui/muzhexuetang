import { createHash } from 'node:crypto'
import { findVolunteerSchoolMatch } from '../src/lib/volunteer-school-match'
import { juniorDb, readVolunteerJson, requiredText } from './volunteer-master-import-utils'

type Line = { scope: string; tongZhao: number | null; yiTong: number | null }
type MasterSchool = {
  schoolName: string
  allLines: Line[]
  xinleLine: number | null
  xinleLineScope?: string
  xinleStatus: string[]
  isProvincialDemo: boolean
  xinleFenpeiQuota: number | null
}

function inferLocation(name: string) {
  const places = ['新乐', '藁城', '鹿泉', '栾城', '正定', '行唐', '灵寿', '高邑', '深泽', '赞皇', '无极', '平山', '元氏', '赵县', '晋州', '辛集', '井陉', '矿区']
  return places.find((place) => name.includes(place)) || '市区'
}

async function main() {
  const { filePath, year, rows } = readVolunteerJson<MasterSchool>('data/volunteer/MASTER_schools_2025.json')
  const db = juniorDb()
  const existing = await db.highSchoolInfo.findMany({ select: { id: true, name: true, fullName: true } })
  const created: string[] = []
  const statusCounts: Record<string, number> = {}

  for (const raw of rows) {
    const schoolName = requiredText(raw.schoolName, 'schoolName')
    const exact = existing.find((school) => school.name === schoolName || school.fullName === schoolName)
    const matched = exact || findVolunteerSchoolMatch(schoolName, existing)
    const statuses = Array.from(new Set(raw.xinleStatus || []))
    statuses.forEach((status) => { statusCounts[status] = (statusCounts[status] || 0) + 1 })
    const selectedLine = raw.xinleLine ?? raw.allLines?.find((line) => line.tongZhao !== null)?.tongZhao ?? 0
    const selectedYiTong = raw.allLines?.find((line) => line.tongZhao === raw.xinleLine)?.yiTong
      ?? raw.allLines?.find((line) => line.yiTong !== null)?.yiTong
      ?? null
    const data = {
      xinleLine: raw.xinleLine,
      xinleStatus: statuses,
      isProvincialDemo: Boolean(raw.isProvincialDemo),
      xinleFenpeiQuota: raw.xinleFenpeiQuota,
      acceptsOtherCounty: statuses.includes('统招可报'),
      xinleAccessible: statuses.some((status) => status !== '仅供参考'),
      tongZhao: selectedLine,
      yiTong: selectedYiTong,
      sourceNote: `${year} MASTER；新乐线范围：${raw.xinleLineScope || '未注明'}`,
    }
    if (matched) {
      await db.highSchoolInfo.update({ where: { id: matched.id }, data })
    } else {
      const schoolId = `master-${year}-${createHash('sha1').update(schoolName).digest('hex').slice(0, 12)}`
      await db.highSchoolInfo.upsert({
        where: { schoolId },
        update: data,
        create: {
          schoolId,
          name: schoolName,
          fullName: schoolName,
          type: raw.isProvincialDemo ? '省示范' : '普通高中',
          location: inferLocation(schoolName),
          boardingAvail: false,
          ...data,
        },
      })
      created.push(schoolName)
    }
  }

  console.log(`[master-schools] ${filePath}：导入 ${rows.length} 所，更新 ${rows.length - created.length}，新增 ${created.length}`)
  console.log(`[master-schools] 状态统计：${Object.entries(statusCounts).map(([key, value]) => `${key}=${value}`).join('，')}`)
  console.log(`[master-schools] 省示范=${rows.filter((row) => row.isProvincialDemo).length}，省示范统招可报=${rows.filter((row) => row.isProvincialDemo && row.xinleStatus.includes('统招可报')).length}`)
  console.log(`[master-schools] 原库未匹配并已新增 ${created.length} 所${created.length ? `：\n- ${created.join('\n- ')}` : ''}`)
}

main().catch((error) => { console.error(error); process.exit(1) })
