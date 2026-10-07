'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { CalendarOutlined, UserOutlined } from '@ant-design/icons'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRouter } from 'next/navigation'

type Tone = 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'brown' | 'dark'

interface DashboardLesson {
  id: string
  time: string
  startTime?: string
  endTime?: string
  courseName: string
  groupName: string
  room: string
  studentCount: number
  statusLabel: string
  statusTone: Tone
  hasFeedback: boolean
  lessonId?: string
}

interface DashboardData {
  teacher: { id: string; name: string }
  todayLessons: DashboardLesson[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '未上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '已完成': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '已考勤': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '待考勤': { label: '待考勤', bg: '#F1F1F2', color: '#8B8B8B' },
}

export default function TeacherTodayLessonsPage() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, {
    refreshInterval: 120_000,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  const lessons = useMemo(() => {
    const list = [...(data?.todayLessons || [])]
    list.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time))
    return list
  }, [data])

  if (isLoading) return <CardSkeleton rows={4} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section className="parent-dashboard-section" aria-labelledby="teacher-today-lessons-title">
        <div className="parent-dashboard-section__head">
          <h2 id="teacher-today-lessons-title">{data.teacher.name}的今日课程</h2>
          <span className="parent-today-schedule-hint">点击课程卡片查看上课详情</span>
        </div>
        {lessons.length === 0 ? (
          <div className="parent-today-schedule-empty">今天没有课程安排</div>
        ) : (
          <div className="parent-today-schedule-grid">
            {lessons.map(lesson => {
              const meta = STATUS_META[lesson.statusLabel] || STATUS_META['待考勤']
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className="parent-today-schedule-item"
                  onClick={() => router.push(`/teacher/lesson/${lesson.lessonId || lesson.id}`)}
                >
                  <span className="parent-today-schedule-item__bar" style={{ background: meta.color }} />
                  <div className="parent-today-schedule-item__head">
                    <span className="parent-today-schedule-item__time">{lesson.time}</span>
                    <span className="parent-today-schedule-item__status" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                  </div>
                  <strong className="parent-today-schedule-item__title">{lesson.courseName.replace('牧哲学堂', '')} · {lesson.groupName.replace('牧哲学堂', '')}</strong>
                  <small className="parent-today-schedule-item__meta">{lesson.room} · {lesson.studentCount}人 · {lesson.hasFeedback ? '已发反馈' : '未发反馈'}</small>
                </button>
              )
            })}
          </div>
        )}
      </section>
      <div style={{ padding: '4px 0 8px', textAlign: 'center' }}>
        <button
          type="button"
          className="parent-quick-action"
          style={{ width: 'auto', padding: '8px 18px', borderRadius: 999, display: 'inline-flex' }}
          onClick={() => router.push('/teacher/teaching-schedule')}
        >
          <span><CalendarOutlined /></span>
          <small>查看本周完整课表</small>
        </button>
      </div>
    </div>
    </PullToRefresh>
  )
}
