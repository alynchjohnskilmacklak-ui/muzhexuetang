import { describe, expect, it, vi } from 'vitest'
import { listStudyMaterials } from '@/lib/material-list'

describe('listStudyMaterials', () => {
  it('uses the same associations and ordering with optional pagination', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'material-1' }])
    const count = vi.fn().mockResolvedValue(21)
    const prisma = { studyMaterial: { findMany, count } }

    await expect(listStudyMaterials(prisma as never, { subject: '数学' }, {
      page: 2,
      limit: 20,
      count: true,
    })).resolves.toMatchObject({ total: 21, page: 2, limit: 20 })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 20,
      take: 20,
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        uploader: { select: { name: true } },
        teacher: { select: { id: true, name: true } },
      },
    }))
  })
})
