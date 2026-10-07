'use client'

import {
  AppstoreOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  HistoryOutlined,
  RiseOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

type TodayLesson = {
  id: string
  title: string
  startTime: string
  endTime: string
  teacherName?: string | null
  roomName?: string | null
  startTimeRaw?: string | null
  endTimeRaw?: string | null
  attendanceSubmittedAt?: string | null
}

function lessonStatus(lesson: TodayLesson) {
  if (lesson.attendanceSubmittedAt) return '已结束'
  if (!lesson.startTimeRaw || !lesson.endTimeRaw) return '待老师确认'
  const now = Date.now()
  const start = new Date(lesson.startTimeRaw).getTime()
  const end = new Date(lesson.endTimeRaw).getTime()
  if (now < start) return '待上课'
  if (now <= end) return '上课中'
  return '已结束'
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '未上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '已结束': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '待老师确认': { label: '待确认', bg: '#FFEFE3', color: '#C05B22' },
}

const QUICK_ACTIONS: Array<{ label: string; icon: ReactNode; href: string }> = [
  { label: '课堂反馈', icon: <BookOutlined />, href: '/parent/class-feedback' },
  { label: '高中学校库', icon: <BankOutlined />, href: '/parent/volunteer/schools' },
  { label: '我的课表', icon: <CalendarOutlined />, href: '/parent/schedule' },
  { label: '教师信息', icon: <TeamOutlined />, href: '/parent/teachers' },
  { label: '消息通知', icon: <BellOutlined />, href: '/parent/notifications' },
  { label: '成长记录', icon: <HistoryOutlined />, href: '/parent/archive?tab=timeline' },
  { label: '学习分析', icon: <RiseOutlined />, href: '/parent/archive?tab=grades' },
  { label: '业务总览', icon: <AppstoreOutlined />, href: '/parent/services' },
]

function withStudent(href: string, studentId?: string | null) {
  if (!studentId) return href
  return href.includes('?') ? `${href}&studentId=${encodeURIComponent(studentId)}` : `${href}?studentId=${encodeURIComponent(studentId)}`
}

export function ParentTodayPanel({
  lessons,
  activeChildId,
  studentName,
}: {
  lessons: TodayLesson[]
  activeChildId?: string | null
  studentName: string
}) {
  const router = useRouter()

  return (
    <>
      <section className="parent-quick-actions" aria-label="常用功能">
        <div className="parent-quick-actions__grid">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              type="button"
              className="parent-quick-action"
              onClick={() => router.push(withStudent(action.href, activeChildId))}
            >
              <span>{action.icon}</span>
              <small>{action.label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="parent-dashboard-section" aria-labelledby="parent-today-schedule-title">
        <div className="parent-dashboard-section__head">
          <h2 id="parent-today-schedule-title">{studentName}的今日课程</h2>
          <span className="parent-today-schedule-hint">点击课程卡片查看上课详情</span>
        </div>
        {lessons.length === 0 ? (
          <div className="parent-today-schedule-empty">今天没有课程安排</div>
        ) : (
          <div className="parent-today-schedule-grid">
            {lessons.map(lesson => {
              const status = lessonStatus(lesson)
              const meta = STATUS_META[status] || STATUS_META['待老师确认']
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className="parent-today-schedule-item"
                  onClick={() => router.push(`/parent/lesson-detail?teacher=${encodeURIComponent(lesson.teacherName || '')}&course=${encodeURIComponent(lesson.title)}${activeChildId ? `&childId=${encodeURIComponent(activeChildId)}` : ''}&time=${encodeURIComponent(lesson.startTime && lesson.endTime ? `${lesson.startTime}-${lesson.endTime}` : (lesson.startTime || ''))}&room=${encodeURIComponent(lesson.roomName || '')}`)}
                >
                  <span className="parent-today-schedule-item__bar" style={{ background: meta.color }} />
                  <div className="parent-today-schedule-item__head">
                    <span className="parent-today-schedule-item__time">{lesson.startTime}</span>
                    <span className="parent-today-schedule-item__status" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                  </div>
                  <strong className="parent-today-schedule-item__title">{lesson.title.replace('牧哲学堂', '')}</strong>
                  <small className="parent-today-schedule-item__meta">{lesson.teacherName || '老师'}{lesson.roomName ? ` · ${lesson.roomName}` : ''}</small>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
