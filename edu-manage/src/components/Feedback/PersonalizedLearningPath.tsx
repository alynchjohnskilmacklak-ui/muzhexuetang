'use client'

import {
  buildPersonalizedLearningFallback,
  getTeacherSupportTags,
  normalizePersonalizedLearningExtension,
  type PersonalizedLearningExtension,
} from '@/lib/classroom-feedback/personalized-learning'
import { CheckCircleOutlined, MessageOutlined, ReadOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import type { KnowledgePointCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { buildParentStudyGuide } from '@/lib/classroom-feedback/parent-study-guide'
import styles from './personalized-learning-path.module.css'

const masterySteps = ['需巩固', '部分掌握', '基本掌握', '掌握扎实'] as const

type Props = {
  studentName?: string | null
  topic?: string | null
  mastery?: string | null
  performance?: string | null
  tags?: string[]
  teacherRemark?: string | null
  overallComment?: string | null
  nextLessonFocus?: string | null
  homework?: string[]
  extension?: unknown
  knowledgeCard?: KnowledgePointCard | null
  compact?: boolean
  posterMode?: boolean
}

export function PersonalizedLearningPath({
  studentName,
  topic,
  mastery,
  performance,
  tags = [],
  teacherRemark,
  overallComment,
  nextLessonFocus,
  homework = [],
  extension,
  knowledgeCard,
  compact = false,
  posterMode = false,
}: Props) {
  const normalizedExtension: PersonalizedLearningExtension | null = normalizePersonalizedLearningExtension(extension)
  const plan = normalizedExtension || buildPersonalizedLearningFallback({
    topic,
    mastery,
    tags,
    overallComment,
    nextLessonFocus,
    homework,
  })
  const supportTags = getTeacherSupportTags(tags)
  const observationTags = [...new Set(tags.filter((tag) => !supportTags.includes(tag)))].slice(0, 8)
  const guide = buildParentStudyGuide({ topic, knowledgeCard, extension: plan, homework })
  const hasHomeGuide = guide.ask.length > 0 || guide.practice.length > 0 || guide.check.length > 0
  const resolvedTopic = knowledgeCard?.topic || topic
  const displayInsight = normalizedExtension?.insight || ''
  const masteryIndex = getMasteryProgressIndex(mastery)
  const hasObservation = Boolean(observationTags.length || displayInsight || teacherRemark)
  const hasFollowup = Boolean(plan?.focus || supportTags.length || nextLessonFocus || plan?.nextLessonFollowup)
  const followupNumber = hasObservation ? '02' : '01'
  const guideNumber = String((hasObservation ? 1 : 0) + (hasFollowup ? 1 : 0) + 1).padStart(2, '0')
  const hasLearningSnapshot = Boolean(
    mastery || performance || teacherRemark || displayInsight || plan?.focus || nextLessonFocus ||
    observationTags.length || supportTags.length,
  )
  const moodFace = getLearningMoodFace([mastery, performance, ...tags].filter(Boolean).join(' '))
  const moodLabel = performance || mastery || '本节学习状态'

  if (!plan && !hasLearningSnapshot) return null

  return (
    <section
      className={`${styles.plan} ${compact ? styles.compact : ''} ${posterMode ? styles.posterProfile : ''}`}
      aria-label={posterMode ? '孩子本节学情与家庭巩固建议' : '孩子本节学情与家长陪学建议'}
    >
      <header className={`${styles.heading} ${posterMode ? styles.posterHeading : ''}`}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>本节学习画像</span>
          <h3>{studentName ? `${studentName}本节学情` : '孩子本节学情'}</h3>
          <p>{posterMode
            ? hasHomeGuide ? '结合课堂状态与知识掌握，附上在家巩固提示' : '结合本节课堂状态与老师观察整理'
            : resolvedTopic ? '结合课堂表现、重点跟进与家庭练习整理' : '将课堂观察、家庭练习与下次课跟进连在一起'}</p>
        </div>
        {posterMode && <span className={styles.posterMoodFace} role="img" aria-label={`本节状态：${moodLabel}`}>{moodFace}</span>}
        {resolvedTopic && <span className={`${styles.topic} ${posterMode ? styles.posterTopic : ''}`}>{resolvedTopic}</span>}
      </header>

      {(mastery || performance) && (
        <div className={styles.facts} aria-label="本节学习状态">
          {mastery && (
            <div className={styles.fact}>
              <span className={styles.factLabel}>知识掌握</span>
              <strong>{mastery}</strong>
              <span
                className={styles.masteryScale}
                aria-label={masteryIndex >= 0 ? `四级掌握进度：${mastery}` : '四级掌握进度'}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, minWidth: 0 }}
              >
                {masterySteps.map((step, index) => {
                  const filled = index <= masteryIndex
                  return <i
                    key={step}
                    className={filled ? styles.masteryActive : ''}
                    style={{ display: 'block', width: '100%', minWidth: 0, height: 5, borderRadius: 99, background: filled ? (posterMode ? 'var(--color-brand-gold-fill)' : 'var(--color-primary)') : 'rgba(26,18,1,.16)' }}
                  />
                })}
              </span>
            </div>
          )}
          {performance && (
            <div className={styles.fact}>
              <span className={styles.factLabel}>课堂状态</span>
              <strong>{performance}</strong>
              <span className={styles.factNote}>任课老师课堂记录</span>
            </div>
          )}
        </div>
      )}

      {hasObservation && (
        <div className={styles.observation}>
          <div className={styles.sectionTitle}><span className={styles.sectionMark}>01</span><strong>课堂观察</strong></div>
          {observationTags.length > 0 && (
            <ul className={styles.tagList} aria-label="本节表现记录">
              {observationTags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          )}
          {displayInsight && <p className={styles.insight}>{displayInsight}</p>}
          {teacherRemark && <p className={styles.remark}>{teacherRemark}</p>}
        </div>
      )}

      {hasFollowup && (
        <div className={styles.followup}>
          <div className={styles.sectionTitle}><span className={styles.sectionMark}>{followupNumber}</span><strong>接下来怎么跟进</strong></div>
          {plan?.focus && <p><b>本次重点</b><span>{plan.focus}</span></p>}
          {supportTags.length > 0 && <p><b>课堂支持</b><span>{supportTags.join(' · ')}</span></p>}
          {(plan?.nextLessonFollowup || nextLessonFocus) && <p><b>下次课</b><span>{plan?.nextLessonFollowup || nextLessonFocus}</span></p>}
        </div>
      )}

      {hasHomeGuide && (
        <div className={styles.homePlan}>
          <div className={styles.sectionTitle}><span className={styles.sectionMark}>{guideNumber}</span><strong>{posterMode ? '家庭巩固' : '家长陪学建议'}</strong></div>
          <div className={styles.guideGrid}>
            {guide.ask.length > 0 && <GuideList kind="ask" title="怎么问" hint="用孩子自己的话讲一讲" icon={<MessageOutlined />} items={guide.ask} />}
            {guide.practice.length > 0 && <GuideList kind="practice" title="怎么考 · 怎么练" hint="从讲解到动笔，逐步巩固" icon={<ReadOutlined />} items={guide.practice} />}
            {guide.check.length > 0 && <GuideList kind="check" title="怎么检查" hint="核对关键步骤与易错点" icon={<CheckCircleOutlined />} items={guide.check} />}
          </div>
        </div>
      )}
    </section>
  )
}

function getMasteryProgressIndex(mastery?: string | null) {
  const value = mastery?.trim() || ''
  if (/需巩固|待加强|薄弱|巩固/.test(value)) return 0
  if (/部分掌握|部分/.test(value)) return 1
  if (/掌握扎实|扎实/.test(value)) return 3
  if (/基本掌握|基本|掌握/.test(value)) return 2
  return masterySteps.indexOf(value as typeof masterySteps[number])
}

function getLearningMoodFace(signal: string) {
  if (/(需巩固|待加强|薄弱|易错|不熟练|掌握不牢|错误较多)/.test(signal)) return '🤔'
  if (/(掌握扎实|熟练掌握|表现积极|专注|认真|准确|主动|进步|优秀)/.test(signal)) return '😄'
  if (/(部分掌握|基本掌握|初步|理解中|一般)/.test(signal)) return '🙂'
  return '😊'
}

function GuideList({
  kind,
  title,
  hint,
  icon,
  items,
}: {
  kind: 'ask' | 'practice' | 'check'
  title: string
  hint: string
  icon: ReactNode
  items: string[]
}) {
  return (
    <div className={`${styles.guideBlock} ${styles[`guide${kind[0].toUpperCase()}${kind.slice(1)}`]}`}>
      <div className={styles.guideHeader}>
        <span className={styles.guideIcon} aria-hidden="true">{icon}</span>
        <span className={styles.guideTitleGroup}>
          <strong>{title}</strong>
          <small>{hint}</small>
        </span>
        <span className={styles.guideCount}>{items.length} 项</span>
      </div>
      <ol>{items.map((item, index) => (
        <li key={`${title}-${index}`}>
          <span className={styles.guideNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <p>{item}</p>
        </li>
      ))}</ol>
    </div>
  )
}
