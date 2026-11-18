import type { PrismaClient } from '@prisma/client'
import type { EntityKey } from './entities'
import { restoreTrashRecord, softDeleteEntity, type TrashEntityType } from '@/lib/data-correction/trash'

export const DATA_ADMIN_TRASH_TYPES: Partial<Record<EntityKey, TrashEntityType>> = {
  students: 'Student', 'class-groups': 'ClassGroup', 'class-lessons': 'ClassLesson',
  'exam-papers': 'ExamPaper', materials: 'StudyMaterial',
}
export const DATA_ADMIN_BATCH_ENTITIES = Object.keys(DATA_ADMIN_TRASH_TYPES) as EntityKey[]

/** Single and batch actions use exactly the same impact and recovery service. */
export async function mutateDataAdminRecord(
  prisma: PrismaClient, entity: EntityKey, id: string, action: 'softDelete' | 'restore',
  user: { id: string; name?: string | null }, reason: string,
) {
  const type = DATA_ADMIN_TRASH_TYPES[entity]
  if (!type) throw new Error('此类记录请通过对应业务页面操作，不支持底层删除或恢复')
  if (action === 'softDelete') return softDeleteEntity(prisma, type, id, user, reason)
  const record = await prisma.deletedRecord.findFirst({
    where: { entityType: type, entityId: id, deletionBatchId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!record) throw new Error('没有可恢复的回收站记录；停用、取消或归档请到业务页面处理')
  return restoreTrashRecord(prisma, record.id, user.id)
}
