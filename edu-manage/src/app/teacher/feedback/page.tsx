'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Alert, Button, Image as AntImage, Input, Modal, Progress, Upload, Tag, Card, Select } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { BookOutlined, CameraOutlined, CheckCircleOutlined, DeleteOutlined, DownOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, SendOutlined, SearchOutlined, ThunderboltOutlined, UndoOutlined, UpOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { fetchJson } from '@/lib/fetch-json'
import { QUICK_TAGS, BADGES } from '@/components/FeedbackCard'
import { getKnowledgePointOptions } from '@/lib/classroom-feedback/subject-knowledge-points'
import { selectRelevantKnowledgePointCandidates } from '@/lib/classroom-feedback/knowledge-topic-candidates'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import type { TextbookCatalogOptionGroup } from '@/lib/classroom-feedback/textbook-catalog'
import { findKnowledgeTopicMismatch, type KnowledgeTopicMismatch } from '@/lib/classroom-feedback/feedback-quality'
import { articleSections } from '@/lib/classroom-feedback/ai-article'
import { getParentFeedbackDisplaySections } from '@/lib/classroom-feedback/parent-feedback-content'
import { parseStoredKnowledgeCard, type KnowledgePointCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { MobileSelect } from '@/components/MobileSelect'
import {
  hasMeaningfulFeedbackContent,
  hasRequiredLessonContent,
  LESSON_CONTENT_MAX_LENGTH,
  LESSON_CONTENT_MIN_LENGTH,
  MAX_STUDENTS_PER_FEEDBACK,
} from '@/lib/classroom-feedback/access'
import { parseCombinedFeedbackInput } from '@/lib/classroom-feedback/combined-input'
import { compressFeedbackImage, uploadFeedbackImage, type ImageUploadResponse } from '@/lib/client-image-upload'
import {
  readSensitiveSessionValue,
  removeLegacySensitiveStorage,
  removeSensitiveSessionValue,
  writeSensitiveSessionValue,
} from '@/lib/client-sensitive-storage'

const fetchFeedbackContext = (url: string) => fetchJson(url) as Promise<FeedbackContext>
const fetchStageData = (url: string) => fetchJson(url) as Promise<StageData>

function newClientRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

type FeedbackCourseBucket = 'GROUP' | 'ONE_ON_ONE'
type StudentPerfLevel = 'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'
const STUDENT_PERF_META: Record<StudentPerfLevel, { label: string; short: string; color: string; bg: string; border: string }> = {
  GREAT: { label: '积极', short: '积极', color: '#137A5A', bg: '#EAF7F1', border: '#BFE7D4' },
  OKAY: { label: '一般', short: '一般', color: '#7A6F5F', bg: '#F5F2EE', border: '#E5DDD4' },
  NEEDS_IMPROVEMENT: { label: '需提升', short: '需提升', color: '#C77F00', bg: '#FFF4DE', border: '#F3D6A6' },
}
const STUDENT_MASTERY_OPTIONS = ['掌握扎实', '基本掌握', '部分掌握', '需巩固'] as const
const STUDENT_STATE_TAGS = ['专注听讲', '积极发言', '书写认真', '练习完成', '有进步', '易走神', '粗心出错', '需多鼓励'] as const
type BonusPreview = {
  courseBucket: FeedbackCourseBucket
  label: string
  rate: number
  selectedCount: number
  eligibleCount: number
  duplicateCount: number
  total: number
  message: string
}
type BonusResult = {
  success?: boolean
  amount?: number
  message?: string
}
type FeedbackSubmitResponse = {
  feedback?: { id?: string }
  bonus?: BonusResult | null
  error?: string
}

type ImageDisplayUrls = Record<string, { thumbnailUrl: string; previewUrl: string }>
type TeacherFeedbackDraftPayload = {
  version: 1
  clientSavedAt: number
  groupId: string
  selectedStudentIds: string[]
  lessonContent: string
  summary: string
  overallComment: string
  perStudentComments: Record<string, string>
  studentObservations: Record<string, string>
  studentPerf: Record<string, StudentPerfLevel>
  studentTags: Record<string, string[]>
  studentMastery: Record<string, string>
  mood: string
  tags: string[]
  kps: string[]
  homework: string[]
  hwInput: string
  badge: string
  textbookCatalogKey: string
  knowledgeCard: KnowledgePointCard | null
  imageUrls: string[]
  stageSummaryText: string
  stageSuggestions: string
}

function hasTeacherFeedbackDraftContent(draft: TeacherFeedbackDraftPayload) {
  return Boolean(
    draft.groupId || draft.selectedStudentIds.length || draft.lessonContent.trim() || draft.summary.trim()
    || draft.overallComment.trim() || Object.values(draft.perStudentComments).some(Boolean)
    || Object.values(draft.studentObservations).some(Boolean) || Object.keys(draft.studentPerf).length
    || Object.values(draft.studentTags).some((items) => items.length) || Object.keys(draft.studentMastery).length
    || draft.tags.length || draft.kps.length || draft.homework.length || draft.hwInput.trim() || draft.badge
    || draft.textbookCatalogKey || draft.knowledgeCard
    || draft.imageUrls.length || draft.stageSummaryText.trim() || draft.stageSuggestions.trim(),
  )
}

type ChatMessageItem = {
  role: 'user' | 'assistant'
  content: string
  studentIds: string[]
  error?: boolean
  initialGenerationComplete?: boolean
}
type ChatApiResponse = {
  ok?: boolean
  mode?: 'generate' | 'followup'
  error?: string
  topic?: string
  knowledge?: string
  knowledgeSource?: string
  knowledgeError?: string
  card?: KnowledgePointCard | null
  results?: Array<{ studentId: string; article: string }>
  failed?: Array<{ studentId: string; error: string }>
}
type ImageUploadTask = {
  id: string
  file: File
  name: string
  status: 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  compressed?: boolean
}
type FeedbackStudent = { id: string; name: string; grade?: string | null; gender?: string | null; todayFeedback?: boolean }
type FeedbackGroup = {
  id: string
  groupId?: string
  name: string
  courseName?: string
  grade?: string | null
  courseType?: string | null
  subject?: string | null
  studentCount?: number
  course?: { type?: string | null }
  students: FeedbackStudent[]
}
const GRADE_ORDER = ['初一', '初二', '初三', '高一', '高二', '高三']
const SUBJECT_ORDER = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '道德与法治', '历史', '地理']

function feedbackGroupOrder(group: FeedbackGroup) {
  const label = `${group.grade || group.students[0]?.grade || ''} ${group.name || group.courseName || ''}`
  const gradeIndex = GRADE_ORDER.findIndex((grade) => label.includes(grade))
  const subjectIndex = SUBJECT_ORDER.indexOf(group.subject || '')
  return [gradeIndex < 0 ? 99 : gradeIndex, subjectIndex < 0 ? 99 : subjectIndex]
}

function inferFeedbackGrade(...sources: Array<string | null | undefined>) {
  const label = sources.filter(Boolean).join(' ').replace(/\s+/g, '')
  const direct = GRADE_ORDER.find((grade) => label.includes(grade))
  if (direct) return direct
  if (/(七年级|初中一年级|初中1年级)/.test(label)) return '初一'
  if (/(八年级|初中二年级|初中2年级)/.test(label)) return '初二'
  if (/(九年级|初中三年级|初中3年级)/.test(label)) return '初三'
  if (/(高中一年级|高一)/.test(label)) return '高一'
  if (/(高中二年级|高二)/.test(label)) return '高二'
  if (/(高中三年级|高三)/.test(label)) return '高三'
  return ''
}
type FeedbackContext = {
  groups: FeedbackGroup[]
  lessons: Array<{ id: string; groupId: string; scopeId?: string; subject?: string | null; studentIds?: string[] }>
  contextState?: string
  contextMessage?: string
}
type StageData = {
  draft?: { summary?: string; suggestions?: string } | null
  material?: { summarySeed?: string } | null
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function createUploadLimiter(maxConcurrent: number) {
  let active = 0
  const waiting: Array<() => void> = []

  const acquire = () => new Promise<void>((resolve) => {
    if (active < maxConcurrent) {
      active += 1
      resolve()
      return
    }
    waiting.push(() => {
      active += 1
      resolve()
    })
  })

  const release = () => {
    active = Math.max(0, active - 1)
    waiting.shift()?.()
  }

  return async <T,>(task: () => Promise<T>) => {
    await acquire()
    try {
      return await task()
    } finally {
      release()
    }
  }
}

// A phone can select several large photos at once. Limiting browser requests
// prevents concurrent Sharp jobs from exhausting the application server.
const runFeedbackUpload = createUploadLimiter(2)

function revokeLocalPreviews(displayUrls: ImageDisplayUrls) {
  const blobUrls = new Set(
    Object.values(displayUrls)
      .flatMap((item) => [item.thumbnailUrl, item.previewUrl])
      .filter((url) => url.startsWith('blob:')),
  )
  blobUrls.forEach((url) => URL.revokeObjectURL(url))
}

function toFeedbackCourseBucket(value: unknown): FeedbackCourseBucket {
  return value === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
}

function mergeUnique<T>(base: T[], extra: T[]) {
  return [...new Set([...(base || []), ...(extra || [])].filter(Boolean))]
}

function money(value: number) {
  return Number(value.toFixed(2)).toString()
}

function joinDistinctText(...values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).join('\n')
}

function isExpandedFeedbackDraft(value: string) {
  const text = value.trim()
  return Boolean(text && (articleSections(text) || text.length >= 220 || /\n\s*\n/.test(text)))
}

function formatAgo(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp)
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  return `${Math.floor(diff / 3_600_000)} 小时前`
}

