import type { Prisma } from '@prisma/client'
import type { EntityKey } from '@/lib/data-admin/entities'

const STUDENT_RELATION_ENTITIES = new Set<EntityKey>([
  'exam-papers',
  'notifications',
  'performance-posts',
  'enrollments',
  'attendances',
])

/**
 * Builds a division filter using relations that actually exist on each model.
 * Study materials are shared when sourced from the admin library, while teacher- and
 * lesson-owned materials are scoped to the selected division.
 */
export function getDataAdminDivisionScope(entity: EntityKey, division: string): object {
  if (STUDENT_RELATION_ENTITIES.has(entity)) {
    return { student: { division } }
  }

  if (entity === 'classroom-feedbacks') {
    return { teacher: { is: { division } } } satisfies Prisma.ClassroomFeedbackWhereInput
  }

  if (entity === 'materials') {
    return {
      AND: [{
        OR: [
          { source: 'ADMIN' },
          { teacher: { is: { division } } },
          { classLesson: { is: { division } } },
        ],
      }],
    } satisfies Prisma.StudyMaterialWhereInput
  }

  return { division }
}
