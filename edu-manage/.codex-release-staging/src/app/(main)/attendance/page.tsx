'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Button, Card, Drawer, Modal, Select, Space, Tag, Typography, message, Input, InputNumber } from 'antd'
import { CheckCircleOutlined, TeamOutlined, EnvironmentOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { isFirstTeachingPeriod } from '@/lib/schedule-periods'
import {
  normalizeAttendanceRecordStatus,
  resolveAttendanceSubmissionStatus,
} from '@/lib/attendance-status'

const { Text } = Typography

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('加载失败'); return r.json() })

type AttStatus = 'present' | 'leave'

const CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一',
  ONE_ON_TWO: '一对二',
  ONE_ON_THREE: '一对三',
  SMALL_GROUP: '小班课',
  GROUP: '班课',
  SMALL_CLASS: '小班课',
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

function toLocalStatus(status: unknown): AttStatus {
  const value = String(status || '').toUpperCase()
  if (value === 'LEAVE' || value === 'ABSENT') return 'leave'
  return 'present'
}

function toApiStatus(status: AttStatus) {
  if (status === 'leave') return 'LEAVE'
  return 'PRESENT'
}

function buildTimeIso(date: string, time: unknown) {
  const value = String(time || '00:00').slice(0, 5)
  return `${date}T${value}:00`
}

