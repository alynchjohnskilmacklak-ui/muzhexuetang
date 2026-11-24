import { toast } from 'sonner'
import type { ReactNode } from 'react'

export interface IslandToastOptions {
  description?: string
  badge?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  role?: 'parent' | 'teacher' | 'admin'
}

/**
 * 触发基于 Emil Kowalski Sonner 堆叠物理引擎的灵动岛卡片通知
 * 具备墨玉流金外观、卡片堆叠物理反弹、多层边缘外露（漏一个边）与平滑手势展开
 */
export function islandNotify(title: string, options: IslandToastOptions = {}) {
  const { description, action, duration = 4000 } = options

  return toast(title, {
    description,
    duration,
    className: 'mz-island-toast',
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  })
}

/**
 * 家长端 · 课时消耗与低课时预警通知
 */
export function notifyParentHourWarning(
  remainingHours: number,
  onRenew?: () => void
) {
  return islandNotify(`课时变动提醒 · 当前在读剩余 ${remainingHours.toFixed(1)} 课时`, {
    description:
      '马子墨今日课时已完成考勤核销。当前课时已低于安全线，建议及时预约保留原班原座。',
    role: 'parent',
    action: onRenew
      ? {
          label: '立即续费保留 ›',
          onClick: onRenew,
        }
      : undefined,
  })
}

/**
 * 教师端 · 上课及备课提醒
 */
export function notifyTeacherClassPrompt(
  className: string,
  hint: string,
  onJump?: () => void
) {
  return islandNotify(`课堂授课动态 · ${className}`, {
    description: hint,
    role: 'teacher',
    action: onJump
      ? {
          label: '进入工作台 ›',
          onClick: onJump,
        }
      : undefined,
  })
}

/**
 * 管理端 · 校区运行预警
 */
export function notifyAdminAlert(
  title: string,
  detail: string,
  onAction?: () => void
) {
  return islandNotify(`校区运营预警 · ${title}`, {
    description: detail,
    role: 'admin',
    action: onAction
      ? {
          label: '前往处理 ›',
          onClick: onAction,
        }
      : undefined,
  })
}
