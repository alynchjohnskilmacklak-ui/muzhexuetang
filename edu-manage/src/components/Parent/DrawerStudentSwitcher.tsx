'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircleFilled, DownOutlined } from '@ant-design/icons'
import { useParentChildren } from '@/hooks/useParentChildren'
import { toast } from 'sonner'

export function DrawerStudentSwitcher({ onClose }: { onClose?: () => void }) {
  const { children, activeChildId, activeChild, switchChild, hasMultipleChildren } = useParentChildren()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部自动收起下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (!activeChild) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
      }}
    >
      {/* ── 下拉框触发按钮 ── */}
      <button
        type="button"
        onClick={() => {
          if (hasMultipleChildren) {
            setDropdownOpen((prev) => !prev)
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
        aria-label={`当前学员：${activeChild.name}，点击切换孩子`}
        style={{
          all: 'unset',
          cursor: hasMultipleChildren ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2.5px 8px 2.5px 7px',
          borderRadius: 7,
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F1EA 100%)',
          border: '1px solid rgba(20, 87, 77, 0.22)',
          boxShadow: '0 1px 3px rgba(20, 87, 77, 0.08)',
          fontSize: 11.5,
          color: '#14574D',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          transition: 'all 0.16s ease',
          boxSizing: 'border-box',
          maxWidth: 175,
        }}
      >
        <span style={{ fontSize: 11 }}>👦</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeChild.name}
          {activeChild.grade ? ` (${activeChild.grade})` : ''}
        </span>
        {hasMultipleChildren && (
          <DownOutlined
            style={{
              fontSize: 8.5,
              color: '#8A6517',
              marginLeft: 2,
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        )}
      </button>

      {hasMultipleChildren && (
        <span
          style={{
            fontSize: 10.5,
            color: '#8A6517',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          切换孩子
        </span>
      )}

      {/* ── 下拉浮层列表 ── */}
      {dropdownOpen && hasMultipleChildren && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            minWidth: 160,
            background: '#FFFFFF',
            border: '1px solid rgba(20, 87, 77, 0.18)',
            borderRadius: 10,
            padding: '5px 4px',
            boxShadow: '0 8px 24px rgba(20, 60, 50, 0.16)',
            zIndex: 1250,
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 750,
              color: '#8A6517',
              padding: '3px 8px 5px',
              borderBottom: '1px solid rgba(20, 87, 77, 0.08)',
              marginBottom: 3,
            }}
          >
            点击选择在读孩子
          </div>
          {children.map((child) => {
            const isSelected = child.id === activeChildId
            return (
              <button
                key={child.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  switchChild(child.id)
                  setDropdownOpen(false)
                  toast.success(`已切换为：${child.name} (${child.grade || '学员'})`)
                  onClose?.()
                }}
                style={{
                  all: 'unset',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(20, 87, 77, 0.08)' : 'transparent',
                  color: isSelected ? '#14574D' : '#1A1201',
                  fontSize: 12,
                  fontWeight: isSelected ? 750 : 550,
                  transition: 'background 0.14s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>👦</span>
                  <span>{child.name}</span>
                  {child.grade && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: isSelected ? '#14574D' : '#8A6517',
                        fontWeight: 500,
                      }}
                    >
                      · {child.grade}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <CheckCircleFilled style={{ color: '#D6B45B', fontSize: 12 }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
