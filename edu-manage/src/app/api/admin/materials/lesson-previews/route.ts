import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { isWeekendLesson } from '@/lib/lesson-preview'
import {
  LessonPreviewPublishError,
  persistPreparedLessonPreviewMaterial,
  prepareLessonPreviewMaterial,
  validateLessonPreviewFile,
} from '@/lib/lesson-preview-material'

export const dynamic = 'force-dynamic'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_BATCH_FILE_SIZE = 200 * 1024 * 1024

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const selectedTerm = await resolveAdminTermScope(admin.prisma, admin.division, request)
  const grade = request.nextUrl.searchParams.get('grade')?.trim() || ''
  const date = request.nextUrl.searchParams.get('date')?.trim() || todayLocal()
  if (!DATE_PATTERN.test(date)) return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })

  const courseRows = selectedTerm ? await admin.prisma.course.findMany({
    where: {
      division: admin.division,
      deletedAt: null,
      isActive: true,
      grade: { not: null },
      classGroups: { some: { termId: selectedTerm.id, deletedAt: null } },
    },
    select: { grade: true },
    distinct: ['grade'],
    orderBy: { grade: 'asc' },
  }) : []
  const grades = courseRows.map((item) => item.grade).filter((item): item is string => Boolean(item))
  if (!selectedTerm || !grade) {
    return NextResponse.json({ grades, lessons: [], selectedTerm, date }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
    })
  }

  const range = getLocalDayRange(date)
  const rows = await admin.prisma.classLesson.findMany({
    where: {
      division: admin.division,
      deletedAt: null,
      lessonDate: { gte: range.start, lt: range.end },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      group: {
        termId: selectedTerm.id,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        course: { grade, deletedAt: null },
      },
    },
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      subject: true,
      teacher: { select: { id: true, name: true } },
      lessonStudents: { select: { studentId: true } },
      group: {
        select: {
          name: true,
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { subject: true, teacher: { select: { id: true, name: true } } } },
          term: { select: { kind: true } },
          course: { select: { subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: { deletedAt: null, status: { not: 'INACTIVE' } } },
            select: { studentId: true },
          },
        },
      },
      lessonPreviewMaterial: {
        select: { id: true, fileName: true, uploadedByRole: true, status: true, createdAt: true },
      },
    },
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    take: 200,
  })

  const lessons = rows
    .filter((lesson) => isWeekendLesson(lesson.lessonDate, lesson.group.term?.kind))
    .map((lesson) => {
      const subject = lesson.subject || lesson.group.course.subject
      const subjectTeacher = lesson.group.teacherAssignments.find((item) => item.subject === subject)?.teacher
      const teacher = lesson.teacher || subjectTeacher || lesson.group.teacher
      const material = lesson.lessonPreviewMaterial?.status === 'DELETED' ? null : lesson.lessonPreviewMaterial
      return {
        id: lesson.id,
        lessonDate: localDateKey(lesson.lessonDate),
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        subject,
        groupName: lesson.group.name,
        teacherId: teacher?.id || null,
        teacherName: teacher?.name || '教师待定',
        studentCount: lesson.lessonStudents.length || lesson.group.enrollments.length,
        material: material ? {
          id: material.id,
          fileName: material.fileName,
          uploadedByRole: material.uploadedByRole,
          createdAt: material.createdAt,
        } : null,
      }
    })

  return NextResponse.json({ grades, lessons, selectedTerm, date }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})

