'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  RotateLeftOutlined,
  SoundOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import type { VocabQuestion, VocabSubmissionResult } from './types'
import styles from '../vocab.module.css'
import { getTiltSurfacePosition } from '@/lib/ui-motion'
import { playEnglishAudio, stopEnglishAudio } from '@/lib/english-audio'

interface DeckSessionProps {
  questions: VocabQuestion[]
  scope: 'new' | 'review'
  unit: string | null
  onFinish: (results: VocabSubmissionResult[]) => void
  onQuit: () => void
}

export function DeckSession({ questions, scope, unit, onFinish, onQuit }: DeckSessionProps) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [practiceRevealed, setPracticeRevealed] = useState(false)
  const [results, setResults] = useState<VocabSubmissionResult[]>([])
  const [phoneticMap, setPhoneticMap] = useState<Record<string, string>>({})
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const question = questions[index]

  // 动态自动补齐当前词汇的权威英美双音标
  useEffect(() => {
    if (!question) return
    const word = question.headword
    if (question.phonetic) {
      setPhoneticMap((prev) => (prev[word] ? prev : { ...prev, [word]: question.phonetic! }))
      return
    }
    if (phoneticMap[word]) return

    fetch(`/api/vocab/phonetic?word=${encodeURIComponent(word)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.uk || data?.us) {
          setPhoneticMap((prev) => ({ ...prev, [word]: data.uk || data.us }))
        }
      })
      .catch(() => {})
  }, [question, phoneticMap])

  // 播放当前单词标准真人读音
  const handlePlayWord = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!question) return
    setIsPlayingAudio(true)
    await playEnglishAudio(question.headword)
    setIsPlayingAudio(false)
  }

  // 切换题目时自动轻量领读（英选中国际规范教学法）
  useEffect(() => {
    stopEnglishAudio()
    if (question && question.mode === 'en-to-cn') {
      const timer = setTimeout(() => {
        playEnglishAudio(question.headword)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [question])

  if (!question) return null
  const expansion = question.expansion

  const isLast = index === questions.length - 1
  const answered = feedback !== null

  const choose = (optionIndex: number) => {
    if (answered) return
    const correct = optionIndex === question.answerIndex
    setSelected(optionIndex)
    setFeedback(correct ? 'correct' : 'wrong')
    // 答错时自动 3D 翻面，直观展示正确释义与例句；答对时保持正面并浮现成功高亮
    if (!correct) {
      setFlipped(true)
    }
    setResults((prev) => [
      ...prev,
      {
        wordId: question.wordId,
        mode: question.mode,
        selected: question.options[optionIndex],
      },
    ])
  }

  const next = () => {
    if (!answered) return
    if (isLast) {
      onFinish(results)
      return
    }
    setIndex((prev) => prev + 1)
    setSelected(null)
    setFeedback(null)
    setFlipped(false)
    setPracticeRevealed(false)
  }

  const toggleFlip = () => {
    setFlipped((prev) => !prev)
  }

  const optionClass = (optionIndex: number) => {
    if (!answered) return styles.optionBtn
    if (optionIndex === question.answerIndex) return `${styles.optionBtn} ${styles.optionCorrect}`
    if (optionIndex === selected) return `${styles.optionBtn} ${styles.optionWrong}`
    return `${styles.optionBtn} ${styles.optionMuted}`
  }

  return (
    <div className={`${styles.studySession} ${answered ? styles.studySessionAnswered : ''}`}>
      {/* 沉浸顶栏：退出、进度条与题号 */}
      <div className={styles.studyHeader}>
        <button type="button" className={styles.studyExit} onClick={onQuit} aria-label="退出练习">
          <CloseOutlined />
        </button>
        <div className={styles.studyProgressGroup}>
          <div className={styles.studyHeaderMeta}>
            <span className={styles.studyHeaderTitle}>
              {scope === 'review' ? '复习' : '新学'} · {unit ?? '全部单元'}
            </span>
            <span className={styles.studyHeaderCounter}>
              <strong>{index + 1}</strong> / {questions.length}
            </span>
          </div>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-label="练习进度"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={index + (answered ? 1 : 0)}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 核心舞台：3D 翻转卡片（P14 透视翻转 + P01 光影倾斜 + P23 防穿帮，原位翻转零高度跳动） */}
      <div className={styles.flipHeroScene}>
        <div
          className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}
          onClick={toggleFlip}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleFlip()
            }
          }}
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={`${question.headword}，${flipped ? '点击翻回正面' : '点击翻转查看完整释义'}`}
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
          {/* 正面：探索测验面 */}
          <div className={`${styles.flipFace} ${styles.flipFront}`}>
            <div className={styles.flipTopRow}>
              <span className={styles.modePill}>
                {question.mode === 'en-to-cn' ? '英 → 中' : '中 → 英'}
              </span>
              <span className={styles.flipCue}>
                <SwapOutlined /> 点击翻转释义
              </span>
            </div>

            <div className={styles.flipCenterContent}>
              {question.mode === 'en-to-cn' ? (
                <>
                  <div className={styles.deckWord}>
                    <span>{question.headword}</span>
                    <button
                      type="button"
                      onClick={handlePlayWord}
                      style={{
                        marginLeft: 10,
                        background: isPlayingAudio ? '#DCFCE7' : 'rgba(20, 87, 77, 0.08)',
                        border: isPlayingAudio ? '1px solid #10B981' : '1px solid rgba(20, 87, 77, 0.18)',
                        color: isPlayingAudio ? '#047857' : '#14574D',
                        borderRadius: 999,
                        padding: '2px 9px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        verticalAlign: 'middle',
                        transition: 'all 0.18s ease',
                      }}
                      title="收听纯正真人原声发音"
                    >
                      <SoundOutlined />
                      <span>{isPlayingAudio ? '朗读中' : '领读'}</span>
                    </button>
                  </div>
                  <div className={styles.deckPhoneticRow}>
                    {(question.phonetic || phoneticMap[question.headword]) && (
                      <span className={styles.deckPhonetic}>
                        {question.phonetic || phoneticMap[question.headword]}
                      </span>
                    )}
                    {question.pos && <span className={styles.deckPosTag}>{question.pos}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.deckMeaningPrompt}>{question.prompt}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                    {question.pos && <span className={styles.deckPosTag}>{question.pos}</span>}
                    {answered && (
                      <button
                        type="button"
                        onClick={handlePlayWord}
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
                        <SoundOutlined /> 领读 {question.headword}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className={styles.flipBottomRow}>
              {answered ? (
                feedback === 'correct' ? (
                  <span className={styles.flipStatusSuccess}>
                    <CheckCircleOutlined /> 正确掌握 · 点击卡片查看例句
                  </span>
                ) : (
                  <span className={styles.flipStatusDanger}>
                    <CloseCircleOutlined /> 点击卡片查看正确答案
                  </span>
                )
              ) : (
                <span className={styles.flipInstruction}>从下方选择正确答案 · 点击卡片随时偷看释义</span>
              )}
            </div>
          </div>

          {/* 背面：深度释义与记忆解析面（防穿帮温暖纸质感） */}
          <div className={`${styles.flipFace} ${styles.flipBack}`}>
            <div className={styles.flipTopRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.deckBackHeader}>
                  <strong>{question.headword}</strong>
                  {question.pos ? ` · ${question.pos}` : ''}
                </span>
                <button
                  type="button"
                  onClick={handlePlayWord}
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
                  title="收听纯正真人原声发音"
                >
                  <SoundOutlined /> 领读
                </button>
              </div>
              <span className={styles.flipCue}>
                <RotateLeftOutlined /> 翻回正面
              </span>
            </div>

            <div className={styles.flipCenterContent}>
              <div className={styles.deckMeaningsList}>
                {question.meanings.join('；')}
              </div>
              {(question.phonetic || phoneticMap[question.headword]) && (
                <div className={styles.deckBackPhonetic}>
                  发音：{question.phonetic || phoneticMap[question.headword]}
                </div>
              )}
              {question.note && (
                <div className={styles.deckNoteBox}>
                  <strong>单元出处：</strong>{question.note}
                </div>
              )}
            </div>

            <div className={styles.flipBottomRow}>
              <span className={styles.flipBackFooterHint}>
                {answered && feedback === 'wrong' ? '已标记为错词加入复习池 · 巩固记忆' : '轻触任意位置翻回正面'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 选项测验区（精致 2x2 弹性网格，高度固定，按压回弹） */}
      <div className={styles.optionsArea}>
        <div className={styles.optionsGrid}>
          {question.options.map((option, optionIndex) => (
            <button
              key={`${question.wordId}-${optionIndex}`}
              type="button"
              className={optionClass(optionIndex)}
              disabled={answered}
              aria-pressed={selected === optionIndex}
              onClick={() => choose(optionIndex)}
            >
              <span className={styles.optionIndexChar}>{String.fromCharCode(65 + optionIndex)}</span>
              <span className={styles.optionText}>{option}</span>
              {answered && optionIndex === question.answerIndex && (
                <CheckCircleOutlined className={styles.optionIndicator} aria-hidden="true" />
              )}
              {answered && optionIndex === selected && feedback === 'wrong' && (
                <CloseCircleOutlined className={styles.optionIndicator} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>

      {answered && expansion && (
        <section className={styles.expansionPanel} aria-label={`${question.headword} 词语拓展`} aria-live="polite">
          <div className={styles.expansionPanelHeader}>
            <h2>词语拓展</h2>
            <span>{question.headword} · 用法与语境</span>
          </div>

          <div className={styles.expansionRows}>
            <div className={styles.expansionRow}>
              <h3 className={styles.expansionLabel}>能力关联</h3>
              <div className={styles.expansionTags}>
                {expansion.examTags.map((tag) => {
                  const cleanTag = tag.replace(/[。；;]+$/, '')
                  return <span key={tag}>{cleanTag}</span>
                })}
              </div>
            </div>

            <div className={styles.expansionRow}>
              <h3 className={styles.expansionLabel}>词形语法</h3>
              <p className={styles.expansionText}>{expansion.grammar}</p>
            </div>

            <div className={styles.expansionRow}>
              <h3 className={styles.expansionLabel}>常用搭配</h3>
              <p className={styles.expansionText}>{expansion.collocations}</p>
            </div>

            <div className={`${styles.expansionRow} ${styles.expansionMistake}`}>
              <h3 className={styles.expansionLabel}>易错提醒</h3>
              <p className={styles.expansionText}>{expansion.commonMistake}</p>
            </div>

            <div className={styles.expansionRow}>
              <h3 className={styles.expansionLabel}>例句</h3>
              <div className={styles.expansionExample}>
                <p>{expansion.example.english}</p>
                <span>{expansion.example.chinese}</span>
              </div>
            </div>

            <div className={`${styles.expansionRow} ${styles.expansionPractice}`}>
              <h3 className={styles.expansionLabel}>练一练</h3>
              <div className={styles.expansionPracticeBody}>
                <p>{expansion.application.prompt}</p>
                {practiceRevealed ? (
                  <div className={styles.expansionSolution}>
                    <strong>答案与解析</strong>
                    <p>{expansion.application.solution}</p>
                  </div>
                ) : (
                  <button type="button" className={styles.expansionRevealButton} onClick={() => setPracticeRevealed(true)}>
                    查看答案与解析
                  </button>
                )}
              </div>
            </div>

            {expansion.sources.length > 0 && (
              <div className={styles.expansionRow}>
                <h3 className={styles.expansionLabel}>参考依据</h3>
                <div className={styles.expansionSources}>
                  {expansion.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className={styles.expansionDisclaimer}>能力关联用于指引复习，不代表该词属于高频或必考词；练习为原创语境题。</p>
        </section>
      )}

      {/* 底部悬浮操作栏（贴心安全区，大尺寸拇指触控，避开边缘小红点） */}
      <div className={styles.studyActionBar}>
        <div className={styles.studyFeedbackMessage}>
          {answered ? (
            feedback === 'correct' ? (
              <span className={styles.feedbackCorrectBadge}>
                <CheckCircleOutlined /> 回答正确
              </span>
            ) : (
              <span className={styles.feedbackWrongBadge}>
                <CloseCircleOutlined /> 答错了，卡片已展示释义
              </span>
            )
          ) : (
            <span className={styles.feedbackWaitingTip}>
              点击卡片翻转 ↻ 或直接点选答案
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.nextQuestionBtn}
          onClick={next}
          disabled={!answered}
        >
          <span>{isLast ? '完成练习' : '下一题'}</span>
          <ArrowRightOutlined />
        </button>
      </div>

    </div>
  )
}
