/**
 * 清理历史测试数据
 *
 * 执行: npx tsx prisma/cleanup-test-data.ts
 *
 * 只删除明确标识的测试数据，不碰正式数据。
 * 删除顺序: 子表 → 主表，避免外键报错。
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/* ── 测试数据白名单 ───────────────────────────────────────────── */
const TEST_USER_EMAILS = [
  'admin@test.com',
  'wang@test.com',
  'li@test.com',
  'zhang@test.com',
  'zhao@test.com',
  'chen@test.com',
  'zhanglaoshi@tea.com',
  'lilaoshi@tea.com',
  'parent1@test.com',
  'parent2@test.com',
]

const TEST_NAMES = [
  '管理员',
  '王老师',
  '李老师',
  '张老师',
  '赵老师',
  '陈老师',
  '张爸爸',
  '李妈妈',
  '张三',
  '李四',
  '王五',
  '赵六',
  '孙七',
]

const TEST_STUDENT_IDS = ['s1', 's2', 's3', 's4', 's5']
const TEST_TEACHER_IDS = ['t1', 't2', 't3', 't4', 't5']
const TEST_COURSE_IDS = ['c1', 'c2', 'c3', 'c4', 'c5']

const TEST_COURSE_NAMES = [
  '钢琴基础班',
  '数学提高班',
  '英语口语班',
  '编程Scratch',
  '美术素描',
]

