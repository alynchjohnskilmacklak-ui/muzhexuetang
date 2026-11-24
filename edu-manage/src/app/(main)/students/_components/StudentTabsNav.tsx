'use client'

import React from 'react'
import {
  CheckSquareOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  TeamOutlined,
} from '@ant-design/icons'

export type StudentTabKey = 'roster' | 'hours' | 'attendance' | 'fees'

export interface StudentTabItem {
  key: StudentTabKey
  label: string
  icon: React.ReactNode
  badge?: number | string | null
  badgeColor?: string
}

interface StudentTabsNavProps {
  activeTab: StudentTabKey
  onChange: (tab: StudentTabKey) => void
  lowHourCount?: number
  pendingFeeCount?: number
}

export function StudentTabsNav({
  activeTab,
  onChange,
  lowHourCount = 0,
  pendingFeeCount = 0,
}: StudentTabsNavProps) {
  const tabs: StudentTabItem[] = [
    {
      key: 'roster',
      label: '学员名册',
      icon: <TeamOutlined />,
    },
    {
      key: 'hours',
      label: '课时账本',
      icon: <FieldTimeOutlined />,
      badge: lowHourCount > 0 ? `${lowHourCount}告急` : null,
      badgeColor: '#E03E2D',
    },
    {
      key: 'attendance',
      label: '消课流水',
      icon: <CheckSquareOutlined />,
    },
    {
      key: 'fees',
      label: '学费订单',
      icon: <DollarOutlined />,
      badge: pendingFeeCount > 0 ? pendingFeeCount : null,
      badgeColor: '#D97706',
    },
  ]

  return (
    <div
      role="tablist"
      aria-label="学员中心功能选项卡"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 6px',
        borderRadius: 14,
        background: '#FAF6EE',
        border: '1px solid rgba(214, 180, 91, 0.28)',
        boxShadow: 'inset 0 1px 3px rgba(58, 50, 39, 0.05)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: isActive ? 750 : 600,
              color: isActive ? '#FFFFFF' : '#5A4E3A',
              backgroundColor: isActive ? '#14574D' : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(20, 87, 77, 0.26)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.2, 0, 0, 1)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              outline: 'none',
            }}
          >
            <span
              style={{
                fontSize: 15,
                lineHeight: 1,
                display: 'inline-flex',
                color: isActive ? '#D6B45B' : '#756A58',
                transition: 'color 0.18s ease',
              }}
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  padding: '0 6px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 750,
                  lineHeight: 1,
                  color: '#FFFFFF',
                  backgroundColor: tab.badgeColor || '#E03E2D',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
