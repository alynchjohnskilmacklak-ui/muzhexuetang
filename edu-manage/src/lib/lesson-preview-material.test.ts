import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadBuffer: vi.fn(),
  hasValidMaterialFileSignature: vi.fn(),
  isLessonTaughtBy: vi.fn(),
  isWeekendLesson: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({ uploadBuffer: mocks.uploadBuffer }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/material-file', () => ({ hasValidMaterialFileSignature: mocks.hasValidMaterialFileSignature }))
vi.mock('@/lib/lesson-preview', () => ({
  isLessonTaughtBy: mocks.isLessonTaughtBy,
  isWeekendLesson: mocks.isWeekendLesson,
}))

import { publishLessonPreviewMaterial } from './lesson-preview-material'

function createPrismaDouble() {
  const tx = {
    classLesson: {
      findMany: vi.fn().mockResolvedValue([{ id: 'sibling-1' }, { id: 'sibling-2' }]),
    },
    studyMaterial: {
      create: vi.fn().mockResolvedValue({ id: 'main-material', classLessonId: 'lesson-1' }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  }
  const prisma = {
    classLesson: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        teacherId: 'teacher-1',
        subject: '数学',
        lessonDate: new Date('2026-10-24T00:00:00+08:00'),
        group: {
          id: 'group-1',
          teacherId: 'teacher-1',
          teacherAssignments: [],
          term: { kind: 'WEEKEND', status: 'ACTIVE' },
          course: { grade: '初中', subject: '数学' },
        },
      }),
    },
    studyMaterial: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn((callback: (client: unknown) => Promise<unknown>) => callback(tx)),
  }

  return { prisma: prisma as unknown as PrismaClient, tx }
}

function input(prisma: PrismaClient) {
  const file = {
    name: 'lesson.pdf',
    size: 3,
    type: 'application/pdf',
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  } as File

  return {
    prisma,
    actor: { role: 'TEACHER' as const, userId: 'user-1', teacherId: 'teacher-1', division: 'JUNIOR' },
    classLessonId: 'lesson-1',
    file,
    title: '本节讲义',
  }
}

describe('publishLessonPreviewMaterial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.uploadBuffer.mockResolvedValue({
      storageKey: 'materials/lesson-previews-file.pdf',
      storageDriver: 'local',
      url: '/api/uploads/materials/lesson-previews-file.pdf',
    })
    mocks.hasValidMaterialFileSignature.mockReturnValue(true)
    mocks.isLessonTaughtBy.mockReturnValue(true)
    mocks.isWeekendLesson.mockReturnValue(true)
  })

  it('writes the main lesson and all sibling copies in one transaction batch', async () => {
    const { prisma, tx } = createPrismaDouble()

    const result = await publishLessonPreviewMaterial(input(prisma))

    expect(result).toMatchObject({ id: 'main-material', classLessonId: 'lesson-1' })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(tx.studyMaterial.create).toHaveBeenCalledOnce()
    expect(tx.classLesson.findMany).toHaveBeenCalledOnce()
    expect(tx.studyMaterial.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ classLessonId: 'sibling-1', fileUrl: 'materials/lesson-previews-file.pdf' }),
        expect.objectContaining({ classLessonId: 'sibling-2', fileUrl: 'materials/lesson-previews-file.pdf' }),
      ]),
      skipDuplicates: true,
    })
  })

  it('surfaces sibling-copy write failures so the database transaction can roll back', async () => {
    const { prisma, tx } = createPrismaDouble()
    tx.studyMaterial.createMany.mockRejectedValue(new Error('sibling write failed'))

    await expect(publishLessonPreviewMaterial(input(prisma))).rejects.toThrow('sibling write failed')
  })
})
