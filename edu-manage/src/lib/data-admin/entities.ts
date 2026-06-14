import { Prisma } from '@prisma/client'

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
    editableFields: ['name', 'gender', 'birthYear', 'grade', 'school', 'phone', 'email', 'parentName', 'parentPhone', 'status', 'source', 'notes', 'mainTeacherId'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'grade'],
    sensitiveFields: [],
  },
  teachers: {
    label: '教师',
    model: 'teacher',
    searchableFields: ['name', 'phone', 'subjects', 'email'],
    editableFields: ['name', 'gender', 'email', 'avatar', 'employmentType', 'status', 'education', 'university', 'major', 'graduationYear', 'currentUnit', 'subjects', 'bio', 'monthlyHours'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'employmentType'],
    sensitiveFields: [],
  },
  'class-groups': {
    label: '班级',
    model: 'classGroup',
    searchableFields: ['name'],
    editableFields: ['name', 'roomId', 'maxStudents', 'status', 'totalLessons', 'startDate', 'endDate', 'lessonStartTime', 'lessonMinutes', 'note'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: [],
  },
  'class-lessons': {
    label: '课次',
    model: 'classLesson',
    searchableFields: ['subject'],
    editableFields: ['status', 'cancelReason', 'note', 'lessonDate', 'startTime', 'endTime', 'teacherId'],
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
    editableFields: ['status', 'actualMinutes', 'hoursDeducted'],
    hiddenFields: ['hoursDeducted'],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status'],
    sensitiveFields: ['hoursDeducted'],
  },
  'exam-papers': {
    label: '试卷',
    model: 'examPaper',
    searchableFields: ['title', 'subject'],
    editableFields: ['title', 'subject', 'paperDate', 'overallComment', 'tags', 'status'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'subject'],
    sensitiveFields: [],
  },
  'classroom-feedbacks': {
    label: '课堂反馈',
    model: 'classroomFeedback',
    searchableFields: ['summary'],
    editableFields: ['summary', 'homework', 'status', 'knowledgePoints'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'targetType'],
    sensitiveFields: [],
  },
  'performance-posts': {
    label: '表现动态',
    model: 'performancePost',
    searchableFields: ['content'],
    editableFields: ['content', 'type', 'mood', 'visibility', 'isPinned'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['type', 'visibility'],
    sensitiveFields: [],
  },
  notifications: {
    label: '通知',
    model: 'notification',
    searchableFields: ['title', 'content', 'type'],
    editableFields: ['title', 'content', 'status', 'type'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'type'],
    sensitiveFields: [],
  },
  materials: {
    label: '学习资料',
    model: 'studyMaterial',
    searchableFields: ['title', 'subject'],
    editableFields: ['title', 'grade', 'subject', 'description', 'status', 'audience', 'isPinned'],
    hiddenFields: [],
    defaultSort: { field: 'createdAt', order: 'desc' },
    filterableFields: ['status', 'grade', 'subject', 'audience'],
    sensitiveFields: [],
  },
  meals: {
    label: '就餐',
    model: 'mealMenu',
    searchableFields: ['mainDish', 'sideDish'],
    editableFields: ['mainDish', 'sideDish', 'allowDouble', 'notes'],
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
    if (allowed.has(key)) out[key] = value
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

export async function createActivityLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getRequestPrisma: getReqPrisma } = require('@/lib/prisma') as typeof import('@/lib/prisma')
  const prisma = await getReqPrisma()
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      detail: `${action}: ${entityType} ${entityId}`,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function createDeletedRecord(
  entityType: string,
  entityId: string,
  entityName: string | null,
  payload: unknown,
  deletedById: string,
  reason: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getRequestPrisma: getReqPrisma } = require('@/lib/prisma') as typeof import('@/lib/prisma')
  const prisma = await getReqPrisma()
  await prisma.deletedRecord.create({
    data: {
      entityType,
      entityId,
      entityName,
      payload: JSON.parse(JSON.stringify(payload)),
      deletedById,
      reason,
    },
  })
}
