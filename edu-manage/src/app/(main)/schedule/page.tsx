'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button, Card, Input, Spin, message } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import { format, startOfWeek } from 'date-fns'
import useSWR from 'swr'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ClassMatrixView } from './ClassMatrixView'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { useSWRConfig } from 'swr'
import {
  ApartmentOutlined, AppstoreOutlined, CalendarOutlined, CloseCircleOutlined,
  CrownOutlined, EnvironmentOutlined, HeatMapOutlined, PlusOutlined, TeamOutlined,
} from '@ant-design/icons'
import { OneOnOneView } from './OneOnOneView'

const RoomMatrixView = dynamic(() => import('./RoomMatrixView').then((module) => module.RoomMatrixView))
const TeacherWeekView = dynamic(() => import('./TeacherWeekView').then((module) => module.TeacherWeekView))
const WeekHeatmapView = dynamic(() => import('./WeekHeatmapView').then((module) => module.WeekHeatmapView))
const MobileRoomView = dynamic(() => import('./MobileRoomView').then((module) => module.MobileRoomView))
const OneOnOneModal = dynamic(() => import('./OneOnOneModal').then((module) => module.OneOnOneModal))
const ScheduleDetailPanel = dynamic(() => import('./_components/ScheduleDetailPanel').then((module) => module.ScheduleDetailPanel))

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
  const router = useRouter()
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
  const [cancelLessonId, setCancelLessonId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const { data: overviewData } = useSWR(
    `/api/schedules/overview?division=${encodeURIComponent(division)}`,
    fetchJson,
    { refreshInterval: 60_000 },
  )
  const overview = (overviewData as { data?: Record<string, number> } | undefined)?.data

  const handleRoomCellClick = (_room: Record<string, unknown>, _period: unknown) => {
    router.push(`/schedule/workbench?action=extra&date=${encodeURIComponent(format(selectedDate, 'yyyy-MM-dd'))}`)
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
    <PageLayout
      title="排课系统"
      subtitle="今日课次 · 教室矩阵 · 教师课表 · VIP课程 · 周总览"
    >
      {/* 统一排课调度控制台 (Unified Scheduling Console - 统一排列放在页面内) */}
      <div style={{
        background: '#FAF6EE',
        borderRadius: 16,
        border: '1.5px solid rgba(214, 180, 91, 0.38)',
        boxShadow: '0 3px 12px rgba(58, 50, 39, 0.05)',
        padding: isMobile ? '12px 10px 10px' : '14px 18px',
        marginBottom: 10,
      }}>
        {/* 控制台顶栏：标题与当前状态指示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 9,
          paddingLeft: 2,
          paddingRight: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3.5, height: 13, borderRadius: 2, background: 'linear-gradient(180deg, #D6B45B 0%, #14574D 100%)' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#14574D', letterSpacing: 0.3 }}>
              排课视图模式
            </span>
            <span style={{ fontSize: 11, color: '#8C7E6A' }}>
              (点击即切换对应课表)
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: '#14574D', fontWeight: 700 }}>
            当前：{VIEW_TABS.find(t => t.key === viewMode)?.label}
          </span>
        </div>

        {/* 5 大课表视图切换：移动端 3+2 对齐统一网格，桌面端 5 列平铺 */}
        <div
          role="tablist"
          aria-label="排课视图导航"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)',
            gap: isMobile ? 6 : 8,
          }}
        >
          {VIEW_TABS.map((tab, idx) => {
            const isActive = viewMode === tab.key
            const colSpan = isMobile ? (idx < 3 ? 'span 2' : 'span 3') : 'span 1'
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => switchView(tab.key)}
                style={{
                  gridColumn: colSpan,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: isMobile ? '10px 6px' : '10px 14px',
                  borderRadius: 10,
                  border: isActive ? '1.5px solid #D6B45B' : '1px solid rgba(58, 50, 39, 0.12)',
                  cursor: 'pointer',
                  fontSize: isMobile ? 13 : 13.5,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#FFFFFF' : '#3A3020',
                  backgroundColor: isActive ? '#14574D' : '#FFFFFF',
                  boxShadow: isActive ? '0 3px 10px rgba(20, 87, 77, 0.28)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.16s ease',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: 14.5, color: isActive ? '#D6B45B' : '#756A58' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* 核心排课功能快捷通道 (双通道并排，高对比突出) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: isMobile ? 6 : 10,
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(214, 180, 91, 0.3)',
        }}>
          <button
            type="button"
            onClick={() => router.push('/schedule/workbench')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: isMobile ? '8px 8px' : '9px 14px',
              borderRadius: 9,
              border: '1px solid rgba(20, 87, 77, 0.25)',
              background: '#FFFFFF',
              color: '#14574D',
              fontSize: isMobile ? 12 : 12.5,
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(20, 87, 77, 0.05)',
            }}
          >
            <CalendarOutlined />
            <span>进入排课工作台 ›</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/schedule/intensive')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: isMobile ? '8px 8px' : '9px 14px',
              borderRadius: 9,
              border: '1px solid rgba(214, 180, 91, 0.4)',
              background: '#FFFDF7',
              color: '#8C6B1B',
              fontSize: isMobile ? 12 : 12.5,
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(214, 180, 91, 0.08)',
            }}
          >
            <CrownOutlined />
            <span>个性化集训排课 ›</span>
          </button>
        </div>
      </div>

      {/* 2. 紧凑型排课总览小盘 (Compact Overview Strip) */}
      <div style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, #14574D 0%, #0D3E36 100%)',
        boxShadow: '0 4px 14px rgba(20, 87, 77, 0.12)',
        padding: isMobile ? '10px 12px' : '12px 18px',
        marginBottom: 12,
        color: '#FAF6EE',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          {/* 左侧：本周课次核心指标 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 11.5, color: 'rgba(214, 180, 91, 0.9)', fontWeight: 600 }}>本周排课</span>
              <span style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                {overview?.weekTotal ?? 0}
              </span>
              <span style={{ fontSize: 11.5, color: '#FAF6EE', opacity: 0.8 }}>节</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(214, 180, 91, 0.3)' }} />
            <div style={{ fontSize: 11.5, color: '#FAF6EE', opacity: 0.85, display: 'flex', gap: 8 }}>
              <span>今日 {overview?.todayTotal ?? 0} 节</span>
              {(overview?.todayCancelled ?? 0) > 0 && (
                <span style={{ color: '#FF7875' }}>今日取消 {overview?.todayCancelled}</span>
              )}
            </div>
          </div>

          {/* 右侧：活跃教室/教师/班级紧凑展示 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 16,
            fontSize: 12,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(250, 246, 238, 0.9)' }}>
              <EnvironmentOutlined style={{ color: '#D6B45B' }} />
              <span>教室 <strong style={{ color: '#FFFFFF', fontSize: 13.5 }}>{overview?.activeRooms ?? 0}</strong></span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(250, 246, 238, 0.9)' }}>
              <TeamOutlined style={{ color: '#D6B45B' }} />
              <span>教师 <strong style={{ color: '#FFFFFF', fontSize: 13.5 }}>{overview?.weekTeachers ?? 0}</strong></span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(250, 246, 238, 0.9)' }}>
              <ApartmentOutlined style={{ color: '#D6B45B' }} />
              <span>班级 <strong style={{ color: '#FFFFFF', fontSize: 13.5 }}>{overview?.runningGroups ?? 0}</strong></span>
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '100%' }}>
        {viewMode === 'class-matrix' ? (
          <ClassMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate} onLessonClick={handleLessonClick} />
        ) : viewMode === 'room-matrix' && isMobile ? (
          <MobileRoomView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            onNewCourseClick={() => router.push(`/schedule/workbench?action=extra&date=${encodeURIComponent(format(selectedDate, 'yyyy-MM-dd'))}`)} onLessonClick={handleLessonClick} />
        ) : viewMode === 'room-matrix' ? (
          <div style={{ overflowX: 'auto' }}>
            <RoomMatrixView selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              onCellClick={handleRoomCellClick} onLessonClick={handleLessonClick}
              onNewCourseClick={() => router.push(`/schedule/workbench?action=extra&date=${encodeURIComponent(format(selectedDate, 'yyyy-MM-dd'))}`)} />
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
    </PageLayout>
  )
}
