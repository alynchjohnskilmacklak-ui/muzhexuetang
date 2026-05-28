export const PERSONAL_CLASS_LIMIT: Record<string, number> = {
  ONE_ON_ONE: 1,
  ONE_ON_TWO: 2,
  ONE_ON_THREE: 3,
}

export const SCHEDULE_CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一',
  ONE_ON_TWO: '一对二',
  ONE_ON_THREE: '一对三',
  SMALL_CLASS: '小班课',
}

export function isPersonalClassType(classType?: string | null) {
  return !!classType && Object.prototype.hasOwnProperty.call(PERSONAL_CLASS_LIMIT, classType)
}

export function getPersonalClassLimit(classType?: string | null) {
  return classType ? PERSONAL_CLASS_LIMIT[classType] || 0 : 0
}

export function getScheduleClassTypeLabel(classType?: string | null) {
  return classType ? SCHEDULE_CLASS_TYPE_LABELS[classType] || classType : '课程'
}

export function validateScheduleStudentCount(params: {
  classType?: string | null
  studentCount: number
  roomCapacity?: number | null
}) {
  const { classType, studentCount, roomCapacity } = params
  const limit = getPersonalClassLimit(classType)

  if (limit) {
    if (studentCount < 1 || studentCount > limit) {
      return `${getScheduleClassTypeLabel(classType)}课程必须选择 1-${limit} 名学生`
    }
    return null
  }

  if (classType === 'SMALL_CLASS') {
    if (studentCount < 1) {
      return '小班课至少需要选择 1 名学生'
    }
    if (roomCapacity && studentCount > roomCapacity) {
      return `学生人数(${studentCount})超过教室容量(${roomCapacity})`
    }
  }

  return null
}
