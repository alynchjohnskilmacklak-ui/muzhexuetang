'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, Input, Modal, Spin, message } from 'antd'
import { format, startOfWeek } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ClassMatrixView } from './ClassMatrixView'
import { SchedulePeriod } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { useDivision } from '@/contexts/DivisionContext'
import { useSWRConfig } from 'swr'

const RoomMatrixView = dynamic(() => import('./RoomMatrixView').then((module) => module.RoomMatrixView))
const TeacherWeekView = dynamic(() => import('./TeacherWeekView').then((module) => module.TeacherWeekView))
const WeekHeatmapView = dynamic(() => import('./WeekHeatmapView').then((module) => module.WeekHeatmapView))
const MobileRoomView = dynamic(() => import('./MobileRoomView').then((module) => module.MobileRoomView))
const OneOnOneModal = dynamic(() => import('./OneOnOneModal').then((module) => module.OneOnOneModal))
const ScheduleDetailPanel = dynamic(() => import('./_components/ScheduleDetailPanel').then((module) => module.ScheduleDetailPanel))
const ScheduleFormModal = dynamic(() => import('./_components/ScheduleFormModal').then((module) => module.ScheduleFormModal))
const SchedulePeriodSettingsModal = dynamic(() => import('./_components/SchedulePeriodSettingsModal').then((module) => module.SchedulePeriodSettingsModal))
const CopyFridayToSaturdayModal = dynamic(() => import('./_components/CopyFridayToSaturdayModal').then((module) => module.CopyFridayToSaturdayModal))
const ManualLessonModal = dynamic(() => import('./_components/ManualLessonModal').then((module) => module.ManualLessonModal))

