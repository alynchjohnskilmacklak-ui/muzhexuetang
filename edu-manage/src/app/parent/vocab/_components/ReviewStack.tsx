'use client'

import { useState } from 'react'
import { CheckOutlined, CloseOutlined, RotateLeftOutlined, SoundOutlined } from '@ant-design/icons'
import type { VocabQuestion } from './types'
import styles from '../vocab.module.css'
import { getTiltSurfacePosition } from '@/lib/ui-motion'
import { playEnglishAudio } from '@/lib/english-audio'

interface ReviewStackProps {
  questions: VocabQuestion[]
  onDone: () => void
  onQuit: () => void
}

export function ReviewStack({ questions, onDone, onQuit }: ReviewStackProps) {
  const [index, setIndex] = useState(0)
  const [exit, setExit] = useState<'left' | 'right' | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [stackExpanded, setStackExpanded] = useState(false)

  const current = questions[index]
  const remaining = questions.slice(index)

  const dismiss = (direction: 'left' | 'right') => {
    if (exit) return
    setExit(direction)
    setStackExpanded(false)
    const advance = () => {
      const nextIndex = index + 1
      setExit(null)
      setFlipped(false)
      if (nextIndex >= questions.length) {
        onDone()
      } else {
        setIndex(nextIndex)
      }
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      advance()
      return
    }
    window.setTimeout(advance, 320)
  }

  if (!current) return null

  return (
    <div className={styles.reviewSession}>
      <div className={styles.studyHeader}>
        <button type="button" className={styles.studyExit} onClick={onQuit} disabled={exit !== null} aria-label="退出复习">
          <CloseOutlined />
        </button>
        <div className={styles.studyProgressGroup}>
          <div className={styles.studyHeaderMeta}>
            <span>复习卡片</span>
            <span>{index + 1} / {questions.length}</span>
          </div>
          <div className={styles.progressBar} role="progressbar" aria-label="复习进度" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index}>
            <div className={styles.progressFill} style={{ width: `${(index / questions.length) * 100}%` }} />
          </div>
        </div>
        {remaining.length > 1 && (
          <button type="button" className={styles.stackToggle} aria-expanded={stackExpanded} onClick={() => setStackExpanded((expanded) => !expanded)}>
            {stackExpanded ? '收起卡组' : `展开 ${Math.min(remaining.length, 3)} 张`}
          </button>
        )}
      </div>

      <div className={styles.reviewMain}>
        <div className={`${styles.stackWrap}${stackExpanded ? ` ${styles.stackExpanded}` : ''}`}>
          {remaining.slice(0, 3).map((question, offset) => {
            const isTop = offset === 0
            const exitClass = isTop && exit === 'left' ? styles.exitLeft : isTop && exit === 'right' ? styles.exitRight : ''
            return (
              <div
                key={question.wordId}
                className={`${styles.stackCard} ${exitClass}`}
                style={{ order: offset, '--stack-depth': offset } as React.CSSProperties}
              >
                <div className={styles.flipScene} style={{ maxWidth: '100%', aspectRatio: '3 / 2' }}>
                  <div
                    className={`${styles.flipCard} ${isTop && flipped ? styles.flipped : ''}`}
                    onClick={() => isTop && setFlipped((value) => !value)}
                    onKeyDown={(event) => {
                      if (isTop && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        setFlipped((value) => !value)
                      }
                    }}
                    role={isTop ? 'button' : undefined}
                    tabIndex={isTop ? 0 : -1}
                    aria-pressed={isTop ? flipped : undefined}
                    aria-label={isTop ? `${question.headword}，${flipped ? '查看单词' : '翻转查看释义'}` : undefined}
                    onPointerMove={(event) => {
                      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
                      const position = getTiltSurfacePosition(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), 2.5)
                      event.currentTarget.classList.add(styles.lit)
                      event.currentTarget.style.setProperty('--card-light-x', `${position.lightX}%`)
                      event.currentTarget.style.setProperty('--card-light-y', `${position.lightY}%`)
                    }}
                    onPointerLeave={(event) => {
                      event.currentTarget.classList.remove(styles.lit)
                      event.currentTarget.style.setProperty('--card-light-x', '50%')
                      event.currentTarget.style.setProperty('--card-light-y', '50%')
                    }}
                    onPointerCancel={(event) => {
                      event.currentTarget.classList.remove(styles.lit)
                      event.currentTarget.style.setProperty('--card-light-x', '50%')
                      event.currentTarget.style.setProperty('--card-light-y', '50%')
                    }}
                  >
                    <div className={`${styles.flipFace} ${styles.flipFront}`}>
                      <div className={styles.flipWord} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span>{question.headword}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playEnglishAudio(question.headword)
                          }}
                          style={{
                            background: 'rgba(20, 87, 77, 0.08)',
                            border: '1px solid rgba(20, 87, 77, 0.18)',
                            color: '#14574D',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <SoundOutlined /> 领读
                        </button>
                      </div>
                      <div className={styles.flipHint}>
                        {question.phonetic ? `${question.phonetic} · ` : ''}{question.pos} · 点击翻转
                      </div>
                    </div>
                    <div className={`${styles.flipFace} ${styles.flipBack}`}>
                      <div className={styles.flipMeaning}>{question.meanings.join('；')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.stackActions}>
        <button type="button" className={styles.ghostBtn} onClick={() => dismiss('left')} disabled={exit !== null}>
          <CloseOutlined /> 还不熟
        </button>
        <button type="button" className={styles.primaryBtn} onClick={() => dismiss('right')} disabled={exit !== null}>
          <CheckOutlined /> 认识了
        </button>
      </div>
      <div className={styles.stackHint}><RotateLeftOutlined /> 点击卡片翻转释义；划走后下一张自动补到顶部</div>
    </div>
  )
}
