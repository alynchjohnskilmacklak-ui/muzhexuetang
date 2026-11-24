/** 班级课次的日期按教学日（北京时间）保存为 UTC 零点。 */
export function chinaClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return { day: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` }
}

export function resolveLessonSubjectForEnrollment(
  lesson: { subject: string | null; teacherId: string | null },
  group: {
    teacherId: string | null
    courseSubject: string | null
    teacherAssignments: Array<{ teacherId: string; subject: string | null }>
  },
) {
  return lesson.subject
    || group.teacherAssignments.find((assignment) => assignment.teacherId === lesson.teacherId)?.subject
    || group.teacherAssignments.find((assignment) => assignment.teacherId === group.teacherId)?.subject
    || (group.teacherAssignments.length === 1 ? group.teacherAssignments[0].subject : null)
    || group.courseSubject
}

/** 允许修改今天（含已过开课时间）及未来、且没有该生考勤/反馈记录的课次名单；历史课次名单保持不变。 */
export function isEditableSubjectRosterLesson(
  lesson: { lessonDate: Date; startTime: string; hasAttendance: boolean; hasFeedback: boolean },
  now: Date,
) {
  const { day } = chinaClock(now)
  const lessonDay = lesson.lessonDate.toISOString().slice(0, 10)
  return lessonDay >= day
    && !lesson.hasAttendance
    && !lesson.hasFeedback
}
