import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getFeedbackBonusPreview, triggerFeedbackBonus } from '../src/lib/teacher-salary'

function argValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const division = argValue('division')
  const feedbackId = argValue('feedback-id')
  const execute = process.argv.includes('--execute')

  if (division !== 'JUNIOR' && division !== 'SENIOR') {
    throw new Error('必须指定 --division=JUNIOR 或 --division=SENIOR')
  }
  if (!feedbackId || !/^[a-zA-Z0-9_-]+$/.test(feedbackId)) {
    throw new Error('必须指定合法的 --feedback-id=<id>')
  }

  const databaseUrl = division === 'SENIOR'
    ? process.env.DATABASE_URL_SENIOR
    : process.env.DATABASE_URL_JUNIOR
  if (!databaseUrl) throw new Error(`${division} 数据库连接未配置`)

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id: feedbackId },
      select: {
        id: true,
        teacherId: true,
        studentIds: true,
        classLessonId: true,
        feedbackGroupId: true,
        feedbackCourseType: true,
        status: true,
        source: true,
        createdAt: true,
      },
    })
    if (!feedback) throw new Error('反馈不存在')

    const existingSalary = await prisma.teacherSalaryTransaction.findFirst({
      where: { feedbackId, type: 'FEEDBACK_BONUS' },
      select: { id: true, amount: true, createdAt: true },
    })
    const preview = await getFeedbackBonusPreview({
      teacherId: feedback.teacherId,
      studentIds: feedback.studentIds,
      lessonId: feedback.classLessonId,
      groupId: feedback.feedbackGroupId,
      feedbackCourseType: feedback.feedbackCourseType,
      excludeFeedbackId: feedback.id,
      rewardAt: feedback.createdAt,
      prismaClient: prisma,
    })

    console.log(JSON.stringify({
      mode: execute ? 'EXECUTE' : 'DRY_RUN',
      division,
      feedback,
      existingSalary,
      preview: {
        rewardDate: preview.rewardDate,
        subjectKey: preview.subjectKey,
        subjectLabel: preview.subjectLabel,
        eligibleCount: preview.eligibleCount,
        duplicateCount: preview.duplicateCount,
        amount: preview.total,
        message: preview.message,
      },
    }, null, 2))

    if (!execute) {
      console.log('未写入数据库。如人工核对无误，请追加 --execute 后再次运行。')
      return
    }
    if (existingSalary) throw new Error('该反馈已有奖励工资流水，拒绝重复执行')

    const result = await triggerFeedbackBonus(feedbackId, prisma)
    console.log(JSON.stringify({ result }, null, 2))
    if (!result.success) throw new Error(result.error || '补发失败')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
