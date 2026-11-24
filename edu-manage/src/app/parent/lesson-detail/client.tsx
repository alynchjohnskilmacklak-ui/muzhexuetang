'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReadOutlined,
  RightOutlined,
  StarFilled,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Image } from 'antd'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { fmtDateTime } from '@/lib/format-date'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import styles from './lesson-detail.module.css'

/** 家长端隐藏教师填写的关键字/提示词，只展示 AI 生成的反馈正文 */
function parentVisibleComment(comment: string) {
  const paragraphs = comment.split(/\n+/).map((part) => part.trim()).filter(Boolean)
  if (paragraphs.length < 2) return comment
  const firstLong = paragraphs.findIndex((part) => part.length >= 80)
  return firstLong > 0 ? paragraphs.slice(firstLong).join('\n\n') : comment
}

/** 从课程名解析年级 */
function gradeFromCourse(course: string) {
  const match = course.match(/(初一|初二|初三|高一|高二|高三)/)
  return match ? match[1] : ''
}

function fmtDateToday() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 · ${weekdays[now.getDay()]}`
}

type LessonTeacher = {
  name: string
  gender?: string | null
  avatar?: string | null
  education?: string | null
  university?: string | null
  major?: string | null
  currentUnit?: string | null
  subjects?: string | null
  bio?: string | null
  tierLevel?: string | null
  rating?: number | null
  ratingCount?: number | null
}

type LessonFeedback = {
  id: string
  createdAt: string
  lessonContent?: string | null
  summary?: string | null
  overallComment?: string | null
  knowledgeDetail?: {
    edition?: string
    grade?: string
    subject?: string
    topic?: string
    definition?: string
    formulas?: string[]
    example?: { question?: string; steps?: string[]; answer?: string }
    tips?: string[]
  } | null
  classLesson?: {
    name?: string | null
    lessonDate?: string | null
    startTime?: string | null
    endTime?: string | null
    subject?: string | null
    group?: {
      room?: { name?: string | null }
    } | null
  } | null
}

export function LessonDetailClient({
  teacher,
  course,
  feedback,
  imageUrls,
  signedThumbnails,
  time,
  room,
  lessonDate,
}: {
  teacher: LessonTeacher | null
  course: string
  feedback: LessonFeedback | null
  imageUrls: string[]
  signedThumbnails: Record<string, string>
  time?: string
  room?: string
  lessonDate?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId') || ''
  const signed = useSignedUrls(imageUrls, signedThumbnails)
  const tier = resolveTier(teacher?.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const images = (signed.urls || []).filter(Boolean) as string[]

  const [bioExpanded, setBioExpanded] = useState(false)

  const grade = gradeFromCourse(course)
  const subject = feedback?.classLesson?.subject || ''
  const timeText = time || (feedback?.classLesson?.startTime
    ? `${feedback.classLesson.startTime}${feedback.classLesson.endTime ? `-${feedback.classLesson.endTime}` : ''}`
    : '')
  const roomName = room || feedback?.classLesson?.group?.room?.name || ''

  // 判断课程日期是否为今天或未来
  const lessonDateObj = lessonDate ? new Date(lessonDate) : null
  const now = new Date()
  const isToday = lessonDateObj
    && lessonDateObj.getFullYear() === now.getFullYear()
    && lessonDateObj.getMonth() === now.getMonth()
    && lessonDateObj.getDate() === now.getDate()
  const isFuture = lessonDateObj ? lessonDateObj.getTime() > now.getTime() : false
  const dateLabel = lessonDateObj
    ? `${lessonDateObj.getMonth() + 1}月${lessonDateObj.getDate()}日 · 周${['日', '一', '二', '三', '四', '五', '六'][lessonDateObj.getDay()]}`
    : fmtDateToday()
  const heroTag = isToday ? '今日课程' : isFuture ? '即将上课' : '已完课'

  const subjectsList = teacher?.subjects
    ? teacher.subjects.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.backBtn} mobile-shell-back`}
        onClick={() => router.back()}
        aria-label="返回上一页"
      >
        <ArrowLeftOutlined /> 返回
      </button>

      {/* 课程主信息 Hero 卡片 */}
      <div className={`${styles.heroCard} stagger-item`} style={{ animationDelay: '0ms' }}>
        <div className={styles.heroTopRow}>
          <span className={styles.heroStatusPill}>{heroTag}</span>
          <span className={styles.heroDate}>
            <CalendarOutlined /> {dateLabel}
          </span>
        </div>

        <h1 className={styles.heroCourseTitle}>{course || teacher?.name || '课程详情'}</h1>

        <div className={styles.heroPillsRow}>
          {grade && (
            <span className={styles.heroPill}>
              <TeamOutlined /> {grade}
            </span>
          )}
          {subject && (
            <span className={styles.heroPill}>
              <BookOutlined /> {subject}
            </span>
          )}
          {timeText && (
            <span className={styles.heroPill}>
              <ClockCircleOutlined /> {timeText}
            </span>
          )}
          {roomName && (
            <span className={styles.heroPill}>
              <EnvironmentOutlined /> {roomName}
            </span>
          )}
        </div>

        {teacher?.name && (
          <div className={styles.heroTeacherTag}>
            <span className={styles.heroTeacherDot} style={{ background: tierTheme.accent }} />
            <span>主讲教师：{teacher.name}老师</span>
          </div>
        )}
      </div>

      {/* 教师信息名片 */}
      {teacher && (
        <section className={`${styles.sectionCard} stagger-item`} style={{ animationDelay: '60ms' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionTitleDot} /> 授课教师
            </h2>
            {teacher.rating ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A45C', display: 'flex', alignItems: 'center', gap: 3 }}>
                <StarFilled /> {teacher.rating.toFixed(1)} 分
              </span>
            ) : null}
          </div>

          <div className={styles.teacherGrid}>
            <div className={styles.teacherAvatarFrame}>
              <Image
                src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.name)}
                fallback={getTeacherAvatarUrl(null, teacher.gender, teacher.name)}
                alt={teacher.name}
                preview={{ mask: '查看' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div className={styles.teacherMainInfo}>
              <div className={styles.teacherNameRow}>
                <span className={styles.teacherName}>{teacher.name}老师</span>
                {teacher.tierLevel && (
                  <span
                    className={styles.tierPill}
                    style={{
                      color: tierTheme.accent,
                      background: tierTheme.bg,
                      border: `1px solid ${tierTheme.border}`,
                    }}
                  >
                    {tierTheme.label}
                  </span>
                )}
              </div>

              <div className={styles.teacherEduRow}>
                <span>{teacher.university || teacher.currentUnit || '牧哲学堂教师'}</span>
                {teacher.education && <span>· {teacher.education}</span>}
              </div>

              {subjectsList.length > 0 && (
                <div className={styles.subjectChipsRow}>
                  {subjectsList.map((sub) => (
                    <span key={sub} className={styles.subjectChip}>
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {teacher.bio && (
            <div className={styles.bioContainer}>
              <span className={styles.bioLabel}>
                <BookOutlined /> 教学风格与师资履历
              </span>
              <p
                className={`${styles.bioText} ${!bioExpanded && teacher.bio.length > 90 ? styles.bioTextClamped : ''}`}
              >
                {teacher.bio}
              </p>
              {teacher.bio.length > 90 && (
                <button
                  type="button"
                  className={styles.expandBioBtn}
                  onClick={() => setBioExpanded(!bioExpanded)}
                >
                  {bioExpanded ? '收起简介 ▲' : '展开查看完整履历 ▼'}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* 课堂学情与反馈（统合为一个清晰板块，消灭双卡撞车） */}
      <section className={`${styles.sectionCard} stagger-item`} style={{ animationDelay: '120ms' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionTitleDot} /> 课堂学情与反馈
          </h2>
          {feedback?.createdAt && (
            <span className={styles.feedbackTime}>
              发布于 {fmtDateTime(feedback.createdAt)}
            </span>
          )}
        </div>

        {feedback ? (
          <div className={styles.feedbackBox}>
            {(() => {
              const text = String(
                feedback.lessonContent
                  || parentVisibleComment(feedback.overallComment || '')
                  || feedback.summary
                  || '',
              ).trim()

              return text ? (
                <div className={styles.feedbackContent}>
                  {text}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
                  老师已发布本节课学情反馈，点击下方可查看详细测评与知识点。
                </div>
              )
            })()}

            <Button
              type="primary"
              icon={<ReadOutlined />}
              onClick={() => router.push(`/parent/class-feedback/${feedback.id}${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)}
              className={styles.fullFeedbackBtn}
            >
              查看完整学情报告与随堂测评 <RightOutlined />
            </Button>
          </div>
        ) : isFuture ? (
          /* 未来课次温和备课提示 */
          <div className={styles.standbyCard}>
            <div className={`${styles.standbyIconBox} ${styles.standbyIconUpcoming}`}>
              <CalendarOutlined />
            </div>
            <div className={styles.standbyTitle}>本节课尚未开课</div>
            <p className={styles.standbyDesc}>
              开课时间：{dateLabel} {timeText}。上课期间老师将专注课堂互动教学，课后会为您梳理本节课的重难点吸收情况与课堂照片。
            </p>
            <span className={styles.standbyTip}>
              💡 提醒：请督促孩子按时出勤，带齐课本讲义
            </span>
          </div>
        ) : (
          /* 今日课后或近期整理提示 */
          <div className={styles.standbyCard}>
            <div className={`${styles.standbyIconBox} ${styles.standbyIconOrganizing}`}>
              <ClockCircleOutlined />
            </div>
            <div className={styles.standbyTitle}>老师正在整理今日学情</div>
            <p className={styles.standbyDesc}>
              本节课授课已结束。老师将在课后整理孩子在堂上的掌握进度、练习完成度与精彩照片，预计今晚发布，请稍候查看。
            </p>
            <span className={styles.standbyTip}>
              🌙 建议：晚间 19:00 后可返回查看当天学情报告
            </span>
          </div>
        )}
      </section>

      {/* 随堂实拍照片 */}
      {images.length > 0 && (
        <section className={`${styles.sectionCard} stagger-item`} style={{ animationDelay: '180ms' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionTitleDot} /> 随堂实拍记录
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>
              共 {images.length} 张
            </span>
          </div>
          <Image.PreviewGroup>
            <div className={styles.photoGallery}>
              {images.map((url, index) => (
                <div key={url} className={styles.photoFrame}>
                  <Image
                    src={url}
                    alt={`随堂照片 ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </section>
      )}
    </div>
  )
}
