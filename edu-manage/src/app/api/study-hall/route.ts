import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { todayLocal } from '@/lib/date/local-day'
import { isUserActive } from '@/lib/user-status'
import { protectedUploadFallback } from '@/lib/upload-url'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { sendWxMessage } from '@/lib/wxpusher'
import {
  attendanceKey, calculatePurchasedDayBalance, dateKey,
  isScheduledDate, isoWeekday, parseDateKey,
} from '@/lib/study-hall/domain'
import { canRecordStudyHallClass } from '@/lib/study-hall/access'

export const dynamic = 'force-dynamic'

const HOMEWORK_STATUSES = ['NOT_RECORDED', 'COMPLETED', 'PARTIAL', 'NEEDS_FOLLOW_UP'] as const
const CLASS_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'] as const
const SCHEDULE_TYPES = ['WEEKDAY_LATE', 'WEEKEND'] as const

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || null : null
}

function cleanList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength)).filter(Boolean))].slice(0, maxItems)
}

function cleanImages(value: unknown) {
  return cleanList(value, 9, 500).map(protectedUploadFallback)
    .filter((item): item is string => Boolean(item) && item.startsWith('/api/uploads/'))
}

function parseClassInput(body: Record<string, unknown>) {
  const scheduleType = SCHEDULE_TYPES.includes(body.scheduleType as typeof SCHEDULE_TYPES[number])
    ? body.scheduleType as typeof SCHEDULE_TYPES[number] : 'WEEKDAY_LATE'
  const weekdays = [...new Set((Array.isArray(body.weekdays) ? body.weekdays : []).map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort()
  if (!weekdays.length) throw new Error('请至少选择一个上课日')
  if (scheduleType === 'WEEKDAY_LATE' && weekdays.some((day) => day > 5)) throw new Error('晚托班只能选择周一至周五')
  if (scheduleType === 'WEEKEND' && weekdays.some((day) => day < 6)) throw new Error('周末作业班只能选择周六、周日')
  const sessions = (Array.isArray(body.sessions) ? body.sessions : []).map((raw, index) => {
    const item = raw as Record<string, unknown>
    const weekday = Number(item.weekday)
    const startTime = cleanText(item.startTime, 5)
    const endTime = cleanText(item.endTime, 5)
    const teacherId = cleanText(item.teacherId, 80)
    const subject = cleanText(item.subject, 30)
    if (!weekdays.includes(weekday) || !startTime || !endTime || !teacherId || !subject || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
      throw new Error('周末作业班时段设置不完整或时间不正确')
    }
    const period = startTime < '12:00' ? '上午' : startTime < '18:00' ? '下午' : '晚上'
    return { weekday, slot: `${weekday}-${startTime.replace(':', '')}-${index + 1}`, label: `${subject}·${period}`, startTime, endTime, teacherId, subject }
  })
  if (scheduleType === 'WEEKEND' && !sessions.length) throw new Error('周末作业班至少需要一个上课时段')
  if (new Set(sessions.map((item) => `${item.weekday}:${item.startTime}:${item.endTime}`)).size !== sessions.length) {
    throw new Error('同一天不能设置完全相同的上课时间')
  }
  const studentMemberships = (Array.isArray(body.studentMemberships) ? body.studentMemberships : []).map((raw) => {
    const item = raw as Record<string, unknown>
    const studentId = cleanText(item.studentId, 80)
    const purchasedDays = item.purchasedDays === null || item.purchasedDays === undefined || item.purchasedDays === '' ? null : Number(item.purchasedDays)
    if (!studentId || (purchasedDays != null && (!Number.isInteger(purchasedDays) || purchasedDays <= 0 || purchasedDays > 366))) throw new Error('学员或购买天数填写不正确')
    return { studentId, purchasedDays }
  })
  const legacyStudentIds = cleanList(body.studentIds, 1000, 80)
  const normalizedMemberships = studentMemberships.length ? studentMemberships : legacyStudentIds.map((studentId) => ({ studentId, purchasedDays: null }))
  if (new Set(normalizedMemberships.map((item) => item.studentId)).size !== normalizedMemberships.length) throw new Error('同一学员不能重复加入一个班级')
  const gradeScope = cleanList(body.gradeScope, 12, 20)
  if (gradeScope.length !== 1) throw new Error('一个作业班必须对应一个年级，请为不同年级分别建班')
  const sessionTeacherIds = sessions.map((item) => item.teacherId)
  return {
    name: cleanText(body.name, 80), scheduleType, weekdays,
    gradeScope,
    timeWindowStart: cleanText(body.timeWindowStart, 5), timeWindowEnd: cleanText(body.timeWindowEnd, 5),
    teacherIds: scheduleType === 'WEEKEND' ? [...new Set(sessionTeacherIds)] : cleanList(body.teacherIds, 100, 80),
    studentMemberships: normalizedMemberships,
    studentIds: normalizedMemberships.map((item) => item.studentId), sessions,
  }
}

async function validateMembers(
  prisma: Awaited<ReturnType<typeof requireAuthenticatedUser>>['prisma'], division: string,
  termId: string, teacherIds: string[], studentIds: string[], sessions: Array<{ teacherId: string; subject: string }> = [],
) {
  if (!teacherIds.length) throw new Error('请至少分配一名负责教师')
  const [teachers, memberships] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: teacherIds }, role: 'teacher', division }, select: { id: true, status: true, teacher: { select: { subjects: true } } } }),
    prisma.studentTermMembership.findMany({ where: { termId, studentId: { in: studentIds }, status: 'ACTIVE', student: { division } }, select: { studentId: true } }),
  ])
  if (teachers.filter((teacher) => isUserActive(teacher.status)).length !== teacherIds.length) throw new Error('负责教师包含无效账号或其他学部账号')
  for (const session of sessions) {
    const teacher = teachers.find((item) => item.id === session.teacherId)
    const subjects = (teacher?.teacher?.subjects || '').split(/[,，、/\s]+/).map((item) => item.trim()).filter(Boolean)
    if (!subjects.includes(session.subject)) throw new Error('周末课程的学科必须来自所选老师的任教学科')
  }
  if (memberships.length !== studentIds.length) throw new Error('学员不在当前运营期名单中')
}

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (!['admin', 'teacher'].includes(user.role)) return NextResponse.json({ error: '无权访问作业班管理' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const studyDate = searchParams.get('date') || todayLocal()
  try { parseDateKey(studyDate) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  const scopedTerm = user.role === 'admin' ? await resolveAdminTermScope(user.prisma, user.division, request) : null
  const terms = await user.prisma.academicTerm.findMany({
    where: { division: user.division, status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { id: true, name: true, status: true, startDate: true, endDate: true }, orderBy: { startDate: 'desc' },
  })
  const selectedTermId = user.role === 'admin' ? scopedTerm?.id : searchParams.get('termId') || terms.find((term) => term.status === 'ACTIVE')?.id
  if (!selectedTermId) return NextResponse.json({ terms, classes: [], students: [], teachers: [], studyDate, contextState: 'NO_ACTIVE_TERM', contextMessage: '当前尚未启用运营期。' })
  const classes = await user.prisma.studyHallClass.findMany({
    where: { termId: selectedTermId, division: user.division, ...(user.role === 'teacher' ? { status: 'ACTIVE', teachers: { some: { teacherId: user.id, active: true } } } : {}) },
    include: {
      term: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      teachers: { include: { teacher: { select: { id: true, name: true, email: true } } }, orderBy: { assignedAt: 'desc' } },
      sessions: { include: { teacher: { select: { id: true, name: true } } }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
      students: { include: { student: { select: { id: true, name: true, grade: true, school: true } } }, orderBy: { student: { name: 'asc' } } },
      records: { where: { studyDate: parseDateKey(studyDate) }, include: { recordedBy: { select: { id: true, name: true, role: true } }, entries: true }, take: 1 },
    }, orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
  const attendanceRows = classes.length ? await user.prisma.studyHallHomeworkEntry.findMany({
    where: { OR: [{ checkedIn: true }, { attendanceStatus: { in: ['PERSONAL_LEAVE', 'ABSENT'] } }], classRecord: { classId: { in: classes.map((item) => item.id) } } },
    select: { studentId: true, classRecord: { select: { classId: true, studyDate: true } } },
  }) : []
  const normalized = classes.map((studyClass) => {
    const balances = studyClass.students.map((member) => {
      const dates = attendanceRows.filter((row) => row.classRecord.classId === studyClass.id && row.studentId === member.studentId).map((row) => dateKey(row.classRecord.studyDate))
      return { membershipId: member.id, studentId: member.studentId, ...calculatePurchasedDayBalance(member.purchasedDays, member.adjustedDays, dates) }
    })
    return { ...studyClass, balances }
  })
  const [memberships, teacherUsers] = user.role === 'admin' ? await Promise.all([
    user.prisma.studentTermMembership.findMany({ where: { termId: selectedTermId, status: 'ACTIVE', student: { division: user.division } }, select: { student: { select: { id: true, name: true, grade: true } } }, orderBy: { student: { name: 'asc' } }, take: 1000 }),
    user.prisma.user.findMany({ where: { role: 'teacher', division: user.division }, select: { id: true, name: true, email: true, status: true, teacher: { select: { subjects: true } } }, orderBy: { name: 'asc' } }),
  ]) : [[], []]
  const closures = await user.prisma.studyHallClosure.findMany({
    where: { termId: selectedTermId, division: user.division, startDate: { lte: parseDateKey(studyDate) }, endDate: { gte: parseDateKey(studyDate) } },
    select: { id: true, classId: true, startDate: true, endDate: true, reason: true },
  })
  return NextResponse.json({ terms, classes: normalized, closures, students: memberships.map((item) => item.student), teachers: teacherUsers.filter((item) => isUserActive(item.status)), selectedTermId, studyDate, contextState: 'READY' })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (user.role !== 'admin') return NextResponse.json({ error: '仅管理员可以新建作业班' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  const termId = typeof body.termId === 'string' ? body.termId : ''
  let input: ReturnType<typeof parseClassInput>
  try { input = parseClassInput(body) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  if (!input.name) return NextResponse.json({ error: '请填写班级名称' }, { status: 400 })
  const term = await user.prisma.academicTerm.findFirst({ where: { id: termId, division: user.division, status: 'ACTIVE' }, select: { id: true } })
  if (!term) return NextResponse.json({ error: '只能在当前有效运营期新建作业班' }, { status: 409 })
  const duplicate = await user.prisma.studyHallClass.findFirst({ where: { termId, division: user.division, name: input.name }, select: { id: true } })
  if (duplicate) return NextResponse.json({ error: '当前运营期已存在同名作业班，请使用不同班名' }, { status: 409 })
  try { await validateMembers(user.prisma, user.division, termId, input.teacherIds, input.studentIds, input.sessions) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  const joinedAt = parseDateKey(typeof body.joinedAt === 'string' ? body.joinedAt : todayLocal())
  const studyClass = await user.prisma.studyHallClass.create({ data: {
    name: input.name, termId, division: user.division, scheduleType: input.scheduleType, gradeScope: input.gradeScope, weekdays: input.weekdays,
    timeWindowStart: input.timeWindowStart, timeWindowEnd: input.timeWindowEnd,
    teachers: { create: input.teacherIds.map((teacherId) => ({ teacherId })) },
    students: { create: input.studentMemberships.map(({ studentId, purchasedDays }) => ({ studentId, purchasedDays, joinedAt })) },
    sessions: { create: input.scheduleType === 'WEEKEND' ? input.sessions : [] },
  } })
  return NextResponse.json({ class: studyClass }, { status: 201 })
})

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (user.role !== 'admin') return NextResponse.json({ error: '仅管理员可以管理作业班' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  const classId = typeof body.classId === 'string' ? body.classId : ''
  const existing = await user.prisma.studyHallClass.findFirst({ where: { id: classId, division: user.division }, include: { term: { select: { status: true } }, teachers: true, students: true } })
  if (!existing) return NextResponse.json({ error: '作业班不存在' }, { status: 404 })
  if (existing.term.status !== 'ACTIVE') return NextResponse.json({ error: '历史运营期只能查看' }, { status: 409 })
  let input: ReturnType<typeof parseClassInput>
  try { input = parseClassInput(body); await validateMembers(user.prisma, user.division, existing.termId, input.teacherIds, input.studentIds, input.sessions) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  if (!input.name) return NextResponse.json({ error: '请填写班级名称' }, { status: 400 })
  const duplicate = await user.prisma.studyHallClass.findFirst({ where: { termId: existing.termId, division: user.division, name: input.name, id: { not: classId } }, select: { id: true } })
  if (duplicate) return NextResponse.json({ error: '当前运营期已存在同名作业班，请使用不同班名' }, { status: 409 })
  const status = CLASS_STATUSES.includes(body.status as typeof CLASS_STATUSES[number]) ? body.status as typeof CLASS_STATUSES[number] : existing.status
  const today = parseDateKey(todayLocal())
  await user.prisma.$transaction(async (tx) => {
    await tx.studyHallClass.update({ where: { id: classId }, data: { name: input.name!, scheduleType: input.scheduleType, gradeScope: input.gradeScope, weekdays: input.weekdays, timeWindowStart: input.timeWindowStart, timeWindowEnd: input.timeWindowEnd, status } })
    await tx.studyHallClassTeacher.updateMany({ where: { classId, active: true, teacherId: { notIn: input.teacherIds } }, data: { active: false, endedAt: new Date() } })
    const active = new Set(existing.teachers.filter((item) => item.active).map((item) => item.teacherId))
    for (const teacherId of input.teacherIds) if (!active.has(teacherId)) await tx.studyHallClassTeacher.create({ data: { classId, teacherId } })
    await tx.studyHallClassStudent.updateMany({ where: { classId, status: 'ACTIVE', studentId: { notIn: input.studentIds } }, data: { status: 'LEFT', leftAt: today } })
    for (const { studentId, purchasedDays } of input.studentMemberships) {
      const member = existing.students.find((item) => item.studentId === studentId)
      if (!member) await tx.studyHallClassStudent.create({ data: { classId, studentId, purchasedDays, joinedAt: today } })
      else await tx.studyHallClassStudent.update({ where: { id: member.id }, data: { status: 'ACTIVE', purchasedDays, joinedAt: member.status === 'LEFT' ? today : member.joinedAt, leftAt: null } })
    }
    await tx.studyHallSession.updateMany({ where: { classId }, data: { active: false } })
    if (input.scheduleType === 'WEEKEND') for (const session of input.sessions) await tx.studyHallSession.upsert({ where: { classId_weekday_slot: { classId, weekday: session.weekday, slot: session.slot } }, create: { classId, ...session }, update: { ...session, active: true } })
  })
  return NextResponse.json({ ok: true })
})

export const PATCH = apiHandler(async (request: NextRequest) => {
  const user = await requireAuthenticatedUser()
  if (!['admin', 'teacher'].includes(user.role)) return NextResponse.json({ error: '无权登记作业班' }, { status: 403 })
  const body = await request.json() as Record<string, unknown>
  const classId = typeof body.classId === 'string' ? body.classId : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null
  const studyDate = typeof body.studyDate === 'string' ? body.studyDate : ''
  let recordDate: Date
  try { recordDate = parseDateKey(studyDate) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  const studyClass = await user.prisma.studyHallClass.findFirst({ where: { id: classId, division: user.division }, include: {
    term: { select: { status: true, startDate: true, endDate: true } }, teachers: { where: { active: true }, select: { teacherId: true } },
    students: { where: { studentId }, include: { student: { select: { id: true, name: true, parentId: true, parentUserId: true, parent: { select: { wxpusherUid: true } } } } } },
    sessions: { where: { active: true } },
  } })
  if (!studyClass) return NextResponse.json({ error: '作业班不存在' }, { status: 404 })
  if (!canRecordStudyHallClass(user, { division: studyClass.division, status: studyClass.status, termStatus: studyClass.term.status, activeTeacherIds: studyClass.teachers.map((item) => item.teacherId) })) return NextResponse.json({ error: '只能登记分配给自己的有效作业班' }, { status: 403 })
  const member = studyClass.students[0]
  if (!member || member.status !== 'ACTIVE' || recordDate < member.joinedAt || (member.leftAt && recordDate > member.leftAt)) return NextResponse.json({ error: '该学员在所选日期不属于此班' }, { status: 409 })
  if (recordDate < studyClass.term.startDate || recordDate > studyClass.term.endDate || !isScheduledDate(studyDate, studyClass.weekdays)) return NextResponse.json({ error: '所选日期不是该班的可登记日期' }, { status: 409 })
  const closure = await user.prisma.studyHallClosure.findFirst({ where: { termId: studyClass.termId, division: studyClass.division, startDate: { lte: recordDate }, endDate: { gte: recordDate }, OR: [{ classId: null }, { classId }] }, select: { reason: true } })
  if (closure) return NextResponse.json({ error: `当天已设置放假：${closure.reason}，不需要登记，也不会扣天数` }, { status: 409 })
  const session = studyClass.scheduleType === 'WEEKEND' ? studyClass.sessions.find((item) => item.id === sessionId) || null : null
  if (studyClass.scheduleType === 'WEEKEND' && (!session || session.weekday !== isoWeekday(studyDate))) return NextResponse.json({ error: '请选择当天有效的周末时段' }, { status: 400 })
  if (studyClass.scheduleType === 'WEEKDAY_LATE' && sessionId) return NextResponse.json({ error: '晚托班不使用分段考勤' }, { status: 400 })
  const homeworkStatus = HOMEWORK_STATUSES.includes(body.homeworkStatus as typeof HOMEWORK_STATUSES[number]) ? body.homeworkStatus as typeof HOMEWORK_STATUSES[number] : 'NOT_RECORDED'
  const homeworkItems = cleanList(body.homeworkItems, 20, 120)
  const contentType = body.contentType === 'LESSON' ? 'LESSON' : 'HOMEWORK'
  const beforeImageUrls = cleanImages(body.beforeImageUrls)
  const afterImageUrls = cleanImages(body.afterImageUrls)
  const lessonImageUrls = cleanImages(body.lessonImageUrls)
  const groupedImages = contentType === 'LESSON' ? lessonImageUrls : [...beforeImageUrls, ...afterImageUrls]
  const imageUrls = cleanImages(groupedImages.length ? groupedImages : body.imageUrls)
  const attendanceStatus = ['PRESENT', 'PERSONAL_LEAVE', 'ABSENT', 'UNRECORDED'].includes(String(body.attendanceStatus))
    ? String(body.attendanceStatus) : body.checkedIn === true ? 'PRESENT' : 'UNRECORDED'
  const checkedIn = attendanceStatus === 'PRESENT'
  const consumesDay = ['PRESENT', 'PERSONAL_LEAVE', 'ABSENT'].includes(attendanceStatus)
  const checkedOut = body.checkedOut === true
  const now = new Date()
  const parentUserId = member.student.parentId || member.student.parentUserId
  const parentAccount = parentUserId
    ? await user.prisma.user.findUnique({ where: { id: parentUserId }, select: { wxpusherUid: true } })
    : null
  const salaryTeacherId = user.role === 'teacher'
    ? user.teacherId || (await user.prisma.user.findUnique({ where: { id: user.id }, select: { teacherId: true } }))?.teacherId || null
    : null
  const entryKey = attendanceKey(sessionId)
  const checkedInRows = await user.prisma.studyHallHomeworkEntry.findMany({
    where: { studentId, OR: [{ checkedIn: true }, { attendanceStatus: { in: ['PERSONAL_LEAVE', 'ABSENT'] } }], classRecord: { classId } },
    select: { classRecord: { select: { studyDate: true } } },
  })
  const checkedInDates = new Set(checkedInRows.map((item) => dateKey(item.classRecord.studyDate)))
  const balanceBefore = calculatePurchasedDayBalance(member.purchasedDays, member.adjustedDays, checkedInDates)
  if (consumesDay && !checkedInDates.has(studyDate) && balanceBefore.remainingDays !== null && balanceBefore.remainingDays <= 0) {
    return NextResponse.json({ error: '该学员购买天数已用完，请先续费或调整天数后再登记到勤' }, { status: 409 })
  }
  const result = await user.prisma.$transaction(async (tx) => {
    const classRecord = await tx.studyHallClassRecord.upsert({ where: { classId_studyDate: { classId, studyDate: recordDate } }, create: { classId, studyDate: recordDate, recordedById: user.id }, update: { recordedById: user.id } })
    const previous = await tx.studyHallHomeworkEntry.findUnique({ where: { classRecordId_studentId_attendanceKey: { classRecordId: classRecord.id, studentId, attendanceKey: entryKey } }, select: { checkInAt: true, checkOutAt: true } })
    const entry = await tx.studyHallHomeworkEntry.upsert({
      where: { classRecordId_studentId_attendanceKey: { classRecordId: classRecord.id, studentId, attendanceKey: entryKey } },
      create: { classRecordId: classRecord.id, studentId, sessionId, attendanceKey: entryKey, homeworkStatus, homeworkItems, teacherComment: cleanText(body.teacherComment, 500), contentType, beforeImageUrls, afterImageUrls, lessonImageUrls, imageUrls, attendanceStatus, checkedIn, checkInAt: checkedIn ? now : null, checkOutAt: checkedOut && checkedIn ? now : null },
      update: {
        homeworkStatus, homeworkItems, teacherComment: cleanText(body.teacherComment, 500), contentType, beforeImageUrls, afterImageUrls, lessonImageUrls, imageUrls,
        attendanceStatus, checkedIn,
        checkInAt: checkedIn ? previous?.checkInAt || now : null,
        checkOutAt: checkedOut && checkedIn ? previous?.checkOutAt || now : null,
      },
    })
    let notification = null
    let reward = { amount: 0, alreadyAwarded: false }
    if (salaryTeacherId && homeworkStatus !== 'NOT_RECORDED') {
      const existingReward = await tx.teacherSalaryTransaction.findUnique({
        where: { feedbackId_type: { feedbackId: entry.id, type: 'STUDY_HALL_BONUS' } },
        select: { id: true },
      })
      await tx.teacherSalaryTransaction.upsert({
        where: { feedbackId_type: { feedbackId: entry.id, type: 'STUDY_HALL_BONUS' } },
        update: {},
        create: {
          teacherId: salaryTeacherId,
          termId: studyClass.termId,
          type: 'STUDY_HALL_BONUS',
          amount: 0.5,
          feedbackId: entry.id,
          lessonDate: recordDate,
          description: `[小班课] 作业班登记奖励：${studyClass.name} · ${member.student.name}，0.50元/人`,
        },
      })
      reward = { amount: existingReward ? 0 : 0.5, alreadyAwarded: Boolean(existingReward) }
    }
    if (parentUserId) {
      const title = `${member.student.name}的${studyClass.scheduleType === 'WEEKEND' ? '周末作业班' : '晚托'}作业已更新`
      const content = `${studyDate}${session ? ` ${session.label}` : ''}：${homeworkItems.join('；') || (contentType === 'LESSON' ? '老师已更新今日讲解内容' : '老师已更新作业与到勤情况')}`.slice(0, 180)
      const old = await tx.notification.findFirst({ where: { userId: parentUserId, relatedType: 'STUDY_HALL_HOMEWORK', relatedId: entry.id, status: 'ACTIVE' }, select: { id: true } })
      const data = { title, content, type: 'STUDY_HALL_HOMEWORK', href: `/parent/study-hall?date=${studyDate}&entryId=${entry.id}`, link: '/parent/study-hall', studentId, senderId: user.id, read: false, readAt: null, pushStatus: parentAccount?.wxpusherUid ? 'pending' : 'none', pushError: null }
      notification = old ? await tx.notification.update({ where: { id: old.id }, data }) : await tx.notification.create({ data: { userId: parentUserId, relatedType: 'STUDY_HALL_HOMEWORK', relatedId: entry.id, ...data } })
    }
    return { entry, notification, reward }
  })
  if (consumesDay) checkedInDates.add(studyDate)
  else {
    const otherCheckedIn = await user.prisma.studyHallHomeworkEntry.count({
      where: { studentId, OR: [{ checkedIn: true }, { attendanceStatus: { in: ['PERSONAL_LEAVE', 'ABSENT'] } }], classRecord: { classId, studyDate: recordDate } },
    })
    if (!otherCheckedIn) checkedInDates.delete(studyDate)
  }
  const balance = calculatePurchasedDayBalance(member.purchasedDays, member.adjustedDays, checkedInDates)
  const wxUid = parentAccount?.wxpusherUid
  if (result.notification && wxUid) {
    const push = await sendWxMessage(wxUid, `【牧哲学堂】${result.notification.content}。请登录家长端查看照片和老师说明。`, '作业班更新通知')
    await user.prisma.notification.update({ where: { id: result.notification.id }, data: push.success ? { pushStatus: 'sent', sentAt: new Date(), pushError: null } : { pushStatus: 'failed', pushError: push.error?.slice(0, 500), attempts: { increment: 1 }, lastError: push.error?.slice(0, 500) } })
  }
  return NextResponse.json({ entry: result.entry, balance, notificationCreated: Boolean(result.notification), reward: result.reward })
})
