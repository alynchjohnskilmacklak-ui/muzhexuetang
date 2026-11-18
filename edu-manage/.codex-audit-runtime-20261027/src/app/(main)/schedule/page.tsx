'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, Input, Spin, message } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { format, startOfWeek } from 'date-fns'
import useSWR from 'swr'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ClassMatrixView } from './ClassMatrixView'
import { SchedulePeriod } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { useDivision } from '@/contexts/DivisionContext'
import { useSWRConfig } from 'swr'
import {
  ApartmentOutlined, AppstoreOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, CrownOutlined, EnvironmentOutlined, HeatMapOutlined, PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { OneOnOneView } from './OneOnOneView'

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
  { key: 'class-matrix', label: '班级课表', icon: <AppstoreOutlined /> },
  { key: 'room-matrix', label: '教室矩阵', icon: <EnvironmentOutlined /> },
  { key: 'teacher-week', label: '教师课表', icon: <TeamOutlined /> },
  { key: 'one-on-one', label: 'VIP课程', icon: <CrownOutlined /> },
  { key: 'week-heatmap', label: '周总览', icon: <HeatMapOutlined /> },
]

const fetchJson = async (url: string) => {
  const res = await fetch(url)
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || '加载失败')
  return payload
}

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

  const { data: overviewData } = useSWR(
    `/api/schedules/overview?division=${encodeURIComponent(division)}`,
    fetchJson,
    { refreshInterval: 60_000 },
  )
  const overview = (overviewData as { data?: Record<string, number> } | undefined)?.data

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
    <PageLayout title="排课系统" subtitle="今日课次 · 教室矩阵 · 教师课表 · VIP课程 · 周总览">
      {/* 综合概览大卡 */}
      <div style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg,#123C35 0%,#0E5E4E 60%,#0B4B40 100%)',
        boxShadow: '0 8px 24px rgba(14,94,78,.18)',
        padding: isMobile ? '14px' : '18px 22px',
        marginBottom: 12,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 10 : 24, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(242,227,182,.8)', fontSize: isMobile ? 11.5 : 13, fontWeight: 600, letterSpacing: 1 }}>
              <CalendarOutlined /> 本周排课总览
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{ color: '#F7F3E8', fontSize: isMobile ? 34 : 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{overview?.weekTotal ?? 0}</span>
              <span style={{ color: 'rgba(242,227,182,.7)', fontSize: isMobile ? 12 : 14, fontWeight: 600 }}>节课次</span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: isMobile ? 10 : 18, flexWrap: 'wrap', color: 'rgba(247,243,232,.72)', fontSize: isMobile ? 10.5 : 12 }}>
              <span><CalendarOutlined style={{ marginRight: 3 }} />今日 {overview?.todayTotal ?? 0} 节</span>
              <span><CloseCircleOutlined style={{ marginRight: 3 }} />今日取消 {overview?.todayCancelled ?? 0}</span>
              <span><CloseCircleOutlined style={{ marginRight: 3 }} />本周取消 {overview?.weekCancelled ?? 0}</span>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, minmax(0,1fr))' : 'repeat(3, minmax(0,120px))',
            gap: isMobile ? 8 : 14,
            borderLeft: isMobile ? 'none' : '1px solid rgba(242,227,182,.22)',
            borderTop: isMobile ? '1px solid rgba(242,227,182,.22)' : 'none',
            paddingLeft: isMobile ? 0 : 24,
            paddingTop: isMobile ? 10 : 0,
            width: isMobile ? '100%' : 'auto',
          }}>
            {[
              { label: '活跃教室', value: overview?.activeRooms ?? 0, icon: <EnvironmentOutlined /> },
              { label: '上课教师', value: overview?.weekTeachers ?? 0, icon: <TeamOutlined /> },
              { label: '运行班级', value: overview?.runningGroups ?? 0, icon: <ApartmentOutlined /> },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: 4, minWidth: 0 }}>
                <span style={{ color: 'rgba(242,227,182,.75)', fontSize: isMobile ? 11 : 12 }}>{item.icon} {item.label}</span>
                <span style={{ color: '#F7F3E8', fontSize: isMobile ? 20 : 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card bordered={false} style={{ marginBottom: 12, borderRadius: 14, background: '#ffffff', border: '1px solid #EDE9E1', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }} styles={{ body: { padding: '10px 14px' } }}>
        <div className="mobile-scroll-x" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : undefined }}>
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                switchView(tab.key)
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '7px 12px' : '8px 18px',
                border: viewMode === tab.key ? '1px solid rgba(14,94,78,.45)' : '1px solid #EEE7E1',
                borderRadius: 999,
                background: viewMode === tab.key ? 'linear-gradient(135deg,#123C35,#0E5E4E)' : '#FAF8F4',
                color: viewMode === tab.key ? '#F2E3B6' : '#5A6472',
                fontWeight: viewMode === tab.key ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all .18s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: viewMode === tab.key ? '0 3px 10px rgba(14,94,78,.25)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button onClick={() => setManualLessonOpen(true)} style={{
            marginLeft: isMobile ? 0 : 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            borderRadius: 999,
            background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)',
            color: '#F7F3E8',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(14,94,78,.25)',
          }}>
            <PlusOutlined /> 临时加课
          </button>
          <button onClick={() => setScheduleFormOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 999, background: '#fff', color: '#0E5E4E',
            border: '1px solid rgba(14,94,78,.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <PlusOutlined /> 新建课次
          </button>
          <button onClick={() => setCopyFridayOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 999, background: '#fff', color: '#1D9E75',
            border: '1px solid #1D9E75', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <CheckCircleOutlined /> 周五复制到周六
          </button>
          <button onClick={() => setPeriodSettingsOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 999, background: '#fff', color: '#8A6B2F',
            border: '1px solid rgba(201,164,92,.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <ClockCircleOutlined /> 时间段设置
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
        ) : viewMode === 'one-on-one' ? (
          <OneOnOneView selectedDate={selectedDate} setSelectedDate={setSelectedDate} onLessonClick={handleLessonClick} />
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

      <BrandModal
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
      </BrandModal>

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
