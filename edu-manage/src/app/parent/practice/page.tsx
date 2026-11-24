'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { message, Segmented } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  TrophyOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { readParentChildPreference, rememberParentChild } from '@/lib/parent-child-preference'
import { PracticeBank } from '../materials/PracticeBank'
import { MathText } from '../materials/MathText'
import type { PracticeQuestionSnapshot } from '@/lib/practice-bank'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import styles from './practice.module.css'
import { reportImagePerformance } from '@/lib/client-performance'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'

type Child = { id: string; name: string; grade: string | null; membershipLevel?: string | null }
type SavedResult = { score: number; total: number; wrongIds: string[]; finishedAt: string; answers?: Record<string, number> | null; title?: string }
type PracticeAttempt = SavedResult & { id: string; setId: string; questionSnapshot?: PracticeQuestionSnapshot[] | null }
type PracticeAttemptStats = { totalAttempts: number; totalQuestions: number; totalCorrect: number; totalWrong: number }
type PracticeEntryContext = { fromFeedback: boolean; childId: string; subject: string; topics: string[] }

type Stage = 'hub' | 'volumes' | 'sections' | 'history'

type CatalogSummaryItem = {
  id: string
  grade: string
  subject: string
  volume: string
  chapter: string
  section: string
  available: boolean
  questionCount: number
}

// 9大学科视觉与版本策略（以石家庄中考新课标为基准）
const SUBJECT_CONFIGS: Record<string, {
  name: string
  edition: string
  color: string
  icon: string
  desc: string
  minGrade?: string
}> = {
  语文: {
    name: '语文',
    edition: '统编版',
    color: '#14574D',
    icon: '📖',
    desc: '名篇精读 · 文言基础 · 单元过关',
  },
  数学: {
    name: '数学',
    edition: '冀教版',
    color: '#1A538C',
    icon: '📐',
    desc: '代数几何 · 核心考点 · 变式训练',
  },
  英语: {
    name: '英语',
    edition: '人教版',
    color: '#8A5A14',
    icon: '🔤',
    desc: '词汇运用 · 语法精析 · 听说读写',
  },
  道德与法治: {
    name: '道德与法治',
    edition: '统编版',
    color: '#8C2B2B',
    icon: '⚖️',
    desc: '法治意识 · 核心素养 · 综合辨析',
  },
  历史: {
    name: '历史',
    edition: '统编版',
    color: '#8C5528',
    icon: '🏛️',
    desc: '历史时序 · 史料研读 · 重点过关',
  },
  地理: {
    name: '地理',
    edition: '人教版',
    color: '#246B55',
    icon: '🌍',
    desc: '经纬地图 · 区域认知 · 识图精练',
  },
  生物: {
    name: '生物',
    edition: '冀少版',
    color: '#28733B',
    icon: '🌱',
    desc: '生命结构 · 探究实验 · 人体生理',
  },
  物理: {
    name: '物理',
    edition: '人教版',
    color: '#2E4C80',
    icon: '⚡',
    desc: '声光力电 · 实验探究 · 经典题型',
    minGrade: '初二',
  },
  化学: {
    name: '化学',
    edition: '人教版',
    color: '#1C6673',
    icon: '🧪',
    desc: '微观结构 · 化学方程式 · 物质推断',
    minGrade: '初三',
  },
}

const TEXTBOOK_COVER_SUBJECTS: Record<string, string> = {
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '生物': 'biology',
  '物理': 'physics',
  '化学': 'chemistry',
  '地理': 'geography',
  '道德与法治': 'morality',
  '历史': 'history',
}

const AVAILABLE_TEXTBOOK_COVERS = new Set([
  'biology-g7-lower',
  'biology-g7-upper',
  'biology-g8-lower',
  'biology-g8-upper',
  'chemistry-g9-lower',
  'chemistry-g9-upper',
  'chinese-g7-lower',
  'chinese-g7-upper',
  'chinese-g8-lower',
  'chinese-g8-upper',
  'chinese-g9-lower',
  'chinese-g9-upper',
  'english-g7-lower',
  'english-g7-upper',
  'english-g8-lower',
  'english-g8-upper',
  'english-g9-lower',
  'english-g9-upper',
  'geography-g7-lower',
  'geography-g7-upper',
  'geography-g8-lower',
  'geography-g8-upper',
  'history-g7-lower',
  'history-g7-upper',
  'history-g8-lower',
  'history-g8-upper',
  'history-g9-lower',
  'history-g9-upper',
  'math-g7-lower',
  'math-g7-upper',
  'math-g8-lower',
  'math-g8-upper',
  'math-g9-lower',
  'math-g9-upper',
  'morality-g7-lower',
  'morality-g7-upper',
  'morality-g8-lower',
  'morality-g8-upper',
  'morality-g9-lower',
  'morality-g9-upper',
  'physics-g8-lower',
  'physics-g8-upper',
  'physics-g9-full'
])

