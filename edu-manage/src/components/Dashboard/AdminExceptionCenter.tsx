'use client'

import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  buildAdminExceptions,
  type AdminExceptionMetrics,
} from '@/lib/dashboard-workflows'

const priorityMeta = {
  urgent: {
    color: '#C0392B',
    background: '#FFF1F0',
    border: 'rgba(192, 57, 43, 0.22)',
    icon: <ExclamationCircleOutlined />,
    label: '优先处理',
  },
  attention: {
    color: '#D97706',
    background: '#FFFBEB',
    border: 'rgba(217, 119, 6, 0.22)',
    icon: <ExclamationCircleOutlined />,
    label: '需要关注',
  },
  info: {
    color: '#14574D',
    background: '#E7F5EF',
    border: 'rgba(20, 87, 77, 0.22)',
    icon: <MessageOutlined />,
    label: '跟进提醒',
  },
}

export function AdminExceptionCenter({ metrics }: { metrics: AdminExceptionMetrics }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const items = buildAdminExceptions(metrics)
  const urgentCount = items
    .filter((item) => item.priority === 'urgent')
    .reduce((sum, item) => sum + item.count, 0)
  const totalCount = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <section
      id="admin-exception-center"
      aria-labelledby="admin-exception-center-title"
      style={{
        padding: isMobile ? '14px 14px' : '18px 20px',
        borderRadius: 16,
        background: '#FFFDF7',
        border: urgentCount > 0 ? '1px solid rgba(192, 57, 43, 0.24)' : '1px solid rgba(214, 180, 91, 0.28)',
        boxShadow: urgentCount > 0 ? '0 4px 18px rgba(192, 57, 43, 0.06)' : '0 4px 18px rgba(20, 87, 77, 0.05)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: items.length ? 14 : 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 3.5, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #D6B45B 0%, #14574D 100%)' }} />
            <h2
              id="admin-exception-center-title"
              style={{ margin: 0, fontSize: isMobile ? 15 : 16, fontWeight: 800, color: '#14574D', letterSpacing: 0.3 }}
            >
              今日待办与异常闭环
            </h2>
          </div>
          <div style={{ marginTop: 4, marginLeft: 10, color: '#756A58', fontSize: 12 }}>
            集中处理影响教学履约、家校沟通与考勤的关键事项
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: urgentCount ? '#C0392B' : '#1D9E75', fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {totalCount}
          </div>
          <div style={{ color: '#756A58', fontSize: 11 }}>
            {urgentCount ? `${urgentCount}项优先` : '全部正常'}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 10px',
          borderRadius: 10,
          background: 'rgba(29, 158, 117, 0.08)',
          border: '1px solid rgba(29, 158, 117, 0.2)',
          color: '#14574D',
          fontWeight: 700,
          fontSize: 13,
        }}>
          <CheckCircleOutlined style={{ fontSize: 18, color: '#1D9E75' }} />
          今日关键教学、考勤与家校流程已全部闭环，运行顺畅
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}>
          {items.map((item) => {
            const meta = priorityMeta[item.priority]
            return (
              <button
                key={item.key}
                type="button"
                className="pressable"
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%',
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: '38px minmax(0, 1fr) auto',
                  gap: 11,
                  alignItems: 'center',
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: `1px solid ${meta.border || 'rgba(58, 50, 39, 0.08)'}`,
                  background: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(58, 50, 39, 0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.16s ease',
                }}
              >
                <span style={{
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  color: meta.color,
                  background: meta.background,
                  fontSize: 16,
                  border: `1px solid ${meta.border || 'transparent'}`,
                }}>
                  {meta.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: '#2B2110',
                    fontSize: 13.5,
                    fontWeight: 750,
                  }}>
                    {item.label}
                    <span style={{ color: meta.color, fontSize: 15, fontWeight: 800 }}>{item.count}</span>
                  </span>
                  <span style={{
                    display: 'block',
                    marginTop: 2,
                    color: '#756A58',
                    fontSize: 11.5,
                    lineHeight: 1.4,
                    overflowWrap: 'anywhere',
                  }}>
                    {item.description}
                  </span>
                </span>
                <RightOutlined style={{ color: '#A89C8A', fontSize: 11 }} />
              </button>
            )
          })}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: 12, textAlign: isMobile ? 'left' : 'right' }}>
          <Button
            type="primary"
            block={isMobile}
            onClick={() => router.push(items[0].href)}
            style={{
              minHeight: 40,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13.5,
              background: 'linear-gradient(135deg, #14574D 0%, #0D3E36 100%)',
              border: '1px solid #D6B45B',
              boxShadow: '0 4px 12px rgba(20, 87, 77, 0.22)',
              color: '#FAF6EE',
            }}
          >
            一键处理最优先事项 ›
          </Button>
        </div>
      )}
    </section>
  )
}
