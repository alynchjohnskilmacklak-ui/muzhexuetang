'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Alert, Button, Image as AntImage, Input, Modal, Progress, Upload, Tag, Card, Select } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { BookOutlined, CheckCircleOutlined, DeleteOutlined, DownOutlined, ExclamationCircleOutlined, LikeOutlined, MinusCircleOutlined, PlusOutlined, ReloadOutlined, SendOutlined, SearchOutlined, ThunderboltOutlined, UpOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { MOODS, QUICK_TAGS, QUICK_KPS, BADGES } from '@/components/FeedbackCard'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { MobileSelect } from '@/components/MobileSelect'
import {
  hasMeaningfulFeedbackContent,
  hasRequiredLessonContent,
  LESSON_CONTENT_MAX_LENGTH,
  LESSON_CONTENT_MIN_LENGTH,
} from '@/lib/classroom-feedback/access'
import { parseCombinedFeedbackInput, type StructuredClassroomRecord } from '@/lib/classroom-feedback/combined-input'
import { compressFeedbackImage, uploadFeedbackImage, type ImageUploadResponse } from '@/lib/client-image-upload'
import {
  readSensitiveSessionValue,
  removeLegacySensitiveStorage,
  removeSensitiveSessionValue,
  writeSensitiveSessionValue,
} from '@/lib/client-sensitive-storage'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const confirmModal = (content: string) => new Promise<boolean>((resolve) => {
  Modal.confirm({
    title: '请确认',
    content,
    okText: '继续',
    cancelText: '取消',
    onOk: () => resolve(true),
    onCancel: () => resolve(false),
  })
})

const AI_KEYWORD_GROUPS = [
  { label: '表现类', words: ['认真听讲', '积极回答', '进步明显', '课堂活跃', '状态一般', '注意力不集中'] },
  { label: '问题/方向类', words: ['作业未完成', '作业质量不高', '审题粗心', '计算不熟练', '需要加强复习', '建议家长督促作业'] },
]

const MAX_STUDENTS_PER_FEEDBACK = 3
const PERFORMANCE_TAG_OPTIONS = ['积极听讲', '主动回答', '认真练习', '积极思考', '需要提醒']
const MASTERY_OPTIONS = [
  { label: '掌握良好', value: 'GOOD' },
  { label: '基本掌握', value: 'BASIC' },
  { label: '需要加强', value: 'NEEDS_WORK' },
]

