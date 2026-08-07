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
    color: 'var(--color-error)',
    background: '#fff1f0',
    icon: <ExclamationCircleOutlined />,
    label: '优先处理',
  },
  attention: {
    color: 'var(--color-warning-text)',
    background: '#fff8e8',
    icon: <ExclamationCircleOutlined />,
    label: '需要关注',
  },
  info: {
    color: 'var(--color-brand-purple)',
    background: '#f3effa',
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
        padding: isMobile ? 16 : 20,
        borderRadius: 14,
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-hairline)',
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
          <h2
            id="admin-exception-center-title"
            style={{ margin: 0, fontSize: isMobile ? 17 : 18, color: 'var(--color-ink)' }}
          >
            今日运营待办
          </h2>
          <div style={{ marginTop: 5, color: 'var(--color-ink-subtle)', fontSize: 13 }}>
            先处理影响家校沟通与课堂闭环的事项
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: urgentCount ? 'var(--color-error)' : 'var(--color-success)', fontSize: 20, fontWeight: 800 }}>
            {totalCount}
          </div>
          <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }}>
            {urgentCount ? `${urgentCount}项优先` : '全部正常'}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 0 2px',
          color: 'var(--color-success)',
          fontWeight: 700,
        }}>
          <CheckCircleOutlined style={{ fontSize: 20 }} />
          今日关键流程均已处理
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
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%',
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: '38px minmax(0, 1fr) auto',
                  gap: 11,
                  alignItems: 'center',
                  padding: '13px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--color-hairline)',
                  background: 'var(--color-surface-1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  color: meta.color,
                  background: meta.background,
                  fontSize: 16,
                }}>
                  {meta.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: 'var(--color-ink)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}>
                    {item.label}
                    <span style={{ color: meta.color, fontSize: 16, fontWeight: 800 }}>{item.count}</span>
                  </span>
                  <span style={{
                    display: 'block',
                    marginTop: 3,
                    color: 'var(--color-ink-subtle)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflowWrap: 'anywhere',
                  }}>
                    {item.description}
                  </span>
                </span>
                <RightOutlined style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }} />
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
            style={{ minHeight: 38, borderRadius: 10, fontWeight: 700 }}
          >
            处理最优先事项
          </Button>
        </div>
      )}
    </section>
  )
}
