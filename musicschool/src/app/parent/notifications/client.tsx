'use client'

import { useState } from 'react'
import { Button, Card, Divider, Empty, List, Modal, Tag, Typography, message } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { format } from 'date-fns'

const { Title, Text } = Typography

const TYPE_LABELS: Record<string, string> = {
  CLASSROOM_FEEDBACK: '课堂反馈',
  PERFORMANCE_FEEDBACK: '表现反馈',
  PAPER_PUBLISHED: '试卷通知',
  PERFORMANCE_UPDATE: '表现更新',
  ATTENDANCE: '考勤通知',
  SYSTEM: '系统通知',
  INFO: '通知',
  leave: '请假通知',
}

export function ParentNotificationsClient({
  notifications: initialNotifications, unreadCount: initialUnread, userId,
}: {
  notifications: any[]
  unreadCount: number
  userId: string
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: any | null }>({ open: false, record: null })

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      message.error('操作失败')
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      message.success('全部已读')
    } catch {
      message.error('操作失败')
    }
  }

  const handleClick = (n: any) => {
    if (!n.read) markAsRead(n.id)
    setDetailModal({ open: true, record: { ...n, read: true } })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>最新通知</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            共 {notifications.length} 条，{unreadCount} 条未读
          </Text>
        </div>
        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={markAllRead} style={{ borderRadius: 8 }}>
            全部已读
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无通知，有新的消息会在这里显示。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }} styles={{ body: { padding: 0 } }}>
          <List
            dataSource={notifications}
            renderItem={(n: any) => (
              <List.Item
                style={{
                  padding: '14px 20px', borderBottom: '1px solid #FBF0EA', cursor: 'pointer',
                  background: n.read ? '#fff' : '#FFFBF7',
                }}
                onClick={() => handleClick(n)}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: n.read ? '#f5f5f5' : 'rgba(232,120,74,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BellOutlined style={{ color: n.read ? '#98A2B3' : '#E8784A', fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ fontSize: 13, color: n.read ? '#7A869A' : '#1F2933' }}>
                        {n.title}
                      </Text>
                      {n.type && <Tag style={{ borderRadius: 9999, fontSize: 10 }}>{TYPE_LABELS[n.type] || n.type}</Tag>}
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8784A' }} />}
                    </div>
                    {n.content && (
                      <div style={{ fontSize: 12, color: '#7A869A', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {n.content}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {format(new Date(n.createdAt), 'yyyy-MM-dd HH:mm')}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#E8784A' }}>查看详情 →</Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}
      <Modal
        title={detailModal.record?.title || '通知详情'}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={<Button onClick={() => setDetailModal({ open: false, record: null })}>关闭</Button>}
        width={600}
      >
        {detailModal.record && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Tag color={
                detailModal.record.type === 'wxpusher_feedback' ? 'blue' :
                detailModal.record.type === 'wxpusher_safe' ? 'green' :
                detailModal.record.type === 'leave' ? 'orange' : 'default'
              }>
                {detailModal.record.type === 'wxpusher_feedback' ? '课堂反馈' :
                 detailModal.record.type === 'wxpusher_safe' ? '平安回家' :
                 detailModal.record.type === 'leave' ? '请假通知' :
                 TYPE_LABELS[detailModal.record.type] || '系统通知'}
              </Tag>
            </div>
            <Typography.Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detailModal.record.content}
            </Typography.Paragraph>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                学员：{detailModal.record.student?.name || '—'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                时间：{new Date(detailModal.record.createdAt).toLocaleString('zh-CN')}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
