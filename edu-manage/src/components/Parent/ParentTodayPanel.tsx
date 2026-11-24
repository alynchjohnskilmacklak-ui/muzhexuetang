'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  RightOutlined,
  TeamOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import styles from './ParentTodayPanel.module.css'
import { buildParentLessonDetailHref } from '@/lib/parent-lesson-detail'

type TodayLesson = {
  id: string
  title: string
  startTime: string
  endTime: string
  subject?: string | null
  teacherName?: string | null
  roomName?: string | null
  startTimeRaw?: string | null
  endTimeRaw?: string | null
  attendanceSubmittedAt?: string | null
  lessonDate?: string | null
}

type SubjectVisualMeta = {
  label: string
  color: string
  bg: string
  border: string
  accentColor: string
}

function resolveSubjectTag(title: string, subject?: string | null): SubjectVisualMeta {
  const text = `${subject || ''} ${title}`
  if (text.includes('数')) {
    return { label: '数学', color: '#1A538C', bg: '#EBF4FC', border: 'rgba(26, 83, 140, 0.22)', accentColor: '#1A538C' }
  }
  if (text.includes('语')) {
    return { label: '语文', color: '#993C1D', bg: '#FAECE7', border: 'rgba(153, 60, 29, 0.22)', accentColor: '#993C1D' }
  }
  if (text.includes('英')) {
    return { label: '英语', color: '#8A5A14', bg: '#FCF5EC', border: 'rgba(138, 90, 20, 0.22)', accentColor: '#8A5A14' }
  }
  if (text.includes('物')) {
    return { label: '物理', color: '#3C3489', bg: '#EEEDFE', border: 'rgba(60, 52, 137, 0.22)', accentColor: '#3C3489' }
  }
  if (text.includes('化')) {
    return { label: '化学', color: '#085041', bg: '#E1F5EE', border: 'rgba(8, 80, 65, 0.22)', accentColor: '#085041' }
  }
  if (text.includes('生')) {
    return { label: '生物', color: '#27500A', bg: '#EAF3DE', border: 'rgba(39, 80, 10, 0.22)', accentColor: '#27500A' }
  }
  if (text.includes('历')) {
    return { label: '历史', color: '#8C5528', bg: '#FCEBEB', border: 'rgba(140, 85, 40, 0.22)', accentColor: '#8C5528' }
  }
  if (text.includes('地')) {
    return { label: '地理', color: '#0C447C', bg: '#E6F1FB', border: 'rgba(12, 68, 124, 0.22)', accentColor: '#0C447C' }
  }
  if (text.includes('政') || text.includes('道')) {
    return { label: '道法', color: '#444441', bg: '#F1EFE8', border: 'rgba(68, 68, 65, 0.22)', accentColor: '#444441' }
  }
  if (subject && subject.trim() && subject.trim() !== '课程') {
    return { label: subject.trim(), color: '#14574D', bg: '#EDF5F2', border: 'rgba(20, 87, 77, 0.22)', accentColor: '#14574D' }
  }
  return { label: '', color: '#14574D', bg: '#EDF5F2', border: 'rgba(20, 87, 77, 0.22)', accentColor: '#14574D' }
}

