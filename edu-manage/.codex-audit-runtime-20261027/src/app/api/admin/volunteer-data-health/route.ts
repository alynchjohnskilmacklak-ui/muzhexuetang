import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { hasSchoolNameScope, normalizeSchoolNameWithoutScope } from '@/lib/volunteer-school-names'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { prisma } = await requireAdminUser()
  const [rankRows, allocationRows, schools] = await Promise.all([
    prisma.yifenYidang.groupBy({ by: ['year'], _count: { _all: true }, orderBy: { year: 'desc' } }),
    prisma.allocationQuota.findMany({ select: { year: true, juniorSchool: true } }),
    prisma.highSchoolInfo.findMany({ select: { id: true, name: true, tongZhao: true } }),
  ])

  const allocationByYear = new Map<number, { count: number; juniorSchools: Set<string> }>()
  for (const row of allocationRows) {
    const item = allocationByYear.get(row.year) || { count: 0, juniorSchools: new Set<string>() }
    item.count += 1
    item.juniorSchools.add(row.juniorSchool)
    allocationByYear.set(row.year, item)
  }

  const schoolGroups = new Map<string, typeof schools>()
  for (const school of schools) {
    const key = normalizeSchoolNameWithoutScope(school.name)
    const group = schoolGroups.get(key) || []
    group.push(school)
    schoolGroups.set(key, group)
  }
  const suspectedDuplicates = [...schoolGroups.entries()]
    .filter(([, group]) => group.length > 1 && group.some((school) => hasSchoolNameScope(school.name)))
    .map(([normalizedName, group]) => ({ normalizedName, schools: group }))

  return NextResponse.json({
    yifenYidang: rankRows.map((row) => ({ year: row.year, count: row._count._all })),
    allocationQuota: [...allocationByYear.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, item]) => ({ year, count: item.count, juniorSchoolCount: item.juniorSchools.size })),
    highSchools: {
      total: schools.length,
      suspectedDuplicateCount: suspectedDuplicates.length,
      suspectedDuplicates,
    },
  })
})