const VIEW_TABS = [
  { key: 'class-matrix', label: '班级课表' },
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
  const searchParamsHook = useSearchParams()
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const { mutate: mutateSWR } = useSWRConfig()
  const requestedView = searchParamsHook.get('view')
  const urlView = VIEW_TABS.some((tab) => tab.key === requestedView) ? requestedView! : 'class-matrix'

  const [viewMode, setViewMode] = useState(urlView)
  useEffect(() => setViewMode(urlView), [urlView])
  const switchView = (nextView: string) => {
    setViewMode(nextView)
    const params = new URLSearchParams(searchParamsHook.toString())
    if (nextView === 'class-matrix') params.delete('view')
    else params.set('view', nextView)
    const query = params.toString()
    window.history.pushState(null, '', query ? `/schedule?${query}` : '/schedule')
  }
  const [oneOnOneOpen, setOneOnOneOpen] = useState(false)
  const [oneOnOneDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedLesson, setSelectedLesson] = useState<Record<string, unknown> | null>(null)
  const [editLesson, setEditLesson] = useState<Record<string, string>>({})
  const [savingLesson, setSavingLesson] = useState(false)
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false)
  const [periodSettingsOpen, setPeriodSettingsOpen] = useState(false)
  const [copyFridayOpen, setCopyFridayOpen] = useState(false)
  const [manualLessonOpen, setManualLessonOpen] = useState(false)
  const [cancelLessonId, setCancelLessonId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const { periods, mutate: mutatePeriods } = useSchedulePeriods(division)

  const handleRoomCellClick = (_room: Record<string, unknown>, _period: SchedulePeriod) => {
    setManualLessonOpen(true)
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
    switchView('class-matrix')
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
      mutateSWR(key => typeof key === 'string' && (key.startsWith('/api/schedules/') || key.startsWith('/api/class-lessons/')))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingLesson(false)
    }
  }

  const cancelLesson = async (id: string) => {
    setCancelLessonId(id)
    setCancelReason('')
  }

  const confirmCancelLesson = async () => {
    if (cancelReason.trim().length < 2) {
      message.warning('请填写停课原因')
      return
    }
    setCancelling(true)
    try {
      const res = await fetch(`/api/class-lessons/${cancelLessonId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelReason: cancelReason.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '取消失败')
      message.success(payload.notifiedParents > 0
        ? `本次课已取消，已通知 ${payload.notifiedParents} 位家长`
        : '本次课已取消，课表已更新')
      setSelectedLesson(null)
      setCancelLessonId('')
      mutateSWR(key => typeof key === 'string' && (key.startsWith('/api/schedules/') || key.startsWith('/api/class-lessons/')))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <PageLayout title="排课系统" subtitle="班级课表 · 教室矩阵 · 教师课表 · 周总览">
      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }} styles={{ body: { padding: '8px 14px' } }}>
        <div className="mobile-scroll-x" style={{ display: 'flex', gap: 4, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : undefined }}>
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                switchView(tab.key)
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
          <button onClick={() => setManualLessonOpen(true)} style={{
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
            + 临时加课
          </button>
          <button onClick={() => setScheduleFormOpen(true)} style={{
            padding: '7px 14px', borderRadius: 6, background: 'var(--color-surface-1)', color: 'var(--color-text)',
            border: '1px solid var(--color-border)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
              新建课次
          </button>
          <button onClick={() => setCopyFridayOpen(true)} style={{
            padding: '7px 14px', borderRadius: 6, background: '#fff', color: '#1D9E75',
            border: '1px solid #1D9E75', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            周五复制到周六
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
        {viewMode === 'class-matrix' ? (
          <ClassMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate} onLessonClick={handleLessonClick} />
        ) : viewMode === 'room-matrix' && isMobile ? (
          <MobileRoomView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            onNewCourseClick={() => setManualLessonOpen(true)} onLessonClick={handleLessonClick} />
        ) : viewMode === 'room-matrix' ? (
          <div style={{ overflowX: 'auto' }}>
            <RoomMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              onCellClick={handleRoomCellClick} onLessonClick={handleLessonClick}
              onNewCourseClick={() => setManualLessonOpen(true)} />
          </div>
        ) : viewMode === 'teacher-week' ? (
          <TeacherWeekView onLessonClick={handleLessonClick} />
        ) : viewMode === 'week-heatmap' ? (
          <WeekHeatmapView weekStart={weekStart} setWeekStart={setWeekStart} onCellClick={handleHeatmapCellClick} />
        ) : null}
      </div>

      {selectedLesson && <ScheduleDetailPanel
        selectedLesson={selectedLesson}
        editLesson={editLesson}
        setEditLesson={setEditLesson}
        savingLesson={savingLesson}
        onClose={() => setSelectedLesson(null)}
        onSave={saveLesson}
        onCancel={cancelLesson}
      />}

      {scheduleFormOpen && <ScheduleFormModal open={scheduleFormOpen} onClose={() => setScheduleFormOpen(false)} onSuccess={() => mutateSWR(key => typeof key === 'string' && (key.startsWith('/api/schedules/') || key.startsWith('/api/class-lessons/')))} />}
      {manualLessonOpen && (
        <ManualLessonModal
          initialDate={format(selectedDate, 'yyyy-MM-dd')}
          onClose={() => setManualLessonOpen(false)}
          onSuccess={() => mutateSWR(key => typeof key === 'string' && (key.startsWith('/api/schedules/') || key.startsWith('/api/class-lessons/') || key.startsWith('/api/class-groups')))}
        />
      )}

      <Modal
        title="取消本次课"
        open={Boolean(cancelLessonId)}
        onCancel={() => setCancelLessonId('')}
        onOk={confirmCancelLesson}
        confirmLoading={cancelling}
        okText="确认取消"
        okButtonProps={{ danger: true }}
      >
        <p>仅能取消尚未开始、未产生考勤或结算的课次。取消后保留课次记录，并通知相关家长。</p>
        <Input.TextArea aria-label="停课原因" placeholder="请输入停课原因，例如：国庆假期调整" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={200} showCount rows={3} />
      </Modal>

      {oneOnOneOpen && <OneOnOneModal open={oneOnOneOpen} onClose={() => setOneOnOneOpen(false)}
        defaultDate={oneOnOneDate} onSuccess={() => setOneOnOneOpen(false)} />}
      {periodSettingsOpen && <SchedulePeriodSettingsModal
        open={periodSettingsOpen}
        periods={periods}
        onClose={() => setPeriodSettingsOpen(false)}
        onSaved={() => {
          mutatePeriods()
          mutateSWR(key => typeof key === 'string' && key.startsWith('/api/schedules/'))
        }}
      />}

      {copyFridayOpen && <CopyFridayToSaturdayModal
        open={copyFridayOpen}
        onClose={() => setCopyFridayOpen(false)}
        onSuccess={() => {
          mutateSWR(key => typeof key === 'string' && (key.startsWith('/api/schedules/') || key.startsWith('/api/class-lessons/')))
        }}
      />}
    </PageLayout>
  )
}
