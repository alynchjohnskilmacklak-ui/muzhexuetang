import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  FeedbackArchiveAccessError,
  getFeedbackArchive,
  getFeedbackArchiveDetail,
} from './archive'

const baseDate = new Date('2026-07-20T10:00:00.000Z')

function makeFeedback(index: number, teacherId = 'teacher-1', studentIds = ['student-a']) {
  const id = `feedback-${index}`
  const lessonDate = new Date(baseDate.getTime() + index * 60_000)
  const group = {
    id: 'group-1',
    name: '初二一班',
    course: { name: '初二数学', subject: '数学' },
    teacherAssignments: [{ teacherId, subject: teacherId === 'teacher-2' ? '物理' : '数学' }],
  }
  return {
    metadata: {
      id,
      teacherId,
      feedbackGroupId: null,
      createdAt: lessonDate,
      classLesson: { teacherId, subject: teacherId === 'teacher-2' ? '物理' : '数学', lessonDate, group },
    },
    record: {
      id,
      teacherId,
      feedbackGroupId: null,
      studentIds,
      lessonContent: `本节讲解一元二次方程第${index}课时的解法与例题`,
      overallComment: `总体评价${index}`,
      summary: `课堂小结${index}`,
      knowledgePoints: ['知识点'],
      homework: [],
      tags: ['积极'],
      badge: null,
      studentRatings: studentIds.map((studentId) => ({ studentId, rating: studentId === 'student-a' ? 'GREAT' : 'OKAY' })),
      imageUrls: [`original-${index}.jpg`],
      parentReply: null,
      parentRepliedAt: null,
      parentMessages: [],
      createdAt: lessonDate,
      status: 'PUBLISHED',
      teacher: { id: teacherId, name: teacherId === 'teacher-2' ? '教师二' : '教师一' },
      classLesson: { teacherId, subject: teacherId === 'teacher-2' ? '物理' : '数学', lessonDate, group },
    },
  }
}

function createPrisma(feedbackRows: ReturnType<typeof makeFeedback>[]) {
  const metadata = feedbackRows.map((row) => row.metadata)
  const records = feedbackRows.map((row) => row.record)
  const prisma = {
    student: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => where.id === 'missing'
        ? null
        : { id: where.id, name: where.id === 'student-b' ? '学生B' : '学生A', grade: '初二', division: 'JUNIOR' }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ('OR' in where) return [{ id: 'student-a' }]
        const ids = (where.id as { in: string[] }).in
        return ids.map((id) => ({ id, name: id === 'student-b' ? '学生B' : '学生A', grade: '初二' }))
      }),
    },
    classroomFeedback: {
      findFirst: vi.fn(async ({ where }: { where: { teacherId: string; studentIds: { has: string } } }) => {
        const row = records.find((record) => record.teacherId === where.teacherId && record.studentIds.includes(where.studentIds.has))
        return row ? { id: row.id } : null
      }),
      findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select: Record<string, unknown> }) => {
        let indexes = metadata.map((_row, index) => index)
        if (typeof where.teacherId === 'string') indexes = indexes.filter((index) => metadata[index].teacherId === where.teacherId)
        if (where.studentIds && typeof where.studentIds === 'object' && 'has' in where.studentIds) {
          const studentId = (where.studentIds as { has: string }).has
          indexes = indexes.filter((index) => records[index].studentIds.includes(studentId))
        }
        if (where.id && typeof where.id === 'object' && 'in' in where.id) {
          const ids = (where.id as { in: string[] }).in
          indexes = indexes.filter((index) => ids.includes(metadata[index].id))
        }
        return select.studentIds ? indexes.map((index) => records[index]) : indexes.map((index) => metadata[index])
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = records.find((record) => record.id === where.id)
        if (!row) return null
        return {
          ...row,
          mood: 'GOOD',
          adminReply: null,
          parentMessages: [],
          classLesson: row.classLesson ? { id: 'lesson-1', startTime: '10:00', endTime: '11:00', ...row.classLesson } : null,
        }
      }),
    },
    classGroup: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(async () => records.flatMap((record) => record.imageUrls.map((url) => ({
      id: `asset-${url}`,
      url,
      storageKey: url,
      previewUrl: `preview-${url}.webp`,
      thumbnailUrl: `thumbnail-${url}.webp`,
    })))),
  }
  return prisma as unknown as PrismaClient
}

