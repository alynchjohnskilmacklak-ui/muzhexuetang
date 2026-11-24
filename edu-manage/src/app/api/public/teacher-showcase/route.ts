import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { resolveTier, TIER_RANK } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'

export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = {
  MANAGER: '管理教师',
  ELITE: '牧哲学堂专属教师',
  SENIOR: '资深教师',
  EXPERIENCED: '经验教师',
  NEW: '新晋教师',
}


// University level tags use the Ministry of Education's published 985/211
// and second-round Double First-Class lists. Keep this conservative: unknown
// schools receive a neutral type label instead of an invented ranking.
const UNIVERSITY_985 = new Set([
  '大连理工大学', '东北大学', '东南大学', '华东师范大学', '华南理工大学',
  '华中科技大学', '吉林大学', '南开大学', '中国科学技术大学',
])

const UNIVERSITY_211 = new Set([
  '北京科技大学', '河北工业大学', '河海大学', '华北电力大学', '武汉理工大学',
  '西安电子科技大学', '西南大学', '郑州大学', '中国矿业大学', '中国矿业大学（北京）',
  '中国石油大学', '中国石油大学（北京）', '中国石油大学（华东）',
])

const UNIVERSITY_DOUBLE_FIRST = new Set([
  ...UNIVERSITY_985,
  ...UNIVERSITY_211,
])

function getUniversityLevelLabels(university: string | null): string[] {
  const name = (university || '').trim().replace(/\s+/g, '').replace('（国家空间科学中心）', '')
  if (!name) return []

  const labels: string[] = []
  if (UNIVERSITY_985.has(name)) labels.push('985')
  else if (UNIVERSITY_211.has(name)) labels.push('211')
  if (UNIVERSITY_DOUBLE_FIRST.has(name)) labels.push('双一流')
  if (labels.length) return labels
  return [name.includes('师范') ? '师范类高校' : '本科高校']
}

type TeacherDivision = 'JUNIOR' | 'SENIOR'
type TeacherRecord = {
  id: string
  name: string
  gender: string | null
  education: string | null
  university: string | null
  bio: string | null
  subjects: string
  tierLevel: string
  division: string
  createdAt: Date
}

function getPublicTeacherBio(bio: string | null, name: string): string {
  let text = (bio || '').replace(/\r\n?/g, '\n').trim()
  const fullName = name.trim()
  const surname = Array.from(fullName)[0] || ''

  if (fullName && surname) {
    text = text.replaceAll(`${fullName}老师`, `${surname}老师`).replaceAll(fullName, `${surname}老师`)
  }

  const privateOrIrrelevant = /家教|时薪|收费|课时费|\d+(?:\.\d+)?\s*(?:\/\s*h|元\s*\/\s*(?:小时|时))|(?:目前|现任|现在)?工作(?:在|于)|就职于|任职于|工作单位|系统搭建|招生|日常维护|全部事项|负责人|带过.{0,12}(?:学生|学员).{0,8}(?:\+|人)/i

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split(/(?<=[。！？；])/).filter((sentence) => !privateOrIrrelevant.test(sentence)).join(''))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1800)
}

export async function GET() {
  try {
    const sources: { division?: TeacherDivision; db: PrismaClient }[] = isDualDbEnabled()
      ? [
          { division: 'JUNIOR', db: getPrismaForDivision('JUNIOR') },
          { division: 'SENIOR', db: getPrismaForDivision('SENIOR') },
        ]
      : [{ db: prisma }]

    const sourceRows = await Promise.all(sources.map((source) => source.db.teacher.findMany({
      where: source.division
        ? { status: 'ACTIVE', division: source.division }
        : { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        gender: true,
        education: true,
        university: true,
        bio: true,
        subjects: true,
        tierLevel: true,
        division: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })))

    const records: TeacherRecord[] = []
    sourceRows.forEach((rows) => {
      for (const teacher of rows) {
        records.push(teacher)
      }
    })

    // A teacher can be mirrored into both databases; merge by stable teacher ID
    // so the public showcase doesn't show duplicate cards.
    const teachersById = new Map<string, TeacherRecord>()
    for (const teacher of records) {
      const existing = teachersById.get(teacher.id)
      if (!existing) {
        teachersById.set(teacher.id, teacher)
        continue
      }
      existing.subjects = [...new Set(`${existing.subjects},${teacher.subjects}`.split(',').map((subject) => subject.trim()).filter(Boolean))].join(',')
      if (!existing.gender && teacher.gender) existing.gender = teacher.gender
      if (!existing.education && teacher.education) existing.education = teacher.education
      if (!existing.university && teacher.university) existing.university = teacher.university
      if (!existing.bio && teacher.bio) existing.bio = teacher.bio
      if (TIER_RANK[resolveTier(teacher.tierLevel)] > TIER_RANK[resolveTier(existing.tierLevel)]) {
        existing.tierLevel = teacher.tierLevel
      }
      if (teacher.createdAt > existing.createdAt) existing.createdAt = teacher.createdAt
    }
    // Keep local/demo teacher profiles out of the public home page while
    // leaving their internal teacher records untouched.
    const teachers = [...teachersById.values()].filter((teacher) => (
      teacher.name.trim() !== '本老师'
      && !teacher.bio?.includes('仅供本机功能测试的虚构教师')
    ))

    const orderedTeachers = teachers.sort((left, right) => {
      const tierDifference = TIER_RANK[resolveTier(right.tierLevel)] - TIER_RANK[resolveTier(left.tierLevel)]
      return tierDifference || right.createdAt.getTime() - left.createdAt.getTime() || left.id.localeCompare(right.id)
    })

    let nextMalePortraitSeed = 0
    let nextFemalePortraitSeed = 0
    const publicTeachers = orderedTeachers.map((teacher) => {
      const subjects = [...new Set(teacher.subjects.split(',').map((subject) => subject.trim()).filter(Boolean))]
      const tierKey = resolveTier(teacher.tierLevel)
      const surname = Array.from(teacher.name.trim())[0] || '授课'
      const portraitType = ['f', '女', 'female', 'woman'].includes(String(teacher.gender || '').trim().toLowerCase()) ? 'female' : 'male'
      const portraitSeed = portraitType === 'female' ? nextFemalePortraitSeed++ : nextMalePortraitSeed++

      return {
        label: `${surname}老师`,
        portraitSeed,
        portraitType,
        tierKey,
        tier: TIER_LABEL[tierKey] || '新晋教师',
        subjects,
        bio: getPublicTeacherBio(teacher.bio, teacher.name),
        portrait: getTeacherAvatarUrl(null, teacher.gender, teacher.name),
        university: teacher.university?.trim() || null,
        schoolLevels: getUniversityLevelLabels(teacher.university),
        education: teacher.education?.trim() || null,
      }
    })

    return NextResponse.json(
      { total: publicTeachers.length, teachers: publicTeachers },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=0, must-revalidate' } },
    )
  } catch (error) {
    console.error('[public-teacher-showcase]', error)
    return NextResponse.json(
      { error: '教师介绍暂时无法加载' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
