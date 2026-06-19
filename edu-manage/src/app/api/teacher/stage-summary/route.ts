import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getStudentProfile } from '@/lib/student-profile'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

function parseDate(value: unknown, fallback: Date) {
  if (typeof value !== 'string' || !value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function buildDraftMaterial(profile: NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>) {
  const mastery = profile.study.mastery
  const weaknessText = profile.study.weaknesses.slice(0, 5).map((item) => `${item.topic}（${item.mistakeCount}次）`)
  const trendText = profile.record.trendBySubject
    .flatMap((subject) => subject.points.slice(-2).map((point) => `${subject.subject}${point.name} ${point.pct}%`))
    .slice(0, 4)
  const highlights = profile.record.timeline
    .filter((item) => ['feedback', 'post', 'badge'].includes(item.type))
    .slice(0, 5)
    .map((item) => `${item.date} ${item.title}`)

  return {
    overview: {
      attendanceRate: profile.overview.attendanceRate,
      masteryRate: mastery.masteredPct,
      paperCount: profile.overview.paperCount,
      badgeCount: profile.overview.badgeCount,
      totalHours: profile.identity.totalHours,
    },
    mastery,
    trend: profile.record.trendBySubject,
    timeline: profile.record.timeline.slice(0, 12),
    summarySeed: [
      `${profile.identity.name}本阶段出勤率${profile.overview.attendanceRate ?? '暂无'}%，逐题掌握率${mastery.masteredPct}%。`,
      `试卷题目统计：共${mastery.total}题，已掌握${mastery.masteredPct}%，需复习${mastery.reviewPct}%，需练习${mastery.weakPct}%。`,
      weaknessText.length ? `主要薄弱点：${weaknessText.join('、')}。` : '薄弱点记录暂少，可结合课堂表现继续观察。',
      trendText.length ? `近期成绩：${trendText.join('；')}。` : '本阶段暂无成绩趋势记录。',
      highlights.length ? `成长亮点：${highlights.join('；')}。` : '本阶段暂无成长动态或徽章记录。',
    ].join('\n'),
  }
}

async function assertOwned(teacherId: string, studentId: string, prisma: Awaited<ReturnType<typeof requireCurrentTeacher>>['prisma']) {
  return assertTeacherOwnsStudent(teacherId, studentId, prisma)
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const studentId = req.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  const student = await assertOwned(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const months = Math.max(1, Math.min(12, Number(req.nextUrl.searchParams.get('months') || 3)))
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - months)

  const [profile, draft] = await Promise.all([
    getStudentProfile(prisma, studentId, { from, to }),
    prisma.stageSummary.findFirst({
      where: { studentId, teacherId: teacher.id, status: 'DRAFT' },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    student,
    range: { from, to },
    material: profile ? buildDraftMaterial(profile) : null,
    draft,
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
  const suggestions = typeof body.suggestions === 'string' ? body.suggestions.trim() || null : null
  if (!studentId || !summary) return NextResponse.json({ error: '请填写学员和阶段寄语' }, { status: 400 })

  const student = await assertOwned(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  if (id) {
    const existing = await prisma.stageSummary.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '草稿不存在' }, { status: 404 })
    if (existing.teacherId !== teacher.id || existing.studentId !== studentId) {
      return NextResponse.json({ error: '无权操作该草稿' }, { status: 403 })
    }
  }

  const periodStart = parseDate(body.periodStart, new Date(Date.now() - 90 * 86400000))
  const periodEnd = parseDate(body.periodEnd, new Date())
  const dataSnapshot = body.dataSnapshot && typeof body.dataSnapshot === 'object' ? body.dataSnapshot : undefined

  const stageSummary = id
    ? await prisma.stageSummary.update({
        where: { id },
        data: {
          periodStart,
          periodEnd,
          summary,
          suggestions,
          dataSnapshot,
          status: 'DRAFT',
          publishedAt: null,
        },
      })
    : await prisma.stageSummary.create({
        data: {
          studentId,
          teacherId: teacher.id,
          periodStart,
          periodEnd,
          summary,
          suggestions,
          dataSnapshot,
          status: 'DRAFT',
        },
      })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.STAGE_SUMMARY_DRAFT,
      detail: `${student.name} · 保存阶段小结草稿`,
      entityType: 'StageSummary',
      entityId: stageSummary.id,
      metadata: { studentId },
    },
  })

  return NextResponse.json({ stageSummary })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json()
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id || body.action !== 'publish') return NextResponse.json({ error: '缺少发布参数' }, { status: 400 })

  const existing = await prisma.stageSummary.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, parentId: true, parentUserId: true } } },
  })
  if (!existing) return NextResponse.json({ error: '阶段小结不存在' }, { status: 404 })
  if (existing.teacherId !== teacher.id) return NextResponse.json({ error: '无权发布该小结' }, { status: 403 })
  const student = await assertOwned(teacher.id, existing.studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const stageSummary = await prisma.$transaction(async (tx) => {
    const published = await tx.stageSummary.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), notifySent: true },
    })
    const parentId = existing.student.parentId || existing.student.parentUserId
    if (parentId) {
      await tx.notification.create({
        data: {
          userId: parentId,
          title: `${teacher.name}老师发布了阶段学情小结`,
          content: `${existing.student.name} · 学习档案已更新`,
          type: 'STAGE_SUMMARY',
          link: '/parent/archive',
          href: '/parent/archive',
          relatedType: 'StageSummary',
          relatedId: id,
          studentId: existing.studentId,
          senderId: user.id,
        },
      })
    }
    await tx.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: TEACHER_LOG_ACTIONS.STAGE_SUMMARY_PUBLISH,
        detail: `${existing.student.name} · 发布阶段小结`,
        entityType: 'StageSummary',
        entityId: id,
        metadata: { studentId: existing.studentId },
      },
    })
    return published
  })

  return NextResponse.json({ stageSummary })
})