type FeedbackCourseBucket = 'GROUP' | 'ONE_ON_ONE'
type StudentPerfLevel = 'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'
const STUDENT_PERF_META: Record<StudentPerfLevel, { label: string; short: string; color: string; bg: string; border: string }> = {
  GREAT: { label: '积极', short: '积极', color: '#1D9E75', bg: '#EAF7F1', border: '#BFE7D4' },
  OKAY: { label: '一般', short: '一般', color: '#7A6F5F', bg: '#F5F2EE', border: '#E5DDD4' },
  NEEDS_IMPROVEMENT: { label: '需提升', short: '需提升', color: '#C77F00', bg: '#FFF4DE', border: '#F3D6A6' },
}
type AiFeedbackResult = {
  studentIds?: string[]
  studentNames?: string[]
  unknownNames?: string[]
  needsManualStudentSelection?: boolean
  mood?: string
  overallComment?: string
  perStudentComments?: Array<{ studentId: string; studentName: string; comment: string }>
  summary?: string
  suggestion?: string
  tags?: string[]
  knowledgePoints?: string[]
  homework?: string[]
  stageSummaryText?: string
  stageSuggestions?: string
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
type ImageUploadTask = {
  id: string
  file: File
  name: string
  status: 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  compressed?: boolean
}
type FeedbackStudent = { id: string; name: string; grade?: string | null; todayFeedback?: boolean }
type FeedbackGroup = {
  id: string
  name: string
  courseName?: string
  courseType?: string | null
  subject?: string | null
  studentCount?: number
  course?: { type?: string | null }
  students: FeedbackStudent[]
}
type FeedbackContext = {
  groups: FeedbackGroup[]
  lessons: Array<{ id: string; groupId: string; studentIds?: string[] }>
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

function appendText(base: string, extra?: string) {
  const clean = (extra || '').trim()
  if (!clean) return base
  return base.trim() ? `${base.trim()}\n\n${clean}` : clean
}

function money(value: number) {
  return Number(value.toFixed(2)).toString()
}

function joinDistinctText(...values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).join('\n')
}

function FeedbackPageInner() {
  const { data: session, status: sessionStatus } = useSession()
  const draftKey = session?.user?.id ? `teacher-feedback-draft:${session.user.id}` : ''
  const isMobile = useIsMobile() ?? false
  const searchParams = useSearchParams()
  const requestedLessonId = searchParams.get('lessonId')?.trim() || ''

  // State
  const [groupId, setGroupId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [todayFeedbackByScope, setTodayFeedbackByScope] = useState<Record<string, boolean>>({})
  const [studentPerf, setStudentPerf] = useState<Record<string, StudentPerfLevel>>({})
  const [performanceTags, setPerformanceTags] = useState<string[]>([])
  const [masteryLevel, setMasteryLevel] = useState('GOOD')
  const [teacherRemark, setTeacherRemark] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [mood, setMood] = useState('GOOD')
  const [tags, setTags] = useState<string[]>([])
  const [kps, setKps] = useState<string[]>([])
  const [badge, setBadge] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [structuredOverrides, setStructuredOverrides] = useState<Partial<StructuredClassroomRecord>>({})
  const [structuredReviewOpen, setStructuredReviewOpen] = useState(false)
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
  const [aiExpanded, setAiExpanded] = useState(false)
  const [commentExpanded, setCommentExpanded] = useState(false)
  const [moreExpanded, setMoreExpanded] = useState(false)
  const [studentsExpanded, setStudentsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadTasks, setUploadTasks] = useState<ImageUploadTask[]>([])
  const [submitDone, setSubmitDone] = useState(false)
  const [bonusPreview, setBonusPreview] = useState<BonusPreview | null>(null)
  const [bonusLoading, setBonusLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const submitCooldownRef = useRef(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const lessonContentRef = useRef<TextAreaRef>(null)
  const structuredClassroomRecord = useMemo(
    () => parseCombinedFeedbackInput(lessonContent),
    [lessonContent],
  )
  const resolvedStructuredRecord = useMemo<StructuredClassroomRecord>(() => ({
    lessonContent: structuredOverrides.lessonContent ?? structuredClassroomRecord.lessonContent,
    mastery: structuredOverrides.mastery ?? structuredClassroomRecord.mastery,
    feedback: structuredOverrides.feedback ?? structuredClassroomRecord.feedback,
  }), [structuredClassroomRecord, structuredOverrides])

  // AI generation
  const [aiNote, setAiNote] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiWaitingMessageIndex, setAiWaitingMessageIndex] = useState(0)
  const [selectedAiKeywords, setSelectedAiKeywords] = useState<string[]>([])
  const [aiPrefilled, setAiPrefilled] = useState<Set<string>>(new Set())
  const [aiSuggestion, setAiSuggestion] = useState<AiFeedbackResult | null>(null)
  const [aiSuggestionUsed, setAiSuggestionUsed] = useState(false)

  useEffect(() => {
    if (!aiGenerating) {
      setAiWaitingMessageIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setAiWaitingMessageIndex((index) => (index + 1) % 4)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [aiGenerating])

  // Stage summary (only when 1 student selected)
  const [stageExpanded, setStageExpanded] = useState(false)
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [stageSummaryText, setStageSummaryText] = useState('')
  const [stageSuggestions, setStageSuggestions] = useState('')

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !draftKey) return
    setDraftLoaded(false)
    removeLegacySensitiveStorage()
    try {
      const draft = readSensitiveSessionValue<Record<string, unknown>>(draftKey, 8 * 60 * 60 * 1000)
      if (draft) {
        if (typeof draft.groupId === 'string') setGroupId(draft.groupId)
        if (Array.isArray(draft.selectedStudentIds)) setSelectedStudentIds(draft.selectedStudentIds.filter((item): item is string => typeof item === 'string'))
        if (typeof draft.lessonContent === 'string') setLessonContent(draft.lessonContent)
        if (typeof draft.summary === 'string') setSummary(draft.summary)
        if (typeof draft.overallComment === 'string') {
          setOverallComment(draft.overallComment)
          if (draft.overallComment.trim()) setCommentExpanded(true)
        }
        if (typeof draft.teacherRemark === 'string') setTeacherRemark(draft.teacherRemark)
        if (Array.isArray(draft.tags)) setTags(draft.tags.filter((item): item is string => typeof item === 'string'))
        if (Array.isArray(draft.kps)) setKps(draft.kps.filter((item): item is string => typeof item === 'string'))
        if (Array.isArray(draft.homework)) setHomework(draft.homework.filter((item): item is string => typeof item === 'string'))
      }
    } catch {
      removeSensitiveSessionValue(draftKey)
    } finally {
      setDraftLoaded(true)
    }
  }, [draftKey, sessionStatus])

  useEffect(() => {
    if (!draftLoaded || !draftKey) return
    const timer = window.setTimeout(() => {
      writeSensitiveSessionValue(draftKey, {
        groupId,
        selectedStudentIds,
        lessonContent,
        summary,
        overallComment,
        teacherRemark,
        tags,
        kps,
        homework,
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [draftKey, draftLoaded, groupId, homework, kps, lessonContent, overallComment, selectedStudentIds, summary, tags, teacherRemark])
  // Data
  const { data: ctx } = useSWR<FeedbackContext>('/api/teacher/feedback-context', fetcher)
  const groups = ctx?.groups || []

  useEffect(() => {
    if (!requestedLessonId || !ctx?.lessons?.length) return
    const lesson = ctx.lessons.find((item) => item.id === requestedLessonId)
    if (!lesson) return
    setGroupId(lesson.groupId)
    if (Array.isArray(lesson.studentIds) && lesson.studentIds.length) {
      setSelectedStudentIds(lesson.studentIds.slice(0, MAX_STUDENTS_PER_FEEDBACK))
    }
  }, [ctx?.lessons, requestedLessonId])


  // Selected group
  const selectedGroup = groups.find((g) => g.id === groupId)
  const groupStudents = selectedGroup?.students || []

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
        groupId: groupId || null,
        feedbackCourseType: feedbackCourseBucket,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled) setBonusPreview(data) })
      .catch(() => { if (!cancelled) setBonusPreview(null) })
      .finally(() => { if (!cancelled) setBonusLoading(false) })
    return () => { cancelled = true }
  }, [selectedStudentIds, groupId, feedbackCourseBucket])

  // ── Stage summary load when single student selected ──
  const stageStudentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null
  const { data: stageDataRaw } = useSWR<StageData>(
    stageStudentId ? `/api/teacher/stage-summary?studentId=${stageStudentId}&months=3` : null,
    fetcher,
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
      toast.warning('一次最多反馈3名学生')
      return
    }
    setSelectedStudentIds(prev => selected ? prev.filter(s => s !== id) : [...prev, id])
    if (selected) {
      setStudentPerf(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }
  const selectAll = () => {
    const selectedIds = filteredStudents.slice(0, MAX_STUDENTS_PER_FEEDBACK).map((s) => s.id)
    if (filteredStudents.length > MAX_STUDENTS_PER_FEEDBACK) {
      toast('一次最多反馈3名学生，已自动选择前3名', { duration: 3000 })
    }
    setSelectedStudentIds(selectedIds)
  }
  const clearAll = () => { setSelectedStudentIds([]); setStudentPerf({}) }
  const cycleStudentPerf = (id: string, event?: { stopPropagation: () => void }) => {
    event?.stopPropagation()
    const levels: StudentPerfLevel[] = ['GREAT', 'OKAY', 'NEEDS_IMPROVEMENT']
    setStudentPerf(prev => {
      const current = prev[id] || 'GREAT'
      const next = levels[(levels.indexOf(current) + 1) % levels.length]
      return { ...prev, [id]: next }
    })
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
    if (targetStudents.length > MAX_STUDENTS_PER_FEEDBACK) { toast.warning('一次最多反馈3名学生'); return }
    const parsedRecord = resolvedStructuredRecord
    const resolvedLessonContent = parsedRecord.lessonContent
    const resolvedSummary = joinDistinctText(parsedRecord.mastery, summary)
    const resolvedOverallComment = joinDistinctText(parsedRecord.feedback, overallComment)
    if (status === 'PUBLISHED' && !hasRequiredLessonContent(resolvedLessonContent)) {
      toast.warning(`请填写本节课堂记录（至少${LESSON_CONTENT_MIN_LENGTH}个字）`)
      window.requestAnimationFrame(() => {
        document.getElementById('lesson-content')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        lessonContentRef.current?.focus()
      })
      return
    }
    const studentRatings = targetStudents.map((studentId) => ({
      studentId,
      rating: studentPerf[studentId] || 'GREAT',
      performanceTags,
      masteryLevel,
      teacherRemark: teacherRemark.trim(),
    }))
    const individualComments = targetStudents
      .map((studentId) => ({ studentId, comment: perStudentComments[studentId]?.trim() || '' }))
      .filter((item) => item.comment)
    const hasIndividualComments = targetStudents.length > 1 && Object.keys(perStudentComments).length > 0
    if (status === 'PUBLISHED' && hasIndividualComments && individualComments.length !== targetStudents.length) {
      const missingNames = targetStudents
        .filter((studentId) => !perStudentComments[studentId]?.trim())
        .map((studentId) => groupStudents.find((student) => student.id === studentId)?.name || '未命名学生')
      toast.warning(`请先补全${missingNames.join('、')}的专属评语`)
      return
    }
    const useIndividualComments = status === 'PUBLISHED' && hasIndividualComments
    if (!hasMeaningfulFeedbackContent({
      lessonContent: resolvedLessonContent,
      overallComment: individualComments.length
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
    if (status === 'PUBLISHED' && aiSuggestion && !aiSuggestionUsed) {
      if (!(await confirmModal('AI 已生成建议但尚未采用，是否继续发布？'))) return
    }
    setSaving(true)
    try {
      let fbData: FeedbackSubmitResponse = {}
      const individualBonuses: BonusResult[] = []
      if (useIndividualComments) {
        for (const [index, item] of individualComments.entries()) {
          const studentName = groupStudents.find((student) => student.id === item.studentId)?.name || '该学生'
          const fbRes = await fetch('/api/teacher/classroom-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classLessonId: requestedLessonId || null,
              groupId: groupId || null,
              feedbackGroupId: groupId || null,
              feedbackCourseType: feedbackCourseBucket,
              targetType: 'STUDENT',
              studentIds: [item.studentId],
              lessonContent: resolvedLessonContent,
              mood, tags, knowledgePoints: kps, badge,
              summary: resolvedSummary,
              overallComment: joinDistinctText(resolvedOverallComment, item.comment),
              homework: homework.map((h, homeworkIndex) => ({ order: homeworkIndex + 1, content: h })),
              imageUrls, status,
              studentRatings: studentRatings.filter((rating) => rating.studentId === item.studentId),
              clientRequestId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
            }),
          })
          const data = await fbRes.json() as FeedbackSubmitResponse
          if (!fbRes.ok) {
            toast.error(`${studentName}的反馈发布失败：${data.error || '请检查网络后重试'}`, { duration: 5000 })
            return
          }
          if (data.bonus) individualBonuses.push(data.bonus)
          if (status === 'PUBLISHED') markTodayFeedback(groupId, [item.studentId])
        }
      } else {
        const fbRes = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classLessonId: requestedLessonId || null, studentIds: targetStudents,
            groupId: groupId || null,
            feedbackGroupId: groupId || null,
            feedbackCourseType: feedbackCourseBucket,
            lessonContent: resolvedLessonContent,
            mood, tags, knowledgePoints: kps, badge,
            summary: resolvedSummary,
            overallComment: resolvedOverallComment,
            homework: homework.map((h, i) => ({ order: i + 1, content: h })),
            imageUrls, status, studentRatings,
            clientRequestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }),
        })
        fbData = await fbRes.json() as FeedbackSubmitResponse
        if (!fbRes.ok) { toast.error(`反馈发布失败：${fbData.error || '请检查网络后重试'}`, { duration: 5000 }); return }
        if (status === 'PUBLISHED') markTodayFeedback(groupId, targetStudents)
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
        setSelectedStudentIds([]); setGroupId('')
        setMood('GOOD'); setTags([]); setKps([]); setBadge('')
        setPerformanceTags([]); setMasteryLevel('GOOD'); setTeacherRemark('')
        setLessonContent(''); setStructuredOverrides({}); setSummary(''); setOverallComment(''); setPerStudentComments({}); setStudentPerf({}); setHomework([]); setImageUrls([])
        revokeLocalPreviews(imageDisplayUrls); setImageDisplayUrls({})
        setUploadTasks([])
        setStageSummaryText(''); setStageSuggestions('')
        setAiSuggestion(null); setAiSuggestionUsed(false); setAiPrefilled(new Set())
        setStageData(null); setStageExpanded(false)
      } else { toast.success('草稿已保存', { duration: 2000 }) }
    } finally { setSaving(false) }
  }
  const aiGenerateClassroom = async () => {
    if (!aiNote.trim() && !overallComment.trim() && !lessonContent.trim() && performanceTags.length === 0 && !teacherRemark.trim()) {
      toast.warning('请先填写授课内容或一句简要评语')
      return
    }
    if (!selectedStudentIds.length && !groupId) {
      toast.warning('请先选择学生，或选择班级后让 AI 识别学生')
      return
    }
    setAiGenerating(true)
    try {
      const roster = groupStudents.map((s) => ({ id: s.id, name: s.name }))
      const selectedStudents = selectedStudentIds.map((id) => {
        const fromGroup = groupStudents.find((s) => s.id === id)
        return fromGroup ? { id: fromGroup.id, name: fromGroup.name } : { id, name: null }
      })
      const studentPerfPayload = selectedStudentIds.map((id) => {
        const fromGroup = groupStudents.find((s) => s.id === id)
        return { id, name: fromGroup?.name || '', level: studentPerf[id] || 'GREAT' }
      })
      const options = {
        moods: MOODS.map(m => ({ value: m.value, label: m.label })),
        tags: QUICK_TAGS,
        knowledgePoints: QUICK_KPS,
      }
      const res = await fetch('/api/teacher/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: [
            lessonContent.trim() ? `本节授课内容：${lessonContent.trim()}` : '',
            overallComment.trim() ? `教师原始评语：${overallComment.trim()}` : '',
            aiNote.trim(),
          ].filter(Boolean).join('\n'),
          roster, options,
          selected: { mood, tags, knowledgePoints: kps },
          selectedStudentIds,
          selectedStudents,
          studentPerf: studentPerfPayload,
          performanceTags,
          masteryLevel: MASTERY_OPTIONS.find((option) => option.value === masteryLevel)?.label || masteryLevel,
          teacherRemark: teacherRemark.trim(),
          grade: selectedStudentIds.map((id) => groupStudents.find((student) => student.id === id)?.grade).filter(Boolean).join('、'),
          subject: selectedGroup?.subject,
          course: selectedGroup?.courseName,
          stageMaterial: stageData?.material?.summarySeed?.slice(0, 600) || '',
          groupId: groupId || undefined,
          courseType: selectedGroup?.courseType || selectedGroup?.course?.type || undefined,
          currentForm: {
            lessonContent, mood, overallComment, tags, knowledgePoints: kps,
            homework, summary, suggestion: summary,
            stageSummaryText, stageSuggestions,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'AI 生成失败，请稍后重试'); return }

      const hasContent = Boolean(
        data.overallComment?.trim() ||
        data.perStudentComments?.length ||
        data.suggestion?.trim() ||
        data.stageSummaryText?.trim() ||
        data.stageSuggestions?.trim() ||
        data.summary?.trim() ||
        data.tags?.length ||
        data.knowledgePoints?.length ||
        data.homework?.length,
      )
      if (!hasContent) {
        toast('AI 没有生成完整内容，请换一句更具体的描述，例如：上课认真听讲，但作业完成还需要加强。')
        return
      }

      const aiStudentIds: string[] = Array.isArray(data.studentIds) ? data.studentIds : []
      if (aiStudentIds.length) {
        const merged = new Set(selectedStudentIds)
        aiStudentIds.forEach((id: string) => merged.add(id))
        const limited = [...merged].slice(0, MAX_STUDENTS_PER_FEEDBACK)
        if (merged.size > MAX_STUDENTS_PER_FEEDBACK) toast.warning('AI 识别人数超过限制，已保留前3名学生')
        setSelectedStudentIds(limited)
      }
      if (data.unknownNames?.length) {
        toast(`未能在班级中确认：${data.unknownNames.join('、')}`, { duration: 3000 })
      }

      setAiSuggestion(data)
      setAiSuggestionUsed(false)
      if (data.needsManualStudentSelection) {
        toast('AI 已生成反馈内容，请先确认学生后再发布。', { duration: 4000 })
      } else {
        toast.success('AI 已生成反馈建议，请核对后选择采用方式', { duration: 3000 })
      }
    } catch (e: unknown) { toast.error(errorMessage(e, 'AI 生成失败')) }
    finally { setAiGenerating(false) }
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
      if (!res.ok) { toast.error(data.error || 'AI 生成失败'); return }
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
        toast.warning('AI 未返回对应内容，请再试一次')
      }
    } catch (e: unknown) { toast.error(errorMessage(e, 'AI 生成失败')) }
    finally { setAiGenerating(false) }
  }

  const hasTeacherWrittenContent = () => Boolean(
    overallComment.trim() || Object.values(perStudentComments).some((comment) => comment.trim()) || summary.trim() || tags.length || kps.length || homework.length || stageSummaryText.trim() || stageSuggestions.trim()
  )

  const adoptAiSuggestion = async (mode: 'all' | 'empty' | 'append') => {
    if (!aiSuggestion) return
    if (mode === 'all' && hasTeacherWrittenContent()) {
      if (!(await confirmModal('当前已有手写内容，是否覆盖？'))) return
    }

    const mergeByMode = (current: string, next?: string) => {
      if (mode === 'append') return appendText(current, next)
      if (mode === 'empty') return current.trim() ? current : (next || '')
      return next !== undefined ? next : current
    }

    if (aiSuggestion.mood && MOODS.some((m) => m.value === aiSuggestion.mood)) setMood(aiSuggestion.mood)
    const aiStudentComments = aiSuggestion.perStudentComments || []
    if (aiSuggestion.overallComment?.trim() || aiStudentComments.some((item) => item.comment?.trim())) {
      setCommentExpanded(true)
    }
    if (aiStudentComments.length === 1) {
      setOverallComment((prev) => mergeByMode(prev, aiStudentComments[0].comment || aiSuggestion.overallComment))
      setPerStudentComments({})
    } else {
      setOverallComment((prev) => mergeByMode(prev, aiSuggestion.overallComment))
      if (aiStudentComments.length > 1) {
        setPerStudentComments((prev) => Object.fromEntries(aiStudentComments.map((item) => [
          item.studentId,
          mergeByMode(prev[item.studentId] || '', item.comment),
        ])))
      }
    }
    setSummary((prev) => mergeByMode(prev, aiSuggestion.suggestion || aiSuggestion.summary))
    setStageSummaryText((prev) => mergeByMode(prev, aiSuggestion.stageSummaryText))
    setStageSuggestions((prev) => mergeByMode(prev, aiSuggestion.stageSuggestions))
    setTags((prev) => mode === 'all' ? mergeUnique([], aiSuggestion.tags || []) : mergeUnique(prev, aiSuggestion.tags || []))
    setKps((prev) => mode === 'all' ? mergeUnique([], aiSuggestion.knowledgePoints || []) : mergeUnique(prev, aiSuggestion.knowledgePoints || []))
    setHomework((prev) => mode === 'all' ? mergeUnique([], aiSuggestion.homework || []) : mergeUnique(prev, aiSuggestion.homework || []))
    setAiSuggestionUsed(true)
    setAiPrefilled(new Set(['mood', 'comment', 'suggestion', 'tags', 'kps', 'homework', 'stageSummary', 'stageSuggestion']))
    toast.success(mode === 'append' ? '已追加 AI 建议' : '已采用 AI 建议')
  }

  const ignoreAiSuggestion = () => {
    setAiSuggestion(null)
    setPerStudentComments({})
    setAiSuggestionUsed(true)
  }
  const aiPrefillMark = (key: string) => aiPrefilled.has(key)
    ? <Tag color="processing" style={{ fontSize: 10, marginLeft: 6, borderRadius: 4 }}>AI 预填</Tag>
    : null
  const aiWaitingMessages = [
    '正在理解你的描述…',
    `正在为 ${selectedStudentIds.length} 名学生分别撰写评语…`,
    '正在匹配表现标签和知识点…',
    '快好了，正在整理格式…',
  ]
  const aiWaitingHint = aiGenerating ? (
    <div style={{ color: '#B26B45', fontSize: 12, lineHeight: 1.6, margin: '0 0 8px' }}>
      {aiWaitingMessages[aiWaitingMessageIndex]}
    </div>
  ) : null
  const appendAiKeyword = (keyword: string) => {
    if (selectedAiKeywords.includes(keyword)) return
    setSelectedAiKeywords((current) => [...current, keyword])
    setAiNote((current) => current.trim() ? `${current.trim()}，${keyword}` : keyword)
  }
  const renderStudentPerfButton = (studentId: string) => {
    if (!selectedStudentIds.includes(studentId)) return null
    const level = studentPerf[studentId] || 'GREAT'
    const meta = STUDENT_PERF_META[level]
    return (
      <button
        type="button"
        onClick={(event) => cycleStudentPerf(studentId, event)}
        title={`点击切换表现档位：${meta.label}`}
        style={{
          border: `1px solid ${meta.border}`,
          background: meta.bg,
          color: meta.color,
          borderRadius: 999,
          fontSize: 10,
          lineHeight: '18px',
          padding: '0 7px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {meta.short}
      </button>
    )
  }
  const aiKeywordChips = (
    <div style={{ display: 'grid', gap: 6, margin: '0 0 8px' }}>
      {AI_KEYWORD_GROUPS.map((group) => (
        <div key={group.label} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
          <span style={{ color: '#8d806f', fontSize: 11, marginRight: 2 }}>{group.label}</span>
          {group.words.map((word) => {
            const selected = selectedAiKeywords.includes(word)
            return (
              <button
                key={word}
                type="button"
                onClick={() => appendAiKeyword(word)}
                style={{
                  borderRadius: 999, padding: '2px 8px', fontSize: 11, lineHeight: 1.6, cursor: selected ? 'default' : 'pointer',
                  background: selected ? '#FFF3EC' : '#FAFBFC', color: selected ? '#E8784A' : '#5a4e3a',
                  border: `1px solid ${selected ? 'rgba(232,120,74,.35)' : '#E2E4E8'}`,
                }}
              >
                {word}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
  const structuredAiInputs = (
    <div style={{ display: 'grid', gap: 10, margin: '10px 0' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#5A4E3A', marginBottom: 6 }}>课堂表现（可多选）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PERFORMANCE_TAG_OPTIONS.map((item) => (
            <Tag.CheckableTag
              key={item}
              checked={performanceTags.includes(item)}
              onChange={(checked) => setPerformanceTags((current) => checked ? [...current, item] : current.filter((value) => value !== item))}
            >
              {item}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>
      <Select value={masteryLevel} onChange={setMasteryLevel} options={MASTERY_OPTIONS} aria-label="知识掌握" />
      <Input.TextArea
        rows={2}
        value={teacherRemark}
        onChange={(event) => setTeacherRemark(event.target.value)}
        maxLength={300}
        showCount
        placeholder="教师补充说明：记录学生的具体表现、问题或需要家长配合的事项"
      />
    </div>
  )

  const formSection = (
    <div className="teacher-feedback-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isMobile && <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-ink)' }}>③ 填写反馈</div>}
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
          border: '1px solid rgba(232,120,74,.24)',
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
              只需粘贴一次，系统会自动整理为学习内容、掌握情况和课堂反馈。
            </div>
          </div>
        </div>
        <Input.TextArea
          className="teacher-feedback-paste-input"
          ref={lessonContentRef}
          value={lessonContent}
          onChange={(event) => {
            setLessonContent(event.target.value)
            setStructuredOverrides({})
            setStructuredReviewOpen(false)
          }}
          rows={isMobile ? 4 : 3}
          maxLength={LESSON_CONTENT_MAX_LENGTH}
          showCount
          aria-required="true"
          aria-describedby="lesson-content-help"
          placeholder={'推荐直接粘贴：\n本节课学习内容：第三章第一节一元一次方程，讲解移项法则及例题2—4。\n孩子掌握情况：基础方法已掌握，计算准确率还需提高。\n课堂反馈：听讲认真，能主动回答问题。'}
          style={{ borderRadius: 10, fontSize: 14, lineHeight: 1.7 }}
        />
        <div id="lesson-content-help" style={{ color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 6 }}>
          支持原有整段评语，带栏目名称时拆分更准确。发布时至少填写 {LESSON_CONTENT_MIN_LENGTH} 个字。
        </div>
        {lessonContent.trim() && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: 'var(--color-surface-3)',
            border: '1px solid var(--color-hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-ink)' }}>系统已自动整理</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {([
                    ['lessonContent', '学习内容'],
                    ['mastery', '掌握情况'],
                    ['feedback', '课堂表现'],
                  ] as Array<[keyof StructuredClassroomRecord, string]>).map(([key, label]) => (
                    <Tag
                      key={key}
                      color={resolvedStructuredRecord[key] ? 'success' : 'warning'}
                      style={{ margin: 0, borderRadius: 999, fontSize: 11 }}
                    >
                      {label}{resolvedStructuredRecord[key] ? ' ✓' : ' 待确认'}
                    </Tag>
                  ))}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                aria-expanded={structuredReviewOpen}
                icon={structuredReviewOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setStructuredReviewOpen((current) => !current)}
                style={{ color: 'var(--color-primary)', flexShrink: 0 }}
              >
                {structuredReviewOpen ? '收起' : '查看或调整'}
              </Button>
            </div>
            {structuredReviewOpen && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                  只有识别不准确时才需要调整，发布时仍只提交一份反馈。
                </div>
                {([
                  ['lessonContent', '本节课学习内容', '请确认本节讲授的章节、知识点和练习'],
                  ['mastery', '孩子掌握情况', '请确认孩子对本节内容的掌握情况'],
                  ['feedback', '课堂反馈', '请确认听讲、参与和课堂状态'],
                ] as Array<[keyof StructuredClassroomRecord, string, string]>).map(([key, label, placeholder]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '112px minmax(0, 1fr)', gap: isMobile ? 3 : 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-muted)' }}>{label}</span>
                    <Input.TextArea
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      value={resolvedStructuredRecord[key]}
                      placeholder={placeholder}
                      onChange={(event) => setStructuredOverrides((current) => ({ ...current, [key]: event.target.value }))}
                      style={{ fontSize: 12, lineHeight: 1.65, borderRadius: 8 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
      {aiSuggestion && (
        <Card size="small" style={{ borderRadius: 14, border: '1px solid rgba(232,120,74,.28)', background: '#FFF8F4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1201' }}>AI 建议卡片</div>
              <div style={{ fontSize: 12, color: '#8d806f', marginTop: 2 }}>请核对后选择采用方式，AI 不会自动覆盖你的手写内容</div>
            </div>
            <Button size="small" type="text" onClick={ignoreAiSuggestion}>忽略</Button>
          </div>
          <div style={{ display: 'grid', gap: 8, fontSize: 12, color: '#5a4e3a', lineHeight: 1.7 }}>
            {aiSuggestion.mood && <div><strong>课堂状态：</strong>{MOODS.find((m) => m.value === aiSuggestion.mood)?.label || aiSuggestion.mood}</div>}
            {aiSuggestion.overallComment && <div><strong>评语：</strong>{aiSuggestion.overallComment}</div>}
            {!!aiSuggestion.perStudentComments?.length && <div><strong>逐人评语：</strong>已为 {aiSuggestion.perStudentComments.length} 名学生分别生成</div>}
            {(aiSuggestion.suggestion || aiSuggestion.summary) && <div><strong>下一步建议：</strong>{aiSuggestion.suggestion || aiSuggestion.summary}</div>}
            {!!aiSuggestion.tags?.length && <div><strong>表现标签：</strong>{aiSuggestion.tags.join('、')}</div>}
            {!!aiSuggestion.knowledgePoints?.length && <div><strong>知识点：</strong>{aiSuggestion.knowledgePoints.join('、')}</div>}
            {!!aiSuggestion.homework?.length && <div><strong>作业布置：</strong>{aiSuggestion.homework.join('；')}</div>}
            {aiSuggestion.stageSummaryText && <div><strong>本期寄语：</strong>{aiSuggestion.stageSummaryText}</div>}
          </div>
          <div className="teacher-feedback-ai-actions" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, auto)', gap: 8, marginTop: 12 }}>
            <Button size="small" type="primary" onClick={() => adoptAiSuggestion('all')} style={{ background: '#E8784A' }}>全部采用</Button>
            <Button size="small" onClick={() => adoptAiSuggestion('empty')}>只采用空白项</Button>
            <Button size="small" onClick={() => adoptAiSuggestion('append')}>追加到已有内容</Button>
            <Button size="small" onClick={ignoreAiSuggestion}>忽略</Button>
          </div>
        </Card>
      )}
      {/* Mood */}
      <Card size="small" className="teacher-feedback-step-card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          课堂状态{aiPrefillMark('mood')}
        </div>
        <div className="teacher-feedback-mood-grid" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button className="teacher-feedback-mood-button" key={m.value} type="button" aria-pressed={mood === m.value} onClick={() => setMood(m.value)} style={{
              minHeight: 44, padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
              background: mood === m.value ? m.color : '#F5F2EE', color: mood === m.value ? '#fff' : '#5a4e3a',
              border: mood === m.value ? `1px solid ${m.color}` : '1px solid var(--color-hairline)',
              fontWeight: mood === m.value ? 700 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {m.value === 'GREAT'
                ? <CheckCircleOutlined />
                : m.value === 'GOOD'
                  ? <LikeOutlined />
                  : m.value === 'OKAY'
                    ? <MinusCircleOutlined />
                    : <ExclamationCircleOutlined />}
              {m.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Comment */}
      <Card size="small" className="teacher-feedback-step-card">
        <button
          type="button"
          aria-expanded={commentExpanded}
          onClick={() => setCommentExpanded((current) => !current)}
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
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>
              个性评语（可选）{aiPrefillMark('comment')}
            </span>
            <span style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 11, lineHeight: 1.55, marginTop: 2 }}>
              仅在需要对某位学生单独补充时填写，不必重复粘贴课堂记录
            </span>
          </span>
          {commentExpanded ? <UpOutlined /> : <DownOutlined />}
        </button>
        {commentExpanded && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <Button
                type="text"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => setAiExpanded((current) => !current)}
                style={{ color: 'var(--color-primary)', minHeight: isMobile ? 44 : 32 }}
              >
                AI润色
              </Button>
            </div>
            {selectedStudentIds.length > 1 && Object.keys(perStudentComments).length > 1 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {selectedStudentIds.filter((id) => perStudentComments[id] !== undefined).map((studentId) => {
                  const studentName = groupStudents.find((student) => student.id === studentId)?.name || '学生'
                  return (
                    <div key={studentId} style={{ padding: 10, borderRadius: 10, background: '#FFF8F4', border: '1px solid rgba(232,120,74,.18)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e3a', marginBottom: 6 }}>{studentName}</div>
                      <Input.TextArea value={perStudentComments[studentId]} onChange={e => setPerStudentComments((prev) => ({ ...prev, [studentId]: e.target.value }))}
                        rows={4} placeholder={`${studentName}的专属评语`} maxLength={400} showCount style={{ borderRadius: 8 }} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <Input.TextArea value={overallComment} onChange={e => setOverallComment(e.target.value)}
                rows={3} placeholder="如需补充，可填写对该学生的个性化评语" maxLength={300} showCount style={{ borderRadius: 8 }} />
            )}
          </div>
        )}
      </Card>

      {aiExpanded && (
        <Card size="small" style={{ borderRadius: 14, border: '1px solid rgba(232,120,74,.22)', background: '#FFFBF7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)' }}>AI润色评语（可选）</div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.6, marginTop: 2 }}>
                AI会结合授课内容、课堂状态和你的原始评语生成建议，不会自动覆盖。
              </div>
            </div>
            <Button type="text" size="small" icon={<UpOutlined />} onClick={() => setAiExpanded(false)}>收起</Button>
          </div>
          <Input.TextArea
            rows={2}
            placeholder="可以补充一句，例如：课堂认真，但计算准确率需要加强"
            value={aiNote}
            onChange={event => setAiNote(event.target.value)}
            style={{ borderRadius: 10, marginBottom: 10 }}
            allowClear
            disabled={aiGenerating}
          />
          {aiKeywordChips}
          {structuredAiInputs}
          {aiWaitingHint}
          <Button
            type="primary"
            block
            icon={<ThunderboltOutlined />}
            loading={aiGenerating}
            disabled={(!selectedStudentIds.length && !groupId) || aiGenerating}
            onClick={aiGenerateClassroom}
            style={{ minHeight: 44, borderRadius: 10, background: 'var(--color-primary)', fontWeight: 700 }}
          >
            生成润色建议
          </Button>
        </Card>
      )}

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
            <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>手动分开填写（可选）</span>
            <span style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 11, marginTop: 2 }}>
              表现标签、知识点、作业、徽章和本期寄语
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {QUICK_KPS.map(kp => (
            <button key={kp} onClick={() => toggleKp(kp)} style={{
              padding: '3px 10px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
              background: kps.includes(kp) ? '#E8784A' : '#F5F2EE',
              color: kps.includes(kp) ? '#fff' : '#5a4e3a', border: 'none',
            }}>{kp}</button>
          ))}
        </div>
        <Input size="small" placeholder="自定义知识点，回车添加" style={{ borderRadius: 8 }}
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

      {/* Badge — collapsible */}
      <Card size="small" className="teacher-feedback-step-card">
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setBadgeOpen(!badgeOpen)}>
          <span>闪光徽章 {badge ? `· ${badge}` : '(可选)'}</span>
          <span style={{ color: '#98A2B3' }}>{badgeOpen ? '收起' : '展开'}</span>
        </div>
        {badgeOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
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
        </>
      )}

      {/* Upload — high-frequency and always visible */}
      <Card size="small" className="teacher-feedback-step-card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          课堂资料 {imageUrls.length ? `(${imageUrls.length})` : '(可选)'}
        </div>
        <div style={{ color: 'var(--color-ink-subtle)', fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
          可直接拍照或从相册选择，上传后会自动压缩并保留原图。
        </div>
          <div>
            {imageUrls.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <AntImage.PreviewGroup>{imageUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <AntImage src={signedImageUrls[i]} preview={{ src: signedImagePreviews[i] }} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23f5f2ee'/%3E%3Ctext x='32' y='32' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E" />
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
                        width: 28,
                        minWidth: 28,
                        height: 28,
                        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
                      }}
                    />
                  </div>
                ))}</AntImage.PreviewGroup>
              </div>
            )}
            <Upload.Dragger name="file" accept="image/*" multiple maxCount={9} showUploadList={false}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/') && !/\.(heic|heif|avif)$/i.test(file.name)) { toast.warning('仅支持图片文件（JPG/PNG/WebP/HEIC）'); return Upload.LIST_IGNORE }
                if (file.size > 20 * 1024 * 1024) { toast.warning('图片不能超过 20MB，请压缩后重新上传'); return Upload.LIST_IGNORE }
                return true
              }}
              customRequest={({ file, onSuccess, onError }) => {
                const source = file as File
                const taskId = `${source.name}-${source.lastModified}-${Math.random().toString(36).slice(2)}`
                void processImageUpload(source, taskId, {
                  onSuccess: response => onSuccess?.(response),
                  onError,
                })
              }}
              style={{ borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#98A2B3' }}>点击或拖拽上传，单张≤20MB，支持 JPG/PNG/WebP/HEIC</div>
            </Upload.Dragger>
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
          <div
            style={{ fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setStageExpanded(!stageExpanded)}
          >
            <span>本期寄语（家长端可见）{stageExpanded ? '' : '，点击展开'}</span>
            <span style={{ color: '#98A2B3', fontSize: 12 }}>{stageExpanded ? '收起' : '展开'}</span>
          </div>
          {stageExpanded && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>本期寄语（家长端可见）</span>
                <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={aiGenerating}
                  onClick={() => stageAiGenerate('summary')}
                  style={{ fontSize: 11, padding: 0 }}>AI 写寄语</Button>
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
                  style={{ fontSize: 11, padding: 0 }}>AI 写建议</Button>
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
        flexWrap: 'nowrap',
        position: isMobile ? 'sticky' : undefined,
        bottom: isMobile ? 0 : undefined,
        zIndex: isMobile ? 20 : undefined,
        margin: isMobile ? '0 -16px' : undefined,
        padding: isMobile ? '12px 16px calc(12px + env(safe-area-inset-bottom))' : '0 0 24px',
        background: isMobile ? '#fff' : undefined,
        borderTop: isMobile ? '1px solid #EEE7E1' : undefined,
      }}>
        <Button block onClick={() => setPreviewOpen(true)} style={{ flex: 1, minHeight: 44 }}>{isMobile ? '预览' : '预览家长端'}</Button>
        <Button block onClick={() => submit('DRAFT')} loading={saving} disabled={saving || uploadingCount > 0} style={{ flex: 1, minHeight: 44 }}>保存草稿</Button>
        <Button block type="primary" icon={submitDone ? <CheckCircleOutlined /> : <SendOutlined />}
          onClick={() => submit('PUBLISHED')} loading={saving} disabled={saving || submitDone || uploadingCount > 0}
          style={{ flex: 2, minHeight: 44, background: submitDone ? '#1D9E75' : '#E8784A', borderColor: submitDone ? '#1D9E75' : '#E8784A', fontWeight: 700 }}>
          {submitDone ? '已发布' : saving ? '发布中...' : uploadingCount > 0 ? '图片上传中...' : '发布给家长'}
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
          <div><Tag color="orange">{MOODS.find((m) => m.value === mood)?.label || mood}</Tag>{tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
          {resolvedStructuredRecord.lessonContent && <div><strong>本节课学习内容</strong><div style={{ marginTop: 4, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{resolvedStructuredRecord.lessonContent}</div></div>}
          {(resolvedStructuredRecord.mastery || summary) && <div><strong>孩子掌握情况</strong><div style={{ marginTop: 4, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{joinDistinctText(resolvedStructuredRecord.mastery, summary)}</div></div>}
          {(resolvedStructuredRecord.feedback || overallComment) && <div><strong>课堂反馈</strong><div style={{ marginTop: 4, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{joinDistinctText(resolvedStructuredRecord.feedback, overallComment)}</div></div>}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 12, maxHeight: '100vh', overflowY: 'auto' }}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>选择班级</div>
            <MobileSelect size="small" value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setSelectedStudentIds([]); setStudentPerf({}) }}
              allowClear placeholder="选择班级" style={{ width: '100%' }} listHeight={320}
              options={groups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
            {!groupId && groups.length === 0 && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>暂无班级数据</div>}
          </Card>

          {/* Student list — collapsible */}
          {groupId && (
            <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setStudentsExpanded(!studentsExpanded)}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {selectedGroup?.courseName || '班级'} ({filteredStudents.length}人)
                  {selectedStudentIds.length > 0 && (
                    <span style={{ fontWeight: 400, color: '#E8784A', marginLeft: 6, fontSize: 12 }}>
                      已选 {selectedStudentIds.length} 人
                    </span>
                  )}
                </span>
                <span style={{ color: '#98A2B3', fontSize: 12 }}>{studentsExpanded ? '收起 ▲' : '展开 ▼'}</span>
              </div>
              {/* Always show selected chips */}
              {selectedStudentIds.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedStudentIds.map((id) => {
                    const s = groupStudents.find((gs) => gs.id === id)
                    return s ? (
                      <Tag key={id} closable color="orange" style={{ borderRadius: 9999, fontSize: 11, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClose={(e) => { e.preventDefault(); toggleStudent(id) }}>{s.name}{renderStudentPerfButton(id)}</Tag>
                    ) : null
                  })}
                </div>
              )}
              {studentsExpanded && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <Input size="small" prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索" style={{ flex: 1, borderRadius: 8 }} />
                    <Button size="small" onClick={selectAll} style={{ fontSize: 11 }}>全选（最多3人）</Button>
                    <Button size="small" onClick={clearAll} style={{ fontSize: 11 }}>清空</Button>
                  </div>
                  {filteredStudents.length === 0 ? (
                    <GuidedEmpty
                      compact
                      title={studentSearch ? '没有符合搜索条件的学员' : '这个班级还没有学员'}
                      description={studentSearch ? '换一个姓名关键词，或清除搜索后查看班级全部学员。' : '学员加入班级后会显示在这里，选择学员即可填写本次反馈。'}
                      actionLabel={studentSearch ? '清除搜索' : '查看我的课表'}
                      onAction={() => studentSearch ? setStudentSearch('') : window.location.assign('/teacher/schedule')}
                    />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {filteredStudents.map((s) => {
                        const selected = selectedStudentIds.includes(s.id)
                        const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[`${groupId}:${s.id}`])
                        return (
                          <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                            padding: 8, borderRadius: 8, cursor: 'pointer',
                            border: feedbacked ? '1px solid #D9D4CE' : selected ? '2px solid #E8784A' : '1px solid #EEE7E1',
                            background: feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                            opacity: feedbacked ? 0.62 : 1,
                            transition: 'all .15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 8, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E8784A', flexShrink: 0 }}>{s.name[0]}</div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                {selected && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>{renderStudentPerfButton(s.id)}</div>}
                              </div>
                            </div>
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


            <Card size="small" className="teacher-feedback-step-card">
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>① 选择课程</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5a4e3a', marginBottom: 6 }}>班级 / 课程</div>
                  <MobileSelect value={groupId || undefined} onChange={(v: string) => { setGroupId(v); setSelectedStudentIds([]); setStudentPerf({}); setStudentsExpanded(false) }}
                    allowClear placeholder="选择班级、学科或学生" style={{ width: '100%' }} listHeight={260}
                    options={groups.map((g) => ({ label: `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`, value: g.id }))} />
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
            </Card>

            {groupId && (
              <Card size="small" className="teacher-feedback-step-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
                  onClick={() => setStudentsExpanded(!studentsExpanded)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>② 选择学生</div>
                    <div style={{ fontSize: 12, color: '#7A869A', marginTop: 2 }}>已选 {selectedStudentIds.length} 人</div>
                  </div>
                  <Button size="small" type="link" style={{ color: '#E8784A', padding: 0 }}>
                    {studentsExpanded ? '收起' : '展开'}
                  </Button>
                </div>
                {selectedStudentIds.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedStudentIds.map((id) => {
                      const s = groupStudents.find((gs) => gs.id === id)
                      return s ? (
                        <Tag key={id} closable color="orange" style={{ borderRadius: 9999, fontSize: 12, margin: 0, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClose={(e) => { e.preventDefault(); toggleStudent(id) }}>{s.name}{renderStudentPerfButton(id)}</Tag>
                      ) : null
                    })}
                  </div>
                )}
                {studentsExpanded && (
                  <div style={{ marginTop: 12 }}>
                    <div className="teacher-feedback-student-tools" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <Input prefix={<SearchOutlined />} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="搜索学生" style={{ flex: 1, borderRadius: 10 }} />
                      <Button onClick={selectAll}>全选（最多3人）</Button>
                      <Button onClick={clearAll}>清空</Button>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <GuidedEmpty
                        compact
                        title={studentSearch ? '没有符合搜索条件的学员' : '这个班级还没有学员'}
                        description={studentSearch ? '换一个姓名关键词，或清除搜索后查看班级全部学员。' : '学员加入班级后会显示在这里，选择学员即可填写本次反馈。'}
                        actionLabel={studentSearch ? '清除搜索' : '查看我的课表'}
                        onAction={() => studentSearch ? setStudentSearch('') : window.location.assign('/teacher/schedule')}
                      />
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {filteredStudents.map((s) => {
                          const selected = selectedStudentIds.includes(s.id)
                          const feedbacked = Boolean(s.todayFeedback || todayFeedbackByScope[`${groupId}:${s.id}`])
                          return (
                            <div key={s.id} onClick={() => toggleStudent(s.id)} style={{
                              minHeight: 44, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                              border: feedbacked ? '1px solid #D9D4CE' : selected ? '2px solid #E8784A' : '1px solid #EEE7E1',
                              background: feedbacked ? '#F3F1EE' : selected ? '#FFF3EC' : '#fff',
                              opacity: feedbacked ? 0.62 : 1,
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E8784A', flexShrink: 0 }}>{s.name[0]}</div>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                {selected && <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>{renderStudentPerfButton(s.id)}</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
        {/* Multi-student info */}
        {selectedStudentIds.length > 1 && (
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FFFBF7' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>已选 {selectedStudentIds.length} 位学员</div>
            <div style={{ fontSize: 11, color: '#7A869A' }}>批量反馈适合发共同内容，个性化评价建议单独选择学生补充</div>
          </Card>
        )}

        {/* Form (includes AI input, classroom feedback, stage-summary) */}
        {formSection}

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
            课堂、周末班和晚托统一从这里记录；先选择对应班级，再填写学生当次表现并上传照片。
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
