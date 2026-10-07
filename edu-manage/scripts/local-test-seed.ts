import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1) 教师
  const teacher = await prisma.teacher.upsert({
    where: { phone: '13800001111' },
    update: {},
    create: {
      name: '测试老师',
      phone: '13800001111',
      email: 'teacher.test@local.dev',
      subjects: JSON.stringify(['数学', '语文']),
      division: 'JUNIOR',
      status: 'ACTIVE',
    },
  })
  const hash = await bcrypt.hash('Test123456!', 12)
  await prisma.user.upsert({
    where: { email: 'teacher.test@local.dev' },
    update: { password: hash, teacherId: teacher.id, role: 'teacher', status: 'active' },
    create: {
      email: 'teacher.test@local.dev',
      password: hash,
      name: '测试老师',
      role: 'teacher',
      division: 'JUNIOR',
      status: 'active',
      teacherId: teacher.id,
    },
  })

  // 2) 课程 + 班级（数学小班）
  const course = await prisma.course.upsert({
    where: { id: 'test-course-math' },
    update: {},
    create: { id: 'test-course-math', name: '初一数学冲刺', subject: '数学', grade: '初一', type: 'GROUP' },
  })
  const group = await prisma.classGroup.upsert({
    where: { id: 'test-group-math' },
    update: {},
    create: {
      id: 'test-group-math',
      name: '初一冲刺班 · 数学',
      division: 'JUNIOR',
      courseId: course.id,
      teacherId: teacher.id,
      maxStudents: 12,
      startDate: new Date('2026-09-01'),
      status: 'ACTIVE',
      totalLessons: 30,
      recurringDays: ['SAT'],
      lessonStartTime: '09:00',
      lessonMinutes: 90,
    },
  })

  // 3) 三名学生
  const students = [
    { id: 'test-student-1', name: '牛博研', grade: '初一', phone: '13900000001', status: 'STUDYING' },
    { id: 'test-student-2', name: '马子墨', grade: '初一', phone: '13900000002', status: 'STUDYING' },
    { id: 'test-student-3', name: '李婉清', grade: '初一', phone: '13900000003', status: 'STUDYING' },
  ]
  for (const s of students) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        grade: s.grade,
        phone: s.phone,
        division: 'JUNIOR',
        status: s.status as never,
        membershipLevel: 'NORMAL',
        tags: '[]',
      },
    })
    await prisma.enrollment.upsert({
      where: { studentId_groupId: { studentId: s.id, groupId: group.id } },
      update: {},
      create: { studentId: s.id, groupId: group.id, status: 'ACTIVE' as never, subjects: ['数学'] },
    })
  }

  // 4) 一节已发生的课（今天），考勤已交，便于反馈页加载课程
  const today = new Date()
  const lesson = await prisma.classLesson.upsert({
    where: { id: 'test-lesson-1' },
    update: {},
    create: {
      id: 'test-lesson-1',
      division: 'JUNIOR',
      groupId: group.id,
      teacherId: teacher.id,
      subject: '数学',
      lessonDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0),
      startTime: '09:00',
      endTime: '10:30',
      status: 'COMPLETED',
      attendanceSubmittedAt: new Date(),
      plannedMinutes: 90,
    },
  })
  for (const s of students) {
    await prisma.classLessonStudent.upsert({
      where: { lessonId_studentId: { lessonId: lesson.id, studentId: s.id } },
      update: {},
      create: { lessonId: lesson.id, studentId: s.id },
    })
  }

  console.log('测试数据就绪: 老师 teacher.test@local.dev / Test123456!')
  console.log('班级: 初一冲刺班 · 数学, 学生: 牛博研/马子墨/李婉清')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
