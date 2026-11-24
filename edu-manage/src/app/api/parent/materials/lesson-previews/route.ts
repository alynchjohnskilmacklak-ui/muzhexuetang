import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import { parentActiveEnrollmentWhere, parentVisibleLessonWhere } from '@/lib/business-visibility'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const lessons = await prisma.classLesson.findMany({
    where: parentVisibleLessonWhere(session.user.id),
    select: {
      id: true,
      teacherId: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      subject: true,
      lessonStudents: { select: { studentId: true } },
      group: {
        select: {
          name: true,
          teacherId: true,
          teacherAssignments: { select: { teacherId: true } },
          course: { select: { subject: true } },
          enrollments: {
            where: parentActiveEnrollmentWhere(session.user.id),
            select: { studentId: true, subjects: true, student: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'asc' }],
    take: 500,
  })
  const visibleLessonIds = lessons.map((lesson) => lesson.id)
  const materials = await prisma.studyMaterial.findMany({
    where: {
      isLessonPreview: true,
      status: 'PUBLISHED',
      deletedAt: null,
      audience: { in: ['STUDENT', 'BOTH'] },
      classLessonId: { in: visibleLessonIds },
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileType: true,
      subject: true,
      description: true,
      createdAt: true,
      classLessonId: true,
      teacherId: true,
      teacher: { select: { name: true } },
      classLesson: {
        select: { lessonDate: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 240,
  })

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const visibleMaterials = materials.flatMap((material) => {
    if (!material.classLesson || !material.classLessonId) return []
    const lesson = lessonsById.get(material.classLessonId)
    if (!lesson) return []
    const lessonSubject = lesson.subject || lesson.group.course?.subject
    if (lessonSubject && material.subject !== lessonSubject) return []
    const parentStudentIds = new Set(lesson.group.enrollments.map((item) => item.studentId))
    const lessonRosterIds = resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((item) => item.studentId),
      lesson.group.enrollments,
      lessonSubject,
      lesson.lessonDate,
    )
    const visibleStudentIds = new Set(lessonRosterIds.filter((id) => parentStudentIds.has(id)))
    const studentNames = [...new Set(lesson.group.enrollments
      .filter((item) => visibleStudentIds.has(item.studentId))
      .map((item) => item.student.name))]
    if (studentNames.length === 0) return []
    return [{
      id: material.id,
      title: material.title,
      fileName: material.fileName,
      fileType: material.fileType,
      description: material.description,
      createdAt: material.createdAt,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      subject: material.subject,
      teacherName: material.teacher?.name || '授课老师',
      groupName: lesson.group.name,
      studentNames,
    }]
  })

  return NextResponse.json({
    materials: visibleMaterials,
  })
})
