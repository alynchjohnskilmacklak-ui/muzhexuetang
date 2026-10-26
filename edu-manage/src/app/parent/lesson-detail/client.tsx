'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftOutlined, CameraOutlined, EnvironmentOutlined, StarFilled, ClockCircleOutlined, BookOutlined, TeamOutlined, CalendarOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Image, Typography } from 'antd'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { fmtDateTime } from '@/lib/format-date'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'

const { Title, Text, Paragraph } = Typography

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

  const grade = gradeFromCourse(course)
  const subject = feedback?.classLesson?.subject || ''
  const timeText = time || (feedback?.classLesson?.startTime
    ? `${feedback.classLesson.startTime}${feedback.classLesson.endTime ? `-${feedback.classLesson.endTime}` : ''}`
    : '')
  const roomName = room || feedback?.classLesson?.group?.room?.name || ''

  // 判断课程日期是否为今天
  const lessonDateObj = lessonDate ? new Date(lessonDate) : null
  const now = new Date()
  const isToday = lessonDateObj
    && lessonDateObj.getFullYear() === now.getFullYear()
    && lessonDateObj.getMonth() === now.getMonth()
    && lessonDateObj.getDate() === now.getDate()
  const isFuture = lessonDateObj ? lessonDateObj.getTime() > now.getTime() : false
  const dateLabel = lessonDateObj
    ? `${lessonDateObj.getMonth() + 1}月${lessonDateObj.getDate()}日 · 周${['日','一','二','三','四','五','六'][lessonDateObj.getDay()]}`
    : fmtDateToday()
  const heroTag = isToday ? '今日课程' : isFuture ? '即将上课' : '历史课程'

  return (
    <div className="lesson-detail">
      <button type="button" className="lesson-detail__back" onClick={() => router.back()}>
        <ArrowLeftOutlined /> 返回
      </button>

      <div className="lesson-detail__hero">
        <div className="lesson-detail__hero-top">
          <span className="lesson-detail__hero-tag">{heroTag}</span>
          <span className="lesson-detail__hero-date"><CalendarOutlined /> {dateLabel}</span>
        </div>
        <div className="lesson-detail__hero-title">{course || teacher?.name || '课程'}</div>
        <div className="lesson-detail__hero-tags">
          {grade && <span className="lesson-detail__hero-tag2"><TeamOutlined /> {grade}</span>}
          {subject && <span className="lesson-detail__hero-tag2"><BookOutlined /> {subject}</span>}
          {timeText && <span className="lesson-detail__hero-tag2"><ClockCircleOutlined /> {timeText}</span>}
          {roomName && <span className="lesson-detail__hero-tag2"><EnvironmentOutlined /> {roomName}</span>}
        </div>
        {teacher?.name && (
          <div className="lesson-detail__hero-teacher">
            <span className="lesson-detail__hero-dot" style={{ background: tierTheme.accent }} />
            {teacher.name}老师{grade ? ` · ${grade}` : ''}
          </div>
        )}
      </div>

      {teacher && (
        <section className="lesson-detail-card lesson-detail-teacher">
          <div className="lesson-detail-card__title">教师信息</div>
          <div className="lesson-detail-teacher__body">
            <div className="lesson-detail-teacher__avatar">
              <Image
                src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.name)}
                fallback={getTeacherAvatarUrl(null, teacher.gender, teacher.name)}
                alt={teacher.name}
                preview={{ mask: '点击查看大图' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
              />
            </div>
            <div className="lesson-detail-teacher__info">
              <div className="lesson-detail-teacher__name">
                <strong>{teacher.name}老师</strong>
                {teacher.tierLevel && (
                  <span
                    className="lesson-detail-teacher__tier"
                    style={{ color: tierTheme.accent, background: tierTheme.bg, border: `1px solid ${tierTheme.border}` }}
                  >
                    {tierTheme.label}
                  </span>
                )}
              </div>
              <div className="lesson-detail-teacher__meta">
                {teacher.subjects && <span>{teacher.subjects.replace(/[,，]/g, ' · ')}</span>}
                {teacher.university && <span>{teacher.university}</span>}
                {teacher.education && <span>{teacher.education}</span>}
              </div>
              {teacher.rating ? (
                <div className="lesson-detail-teacher__rating"><StarFilled /> {teacher.rating.toFixed(1)}（{teacher.ratingCount || 0} 人评价）</div>
              ) : null}
              {teacher.bio && <Paragraph className="lesson-detail-teacher__bio">{teacher.bio}</Paragraph>}
            </div>
          </div>
        </section>
      )}

      <section className="lesson-detail-card">
        <div className="lesson-detail-card__title">课堂反馈</div>
        {feedback ? (
          <>
            {feedback.createdAt && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>发布于 {fmtDateTime(feedback.createdAt)}</Text>
            )}
            {(() => {
              const text = String(feedback.lessonContent || parentVisibleComment(feedback.overallComment || '') || feedback.summary || '').trim()
              return text ? (
                <Paragraph
                  className="lesson-detail-block__text"
                  style={{
                    whiteSpace: 'pre-wrap',
                    WebkitLineClamp: 3,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {text}
                </Paragraph>
              ) : (
                <Text type="secondary" style={{ fontSize: 12.5, display: 'block', marginBottom: 8 }}>老师已发布本节课课堂反馈，点击下方按钮查看完整内容。</Text>
              )
            })()}
            <Button
              type="primary"
              icon={<RightOutlined />}
              onClick={() => router.push(`/parent/class-feedback/${feedback.id}${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`)}
              style={{ marginTop: 8, background: '#0E5E4E', border: 'none', borderRadius: 10, height: 40, fontWeight: 600 }}
            >
              查看完整课堂反馈
            </Button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#999', fontSize: 13 }}>
            {isFuture ? '本节课还未上课，课后老师会发布课堂反馈' : '本节课暂未发布课堂反馈'}
          </div>
        )}
      </section>

      {images.length > 0 && (
        <section className="lesson-detail-card">
          <div className="lesson-detail-card__title">课堂照片</div>
          <Image.PreviewGroup>
            <div className="lesson-detail-photos">
              {images.map((url, index) => (
                <Image key={index} src={url} alt={`课堂照片${index + 1}`} width={110} height={110} style={{ objectFit: 'cover', borderRadius: 10 }} />
              ))}
            </div>
          </Image.PreviewGroup>
        </section>
      )}

      {!feedback && (
        <section className="lesson-detail-card">
          <div className="lesson-detail-card__title">今日课堂反馈</div>
          <div className="lesson-detail-empty">
            <div className="lesson-detail-empty__title">老师还在整理今天的课堂反馈</div>
            <p className="lesson-detail-empty__desc">
              老师当天还未完成反馈，预计今晚 7 点左右更新。
              <br />
              每天课后，老师需要为每个孩子整理课堂反馈和课堂照片，还要批改作业、备课，非常辛苦。
              <br />
              请您耐心等待，晚上再来查看孩子今天的课堂动态。
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

function fmtDateToday() {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[now.getDay()]}`
}
