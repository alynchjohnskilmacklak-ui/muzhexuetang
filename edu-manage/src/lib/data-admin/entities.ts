
export type EntityKey =
  | 'students'
  | 'teachers'
  | 'class-groups'
  | 'class-lessons'
  | 'enrollments'
  | 'attendances'
  | 'exam-papers'
  | 'classroom-feedbacks'
  | 'performance-posts'
  | 'notifications'
  | 'materials'
  | 'meals'

export const DATA_ADMIN_TRASH_ENTITIES: EntityKey[] = ['students', 'class-groups', 'class-lessons', 'exam-papers', 'materials']
export const DATA_ADMIN_BUSINESS_LINKS: Record<EntityKey, string> = {
  students: '/students', teachers: '/teachers', 'class-groups': '/courses', 'class-lessons': '/schedule',
  enrollments: '/students', attendances: '/attendance', 'exam-papers': '/grades',
  'classroom-feedbacks': '/feedback-performance', 'performance-posts': '/feedback-performance',
  notifications: '/communication-center', materials: '/materials', meals: '/meals',
}

interface EntityDef {
  label: string
  model: string
  searchableFields: string[]
  editableFields: string[]
  hiddenFields: string[]
  defaultSort: { field: string; order: 'asc' | 'desc' }
  filterableFields: string[]
  sensitiveFields: string[]
}

export const DATA_ADMIN_ENTITIES: Record<EntityKey, EntityDef> = {
  students: {
    label: '学员',
    model: 'student',
    searchableFields: ['name', 'school', 'grade', 'parentPhone', 'phone'],
    editableFields: ['school', 'birthYear', 'notes'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'grade'],
    sensitiveFields: [],
  },
  teachers: {
    label: '教师',
    model: 'teacher',
    searchableFields: ['name', 'phone', 'subjects', 'email'],
    editableFields: ['education', 'university', 'major', 'graduationYear', 'currentUnit', 'bio'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'employmentType'],
    sensitiveFields: [],
  },
  'class-groups': {
    label: '班级',
    model: 'classGroup',
    searchableFields: ['name'],
    editableFields: ['note'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: [],
  },
  'class-lessons': {
    label: '课次',
    model: 'classLesson',
    searchableFields: ['subject'],
    editableFields: ['note'],
    hiddenFields: [],
    defaultSort: { field: 'lessonDate', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: [],
  },
  enrollments: {
    label: '课时',
    model: 'enrollment',
    searchableFields: [],
    editableFields: [],
    hiddenFields: ['usedHours', 'remainHours', 'totalHours'],
    defaultSort: { field: 'enrolledAt', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: ['usedHours', 'remainHours', 'totalHours'],
  },
  attendances: {
    label: '考勤',
    model: 'attendance',
    searchableFields: [],
    editableFields: [],
    hiddenFields: ['hoursDeducted'],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: ['hoursDeducted'],
  },
  'exam-papers': {
    label: '试卷',
    model: 'examPaper',
    searchableFields: ['title', 'subject'],
    editableFields: ['overallComment'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'subject'],
    sensitiveFields: [],
  },
  'classroom-feedbacks': {
    label: '课堂反馈',
    model: 'classroomFeedback',
    searchableFields: ['summary'],
    editableFields: [],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'targetType'],
    sensitiveFields: [],
  },
  'performance-posts': {
    label: '表现动态',
    model: 'performancePost',
    searchableFields: ['content'],
    editableFields: [],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['type', 'visibility'],
    sensitiveFields: [],
  },
  notifications: {
    label: '通知',
    model: 'notification',
    searchableFields: ['title', 'content', 'type'],
    editableFields: [],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'type'],
    sensitiveFields: [],
  },
  materials: {
    label: '学习资料',
    model: 'studyMaterial',
    searchableFields: ['title', 'subject'],
    editableFields: ['description'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'grade', 'subject', 'audience'],
    sensitiveFields: [],
  },
  meals: {
    label: '就餐菜单',
    model: 'mealMenu',
    searchableFields: ['mainDish', 'sideDish'],
    editableFields: [],
    hiddenFields: [],
    defaultSort: { field: 'weekStart', order: 'desc' },
    filterableFields: ['mealType', 'dayOfWeek'],
    sensitiveFields: [],
  },
}

export const SENSITIVE_PATTERNS = [
  'password', 'sessionToken', 'access_token', 'refresh_token',
  'emailVerified', 'verificationToken', 'hashedPassword', 'secret',
  'apiKey', 'api_key', 'token', 'credential',
]

export function sanitizeDataAdminRecord(record: unknown): unknown {
  if (record === null || record === undefined) return record
  if (Array.isArray(record)) return record.map(sanitizeDataAdminRecord)
  if (typeof record === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
      const lower = key.toLowerCase()
      if (SENSITIVE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) continue
      out[key] = sanitizeDataAdminRecord(value)
    }
    return out
  }
  return record
}

export function filterEditableFields(entityKey: EntityKey, data: Record<string, unknown>): Record<string, unknown> {
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const allowed = new Set(def.editableFields)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.has(key)) throw new Error(`字段 ${key} 请通过业务页面修改`)
    if (key === 'birthYear' || key === 'graduationYear') {
      if (value !== null && typeof value !== 'number' && typeof value !== 'string') throw new Error('年份必须为数字')
      const year = value === '' || value === null ? null : Number(value)
      if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 10)) throw new Error('年份须为1900年至当前年份后10年之间的整数')
      out[key] = year
    } else {
      if (value !== null && typeof value !== 'string') throw new Error(`字段 ${key} 必须为文本`)
      if (typeof value === 'string' && value.length > 10000) throw new Error(`字段 ${key} 最多10000字`)
      out[key] = value
    }
  }
  return out
}

export function getSoftDeleteConfig(entityKey: EntityKey): {
  field: string
  deletedValue: string
  activeValue: string
} | null {
  const configs: Record<string, { field: string; deletedValue: string; activeValue: string }> = {
    students: { field: 'status', deletedValue: 'INACTIVE', activeValue: 'ACTIVE' },
    teachers: { field: 'status', deletedValue: 'RESIGNED', activeValue: 'ACTIVE' },
    'class-groups': { field: 'status', deletedValue: 'ARCHIVED', activeValue: 'ACTIVE' },
    'class-lessons': { field: 'status', deletedValue: 'CANCELLED', activeValue: 'SCHEDULED' },
    'exam-papers': { field: 'status', deletedValue: 'DELETED', activeValue: 'PUBLISHED' },
    notifications: { field: 'status', deletedValue: 'DELETED', activeValue: 'ACTIVE' },
    materials: { field: 'status', deletedValue: 'DELETED', activeValue: 'PUBLISHED' },
    'classroom-feedbacks': { field: 'status', deletedValue: 'DELETED', activeValue: 'PUBLISHED' },
  }
  return configs[entityKey] || null
}

