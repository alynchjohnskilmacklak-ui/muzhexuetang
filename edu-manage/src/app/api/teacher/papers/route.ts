import { NextRequest, NextResponse } from 'next/server'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

type OwnedStudent = NonNullable<Awaited<ReturnType<typeof assertTeacherOwnsStudent>>>

function normalizeIds(body: any) {
  if (Array.isArray(body.studentIds)) {
    return Array.from(new Set(body.studentIds.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)))
  }
  return typeof body.studentId === 'string' && body.studentId ? [body.studentId] : []
}

export async function GET() {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const papers = await prisma.examPaper.findMany({
      where: { teacherId: teacher.id, status: { not: 'DELETED' } },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })
    return NextResponse.json(papers)
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const body = await request.json()
    const studentIds = normalizeIds(body)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '学习档案'
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter((item: unknown): item is string => typeof item === 'string') : []
    const tags = Array.isArray(body.tags) ? body.tags.filter((item: unknown): item is string => typeof item === 'string') : []
    const publish = body.status === 'PUBLISHED' || body.publish === true

    if (studentIds.length === 0 || !title) {
      return NextResponse.json({ error: '请选择学员并填写试卷标题' }, { status: 400 })
    }
    if (imageUrls.length === 0) {
      return NextResponse.json({ error: '请至少上传一张试卷图片' }, { status: 400 })
    }

    const ownedStudents: OwnedStudent[] = []
    for (const studentId of studentIds) {
      const student = await assertTeacherOwnsStudent(teacher.id, studentId)
      if (!student) return NextResponse.json({ error: '包含无权操作的学员' }, { status: 403 })
      ownedStudents.push(student)
    }

    const papers = await prisma.$transaction(async (tx) => {
      const created = []
      for (const student of ownedStudents) {
        const paper = await tx.examPaper.create({
          data: {
            studentId: student.id,
            teacherId: teacher.id,
            title,
            subject,
            paperDate: body.paperDate ? new Date(body.paperDate) : new Date(),
            imageUrls,
            tags,
            overallComment: typeof body.overallComment === 'string' ? body.overallComment : null,
            status: publish ? 'PUBLISHED' : 'DRAFT',
          },
        })
        created.push(paper)

        if (publish && (student.parentId || student.parentUserId)) {
          await tx.notification.create({
            data: {
              userId: student.parentId || student.parentUserId!,
              title: `${teacher.name}老师上传了新试卷`,
              content: `${subject} · ${title}`,
              type: 'PAPER_PUBLISHED',
              link: '/parent/grades',
              relatedType: 'EXAM_PAPER',
              relatedId: paper.id,
              href: `/parent/archive?paperId=${paper.id}`,
            },
          })
        }

        await tx.activityLog.create({
          data: {
            userId: user.id,
            teacherId: teacher.id,
            action: publish ? TEACHER_LOG_ACTIONS.PAPER_PUBLISH : TEACHER_LOG_ACTIONS.PAPER_UPLOAD,
            detail: `${student.name} · ${title}`,
            entityType: 'ExamPaper',
            entityId: paper.id,
            metadata: { imageCount: imageUrls.length, subject },
          },
        })
      }
      return created
    })

    return NextResponse.json({ count: papers.length, papers }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '试卷保存失败' }, { status: 500 })
  }
}
