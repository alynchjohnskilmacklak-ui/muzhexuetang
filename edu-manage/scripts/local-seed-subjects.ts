import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SUBJECTS = [
  { key: 'chinese', name: '语文' },
  { key: 'english', name: '英语' },
  { key: 'physics', name: '物理' },
  { key: 'chemistry', name: '化学' },
  { key: 'biology', name: '生物' },
  { key: 'politics', name: '政治' },
  { key: 'history', name: '历史' },
  { key: 'geography', name: '地理' },
]

async function main() {
  const teacher = await prisma.teacher.findUnique({ where: { phone: '13800002222' } })
  if (!teacher) throw new Error('缺少测试教师')
  const term = await prisma.academicTerm.findUnique({ where: { id: 'test-term-2026' } })
  if (!term) throw new Error('缺少运营批次')
  const studentIds = ['test-student-1', 'test-student-2', 'test-student-3']
  const today = new Date()

  for (const subj of SUBJECTS) {
    const courseId = `test-course-${subj.key}`
    const groupId = `test-group-${subj.key}`
    const course = await prisma.course.upsert({
      where: { id: courseId },
      update: {},
      create: { id: courseId, name: `初一${subj.name}`, subject: subj.name, grade: '初一', type: 'GROUP' },
    })
    const group = await prisma.classGroup.upsert({
      where: { id: groupId },
      update: {},
      create: {
        id: groupId,
        name: `初一冲刺班 · ${subj.name}`,
        division: 'JUNIOR',
        courseId: course.id,
        teacherId: teacher.id,
        termId: term.id,
        maxStudents: 12,
        startDate: new Date('2026-09-01'),
        status: 'ACTIVE',
        totalLessons: 30,
        recurringDays: ['SAT'],
        lessonStartTime: '09:00',
        lessonMinutes: 90,
      },
    })
    await prisma.classGroupTeacher.upsert({
      where: { groupId_teacherId_subject: { groupId, teacherId: teacher.id, subject: subj.name } },
      update: {},
      create: { groupId, teacherId: teacher.id, subject: subj.name, role: 'SUBJECT' },
    })
    for (const sid of studentIds) {
      await prisma.enrollment.upsert({
        where: { studentId_groupId: { studentId: sid, groupId } },
        update: {},
        create: { studentId: sid, groupId, status: 'ACTIVE' as never, subjects: [subj.name] },
      })
    }
    const lessonId = `test-lesson-${subj.key}`
    await prisma.classLesson.upsert({
      where: { id: lessonId },
      update: {},
      create: {
        id: lessonId,
        division: 'JUNIOR',
        groupId,
        teacherId: teacher.id,
        subject: subj.name,
        lessonDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0),
        startTime: '09:00',
        endTime: '10:30',
        status: 'COMPLETED',
        attendanceSubmittedAt: new Date(),
        plannedMinutes: 90,
      },
    })
    for (const sid of studentIds) {
      await prisma.classLessonStudent.upsert({
        where: { lessonId_studentId: { lessonId: lessonId, studentId: sid } },
        update: {},
        create: { lessonId, studentId: sid },
      })
    }
  }
  console.log(`已创建 ${SUBJECTS.length} 个学科测试班级: ` + SUBJECTS.map((s) => s.name).join('/'))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
