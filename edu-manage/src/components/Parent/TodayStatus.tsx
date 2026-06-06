'use client'

import { useEffect, useState } from 'react'
import { Badge, Card, Skeleton, Tag, Typography } from 'antd'
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface StudentToday {
  student: { id: string; name: string; grade: string | null; mainTeacherName: string }
  todaySchedules: Array<{
    id: string
    courseName: string
    subject: string
    teacherName: string
    roomName: string
    startTime: string
    endTime: string
  }>
  attendance: Array<{ status: string; createdAt: string }>
  unreadNotifications: number
  leaveThisWeek: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PRESENT: { label: '已到课', color: '#27a644' },
  ABSENT: { label: '缺勤', color: '#ff4d4f' },
  LEAVE: { label: '请假', color: '#9a8e7a' },
  MAKEUP: { label: '补课', color: '#1890ff' },
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function TodayStatus({ activeChildId }: { activeChildId?: string }) {
  const [data, setData] = useState<{ today: string; students: StudentToday[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent/today')
      .then(response => response.json())
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />
  if (!data || data.students.length === 0) return null

  const now = new Date()
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${weekday}`

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Title level={5} style={{ margin: 0, fontSize: 15 }}>今日动态</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>{dateStr}</Text>
      </div>

      {(() => {
        const displayStudents = activeChildId
          ? data.students.filter(item => item.student.id === activeChildId)
          : data.students
        return displayStudents.map(item => {
        const latestAttendance = item.attendance[0]
        const hasClass = item.todaySchedules.length > 0
        const nextClass = item.todaySchedules.find(schedule => new Date(schedule.startTime) > now)
        const currentClass = item.todaySchedules.find(schedule =>
          new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now
        )

        return (
          <Card
            key={item.student.id}
            style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(232,117,69,.12) 0%, rgba(232,117,69,.04) 100%)',
              borderBottom: '1px solid rgba(232,117,69,.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#E87545',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                }}>
                  {item.student.name.slice(-1)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 15 }}>{item.student.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {item.student.grade || '-'} · 主教师：{item.student.mainTeacherName}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {item.unreadNotifications > 0 && (
                  <Badge count={item.unreadNotifications} size="small">
                    <BellOutlined style={{ fontSize: 16, color: '#E87545' }} />
                  </Badge>
                )}
                {latestAttendance && (
                  <Tag
                    color={STATUS_MAP[latestAttendance.status]?.color || 'default'}
                    style={{ fontSize: 12, margin: 0 }}
                  >
                    {STATUS_MAP[latestAttendance.status]?.label || latestAttendance.status}
                  </Tag>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
              {!hasClass ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#c0b8ae', fontSize: 13 }}>
                  今日暂无课程安排
                </div>
              ) : (
                <>
                  {currentClass && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 8,
                      background: 'linear-gradient(135deg, rgba(39,166,68,.1) 0%, rgba(39,166,68,.04) 100%)',
                      border: '1px solid rgba(39,166,68,.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#27a644',
                        boxShadow: '0 0 0 3px rgba(39,166,68,.2)',
                        animation: 'parent-today-pulse 2s infinite',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 14, color: '#27a644' }}>
                          正在上课：{currentClass.courseName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          {formatTime(currentClass.startTime)}-{formatTime(currentClass.endTime)}
                          &nbsp;·&nbsp;{currentClass.teacherName || '未分配教师'}
                          &nbsp;·&nbsp;{currentClass.roomName || '未分配教室'}
                        </Text>
                      </div>
                    </div>
                  )}

                  {nextClass && !currentClass && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: 'rgba(24,144,255,.06)',
                      border: '1px solid rgba(24,144,255,.15)',
                    }}>
                      <Text style={{ fontSize: 13, color: '#1890ff' }}>
                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                        下一节：{nextClass.courseName} {formatTime(nextClass.startTime)} 开始
                      </Text>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item.todaySchedules.map(schedule => {
                      const isPast = new Date(schedule.endTime) < now
                      const isCurrent = new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now
                      return (
                        <div key={schedule.id} style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          backgroundColor: isCurrent ? 'rgba(39,166,68,.1)' : isPast ? 'rgba(0,0,0,.04)' : 'rgba(232,117,69,.06)',
                          color: isCurrent ? '#27a644' : isPast ? '#c0b8ae' : '#E87545',
                          border: `1px solid ${isCurrent ? 'rgba(39,166,68,.2)' : isPast ? 'rgba(0,0,0,.06)' : 'rgba(232,117,69,.15)'}`,
                        }}>
                          {schedule.courseName} {formatTime(schedule.startTime)}{isPast && ' 完成'}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>
        )
      })})()}

      <style>{`
        @keyframes parent-today-pulse {
          0% { box-shadow: 0 0 0 0 rgba(39,166,68,.4); }
          70% { box-shadow: 0 0 0 6px rgba(39,166,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(39,166,68,0); }
        }
      `}</style>
    </div>
  )
}
