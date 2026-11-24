import { createManyNotifications, type NotificationDb } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'

export type AttendanceAlertConfig = {
  absenceAlert: boolean
  lowHoursWarn: number
}

export async function createAttendanceParentAlerts(
  db: NotificationDb,
  input: {
    parentUserId: string | null | undefined
    studentId: string
    studentName: string
    groupName: string
    status: string
    config: AttendanceAlertConfig
    beforeHours?: number | null
    afterHours?: number | null
  },
) {
  if (!input.parentUserId) return { count: 0 }

  const pushStatus = qywxEnabled() ? 'queued' : 'none'
  const notifications = []
  if (input.config.absenceAlert && input.status === 'ABSENT') {
    notifications.push({
      userId: input.parentUserId,
      studentId: input.studentId,
      type: 'ATTENDANCE_ABSENCE',
      title: `${input.studentName}本次课堂考勤为旷课`,
      content: `${input.studentName}在${input.groupName}的考勤记录为旷课。如记录有误，请联系管理人员核实。`,
      relatedType: 'ATTENDANCE_ABSENCE',
      relatedId: input.studentId,
      href: '/parent/schedule',
      pushStatus,
    })
  }

  const threshold = Number(input.config.lowHoursWarn)
  if (
    threshold > 0
    && input.beforeHours != null
    && input.afterHours != null
    && input.beforeHours > threshold
    && input.afterHours <= threshold
  ) {
    notifications.push({
      userId: input.parentUserId,
      studentId: input.studentId,
      type: 'LOW_HOURS_ALERT',
      title: `${input.studentName}剩余课时不足`,
      content: `${input.studentName}本次课后剩余 ${input.afterHours} 课时，已达到提醒阈值 ${threshold} 课时。`,
      relatedType: 'LOW_HOURS_ALERT',
      relatedId: input.studentId,
      href: '/parent/schedule',
      pushStatus,
    })
  }

  if (notifications.length === 0) return { count: 0 }
  return createManyNotifications(db, notifications)
}
