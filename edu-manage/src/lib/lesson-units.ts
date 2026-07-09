import { roundHours } from '@/lib/hours'

export function isOneOnOne(courseType?: string | null) {
  return courseType === 'ONE_ON_ONE'
}

/** 每节对应多少课时(小时)：40分钟 -> 0.7，60分钟 -> 1 */
export function hoursPerLesson(lessonMinutes: number) {
  return roundHours((lessonMinutes || 40) / 60)
}

/** 剩余小时 -> 显示值+单位。小班给"节"，一对一给"课时" */
export function formatRemaining(
  remainHours: number,
  courseType: string | null,
  lessonMinutes: number,
): { value: number; unit: string; text: string } {
  if (isOneOnOne(courseType)) {
    const value = roundHours(remainHours)
    return { value, unit: '课时', text: `${value} 课时` }
  }
  const per = hoursPerLesson(lessonMinutes) || 0.7
  const lessons = Math.round(remainHours / per)
  return { value: lessons, unit: '节', text: `${lessons} 节` }
}

/** 已扣小时 -> 显示(考勤历史用)：小班"扣N节"，一对一"扣X课时" */
export function formatDeducted(
  deductedHours: number,
  courseType: string | null,
  lessonMinutes: number,
): string {
  if (isOneOnOne(courseType)) return `${roundHours(deductedHours)} 课时`
  const per = hoursPerLesson(lessonMinutes) || 0.7
  return `${Math.round(deductedHours / per)} 节`
}
