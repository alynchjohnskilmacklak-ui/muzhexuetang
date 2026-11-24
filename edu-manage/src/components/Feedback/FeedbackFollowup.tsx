'use client'

import { FOLLOWUP_OUTCOME_OPTIONS, PRACTICE_CHECKIN_OPTIONS, normalizeFollowupReview, type FollowupOutcome, type PreviousFeedbackFollowup, type StudentFollowupReview } from '@/lib/classroom-feedback/feedback-followup'
import styles from './feedback-followup.module.css'

export function TeacherFollowupReview({
  previous,
  outcome,
  onChange,
}: {
  previous?: PreviousFeedbackFollowup
  outcome?: FollowupOutcome
  onChange: (value: FollowupOutcome) => void
}) {
  if (!previous) return null
  const practiceLabel = previous.practiceCheckin
    ? PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === previous.practiceCheckin?.status)?.label
    : null
  const practiceUpdatedAt = previous.practiceCheckin?.updatedAt
    ? new Date(previous.practiceCheckin.updatedAt)
    : null
  const practiceUpdatedAtLabel = practiceUpdatedAt && !Number.isNaN(practiceUpdatedAt.getTime())
    ? practiceUpdatedAt.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <section className={styles.card} aria-label="上节课跟进回访">
      <header className={styles.header}>
        <span className={styles.eyebrow}>学习连续跟进</span>
        {previous.date && <time className={styles.date}>{new Date(previous.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</time>}
      </header>
      <p className={styles.previousFocus}>
        <strong>{previous.topic || '上节关注'}</strong>
        <span>{previous.focus || '上节没有单独设置关注项'}</span>
      </p>
      {practiceLabel && (
        <div className={styles.parentSignal} aria-label="家长练习回传">
          <div className={styles.parentSignalHeading}>
            <span>家长练习回传</span>
            <strong>{practiceLabel}</strong>
          </div>
          {practiceUpdatedAtLabel && <time className={styles.parentSignalDate}>家长反馈于 {practiceUpdatedAtLabel}</time>}
          {previous.practiceCheckin?.note && <small>{previous.practiceCheckin.note}</small>}
        </div>
      )}
      <div className={styles.reviewLabel}>本节回访 <span>选一项即可</span></div>
      <div className={styles.outcomeChoices} role="group" aria-label="选择上节关注的回访结果">
        {FOLLOWUP_OUTCOME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={outcome === option.value}
            className={`${styles.outcomeButton} ${outcome === option.value ? styles.selected : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function ParentFollowupSummary({ value }: { value: unknown }) {
  const review: StudentFollowupReview | null = normalizeFollowupReview(value)
  if (!review) return null
  const outcomeLabel = FOLLOWUP_OUTCOME_OPTIONS.find((option) => option.value === review.outcome)?.label
  const practiceLabel = review.parentPracticeStatus
    ? PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === review.parentPracticeStatus)?.label
    : null

  return (
    <section className={`${styles.card} ${styles.parentSummary}`} aria-label="上次关注回访结果">
      <header className={styles.header}>
        <span className={styles.eyebrow}>上次关注回访</span>
        {review.previousDate && <time className={styles.date}>{new Date(review.previousDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</time>}
      </header>
      {review.previousTopic && <div className={styles.topic}>{review.previousTopic}</div>}
      {review.previousFocus && <p className={styles.previousFocus}><strong>上次目标</strong><span>{review.previousFocus}</span></p>}
      <div className={styles.resultRow}>
        <span>本节结果</span>
        <strong>{outcomeLabel}</strong>
      </div>
      {practiceLabel && (
        <div className={styles.resultRow}>
          <span>家庭练习</span>
          <strong>{practiceLabel}</strong>
        </div>
      )}
      {review.parentPracticeNote && <p className={styles.parentNote}>家长补充：{review.parentPracticeNote}</p>}
    </section>
  )
}
