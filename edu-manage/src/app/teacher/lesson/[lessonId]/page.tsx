'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Button, Space, Typography } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { resolveMembership, MEMBERSHIP_THEME } from '@/constants/membership'

const { Text } = Typography

type Tone = 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'brown' | 'dark'

interface DashboardLessonStudent {
  id: string
  name: string
  grade?: string | null
  school?: string | null
  membershipLevel?: string | null
}

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
  attendanceSubmittedAt?: string | null
  lessonId?: string
  feedbackId?: string | null
  students?: DashboardLessonStudent[]
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

function MembershipBadge({ level }: { level?: string | null }) {
  const membership = resolveMembership(level)
  const theme = MEMBERSHIP_THEME[membership]
  if (!theme.badge) {
    return <span style={{ fontSize: 11, color: '#8D806F' }}>普通</span>
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 6px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: '18px',
        color: theme.text,
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {theme.badge}
    </span>
  )
}

export default function TeacherLessonDetailPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const lessonId = params?.lessonId || ''
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, {
    refreshInterval: 60_000,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  const lesson = useMemo(() => {
    if (!data?.todayLessons) return null
    return data.todayLessons.find((l) => (l.lessonId || l.id) === lessonId) || null
  }, [data, lessonId])

  if (isLoading) return <CardSkeleton rows={5} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  if (!lesson) {
    return (
      <BrandEmpty
        title="未找到这节课"
        hint="课程可能不在今日安排中，可返回查看完整课表"
        icon={<CalendarOutlined />}
        actionText="返回今日课程"
        onAction={() => router.push('/teacher/today-lessons')}
      />
    )
  }

  const meta = STATUS_META[lesson.statusLabel] || STATUS_META['待考勤']
  const students = lesson.students || []
  const grade = lesson.groupName.match(/(初一|初二|初三|高一|高二|高三)/)?.[1] || ''

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button type="button" className="lesson-detail__back" onClick={() => router.back()}>
        <ArrowLeftOutlined /> 返回
      </button>

      {/* 单课 hero：参照家长端课程详情页 */}
      <div className="lesson-detail__hero">
        <div className="lesson-detail__hero-top">
          <span className="lesson-detail__hero-tag">今日课程</span>
          <span className="lesson-detail__hero-date"><CalendarOutlined /> {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
        <div className="lesson-detail__hero-title">{lesson.courseName.replace('牧哲学堂', '')} · {lesson.groupName.replace('牧哲学堂', '')}</div>
        <div className="lesson-detail__hero-tags">
          {grade && <span className="lesson-detail__hero-tag2"><TeamOutlined /> {grade}</span>}
          <span className="lesson-detail__hero-tag2"><ClockCircleOutlined /> {lesson.time}</span>
          <span className="lesson-detail__hero-tag2"><EnvironmentOutlined /> {lesson.room}</span>
          <span className="lesson-detail__hero-tag2"><TeamOutlined /> {lesson.studentCount}人</span>
        </div>
        <div className="lesson-detail__hero-teacher">
          <span className="lesson-detail__hero-dot" style={{ background: meta.color }} />
          {meta.label}{lesson.hasFeedback ? ' · 已发反馈' : ' · 未发反馈'}
        </div>
      </div>

      {/* 学生名单 */}
      <section className="lesson-detail-card">
        <div className="lesson-detail-card__title">本班学员名单</div>
        <div className="teacher-today-lesson-card__students-title" style={{ marginTop: -6, marginBottom: 10 }}>
          点击学员进入对应反馈页
        </div>
        {students.length ? (
          <div className="teacher-today-lesson-card__students-grid">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                className="teacher-today-student-chip"
                onClick={() => router.push(`/teacher/feedback?lessonId=${lesson.lessonId || lesson.id}&studentId=${student.id}`)}
              >
                <span className="teacher-today-student-chip__avatar">{student.name.slice(0, 1)}</span>
                <span className="teacher-today-student-chip__body">
                  <span className="teacher-today-student-chip__name">
                    {student.name}
                    <MembershipBadge level={student.membershipLevel} />
                  </span>
                  <span className="teacher-today-student-chip__meta">
                    {[student.grade, student.school].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="parent-today-schedule-empty">暂无学员名单</div>
        )}
      </section>

      {/* 操作 */}
      <section className="lesson-detail-card">
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            block
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={() => router.push(`/teacher/attendance?lessonId=${lesson.id}`)}
          >
            录入考勤
          </Button>
          <Button
            block
            size="large"
            type={lesson.hasFeedback ? 'default' : 'primary'}
            icon={<CalendarOutlined />}
            onClick={() => router.push(lesson.hasFeedback && lesson.feedbackId
              ? `/teacher/feedback?viewId=${lesson.feedbackId}`
              : `/teacher/feedback?lessonId=${lesson.lessonId || lesson.id}`)}
          >
            {lesson.hasFeedback ? '查看反馈' : '发布课堂反馈'}
          </Button>
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            className="parent-quick-action"
            style={{ width: 'auto', padding: '7px 16px', borderRadius: 999, display: 'inline-flex' }}
            onClick={() => router.push('/teacher/today-lessons')}
          >
            <span><CalendarOutlined /></span>
            <small>查看今日全部课程</small>
          </button>
        </div>
      </section>
    </div>
    </PullToRefresh>
  )
}
