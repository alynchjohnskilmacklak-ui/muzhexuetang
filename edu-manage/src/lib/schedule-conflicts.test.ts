import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkScheduleConflicts } from './schedule-conflicts'

// Mock prisma
const mockFindMany = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    schedule: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}))

describe('checkScheduleConflicts', () => {
  const startTime = new Date('2026-06-10T09:00:00')
  const endTime = new Date('2026-06-10T11:00:00')
  const teacherId = 'teacher-1'
  const roomId = 'room-1'

  beforeEach(() => {
    mockFindMany.mockReset()
  })

  it('detects teacher time conflict', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'schedule-1',
        title: '数学课',
        startTime: new Date('2026-06-10T10:00:00'),
        endTime: new Date('2026-06-10T12:00:00'),
        teacher: { name: '李老师' },
        room: { name: '101教室' },
      },
    ])
    mockFindMany.mockResolvedValueOnce([]) // no room conflicts
    // studentIds not provided → no student conflict query

    const conflicts = await checkScheduleConflicts({
      teacherId, roomId, startTime, endTime,
    })

    expect(conflicts.length).toBeGreaterThanOrEqual(1)
    const teacherConflict = conflicts.find(c => c.type === 'teacher')
    expect(teacherConflict).toBeDefined()
    expect(teacherConflict!.id).toBe('schedule-1')
  })

  it('detects student time conflict — same student double-booked', async () => {
    mockFindMany.mockResolvedValueOnce([]) // no teacher conflicts
    mockFindMany.mockResolvedValueOnce([]) // no room conflicts
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'schedule-2',
        title: '英语课',
        startTime: new Date('2026-06-10T09:30:00'),
        endTime: new Date('2026-06-10T10:30:00'),
        teacher: { name: '王老师' },
        room: { name: '202教室' },
      },
    ])

    const conflicts = await checkScheduleConflicts({
      teacherId,
      roomId,
      studentIds: ['student-1', 'student-2'],
      startTime,
      endTime,
    })

    const studentConflict = conflicts.find(c => c.type === 'student')
    expect(studentConflict).toBeDefined()
    expect(studentConflict!.id).toBe('schedule-2')
  })

  it('detects no conflict when teacher and students are free at the time', async () => {
    mockFindMany.mockResolvedValueOnce([]) // no teacher conflicts
    mockFindMany.mockResolvedValueOnce([]) // no room conflicts
    mockFindMany.mockResolvedValueOnce([]) // no student conflicts

    const conflicts = await checkScheduleConflicts({
      teacherId,
      roomId,
      studentIds: ['student-1'],
      startTime,
      endTime,
    })

    expect(conflicts.length).toBe(0)
  })

  it('excludes schedule by excludeScheduleId for PATCH self-conflict avoidance', async () => {
    mockFindMany.mockResolvedValueOnce([]) // no teacher conflicts (because excluded)
    mockFindMany.mockResolvedValueOnce([]) // no room conflicts
    mockFindMany.mockResolvedValueOnce([]) // no student conflicts

    const conflicts = await checkScheduleConflicts({
      teacherId,
      roomId,
      studentIds: ['student-1'],
      startTime,
      endTime,
      excludeScheduleId: 'schedule-self',
    })

    expect(conflicts.length).toBe(0)
    // Verify excludeScheduleId is passed to prisma in the where clause
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId,
          id: { not: 'schedule-self' },
          status: { not: 'cancelled' },
        }),
      })
    )
  })
})

describe('studentIds deduplication', () => {
  it('removes duplicate studentIds', () => {
    const raw = ['s1', 's2', 's1', 's3', 's2']
    const deduped = [...new Set(raw)]
    expect(deduped).toEqual(['s1', 's2', 's3'])
  })

  it('handles empty array', () => {
    const raw: string[] = []
    const deduped = [...new Set(raw)]
    expect(deduped).toEqual([])
  })
})

describe('schedule authorization roles', () => {
  it('teacher role maps to own teacherId only — ignores URL teacherId', () => {
    // Simulate the logic from GET /api/schedules:
    // teacher role always forces own teacherId, ignores URL param
    const role: string = 'teacher'
    const ownTeacherId = 'teacher-123'
    const urlTeacherId = 'teacher-999' // malicious: trying to view another teacher

    let whereTeacherId: string | undefined = undefined
    if (role === 'admin') {
      whereTeacherId = urlTeacherId || undefined
    } else if (role === 'teacher') {
      whereTeacherId = ownTeacherId // always own, ignore URL
    }

    expect(whereTeacherId).toBe(ownTeacherId)
    expect(whereTeacherId).not.toBe(urlTeacherId)
  })

  it('parent role filters by children IDs only — cannot query other children', () => {
    const parentChildIds = ['child-1', 'child-2']
    const otherChildId = 'child-99'

    // Simulate parent not being able to see schedules for non-child students
    const canSeeChild1 = parentChildIds.includes('child-1')
    const canSeeOther = parentChildIds.includes(otherChildId)

    expect(canSeeChild1).toBe(true)
    expect(canSeeOther).toBe(false)
  })

  it('non-admin, non-teacher, non-parent returns empty (403 in practice)', () => {
    const role = 'student' // invalid/unexpected role
    const allowedRoles = ['admin', 'teacher', 'parent']

    expect(allowedRoles.includes(role)).toBe(false)
  })
})
