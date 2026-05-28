'use client'

import { useMemo, useState } from 'react'
import { Button, Card, Empty, Select, Tag, Typography } from 'antd'
import { ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { TodaySchedule } from '@/types/dashboard'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

const statusOptions: Array<TodaySchedule['statusLabel'] | '全部'> = ['全部', '待上课', '上课中', '待考勤', '已完成']

const statusColors: Record<TodaySchedule['statusLabel'], string> = {
  待上课: 'blue',
  上课中: 'green',
  待考勤: 'orange',
  已完成: 'default',
}

export function TodayScheduleCard({ data }: { data: TodaySchedule[] }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [status, setStatus] = useState<TodaySchedule['statusLabel'] | '全部'>('全部')
  const [teacher, setTeacher] = useState('全部')
  const [room, setRoom] = useState('全部')

  const teachers = useMemo(() => ['全部', ...Array.from(new Set(data.map((item) => item.teacher).filter(Boolean)))], [data])
  const rooms = useMemo(() => ['全部', ...Array.from(new Set(data.map((item) => item.room).filter(Boolean)))], [data])
  const filtered = useMemo(() => data.filter((item) => (
    (status === '全部' || item.statusLabel === status) &&
    (teacher === '全部' || item.teacher === teacher) &&
    (room === '全部' || item.room === room)
  )), [data, room, status, teacher])

  return (
    <Card bordered={false} style={{ borderRadius: 16, height: '100%' }} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: 14 }}>
        <Title level={5} style={{ margin: 0 }}>今日课表</Title>
        <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
          <Select size="small" value={teacher} onChange={setTeacher} style={{ minWidth: isMobile ? '100%' : 120 }} options={teachers.map((value) => ({ value, label: value === '全部' ? '全部老师' : value }))} />
          <Select size="small" value={room} onChange={setRoom} style={{ minWidth: isMobile ? '100%' : 120 }} options={rooms.map((value) => ({ value, label: value === '全部' ? '全部教室' : value }))} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
        {statusOptions.map((item) => (
          <Button
            key={item}
            size="small"
            type={status === item ? 'primary' : 'default'}
            onClick={() => setStatus(item)}
            style={{ flexShrink: 0, borderRadius: 8 }}
          >
            {item}
          </Button>
        ))}
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Empty description="今日暂无课程安排，可以查看排课系统或处理待办事项。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <Button style={{ height: 40, marginTop: 8 }} onClick={() => router.push('/schedule')}>查看排课系统</Button>
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="当前筛选下暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          maxHeight: isMobile ? 'none' : 520,
          overflowY: isMobile ? 'visible' : 'auto',
          paddingRight: isMobile ? 0 : 4,
        }}>
          {filtered.map((item) => {
            const urgent = item.statusLabel === '待考勤'
            return (
              <div
                key={`${item.source}-${item.id}`}
                style={{
                  border: urgent ? '1px solid #fa8c16' : '1px solid #eee7e1',
                  background: urgent ? '#fff7e6' : '#fff',
                  borderRadius: 10,
                  padding: 12,
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.time}</Text>
                    <Text style={{ display: 'block', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.courseName}</Text>
                  </div>
                  <Tag color={statusColors[item.statusLabel]} style={{ marginInlineEnd: 0 }}>{item.statusLabel}</Tag>
                </div>
                <div style={{ display: 'grid', gap: 4, marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}><UserOutlined /> 老师：{item.teacher}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}><EnvironmentOutlined /> 教室：{item.room}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}><TeamOutlined /> 学生：{item.students}人</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> 科目：{item.subject}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button size="small" onClick={() => router.push('/schedule')}>查看排课</Button>
                  {urgent && <Button size="small" type="primary" onClick={() => router.push('/attendance')}>去考勤</Button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