describe('student classroom feedback archive', () => {
  it('lets an administrator see feedback from both teachers', async () => {
    const result = await getFeedbackArchive(
      createPrisma([makeFeedback(1), makeFeedback(2, 'teacher-2')]),
      { id: 'admin', role: 'admin', division: 'JUNIOR' },
      { studentId: 'student-a' },
    )
    expect(result.items).toHaveLength(2)
    expect(result.summary.teacherCount).toBe(2)
  })

  it('limits a teacher archive to feedback created by that teacher', async () => {
    const result = await getFeedbackArchive(
      createPrisma([makeFeedback(1), makeFeedback(2, 'teacher-2')]),
      { id: 'teacher-user-1', role: 'teacher', teacherId: 'teacher-1' },
      { studentId: 'student-a' },
    )
    expect(result.items.map((item) => item.teacher.id)).toEqual(['teacher-1'])
  })

  it('does not reveal another teacher feedback through a direct filter', async () => {
    const result = await getFeedbackArchive(
      createPrisma([makeFeedback(1), makeFeedback(2, 'teacher-2')]),
      { id: 'teacher-user-1', role: 'teacher', teacherId: 'teacher-1' },
      { studentId: 'student-a', teacherId: 'teacher-2' },
    )
    expect(result.items).toEqual([])
  })

  it('allows a parent only for the linked child', async () => {
    const prisma = createPrisma([makeFeedback(1)])
    await expect(getFeedbackArchive(prisma, { id: 'parent-a', role: 'parent' }, { studentId: 'student-a' }))
      .resolves.toMatchObject({ student: { id: 'student-a' } })
    await expect(getFeedbackArchive(prisma, { id: 'parent-a', role: 'parent' }, { studentId: 'student-b' }))
      .rejects.toBeInstanceOf(FeedbackArchiveAccessError)
  })

  it('redacts other students and ratings from a multi-student archive item', async () => {
    const result = await getFeedbackArchive(
      createPrisma([makeFeedback(1, 'teacher-1', ['student-a', 'student-b'])]),
      { id: 'parent-a', role: 'parent' },
      { studentId: 'student-a' },
    )
    expect(result.items[0].studentRating).toBe('GREAT')
    expect(JSON.stringify(result)).not.toContain('student-b')
  })

  it('paginates 21 feedback items as 20 and 1', async () => {
    const prisma = createPrisma(Array.from({ length: 21 }, (_value, index) => makeFeedback(index + 1)))
    const first = await getFeedbackArchive(prisma, { id: 'admin', role: 'admin', division: 'JUNIOR' }, { studentId: 'student-a', pageSize: 20, page: 1 })
    const second = await getFeedbackArchive(prisma, { id: 'admin', role: 'admin', division: 'JUNIOR' }, { studentId: 'student-a', pageSize: 20, page: 2 })
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(1)
    expect(first.pagination.totalCount).toBe(21)
  })

  it('keeps originals out of list DTOs and exposes preview/original only in detail', async () => {
    const prisma = createPrisma([makeFeedback(1)])
    const archive = await getFeedbackArchive(prisma, { id: 'admin', role: 'admin', division: 'JUNIOR' }, { studentId: 'student-a' })
    expect(archive.items[0].images[0]).toEqual(expect.objectContaining({
      thumbnailUrl: expect.stringContaining('thumbnail-'),
      previewUrl: expect.stringContaining('preview-'),
    }))
    expect(archive.items[0].images[0]).not.toHaveProperty('originalUrl')

    const detail = await getFeedbackArchiveDetail(prisma, { id: 'admin', role: 'admin', division: 'JUNIOR' }, 'feedback-1')
    expect(detail.images[0]).toEqual(expect.objectContaining({
      previewUrl: expect.stringContaining('preview-'),
      originalUrl: 'original-1.jpg',
    }))
  })

  it('returns an empty page for a student without feedback', async () => {
    const result = await getFeedbackArchive(
      createPrisma([]),
      { id: 'admin', role: 'admin', division: 'JUNIOR' },
      { studentId: 'student-a' },
    )
    expect(result.items).toEqual([])
    expect(result.summary.totalCount).toBe(0)
  })
})
