'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Spin, message } from 'antd'
import { format, startOfWeek } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import { RoomMatrixView } from './RoomMatrixView'
import { TeacherWeekView } from './TeacherWeekView'
import { WeekHeatmapView } from './WeekHeatmapView'
import { OneOnOneModal } from './OneOnOneModal'
import { ScheduleDetailPanel } from './_components/ScheduleDetailPanel'
import { ScheduleFormModal } from './_components/ScheduleFormModal'
import { SCHEDULE_PERIODS } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'

const VIEW_TABS = [
  { key: 'room-matrix', label: '📋 教室矩阵（精品班课）' },
  { key: 'teacher-week', label: '👥 教师课表' },
  { key: 'week-heatmap', label: '📊 周总览' },
]

export default function SchedulePage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>}>
      <SchedulePageInner />
    </Suspense>
  )
}

function SchedulePageInner() {
  const router = useRouter()
  const searchParamsHook = useSearchParams()
  const isMobile = useIsMobile()
  const urlView = searchParamsHook.get('view') || 'room-matrix'

  const [viewMode, setViewMode] = useState(urlView)
  const [oneOnOneOpen, setOneOnOneOpen] = useState(false)
  const [oneOnOneDate, setOneOnOneDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedLesson, setSelectedLesson] = useState<Record<string, unknown> | null>(null)
  const [editLesson, setEditLesson] = useState<Record<string, string>>({})
  const [savingLesson, setSavingLesson] = useState(false)
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false)

  const handleRoomCellClick = (room: Record<string, unknown>, period: typeof SCHEDULE_PERIODS[number]) => {
    setScheduleFormOpen(true)
  }

  const handleLessonClick = (lesson: Record<string, unknown>) => {
    setSelectedLesson(lesson)
    const group = lesson.group as Record<string, unknown> | undefined
    setEditLesson({
      lessonDate: format(new Date(lesson.lessonDate as string), 'yyyy-MM-dd'),
      startTime: String(lesson.startTime || ''),
      endTime: String(lesson.endTime || ''),
      teacherId: String((lesson.teacher as Record<string, unknown> | undefined)?.id || lesson.teacherId || ''),
      subject: String(lesson.subject || ''),
      status: String(lesson.status || 'SCHEDULED'),
    })
  }

  const handleHeatmapCellClick = (date: Date) => {
    setSelectedDate(date)
    setViewMode('room-matrix')
  }

  const saveLesson = async () => {
    if (!selectedLesson?.id) return
    setSavingLesson(true)
    try {
      const res = await fetch(`/api/class-lessons/${selectedLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLesson),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '保存失败')
      message.success('课次已更新')
      setSelectedLesson(null)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally { setSavingLesson(false) }
  }

  const cancelLesson = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('取消失败')
      message.success('已取消该课程')
      setSelectedLesson(null)
    } catch {
      message.error('取消失败')
    }
  }

  return (
    <PageLayout title="排课系统" subtitle="教室矩阵 · 教师课表 · 周总览">
      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }} bodyStyle={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {VIEW_TABS.map(tab => (
            <button key={tab.key} onClick={() => {
              setViewMode(tab.key)
              router.push(tab.key === 'room-matrix' ? '/schedule' : `/schedule?view=${tab.key}`)
            }} style={{
              padding: isMobile ? '6px 10px' : '6px 18px', border: viewMode === tab.key ? '1px solid #E8784A' : '1px solid transparent',
              borderRadius: 6, background: viewMode === tab.key ? 'rgba(232,120,74,.08)' : 'transparent',
              color: viewMode === tab.key ? '#E8784A' : 'var(--color-text-secondary, #666)',
              fontWeight: viewMode === tab.key ? 600 : 400, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
            }}>{tab.label}</button>
          ))}
          <button onClick={() => setScheduleFormOpen(true)} style={{
            marginLeft: isMobile ? 0 : 'auto', padding: '7px 18px', borderRadius: 6,
            background: '#E8784A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>+ 新建排课</button>
        </div>
      </Card>

      {viewMode === 'room-matrix' && (
        <RoomMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          onCellClick={handleRoomCellClick} onLessonClick={handleLessonClick}
          onNewCourseClick={() => setScheduleFormOpen(true)} />
      )}
      {viewMode === 'teacher-week' && (
        <TeacherWeekView onLessonClick={handleLessonClick} />
      )}
      {viewMode === 'week-heatmap' && (
        <WeekHeatmapView weekStart={weekStart} setWeekStart={setWeekStart} onCellClick={handleHeatmapCellClick} />
      )}

      <ScheduleDetailPanel
        selectedLesson={selectedLesson} editLesson={editLesson} setEditLesson={setEditLesson}
        savingLesson={savingLesson} onClose={() => setSelectedLesson(null)}
        onSave={saveLesson} onCancel={cancelLesson}
      />

      <ScheduleFormModal open={scheduleFormOpen} onClose={() => setScheduleFormOpen(false)}
        onSuccess={() => { /* trigger refresh */ }} />

      <OneOnOneModal open={oneOnOneOpen} onClose={() => setOneOnOneOpen(false)}
        defaultDate={oneOnOneDate} onSuccess={() => setOneOnOneOpen(false)} />
    </PageLayout>
  )
}
