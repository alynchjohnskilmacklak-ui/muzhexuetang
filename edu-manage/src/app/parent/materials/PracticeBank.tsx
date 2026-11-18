'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, message, Modal } from 'antd'
import { useSession } from 'next-auth/react'
import { LeftOutlined, CheckOutlined, CloseOutlined, ReloadOutlined, AppstoreOutlined, EditOutlined } from '@ant-design/icons'
import type { PracticeAnswer, PracticeQuestion, PracticeSet } from '@/data/parent-practice-bank'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { MathText } from './MathText'
import { PracticeCanvas } from './PracticeCanvas'
import styles from './practice-bank.module.css'
import { formatPracticeAnswer, getBalancedOptionOrders, getDifficultyLabel, isPracticeAnswerCorrect, isValidPracticeAnswer, practiceQuestionRevision, selectPracticeQuestions, type PracticeMode } from '@/lib/practice-bank'
import { PracticeSaveError, practiceDraftKey, readPracticeDraft, savePracticeSubmission, type PracticeDraft, type PracticeSubmission } from '@/lib/practice-session-client'

type Child = { id: string; name: string; grade: string | null }
type SavedResult = { score: number; total: number; wrongIds: string[]; finishedAt: string }
type PracticeSetSummary = Omit<PracticeSet, 'questions'> & {
  questionCount: number
  available: boolean
  difficultyCounts?: { easy: number; medium: number; challenge: number }
}

function PracticeSetActions({ setId, saved, wrongCount, disabled, reviewDisabled, loading, onOpen }: {
  setId: string; saved: boolean; wrongCount: number; disabled: boolean; reviewDisabled: boolean; loading?: boolean
  onOpen: (setId: string, wrong?: boolean) => void
}) {
  return <div className={styles.actions}>
    <Button type="primary" className={styles.primaryBtn} onClick={() => onOpen(setId)} disabled={disabled} loading={loading}>
      {saved ? '继续／再练' : '开始练习'}
    </Button>
    {wrongCount > 0 && <Button className={styles.wrongBtn} disabled={reviewDisabled} onClick={() => onOpen(setId, true)}>
      <ReloadOutlined /> 错题重练 · {wrongCount}
    </Button>}
  </div>
}

function createPracticeSubmissionId() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi.randomUUID) return `practice_${cryptoApi.randomUUID()}`

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  return `practice_${uuid}`
}