type Assignment = { fileKey?: unknown; lessonId?: unknown; title?: unknown }

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const formData = await request.formData()
  let assignments: Assignment[] = []
  try {
    const parsed = JSON.parse(String(formData.get('assignments') || '[]'))
    assignments = Array.isArray(parsed) ? parsed : []
  } catch {
    return NextResponse.json({ error: '文件分配信息格式不正确' }, { status: 400 })
  }
  if (!assignments.length) return NextResponse.json({ error: '请至少分配一份讲义' }, { status: 400 })
  if (assignments.length > 20) return NextResponse.json({ error: '单次最多发布 20 份讲义' }, { status: 400 })

  const normalized = assignments.map((item) => ({
    fileKey: typeof item.fileKey === 'string' ? item.fileKey : '',
    lessonId: typeof item.lessonId === 'string' ? item.lessonId : '',
    title: typeof item.title === 'string' ? item.title : '',
  }))
  if (normalized.some((item) => !item.fileKey || !item.lessonId)) {
    return NextResponse.json({ error: '存在尚未完成的文件分配' }, { status: 400 })
  }
  if (new Set(normalized.map((item) => item.lessonId)).size !== normalized.length) {
    return NextResponse.json({ error: '同一个课次不能同时分配两份文件' }, { status: 409 })
  }

  const files = normalized.map((item) => formData.get(item.fileKey))
  if (files.some((file) => !(file instanceof File))) {
    return NextResponse.json({ error: '部分讲义文件缺失，请重新选择' }, { status: 400 })
  }
  if (files.reduce((total, file) => total + (file instanceof File ? file.size : 0), 0) > MAX_BATCH_FILE_SIZE) {
    return NextResponse.json({ error: '单批文件总大小不能超过 200MB' }, { status: 413 })
  }
  try {
    files.forEach((file) => validateLessonPreviewFile(file as File))
    const lessonIds = normalized.map((item) => item.lessonId)
    const lessons = await admin.prisma.classLesson.findMany({
      where: {
        id: { in: lessonIds },
        division: admin.division,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: { deletedAt: null, status: { not: 'ARCHIVED' }, term: { status: 'ACTIVE' } },
      },
      select: {
        id: true,
        teacherId: true,
        subject: true,
        lessonDate: true,
        group: {
          select: {
            teacherId: true,
            teacherAssignments: { select: { teacherId: true, subject: true } },
            term: { select: { kind: true } },
            course: { select: { grade: true, subject: true } },
          },
        },
      },
    })
    const validLessonIds = new Set(lessons.filter((lesson) => {
      const subject = lesson.subject || lesson.group.course.subject
      const teacherId = lesson.teacherId
        || lesson.group.teacherAssignments.find((item) => item.subject === subject)?.teacherId
        || lesson.group.teacherId
      return Boolean(
        teacherId
        && subject
        && lesson.group.course.grade
        && isWeekendLesson(lesson.lessonDate, lesson.group.term?.kind),
      )
    }).map((lesson) => lesson.id))
    if (validLessonIds.size !== lessonIds.length) {
      return NextResponse.json({ error: '部分课次已失效或缺少教师、年级、学科信息，请刷新后重试' }, { status: 409 })
    }
    const existing = await admin.prisma.studyMaterial.findMany({
      where: { classLessonId: { in: lessonIds }, status: { not: 'DELETED' } },
      select: { classLessonId: true },
    })
    if (existing.length) {
      return NextResponse.json({ error: '部分课次已有讲义，请刷新清单后重新选择' }, { status: 409 })
    }

    const preparedMaterials: Awaited<ReturnType<typeof prepareLessonPreviewMaterial>>[] = []
    for (const [index, item] of normalized.entries()) {
      preparedMaterials.push(await prepareLessonPreviewMaterial({
        prisma: admin.prisma,
        actor: { role: 'ADMIN', userId: admin.id, division: admin.division },
        classLessonId: item.lessonId,
        file: files[index] as File,
        title: item.title,
      }))
    }
    const materials = await admin.prisma.$transaction((tx) => Promise.all(
      preparedMaterials.map((prepared) => persistPreparedLessonPreviewMaterial(tx, prepared)),
    ))
    return NextResponse.json({ count: materials.length, materialIds: materials.map((item) => item.id) }, { status: 201 })
  } catch (error) {
    if (error instanceof LessonPreviewPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
