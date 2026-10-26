'use client'

import { useEffect, useState } from 'react'
import { Button, List, Tag, Typography } from 'antd'
import {
  BellOutlined,
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { formatFriendlyTime } from '@/lib/date/relative'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'

const { Title, Text, Paragraph } = Typography

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  CLASSROOM_FEEDBACK: { label: '课堂反馈', icon: <BookOutlined />, color: '#6A5ACD', bg: '#F0EEFF' },
  PERFORMANCE_FEEDBACK: { label: '表现反馈', icon: <StarOutlined />, color: '#D96F43', bg: '#FFF3EA' },
  PERFORMANCE_UPDATE: { label: '表现更新', icon: <StarOutlined />, color: '#D96F43', bg: '#FFF3EA' },
  PAPER_PUBLISHED: { label: '试卷通知', icon: <FileTextOutlined />, color: '#2476A8', bg: '#EAF5FB' },
  EXAM_PAPER: { label: '试卷通知', icon: <FileTextOutlined />, color: '#2476A8', bg: '#EAF5FB' },
  ATTENDANCE: { label: '考勤通知', icon: <ClockCircleOutlined />, color: '#BA7517', bg: '#FAEEDA' },
  STUDY_HALL_HOMEWORK: { label: '作业班', icon: <BookOutlined />, color: '#D96F43', bg: '#FFF3EA' },
  SYSTEM: { label: '系统通知', icon: <BellOutlined />, color: '#5A4E3A', bg: '#F5F2EE' },
  INFO: { label: '通知', icon: <BellOutlined />, color: '#5A4E3A', bg: '#F5F2EE' },
  leave: { label: '请假通知', icon: <ClockCircleOutlined />, color: '#BA7517', bg: '#FAEEDA' },
}
type ParentNotification = {
  id: string
  type: string
  relatedType?: string | null
  relatedId?: string | null
  href?: string | null
  title: string
  content?: string | null
  createdAt: string
  read: boolean
}

function getNotificationMeta(n: ParentNotification) {
  return TYPE_META[n.relatedType || ''] || TYPE_META[n.type] || TYPE_META.INFO
}

export function ParentNotificationsClient({
  notifications: initialNotifications, unreadCount: initialUnread,
}: {
  notifications: ParentNotification[]
  unreadCount: number
  userId: string
}) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const isMobile = useIsMobile() ?? false
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnread)

  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnread)
  }, [initialNotifications, initialUnread])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('通知标记失败')
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount((count) => Math.max(0, count - 1))
      void mutate('/api/parent/unread-counts')
    } catch {
      toast.error('操作失败')
    }
  }

  const markAllRead = async () => {
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!response.ok) throw new Error('全部已读操作失败')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      void mutate('/api/parent/unread-counts')
      toast.success('全部已读')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleClick = (n: ParentNotification) => {
    if (!n.read) markAsRead(n.id)
    if (n.relatedType === 'EXAM_PAPER' && n.relatedId) {
      router.push(`/parent/archive?paperId=${n.relatedId}`)
      return
    }
    router.push(n.href || `/parent/notifications/${n.id}`)
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div className="parent-notifications-page">
      <div className="parent-theme-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: isMobile ? 14 : 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4, fontSize: isMobile ? 18 : undefined }}>最新通知</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前显示 {notifications.length} 条，{unreadCount} 条未读
          </Text>
        </div>
        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={markAllRead} style={{ borderRadius: 8, minHeight: 40 }}>
            全部已读
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <ParentCard style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title="还没有通知" hint="新的课堂反馈、晚托作业、试卷和系统提醒会显示在这里，方便你及时了解孩子的学习动态。" />
        </ParentCard>
      ) : (
        <ParentCard style={{ padding: 0 }}>
          <List
            dataSource={notifications}
            renderItem={(n, index: number) => {
              const meta = getNotificationMeta(n)
              return (
                <List.Item
                  className="stagger-item pressable"
                  style={{
                    padding: isMobile ? '11px 12px' : '14px 20px',
                    borderBottom: '1px solid #FBF0EA',
                    cursor: 'pointer',
                    background: n.read ? '#fff' : '#FFFBF7',
                    animationDelay: `${Math.min(index, 8) * 40}ms`,
                  }}
                  onClick={() => handleClick(n)}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: n.read ? '#F5F2EE' : meta.bg,
                      color: n.read ? '#9A8E7A' : meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: isMobile ? 13 : 14, color: n.read ? '#7A6E60' : '#1F2933', flex: '1 1 160px', minWidth: 0 }}>
                          {n.title}
                        </Text>
                        <Tag style={{ borderRadius: 9999, fontSize: 10, marginInlineEnd: 0, color: meta.color, background: meta.bg, borderColor: 'transparent' }}>
                          {meta.label}
                        </Tag>
                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8784A', flexShrink: 0 }} />}
                      </div>
                      {n.content && (
                        <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, color: '#7A6E60', margin: '5px 0 0', lineHeight: 1.55 }}>
                          {n.content}
                        </Paragraph>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatFriendlyTime(n.createdAt)}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#E8784A', fontWeight: 600 }}>查看详情</Text>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        </ParentCard>
      )}
    </div>
    </PullToRefresh>
  )
}
