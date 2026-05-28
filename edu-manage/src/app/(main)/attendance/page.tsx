'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Button, Card, Drawer, Select, Space, Spin, Empty, Tag, Typography, message, Input } from 'antd'
import { CheckCircleOutlined, TeamOutlined, EnvironmentOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('加载失败'); return r.json() })

type AttStatus = 'present' | 'leave' | 'absent' | 'late'

const CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一', SMALL_CLASS: '小班课',
}

const STATUS_TAG: Record<string, { label: string; color: string }> = {
  pending: { label: '待考勤', color: 'orange' },
  done: { label: '已完成', color: 'green' },
}

function getPeriodGroup(startTime: string): string {
  const h = parseInt(startTime?.split(':')[0] || new Date(startTime).getHours().toString())
  if (h < 12) return '上午'
  if (h < 18) return '下午'
  return '晚上'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return iso }
}

export default function AttendancePage() {
  const isMobile = useIsMobile() ?? false
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [filterType, setFilterType] = useState('')

  const query = `/api/attendance?date=${selectedDate}${filterTeacherId ? `&teacherId=${filterTeacherId}` : ''}${filterType ? `&classType=${filterType}` : ''}`
  const { data: schedules, mutate: mutateData, isLoading } = useSWR(query, fetcher, { refreshInterval: 60_000 })
  const { data: teachersData } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)

  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, unknown> | null>(null)
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const allSchedules: Record<string, unknown>[] = Array.isArray(schedules) ? schedules : []

  const groupedSchedules = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = { '上午': [], '下午': [], '晚上': [] }
    allSchedules.forEach(s => {
      const period = getPeriodGroup(formatTime(s.startTime as string))
      groups[period].push(s)
    })
    return groups
  }, [allSchedules])

  const handleSelectSchedule = (schedule: Record<string, unknown>) => {
    setSelectedSchedule(schedule)
    const students = (schedule.students as Array<Record<string, unknown>>) || []
    const existingAtts = (schedule.attendances as Array<Record<string, unknown>>) || []
    const newMap = new Map<string, AttStatus>()
    students.forEach((stu: Record<string, unknown>) => {
      const existing = existingAtts.find(a => a.studentId === stu.studentId)
      newMap.set(stu.studentId as string, (existing?.status as AttStatus) || 'present')
    })
    setAttMap(newMap)
  }

  const setAllPresent = () => {
    const newMap = new Map<string, AttStatus>()
    const students = (selectedSchedule?.students as Array<Record<string, unknown>>) || []
    students.forEach(s => newMap.set(s.studentId as string, 'present'))
    setAttMap(newMap)
  }

  const setStudentStatus = (studentId: string, status: AttStatus) => {
    setAttMap(prev => { const next = new Map(prev); next.set(studentId, status); return next })
  }

  const summary = useMemo(() => {
    if (!attMap.size) return { present: 0, leave: 0, absent: 0, late: 0 }
    const vals = [...attMap.values()]
    return {
      present: vals.filter(s => s === 'present').length,
      leave: vals.filter(s => s === 'leave').length,
      absent: vals.filter(s => s === 'absent').length,
      late: vals.filter(s => s === 'late').length,
    }
  }, [attMap])

  const handleSubmit = async () => {
    if (!selectedSchedule) return
    const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
    setSubmitting(true)
    const records = students.map(s => ({
      studentId: s.studentId,
      status: attMap.get(s.studentId as string) || 'present',
    }))
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: selectedSchedule.id, records }),
      })
      if (!res.ok) throw new Error((await res.json()).error || '提交失败')
      message.success(`考勤提交成功，共 ${records.length} 人`)
      mutateData()
      setSelectedSchedule(null)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '提交失败')
    } finally { setSubmitting(false) }
  }

  const statusBtnStyle = (active: boolean, target: AttStatus) => {
    const colors: Record<AttStatus, { bg: string; color: string; label: string }> = {
      present: { bg: 'rgba(39,166,68,0.12)', color: '#27a644', label: '出勤' },
      leave: { bg: 'rgba(245,166,35,0.12)', color: '#f5a623', label: '请假' },
      absent: { bg: 'rgba(224,62,45,0.12)', color: '#e03e2d', label: '旷课' },
      late: { bg: 'rgba(100,100,220,0.12)', color: '#6464dc', label: '迟到' },
    }
    const c = colors[target]
    return {
      padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
      borderColor: active ? c.color : 'transparent', background: active ? c.bg : 'transparent',
      color: active ? c.color : '#98A2B3', fontWeight: active ? 600 : 400,
    } as const
  }

  return (
    <PageLayout title="考勤管理" subtitle="课程签到 · 按日期/教师/类型筛选">
      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }} bodyStyle={{ padding: '8px 14px' }}>
        <Space wrap>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: 160 }} />
          <Select allowClear placeholder="按教师筛选" style={{ width: 160 }}
            value={filterTeacherId || undefined} onChange={v => setFilterTeacherId(v || '')}
            options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))} />
          <Select allowClear placeholder="按班型筛选" style={{ width: 130 }}
            value={filterType || undefined} onChange={v => setFilterType(v || '')}
            options={[
              { label: '一对一', value: 'ONE_ON_ONE' },
              { label: '小班课', value: 'SMALL_CLASS' },
            ]} />
          <Text type="secondary" style={{ fontSize: 12 }}>共 {allSchedules.length} 节课</Text>
        </Space>
      </Card>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : allSchedules.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 8, minHeight: 300, display: 'grid', placeItems: 'center', background: '#ffffff', border: '1px solid #EEE7E1' }}>
          <Empty description="该日期暂无课程" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, minHeight: 'calc(100vh - 300px)' }}>
          <div style={{ width: isMobile ? '100%' : 320, flexShrink: 0, overflowY: 'auto' }}>
            {(['上午', '下午', '晚上'] as const).map(period => {
              const items = groupedSchedules[period]
              if (!items.length) return null
              return (
                <div key={period} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#E8784A', marginBottom: 8, paddingLeft: 4 }}>
                    {period} ({items.length}节)
                  </div>
                  {items.map((s: Record<string, unknown>) => {
                    const isSelected = selectedSchedule?.id === s.id
                    const attStatus = s.attendanceStatus as string || 'pending'
                    const isOneOnOne = s.classType === 'ONE_ON_ONE'
                    return (
                      <div key={s.id as string} style={{
                        padding: '12px 14px', marginBottom: 10, borderRadius: 8, cursor: 'pointer',
                        background: isSelected ? '#FFF6F1' : '#ffffff',
                        border: `1px solid ${isSelected ? '#E8784A' : '#EEE7E1'}`,
                        boxShadow: isSelected ? '0 8px 18px rgba(232,120,74,.12)' : '0 1px 2px rgba(17,24,39,.03)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 14, color: '#1F2329', flex: 1, lineHeight: 1.35 }} ellipsis>
                            {s.title as string}
                          </Text>
                          <Tag color={isOneOnOne ? 'purple' : 'orange'} style={{ borderRadius: 9999, fontSize: 11 }}>
                            {CLASS_TYPE_LABELS[s.classType as string] || s.classType as string}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                          <ClockCircleOutlined style={{ marginRight: 6, color: '#98A2B3' }} />{formatTime(s.startTime as string)}-{formatTime(s.endTime as string)}
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                          <UserOutlined style={{ marginRight: 6, color: '#98A2B3' }} />教师：{s.teacherName as string}
                        </div>
                        <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                          <span><EnvironmentOutlined style={{ marginRight: 4 }} />{s.roomName as string}</span>
                          <span><TeamOutlined style={{ marginRight: 4 }} />{s.studentCount as number}人</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tag color={STATUS_TAG[attStatus]?.color || 'default'} style={{ borderRadius: 9999, fontSize: 10 }}>
                            {STATUS_TAG[attStatus]?.label || attStatus}
                          </Tag>
                          <Button size="small" type="primary"
                            style={{ background: '#E8784A', borderColor: '#E8784A', borderRadius: 6, fontSize: 11 }}
                            onClick={() => handleSelectSchedule(s)}>
                            {isSelected ? '考勤中' : '去考勤'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div style={{ flex: 1 }}>
            {!selectedSchedule ? (
              <Card bordered={false} style={{ borderRadius: 10, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #EEE7E1' }}>
                <Empty description="请从左侧选择课程开始考勤" />
              </Card>
            ) : (() => {
              const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Card bordered={false} style={{ borderRadius: 10, background: '#ffffff', border: '1px solid #EEE7E1' }} bodyStyle={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 16, color: '#1F2329' }}>{selectedSchedule.title as string}</Text>
                          <Tag color={selectedSchedule.classType === 'ONE_ON_ONE' ? 'purple' : 'orange'}>
                            {CLASS_TYPE_LABELS[selectedSchedule.classType as string] || selectedSchedule.classType as string}
                          </Tag>
                        </div>
                        <Space size={16}>
                          <span style={{ fontSize: 12, color: '#98A2B3' }}><UserOutlined style={{ marginRight: 4 }} />{selectedSchedule.teacherName as string}</span>
                          <span style={{ fontSize: 12, color: '#98A2B3' }}><EnvironmentOutlined style={{ marginRight: 4 }} />{selectedSchedule.roomName as string}</span>
                          <span style={{ fontSize: 12, color: '#98A2B3' }}><ClockCircleOutlined style={{ marginRight: 4 }} />{formatTime(selectedSchedule.startTime as string)}-{formatTime(selectedSchedule.endTime as string)}</span>
                          <span style={{ fontSize: 12, color: '#98A2B3' }}><TeamOutlined style={{ marginRight: 4 }} />{students.length}人</span>
                        </Space>
                      </div>
                      <Button onClick={setAllPresent}>全部出勤</Button>
                    </div>
                  </Card>

                  <div style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 500px)', overflowY: 'auto' }}>
                    {students.map((s: Record<string, unknown>) => {
                      const status = attMap.get(s.studentId as string) || 'present'
                      return (
                        <Card key={s.studentId as string} bordered={false}
                          style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1', marginBottom: 8 }}
                          bodyStyle={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%', background: '#FCFBF9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 600, color: '#5B6472',
                              }}>{(s.studentName as string)?.[0] || '?'}</div>
                              <div style={{ fontSize: 13, color: '#1F2329' }}>{s.studentName as string}</div>
                            </div>
                            <Space size={4}>
                              {(['present', 'leave', 'absent', 'late'] as AttStatus[]).map(t => (
                                <button key={t} onClick={() => setStudentStatus(s.studentId as string, t)}
                                  style={statusBtnStyle(status === t, t)}>
                                  {t === 'present' ? '出勤' : t === 'leave' ? '请假' : t === 'absent' ? '旷课' : '迟到'}
                                </button>
                              ))}
                            </Space>
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  <Card bordered={false} style={{ borderRadius: 10, background: '#ffffff', border: '1px solid #EEE7E1' }} bodyStyle={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space size={20}>
                        <span style={{ fontSize: 13, color: '#27a644' }}>出勤 {summary.present}</span>
                        <span style={{ fontSize: 13, color: '#f5a623' }}>请假 {summary.leave}</span>
                        <span style={{ fontSize: 13, color: '#e03e2d' }}>旷课 {summary.absent}</span>
                        <span style={{ fontSize: 13, color: '#6464dc' }}>迟到 {summary.late}</span>
                      </Space>
                      <Button type="primary" loading={submitting} onClick={handleSubmit}
                        style={{ background: '#E8784A', borderColor: '#E8784A', minWidth: 120 }}
                        icon={<CheckCircleOutlined />}>提交考勤</Button>
                    </div>
                  </Card>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
