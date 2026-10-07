import { describe, expect, it, vi } from 'vitest'
import { activeRoomUsageMessage, countActiveRoomUsage } from '@/lib/room-usage'

describe('room usage', () => {
  it('counts active class groups as the single room-occupancy source', async () => {
    const prisma = { classGroup: { count: vi.fn().mockResolvedValue(3) } }
    await expect(countActiveRoomUsage(prisma as never, 'room-1')).resolves.toEqual({ classGroups: 3, total: 3 })
  })

  it('describes the active class-group count', () => {
    expect(activeRoomUsageMessage({ classGroups: 2, total: 2 })).toContain('2 个班级')
  })
})
