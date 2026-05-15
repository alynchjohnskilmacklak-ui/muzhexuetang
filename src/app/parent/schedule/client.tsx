'use client'

import { useState } from 'react'
import { Card, Typography, Table, Tag, Select } from 'antd'
import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { EventInput } from '@fullcalendar/core'

const { Title, Text } = Typography

interface ScheduleRow { key: string; student: string; course: string; time: string; teacher: string; room: string }

export function ParentScheduleClient({
  events, studentNames, listData
}: {
  events: EventInput[]
  studentNames: string[]
  listData: ScheduleRow[]
}) {
  const [selectedChild, setSelectedChild] = useState<string>('all')

  const filteredEvents = selectedChild === 'all'
    ? events
    : events.filter(e => (e.title || '').includes(selectedChild))

  const filteredList = selectedChild === 'all'
    ? listData
    : listData.filter(d => d.student.includes(selectedChild))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>课程表</Title>
        <Select defaultValue="all" style={{ width: 180 }} onChange={v => setSelectedChild(v)}
          options={[{ value: 'all', label: '全部子女' }, ...studentNames.map(c => ({ value: c, label: c }))]} />
      </div>
      <Card bordered={false} style={{ borderRadius: 8 }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">暂无课程安排</Text></div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
            buttonText={{ today: '今天', month: '月', week: '周' }}
            height="auto"
            locale="zh-cn"
            events={filteredEvents}
            editable={false}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
          />
        )}
      </Card>
      <Card bordered={false} style={{ borderRadius: 8, marginTop: 16 }} title="课程表（列表）">
        <Table dataSource={filteredList} rowKey="key" pagination={false} size="small"
          locale={{ emptyText: '暂无课程' }}
          columns={[
            { title: '学员', dataIndex: 'student', key: 'student', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '课程', dataIndex: 'course', key: 'course' },
            { title: '时间', dataIndex: 'time', key: 'time', render: (v: string) => <><ClockCircleOutlined /> {v}</> },
            { title: '教师', dataIndex: 'teacher', key: 'teacher' },
            { title: '教室', dataIndex: 'room', key: 'room', render: (v: string) => <><EnvironmentOutlined /> {v}</> },
          ]}
        />
      </Card>
    </div>
  )
}
