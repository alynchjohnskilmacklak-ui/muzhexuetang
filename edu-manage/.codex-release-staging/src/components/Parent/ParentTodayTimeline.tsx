'use client'

import {
  BookOutlined,
  CalendarOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Empty } from 'antd'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { ParentTimelineEvent } from '@/lib/dashboard-workflows'

const eventMeta = {
  lesson: { icon: <CalendarOutlined />, color: 'var(--color-primary)', background: 'var(--color-primary-bg)' },
  feedback: { icon: <BookOutlined />, color: 'var(--color-success)', background: 'var(--color-success-bg)' },
  message: { icon: <MessageOutlined />, color: 'var(--color-brand-purple)', background: '#f3effa' },
}

export function ParentTodayTimeline({
  events,
  studentName,
}: {
  events: ParentTimelineEvent[]
  studentName: string
}) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false

  return (
    <section
      aria-labelledby="parent-today-timeline-title"
      className="parent-dashboard-section"
      style={{
        marginBottom: isMobile ? 12 : 16,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <h2
            id="parent-today-timeline-title"
            style={{ margin: 0, color: 'var(--color-ink)', fontSize: isMobile ? 14.5 : 16, fontWeight: 600 }}
          >
            {studentName}的今日动态
          </h2>
          <div style={{ marginTop: 5, color: 'var(--color-ink-subtle)', fontSize: 13 }}>
            课程、课堂反馈和老师回复集中在这里
          </div>
        </div>
        {events.length > 0 && (
          <div style={{
            flexShrink: 0,
            borderRadius: 999,
            background: 'var(--color-primary-bg)',
            color: 'var(--color-primary)',
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {events.length}条
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="今天暂无新的课堂动态"
        >
          <Button onClick={() => router.push('/parent/schedule')}>查看近期课程</Button>
        </Empty>
      ) : (
        <div>
          {events.map((event, index) => {
            const meta = eventMeta[event.type]
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => router.push(event.href)}
                style={{
                  position: 'relative',
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '42px minmax(0, 1fr) 18px' : '64px 42px minmax(0, 1fr) 18px',
                  alignItems: 'start',
                  gap: isMobile ? 10 : 12,
                  padding: '10px 0',
                  border: 0,
                  borderBottom: index === events.length - 1
                    ? 0
                    : '1px solid var(--color-hairline)',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {!isMobile && (
                  <span style={{
                    paddingTop: 9,
                    color: 'var(--color-ink-subtle)',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {event.timeLabel}
                  </span>
                )}
                <span style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  background: meta.background,
                  color: meta.color,
                  fontSize: 16,
                }}>
                  {meta.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    color: 'var(--color-ink)',
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}>
                    {isMobile && (
                      <span style={{ color: 'var(--color-ink-subtle)', fontSize: 11, fontWeight: 500, marginRight: 2 }}>
                        {event.timeLabel} ·
                      </span>
                    )}
                    {event.title}
                  </span>
                  {event.detail && (
                    <span style={{
                      display: '-webkit-box',
                      marginTop: 4,
                      color: 'var(--color-ink-muted)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      overflowWrap: 'anywhere',
                    }}>
                      {event.detail}
                    </span>
                  )}
                  {event.status && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: 6,
                      color: meta.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {event.status}
                    </span>
                  )}
                </span>
                <RightOutlined style={{
                  alignSelf: 'center',
                  color: 'var(--color-ink-subtle)',
                  fontSize: 11,
                }} />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
