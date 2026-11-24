'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Button } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftOutlined, BulbOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { StudentMembershipBadge } from '@/components/Common/StudentMembershipBadge'
import { getTeacherAttendanceHref, getTeacherInteractionHref } from '@/lib/teacher-lesson-navigation'

type Tone = 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'brown' | 'dark'

interface DashboardLessonStudent {
  id: string
  name: string
  gender?: string | null
  photoUrl?: string | null
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
  nextLessons?: DashboardLesson[]
  nextLessonDate?: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '未上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '已完成': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '已考勤': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '待考勤': { label: '待考勤', bg: '#F1F1F2', color: '#8B8B8B' },
}

function formatLessonDate(dateKey?: string | null) {
  if (!dateKey) return new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}月${day}日 · 周${weekday}`
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

  const isUpcomingLesson = Boolean(
    data?.todayLessons?.length === 0 && data?.nextLessons?.some((lesson) => (lesson.lessonId || lesson.id) === lessonId),
  )
  const lesson = useMemo(() => {
    if (!data) return null
    return [...(data.todayLessons || []), ...(data.nextLessons || [])]
      .find((item) => (item.lessonId || item.id) === lessonId) || null
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
      <button type="button" className="lesson-detail__back mobile-shell-back" onClick={() => router.back()}>
        <ArrowLeftOutlined /> 返回
      </button>

      {/* 单课 hero：参照家长端课程详情页 */}
      <div className="lesson-detail__hero">
        <div className="lesson-detail__hero-top">
          <span className="lesson-detail__hero-tag">{isUpcomingLesson ? '下次课程' : '今日课程'}</span>
          <span className="lesson-detail__hero-date"><CalendarOutlined /> {isUpcomingLesson ? formatLessonDate(data.nextLessonDate) : formatLessonDate()}</span>
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
                <StudentAvatar photoUrl={student.photoUrl} gender={student.gender} name={student.name} size={30} className="teacher-today-student-chip__avatar" />
                <span className="teacher-today-student-chip__body">
                  <span className="teacher-today-student-chip__name">
                    <span className="teacher-today-student-chip__name-text" title={student.name}>{student.name}</span>
                    <StudentMembershipBadge level={student.membershipLevel} className="teacher-today-student-chip__membership" />
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            block
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={() => router.push(getTeacherAttendanceHref(lesson.id))}
          >
            录入考勤
          </Button>
          <Button
            block
            size="large"
            icon={<BulbOutlined />}
            onClick={() => router.push(getTeacherInteractionHref(lesson.lessonId || lesson.id))}
          >
            课堂互动
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