function getTextbookCoverSrc(subject: string, grade: string, volume: string) {
  const subjectKey = TEXTBOOK_COVER_SUBJECTS[subject]
  const gradeKey = grade.includes('初一') || grade.includes('七年级') ? 'g7'
    : grade.includes('初二') || grade.includes('八年级') ? 'g8'
    : grade.includes('初三') || grade.includes('九年级') ? 'g9'
    : null
  const volumeKey = volume.includes('上') ? 'upper'
    : volume.includes('下') ? 'lower'
    : volume.includes('全') ? 'full'
    : null

  if (!subjectKey || !gradeKey || !volumeKey) return null
  const assetKey = subjectKey + '-' + gradeKey + '-' + volumeKey
  return AVAILABLE_TEXTBOOK_COVERS.has(assetKey)
    ? '/images/textbooks/covers/' + assetKey + '.webp'
    : null
}

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
  const [openRecord, setOpenRecord] = useState<string | null>(null)
  const [inPracticeSession, setInPracticeSession] = useState(false)
  const [entryContext, setEntryContext] = useState<PracticeEntryContext | null>(null)

  // 多级页面流转状态
  const [stage, setStage] = useState<Stage>('hub')
  const [selectedSubject, setSelectedSubject] = useState<string>('语文')
  const [selectedVolume, setSelectedVolume] = useState<string>('上册')

  const handleMobileBack = useCallback(() => {
    if (inPracticeSession) return false
    if (stage === 'history') {
      setStage('hub')
      return true
    }
    if (stage === 'sections') {
      setStage(entryContext?.fromFeedback ? 'hub' : 'volumes')
      return true
    }
    if (stage === 'volumes') {
      setStage('hub')
      return true
    }
    return false
  }, [entryContext?.fromFeedback, inPracticeSession, stage])

  useMobileBackHandler(handleMobileBack)

  // 当前年级目录元数据（用于在分册书架精准呈现单元数与做题进度）
  const [catalogItems, setCatalogItems] = useState<CatalogSummaryItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  const resultsRequest = useRef(0)
  const catalogRequest = useRef(0)

  useEffect(() => {
    document.body.classList.toggle('practice-focus-mode', inPracticeSession)
    return () => document.body.classList.remove('practice-focus-mode')
  }, [inPracticeSession])

  // 加载孩子信息（严格去重）
  useEffect(() => {
    const loadChildren = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const requestedId = params.get('childId') || readParentChildPreference()
        const res = await fetch(`/api/parent/children${requestedId ? `?childId=${encodeURIComponent(requestedId)}` : ''}`)
        if (!res.ok) throw new Error('加载失败')
        const data = await res.json()
        const rawList: Child[] = data.children || []

        // 严格去重：按 id 与 name 双重去重，确保同名或重复账号不出现重复选项
        const seenIds = new Set<string>()
        const seenNames = new Set<string>()
        const students: Child[] = []
        for (const c of rawList) {
          if (!c?.id || !c?.name) continue
          const trimmedName = c.name.trim()
          if (seenIds.has(c.id) || seenNames.has(trimmedName)) continue
          seenIds.add(c.id)
          seenNames.add(trimmedName)
          students.push({
            ...c,
            name: trimmedName,
          })
        }

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
          const targetSubject = params.get('subject') || '语文'
          setEntryContext({ fromFeedback: true, childId: selectedId, subject: targetSubject, topics })
          setSelectedSubject(targetSubject)
          setStage('sections')
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

  // 加载当前学员目录元数据（供大厅及分册书架计算小节数）
  const loadCatalog = useCallback(async (childId: string) => {
    if (!childId) return
    const requestId = ++catalogRequest.current
    setCatalogLoading(true)
    try {
      const res = await fetch(`/api/parent/practice-bank?studentId=${encodeURIComponent(childId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '目录加载失败')
      if (requestId === catalogRequest.current) {
        setCatalogItems(Array.isArray(data?.catalog) ? data.catalog : [])
      }
    } catch {
      // 目录静默容错
    } finally {
      if (requestId === catalogRequest.current) setCatalogLoading(false)
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
    void loadCatalog(activeChildId)
    return () => {
      resultsRequest.current += 1
      catalogRequest.current += 1
    }
  }, [activeChildId, loadResults, loadCatalog])

  useEffect(() => {
    const refresh = () => {
      if (!inPracticeSession) {
        void loadResults(activeChildId)
        void loadCatalog(activeChildId)
      }
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [activeChildId, inPracticeSession, loadResults, loadCatalog])

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

  // 综合学情统计
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

  // 当前年级开放的学科列表（初一: 7科；初二: +物理；初三: +化学）
  const gradeSubjects = useMemo(() => {
    const isJunior2 = currentGrade.includes('初二') || currentGrade.includes('八')
    const isJunior3 = currentGrade.includes('初三') || currentGrade.includes('九')
    return Object.values(SUBJECT_CONFIGS).filter((cfg) => {
      if (cfg.minGrade === '初二') return isJunior2 || isJunior3
      if (cfg.minGrade === '初三') return isJunior3
      return true
    })
  }, [currentGrade])

  // 当前选中学科在当前年级下的分册列表（如上册、下册）
  const volumeList = useMemo(() => {
    const subjectSets = catalogItems.filter(item => item.subject === selectedSubject)
    const volumes = Array.from(new Set(subjectSets.map(item => item.volume).filter(Boolean)))
    // 若暂无动态目录，默认提供初中标准的上册和下册
    if (volumes.length === 0) {
      if (currentGrade.includes('初三') && ['化学', '物理'].includes(selectedSubject)) {
        return ['全一册']
      }
      return ['上册', '下册']
    }
    return volumes.sort((a, b) => (a === '上册' ? -1 : b === '上册' ? 1 : 0))
  }, [catalogItems, selectedSubject, currentGrade])

  if (loading) {
    return (
      <div className={styles.page} role="status" aria-label="正在加载题库">
        <CardSkeleton rows={3} />
      </div>
    )
  }

  if (!children.length) {
    if (childrenError) {
      return (
        <div className={styles.page} role="alert" style={{ padding: 24 }}>
          <p>{childrenError}</p>
          <button type="button" onClick={() => window.location.reload()}>重新加载</button>
        </div>
      )
    }
    return (
      <div className={styles.page} role="status" style={{ padding: 24 }}>
        暂无已关联的孩子，关联学员后即可查看专属练习记录。
      </div>
    )
  }

  // =========================================================================
  // Stage 4: 完整练习记录流水视图
  // =========================================================================
  if (stage === 'history') {
    return (
      <div className={styles.page}>
        <div className={styles.bookshelfHeader}>
          <button type="button" className={`${styles.navBackBtn} mobile-shell-back`} onClick={() => setStage('hub')}>
            <LeftOutlined /> 返回题库大厅
          </button>
          <h1 className={styles.bookshelfTitle}>练习记录流水</h1>
          <p className={styles.bookshelfSubtitle}>
            {attemptHistoryEnabled
              ? '正式练习与错题复练逐次留档 · 点击记录可逐题回顾解析'
              : '当前记录展示最新作答，完成更新后将逐次留档'}
          </p>
        </div>

        <div className={styles.historyPanel}>
          {resultsLoading ? (
            <p role="status">正在读取练习记录…</p>
          ) : resultsError ? (
            <div className={styles.recordNotice} role="alert">记录读取失败，请稍后刷新重试。</div>
          ) : history.length === 0 ? (
            <div className={styles.emptyHistory}>
              <HistoryOutlined style={{ fontSize: 40, color: 'var(--color-ink-subtle)' }} />
              <p>还没有做题记录，快去完成一节练习吧！</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((item, hi) => {
                const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0
                const isOpen = openRecord === item.id
                const reviewQuestions = item.questionSnapshot?.filter((question) =>
                  Object.prototype.hasOwnProperty.call(item.answers ?? {}, question.id),
                ) ?? []
                return (
                  <div key={item.id} className="stagger-item" style={{ animationDelay: `${Math.min(hi, 8) * 40}ms` }}>
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
                        {reviewQuestions.length > 0 ? (
                          reviewQuestions.map((q, qi) => {
                            const userAnswer = item.answers?.[q.id]
                            const isCorrect = userAnswer === q.answerIndex
                            const answered = userAnswer !== undefined && userAnswer !== null
                            return (
                              <div key={q.id} className={`${styles.reviewQ} ${answered ? (isCorrect ? styles.reviewQCorrect : styles.reviewQWrong) : styles.reviewQSkip}`}>
                                <div className={styles.reviewQHead}>
                                  <span className={styles.reviewQNum}>第 {qi + 1} 题</span>
                                  {answered ? (
                                    isCorrect
                                      ? <span className={styles.reviewQTagOk}><CheckCircleOutlined /> 答对</span>
                                      : <span className={styles.reviewQTagNo}><CloseCircleOutlined /> 答错</span>
                                  ) : <span className={styles.reviewQTagSkip}>未作答</span>}
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
                                  正确答案：<span className={styles.reviewQAnswerText}><MathText text={q.answerIndex == null ? '' : q.options?.[q.answerIndex] ?? ''} inline /></span>
                                </div>
                                {q.explanation && (
                                  <div className={styles.reviewQExplain}><MathText text={q.explanation} /></div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className={styles.emptyHistory}><p>该题组题目快照暂未生成</p></div>
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
    )
  }

  // =========================================================================
  // Stage 2: 学科教材分册书架（清晰区隔上册与下册）
  // =========================================================================
  if (stage === 'volumes') {
    const config = SUBJECT_CONFIGS[selectedSubject] || SUBJECT_CONFIGS['语文']
    return (
      <div className={styles.page}>
        <div className={styles.bookshelfHeader}>
          <button type="button" className={`${styles.navBackBtn} mobile-shell-back`} onClick={() => setStage('hub')}>
            <LeftOutlined /> 返回题库大厅
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 24 }}>{config.icon}</span>
            <div>
              <h1 className={styles.bookshelfTitle}>
                {selectedSubject} · 选择教材分册
              </h1>
              <p className={styles.bookshelfSubtitle}>
                {currentGrade}同步教材 · {config.edition} · 请选择想要练习的分册进入
              </p>
            </div>
          </div>
        </div>

        <div className={styles.bookshelfList}>
          {volumeList.map((vol) => {
            const volSets = catalogItems.filter(item => item.subject === selectedSubject && item.volume === vol)
            const chapters = Array.from(new Set(volSets.map(s => s.chapter).filter(Boolean)))
            const doneCount = volSets.filter(s => savedResults[s.id]).length
            const isFull = vol.includes('全')
            const isUpper = vol.includes('上')
            const tagText = isFull ? '中考总复习' : isUpper ? '秋季学期 · 基础衔接' : '春季学期 · 进阶巩固'
            const coverSrc = getTextbookCoverSrc(selectedSubject, currentGrade, vol)

            return (
              <div
                key={vol}
                className={styles.bookCard}
                onClick={() => {
                  setSelectedVolume(vol)
                  setStage('sections')
                }}
              >
                {coverSrc ? (
                  <Image
                    src={coverSrc}
                    alt={selectedSubject + ' ' + currentGrade + vol + '教材封面'}
                    className={styles.bookCover}
                    width={320}
                    height={448}
                    sizes="64px"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className={styles.bookSpine} aria-hidden="true">
                    <span className={styles.bookSpineText}>
                      {currentGrade.slice(0, 2)}{vol.slice(0, 1)}
                    </span>
                    <span className={styles.bookSpineSub}>同步</span>
                  </div>
                )}
                <div className={styles.bookInfo}>
                  <div className={styles.bookTitleRow}>
                    <span className={styles.bookName}>{currentGrade}{vol}</span>
                    <span className={styles.bookBadge}>{tagText}</span>
                  </div>
                  <p className={styles.bookDesc}>
                    {config.edition} · {chapters.length > 0 ? `共 ${chapters.length} 单元 · ${volSets.length} 个同步小节` : '教材同步单元练习'}
                  </p>
                  <div className={styles.bookProgressRow}>
                    <span>已练 {doneCount}/{volSets.length || '—'} 节</span>
                    {doneCount > 0 && volSets.length > 0 && (
                      <span style={{ color: '#C9A45C', fontSize: 11 }}>
                        ({Math.round((doneCount / volSets.length) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.bookEnterBtn}>
                  进入练习 <RightOutlined />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // =========================================================================
  // Stage 3: 单元与小节练习（仅呈现当前分册，绝不跨册堆叠）
  // =========================================================================
  if (stage === 'sections') {
    return (
      <div className={`${styles.page} ${inPracticeSession ? styles.sessionPage : ''}`}>
        {!inPracticeSession && (
          <div className={styles.sectionsHeader}>
            <div className={styles.sectionsHeaderLeft}>
              <button
                type="button"
                className={`${styles.navBackBtn} mobile-shell-back`}
                onClick={() => {
                  if (entryContext?.fromFeedback) {
                    setStage('hub')
                  } else {
                    setStage('volumes')
                  }
                }}
              >
                <LeftOutlined /> {entryContext?.fromFeedback ? '返回题库大厅' : `返回 ${selectedSubject} 分册`}
              </button>
              <h1 className={styles.sectionsTitle}>
                {selectedSubject} · {currentGrade}{selectedVolume}
              </h1>
              <p className={styles.sectionsSubtitle}>
                单元知识点同步精练 · 随练随测 · 错题强化
              </p>
            </div>
          </div>
        )}

        <PracticeBank
          key={`${activeChildId}-${selectedSubject}-${selectedVolume}`}
          grade={currentGrade}
          subject={selectedSubject}
          selectedVolume={selectedVolume}
          linkedChildren={children}
          initialChildId={activeChildId}
          onChildChange={selectChild}
          onResultSaved={() => loadResults(activeChildId)}
          showChildPicker={false}
          hideSubjectTabs={true}
          initialSubject={selectedSubject}
          focusTopics={entryContext?.topics || []}
          fromFeedback={entryContext?.fromFeedback || false}
          onSessionChange={setInPracticeSession}
          onBackToVolumes={() => setStage('volumes')}
        />
      </div>
    )
  }

  // =========================================================================
  // Stage 1: 题库大厅（Practice Hub · 核心首屏大厅）
  // =========================================================================
  return (
    <div className={styles.page}>
      {/* 顶部品牌大厅标牌 */}
      <div className={styles.hubBrand}>
        <img
          src="/images/logo-small-128.webp"
          alt="牧哲学堂"
          className={styles.hubLogo}
        />
        <div className={styles.hubBrandTitleWrap}>
          <div className={styles.hubBrandTitleRow}>
            <h1 className={styles.hubBrandTitle}>牧哲题库练习</h1>
            <span className={styles.hubBrandTag}>初中全科同步</span>
          </div>
          <p className={styles.hubBrandSubtitle}>
            章节过关 · 经典题型 · 错题专项强化 · 逐次留档
          </p>
        </div>
      </div>

      {/* 极简高雅的学员选择栏：多学员时支持无缝切换，单学员时呈现精致学员徽章 */}
      {children.length > 1 ? (
        <div className={styles.childBar}>
          <div className={styles.childBarLabel}>
            <span className={styles.childBarIcon}><UserOutlined /></span>
            <span>当前学员</span>
          </div>

          <div className={styles.childSelectorWrap}>
            <Segmented
              aria-label="选择学员"
              className={styles.childSegmented}
              value={activeChildId}
              onChange={(val) => selectChild(val as string)}
              options={children.map((child) => ({
                label: `${child.name} · ${child.grade ? normalizeTextbookGrade(child.grade) : '初中'}`,
                value: child.id,
              }))}
            />
          </div>
        </div>
      ) : activeChild ? (
        <div className={styles.childBar}>
          <div className={styles.childSingleBadge}>
            <span className={styles.childBarIcon}><UserOutlined /></span>
            <span className={styles.childSingleName}>{activeChild.name}</span>
            <span className={styles.childSingleGrade}>{activeChild.grade ? normalizeTextbookGrade(activeChild.grade) : '初中'}</span>
          </div>
        </div>
      ) : null}

      {/* 墨绿微拟物 Hero 看板 */}
      <div className={styles.heroOverview}>
        <div className={styles.heroTopRow}>
          <div className={styles.heroTitleLabel}>
            <TrophyOutlined style={{ color: '#C9A45C', fontSize: 14 }} />
            <span>{activeChild?.name || '学员'} · 初中练习掌握看板</span>
          </div>
          <button
            type="button"
            className={styles.heroHistoryBtn}
            onClick={() => setStage('history')}
          >
            <HistoryOutlined /> 练习记录 {history.length > 0 && `(${history.length})`} &gt;
          </button>
        </div>

        <div className={styles.heroStatsGrid}>
          <div className={styles.heroStatCol}>
            <div className={styles.heroStatNum}>
              {resultsError || resultsLoading ? '—' : <AnimatedNumber value={stats.totalSets} />}
            </div>
            <div className={styles.heroStatName}>已练小节</div>
          </div>
          <div className={styles.heroStatCol}>
            <div className={styles.heroStatNum}>
              {resultsError || resultsLoading ? '—' : <AnimatedNumber value={stats.totalQuestions} />}
            </div>
            <div className={styles.heroStatName}>累计作答</div>
          </div>
          <div className={styles.heroStatCol}>
            <div className={styles.heroStatNum} style={{ color: stats.accuracy >= 80 ? '#6ee7b7' : '#ffffff' }}>
              {resultsError || resultsLoading || !stats.totalQuestions ? '—' : <><AnimatedNumber value={stats.accuracy} />%</>}
            </div>
            <div className={styles.heroStatName}>累计正确率</div>
          </div>
          <div className={styles.heroStatCol}>
            <div className={styles.heroStatNum} style={{ color: stats.latestWrongCount > 0 ? '#fca5a5' : '#ffffff' }}>
              {resultsError || resultsLoading ? '—' : <AnimatedNumber value={stats.latestWrongCount} />}
            </div>
            <div className={styles.heroStatName}>待巩固错题</div>
          </div>
        </div>
      </div>

      {/* 核心功能区：初中同步学科大卡（9大学科专区，告别单调小按钮） */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <AppstoreOutlined style={{ color: '#14574D' }} /> 初中同步学科
        </h2>
        <span className={styles.sectionSubtitle}>
          当前年级：{currentGrade} · 依教材版本精研
        </span>
      </div>

      <div className={styles.subjectGrid}>
        {gradeSubjects.map((cfg) => {
          const subjectSets = catalogItems.filter(item => item.subject === cfg.name)
          const doneSets = subjectSets.filter(s => savedResults[s.id]).length
          const chapters = Array.from(new Set(subjectSets.map(s => s.chapter).filter(Boolean)))

          return (
            <div
              key={cfg.name}
              className={styles.subjectCard}
              onClick={() => {
                setSelectedSubject(cfg.name)
                setStage('volumes')
              }}
            >
              <div className={styles.subjectCardTop}>
                <div
                  className={styles.subjectIconBadge}
                  style={{ background: cfg.color }}
                >
                  {cfg.icon}
                </div>
                <span className={styles.subjectVolumeTag}>
                  {cfg.edition}
                </span>
              </div>

              <h3 className={styles.subjectCardName}>{cfg.name}</h3>
              <div className={styles.subjectCardMeta}>{cfg.desc}</div>

              <div className={styles.subjectCardProgress}>
                <span className={styles.subjectProgressText}>
                  {subjectSets.length > 0 ? `已练 ${doneSets}/${subjectSets.length} 节` : '人教版同步新课标'}
                </span>
                <span className={styles.subjectActionText}>
                  选择分册 <RightOutlined style={{ fontSize: 10 }} />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 最近练习记录预览（仅展示最近 3 次，保持首屏简约不累赘） */}
      {history.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <HistoryOutlined style={{ color: '#14574D' }} /> 最近特训记录
            </h2>
            <span className={styles.sectionSubtitle}>
              最近 3 次作答
            </span>
          </div>

          <div className={styles.recentCard}>
            {history.slice(0, 3).map((item) => {
              const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0
              return (
                <div key={item.id} className={styles.recentCardItem}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
                    <div className={styles.recentItemTitle}>{item.title}</div>
                    <div className={styles.recentItemDate}>
                      {new Date(item.finishedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div
                    className={styles.recentScoreBadge}
                    style={{
                      background: pct >= 80 ? 'rgba(29, 158, 117, 0.12)' : pct >= 60 ? 'rgba(217, 140, 0, 0.12)' : 'rgba(226, 75, 74, 0.12)',
                      color: pct >= 80 ? '#1d9e75' : pct >= 60 ? '#d98c00' : '#e24b4a',
                    }}
                  >
                    答对 {item.score}/{item.total} ({pct}%)
                  </div>
                </div>
              )
            })}
            <button
              type="button"
              className={styles.viewAllHistoryBtn}
              onClick={() => setStage('history')}
            >
              查看完整练习流水与逐题回顾 <RightOutlined />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