function formatRelativeTimeNotice(lesson: TodayLesson, statusKey: LessonStatusMeta['key']): string {
  if (statusKey === 'LIVE') {
    if (lesson.endTimeRaw) {
      const endMs = new Date(lesson.endTimeRaw).getTime()
      const now = Date.now()
      const remainingMins = Math.max(1, Math.round((endMs - now) / 60000))
      return `进行中 · 还剩 ${remainingMins} 分钟`
    }
    return '正在上课'
  }

  if (statusKey === 'COMPLETED') {
    return '已结束'
  }

  if (statusKey === 'CONFIRMING') {
    return '待确认'
  }

  if (lesson.startTimeRaw) {
    const startMs = new Date(lesson.startTimeRaw).getTime()
    const now = Date.now()
    const diffMins = Math.round((startMs - now) / 60000)

    if (diffMins > 0 && diffMins <= 60) {
      return `${diffMins} 分钟后开始`
    }
    if (diffMins > 60 && diffMins <= 180) {
      const hrs = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return mins > 0 ? `约 ${hrs} 小时 ${mins} 分钟后开始` : `约 ${hrs} 小时后开始`
    }
  }

  return '下一节待上'
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatLessonDate(dateValue: string | null | undefined) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 · 周${WEEKDAYS[date.getDay()]}`
}

function isToday(dateValue: string | null | undefined) {
  if (!dateValue) return false
  const d = new Date(dateValue)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

type LessonStatusMeta = {
  key: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CONFIRMING'
  label: string
  bg: string
  color: string
}

function getLessonStatus(lesson: TodayLesson): LessonStatusMeta {
  if (lesson.attendanceSubmittedAt) {
    return { key: 'COMPLETED', label: '已结束', bg: '#F1F1F2', color: '#756A58' }
  }
  if (!lesson.startTimeRaw || !lesson.endTimeRaw) {
    return { key: 'CONFIRMING', label: '待确认', bg: '#FFEFE3', color: '#C05B22' }
  }
  const now = Date.now()
  const start = new Date(lesson.startTimeRaw).getTime()
  const end = new Date(lesson.endTimeRaw).getTime()
  if (now < start) {
    return { key: 'UPCOMING', label: '待上课', bg: '#FFF2D9', color: '#A06E0B' }
  }
  if (now <= end) {
    return { key: 'LIVE', label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' }
  }
  return { key: 'COMPLETED', label: '已结束', bg: '#F1F1F2', color: '#756A58' }
}

const QUICK_ACTIONS: Array<{
  label: string
  desc: string
  icon: ReactNode
  href: string
  color: string
  bg: string
  border: string
  shadow: string
}> = [
  {
    label: '家校沟通',
    desc: '在线联络老师',
    icon: <CommentOutlined />,
    href: '/parent/messages',
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    shadow: '0 4px 12px rgba(5, 150, 105, 0.28)',
  },
  {
    label: '成长档案',
    desc: '学生成长足迹',
    icon: <HistoryOutlined />,
    href: '/parent/archive',
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    shadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
  },
  {
    label: '特训自测',
    desc: '语法与词汇背诵',
    icon: <EditOutlined />,
    href: '/parent/vocab',
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    shadow: '0 4px 12px rgba(217, 119, 6, 0.28)',
  },
  {
    label: '教师信息',
    desc: '师资团队介绍',
    icon: <TeamOutlined />,
    href: '/parent/teachers',
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    shadow: '0 4px 12px rgba(124, 58, 237, 0.28)',
  },
]

function withStudent(href: string, studentId?: string | null) {
  if (!studentId) return href
  const childScoped = href.startsWith('/parent/class-feedback') || href.startsWith('/parent/practice')
  const key = childScoped ? 'childId' : 'studentId'
  return href.includes('?')
    ? `${href}&${key}=${encodeURIComponent(studentId)}`
    : `${href}?${key}=${encodeURIComponent(studentId)}`
}

export function ParentTodayPanel({
  lessons,
  lessonDate,
  activeChildId,
  studentName,
}: {
  lessons: TodayLesson[]
  nextLesson?: TodayLesson | null
  lessonDate?: string | null
  activeChildId?: string | null
  studentName: string
}) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const hasLessons = lessons.length > 0
  const today = isToday(lessonDate)
  const hasLiveLesson = lessons.some((l) => getLessonStatus(l).key === 'LIVE')

  const liveLessonIndex = lessons.findIndex((l) => getLessonStatus(l).key === 'LIVE')
  const upcomingLessonIndex = lessons.findIndex((l) => getLessonStatus(l).key === 'UPCOMING')
  const heroIndex = liveLessonIndex !== -1 ? liveLessonIndex : upcomingLessonIndex !== -1 ? upcomingLessonIndex : 0

  const heroLesson = lessons[heroIndex]
  const remainingLessons = lessons.filter((_, idx) => idx !== heroIndex)

  // 当后续课程较多时默认折叠，保留全貌同时避免占用过长首屏
  const hasMore = remainingLessons.length > 2
  const visibleRemaining = isExpanded ? remainingLessons : remainingLessons.slice(0, 2)

  const sectionTitle = hasLessons
    ? today
      ? `${studentName}的今日课程`
      : `${studentName}的课程安排`
    : `${studentName}的课程安排`

  const dateLabel = hasLessons && !today && lessonDate ? formatLessonDate(lessonDate) : null

  const openLesson = (lesson: TodayLesson) => {
    router.push(buildParentLessonDetailHref({
      lessonId: lesson.id,
      teacher: lesson.teacherName || '',
      course: lesson.title,
      childId: activeChildId,
      time: lesson.startTime && lesson.endTime ? `${lesson.startTime}-${lesson.endTime}` : lesson.startTime || '',
      room: lesson.roomName || '',
      lessonDate: lesson.lessonDate || '',
    }))
  }

  const heroStatus = heroLesson ? getLessonStatus(heroLesson) : null
  const heroSubject = heroLesson ? resolveSubjectTag(heroLesson.title, heroLesson.subject) : null
  const relativeNotice = heroLesson && heroStatus ? formatRelativeTimeNotice(heroLesson, heroStatus.key) : '下一节待上'

  return (
    <div className={styles.wrapper}>
      {/* 4 大高频核心功能胶囊 */}
      <section className={styles.quickActionsSection} aria-label="高频功能">
        <div className={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className={styles.quickActionItem}
              onClick={() => router.push(withStudent(action.href, activeChildId))}
            >
              <div
                className={styles.iconBox}
                style={{
                  color: action.color,
                  background: action.bg,
                  border: action.border,
                  boxShadow: action.shadow,
                }}
              >
                {action.icon}
              </div>
              <small className={styles.actionLabel}>{action.label}</small>
            </button>
          ))}
        </div>
      </section>

      {/* 今日学习日程舱：通透去盒化，直接承接于背景 */}
      <section
        className={styles.scheduleSection}
        aria-labelledby="parent-today-schedule-title"
      >
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitleRow}>
            <h2 id="parent-today-schedule-title" className={styles.sectionTitle}>
              {sectionTitle}
            </h2>
            {hasLiveLesson && (
              <span className={styles.liveBadge}>
                <span className={styles.pulseDot} /> 上课中
              </span>
            )}
          </div>
          {dateLabel ? (
            <span className={styles.dateHint}>{dateLabel}</span>
          ) : (
            <span className={styles.dateHint}>点击卡片查看上课详情</span>
          )}
        </div>

        {hasLessons && heroLesson && heroStatus && heroSubject ? (
          <>
            {/* 焦点核心卡：墨玉沉浸卡，下一节动态倒计时/上课提示 */}
            <div
              className={`${styles.heroCard} ${
                heroStatus.key === 'LIVE' ? styles.heroCardLive : ''
              }`}
              onClick={() => openLesson(heroLesson)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.heroHead}>
                <div className={styles.heroTimeWrap}>
                  <ClockCircleOutlined className={styles.heroClockIcon} />
                  <span className={styles.heroTimeText}>
                    {heroLesson.startTime}
                    {heroLesson.endTime ? ` - ${heroLesson.endTime}` : ''}
                  </span>
                  <span
                    className={`${styles.heroStatusBadge} ${
                      heroStatus.key === 'LIVE'
                        ? styles.heroStatusBadgeLive
                        : heroStatus.key === 'COMPLETED'
                        ? styles.heroStatusBadgeCompleted
                        : styles.heroStatusBadgeUpcoming
                    }`}
                  >
                    {heroStatus.key === 'LIVE' && <span className={styles.pulseDot} />}
                    {relativeNotice}
                  </span>
                </div>
                {heroSubject.label ? (
                  <span className={styles.heroSubjectPill}>
                    {heroSubject.label}
                  </span>
                ) : null}
              </div>

              <div className={styles.heroBody}>
                <strong className={styles.heroCourseTitle}>
                  {heroLesson.title.replace(/^牧哲学堂\s*/, '')}
                </strong>
                <div className={styles.heroMetaRow}>
                  <span className={styles.heroMetaItem}>
                    <UserOutlined className={styles.heroMetaIcon} />
                    <span>{heroLesson.teacherName ? `${heroLesson.teacherName}老师` : '任课老师'}</span>
                  </span>
                  {heroLesson.roomName && (
                    <span className={styles.heroMetaItem}>
                      <EnvironmentOutlined className={styles.heroMetaIcon} />
                      <span>{heroLesson.roomName}</span>
                    </span>
                  )}
                  <span className={styles.heroDetailCta}>
                    查看课节详情 <RightOutlined style={{ fontSize: 9 }} />
                  </span>
                </div>
              </div>
            </div>

            {/* 后续其他课时列表：时间线连贯排布，无白套白 */}
            {remainingLessons.length > 0 && (
              <div className={styles.subsequentWrap}>
                <div className={styles.subsequentHeader}>
                  <span className={styles.subsequentTitle}>
                    接下来还有 {remainingLessons.length} 节
                  </span>
                </div>

                <div className={styles.subsequentList}>
                  {visibleRemaining.map((lesson, idx) => {
                    const status = getLessonStatus(lesson)
                    const subject = resolveSubjectTag(lesson.title, lesson.subject)
                    const isCompleted = status.key === 'COMPLETED'
                    const isLive = status.key === 'LIVE'
                    const isUpcoming = status.key === 'UPCOMING'
                    const isFirst = idx === 0
                    const isLast = idx === visibleRemaining.length - 1

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`${styles.subsequentItem} ${
                          isCompleted ? styles.subsequentItemCompleted : ''
                        }`}
                        onClick={() => openLesson(lesson)}
                      >
                        {/* 竖向时间线连线与节点 */}
                        <div className={styles.timelineCol}>
                          <span
                            className={`${styles.timelineTrackLine} ${
                              isFirst ? styles.timelineTrackLineFirst : ''
                            } ${isLast ? styles.timelineTrackLineLast : ''}`}
                            aria-hidden="true"
                          />
                          <span
                            className={`${styles.timelineDot} ${
                              isLive
                                ? styles.timelineDotLive
                                : isCompleted
                                ? styles.timelineDotCompleted
                                : styles.timelineDotUpcoming
                            }`}
                            aria-hidden="true"
                          />
                        </div>

                        {/* 统一横向时间区间 */}
                        <div className={styles.subsequentTimeCol}>
                          <span className={styles.subsequentTimeRange}>
                            {lesson.startTime}
                            {lesson.endTime ? `–${lesson.endTime}` : ''}
                          </span>
                        </div>

                        {/* 课程内容与任课教师 */}
                        <div className={styles.subsequentMain}>
                          <div className={styles.subsequentTitleRow}>
                            {subject.label ? (
                              <span
                                className={styles.miniSubjectBadge}
                                style={{
                                  color: isCompleted ? '#8C8273' : subject.color,
                                  background: isCompleted ? '#F0EEE9' : subject.bg,
                                  borderColor: isCompleted ? 'rgba(0,0,0,0.06)' : subject.border,
                                }}
                              >
                                {subject.label}
                              </span>
                            ) : null}
                            <strong className={styles.subsequentCourseName}>
                              {lesson.title.replace(/^牧哲学堂\s*/, '')}
                            </strong>
                          </div>
                          <div className={styles.subsequentMeta}>
                            <span>{lesson.teacherName ? `${lesson.teacherName}老师` : '任课老师'}</span>
                            {lesson.roomName && <span> · {lesson.roomName}</span>}
                          </div>
                        </div>

                        {/* 右侧：仅在特殊状态时（如上课中、已结束）展示状态胶囊，待上课不展示重复胶囊 */}
                        <div className={styles.subsequentRight}>
                          {!isUpcoming && (
                            <span
                              className={styles.subsequentStatus}
                              style={{ color: status.color, background: status.bg }}
                            >
                              {status.label}
                            </span>
                          )}
                          <RightOutlined className={styles.subsequentArrow} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {hasMore && (
              <div className={styles.expandToggleWrap}>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={styles.expandToggleBtn}
                >
                  {isExpanded ? (
                    <>
                      <span>收起全天课程</span>
                      <UpOutlined style={{ fontSize: 10 }} />
                    </>
                  ) : (
                    <>
                      <span>展开全天 {lessons.length} 节</span>
                      <DownOutlined style={{ fontSize: 10 }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyCard}>
            <CalendarOutlined style={{ fontSize: 28, color: 'var(--color-brand-gold, #8A6517)' }} />
            <span className={styles.emptyTitle}>今天暂无排课安排 · 享受休整与温故知新</span>
            <button
              type="button"
              onClick={() => router.push(withStudent('/parent/schedule', activeChildId))}
              className={styles.emptyBtn}
            >
              <CalendarOutlined /> 查看我的完整课表
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