async function main() {
  console.log('开始清理测试数据...\n')

  // 1. 找到测试用户 ID（按邮箱 + 按姓名）
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: TEST_USER_EMAILS } },
        { name: { in: TEST_NAMES } },
      ],
    },
    select: { id: true, email: true, name: true },
  })
  const testUserIds = testUsers.map((u) => u.id)
  console.log(`  找到 ${testUserIds.length} 个测试用户`)

  // 找到测试学生 ID（按硬编码 ID + 关联测试用户 + 按姓名）
  const testStudents = await prisma.student.findMany({
    where: {
      OR: [
        { id: { in: TEST_STUDENT_IDS } },
        { parentId: { in: testUserIds } },
        { parentUserId: { in: testUserIds } },
        { name: { in: TEST_NAMES } },
      ],
    },
    select: { id: true, name: true },
  })
  const testStudentIds = testStudents.map((s) => s.id)
  console.log(`  找到 ${testStudentIds.length} 个测试学员: ${testStudents.map((s) => s.name).join(', ') || '(无)'}`)

  // 找到测试教师 ID（按硬编码 ID + 按姓名）
  const testTeachers = await prisma.teacher.findMany({
    where: {
      OR: [
        { id: { in: TEST_TEACHER_IDS } },
        { name: { in: TEST_NAMES } },
      ],
    },
    select: { id: true, name: true },
  })
  const testTeacherIds = testTeachers.map((t) => t.id)
  console.log(`  找到 ${testTeacherIds.length} 个测试教师: ${testTeachers.map((t) => t.name).join(', ') || '(无)'}`)

  // 找到测试课程 ID
  const testCourses = await prisma.course.findMany({
    where: {
      OR: [
        { id: { in: TEST_COURSE_IDS } },
        { name: { in: TEST_COURSE_NAMES } },
        { teacherId: { in: testTeacherIds } },
      ],
    },
    select: { id: true, name: true },
  })
  const testCourseIds = testCourses.map((c) => c.id)
  console.log(`  找到 ${testCourseIds.length} 个测试课程: ${testCourses.map((c) => c.name).join(', ') || '(无)'}`)

  // 找到关联的 Schedule（关联测试教师或测试课程）
  const testSchedules = await prisma.schedule.findMany({
    where: {
      OR: [
        { teacherId: { in: testTeacherIds } },
        { courseId: { in: testCourseIds } },
      ],
    },
    select: { id: true },
  })
  const testScheduleIds = testSchedules.map((s) => s.id)

  // 找到关联的 ClassGroup（关联测试教师或测试课程）
  const testGroups = await prisma.classGroup.findMany({
    where: {
      OR: [
        { teacherId: { in: testTeacherIds } },
        { courseId: { in: testCourseIds } },
      ],
    },
    select: { id: true },
  })
  const testGroupIds = testGroups.map((g) => g.id)

  // 找到关联的 ClassLesson（关联测试班级）
  const testLessons = await prisma.classGroup.findMany({
    where: { id: { in: testGroupIds } },
    select: { id: true, classLessons: { select: { id: true } } },
  })
  const testLessonIds = testLessons.flatMap((g) => g.classLessons.map((l) => l.id))

  // 找到关联的 Enrollment（关联测试学生或测试班级）
  const testEnrollments = await prisma.enrollment.findMany({
    where: {
      OR: [
        { studentId: { in: testStudentIds } },
        { groupId: { in: testGroupIds } },
      ],
    },
    select: { id: true },
  })
  const testEnrollmentIds = testEnrollments.map((e) => e.id)

  const allUserIds = testUserIds
  const allTeacherIds = testTeacherIds
  const allStudentIds = testStudentIds
  const allCourseIds = testCourseIds
  const allScheduleIds = testScheduleIds
  const allGroupIds = testGroupIds
  const allLessonIds = testLessonIds
  const allEnrollmentIds = testEnrollmentIds

  if (allUserIds.length === 0 && allTeacherIds.length === 0 && allStudentIds.length === 0 && allCourseIds.length === 0) {
    console.log('\n  没有找到任何测试数据，无需清理。')
    return
  }

  console.log('\n  开始按顺序删除关联数据...\n')

  // ── 删除顺序：子表 → 主表 ──────────────────────────────────

  // 1. 请假记录
  if (allStudentIds.length) {
    const c = await prisma.leaveRequest.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [1/20] LeaveRequest: ${c.count}`)
  } else console.log('  [1/20] LeaveRequest: 跳过')

  // 2. 补课请求
  if (allStudentIds.length) {
    const c = await prisma.makeupRequest.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [2/20] MakeupRequest: ${c.count}`)
  } else console.log('  [2/20] MakeupRequest: 跳过')

  // 3. 考勤
  const attWhere: Record<string, unknown>[] = []
  if (allLessonIds.length) attWhere.push({ lessonId: { in: allLessonIds } })
  if (allStudentIds.length) attWhere.push({ studentId: { in: allStudentIds } })
  if (allScheduleIds.length) attWhere.push({ scheduleId: { in: allScheduleIds } })
  if (attWhere.length) {
    const c = await prisma.attendance.deleteMany({ where: { OR: attWhere } })
    console.log(`  [3/20] Attendance: ${c.count}`)
  } else console.log('  [3/20] Attendance: 跳过')

  // 4. 课时交易
  if (allStudentIds.length) {
    const c = await prisma.hourTransaction.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [4/20] HourTransaction: ${c.count}`)
  } else console.log('  [4/20] HourTransaction: 跳过')

  // 5. 费用
  if (allStudentIds.length) {
    const c = await prisma.fee.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [5/20] Fee: ${c.count}`)
  } else console.log('  [5/20] Fee: 跳过')

  // 6. ScheduleStudent
  if (allScheduleIds.length) {
    const c = await prisma.scheduleStudent.deleteMany({ where: { scheduleId: { in: allScheduleIds } } })
    console.log(`  [6/20] ScheduleStudent: ${c.count}`)
  } else console.log('  [6/20] ScheduleStudent: 跳过')

  // 7. 成绩维度
  if (allStudentIds.length) {
    const grades = await prisma.gradeRecord.findMany({ where: { studentId: { in: allStudentIds } }, select: { id: true } })
    if (grades.length) {
      const c1 = await prisma.dimensionScore.deleteMany({ where: { gradeId: { in: grades.map((g) => g.id) } } })
      console.log(`  [7/20] DimensionScore: ${c1.count}`)
      const c2 = await prisma.classHighlight.deleteMany({ where: { gradeId: { in: grades.map((g) => g.id) } } })
      console.log(`  [8/20] ClassHighlight (grade): ${c2.count}`)
    } else console.log('  [7-8/20] DimensionScore+ClassHighlight(grade): 跳过')
  } else console.log('  [7-8/20] DimensionScore+ClassHighlight(grade): 跳过')

  // 8. 评语/测评
  if (allStudentIds.length) {
    const c1 = await prisma.gradeRecord.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [9/20] GradeRecord: ${c1.count}`)
  } else console.log('  [9/20] GradeRecord: 跳过')

  if (allGroupIds.length) {
    const c2 = await prisma.assessment.deleteMany({ where: { groupId: { in: allGroupIds } } })
    console.log(`  [10/20] Assessment: ${c2.count}`)
  } else console.log('  [10/20] Assessment: 跳过')

  // 9. 课堂亮点（直接关联测试教师/学生）
  const hlWhere: Record<string, unknown>[] = []
  if (allStudentIds.length) hlWhere.push({ studentId: { in: allStudentIds } })
  if (allTeacherIds.length) hlWhere.push({ teacherId: { in: allTeacherIds } })
  if (hlWhere.length) {
    const c = await prisma.classHighlight.deleteMany({ where: { OR: hlWhere } })
    console.log(`  [11/20] ClassHighlight: ${c.count}`)
  } else console.log('  [11/20] ClassHighlight: 跳过')

  // 10. 试卷相关
  if (allStudentIds.length || allTeacherIds.length) {
    const paperWhere: Record<string, unknown>[] = []
    if (allStudentIds.length) paperWhere.push({ studentId: { in: allStudentIds } })
    if (allTeacherIds.length) paperWhere.push({ teacherId: { in: allTeacherIds } })
    const papers = await prisma.examPaper.findMany({ where: { OR: paperWhere }, select: { id: true } })
    const paperIds = papers.map((p) => p.id)
    if (paperIds.length) {
      await prisma.weaknessRecord.deleteMany({ where: { OR: [{ paperId: { in: paperIds } }, { studentId: { in: allStudentIds } }] } })
      await prisma.paperReaction.deleteMany({ where: { paperId: { in: paperIds } } })
      await prisma.paperComment.deleteMany({ where: { paperId: { in: paperIds } } })
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } })
      const c = await prisma.examPaper.deleteMany({ where: { id: { in: paperIds } } })
      console.log(`  [12/20] ExamPaper+子表: ${c.count}`)
    } else console.log('  [12/20] ExamPaper+子表: 跳过')
  } else console.log('  [12/20] ExamPaper+子表: 跳过')

  // 11. 表现动态
  if (allStudentIds.length || allTeacherIds.length) {
    const postWhere: Record<string, unknown>[] = []
    if (allStudentIds.length) postWhere.push({ studentId: { in: allStudentIds } })
    if (allTeacherIds.length) postWhere.push({ teacherId: { in: allTeacherIds } })
    const posts = await prisma.performancePost.findMany({ where: { OR: postWhere }, select: { id: true } })
    const postIds = posts.map((p) => p.id)
    if (postIds.length) {
      await prisma.postReaction.deleteMany({ where: { postId: { in: postIds } } })
      await prisma.postComment.deleteMany({ where: { postId: { in: postIds } } })
      await prisma.postBadge.deleteMany({ where: { postId: { in: postIds } } })
      const c = await prisma.performancePost.deleteMany({ where: { id: { in: postIds } } })
      console.log(`  [13/20] PerformancePost+子表: ${c.count}`)
    } else console.log('  [13/20] PerformancePost+子表: 跳过')
  } else console.log('  [13/20] PerformancePost+子表: 跳过')

  // 12. 成就徽章
  if (allStudentIds.length || allTeacherIds.length) {
    const abWhere: Record<string, unknown>[] = []
    if (allStudentIds.length) abWhere.push({ studentId: { in: allStudentIds } })
    if (allTeacherIds.length) abWhere.push({ teacherId: { in: allTeacherIds } })
    const c = await prisma.achievementBadge.deleteMany({ where: { OR: abWhere } })
    console.log(`  [14/20] AchievementBadge: ${c.count}`)
  } else console.log('  [14/20] AchievementBadge: 跳过')

  // 13. 学习目标
  if (allStudentIds.length) {
    const c = await prisma.learningGoal.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [15/20] LearningGoal: ${c.count}`)
  } else console.log('  [15/20] LearningGoal: 跳过')

  // 14. 教师薪资
  if (allTeacherIds.length) {
    await prisma.teacherSalaryTransaction.deleteMany({ where: { teacherId: { in: allTeacherIds } } })
    await prisma.teacherSalaryConfig.deleteMany({ where: { teacherId: { in: allTeacherIds } } })
    console.log('  [16/20] TeacherSalary: done')
  } else console.log('  [16/20] TeacherSalary: 跳过')

  // 15. 教师提醒
  if (allTeacherIds.length) {
    const c = await prisma.teacherAlert.deleteMany({ where: { teacherId: { in: allTeacherIds } } })
    console.log(`  [17/20] TeacherAlert: ${c.count}`)
  } else console.log('  [17/20] TeacherAlert: 跳过')

  // 16. 通知（关联测试学生）
  if (allStudentIds.length) {
    const c = await prisma.notification.deleteMany({ where: { studentId: { in: allStudentIds } } })
    console.log(`  [18/20] Notification: ${c.count}`)
  } else console.log('  [18/20] Notification: 跳过')

  // 17. 活动日志（关联测试用户/教师）
  const logWhere: Record<string, unknown>[] = []
  if (allUserIds.length) logWhere.push({ userId: { in: allUserIds } })
  if (allTeacherIds.length) logWhere.push({ teacherId: { in: allTeacherIds } })
  if (logWhere.length) {
    const c = await prisma.activityLog.deleteMany({ where: { OR: logWhere } })
    console.log(`  [19/20] ActivityLog: ${c.count}`)
  } else console.log('  [19/20] ActivityLog: 跳过')

  // 18. ClassGroupTeacher（关联测试教师/班级）
  const cgtWhere: Record<string, unknown>[] = []
  if (allTeacherIds.length) cgtWhere.push({ teacherId: { in: allTeacherIds } })
  if (allGroupIds.length) cgtWhere.push({ groupId: { in: allGroupIds } })
  if (cgtWhere.length) {
    const c = await prisma.classGroupTeacher.deleteMany({ where: { OR: cgtWhere } })
    console.log(`  [20/20] ClassGroupTeacher: ${c.count}`)
  } else console.log('  [20/20] ClassGroupTeacher: 跳过')

  // 19. 课次
  if (allLessonIds.length) {
    const c = await prisma.classLesson.deleteMany({ where: { id: { in: allLessonIds } } })
    console.log(`  [21/22] ClassLesson: ${c.count}`)
  } else console.log('  [21/22] ClassLesson: 跳过')

  // 20. 报名
  if (allEnrollmentIds.length) {
    const c = await prisma.enrollment.deleteMany({ where: { id: { in: allEnrollmentIds } } })
    console.log(`  [22/24] Enrollment: ${c.count}`)
  } else console.log('  [22/24] Enrollment: 跳过')

  // 21. 班级
  if (allGroupIds.length) {
    const c = await prisma.classGroup.deleteMany({ where: { id: { in: allGroupIds } } })
    console.log(`  [23/26] ClassGroup: ${c.count}`)
  } else console.log('  [23/26] ClassGroup: 跳过')

  // 22. 排课
  if (allScheduleIds.length) {
    const c = await prisma.schedule.deleteMany({ where: { id: { in: allScheduleIds } } })
    console.log(`  [24/28] Schedule: ${c.count}`)
  } else console.log('  [24/28] Schedule: 跳过')

  // 23. 课程
  if (allCourseIds.length) {
    const c = await prisma.course.deleteMany({ where: { id: { in: allCourseIds } } })
    console.log(`  [25/30] Course: ${c.count}`)
  } else console.log('  [25/30] Course: 跳过')

  // 24. 学员
  if (allStudentIds.length) {
    const c = await prisma.student.deleteMany({ where: { id: { in: allStudentIds } } })
    console.log(`  [26/32] Student: ${c.count}`)
  } else console.log('  [26/32] Student: 跳过')

  // 25. 教师
  if (allTeacherIds.length) {
    const c = await prisma.teacher.deleteMany({ where: { id: { in: allTeacherIds } } })
    console.log(`  [27/34] Teacher: ${c.count}`)
  } else console.log('  [27/34] Teacher: 跳过')

  // 26. 用户
  if (allUserIds.length) {
    const c = await prisma.user.deleteMany({ where: { id: { in: allUserIds } } })
    console.log(`  [28/36] User: ${c.count}`)
  } else console.log('  [28/36] User: 跳过')

  console.log('\n✅ 测试数据清理完成')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
