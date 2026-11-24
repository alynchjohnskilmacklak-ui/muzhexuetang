import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { isWeekendLesson } from '@/lib/lesson-preview'
import { lessonPreviewUploadGroupKey } from '@/lib/lesson-preview-groups'
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
      groupId: true,
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
            select: { studentId: true, subjects: true },
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
        groupId: lesson.groupId,
        lessonDate: localDateKey(lesson.lessonDate),
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        subject,
        groupName: lesson.group.name,
        teacherId: teacher?.id || null,
        teacherName: teacher?.name || '教师待定',
        studentCount: resolveSubjectLessonStudentIds(
          lesson.lessonStudents.map((item) => item.studentId),
          lesson.group.enrollments,
          subject,
          lesson.lessonDate,
        ).length,
        material: material ? {
          id: material.id,
          fileName: material.fileName,
          uploadedByRole: material.uploadedByRole,
          createdAt: material.createdAt,
        } : null,
        uploadGroupKey: lessonPreviewUploadGroupKey({
          id: lesson.id,
          groupId: lesson.groupId,
          subject: subject || '',
          teacherId: teacher?.id || null,
        }),
      }
    })

  return NextResponse.json({ grades, lessons, selectedTerm, date }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})

type Assignment = { fileKey?: unknown; lessonId?: unknown; lessonIds?: unknown; title?: unknown }

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
    lessonIds: Array.isArray(item.lessonIds)
      ? item.lessonIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : typeof item.lessonId === 'string' ? [item.lessonId] : [],
    title: typeof item.title === 'string' ? item.title : '',
  }))
  if (normalized.some((item) => !item.fileKey || !item.lessonIds.length)) {
    return NextResponse.json({ error: '存在尚未完成的文件分配' }, { status: 400 })
  }
  const allLessonIds = normalized.flatMap((item) => item.lessonIds)
  if (new Set(allLessonIds).size !== allLessonIds.length) {
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
    const lessonIds = allLessonIds
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
        groupId: true,
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
    const lessonDetails = new Map(lessons.map((lesson) => {
      const subject = lesson.subject || lesson.group.course.subject
      const teacherId = lesson.teacherId
        || lesson.group.teacherAssignments.find((item) => item.subject === subject)?.teacherId
        || lesson.group.teacherId
      return [lesson.id, {
        groupId: lesson.groupId,
        subject: subject?.trim() || '',
        teacherId,
        grade: lesson.group.course.grade,
        date: lesson.lessonDate.toISOString().slice(0, 10),
        valid: Boolean(teacherId && subject && lesson.group.course.grade && isWeekendLesson(lesson.lessonDate, lesson.group.term?.kind)),
      }] as const
    }))
    if (lessonDetails.size !== lessonIds.length || [...lessonDetails.values()].some((item) => !item.valid)) {
      return NextResponse.json({ error: '部分课次已失效或缺少教师、年级、学科信息，请刷新后重试' }, { status: 409 })
    }
    for (const assignment of normalized) {
      const details = assignment.lessonIds.map((id) => lessonDetails.get(id))
      if (details.some((item) => !item)) {
        return NextResponse.json({ error: '分配的课次不属于当前学部或已失效，请刷新后重试' }, { status: 409 })
      }
      const identity = new Set(details.map((item) => `${item!.groupId}::${item!.date}::${item!.subject}::${item!.teacherId}`))
      if (identity.size !== 1) {
        return NextResponse.json({ error: '同一份讲义只能合并同班级、同一天、同学科、同任课教师的课次' }, { status: 400 })
      }
    }
    const existing = await admin.prisma.studyMaterial.findMany({
      where: { classLessonId: { in: lessonIds }, status: { not: 'DELETED' } },
      select: { classLessonId: true },
    })
    if (existing.length) {
      return NextResponse.json({ error: '部分课次已有讲义，请刷新清单后重新选择' }, { status: 409 })
    }

    const preparedMaterials: Array<{ prepared: Awaited<ReturnType<typeof prepareLessonPreviewMaterial>>; lessonIds: string[] }> = []
    for (const [index, item] of normalized.entries()) {
      const prepared = await prepareLessonPreviewMaterial({
        prisma: admin.prisma,
        actor: { role: 'ADMIN', userId: admin.id, division: admin.division },
        classLessonId: item.lessonIds[0],
        file: files[index] as File,
        title: item.title,
      })
      preparedMaterials.push({ prepared, lessonIds: item.lessonIds })
    }
    const materials = await admin.prisma.$transaction(async (tx) => {
      const created = []
      for (const { prepared, lessonIds: assignedIds } of preparedMaterials) {
        created.push(await persistPreparedLessonPreviewMaterial(tx, prepared))
        const additionalIds = assignedIds.filter((id) => id !== prepared.data.classLessonId)
        for (const classLessonId of additionalIds) {
          await tx.studyMaterial.upsert({
            where: { classLessonId },
            create: { ...prepared.data, classLessonId },
            update: { ...prepared.data, classLessonId },
          })
        }
      }
      return created
    })
    return NextResponse.json({
      count: materials.length,
      sessionCount: allLessonIds.length,
      materialIds: materials.map((item) => item.id),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof LessonPreviewPublishError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
