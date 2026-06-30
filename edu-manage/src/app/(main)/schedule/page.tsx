'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Spin, message } from 'antd'
import { format, startOfWeek } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import { RoomMatrixView } from './RoomMatrixView'
import { TeacherWeekView } from './TeacherWeekView'
import { WeekHeatmapView } from './WeekHeatmapView'
import { MobileRoomView } from './MobileRoomView'
import { OneOnOneModal } from './OneOnOneModal'
import { ScheduleDetailPanel } from './_components/ScheduleDetailPanel'
import { ScheduleFormModal } from './_components/ScheduleFormModal'
import { SchedulePeriodSettingsModal } from './_components/SchedulePeriodSettingsModal'
import { SchedulePeriod } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { useDivision } from '@/contexts/DivisionContext'
import { useSWRConfig } from 'swr'

const VIEW_TABS = [
  { key: 'room-matrix', label: '教室矩阵' },
  { key: 'teacher-week', label: '教师课表' },
  { key: 'week-heatmap', label: '周总览' },
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
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const { mutate: mutateSWR } = useSWRConfig()
  const requestedView = searchParamsHook.get('view')
  const urlView = requestedView || (isMobile ? 'teacher-week' : 'room-matrix')

  const [viewMode, setViewMode] = useState(urlView)
  const [oneOnOneOpen, setOneOnOneOpen] = useState(false)
  const [oneOnOneDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedLesson, setSelectedLesson] = useState<Record<string, unknown> | null>(null)
  const [editLesson, setEditLesson] = useState<Record<string, string>>({})
  const [savingLesson, setSavingLesson] = useState(false)
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false)
  const [periodSettingsOpen, setPeriodSettingsOpen] = useState(false)
  const { periods, mutate: mutatePeriods } = useSchedulePeriods(division)

  const handleRoomCellClick = (_room: Record<string, unknown>, _period: SchedulePeriod) => {
    setScheduleFormOpen(true)
  }

  const handleLessonClick = (lesson: Record<string, unknown>) => {
    setSelectedLesson(lesson)
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
    } finally {
      setSavingLesson(false)
    }
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
      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }} styles={{ body: { padding: '8px 14px' } }}>
        <div className="mobile-scroll-x" style={{ display: 'flex', gap: 4, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : undefined }}>
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setViewMode(tab.key)
                router.push(tab.key === 'room-matrix' ? '/schedule' : `/schedule?view=${tab.key}`)
              }}
              style={{
                padding: isMobile ? '6px 10px' : '6px 18px',
                border: viewMode === tab.key ? '1px solid #E8784A' : '1px solid transparent',
                borderRadius: 6,
                background: viewMode === tab.key ? 'rgba(232,120,74,.08)' : 'transparent',
                color: viewMode === tab.key ? '#E8784A' : 'var(--color-text-secondary, #666)',
                fontWeight: viewMode === tab.key ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all .15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
          <button onClick={() => setScheduleFormOpen(true)} style={{
            marginLeft: isMobile ? 0 : 'auto',
            padding: '7px 18px',
            borderRadius: 6,
            background: '#E8784A',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            + 新建排课
          </button>
          <button onClick={() => setPeriodSettingsOpen(true)} style={{
            padding: '7px 14px', borderRadius: 6, background: '#fff', color: '#5a4e3a',
            border: '1px solid #EEE7E1', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            时间段设置
          </button>
        </div>
      </Card>

      <div style={{ maxWidth: '100%' }}>
        {viewMode === 'room-matrix' && isMobile ? (
          <MobileRoomView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            onNewCourseClick={() => setScheduleFormOpen(true)} onLessonClick={handleLessonClick} />
        ) : viewMode === 'room-matrix' ? (
          <div style={{ overflowX: 'auto' }}>
            <RoomMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              onCellClick={handleRoomCellClick} onLessonClick={handleLessonClick}
              onNewCourseClick={() => setScheduleFormOpen(true)} />
          </div>
        ) : viewMode === 'teacher-week' ? (
          <TeacherWeekView onLessonClick={handleLessonClick} />
        ) : (
          <WeekHeatmapView weekStart={weekStart} setWeekStart={setWeekStart} onCellClick={handleHeatmapCellClick} />
        )}
      </div>

      <ScheduleDetailPanel
        selectedLesson={selectedLesson}
        editLesson={editLesson}
        setEditLesson={setEditLesson}
        savingLesson={savingLesson}
        onClose={() => setSelectedLesson(null)}
        onSave={saveLesson}
        onCancel={cancelLesson}
      />

      <ScheduleFormModal open={scheduleFormOpen} onClose={() => setScheduleFormOpen(false)} onSuccess={() => {}} />

      <OneOnOneModal open={oneOnOneOpen} onClose={() => setOneOnOneOpen(false)}
        defaultDate={oneOnOneDate} onSuccess={() => setOneOnOneOpen(false)} />
      <SchedulePeriodSettingsModal
        open={periodSettingsOpen}
        periods={periods}
        onClose={() => setPeriodSettingsOpen(false)}
        onSaved={() => {
          mutatePeriods()
          mutateSWR(key => typeof key === 'string' && key.startsWith('/api/schedules/'))
        }}
      />
    </PageLayout>
  )
}
