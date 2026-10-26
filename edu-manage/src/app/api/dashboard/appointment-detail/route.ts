import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { apiHandler } from '@/lib/api-handler'
import { findDashboardLessonDetail, dashboardClassDetail } from '@/lib/dashboard-lesson-detail'

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const division = getRequestDivision(admin)
  const term = await resolveAdminTermScope(admin.prisma, division, request)
  const id = request.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少课次信息' }, { status: 400 })
  const lesson = await findDashboardLessonDetail(admin.prisma, id, division, term?.id || '__NO_SELECTED_TERM__')
  if (!lesson) return NextResponse.json({ error: '课次不存在或不在当前学部与批次中' }, { status: 404 })
  const detail = dashboardClassDetail(lesson)
  const student = detail.students[0]
  const enrollment = detail.students.length === 1 ? lesson.group.enrollments.find(row => row.studentId === student?.id) : undefined
  const teachingType = lesson.group.teachingType || 'ONE_ON_ONE'
  return NextResponse.json({
    id: lesson.id, groupName: lesson.group.name, teachingType,
    teachingTypeLabel: ({ ONE_ON_ONE: '一对一', ONE_ON_TWO: '一对二', ONE_ON_THREE: '一对三', MAKEUP: '补课' } as Record<string, string>)[teachingType] || '个性化课程',
    studentName: detail.students.map(row => row.name).join('、') || '尚未安排学员',
    studentLevel: student?.membershipLevel || 'NORMAL', studentGender: student?.gender || null, teacher: detail.teacher.name,
    teacherAvatar: detail.teacher.avatar, teacherGender: detail.teacher.gender, tierLevel: detail.teacher.tierLevel,
    subject: detail.subject, lessonDate: lesson.lessonDate.toISOString(), time: detail.time,
    room: detail.room, status: detail.statusLabel,
    ...(enrollment ? { packageLabel: '报名课时', totalHours: enrollment.totalHours, usedHours: enrollment.usedHours, remainingHours: enrollment.remainHours } : {}),
  })
})
