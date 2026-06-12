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
    const url = activeChildId
      ? `/api/parent/today?childId=${activeChildId}`
      : '/api/parent/today'
    fetch(url)
      .then(response => response.json())
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch((error) => { console.warn('今日动态加载失败', error); setLoading(false) })
  }, [activeChildId])

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
            style={{ 
              marginBottom: 12, 
              borderRadius: 16, 
              overflow: 'hidden', 
              border: '1px solid #F0EBE5',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #FFFBF9 0%, #FDFCFB 100%)',
              borderBottom: '1px solid #F5F2EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #E8784A 0%, #F08A54 100%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(232,120,74,0.2)'
                }}>
                  {item.student.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2329', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.student.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#8D806F', marginTop: 2 }}>
                    {item.student.grade || '学员'} · 主讲老师：{item.student.mainTeacherName || '未分配'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {item.unreadNotifications > 0 && (
                  <Badge count={item.unreadNotifications} size="small" offset={[2, 2]}>
                    <BellOutlined style={{ fontSize: 18, color: '#98A2B3', cursor: 'pointer' }} />
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {item.todaySchedules.map(schedule => {
                      const isPast = new Date(schedule.endTime) < now
                      const isCurrent = new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now
                      const isNext = nextClass?.id === schedule.id
                      return (
                        <div key={schedule.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: isPast ? 'rgba(0,0,0,.03)' : isCurrent ? 'rgba(39,166,68,.07)' : 'rgba(232,117,69,.05)',
                          border: `1px solid ${isPast ? 'rgba(0,0,0,.06)' : isCurrent ? 'rgba(39,166,68,.2)' : 'rgba(232,117,69,.15)'}`,
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: isPast ? '#c0b8ae' : isCurrent ? '#27a644' : '#E87545',
                          }} />
                          <div style={{ fontSize: 13, fontWeight: 500, color: isPast ? '#c0b8ae' : '#1a1201', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {schedule.courseName}
                          </div>
                          <div style={{ fontSize: 11, color: '#9a8e7a', flexShrink: 0 }}>
                            {formatTime(schedule.startTime)}{isPast ? ' 完成' : isCurrent ? ' 上课中' : isNext ? ' 下节' : ''}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, flexShrink: 0,
                            color: isPast ? '#c0b8ae' : isCurrent ? '#27a644' : '#E87545',
                            background: isPast ? 'rgba(0,0,0,.04)' : isCurrent ? 'rgba(39,166,68,.1)' : 'rgba(232,117,69,.1)',
                            padding: '1px 6px', borderRadius: 4,
                          }}>
                            {isPast ? '已完成' : isCurrent ? '上课中' : isNext ? '下节课' : '待上课'}
                          </div>
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
