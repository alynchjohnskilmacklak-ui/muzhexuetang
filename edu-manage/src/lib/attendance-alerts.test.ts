import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createManyNotifications: vi.fn(),
  qywxEnabled: vi.fn(),
}))

vi.mock('@/lib/notifications', () => ({ createManyNotifications: mocks.createManyNotifications }))
vi.mock('@/lib/qywx', () => ({ qywxEnabled: mocks.qywxEnabled }))

import { createAttendanceParentAlerts } from './attendance-alerts'

describe('createAttendanceParentAlerts', () => {
  const db = { notification: { create: vi.fn(), createMany: vi.fn() } }
  const baseInput = {
    parentUserId: 'parent-1',
    studentId: 'student-1',
    studentName: '小明',
    groupName: '初二数学班',
    status: 'PRESENT',
    config: { absenceAlert: true, lowHoursWarn: 3 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.qywxEnabled.mockReturnValue(false)
    mocks.createManyNotifications.mockResolvedValue({ count: 1 })
  })

  it('sends an absence notification only to the linked parent', async () => {
    await createAttendanceParentAlerts(db, { ...baseInput, status: 'ABSENT' })

    expect(mocks.createManyNotifications).toHaveBeenCalledWith(db, [expect.objectContaining({
      userId: 'parent-1',
      type: 'ATTENDANCE_ABSENCE',
      studentId: 'student-1',
    })])
  })

  it('warns when the posted balance crosses the configured low-hours threshold', async () => {
    await createAttendanceParentAlerts(db, { ...baseInput, beforeHours: 3.5, afterHours: 2.5 })

    expect(mocks.createManyNotifications).toHaveBeenCalledWith(db, [expect.objectContaining({
      userId: 'parent-1',
      type: 'LOW_HOURS_ALERT',
      content: expect.stringContaining('剩余 2.5 课时'),
    })])
  })

  it('does not send duplicate low-hours warnings after the balance is already below threshold', async () => {
    await createAttendanceParentAlerts(db, { ...baseInput, beforeHours: 2.5, afterHours: 1.5 })

    expect(mocks.createManyNotifications).not.toHaveBeenCalled()
  })

  it('honors disabled alert settings and missing parent bindings', async () => {
    await createAttendanceParentAlerts(db, {
      ...baseInput,
      parentUserId: null,
      status: 'ABSENT',
      config: { absenceAlert: false, lowHoursWarn: 0 },
      beforeHours: 1,
      afterHours: 0,
    })

    expect(mocks.createManyNotifications).not.toHaveBeenCalled()
  })
})
