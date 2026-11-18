'use client'

import type { ReactNode } from 'react'

export type QuickStartStep = {
  title: string
  description: string
  actionLabel: string
  href: string
  icon: ReactNode
}

// 使用指南已按需求全局收起：不再展示引导卡片（保留导出签名，避免影响各端调用方）
export function QuickStartGuide({
  storageKey: _storageKey,
  title: _title,
  steps: _steps,
}: {
  storageKey: string
  title: string
  steps: QuickStartStep[]
}) {
  return null
}
