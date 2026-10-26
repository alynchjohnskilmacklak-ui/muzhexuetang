import type { Prisma, PrismaClient } from '@prisma/client'

const materialListInclude = {
  uploader: { select: { name: true } },
  teacher: { select: { id: true, name: true } },
} satisfies Prisma.StudyMaterialInclude

const materialListOrder = [
  { isPinned: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'desc' },
] satisfies Prisma.StudyMaterialOrderByWithRelationInput[]

type MaterialListOptions = {
  page?: number
  limit?: number
  count?: boolean
}

/** Shared material listing contract for administrator, teacher and parent APIs. */
export async function listStudyMaterials(
  prisma: PrismaClient,
  where: Prisma.StudyMaterialWhereInput,
  options: MaterialListOptions = {},
) {
  const page = Math.max(1, options.page || 1)
  const limit = options.limit ? Math.min(200, Math.max(1, options.limit)) : undefined
  const materialsPromise = prisma.studyMaterial.findMany({
    where,
    include: materialListInclude,
    orderBy: materialListOrder,
    ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
  })

  if (!options.count) return { materials: await materialsPromise, total: undefined, page, limit }
  const [materials, total] = await Promise.all([materialsPromise, prisma.studyMaterial.count({ where })])
  return { materials, total, page, limit }
}
