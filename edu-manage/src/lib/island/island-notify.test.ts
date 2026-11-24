import { describe, it, expect, vi } from 'vitest'
import {
  islandNotify,
  notifyParentHourWarning,
  notifyTeacherClassPrompt,
  notifyAdminAlert,
} from './island-notify'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('islandNotify with Sonner Stack integration', () => {
  it('triggers sonner toast with mz-island-toast class name and default options', () => {
    islandNotify('新消息通知', { description: '详情信息' })

    expect(toast).toHaveBeenCalledWith(
      '新消息通知',
      expect.objectContaining({
        description: '详情信息',
        className: 'mz-island-toast',
        duration: 4000,
      })
    )
  })

  it('triggers notifyParentHourWarning with custom prompt and role', () => {
    const mockRenew = vi.fn()
    notifyParentHourWarning(3.0, mockRenew)

    expect(toast).toHaveBeenCalledWith(
      '课时变动提醒 · 当前在读剩余 3.0 课时',
      expect.objectContaining({
        className: 'mz-island-toast',
        action: expect.objectContaining({
          label: '立即续费保留 ›',
        }),
      })
    )
  })

  it('triggers notifyTeacherClassPrompt with teacher role', () => {
    notifyTeacherClassPrompt('初二数学培优班', '备课讲义已送达')

    expect(toast).toHaveBeenCalledWith(
      '课堂授课动态 · 初二数学培优班',
      expect.objectContaining({
        description: '备课讲义已送达',
        className: 'mz-island-toast',
      })
    )
  })

  it('triggers notifyAdminAlert with admin role', () => {
    notifyAdminAlert('突发调课冲突', '3间教室存在时段重叠')

    expect(toast).toHaveBeenCalledWith(
      '校区运营预警 · 突发调课冲突',
      expect.objectContaining({
        description: '3间教室存在时段重叠',
        className: 'mz-island-toast',
      })
    )
  })
})
