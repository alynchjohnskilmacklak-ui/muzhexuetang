'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Select, message } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined, HistoryOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { readParentChildPreference, rememberParentChild } from '@/lib/parent-child-preference'
import { PracticeBank } from '../materials/PracticeBank'
import { MathText } from '../materials/MathText'
import type { PracticeQuestionSnapshot } from '@/lib/practice-bank'
import styles from './practice.module.css'
import { reportImagePerformance } from '@/lib/client-performance'

type Child = { id: string; name: string; grade: string | null; membershipLevel?: string | null }
type SavedResult = { score: number; total: number; wrongIds: string[]; finishedAt: string; answers?: Record<string, number> | null; title?: string }
type PracticeAttempt = SavedResult & { id: string; setId: string; questionSnapshot?: PracticeQuestionSnapshot[] | null }
type PracticeAttemptStats = { totalAttempts: number; totalQuestions: number; totalCorrect: number; totalWrong: number }
type PracticeEntryContext = { fromFeedback: boolean; childId: string; subject: string; topics: string[] }

export default function ParentPracticePage() {
  const [children, setChildren] = useState<Child[]>([])
  const [activeChildId, setActiveChildId] = useState('')
  const [savedResults, setSavedResults] = useState<Record<string, SavedResult>>({})
  const [attemptStats, setAttemptStats] = useState<PracticeAttemptStats | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[]>([])
  const [attemptHistoryEnabled, setAttemptHistoryEnabled] = useState(false)
  const [nextAttemptPage, setNextAttemptPage] = useState<number | null>(null)
  const [loadingMoreAttempts, setLoadingMoreAttempts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [childrenError, setChildrenError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('practice')
  const [openRecord, setOpenRecord] = useState<string | null>(null)
  const [inPracticeSession, setInPracticeSession] = useState(false)
  const [entryContext, setEntryContext] = useState<PracticeEntryContext | null>(null)
  const resultsRequest = useRef(0)

  useEffect(() => {
    document.body.classList.toggle('practice-focus-mode', inPracticeSession)
    return () => document.body.classList.remove('practice-focus-mode')
  }, [inPracticeSession])

  // 加载孩子信息
  useEffect(() => {
    const loadChildren = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const requestedId = params.get('childId') || readParentChildPreference()
        const res = await fetch(`/api/parent/children${requestedId ? `?childId=${encodeURIComponent(requestedId)}` : ''}`)
        if (!res.ok) throw new Error('加载失败')
        const data = await res.json()
        const students: Child[] = data.children || []
        setChildren(students)
        const selected = students.find((child) => child.id === data.activeChildId) || students[0]
        const selectedId = selected?.id || ''
        setActiveChildId(selectedId)
        if (data.invalidChild) {
          message.warning('未找到所选孩子，已切换到已关联的孩子')
          for (const key of ['source', 'subject', 'topic', 'point']) params.delete(key)
          setEntryContext(null)
        } else if (selectedId && params.get('source') === 'feedback') {
          const topics = [...new Set([
            params.get('topic'), ...params.getAll('point'),
          ].map((topic) => topic?.trim()).filter((topic): topic is string => Boolean(topic)))].slice(0, 6)
          setEntryContext({ fromFeedback: true, childId: selectedId, subject: params.get('subject') || '', topics })
        }
        if (selected) rememberParentChild(selected.id, selected.membershipLevel)
        if (selectedId) params.set('childId', selectedId)
        else params.delete('childId')
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
      } catch {
        setChildrenError('孩子信息暂时无法读取，请检查登录状态或网络后重新加载')
        message.error('孩子信息加载失败，请刷新页面后重试')
      } finally {
        setLoading(false)
      }
    }
    loadChildren()
  }, [])

  // 加载做题记录
  const loadResults = useCallback(async (childId: string) => {
    if (!childId) {
      setResultsLoading(false)
      return
    }
    const requestId = ++resultsRequest.current
    setResultsLoading(true)
    setResultsError(null)
    try {
      const res = await fetch(`/api/parent/practice-results?studentId=${encodeURIComponent(childId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '加载失败')
      if (requestId === resultsRequest.current) {
        setSavedResults(data.results || {})
        setAttemptStats(data.attemptStats && typeof data.attemptStats.totalQuestions === 'number'
          ? data.attemptStats as PracticeAttemptStats
          : null)
        setPracticeAttempts(Array.isArray(data.attempts) ? data.attempts : [])
        setAttemptHistoryEnabled(data.attemptHistoryEnabled === true)
        setNextAttemptPage(typeof data.nextPage === 'number' ? data.nextPage : null)
      }
    } catch (error) {
      if (requestId === resultsRequest.current) {
        setResultsError(error instanceof Error ? error.message : '练习记录暂时无法读取，概况和历史可能不完整')
        message.error('练习记录加载失败，请稍后重试')
      }
    } finally {
      if (requestId === resultsRequest.current) setResultsLoading(false)
    }
  }, [])

  useEffect(() => {
    setSavedResults({})
    setAttemptStats(null)
    setResultsError(null)
    setResultsLoading(Boolean(activeChildId))
    setPracticeAttempts([])
    setAttemptHistoryEnabled(false)
    setNextAttemptPage(null)
    setLoadingMoreAttempts(false)
    setOpenRecord(null)
    void loadResults(activeChildId)
    return () => { resultsRequest.current += 1 }
  }, [activeChildId, loadResults])

  useEffect(() => {
    const refresh = () => { if (!inPracticeSession) void loadResults(activeChildId) }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh) }
  }, [activeChildId, inPracticeSession, loadResults])

  const loadMoreAttempts = useCallback(async () => {
    if (!activeChildId || nextAttemptPage === null || loadingMoreAttempts) return
    const requestId = resultsRequest.current
    const requestedChildId = activeChildId
    setLoadingMoreAttempts(true)
    try {
      const params = new URLSearchParams({ studentId: requestedChildId, page: String(nextAttemptPage) })
      const res = await fetch(`/api/parent/practice-results?${params.toString()}`)
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()
      if (requestId !== resultsRequest.current) return
      const incoming: PracticeAttempt[] = Array.isArray(data.attempts) ? data.attempts : []
      setPracticeAttempts((current) => {
        const knownIds = new Set(current.map((attempt) => attempt.id))
        return [...current, ...incoming.filter((attempt) => !knownIds.has(attempt.id))]
      })
      setNextAttemptPage(typeof data.nextPage === 'number' ? data.nextPage : null)
    } catch {
      if (requestId === resultsRequest.current) message.error('更早的练习记录加载失败，请稍后重试')
    } finally {
      if (requestId === resultsRequest.current) setLoadingMoreAttempts(false)
    }
  }, [activeChildId, loadingMoreAttempts, nextAttemptPage])

  const selectChild = (childId: string) => {
    const selected = children.find(child => child.id === childId)
    if (!selected) return
    setActiveChildId(childId)
    rememberParentChild(childId, selected.membershipLevel)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', childId)
    if (entryContext?.childId && entryContext.childId !== childId) {
      setEntryContext(null)
      params.delete('source')
      params.delete('subject')
      params.delete('topic')
      params.delete('point')
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }

  const activeChild = children.find(c => c.id === activeChildId)
  const currentGrade = activeChild?.grade ? normalizeTextbookGrade(activeChild.grade) : '初一'

  // 统计数据
  const stats = useMemo(() => {
    const results = Object.values(savedResults)
    const totalSets = results.length
    const latestWrongCount = results.reduce((sum, r) => sum + r.wrongIds.length, 0)
    const totalQuestions = attemptStats?.totalQuestions ?? 0
    const totalCorrect = attemptStats?.totalCorrect ?? 0
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    return {
      totalSets,
      totalQuestions,
      totalCorrect,
      latestWrongCount,
      accuracy,
    }
  }, [attemptStats, savedResults])

  // 做题历史
  const history = useMemo(() => {
    // 兼容迁移尚未完成的环境：此时仍展示每个题组的最新旧记录。
    const source: PracticeAttempt[] = practiceAttempts.length > 0
      ? practiceAttempts
      : Object.entries(savedResults).map(([setId, result]) => ({
          id: `legacy:${setId}`,
          setId,
          ...result,
          questionSnapshot: null,
        }))

    return source
      .map((attempt) => ({ ...attempt, title: attempt.title || attempt.setId }))
      .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
  }, [practiceAttempts, savedResults])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>
  }

  if (!children.length) {
    if (childrenError) return <div className={styles.page} role="alert" style={{ padding: 24 }}>
      <p>{childrenError}</p><button type="button" onClick={() => window.location.reload()}>重新加载</button>
    </div>
    return <div className={styles.page} role="status" style={{ padding: 24 }}>暂无已关联的孩子，关联学员后即可查看专属练习记录。</div>
  }

  return (
    <div className={`${styles.page} ${inPracticeSession ? styles.sessionPage : ''}`}>
      {/* 顶部头部 */}
      {!inPracticeSession && <div className={styles.header}>
        <div>
          <h1 className={styles.title}>题库练习</h1>
          <p className={styles.subtitle}>选学科和章节，随时练一小节</p>
        </div>
        {children.length > 1 && (
          <Select
            value={activeChildId}
            onChange={selectChild}
            className={styles.childSelect}
            size="large"
            aria-label="选择练习的孩子"
            options={children.map(c => ({ label: `${c.name} · ${c.grade || ''}`, value: c.id }))}
          />
        )}
      </div>}

      {/* 统计卡片 */}
      {!inPracticeSession && resultsError && (
        <div className={styles.recordNotice} role="alert">
          <span>{resultsError}，不会把读取失败误显示成“尚无记录”。</span>
          <button type="button" onClick={() => void loadResults(activeChildId)} disabled={resultsLoading}>
            {resultsLoading ? '正在重试…' : '重新加载'}
          </button>
        </div>
      )}
      {!inPracticeSession && !resultsError && resultsLoading && <p className={styles.recordLoading} role="status">正在同步练习记录…</p>}
      {!inPracticeSession && <div className={styles.statsGrid} aria-label="练习概况">
        <div className={styles.statCard}><span className={styles.statValue}>{resultsError || resultsLoading ? '—' : stats.totalSets}</span><span className={styles.statLabel}>已练小节</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>{resultsError || resultsLoading ? '—' : stats.totalQuestions}</span><span className={styles.statLabel}>累计作答</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>{resultsError || resultsLoading || !stats.totalQuestions ? '—' : `${stats.accuracy}%`}</span><span className={styles.statLabel}>累计正确率</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>{resultsError || resultsLoading ? '—' : stats.latestWrongCount}</span><span className={styles.statLabel}>待巩固错题</span></div>
      </div>}

      {/* Tab切换 */}
      <div className={styles.mainTabs}>
        {!inPracticeSession && <div className={styles.tabBar}>
          <button
            className={`${styles.tabItem} ${activeTab === 'practice' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <EditOutlined /> 章节练习
          </button>
          <button
            className={`${styles.tabItem} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <HistoryOutlined /> 练习记录
            {history.length > 0 && <span className={styles.tabCount}>{history.length}</span>}
          </button>
        </div>}

        {activeTab === 'practice' ? (
          <div className={styles.tabBody}>
            <PracticeBank
              key={activeChildId}
              grade={currentGrade}
              subject=""
              linkedChildren={children}
              initialChildId={activeChildId}
              onChildChange={selectChild}
              onResultSaved={() => loadResults(activeChildId)}
              showChildPicker={false}
              initialSubject={entryContext?.subject || ''}
              focusTopics={entryContext?.topics || []}
              fromFeedback={entryContext?.fromFeedback || false}
              onSessionChange={setInPracticeSession}
            />
          </div>
        ) : (
          <div className={styles.tabBody}>
            <div className={styles.historyPanel}>
              <div className={styles.historyIntro}>
                {attemptHistoryEnabled
                  ? '正式练习和错题复练逐次留档。累计作答包含重做；章节徽标与待巩固错题按各题最近一次答案计算。点击记录可逐题回顾。'
                  : '当前记录暂按每个题组显示最新一次。完成数据更新后，重做记录也会逐次保留。'}
                {history.length > 0 && <span>已载入 {history.length} 次</span>}
              </div>
              {resultsLoading ? <p role="status">正在读取练习记录…</p> : resultsError ? (
                <div className={styles.recordNotice} role="alert">记录读取失败，请使用上方“重新加载”，不要重复提交已完成的练习。</div>
              ) : history.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <HistoryOutlined style={{ fontSize: 40, color: 'var(--color-ink-subtle)' }} />
                  <p>还没有做题记录，快去做几道题吧！</p>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {history.map((item) => {
                    const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0
                    const isOpen = openRecord === item.id
                    const hasUnrecoverableLegacySnapshot = item.wrongIds.includes('')
                      || Object.prototype.hasOwnProperty.call(item.answers ?? {}, '')
                    const hasAnswerSnapshot = Boolean(item.answers && Object.keys(item.answers).length)
                    const reviewQuestions = item.questionSnapshot?.filter((question) =>
                      Object.prototype.hasOwnProperty.call(item.answers ?? {}, question.id),
                    ) ?? []
                    return (
                      <div key={item.id}>
                        <button
                          className={`${styles.historyItem} ${isOpen ? styles.historyItemOpen : ''}`}
                          onClick={() => setOpenRecord(isOpen ? null : item.id)}
                        >
                          <div className={`${styles.historyScore} ${pct >= 80 ? styles.good : pct >= 60 ? styles.normal : styles.bad}`}>
                            {pct}%
                          </div>
                          <div className={styles.historyContent}>
                            <div className={styles.historySetId}>{item.title}</div>
                            <div className={styles.historyTime}>
                              {new Date(item.finishedAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className={styles.historyScoreText}>{item.score}/{item.total}</div>
                          {isOpen ? <UpOutlined className={styles.historyArrow} /> : <DownOutlined className={styles.historyArrow} />}
                        </button>
                        {isOpen && (
                          <div className={styles.historyDetail}>
                            {hasUnrecoverableLegacySnapshot ? (
                              <div className={styles.legacyReviewNotice} role="note">
                                这条记录来自题目编号修复前：当时多道题共用了空编号，系统无法还原每题的作答。历史总分已保留，但不展示可能误导的逐题答案；重新完成该题组后即可正常回看。
                              </div>
                            ) : !hasAnswerSnapshot ? (
                              <div className={styles.legacyReviewNotice} role="note">
                                这条历史记录没有保存逐题答案快照，原成绩已保留。下面无法判断当时每题的选择；重新练习后会完整记录。
                              </div>
                            ) : !item.questionSnapshot?.length ? (
                              <div className={styles.legacyReviewNotice} role="note">
                                这条历史记录没有保存当时的题目内容。为避免题库更新后用新题目误判旧答案，暂不展示逐题解析；本次成绩已保留，之后的新练习会完整保存题目快照。
                              </div>
                            ) : reviewQuestions.length > 0 ? (
                              reviewQuestions.map((q, qi) => {
                                const userAnswer = item.answers?.[q.id]
                                const isCorrect = userAnswer === q.answerIndex
                                const answered = userAnswer !== undefined && userAnswer !== null
                                return (
                                  <div key={q.id} className={`${styles.reviewQ} ${answered ? (isCorrect ? styles.reviewQCorrect : styles.reviewQWrong) : styles.reviewQSkip}`}>
                                    <div className={styles.reviewQHead}>
                                      <span className={styles.reviewQNum}>第 {qi + 1} 题</span>
                                      {answered
                                        ? (isCorrect
                                            ? <span className={styles.reviewQTagOk}><CheckCircleOutlined /> 答对</span>
                                            : <span className={styles.reviewQTagNo}><CloseCircleOutlined /> 答错</span>)
                                        : <span className={styles.reviewQTagSkip}>未作答</span>}
                                    </div>
                                    {q.imageQuestion ? (
                                      <img src={q.imageUrl} alt="题目" className={styles.reviewQImage} loading="lazy" decoding="async" onLoad={() => reportImagePerformance('practice-question', q.imageUrl, 'success')} onError={() => reportImagePerformance('practice-question', q.imageUrl, 'failure')} />
                                    ) : (
                                      <div className={styles.reviewQPrompt}><MathText text={q.prompt} inline /></div>
                                    )}
                                    {answered && (
                                      <div className={styles.reviewQYour}>
                                        你的答案：<span className={isCorrect ? styles.yourOk : styles.yourNo}>{isCorrect ? '答对' : '答错'}</span>
                                        <span className={styles.reviewQYourText}><MathText text={q.options?.[userAnswer] ?? ''} inline /></span>
                                      </div>
                                    )}
                                    <div className={styles.reviewQAnswer}>
                                      正确答案：
                                      <span className={styles.reviewQAnswerText}><MathText text={q.answerIndex == null ? '' : q.options?.[q.answerIndex] ?? ''} inline /></span>
                                    </div>
                                    {q.explanation && (
                                      <div className={styles.reviewQExplain}><MathText text={q.explanation} /></div>
                                    )}
                                    {q.imageUrl && !q.imageQuestion && (
                                      <img src={q.imageUrl} alt="题目配图" className={styles.reviewQFigure} loading="lazy" decoding="async" onLoad={() => reportImagePerformance('practice-question', q.imageUrl, 'success')} onError={() => reportImagePerformance('practice-question', q.imageUrl, 'failure')} />
                                    )}
                                    {q.answerImageUrl && <img src={q.answerImageUrl} alt="解析图示" className={styles.reviewQFigure} loading="lazy" decoding="async" />}
                                  </div>
                                )
                              })
                            ) : (
                              <div className={styles.emptyHistory}>
                                <p>该题组题目数据暂不可用</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {nextAttemptPage !== null && (
                <button
                  type="button"
                  className={styles.historyMore}
                  onClick={() => void loadMoreAttempts()}
                  disabled={loadingMoreAttempts}
                >
                  {loadingMoreAttempts ? '正在加载…' : '查看更早记录'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
