/**
 * 统一学生档案服务。
 * 聚合 Student, ClassGroup/ClassLesson/Enrollment, Attendance,
 * ClassroomFeedback, PerformancePost, GradeRecord, ExamPaper,
 * WeaknessRecord, LearningGoal, StageSummary, AchievementBadge,
 * FileAsset 等数据。
 *
 * 根据 viewer 角色（admin/teacher/parent）返回不同范围。
 */

import type { PrismaClient } from '@prisma/client'
import { getStudentProfile, type ProfileRange, type StudentProfile } from '@/lib/student-profile'

// ---- types ----

export interface ArchiveViewer {
  role: 'admin' | 'teacher' | 'parent'
  userId: string
  teacherId?: string | null
  division?: string
  /** 家长绑定的学生 ID 列表（parent 角色时必填） */
  parentStudentIds?: string[]
}

export interface StudentBasic {
  id: string
  name: string
  grade: string | null
  school: string | null
  phone: string | null
  parentName: string | null
  mainTeacher: string | null
  status: string | null
  remainHours: number
  totalHours: number
}

export interface ArchiveCourses {
  classGroups: Array<{
    id: string; name: string; courseName: string; courseSubject: string
    courseType: string; teacherNames: string[]; status: string
    startDate: Date | null; recurringDays: string[]
  }>
  recentLessons: Array<{
    id: string; groupId: string; lessonDate: Date; startTime: string; endTime: string
    status: string; courseName: string; teacherName: string
  }>
  upcomingLessons: Array<{
    id: string; groupId: string; lessonDate: Date; startTime: string; endTime: string
    courseName: string; teacherName: string
  }>
  teachers: Array<{ id: string; name: string; subjects: string[] }>
}

export interface ArchiveAttendance {
  records: Array<{
    id: string; lessonId: string | null; lessonDate: Date
    startTime: string; endTime: string; status: string
    courseName: string; hoursDeducted: number
  }>
  summary: { total: number; present: number; leave: number; absent: number; makeup: number; rate: number | null }
  leaveRecords: Array<{ id: string; leaveDate: string; reason: string; status: string }>
  makeupRecords: Array<{ id: string; originalLessonDate: Date; status: string }>
}

export interface ArchiveFeedback {
  id: string; lessonId: string | null; classGroupId: string | null
  teacher: { id: string; name: string } | null
  studentIds: string[]
  knowledgePoints: string[]
  summary: string | null
  homework: unknown
  overallComment: string | null
  mood: string | null
  tags: string[]
  studentRatings: unknown
  imageUrls: string[]
  parentReply: string | null
  parentRepliedAt: Date | null
  adminReply: string | null
  createdAt: Date
  status: string
}

export interface ArchiveTimelineItem {
  id: string
  type: 'paper' | 'feedback' | 'post' | 'badge' | 'grade' | 'goal' | 'attendance' | 'highlight'
  title: string
  content: string | null
  date: Date
  teacher: string | null
  studentId: string | null
  sourceId: string | null
  images: string[]
  href: string | null
}

export interface StudentArchive {
  studentBasic: StudentBasic
  courses: ArchiveCourses
  attendance: ArchiveAttendance
  feedbacks: ArchiveFeedback[]
  profile: StudentProfile | null
  files: Array<{ id: string; name: string; url: string; type: string; mimeType: string; size: number; createdAt: Date }>
  timeline: ArchiveTimelineItem[]
}

// ---- main function ----

export async function getStudentArchive(
  prisma: PrismaClient,
  studentId: string,
  viewer: ArchiveViewer,
  range?: ProfileRange,
): Promise<StudentArchive | null> {
  // Permission check
  await assertArchiveAccess(prisma, studentId, viewer)

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const from = range?.from || defaultFrom
  const to = range?.to || now

  const [student, profile] = await Promise.all([
    fetchStudentBasic(prisma, studentId),
    getStudentProfile(prisma, studentId, { from, to }),
  ])
  if (!student) return null

  const [courses, attendance, feedbacks, files, timeline] = await Promise.all([
    fetchCourses(prisma, studentId),
    fetchAttendance(prisma, studentId),
    fetchFeedbacks(prisma, studentId, viewer),
    fetchFiles(prisma, studentId, viewer),
    fetchTimeline(prisma, studentId, from, to),
  ])

  return { studentBasic: student, courses, attendance, feedbacks, profile, files, timeline }
}

// ---- permission ----

async function assertArchiveAccess(prisma: PrismaClient, studentId: string, viewer: ArchiveViewer) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { division: true, parentUserId: true, id: true } })
  if (!student) throw new ArchiveAccessError('学生不存在', 404)

  if (viewer.division && student.division && student.division !== viewer.division) {
    throw new ArchiveAccessError('跨部数据不可访问', 403)
  }

  if (viewer.role === 'parent') {
    const ids = viewer.parentStudentIds || []
    if (!ids.includes(studentId)) throw new ArchiveAccessError('无权访问该学生档案', 403)
  }

  if (viewer.role === 'teacher') {
    const tid = viewer.teacherId
    if (!tid) throw new ArchiveAccessError('未绑定教师档案', 403)
    const enr = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        group: {
          OR: [
            { teacherId: tid },
            { teacherAssignments: { some: { teacherId: tid } } },
          ],
        },
      },
      select: { id: true },
    })
    if (!enr) throw new ArchiveAccessError('无权访问该学生档案', 403)
  }
  // admin: always allowed within division
}

