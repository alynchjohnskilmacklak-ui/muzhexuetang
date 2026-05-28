'use client'

import { useMemo, useState } from 'react'
import { Card, Empty, Select, Table, Tag, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHours } from '@/lib/format'

const { Title, Text } = Typography

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PRESENT: { label: '出勤', color: '#1D9E75', bg: '#E1F5EE' },
  LEAVE: { label: '请假', color: '#BA7517', bg: '#FAEEDA' },
  ABSENT: { label: '旷课', color: '#E24B4A', bg: '#FCEBEB' },
  MAKEUP: { label: '补课', color: '#534AB7', bg: '#EEEDFE' },
}

export function ParentAttendanceClient({ records, students }: { records: any[]; students: any[] }) {
  const isMobile = useIsMobile()
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '')
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const filteredRecords = useMemo(() =>
    selectedStudentId ? records.filter((r: any) => r.student?.id === selectedStudentId) : records,
    [records, selectedStudentId]
  )

  const stats = useMemo(() => ({
    present: filteredRecords.filter((r: any) => r.status === 'PRESENT').length,
    leave: filteredRecords.filter((r: any) => r.status === 'LEAVE').length,
    absent: filteredRecords.filter((r: any) => r.status === 'ABSENT').length,
    totalHours: filteredRecords.filter((r: any) => r.status === 'PRESENT' || r.status === 'ABSENT')
      .reduce((s: number, r: any) => s + (r.hoursDeducted || 0), 0),
    total: filteredRecords.length,
  }), [filteredRecords])

  // Build attendance map by day
  const attMap = useMemo(() => {
    const m: Record<number, any> = {}
    filteredRecords.forEach((r: any) => {
      const d = new Date(r.createdAt).getDate()
      if (!m[d]) m[d] = r
    })
    return m
  }, [filteredRecords])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>考勤记录</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {today.getMonth() + 1}月 · 共 {stats.total} 条记录 · 扣 {formatHours(stats.totalHours)} 课时
          </Text>
        </div>
        <Select value={selectedStudentId || undefined} style={{ width: 160 }} onChange={v => setSelectedStudentId(v)}
          options={students.map((s: any) => ({ label: s.name, value: s.id }))} />
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '出勤', value: stats.present, bg: '#E1F5EE', color: '#1D9E75' },
          { label: '请假', value: stats.leave, bg: '#FAEEDA', color: '#BA7517' },
          { label: '旷课', value: stats.absent, bg: '#FCEBEB', color: '#E24B4A' },
          { label: '扣课时', value: `${formatHours(stats.totalHours)}h`, bg: '#EEEDFE', color: '#534AB7' },
        ].map(item => (
          <Card key={item.label} bordered={false} style={{ borderRadius: 10, background: item.bg, border: 'none' }} bodyStyle={{ padding: '12px 14px' }}>
            <Text type="secondary" style={{ fontSize: 10 }}>{item.label}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color, marginTop: 2 }}>{item.value}</div>
          </Card>
        ))}
      </div>

      {/* Monthly Calendar */}
      <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EEE7E1', marginBottom: 16 }} title={`${today.getMonth() + 1}月考勤日历`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['日','一','二','三','四','五','六'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#98A2B3', padding: '2px 0' }}>{d}</div>)}
          {/* Fill leading empty cells */}
          {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const att = attMap[day]
            const isToday = day === today.getDate()
            const s = att ? STATUS_MAP[att.status] : null
            return (
              <div key={day} style={{
                height: 34, borderRadius: 6, display: 'grid', placeItems: 'center',
                background: s ? s.bg : '#f5f5f5',
                color: s ? s.color : '#bbb',
                border: isToday ? '2px solid #E8784A' : '1px solid transparent',
                fontSize: 11, fontWeight: s ? 500 : 400,
              }}>{day}</div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10 }}>
          {Object.entries(STATUS_MAP).slice(0, 3).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: v.bg }} />
              <span style={{ color: v.color }}>{v.label}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Records Table */}
      <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EEE7E1' }}>
        {isMobile ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredRecords.map((record: any) => {
              const status = STATUS_MAP[record.status] || { label: record.status, color: '#5a4e3a', bg: '#fff' }
              return (
                <div key={record.id} style={{ border: '1px solid #EEE7E1', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Text strong>{record.student?.name || '-'}</Text>
                    <Tag color={status.color}>{status.label}</Tag>
                  </div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 13, color: '#5a4e3a' }}>
                    <span>{record.lesson?.group?.course?.name || record.lesson?.group?.name || '-'}</span>
                    <span>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span>扣课时：{formatHours(record.hoursDeducted)}</span>
                  </div>
                </div>
              )
            })}
            {!filteredRecords.length && <Empty description="暂无考勤记录" />}
          </div>
        ) : <Table
          rowKey="id" size="small" pagination={{ pageSize: 15 }}
          dataSource={filteredRecords.map((r: any) => ({ ...r, key: r.id }))}
          locale={{ emptyText: '暂无考勤记录' }}
          columns={[
            { title: '学员', dataIndex: ['student', 'name'], key: 'student', width: 80 },
            { title: '班级', dataIndex: ['lesson', 'group', 'name'], key: 'group', ellipsis: true },
            { title: '课程', dataIndex: ['lesson', 'group', 'course', 'name'], key: 'course', ellipsis: true },
            { title: '日期', key: 'date', width: 100, render: (_: any, r: any) => new Date(r.createdAt).toLocaleDateString('zh-CN') },
            { title: '状态', dataIndex: 'status', key: 'status', width: 80,
              render: (s: string) => {
                const m = STATUS_MAP[s] || { label: s, color: 'default', bg: 'transparent' }
                return <Tag color={m.color}>{m.label}</Tag>
              }},
            { title: '扣课时', dataIndex: 'hoursDeducted', key: 'hours', width: 70,
              render: (v: number) => v > 0 ? <Text style={{ color: '#E24B4A' }}>-{formatHours(v)}</Text> : <Text type="secondary">0</Text> },
          ]}
        />}
      </Card>
    </div>
  )
}
