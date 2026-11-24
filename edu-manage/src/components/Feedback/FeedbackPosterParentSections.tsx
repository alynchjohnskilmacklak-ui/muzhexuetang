import {
  CheckCircleOutlined,
  MessageOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import {
  FOLLOWUP_OUTCOME_OPTIONS,
  normalizeFollowupReview,
  normalizePracticeCheckin,
  PRACTICE_CHECKIN_OPTIONS,
} from '@/lib/classroom-feedback/feedback-followup'
import type { KnowledgeProgressEntry } from '@/lib/classroom-feedback/knowledge-progress'
import { KnowledgeProgressTrend } from './KnowledgeProgressTrend'
import styles from './feedback-poster-parent-sections.module.css'

export function FeedbackPosterParentSections({
  knowledgeProgressEntries,
  practiceCheckin,
  followupReview,
}: {
  knowledgeProgressEntries: KnowledgeProgressEntry[]
  practiceCheckin: unknown
  followupReview: unknown
}) {
  const checkin = normalizePracticeCheckin(practiceCheckin)
  const review = normalizeFollowupReview(followupReview)
  const practiceLabel = checkin
    ? PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === checkin.status)?.label
    : null
  const reviewOutcome = review
    ? FOLLOWUP_OUTCOME_OPTIONS.find((option) => option.value === review.outcome)?.label
    : null

  return (
    <div className={styles.stack}>
      <KnowledgeProgressTrend entries={knowledgeProgressEntries} />

      {review && (
        <section className={styles.card} aria-label="上次关注回访">
          <header className={styles.heading}>
            <span className={styles.icon}><ReadOutlined /></span>
            <div>
              <strong>上次关注回访</strong>
              <small>{review.previousDate ? new Date(review.previousDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '学习连续跟进'}</small>
            </div>
          </header>
          {review.previousTopic && <div className={styles.topic}>{review.previousTopic}</div>}
          {review.previousFocus && (
            <div className={styles.reviewFocus}>
              <span>上次目标</span>
              <p>{review.previousFocus}</p>
            </div>
          )}
          <div className={styles.reviewResult}>
            <span>本节跟进结果</span>
            <strong>{reviewOutcome}</strong>
          </div>
          {review.parentPracticeStatus && (
            <div className={styles.reviewResult}>
              <span>上次家庭练习</span>
              <strong>{PRACTICE_CHECKIN_OPTIONS.find((option) => option.value === review.parentPracticeStatus)?.label}</strong>
            </div>
          )}
        </section>
      )}

      <section className={styles.card} aria-label="家庭练习回传">
        <header className={styles.heading}>
          <span className={styles.icon}><CheckCircleOutlined /></span>
          <div>
            <strong>家庭练习回传</strong>
            <small>{checkin?.updatedAt ? '家长已同步练习情况' : '家长可将练习情况同步给任课老师'}</small>
          </div>
        </header>
        <div className={styles.options} aria-label="家长可选择的练习状态">
          {PRACTICE_CHECKIN_OPTIONS.map((option) => (
            <span
              key={option.value}
              className={`${styles.option} ${checkin?.status === option.value ? styles.selected : ''}`}
            >
              {checkin?.status === option.value && <CheckCircleOutlined aria-hidden="true" />}
              {option.label}
            </span>
          ))}
        </div>
        <p className={styles.privacyNote}>
          {practiceLabel
            ? `本次回传：${practiceLabel} · 老师可结合反馈安排后续跟进`
            : '练习状态可在家长端一键回传，帮助老师了解课后巩固情况。'}
        </p>
      </section>
    </div>
  )
}

export function FeedbackPosterCommunication({
  parentReply,
  teacherReply,
  replyTime,
  teacherReplyTime,
  teacherName,
}: {
  parentReply: string | null
  teacherReply: string | null
  replyTime: string | null
  teacherReplyTime: string | null
  teacherName: string
}) {
  return (
    <section className={styles.card} aria-label="家校沟通记录">
      <header className={styles.heading}>
        <span className={styles.icon}><MessageOutlined /></span>
        <div>
          <strong>家校沟通记录</strong>
          <small>反馈、练习与课堂跟进保持连贯</small>
        </div>
      </header>
      {parentReply?.trim() ? (
        <div className={`${styles.message} ${styles.parentMessage}`}>
          <div className={styles.messageMeta}>家长反馈{replyTime ? ` · ${formatMessageDate(replyTime)}` : ''}</div>
          <p>{parentReply.trim()}</p>
        </div>
      ) : (
        <p className={styles.communicationHint}>家长可在反馈页向老师留言，交流孩子的练习情况与学习疑问。</p>
      )}
      {teacherReply?.trim() && (
        <div className={`${styles.message} ${styles.teacherMessage}`}>
          <div className={styles.messageMeta}>{teacherName}老师{teacherReplyTime ? ` · ${formatMessageDate(teacherReplyTime)}` : ''}</div>
          <p>{teacherReply.trim()}</p>
        </div>
      )}
    </section>
  )
}

function formatMessageDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