export default function AttendancePage() {
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const { periods } = useSchedulePeriods(division)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [filterType, setFilterType] = useState('')

  const query = `/api/attendance/today?date=${selectedDate}&division=${division}${filterTeacherId ? `&teacherId=${filterTeacherId}` : ''}`
  const { data: lessonsRaw, mutate: mutateData, isLoading } = useSWR(query, fetcher, { refreshInterval: 120_000 })
  const { data: teachersData } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)

  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, unknown> | null>(null)
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [mealStudentIds, setMealStudentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [attendanceDrawerOpen, setAttendanceDrawerOpen] = useState(false)
  const [actualMinutes, setActualMinutes] = useState<number | null>(null)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentMinutes, setAdjustmentMinutes] = useState<number | null>(null)
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const rawSchedules: Record<string, unknown>[] = Array.isArray(lessonsRaw) ? lessonsRaw.map((lesson: Record<string, unknown>) => {
    const group = lesson.group as Record<string, unknown> | undefined
    const students: Record<string, unknown>[] = (Array.isArray(lesson.students) ? lesson.students as Record<string, unknown>[] : []).map((student) => ({
      ...student,
      originalStatus: normalizeAttendanceRecordStatus(student.status),
      status: toLocalStatus(student.status),
    }))
    const lessonDate = String(lesson.lessonDate || selectedDate).slice(0, 10)
    const classType = lesson.intensiveMode === 'INTENSIVE'
      ? lesson.teachingType as string || 'ONE_ON_ONE'
      : group?.type as string || ''
    return {
      id: lesson.id,
      lessonId: lesson.id,
      title: `${group?.courseName || ''} ${group?.name || ''}`.trim(),
      classType,
      startTime: buildTimeIso(lessonDate, lesson.startTime),
      endTime: buildTimeIso(lessonDate, lesson.endTime),
      teacherName: group?.teacherName || '-',
      teacherId: group?.teacherId || '',
      roomName: group?.roomName || '未分配',
      studentCount: lesson.totalStudents || students.length,
      attendanceStatus: Number(lesson.attendanceCount || 0) > 0 ? 'done' : 'pending',
      intensiveMode: lesson.intensiveMode,
      teachingType: lesson.teachingType,
      plannedMinutes: lesson.plannedMinutes,
      actualMinutes: lesson.actualMinutes,
      settlementStatus: lesson.settlementStatus,
      students,
      attendances: students.filter((student) => student.status).map((student) => ({
        studentId: student.studentId,
        status: student.status,
      })),
    }
  }) : []
  const schedules: Record<string, unknown>[] = rawSchedules.map((schedule) => ({
    ...schedule,
    isSystemFirstPeriod: isFirstTeachingPeriod(periods, formatTime(String(schedule.startTime || ''))),
  }))
  const allSchedules = filterType ? schedules.filter((schedule) => schedule.classType === filterType) : schedules

  const groupedSchedules = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = { '上午': [], '下午': [], '晚上': [] }
    allSchedules.forEach(s => {
      const period = getPeriodGroup(formatTime(s.startTime as string))
      groups[period].push(s)
    })
    return groups
  }, [allSchedules])

  const handleSelectSchedule = (schedule: Record<string, unknown>) => {
    const startTimeStr = ((schedule.startTime as string) || '').substring(11, 16)
    const dateStr = ((schedule.startTime as string) || '').substring(0, 10)
    if (startTimeStr && dateStr) {
      const [hour, minute] = startTimeStr.split(':').map(Number)
      const lessonStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
      const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
      if (new Date() < earliestAllowed) {
        message.warning(`未到考勤时间，${startTimeStr} 开课，最早 ${earliestAllowed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 可开始考勤`)
        return
      }
    }
    setSelectedSchedule(schedule)
    const students = (schedule.students as Array<Record<string, unknown>>) || []
    const existingAtts = (schedule.attendances as Array<Record<string, unknown>>) || []
    const newMap = new Map<string, AttStatus>()
    students.forEach((stu: Record<string, unknown>) => {
      const existing = existingAtts.find(a => a.studentId === stu.studentId)
      newMap.set(stu.studentId as string, (existing?.status as AttStatus) || 'present')
    })
    setAttMap(newMap)
    setChangedStudentIds(new Set())
    setMealStudentIds(new Set(
      students.filter((student) => Boolean(student.eating)).map((student) => String(student.studentId)),
    ))
    setActualMinutes(Number(schedule.actualMinutes || schedule.plannedMinutes || 0) || null)
    if (isMobile) {
      setAttendanceDrawerOpen(true)
    }
  }

  const setAllPresent = () => {
    const newMap = new Map<string, AttStatus>()
    const students = (selectedSchedule?.students as Array<Record<string, unknown>>) || []
    students.forEach(s => newMap.set(s.studentId as string, 'present'))
    setAttMap(newMap)
    setChangedStudentIds(new Set(students.map((student) => String(student.studentId))))
  }

  const setStudentStatus = (studentId: string, status: AttStatus) => {
    setAttMap(prev => { const next = new Map(prev); next.set(studentId, status); return next })
    setChangedStudentIds(prev => new Set(prev).add(studentId))
  }

  const toggleMeal = (studentId: string) => {
    setMealStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const summary = useMemo(() => {
    if (!attMap.size) return { present: 0, leave: 0 }
    const vals = [...attMap.values()]
    return {
      present: vals.filter(s => s === 'present').length,
      leave: vals.filter(s => s === 'leave').length,
    }
  }, [attMap])

  const handleSubmit = async () => {
    if (!selectedSchedule) return
    const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
    setSubmitting(true)
    const records = students.map(s => ({
      studentId: s.studentId,
      status: resolveAttendanceSubmissionStatus({
        displayedStatus: toApiStatus(attMap.get(s.studentId as string) || 'present'),
        originalStatus: s.originalStatus,
        changed: changedStudentIds.has(String(s.studentId)),
      }),
      actualMinutes: selectedSchedule.intensiveMode === 'INTENSIVE' ? actualMinutes : undefined,
    }))
    if (selectedSchedule.intensiveMode === 'INTENSIVE' && !actualMinutes) {
      message.warning('请填写实际授课分钟')
      setSubmitting(false)
      return
    }
    try {
      const lessonId = (selectedSchedule.lessonId || selectedSchedule.id) as string
      const res = await fetch('/api/admin/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          records,
          mealStudentIds: selectedSchedule.isSystemFirstPeriod ? [...mealStudentIds] : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || '提交失败')
      message.success(`考勤提交成功，共 ${records.length} 人`)
      mutateData()
      setSelectedSchedule(null)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '提交失败')
    } finally { setSubmitting(false) }
  }

  const openSettlementAdjustment = () => {
    if (!selectedSchedule) return
    setAdjustmentMinutes(Number(selectedSchedule.actualMinutes || 0) || null)
    setAdjustmentReason('')
    setAdjustmentOpen(true)
  }

  const handleSettlementAdjustment = async () => {
    if (!selectedSchedule || !adjustmentMinutes || !adjustmentReason.trim()) {
      message.warning('请填写新的实际分钟和调整原因')
      return
    }
    setAdjusting(true)
    try {
      const lessonId = (selectedSchedule.lessonId || selectedSchedule.id) as string
      const res = await fetch('/api/admin/intensive-settlement/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, newMinutes: adjustmentMinutes, reason: adjustmentReason.trim() }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '调整失败')
      message.success(payload.idempotent ? '结算数据未变化，无需重复调整' : '结算调整成功')
      setAdjustmentOpen(false)
      setActualMinutes(adjustmentMinutes)
      setSelectedSchedule((current) => current ? {
        ...current,
        actualMinutes: adjustmentMinutes,
        settlementStatus: 'ADJUSTED',
      } : current)
      await mutateData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整失败')
    } finally {
      setAdjusting(false)
    }
  }

  const statusBtnStyle = (active: boolean, target: AttStatus) => {
    const colors: Record<AttStatus, { bg: string; color: string; label: string }> = {
      present: { bg: 'rgba(39,166,68,0.12)', color: '#27a644', label: '出勤' },
      leave: { bg: 'rgba(245,166,35,0.12)', color: '#f5a623', label: '请假' },
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
            virtual={false}
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
            options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))} />
          <Select allowClear placeholder="按班型筛选" style={{ width: 130 }}
            value={filterType || undefined} onChange={v => setFilterType(v || '')}
            virtual={false}
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
            options={[
              { label: '一对一', value: 'ONE_ON_ONE' },
              { label: '一对二', value: 'ONE_ON_TWO' },
              { label: '一对三', value: 'ONE_ON_THREE' },
              { label: '小班课', value: 'SMALL_CLASS' },
            ]} />
          <Text type="secondary" style={{ fontSize: 12 }}>共 {allSchedules.length} 节课</Text>
        </Space>
      </Card>

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : allSchedules.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 8, minHeight: 300, display: 'grid', placeItems: 'center', background: '#ffffff', border: '1px solid #EEE7E1' }}>
          <GuidedEmpty title={filterType ? '当前班型没有课程' : '这一天没有课程'} description={filterType ? '可以清除班型筛选，查看当天其他需要考勤的课程。' : '当天排课后会显示在这里，便于统一完成学员考勤。'} actionLabel={filterType ? '清除筛选' : '查看课程管理'} onAction={() => filterType ? setFilterType('') : window.location.assign('/courses')} />
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
                <GuidedEmpty title="选择一节课程开始考勤" description="选择左侧课程后，这里会显示学员名单和出勤状态，避免登记到错误课次。" compact />
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
                      <Button
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        onClick={setAllPresent}
                      >全部出勤</Button>
                    </div>
                  </Card>

                  {selectedSchedule.intensiveMode === 'INTENSIVE' && (
                    <Card bordered={false} style={{ borderRadius: 10, background: '#faf8f5', border: '1px solid #EEE7E1' }} bodyStyle={{ padding: '10px 16px' }}>
                      <Space wrap>
                        <Text strong>实际授课分钟</Text>
                        <InputNumber
                          min={1}
                          max={600}
                          value={actualMinutes}
                          disabled={selectedSchedule.settlementStatus !== 'UNSETTLED'}
                          onChange={(value) => setActualMinutes(value)}
                          addonAfter="分钟"
                        />
                        <Text type="secondary">计划 {String(selectedSchedule.plannedMinutes || '-')} 分钟</Text>
                        {selectedSchedule.settlementStatus !== 'UNSETTLED' && (
                          <>
                            <Tag color="green">已结算锁定</Tag>
                            <Button onClick={openSettlementAdjustment}>调整结算</Button>
                          </>
                        )}
                      </Space>
                    </Card>
                  )}

                  {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                    <div className="attendance-meal-banner">这是系统第一课节，可同时登记学生是否就餐；未勾选表示不就餐。</div>
                  )}

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
                                fontSize: 13, fontWeight: 600, color: '#5a4e3a',
                              }}>{(s.studentName as string)?.[0] || '?'}</div>
                              <div style={{ fontSize: 13, color: '#1F2329' }}>{s.studentName as string}</div>
                            </div>
                            <Space size={4}>
                              {(['present', 'leave'] as AttStatus[]).map(t => (
                                <button key={t}
                                  disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                                  onClick={() => setStudentStatus(s.studentId as string, t)}
                                  style={statusBtnStyle(status === t, t)}>
                                  {t === 'present' ? '出勤' : '请假'}
                                </button>
                              ))}
                              {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                                <button
                                  type="button"
                                  className={`attendance-meal-toggle ${mealStudentIds.has(String(s.studentId)) ? 'is-active' : ''}`}
                                  onClick={() => toggleMeal(String(s.studentId))}
                                >就餐</button>
                              )}
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
                        {Boolean(selectedSchedule.isSystemFirstPeriod) && <span style={{ fontSize: 13, color: '#E8784A' }}>就餐 {mealStudentIds.size}</span>}
                      </Space>
                      <Button type="primary" loading={submitting} onClick={handleSubmit}
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
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
      {/* 手机端考勤 Drawer */}
      {isMobile && (
        <Drawer
          open={attendanceDrawerOpen}
          onClose={() => setAttendanceDrawerOpen(false)}
          placement="bottom"
          height="90vh"
          title={selectedSchedule ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>{selectedSchedule.title as string}</span>
              <Tag color={selectedSchedule.classType === 'ONE_ON_ONE' ? 'purple' : 'orange'} style={{ borderRadius: 9999, fontSize: 10 }}>
                {CLASS_TYPE_LABELS[selectedSchedule.classType as string] || String(selectedSchedule.classType || '')}
              </Tag>
            </div>
          ) : '考勤'}
          styles={{ body: { padding: 0, overflowY: 'auto' } }}
          destroyOnClose={false}
        >
          {selectedSchedule && (() => {
            const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* 课程信息 */}
                <div style={{ padding: '12px 16px', background: '#FCFBF9', borderBottom: '1px solid #EEE7E1' }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>
                      <UserOutlined style={{ marginRight: 4 }} />{selectedSchedule.teacherName as string}
                    </span>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>
                      <EnvironmentOutlined style={{ marginRight: 4 }} />{selectedSchedule.roomName as string}
                    </span>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />{formatTime(selectedSchedule.startTime as string)}-{formatTime(selectedSchedule.endTime as string)}
                    </span>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>
                      <TeamOutlined style={{ marginRight: 4 }} />{students.length}人
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button
                      size="small"
                      disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                      onClick={setAllPresent}
                    >全部出勤</Button>
                  </div>
                </div>

                {selectedSchedule.intensiveMode === 'INTENSIVE' && (
                  <div style={{ padding: '10px 16px', background: '#faf8f5', borderBottom: '1px solid #EEE7E1' }}>
                    <Space wrap>
                      <Text strong style={{ fontSize: 12 }}>实际授课分钟</Text>
                      <InputNumber
                        min={1}
                        max={600}
                        value={actualMinutes}
                        disabled={selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        onChange={(value) => setActualMinutes(value)}
                        addonAfter="分钟"
                      />
                      {selectedSchedule.settlementStatus !== 'UNSETTLED' && (
                        <Button size="small" onClick={openSettlementAdjustment}>调整结算</Button>
                      )}
                    </Space>
                  </div>
                )}

                {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                  <div className="attendance-meal-banner">这是系统第一课节，可同时登记学生是否就餐；未勾选表示不就餐。</div>
                )}

                {/* 学生列表 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {students.map((s: Record<string, unknown>) => {
                    const status = attMap.get(s.studentId as string) || 'present'
                    const statusColors = {
                      present: { bg: 'rgba(39,166,68,0.1)', color: '#27a644', label: '出勤' },
                      leave:   { bg: 'rgba(245,166,35,0.1)', color: '#f5a623', label: '请假' },
                    } as const
                    
                    return (
                      <div key={s.studentId as string} style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        padding: '12px 14px',
                        marginBottom: 12,
                        border: '1px solid #F5F2EE',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: '#FDFCFB',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 600, color: '#5a4e3a', border: '1px solid #F5F2EE'
                          }}>{(s.studentName as string)?.[0] || '?'}</div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2329' }}>{s.studentName as string}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedSchedule.isSystemFirstPeriod ? 3 : 2}, 1fr)`, gap: 8 }}>
                          {(['present', 'leave'] as AttStatus[]).map(t => {
                            const active = status === t
                            const c = statusColors[t]
                            return (
                              <button key={t}
                                disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                                onClick={() => setStudentStatus(s.studentId as string, t)}
                                style={{
                                  padding: '8px 0',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  border: `1px solid ${active ? c.color : '#F0EBE5'}`,
                                  background: active ? c.bg : '#FDFCFB',
                                  color: active ? c.color : '#98A2B3',
                                  fontWeight: active ? 600 : 400,
                                  transition: 'all 0.2s'
                                }}>
                                {c.label}
                              </button>
                            )
                          })}
                          {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                            <button
                              type="button"
                              className={`attendance-meal-toggle ${mealStudentIds.has(String(s.studentId)) ? 'is-active' : ''}`}
                              onClick={() => toggleMeal(String(s.studentId))}
                            >就餐</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 汇总 + 提交 */}
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10,
                  padding: '16px',
                  background: '#ffffff',
                  borderTop: '1px solid #EEE7E1',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
                  paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#27a644' }}>{summary.present}</div>
                        <div style={{ fontSize: 10, color: '#98A2B3' }}>出勤</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f5a623' }}>{summary.leave}</div>
                        <div style={{ fontSize: 10, color: '#98A2B3' }}>请假</div>
                      </div>
                      {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#E8784A' }}>{mealStudentIds.size}</div>
                          <div style={{ fontSize: 10, color: '#98A2B3' }}>就餐</div>
                        </div>
                      )}
                    </div>
                    <Button type="primary" loading={submitting} size="large"
                      disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                      onClick={async () => { await handleSubmit(); setAttendanceDrawerOpen(false) }}
                      style={{ background: '#E8784A', borderColor: '#E8784A', height: 44, borderRadius: 8, padding: '0 24px' }}
                      icon={<CheckCircleOutlined />}>
                      提交考勤
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </Drawer>
      )}
      <Modal
        title="调整突击班结算"
        open={adjustmentOpen}
        confirmLoading={adjusting}
        okText="确认调整"
        cancelText="取消"
        onOk={handleSettlementAdjustment}
        onCancel={() => setAdjustmentOpen(false)}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">原实际授课分钟：{String(selectedSchedule?.actualMinutes || '-')}</Text>
          <div>
            <Text strong>调整后分钟</Text>
            <InputNumber
              min={1}
              max={600}
              value={adjustmentMinutes}
              onChange={(value) => setAdjustmentMinutes(value)}
              addonAfter="分钟"
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>调整原因</Text>
            <Input.TextArea
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              maxLength={500}
              rows={4}
              showCount
              placeholder="请填写实际授课时间变更原因"
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </PageLayout>
  )
}
