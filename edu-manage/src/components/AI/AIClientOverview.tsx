'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './AIClientOverview.module.css'

export type AIClientRole = 'parent' | 'teacher' | 'admin'

export interface AIOverviewAction {
  href: string
  icon: React.ReactNode
  label: string
  description: string
}

export interface AIQuestionGroup {
  title: string
  questions: string[]
}

interface AIClientOverviewProps {
  role: AIClientRole
  eyebrow: string
  title: string
  description: string
  capabilities: string[]
  actionsTitle: string
  actions: AIOverviewAction[]
  questionGroups: AIQuestionGroup[]
  onAskQuestion: (question: string) => void
}

export function AIClientOverview({
  role,
  eyebrow,
  title,
  description,
  capabilities,
  actionsTitle,
  actions,
  questionGroups,
  onAskQuestion,
}: AIClientOverviewProps) {
  const [activeQuestionGroup, setActiveQuestionGroup] = useState(0)
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const questions = questionGroups[activeQuestionGroup] || questionGroups[0] || { title: '快捷提问', questions: [] }
  const visibleQuestions = showAllQuestions ? questions.questions : questions.questions.slice(0, 3)

  return (
    <section className={`${styles.overview} ${styles[role]}`} aria-label={`${eyebrow} AI 助手说明`}>
      <div className={styles.hero}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark} aria-hidden="true">AI</span>
          <span className={styles.eyebrow}>{eyebrow}</span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <ul className={styles.capabilities} aria-label="AI 助手擅长的内容">
          {capabilities.map((capability) => <li key={capability}>{capability}</li>)}
        </ul>
      </div>

      <div className={styles.actionsSection}>
        <div className={styles.actionsHeading}>
          <h2>{actionsTitle}</h2>
          <span>直达系统功能</span>
        </div>
        <nav className={styles.actionsGrid} aria-label={actionsTitle}>
          {actions.map((action) => (
            <Link className={styles.action} href={action.href} key={action.href}>
              <span className={styles.actionIcon} aria-hidden="true">{action.icon}</span>
              <span className={styles.actionCopy}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionDescription}>{action.description}</span>
              </span>
              <span className={styles.actionArrow} aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.questionsSection}>
        <div className={styles.actionsHeading}>
          <h2>快捷提问</h2>
          <span>点击后直接进入 AI 对话</span>
        </div>
        {questionGroups.length > 1 && (
          <div className={styles.questionCategories} role="tablist" aria-label="快捷提问分类">
            {questionGroups.map((group, index) => {
              const selected = activeQuestionGroup === index
              return (
                <button
                  key={group.title}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setActiveQuestionGroup(index)
                    setShowAllQuestions(false)
                  }}
                >
                  {group.title}
                </button>
              )
            })}
          </div>
        )}
        <div className={styles.questionGrid}>
          {visibleQuestions.map((question) => (
            <button
              className={styles.question}
              key={question}
              type="button"
              onClick={() => onAskQuestion(question)}
            >
              {question}
            </button>
          ))}
        </div>
        {questions.questions.length > 3 && (
          <button
            className={styles.moreQuestions}
            type="button"
            aria-expanded={showAllQuestions}
            onClick={() => setShowAllQuestions((value) => !value)}
          >
            {showAllQuestions ? '收起问题 ▲' : `更多问题（${questions.questions.length - 3}）⌄`}
          </button>
        )}
      </div>
    </section>
  )
}
