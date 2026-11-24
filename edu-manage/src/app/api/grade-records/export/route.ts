import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { brandXlsxBufferOnServer } from '@/lib/export-xlsx-brand-server'
import { copyXlsxAsArrayBuffer } from '@/lib/export-xlsx-brand'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const assessmentId = request.nextUrl.searchParams.get('assessmentId') || ''
  if (!assessmentId) return NextResponse.json({ error: '缺少测评编号' }, { status: 400 })
  const prisma = await getRequestPrisma()
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, group: { division: user.division, term: { status: 'ACTIVE' } } },
    include: {
      group: {
        select: {
          name: true,
          course: { select: { name: true } },
          enrollments: { where: { status: 'ACTIVE', deletedAt: null }, include: { student: { select: { id: true, name: true, grade: true } } }, orderBy: { student: { name: 'asc' } } },
        },
      },
      gradeRecords: { where: { deletedAt: null }, include: { student: { select: { id: true, name: true, grade: true } } } },
    },
  })
  if (!assessment) return NextResponse.json({ error: '测评不存在或不属于当前学部' }, { status: 404 })
  const gradeByStudent = new Map(assessment.gradeRecords.map(record => [record.studentId, record]))
  const absentIds = new Set(assessment.absentStudentIds)
  const rows = assessment.group.enrollments.map(({ student }) => {
    const record = gradeByStudent.get(student.id)
    const isAbsent = absentIds.has(student.id)
    return {
      学员: student.name,
      年级: student.grade || '',
      班级: assessment.group.name,
      课程: assessment.group.course.name,
      测评: assessment.name,
      日期: assessment.assessDate.toISOString().slice(0, 10),
      成绩: record?.score ?? (isAbsent ? '缺考' : ''),
      满分: assessment.fullScore,
      得分率: record ? `${Math.round(record.score / assessment.fullScore * 100)}%` : '',
      评语: record?.comment || '',
    }
  })
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '测评成绩')
  const raw = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })
  const branded = await brandXlsxBufferOnServer(new Uint8Array(raw))
  return new Response(copyXlsxAsArrayBuffer(branded), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="牧哲学堂_成绩单_${new Date().toISOString().slice(0,10)}.xlsx"` } })
})