export class ArchiveAccessError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

// ---- data fetchers ----

async function fetchStudentBasic(prisma: PrismaClient, studentId: string): Promise<StudentBasic | null> {
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true, name: true, grade: true, school: true, phone: true,
      parentName: true, parentPhone: true,
      totalHours: true, remainHours: true, status: true,
      mainTeacher: { select: { name: true } },
    },
  })
  if (!s) return null
  return {
    id: s.id, name: s.name, grade: s.grade, school: s.school, phone: s.phone,
    parentName: s.parentName || s.parentPhone || null,
    mainTeacher: s.mainTeacher?.name || null,
    status: s.status, remainHours: s.remainHours, totalHours: s.totalHours,
  }
}

async function fetchCourses(prisma: PrismaClient, studentId: string): Promise<ArchiveCourses> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: 'ACTIVE' },
    include: {
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, type: true } },
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } } },
        },
      },
    },
  })

  const classGroups = enrollments.map(e => ({
    id: e.group.id, name: e.group.name, courseName: e.group.course?.name || '-',
    courseSubject: e.group.course?.subject || '', courseType: e.group.course?.type || '',
    teacherNames: [e.group.teacher, ...e.group.teacherAssignments.map(a => a.teacher)]
      .filter(Boolean).map(t => t!.name).filter((v, i, a) => a.indexOf(v) === i),
    status: e.group.status, startDate: e.group.startDate,
    recurringDays: (e.group.recurringDays as string[]) || [],
  }))

  const groupIds = enrollments.map(e => e.groupId)

  const [recent, upcoming] = await Promise.all([
    prisma.classLesson.findMany({
      where: { groupId: { in: groupIds }, lessonDate: { lte: new Date() }, status: { not: 'CANCELLED' } },
      orderBy: { lessonDate: 'desc' }, take: 10,
      include: { group: { include: { course: { select: { name: true } }, teacher: { select: { name: true } } } }, teacher: { select: { name: true } } },
    }),
    prisma.classLesson.findMany({
      where: { groupId: { in: groupIds }, lessonDate: { gte: new Date() }, status: { not: 'CANCELLED' } },
      orderBy: { lessonDate: 'asc' }, take: 10,
      include: { group: { include: { course: { select: { name: true } }, teacher: { select: { name: true } } } }, teacher: { select: { name: true } } },
    }),
  ])

  const allTeachers = enrollments.flatMap(e =>
    [e.group.teacher, ...e.group.teacherAssignments.map(a => a.teacher)]
  ).filter(Boolean)

  return {
    classGroups,
    recentLessons: recent.map(l => ({
      id: l.id, groupId: l.groupId, lessonDate: l.lessonDate, startTime: l.startTime, endTime: l.endTime,
      status: l.status, courseName: l.group?.course?.name || '-', teacherName: l.teacher?.name || l.group?.teacher?.name || '-',
    })),
    upcomingLessons: upcoming.map(l => ({
      id: l.id, groupId: l.groupId, lessonDate: l.lessonDate, startTime: l.startTime, endTime: l.endTime,
      courseName: l.group?.course?.name || '-', teacherName: l.teacher?.name || l.group?.teacher?.name || '-',
    })),
    teachers: allTeachers.filter((t, i, a) => a.findIndex(x => x?.id === t?.id) === i).map(t => ({
      id: t!.id, name: t!.name, subjects: (t as { subjects?: string[] }).subjects || [],
    })),
  }
}

