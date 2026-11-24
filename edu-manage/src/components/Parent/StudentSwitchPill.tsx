'use client'

import { Dropdown } from 'antd'
import { CheckOutlined, DownOutlined, UserOutlined } from '@ant-design/icons'
import { useParentChildren } from '@/hooks/useParentChildren'

export interface StudentSwitchPillProps {
  isDarkHeader?: boolean
  className?: string
}

export function StudentSwitchPill({ isDarkHeader = false, className }: StudentSwitchPillProps) {
  const { children, activeChildId, activeChild, switchChild, hasMultipleChildren } = useParentChildren()

  if (!activeChild) return null

  // If only 1 child, render a gentle non-clickable name badge
  if (!hasMultipleChildren) {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          height: 28,
          borderRadius: 999,
          background: isDarkHeader ? 'rgba(214, 180, 91, 0.12)' : 'rgba(20, 87, 77, 0.06)',
          border: isDarkHeader ? '1px solid rgba(214, 180, 91, 0.28)' : '1px solid rgba(20, 87, 77, 0.15)',
          color: isDarkHeader ? '#F6E9C8' : '#14574D',
          fontSize: 11.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{activeChild.name}</span>
        {activeChild.grade && <span style={{ opacity: 0.75, fontSize: 10.5 }}>· {activeChild.grade}</span>}
      </div>
    )
  }

  // Multiple children: clickable dropdown switcher
  const menuItems = children.map((child) => ({
    key: child.id,
    label: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minWidth: 150,
          padding: '4px 2px',
        }}
      >
        <div>
          <span
            style={{
              fontWeight: child.id === activeChildId ? 750 : 500,
              color: child.id === activeChildId ? '#14574D' : '#1A1201',
              fontSize: 13,
            }}
          >
            {child.name}
          </span>
          {child.grade && (
            <span style={{ fontSize: 11.5, color: '#8A6517', marginLeft: 6 }}>
              {child.grade}
            </span>
          )}
        </div>
        {child.id === activeChildId && (
          <CheckOutlined style={{ color: '#14574D', fontSize: 13, fontWeight: 800 }} />
        )}
      </div>
    ),
    onClick: () => switchChild(child.id),
  }))

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
      getPopupContainer={() => document.getElementById('mobile-root') ?? document.body}
    >
      <button
        type="button"
        aria-label="切换当前查看的学生"
        className={className}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          height: 28,
          borderRadius: 999,
          background: isDarkHeader
            ? 'linear-gradient(135deg, rgba(214, 180, 91, 0.22) 0%, rgba(214, 180, 91, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(20, 87, 77, 0.1) 0%, rgba(20, 87, 77, 0.05) 100%)',
          border: isDarkHeader
            ? '1px solid rgba(214, 180, 91, 0.42)'
            : '1px solid rgba(20, 87, 77, 0.22)',
          color: isDarkHeader ? '#F6E9C8' : '#14574D',
          fontSize: 11.5,
          fontWeight: 650,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{activeChild.name}</span>
        {activeChild.grade && (
          <span style={{ opacity: 0.8, fontSize: 10.5 }}>· {activeChild.grade}</span>
        )}
        <DownOutlined style={{ fontSize: 9, opacity: 0.75, marginLeft: 1 }} />
      </button>
    </Dropdown>
  )
}
