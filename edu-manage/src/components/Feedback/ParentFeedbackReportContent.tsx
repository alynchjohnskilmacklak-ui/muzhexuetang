'use client'

import { Button, Image, Tag, Typography } from 'antd'
import { BookOutlined, CameraOutlined, ReloadOutlined, CheckCircleOutlined, FireOutlined } from '@ant-design/icons'
import { PersonalizedLearningPath } from '@/components/Feedback/PersonalizedLearningPath'
import { FeedbackPracticeCheckin } from '@/components/Feedback/FeedbackPracticeCheckin'
import { ParentFeedbackHomeworkCheckin } from '@/components/Feedback/ParentFeedbackHomeworkCheckin'
import { ParentFollowupSummary } from '@/components/Feedback/FeedbackFollowup'
import { KnowledgeProgressTrend } from '@/components/Feedback/KnowledgeProgressTrend'
import { normalizeAcademicFormulaText } from '@/lib/classroom-feedback/parent-pdf'
import { MathText } from '@/app/parent/materials/MathText'
import type { KnowledgePointCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import type { KnowledgeProgressEntry } from '@/lib/classroom-feedback/knowledge-progress'
import type { PersonalizedLearningExtension } from '@/lib/classroom-feedback/personalized-learning'
import type { ParentPracticeCheckin } from '@/lib/classroom-feedback/feedback-followup'

const { Title, Text, Paragraph } = Typography

export type ParentFeedbackReportSection = { label: string; content: string }

export type ParentFeedbackReportImage = {
  id?: string
  thumbnailUrl: string
  previewUrl?: string
}

export type ParentFeedbackLearningData = {
  studentName?: string | null
  topic: string
  mastery?: string | null
  performance?: string | null
  tags: string[]
  teacherRemark?: string | null
  overallComment?: string | null
  nextLessonFocus?: string | null
  homework: string[]
  extension?: PersonalizedLearningExtension | null
}

type PracticeCheckinConfig = {
  feedbackId: string
  studentId?: string | null
  initialValue: ParentPracticeCheckin | null
}

type ParentFeedbackReportContentProps = {
  childId?: string | null
  subject: string
  knowledgePoints: string[]
  knowledgeCard?: KnowledgePointCard | null
  images: ParentFeedbackReportImage[]
  isMobile: boolean
  imageError?: boolean
  onRetryImages?: () => void
  onImagePreviewVisibilityChange?: (visible: boolean) => void
  overallEvaluation: string
  classroomFollowup: string
  additionalSections?: ParentFeedbackReportSection[]
  homeworkItems: string[]
  homeworkCheckin?: { feedbackId: string; studentId: string } | null
  learning: ParentFeedbackLearningData
  progressEntries?: KnowledgeProgressEntry[]
  followupReview?: unknown
  practiceCheckin?: PracticeCheckinConfig | null
  showPracticeButton?: boolean
  practiceButtonDisabled?: boolean
  onOpenPractice?: () => void
}

function sectionItems(content: string) {
  return content
    .split(/\n+|[；;]/)
    .map((item) => item.replace(/^[-•\d.、\s]+/, '').trim())
    .filter(Boolean)
}

export function ParentFeedbackReportContent({
  childId,
  subject,
  knowledgePoints,
  knowledgeCard,
  images,
  isMobile,
  imageError = false,
  onRetryImages,
  onImagePreviewVisibilityChange,
  overallEvaluation,
  classroomFollowup,
  additionalSections = [],
  homeworkItems,
  homeworkCheckin = null,
  learning,
  progressEntries = [],
  followupReview,
  practiceCheckin,
  showPracticeButton = true,
  practiceButtonDisabled = false,
  onOpenPractice,
}: ParentFeedbackReportContentProps) {
  const visiblePracticeButton = showPracticeButton && Boolean(childId) && subject !== '课堂反馈'
  const primaryFeedback = [overallEvaluation, classroomFollowup]
    .filter(Boolean)
    .join('\n\n')
    || learning.teacherRemark
    || learning.overallComment
    || '老师已发布本节学情记录与课堂表现，点击查看详情。'

  const topicName = knowledgeCard?.topic || knowledgePoints?.[0] || learning.topic || subject

  let badgeIndex = 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 01 教师课堂反馈：完整连贯呈现教师第一手真实评语 */}
      <section
        aria-label="教师课堂反馈"
        style={{
          background: '#FFFDF9',
          borderRadius: 14,
          padding: isMobile ? '15px 14px' : '18px 20px',
          border: '1.5px solid rgba(232, 120, 74, 0.22)',
          boxShadow: '0 2px 10px rgba(232, 120, 74, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: '#E8784A',
                color: '#FFFFFF',
                borderRadius: 5,
                padding: '2px 7px',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              0{badgeIndex++}
            </span>
            <Text strong style={{ fontSize: 15.5, color: '#1B4A3D', letterSpacing: 0.3 }}>
              教师课堂反馈
            </Text>
          </div>
          <span style={{ fontSize: 11, color: '#8A7A68' }}>真实学情与课堂表现</span>
        </div>
        <div
          style={{
            fontFamily: '"Times New Roman", Times, "SimSun", "Songti SC", "STSong", "Noto Serif SC", serif',
            fontSize: isMobile ? 14 : 14.5,
            lineHeight: 1.88,
            color: '#2C3E50',
            whiteSpace: 'pre-wrap',
            letterSpacing: 0.15,
          }}
        >
          {primaryFeedback}
        </div>
      </section>

      {/* 02 知识点详解：涵盖知识精讲、核心公式、易错剖析、经典例题 */}
      {(knowledgeCard || knowledgePoints.length > 0) && (
        <section
          aria-label="知识点详解"
          style={{
            background: '#F9FBFB',
            borderRadius: 14,
            padding: isMobile ? '15px 14px' : '18px 20px',
            border: '1.5px solid rgba(14, 94, 78, 0.22)',
            boxShadow: '0 2px 10px rgba(14, 94, 78, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#0E5E4E',
                  color: '#FFFFFF',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                0{badgeIndex++}
              </span>
              <Text strong style={{ fontSize: 15.5, color: '#0E5E4E' }}>
                知识点详解 · {topicName}
              </Text>
            </div>
            {knowledgePoints.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {knowledgePoints.map((point, index) => (
                  <Tag
                    key={`${point}-${index}`}
                    style={{
                      borderRadius: 9999,
                      fontSize: 11,
                      margin: 0,
                      background: 'rgba(14, 94, 78, 0.08)',
                      border: '1px solid rgba(14, 94, 78, 0.22)',
                      color: '#0E5E4E',
                      padding: '1px 8px',
                    }}
                  >
                    {point}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {knowledgeCard ? (
            <div
              style={{
                fontFamily: '"Times New Roman", Times, "SimSun", "Songti SC", "STSong", "Noto Serif SC", serif',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: 14,
                lineHeight: 1.85,
                color: '#2C3E50',
              }}
            >
              {knowledgeCard.definition && (
                <div style={{ padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(14, 94, 78, 0.12)' }}>
                  <strong style={{ color: '#0E5E4E', display: 'block', marginBottom: 4 }}>【知识精讲】</strong>
                  <div style={{ color: '#334155' }}>
                    <MathText text={normalizeAcademicFormulaText(knowledgeCard.definition)} />
                  </div>
                </div>
              )}

              {knowledgeCard.formulas && knowledgeCard.formulas.length > 0 && (
                <div style={{ padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(14, 94, 78, 0.12)' }}>
                  <strong style={{ color: '#0E5E4E', display: 'block', marginBottom: 6 }}>【核心公式与方法】</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {knowledgeCard.formulas.map((formula, index) => (
                      <div
                        key={`${formula}-${index}`}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: 'rgba(14, 94, 78, 0.05)',
                          borderLeft: '3px solid #0E5E4E',
                          color: '#0F172A',
                        }}
                      >
                        <MathText text={normalizeAcademicFormulaText(formula)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledgeCard.tips && knowledgeCard.tips.length > 0 && (
                <div style={{ padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(14, 94, 78, 0.12)' }}>
                  <strong style={{ color: '#0E5E4E', display: 'block', marginBottom: 6 }}>【易错点剖析】</strong>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#475569' }}>
                    {knowledgeCard.tips.map((tip, index) => (
                      <li key={`${tip}-${index}`} style={{ marginBottom: 4 }}>
                        <MathText text={normalizeAcademicFormulaText(tip)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {knowledgeCard.example && (
                <div style={{ padding: '10px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(14, 94, 78, 0.12)' }}>
                  <strong style={{ color: '#0E5E4E', display: 'block', marginBottom: 4 }}>【经典例题】</strong>
                  {knowledgeCard.example.question && (
                    <div style={{ marginBottom: 6, color: '#1E293B' }}>
                      <MathText text={normalizeAcademicFormulaText(knowledgeCard.example.question)} />
                    </div>
                  )}
                  {knowledgeCard.example.steps && knowledgeCard.example.steps.length > 0 && (
                    <ol style={{ margin: '4px 0 6px', paddingLeft: 20, color: '#475569' }}>
                      {knowledgeCard.example.steps.map((step, index) => (
                        <li key={`${step}-${index}`} style={{ marginBottom: 3 }}>
                          <MathText text={normalizeAcademicFormulaText(step)} />
                        </li>
                      ))}
                    </ol>
                  )}
                  {knowledgeCard.example.answer && (
                    <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(232, 120, 74, 0.08)', color: '#C2572C', fontWeight: 600 }}>
                      答案：<MathText text={normalizeAcademicFormulaText(knowledgeCard.example.answer)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
              本节重点围绕【{topicName}】展开，已梳理核心考点与课堂要点。
            </div>
          )}
        </section>
      )}

      {/* 03 课堂照片 (若有) */}
      {images.length > 0 && (
        <section
          aria-label="课堂照片"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: isMobile ? '14px 14px' : '16px 18px',
            border: '1px solid rgba(201, 164, 92, 0.3)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#8A6517',
                  color: '#FFFFFF',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                0{badgeIndex++}
              </span>
              <Text strong style={{ fontSize: 15, color: '#1B4A3D' }}>
                <CameraOutlined style={{ marginRight: 6, color: '#C9A45C' }} />
                课堂照片 ({images.length}张)
              </Text>
            </div>
            <span style={{ fontSize: 11, color: '#8A7A68' }}>点击可全屏浏览与缩放</span>
          </div>

          {imageError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 10,
                padding: '9px 12px',
                borderRadius: 8,
                background: '#FFF4DE',
                color: '#8A5B00',
                fontSize: 12,
              }}
            >
              <span>图片连接暂时延缓，文字反馈不受影响。</span>
              {onRetryImages && <Button size="small" icon={<ReloadOutlined />} onClick={onRetryImages}>重新加载</Button>}
            </div>
          )}

          <Image.PreviewGroup preview={{ onVisibleChange: onImagePreviewVisibilityChange }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              {images.map((image, index) => (
                <Image
                  key={image.id || `${image.thumbnailUrl}-${index}`}
                  src={image.thumbnailUrl}
                  loading="lazy"
                  preview={{ src: image.previewUrl || image.thumbnailUrl }}
                  alt={`课堂实录 ${index + 1}`}
                  width="100%"
                  height={isMobile ? 120 : 140}
                  style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #F0DDD2' }}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </section>
      )}

      {/* 04 家长陪学建议 / 回家怎么巩固 (若有) */}
      {homeworkItems.length > 0 && (
        <section
          aria-label="回家巩固建议"
          style={{
            background: '#FFFDF5',
            borderRadius: 14,
            padding: isMobile ? '15px 14px' : '18px 20px',
            border: '1.5px solid rgba(201, 164, 92, 0.4)',
            boxShadow: '0 2px 10px rgba(201, 164, 92, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#C9A45C',
                  color: '#FFFFFF',
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                0{badgeIndex++}
              </span>
              <Text strong style={{ fontSize: 15.5, color: '#1B4A3D' }}>
                家长陪学与回家巩固建议
              </Text>
            </div>
            <Text style={{ fontSize: 11.5, color: '#8A6D3B' }}>共 {homeworkItems.length} 项课后任务</Text>
          </div>
          <ol
            style={{
              margin: '6px 0 0',
              paddingLeft: 22,
              color: '#334155',
              fontSize: 14,
              lineHeight: 1.8,
              fontFamily: '"Times New Roman", Times, "SimSun", "Songti SC", serif',
            }}
          >
            {homeworkItems.map((item, index) => (
              <li key={`${item}-${index}`} style={{ paddingLeft: 2, marginBottom: 4 }}>
                <MathText text={normalizeAcademicFormulaText(item)} />
              </li>
            ))}
          </ol>
          {homeworkCheckin && (
            <div style={{ marginTop: 12 }}>
              <ParentFeedbackHomeworkCheckin feedbackId={homeworkCheckin.feedbackId} studentId={homeworkCheckin.studentId} />
            </div>
          )}
        </section>
      )}

      {/* 本节知识题库练习微练按钮 */}
      {visiblePracticeButton && (
        <button
          type="button"
          onClick={onOpenPractice}
          disabled={practiceButtonDisabled}
          aria-disabled={practiceButtonDisabled}
          title={practiceButtonDisabled ? '预览中不可操作' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 16px',
            borderRadius: 14,
            border: '1px solid rgba(201, 164, 92, 0.5)',
            background: 'linear-gradient(135deg, #0E5E4E 0%, #123C35 100%)',
            boxShadow: '0 6px 16px rgba(18, 60, 53, 0.18)',
            cursor: practiceButtonDisabled ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            className="pf-badge is-default"
            style={{
              width: 42,
              height: 42,
              fontSize: 17,
              borderRadius: 12,
              flexShrink: 0,
              background: 'rgba(246, 236, 210, 0.2)',
              color: '#F6ECD2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            练
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: '#F6ECD2' }}>
              去本节知识题库练习
            </span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 11.5, color: 'rgba(245, 241, 232, 0.78)' }}>
              {subject} · 【{topicName}】专项巩固练习
            </span>
          </span>
          <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#F2E3B6' }}>
            开始练习 ›
          </span>
        </button>
      )}

      {/* 学习路径与进阶诊断 */}
      <PersonalizedLearningPath
        studentName={learning.studentName}
        topic={learning.topic}
        mastery={learning.mastery}
        performance={learning.performance}
        tags={learning.tags}
        teacherRemark={learning.teacherRemark}
        overallComment={learning.overallComment}
        nextLessonFocus={learning.nextLessonFocus}
        homework={learning.homework}
        extension={learning.extension}
        knowledgeCard={knowledgeCard}
      />

      <KnowledgeProgressTrend entries={progressEntries} />

      <ParentFollowupSummary value={followupReview} />

      {practiceCheckin && (
        <FeedbackPracticeCheckin
          feedbackId={practiceCheckin.feedbackId}
          studentId={practiceCheckin.studentId || null}
          initialValue={practiceCheckin.initialValue}
        />
      )}
    </div>
  )
}
