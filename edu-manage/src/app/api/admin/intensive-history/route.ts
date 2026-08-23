import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getRequestDivision } from '@/lib/division'
import {
  createIntensiveHistoryRecord,
  IntensiveHistoryError,
  type IntensiveHistoryAttendanceStatus,
  type IntensiveHistoryRecordInput,
} from '@/lib/intensive-history'
import { toIntensiveTeachingType } from '@/lib/intensive-class'
import { getTeacherIntensiveStudentCount } from '@/lib/teacher-intensive-scheduling'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    throw new IntensiveHistoryError('FORBIDDEN', '仅管理员可以进行历史补录', 403)
  }
  const prisma = await getRequestPrisma()
  const division = getRequestDivision(
    user,
    new URL(request.url).searchParams.get('division'),
  )
  return { user, prisma, division }
}

export const GET = apiHandler(async (request: NextRequest) => {
  try {
    const { prisma, division } = await requireAdmin(request)
    const selectedTerm = await resolveAdminTermScope(prisma, division, request)
    const groups = await prisma.classGroup.findMany({
      where: {
        division,
        termId: selectedTerm?.id || '__NO_SELECTED_TERM__',
        intensiveMode: 'INTENSIVE',
        status: { not: 'ARCHIVED' },
        course: { isActive: true },
      },
      include: {
        course: { select: { name: true, subject: true, grade: true } },
        teacher: { select: { id: true, name: true } },
        teacherAssignments: {
          include: { teacher: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, name: true, grade: true, status: true },
            },
          },
          orderBy: { enrolledAt: 'asc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      division,
      term: selectedTerm,
      groups: groups.map((group) => {
        const teachingType = toIntensiveTeachingType(group.teachingType) || 'ONE_ON_ONE'
        const teacherMap = new Map<string, { id: string; name: string; subject?: string | null }>()
        if (group.teacher) {
          teacherMap.set(group.teacher.id, {
            id: group.teacher.id,
            name: group.teacher.name,
            subject: group.course.subject,
          })
        }
        for (const assignment of group.teacherAssignments) {
          teacherMap.set(assignment.teacherId, {
            id: assignment.teacher.id,
            name: assignment.teacher.name,
            subject: assignment.subject,
          })
        }
        return {
          id: group.id,
          name: group.name,
          teachingType,
          expectedStudents: getTeacherIntensiveStudentCount(teachingType),
          courseName: group.course.name,
          subject: group.course.subject,
          grade: group.course.grade,
          teachers: [...teacherMap.values()],
          students: group.enrollments
            .filter((enrollment) => enrollment.student.status !== 'ARCHIVED')
            .map((enrollment) => ({
              id: enrollment.student.id,
              name: enrollment.student.name,
              grade: enrollment.student.grade,
              enrollmentStatus: enrollment.status,
              totalHours: enrollment.totalHours,
              usedHours: enrollment.usedHours,
              remainHours: enrollment.remainHours,
            })),
        }
      }),
    })
  } catch (error) {
    if (error instanceof IntensiveHistoryError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
})

export const POST = apiHandler(async (request: NextRequest) => {
  try {
    const { user, prisma, division } = await requireAdmin(request)
    const selectedTerm = await resolveAdminTermScope(prisma, division, request)
    if (!selectedTerm || selectedTerm.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '历史批次只允许查看，请切换到当前运营批次后再补录课程' },
        { status: 409 },
      )
    }
    const body = await request.json() as Record<string, unknown>
    const rawRecords = Array.isArray(body.records) ? body.records : []
    const records = rawRecords
      .filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === 'object')
      .map((record) => ({
        studentId: typeof record.studentId === 'string' ? record.studentId : '',
        status: String(record.status || '').toUpperCase() as IntensiveHistoryAttendanceStatus,
      }))
    const input: IntensiveHistoryRecordInput = {
      groupId: typeof body.groupId === 'string' ? body.groupId : '',
      teacherId: typeof body.teacherId === 'string' ? body.teacherId : '',
      lessonDate: typeof body.lessonDate === 'string' ? body.lessonDate : '',
      startTime: typeof body.startTime === 'string' ? body.startTime : '',
      endTime: typeof body.endTime === 'string' ? body.endTime : '',
      actualMinutes: Number(body.actualMinutes),
      reason: typeof body.reason === 'string' ? body.reason : '',
      records,
    }

    const result = await createIntensiveHistoryRecord({
      prisma,
      operatorId: user.id,
      division,
      termId: selectedTerm.id,
      input,
    })
    revalidatePath('/schedule/intensive')
    revalidatePath('/courses')
    revalidatePath('/teacher/intensive')
    revalidatePath('/teacher/salary')
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof IntensiveHistoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code, detail: error.detail },
        { status: error.status },
      )
    }
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'P2034'
    ) {
      return NextResponse.json(
        { error: '同时有其他管理员正在补录，请刷新后重试', code: 'CONCURRENT_WRITE' },
        { status: 409 },
      )
    }
    throw error
  }
})
