'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftOutlined, CameraOutlined, EnvironmentOutlined, StarFilled, ClockCircleOutlined, BookOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons'
import { Image, Typography } from 'antd'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { fmtDateTime } from '@/lib/format-date'
import { femaleDefaultAvatar } from '@/lib/teacher-avatars'

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
}: {
  teacher: LessonTeacher | null
  course: string
  feedback: LessonFeedback | null
  imageUrls: string[]
  signedThumbnails: Record<string, string>
  time?: string
  room?: string
}) {
  const router = useRouter()
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

  return (
    <div className="lesson-detail">
      <button type="button" className="lesson-detail__back" onClick={() => router.back()}>
        <ArrowLeftOutlined /> 返回
      </button>

      <div className="lesson-detail__hero">
        <div className="lesson-detail__hero-top">
          <span className="lesson-detail__hero-tag">今日课程</span>
          <span className="lesson-detail__hero-date"><CalendarOutlined /> {fmtDateToday()}</span>
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
                src={teacher.avatar || (teacher.gender === '男' ? '/avatars/teacher-male.png' : femaleDefaultAvatar(teacher.name))}
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

      {feedback && (
        <section className="lesson-detail-card">
          <div className="lesson-detail-card__title">上课内容与课堂反馈</div>
          {feedback.lessonContent && (
            <div className="lesson-detail-block">
              <div className="lesson-detail-block__label">上课内容</div>
              <Paragraph className="lesson-detail-block__text" style={{ whiteSpace: 'pre-wrap' }}>{feedback.lessonContent}</Paragraph>
            </div>
          )}
          {feedback.overallComment && (
            <div className="lesson-detail-block">
              <div className="lesson-detail-block__label">课堂反馈</div>
              <Paragraph className="lesson-detail-block__text" style={{ whiteSpace: 'pre-wrap' }}>{parentVisibleComment(feedback.overallComment)}</Paragraph>
            </div>
          )}
          {!feedback.lessonContent && !feedback.overallComment && feedback.summary && (
            <Paragraph className="lesson-detail-block__text" style={{ whiteSpace: 'pre-wrap' }}>{feedback.summary}</Paragraph>
          )}
          {feedback.createdAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>发布于 {fmtDateTime(feedback.createdAt)}</Text>
          )}

          {feedback.knowledgeDetail && (
            <div className="lesson-detail-knowledge">
              <div className="lesson-detail-knowledge__title">知识点详解</div>
              {(feedback.knowledgeDetail.formulas?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div className="lesson-detail-knowledge__label">公式或方法</div>
                  {feedback.knowledgeDetail.formulas?.map((formula, i) => (
                    <div key={i} className="lesson-detail-knowledge__text" style={{ whiteSpace: 'pre-wrap' }}>{formula}</div>
                  ))}
                </div>
              )}
              {feedback.knowledgeDetail.definition && (
                <div style={{ marginBottom: 10 }}>
                  <div className="lesson-detail-knowledge__label">知识讲解</div>
                  <Paragraph className="lesson-detail-knowledge__text" style={{ whiteSpace: 'pre-wrap' }}>{feedback.knowledgeDetail.definition}</Paragraph>
                </div>
              )}
              {(feedback.knowledgeDetail.tips?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div className="lesson-detail-knowledge__label">易错点与学习建议</div>
                  {feedback.knowledgeDetail.tips?.map((tip, i) => (
                    <div key={i} className="lesson-detail-knowledge__text">· {tip}</div>
                  ))}
                </div>
              )}
              {feedback.knowledgeDetail.example && (
                <div>
                  <div className="lesson-detail-knowledge__label">示例</div>
                  <div className="lesson-detail-knowledge__text">
                    {feedback.knowledgeDetail.example.question && <div style={{ marginBottom: 4 }}>题目：{feedback.knowledgeDetail.example.question}</div>}
                    {(feedback.knowledgeDetail.example.steps?.length ?? 0) > 0 && feedback.knowledgeDetail.example.steps?.map((step, i) => (
                      <div key={i} style={{ marginBottom: 2 }}>{i + 1}. {step}</div>
                    ))}
                    {feedback.knowledgeDetail.example.answer && <div style={{ marginTop: 4 }}>答案：{feedback.knowledgeDetail.example.answer}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
