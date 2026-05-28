import { MaterialAudience, MaterialStatus, type Prisma } from '@prisma/client'

export const visibleMaterialWhere = {
  status: MaterialStatus.PUBLISHED,
} satisfies Prisma.StudyMaterialWhereInput

export function parentVisibleMaterialWhere(): Prisma.StudyMaterialWhereInput {
  return {
    status: MaterialStatus.PUBLISHED,
    audience: { in: [MaterialAudience.STUDENT, MaterialAudience.BOTH] },
  }
}

export function teacherVisibleMaterialWhere(teacherId: string, userId?: string): Prisma.StudyMaterialWhereInput {
  return {
    status: MaterialStatus.PUBLISHED,
    OR: [
      { audience: { in: [MaterialAudience.STUDENT, MaterialAudience.TEACHER, MaterialAudience.BOTH] } },
      { teacherId },
      ...(userId ? [{ uploadedBy: userId }] : []),
    ],
  }
}

export function teacherOwnMaterialWhere(teacherId: string, userId?: string): Prisma.StudyMaterialWhereInput {
  return {
    status: { not: MaterialStatus.DELETED },
    OR: [
      { teacherId },
      ...(userId ? [{ uploadedBy: userId }] : []),
    ],
  }
}

export function adminVisibleMaterialWhere(includeDeleted = false): Prisma.StudyMaterialWhereInput {
  return includeDeleted ? {} : { status: { not: MaterialStatus.DELETED } }
}

export function normalizeMaterialAudience(value: unknown): MaterialAudience {
  return value === MaterialAudience.TEACHER || value === MaterialAudience.BOTH
    ? value
    : MaterialAudience.STUDENT
}

export function normalizeMaterialStatus(value: unknown): MaterialStatus {
  return value === MaterialStatus.DRAFT ? MaterialStatus.DRAFT : MaterialStatus.PUBLISHED
}
