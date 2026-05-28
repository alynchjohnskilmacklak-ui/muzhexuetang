'use client'

import { Card, Typography } from 'antd'
import {
  IdcardOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { AdminDashboardMetrics } from '@/types/dashboard'

const { Title, Text } = Typography

interface PendingItem {
  key: string
  icon: React.ReactNode
  label: string
  count: number
  path: string
}

export function PendingItemsCard({ data }: { data: AdminDashboardMetrics }) {
  const router = useRouter()

  const items: PendingItem[] = [
    {
      key: 'low-hours',
      icon: <IdcardOutlined />,
      label: '课时不足',
      count: data.renewalWarnings,
      path: '/students?filter=lowHours',
    },
    {
      key: 'paper',
      icon: <FileTextOutlined />,
      label: '未推送试卷',
      count: data.unpublishedPapers,
      path: '/grades',
    },
    {
      key: 'makeup',
      icon: <ScheduleOutlined />,
      label: '待处理补课',
      count: data.pendingMakeups,
      path: '/attendance',
    },
    {
      key: 'comment',
      icon: <MessageOutlined />,
      label: '家长未读留言',
      count: data.unreadComments,
      path: '/communications',
    },
  ]

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 16, height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Title level={5} style={{ marginBottom: 16 }}>
        待处理事项明细
      </Title>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#faf8f5',
              borderLeft: '3px solid #E8784A',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => router.push(item.path)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 2px 8px rgba(232,120,74,0.12)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(232,120,74,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E8784A',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#E8784A', lineHeight: 1.2 }}>
                {item.count}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.label}
              </Text>
            </div>
            <Text style={{ color: '#E8784A', fontSize: 12, whiteSpace: 'nowrap' }}>
              去处理 →
            </Text>
          </div>
        ))}
      </div>
    </Card>
  )
}
