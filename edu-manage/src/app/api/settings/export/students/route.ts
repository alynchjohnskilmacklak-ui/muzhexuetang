import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { requireAdminUser } from '@/lib/auth/guards'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { brandXlsxBufferOnServer } from '@/lib/export-xlsx-brand-server'
import { copyXlsxAsArrayBuffer } from '@/lib/export-xlsx-brand'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAdminUser()
  const prisma = await getRequestPrisma()

  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const requestedTermId = req.nextUrl.searchParams.get('termId')?.trim() || null
  const allTerms = requestedTermId === 'all'
  const selectedTerm = allTerms ? null : await resolveAdminTermScope(prisma, division, req)
  if (!allTerms && !selectedTerm) {
    return NextResponse.json({ error: requestedTermId ? '运营批次不存在或不属于当前学部' : '当前没有可导出的运营批次' }, { status: 404 })
  }

  const students = await prisma.student.findMany({
    where: {
      division,
      deletedAt: null,
      ...(selectedTerm ? { termMemberships: { some: { termId: selectedTerm.id, status: { not: 'WITHDRAWN' } } } } : {}),
      ...(selectedTerm && selectedTerm.status !== 'ARCHIVED' ? { status: { not: 'INACTIVE' } } : {}),
    },
    include: {
      termMemberships: {
        where: selectedTerm ? { termId: selectedTerm.id, status: { not: 'WITHDRAWN' } } : {},
        select: { grade: true, term: { select: { name: true } } },
      },
      enrollments: {
        where: selectedTerm ? { group: { termId: selectedTerm.id } } : {},
        include: { group: { include: { course: true, term: { select: { name: true } } } } },
      },
      fees: {
        where: { status: 'paid', deletedAt: null, ...(selectedTerm ? { termId: selectedTerm.id } : {}) },
        select: { amount: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = students.map((s) => {
    const courses = [...new Set(s.enrollments.map((e) => e.group.course.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('、')
    const batches = [...new Set([
      ...s.termMemberships.map((membership) => membership.term.name),
      ...s.enrollments.map((e) => e.group.term?.name),
    ].filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('、')
    const grades = [...new Set(s.termMemberships.map((membership) => membership.grade).filter((grade): grade is string => Boolean(grade)))].join('、')
    const activeEnrollments = s.enrollments.filter((e) => e.status === 'ACTIVE' && e.group.status !== 'ARCHIVED' && e.group.course.isActive)
    const remainHours = activeEnrollments.reduce((sum, e) => sum + Number(e.remainHours || 0), 0)
    const totalHours = activeEnrollments.reduce((sum, e) => sum + Number(e.totalHours || 0), 0)
    const totalFees = s.fees.reduce((sum, f) => sum + f.amount, 0)
    return [
      s.name, s.gender || '', grades || s.grade || '', s.school || '', batches || (selectedTerm?.name || '历史批次'),
      remainHours, totalHours, s.status,
      courses || '未报名', totalFees,
      s.createdAt.toLocaleDateString('zh-CN'),
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([
    ['姓名', '性别', '年级', '学校', '批次', '剩余课时', '总课时', '状态', '报名课程', '所选批次已缴费金额', '注册日期'],
    ...rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')

  const rawBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const buf = await brandXlsxBufferOnServer(new Uint8Array(rawBuffer))
  const scopeLabel = allTerms ? '全部批次' : selectedTerm!.name
  const downloadName = `牧哲学堂_${scopeLabel}_学员数据-${new Date().toISOString().slice(0, 10)}.xlsx`
  await createActivityLog(user.id, 'EXPORT_STUDENTS', 'StudentReport', division, {
    division,
    termId: allTerms ? null : selectedTerm!.id,
    termName: scopeLabel,
    allTerms,
    rowCount: rows.length,
  })
  return new NextResponse(copyXlsxAsArrayBuffer(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="students-export.xlsx"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