function FeedbackPageInner() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const draftKey = session?.user?.id ? `teacher-feedback-draft:${session.user.id}` : ''
  const isMobile = useIsMobile() ?? false
  const searchParams = useSearchParams()
  const requestedLessonId = searchParams.get('lessonId')?.trim() || ''
  const requestedStudentId = searchParams.get('studentId')?.trim() || ''

  // State
  const [groupId, setGroupId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [studentTagLibraryExpanded, setStudentTagLibraryExpanded] = useState(false)
  const [todayFeedbackByScope, setTodayFeedbackByScope] = useState<Record<string, boolean>>({})
  const [studentPerf, setStudentPerf] = useState<Record<string, StudentPerfLevel>>({})
  const [studentSearch, setStudentSearch] = useState('')
  const [mood, setMood] = useState('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [kps, setKps] = useState<string[]>([])
  const [textbookCatalogOptions, setTextbookCatalogOptions] = useState<TextbookCatalogOptionGroup[]>([])
  const [textbookCatalogKey, setTextbookCatalogKey] = useState('')
  const [textbookCatalogLoading, setTextbookCatalogLoading] = useState(false)
  const [badge, setBadge] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [summary, setSummary] = useState('')
  const [overallComment, setOverallComment] = useState('')
  const [perStudentComments, setPerStudentComments] = useState<Record<string, string>>({})
  const [homework, setHomework] = useState<string[]>([])
  const [hwInput, setHwInput] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageDisplayUrls, setImageDisplayUrls] = useState<ImageDisplayUrls>({})
  const { urls: signedImageUrls } = useSignedUrls(imageUrls.map((url) => imageDisplayUrls[url]?.thumbnailUrl || imageDisplayUrls[url]?.previewUrl || url))
  const { urls: signedImagePreviews } = useSignedUrls(imageUrls.map((url) => imageDisplayUrls[url]?.previewUrl || imageDisplayUrls[url]?.thumbnailUrl || url))
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [moreExpanded, setMoreExpanded] = useState(false)
  const [studentsExpanded, setStudentsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadTasks, setUploadTasks] = useState<ImageUploadTask[]>([])
  const [submitDone, setSubmitDone] = useState(false)
  const [bonusPreview, setBonusPreview] = useState<BonusPreview | null>(null)
  const [bonusLoading, setBonusLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [autosaveState, setAutosaveState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'offline' | 'error'>('loading')
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null)
  const [localDraftAvailable, setLocalDraftAvailable] = useState(true)
  const submitCooldownRef = useRef(false)
  const pendingFeedbackRequestIdsRef = useRef(new Map<string, { fingerprint: string; requestId: string }>())
  const pendingBatchRequestRef = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const latestDraftKeyRef = useRef(draftKey)
  const hydratedDraftKeyRef = useRef('')
  const lastHydratedDraftKeyRef = useRef('')
  const switchingDraftOwnerRef = useRef(false)
  const serverDraftMayExistRef = useRef(false)
  const latestDraftPayloadRef = useRef<TeacherFeedbackDraftPayload | null>(null)
  const latestDraftSequenceRef = useRef(0)
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const draftRetryTimerRef = useRef<number | null>(null)
  const draftRetryAttemptRef = useRef(0)
  const localDraftAvailableRef = useRef(true)
  const updateLocalDraftAvailability = useCallback((available: boolean) => {
    localDraftAvailableRef.current = available
    setLocalDraftAvailable(available)
  }, [])
  const draftAbortRef = useRef<AbortController | null>(null)
  const lessonContentRef = useRef<TextAreaRef>(null)
  const structuredClassroomRecord = useMemo(
    () => parseCombinedFeedbackInput(lessonContent),
    [lessonContent],
  )
  const resolvedStructuredRecord = structuredClassroomRecord

  // AI generation
  const [studentObservations, setStudentObservations] = useState<Record<string, string>>({})
  const [studentTags, setStudentTags] = useState<Record<string, string[]>>({})
  const [studentMastery, setStudentMastery] = useState<Record<string, string>>({})
  // 自定义标签常用库（localStorage 持久化，本机教师通用）
  const CUSTOM_TAG_POOL_KEY = 'mzt_teacher_custom_tags'
  const loadCustomTagPool = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(CUSTOM_TAG_POOL_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, 30) : []
    } catch { return [] }
  }
  const [customTagPool, setCustomTagPool] = useState<string[]>(loadCustomTagPool)
  const [addTagFor, setAddTagFor] = useState<string | null>(null)
  const [newTagText, setNewTagText] = useState('')
  const [aiKnowledge, setAiKnowledge] = useState<{ topic: string; knowledge: string; source: string } | null>(null)
  const [knowledgeCard, setKnowledgeCard] = useState<KnowledgePointCard | null>(null)
  const [aiTopicWarning, setAiTopicWarning] = useState<KnowledgeTopicMismatch | null>(null)
  const aiInputSignatureRef = useRef('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiWaitingMessageIndex, setAiWaitingMessageIndex] = useState(0)
  const [aiPrefilled, setAiPrefilled] = useState<Set<string>>(new Set())
  // AI 扩写（对话式助手）：生成后直接写入每名学生反馈草稿，可继续追问调整
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  // 生成进度：chatBusy 时爬升到 90%，完成后归零
  const [aiProgress, setAiProgress] = useState(0)
  // 追问目标：默认沿用上一次 AI 影响的学生，界面明确展示本次将修改谁
  const [chatTargetIds, setChatTargetIds] = useState<string[]>([])
  // 每名学生草稿的 AI 最近更新时间与「撤销本次修改」快照
  const [aiUpdatedAt, setAiUpdatedAt] = useState<Record<string, number>>({})
  const [aiUndo, setAiUndo] = useState<Record<string, string | null>>({})
  // 老师手动编辑过的学生草稿：AI 覆盖前必须确认
  const userEditedRef = useRef<Set<string>>(new Set())
  // 切换课程/学生时作废旧请求，防止迟到的 AI 回复写入新框
  const chatSeqRef = useRef(0)
  const chatAbortRef = useRef<AbortController | null>(null)
  const chatMessagesRef = useRef<ChatMessageItem[]>([])
  const perStudentCommentsRef = useRef<Record<string, string>>({})
  const overallCommentRef = useRef('')

  useEffect(() => { chatMessagesRef.current = chatMessages }, [chatMessages])
  useEffect(() => { perStudentCommentsRef.current = perStudentComments }, [perStudentComments])
  useEffect(() => { overallCommentRef.current = overallComment }, [overallComment])

  useEffect(() => {
    chatSeqRef.current += 1
    chatAbortRef.current?.abort()
    setChatTargetIds([])
  }, [groupId, selectedStudentIds])

  useEffect(() => {
    aiInputSignatureRef.current = JSON.stringify({ groupId, selectedStudentIds, lessonContent, studentObservations, studentPerf })
  }, [groupId, selectedStudentIds, lessonContent, studentObservations, studentPerf])

  useEffect(() => {
    if (!aiGenerating && !chatBusy) {
      setAiWaitingMessageIndex(0)
      setAiProgress(0)
      return
    }
    const timer = window.setInterval(() => {
      setAiWaitingMessageIndex((index) => (index + 1) % 4)
      setAiProgress((progress) => Math.min(90, progress + 12))
    }, 1500)
    return () => window.clearInterval(timer)
  }, [aiGenerating, chatBusy])

  // Stage summary (only when 1 student selected)
  const [stageExpanded, setStageExpanded] = useState(false)
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [stageSummaryText, setStageSummaryText] = useState('')
  const [stageSuggestions, setStageSuggestions] = useState('')
  const draftPayload = useMemo<TeacherFeedbackDraftPayload>(() => ({
    version: 1,
    clientSavedAt: 0,
    groupId,
    selectedStudentIds,
    lessonContent,
    summary,
    overallComment,
    perStudentComments,
    studentObservations,
    studentPerf,
    studentTags,
    studentMastery,
    mood,
    tags,
    kps,
    homework,
    hwInput,
    badge,
    textbookCatalogKey,
    knowledgeCard,
    imageUrls,
    stageSummaryText,
    stageSuggestions,
  }), [badge, groupId, homework, hwInput, imageUrls, knowledgeCard, kps, lessonContent, mood, overallComment, perStudentComments, selectedStudentIds, stageSuggestions, stageSummaryText, studentMastery, studentObservations, studentPerf, studentTags, summary, tags, textbookCatalogKey])
  useEffect(() => { latestDraftKeyRef.current = draftKey }, [draftKey])
  useEffect(() => { latestDraftPayloadRef.current = draftPayload }, [draftPayload])

  const queueDraftSaveRef = useRef<(payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive?: boolean) => void>(() => undefined)
  const queueDraftSave: (payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive?: boolean) => void = useCallback((payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive = false) => {
    draftSaveQueueRef.current = draftSaveQueueRef.current.catch(() => undefined).then(async () => {
      if (sequence < latestDraftSequenceRef.current) return
      try {
        const controller = new AbortController()
        draftAbortRef.current = controller
        const response = await fetch('/api/teacher/feedback-draft', {
          method: payload ? 'PUT' : 'DELETE',
          headers: payload ? { 'Content-Type': 'application/json' } : undefined,
          body: payload ? JSON.stringify({ payload: { ...payload, clientSavedAt: Date.now() } }) : undefined,
          keepalive,
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`草稿同步失败（${response.status}）`)
        serverDraftMayExistRef.current = Boolean(payload)
        if (sequence === latestDraftSequenceRef.current) {
          draftRetryAttemptRef.current = 0
          setAutosaveState(payload ? 'saved' : 'idle')
          setAutosavedAt(payload ? Date.now() : null)
        }
      } catch {
        if (sequence === latestDraftSequenceRef.current) {
          setAutosaveState(localDraftAvailableRef.current ? 'offline' : 'error')
          if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current)
          const retryAttempt = ++draftRetryAttemptRef.current
          if (retryAttempt <= 3) {
            draftRetryTimerRef.current = window.setTimeout(() => {
              if (sequence === latestDraftSequenceRef.current) queueDraftSaveRef.current(payload, sequence)
            }, retryAttempt * 4000)
          }
        }
      }
    })
  }, [])
  useEffect(() => { queueDraftSaveRef.current = queueDraftSave }, [queueDraftSave])

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !draftKey) return
    setDraftLoaded(false)
    switchingDraftOwnerRef.current = Boolean(lastHydratedDraftKeyRef.current && lastHydratedDraftKeyRef.current !== draftKey)
    hydratedDraftKeyRef.current = ''
    setAutosaveState('loading')
    latestDraftSequenceRef.current += 1
    draftAbortRef.current?.abort()
    serverDraftMayExistRef.current = false
    try { removeLegacySensitiveStorage() } catch { /* continue with server-side recovery */ }
    let cancelled = false
    let localDraft: Record<string, unknown> | null = null
    try {
      localDraft = readSensitiveSessionValue<Record<string, unknown>>(draftKey, 8 * 60 * 60 * 1000)
    } catch {
      updateLocalDraftAvailability(false)
      try { removeSensitiveSessionValue(draftKey) } catch { /* session storage may be unavailable */ }
    }
    const initialFormFingerprint = JSON.stringify(latestDraftPayloadRef.current)

    const restoreDraft = (draft: Record<string, unknown>) => {
      if (typeof draft.groupId === 'string') setGroupId(draft.groupId)
      if (Array.isArray(draft.selectedStudentIds)) setSelectedStudentIds(draft.selectedStudentIds.filter((item): item is string => typeof item === 'string').slice(0, MAX_STUDENTS_PER_FEEDBACK))
      if (typeof draft.lessonContent === 'string') setLessonContent(draft.lessonContent.slice(0, 5000))
      if (typeof draft.summary === 'string') setSummary(draft.summary.slice(0, 500))
      if (typeof draft.overallComment === 'string') setOverallComment(draft.overallComment.slice(0, 1400))
      if (draft.perStudentComments && typeof draft.perStudentComments === 'object' && !Array.isArray(draft.perStudentComments)) {
        setPerStudentComments(Object.fromEntries(Object.entries(draft.perStudentComments)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .slice(0, MAX_STUDENTS_PER_FEEDBACK).map(([id, value]) => [id, value.slice(0, 1400)])))
      }
      if (draft.studentObservations && typeof draft.studentObservations === 'object' && !Array.isArray(draft.studentObservations)) {
        setStudentObservations(Object.fromEntries(Object.entries(draft.studentObservations)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .slice(0, MAX_STUDENTS_PER_FEEDBACK).map(([id, value]) => [id, value.slice(0, 350)])))
      }
      if (draft.studentPerf && typeof draft.studentPerf === 'object' && !Array.isArray(draft.studentPerf)) {
        setStudentPerf(Object.fromEntries(Object.entries(draft.studentPerf)
          .filter((entry): entry is [string, StudentPerfLevel] => entry[1] === 'GREAT' || entry[1] === 'OKAY' || entry[1] === 'NEEDS_IMPROVEMENT')))
      }
      if (draft.studentTags && typeof draft.studentTags === 'object' && !Array.isArray(draft.studentTags)) {
        setStudentTags(Object.fromEntries(Object.entries(draft.studentTags)
          .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
          .slice(0, MAX_STUDENTS_PER_FEEDBACK)
          .map(([id, values]) => [id, values.filter((value): value is string => typeof value === 'string').slice(0, 30)])))
      }
      if (draft.studentMastery && typeof draft.studentMastery === 'object' && !Array.isArray(draft.studentMastery)) {
        setStudentMastery(Object.fromEntries(Object.entries(draft.studentMastery)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .slice(0, MAX_STUDENTS_PER_FEEDBACK).map(([id, value]) => [id, value.slice(0, 80)])))
      }
      if (typeof draft.mood === 'string') setMood(draft.mood)
      if (Array.isArray(draft.tags)) setTags(draft.tags.filter((item): item is string => typeof item === 'string').slice(0, 40))
      if (Array.isArray(draft.kps)) setKps(draft.kps.filter((item): item is string => typeof item === 'string').slice(0, 20))
      if (Array.isArray(draft.homework)) setHomework(draft.homework.filter((item): item is string => typeof item === 'string').slice(0, 30))
      if (typeof draft.hwInput === 'string') setHwInput(draft.hwInput.slice(0, 500))
      if (typeof draft.badge === 'string') setBadge(draft.badge)
      if (typeof draft.textbookCatalogKey === 'string') setTextbookCatalogKey(draft.textbookCatalogKey.slice(0, 200))
      setKnowledgeCard(parseStoredKnowledgeCard(draft.knowledgeCard))
      if (Array.isArray(draft.imageUrls)) setImageUrls(draft.imageUrls.filter((item): item is string => typeof item === 'string').slice(0, 9))
      if (typeof draft.stageSummaryText === 'string') setStageSummaryText(draft.stageSummaryText.slice(0, 500))
      if (typeof draft.stageSuggestions === 'string') setStageSuggestions(draft.stageSuggestions.slice(0, 200))
    }

    void (async () => {
      let remoteDraft: { payload?: Record<string, unknown>; updatedAt?: string } | null = null
      let remoteLoadSucceeded = false
      try {
        const response = await fetch('/api/teacher/feedback-draft', { cache: 'no-store' })
        if (!response.ok) throw new Error('草稿读取失败')
        const data = await response.json() as { draft?: { payload?: Record<string, unknown>; updatedAt?: string } | null }
        remoteDraft = data.draft || null
        remoteLoadSucceeded = true
      } catch {
        remoteLoadSucceeded = false
      }
      if (cancelled) return

      serverDraftMayExistRef.current = Boolean(remoteDraft)
      const localSavedAt = typeof localDraft?.clientSavedAt === 'number' ? localDraft.clientSavedAt : 0
      const remoteSavedAt = remoteDraft?.updatedAt ? Date.parse(remoteDraft.updatedAt) : 0
      const typedDuringLoad = JSON.stringify(latestDraftPayloadRef.current) !== initialFormFingerprint
      const restored = typedDuringLoad
        ? null
        : localDraft && localSavedAt > remoteSavedAt ? localDraft : remoteDraft?.payload || localDraft
      if (restored) restoreDraft(restored)
      if (!remoteDraft && !localDraft) setAutosaveState(remoteLoadSucceeded ? 'idle' : 'error')
      if (remoteDraft && (!localDraft || remoteSavedAt >= localSavedAt)) setAutosavedAt(remoteSavedAt || null)
      hydratedDraftKeyRef.current = draftKey
      lastHydratedDraftKeyRef.current = draftKey
      switchingDraftOwnerRef.current = false
      setDraftLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [draftKey, sessionStatus, updateLocalDraftAvailability])

  useEffect(() => {
    if (!draftLoaded || !draftKey || hydratedDraftKeyRef.current !== draftKey) return
    const payload = latestDraftPayloadRef.current
    if (!payload) return
    let localSaved = true
    if (hasTeacherFeedbackDraftContent(payload)) {
      try { writeSensitiveSessionValue(draftKey, { ...payload, clientSavedAt: Date.now() }) } catch { localSaved = false }
    } else {
      try { removeSensitiveSessionValue(draftKey) } catch { localSaved = false }
    }
    updateLocalDraftAvailability(localSaved)

    const sequence = ++latestDraftSequenceRef.current
    if (!hasTeacherFeedbackDraftContent(payload)) {
      setAutosaveState(serverDraftMayExistRef.current ? 'saving' : 'idle')
      if (serverDraftMayExistRef.current) {
        if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current)
        queueDraftSave(null, sequence)
      }
      return
    }

    serverDraftMayExistRef.current = true
    setAutosaveState(localSaved ? 'saving' : 'error')
    draftRetryAttemptRef.current = 0
    if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current)
    const timer = window.setTimeout(() => queueDraftSave(payload, sequence), 1200)
    return () => window.clearTimeout(timer)
  }, [draftKey, draftLoaded, draftPayload, queueDraftSave, updateLocalDraftAvailability])

  useEffect(() => {
    if (!draftKey) return
    const flushLatestDraft = () => {
      if (latestDraftKeyRef.current !== draftKey) return
      const payload = latestDraftPayloadRef.current
      if (!payload) return
      const hasContent = hasTeacherFeedbackDraftContent(payload)
      if (hydratedDraftKeyRef.current !== draftKey) {
        if (switchingDraftOwnerRef.current || lastHydratedDraftKeyRef.current) return
        if (hasContent) {
          try { writeSensitiveSessionValue(draftKey, { ...payload, clientSavedAt: Date.now() }) } catch { updateLocalDraftAvailability(false) }
        }
        return
      }
      let localSaved = true
      try {
        if (hasContent) writeSensitiveSessionValue(draftKey, { ...payload, clientSavedAt: Date.now() })
        else if (draftLoaded) removeSensitiveSessionValue(draftKey)
      } catch { localSaved = false }
      updateLocalDraftAvailability(localSaved)
      if (!draftLoaded || (!hasContent && !serverDraftMayExistRef.current)) return
      draftRetryAttemptRef.current = 0
      if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current)
      const sequence = ++latestDraftSequenceRef.current
      queueDraftSave(hasContent ? payload : null, sequence, true)
    }
    window.addEventListener('pagehide', flushLatestDraft)
    window.addEventListener('online', flushLatestDraft)
    return () => {
      window.removeEventListener('pagehide', flushLatestDraft)
      window.removeEventListener('online', flushLatestDraft)
      if (draftLoaded) flushLatestDraft()
    }
  }, [draftKey, draftLoaded, queueDraftSave, updateLocalDraftAvailability])

  useEffect(() => {
    if (!draftLoaded || !draftKey || hydratedDraftKeyRef.current !== draftKey || (autosaveState !== 'offline' && autosaveState !== 'error')
      || !hasTeacherFeedbackDraftContent(draftPayload)) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [autosaveState, draftKey, draftLoaded, draftPayload])

  // Data
  const { data: ctx, error: ctxError, mutate: mutateCtx } = useSWR<FeedbackContext>('/api/teacher/feedback-context', fetchFeedbackContext)
  const groups = ctx?.groups || []
  const sortedGroups = [...groups].sort((a, b) => {
    const [gradeA, subjectA] = feedbackGroupOrder(a)
    const [gradeB, subjectB] = feedbackGroupOrder(b)
    return gradeA - gradeB || subjectA - subjectB || (a.name || a.courseName || '').localeCompare(b.name || b.courseName || '', 'zh-CN')
  })

  useEffect(() => {
    if (!requestedLessonId || !ctx?.lessons?.length) return
    const lesson = ctx.lessons.find((item) => item.id === requestedLessonId)
    if (!lesson) return
    setGroupId(lesson.scopeId || lesson.groupId)
    if (Array.isArray(lesson.studentIds) && lesson.studentIds.length) {
      setSelectedStudentIds(lesson.studentIds.slice(0, MAX_STUDENTS_PER_FEEDBACK))
    }
  }, [ctx?.lessons, requestedLessonId])

  // 从「我的学员」进入：自动选中该学员及其所在班级，避免教师二次搜索
  useEffect(() => {
    if (requestedLessonId || !requestedStudentId || !groups.length) return
    const candidateGroups = groups.filter((group) =>
      Array.isArray(group.students) && group.students.some((student) => student.id === requestedStudentId),
    )
    if (!candidateGroups.length) return
    const preferred = candidateGroups.find((g) => g.students.some((s) => s.id === requestedStudentId && !s.todayFeedback))
      || candidateGroups[0]
    setGroupId(preferred.id || preferred.groupId || preferred.id)
    setSelectedStudentIds([requestedStudentId])
  }, [groups, requestedLessonId, requestedStudentId])


  // Selected group
  const selectedGroup = groups.find((g) => g.id === groupId)
    || groups.find((g) => g.groupId === groupId)
  const selectedActualGroupId = selectedGroup?.groupId || selectedGroup?.id || ''
  const groupStudents = useMemo(() => selectedGroup?.students || [], [selectedGroup])
  // Resolve grade from the course first; relying only on a selected student made the
  // unselected state fall back to every grade's knowledge-point catalogue.
  const selectedGrade = useMemo(() => inferFeedbackGrade(
    selectedGroup?.grade,
    groupStudents.find((student) => student.id === selectedStudentIds[0])?.grade,
    groupStudents[0]?.grade,
    selectedGroup?.name,
    selectedGroup?.courseName,
  ), [selectedGroup, groupStudents, selectedStudentIds])
  const selectedSubject = selectedGroup?.subject || ''
  const selectedCatalogKey = selectedSubject && selectedGrade ? `${selectedGrade}|${selectedSubject}` : ''
  const isJuniorGrade = ['初一', '初二', '初三'].includes(normalizeTextbookGrade(selectedGrade))

  // Load the institution's 43-volume directory draft only when teachers open the optional detail section.
  // Next keeps this dynamic import out of the initial page bundle.
  useEffect(() => {
    setTextbookCatalogOptions([])
    setTextbookCatalogKey('')
    if (!moreExpanded || !selectedCatalogKey) {
      setTextbookCatalogLoading(false)
      return
    }

    let active = true
    setTextbookCatalogLoading(true)
    import('@/lib/classroom-feedback/textbook-catalog')
      .then((module) => {
        if (!active) return
        setTextbookCatalogOptions(module.getTextbookCatalogSelectOptions(selectedSubject, selectedGrade))
        setTextbookCatalogKey(selectedCatalogKey)
      })
      .catch(() => {
        if (active) toast.error('教材目录暂时无法读取，请按课本原有章节填写')
      })
      .finally(() => {
        if (active) setTextbookCatalogLoading(false)
      })

    return () => { active = false }
  }, [moreExpanded, selectedCatalogKey, selectedSubject, selectedGrade])

  // Keep the unverified directory draft out of automatic topic checks; include only existing options and teacher selections.
  const legacyKps = useMemo(() => {
    if (!selectedSubject || !selectedGrade) return []
    return getKnowledgePointOptions(selectedSubject, selectedGrade)
  }, [selectedSubject, selectedGrade])
  const dynamicKps = useMemo(() => [...new Set([
    ...legacyKps,
    ...kps,
  ])], [legacyKps, kps])
  const hasTextbookCatalogForSelection = Boolean(
    selectedCatalogKey && textbookCatalogKey === selectedCatalogKey && textbookCatalogOptions.length,
  )

  // Filtered students
  const filteredStudents = studentSearch
    ? groupStudents.filter((s) => s.name.includes(studentSearch))
    : groupStudents

  const feedbackCourseBucket: FeedbackCourseBucket = toFeedbackCourseBucket(selectedGroup?.courseType || selectedGroup?.course?.type)
  const feedbackSceneLabel = feedbackCourseBucket === 'ONE_ON_ONE' ? '一对一反馈' : '小班反馈'
  const feedbackRateLabel = feedbackCourseBucket === 'ONE_ON_ONE' ? '1元/人' : '0.5元/人'
  const selectedStudentNames = selectedStudentIds
    .map((id) => groupStudents.find((student) => student.id === id)?.name)
    .filter(Boolean) as string[]
  const previewFeedbackItems = selectedStudentIds.map((id) => {
    const studentName = groupStudents.find((student) => student.id === id)?.name || '该学生'
    const individualComment = (selectedStudentIds.length === 1 ? overallComment : perStudentComments[id])?.trim() || ''
    const hasGeneratedDraft = Boolean(aiUpdatedAt[id]) || isExpandedFeedbackDraft(individualComment)
    const source = selectedStudentIds.length === 1
      ? hasGeneratedDraft
        ? individualComment
        : joinDistinctText(resolvedStructuredRecord.feedback, individualComment)
      : individualComment || joinDistinctText(resolvedStructuredRecord.feedback, overallComment)
    const section = getParentFeedbackDisplaySections({
      overallComment: source,
      studentName: individualComment ? studentName : undefined,
    })[0]
    return { id, studentName, content: section?.content || '' }
  }).filter((item) => item.content)

  // 从「我的学员」进入时，展示当前反馈对象，让教师确认上下文
  const requestedStudentName = useMemo(() => {
    if (!requestedStudentId || !groups.length) return ''
    return groups.flatMap((group) => group.students || []).find((student) => student.id === requestedStudentId)?.name || ''
  }, [groups, requestedStudentId])

  useEffect(() => {
    const targetStudents: string[] = selectedStudentIds
    if (!targetStudents.length) {
      setBonusPreview(null)
      return
    }
    let cancelled = false
    setBonusLoading(true)
    fetch('/api/feedback/bonus-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: targetStudents,
        groupId: selectedActualGroupId || null,
        feedbackCourseType: feedbackCourseBucket,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled) setBonusPreview(data) })
      .catch(() => { if (!cancelled) setBonusPreview(null) })
      .finally(() => { if (!cancelled) setBonusLoading(false) })
    return () => { cancelled = true }
  }, [selectedStudentIds, selectedActualGroupId, feedbackCourseBucket])

  // ── Stage summary load when single student selected ──
  const stageStudentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null
  const { data: stageDataRaw } = useSWR<StageData>(
    stageStudentId ? `/api/teacher/stage-summary?studentId=${stageStudentId}&months=3` : null,
    fetchStageData,
  )
  // Sync SWR data → local state
  useEffect(() => {
    if (stageDataRaw && stageDataRaw !== stageData) {
      setStageData(stageDataRaw)
      if (stageDataRaw.draft) {
        setStageSummaryText(stageDataRaw.draft.summary || '')
        setStageSuggestions(stageDataRaw.draft.suggestions || '')
      } else if (!stageStudentId) {
        setStageSummaryText('')
        setStageSuggestions('')
      }
    }
    if (!stageStudentId) {
      setStageData(null)
      setStageSummaryText('')
      setStageSuggestions('')
    }
  }, [stageStudentId, stageDataRaw]) // eslint-disable-line

  const toggleStudent = (id: string) => {
    const selected = selectedStudentIds.includes(id)
    if (!selected && selectedStudentIds.length >= MAX_STUDENTS_PER_FEEDBACK) {
      toast.warning('一次最多反馈5名学生')
      return
    }
    setSelectedStudentIds(prev => selected ? prev.filter(s => s !== id) : [...prev, id])
    setEditingStudentId(current => !selected
      ? id
      : current === id
        ? selectedStudentIds.find(studentId => studentId !== id) || null
        : current)
    if (selected) {
      setStudentPerf(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setStudentTags(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setStudentMastery(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }
  const selectAll = () => {
    // 只勾选今天尚未反馈过的学生；未反馈的不足5人就选几人，不把已反馈的补进来
    const notDone = filteredStudents.filter((s) => !(s.todayFeedback || todayFeedbackByScope[`${selectedActualGroupId}:${s.id}`]))
    const selectedIds = notDone.slice(0, MAX_STUDENTS_PER_FEEDBACK).map((s) => s.id)
    if (selectedIds.length === 0) {
      toast('本班学生今天都已反馈过', { duration: 3000 })
    } else if (notDone.length > MAX_STUDENTS_PER_FEEDBACK) {
      toast(`一次最多反馈5名学生，已优先选择${MAX_STUDENTS_PER_FEEDBACK}名未反馈学员`, { duration: 3000 })
    } else if (notDone.length > 1) {
      toast(`已选择${notDone.length}名未反馈学员`, { duration: 3000 })
    }
    setSelectedStudentIds(selectedIds)
    setEditingStudentId(selectedIds[0] || null)
  }
  const clearAll = () => {
    setSelectedStudentIds([])
    setEditingStudentId(null)
    setStudentPerf({})
    setStudentTags({})
    setStudentMastery({})
  }
  const handleFeedbackGroupChange = (nextGroupId: string) => {
    if (nextGroupId === groupId) return
    if (uploadingCount > 0 || aiGenerating) {
      toast.warning(uploadingCount > 0 ? '课堂图片仍在上传，请完成后再切换课程' : 'AI整理尚未完成，请稍后再切换课程')
      return
    }

    chatSeqRef.current += 1
    chatAbortRef.current?.abort()
    chatAbortRef.current = null
    userEditedRef.current.clear()
    revokeLocalPreviews(imageDisplayUrls)

    setGroupId(nextGroupId)
    setSelectedStudentIds([])
    setEditingStudentId(null)
    setStudentSearch('')
    setStudentPerf({})
    setStudentObservations({})
    setStudentTags({})
    setStudentMastery({})
    setStudentTagLibraryExpanded(false)
    setAddTagFor(null)
    setNewTagText('')
    setMood('GOOD')
    setTags([])
    setKps([])
    setTextbookCatalogKey('')
    setTextbookCatalogOptions([])
    setTextbookCatalogLoading(false)
    setBadge('')
    setLessonContent('')
    setSummary('')
    setOverallComment('')
    setPerStudentComments({})
    setHomework([])
    setHwInput('')
    setImageUrls([])
    setImageDisplayUrls({})
    setUploadTasks([])
    setKnowledgeCard(null)
    setAiKnowledge(null)
    setAiTopicWarning(null)
    setAiPrefilled(new Set())
    setChatMessages([])
    setChatInput('')
    setChatBusy(false)
    setAiGenerating(false)
    setAiWaitingMessageIndex(0)
    setAiProgress(0)
    setChatTargetIds([])
    setAiUpdatedAt({})
    setAiUndo({})
    setStageData(null)
    setStageSummaryText('')
    setStageSuggestions('')
    setStageExpanded(false)
    setBonusPreview(null)
    setBonusLoading(false)
    setPreviewOpen(false)
    setStudentsExpanded(true)
  }
  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  const toggleKp = (kp: string) => setKps(prev => prev.includes(kp) ? prev.filter(k => k !== kp) : [...prev, kp])
  const markTodayFeedback = (feedbackGroupId: string, studentIds: string[]) => {
    if (!feedbackGroupId) return
    setTodayFeedbackByScope((current) => {
      const next = { ...current }
      for (const studentId of studentIds) next[`${feedbackGroupId}:${studentId}`] = true
      return next
    })
  }

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith('image/') && !/\.(heic|heif|avif)$/i.test(file.name)) {
      toast.warning('仅支持图片文件（JPG、PNG、WebP、HEIC）')
      return false
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.warning('图片不能超过 20MB，请压缩后重新上传')
      return false
    }
    return true
  }

  const processImageUpload = async (
    file: File,
    taskId: string,
    callbacks?: {
      onSuccess?: (response: ImageUploadResponse) => void
      onError?: (error: Error) => void
    },
  ) => {
    const localPreviewUrl = URL.createObjectURL(file)
    setUploadTasks(current => {
      const nextTask: ImageUploadTask = {
        id: taskId,
        file,
        name: file.name,
        status: 'compressing',
        progress: 0,
      }
      return current.some(task => task.id === taskId)
        ? current.map(task => task.id === taskId ? nextTask : task)
        : [...current, nextTask]
    })
    setUploadingCount(count => count + 1)
    try {
      const data = await runFeedbackUpload(async () => {
        const compressed = await compressFeedbackImage(file)
        setUploadTasks(current => current.map(task => task.id === taskId ? {
          ...task,
          status: 'uploading',
          progress: 1,
          compressed: compressed.compressed,
        } : task))
        return uploadFeedbackImage(compressed.file, percent => {
          setUploadTasks(current => current.map(task => task.id === taskId
            ? { ...task, progress: percent }
            : task))
        })
      })
      if (data.assetPersisted === false) {
        throw new Error('图片记录保存失败，请点击重试')
      }
      const url = data.file?.storageKey || data.url
      if (!url) throw new Error(data.error || '服务器未返回图片地址')
      setImageUrls(current => current.includes(url) ? current : [...current, url])
      setImageDisplayUrls(current => ({
        ...current,
        [url]: {
          thumbnailUrl: localPreviewUrl || data.thumbnailUrl || data.previewUrl || url,
          previewUrl: localPreviewUrl || data.previewUrl || data.thumbnailUrl || url,
        },
      }))
      setUploadTasks(current => current.map(task => task.id === taskId
        ? { ...task, status: 'success', progress: 100, error: undefined }
        : task))
      callbacks?.onSuccess?.(data)
    } catch (cause) {
      URL.revokeObjectURL(localPreviewUrl)
      const error = cause instanceof Error ? cause : new Error('上传失败，请点击重试')
      setUploadTasks(current => current.map(task => task.id === taskId
        ? { ...task, status: 'error', error: error.message }
        : task))
      callbacks?.onError?.(error)
    } finally {
      setUploadingCount(count => Math.max(0, count - 1))
    }
  }

  const submit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (saving || (status === 'PUBLISHED' && submitCooldownRef.current)) return
    if (uploadingCount > 0) {
      toast.warning(`还有 ${uploadingCount} 张图片正在上传，请上传完成后再发布`)
      return
    }
    const targetStudents: string[] = selectedStudentIds
    if (!targetStudents.length) { toast.warning('请选择学员'); return }
    if (targetStudents.length > MAX_STUDENTS_PER_FEEDBACK) { toast.warning('一次最多反馈5名学生'); return }
    const parsedRecord = resolvedStructuredRecord
    const activeArticle = articleSections(overallComment)
      || targetStudents.map((studentId) => articleSections(perStudentComments[studentId] || '')).find(Boolean)
    const selectedDraft = targetStudents.length === 1
      ? overallComment || perStudentComments[targetStudents[0]] || ''
      : targetStudents.map((studentId) => perStudentComments[studentId] || '').find(isExpandedFeedbackDraft) || overallComment
    const hasGeneratedArticle = targetStudents.some((studentId) => Boolean(aiUpdatedAt[studentId]))
      || isExpandedFeedbackDraft(selectedDraft)
    let resolvedLessonContent = activeArticle?.[0] || parsedRecord.lessonContent
    let resolvedSummary = activeArticle ? summary : joinDistinctText(parsedRecord.mastery, summary)
    const singleStudentComment = targetStudents.length === 1 ? perStudentComments[targetStudents[0]]?.trim() : ''
    const resolvedOverallComment = activeArticle || hasGeneratedArticle
      ? (overallComment || singleStudentComment).trim()
      : joinDistinctText(parsedRecord.feedback, overallComment || singleStudentComment)
    if (status === 'PUBLISHED' && !hasRequiredLessonContent(resolvedLessonContent)) {
      toast.warning(`请填写本节课堂记录（至少${LESSON_CONTENT_MIN_LENGTH}个字）`)
      window.requestAnimationFrame(() => {
        document.getElementById('lesson-content')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        lessonContentRef.current?.focus()
      })
      return
    }
    const studentRatings = targetStudents
      .filter((studentId) => Boolean(studentPerf[studentId]))
      .map((studentId) => ({ studentId, rating: studentPerf[studentId] }))
    const individualComments = targetStudents
      .map((studentId) => ({ studentId, comment: perStudentComments[studentId]?.trim() || '' }))
    const useIndividualComments = status === 'PUBLISHED' && targetStudents.length > 1
    if (useIndividualComments) {
      // 自动关联：把课堂记录与掌握情况中提及学生姓名的句子，自动归入对应学生的专属评语，
      // 共同内容自动净化，发布时每位家长只看到自己孩子的内容。
      const knownNames = groupStudents
        .filter((student) => student.name.length >= 2)
        .sort((a, b) => b.name.length - a.name.length)
      const perStudentExtra: Record<string, string[]> = {}
      const collectMentioned = (text: string, cleanOut: string[]) => {
        for (const sentence of text.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean)) {
          const hit = knownNames.find((student) => sentence.includes(student.name))
          if (hit) {
            ;(perStudentExtra[hit.id] ||= []).push(sentence)
          } else {
            cleanOut.push(sentence)
          }
        }
      }
      const cleanLesson: string[] = []
      collectMentioned(resolvedLessonContent, cleanLesson)
      const cleanSummary: string[] = []
      collectMentioned(resolvedSummary, cleanSummary)
      for (const item of individualComments) {
        const extra = perStudentExtra[item.studentId] || []
        if (extra.length) item.comment = joinDistinctText(item.comment, extra.join('\n'))
      }
      const cleanLessonText = cleanLesson.join('\n').trim()
      const cleanSummaryText = cleanSummary.join('\n').trim()
      if (cleanLessonText) {
        resolvedLessonContent = cleanLessonText
      } else if (Object.keys(perStudentExtra).length) {
        resolvedLessonContent = '本节课围绕当次课程内容展开教学，课堂要点与孩子表现详见专属评语。'
      }
      resolvedSummary = cleanSummaryText
    }
    if (!hasMeaningfulFeedbackContent({
      lessonContent: resolvedLessonContent,
      overallComment: individualComments.some((item) => item.comment)
        ? joinDistinctText(resolvedOverallComment, ...individualComments.map((item) => item.comment))
        : resolvedOverallComment,
      summary: resolvedSummary,
      knowledgePoints: kps,
      homework,
      studentRatings,
      badge,
      tags,
    })) {
      toast.warning('反馈内容不能为空'); return
    }
    setSaving(true)
    try {
      let fbData: FeedbackSubmitResponse = {}
      const individualBonuses: BonusResult[] = []
      if (useIndividualComments) {
        const publishedIds: string[] = []
        const failedItems: typeof individualComments = []
        for (const item of individualComments) {
          const requestBody = {
            classLessonId: requestedLessonId || null,
            groupId: selectedActualGroupId || null,
            feedbackGroupId: selectedActualGroupId || null,
            subject: selectedGroup?.subject || null,
            feedbackCourseType: feedbackCourseBucket,
            targetType: 'STUDENT' as const,
            studentIds: [item.studentId],
            lessonContent: resolvedLessonContent,
            mood, tags, knowledgePoints: kps, knowledgeCard, badge,
            summary: resolvedSummary,
            overallComment: item.comment || resolvedOverallComment,
            homework: homework.map((h, homeworkIndex) => ({ order: homeworkIndex + 1, content: h })),
            imageUrls, status,
            studentRatings: studentRatings.filter((rating) => rating.studentId === item.studentId),
          }
          const fingerprint = JSON.stringify(requestBody)
          const pending = pendingFeedbackRequestIdsRef.current.get(item.studentId)
          const requestId = pending?.fingerprint === fingerprint ? pending.requestId : newClientRequestId()
          pendingFeedbackRequestIdsRef.current.set(item.studentId, { fingerprint, requestId })
          try {
            const fbRes = await fetch('/api/teacher/classroom-feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...requestBody, clientRequestId: requestId }),
            })
            const data = await fbRes.json().catch(() => ({})) as FeedbackSubmitResponse
            if (!fbRes.ok) {
              failedItems.push(item)
              console.warn('[teacher-feedback] student publish failed', { studentId: item.studentId, status: fbRes.status })
              continue
            }
            pendingFeedbackRequestIdsRef.current.delete(item.studentId)
            publishedIds.push(item.studentId)
            if (data.bonus) individualBonuses.push(data.bonus)
            if (status === 'PUBLISHED') markTodayFeedback(selectedActualGroupId, [item.studentId])
          } catch (error) {
            failedItems.push(item)
            console.warn('[teacher-feedback] student publish network error', { studentId: item.studentId, error })
          }
        }
        if (failedItems.length) {
          const failedIds = new Set(failedItems.map((item) => item.studentId))
          setSelectedStudentIds(targetStudents.filter((id) => failedIds.has(id)))
          if (failedItems.length === 1) setOverallComment(perStudentComments[failedItems[0].studentId] || resolvedOverallComment)
          const failedNames = failedItems.map((item) => groupStudents.find((student) => student.id === item.studentId)?.name || '该学生')
          toast.error(`反馈部分完成：成功 ${publishedIds.length} 人，失败 ${failedItems.length} 人（${failedNames.join('、')}）。再次提交将只重试失败学生。`, { duration: 7000 })
          return
        }
      } else {
        const requestBody = {
          classLessonId: requestedLessonId || null, studentIds: targetStudents,
          groupId: selectedActualGroupId || null,
          feedbackGroupId: selectedActualGroupId || null,
          subject: selectedGroup?.subject || null,
          feedbackCourseType: feedbackCourseBucket,
          lessonContent: resolvedLessonContent,
          mood, tags, knowledgePoints: kps, knowledgeCard, badge,
          summary: resolvedSummary,
          overallComment: resolvedOverallComment,
          homework: homework.map((h, i) => ({ order: i + 1, content: h })),
          imageUrls, status, studentRatings,
        }
        const fingerprint = JSON.stringify(requestBody)
        const pending = pendingBatchRequestRef.current
        const requestId = pending?.fingerprint === fingerprint ? pending.requestId : newClientRequestId()
        pendingBatchRequestRef.current = { fingerprint, requestId }
        const fbRes = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, clientRequestId: requestId }),
        })
        fbData = await fbRes.json().catch(() => ({})) as FeedbackSubmitResponse
        if (!fbRes.ok) { toast.error(`反馈发布失败：${fbData.error || '请检查网络后重试'}`, { duration: 5000 }); return }
        pendingBatchRequestRef.current = null
        if (status === 'PUBLISHED') markTodayFeedback(selectedActualGroupId, targetStudents)
      }

      let stagePublished = false
      if (status === 'PUBLISHED' && stageStudentId && stageSummaryText.trim()) {
        const s1 = await fetch('/api/teacher/stage-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: stageStudentId,
            periodStart: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10),
            periodEnd: new Date().toISOString().slice(0, 10),
            summary: stageSummaryText,
            suggestions: stageSuggestions,
          }),
        })
        const d1 = await s1.json()
        if (s1.ok && d1.stageSummary?.id) {
          await fetch('/api/teacher/stage-summary', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: d1.stageSummary.id, action: 'publish' }),
          })
          stagePublished = true
        }
      }

      if (status === 'PUBLISHED') {
        const bonus = useIndividualComments
          ? {
              success: individualBonuses.every((item) => item?.success),
              amount: individualBonuses.reduce((sum, item) => sum + Number(item?.amount || 0), 0),
              message: individualBonuses.map((item) => item?.message).filter(Boolean).join('；'),
            }
          : fbData.bonus
          const bonusMsg = bonus?.success
          ? Number(bonus.amount || 0) > 0
            ? bonus.message
            : '本次反馈已记录，该教师今日对该学生该学科已奖励过，本次不重复计奖'
          : '奖励统计稍后可在工资流水中查看'
        const msg = useIndividualComments
          ? `已分别发布给 ${individualComments.length} 名学生家长`
          : stagePublished ? `已发布给家长，本期寄语已同步，${bonusMsg}` : `已发布给家长，${bonusMsg}`
        toast.success(msg, { duration: 5000 })
        submitCooldownRef.current = true
        window.setTimeout(() => { submitCooldownRef.current = false }, 3000)
        setSubmitDone(true); setTimeout(() => setSubmitDone(false), 3000)
        pendingFeedbackRequestIdsRef.current.clear()
        pendingBatchRequestRef.current = null
        setSelectedStudentIds([]); setGroupId('')
        setMood('GOOD'); setTags([]); setKps([]); setBadge('')
        setLessonContent(''); setSummary(''); setOverallComment(''); setPerStudentComments({}); setStudentPerf({}); setHomework([]); setImageUrls([])
        revokeLocalPreviews(imageDisplayUrls); setImageDisplayUrls({})
        setUploadTasks([])
        setStageSummaryText(''); setStageSuggestions('')
        setAiPrefilled(new Set())
        setStageData(null); setStageExpanded(false); setStudentObservations({}); setStudentTags({}); setStudentMastery({}); setAiKnowledge(null); setKnowledgeCard(null); setAiTopicWarning(null)
          setChatMessages([]); setChatInput(''); setChatTargetIds([]); setAiUpdatedAt({}); setAiUndo({})
          userEditedRef.current.clear()
          chatSeqRef.current += 1
          chatAbortRef.current?.abort()
      } else { toast.success('草稿已保存', { duration: 2000 }) }
    } catch (error) {
      toast.error(`反馈提交失败：${errorMessage(error, '网络异常，请检查连接后重试')}`, { duration: 5000 })
    } finally { setSaving(false) }
  }
  // 覆盖保护：目标学生草稿被老师手动编辑过时，先确认再覆盖
  const requestAiOverwrite = (targetIds: string[], run: () => void) => {
    const edited = targetIds.filter((id) => userEditedRef.current.has(id))
    if (!edited.length) { run(); return }
    const names = edited
      .map((id) => groupStudents.find((student) => student.id === id)?.name || '该学生')
      .join('、')
    Modal.confirm({
      title: '覆盖已手动编辑的草稿？',
      content: `${names} 的反馈草稿你手动修改过，新的扩写结果将覆盖这些修改。覆盖前可随时用「撤销本次修改」恢复原文。`,
      okText: '覆盖草稿',
      cancelText: '取消',
      okButtonProps: { style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } },
      onOk: run,
    })
  }

  // 把 AI 结果写入草稿（只填草稿，不自动发布），并记录撤销快照
  const applyAiResults = (
    results: Array<{ studentId: string; article: string }>,
    meta: { card: KnowledgePointCard | null; topic: string; knowledge: string; source: string; topicMismatch?: KnowledgeTopicMismatch | null },
  ) => {
    if (results.length) {
      const single = selectedStudentIds.length === 1
      setAiUndo((current) => {
        const next = { ...current }
        for (const item of results) {
          next[item.studentId] = single ? overallCommentRef.current : (perStudentCommentsRef.current[item.studentId] || null)
        }
        return next
      })
      const now = Date.now()
      setAiUpdatedAt((current) => ({ ...current, ...Object.fromEntries(results.map((item) => [item.studentId, now])) }))
      results.forEach((item) => userEditedRef.current.delete(item.studentId))
      if (single) {
        setOverallComment(results[0].article)
        setPerStudentComments({})
      } else {
        setPerStudentComments((current) => ({ ...current, ...Object.fromEntries(results.map((item) => [item.studentId, item.article])) }))
      }
    }
    if (meta.topicMismatch) {
      // Keep the generated explanation visible and warn the teacher so the topic can be checked.
      const generatedTopics = new Set([meta.topic, aiKnowledge?.topic].filter((topic): topic is string => Boolean(topic)))
      if (meta.card) setKnowledgeCard(meta.card)
      else setKnowledgeCard((current) => current?.verified ? current : null)
      setAiKnowledge(null)
      setKps((current) => current.filter((topic) => !generatedTopics.has(topic)))
    } else {
      if (meta.card) setKnowledgeCard(meta.card)
      if (meta.topic) {
        setAiKnowledge({ topic: meta.topic, knowledge: meta.knowledge, source: meta.source })
        setKps((current) => mergeUnique(current, [meta.topic]))
      }
    }
    setAiPrefilled(new Set([
      ...(results.length ? ['comment'] : []),
      ...(!meta.topicMismatch && meta.topic ? ['kps'] : []),
    ]))
  }

  const undoAiEdit = (studentId: string) => {
    if (!(studentId in aiUndo)) return
    const before = aiUndo[studentId]
    setPerStudentComments((current) => ({ ...current, [studentId]: before || '' }))
    if (selectedStudentIds.length === 1) setOverallComment(before || '')
    setAiUndo((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    setAiUpdatedAt((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    toast.success('已撤销本次修改')
  }

  // 对话式 AI 入口：首轮输入课堂要点直接为每位学生生成反馈并填入草稿；
  // 后续追问默认修改当前目标学生，可继续对话调整。
  const sendChatMessage = async (forceInput?: string) => {
    if (!selectedStudentIds.length) { toast.warning('请先勾选要反馈的学生'); return }
    const note = (forceInput ?? chatInput).trim()
    if (!note.length) { toast.warning('请输入课堂要点或修改要求'); return }
    // Keep using the original generation flow until the page actually has a
    // knowledge card. Validation notices or failed requests can add chat
    // messages, but they must not turn the next attempt into a follow-up.
    const hasCompletedInitialGeneration = chatMessages.some((message) => message.initialGenerationComplete)
    const firstTurn = !knowledgeCard || !hasCompletedInitialGeneration
    if (firstTurn && note.replace(/\s/g, '').length < 4) {
      toast.warning('请先写至少 4 个字的真实知识点或课堂要点'); return
    }
    let classroomOnlyStudentIds: string[] = []
    if (firstTurn) {
      // 每位学生至少 2 个标签：掌握档位算 1 个，行为标签另计（档位 + 行为 ≥ 2，或纯行为 ≥ 2）
      const missing = selectedStudentIds.filter((id) => {
        const tags = studentTags[id] || []
        const hasMastery = Boolean(studentMastery[id])
        return tags.length + (hasMastery ? 1 : 0) < 2
      })
      if (missing.length) {
        // 先生成不推断个人表现的课堂总结；有足够表现标签的学生仍生成个性化反馈。
        classroomOnlyStudentIds = missing
      }
    }
    if (firstTurn) setAiTopicWarning(null)
    const targetIds = firstTurn ? selectedStudentIds : (chatTargetIds.length ? chatTargetIds : selectedStudentIds)
    const seq = ++chatSeqRef.current
    chatAbortRef.current?.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller
    setChatBusy(true)
    setChatTargetIds(targetIds)
    setChatMessages((current) => [...current, { role: 'user', content: note, studentIds: targetIds }])
    setChatInput('')
    const draftPayload = selectedStudentIds.map((id) => ({ studentId: id, draft: perStudentCommentsRef.current[id] || '' }))

    const run = async () => {
      try {
        const res = await fetch('/api/teacher/ai-feedback/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: firstTurn ? 'generate' : 'followup',
            classroomOnlyStudentIds,
            userInput: note,
            classLessonId: requestedLessonId || null,
            groupId: selectedActualGroupId || null,
            subject: selectedGroup?.subject || null,
            studentIds: selectedStudentIds,
            targetStudentIds: targetIds,
            observations: Object.fromEntries(selectedStudentIds.map((id) => [id, studentObservations[id] || ''])),
            performance: studentPerf,
            mastery: studentMastery,
            tags: studentTags,
            selectedTextbookChapters: kps,
            messages: firstTurn ? [] : chatMessagesRef.current.slice(-6).map((item) => ({ role: item.role, content: item.content })),
            drafts: draftPayload,
          }),
        })
        const data = await res.json() as ChatApiResponse
        if (chatSeqRef.current !== seq) return
        if (!res.ok) throw new Error(data.error || '反馈生成失败，请稍后重试')
        const generatedTopic = data.card?.topic || data.topic || ''
        const lessonTextForCheck = note
        const detectedTopicMismatch = firstTurn && generatedTopic
          ? findKnowledgeTopicMismatch(
              lessonTextForCheck,
              generatedTopic,
              selectRelevantKnowledgePointCandidates(dynamicKps, lessonTextForCheck),
            )
          : null
        if (firstTurn) setAiTopicWarning(detectedTopicMismatch)
        const topicMismatch = firstTurn ? detectedTopicMismatch : aiTopicWarning
        applyAiResults(data.results || [], {
          card: firstTurn ? data.card || null : null,
          topic: firstTurn ? generatedTopic : '',
          knowledge: firstTurn ? data.knowledge || '' : '',
          source: firstTurn ? data.knowledgeSource || '' : '',
          topicMismatch,
        })
        const updatedNames = data.results?.length
          ? data.results.map((item) => groupStudents.find((student) => student.id === item.studentId)?.name || '学生').join('、')
          : ''
        const failedText = data.failed?.length ? `；${data.failed.map((item) => item.error).join('；')}` : ''
        const knowledgeErrorText = firstTurn && data.knowledgeError ? `；${data.knowledgeError}` : ''
        const classroomOnlyDraftCount = data.results?.filter((item) => classroomOnlyStudentIds.includes(item.studentId)).length || 0
        const topicWarningText = topicMismatch
          ? `；知识点复核：课堂记录提到“${topicMismatch.lessonTopic}”，识别到的知识点为“${topicMismatch.generatedTopic}”。请核对下方知识详解是否对应本节内容，再发布。`
          : ''
        const assistantText = firstTurn && classroomOnlyStudentIds.length
          ? data.results?.length
            ? `已根据课堂内容识别「${generatedTopic || data.card?.topic || '本课知识点'}」并整理反馈草稿。${classroomOnlyDraftCount ? `${classroomOnlyDraftCount} 名学生的草稿只总结本课内容和练习建议，不包含个人表现评价。` : ''}补充这些学生的课堂表现标签后，可继续生成个性化反馈。${failedText}${topicWarningText}${knowledgeErrorText}`
            : data.card
              ? `已生成「${generatedTopic || data.card.topic}」知识点详解，但课堂反馈草稿未生成，请根据下方原因重试。${failedText}${topicWarningText}${knowledgeErrorText}`
              : `已读取课堂内容，但知识点详解和课堂反馈草稿均未生成。请把章节或知识点名称写得更明确后重试。${failedText}${topicWarningText}${knowledgeErrorText}`
          : firstTurn
          ? data.results?.length
            ? `已为 ${data.results.length} 名学生写入反馈草稿${updatedNames ? `（${updatedNames}）` : ''}，请逐条核对后发布。${failedText}${topicWarningText}${knowledgeErrorText}`
            : generatedTopic
              ? `已识别本节知识点「${generatedTopic}」，但学生反馈草稿未生成，请根据下方原因补充后重试。${failedText}${topicWarningText}${knowledgeErrorText}`
              : `学生反馈草稿未生成，请根据下方原因补充后重试。${failedText}${topicWarningText}${knowledgeErrorText}`
          : `已按你的要求更新${updatedNames ? ` ${updatedNames}` : ''} 的草稿。${failedText}${topicWarningText}`
        setChatMessages((current) => [...current, {
          role: 'assistant',
          content: assistantText,
          studentIds: targetIds,
          initialGenerationComplete: Boolean(firstTurn && !classroomOnlyStudentIds.length && data.card),
        }])
        if (data.knowledgeError) toast.warning(data.knowledgeError)
        else if (firstTurn && classroomOnlyStudentIds.length && data.results?.length && data.card) toast.success('知识点详解和课堂反馈草稿已生成')
        else if (firstTurn && classroomOnlyStudentIds.length && data.results?.length) toast.success('课堂反馈草稿已生成，请核对知识点详解')
        else if (firstTurn && classroomOnlyStudentIds.length && data.card) toast.success('知识点详解已生成，请补充更明确的表现信息后重试反馈草稿')
        else if (firstTurn && classroomOnlyStudentIds.length) toast.warning('本次未生成知识点详解，请补充更明确的课堂知识点后重试')
        else if (data.results?.length && topicMismatch) toast.warning('学生反馈草稿已生成，知识点可能匹配不准确，请核对后再发布')
        else if (data.results?.length) toast.success(`已整理 ${data.results.length} 名学生的反馈草稿`)
        else if (firstTurn && generatedTopic) toast.warning('知识点已识别，学生反馈未完成，请重试')
        if (data.failed?.length) toast.warning(data.failed[0].error)
      } catch (error) {
        if (chatSeqRef.current !== seq || (error instanceof DOMException && error.name === 'AbortError')) return
        const message = errorMessage(error, '反馈生成失败')
        setChatMessages((current) => [...current, { role: 'assistant', content: message, studentIds: targetIds, error: true }])
        toast.error(message)
        setChatInput(note)
      } finally {
        if (chatSeqRef.current === seq) setChatBusy(false)
      }
    }
    requestAiOverwrite(targetIds, run)
  }
  const stageAiGenerate = async (target: 'summary' | 'suggestion') => {
    if (!stageStudentId) return
    setAiGenerating(true)
    const hint = target === 'summary' ? '帮我生成教师寄语' : '帮我写下一步建议'
    try {
      const roster = groupStudents.map((s) => ({ id: s.id, name: s.name }))
      const res = await fetch('/api/teacher/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: hint,
          roster,
          selectedStudentIds: [stageStudentId],
          selectedStudents: groupStudents.filter((s) => s.id === stageStudentId).map((s) => ({ id: s.id, name: s.name })),
          stageMaterial: stageData?.material?.summarySeed?.slice(0, 600) || '',
          options: { moods: [], tags: [], knowledgePoints: [] },
          selected: {},
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '反馈生成失败'); return }
      if (target === 'summary' && data.stageSummaryText) {
        setStageSummaryText(data.stageSummaryText)
        toast.success('已生成教师寄语')
      } else if (target === 'suggestion' && data.stageSuggestions) {
        setStageSuggestions(data.stageSuggestions)
        toast.success('已生成下一步建议')
      } else if (target === 'summary' && data.overallComment) {
        setStageSummaryText(data.overallComment)
        toast.success('已生成教师寄语')
      } else {
        toast.warning('暂未整理出对应内容，请检查课堂要点后重试')
      }
    } catch (e: unknown) { toast.error(errorMessage(e, '反馈生成失败')) }
    finally { setAiGenerating(false) }
  }

  const aiPrefillMark = (key: string) => aiPrefilled.has(key)
    ? <Tag color="green" style={{ fontSize: 10, marginLeft: 6, borderRadius: 4 }}>已预填</Tag>
    : null
  const aiWaitingMessages = [
    '正在理解你的描述…',
    `正在为 ${selectedStudentIds.length} 名学生分别撰写评语…`,
    '正在匹配表现标签和知识点…',
    '快好了，正在整理格式…',
  ]
  // 已选学生的横向评价卡：姓名 + 三个档位按钮（默认一般）+ 移除
  const renderStudentPerfPicker = (studentId: string) => {
    const level = studentPerf[studentId] || 'OKAY'
    const options: StudentPerfLevel[] = ['GREAT', 'OKAY', 'NEEDS_IMPROVEMENT']
    return (
      <div className="teacher-feedback-perf-picker">
        {options.map((option) => {
          const meta = STUDENT_PERF_META[option]
          const active = level === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={(event) => { event.stopPropagation(); setStudentPerf(prev => ({ ...prev, [studentId]: option })) }}
              className={`teacher-feedback-perf-option${active ? ' is-active' : ''}`}
              style={active ? { '--perf-color': meta.color, '--perf-bg': meta.bg, '--perf-border': meta.border } as CSSProperties : undefined}
            >
              {meta.short}
            </button>
          )
        })}
      </div>
    )
  }

  // 自定义标签：仅本次使用 / 存入常用库（两档）
  const confirmAddTag = (saveToPool: boolean) => {
    const studentId = addTagFor
    const tag = newTagText.trim().slice(0, 10)
    if (!studentId || !tag) return
    setStudentTags(prev => {
      const current = prev[studentId] || []
      return current.includes(tag) ? prev : { ...prev, [studentId]: [...current, tag] }
    })
    if (saveToPool) {
      setCustomTagPool(prev => {
        if (prev.includes(tag)) return prev
        const next = [...prev, tag].slice(0, 30)
        try { window.localStorage.setItem(CUSTOM_TAG_POOL_KEY, JSON.stringify(next)) } catch { /* 隐私模式忽略 */ }
        return next
      })
    }
    setAddTagFor(null)
    setNewTagText('')
  }
  const cancelAddTag = () => {
    setAddTagFor(null)
    setNewTagText('')
  }

  const formSection = (
    <div className="teacher-feedback-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isMobile && <div className="teacher-feedback-mobile-step-title">② 填写课堂反馈</div>}
      {!isMobile && (bonusPreview || bonusLoading) && (
        <Card size="small" style={{ borderRadius: 14, border: '1px solid rgba(232,120,74,.22)', background: '#FFF6F1' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#B85B32', marginBottom: 4 }}>反馈奖励预览</div>
          <div style={{ fontSize: 12, color: '#7A4A2A', lineHeight: 1.7 }}>
            {bonusLoading ? '正在计算预计奖励...' : bonusPreview?.message}
          </div>
        </Card>
      )}
      <Card
        id="lesson-content"
        size="small"
        className="teacher-feedback-step-card teacher-feedback-content-card"
        style={{
          borderRadius: 14,
          border: '1px solid var(--color-hairline)',
          background: 'var(--color-surface-1)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <BookOutlined style={{ color: 'var(--color-primary)', fontSize: 18, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>
              课堂反馈内容 <span style={{ color: 'var(--color-error)' }}>*</span>
            </div>
            <div style={{ color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6, marginTop: 2 }}>
              写下课堂要点和学生表现，整理为清晰的家校反馈。
            </div>
          </div>
        </div>
        <Input.TextArea
          className="teacher-feedback-paste-input"
          ref={lessonContentRef}
          value={lessonContent}
          onChange={(event) => {
            setLessonContent(event.target.value)
          }}
          rows={isMobile ? 3 : 3}
          maxLength={LESSON_CONTENT_MAX_LENGTH}
          showCount
          aria-required="true"
          aria-describedby="lesson-content-help"
            placeholder={'例如：今天练习了一元一次方程，重点讲了移项和去括号；课堂计算步骤清楚，应用题还需注意审题。'}
          style={{ borderRadius: 10, fontSize: 14, lineHeight: 1.7 }}
        />
        <div id="lesson-content-help" style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 6 }}>
          输入知识点和真实课堂情况即可；发布时至少填写 {LESSON_CONTENT_MIN_LENGTH} 个字。
        </div>
        <Button type="primary" block icon={<ThunderboltOutlined />} loading={chatBusy} disabled={!selectedStudentIds.length || chatBusy}
          onClick={() => sendChatMessage(lessonContent)}
          style={{ minHeight: 46, marginTop: 12, borderRadius: 10, background: 'var(--color-primary)', fontWeight: 700 }}>
          {chatBusy ? '正在整理每位学生的反馈…' : '整理学生反馈草稿'}
        </Button>
        <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>
          {selectedStudentIds.length ? `已选 ${selectedStudentIds.length} 名学生，整理后的内容会写入个人草稿，可逐条核对和修改。` : '请先在上方勾选要反馈的学生。'}
        </div>
      </Card>

      {/* 反馈助手 */}
      <Card size="small" className="teacher-feedback-step-card teacher-feedback-assistant-card" style={{ borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-1)' }}>
        <div className="teacher-feedback-assistant-head">
          <div className="teacher-feedback-assistant-brand">
            <span className="teacher-feedback-assistant-icon" aria-hidden="true"><ThunderboltOutlined /></span>
            <div style={{ minWidth: 0 }}>
              <div className="teacher-feedback-assistant-title">牧哲学堂专属反馈</div>
              <div className="teacher-feedback-assistant-description">
                围绕课堂记录整理每位学生的草稿，发布前可逐条核对和修改。
              </div>
            </div>
          </div>
          {selectedStudentIds.length > 0 && (
            <span className="teacher-feedback-assistant-count">已选 {selectedStudentIds.length} 人</span>
          )}
        </div>
        {chatMessages.length > 0 && (
          <div className="teacher-feedback-chat-log" role="log" aria-live="polite" style={{ maxHeight: isMobile ? 160 : 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, paddingRight: 4 }}>
            {chatMessages.map((item, index) => (
              <div key={index} style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '94%',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                background: item.role === 'user' ? '#EAF7F1' : (item.error ? '#FFF1F0' : '#F5F2EE'),
                color: item.error ? '#CF1322' : 'var(--color-ink)',
              }}>
                {item.content}
              </div>
            ))}
            {chatBusy && (
              <div style={{ alignSelf: 'flex-start', width: '100%', marginTop: 2 }}>
                <Progress percent={aiProgress} showInfo={false} size="small" strokeColor="#1D9E75" trailColor="#EAF7F1" />
                <div style={{ fontSize: 12, color: '#7A869A', marginTop: 4 }}>
                  {aiWaitingMessages[aiWaitingMessageIndex]}（通常需要 10-30 秒，请勿关闭页面）
                </div>
              </div>
            )}
          </div>
        )}
        {chatMessages.length > 0 && selectedStudentIds.length > 1 && (
            <div className="teacher-feedback-assistant-targets" style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginBottom: 4 }}>
              本次修改（可多选，追问时生效）：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedStudentIds.map((id) => {
                const s = groupStudents.find((gs) => gs.id === id)
                const active = chatTargetIds.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setChatTargetIds((current) => active ? current.filter((x) => x !== id) : [...current, id])}
                    style={{
                      minHeight: 36, padding: '4px 10px', borderRadius: 9999, fontSize: 12, cursor: 'pointer',
                       background: active ? 'var(--color-success-action)' : '#F5F2EE', color: active ? '#fff' : '#5a4e3a',
                       border: active ? '1px solid var(--color-success-action)' : '1px solid var(--color-hairline)', fontWeight: active ? 700 : 500,
                    }}
                  >
                    {s?.name || '学生'}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="teacher-feedback-assistant-shortcuts" style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: 6, marginBottom: 8, overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: isMobile ? 'touch' : undefined }}>
          {[
            '写简短些，突出重点',
            '把具体建议写得更详细些',
            '语气温和一些，多鼓励孩子',
            '突出学生的优点和进步',
            '补充孩子掌握情况的分析',
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => sendChatMessage(hint)}
              disabled={chatBusy || !chatMessages.length}
              style={{
                minHeight: 38, padding: '4px 11px', borderRadius: 9999, fontSize: 12, cursor: 'pointer',
                background: chatMessages.length ? 'var(--color-primary-bg)' : 'var(--color-surface-3)', color: chatMessages.length ? 'var(--color-success-action)' : 'var(--color-ink-muted)',
                border: '1px solid var(--color-hairline)', fontWeight: 500, whiteSpace: 'nowrap', flex: 'none',
              }}
            >
              {hint}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 2 }}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPressEnter={isMobile ? undefined : (e) => { if (!e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
            placeholder={chatMessages.length
              ? '继续输入调整要求，例如精简或补充建议…'
              : '输入课堂要点，整理每位学生的反馈草稿'}
            style={{ flex: 1, borderRadius: 10, fontSize: 16, lineHeight: 1.6 }}
          />
          <Button type="primary" icon={<SendOutlined />} loading={chatBusy} disabled={chatBusy || !selectedStudentIds.length}
            onClick={() => sendChatMessage()} style={{ minHeight: 44, borderRadius: 10, background: 'var(--color-success-action)', borderColor: 'var(--color-success-action)' }}>
            发送
          </Button>
        </div>
        {chatMessages.length === 0 && (
          <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
            选好学生并输入课堂要点，可为每位学生分别整理反馈草稿；后续调整只应用于当前选中的学生，请核对后再发布。
          </div>
        )}
      </Card>

      {aiKnowledge && (
        <Alert type="info" showIcon style={{ borderRadius: 10 }}
          message={`已识别知识点：${aiKnowledge.topic}`}
          description={`${aiKnowledge.knowledge}（${aiKnowledge.source}；发布前请核对知识卡片及课堂事实。）`}
        />
      )}
      {aiTopicWarning && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setAiTopicWarning(null)}
          style={{ borderRadius: 10 }}
          message="课堂记录与识别的知识点可能不一致"
          description={`课堂记录提到“${aiTopicWarning.lessonTopic}”，当前识别到的知识点为“${aiTopicWarning.generatedTopic}”。知识点可能匹配不准确，请核对详解内容，并在确认后再发布。`}
        />
      )}
      {knowledgeCard && <KnowledgePointDetail card={knowledgeCard} />}
      {/* 每生反馈草稿：AI 填入后可逐条编辑/撤销 */}
      {selectedStudentIds.length > 0 && (
        <Card size="small" className="teacher-feedback-step-card" style={{ borderRadius: 12, border: '1px solid rgba(232,120,74,.2)', background: 'var(--color-surface-2)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>每生反馈草稿{aiPrefillMark('comment')}</div>
          <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)', marginBottom: 10 }}>
            内容可逐条修改，发布前请核对；留空的学员发布时使用共同反馈内容。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedStudentIds.map((id) => {
              const s = groupStudents.find((gs) => gs.id === id)
              const updatedAt = aiUpdatedAt[id]
              const hasUndo = id in aiUndo
              const single = selectedStudentIds.length === 1
              const value = single ? overallComment : (perStudentComments[id] || '')
              const onChangeValue = (next: string) => {
                userEditedRef.current.add(id)
                if (single) setOverallComment(next)
                else setPerStudentComments((current) => ({ ...current, [id]: next }))
              }
              return (
                <div key={id} style={{ border: '1px solid var(--color-hairline)', borderRadius: 10, background: '#fff', padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s?.name || '学生'}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {updatedAt && <Tag color="success" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>最近调整 {formatAgo(updatedAt)}</Tag>}
                      {hasUndo && (
                        <Button size="small" icon={<UndoOutlined />} onClick={() => undoAiEdit(id)} style={{ fontSize: 11, padding: '0 8px', minHeight: 28 }}>
                          撤销本次修改
                        </Button>
                      )}
                    </span>
                  </div>
                  <Input.TextArea
                    rows={isMobile ? 3 : 2}
                    value={value}
                    onChange={(e) => onChangeValue(e.target.value)}
                    placeholder="留空则发布时使用共同反馈内容"
                    maxLength={1400}
                    style={{ borderRadius: 8, fontSize: 13.5, lineHeight: 1.7 }}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Badge — collapsible */}
      <Card size="small" className="teacher-feedback-step-card">
        <button type="button" aria-expanded={badgeOpen} aria-controls="teacher-feedback-badge-options" style={{ width: '100%', minHeight: 44, padding: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setBadgeOpen(!badgeOpen)}>
          <span>闪光徽章 {badge ? `· ${badge}` : '(可选)'}</span>
          <span style={{ color: '#98A2B3' }}>{badgeOpen ? '收起' : '展开'}</span>
        </button>
        {badgeOpen && (
          <div id="teacher-feedback-badge-options" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {BADGES.map(b => (
              <button key={b} onClick={() => setBadge(badge === b ? '' : b)} style={{
                padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                background: badge === b ? '#D4A017' : '#F5F2EE',
                color: badge === b ? '#fff' : '#5a4e3a', border: 'none',
              }}>{b}</button>
            ))}
          </div>
        )}
      </Card>

      <Card
        size="small"
        className="teacher-feedback-step-card"
        style={{ borderRadius: 12, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-2)' }}
        styles={{ body: { padding: isMobile ? 12 : 14 } }}
      >
        <button
          type="button"
          aria-expanded={moreExpanded}
          onClick={() => setMoreExpanded((current) => !current)}
          style={{
            width: '100%',
            minHeight: 44,
            padding: 0,
            border: 0,
            background: 'transparent',
            color: 'var(--color-ink)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span className="teacher-feedback-more-copy">
             <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>更多可选信息</span>
            <span style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 2 }}>
              表现标签、知识点、作业和本期寄语（均可不填）
            </span>
          </span>
          {moreExpanded ? <UpOutlined /> : <DownOutlined />}
        </button>
      </Card>

      {moreExpanded && (
        <>
      {/* Tags + KP */}
      <Card size="small" className="teacher-feedback-step-card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          表现标签{aiPrefillMark('tags')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: tags.includes(tag) ? '#534AB7' : '#F5F2EE',
              color: tags.includes(tag) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{tag}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          知识点{aiPrefillMark('kps')}
        </div>
        {isJuniorGrade && hasTextbookCatalogForSelection && (
          <>
            <AdaptiveSelect
              mode="multiple"
              size="large"
              showSearch
              allowClear
              value={kps}
              options={textbookCatalogOptions}
              optionFilterProp="label"
              filterOption={(input, option) => String(option?.label || '').toLocaleLowerCase().includes(input.toLocaleLowerCase())}
              maxTagCount="responsive"
              listHeight={360}
              placeholder="按册次、章节或课名搜索并选择"
              aria-label="按本机构指定教材目录选择本课章节"
              style={{ width: '100%', marginBottom: 8, minHeight: 44 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              onChange={(value) => setKps(value as string[])}
            />
            <div style={{ color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
              目录按本机构指定版本整理；册次标签注明核对状态，九年级下册为公开目录预排。
            </div>
          </>
        )}
        {!isJuniorGrade && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {legacyKps.map(kp => (
            <button key={kp} onClick={() => toggleKp(kp)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: kps.includes(kp) ? 'var(--color-primary)' : '#F5F2EE',
              color: kps.includes(kp) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{kp}</button>
            ))}
          </div>
        )}
        {textbookCatalogLoading && (
          <div role="status" style={{ color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
            正在读取本年级对应册次的教材目录…
          </div>
        )}
        {isJuniorGrade && textbookCatalogKey === selectedCatalogKey && !textbookCatalogLoading && !textbookCatalogOptions.length && (
          <div role="status" style={{ color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
            这个年级和学科暂未匹配到目录，请核对课程信息，或按课本原有章、节、课名填写。
          </div>
        )}
        {!selectedGrade && (
          <div role="status" style={{ color: 'var(--color-warning-text)', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
            暂时无法识别班级年级，为避免展示其他年级内容，请直接输入本节课知识点或完善课程年级。
          </div>
        )}
        {selectedGrade && !isJuniorGrade && dynamicKps.length === 0 && (
          <div role="status" style={{ color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
            暂无整理好的{selectedGrade}{selectedGroup?.subject}知识点，可在下方输入本节课内容。
          </div>
        )}
        <Input key={groupId || 'no-group'} size="small" placeholder="目录中没有时，按课本原名填写，回车添加" aria-label="按课本原名添加知识点" style={{ borderRadius: 8 }}
          onPressEnter={e => { const v = (e.target as HTMLInputElement).value.trim(); if (v && !kps.includes(v)) { setKps(prev => [...prev, v]); (e.target as HTMLInputElement).value = '' } }} />
      </Card>

      {/* Homework */}
      <Card size="small" className="teacher-feedback-step-card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          作业布置{aiPrefillMark('homework')}{aiPrefillMark('suggestion')}
        </div>
        {homework.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#98A2B3', fontSize: 12, paddingTop: 6, minWidth: 20 }}>{i + 1}.</span>
            <Input size="small" value={h} onChange={e => setHomework(prev => prev.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1 }} />
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => setHomework(prev => prev.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input size="small" value={hwInput} onChange={e => setHwInput(e.target.value)} placeholder="添加一项作业" style={{ flex: 1 }}
            onPressEnter={() => { if (hwInput.trim()) { setHomework(prev => [...prev, hwInput.trim()]); setHwInput('') } }} />
          <Button size="small" icon={<PlusOutlined />} onClick={() => { if (hwInput.trim()) { setHomework(prev => [...prev, hwInput.trim()]); setHwInput('') } }}>添加</Button>
        </div>
      </Card>

        </>
      )}

      {/* Upload — high-frequency and always visible */}
      <Card size="small" className="teacher-feedback-step-card teacher-feedback-upload-card">
        <div className="teacher-feedback-upload-heading">
           <span>{isMobile ? '课堂图片／讲义照片' : '课堂资料'} {imageUrls.length ? `(${imageUrls.length})` : '(可选)'}</span>
          {isMobile && <span className="teacher-feedback-upload-count">最多 9 张</span>}
        </div>
        <div className="teacher-feedback-upload-description">
          上传板书、练习和讲义的照片，随反馈展示给本次选中学生的家长。图片会自动压缩以加快上传。
        </div>
          <div>
            {imageUrls.length > 0 && (
              <div className="teacher-feedback-upload-thumbnails">
                <AntImage.PreviewGroup>{imageUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <AntImage src={signedImageUrls[i]} preview={{ src: signedImagePreviews[i] }} width={isMobile ? 84 : 72} height={isMobile ? 84 : 72} style={{ objectFit: 'cover', borderRadius: 8 }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23f5f2ee'/%3E%3Ctext x='32' y='32' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E" />
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      size="small"
                      aria-label={`删除第 ${i + 1} 张课堂图片`}
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setImageUrls(prev => prev.filter((_, j) => j !== i))
                        setImageDisplayUrls(prev => {
                          const removed = prev[url]
                          if (removed) revokeLocalPreviews({ [url]: removed })
                          const next = { ...prev }
                          delete next[url]
                          return next
                        })
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: isMobile ? 44 : 32,
                        minWidth: isMobile ? 44 : 32,
                        height: isMobile ? 44 : 32,
                        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
                      }}
                    />
                  </div>
                ))}</AntImage.PreviewGroup>
              </div>
            )}
            <Upload.Dragger className="teacher-feedback-upload-picker" name="file" accept="image/*,.heic,.heif,.avif" multiple maxCount={9} showUploadList={false}
              beforeUpload={(file) => {
                if (imageUrls.length + uploadingCount >= 9) {
                  toast.warning('最多上传 9 张课堂图片，请先删除已有图片')
                  return Upload.LIST_IGNORE
                }
                return validateImageFile(file as File) ? true : Upload.LIST_IGNORE
              }}
              customRequest={({ file, onSuccess, onError }) => {
                const source = file as File
                const taskId = `${source.name}-${source.lastModified}-${Math.random().toString(36).slice(2)}`
                void processImageUpload(source, taskId, {
                  onSuccess: response => onSuccess?.(response),
                  onError,
                })
              }}
              style={{ borderRadius: 12 }}>
              <PictureOutlined className="teacher-feedback-upload-icon" aria-hidden="true" />
              <div className="teacher-feedback-upload-label">从相册选择图片／讲义照片</div>
              <div className="teacher-feedback-upload-help">支持 JPG、PNG、WebP、HEIC，单张不超过 20MB</div>
            </Upload.Dragger>
            {isMobile && (
              <>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="teacher-feedback-camera-input"
                  aria-label="拍照上传课堂资料"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file && imageUrls.length + uploadingCount >= 9) {
                      toast.warning('最多上传 9 张课堂图片，请先删除已有图片')
                    } else if (file && validateImageFile(file)) {
                      const taskId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`
                      void processImageUpload(file, taskId)
                    }
                    event.target.value = ''
                  }}
                />
                <Button
                  block
                  icon={<CameraOutlined />}
                  className="teacher-feedback-camera-button"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  直接拍照上传
                </Button>
              </>
            )}
            {uploadTasks.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {uploadTasks.map((task, index) => (
                  <div key={task.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: '9px 10px',
                    borderRadius: 10,
                    background: task.status === 'error' ? 'color-mix(in srgb, var(--color-error) 8%, white)' : 'var(--color-surface-2)',
                    border: `1px solid ${task.status === 'error' ? 'color-mix(in srgb, var(--color-error) 38%, white)' : 'var(--color-hairline)'}`,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#3A3320', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          第 {index + 1} 张 · {task.name}
                        </span>
                        {task.compressed && <Tag bordered={false} color="orange" style={{ margin: 0, fontSize: 10 }}>已压缩</Tag>}
                      </div>
                      {task.status === 'compressing' && <div style={{ color: 'var(--color-ink-muted)', fontSize: 11, marginTop: 3 }}>正在压缩，减少手机上传等待</div>}
                      {task.status === 'uploading' && <Progress percent={task.progress} size="small" showInfo={false} strokeColor="var(--color-primary)" />}
                      {task.status === 'success' && <div style={{ color: 'var(--color-success)', fontSize: 11, marginTop: 3 }}><CheckCircleOutlined /> 上传成功</div>}
                      {task.status === 'error' && <div style={{ color: 'var(--color-error)', fontSize: 11, marginTop: 3 }}>{task.error}</div>}
                    </div>
                    {task.status === 'error' && (
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => void processImageUpload(task.file, task.id)}
                        style={{ borderRadius: 8, minHeight: isMobile ? 44 : 32 }}
                      >
                        重试
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {uploadingCount > 0 && (
              <div role="status" style={{ marginTop: 8, color: '#5A4E3A', fontSize: 12 }}>
                正在处理并上传 {uploadingCount} 张图片。文字反馈已保留，请等待图片完成。
              </div>
            )}
          </div>
      </Card>

      {/* ── Stage Summary ── */}
      {moreExpanded && (selectedStudentIds.length > 1 ? (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#faf8f5' }}>
          <div style={{ fontSize: 12, color: '#7A869A', textAlign: 'center' }}>
            本期寄语为单个学生专属内容，请只选择一名学生后填写
          </div>
        </Card>
      ) : stageStudentId && (
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #F0DDD2' }}>
          <button
            type="button"
            aria-expanded={stageExpanded}
            aria-controls="teacher-feedback-stage-summary"
            style={{ width: '100%', minHeight: 44, padding: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setStageExpanded(!stageExpanded)}
          >
            <span>本期寄语（家长端可见）{stageExpanded ? '' : '，点击展开'}</span>
            <span style={{ color: '#98A2B3', fontSize: 12 }}>{stageExpanded ? '收起' : '展开'}</span>
          </button>
          {stageExpanded && (
            <div id="teacher-feedback-stage-summary" style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>本期寄语（家长端可见）</span>
                <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={aiGenerating}
                  onClick={() => stageAiGenerate('summary')}
                  style={{ fontSize: 11, padding: 0 }}>整理寄语</Button>
              </div>
              <Input.TextArea
                rows={4}
                maxLength={500}
                showCount
                value={stageSummaryText}
                onChange={e => setStageSummaryText(e.target.value)}
                placeholder="结合自动素材，写给家长看的阶段学情小结"
                style={{ borderRadius: 8 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 4px' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>下一步建议</span>
                <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={aiGenerating}
                  onClick={() => stageAiGenerate('suggestion')}
                  style={{ fontSize: 11, padding: 0 }}>整理建议</Button>
              </div>
              <Input.TextArea
                rows={2}
                maxLength={200}
                showCount
                value={stageSuggestions}
                onChange={e => setStageSuggestions(e.target.value)}
                placeholder="例如：接下来重点巩固计算准确率"
                style={{ borderRadius: 8 }}
              />

              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 8 }}>
                非空时随课堂反馈一并发布（家长端「案」板块）
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Submit */}
      <div className="teacher-feedback-submit-bar" style={{
        display: isMobile ? 'grid' : 'flex',
        gridTemplateColumns: isMobile ? 'auto minmax(0,.9fr) minmax(0,1.5fr)' : undefined,
        gap: 10,
        flexWrap: isMobile ? undefined : 'wrap',
        position: isMobile ? 'sticky' : undefined,
        bottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined,
        zIndex: isMobile ? 250 : undefined,
        margin: isMobile ? '0 -16px' : undefined,
        padding: isMobile ? '10px 16px' : '0 0 24px',
        background: isMobile ? 'var(--color-surface-1)' : undefined,
        borderTop: isMobile ? '1px solid var(--color-hairline)' : undefined,
      }}>
        <div
          className="teacher-feedback-autosave-status"
          role="status"
          aria-live="polite"
          style={{
            gridColumn: isMobile ? '1 / -1' : undefined,
            flex: isMobile ? undefined : '1 0 100%',
            minHeight: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            lineHeight: 1.45,
            color: autosaveState === 'saved'
              ? 'var(--color-success, #137A5A)'
              : autosaveState === 'offline'
                ? 'var(--color-warning-ink, #9A5B00)'
                : autosaveState === 'error'
                  ? 'var(--color-error, #C2410C)'
                  : 'var(--color-ink-subtle, #8A7D6A)',
          }}
        >
          {autosaveState === 'loading' && '正在读取上次草稿…'}
          {autosaveState === 'idle' && '编辑内容会自动保存，无需担心忘记点“保存草稿”'}
          {autosaveState === 'saving' && '正在自动保存…'}
          {autosaveState === 'saved' && `草稿已自动保存${autosavedAt ? ` · ${formatAgo(autosavedAt)}` : ''}`}
          {autosaveState === 'offline' && (localDraftAvailable
            ? '网络或服务暂不可用，内容已暂存在当前标签，恢复后会继续同步'
            : '网络或服务暂不可用，请保持页面打开，恢复后会继续同步')}
          {autosaveState === 'error' && '自动保存失败，请检查网络；当前页面内容仍保留，请先不要关闭'}
          {uploadingCount > 0 && <span>· 图片仍在上传，离开前请等待完成</span>}
        </div>
        <Button block onClick={() => setPreviewOpen(true)} style={{ flex: 1, minHeight: 44 }}>{isMobile ? '预览' : '预览家长端'}</Button>
        <Button block onClick={() => submit('DRAFT')} loading={saving} disabled={saving || uploadingCount > 0} style={{ flex: 1, minHeight: 44 }}>保存草稿</Button>
        <Button block type="primary" icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
          onClick={() => submit('PUBLISHED')} loading={saving} disabled={saving || submitDone || uploadingCount > 0}
          style={{ flex: 2, minHeight: 44, background: submitDone ? 'var(--color-success-action)' : 'var(--color-primary)', borderColor: submitDone ? 'var(--color-success-action)' : 'var(--color-primary)', fontWeight: 700 }}>
          {submitDone ? '已发布' : saving ? '发布中...' : uploadingCount > 0 ? '图片上传中...' : '发布反馈给家长'}
        </Button>
      </div>
      <Modal title="家长端预览" open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null} width="min(560px, 92vw)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: '#1a1201' }}>
          {selectedStudentIds.length > 1 && (
            <div style={{ borderRadius: 10, padding: '8px 10px', background: '#FFF6F1', color: '#B85B32', fontSize: 12 }}>
              当前为多名学生共同反馈，家长端将只看到自己孩子相关内容
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedStudentNames.join('、') || '已选学员'}</div>
          <div>{tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
          {!!previewFeedbackItems.length && <div>
            <strong>课堂反馈</strong>
            <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
              {previewFeedbackItems.map((item) => (
                <div key={item.id} style={{ border: selectedStudentIds.length > 1 ? '1px solid #F0DDD2' : 'none', borderRadius: 10, padding: selectedStudentIds.length > 1 ? 10 : 0, background: selectedStudentIds.length > 1 ? '#FFFBF7' : 'transparent' }}>
                  {selectedStudentIds.length > 1 && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.studentName}同学</div>}
                  <div style={{ fontSize: 13.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#4B5563' }}>{item.content}</div>
                </div>
              ))}
            </div>
          </div>}
          {knowledgeCard && <KnowledgePointDetail card={knowledgeCard} defaultOpen />}
          {!!kps.length && <div><strong>知识点</strong><div style={{ marginTop: 4 }}>{kps.join('、')}</div></div>}
          {!!homework.length && <div><strong>作业布置</strong><ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>{homework.map((item, i) => <li key={i}>{item}</li>)}</ol></div>}
          {stageSummaryText && <div><strong>本期寄语（家长端可见）</strong><div style={{ marginTop: 4, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{stageSummaryText}</div></div>}
          {stageSuggestions && <div><strong>后续建议</strong><div style={{ marginTop: 4, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{stageSuggestions}</div></div>}
          <div style={{ fontSize: 12, color: '#98A2B3' }}>发布时间：发布后实时显示 · 老师：当前登录教师</div>
        </div>
      </Modal>
    </div>
  )

  return (
    <div className="teacher-feedback-workspace" style={isMobile ? {} : { display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      {ctxError && (
        <Alert
          type="error"
          showIcon
          message="课程和学员信息加载失败"
          description={ctxError instanceof Error ? ctxError.message : '请求失败，请稍后重试'}
          action={<Button size="small" onClick={() => void mutateCtx()}>重试</Button>}
          style={{ gridColumn: '1 / -1' }}
        />
      )}
      {ctx?.contextState === 'NO_ACTIVE_TERM' && (
        <Alert
          type="warning"
          showIcon
          message="尚未启用当前运营期"
          description={ctx.contextMessage}
          style={{ gridColumn: '1 / -1' }}
        />
      )}
      {/* LEFT: class picker + AI + student selection (desktop) */}
      {!isMobile && (
        <div className="teacher-feedback-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requestedStudentName && (
            <div style={{
              borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6,
              background: 'linear-gradient(135deg,rgba(14,94,78,.08),rgba(201,164,92,.10))',
              border: '1px solid rgba(14,94,78,.18)',
            }}>
              <span style={{ fontWeight: 800, color: '#0E5E4E' }}>正在为「{requestedStudentName}」填写反馈</span>
              <div style={{ color: '#7A6A55', marginTop: 2 }}>已自动选中 TA 的班级，可切换班级继续为 TA 反馈</div>
            </div>
          )}
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>选择班级</div>
            <MobileSelect size="small" value={groupId || undefined} onChange={handleFeedbackGroupChange}
              allowClear placeholder="选择班级" style={{ width: '100%' }} listHeight={320} searchable={false}
               options={sortedGroups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
            {!groupId && groups.length === 0 && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>暂无班级数据</div>}
          </Card>

          {/* Student list — collapsible */}
          {groupId && (
            <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
              <button
                type="button"
                aria-expanded={studentsExpanded}
                aria-controls="teacher-feedback-student-options"
                style={{ width: '100%', minHeight: 44, padding: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setStudentsExpanded(!studentsExpanded)}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {selectedGroup?.courseName || '班级'} ({filteredStudents.length}人)
                  {selectedStudentIds.length > 0 && (
                    <span style={{ fontWeight: 400, color: 'var(--color-primary)', marginLeft: 6, fontSize: 12 }}>
                      已选 {selectedStudentIds.length} 人
                    </span>
                  )}
                </span>
                <span style={{ color: '#98A2B3', fontSize: 12 }}>{studentsExpanded ? '收起 ▲' : '展开 ▼'}</span>
              </button>
              {/* Always show selected chips */}
              {selectedStudentIds.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedStudentIds.map((id) => {
                    const s = groupStudents.find((gs) => gs.id === id)
                    return s ? (
                      <Tag key={id} closable color="orange" style={{ borderRadius: 9999, fontSize: 11, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClose={(e) => { e.preventDefault(); toggleStudent(id) }}>{s.name}</Tag>
                    ) : null
                  })}
                </div>
              )}
              {studentsExpanded && (
                <div id="teacher-feedback-student-options" style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <Input size="small" prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索" style={{ flex: 1, borderRadius: 8 }} />
                    <Button size="small" onClick={selectAll} style={{ fontSize: 11 }}>全选未反馈</Button>
                    <Button size="small" onClick={clearAll} style={{ fontSize: 11 }}>清空</Button>
                  </div>
                  {filteredStudents.length === 0 ? (
                    <GuidedEmpty
                      compact
                      title={studentSearch ? '没有符合搜索条件的学员' : '这个班级还没有学员'}
                      description={studentSearch ? '换一个姓名关键词，或清除搜索后查看班级全部学员。' : '学员加入班级后会显示在这里，选择学员即可填写本次反馈。'}
                      actionLabel={studentSearch ? '清除搜索' : '查看我的课表'}
                      onAction={() => studentSearch ? setStudentSearch('') : router.push('/teacher/schedule')}
                    />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {filteredStudents.map((s) => {
                        const selected = selectedStudentIds.includes(s.id)
                        const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[`${selectedActualGroupId}:${s.id}`])
                        return (
                          <div key={s.id} style={{
                            borderRadius: 8,
                            border: feedbacked ? '1px solid #D9D4CE' : selected ? '1px solid var(--color-primary)' : '1px solid #EEE7E1',
                            boxShadow: selected ? 'inset 0 0 0 1px var(--color-primary)' : undefined,
                            background: feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                            opacity: feedbacked ? 0.62 : 1,
                            transition: 'background-color var(--motion-fast) ease, border-color var(--motion-fast) ease, opacity var(--motion-fast) ease',
                          }}>
                            <button type="button" aria-pressed={selected} onClick={() => toggleStudent(s.id)} style={{ width: '100%', minHeight: 44, padding: 8, border: 0, borderRadius: 'inherit', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <StudentAvatar gender={s.gender} name={s.name} size={26} rounded={false} />
                              <span style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {!groupId && (
            <div style={{ fontSize: 13, color: '#7A869A', textAlign: 'center', padding: '20px 0' }}>请先选择班级</div>
          )}

        </div>
      )}

      {/* RIGHT: Form (desktop) / everything (mobile) */}
      <div style={!isMobile ? { position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 14 } : { display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mobile: AI input + class picker + student cards */}
        {isMobile && (
          <>
            {requestedStudentName && (
              <div style={{
                borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6,
                background: 'linear-gradient(135deg,rgba(14,94,78,.08),rgba(201,164,92,.10))',
                border: '1px solid rgba(14,94,78,.18)',
              }}>
                <span style={{ fontWeight: 800, color: '#0E5E4E' }}>正在为「{requestedStudentName}」填写反馈</span>
                <div style={{ color: '#7A6A55', marginTop: 2 }}>已自动选中 TA 的班级，可切换班级继续为 TA 反馈</div>
              </div>
            )}

            <Card size="small" className="teacher-feedback-step-card teacher-feedback-course-card">
              <div className="teacher-feedback-mobile-step-title">① 课程与学生</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="teacher-feedback-field-label">班级／课程</div>
                  <MobileSelect value={groupId || undefined} onChange={handleFeedbackGroupChange}
                    allowClear nativeOnMobile placeholder="选择班级与学科" style={{ width: '100%' }} listHeight={280} popupMatchSelectWidth searchable={false}
                    options={sortedGroups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
                  {selectedGroup && <div className="teacher-feedback-course-current">当前选择：{selectedGroup.name || selectedGroup.courseName} · {selectedGroup.subject || '未填学科'} · {selectedGroup.studentCount ?? groupStudents.length} 人</div>}
                </div>
                {groupId && (
                  <div style={{ borderRadius: 10, padding: '9px 10px', background: '#FFF6F1', border: '1px solid rgba(232,120,74,.18)', color: '#B85B32', fontSize: 12, fontWeight: 700 }}>
                    当前场景：{feedbackSceneLabel} · {feedbackRateLabel}
                    <div style={{ fontWeight: 500, marginTop: 4 }}>
                      {bonusLoading ? '正在计算预计奖励...' : bonusPreview ? `已选${bonusPreview.selectedCount}人，预计奖励${money(bonusPreview.total)}元` : '请选择学员后查看预计奖励'}
                    </div>
                  </div>
                )}
              </div>

            {groupId && (
              <div className="teacher-feedback-student-picker">
                <button
                  type="button"
                  aria-expanded={studentsExpanded}
                  aria-controls="teacher-feedback-mobile-student-options"
                  style={{ width: '100%', minHeight: 44, padding: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
                  onClick={() => setStudentsExpanded(!studentsExpanded)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>选择学生</div>
                    <div style={{ fontSize: 12, color: '#7A869A', marginTop: 2 }}>已选 {selectedStudentIds.length} 人</div>
                  </div>
                  <span style={{ color: 'var(--color-primary)', padding: 0, fontSize: 14 }}>
                    {studentsExpanded ? '收起' : '展开'}
                  </span>
                </button>
                {selectedStudentIds.length > 0 && (() => {
                  const activeId = selectedStudentIds.includes(editingStudentId || '')
                    ? editingStudentId as string
                    : selectedStudentIds[0]
                  const activeStudent = groupStudents.find(student => student.id === activeId)
                  if (!activeStudent) return null

                  const myTags = studentTags[activeId] || []
                  const myMastery = studentMastery[activeId] || ''
                  const savedCustomTags = customTagPool.filter(tag => !(STUDENT_STATE_TAGS as readonly string[]).includes(tag))
                  const hiddenCustomTagCount = savedCustomTags.filter(tag => !myTags.includes(tag)).length
                  const visibleStudentTags = [...STUDENT_STATE_TAGS, ...savedCustomTags.filter(tag => myTags.includes(tag) || studentTagLibraryExpanded)]
                    .filter((tag, index, all) => all.indexOf(tag) === index)

                  return (
                    <div className="teacher-feedback-student-editor">
                      <div className="teacher-feedback-selected-students" aria-label="切换要编辑的学生">
                        {selectedStudentIds.map((id, index) => {
                          const student = groupStudents.find(item => item.id === id)
                          if (!student) return null
                          const detailCount = (studentTags[id]?.length || 0)
                            + Number(Boolean(studentMastery[id]))
                            + Number(Boolean(studentPerf[id]))
                            + Number(Boolean(studentObservations[id]?.trim()))
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={activeId === id}
                              aria-label={`${student.name}${detailCount ? `，已记录${detailCount}项` : ''}`}
                              className={`teacher-feedback-student-tab${activeId === id ? ' is-active' : ''}`}
                              onClick={() => setEditingStudentId(id)}
                              title={`${student.name}${detailCount ? `，已记录${detailCount}项` : ''}`}
                            >
                              <span className="teacher-feedback-student-tab-index">{index + 1}</span>
                              <span className="teacher-feedback-student-tab-name">{student.name}</span>
                            </button>
                          )
                        })}
                      </div>

                      <section className="teacher-feedback-profile-card" aria-label={`${activeStudent.name}的课堂表现`}>
                        <div className="teacher-feedback-profile-heading">
                          <div className="teacher-feedback-profile-student">
                            <StudentAvatar gender={activeStudent.gender} name={activeStudent.name} size={34} className="teacher-feedback-profile-avatar" />
                            <span className="teacher-feedback-profile-name">
                              <small>正在编辑</small>
                              <strong>{activeStudent.name}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label={`移除${activeStudent.name}`}
                            className="teacher-feedback-remove-student"
                            onClick={() => toggleStudent(activeId)}
                          >×</button>
                        </div>
                        {renderStudentPerfPicker(activeId)}

                        <div className="teacher-feedback-profile-group">
                          <div className="teacher-feedback-profile-group-heading">
                            <span>学习掌握</span>
                            <span>{myMastery || '可选'}</span>
                          </div>
                          <div className="teacher-feedback-mastery-grid">
                            {STUDENT_MASTERY_OPTIONS.map(option => {
                              const active = myMastery === option
                              const shortLabel = ({ 掌握扎实: '扎实', 基本掌握: '基本', 部分掌握: '部分', 需巩固: '巩固' } as const)[option]
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  aria-pressed={active}
                                  aria-label={option}
                                  title={option}
                                  className={`teacher-feedback-profile-chip${active ? ' is-selected' : ''}`}
                                  onClick={() => setStudentMastery(prev => ({ ...prev, [activeId]: active ? '' : option }))}
                                >{shortLabel}</button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="teacher-feedback-profile-group">
                          <div className="teacher-feedback-profile-group-heading">
                            <span>课堂表现</span>
                            <span>{myTags.length ? `已选 ${myTags.length}` : '可多选'}</span>
                          </div>
                          <div className="teacher-feedback-profile-tag-grid">
                            {visibleStudentTags.map(tag => {
                              const active = myTags.includes(tag)
                              const isCustom = !(STUDENT_STATE_TAGS as readonly string[]).includes(tag)
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  aria-pressed={active}
                                  className={`teacher-feedback-profile-chip${active ? ' is-selected' : ''}${isCustom ? ' is-custom' : ''}`}
                                  onClick={() => setStudentTags(prev => {
                                    const current = prev[activeId] || []
                                    return { ...prev, [activeId]: active ? current.filter(item => item !== tag) : [...current, tag] }
                                  })}
                                >{tag}</button>
                              )
                            })}
                            <button
                              type="button"
                              className="teacher-feedback-profile-chip is-add"
                              onClick={() => { setAddTagFor(activeId); setNewTagText('') }}
                            >＋ 添加标签</button>
                          </div>
                          {hiddenCustomTagCount > 0 && (
                            <button
                              type="button"
                              className="teacher-feedback-profile-more-tags"
                              aria-expanded={studentTagLibraryExpanded}
                              onClick={() => setStudentTagLibraryExpanded(value => !value)}
                            >{studentTagLibraryExpanded ? '收起常用标签' : `更多常用标签 · ${hiddenCustomTagCount}`}</button>
                          )}
                        </div>

                        <label className="teacher-feedback-observation">
                          <span>补充说明 <small>可选</small></span>
                          <textarea
                            value={studentObservations[activeId] || ''}
                            onChange={event => setStudentObservations(prev => ({ ...prev, [activeId]: event.target.value.slice(0, 350) }))}
                            placeholder="补充标签未覆盖的课堂表现"
                            rows={2}
                            maxLength={350}
                          />
                          <small>按原意补充课堂细节，未填写也可继续。</small>
                        </label>
                      </section>
                    </div>
                  )
                })()}
                {studentsExpanded && (
                  <div id="teacher-feedback-mobile-student-options" style={{ marginTop: 12 }}>
                    <div className="teacher-feedback-student-tools" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <Input prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索学生" style={{ flex: 1, borderRadius: 10 }} />
                      <Button onClick={selectAll}>全选未反馈</Button>
                      <Button onClick={clearAll}>清空</Button>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <GuidedEmpty
                        compact
                        title={studentSearch ? '没有符合搜索条件的学员' : '这个班级还没有学员'}
                        description={studentSearch ? '换一个姓名关键词，或清除搜索后查看班级全部学员。' : '学员加入班级后会显示在这里，选择学员即可填写本次反馈。'}
                        actionLabel={studentSearch ? '清除搜索' : '查看我的课表'}
                        onAction={() => studentSearch ? setStudentSearch('') : router.push('/teacher/schedule')}
                      />
                    ) : (
                      <div className="teacher-feedback-student-grid">
                        {filteredStudents.map((s) => {
                          const selected = selectedStudentIds.includes(s.id)
                          const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[`${selectedActualGroupId}:${s.id}`])
                          return (
                            <div key={s.id} className="teacher-feedback-student-card" style={{
                              borderRadius: 10,
                              border: feedbacked ? '1px solid #D9D4CE' : selected ? '1px solid var(--color-primary)' : '1px solid #EEE7E1',
                              boxShadow: selected ? 'inset 0 0 0 1px var(--color-primary)' : undefined,
                              background: feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                              opacity: feedbacked ? 0.62 : 1,
                            }}>
                              <button type="button" aria-pressed={selected} onClick={() => toggleStudent(s.id)} style={{ width: '100%', minHeight: 44, padding: '8px 10px', border: 0, borderRadius: 'inherit', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <StudentAvatar gender={s.gender} name={s.name} size={28} rounded={false} />
                                <span style={{ display: 'block', flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </Card>
          </>
        )}
        {/* Multi-student info */}
        {selectedStudentIds.length > 1 && (
          <div className="teacher-feedback-batch-hint">
            <strong>共同内容将发给全部 {selectedStudentIds.length} 位学生</strong>
            <span>切换上方姓名，可以分别填写个人表现。</span>
          </div>
        )}

        {/* Form (includes AI input, classroom feedback, stage-summary) */}
        {formSection}

        {/* 自定义标签弹窗：仅本次使用 / 存入常用库 */}
        <Modal
          open={Boolean(addTagFor)}
          onCancel={cancelAddTag}
          footer={null}
          destroyOnClose
          centered
          title={`为 ${groupStudents.find((s) => s.id === addTagFor)?.name || '学生'} 添加标签`}
          bodyStyle={{ paddingTop: 8 }}
        >
          <Input
            value={newTagText}
            onChange={(e) => setNewTagText(e.target.value)}
            maxLength={10}
            placeholder="输入课堂表现标签，最多 10 个字，例如：主动帮同学讲题"
            onPressEnter={() => confirmAddTag(false)}
            style={{ borderRadius: 10, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" disabled={!newTagText.trim()} onClick={() => confirmAddTag(false)} style={{ flex: 1, borderRadius: 10 }}>
              仅本次使用
            </Button>
            <Button type="primary" disabled={!newTagText.trim()} onClick={() => confirmAddTag(true)} style={{ flex: 1, borderRadius: 10, background: '#7A5FA8', borderColor: '#7A5FA8' }}>
              存入常用库
            </Button>
          </div>
          <div style={{ fontSize: 11, color: '#9AA3AD', marginTop: 8, lineHeight: 1.6 }}>
            「仅本次使用」只用于当前学生这次反馈；「存入常用库」会保存到本机，之后所有学生的标签栏都会出现它。
          </div>
        </Modal>

      </div>
    </div>
  )
}

function TeacherRecordPageContent() {
  return (
    <div className="teacher-feedback-page" style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-ink, #1a1201)' }}>课堂成长反馈</h2>
          <div style={{ fontSize: 13, color: 'var(--color-ink-subtle, #9a8e7a)', marginTop: 4 }}>
            选择本次课程和学生，记录课堂表现与建议；确认后统一发送给家长。
          </div>
        </div>
      </div>
      <FeedbackPageInner />
    </div>
  )
}

export default function TeacherFeedbackPage() {
  return (
    <Suspense fallback={<CardSkeleton rows={3} />}>
      <TeacherRecordPageContent />
    </Suspense>
  )
}
