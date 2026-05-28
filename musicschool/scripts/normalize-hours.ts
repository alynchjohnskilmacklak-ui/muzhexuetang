import { PrismaClient } from '@prisma/client'
import { roundHours } from '../src/lib/hours'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

function changed(value: number | null | undefined) {
  const current = Number(value ?? 0)
  if (!Number.isFinite(current)) return false
  return roundHours(current) !== current
}

async function main() {
  const [enrollments, attendances, students] = await Promise.all([
    prisma.enrollment.findMany({
      select: { id: true, usedHours: true, remainHours: true },
    }),
    prisma.attendance.findMany({
      select: { id: true, hoursDeducted: true },
    }),
    prisma.student.findMany({
      select: {
        id: true,
        name: true,
        remainHours: true,
        totalHours: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { remainHours: true },
        },
      },
    }),
  ])

  const enrollmentUpdates = enrollments
    .filter((enrollment) => changed(enrollment.usedHours) || changed(enrollment.remainHours))
    .map((enrollment) => ({
      id: enrollment.id,
      usedHours: roundHours(Number(enrollment.usedHours || 0)),
      remainHours: roundHours(Number(enrollment.remainHours || 0)),
    }))

  const attendanceUpdates = attendances
    .filter((attendance) => changed(attendance.hoursDeducted))
    .map((attendance) => ({
      id: attendance.id,
      hoursDeducted: roundHours(Number(attendance.hoursDeducted || 0)),
    }))

  const studentUpdates = students
    .filter((student) => changed(student.remainHours) || changed(student.totalHours))
    .map((student) => ({
      id: student.id,
      remainHours: roundHours(Number(student.remainHours || 0)),
      totalHours: roundHours(Number(student.totalHours || 0)),
    }))

  const studentWarnings = students
    .map((student) => {
      const enrollmentRemain = roundHours(student.enrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0))
      const studentRemain = roundHours(Number(student.remainHours || 0))
      return { id: student.id, name: student.name, studentRemain, enrollmentRemain, diff: Math.abs(studentRemain - enrollmentRemain) }
    })
    .filter((item) => item.diff > 0.2)

  console.log(`将规范报名课时：${enrollmentUpdates.length} 条`)
  console.log(`将规范考勤扣课时：${attendanceUpdates.length} 条`)
  console.log(`将规范学生课时：${studentUpdates.length} 条`)
  for (const item of studentWarnings) {
    console.log(`学生 ${item.name}：Student.remainHours=${item.studentRemain}，Enrollment 汇总=${item.enrollmentRemain}，请人工确认`)
  }

  if (dryRun) {
    console.log('dry-run 模式未写入数据库')
    return
  }

  for (const enrollment of enrollmentUpdates) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        usedHours: enrollment.usedHours,
        remainHours: enrollment.remainHours,
      },
    })
  }

  for (const attendance of attendanceUpdates) {
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { hoursDeducted: attendance.hoursDeducted },
    })
  }

  for (const student of studentUpdates) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        remainHours: student.remainHours,
        totalHours: student.totalHours,
      },
    })
  }

  console.log('课时小数规范化完成')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
