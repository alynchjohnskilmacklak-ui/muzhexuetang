'use client'

import { useMemo, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Spin, Empty, Input, Modal, Select, Typography, message } from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { findSchedulePeriod, PERIOD_HEIGHTS, PERIOD_BG, SchedulePeriod } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { findScheduleMoveConflicts } from '@/lib/schedule-conflicts'

const { Text } = Typography

const TEACHER_COLORS = [
  '#E8784A', '#1D9E75', '#534AB7', '#D4537E',
  '#BA7517', '#185FA5', '#27500A', '#72243E'
]

function getTeacherColor(teacherId: string): string {
  if (!teacherId) return '#E8784A'
  const hash = teacherId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return TEACHER_COLORS[Math.abs(hash) % TEACHER_COLORS.length]
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getWeekDates(weekStart: Date): Date[] {
  return WEEK_DAYS.map((_, i) => addDays(weekStart, i))
}

const TYPE_LABELS: Record<string, string> = {
  GROUP: '班课', ONE_ON_ONE: '一对一', ONE_ON_TWO: '一对二', SMALL_GROUP: '小组课',
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

function findBestPeriodId(periods: SchedulePeriod[], startTime: string): string | null {
  return findSchedulePeriod(periods, startTime)?.id || null
}

export function TeacherWeekView({
  onLessonClick,
}: {
  onLessonClick: (lesson: Record<string, unknown>) => void
}) {
  const isTablet = useIsMobile(1025) ?? false
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>()
  const [draggingLesson, setDraggingLesson] = useState<Record<string, unknown> | null>(null)
  const [dragTarget, setDragTarget] = useState<string>()
  const [conflictTarget, setConflictTarget] = useState<string>()
  const [moveDialog, setMoveDialog] = useState<{
    lesson: Record<string, unknown>
    lessonDate: string
    periodId: string
  } | null>(null)
  const [moveBusy, setMoveBusy] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const { periods } = useSchedulePeriods()

  const { data: teachersData, isLoading: loadingTeachers } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers)
    ? teachersData.teachers
    : Array.isArray(teachersData) ? teachersData : []

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const shouldFetch = !!selectedTeacherId
  const { data: weekData, mutate: mutateWeek } = useSWR(
    shouldFetch ? `/api/schedules/teacher-week?teacherId=${selectedTeacherId}&weekStart=${weekStartStr}` : null,
    fetcher
  )
  const lessons: Record<string, unknown>[] = useMemo(() => Array.isArray(weekData?.lessons) ? weekData.lessons : [], [weekData])

  // Secondary frontend filter by teacherId (safety net)
  const filteredLessons = useMemo(() => {
    if (!selectedTeacherId) return []
    return lessons.filter(l => {
      const tId = (l.teacher as Record<string, unknown> | undefined)?.id || l.teacherId
      const assignments = ((l.group as Record<string, unknown> | undefined)?.teacherAssignments || []) as Record<string, unknown>[]
      return String(tId) === selectedTeacherId || assignments.some((assignment) => assignment.teacherId === selectedTeacherId)
    })
  }, [lessons, selectedTeacherId])

  const lessonsByDayPeriod = useMemo(() => {
    const map: Record<string, Record<string, Record<string, unknown>[]>> = {}
    filteredLessons.forEach((l: Record<string, unknown>) => {
      const dateKey = format(new Date(l.lessonDate as string), 'yyyy-MM-dd')
      const startTime = l.startTime as string
      const periodId = findBestPeriodId(periods, startTime)
      if (periodId) {
        if (!map[dateKey]) map[dateKey] = {}
        if (!map[dateKey][periodId]) map[dateKey][periodId] = []
        map[dateKey][periodId].push(l)
      }
    })
    return map
  }, [filteredLessons, periods])

  const selectedTeacher = teacherList.find(t => t.id === selectedTeacherId)
  const teacherColor = selectedTeacherId ? getTeacherColor(selectedTeacherId) : '#E8784A'

  const moveLesson = async (lesson: Record<string, unknown>, date: Date, period: SchedulePeriod) => {
    if (!lesson?.id || period.type !== 'CLASS') return false
    const lessonId = String(lesson.id)
    const [startHour, startMinute] = String(lesson.startTime).split(':').map(Number)
    const [endHour, endMinute] = String(lesson.endTime).split(':').map(Number)
    const duration = Math.max(1, endHour * 60 + endMinute - (startHour * 60 + startMinute))
    const [targetHour, targetMinute] = period.start.split(':').map(Number)
    const endTotal = targetHour * 60 + targetMinute + duration
    const next = {
      lessonDate: format(date, 'yyyy-MM-dd'),
      startTime: period.start,
      endTime: `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`,
    }
    const targetKey = `${next.lessonDate}:${period.id}`
    const sourceGroup = lesson.group as Record<string, unknown> | undefined
    const sourceRoom = sourceGroup?.room as Record<string, unknown> | undefined
    const localConflicts = findScheduleMoveConflicts(next.startTime, next.endTime, filteredLessons
      .filter((candidate) => String(candidate.id) !== lessonId && format(new Date(candidate.lessonDate as string), 'yyyy-MM-dd') === next.lessonDate)
      .map((candidate) => {
        const candidateGroup = candidate.group as Record<string, unknown> | undefined
        const candidateRoom = candidateGroup?.room as Record<string, unknown> | undefined
        return {
          id: String(candidate.id),
          startTime: String(candidate.startTime),
          endTime: String(candidate.endTime),
          label: String((candidateGroup?.name as string | undefined) || '已有课程'),
          teacherConflict: true,
          roomConflict: Boolean(sourceRoom?.id) && sourceRoom?.id === candidateRoom?.id,
        }
      }))
    if (localConflicts.length) {
      setConflictTarget(targetKey)
      window.setTimeout(() => setConflictTarget((current) => current === targetKey ? undefined : current), 1800)
      message.error(`教师时间冲突：${localConflicts[0].label} ${localConflicts[0].startTime}-${localConflicts[0].endTime}，原课表未变`)
      setDraggingLesson(null)
      setDragTarget(undefined)
      return false
    }
    const previous = weekData
    await mutateWeek({
      ...weekData,
      lessons: lessons.map((lesson) => String(lesson.id) === lessonId ? { ...lesson, ...next } : lesson),
    }, false)
    setDraggingLesson(null)
    setDragTarget(undefined)
    try {
      const response = await fetch(`/api/class-lessons/${lessonId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '调课失败')
      message.success('调课已保存')
      await mutateWeek()
      return true
    } catch (error) {
      await mutateWeek(previous, false)
      message.error(error instanceof Error ? error.message : '调课失败，已恢复原课表')
      return false
    }
  }

  const openMoveDialog = (lesson: Record<string, unknown>) => {
    setMoveDialog({
      lesson,
      lessonDate: String(lesson.lessonDate).slice(0, 10),
      periodId: findBestPeriodId(periods, String(lesson.startTime)) || periods.find((period) => period.type === 'CLASS')?.id || '',
    })
  }

  const submitMoveDialog = async () => {
    if (!moveDialog) return
    const period = periods.find((item) => item.id === moveDialog.periodId)
    const date = new Date(`${moveDialog.lessonDate}T00:00:00`)
    if (!period || Number.isNaN(date.getTime())) {
      message.warning('请选择正确的调课日期和节次')
      return
    }
    setMoveBusy(true)
    const saved = await moveLesson(moveDialog.lesson, date, period)
    setMoveBusy(false)
    if (saved) setMoveDialog(null)
  }

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 10,
        background: 'var(--color-primary-bg)', border: '1px solid var(--color-hairline)',
      }}>
        <Text strong><SwapOutlined /> 拖拽调课已开启</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          电脑可直接拖到目标日期和节次；手机请点课次内“调课”。冲突时会自动恢复。
        </Text>
      </div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setWeekStart((prev: Date) => addDays(prev, -7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
        >←</button>

        <div style={{
          padding: '0 16px', height: 34, display: 'flex', alignItems: 'center',
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
        }}>
          {format(weekStart, 'M月d日', { locale: zhCN })} – {format(addDays(weekStart, 6), 'M月d日', { locale: zhCN })}
        </div>

        <button
          onClick={() => setWeekStart((prev: Date) => addDays(prev, 7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
        >→</button>

        <button
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
        >本周</button>

        <div style={{ marginLeft: 'auto', width: 220 }}>
          <Select
            showSearch
            placeholder="选择教师"
            style={{ width: '100%' }}
            value={selectedTeacherId}
            onChange={v => setSelectedTeacherId(v)}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={teacherList.map((t: Record<string, unknown>) => ({
              label: t.name as string,
              value: t.id as string,
            }))}
          />
        </div>
      </div>

      {loadingTeachers ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : !shouldFetch ? (
        <Empty description="请从上方下拉选择一个教师查看课表" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTablet ? `56px repeat(7, minmax(72px, 1fr))` : `72px repeat(7, minmax(88px, 1fr))`,
            minWidth: isTablet ? 620 : 700,
          }}>
            {/* Header */}
            <div style={{ borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', background: 'var(--color-background-secondary, #faf8f5)' }} />
            {weekDates.map((date, i) => {
              const today = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '8px 4px',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: today ? 'rgba(232,120,74,.06)' : 'transparent',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>{WEEK_DAYS[i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: today ? '#E8784A' : '#1F2329' }}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}

            {/* Period rows */}
            {periods.map(period => {
              const displayHeight = period.type === 'CLASS' ? PERIOD_HEIGHTS.CLASS
                : period.type === 'BIG_BREAK' ? 18
                : period.type === 'LUNCH' ? 22
                : 14

              return (
                <div key={period.id} style={{ display: 'contents' }}>
                  <div style={{
                    height: displayHeight,
                    background: PERIOD_BG[period.type],
                    borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                    borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                    padding: '2px 6px',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'flex-end',
                    fontSize: 9,
                    color: period.type === 'CLASS' ? '#E8784A'
                      : period.type === 'BIG_BREAK' ? '#534AB7'
                      : period.type === 'LUNCH' ? '#1D9E75'
                      : 'var(--color-text-tertiary, #98A2B3)',
                    fontWeight: period.type === 'BREAK' ? 'normal' : 500,
                    fontStyle: period.type === 'BREAK' ? 'italic' : 'normal',
                  }}>
                    {period.type === 'CLASS' ? `${period.name} ${period.start}–${period.end}`
                      : period.type === 'LUNCH' ? `午休 ${period.start}–${period.end}`
                      : period.name}
                  </div>

                  {weekDates.map((date, dayIdx) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    const cellLessons = lessonsByDayPeriod[dateKey]?.[period.id] || []
                    return (
                      <div key={dayIdx}
                        onDragOver={(event) => { if (period.type === 'CLASS') { event.preventDefault(); setDragTarget(`${dateKey}:${period.id}`) } }}
                        onDragLeave={() => setDragTarget(undefined)}
                        onDrop={(event) => {
                          event.preventDefault()
                          if (draggingLesson) void moveLesson(draggingLesson, date, period)
                        }}
                        style={{
                        height: displayHeight,
                        background: conflictTarget === `${dateKey}:${period.id}`
                          ? 'var(--color-error-bg)'
                          : dragTarget === `${dateKey}:${period.id}`
                            ? 'var(--color-success-bg)'
                            : PERIOD_BG[period.type],
                        borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                        borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                        padding: period.type === 'CLASS' ? 3 : 0,
                      }}>
                        {period.type === 'CLASS' && cellLessons.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'hidden' }}>
                            {cellLessons.map((lesson: Record<string, unknown>) => {
                              const group = lesson.group as Record<string, unknown> | undefined
                              const course = group?.course as Record<string, unknown> | undefined
                              const enrollments = Array.isArray(group?.enrollments) ? group.enrollments : []
                              const courseType = (course?.type || 'GROUP') as string
                              const isOneOnOne = courseType !== 'GROUP'
                              const cellColor = isOneOnOne ? '#534AB7' : teacherColor
                              return (
                                <div
                                  key={lesson.id as string}
                                  draggable
                                  onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggingLesson(lesson) }}
                                  onDragEnd={() => { setDraggingLesson(null); setDragTarget(undefined) }}
                                  onClick={() => onLessonClick(lesson)}
                                  title="按住拖到目标日期和节次进行调课"
                                  style={{
                                    flex: 1, borderRadius: 4, padding: '2px 5px',
                                    background: `${cellColor}15`,
                                    borderLeft: `3px solid ${cellColor}`,
                                    cursor: 'pointer', overflow: 'hidden',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: cellColor, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {course?.name as string || '-'}
                                    </span>
                                    {isOneOnOne && (
                                      <span style={{ fontSize: 8, background: 'rgba(83,74,183,.12)', color: '#534AB7', padding: '0 3px', borderRadius: 2, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {TYPE_LABELS[courseType] || courseType}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: cellColor, opacity: .8, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {(lesson.startTime as string)} · {enrollments.length}人
                                  </div>
                                  <button
                                    type="button"
                                    draggable={false}
                                    onClick={(event) => { event.stopPropagation(); openMoveDialog(lesson) }}
                                    style={{
                                      marginTop: 2, padding: 0, border: 0, background: 'transparent',
                                      color: cellColor, fontSize: 9, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                                    }}
                                  >
                                    <SwapOutlined /> 调课
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {selectedTeacher && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)' }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: teacherColor }} />
              <Text style={{ fontSize: 12 }}>{selectedTeacher.name as string}老师</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>共 {filteredLessons.length} 节课</Text>
            </div>
          )}
        </div>
      )}
      <Modal
        title="调整课次"
        open={!!moveDialog}
        onCancel={() => !moveBusy && setMoveDialog(null)}
        onOk={() => void submitMoveDialog()}
        okText="确认调课"
        cancelText="取消"
        confirmLoading={moveBusy}
        destroyOnHidden
      >
        <div style={{ display: 'grid', gap: 14, paddingTop: 8 }}>
          <Text type="secondary">提交前会同时检查教师和教室时间冲突；保存失败会恢复原课表。</Text>
          <label style={{ display: 'grid', gap: 6 }}>
            <Text strong>目标日期</Text>
            <Input
              type="date"
              value={moveDialog?.lessonDate || ''}
              onChange={(event) => setMoveDialog((current) => current ? { ...current, lessonDate: event.target.value } : current)}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <Text strong>目标节次</Text>
            <Select
              value={moveDialog?.periodId}
              onChange={(periodId) => setMoveDialog((current) => current ? { ...current, periodId } : current)}
              options={periods.filter((period) => period.type === 'CLASS').map((period) => ({
                value: period.id,
                label: `${period.name} ${period.start}-${period.end}`,
              }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  )
}
