import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { variantsForFeedback } from '@/lib/file-asset-variants'
import { signedFeedbackImageUrls } from '@/lib/classroom-feedback/signed-images'
import { LessonDetailClient } from './client'

export const dynamic = 'force-dynamic'

export default async function LessonDetailPage({
  searchParams,
}: {
  searchParams?: Promise<{ teacher?: string; course?: string; childId?: string; time?: string; room?: string; date?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const params = await searchParams
  const teacherParam = params?.teacher || ''
  const courseParam = params?.course || ''
  const childId = params?.childId || ''
  const timeParam = params?.time || ''
  const roomParam = params?.room || ''
  const lessonDateParam = params?.date || ''

  const db = await getRequestPrisma()
  const studentIds = (
    await db.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map((student) => student.id)
  const scopedStudentIds = childId && studentIds.includes(childId) ? [childId] : studentIds

  const teacher = teacherParam
    ? await db.teacher.findFirst({
        where: { name: teacherParam, status: { not: 'RESIGNED' } },
        select: {
          id: true,
          name: true,
          gender: true,
          avatar: true,
          education: true,
          university: true,
          major: true,
          graduationYear: true,
          currentUnit: true,
          subjects: true,
          bio: true,
          employmentType: true,
          tierLevel: true,
          rating: true,
          ratingCount: true,
        },
      })
    : null

  const courseClean = courseParam.replace(/^牧哲学堂/, '').trim()
  const visibilityWhere = {
    studentIds: { hasSome: scopedStudentIds },
    ...visibleClassroomFeedbackWhere,
    teacher: visibleTeacherWhere,
  }
  const include = {
    teacher: { select: { id: true, name: true, subjects: true } },
    term: { select: { name: true, status: true } },
    classLesson: {
      include: {
        group: { include: { course: true, room: true, teacherAssignments: { select: { teacherId: true, subject: true } } } },
      },
    },
  }

  let feedback = null
  if (teacher) {
    // 如果指定了课程日期，按日期+老师+课程名精确查询这节课的反馈
    if (lessonDateParam) {
      const dayStart = new Date(lessonDateParam)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(lessonDateParam)
      dayEnd.setHours(23, 59, 59, 999)
      feedback = await db.classroomFeedback.findFirst({
        where: {
          ...visibilityWhere,
          teacherId: teacher.id,
          createdAt: { gte: dayStart, lte: dayEnd },
          ...(courseClean ? {
            classLesson: { is: { group: { is: { course: { is: { name: { contains: courseClean } } } } } } },
          } : {}),
        },
        include,
        orderBy: { createdAt: 'desc' },
      })
    } else if (courseClean) {
      feedback = await db.classroomFeedback.findFirst({
        where: {
          ...visibilityWhere,
          teacherId: teacher.id,
          classLesson: { is: { group: { is: { course: { is: { name: { contains: courseClean } } } } } } },
        },
        include,
        orderBy: { createdAt: 'desc' },
      })
    }
    if (!feedback && !lessonDateParam) {
      feedback = await db.classroomFeedback.findFirst({
        where: { ...visibilityWhere, teacherId: teacher.id },
        include,
        orderBy: { createdAt: 'desc' },
      })
    }
  }

  let feedbackForParent: ReturnType<typeof redactFeedbackForParent> | null = null
  let imageUrls: string[] = []
  let signedThumbnails: Record<string, string> = {}
  if (feedback) {
    const redacted = redactFeedbackForParent(feedback, scopedStudentIds)
    feedbackForParent = {
      id: feedback.id,
      ...(redacted as Record<string, unknown>),
      knowledgeDetail: parseStoredKnowledgeCard((feedback as unknown as { knowledgeCard?: unknown }).knowledgeCard),
    } as unknown as ReturnType<typeof redactFeedbackForParent>
    imageUrls = (feedback as unknown as { imageUrls?: string[] }).imageUrls || []
    if (imageUrls.length) {
      const variants = variantsForFeedback(imageUrls, new Map())
      const keys = variants.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl)
      const signed = await signedFeedbackImageUrls(keys)
      signedThumbnails = Object.fromEntries(
        variants
          .map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl)
          .filter((key) => signed[key])
          .map((key) => [key, signed[key]]),
      )
    }
  }

  return (
    <LessonDetailClient
      teacher={
        teacher
          ? JSON.parse(JSON.stringify({
              name: teacher.name,
              gender: teacher.gender,
              avatar: teacher.avatar,
              education: teacher.education,
              university: teacher.university,
              major: teacher.major,
              currentUnit: teacher.currentUnit,
              subjects: teacher.subjects,
              bio: teacher.bio,
              tierLevel: teacher.tierLevel,
              rating: teacher.rating,
              ratingCount: teacher.ratingCount,
            }))
          : null
      }
      course={courseClean}
      time={timeParam}
      room={roomParam}
      lessonDate={lessonDateParam || ''}
      feedback={feedbackForParent ? JSON.parse(JSON.stringify(feedbackForParent)) : null}
      imageUrls={imageUrls}
      signedThumbnails={signedThumbnails}
    />
  )
}
