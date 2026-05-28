export const TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一', ONE_ON_TWO: '一对二', ONE_ON_THREE: '一对三',
  SMALL_GROUP: '小组课', GROUP: '精品班课', SMALL_CLASS: '小班课',
}

export const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  scheduled: { text: '待上课', color: 'blue' },
  cancelled: { text: '已取消', color: 'red' },
  SCHEDULED: { text: '待上课', color: 'blue' },
  IN_PROGRESS: { text: '进行中', color: 'processing' },
  COMPLETED: { text: '已完成', color: 'green' },
  CANCELLED: { text: '已停课', color: 'red' },
  POSTPONED: { text: '已调课', color: 'orange' },
}

export const CLASS_TYPE_OPTIONS = [
  { label: '一对一', value: 'ONE_ON_ONE' },
  { label: '小班课', value: 'SMALL_CLASS' },
]

export const USAGE_TYPE_OPTIONS = [
  { label: '一对一教室', value: 'ONE_ON_ONE' },
  { label: '小班课教室', value: 'SMALL_CLASS' },
  { label: '通用教室', value: 'GENERAL' },
]

export const USAGE_TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一教室', SMALL_CLASS: '小班课教室', GENERAL: '通用教室',
}

export const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治']