export function PracticeBank({
  grade,
  subject,
  linkedChildren,
  initialChildId,
  onChildChange,
  onResultSaved,
  showChildPicker = true,
  onSessionChange,
  initialSubject = '',
  focusTopics = [],
  fromFeedback = false,
}: {
  grade: string
  subject: string
  linkedChildren: Child[]
  initialChildId: string
  onChildChange?: (childId: string, grade: string) => void
  onResultSaved?: () => void
  showChildPicker?: boolean
  onSessionChange?: (active: boolean) => void
  initialSubject?: string
  focusTopics?: string[]
  fromFeedback?: boolean
}) {
  const { data: session } = useSession()
  const userId = session?.user?.id || ''
  const [childId, setChildId] = useState(initialChildId)
  const [localGrade, setLocalGrade] = useState(grade)
  const [activeSubject, setActiveSubject] = useState(initialSubject)
  const [feedbackFocusActive, setFeedbackFocusActive] = useState(fromFeedback && focusTopics.length > 0)
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null)
  const [answers, setAnswers] = useState<Record<string, PracticeAnswer>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})
  const [bankCatalog, setBankCatalog] = useState<PracticeSetSummary[]>([])
  const [bankCatalogLoading, setBankCatalogLoading] = useState(false)
  const [bankCatalogError, setBankCatalogError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState<SavedResult | null>(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('challenge')
  const [savedResults, setSavedResults] = useState<Record<string, SavedResult>>({})
  const [savedResultsError, setSavedResultsError] = useState<string | null>(null)
  const [loadingSavedResults, setLoadingSavedResults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveErrorCode, setSaveErrorCode] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [questionRevision, setQuestionRevision] = useState('')
  const [locked, setLocked] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const saveLock = useRef(false)
  const sessionEpoch = useRef(0)
  const mounted = useRef(true)
  const pendingSubmission = useRef<PracticeSubmission | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [previewFit, setPreviewFit] = useState(false)
  const resultsRequest = useRef(0)
  const catalogRequest = useRef(0)
  const openRequest = useRef(0)
  const childIdRef = useRef(childId)
  const [openingSetId, setOpeningSetId] = useState<string | null>(null)
  const focusTopicKey = focusTopics.join('\u001f')

  useEffect(() => { childIdRef.current = childId }, [childId])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; sessionEpoch.current += 1; onSessionChange?.(false) }
  }, [onSessionChange])

  useEffect(() => {
    if (!previewImage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [previewImage])

  const openImagePreview = (src: string, alt: string) => {
    setPreviewFit(false)
    setPreviewImage({ src, alt })
  }

  useEffect(() => { setChildId(initialChildId) }, [initialChildId])
  useEffect(() => { setLocalGrade(grade) }, [grade])
  useEffect(() => { setActiveSubject(initialSubject) }, [initialSubject])
  useEffect(() => { setFeedbackFocusActive(fromFeedback && focusTopicKey.length > 0) }, [fromFeedback, focusTopicKey])

  // 切换孩子时，自动切换到该孩子的年级
  const handleChildChange = (newChildId: string) => {
    openRequest.current += 1
    childIdRef.current = newChildId
    setOpeningSetId(null)
    setChildId(newChildId)
    const child = linkedChildren.find(c => c.id === newChildId)
    if (child) {
      setLocalGrade(child.grade || grade)
      onChildChange?.(newChildId, child.grade || grade)
    }
  }

  const loadSavedResults = useCallback(async (selectedChildId: string) => {
    if (!selectedChildId) {
      setSavedResults({})
      setLoadingSavedResults(false)
      return
    }
    const requestId = ++resultsRequest.current
    setSavedResults({})
    setLoadingSavedResults(true)
    setSavedResultsError(null)
    try {
      const res = await fetch(`/api/parent/practice-results?studentId=${encodeURIComponent(selectedChildId)}&summaryOnly=1`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '服务器暂时无法读取练习记录')
      if (requestId === resultsRequest.current) setSavedResults(data.results || {})
    } catch (error) {
      if (requestId === resultsRequest.current) {
        setSavedResultsError(error instanceof Error ? error.message : '练习记录读取失败')
      }
    } finally {
      if (requestId === resultsRequest.current) setLoadingSavedResults(false)
    }
  }, [])

  useEffect(() => {
    sessionEpoch.current += 1
    openRequest.current += 1
    setOpeningSetId(null)
    pendingSubmission.current = null
    void loadSavedResults(childId)
    setActiveSet(null)
    setResult(null)
    setAnswers({})
    setCurrentIndex(0)
    setReviewOnly(false)
    setSaveError(null)
    setSubmissionId(null)
    setQuestionIds([])
    setLocked(false)
    setDraftNotice(null)
    onSessionChange?.(false)
    return () => { resultsRequest.current += 1 }
  }, [childId, loadSavedResults, onSessionChange])

  useEffect(() => {
    const requestId = ++catalogRequest.current
    if (!childId) {
      setBankCatalog([])
      setBankCatalogError(null)
      setBankCatalogLoading(false)
      return
    }
    setBankCatalog([])
    setBankCatalogError(null)
    setBankCatalogLoading(true)
    fetch(`/api/parent/practice-bank?studentId=${encodeURIComponent(childId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || '教材目录加载失败')
        if (requestId === catalogRequest.current) setBankCatalog(Array.isArray(data?.catalog) ? data.catalog : [])
      })
      .catch((error) => {
        if (requestId === catalogRequest.current) setBankCatalogError(error instanceof Error ? error.message : '教材目录加载失败')
      })
      .finally(() => {
        if (requestId === catalogRequest.current) setBankCatalogLoading(false)
      })
    return () => { catalogRequest.current += 1 }
  }, [childId])

  const available = useMemo(() => bankCatalog.filter((set) =>
    normalizeTextbookGrade(set.grade) === normalizeTextbookGrade(localGrade)
    && (!subject || set.subject === subject)), [bankCatalog, localGrade, subject])

  const contextualSets = useMemo(() => {
    if (!focusTopicKey) return []
    const searchTerms = focusTopicKey.split('\u001f')
      .map((topic) => topic.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
      .filter((topic) => topic.length >= 3)
    return available.filter((set) => {
      const searchable = [
        set.chapter,
        set.section,
        ...set.knowledgePoints.flatMap((point) => [point.title, point.content]),
      ].map((value) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
      return searchTerms.some((term) =>
        searchable.some((field) => field.includes(term) || (field.length >= 4 && term.includes(field))),
      )
    })
  }, [available, focusTopicKey])
  const catalogSets = feedbackFocusActive ? contextualSets : available

  // 学科列表（保持固定顺序）
  const subjects = useMemo(() => {
    const seen: string[] = []
    for (const set of available) {
      if (!seen.includes(set.subject)) seen.push(set.subject)
    }
    return seen
  }, [available])

  const activeSubjects = subjects.includes(activeSubject)
    ? activeSubject
    : subjects.find((candidate) => initialSubject && (initialSubject.includes(candidate) || candidate.includes(initialSubject)))
      || subjects[0]
      || ''

  // 当前学科的小节按 章节分组
  const groupedChapters = useMemo(() => {
    const byChapter = new Map<string, PracticeSetSummary[]>()
    for (const set of catalogSets) {
      if (set.subject !== activeSubjects) continue
      const chapterKey = `${set.volume} · ${set.chapter}`
      if (!byChapter.has(chapterKey)) byChapter.set(chapterKey, [])
      byChapter.get(chapterKey)!.push(set)
    }
    return [...byChapter.entries()]
  }, [catalogSets, activeSubjects])

  const subjectDone = useMemo(() => {
    const sets = available.filter((s) => s.subject === activeSubjects && s.available)
    const done = sets.filter((s) => savedResults[s.id]).length
    return { done, total: sets.length }
  }, [available, activeSubjects, savedResults])

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (feedbackFocusActive && groupedChapters.length > 0) {
      setExpandedChapters(new Set(groupedChapters.map(([chapterKey]) => chapterKey)))
    }
  }, [feedbackFocusActive, groupedChapters])

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openSet = useCallback(async (setId: string, onlyWrong = false, fresh = false) => {
    if (saving || !userId || !childId) return
    const selectedChildId = childId
    const requestId = ++openRequest.current
    setOpeningSetId(setId)
    try {
      const params = new URLSearchParams({ studentId: selectedChildId, setId })
      const response = await fetch(`/api/parent/practice-bank?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || '题目暂时无法加载，请稍后重试')
      if (requestId !== openRequest.current || childIdRef.current !== selectedChildId) return
      const set = data?.set as PracticeSet | undefined
      if (!set || set.id !== setId || set.catalogOnly || set.needsReview || !Array.isArray(set.questions)
        || set.questions.some((question) => question.needsReview)) {
        throw new Error('该题组尚未完成教材与答案核验，暂未开放练习')
      }
    sessionEpoch.current = Date.now() + Math.random()
    pendingSubmission.current = null
    const mode: PracticeMode = onlyWrong ? 'wrong' : selectPracticeQuestions(set.questions, 'challenge').length > 0 ? 'challenge' : 'all'
    const selectedQuestions = selectPracticeQuestions(set.questions, mode)
      .filter((question) => !onlyWrong || savedResults[set.id]?.wrongIds.includes(question.id))
    if (!selectedQuestions.length) { message.info('当前没有可练习的题目，请刷新练习记录'); return }
    const key = practiceDraftKey(userId, childId, set.id)
    let draft: PracticeDraft | null = null
    try { draft = fresh ? null : readPracticeDraft(window.sessionStorage, key) }
    catch { /* Private mode may disable storage entirely. */ }
    const draftQuestions = draft ? set.questions.filter((question) => draft.questionIds.includes(question.id)) : []
    const usable = Boolean(draft && draft.studentId === childId && draft.setId === set.id
      && draftQuestions.length === draft.questionIds.length
      && practiceQuestionRevision(draftQuestions) === draft.questionRevision
      && Object.keys(draft.answers).every((id) => draftQuestions.some((question) => question.id === id)))
    if (draft && !usable) {
      message.warning('上次作答对应的题目已经更新，本次使用新题目重新开始')
      try { window.sessionStorage.removeItem(key) } catch { /* Storage can be disabled. */ }
    }
    setActiveSet(set)
    setAnswers(usable ? draft!.answers : {})
    setRevealedAnswers({})
    setResult(null)
    setCurrentIndex(usable ? draft!.currentIndex : 0)
    setReviewOnly(usable ? draft!.practiceMode === 'wrong' : onlyWrong)
    setPracticeMode(usable ? draft!.practiceMode : mode)
    setQuestionIds(usable ? draft!.questionIds : selectedQuestions.map((question) => question.id))
    setQuestionRevision(usable ? draft!.questionRevision : practiceQuestionRevision(selectedQuestions))
    setLocked(usable ? draft!.locked : false)
    setDraftNotice(usable ? (draft!.locked ? '已恢复上次提交的作答，请核对或重试同一次保存' : '已恢复上次作答进度') : null)
    setSaveError(null)
    setSaveErrorCode('')
    setSubmissionId(usable ? draft!.submissionId : createPracticeSubmissionId())
    onSessionChange?.(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (error) {
      if (requestId === openRequest.current && childIdRef.current === selectedChildId) {
        message.error(error instanceof Error ? error.message : '题目加载失败，请稍后重试')
      }
    } finally {
      if (requestId === openRequest.current) setOpeningSetId(null)
    }
  }, [childId, onSessionChange, savedResults, saving, userId])

  const questions = useMemo(() => activeSet
    ? activeSet.questions.filter((question) => questionIds.includes(question.id))
    : [], [activeSet, questionIds])

  useEffect(() => {
    if (!activeSet || !childId || !userId || !submissionId || result) return
    const draft: PracticeDraft = { studentId: childId, setId: activeSet.id, answers, practiceMode, submissionId,
      questionIds, questionRevision, currentIndex, locked, savedAt: Date.now() }
    try { window.sessionStorage.setItem(practiceDraftKey(userId, childId, activeSet.id), JSON.stringify(draft)) }
    catch { setDraftNotice('浏览器未允许保存临时进度，请保持页面打开，提交成功后成绩仍会存入数据库') }
  }, [activeSet, answers, childId, currentIndex, locked, practiceMode, questionIds, questionRevision, result, submissionId, userId])
  const choiceQuestions = useMemo(() => questions.filter((question): question is PracticeQuestion & { options: string[]; answerIndex: number } =>
    !question.imageQuestion && (question.type || 'single_choice') === 'single_choice'
      && Array.isArray(question.options) && Number.isInteger(question.answerIndex)), [questions])
  const sessionOptionOrders = useMemo(
    () => getBalancedOptionOrders(choiceQuestions, submissionId || `review:${activeSet?.id || 'none'}`),
    [activeSet?.id, questions, submissionId],
  )
  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const currentAnswerText = typeof currentAnswer === 'string'
    ? currentAnswer
    : currentAnswer && typeof currentAnswer === 'object' && !Array.isArray(currentAnswer) && 'response' in currentAnswer ? currentAnswer.response : ''
  const currentBlankValues = currentAnswer && typeof currentAnswer === 'object' && !Array.isArray(currentAnswer) && 'values' in currentAnswer
    ? currentAnswer.values
    : []
  const currentType = currentQuestion?.type || 'single_choice'
  const currentBlankCount = Array.isArray(currentQuestion?.correctAnswer) ? currentQuestion.correctAnswer.length : 1
  const challengeQuestionCount = activeSet ? selectPracticeQuestions(activeSet.questions, 'challenge').length : 0

  const answeredCount = questions.filter((question) => isValidPracticeAnswer(question, answers[question.id])).length

  const jumpTo = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return
    setCurrentIndex(idx)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const chooseOption = (questionId: string, optionIndex: number) => {
    if (result || locked || saving) return
    const question = questions.find((candidate) => candidate.id === questionId)
    if ((question?.type || 'single_choice') === 'multiple_choice') {
      setAnswers((previous) => {
        const current = Array.isArray(previous[questionId]) ? previous[questionId] as number[] : []
        return { ...previous, [questionId]: current.includes(optionIndex)
          ? current.filter((index) => index !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b) }
      })
      return
    }
    setAnswers((previous) => ({ ...previous, [questionId]: optionIndex }))
  }

  const enterTextAnswer = (questionId: string, value: string) => {
    if (result || locked || saving) return
    setAnswers((previous) => ({ ...previous, [questionId]: value }))
  }

  const enterBlankAnswer = (questionId: string, blankIndex: number, blankCount: number, value: string) => {
    if (result || locked || saving) return
    setAnswers((previous) => {
      const current = previous[questionId]
      const existingValues = current && typeof current === 'object' && !Array.isArray(current) && 'values' in current
        ? current.values
        : []
      const values = Array.from({ length: blankCount }, (_, index) => existingValues[index] ?? '')
      values[blankIndex] = value
      return { ...previous, [questionId]: { values } }
    })
  }

  const rateShortAnswer = (questionId: string, selfRating: 'correct' | 'incorrect') => {
    if (result || locked || saving) return
    const current = answers[questionId]
    const response = typeof current === 'string'
      ? current
      : current && typeof current === 'object' && !Array.isArray(current) && 'response' in current ? current.response : ''
    if (!response.trim()) { message.warning('请先写下你的答案，再对照参考答案自评'); return }
    setAnswers((previous) => ({ ...previous, [questionId]: { response, selfRating } }))
  }

  const changePracticeMode = (nextMode: PracticeMode) => {
    if (nextMode === practiceMode || reviewOnly || result || locked || saving) return
    if (Object.keys(answers).length && !window.confirm('调整练习范围会清空本次未提交的答案，是否继续？')) return
    setPracticeMode(nextMode)
    setAnswers({})
    setCurrentIndex(0)
    setSubmissionId(createPracticeSubmissionId())
    const selected = selectPracticeQuestions(activeSet?.questions || [], nextMode)
    setQuestionIds(selected.map((question) => question.id))
    setQuestionRevision(practiceQuestionRevision(selected))
    message.info('练习范围已调整，当前作答进度已清空')
  }

  const goBack = () => {
    if (saveLock.current) return
    sessionEpoch.current += 1
    setActiveSet(null)
    setResult(null)
    setAnswers({})
    setCurrentIndex(0)
    setDraftOpen(false)
    setSaveError(null)
    setSaveErrorCode('')
    setSubmissionId(null)
    setLocked(false)
    pendingSubmission.current = null
    onSessionChange?.(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const submit = async () => {
    if (!activeSet || !childId || !userId || saveLock.current || !questions.length) return
    const unansweredIdx = questions.findIndex((question) => !isValidPracticeAnswer(question, answers[question.id]))
    if (unansweredIdx >= 0) {
      setCurrentIndex(unansweredIdx)
      message.warning(`还有 ${questions.length - answeredCount} 题未作答，请先完成再提交`)
      return
    }
    const payload = pendingSubmission.current ?? {
      studentId: childId, setId: activeSet.id, answers: { ...answers }, practiceMode,
      submissionId: submissionId ?? createPracticeSubmissionId(), questionIds, questionRevision,
    }
    pendingSubmission.current = payload
    setSubmissionId(payload.submissionId)
    setLocked(true)
    saveLock.current = true
    setSaving(true)
    setSaveError(null)
    const epoch = sessionEpoch.current
    // Persist BEFORE the network request, so a refresh also retries the same ID.
    try { window.sessionStorage.setItem(practiceDraftKey(userId, childId, activeSet.id), JSON.stringify({ ...payload, currentIndex, locked: true, savedAt: Date.now() })) }
    catch { setDraftNotice('临时进度无法保存，请勿关闭页面') }
    try {
      const saved = await savePracticeSubmission(payload)
      try { window.sessionStorage.removeItem(practiceDraftKey(userId, childId, activeSet.id)) } catch { /* Saved server-side. */ }
      if (!mounted.current || epoch !== sessionEpoch.current) return
      setResult(saved)
      setSaveError(null)
      message.success(reviewOnly ? '错题复练已保存，历史记录已保留' : '本次练习已保存，可在练习记录中回看')
      void loadSavedResults(childId)
      // A failed list refresh must never turn a committed save into a failed save.
      Promise.resolve().then(() => onResultSaved?.()).catch(() => message.warning('成绩已保存，列表刷新失败，请稍后重新加载'))
    } catch (error) {
      if (!mounted.current || epoch !== sessionEpoch.current) return
      const detail = error instanceof Error ? error.message : '暂时无法保存，请保留作答后重试'
      setSaveError(detail)
      setSaveErrorCode(error instanceof PracticeSaveError ? error.code : 'UNKNOWN')
      message.error(detail)
    } finally {
      saveLock.current = false
      if (mounted.current) setSaving(false)
    }
  }

  // 目录模式
  if (!activeSet) {
    return (
      <section className={styles.bank} aria-label="在线题库">
        {showChildPicker && <div className={styles.intro}>
          <div><h2>按章节练习</h2><p>先看知识梳理，再做题；提交后逐题查看答案与解析。</p></div>
          <span className={styles.badge}>云端同步</span>
        </div>}
        {showChildPicker && linkedChildren.length > 0 && (
          <label className={styles.childPicker}>为哪位孩子练习
            <select value={childId} onChange={(event) => handleChildChange(event.target.value)}>
              {linkedChildren.map((child) => <option key={child.id} value={child.id}>{child.name} · {child.grade || '年级未设置'}</option>)}
            </select>
          </label>
        )}

        {savedResultsError && (
          <div className={styles.recordsError} role="alert">
            <span>练习记录暂时无法读取：{savedResultsError}。成绩徽标和错题重练入口可能暂未更新。</span>
            <Button size="small" loading={loadingSavedResults} onClick={() => void loadSavedResults(childId)}>重试</Button>
          </div>
        )}
        {!savedResultsError && loadingSavedResults && <p className={styles.recordsLoading} role="status">正在同步练习记录…</p>}

        {fromFeedback && focusTopics.length > 0 && (
          <div className={styles.feedbackPracticeContext}>
            <div className={styles.feedbackPracticeCopy}>
              <strong>从课堂反馈继续练习</strong>
              <p>根据老师本次记录的知识点筛选已上架题组；这表示课堂内容，不代表孩子已经掌握。</p>
              <div className={styles.feedbackPracticeTopics}>
                {focusTopics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}
                {focusTopics.length > 3 && <span>另有 {focusTopics.length - 3} 项</span>}
              </div>
            </div>
            {feedbackFocusActive && (
              <button
                type="button"
                className={styles.clearFeedbackFocus}
                onClick={() => { setFeedbackFocusActive(false); setExpandedChapters(new Set()) }}
              >
                浏览该学科全部章节
              </button>
            )}
          </div>
        )}

        {/* 学科 Tab */}
        <div className={styles.catalogLabel}>选择学科 <span>{localGrade}</span></div>
        <div className={styles.subjectTabs} aria-label="选择学科">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.subjectTab} ${s === activeSubjects ? styles.subjectTabActive : ''}`}
              onClick={() => { setActiveSubject(s); setExpandedChapters(new Set()) }}
              aria-pressed={s === activeSubjects}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 学科进度条 */}
        {subjectDone.total > 0 && (
          <div className={styles.subjectProgress}>
            <span className={styles.subjectProgressText}>{activeSubjects} {loadingSavedResults ? '进度同步中' : savedResultsError ? '进度暂时无法读取' : `已练 ${subjectDone.done}/${subjectDone.total} 节`}</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Math.round((subjectDone.done / subjectDone.total) * 100)}%` }} />
            </div>
          </div>
        )}

        {feedbackFocusActive && !contextualSets.some((set) => set.subject === activeSubjects) ? (
          <div className={styles.feedbackPracticeEmpty} role="status">
            <strong>暂未找到明确对应的已上架题组</strong>
            <p>为避免推荐错章节，你可以浏览 {activeSubjects || '当前年级'} 的全部已上架练习。</p>
            <button
              type="button"
              className={styles.clearFeedbackFocus}
              onClick={() => { setFeedbackFocusActive(false); setExpandedChapters(new Set()) }}
            >
              浏览全部章节
            </button>
          </div>
        ) : groupedChapters.length === 0 ? (
          <div className={styles.empty}>这个学科暂无已核对的小节题组。老师上传的题库文件仍会显示在下方；其他章节核对教材版本与答案后上架。</div>
        ) : (
          groupedChapters.map(([chapterKey, sets]) => {
            const doneCount = sets.filter((s) => savedResults[s.id]).length
            const isOpen = expandedChapters.has(chapterKey)
            return (
              <div className={styles.chapterGroup} key={chapterKey}>
                <button className={styles.chapterHeader} onClick={() => toggleChapter(chapterKey)} aria-expanded={isOpen}>
                  <span className={styles.chapterTitle}>{chapterKey}</span>
                  <span className={styles.chapterMeta}>
                    {doneCount > 0 ? <em className={styles.chapterDone}>{doneCount}/{sets.length}</em> : null}
                    <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▾</span>
                  </span>
                </button>
                {isOpen && (
                  <div className={styles.setList}>
                    {sets.map((set) => {
                      const saved = savedResults[set.id]
                      const scorePct = saved ? Math.round((saved.score / saved.total) * 100) : 0
                      const wrongCount = set.available ? saved?.wrongIds.length || 0 : 0
                      const easyCount = set.difficultyCounts?.easy || 0
                      const mediumCount = set.difficultyCounts?.medium || 0
                      const examCount = set.difficultyCounts?.challenge || 0
                      return (
                        <article className={styles.setCard} key={set.id}>
                          <div className={styles.setCardTop}>
                            <h4>{set.section}</h4>
                            {!set.available ? (
                              <span className={styles.untouchedBadge}>题目核验中</span>
                            ) : saved ? (
                              <span className={`${styles.scoreBadge} ${scorePct >= 80 ? styles.scoreGood : scorePct >= 60 ? styles.scoreMid : styles.scoreLow}`}>
                                {scorePct >= 80 ? <CheckOutlined /> : scorePct >= 60 ? null : <CloseOutlined />}{scorePct}%
                              </span>
                            ) : (
                              <span className={styles.untouchedBadge}>{loadingSavedResults ? '同步中' : savedResultsError ? '记录待同步' : '未练习'}</span>
                            )}
                          </div>
                          <p className={styles.setDesc}>{set.knowledgePoints.length} 个知识点 · {set.available ? `${set.questionCount} 道已核验题目` : '题目正在按当前教材整理'}</p>
                          {set.available && <div className={styles.questionLevelSummary} aria-label="各难度题目数量">
                            <span>基础 {easyCount}</span><span>提升 {mediumCount}</span><span>挑战 {examCount}</span>
                          </div>}
                          {set.available ? (
                            <PracticeSetActions setId={set.id} saved={Boolean(saved)} wrongCount={wrongCount}
                              disabled={!childId || !userId} reviewDisabled={loadingSavedResults || Boolean(savedResultsError) || !userId}
                              loading={openingSetId === set.id} onOpen={openSet} />
                          ) : (
                            <p className={styles.setDesc} role="note">目录已按教材定位，题目和答案核验完成后开放，避免练到错版本内容。</p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
        <p className={styles.storageNote}>正式练习与错题复练都会留档。临时答案保留在当前浏览器会话中；提交保存成功后，可再次登录回看记录。</p>
      </section>
    )
  }

  // ============ 做题模式 ============
  return (
    <section className={`${styles.sheet} ${onSessionChange ? styles.focusSheet : ''}`} aria-label="做题">
      {/* 顶部栏 */}
      <div className={styles.sheetTop}>
        <button className={styles.backBtn} disabled={saving} onClick={goBack} aria-label="返回章节列表">
          <LeftOutlined /> <span>返回</span>
        </button>
        <div className={styles.sheetTitleWrap}>
          <div className={styles.sheetTitle}>{activeSet.section}</div>
          <div className={styles.sheetMeta}>{linkedChildren.find((child) => child.id === childId)?.name} · {activeSet.chapter} · {reviewOnly ? '错题重练' : '在线练习'}</div>
        </div>
        <span className={styles.questionCounter}>{result ? questions.length : currentIndex + 1}/{questions.length}</span>
      </div>

      {draftNotice && !result && <p className={styles.storageNote} role="status">{draftNotice}</p>}
      {!result && (saving || saveError) && (
        <div className={saving ? styles.savePending : styles.saveFailure} role={saving ? 'status' : 'alert'}>
          <p>{saving ? '正在保存本次作答，确认成功后显示成绩与解析…' : saveError}</p>
          {!saving && saveError && <Button type="primary" onClick={submit}>核对并重试本次保存</Button>}
          {!saving && ['QUESTION_CHANGED', 'WRONG_SCOPE_CHANGED', 'INVALID_SUBMISSION'].includes(saveErrorCode) && (
            <Button onClick={() => Modal.confirm({
              title: '重新开始本次练习？', content: '服务器已拒绝本次提交。重新开始将清除这份临时答案，已保存的历史记录不会删除。',
              okText: '重新开始', cancelText: '保留作答', onOk: () => openSet(activeSet.id, reviewOnly, true),
            })}>重新开始</Button>
          )}
        </div>
      )}

      {/* 进度条 */}
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${Math.round(((currentIndex + (result ? questions.length : 0)) / questions.length) * 100)}%` }} />
      </div>

      {!reviewOnly && !result && (
        <div className={styles.practiceModeBar} role="group" aria-label="选择练习范围">
          <div className={styles.practiceModeCopy}>
            <strong>练习范围</strong>
            <span>默认优先练提升与挑战题，基础题仍可随时加入。</span>
          </div>
          <div className={styles.practiceModeChoices}>
            <button type="button" className={`${styles.practiceModeButton} ${practiceMode === 'challenge' ? styles.practiceModeButtonActive : ''}`} aria-pressed={practiceMode === 'challenge'} disabled={challengeQuestionCount === 0 || locked || saving} onClick={() => changePracticeMode('challenge')}>
              提升 + 挑战 · {challengeQuestionCount} 题
            </button>
            <button type="button" className={`${styles.practiceModeButton} ${practiceMode === 'all' ? styles.practiceModeButtonActive : ''}`} disabled={locked || saving} aria-pressed={practiceMode === 'all'} onClick={() => changePracticeMode('all')}>
              全部题目 · {activeSet.questions.length} 题
            </button>
          </div>
        </div>
      )}

      {/* 题号导航 */}
      {!result && (
        <div className={styles.answerCard} aria-label="题号导航">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined
            const isCurrent = idx === currentIndex
            return (
              <button
                key={q.id}
                type="button"
                className={`${styles.answerDot} ${isAnswered ? styles.answerDotDone : ''} ${isCurrent ? styles.answerDotCurrent : ''}`}
                onClick={() => jumpTo(idx)}
                aria-label={`第 ${idx + 1} 题${isAnswered ? '，已作答' : '，未作答'}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* 题目卡片 */}
      {!result && currentQuestion && (
        <div className={`${styles.questionCard} ${currentQuestion.imageUrl ? styles.illustratedQuestion : ''}`}>
          <div className={styles.questionTitle}>
            <span className={styles.questionIndex}>{currentIndex + 1}</span>
            {currentQuestion.imageQuestion ? (
              <span className={styles.promptText}>题目见下图</span>
            ) : (
              <span className={styles.promptText}><MathText text={currentQuestion.prompt} inline /></span>
            )}
          </div>
          <div className={styles.questionBadges} aria-label="题型和难度">
            <span>{{ single_choice: '单项选择', multiple_choice: '多项选择', fill_blank: '填空题', short_answer: '简答题' }[currentType]}</span>
            <span>{getDifficultyLabel(currentQuestion.difficulty)}</span>
          </div>
          {currentQuestion.imageQuestion ? (
            <button type="button" className={styles.imageZoomTrigger} onClick={() => openImagePreview(currentQuestion.imageUrl!, '题目原图')} aria-label="放大查看题目原图">
              <img src={currentQuestion.imageUrl} alt="题目" className={styles.imageQuestion} decoding="async" />
              <span>点按放大，查看完整题面</span>
            </button>
          ) : currentQuestion.imageUrl && (
            <PracticeCanvas src={currentQuestion.imageUrl} alt="题目配图" onOpenImage={() => openImagePreview(currentQuestion.imageUrl!, '题目配图原图')} />
          )}
          {(currentType === 'single_choice' || currentType === 'multiple_choice') && Array.isArray(currentQuestion.options) && (
            <>
              {currentQuestion.imageQuestion && (
                <p className={styles.imageOptionsHint}>原题图中包含题干和选项，点击下方对应字母作答</p>
              )}
              <div
                className={`${styles.options} ${currentQuestion.imageQuestion ? styles.imageOptions : ''}`}
                role="group"
                aria-label={currentQuestion.imageQuestion
                  ? '根据原题图选择一个答案'
                  : currentType === 'multiple_choice' ? '多项选择，可选多个答案' : '选择一个答案'}
              >
                {(sessionOptionOrders.get(currentQuestion.id) ?? currentQuestion.options.map((_, index) => index)).map((sourceOptionIndex, displayIndex) => {
                  const selected = currentType === 'multiple_choice'
                    ? Array.isArray(currentAnswer) && currentAnswer.includes(sourceOptionIndex)
                    : currentAnswer === sourceOptionIndex
                  return (
                    <button
                      key={sourceOptionIndex}
                      type="button"
                      disabled={locked || saving}
                      aria-pressed={selected}
                      aria-label={currentQuestion.imageQuestion
                        ? `选项 ${String.fromCharCode(65 + sourceOptionIndex)}：${currentQuestion.options?.[sourceOptionIndex] ?? ''}`
                        : undefined}
                      className={`${styles.option} ${selected ? styles.selected : ''}`}
                      onClick={() => chooseOption(currentQuestion.id, sourceOptionIndex)}
                    >
                      <span className={styles.optionLetter}>{currentType === 'multiple_choice' ? (selected ? '✓' : '□') : String.fromCharCode(65 + displayIndex)}</span>
                      {!currentQuestion.imageQuestion && (
                        <span className={styles.optionText}><MathText text={currentQuestion.options?.[sourceOptionIndex] ?? ''} inline /></span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {currentType === 'fill_blank' && (
            <div className={styles.shortAnswerWrap}>
              {Array.from({ length: currentBlankCount }, (_, blankIndex) => (
                <label key={blankIndex} className={styles.answerField}>
                  <span>{currentBlankCount > 1 ? `第 ${blankIndex + 1} 空` : '填写答案'}</span>
                  <input
                    value={Array.isArray(currentQuestion.correctAnswer) ? currentBlankValues[blankIndex] ?? '' : typeof currentAnswer === 'string' ? currentAnswer : ''}
                    maxLength={2000}
                    disabled={locked || saving}
                    onChange={(event) => Array.isArray(currentQuestion.correctAnswer)
                      ? enterBlankAnswer(currentQuestion.id, blankIndex, currentBlankCount, event.target.value)
                      : enterTextAnswer(currentQuestion.id, event.target.value)}
                    placeholder={currentBlankCount > 1 ? `填写第 ${blankIndex + 1} 空` : '输入本题答案'}
                    autoComplete="off"
                  />
                </label>
              ))}
            </div>
          )}
          {currentType === 'short_answer' && (
            <div className={styles.shortAnswerWrap}>
              <label className={styles.answerField}>
                <span>写下你的思路或结论</span>
                <textarea
                  value={currentAnswerText}
                  maxLength={5000}
                  disabled={locked || saving}
                  onChange={(event) => enterTextAnswer(currentQuestion.id, event.target.value)}
                  placeholder="先独立作答，再查看参考要点"
                  rows={5}
                />
              </label>
              {currentQuestion.gradingMode === 'exact' ? (
                <p className={styles.selfCheckHint}>本题按标准答案进行文本核对，注意规范书写。</p>
              ) : (
                <>
                  <button type="button" className={styles.revealAnswerBtn} disabled={locked || saving}
                    onClick={() => setRevealedAnswers((previous) => ({ ...previous, [currentQuestion.id]: !previous[currentQuestion.id] }))}>
                    {revealedAnswers[currentQuestion.id] ? '收起参考答案' : '查看参考答案与要点'}
                  </button>
                  {revealedAnswers[currentQuestion.id] && (
                    <div className={styles.referenceAnswer}>
                      <strong>参考要点</strong>
                      <MathText text={Array.isArray(currentQuestion.correctAnswer)
                        ? currentQuestion.correctAnswer.map((answer, index) => `第 ${index + 1} 项：${answer}`).join('；')
                        : currentQuestion.correctAnswer || '本题暂无可核对的参考答案，请联系老师确认。'} />
                    </div>
                  )}
                  <div className={styles.selfCheckChoices} role="group" aria-label="对照参考答案自评">
                    <span>对照后自评</span>
                    <button type="button" disabled={!revealedAnswers[currentQuestion.id] || !currentAnswerText.trim() || locked || saving}
                      aria-pressed={Boolean(currentAnswer && typeof currentAnswer === 'object' && !Array.isArray(currentAnswer) && 'selfRating' in currentAnswer && currentAnswer.selfRating === 'correct')}
                      onClick={() => rateShortAnswer(currentQuestion.id, 'correct')}>基本正确</button>
                    <button type="button" disabled={!revealedAnswers[currentQuestion.id] || !currentAnswerText.trim() || locked || saving}
                      aria-pressed={Boolean(currentAnswer && typeof currentAnswer === 'object' && !Array.isArray(currentAnswer) && 'selfRating' in currentAnswer && currentAnswer.selfRating === 'incorrect')}
                      onClick={() => rateShortAnswer(currentQuestion.id, 'incorrect')}>还需巩固</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 草稿纸：仅做题时显示，悬浮球 + 常驻浮动面板（收起后笔记保留） */}
      {!result && currentQuestion && (
        <>
          <button type="button" className={styles.draftBtn} onClick={() => setDraftOpen(true)}>
            <EditOutlined /> 打开草稿纸
          </button>
          <div className={`${styles.draftPanel} ${draftOpen ? styles.draftPanelOpen : ''}`} role="dialog" aria-label="草稿纸" aria-hidden={!draftOpen}>
            <div className={styles.draftHeader}>
              <span className={styles.draftTitle}>草稿纸 · 自由打草稿</span>
              <button className={styles.draftClose} onClick={() => setDraftOpen(false)} aria-label="收起草稿纸">
                <CloseOutlined />
              </button>
            </div>
            <PracticeCanvas whiteboard />
          </div>
        </>
      )}

      {/* 结果视图 */}
      {result && (
        <div className={styles.resultWrap}>
          <div className={styles.resultCard}>
            <div
              className={styles.ring}
              style={{ background: `conic-gradient(#C9A45C ${Math.round((result.score / result.total) * 100) * 3.6}deg, rgba(0,0,0,0.06) 0deg)` }}
            >
              <div className={styles.ringInner}>
                <div className={styles.ringScore}>{result.score}<small>/{result.total}</small></div>
                <div className={styles.ringLabel}>答对题数</div>
              </div>
            </div>
            <div className={styles.resultStats}>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue} style={{ color: result.score / result.total >= 0.8 ? '#1d9e75' : result.score / result.total >= 0.6 ? '#d98c00' : '#e24b4a' }}>
                  {Math.round((result.score / result.total) * 100)}%
                </div>
                <div className={styles.resultStatLabel}>正确率</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue} style={{ color: result.wrongIds.length ? '#e24b4a' : '#1d9e75' }}>{result.wrongIds.length}</div>
                <div className={styles.resultStatLabel}>错题</div>
              </div>
            </div>
          </div>
          <p className={styles.resultTip}>{result.wrongIds.length ? '下面可以对照解析，把错题再练一遍巩固掌握。' : '全部答对，继续保持！'}</p>
          <p className={styles.storageNote} role="status">本次作答已保存。章节徽标按各题最近一次答案统计，下面显示本次提交的成绩。</p>
          <div className={styles.resultActions}>
            {result.wrongIds.length > 0 && (
              <Button type="primary" disabled={loadingSavedResults || Boolean(savedResultsError)} className={styles.primaryBtn} onClick={() => openSet(activeSet.id, true, true)}>
                <ReloadOutlined /> 重练错题
              </Button>
            )}
            <Button className={styles.ghostBtn} onClick={() => openSet(activeSet.id, false, true)}>
              <ReloadOutlined /> 再做一次
            </Button>
            <Button className={styles.ghostBtn} onClick={goBack}>
              <AppstoreOutlined /> 返回章节
            </Button>
          </div>

          {/* 逐题解析 */}
          <div className={styles.reviewList}>
            {questions.map((question, idx) => {
              const questionType = question.type || 'single_choice'
              const userAnswer = answers[question.id]
              const isCorrect = isPracticeAnswerCorrect(question, userAnswer)
              const correctAnswerText = questionType === 'single_choice'
                ? question.options?.[question.answerIndex ?? -1] || '未提供标准答案'
                : questionType === 'multiple_choice'
                  ? (question.answerIndices || []).map((optionIndex) => question.options?.[optionIndex]).filter(Boolean).join('；') || '未提供标准答案'
                  : Array.isArray(question.correctAnswer)
                    ? question.correctAnswer.map((answer, answerIndex) => `第 ${answerIndex + 1} 项：${answer}`).join('；')
                    : question.correctAnswer || question.acceptedAnswers?.join('；') || '请对照参考要点'
              return (
                <div key={question.id} className={`${styles.reviewItem} ${isCorrect ? styles.reviewCorrect : styles.reviewWrong}`}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewNum}>第 {idx + 1} 题</span>
                    <span className={`${styles.reviewTag} ${isCorrect ? styles.reviewTagOk : styles.reviewTagNo}`}>
                      {isCorrect ? <><CheckOutlined /> 答对</> : <><CloseOutlined /> 答错</>}
                    </span>
                  </div>
                  {!question.imageQuestion && <div className={styles.reviewPrompt}><MathText text={question.prompt} inline /></div>}
                  {question.imageUrl && (
                    <div className={styles.reviewFigure}>
                      <button type="button" className={styles.reviewZoomTrigger} onClick={() => openImagePreview(question.imageUrl!, '题目原图')}>
                        <img src={question.imageUrl} alt="题目配图" loading="lazy" decoding="async" />
                        <span>放大查看题目</span>
                      </button>
                    </div>
                  )}
                  {question.answerImageUrl && (
                    <div className={styles.reviewFigure}>
                      <button type="button" className={styles.reviewZoomTrigger} onClick={() => openImagePreview(question.answerImageUrl!, '解析图示原图')}>
                        <img src={question.answerImageUrl} alt="解析图示" loading="lazy" decoding="async" />
                        <span>放大查看解析图</span>
                      </button>
                    </div>
                  )}
                  <div className={styles.reviewAnswer}>
                    {questionType === 'short_answer' && question.gradingMode !== 'exact' ? '参考要点：' : '正确答案：'}
                    <span className={styles.reviewAnswerText}><MathText text={correctAnswerText} inline /></span>
                    {!isCorrect && <span> · 你的作答：<MathText text={formatPracticeAnswer(question, userAnswer, false)} inline /></span>}
                  </div>
                  <div className={styles.reviewExplain}><MathText text={question.explanation} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 底部操作区 */}
      {!result && (
        <div className={styles.sheetFooter}>
          <Button className={styles.navBtn} disabled={currentIndex === 0} onClick={() => jumpTo(currentIndex - 1)}>
            <LeftOutlined /> 上一题
          </Button>
          <Button
            type="primary"
            className={styles.submit}
            loading={saving}
            onClick={locked || currentIndex === questions.length - 1 ? submit : () => jumpTo(currentIndex + 1)}
          >
            {locked ? '核对并保存本次作答' : currentIndex === questions.length - 1 ? '提交并保存' : '下一题'}
          </Button>
        </div>
      )}
      {previewImage && (
        <div className={styles.imagePreview} role="dialog" aria-modal="true" aria-label={previewImage.alt}>
          <div className={styles.imagePreviewTop}>
            <strong>{previewImage.alt}</strong>
            <div>
              <button type="button" onClick={() => setPreviewFit((fit) => !fit)}>{previewFit ? '原图大小' : '适应屏幕'}</button>
              <button type="button" onClick={() => setPreviewImage(null)} aria-label="关闭图片预览" autoFocus>关闭</button>
            </div>
          </div>
          <div className={styles.imagePreviewScroller}>
            <img src={previewImage.src} alt={previewImage.alt} className={previewFit ? styles.imagePreviewFit : styles.imagePreviewOriginal} decoding="async" />
          </div>
          <p className={styles.imagePreviewHint}>{previewFit ? '点击“原图大小”看清细节' : '左右滑动查看完整题面'}</p>
        </div>
      )}
    </section>
  )
}
