import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const termStart = '2099-12-01'
const termEnd = '2099-12-31'
const sourceStart = '2099-12-01'
const oldLessonDate = '2099-12-05'
const newStartDate = '2099-12-10'
const targetLessonDate = '2099-12-14'

function sourceGroup() {
  return {
    id: 'source-group',
    name: '高中数学班',
    division: 'SENIOR',
    courseId: 'course-1',
    teacherId: 'teacher-1',
    roomId: 'room-1',
    maxStudents: 10,
    startDate: localDateColumnValue(sourceStart),
    totalLessons: 4,
    recurringDays: [6],
    lessonStartTime: '09:00',
    lessonMinutes: 60,
    note: null,
    course: { id: 'course-1', name: '数学', subject: '数学', isActive: true, deletedAt: null, division: 'SENIOR' },
    teacher: { id: 'teacher-1', name: '任老师', status: 'ACTIVE', division: 'SENIOR' },
    room: { id: 'room-1', name: '201教室' },
    teacherAssignments: [],
    classLessons: [{
      id: 'lesson-1',
      groupId: 'source-group',
      teacherId: 'teacher-1',
      subject: '数学',
      lessonDate: localDateColumnValue(oldLessonDate),
      startTime: '09:00',
      endTime: '10:00',
      teacher: { id: 'teacher-1', name: '任老师', status: 'ACTIVE', division: 'SENIOR' },
    }],
  }
}

function request(startDate = newStartDate) {
  return new NextRequest('http://localhost/api/class-groups/source-group/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newStartDate: startDate }),
  })
}

function setup(existingLessons: Record<string, unknown>[] = []) {
  const source = sourceGroup()
  const tx = {
    academicTerm: { findFirst: vi.fn().mockResolvedValue({ id: 'term-1', startDate: localDateColumnValue(termStart), endDate: localDateColumnValue(termEnd) }) },
    classGroup: {
      findFirst: vi.fn().mockResolvedValue(source),
      create: vi.fn().mockResolvedValue({ id: 'new-group', name: '高中数学班（副本）' }),
    },
    teacher: { findMany: vi.fn().mockResolvedValue([{ id: 'teacher-1' }]) },
    classLesson: {
      findMany: vi.fn().mockResolvedValue(existingLessons),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    classGroupTeacher: { createMany: vi.fn() },
    activityLog: { create: vi.fn() },
  }
  const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>, _options?: unknown) => callback(tx))
  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'SENIOR' })
  mocks.getRequestDivision.mockReturnValue('SENIOR')
  mocks.getActiveAcademicTerm.mockResolvedValue({ id: 'term-1', startDate: localDateColumnValue(termStart), endDate: localDateColumnValue(termEnd) })
  mocks.getRequestPrisma.mockResolvedValue({ $transaction: transaction })
  return { source, tx, transaction }
}

describe('POST /api/class-groups/[id]/copy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('copies future lessons into the active term with the correct division and serializable protection', async () => {
    const { tx, transaction } = setup()

    const response = await POST(request(), { params: Promise.resolve({ id: 'source-group' }) })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({ id: 'new-group', lessonCount: 1 })
    expect(tx.classGroup.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'source-group', division: 'SENIOR', deletedAt: null },
      include: expect.objectContaining({
        classLessons: expect.objectContaining({ where: { deletedAt: null, status: { notIn: ['CANCELLED', 'POSTPONED'] } } }),
      }),
    }))
    expect(tx.classLesson.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        division: 'SENIOR',
        lessonDate: localDateColumnValue(targetLessonDate),
        teacherId: 'teacher-1',
        status: 'SCHEDULED',
      })],
    })
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it('does not create a group if the copied teacher or room conflicts with an existing lesson', async () => {
    const conflictingLesson = {
      id: 'other-lesson',
      groupId: 'other-group',
      teacherId: 'teacher-1',
      subject: '英语',
      lessonDate: localDateColumnValue(targetLessonDate),
      startTime: '09:30',
      endTime: '10:30',
      teacher: { id: 'teacher-1', name: '任老师' },
      group: {
        name: '英语班',
        teacherId: 'teacher-1',
        roomId: 'room-2',
        teacher: { id: 'teacher-1', name: '任老师' },
        room: { id: 'room-2', name: '202教室' },
        teacherAssignments: [],
      },
    }
    const { tx } = setup([conflictingLesson])

    const response = await POST(request(), { params: Promise.resolve({ id: 'source-group' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toContain('复制后的课表存在冲突')
    expect(tx.classGroup.create).not.toHaveBeenCalled()
    expect(tx.classLesson.createMany).not.toHaveBeenCalled()
  })

  it('rejects an invalid start date before opening a write transaction', async () => {
    const { transaction } = setup()

    const response = await POST(request('2026-02-30'), { params: Promise.resolve({ id: 'source-group' }) })

    expect(response.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })
})
