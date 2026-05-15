'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, message, Dropdown } from 'antd'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg, DateSelectArg, EventInput } from '@fullcalendar/core'

const colors = ['#1677ff', '#52c41a', '#eb2f96', '#722ed1', '#fa8c16', '#13c2c2', '#f5222d', '#2f54eb']

const initialEvents: EventInput[] = [
  { id: '1', title: '钢琴基础班\n王老师 | 琴房A | 8人', start: '2026-05-15T08:30:00', end: '2026-05-15T10:00:00', backgroundColor: colors[0], extendedProps: { teacher: '王老师', room: '琴房A', subject: '音乐', students: 8 } },
  { id: '2', title: '数学提高班\n李老师 | 教室201 | 15人', start: '2026-05-15T10:15:00', end: '2026-05-15T11:45:00', backgroundColor: colors[1], extendedProps: { teacher: '李老师', room: '教室201', subject: '数学', students: 15 } },
  { id: '3', title: '英语口语班\n张老师 | 教室302 | 12人', start: '2026-05-15T13:30:00', end: '2026-05-15T15:00:00', backgroundColor: colors[2], extendedProps: { teacher: '张老师', room: '教室302', subject: '英语', students: 12 } },
  { id: '4', title: '编程Scratch\n赵老师 | 机房B | 10人', start: '2026-05-16T09:00:00', end: '2026-05-16T10:30:00', backgroundColor: colors[3], extendedProps: { teacher: '赵老师', room: '机房B', subject: '编程', students: 10 } },
  { id: '5', title: '美术素描\n陈老师 | 画室 | 6人', start: '2026-05-16T14:00:00', end: '2026-05-16T16:00:00', backgroundColor: colors[4], extendedProps: { teacher: '陈老师', room: '画室', subject: '美术', students: 6 } },
]

export function ScheduleCalendar() {
  const [events, setEvents] = useState<EventInput[]>(initialEvents)
  const calendarRef = useRef<FullCalendar>(null)
  const [contextMenu, setContextMenu] = useState<{ eventId: string; x: number; y: number } | null>(null)

  const handleEventClick = useCallback((info: EventClickArg) => {
    const props = info.event.extendedProps
    message.info(`${info.event.title.split('\n')[0]} - ${props.teacher} | ${props.room}`)
  }, [])

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const movedEvent = info.event
    const newStart = movedEvent.start!
    const newEnd = movedEvent.end!

    const conflict = events.some(e => {
      if (e.id === movedEvent.id) return false
      const eStart = new Date(e.start as string)
      const eEnd = new Date(e.end as string)
      const sameTeacher = (e as EventInput).extendedProps?.teacher === movedEvent.extendedProps.teacher
      const sameRoom = (e as EventInput).extendedProps?.room === movedEvent.extendedProps.room
      const timeOverlap = newStart < eEnd && newEnd > eStart
      return timeOverlap && (sameTeacher || sameRoom)
    })

    if (conflict) {
      message.error('冲突检测：同教师或同教室在此时段已有课程，请重新选择时间！')
      info.revert()
      return
    }

    setEvents(prev => prev.map(e => e.id === movedEvent.id ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() } : e))
    message.success(`课程已移动到 ${newStart.toLocaleString('zh-CN')}`)
  }, [events])

  const renderEventContent = (eventInfo: { event: { title: string } }) => {
    const lines = eventInfo.event.title.split('\n')
    return (
      <div style={{ fontSize: 12, lineHeight: '1.4', padding: '2px 4px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ fontWeight: i === 0 ? 600 : 400, opacity: i === 0 ? 1 : 0.85 }}>
            {line}
          </div>
        ))}
      </div>
    )
  }

  const contextMenuItems = [
    { key: 'edit', label: '编辑课程' },
    { key: 'copy', label: '复制到下周' },
    { key: 'note', label: '添加备注' },
    { type: 'divider' as const },
    { key: 'cancel', label: '取消课程', danger: true },
  ]

  const handleContextMenuAction = ({ key }: { key: string }) => {
    switch (key) {
      case 'edit': message.info('打开编辑弹窗'); break
      case 'copy': message.success('已复制到下周'); break
      case 'note': message.info('打开备注输入'); break
      case 'cancel': message.warning('课程已取消'); break
    }
    setContextMenu(null)
  }

  return (
    <Card bordered={false} style={{ borderRadius: 8 }}>
      <Dropdown menu={{ items: contextMenuItems, onClick: handleContextMenuAction }} trigger={['contextMenu']}>
        <div>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            buttonText={{ today: '今天', month: '月视图', week: '周视图' }}
            allDaySlot={false}
            height="auto"
            locale="zh-cn"
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            nowIndicator={true}
          />
        </div>
      </Dropdown>
    </Card>
  )
}
