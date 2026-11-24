'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Alert, Button, Drawer, Image as AntImage, Input, Modal, Progress, Segmented, Upload, Tag, Card, Select } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { BookOutlined, CameraOutlined, CheckCircleOutlined, DeleteOutlined, DownOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, SendOutlined, SearchOutlined, ThunderboltOutlined, UndoOutlined, UpOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import fbStyles from './FeedbackComposer.module.css'
import { fetchJson } from '@/lib/fetch-json'
import { QUICK_TAGS, BADGES } from '@/components/FeedbackCard'
import { TIER_THEME, resolveTier } from '@/constants/teacher-tier'
import { getKnowledgePointOptions } from '@/lib/classroom-feedback/subject-knowledge-points'
import { selectRelevantKnowledgePointCandidates } from '@/lib/classroom-feedback/knowledge-topic-candidates'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import type { TextbookCatalogOptionGroup } from '@/lib/classroom-feedback/textbook-catalog'
import { findKnowledgeTopicMismatch, type KnowledgeTopicMismatch } from '@/lib/classroom-feedback/feedback-quality'
import { articleSections } from '@/lib/classroom-feedback/ai-article'
import { getOverallEvaluationContent, getParentClassroomFeedbackContent, getParentFeedbackDisplaySections } from '@/lib/classroom-feedback/parent-feedback-content'
import { normalizePersonalizedLearningExtension, type PersonalizedLearningExtension } from '@/lib/classroom-feedback/personalized-learning'
import { parseStoredKnowledgeCard, type KnowledgePointCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'
import { PersonalizedLearningPath } from '@/components/Feedback/PersonalizedLearningPath'
import { ParentFeedbackReportContent } from '@/components/Feedback/ParentFeedbackReportContent'
import { TeacherFollowupReview } from '@/components/Feedback/FeedbackFollowup'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { BrandModal } from '@/components/Common/BrandModal'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { MobileSelect } from '@/components/MobileSelect'
import {
  groupFeedbackLessonsIntoSessions,
  formatSessionOptionLabel,
  type GroupedFeedbackSession,
} from '@/lib/classroom-feedback/feedback-session-grouping'
import {
  hasMeaningfulFeedbackContent,
  hasRequiredLessonContent,
  LESSON_CONTENT_MAX_LENGTH,
  LESSON_CONTENT_MIN_LENGTH,
  MAX_STUDENTS_PER_FEEDBACK,
} from '@/lib/classroom-feedback/access'
import { parseCombinedFeedbackInput } from '@/lib/classroom-feedback/combined-input'
import { getMissingStudentTagCategories, STUDENT_STATE_TAGS, STUDENT_TAG_CATEGORIES } from '@/lib/classroom-feedback/student-feedback-tags'
import { feedbackTodayScopeKey } from '@/lib/classroom-feedback/today-scope'
import { createFollowupReview, FOLLOWUP_OUTCOME_OPTIONS, type FollowupOutcome, type PreviousFeedbackFollowup } from '@/lib/classroom-feedback/feedback-followup'
import { compressFeedbackImage, uploadFeedbackImage, type ImageUploadResponse } from '@/lib/client-image-upload'
import {
  readSensitiveSessionValue,
  removeLegacySensitiveStorage,
  removeSensitiveSessionValue,
  writeSensitiveSessionValue,
} from '@/lib/client-sensitive-storage'

const fetchFeedbackContext = (url: string) => fetchJson<FeedbackContext>(url, { cache: 'no-store' })
const fetchStageData = (url: string) => fetchJson(url) as Promise<StageData>

function newClientRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function waitForImageReady(image: HTMLImageElement) {
  if (!image.complete) {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        window.clearTimeout(timeout)
        image.removeEventListener('load', onLoad)
        image.removeEventListener('error', onError)
        if (error) reject(error)
        else resolve()
      }
      const onLoad = () => finish()
      const onError = () => finish(new Error('SHARE_IMAGE_LOAD_FAILED'))
      const timeout = window.setTimeout(() => finish(new Error('SHARE_IMAGE_LOAD_TIMEOUT')), 15_000)
      image.addEventListener('load', onLoad, { once: true })
      image.addEventListener('error', onError, { once: true })
    })
  }
  if (image.naturalWidth <= 0) throw new Error('SHARE_IMAGE_LOAD_FAILED')
  if (typeof image.decode === 'function') {
    try {
      await image.decode()
    } catch {
      throw new Error('SHARE_IMAGE_LOAD_FAILED')
    }
  }
}

type FeedbackCourseBucket = 'GROUP' | 'ONE_ON_ONE'
type StudentPerfLevel = 'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'
const STUDENT_PERF_META: Record<StudentPerfLevel, { label: string; short: string; color: string; bg: string; border: string }> = {
  GREAT: { label: '积极', short: '积极', color: '#137A5A', bg: '#EAF7F1', border: '#BFE7D4' },
  OKAY: { label: '一般', short: '一般', color: '#7A6F5F', bg: '#F5F2EE', border: '#E5DDD4' },
  NEEDS_IMPROVEMENT: { label: '需提升', short: '需提升', color: '#C77F00', bg: '#FFF4DE', border: '#F3D6A6' },
}
const STUDENT_MASTERY_OPTIONS = ['掌握扎实', '基本掌握', '部分掌握', '需巩固'] as const
const DEFAULT_NEXT_LESSON_FOCUS_TAGS = ['巩固本节核心知识点'] as const
const NEXT_LESSON_FOCUS_TAGS = [
  ...DEFAULT_NEXT_LESSON_FOCUS_TAGS,
  '复习本节易错步骤',
  '检查练习订正情况',
  '加强审题与解题步骤',
  '复述本节解题思路',
  '完成同类题巩固',
  '练习知识点灵活应用',
  '关注课堂参与与表达',
] as const
const MAX_NEXT_LESSON_FOCUS_TAGS = 3

function getStudentNextLessonFocusTags(focusByStudent: Record<string, string[]>, studentId: string) {
  const selected = focusByStudent[studentId]
  const normalized = Array.isArray(selected)
    ? selected.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).slice(0, MAX_NEXT_LESSON_FOCUS_TAGS)
    : []
  return normalized.length ? normalized : [...DEFAULT_NEXT_LESSON_FOCUS_TAGS]
}

function normalizeNextLessonFocusDraft(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const normalized = Object.entries(value as Record<string, unknown>)
    .slice(0, MAX_STUDENTS_PER_FEEDBACK)
    .flatMap(([studentId, raw]) => {
      const values = Array.isArray(raw)
        ? raw.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        : typeof raw === 'string' && raw.trim()
          ? [raw.trim()]
          : []
      return values.length
        ? [[studentId, values.map(item => item.slice(0, 120)).slice(0, MAX_NEXT_LESSON_FOCUS_TAGS)] as const]
        : []
    })
  return Object.fromEntries(normalized)
}
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
  singleSessionMode?: boolean
  singleSessionStudentId?: string
  singleSessionStudentName?: string
  singleSessionTeacherId?: string
  singleSessionManual?: boolean
  singleSessionGrade?: string
  singleSessionSubject?: string
  singleSessionDate?: string
  selectedStudentIds: string[]
  lessonContent: string
  summary: string
  overallComment: string
  perStudentComments: Record<string, string>
  studentObservations: Record<string, string>
  studentNextLessonFocus: Record<string, string[]>
  studentPerf: Record<string, StudentPerfLevel>
  studentTags: Record<string, string[]>
  studentMastery: Record<string, string>
  studentPersonalizedLearning: Record<string, PersonalizedLearningExtension>
  studentFollowupOutcomes: Record<string, FollowupOutcome>
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

const SINGLE_SESSION_GROUP_ID = '__single_session_feedback__'
const SINGLE_SESSION_MANUAL_STUDENT_ID = '__single_session_manual__'
const FEEDBACK_GRADE_OPTIONS = ['初一', '初二', '初三', '高一', '高二', '高三']

function todayDateInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hasTeacherFeedbackDraftContent(draft: TeacherFeedbackDraftPayload) {
  return Boolean(
    draft.groupId || draft.singleSessionMode || draft.singleSessionStudentName || draft.selectedStudentIds.length || draft.lessonContent.trim() || draft.summary.trim()
    || draft.overallComment.trim() || Object.values(draft.perStudentComments).some(Boolean)
    || Object.values(draft.studentObservations).some(Boolean) || Object.values(draft.studentNextLessonFocus || {}).some((items) => items.length > 0) || Object.keys(draft.studentPerf).length
    || Object.values(draft.studentTags).some((items) => items.length) || Object.keys(draft.studentMastery).length
    || Object.keys(draft.studentPersonalizedLearning || {}).length > 0
    || Object.keys(draft.studentFollowupOutcomes || {}).length > 0
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
  results?: Array<{ studentId: string; article: string; personalizedLearning?: PersonalizedLearningExtension | null }>
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
type SingleSessionStudent = FeedbackStudent & { parentLabel: string }
type SingleSessionTeacherOption = {
  id: string
  name: string
  gender?: string | null
  avatar?: string | null
  tierLevel?: string | null
  subjects: string[]
}
type FeedbackLessonBlockReason = 'LEAVE' | 'ABSENT'
const EMPTY_FEEDBACK_BLOCK_REASONS: Record<string, FeedbackLessonBlockReason> = {}
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
  previousFollowups?: PreviousFeedbackFollowup[]
  lessons: Array<{
    id: string
    groupId: string
    scopeId?: string
    subject?: string | null
    studentIds?: string[]
    blockedStudentReasons?: Record<string, FeedbackLessonBlockReason>
    lessonDate?: string
    startTime?: string
    endTime?: string
    isToday?: boolean
    isYesterday?: boolean
    attendanceSubmitted?: boolean
  }>
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

function selectVisibleFeedbackStudents<T extends { id: string }>(
  students: T[],
  rosterIds: string[],
  ready: boolean,
  singleSession: boolean,
) {
  if (!ready) return []
  if (singleSession) return students
  const roster = new Set(rosterIds)
  return students.filter((student) => roster.has(student.id))
}

type FeedbackComposerProps = {
  standaloneOnly: boolean
  adminMode?: boolean
  onRecordSaved?: () => void
}

function FeedbackPageInner({ standaloneOnly, adminMode = false, onRecordSaved }: FeedbackComposerProps) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const draftKey = session?.user?.id ? `teacher-feedback-draft:${session.user.id}:${standaloneOnly ? 'single' : 'class'}` : ''
  const isMobile = useIsMobile(1025) ?? false
  const searchParams = useSearchParams()
  const requestedLessonId = searchParams.get('lessonId')?.trim() || ''
  const requestedStudentId = searchParams.get('studentId')?.trim() || ''
  const requestedGroupId = searchParams.get('groupId')?.trim() || ''

  // State
  const [groupId, setGroupId] = useState(requestedGroupId)
  const [singleSessionMode, setSingleSessionMode] = useState(standaloneOnly)
  const [singleSessionManual, setSingleSessionManual] = useState(false)
  const [singleSessionSearch, setSingleSessionSearch] = useState('')
  const [singleSessionStudents, setSingleSessionStudents] = useState<SingleSessionStudent[]>([])
  const [singleSessionTeachers, setSingleSessionTeachers] = useState<SingleSessionTeacherOption[]>([])
  const [singleSessionTeacherId, setSingleSessionTeacherId] = useState('')
  const [singleSessionSubjects, setSingleSessionSubjects] = useState<string[]>([])
  const [singleSessionSubject, setSingleSessionSubject] = useState('')
  const [singleSessionStudent, setSingleSessionStudent] = useState<SingleSessionStudent | null>(null)
  const [singleSessionDate, setSingleSessionDate] = useState(todayDateInput)
  const [singleSessionGrade, setSingleSessionGrade] = useState('')
  const [singleSessionSaving, setSingleSessionSaving] = useState(false)
  const [singleSessionError, setSingleSessionError] = useState('')
  const [singleSessionRestoreStudentId, setSingleSessionRestoreStudentId] = useState('')

  useEffect(() => {
    setSingleSessionMode(standaloneOnly)
  }, [standaloneOnly])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null)
  const [studentTagLibraryExpanded, setStudentTagLibraryExpanded] = useState(false)
  const [studentTagCategory, setStudentTagCategory] = useState<string>('常用')
  const [requiredTagValidationAttempted, setRequiredTagValidationAttempted] = useState(false)
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
  const [standaloneShareOpen, setStandaloneShareOpen] = useState(false)
  const [standaloneShareImage, setStandaloneShareImage] = useState<string | null>(null)
  const [standaloneShareFilename, setStandaloneShareFilename] = useState('牧哲学堂_单次课程反馈.png')
  const [standaloneDraftSaved, setStandaloneDraftSaved] = useState(false)
  const [generatingStandaloneShare, setGeneratingStandaloneShare] = useState(false)
  const standalonePosterRef = useRef<HTMLDivElement>(null)
  const [autosaveState, setAutosaveState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'offline' | 'error'>('loading')
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null)
  const [localDraftAvailable, setLocalDraftAvailable] = useState(true)
  const submitCooldownRef = useRef(false)
  const pendingFeedbackRequestIdsRef = useRef(new Map<string, { fingerprint: string; requestId: string }>())
  const pendingBatchRequestRef = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)
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
  const [studentNextLessonFocus, setStudentNextLessonFocus] = useState<Record<string, string[]>>({})
  const [studentTags, setStudentTags] = useState<Record<string, string[]>>({})
  const [studentMastery, setStudentMastery] = useState<Record<string, string>>({})
  const [studentPersonalizedLearning, setStudentPersonalizedLearning] = useState<Record<string, PersonalizedLearningExtension>>({})
  const [studentFollowupOutcomes, setStudentFollowupOutcomes] = useState<Record<string, FollowupOutcome>>({})
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
  const [aiTopicMismatchConfirmed, setAiTopicMismatchConfirmed] = useState(false)
  const [aiTopicRecheckRequested, setAiTopicRecheckRequested] = useState(false)
  const [aiTopicReviewInput, setAiTopicReviewInput] = useState('')
  const topicReviewBlocked = aiTopicRecheckRequested || Boolean(aiTopicWarning && !aiTopicMismatchConfirmed)
  const aiInputSignatureRef = useRef('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiWaitingMessageIndex, setAiWaitingMessageIndex] = useState(0)
  const [aiPrefilled, setAiPrefilled] = useState<Set<string>>(new Set())
  // AI 扩写（对话式助手）：生成后直接写入每名学生反馈草稿，可继续追问调整
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatInputRef = useRef<TextAreaRef>(null)
  const [chatBusy, setChatBusy] = useState(false)
  // 生成进度：chatBusy 时爬升到 90%，完成后归零
  const [aiProgress, setAiProgress] = useState(0)
  // 追问目标：默认沿用上一次 AI 影响的学生，界面明确展示本次将修改谁
  const [chatTargetIds, setChatTargetIds] = useState<string[]>([])
  // 每名学生草稿的 AI 最近更新时间与「撤销本次修改」快照
  const [aiUpdatedAt, setAiUpdatedAt] = useState<Record<string, number>>({})
  const [aiUndo, setAiUndo] = useState<Record<string, string | null>>({})
  const [aiExtensionUndo, setAiExtensionUndo] = useState<Record<string, PersonalizedLearningExtension | null>>({})
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
    groupId: singleSessionMode ? '' : groupId,
    singleSessionMode,
    singleSessionStudentId: singleSessionStudent?.id || '',
    singleSessionStudentName: singleSessionStudent?.name || singleSessionSearch,
    singleSessionTeacherId,
    singleSessionManual,
    singleSessionGrade,
    singleSessionSubject,
    singleSessionDate,
    selectedStudentIds,
    lessonContent,
    summary,
    overallComment,
    perStudentComments,
    studentObservations,
    studentNextLessonFocus,
    studentPerf,
    studentTags,
    studentMastery,
    studentPersonalizedLearning,
    studentFollowupOutcomes,
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
  }), [badge, groupId, homework, hwInput, imageUrls, knowledgeCard, kps, lessonContent, mood, overallComment, perStudentComments, selectedStudentIds, singleSessionDate, singleSessionGrade, singleSessionManual, singleSessionMode, singleSessionSearch, singleSessionStudent, singleSessionSubject, singleSessionTeacherId, stageSuggestions, stageSummaryText, studentFollowupOutcomes, studentMastery, studentNextLessonFocus, studentObservations, studentPerf, studentPersonalizedLearning, studentTags, summary, tags, textbookCatalogKey])
  useEffect(() => { latestDraftKeyRef.current = draftKey }, [draftKey])
  useEffect(() => { latestDraftPayloadRef.current = draftPayload }, [draftPayload])

  const queueDraftSaveRef = useRef<(payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive?: boolean) => void>(() => undefined)
  const queueDraftSave: (payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive?: boolean) => void = useCallback((payload: TeacherFeedbackDraftPayload | null, sequence: number, keepalive = false) => {
    draftSaveQueueRef.current = draftSaveQueueRef.current.catch(() => undefined).then(async () => {
      if (sequence < latestDraftSequenceRef.current) return
      if (adminMode) {
        serverDraftMayExistRef.current = false
        if (sequence === latestDraftSequenceRef.current) {
          setAutosaveState(payload && localDraftAvailableRef.current ? 'saved' : 'idle')
          setAutosavedAt(payload ? Date.now() : null)
        }
        return
      }
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
  }, [adminMode])
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
      if (standaloneOnly && draft.singleSessionMode === true) {
        setGroupId(SINGLE_SESSION_GROUP_ID)
        if (typeof draft.singleSessionStudentName === 'string') setSingleSessionSearch(draft.singleSessionStudentName.slice(0, 40))
        if (typeof draft.singleSessionTeacherId === 'string') setSingleSessionTeacherId(draft.singleSessionTeacherId)
        if (draft.singleSessionManual === true && typeof draft.singleSessionStudentName === 'string' && draft.singleSessionStudentName.trim()) {
          const grade = typeof draft.singleSessionGrade === 'string' ? draft.singleSessionGrade : ''
          setSingleSessionManual(true)
          setSingleSessionGrade(grade)
          setSingleSessionStudent({ id: SINGLE_SESSION_MANUAL_STUDENT_ID, name: draft.singleSessionStudentName.slice(0, 40), grade, gender: null, parentLabel: '手动录入 · 无学员档案' })
          setSelectedStudentIds([SINGLE_SESSION_MANUAL_STUDENT_ID])
          setEditingStudentId(SINGLE_SESSION_MANUAL_STUDENT_ID)
        } else if (typeof draft.singleSessionStudentId === 'string') setSingleSessionRestoreStudentId(draft.singleSessionStudentId)
        if (typeof draft.singleSessionSubject === 'string') setSingleSessionSubject(draft.singleSessionSubject)
        if (typeof draft.singleSessionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.singleSessionDate)) setSingleSessionDate(draft.singleSessionDate)
      } else if (typeof draft.groupId === 'string' && draft.groupId !== SINGLE_SESSION_GROUP_ID) setGroupId(draft.groupId)
      if (Array.isArray(draft.selectedStudentIds)) setSelectedStudentIds(draft.selectedStudentIds
        .filter((item): item is string => typeof item === 'string' && (standaloneOnly || item !== SINGLE_SESSION_MANUAL_STUDENT_ID))
        .slice(0, MAX_STUDENTS_PER_FEEDBACK))
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
      setStudentNextLessonFocus(normalizeNextLessonFocusDraft(draft.studentNextLessonFocus))
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
      if (draft.studentPersonalizedLearning && typeof draft.studentPersonalizedLearning === 'object' && !Array.isArray(draft.studentPersonalizedLearning)) {
        setStudentPersonalizedLearning(Object.fromEntries(Object.entries(draft.studentPersonalizedLearning)
          .slice(0, MAX_STUDENTS_PER_FEEDBACK)
          .flatMap(([id, value]) => {
            const normalized = normalizePersonalizedLearningExtension(value)
            return normalized ? [[id, normalized] as const] : []
          })))
      }
      if (draft.studentFollowupOutcomes && typeof draft.studentFollowupOutcomes === 'object' && !Array.isArray(draft.studentFollowupOutcomes)) {
        const allowedOutcomes = new Set<string>(FOLLOWUP_OUTCOME_OPTIONS.map((option) => option.value))
        setStudentFollowupOutcomes(Object.fromEntries(Object.entries(draft.studentFollowupOutcomes)
          .filter((entry): entry is [string, FollowupOutcome] => typeof entry[1] === 'string' && allowedOutcomes.has(entry[1]))
          .slice(0, MAX_STUDENTS_PER_FEEDBACK)))
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
      let remoteLoadSucceeded = adminMode
      if (!adminMode) {
        try {
          const response = await fetch('/api/teacher/feedback-draft', { cache: 'no-store' })
          if (!response.ok) throw new Error('草稿读取失败')
          const data = await response.json() as { draft?: { payload?: Record<string, unknown>; updatedAt?: string } | null }
          remoteDraft = data.draft || null
          remoteLoadSucceeded = true
        } catch {
          remoteLoadSucceeded = false
        }
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
  }, [adminMode, draftKey, sessionStatus, standaloneOnly, updateLocalDraftAvailability])

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

    if (adminMode) {
      serverDraftMayExistRef.current = false
      const hasContent = hasTeacherFeedbackDraftContent(payload)
      setAutosaveState(!hasContent ? 'idle' : localSaved ? 'saved' : 'error')
      setAutosavedAt(localSaved && hasContent ? Date.now() : null)
      return
    }

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
  }, [adminMode, draftKey, draftLoaded, draftPayload, queueDraftSave, updateLocalDraftAvailability])

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
  const { data: ctx, error: ctxError, mutate: mutateCtx } = useSWR<FeedbackContext>(
    adminMode ? null : '/api/teacher/feedback-context',
    fetchFeedbackContext,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2_000,
    },
  )
  const groups = useMemo(() => ctx?.groups || [], [ctx?.groups])
  const sortedGroups = [...groups].sort((a, b) => {
    const [gradeA, subjectA] = feedbackGroupOrder(a)
    const [gradeB, subjectB] = feedbackGroupOrder(b)
    return gradeA - gradeB || subjectA - subjectB || (a.name || a.courseName || '').localeCompare(b.name || b.courseName || '', 'zh-CN')
  })

  useEffect(() => {
    if (!singleSessionMode) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams()
      if (singleSessionSearch.trim()) query.set('q', singleSessionSearch.trim().slice(0, 40))
      void fetch(`/api/teacher/classroom-feedback/single-session${query.size ? `?${query}` : ''}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json().catch(() => ({})) as { currentTeacherId?: string; subjects?: string[]; teachers?: SingleSessionTeacherOption[]; students?: SingleSessionStudent[]; error?: string }
          if (!response.ok) throw new Error(data.error || '无法加载教师学科和学员')
          if (controller.signal.aborted) return
          const teachers = Array.isArray(data.teachers) ? data.teachers : []
          setSingleSessionTeachers(teachers)
          const chosenTeacherId = teachers.some((candidate) => candidate.id === singleSessionTeacherId)
            ? singleSessionTeacherId
            : data.currentTeacherId || teachers[0]?.id || ''
          if (chosenTeacherId !== singleSessionTeacherId) setSingleSessionTeacherId(chosenTeacherId)
          const subjects = teachers.find((candidate) => candidate.id === chosenTeacherId)?.subjects
            || (Array.isArray(data.subjects) ? data.subjects : [])
          setSingleSessionSubjects(subjects)
          setSingleSessionSubject((current) => subjects.includes(current) ? current : '')
          setSingleSessionStudents(Array.isArray(data.students) ? data.students : [])
          setSingleSessionError('')
          if (singleSessionRestoreStudentId) {
            const restored = data.students?.find((student) => student.id === singleSessionRestoreStudentId)
            if (restored) {
              setSingleSessionStudent(restored)
              setSingleSessionGrade(restored.grade || '')
              setSelectedStudentIds(restored.grade ? [restored.id] : [])
              setEditingStudentId(restored.grade ? restored.id : null)
            } else {
              setSingleSessionError('草稿中的学员档案未匹配到，请重新搜索学员')
            }
            setSingleSessionRestoreStudentId('')
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setSingleSessionError(error instanceof Error ? error.message : '学员搜索失败，请稍后重试')
        })
    }, 220)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [singleSessionMode, singleSessionSearch, singleSessionRestoreStudentId, singleSessionTeacherId])

  useEffect(() => {
    if (singleSessionMode || !requestedLessonId || !ctx?.lessons?.length) return
    const lesson = ctx.lessons.find((item) => item.id === requestedLessonId)
    if (!lesson) return
    setGroupId(lesson.scopeId || lesson.groupId)
    const blockedStudentIds = new Set(Object.keys(lesson.blockedStudentReasons || {}))
    const selectableStudentIds = (lesson.studentIds || []).filter((id) => !blockedStudentIds.has(id))
    setSelectedStudentIds(selectableStudentIds.slice(0, MAX_STUDENTS_PER_FEEDBACK))
  }, [ctx?.lessons, requestedLessonId, singleSessionMode])

  // 从「我的学员」进入：自动选中该学员及其所在班级，避免教师二次搜索
  useEffect(() => {
    if (singleSessionMode || requestedLessonId || !requestedStudentId || !groups.length) return
    const candidateGroups = groups.filter((group) =>
      Array.isArray(group.students) && group.students.some((student) => student.id === requestedStudentId),
    )
    if (!candidateGroups.length) return
    const preferred = candidateGroups.find((g) => g.students.some((s) => s.id === requestedStudentId && !s.todayFeedback))
      || candidateGroups[0]
    setGroupId(preferred.id || preferred.groupId || preferred.id)
    setSelectedStudentIds([requestedStudentId])
  }, [groups, requestedLessonId, requestedStudentId, singleSessionMode])


  // Selected group
  const singleSessionGroup = useMemo<FeedbackGroup | undefined>(() => singleSessionMode ? ({
    id: SINGLE_SESSION_GROUP_ID,
    groupId: '',
    name: singleSessionStudent?.name ? `${singleSessionStudent.name} · 单次反馈` : '单次课程反馈',
    courseName: '单次课程反馈',
    grade: singleSessionStudent?.grade || null,
    courseType: 'ONE_ON_ONE',
    subject: singleSessionSubject || null,
    studentCount: singleSessionStudent ? 1 : 0,
    students: singleSessionStudent ? [singleSessionStudent] : [],
  }) : undefined, [singleSessionMode, singleSessionStudent, singleSessionSubject])
  const selectedSingleSessionTeacher = singleSessionTeachers.find((candidate) => candidate.id === singleSessionTeacherId) || null
  const selectedGroup = singleSessionMode
    ? singleSessionGroup
    : groups.find((g) => g.id === groupId) || groups.find((g) => g.groupId === groupId)
  const selectedActualGroupId = singleSessionMode ? '' : selectedGroup?.groupId || selectedGroup?.id || ''
  const previousFollowupByStudent = useMemo(() => {
    const expectedSubject = selectedGroup?.subject?.trim().toLocaleLowerCase('zh-CN') || ''
    return new Map((ctx?.previousFollowups || [])
      .filter((item) => item.groupId === selectedActualGroupId
        && item.subject.trim().toLocaleLowerCase('zh-CN') === expectedSubject)
      .map((item) => [item.studentId, item]))
  }, [ctx?.previousFollowups, selectedActualGroupId, selectedGroup?.subject])
  const groupStudents = useMemo(() => selectedGroup?.students || [], [selectedGroup])
  const validateRequiredStudentTags = (studentIds: string[]) => {
    const issues = studentIds
      .map(studentId => ({ studentId, missing: getMissingStudentTagCategories(studentTags[studentId] || []) }))
      .filter(issue => issue.missing.length > 0)
    setRequiredTagValidationAttempted(true)
    if (!issues.length) {
      setRequiredTagValidationAttempted(false)
      return true
    }

    const firstIssue = issues[0]
    const studentName = groupStudents.find(student => student.id === firstIssue.studentId)?.name || '当前学生'
    const additionalStudents = issues.length - 1
    setMoreExpanded(true)
    setEditingStudentId(firstIssue.studentId)
    setDrawerStudentId(firstIssue.studentId)
    setStudentTagCategory(firstIssue.missing[0])
    toast.warning(`${studentName}还需选择：${firstIssue.missing.join('、')}，每组至少选择 1 项${additionalStudents ? `；另有 ${additionalStudents} 名学生未完成` : ''}`)
    window.requestAnimationFrame(() => {
      const editor = document.getElementById('teacher-feedback-student-editor')
      editor?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.requestAnimationFrame(() => {
        const activeCategory = Array.from(editor?.querySelectorAll<HTMLElement>('[data-student-tag-category]') || [])
          .find(button => button.dataset.studentTagCategory === firstIssue.missing[0])
        activeCategory?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      })
    })
    return false
  }
  const orderedFeedbackLessons: GroupedFeedbackSession[] = useMemo(() => {
    return groupFeedbackLessonsIntoSessions(
      ctx?.lessons || [],
      selectedGroup?.id,
      requestedLessonId,
    )
  }, [ctx?.lessons, requestedLessonId, selectedGroup?.id])
  const defaultFeedbackLesson = orderedFeedbackLessons.find((lesson) => lesson.attendanceSubmitted)
    || orderedFeedbackLessons[0]
  const selectedFeedbackLesson = orderedFeedbackLessons.find((lesson) => lesson.id === selectedLessonId || lesson.allLessonIds.includes(selectedLessonId || ''))
    || orderedFeedbackLessons.find((lesson) => lesson.id === requestedLessonId || lesson.allLessonIds.includes(requestedLessonId || ''))
    || defaultFeedbackLesson
  const feedbackLessonReady = singleSessionMode
    ? Boolean(singleSessionStudent?.grade && singleSessionSubject && singleSessionDate)
    : Boolean(selectedFeedbackLesson?.attendanceSubmitted)
  useEffect(() => {
    if (!singleSessionMode) return
    if (singleSessionStudent?.grade && singleSessionSubject && singleSessionDate) {
      setSelectedStudentIds((current) => current.length === 1 && current[0] === singleSessionStudent.id ? current : [singleSessionStudent.id])
      setEditingStudentId(singleSessionStudent.id)
    } else {
      setSelectedStudentIds([])
      setEditingStudentId(null)
    }
  }, [singleSessionMode, singleSessionStudent, singleSessionSubject, singleSessionDate])
  const lessonBlockedReasons: Record<string, FeedbackLessonBlockReason> = selectedFeedbackLesson?.blockedStudentReasons || EMPTY_FEEDBACK_BLOCK_REASONS
  const feedbackClassLessonId = singleSessionMode ? null : selectedFeedbackLesson?.id || null
  const feedbackLessonOptions = orderedFeedbackLessons.map((session) => ({
    value: session.id,
    label: formatSessionOptionLabel(session),
  }))
  const selectedLessonRosterKey = (selectedFeedbackLesson?.studentIds || []).join('\u0000')
  const selectedLessonRosterIds = selectedLessonRosterKey ? selectedLessonRosterKey.split('\u0000') : []
  const visibleGroupStudents = selectVisibleFeedbackStudents(groupStudents, selectedLessonRosterIds, feedbackLessonReady, singleSessionMode)
  useEffect(() => {
    const currentVisibleStudents = selectVisibleFeedbackStudents(
      groupStudents,
      selectedLessonRosterKey ? selectedLessonRosterKey.split('\u0000') : [],
      feedbackLessonReady,
      singleSessionMode,
    )
    const selectableIds = new Set(currentVisibleStudents
      .filter((student) => !lessonBlockedReasons[student.id])
      .map((student) => student.id))
    setSelectedStudentIds((current) => {
      const next = current.filter((studentId) => selectableIds.has(studentId))
      return next.length === current.length ? current : next
    })
  }, [feedbackClassLessonId, feedbackLessonReady, groupId, groupStudents, lessonBlockedReasons, selectedLessonRosterKey, singleSessionMode])
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
    ? visibleGroupStudents.filter((s) => s.name.includes(studentSearch))
    : visibleGroupStudents

  const feedbackCourseBucket: FeedbackCourseBucket = toFeedbackCourseBucket(selectedGroup?.courseType || selectedGroup?.course?.type)
  const feedbackSceneLabel = singleSessionMode ? '单次课程反馈' : feedbackCourseBucket === 'ONE_ON_ONE' ? '一对一反馈' : '小班反馈'
  const feedbackRateLabel = singleSessionMode ? '不计入课次奖励' : feedbackCourseBucket === 'ONE_ON_ONE' ? '1元/人' : '0.5元/人'
  const previewFeedbackItems = selectedStudentIds.map((id) => {
    const studentName = groupStudents.find((student) => student.id === id)?.name || '该学生'
    const individualComment = (selectedStudentIds.length === 1 ? overallComment : perStudentComments[id])?.trim() || ''
    const hasGeneratedDraft = Boolean(aiUpdatedAt[id]) || isExpandedFeedbackDraft(individualComment)
    const source = selectedStudentIds.length === 1
      ? hasGeneratedDraft
        ? individualComment
        : joinDistinctText(resolvedStructuredRecord.feedback, individualComment)
      : individualComment || joinDistinctText(resolvedStructuredRecord.feedback, overallComment)
    const parentSections = getParentFeedbackDisplaySections({
      overallComment: source,
      studentName: individualComment ? studentName : undefined,
    })
    const parentFeedback = singleSessionMode
      ? getParentClassroomFeedbackContent(source, studentName)
      : parentSections[0]?.content || ''
    const performance = studentPerf[id] ? STUDENT_PERF_META[studentPerf[id]].label : ''
    const mastery = studentMastery[id]?.trim() || ''
    const studentTagsForPreview = (studentTags[id] || []).filter(Boolean).slice(0, 30)
    const teacherRemark = studentObservations[id]?.trim() || ''
    const nextLessonFocus = getStudentNextLessonFocusTags(studentNextLessonFocus, id).join('、')
    const personalizedLearning = normalizePersonalizedLearningExtension(studentPersonalizedLearning[id])
    return { id, studentName, content: parentFeedback, performance, mastery, tags: studentTagsForPreview, teacherRemark, nextLessonFocus, personalizedLearning }
  }).filter((item) => item.content || item.performance || item.mastery || item.tags.length || item.teacherRemark || item.nextLessonFocus || item.personalizedLearning)
  const previewTopic = kps.find((item) => item.trim()) || knowledgeCard?.topic || ''
  // 从「我的学员」进入时，展示当前反馈对象，让教师确认上下文
  const requestedStudentName = useMemo(() => {
    if (!requestedStudentId || !groups.length) return ''
    return groups.flatMap((group) => group.students || []).find((student) => student.id === requestedStudentId)?.name || ''
  }, [groups, requestedStudentId])

  useEffect(() => {
    const targetStudents: string[] = selectedStudentIds
    if (!targetStudents.length || singleSessionMode) {
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
  }, [selectedStudentIds, selectedActualGroupId, feedbackCourseBucket, singleSessionMode])

  // ── Stage summary load when single student selected ──
  const stageStudentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null
  const { data: stageDataRaw } = useSWR<StageData>(
    stageStudentId && !adminMode ? `/api/teacher/stage-summary?studentId=${stageStudentId}&months=3` : null,
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
    const blockedReason = lessonBlockedReasons[id]
    if (blockedReason) {
      toast.warning(blockedReason === 'LEAVE' ? '该学员本节课已请假，不能提交课堂反馈' : '该学员本节课未到校，不能提交课堂反馈')
      return
    }
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
      if (drawerStudentId === id) setDrawerStudentId(null)
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
    const notDone = filteredStudents.filter((s) =>
      !lessonBlockedReasons[s.id]
      && !(s.todayFeedback || todayFeedbackByScope[feedbackTodayScopeKey(selectedActualGroupId, selectedGroup?.subject, s.id)]),
    )
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
    setDrawerStudentId(null)
    setRequiredTagValidationAttempted(false)
    setStudentPerf({})
    setStudentTags({})
    setStudentMastery({})
    setStudentPersonalizedLearning({})
  }
  const clearFeedbackEditorState = (nextGroupId: string) => {
    setGroupId(nextGroupId)
    setSelectedLessonId('')
    setSelectedStudentIds([])
    setEditingStudentId(null)
    setDrawerStudentId(null)
    setRequiredTagValidationAttempted(false)
    setStudentSearch('')
    setStudentPerf({})
    setStudentObservations({})
    setStudentNextLessonFocus({})
    setStudentFollowupOutcomes({})
    setStudentTags({})
    setStudentMastery({})
    setStudentPersonalizedLearning({})
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
    setAiTopicMismatchConfirmed(false)
    setAiTopicRecheckRequested(false)
    setAiTopicReviewInput('')
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
    setAiExtensionUndo({})
    setStageData(null)
    setStageSummaryText('')
    setStageSuggestions('')
    setStageExpanded(false)
    setBonusPreview(null)
    setBonusLoading(false)
    setPreviewOpen(false)
    setStudentsExpanded(true)
  }
  const handleFeedbackGroupChange = (nextGroupId: string) => {
    if (nextGroupId === groupId) return
    if (uploadingCount > 0 || aiGenerating) {
      toast.warning(uploadingCount > 0 ? '课堂图片仍在上传，请完成后再切换课程' : '学堂数据库整理尚未完成，请稍后再切换课程')
      return
    }

    if (requestedLessonId) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('lessonId')
      const query = params.toString()
      router.replace(`/teacher/feedback${query ? `?${query}` : ''}`)
    }

    chatSeqRef.current += 1
    chatAbortRef.current?.abort()
    chatAbortRef.current = null
    userEditedRef.current.clear()
    revokeLocalPreviews(imageDisplayUrls)
    clearFeedbackEditorState(nextGroupId)
  }
  const handleFeedbackLessonChange = (nextLessonId: string) => {
    if (nextLessonId === (selectedFeedbackLesson?.id || '')) return
    setSelectedLessonId(nextLessonId)
    setSelectedStudentIds([])
    setEditingStudentId(null)
    setDrawerStudentId(null)
    setRequiredTagValidationAttempted(false)
    setStudentPerf({})
    setStudentObservations({})
    setStudentNextLessonFocus({})
    setStudentFollowupOutcomes({})
    setStudentTags({})
    setStudentMastery({})
    setStudentPersonalizedLearning({})
    setStudentSearch('')
    setChatMessages([])
    setChatInput('')
    setPerStudentComments({})
    const params = new URLSearchParams(searchParams.toString())
    if (nextLessonId) params.set('lessonId', nextLessonId)
    else params.delete('lessonId')
    const query = params.toString()
    router.replace(`/teacher/feedback${query ? `?${query}` : ''}`)
    toast.success('课次已切换，请核对课堂内容并重新选择学员')
  }
  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  const toggleKp = (kp: string) => setKps(prev => prev.includes(kp) ? prev.filter(k => k !== kp) : [...prev, kp])
  const markTodayFeedback = (feedbackGroupId: string, subject: string | null | undefined, studentIds: string[]) => {
    if (!feedbackGroupId) return
    setTodayFeedbackByScope((current) => {
      const next = { ...current }
      for (const studentId of studentIds) next[feedbackTodayScopeKey(feedbackGroupId, subject, studentId)] = true
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

  const requireKnowledgeTopicReview = () => {
    if (!topicReviewBlocked) return true
    toast.warning(aiTopicRecheckRequested
      ? '知识点正在等待重新识别，请完成核对后再继续'
      : '请先核对知识点：重新识别课堂记录，或确认这是课外拓展内容')
    window.requestAnimationFrame(() => {
      document.getElementById('teacher-feedback-topic-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }

  const submit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (saving || (status === 'PUBLISHED' && submitCooldownRef.current)) return false
    if (status === 'PUBLISHED' && !requireKnowledgeTopicReview()) return false
    if (singleSessionMode && status === 'PUBLISHED') {
      toast.warning('单次反馈用于生成分享图，不会直接发布到家长端')
      return false
    }
    if (uploadingCount > 0) {
      toast.warning(`还有 ${uploadingCount} 张图片正在上传，请上传完成后再发布`)
      return false
    }
    if (status === 'PUBLISHED' && !feedbackLessonReady) {
      toast.warning(singleSessionMode
        ? '请先选择学员、学科、年级和上课日期，再发布单次反馈'
        : selectedFeedbackLesson
          ? '本节课考勤尚未提交，完成考勤后才能发布反馈'
          : '请先选择一节已完成考勤的具体课次，再发布反馈')
      return false
    }
    const targetStudents: string[] = selectedStudentIds
    if (!targetStudents.length) { toast.warning('请选择学员'); return false }
    if (targetStudents.length > MAX_STUDENTS_PER_FEEDBACK) { toast.warning('一次最多反馈5名学生'); return false }
    if (status === 'PUBLISHED' && !validateRequiredStudentTags(targetStudents)) return false
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
      return false
    }
    const studentRatings = targetStudents
      .map((studentId) => {
        const selectedTags = (studentTags[studentId] || [])
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 30)
        const personalizedLearning = normalizePersonalizedLearningExtension(studentPersonalizedLearning[studentId])
        const previousFollowup = previousFollowupByStudent.get(studentId)
        const followupOutcome = studentFollowupOutcomes[studentId]
        return {
          studentId,
          ...(studentPerf[studentId] ? { rating: studentPerf[studentId] } : {}),
          ...(studentMastery[studentId] ? { masteryLevel: studentMastery[studentId] } : {}),
          ...(selectedTags.length ? { tags: selectedTags } : {}),
          ...(studentObservations[studentId]?.trim() ? { teacherRemark: studentObservations[studentId].trim().slice(0, 350) } : {}),
          nextLessonFocus: getStudentNextLessonFocusTags(studentNextLessonFocus, studentId).join('、').slice(0, 120),
          ...(personalizedLearning ? { personalizedLearning } : {}),
          ...(previousFollowup && followupOutcome ? { followupReview: createFollowupReview(previousFollowup, followupOutcome) } : {}),
        }
      })
      .filter((rating) => Boolean(rating.rating) || Boolean(rating.masteryLevel) || Boolean(rating.tags?.length) || Boolean(rating.teacherRemark) || Boolean(rating.nextLessonFocus) || Boolean(rating.followupReview))
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
      toast.warning('反馈内容不能为空'); return false
    }
    setSaving(true)
    try {
      let fbData: FeedbackSubmitResponse = {}
      const individualBonuses: BonusResult[] = []
      if (useIndividualComments || singleSessionMode) {
        const publishedIds: string[] = []
        const failedItems: typeof individualComments = []
        const failedReasons: string[] = []
        for (const item of individualComments) {
          const requestBody = {
            classLessonId: feedbackClassLessonId,
            additionalLessonIds: selectedFeedbackLesson?.allLessonIds?.filter((id) => id !== feedbackClassLessonId) || [],
            groupId: selectedActualGroupId || null,
            feedbackGroupId: selectedActualGroupId || null,
            subject: selectedGroup?.subject || null,
            isSingleSession: singleSessionMode,
            singleSessionManual: singleSessionMode && singleSessionManual,
            singleSessionStudentName: singleSessionMode && singleSessionManual ? singleSessionStudent?.name : undefined,
            singleSessionGrade: singleSessionMode && singleSessionManual ? singleSessionGrade : undefined,
            singleSessionTeacherId: singleSessionMode ? singleSessionTeacherId : undefined,
            sessionDate: singleSessionMode ? singleSessionDate : undefined,
            feedbackCourseType: feedbackCourseBucket,
            targetType: 'STUDENT' as const,
            studentIds: [item.studentId],
            ...(singleSessionMode ? {
              singleSessionManual,
              singleSessionStudentName: singleSessionManual ? singleSessionStudent?.name : undefined,
              singleSessionGrade: singleSessionManual ? singleSessionGrade : undefined,
            } : {}),
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
              const reason = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : `请求失败（${fbRes.status}）`
              failedReasons.push(reason)
              console.warn('[teacher-feedback] student feedback save failed', { studentId: item.studentId, status: fbRes.status, reason })
              continue
            }
            pendingFeedbackRequestIdsRef.current.delete(item.studentId)
            publishedIds.push(item.studentId)
            if (data.bonus) individualBonuses.push(data.bonus)
            if (status === 'PUBLISHED' && !singleSessionMode) markTodayFeedback(selectedActualGroupId, selectedGroup?.subject, [item.studentId])
          } catch (error) {
            failedItems.push(item)
            failedReasons.push(errorMessage(error, '网络异常，请检查连接后重试'))
            console.warn('[teacher-feedback] student publish network error', { studentId: item.studentId, error })
          }
        }
        if (failedItems.length) {
          const failedIds = new Set(failedItems.map((item) => item.studentId))
          setSelectedStudentIds(targetStudents.filter((id) => failedIds.has(id)))
          if (failedItems.length === 1) setOverallComment(perStudentComments[failedItems[0].studentId] || resolvedOverallComment)
          const failedNames = failedItems.map((item) => groupStudents.find((student) => student.id === item.studentId)?.name || singleSessionStudent?.name || '该学生')
          if (singleSessionMode) {
            toast.error(`单次反馈保存失败（${failedNames.join('、')}）：${failedReasons[0] || '请稍后重试'}`, { duration: 8000 })
          } else {
            toast.error(`反馈部分完成：成功 ${publishedIds.length} 人，失败 ${failedItems.length} 人（${failedNames.join('、')}）。${failedReasons[0] ? `原因：${failedReasons[0]}。` : ''}再次提交将只重试失败学生。`, { duration: 8000 })
          }
          return false
        }
      } else {
        const requestBody = {
          classLessonId: feedbackClassLessonId,
          additionalLessonIds: selectedFeedbackLesson?.allLessonIds?.filter((id) => id !== feedbackClassLessonId) || [],
          studentIds: targetStudents,
          groupId: selectedActualGroupId || null,
          feedbackGroupId: selectedActualGroupId || null,
          subject: selectedGroup?.subject || null,
          isSingleSession: singleSessionMode,
          sessionDate: singleSessionMode ? singleSessionDate : undefined,
          targetType: singleSessionMode ? 'STUDENT' : undefined,
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
        if (status === 'PUBLISHED') markTodayFeedback(selectedActualGroupId, selectedGroup?.subject, targetStudents)
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
        setSelectedStudentIds([]); setGroupId(singleSessionMode ? SINGLE_SESSION_GROUP_ID : '')
        setMood('GOOD'); setTags([]); setKps([]); setBadge('')
        setLessonContent(''); setSummary(''); setOverallComment(''); setPerStudentComments({}); setStudentPerf({}); setHomework([]); setImageUrls([])
        revokeLocalPreviews(imageDisplayUrls); setImageDisplayUrls({})
        setUploadTasks([])
        setStageSummaryText(''); setStageSuggestions('')
        setAiPrefilled(new Set())
          setStageData(null); setStageExpanded(false); setStudentObservations({}); setStudentNextLessonFocus({}); setStudentFollowupOutcomes({}); setStudentTags({}); setStudentMastery({}); setStudentPersonalizedLearning({}); setAiKnowledge(null); setKnowledgeCard(null); setAiTopicWarning(null); setAiTopicMismatchConfirmed(false); setAiTopicRecheckRequested(false); setAiTopicReviewInput('')
          setChatMessages([]); setChatInput(''); setChatTargetIds([]); setAiUpdatedAt({}); setAiUndo({}); setAiExtensionUndo({})
          userEditedRef.current.clear()
          chatSeqRef.current += 1
          chatAbortRef.current?.abort()
      } else {
        toast.success(singleSessionMode ? '单次反馈草稿已保存，家长端不会收到' : '草稿已保存', { duration: 2500 })
      }
      return true
    } catch (error) {
      toast.error(`反馈提交失败：${errorMessage(error, '网络异常，请检查连接后重试')}`, { duration: 5000 })
      return false
    } finally { setSaving(false) }
  }

  const saveStandaloneFeedbackAndPreview = async () => {
    if (!singleSessionMode) return
    if (!requireKnowledgeTopicReview()) return
    if (!feedbackLessonReady) {
      toast.warning('请先选择学员、学科、年级和上课日期')
      return
    }
    if (!previewFeedbackItems.some((item) => item.content.trim())) {
      toast.warning('请先整理每生反馈草稿，分享图中的“总体评价”会展示教师的本节反馈。')
      return
    }
    if (!validateRequiredStudentTags(selectedStudentIds)) return
    const saved = await submit('DRAFT')
    if (saved) onRecordSaved?.()
    if (!saved) toast.warning('草稿未成功保存，仍会尝试按当前页面内容生成分享图；请查看失败原因后再补存草稿', { duration: 7000 })
    setPreviewOpen(true)
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())))
    await generateStandaloneShareImage(saved === true)
  }

  async function generateStandaloneShareImage(draftSaved: boolean) {
    const poster = standalonePosterRef.current
    if (!singleSessionMode || !poster) return
    setGeneratingStandaloneShare(true)
    const posterStyle = {
      width: poster.style.width,
      maxWidth: poster.style.maxWidth,
      flex: poster.style.flex,
      margin: poster.style.margin,
    }
    const ancestorStyles: Array<{ element: HTMLElement; overflow: string; maxHeight: string; height: string }> = []
    let ancestor = poster.parentElement
    while (ancestor && ancestor !== document.body) {
      ancestorStyles.push({ element: ancestor, overflow: ancestor.style.overflow, maxHeight: ancestor.style.maxHeight, height: ancestor.style.height })
      const computedAncestor = window.getComputedStyle(ancestor)
      ancestor.style.overflow = 'visible'
      if (computedAncestor.maxHeight !== 'none') ancestor.style.maxHeight = 'none'
      if (computedAncestor.height !== 'auto' && ancestor.scrollHeight > ancestor.clientHeight) ancestor.style.height = 'auto'
      ancestor = ancestor.parentElement
    }
    const modalRoot = poster.closest<HTMLElement>('.ant-modal-root')
    const modalOpacity = modalRoot?.style.opacity
    if (modalRoot) modalRoot.style.opacity = '0'
    poster.style.width = '420px'
    poster.style.maxWidth = 'none'
    poster.style.flex = '0 0 auto'
    poster.style.margin = '0 auto'
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())))
      const posterImages = Array.from(poster.querySelectorAll<HTMLImageElement>('img'))
      posterImages.forEach((image) => { image.loading = 'eager' })
      await Promise.all(posterImages.map(waitForImageReady))
      const { domToPng } = await import('modern-screenshot')
      const dataUrl = await domToPng(poster, { scale: 2, backgroundColor: '#ffffff' })
      if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('SHARE_IMAGE_INVALID_DATA')
      const studentName = singleSessionStudent?.name || '学员'
      const filename = `牧哲学堂_${studentName}_${singleSessionSubject || '课程'}_${singleSessionDate || todayDateInput()}_单次反馈.png`
      setStandaloneShareImage(dataUrl)
      setStandaloneShareFilename(filename)
      setStandaloneDraftSaved(draftSaved)
      setPreviewOpen(false)
      setStandaloneShareOpen(true)
      toast.success(draftSaved ? '反馈已保存，完整分享图已生成' : '完整分享图已生成；草稿未保存，请稍后重试', { duration: 5000 })
    } catch (error) {
      console.error('[teacher-feedback] standalone share image failed', error)
      toast.error(error instanceof Error && error.message.startsWith('SHARE_IMAGE_')
        ? '分享图中的图片尚未加载完成，请稍后重试'
        : '分享图生成失败，请重试')
    } finally {
      poster.style.width = posterStyle.width
      poster.style.maxWidth = posterStyle.maxWidth
      poster.style.flex = posterStyle.flex
      poster.style.margin = posterStyle.margin
      for (const snapshot of ancestorStyles) {
        snapshot.element.style.overflow = snapshot.overflow
        snapshot.element.style.maxHeight = snapshot.maxHeight
        snapshot.element.style.height = snapshot.height
      }
      if (modalRoot) modalRoot.style.opacity = modalOpacity || ''
      setGeneratingStandaloneShare(false)
    }
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
    results: Array<{ studentId: string; article: string; personalizedLearning?: PersonalizedLearningExtension | null }>,
    meta: { card: KnowledgePointCard | null; topic: string; knowledge: string; source: string; topicMismatch?: KnowledgeTopicMismatch | null; replaceCard?: boolean },
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
      setAiExtensionUndo((current) => {
        const next = { ...current }
        for (const item of results) next[item.studentId] = studentPersonalizedLearning[item.studentId] || null
        return next
      })
      setStudentPersonalizedLearning((current) => {
        const next = { ...current }
        for (const item of results) {
          const normalized = normalizePersonalizedLearningExtension(item.personalizedLearning)
          if (normalized) next[item.studentId] = normalized
          else delete next[item.studentId]
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
      else if (meta.replaceCard) setKnowledgeCard((current) => current?.verified ? current : null)
      setAiKnowledge(null)
      setKps((current) => current.filter((topic) => !generatedTopics.has(topic)))
    } else {
      if (meta.card) setKnowledgeCard(meta.card)
      else if (meta.replaceCard) setKnowledgeCard((current) => current?.verified ? current : null)
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
    setStudentPersonalizedLearning((current) => {
      const next = { ...current }
      const previous = aiExtensionUndo[studentId]
      if (previous) next[studentId] = previous
      else delete next[studentId]
      return next
    })
    setAiExtensionUndo((current) => {
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

  const prepareKnowledgeTopicRecheck = () => {
    if (!aiTopicWarning) return
    const originalNote = aiTopicReviewInput.trim()
      || [...chatMessages].reverse().find((message) => message.role === 'user')?.content.trim()
      || lessonContent.trim()
    setAiTopicMismatchConfirmed(false)
    setAiTopicRecheckRequested(true)
    setChatInput(originalNote)
    toast.info('已将课堂原记录放入输入框；重新识别会优先核对老师指出的主题。')
    window.requestAnimationFrame(() => {
      document.getElementById('teacher-feedback-chat-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      chatInputRef.current?.focus()
    })
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
    const firstTurn = aiTopicRecheckRequested || !knowledgeCard || !hasCompletedInitialGeneration
    if (firstTurn && selectedStudentIds.length && !validateRequiredStudentTags(selectedStudentIds)) return
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
            classLessonId: feedbackClassLessonId,
            groupId: selectedActualGroupId || null,
            subject: selectedGroup?.subject || null,
            isSingleSession: singleSessionMode,
            singleSessionManual: singleSessionMode && singleSessionManual,
            singleSessionStudentName: singleSessionMode && singleSessionManual ? singleSessionStudent?.name : undefined,
            singleSessionGrade: singleSessionMode && singleSessionManual ? singleSessionGrade : undefined,
            singleSessionTeacherId: singleSessionMode ? singleSessionTeacherId : undefined,
            sessionDate: singleSessionMode ? singleSessionDate : undefined,
            studentIds: selectedStudentIds,
            targetStudentIds: targetIds,
            observations: Object.fromEntries(selectedStudentIds.map((id) => {
              const nextFocus = getStudentNextLessonFocusTags(studentNextLessonFocus, id).join('、')
              return [id, [studentObservations[id]?.trim(), nextFocus ? `下次课关注：${nextFocus}` : ''].filter(Boolean).join('\n')]
            })),
            performance: studentPerf,
            mastery: studentMastery,
            tags: studentTags,
            selectedTextbookChapters: kps,
            topicCorrection: aiTopicRecheckRequested && aiTopicWarning
              ? { lessonTopic: aiTopicWarning.lessonTopic, previousTopic: aiTopicWarning.generatedTopic }
              : undefined,
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
        if (firstTurn && generatedTopic) {
          setAiTopicWarning(detectedTopicMismatch)
          setAiTopicMismatchConfirmed(false)
          setAiTopicRecheckRequested(false)
          setAiTopicReviewInput(note)
        }
        const topicMismatch = firstTurn
          ? detectedTopicMismatch || (!generatedTopic && aiTopicRecheckRequested ? aiTopicWarning : null)
          : null
        applyAiResults(data.results || [], {
          card: firstTurn ? data.card || null : null,
          topic: firstTurn ? generatedTopic : '',
          knowledge: firstTurn ? data.knowledge || '' : '',
          source: firstTurn ? data.knowledgeSource || '' : '',
          topicMismatch,
          replaceCard: firstTurn && !(aiTopicRecheckRequested && !generatedTopic),
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

  const renderStudentEditorContent = (activeId: string, options?: { inDrawer?: boolean }) => {
    const activeStudent = groupStudents.find(student => student.id === activeId)
      || singleSessionStudents.find(student => student.id === activeId)
    if (!activeStudent) return null

    const inDrawer = Boolean(options?.inDrawer)
    const myTags = studentTags[activeId] || []
    const missingTagCategoryCount = getMissingStudentTagCategories(myTags).length
    const myMastery = studentMastery[activeId] || ''
    const myNextFocusTags = getStudentNextLessonFocusTags(studentNextLessonFocus, activeId)
    const savedCustomTags = customTagPool.filter(tag => !(STUDENT_STATE_TAGS as readonly string[]).includes(tag))
    const hiddenCustomTagCount = savedCustomTags.filter(tag => !myTags.includes(tag)).length
    const activeTagCategory = STUDENT_TAG_CATEGORIES.find(category => category.label === studentTagCategory) || STUDENT_TAG_CATEGORIES[0]
    const activeCategorySelectedCount = activeTagCategory.tags.filter(tag => myTags.includes(tag)).length
    const activeCategoryMissing = requiredTagValidationAttempted && activeCategorySelectedCount === 0
    const visibleStudentTags = [...activeTagCategory.tags, ...savedCustomTags.filter(tag => myTags.includes(tag) || studentTagLibraryExpanded), ...myTags.filter(tag => !(STUDENT_STATE_TAGS as readonly string[]).includes(tag))]
      .filter((tag, index, all) => all.indexOf(tag) === index)
    const visibleNextFocusTags = [...NEXT_LESSON_FOCUS_TAGS, ...myNextFocusTags.filter(tag => !(NEXT_LESSON_FOCUS_TAGS as readonly string[]).includes(tag))]
      .filter((tag, index, all) => all.indexOf(tag) === index)

    const content = (
      <>
        <div className="teacher-feedback-profile-heading">
          {singleSessionMode ? (
            <div style={{ minWidth: 0 }}><strong style={{ color: 'var(--color-ink)', fontSize: 14 }}>② 课堂表现与学情</strong></div>
          ) : (
            <div className="teacher-feedback-profile-student">
              <StudentAvatar gender={activeStudent.gender} name={activeStudent.name} size={inDrawer ? 34 : 38} className="teacher-feedback-profile-avatar" />
              <span className="teacher-feedback-profile-name">
                <small>正在编辑</small>
                <strong>{activeStudent.name}</strong>
              </span>
            </div>
          )}
          {!singleSessionMode && !inDrawer && (
            <span style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>先选标签，预览前会逐项检查</span>
          )}
          {inDrawer && (
            <span style={{ fontSize: 12, color: missingTagCategoryCount === 0 ? '#137A5A' : 'var(--color-primary, #E8784A)', fontWeight: 600 }}>
              {missingTagCategoryCount === 0 ? '✅ 必选标签已齐' : `还需选择 ${missingTagCategoryCount} 组标签`}
            </span>
          )}
        </div>

        {!singleSessionMode && selectedStudentIds.length > 1 && (
          <div className="teacher-feedback-selected-students" aria-label="切换要编辑的学生" style={{ margin: '10px 0' }}>
            {selectedStudentIds.map((id, index) => {
              const student = groupStudents.find(item => item.id === id)
              if (!student) return null
              const detailCount = (studentTags[id]?.length || 0)
                + Number(Boolean(studentMastery[id]))
                + Number(Boolean(studentPerf[id]))
                + Number(Boolean(studentObservations[id]?.trim()))
                + Number(getStudentNextLessonFocusTags(studentNextLessonFocus, id).length > 0)
                + Number(Boolean(studentFollowupOutcomes[id]))
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeId === id}
                  aria-label={`${student.name}${detailCount ? `，已记录${detailCount}项` : ''}`}
                  className={`teacher-feedback-student-tab${activeId === id ? ' is-active' : ''}`}
                  onClick={() => {
                    setEditingStudentId(id)
                    if (inDrawer) setDrawerStudentId(id)
                  }}
                >
                  <span className="teacher-feedback-student-tab-index">{index + 1}</span>
                  <span className="teacher-feedback-student-tab-name">{student.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {renderStudentPerfPicker(activeId)}
        {!singleSessionMode && (
          <TeacherFollowupReview
            previous={previousFollowupByStudent.get(activeId)}
            outcome={studentFollowupOutcomes[activeId]}
            onChange={(value) => setStudentFollowupOutcomes((previous) => ({ ...previous, [activeId]: value }))}
          />
        )}

        <div className="teacher-feedback-profile-group">
          <div className="teacher-feedback-profile-group-heading"><span>学习掌握</span><span>{myMastery || '可选'}</span></div>
          <div className="teacher-feedback-mastery-grid">
            {STUDENT_MASTERY_OPTIONS.map(option => {
              const active = myMastery === option
              const shortLabel = ({ 掌握扎实: '扎实', 基本掌握: '基本', 部分掌握: '部分', 需巩固: '巩固' } as const)[option]
              return (
                <button key={option} type="button" aria-pressed={active} aria-label={option} title={option} className={`teacher-feedback-profile-chip${active ? ' is-selected' : ''}`} onClick={() => setStudentMastery(previous => ({ ...previous, [activeId]: active ? '' : option }))}>{shortLabel}</button>
              )
            })}
          </div>
        </div>

        <div className="teacher-feedback-profile-group">
          <div className="teacher-feedback-profile-group-heading"><span>课堂观察标签</span><span>已完成 {STUDENT_TAG_CATEGORIES.length - missingTagCategoryCount}/{STUDENT_TAG_CATEGORIES.length} 类</span></div>
          <div role="group" aria-label="课堂表现标签分类，每组必选一项" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
            {STUDENT_TAG_CATEGORIES.map(category => {
              const active = activeTagCategory.label === category.label
              const selectedCount = category.tags.filter(tag => myTags.includes(tag)).length
              const missing = requiredTagValidationAttempted && selectedCount === 0
              return (
                <button key={category.label} data-student-tag-category={category.label} type="button" aria-pressed={active} aria-label={`${category.label}${missing ? '，必选，尚未选择' : selectedCount ? `，已选 ${selectedCount} 项` : '，必选'}`} onClick={() => setStudentTagCategory(category.label)} style={{ flex: '0 0 auto', minHeight: inDrawer ? 38 : 40, padding: inDrawer ? '6px 10px' : '7px 10px', borderRadius: 999, border: `1px solid ${missing ? 'var(--color-error)' : active ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`, background: missing ? 'var(--color-error-bg)' : active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)', color: missing ? 'var(--color-error)' : active ? 'var(--color-primary)' : 'var(--color-ink-muted)', fontSize: 12, fontWeight: active || missing ? 700 : 500, cursor: 'pointer' }}>{category.label}{selectedCount > 0 ? ` ${selectedCount}` : ' · 必选'}</button>
              )
            })}
          </div>
          {activeCategoryMissing && <div role="alert" style={{ marginBottom: 7, color: 'var(--color-error)', fontSize: 12 }}>请在“{activeTagCategory.label}”中至少选择 1 个标签。</div>}
          <div className="teacher-feedback-profile-tag-grid">
            {visibleStudentTags.map(tag => {
              const active = myTags.includes(tag)
              const isCustom = !(STUDENT_STATE_TAGS as readonly string[]).includes(tag)
              return (
                <button key={tag} type="button" aria-pressed={active} className={`teacher-feedback-profile-chip${active ? ' is-selected' : ''}${isCustom ? ' is-custom' : ''}`} onClick={() => setStudentTags(previous => { const current = previous[activeId] || []; return { ...previous, [activeId]: active ? current.filter(item => item !== tag) : [...current, tag] } })}>{tag}</button>
              )
            })}
            <button type="button" className="teacher-feedback-profile-chip is-add" onClick={() => { setAddTagFor(activeId); setNewTagText('') }}>＋ 添加标签</button>
          </div>
          {hiddenCustomTagCount > 0 && <button type="button" className="teacher-feedback-profile-more-tags" aria-expanded={studentTagLibraryExpanded} onClick={() => setStudentTagLibraryExpanded(value => !value)}>{studentTagLibraryExpanded ? '收起常用标签' : `更多常用标签 · ${hiddenCustomTagCount}`}</button>}
        </div>

        <div className="teacher-feedback-profile-group">
          <div className="teacher-feedback-profile-group-heading"><span>下次课关注</span><span>默认 1 项 · 最多 3 项</span></div>
          <div className="teacher-feedback-profile-tag-grid">
            {visibleNextFocusTags.map(tag => {
              const active = myNextFocusTags.includes(tag)
              const disabled = !active && myNextFocusTags.length >= MAX_NEXT_LESSON_FOCUS_TAGS
              return (
                <button key={tag} type="button" aria-pressed={active} disabled={disabled} className={`teacher-feedback-profile-chip${active ? ' is-selected' : ''}`} onClick={() => setStudentNextLessonFocus(previous => { const current = getStudentNextLessonFocusTags(previous, activeId); const next = current.includes(tag) ? current.filter(item => item !== tag) : current.length < MAX_NEXT_LESSON_FOCUS_TAGS ? [...current, tag] : current; return { ...previous, [activeId]: next.length ? next : [...DEFAULT_NEXT_LESSON_FOCUS_TAGS] } })}>{tag}</button>
              )
            })}
          </div>
          <small style={{ display: 'block', marginTop: 6, color: 'var(--color-ink-subtle)', fontSize: 11, lineHeight: 1.55 }}>
            默认已选“巩固本节核心知识点”，可按孩子情况调整。家长会看到这项衔接安排，依托学堂数据库整理反馈时也会参考。
          </small>
        </div>
        <label className="teacher-feedback-observation">
          <span>补充说明 <small>可选</small></span>
          <textarea value={studentObservations[activeId] || ''} onChange={event => setStudentObservations(previous => ({ ...previous, [activeId]: event.target.value.slice(0, 350) }))} placeholder="补充标签未覆盖的课堂表现" rows={2} maxLength={350} />
          <small>按原意补充课堂细节，未填写也可继续。</small>
        </label>
      </>
    )

    if (inDrawer) {
      return (
        <section id="teacher-feedback-student-editor" className="teacher-feedback-profile-card" aria-label={`${activeStudent.name}的课堂表现`} style={{ border: '1px solid #EEE7E1', borderRadius: 14, background: '#fff', padding: '14px 12px' }}>
          {content}
        </section>
      )
    }

    return (
      <Card size="small" className="teacher-feedback-profile-card" id="teacher-feedback-student-editor" aria-label={`${activeStudent.name}的课堂表现`}>
        {content}
      </Card>
    )
  }

  const formSection = (
    <div className="teacher-feedback-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isMobile && <div className="teacher-feedback-mobile-step-title">{singleSessionMode ? '③ 课堂反馈与生成' : '② 填写课堂反馈'}</div>}
      {!isMobile && (bonusPreview || bonusLoading) && (
        <Card size="small" style={{ borderRadius: 14, border: '1px solid rgba(232,120,74,.22)', background: '#FFF6F1' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#B85B32', marginBottom: 4 }}>反馈奖励预览</div>
          <div style={{ fontSize: 12, color: '#7A4A2A', lineHeight: 1.7 }}>
            {bonusLoading ? '正在计算预计奖励...' : bonusPreview?.message}
          </div>
        </Card>
      )}
      {/* 统一的智能反馈创作台 */}
      <Card
        id="lesson-content"
        size="small"
        className={`teacher-feedback-step-card ${fbStyles.workbenchCard}`}
        style={{ padding: '6px 4px' }}
      >
        <div className={fbStyles.composerHeader} style={{ marginBottom: 12 }}>
          <div className={fbStyles.composerTitle}>
            <span className={fbStyles.stepNumber}>2</span>
            <span>课堂学情与反馈记录</span>
          </div>
          {selectedStudentIds.length > 0 && (
            <span className={fbStyles.rosterCount}>已选 {selectedStudentIds.length} 位学员</span>
          )}
        </div>

        {/* 快捷微调指令胶囊 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: '#8A7D6A', marginBottom: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>反馈微调倾向：</span>
          </div>
          <div className={fbStyles.promptShortcutsRow}>
            {[
              { label: '重点突出', hint: '写简短些，突出重点', icon: '🎯' },
              { label: '温和多鼓励', hint: '语气温和一些，多鼓励孩子', icon: '🌿' },
              { label: '建议更详尽', hint: '把具体建议写得更详细些', icon: '📝' },
              { label: '肯定进步', hint: '突出学生的优点和进步', icon: '📈' },
              { label: '掌握度分析', hint: '补充孩子掌握情况的分析', icon: '🔍' },
            ].map(({ label, hint, icon }) => (
              <button
                key={label}
                type="button"
                className={fbStyles.promptChip}
                onClick={() => {
                  if (chatMessages.length > 0) {
                    sendChatMessage(hint)
                  } else if (lessonContent.trim().length >= 4) {
                    sendChatMessage(`${lessonContent.trim()}（请注意：${hint}）`)
                  } else {
                    toast.info(`已设定倾向：“${label}”，输入课堂要点后点击下方按钮即可生成`)
                  }
                }}
                disabled={chatBusy}
                title={hint}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 核心主输入框容器 */}
        <div className={fbStyles.textareaContainer}>
          <Input.TextArea
            className="teacher-feedback-paste-input"
            ref={lessonContentRef}
            value={lessonContent}
            onChange={(event) => {
              setLessonContent(event.target.value)
            }}
            rows={isMobile ? 3 : 4}
            maxLength={LESSON_CONTENT_MAX_LENGTH}
            showCount
            aria-required="true"
            aria-describedby="lesson-content-help"
            placeholder="例如：今天练习了一元一次方程，重点讲了移项和去括号；课堂计算步骤清楚，应用题还需注意审题。"
            style={{ borderRadius: 12, fontSize: 14.5, lineHeight: 1.75, padding: '10px 12px', border: 'none', background: 'transparent' }}
          />
        </div>
        <div id="lesson-content-help" style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 6 }}>
          支持直接记录课堂所授要点与学生状态，课内课外均可；发布时至少 {LESSON_CONTENT_MIN_LENGTH} 字。
        </div>

        {/* 主生成按钮 */}
        <Button
          type="primary"
          block
          icon={<ThunderboltOutlined />}
          loading={chatBusy}
          disabled={!selectedStudentIds.length || chatBusy}
          onClick={() => sendChatMessage(lessonContent)}
          className={fbStyles.composerActionBtn}
          style={{ marginTop: 12 }}
        >
          {chatBusy ? '正在依托学堂数据库整理各学员草稿…' : '整理生成学生反馈草稿'}
        </Button>
        <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 6, lineHeight: 1.5, textAlign: 'center' }}>
          {selectedStudentIds.length ? `整理后的内容会自动填入下方各学员的个人草稿卡，可逐条核对和修改。` : '请先在上方勾选要反馈的学生。'}
        </div>

        {/* 生成后的数据库润色与追问流 (仅在有交互时展现) */}
        {chatMessages.length > 0 && (
          <div className={fbStyles.followupStream} style={{ marginTop: 14 }}>
            <div className={fbStyles.followupHeader}>
              <span>学堂数据库润色与微调历史</span>
              {selectedStudentIds.length > 1 && (
                <span>针对指定学员追问</span>
              )}
            </div>

            <div className="teacher-feedback-chat-log" role="log" aria-live="polite" style={{ maxHeight: isMobile ? 150 : 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              {chatMessages.map((item, index) => (
                <div key={index} style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  borderRadius: 10,
                  padding: '7px 10px',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  background: item.role === 'user' ? 'rgba(20,87,77,0.1)' : (item.error ? '#FFF1F0' : '#FFFFFF'),
                  color: item.error ? '#CF1322' : 'var(--color-ink)',
                  border: '1px solid rgba(20,87,77,0.06)',
                }}>
                  {item.content}
                </div>
              ))}
              {chatBusy && (
                <div style={{ alignSelf: 'flex-start', width: '100%', marginTop: 2 }}>
                  <Progress percent={aiProgress} showInfo={false} size="small" strokeColor="#14574D" trailColor="#EAF7F1" />
                  <div style={{ fontSize: 11.5, color: '#7A869A', marginTop: 4 }}>
                    {aiWaitingMessages[aiWaitingMessageIndex]}（通常需要 10-30 秒，请勿关闭页面）
                  </div>
                </div>
              )}
            </div>

            {selectedStudentIds.length > 1 && (
              <div className="teacher-feedback-assistant-targets" style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginBottom: 4 }}>
                  本次修改对象（可多选）：
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
                          minHeight: 32, padding: '3px 9px', borderRadius: 9999, fontSize: 11.5, cursor: 'pointer',
                          background: active ? 'var(--color-primary, #14574D)' : '#FFFFFF', color: active ? '#fff' : '#5a4e3a',
                          border: active ? '1px solid var(--color-primary, #14574D)' : '1px solid rgba(20,87,77,0.15)', fontWeight: active ? 700 : 500,
                        }}
                      >
                        {s?.name || '学生'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <Input
                id="teacher-feedback-chat-input"
                ref={chatInputRef as any}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPressEnter={isMobile ? undefined : (e) => { if (!e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                placeholder="输入继续调整要求，如：把具体建议再补充两句…"
                style={{ flex: 1, borderRadius: 10, fontSize: 13, height: 38 }}
              />
              <Button type="primary" icon={<SendOutlined />} loading={chatBusy} disabled={chatBusy || !selectedStudentIds.length}
                onClick={() => sendChatMessage()} style={{ height: 38, borderRadius: 10, background: 'var(--color-primary, #14574D)', borderColor: 'var(--color-primary, #14574D)', fontWeight: 700, padding: '0 14px' }}>
                发送
              </Button>
            </div>
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
          id="teacher-feedback-topic-review"
          type={aiTopicMismatchConfirmed ? 'success' : 'warning'}
          showIcon
          style={{ borderRadius: 10 }}
          message={aiTopicMismatchConfirmed ? '已确认采用当前识别结果' : '课堂记录与识别的知识点可能不一致'}
          description={(
            <div>
              <div style={{ lineHeight: 1.65 }}>
                课堂记录提到“{aiTopicWarning.lessonTopic}”，当前识别到“{aiTopicWarning.generatedTopic}”。
                {aiTopicRecheckRequested
                  ? `已按原课堂记录准备重新识别，系统会优先核对“${aiTopicWarning.lessonTopic}”。请确认输入内容后点击“发送”；重新识别成功前，不能发布或生成分享图。`
                  : aiTopicMismatchConfirmed
                    ? '你已确认采用当前识别结果，可以继续生成反馈。'
                    : '请看下方知识点详解是否符合实际授课内容；如果是课外拓展或自编内容，也可以确认采用当前识别结果。'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <Button size="small" icon={<ReloadOutlined />} onClick={prepareKnowledgeTopicRecheck} disabled={chatBusy}>
                  {aiTopicRecheckRequested ? '再次载入课堂原记录' : '按课堂记录重新识别'}
                </Button>
                <Button
                  size="small"
                  type={aiTopicMismatchConfirmed ? 'primary' : 'default'}
                  onClick={() => {
                    setAiTopicMismatchConfirmed(true)
                    setAiTopicRecheckRequested(false)
                    toast.success('已确认采用当前知识点，现可继续')
                  }}
                  disabled={aiTopicRecheckRequested}
                >
                  {aiTopicMismatchConfirmed ? '已确认采用当前结果' : '确认采用当前识别结果'}
                </Button>
                {aiTopicRecheckRequested && (
                  <Button size="small" onClick={() => {
                    setAiTopicRecheckRequested(false)
                    toast.info('已取消重新识别，可继续核对当前结果')
                  }} disabled={chatBusy}>
                    取消重新识别
                  </Button>
                )}
              </div>
            </div>
          )}
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
                        <Button size="small" icon={<UndoOutlined />} onClick={() => undoAiEdit(id)} style={{ fontSize: 11, padding: '0 8px', minHeight: isMobile ? 44 : 28 }}>
                          撤销本次修改
                        </Button>
                      )}
                      {isMobile && (
                        <Button
                          size="small"
                          onClick={() => {
                            setDrawerStudentId(id)
                            setEditingStudentId(id)
                          }}
                          style={{
                            fontSize: 11,
                            padding: '0 8px',
                            minHeight: 28,
                            borderRadius: 6,
                            color: 'var(--color-primary, #E8784A)',
                            borderColor: 'rgba(232,120,74,0.3)',
                            background: 'rgba(232,120,74,0.06)',
                            fontWeight: 600,
                          }}
                        >
                          🏷️ 微调该生标签
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
             <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>课堂观察与补充信息</span>
            <span style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 2 }}>
              每位学生需完成五类课堂观察标签；知识点、作业和阶段寄语可选
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

      {/* 课堂图片与讲义照片 */}
      <Card size="small" className={`teacher-feedback-step-card teacher-feedback-upload-card ${fbStyles.workbenchCard}`} style={{ padding: '6px 4px' }}>
        <div className={fbStyles.composerHeader} style={{ marginBottom: 6 }}>
          <div className={fbStyles.composerTitle}>
            <span>课堂板书与资料照片</span>
            <span style={{ fontSize: 11.5, color: '#8A7D6A', fontWeight: 500 }}>
              {imageUrls.length ? `(已选 ${imageUrls.length}/9 张)` : '(选填 · 最多 9 张)'}
            </span>
          </div>
        </div>
        <div style={{ color: 'var(--color-ink-muted)', fontSize: 11.5, lineHeight: 1.5, marginBottom: 10 }}>
          上传板书、习题和讲义照片，随反馈展示给选中学生的家长；单张支持 20MB。
        </div>

        <div className={fbStyles.uploadSection}>
          {isMobile ? (
            <>
              {/* 隐藏的文件输入组件，由精致双卡调用 */}
              <input
                ref={albumInputRef}
                type="file"
                accept="image/*,.heic,.heif,.avif"
                multiple
                style={{ display: 'none' }}
                aria-label="从相册选择课堂资料"
                onChange={(event) => {
                  const files = Array.from(event.target.files || [])
                  if (!files.length) return
                  if (imageUrls.length + uploadingCount + files.length > 9) {
                    toast.warning('最多上传 9 张课堂图片，已自动截取前几张')
                  }
                  const availableSlots = Math.max(0, 9 - imageUrls.length - uploadingCount)
                  const filesToUpload = files.slice(0, availableSlots)
                  filesToUpload.forEach((file) => {
                    if (validateImageFile(file)) {
                      const taskId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`
                      void processImageUpload(file, taskId)
                    }
                  })
                  event.target.value = ''
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
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

              {/* 对称扎实的双卡上传入口 */}
              {imageUrls.length < 9 && (
                <div className={fbStyles.uploadActionRow}>
                  <button
                    type="button"
                    className={fbStyles.uploadActionCard}
                    onClick={() => albumInputRef.current?.click()}
                  >
                    <div className={fbStyles.uploadIconCirclePrimary}>
                      <PictureOutlined />
                    </div>
                    <div className={fbStyles.uploadCardCopy}>
                      <span className={fbStyles.uploadCardTitle}>从相册选择</span>
                      <span className={fbStyles.uploadCardDesc}>支持多选讲义与习题</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={fbStyles.uploadActionCard}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <div className={fbStyles.uploadIconCircleGold}>
                      <CameraOutlined />
                    </div>
                    <div className={fbStyles.uploadCardCopy}>
                      <span className={fbStyles.uploadCardTitle}>随堂拍照</span>
                      <span className={fbStyles.uploadCardDesc}>板书随手抓拍即传</span>
                    </div>
                  </button>
                </div>
              )}

              {/* 已上传照片的精致画廊网格 */}
              {imageUrls.length > 0 && (
                <div className={fbStyles.photoGalleryGrid}>
                  {imageUrls.map((url, i) => (
                    <div key={i} className={fbStyles.photoThumbnail}>
                      <AntImage
                        src={signedImageUrls[i]}
                        preview={{ src: signedImagePreviews[i] }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23f5f2ee'/%3E%3Ctext x='32' y='32' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E"
                      />
                      <button
                        type="button"
                        className={fbStyles.photoDeleteBadge}
                        aria-label={`删除第 ${i + 1} 张图片`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setImageUrls(prev => prev.filter((_, j) => j !== i))
                          setImageDisplayUrls(prev => {
                            const removed = prev[url]
                            if (removed) revokeLocalPreviews({ [url]: removed })
                            const next = { ...prev }
                            delete next[url]
                            return next
                          })
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {imageUrls.length > 0 && (
                <div className="teacher-feedback-upload-thumbnails">
                  <AntImage.PreviewGroup>{imageUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <AntImage src={signedImageUrls[i]} preview={{ src: signedImagePreviews[i] }} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23f5f2ee'/%3E%3Ctext x='32' y='32' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E" />
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
                          width: 32,
                          minWidth: 32,
                          height: 32,
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

      {/* 底部极简浮动栏 */}
      <div className={`${fbStyles.stickyBottomDock} teacher-feedback-submit-bar ${singleSessionMode ? 'is-single-session' : ''}`}>
        <div className={fbStyles.dockAutosaveIndicator} role="status" aria-live="polite">
          <span className={fbStyles.pulseDot} />
          <span>
            {autosaveState === 'loading' && '读取上次草稿…'}
            {autosaveState === 'idle' && (adminMode ? '内容暂存在本机' : '草稿自动保存中')}
            {autosaveState === 'saving' && '正在保存草稿…'}
            {autosaveState === 'saved' && `草稿已自动保存${autosavedAt ? ` · ${formatAgo(autosavedAt)}` : ''}`}
            {autosaveState === 'offline' && '网络暂不可用，已暂存'}
            {autosaveState === 'error' && '保存失败，请检查网络'}
            {uploadingCount > 0 && ' · 图片上传中'}
          </span>
          <Button
            type="link"
            size="small"
            onClick={() => submit('DRAFT')}
            loading={saving}
            disabled={saving || uploadingCount > 0}
            style={{ marginLeft: 'auto', padding: '0 4px', fontSize: 11.5, color: '#8A7D6A' }}
          >
            手动存草稿
          </Button>
        </div>

        <div className={fbStyles.dockBtnGroup}>
          {!singleSessionMode ? (
            <Button
              className={fbStyles.secondaryDockBtn}
              onClick={() => {
                if (!selectedStudentIds.length) { toast.warning('请先选择学员'); return }
                if (!validateRequiredStudentTags(selectedStudentIds)) return
                setPreviewOpen(true)
              }}
            >
              {isMobile ? '生成预览' : '生成家长版预览'}
            </Button>
          ) : (
            <Button
              className={fbStyles.secondaryDockBtn}
              onClick={() => submit('DRAFT')}
              loading={saving}
              disabled={saving || uploadingCount > 0}
            >
              暂存草稿
            </Button>
          )}

          {singleSessionMode ? (
            <Button
              type="primary"
              icon={<PictureOutlined />}
              onClick={saveStandaloneFeedbackAndPreview}
              loading={saving || generatingStandaloneShare}
              disabled={saving || generatingStandaloneShare || uploadingCount > 0 || !feedbackLessonReady || !selectedStudentIds.length}
              className={fbStyles.primaryDockBtn}
            >
              {saving ? '保存中...' : generatingStandaloneShare ? '生成中...' : '生成并下载分享图'}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
              onClick={() => submit('PUBLISHED')}
              loading={saving}
              disabled={saving || submitDone || uploadingCount > 0 || !feedbackLessonReady || !selectedStudentIds.length}
              className={fbStyles.primaryDockBtn}
            >
              {submitDone ? '已发布' : saving ? '发布中...' : '发布反馈给家长'}
            </Button>
          )}
        </div>
      </div>
      <BrandModal title={singleSessionMode ? '单次课程分享图预览' : '生成家长版预览'} open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null} width="min(620px, 94vw)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'min(72vh, 760px)', overflowY: 'auto', padding: '2px 4px 4px 0', color: 'var(--color-ink)' }}>
          {selectedStudentIds.length > 1 && (
            <Alert
              type="info"
              showIcon
              message="以下按家长端逐位展示，每位家长只会看到自己孩子的反馈"
              description="课堂共用内容保持一致，学员学情、建议和配图按学员分别呈现。"
              style={{ borderRadius: 12 }}
            />
          )}
          {selectedStudentIds.length === 0 && (
            <Alert
              type="info"
              showIcon
              message="先选择本次课程和学生，再生成完整预览"
              description={singleSessionMode ? '先保存为教师端草稿，再生成可下载图片；此流程不会向家长端发布或发送通知。' : '预览会复用家长端反馈内容与排列方式，练习回传和家校留言仅在实际发布后显示。'}
              style={{ borderRadius: 12 }}
            />
          )}
          {previewFeedbackItems.map((item) => {
            const displayedContent = item.content.trim()
            const feedbackParagraphs = displayedContent
              .replace(/\r\n?/g, '\n')
              .split(/\n+/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
            const overallEvaluation = singleSessionMode
              ? displayedContent
              : getOverallEvaluationContent(displayedContent) || feedbackParagraphs[0] || ''
            const classroomFollowup = singleSessionMode
              ? ''
              : overallEvaluation
                ? feedbackParagraphs.slice(1).join('\n\n')
                : displayedContent
            const parentPerformance = item.performance === '积极'
              ? '表现积极'
              : item.performance === '一般'
                ? '状态平稳'
                : item.performance === '需提升'
                  ? '需要更多引导'
                  : item.performance
            const subject = selectedGroup?.subject || selectedSubject || '课堂反馈'
            const teacherTier = resolveTier(selectedSingleSessionTeacher?.tierLevel)
            const teacherTierTheme = TIER_THEME[teacherTier]

            return (
              <div
                key={item.id}
                ref={singleSessionMode ? standalonePosterRef : undefined}
                style={singleSessionMode ? {
                  width: 420,
                  maxWidth: '100%',
                  margin: '0 auto',
                  flex: '0 0 auto',
                  overflow: 'hidden',
                  background: '#FAF8F5',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
                } : undefined}
              >
                {singleSessionMode ? (
                  <>
                    <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
                      <img src="/logo-banner.jpg" alt="牧哲学堂" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,94,78,.55) 0%, rgba(14,94,78,.35) 50%, rgba(14,94,78,.65) 100%)' }} />
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', color: '#F6ECD2' }}>
                        <div style={{ fontSize: 13, letterSpacing: 3, padding: '4px 16px', background: 'rgba(14,94,78,.55)', borderRadius: 999 }}>课堂成长反馈</div>
                      </div>
                    </div>

                    <div style={{ padding: '16px 16px 0' }}>
                      <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,.05)', border: '1px solid #F0DDD2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <CachedAvatarImage
                            src={getTeacherAvatarUrl(selectedSingleSessionTeacher?.avatar, selectedSingleSessionTeacher?.gender, selectedSingleSessionTeacher?.id || 'single-session')}
                            fallbackSrc={getTeacherAvatarUrl(null, selectedSingleSessionTeacher?.gender, selectedSingleSessionTeacher?.id || 'single-session')}
                            alt={`${selectedSingleSessionTeacher?.name || '授课老师'}头像`}
                            loading="eager"
                            noCache
                            style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'nowrap', minWidth: 0 }}>
                              <span style={{ fontWeight: 800, color: '#1A1201', fontSize: 17, whiteSpace: 'nowrap' }}>{selectedSingleSessionTeacher?.name || '授课老师'}</span>
                              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, lineHeight: 1.25, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, background: teacherTierTheme.bg, color: teacherTierTheme.accent, border: `1px solid ${teacherTierTheme.border}` }}>{teacherTierTheme.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#9A8E7A', marginTop: 5 }}>
                              <span>{singleSessionSubject || subject}教师 · 单次课</span>
                              <span style={{ whiteSpace: 'nowrap' }}>{singleSessionDate || '日期待补'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5EFE8' }}>
                          <span style={{ fontSize: 11, color: '#9A8E7A' }}>学员：</span>
                          <span style={{ fontSize: 13, color: '#1A1201', fontWeight: 600 }}>{item.studentName}{selectedGrade ? `（${selectedGrade}）` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {kps.some((point) => point.trim()) && (
                      <div style={{ padding: '12px 16px 0' }}>
                        <div style={{ background: '#FFFDF8', borderRadius: 12, padding: 14, border: '1px solid rgba(201,164,92,.3)' }}>
                          <div style={{ fontSize: 11, color: '#8A6D3B', marginBottom: 8, fontWeight: 700 }}>本节知识点</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {kps.filter((point) => point.trim()).map((point, index) => <span key={`${point}-${index}`} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, background: 'rgba(201,164,92,.15)', color: '#8A6D3B', border: '1px solid rgba(201,164,92,.4)' }}>{point}</span>)}
                          </div>
                        </div>
                      </div>
                    )}

                    {knowledgeCard && <div style={{ padding: '12px 16px 0' }}><KnowledgePointDetail card={knowledgeCard} audience="parent" defaultOpen /></div>}

                    <div style={{ padding: '12px 16px 0' }}>
                      <PersonalizedLearningPath
                        compact
                        posterMode
                        studentName={item.studentName}
                        topic={previewTopic}
                        mastery={item.mastery || null}
                        performance={parentPerformance || null}
                        tags={item.tags}
                        teacherRemark={item.teacherRemark || null}
                        overallComment={item.content}
                        nextLessonFocus={item.nextLessonFocus || null}
                        homework={homework}
                        extension={item.personalizedLearning}
                        knowledgeCard={knowledgeCard}
                      />
                    </div>

                    {imageUrls.length > 0 && (
                      <div style={{ padding: '12px 16px 0' }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                          <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 10, fontWeight: 700 }}>课堂照片</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {imageUrls.slice(0, 4).map((url, index) => (
                              <img key={`${url}-${index}`} data-share-photo src={signedImagePreviews[index] || imageDisplayUrls[url]?.previewUrl || imageDisplayUrls[url]?.thumbnailUrl || url} alt={`课堂照片${index + 1}`} loading="eager" style={{ width: '100%', display: 'block', borderRadius: 8, objectFit: 'cover', aspectRatio: '1' }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {overallEvaluation && (
                      <div style={{ padding: '12px 16px 0' }}>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 15, border: '1px solid rgba(0,0,0,.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                            <span style={{ display: 'grid', width: 28, height: 28, placeItems: 'center', borderRadius: 9, background: '#F8F3E7', color: '#C9A45C' }}><SendOutlined /></span>
                            <div><div style={{ fontSize: 12, color: '#1A1201', fontWeight: 750 }}>总体评价</div><div style={{ marginTop: 2, fontSize: 10, color: '#9A8E7A' }}>老师给家长的课堂反馈</div></div>
                          </div>
                          <div style={{ fontSize: 13, color: '#5F584D', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{overallEvaluation}</div>
                        </div>
                      </div>
                    )}

                    {homework.length > 0 && (
                      <div style={{ padding: '12px 16px 0' }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                          <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 6, fontWeight: 700 }}>作业</div>
                          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#4B5563', lineHeight: 1.8 }}>{homework.map((task, index) => <li key={`${task}-${index}`}>{task}</li>)}</ol>
                        </div>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', padding: '20px 0 18px', fontSize: 11, color: '#B0A898' }}>—— 牧哲学堂 · 用心陪伴每一次成长 ——</div>
                  </>
                ) : (
                  <>
                    {selectedStudentIds.length > 1 && (
                      <div style={{ margin: '2px 4px 8px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
                        家长端视图 · {item.studentName}
                      </div>
                    )}
                    <Card bordered={false} style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(201,164,92,.3)', boxShadow: '0 2px 10px rgba(58,50,39,.05)' }}>
                      <ParentFeedbackReportContent
                        childId={item.id}
                        subject={subject}
                        knowledgePoints={kps.filter((point) => point.trim())}
                        knowledgeCard={knowledgeCard}
                        images={imageUrls.map((url, index) => ({
                          id: url + '-' + index,
                          thumbnailUrl: signedImageUrls[index] || imageDisplayUrls[url]?.thumbnailUrl || imageDisplayUrls[url]?.previewUrl || url,
                          previewUrl: signedImagePreviews[index] || imageDisplayUrls[url]?.previewUrl || imageDisplayUrls[url]?.thumbnailUrl || url,
                        }))}
                        isMobile={isMobile}
                        overallEvaluation={overallEvaluation}
                        classroomFollowup={classroomFollowup}
                        additionalSections={[]}
                        homeworkItems={homework}
                        learning={{
                          studentName: item.studentName,
                          topic: previewTopic,
                          mastery: item.mastery || null,
                          performance: parentPerformance || null,
                          tags: item.tags,
                          teacherRemark: item.teacherRemark || null,
                          overallComment: item.content,
                          nextLessonFocus: item.nextLessonFocus || null,
                          homework,
                          extension: item.personalizedLearning,
                        }}
                        showPracticeButton
                        practiceButtonDisabled
                      />
                    </Card>
                  </>
                )}
              </div>
            )
          })}
          {!singleSessionMode && (
            <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--color-surface-3)', fontSize: 12, lineHeight: 1.6, color: 'var(--color-ink-muted)' }}>
              这是发布前预览。页面内容按家长端展示；家长练习回传会在家长提交后出现在教师端的上节课跟进卡片中。
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => setPreviewOpen(false)} style={{ minHeight: 40 }}>{singleSessionMode ? '返回编辑' : '关闭预览'}</Button>
          </div>
        </div>      </BrandModal>

      <BrandModal
        title="单次课程反馈分享图"
        open={standaloneShareOpen}
        onCancel={() => setStandaloneShareOpen(false)}
        width="min(780px, 96vw)"
        footer={standaloneShareImage ? (
          <a
            href={standaloneShareImage}
            download={standaloneShareFilename}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, padding: '0 18px', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}
          >下载完整分享图</a>
        ) : null}
        bodyStyle={{ padding: 12, background: 'var(--color-canvas)' }}
      >
        {standaloneShareImage && (
          <div style={{ maxHeight: 'calc(100dvh - 150px)', overflow: 'auto', padding: 8, borderRadius: 12, background: 'var(--color-surface-3)' }}>
            <img src={standaloneShareImage} alt="牧哲学堂单次课程反馈分享图" style={{ display: 'block', width: '100%', height: 'auto', margin: '0 auto', borderRadius: 8 }} />
          </div>
        )}
        <div style={{ marginTop: 10, color: 'var(--color-ink-muted)', fontSize: 12, lineHeight: 1.6 }}>{standaloneDraftSaved ? '反馈内容已保存在单次反馈草稿中；' : '草稿未保存，图片根据当前页面内容生成；'}家长端不会收到发布或通知，可直接下载完整长图后自行转发。</div>
      </BrandModal>
    </div>
  )

  const chooseSingleSessionStudent = (student: SingleSessionStudent) => {
    const applySelection = () => {
      setSingleSessionManual(false)
      setSingleSessionStudent(student)
      setSingleSessionGrade(student.grade || '')
      setSingleSessionSearch(student.name)
      setSingleSessionError('')
      setSelectedStudentIds(student.grade && singleSessionSubject ? [student.id] : [])
      setEditingStudentId(student.grade && singleSessionSubject ? student.id : null)
    }
    const hasFeedbackContent = Boolean(lessonContent.trim() || overallComment.trim() || summary.trim() || kps.length || imageUrls.length)
    if (singleSessionStudent && singleSessionStudent.id !== student.id && hasFeedbackContent) {
      Modal.confirm({
        title: '更换单次反馈学员？',
        content: '更换学员会清空当前已填写的反馈、标签和图片，避免内容发给错误的家长。',
        okText: '清空并更换',
        cancelText: '继续编辑',
        onOk: () => {
          revokeLocalPreviews(imageDisplayUrls)
          clearFeedbackEditorState(SINGLE_SESSION_GROUP_ID)
          applySelection()
        },
      })
      return
    }
    applySelection()
  }

  const chooseManualSingleSessionStudent = () => {
    const name = singleSessionSearch.trim()
    if (name.length < 2) {
      setSingleSessionError('请输入至少 2 个字的学员姓名')
      return
    }
    if (!FEEDBACK_GRADE_OPTIONS.includes(singleSessionGrade)) {
      setSingleSessionError('先选择学员年级，再直接添加姓名')
      return
    }
    const student: SingleSessionStudent = {
      id: SINGLE_SESSION_MANUAL_STUDENT_ID,
      name,
      grade: singleSessionGrade,
      gender: null,
      parentLabel: '手动录入 · 无学员档案',
    }
    setSingleSessionManual(true)
    setSingleSessionStudent(student)
    setSingleSessionSearch(name)
    setGroupId(SINGLE_SESSION_GROUP_ID)
    setSelectedStudentIds([SINGLE_SESSION_MANUAL_STUDENT_ID])
    setEditingStudentId(SINGLE_SESSION_MANUAL_STUDENT_ID)
    setSingleSessionError('')
  }

  const saveSingleSessionGrade = async () => {
    if (!singleSessionStudent || !FEEDBACK_GRADE_OPTIONS.includes(singleSessionGrade)) {
      toast.warning('请先选择学员年级')
      return
    }
    setSingleSessionSaving(true)
    try {
      const response = await fetch('/api/teacher/classroom-feedback/single-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: singleSessionStudent.id, grade: singleSessionGrade }),
      })
      const data = await response.json().catch(() => ({})) as { student?: SingleSessionStudent; error?: string }
      if (!response.ok || !data.student) throw new Error(data.error || '保存年级失败')
      setSingleSessionStudent(data.student)
      setSingleSessionStudents((items) => items.map((item) => item.id === data.student?.id ? data.student! : item))
      setSelectedStudentIds([data.student.id])
      setEditingStudentId(data.student.id)
      toast.success('年级已补充，可以继续填写反馈')
    } catch (error) {
      setSingleSessionError(error instanceof Error ? error.message : '保存年级失败')
    } finally {
      setSingleSessionSaving(false)
    }
  }

  const renderSingleSessionSetup = () => (
    <div className="teacher-feedback-single-session">
      <div className="teacher-feedback-single-session-heading">
        <div>
          <strong>① 学员与课程信息</strong>
          <span>选择已有学员，或直接使用姓名；无需关联班级、排课和考勤。</span>
        </div>
        {singleSessionStudent && <Button type="link" onClick={() => {
          const resetSelection = () => {
            setSingleSessionManual(false)
            setSingleSessionStudent(null)
            setSingleSessionGrade('')
            setSelectedStudentIds([])
            setSingleSessionSearch('')
            setSingleSessionError('')
            setGroupId(SINGLE_SESSION_GROUP_ID)
          }
          if (lessonContent.trim() || overallComment.trim() || imageUrls.length) {
            Modal.confirm({ title: '重新选择学员？', content: '当前反馈内容和图片会清空，避免把分享图素材关联到其他学员。', okText: '清空并重选', cancelText: '取消', onOk: () => { revokeLocalPreviews(imageDisplayUrls); clearFeedbackEditorState(SINGLE_SESSION_GROUP_ID); resetSelection() } })
          } else {
            resetSelection()
          }
        }}>重新选择</Button>}
      </div>

      {!singleSessionStudent && <label className="teacher-feedback-single-field">
        <span>学员姓名</span>
        <Input allowClear value={singleSessionSearch} onChange={(event) => setSingleSessionSearch(event.target.value.slice(0, 40))} placeholder="输入姓名；可选已有学员，也可直接手动添加" prefix={<SearchOutlined />} />
      </label>}

      {singleSessionStudent ? (
        <div className="teacher-feedback-single-selected">
          <StudentAvatar gender={singleSessionStudent.gender} name={singleSessionStudent.name} size={38} />
          <div className="teacher-feedback-single-selected-copy"><strong>{singleSessionStudent.name}</strong><span>{singleSessionManual ? '手动填写 · 不创建学员档案、不加入班级、不产生考勤或课时扣减' : `${singleSessionStudent.parentLabel} · 不加入班级、不产生考勤或课时扣减`}</span></div>
          {singleSessionStudent.grade && <Tag color="green">{singleSessionStudent.grade}</Tag>}
        </div>
      ) : (
        <div className="teacher-feedback-single-results">
          {singleSessionStudents.length > 0 ? singleSessionStudents.map((student) => (
            <button type="button" key={student.id} onClick={() => chooseSingleSessionStudent(student)}>
              <span><strong>{student.name}</strong><small>{student.grade || '年级待补'} · {student.parentLabel}</small></span>
              <span>选择</span>
            </button>
          )) : singleSessionSearch.trim().length >= 2 && !singleSessionError && (
            <div className="teacher-feedback-single-no-match">暂未找到「{singleSessionSearch.trim()}」的家长关联档案</div>
          )}
          {singleSessionSearch.trim().length >= 2 && (
            <div className="teacher-feedback-single-manual-row">
              <Select value={singleSessionGrade || undefined} onChange={setSingleSessionGrade} placeholder="选择年级" options={FEEDBACK_GRADE_OPTIONS.map((grade) => ({ label: grade, value: grade }))} />
              <Button type="primary" icon={<PlusOutlined />} onClick={chooseManualSingleSessionStudent}>直接使用此姓名</Button>
            </div>
          )}
        </div>
      )}

      {singleSessionStudent && !singleSessionStudent.grade && (
        <div className="teacher-feedback-single-grade-row">
          <Select value={singleSessionGrade || undefined} onChange={setSingleSessionGrade} placeholder="选择学员年级" options={FEEDBACK_GRADE_OPTIONS.map((grade) => ({ label: grade, value: grade }))} />
          <Button type="primary" loading={singleSessionSaving} onClick={() => void saveSingleSessionGrade()}>补全年级</Button>
        </div>
      )}

      <div className="teacher-feedback-single-meta-grid">
        <label className="teacher-feedback-single-field">
          <span>授课老师</span>
          <Select
            showSearch
            optionFilterProp="label"
            value={singleSessionTeacherId || undefined}
            onChange={(teacherId) => {
              setSingleSessionTeacherId(teacherId)
              const nextTeacher = singleSessionTeachers.find((candidate) => candidate.id === teacherId)
              const subjects = nextTeacher?.subjects || []
              setSingleSessionSubjects(subjects)
              setSingleSessionSubject((current) => subjects.includes(current) ? current : '')
            }}
            placeholder={singleSessionTeachers.length ? '选择本次授课老师' : '正在加载教师信息'}
            disabled={!singleSessionTeachers.length}
            options={singleSessionTeachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
          />
        </label>
        <label className="teacher-feedback-single-field">
          <span>学科</span>
          <Select value={singleSessionSubject || undefined} onChange={setSingleSessionSubject} placeholder={singleSessionSubjects.length ? '选择本次课程学科' : '当前教师暂无可用学科'} disabled={!singleSessionSubjects.length} options={singleSessionSubjects.map((subject) => ({ label: subject, value: subject }))} />
        </label>
        <label className="teacher-feedback-single-field">
          <span>上课日期</span>
          <input type="date" max={todayDateInput()} value={singleSessionDate} onChange={(event) => setSingleSessionDate(event.target.value)} />
        </label>
      </div>

      {singleSessionError && <Alert type="error" showIcon message={singleSessionError} />}
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
      {ctx?.contextState === 'NO_ACTIVE_TERM' && !singleSessionMode && (
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
          {!singleSessionMode && requestedStudentName && (
            <div style={{
              borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6,
              background: 'linear-gradient(135deg,rgba(14,94,78,.08),rgba(201,164,92,.10))',
              border: '1px solid rgba(14,94,78,.18)',
            }}>
              <span style={{ fontWeight: 800, color: '#0E5E4E' }}>正在为「{requestedStudentName}」填写反馈</span>
              <div style={{ color: '#7A6A55', marginTop: 2 }}>已自动选中 TA 的班级，可切换班级继续为 TA 反馈</div>
            </div>
          )}
          {singleSessionMode ? <Card size="small" className="teacher-feedback-single-session-card">{renderSingleSessionSetup()}</Card> : <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>选择班级</div>
            <MobileSelect size="small" value={groupId || undefined} onChange={handleFeedbackGroupChange}
              allowClear placeholder="选择班级" style={{ width: '100%' }} listHeight={320} searchable={false}
               options={sortedGroups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
            {!groupId && groups.length === 0 && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>暂无班级数据</div>}
            {groupId && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>关联课次</div>
                <MobileSelect
                  size="small"
                  value={selectedFeedbackLesson?.id}
                  onChange={handleFeedbackLessonChange}
                  placeholder={orderedFeedbackLessons.length ? '选择反馈对应的课次' : '昨天和今天暂无可反馈课次'}
                  style={{ width: '100%' }}
                  listHeight={320}
                  searchable={false}
                  disabled={!orderedFeedbackLessons.length}
                  options={feedbackLessonOptions}
                />
                <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.5, color: feedbackLessonReady ? '#137A5A' : '#805A0D' }}>
                  {feedbackLessonReady
                    ? (selectedFeedbackLesson && selectedFeedbackLesson.smallLessonCount > 1
                        ? `已关联本次课（含 ${selectedFeedbackLesson.smallLessonCount} 节连堂小课，已合并，提交一次即可完成全部反馈）。`
                        : '已关联课次考勤；支持填写昨天与今天的反馈，请假、未到校学员不可选。')
                    : orderedFeedbackLessons.length
                      ? (selectedFeedbackLesson && selectedFeedbackLesson.hasAnyAttendanceSubmitted
                          ? `本次课含 ${selectedFeedbackLesson.smallLessonCount} 节小课，尚有小课未完成考勤；全部完成考勤后即可发布反馈。`
                          : '本次课完成考勤后可反馈；支持填写昨天与今天已完成考勤的课次。')
                      : '当前班级昨天和今天暂无可反馈课次（仅支持反馈昨天和今天课程）。'}
                </div>
              </div>
            )}
          </Card>}

          {!singleSessionMode && groupId && ctx && !feedbackLessonReady && (
            <div className="teacher-feedback-lesson-gate" role="status">
              <span className="teacher-feedback-lesson-gate-icon" aria-hidden="true">!</span>
              <div className="teacher-feedback-lesson-gate-copy">
                <strong>{selectedFeedbackLesson ? (selectedFeedbackLesson.hasAnyAttendanceSubmitted ? '部分连堂小课未考勤' : '本次课还未考勤') : '暂无可反馈课次'}</strong>
                <span>{selectedFeedbackLesson ? (selectedFeedbackLesson.hasAnyAttendanceSubmitted ? `本次课包含 ${selectedFeedbackLesson.smallLessonCount} 节连堂小课，请将全部小课完成考勤后再发布反馈。` : '完成本次考勤后可反馈；系统仅支持填写昨天与今天的课程反馈。') : '当前仅支持反馈昨天和今天的课次，完成考勤后可回来填写反馈。'}</span>
              </div>
              {selectedFeedbackLesson && (
                <Button className="teacher-feedback-lesson-gate-action" size="small" onClick={() => router.push('/teacher/attendance')}>
                  去考勤
                </Button>
              )}
            </div>
          )}

          {/* Student list — collapsible */}
          {!singleSessionMode && groupId && feedbackLessonReady && (
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
                        const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[feedbackTodayScopeKey(selectedActualGroupId, selectedGroup?.subject, s.id)])
                        const blockedReason = lessonBlockedReasons[s.id]
                        return (
                          <div key={s.id} style={{
                            borderRadius: 8,
                            border: blockedReason ? '1px solid #34302E' : feedbacked ? '1px solid #D9D4CE' : selected ? '1px solid var(--color-primary)' : '1px solid #EEE7E1',
                            boxShadow: !blockedReason && selected ? 'inset 0 0 0 1px var(--color-primary)' : undefined,
                            background: blockedReason ? '#292624' : feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                            color: blockedReason ? '#FFF8F1' : 'inherit',
                            opacity: feedbacked && !blockedReason ? 0.62 : 1,
                            transition: 'background-color var(--motion-fast) ease, border-color var(--motion-fast) ease, opacity var(--motion-fast) ease',
                          }}>
                            <button type="button" aria-pressed={selected} aria-disabled={Boolean(blockedReason)} title={blockedReason ? (blockedReason === 'LEAVE' ? '本节课已请假，不可反馈' : '本节课未到校，不可反馈') : undefined} disabled={Boolean(blockedReason)} onClick={() => toggleStudent(s.id)} style={{ width: '100%', minHeight: 44, padding: 8, border: 0, borderRadius: 'inherit', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, cursor: blockedReason ? 'not-allowed' : 'pointer' }}>
                                <StudentAvatar gender={s.gender} name={s.name} size={26} rounded={false} />
                              <span style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                              {blockedReason && <span style={{ flexShrink: 0, fontSize: 10, color: '#FFD2B6' }}>{blockedReason === 'LEAVE' ? '已请假' : '未到校'} · 不可反馈</span>}
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
        {!isMobile && groupId && feedbackLessonReady && selectedStudentIds.length > 0 && (() => {
          const activeId = selectedStudentIds.includes(editingStudentId || '')
            ? editingStudentId as string
            : selectedStudentIds[0]
          return renderStudentEditorContent(activeId, { inDrawer: false })
        })()}

        {/* Mobile: AI input + class picker + student cards */}
        {isMobile && (
          <>
            {!singleSessionMode && requestedStudentName && (
              <div style={{
                borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6,
                background: 'linear-gradient(135deg,rgba(14,94,78,.08),rgba(201,164,92,.10))',
                border: '1px solid rgba(14,94,78,.18)',
              }}>
                <span style={{ fontWeight: 800, color: '#0E5E4E' }}>正在为「{requestedStudentName}」填写反馈</span>
                <div style={{ color: '#7A6A55', marginTop: 2 }}>已自动选中 TA 的班级，可切换班级继续为 TA 反馈</div>
              </div>
            )}

            <Card size="small" className={`teacher-feedback-step-card teacher-feedback-course-card ${fbStyles.workbenchCard}`} style={{ padding: '4px 2px' }}>
              {singleSessionMode ? renderSingleSessionSetup() : <>
              <div className={fbStyles.courseHeader}>
                <div className={fbStyles.stepBadge}>
                  <span className={fbStyles.stepNumber}>1</span>
                  <span>课程与学生</span>
                </div>
                {groupId && (
                  <div className={fbStyles.rewardPill}>
                    <span>🪙 {feedbackSceneLabel}</span>
                    <span>·</span>
                    <span>{bonusLoading ? '计算中…' : bonusPreview ? `预计 ¥${money(bonusPreview.total)}` : feedbackRateLabel}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className={fbStyles.selectorGrid}>
                  <div>
                    <div className={fbStyles.fieldLabel}>班级／课程</div>
                    <MobileSelect value={groupId || undefined} onChange={handleFeedbackGroupChange}
                      allowClear nativeOnMobile placeholder="选择班级与学科" style={{ width: '100%' }} listHeight={280} popupMatchSelectWidth searchable={false}
                      options={sortedGroups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
                  </div>
                  {groupId && (
                    <div>
                      <div className={fbStyles.fieldLabel}>关联课次</div>
                      <MobileSelect
                        value={selectedFeedbackLesson?.id}
                        onChange={handleFeedbackLessonChange}
                        placeholder={orderedFeedbackLessons.length ? '选择反馈对应的课次' : '昨天和今天暂无可反馈课次'}
                        nativeOnMobile
                        searchable={false}
                        style={{ width: '100%' }}
                        listHeight={280}
                        disabled={!orderedFeedbackLessons.length}
                        options={feedbackLessonOptions}
                      />
                    </div>
                  )}
                </div>
                {groupId && (
                  <div style={{ fontSize: 11.5, color: feedbackLessonReady ? '#137A5A' : '#805A0D', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: feedbackLessonReady ? '#137A5A' : '#805A0D' }} />
                    {feedbackLessonReady
                      ? (selectedFeedbackLesson && selectedFeedbackLesson.smallLessonCount > 1
                          ? `已关联本次课（含 ${selectedFeedbackLesson.smallLessonCount} 节连堂小课，已合并，提交一次即可完成全部反馈）。`
                          : '已关联课次考勤；支持填写昨天与今天的反馈，缺勤学员已自动锁定。')
                      : orderedFeedbackLessons.length
                        ? (selectedFeedbackLesson && selectedFeedbackLesson.hasAnyAttendanceSubmitted
                            ? `本次课含 ${selectedFeedbackLesson.smallLessonCount} 节小课，尚有小课未完成考勤；全部完成考勤后即可发布反馈。`
                            : '本次课完成考勤后可反馈；支持填写昨天与今天已完成考勤的课次。')
                        : '当前班级昨天和今天暂无可反馈课次（仅支持反馈昨天和今天课程）。'}
                  </div>
                )}
              </div>

              {groupId && ctx && !feedbackLessonReady && (
                <div className="teacher-feedback-lesson-gate" role="status" style={{ marginTop: 10, borderRadius: 12 }}>
                  <span className="teacher-feedback-lesson-gate-icon" aria-hidden="true">!</span>
                  <div className="teacher-feedback-lesson-gate-copy">
                    <strong>{selectedFeedbackLesson ? (selectedFeedbackLesson.hasAnyAttendanceSubmitted ? '部分连堂小课未考勤' : '本次课还未考勤') : '暂无可反馈课次'}</strong>
                    <span>{selectedFeedbackLesson ? (selectedFeedbackLesson.hasAnyAttendanceSubmitted ? `本次课包含 ${selectedFeedbackLesson.smallLessonCount} 节连堂小课，请将全部小课完成考勤后再发布反馈。` : '完成本次考勤后可反馈；系统仅支持填写昨天与今天的课程反馈。') : '当前仅支持反馈昨天和今天的课次，完成考勤后可回来填写反馈。'}</span>
                  </div>
                  {selectedFeedbackLesson && (
                    <Button className="teacher-feedback-lesson-gate-action" size="small" onClick={() => router.push('/teacher/attendance')}>
                      去考勤
                    </Button>
                  )}
                </div>
              )}
              </>}

            {groupId && (
              feedbackLessonReady ? (
              <div className={`teacher-feedback-student-picker${singleSessionMode ? ' is-single-session' : ''}`}>
                {!singleSessionMode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>选择学生</span>
                      <span style={{ fontSize: 12, color: '#7A869A', marginLeft: 8 }}>已选 {selectedStudentIds.length} 人</span>
                    </div>
                    <button
                      type="button"
                      aria-expanded={studentsExpanded}
                      aria-controls="teacher-feedback-mobile-student-options"
                      style={{ border: 0, background: 'transparent', color: 'var(--color-primary)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                      onClick={() => setStudentsExpanded(!studentsExpanded)}
                    >
                      {studentsExpanded ? '收起列表' : '展开列表'}
                    </button>
                  </div>
                )}

                {studentsExpanded && (
                  <div id="teacher-feedback-mobile-student-options" style={{ marginTop: 4 }}>
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
                          const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[feedbackTodayScopeKey(selectedActualGroupId, selectedGroup?.subject, s.id)])
                          const blockedReason = lessonBlockedReasons[s.id]
                          return (
                            <div key={s.id} className="teacher-feedback-student-card" style={{
                              borderRadius: 10,
                              border: blockedReason ? '1px solid #34302E' : feedbacked ? '1px solid #D9D4CE' : selected ? '1px solid var(--color-primary)' : '1px solid #EEE7E1',
                              boxShadow: !blockedReason && selected ? 'inset 0 0 0 1px var(--color-primary)' : undefined,
                              background: blockedReason ? '#292624' : feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                              color: blockedReason ? '#FFF8F1' : 'inherit',
                              opacity: feedbacked && !blockedReason ? 0.62 : 1,
                            }}>
                              <button type="button" aria-pressed={selected} aria-disabled={Boolean(blockedReason)} title={blockedReason ? (blockedReason === 'LEAVE' ? '本节课已请假，不可反馈' : '本节课未到校，不可反馈') : undefined} disabled={Boolean(blockedReason)} onClick={() => toggleStudent(s.id)} style={{ width: '100%', minHeight: 44, padding: '8px 10px', border: 0, borderRadius: 'inherit', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, cursor: blockedReason ? 'not-allowed' : 'pointer' }}>
                                <StudentAvatar gender={s.gender} name={s.name} size={28} rounded={false} />
                                <span style={{ display: 'block', flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                {blockedReason && <span style={{ flexShrink: 0, fontSize: 10, color: '#FFD2B6' }}>{blockedReason === 'LEAVE' ? '已请假' : '未到校'} · 不可反馈</span>}
                                {selected && !blockedReason && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDrawerStudentId(s.id)
                                      setEditingStudentId(s.id)
                                    }}
                                    style={{
                                      flexShrink: 0,
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      background: '#fff',
                                      border: '1px solid rgba(232,120,74,.4)',
                                      color: 'var(--color-primary, #E8784A)',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                    }}
                                  >
                                    <span>🏷️ 微调</span>
                                  </span>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 已选学员学情微调胶囊条 (移动端直观快捷微调) */}
                {selectedStudentIds.length > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: '#FAF6F2',
                    border: '1px solid #EFE4DC',
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-ink, #2D231E)' }}>
                        已选学员学情微调 ({selectedStudentIds.length}人)
                      </span>
                      <span style={{ fontSize: 11, color: '#8C776B' }}>
                        轻触学员标签可随时微调
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                      {selectedStudentIds.map(id => {
                        const student = groupStudents.find(s => s.id === id)
                        if (!student) return null
                        const myTags = studentTags[id] || []
                        const perf = studentPerf[id]
                        const perfText = perf ? STUDENT_PERF_META[perf]?.short : null
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setDrawerStudentId(id)
                              setEditingStudentId(id)
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 10px',
                              borderRadius: 20,
                              background: '#fff',
                              border: '1px solid #E5D7CD',
                              color: 'var(--color-ink, #2D231E)',
                              fontSize: 12,
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                          >
                            <StudentAvatar gender={student.gender} name={student.name} size={22} rounded={true} />
                            <span style={{ fontWeight: 600 }}>{student.name}</span>
                            {perfText && (
                              <span style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: '#FFF0E6',
                                color: 'var(--color-primary, #E8784A)',
                                fontWeight: 700,
                              }}>{perfText}</span>
                            )}
                            <span style={{ fontSize: 11, color: myTags.length ? '#137A5A' : '#8C776B' }}>
                              {myTags.length ? `${myTags.length}标签` : '微调 ✏️'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              ) : null
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

        {/* 移动端底部弹性学情微调抽屉 */}
        {isMobile && (
          <Drawer
            placement="bottom"
            height="85vh"
            open={Boolean(drawerStudentId)}
            onClose={() => setDrawerStudentId(null)}
            destroyOnClose={false}
            zIndex={950}
            title={
              drawerStudentId ? (() => {
                const student = groupStudents.find(s => s.id === drawerStudentId)
                  || singleSessionStudents.find(s => s.id === drawerStudentId)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StudentAvatar gender={student?.gender} name={student?.name || ''} size={32} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink, #2D231E)' }}>
                        {student?.name || '学员'} · 课堂表现与学情微调
                      </div>
                      <div style={{ fontSize: 11, color: '#8C776B', fontWeight: 'normal' }}>
                        细化表现与标签，将依托牧哲学堂自身庞大的数据库生成个性化评价
                      </div>
                    </div>
                  </div>
                )
              })() : '课堂表现与学情微调'
            }
            styles={{
              wrapper: { maxWidth: 580, margin: '0 auto', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
              content: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
              header: { padding: '14px 16px 12px', borderBottom: '1px solid #EEE7E1' },
              body: { padding: '14px 16px', background: '#FAF8F5', overflowY: 'auto' },
              footer: { padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #EEE7E1', background: '#fff' },
            }}
            footer={
              <Button
                type="primary"
                block
                size="large"
                onClick={() => setDrawerStudentId(null)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  background: 'var(--color-primary, #E8784A)',
                  borderColor: 'var(--color-primary, #E8784A)',
                }}
              >
                完成微调，返回填写课堂记录
              </Button>
            }
          >
            {drawerStudentId && renderStudentEditorContent(drawerStudentId, { inDrawer: true })}
          </Drawer>
        )}

        {/* 自定义标签弹窗：仅本次使用 / 存入常用库 */}
        <BrandModal
          open={Boolean(addTagFor)}
          onCancel={cancelAddTag}
          footer={null}
          destroyOnHidden
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
        </BrandModal>

      </div>
    </div>
  )
}

function TeacherRecordPageContent({ standaloneOnly, adminMode = false, onRecordSaved }: FeedbackComposerProps) {
  return (
    <div className={`${fbStyles.feedbackPage} teacher-feedback-page`} style={{ padding: '0 0 32px' }}>
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-ink, #1a1201)' }}>{standaloneOnly ? '单次课程反馈' : '课堂成长反馈'}</h2>
            <div style={{ fontSize: 13, color: 'var(--color-ink-subtle, #9a8e7a)', marginTop: 4 }}>
              {standaloneOnly ? '填写学员与课程信息，整理个性化反馈并生成完整分享图。' : '关联对应课次与学生，记录课堂表现与建议；历史课次完成考勤后也可补发反馈。'}
            </div>
          </div>
          {!adminMode && (
            <Segmented
              value={standaloneOnly ? 'single' : 'class'}
              onChange={(val) => {
                if (val === 'single') window.location.href = '/teacher/single-session-feedback'
                else window.location.href = '/teacher/feedback'
              }}
              options={[
                { label: '常规班课反馈', value: 'class' },
                { label: '单次/补课反馈', value: 'single' },
              ]}
              style={{ background: '#ECE6DC' }}
            />
          )}
        </div>
      </div>
      <FeedbackPageInner
        key={`${standaloneOnly ? 'single-session' : 'class-growth'}-${adminMode ? 'admin' : 'teacher'}`}
        standaloneOnly={standaloneOnly}
        adminMode={adminMode}
        onRecordSaved={onRecordSaved}
      />
    </div>
  )
}

export default function TeacherFeedbackPage() {
  const standaloneOnly = usePathname() === '/teacher/single-session-feedback'
  return <Suspense fallback={<CardSkeleton rows={3} />}><TeacherRecordPageContent standaloneOnly={standaloneOnly} /></Suspense>
}

export function SingleSessionFeedbackComposer({ onRecordSaved }: { onRecordSaved?: () => void }) {
  return (
    <Suspense fallback={<CardSkeleton rows={3} />}>
      <TeacherRecordPageContent standaloneOnly adminMode onRecordSaved={onRecordSaved} />
    </Suspense>
  )
}