async function fetchAttendance(prisma: PrismaClient, studentId: string): Promise<ArchiveAttendance> {
  const records = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      lesson: { select: { lessonDate: true, startTime: true, endTime: true, group: { select: { course: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' }, take: 100,
  })

  const statusCount = { PRESENT: 0, LEAVE: 0, ABSENT: 0, MAKEUP: 0 }
  for (const r of records) statusCount[r.status as keyof typeof statusCount] = (statusCount[r.status as keyof typeof statusCount] || 0) + 1

  const leaves = await prisma.leaveRequest.findMany({
    where: { studentId }, orderBy: { createdAt: 'desc' }, take: 20,
  })
  const makeups = await prisma.makeupRequest.findMany({
    where: { studentId }, orderBy: { createdAt: 'desc' }, take: 20,
  })

  const total = records.length
  const present = statusCount.PRESENT + statusCount.MAKEUP

  return {
    records: records.map(r => ({
      id: r.id, lessonId: r.lessonId, lessonDate: r.lesson?.lessonDate || new Date(0),
      startTime: r.lesson?.startTime || '', endTime: r.lesson?.endTime || '',
      status: r.status, courseName: r.lesson?.group?.course?.name || '-', hoursDeducted: r.hoursDeducted || 0,
    })),
    summary: { total, present, leave: statusCount.LEAVE, absent: statusCount.ABSENT, makeup: statusCount.MAKEUP, rate: total ? Math.round((present / total) * 100) : null },
    leaveRecords: leaves.map(l => ({ id: l.id, leaveDate: l.leaveDate?.toISOString?.()?.slice(0, 10) || '', reason: l.reason || '', status: l.status })),
    makeupRecords: makeups.map(m => ({ id: m.id, originalLessonDate: m.createdAt, status: m.status })),
  }
}

async function fetchFeedbacks(prisma: PrismaClient, studentId: string, viewer: ArchiveViewer): Promise<ArchiveFeedback[]> {
  const where: Record<string, unknown> = { studentIds: { has: studentId } }
  if (viewer.role === 'parent') where.status = 'PUBLISHED'

  const feedbacks = await prisma.classroomFeedback.findMany({
    where,
    include: { teacher: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }, take: 50,
  })

  return feedbacks.map(f => ({
    id: f.id, lessonId: f.classLessonId, classGroupId: null,
    teacher: f.teacher ? { id: f.teacher.id, name: f.teacher.name } : null,
    studentIds: f.studentIds, knowledgePoints: f.knowledgePoints,
    summary: f.summary, homework: f.homework, overallComment: f.overallComment,
    mood: f.mood, tags: f.tags, studentRatings: f.studentRatings,
    imageUrls: f.imageUrls, parentReply: f.parentReply, parentRepliedAt: f.parentRepliedAt,
    adminReply: f.adminReply, createdAt: f.createdAt, status: f.status,
  }))
}

async function fetchFiles(prisma: PrismaClient, studentId: string, viewer: ArchiveViewer) {
  try {
    const files = await (prisma as unknown as Record<string, unknown>).fileAsset ? (prisma as unknown as { fileAsset: { findMany: Function } }).fileAsset.findMany({
      where: { studentId, deletedAt: null },
      orderBy: { createdAt: 'desc' as const }, take: 50,
      select: { id: true, filename: true, url: true, mimeType: true, ownerType: true, size: true, createdAt: true },
    }) : []
    return (files as Array<Record<string, unknown>>).map(f => ({
      id: f.id as string, name: f.filename as string, url: f.url as string,
      type: f.ownerType as string, mimeType: f.mimeType as string, size: f.size as number, createdAt: f.createdAt as Date,
    }))
  } catch { return [] }
}

async function fetchTimeline(prisma: PrismaClient, studentId: string, from: Date, to: Date): Promise<ArchiveTimelineItem[]> {
  const items: ArchiveTimelineItem[] = []

  const [feedbacks, posts, badges, highlights] = await Promise.all([
    prisma.classroomFeedback.findMany({
      where: { studentIds: { has: studentId }, status: 'PUBLISHED', createdAt: { gte: from, lte: to } },
      select: { id: true, summary: true, imageUrls: true, createdAt: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 30,
    }),
    prisma.performancePost.findMany({
      where: { studentId, createdAt: { gte: from, lte: to } },
      select: { id: true, content: true, images: true, createdAt: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 30,
    }),
    prisma.achievementBadge.findMany({
      where: { studentId, earnedAt: { gte: from, lte: to } },
      select: { id: true, badgeType: true, description: true, earnedAt: true },
      orderBy: { earnedAt: 'desc' }, take: 20,
    }),
    prisma.classHighlight.findMany({
      where: { studentId, createdAt: { gte: from, lte: to } },
      select: { id: true, content: true, imageUrl: true, createdAt: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 20,
    }),
  ])

  for (const f of feedbacks) items.push({
    id: f.id, type: 'feedback', title: '课堂反馈', content: f.summary || null,
    date: f.createdAt, teacher: f.teacher?.name || null, studentId,
    sourceId: f.id, images: f.imageUrls || [],
    href: `/parent/growth?studentId=${studentId}&feedbackId=${f.id}`,
  })
  for (const p of posts) items.push({
    id: p.id, type: 'post', title: '成长动态', content: p.content,
    date: p.createdAt, teacher: p.teacher?.name || null, studentId,
    sourceId: p.id, images: p.images || [],
    href: `/parent/growth?studentId=${studentId}&postId=${p.id}`,
  })
  for (const b of badges) items.push({
    id: b.id, type: 'badge', title: `获得徽章「${b.badgeType}」`, content: b.description || null,
    date: b.earnedAt, teacher: null, studentId, sourceId: b.id, images: [],
    href: null,
  })
  for (const h of highlights) items.push({
    id: h.id, type: 'highlight', title: '课堂高光', content: h.content,
    date: h.createdAt, teacher: h.teacher?.name || null, studentId,
    sourceId: h.id, images: h.imageUrl ? [h.imageUrl] : [],
    href: null,
  })

  items.sort((a, b) => b.date.getTime() - a.date.getTime())
  return items.slice(0, 60)
}

/** 兼容旧 API 的快捷导出 */
export { getStudentProfile, type StudentProfile, type ProfileRange }
