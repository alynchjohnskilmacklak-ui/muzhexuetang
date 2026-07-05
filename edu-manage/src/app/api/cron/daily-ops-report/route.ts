import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision } from '@/lib/prisma'
import { sendWxMessage } from '@/lib/wxpusher'

export const dynamic = 'force-dynamic'

type DailyStats = {
  totalLessons: number
  missingAttendance: number
  publishedFeedbacks: number
  lessonsWithoutFeedback: number
}

async function collectDailyStats(db: PrismaClient, dayStart: Date, dayEnd: Date): Promise<DailyStats> {
  // Keep the same lesson/feedback scope as the admin classroom-feedback daily view.
  const [lessons, publishedFeedbacks] = await Promise.all([
    db.classLesson.findMany({
      where: {
        lessonDate: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELLED' },
      },
      select: {
        attendanceSubmittedAt: true,
        classroomFeedbacks: {
          where: { status: 'PUBLISHED' },
          select: { id: true },
        },
      },
    }),
    db.classroomFeedback.count({
      where: { status: 'PUBLISHED', createdAt: { gte: dayStart, lt: dayEnd } },
    }),
  ])

  return {
    totalLessons: lessons.length,
    missingAttendance: lessons.filter((lesson) => !lesson.attendanceSubmittedAt).length,
    publishedFeedbacks,
    lessonsWithoutFeedback: lessons.filter((lesson) => lesson.classroomFeedbacks.length === 0).length,
  }
}

function formatDivision(label: string, stats: DailyStats) {
  return `${label}：${stats.totalLessons}节课，${stats.missingAttendance}节未考勤，${stats.publishedFeedbacks}条已发布反馈，${stats.lessonsWithoutFeedback}节未反馈`
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET && token !== process.env.HEALTH_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)
  const juniorDb = getPrismaForDivision('JUNIOR')
  const seniorDb = getPrismaForDivision('SENIOR')

  const [junior, senior, juniorAdmins, seniorAdmins] = await Promise.all([
    collectDailyStats(juniorDb, dayStart, dayEnd),
    collectDailyStats(seniorDb, dayStart, dayEnd),
    juniorDb.user.findMany({
      where: { role: 'admin', wxpusherUid: { not: null } },
      select: { wxpusherUid: true },
    }),
    seniorDb.user.findMany({
      where: { role: 'admin', wxpusherUid: { not: null } },
      select: { wxpusherUid: true },
    }),
  ])

  const content = [
    `【运营日报 ${now.getMonth() + 1}月${now.getDate()}日】`,
    formatDivision('初中部', junior),
    formatDivision('高中部', senior),
  ].join('\n')
  const uids = [...new Set([...juniorAdmins, ...seniorAdmins].map((admin) => admin.wxpusherUid).filter((uid): uid is string => Boolean(uid)))]
  const results = await Promise.all(uids.map(async (uid) => ({ uid, ...(await sendWxMessage(uid, content, '牧哲学堂今日运营日报')) })))

  return NextResponse.json({
    date: dayStart.toISOString().slice(0, 10),
    junior,
    senior,
    recipients: uids.length,
    sent: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success),
  })
}
