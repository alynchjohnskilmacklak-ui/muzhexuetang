const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const subs = ['数学', '语文', '英语', '物理', '化学', '生物', '政治', '历史', '地理']
  const base = await p.classGroup.findMany({ where: { name: { startsWith: '初一冲刺班' }, deletedAt: null }, include: { enrollments: true, course: true } })
  for (const grade of ['初二', '初三']) {
    for (const sg of base) {
      const sub = sg.course.subject
      if (!subs.includes(sub)) continue
      // 建同名 Course（独立，避免改到初一课程）
      const course = await p.course.create({
        data: { name: `${grade}冲刺班 · ${sub}`, subject: sub, grade, type: 'GROUP', totalLessons: sg.course.totalLessons, lessonMinutes: sg.course.lessonMinutes, isActive: true },
      })
      const group = await p.classGroup.create({
        data: {
          name: `${grade}冲刺班 · ${sub}`,
          division: 'JUNIOR',
          courseId: course.id,
          teacherId: sg.teacherId,
          roomId: sg.roomId,
          maxStudents: sg.maxStudents,
          startDate: sg.startDate,
          status: 'ACTIVE',
          totalLessons: sg.totalLessons,
          recurringDays: sg.recurringDays,
          lessonStartTime: sg.lessonStartTime,
          lessonMinutes: sg.lessonMinutes,
        },
      })
      for (const e of sg.enrollments) {
        const data = { status: e.status, student: { connect: { id: e.studentId } }, group: { connect: { id: group.id } } }
        await p.enrollment.create({ data })
      }
      console.log(`created ${grade} · ${sub} (${sg.enrollments.length} students)`)
    }
  }
}
main().finally(() => p.$disconnect())
