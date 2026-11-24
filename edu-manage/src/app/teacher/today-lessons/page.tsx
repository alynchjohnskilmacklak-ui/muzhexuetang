'use client'

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import useSWR from 'swr'
import { CalendarOutlined, RightOutlined, UserOutlined } from '@ant-design/icons'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRouter } from 'next/navigation'
import { getTiltSurfacePosition, runDocumentViewTransition } from '@/lib/ui-motion'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'

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

function updateLessonTilt(event: ReactPointerEvent<HTMLSpanElement>, reset = false) {
  const surface = event.currentTarget
  if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (reset) {
    surface.style.setProperty('--teacher-lesson-rotate-x', '0deg')
    surface.style.setProperty('--teacher-lesson-rotate-y', '0deg')
    surface.style.setProperty('--teacher-lesson-light-x', '50%')
    surface.style.setProperty('--teacher-lesson-light-y', '50%')
    return
  }
  const rect = surface.getBoundingClientRect()
  const point = getTiltSurfacePosition(event.clientX, event.clientY, rect, 2.8)
  surface.style.setProperty('--teacher-lesson-rotate-x', `${point.rotateX}deg`)
  surface.style.setProperty('--teacher-lesson-rotate-y', `${point.rotateY}deg`)
  surface.style.setProperty('--teacher-lesson-light-x', `${point.lightX}%`)
  surface.style.setProperty('--teacher-lesson-light-y', `${point.lightY}%`)
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '未上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '已完成': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '已考勤': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '待考勤': { label: '待考勤', bg: '#F1F1F2', color: '#8B8B8B' },
}

export default function TeacherTodayLessonsPage() {
  const router = useRouter()
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)
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

  const toggleLessonPreview = (lessonId: string) => {
    const update = () => setExpandedLessonId(current => current === lessonId ? null : lessonId)
    if (!runDocumentViewTransition(update)) update()
  }

  if (isLoading) return <CardSkeleton rows={4} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <main className="teacher-lessons-page" aria-labelledby="teacher-today-lessons-title">
      <header className="teacher-lessons-page__header">
        <div>
          <span className="teacher-lessons-page__eyebrow">课程安排</span>
          <h1 id="teacher-today-lessons-title">{data.teacher.name}的今日课程</h1>
          <p>展开课程卡片查看安排，选择“进入上课详情”继续操作。</p>
        </div>
        <span className="teacher-lessons-page__count" role="status" aria-label={`今天共${lessons.length}节课`}>
          <AnimatedNumber value={lessons.length} className="teacher-lessons-page__count-value" /><span>节课</span>
        </span>
      </header>
      <section className="teacher-lessons-panel" aria-label="今日课程列表">
        {lessons.length === 0 ? (
          <div className="teacher-lessons-empty">
            <BrandEmpty title="今天没有课程安排" hint="可以打开完整课表，查看本周后续课程。" icon={<CalendarOutlined />} />
            <button type="button" className="teacher-lessons-schedule-link" onClick={() => router.push('/teacher/schedule')}>
              <CalendarOutlined />
              <span>查看本周课表</span>
              <RightOutlined aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="teacher-lessons-grid">
            {lessons.map((lesson, index) => {
              const meta = STATUS_META[lesson.statusLabel] || STATUS_META['待考勤']
              const isExpanded = expandedLessonId === lesson.id
              const lessonRoute = `/teacher/lesson/${lesson.lessonId || lesson.id}`
              return (
                <article
                  key={lesson.id}
                  className={`teacher-lesson-card stagger-item${isExpanded ? ' teacher-lesson-card--expanded' : ''}`}
                  style={{ animationDelay: `${Math.min(index, 8) * 42}ms`, viewTransitionName: `teacher-lesson-${index}` }}
                >
                  <button
                    type="button"
                    className="teacher-lesson-card__trigger"
                    aria-expanded={isExpanded}
                    aria-controls={`teacher-lesson-preview-${lesson.id}`}
                    aria-label={`${lesson.time}，${lesson.courseName}，${lesson.groupName}，${meta.label}，${isExpanded ? '收起' : '展开'}课程预览`}
                    onClick={() => toggleLessonPreview(lesson.id)}
                  >
                    <span
                      className="teacher-lesson-card__surface"
                      onPointerMove={(event) => updateLessonTilt(event)}
                      onPointerLeave={(event) => updateLessonTilt(event, true)}
                      onPointerCancel={(event) => updateLessonTilt(event, true)}
                    >
                      <span className="teacher-lesson-card__timeline" style={{ background: meta.color }} aria-hidden="true" />
                      <span className="teacher-lesson-card__main">
                        <span className="teacher-lesson-card__topline">
                          <span className="teacher-lesson-card__time">{lesson.time}</span>
                          <span className="teacher-lesson-card__status" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                        </span>
                        <strong className="teacher-lesson-card__title">
                          {lesson.courseName.replace('牧哲学堂', '')} · {lesson.groupName.replace('牧哲学堂', '')}
                        </strong>
                        <span className="teacher-lesson-card__meta">
                          <span>{lesson.room}</span>
                          <span aria-hidden="true">·</span>
                          <span><UserOutlined aria-hidden="true" /> {lesson.studentCount}人</span>
                          <span aria-hidden="true">·</span>
                          <span>{lesson.hasFeedback ? '已发反馈' : '未发反馈'}</span>
                        </span>
                      </span>
                      <RightOutlined className={`teacher-lesson-card__arrow${isExpanded ? ' teacher-lesson-card__arrow--expanded' : ''}`} aria-hidden="true" />
                    </span>
                  </button>
                  <div
                    id={`teacher-lesson-preview-${lesson.id}`}
                    className="teacher-lesson-card__details"
                    data-open={isExpanded}
                    aria-hidden={!isExpanded}
                  >
                    <div className="teacher-lesson-card__details-inner">
                      {isExpanded && (
                        <>
                          <div className="teacher-lesson-card__detail"><small>上课时间</small><strong>{lesson.time}</strong></div>
                          <div className="teacher-lesson-card__detail"><small>上课地点</small><strong>{lesson.room}</strong></div>
                          <div className="teacher-lesson-card__detail"><small>课堂反馈</small><strong>{lesson.hasFeedback ? '已发反馈' : '未发反馈'}</strong></div>
                          <button type="button" className="teacher-lesson-card__detail-action" onClick={() => router.push(lessonRoute)}>
                            进入上课详情 <RightOutlined aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {lessons.length > 0 && (
        <button type="button" className="teacher-lessons-schedule-link teacher-lessons-schedule-link--footer" onClick={() => router.push('/teacher/schedule')}>
          <CalendarOutlined />
          <span>查看本周完整课表</span>
          <RightOutlined aria-hidden="true" />
        </button>
      )}
    </main>
    </PullToRefresh>
  )
}
