'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useMemo, useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Badge, Button, Card, Carousel, Drawer, Form, Input, Modal, Segmented, Select, Spin, Tag, Tooltip, Typography, Upload, message as antdMessage } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, DownloadOutlined, HistoryOutlined, InboxOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SearchOutlined, SendOutlined, ShareAltOutlined, TeamOutlined, WarningOutlined, CameraOutlined } from '@ant-design/icons'
import { Image as AntImage } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { TIER_THEME, resolveTier } from '@/constants/teacher-tier'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from 'sonner'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'
import { AdminTeachingRecordSwitcher } from '@/components/study-hall/AdminTeachingRecordSwitcher'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import styles from './classroom-feedback.module.css'

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('加载失败'); return res.json() })

type AdminFeedback = {
  id: string
  studentName: string
  teacherId: string
  teacherName: string
  classGroupName: string | null
  courseName: string | null
  lessonContent: string | null
  summary: string | null
  subject: string
  date: string
  createdAt: string
  tags: string[]
  imageCount: number
  hasImage: boolean
  status: string
}

type AdminFeedbackImage = {
  assetId: string | null
  originalUrl: string
  previewUrl: string
  thumbnailUrl: string
}

type AdminFeedbackDetail = {
  id: string
  date: string
  teacher: { id: string; name: string; gender?: string | null; tierLevel?: string; avatar?: string | null; subjects?: string }
  subject: string
  course: string | null
  className: string | null
  students: Array<{ id: string; name: string; grade?: string | null; studentRating?: unknown }>
  overallComment: string | null
  lessonContent: string | null
  summary: string | null
  knowledgePoints: string[]
  knowledgeCard?: unknown
  homework: unknown
  tags: string[]
  badge: string | null
  mood: string | null
  images: AdminFeedbackImage[]
  parentReply: string | null
  adminReply: string | null
  parentMessages: Array<{
    id: string
    title: string
    replies: Array<{ id: string; authorName: string; role: string; content: string; createdAt: string }>
  }>
  status: string
  createdAt: string
}

type AdminLesson = {
  id: string
  teacherId: string
  teacherName: string
  groupName: string
  courseName: string
  subject: string
  time: string
  hasFeedback: boolean
  students: Array<{ id: string; name: string; grade?: string | null }>
}

// 学科配色（与家长端一致）
const SUBJECT_STYLES: Record<string, { glyph: string; tagColor: string; tagBg: string }> = {
  数学: { glyph: '数', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.12)' },
  英语: { glyph: '英', tagColor: '#2B4E8C', tagBg: 'rgba(43,78,140,.12)' },
  物理: { glyph: '物', tagColor: '#A5823C', tagBg: 'rgba(165,130,60,.14)' },
  化学: { glyph: '化', tagColor: '#C96F3A', tagBg: 'rgba(201,111,58,.14)' },
  语文: { glyph: '语', tagColor: '#B55445', tagBg: 'rgba(181,84,69,.12)' },
  生物: { glyph: '生', tagColor: '#2F6B4F', tagBg: 'rgba(47,107,79,.12)' },
}
const DEFAULT_SUBJECT_STYLE = { glyph: '课', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.12)' }
function subjectStyle(subject: string) {
  return SUBJECT_STYLES[subject] || DEFAULT_SUBJECT_STYLE
}

function formatFeedbackTime(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatHomework(homework: unknown) {
  if (!Array.isArray(homework)) return []
  return homework.map((entry) => {
    if (typeof entry === 'string') return entry
    if (entry && typeof entry === 'object' && 'content' in entry) return String((entry as { content?: unknown }).content || '')
    return String(entry || '')
  }).filter(Boolean)
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
      const timeout = window.setTimeout(() => finish(new Error('SHARE_IMAGE_LOAD_TIMEOUT')), 15000)
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

function FeedbackImage({ src, size, onClick }: { src: string; size: number; onClick?: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <button
      type="button"
      aria-label={onClick ? '预览课堂资料图片' : '课堂资料缩略图'}
      onClick={onClick}
      style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px`, padding: 0, overflow: 'hidden', borderRadius: 6, border: '1px solid #EEE7E1', background: '#F5F2EE', cursor: onClick ? 'zoom-in' : 'default' }}
    >
      {!loaded && !failed && <Spin size="small" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} />}
      {failed ? <span style={{ fontSize: 10, color: '#9A8E7A' }}>加载失败</span> : (
        <AntImage src={src} alt="课堂资料" width={size} height={size} preview={false} loading="lazy" style={{ objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity .2s ease' }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
    </button>
  )
}

function FeedbackImageViewer({ images, initialIndex, onClose }: { images: AdminFeedbackImage[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex)
  const { urls: signedPreviews } = useSignedUrls(images.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl))
  const activeImage = images[current]
  const { urls: signedActiveOriginal, loading: originalLoading } = useSignedUrls(
    activeImage && !activeImage.assetId ? [activeImage.originalUrl] : [],
  )
  const downloadHref = activeImage?.assetId
    ? `/api/admin/classroom-feedback/image-download?assetId=${encodeURIComponent(activeImage.assetId)}`
    : signedActiveOriginal[0]

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width="min(960px, 100vw)"
      centered
      styles={{ body: { padding: 0, maxWidth: '100%', overflow: 'hidden' } }}
      title={
        <span style={{ color: '#1A1201' }}>
          课堂资料 <span style={{ color: '#9A8E7A', fontWeight: 400 }}>{current + 1} / {images.length}</span>
        </span>
      }
    >
      <Carousel key={initialIndex} initialSlide={initialIndex} afterChange={setCurrent} arrows dots={false} swipeToSlide>
        {images.map((image, index) => (
          <div key={image.originalUrl + '-' + index}>
            <div style={{ position: 'relative', width: '100%', height: 'min(70vh, 720px)', minHeight: 280, background: '#1A1201' }}>
              <AntImage
                src={signedPreviews[index]}
                alt={'课堂资料 ' + (index + 1)}
                width="100%"
                height="min(70vh, 720px)"
                preview={false}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        ))}
      </Carousel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 12, background: '#FAF8F5' }}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          href={downloadHref}
          disabled={!activeImage?.assetId && originalLoading}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
        >
          下载原图
        </Button>
      </div>
    </Modal>
  )
}

// 复刻家长端的反馈卡片
function AdminFeedbackRow({ item, onOpen }: { item: AdminFeedback; onOpen: (item: AdminFeedback) => void }) {
  const sm = subjectStyle(item.subject)
  const summary = item.summary?.trim() || item.lessonContent?.trim() || '课堂反馈已发布，请点击查看详情'
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      style={{
        display: 'flex', gap: 12, width: '100%', textAlign: 'left',
        padding: '14px 16px', background: '#fff', border: '1px solid #EEE7E1',
        borderRadius: 14, cursor: 'pointer', transition: 'all .2s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,120,74,.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EEE7E1'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{
        flex: '0 0 44px', width: 44, height: 44, borderRadius: 12,
        display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18,
        color: sm.tagColor, background: sm.tagBg,
      }}>
        {sm.glyph}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: '#1A1201', fontSize: 14 }}>{item.teacherName}</strong>
          <span style={{
            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
            color: sm.tagColor, background: sm.tagBg, border: `1px solid ${sm.tagColor}33`,
          }}>{item.subject}</span>
          {item.studentName && (
            <span style={{ fontSize: 12, color: '#E8784A', fontWeight: 600 }}>学员：{item.studentName}</span>
          )}
          {item.classGroupName && (
            <span style={{ fontSize: 11, color: '#9A8E7A' }}>{item.classGroupName}</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A8E7A' }}>{formatFeedbackTime(item.createdAt)}</span>
        </span>
        <span style={{
          fontSize: 13, color: '#5A4E3A', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{summary}</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: '#9A8E7A' }}>
          {item.courseName && <span>{item.courseName}</span>}
          {item.imageCount > 0 && <span><CameraOutlined /> {item.imageCount}张课堂照片</span>}
          <Badge status={item.status === 'PUBLISHED' ? 'success' : 'warning'} text={item.status === 'PUBLISHED' ? '已发布' : '草稿'} />
        </span>
      </span>
    </button>
  )
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ color: '#9A8E7A', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAF8F5', border: '1px solid #EEE7E1', color: '#5A4E3A', fontSize: 13 }}>
        {children}
      </div>
    </section>
  )
}

export default function ClassroomFeedbackAdminPage() {
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTeacherId = searchParams.get('teacherId') || ''

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [q, setQ] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>('')

  // Compose drawer state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm] = Form.useForm()
  const [composeImages, setComposeImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [composeTeacherId, setComposeTeacherId] = useState('')
  const [composeLessonId, setComposeLessonId] = useState('')
  const [detailFeedback, setDetailFeedback] = useState<AdminFeedbackDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [adminReply, setAdminReply] = useState('')
  const [replying, setReplying] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  // 编辑与撤销
  const [editing, setEditing] = useState(false)
  const [editSummary, setEditSummary] = useState('')
  const [editLessonContent, setEditLessonContent] = useState('')
  const [editKnowledgePoints, setEditKnowledgePoints] = useState<string[]>([])
  const [editHomework, setEditHomework] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeModalOpen, setRevokeModalOpen] = useState(false)
  // 生成分享图
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const detailImages = detailFeedback?.images || []
  const {
    urls: signedDetailImages,
    error: detailImageError,
    refresh: retryDetailImages,
  } = useSignedUrls(detailImages.map((image) => image.previewUrl || image.thumbnailUrl))
  const { urls: signedComposeImages } = useSignedUrls(composeImages)

  const params = new URLSearchParams({ date, limit: '200' })
  params.set('division', division)
  if (teacherFilter) params.set('teacherId', teacherFilter)
  if (viewAll) params.set('all', '1')
  const { data, isLoading, mutate } = useSWR(`/api/admin/classroom-feedback?${params.toString()}`, fetcher)
  const { data: teachersData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers: Array<{ id: string; name: string; gender?: string | null; avatar?: string | null }> = useMemo(() => Array.isArray(teachersData?.teachers) ? teachersData.teachers : [], [teachersData])

  const feedbacks: AdminFeedback[] = useMemo(() => Array.isArray(data?.feedbacks) ? data.feedbacks : [], [data])
  const allLessons: AdminLesson[] = useMemo(() => Array.isArray(data?.lessons) ? data.lessons : [], [data])
  const missingLessons = allLessons.filter(l => !l.hasFeedback)
  const noFeedback: Array<{ id: string; name: string }> = Array.isArray(data?.teachersWithoutFeedback) ? data.teachersWithoutFeedback : []

  const { data: composeStudentsData } = useSWR(
    composeTeacherId && !composeLessonId ? `/api/students?status=ACTIVE&limit=200&division=${division}` : null,
    fetcher
  )
  const composeStudents: Array<{ id: string; name: string; grade?: string }> = useMemo(() => {
    if (composeLessonId) {
      const lesson = allLessons.find(l => l.id === composeLessonId)
      return lesson?.students || []
    }
    return Array.isArray(composeStudentsData?.students) ? composeStudentsData.students : []
  }, [composeLessonId, allLessons, composeStudentsData])

  const handleLessonChange = (lessonId: string) => {
    setComposeLessonId(lessonId)
    if (lessonId) {
      const lesson = allLessons.find(l => l.id === lessonId)
      if (lesson) {
        setComposeTeacherId(lesson.teacherId)
        composeForm.setFieldsValue({
          teacherId: lesson.teacherId,
          studentIds: lesson.students.map((student) => student.id)
        })
      }
    } else {
      setComposeTeacherId('')
      composeForm.setFieldsValue({ teacherId: undefined, studentIds: [] })
    }
  }

  const handleTeacherChange = (teacherId: string) => {
    setComposeTeacherId(teacherId)
    setComposeLessonId('')
    composeForm.setFieldsValue({ lessonId: undefined, studentIds: [] })
  }

  const openCompose = (teacherId?: string, lessonId?: string) => {
    setComposeOpen(true)
    if (lessonId) {
      handleLessonChange(lessonId)
      composeForm.setFieldValue('lessonId', lessonId)
    } else if (teacherId) {
      handleTeacherChange(teacherId)
      composeForm.setFieldValue('teacherId', teacherId)
    }
  }

  const openDetail = async (feedback: AdminFeedback) => {
    setDetailLoading(true)
    setViewerIndex(null)
    try {
      const response = await fetch(`/api/admin/classroom-feedback/${feedback.id}/detail`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '详情加载失败')
      setDetailFeedback(payload)
      setAdminReply(payload.adminReply || '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '详情加载失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const submitAdminReply = async () => {
    if (!detailFeedback) return
    const reply = adminReply.trim()
    if (!reply) { toast.warning('请输入回复内容'); return }
    setReplying(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailFeedback.id, adminReply: reply }),
      })
      const payload = await response.json()
      if (!response.ok) { toast.error(payload.error || '回复失败'); return }
      setDetailFeedback((current) => current ? { ...current, adminReply: reply } : current)
      toast.success('回复已发送并通知家长')
      await mutate()
    } catch {
      toast.error('回复失败，请稍后重试')
    } finally {
      setReplying(false)
    }
  }

  const openEdit = () => {
    if (!detailFeedback) return
    setEditSummary(detailFeedback.summary || '')
    setEditLessonContent(detailFeedback.lessonContent || '')
    setEditKnowledgePoints(detailFeedback.knowledgePoints || [])
    const hw = formatHomework(detailFeedback.homework)
    setEditHomework(hw.join('\n'))
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!detailFeedback) return
    setSavingEdit(true)
    try {
      const homeworkArr = editHomework.split(/\n+/).map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: detailFeedback.id,
          edits: {
            summary: editSummary,
            lessonContent: editLessonContent,
            knowledgePoints: editKnowledgePoints,
            homework: homeworkArr.map(content => ({ order: 1, content })),
          },
        }),
      })
      const payload = await res.json()
      if (!res.ok) { toast.error(payload.error || '保存失败'); return }
      setDetailFeedback((current) => current ? {
        ...current,
        summary: editSummary || null,
        lessonContent: editLessonContent || null,
        knowledgePoints: editKnowledgePoints,
        homework: homeworkArr.map(content => ({ content })),
      } : current)
      toast.success('反馈内容已更新')
      setEditing(false)
      await mutate()
    } catch {
      toast.error('保存失败，请稍后重试')
    } finally {
      setSavingEdit(false)
    }
  }

  const doRevoke = async () => {
    if (!detailFeedback) return
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/feedback/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: detailFeedback.id, reason: revokeReason || null }),
      })
      const payload = await res.json()
      if (!res.ok) { toast.error(payload.error || '撤销失败'); return }
      toast.success('反馈已撤销，家长端不再可见')
      setRevokeModalOpen(false)
      setDetailFeedback(null)
      await mutate()
    } catch {
      toast.error('撤销失败，请稍后重试')
    } finally {
      setRevoking(false)
    }
  }

  const generateShareImage = async () => {
    if (!detailFeedback || !shareCardRef.current) return
    setGeneratingImage(true)
    try {
      const shareImages = Array.from(shareCardRef.current.querySelectorAll<HTMLImageElement>('img'))
      await Promise.all(shareImages.map(waitForImageReady))
      const { domToPng } = await import('modern-screenshot')
      const dataUrl = await domToPng(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      })
      const link = document.createElement('a')
      const fname = `课堂反馈_${detailFeedback.teacher.name}_${new Date().toISOString().slice(0, 10)}.png`
      link.download = fname
      link.href = dataUrl
      link.click()
      toast.success('分享图已生成并下载')
    } catch (err) {
      console.error('生成分享图失败', err)
      toast.error(err instanceof Error && err.message.startsWith('SHARE_IMAGE_')
        ? '课堂照片加载失败，请稍后重试'
        : '生成分享图失败，请重试')
    } finally {
      setGeneratingImage(false)
    }
  }

  // ========== 老师分块数据 ==========
  const teacherGroups = useMemo(() => {
    const map = new Map<string, { teacherId: string; teacherName: string; items: AdminFeedback[] }>()
    for (const f of feedbacks) {
      const key = f.teacherId || f.teacherName
      if (!map.has(key)) map.set(key, { teacherId: f.teacherId, teacherName: f.teacherName, items: [] })
      map.get(key)!.items.push(f)
    }
    return Array.from(map.values())
  }, [feedbacks])

  // 当前选中的老师（如果有 URL 参数）
  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null
    return teacherGroups.find(g => g.teacherId === selectedTeacherId) || null
  }, [selectedTeacherId, teacherGroups])

  // 当前老师的班级列表
  const teacherClasses = useMemo(() => {
    if (!selectedTeacher) return []
    const set = new Set<string>()
    for (const f of selectedTeacher.items) {
      if (f.classGroupName) set.add(f.classGroupName)
    }
    return Array.from(set)
  }, [selectedTeacher])

  // 当前班级下的反馈
  const filteredFeedbacks = useMemo(() => {
    if (!selectedTeacher) return []
    let items = selectedTeacher.items
    if (selectedClass) items = items.filter(f => f.classGroupName === selectedClass)
    const keyword = q.trim()
    if (keyword) {
      items = items.filter(f =>
        `${f.studentName} ${f.subject} ${f.lessonContent || ''} ${f.summary || ''} ${f.tags.join(' ')}`.includes(keyword)
      )
    }
    return items
  }, [selectedTeacher, selectedClass, q])

  // 切换老师时重置班级筛选
  useEffect(() => { setSelectedClass('') }, [selectedTeacherId])

  const openTeacher = (teacherId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('teacherId', teacherId)
    router.push(`/feedback-performance?${params.toString()}`)
  }
  const backToTeachers = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('teacherId')
    router.push(`/feedback-performance?${params.toString()}`)
  }

  const submitOnBehalf = async (status: 'DRAFT' | 'PUBLISHED') => {
    const values = await composeForm.validateFields().catch(() => null)
    if (!values) return
    if (!composeTeacherId) { toast.error('请选择代发老师'); return }
    if (!values.studentIds?.length) { toast.error('请选择学员'); return }
    if (!values.summary?.trim() && !values.knowledgePoints?.length) { toast.error('请填写评语或知识点'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/classroom-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: composeTeacherId,
          classLessonId: composeLessonId || null,
          studentIds: values.studentIds,
          knowledgePoints: (values.knowledgePoints || []),
          summary: values.summary || '',
          homework: values.homework ? [{ order: 1, content: values.homework }] : [],
          imageUrls: composeImages,
          source: 'admin',
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '提交失败'); return }
      toast.success(status === 'PUBLISHED' ? '已代发并通知家长' : '草稿已保存')
      setComposeOpen(false)
      composeForm.resetFields()
      setComposeImages([])
      setComposeTeacherId('')
      setComposeLessonId('')
      mutate()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout
      title="成长反馈管理"
      subtitle={selectedTeacher ? `${selectedTeacher.teacherName} 的课堂反馈` : "按老师分块查看，点进老师可按班级筛选"}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedTeacher && (
            <Button icon={<ArrowLeftOutlined />} onClick={backToTeachers}>返回全部老师</Button>
          )}
          <Button type="primary" icon={<PlusOutlined />}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600 }}
            onClick={() => openCompose(selectedTeacherId || undefined)}>
            代发反馈
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>
        </div>
      }
    >
      <AdminTeachingRecordSwitcher />

      {/* 顶部统计 */}
       <Card variant="borderless" className={styles.overview} styles={{ body: { padding: 0 } }}>
        <div className={styles.overviewBody}>
          <div className={styles.overviewMetric}>
            <div className={styles.metricIcon}><CheckCircleOutlined /></div>
            <div>
              <div className={styles.metricValue}>{feedbacks.length}</div>
              <div className={styles.metricLabel}>{viewAll ? '历史反馈' : '当日反馈'}</div>
            </div>
          </div>
          <div className={styles.overviewDivider} />
          <div className={styles.overviewMetric}>
            <div className={styles.metricIcon}><TeamOutlined /></div>
            <div>
              <div className={styles.metricValue}>{teacherGroups.length}</div>
              <div className={styles.metricLabel}>已提交反馈老师</div>
            </div>
          </div>
          {!viewAll && noFeedback.length > 0 && (
            <>
              <div className={styles.overviewDivider} />
              <div className={styles.overviewMetric}>
                <div className={styles.metricIcon}><WarningOutlined style={{ color: 'var(--color-warning)' }} /></div>
                <div>
                  <div className={styles.metricValue} style={{ color: 'var(--color-warning)' }}>{noFeedback.length}</div>
                  <div className={styles.metricLabel}>待提交反馈老师</div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 筛选条（仅在一级视图显示） */}
      {!selectedTeacher && (
        <Card variant="borderless" className={styles.filterBar} styles={{ body: { padding: 0 } }}>
          <div className={styles.filterBody}>
            <Segmented
              value={viewAll ? 'history' : 'daily'}
              onChange={(value) => setViewAll(value === 'history')}
              options={[
                { label: '按日查看', value: 'daily', icon: <CalendarOutlined /> },
                { label: '全部历史', value: 'history', icon: <HistoryOutlined /> },
              ]}
            />
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: 150 }} disabled={viewAll} />
          </div>
        </Card>
      )}

      {/* 待提交老师提醒（仅一级视图） */}
      {!selectedTeacher && !viewAll && noFeedback.length > 0 && (
        <Card
          variant="borderless"
          style={{ borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-primary-bg)', marginBottom: 16 }}
          title={<span style={{ color: 'var(--color-ink)', fontSize: 14, fontWeight: 600 }}><WarningOutlined style={{ color: 'var(--color-warning)' }} /> 今日尚未提交反馈</span>}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {noFeedback.map((teacher) => (
              <Button key={teacher.id} size="small" icon={<PlusOutlined />} onClick={() => openCompose(teacher.id)}>
                {teacher.name}补发
              </Button>
            ))}
          </div>
          {missingLessons.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--color-hairline)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>待补发的课次</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {missingLessons.map(lesson => (
                  <Button key={lesson.id} size="small" onClick={() => openCompose(undefined, lesson.id)}>
                    <strong>{lesson.groupName}</strong>
                    <span style={{ color: 'var(--color-ink-muted)' }}>{lesson.teacherName} · {lesson.time}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========== 一级视图：老师卡片网格 ========== */}
      {!selectedTeacher && (
        isLoading ? (
          <CardSkeleton rows={3} />
        ) : teacherGroups.length === 0 && noFeedback.length === 0 ? (
          <div className={styles.emptyState}>
            <InboxOutlined aria-hidden style={{ fontSize: 72, color: 'var(--color-ink-muted)', opacity: 0.35, marginBottom: 16 }} />
            <GuidedEmpty title={viewAll ? '还没有课堂反馈记录' : `${date}没有课堂反馈`} description="教师发布的课堂内容、评价和照片会显示在这里，便于教务检查反馈是否完整。" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {teacherGroups.map((group) => {
              const teacherInfo = teachers.find(t => t.id === group.teacherId)
              return (
                <Card
                  key={group.teacherId}
                  hoverable
                  onClick={() => openTeacher(group.teacherId)}
                  style={{ borderRadius: 14, cursor: 'pointer' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CachedAvatarImage
                      src={getTeacherAvatarUrl(teacherInfo?.avatar, teacherInfo?.gender, teacherInfo?.id ?? group.teacherId)}
                      fallbackSrc={getTeacherAvatarUrl(null, teacherInfo?.gender, teacherInfo?.id ?? group.teacherId)}
                      alt={`${group.teacherName}头像`}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1A1201', marginBottom: 2 }}>{group.teacherName}</div>
                      <div style={{ fontSize: 12, color: '#9A8E7A' }}>今日反馈 {group.items.length} 条</div>
                    </div>
                    <RightOutlined style={{ color: '#CCC', fontSize: 12 }} />
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ========== 二级视图：老师详情（班级 Tab + 反馈卡片） ========== */}
      {selectedTeacher && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 老师信息头 */}
          <Card variant="borderless" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <CachedAvatarImage
                src={getTeacherAvatarUrl(
                  teachers.find((teacher) => teacher.id === selectedTeacher.teacherId)?.avatar,
                  teachers.find((teacher) => teacher.id === selectedTeacher.teacherId)?.gender,
                  selectedTeacher.teacherId,
                )}
                fallbackSrc={getTeacherAvatarUrl(
                  null,
                  teachers.find((teacher) => teacher.id === selectedTeacher.teacherId)?.gender,
                  selectedTeacher.teacherId,
                )}
                alt={`${selectedTeacher.teacherName}头像`}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1201' }}>{selectedTeacher.teacherName}</div>
                <div style={{ fontSize: 12, color: '#9A8E7A' }}>共 {selectedTeacher.items.length} 条反馈 · {teacherClasses.length} 个班级</div>
              </div>
            </div>

            {/* 班级 Tab */}
            {teacherClasses.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #EEE7E1' }}>
                <Button
                  size="small"
                  type={selectedClass === '' ? 'primary' : 'default'}
                  style={selectedClass === '' ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setSelectedClass('')}
                >
                  全部班级
                </Button>
                {teacherClasses.map(cls => (
                  <Button
                    key={cls}
                    size="small"
                    type={selectedClass === cls ? 'primary' : 'default'}
                    style={selectedClass === cls ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                    onClick={() => setSelectedClass(cls)}
                  >
                    {cls}
                  </Button>
                ))}
              </div>
            )}

            {/* 搜索框 */}
            <div style={{ marginTop: 12 }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="搜索反馈内容/学员"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                allowClear
              />
            </div>
          </Card>

          {/* 反馈卡片列表 */}
          {isLoading ? (
            <CardSkeleton rows={3} />
          ) : filteredFeedbacks.length === 0 ? (
            <Card variant="borderless" style={{ borderRadius: 14 }}>
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9A8E7A' }}>
                {selectedClass ? `班级「${selectedClass}」暂无符合条件的反馈` : '暂无符合条件的反馈'}
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredFeedbacks.map(item => (
                <AdminFeedbackRow key={item.id} item={item} onOpen={openDetail} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 课堂反馈详情 - 居中 Modal，家长端预览样式 */}
      <Modal
        open={detailLoading || !!detailFeedback}
        onCancel={() => { setDetailFeedback(null); setAdminReply(''); setViewerIndex(null); setEditing(false) }}
        title={null}
        footer={null}
        centered
        width={isMobile ? '100%' : 820}
        styles={{ body: { padding: 0, maxHeight: '90vh', overflow: 'hidden', borderRadius: 16 } }}
        closeIcon={<div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,.06)', display: 'grid', placeItems: 'center', fontSize: 16 }}>✕</div>}
      >
        {detailLoading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}><Spin size="large" /></div> : detailFeedback && (() => {
          const students = Array.isArray(detailFeedback.students) ? detailFeedback.students : []
          const points = Array.isArray(detailFeedback.knowledgePoints) ? detailFeedback.knowledgePoints : []
          const knowledgeCard = parseStoredKnowledgeCard(detailFeedback.knowledgeCard)
          const homework = formatHomework(detailFeedback.homework)
          const images = detailImages
          const performanceTags = Array.isArray(detailFeedback.tags) ? detailFeedback.tags : []
          const sm = subjectStyle(detailFeedback.subject || '-')
          return (
            <div style={{ maxHeight: '90vh', overflowY: 'auto', background: '#FAF8F5' }}>
              {/* 顶部深绿 Hero 横幅 */}
              <div style={{
                background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 62%,#0B4B40 100%)',
                padding: '24px 24px 20px', color: '#F5F1E8',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{
                    width: 56, height: 56, borderRadius: 16,
                    display: 'grid', placeItems: 'center',
                    background: 'rgba(245,241,232,.15)',
                    fontSize: 22, fontWeight: 800, color: '#F6ECD2',
                  }}>{sm.glyph}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 18, fontWeight: 800, color: '#F6ECD2' }}>{detailFeedback.teacher.name}</strong>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        color: '#F2E3B6', background: 'rgba(201,164,92,.2)', border: '1px solid rgba(201,164,92,.5)',
                      }}>{detailFeedback.subject || '-'}</span>
                      <Badge status={detailFeedback.status === 'PUBLISHED' ? 'success' : 'warning'} text={<span style={{ color: 'rgba(245,241,232,.85)', fontSize: 12 }}>{detailFeedback.status === 'PUBLISHED' ? '已发布' : '草稿'}</span>} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(245,241,232,.75)', lineHeight: 1.5 }}>
                      {[detailFeedback.className, detailFeedback.course].filter(Boolean).join(' · ') || '课堂反馈'}
                    </div>
                  </div>
                  <time style={{ flexShrink: 0, fontSize: 12, color: 'rgba(245,241,232,.65)' }}>
                    {formatFeedbackTime(detailFeedback.createdAt || detailFeedback.date)}
                  </time>
                </div>
              </div>

              {/* 内容区 */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 学员 */}
                {students.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #F0DDD2' }}>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>学员</Typography.Text>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {students.map((student) => (
                        <Tag key={student.id} style={{ borderRadius: 9999, margin: 0 }}>
                          {student.name}{student.grade ? ` · ${student.grade}` : ''}{student.studentRating ? ` · ${String(student.studentRating)}` : ''}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 编辑模式 */}
                {editing ? (
                  <div style={{ background: '#fff', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>课堂小结</Typography.Text>
                      <Input.TextArea rows={4} value={editSummary} onChange={(e) => setEditSummary(e.target.value)}
                        placeholder="本次课程的整体点评" maxLength={400} showCount style={{ borderRadius: 8 }} />
                    </div>
                    <div>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>本节授课内容</Typography.Text>
                      <Input.TextArea rows={4} value={editLessonContent} onChange={(e) => setEditLessonContent(e.target.value)}
                        placeholder="本节授课内容" style={{ borderRadius: 8 }} />
                    </div>
                    <div>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>知识点（回车添加）</Typography.Text>
                      <AdaptiveSelect mode="tags" value={editKnowledgePoints} onChange={(v) => setEditKnowledgePoints(v as string[])}
                        style={{ width: '100%' }} placeholder="输入知识点后回车" />
                    </div>
                    <div>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>作业（每行一条）</Typography.Text>
                      <Input.TextArea rows={3} value={editHomework} onChange={(e) => setEditHomework(e.target.value)}
                        placeholder="每行一条作业" style={{ borderRadius: 8 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                      <Button onClick={() => setEditing(false)}>取消</Button>
                      <Button type="primary" loading={savingEdit} onClick={saveEdit}
                        style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>保存修改</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 知识点 */}
                    {points.length > 0 && (
                      <div style={{ background: '#FFFDF8', borderRadius: 14, padding: 14, border: '1px solid rgba(201,164,92,.3)' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#8A6D3B' }}>本节知识点</Typography.Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {points.map((kp, i) => (
                            <Tag key={i} style={{ borderRadius: 9999, fontSize: 12, margin: 0, border: '1px solid rgba(201,164,92,.4)', color: '#8A6D3B', background: 'rgba(201,164,92,.1)' }}>{kp}</Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 知识点详解 */}
                    {knowledgeCard && <KnowledgePointDetail card={knowledgeCard} audience="parent" defaultOpen />}

                    {/* 课堂照片 */}
                    {images.length > 0 && (
                      <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}><CameraOutlined style={{ marginRight: 6, color: '#C9A45C' }} />课堂照片</Typography.Text>
                        {detailImageError && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, padding: '9px 10px', borderRadius: 8, background: 'var(--color-primary-bg)', color: 'var(--color-ink)', fontSize: 12 }}>
                            <span>图片签名暂时失败，文字仍可正常查看。</span>
                            <Button size="small" icon={<ReloadOutlined />} onClick={retryDetailImages}>重新加载</Button>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {images.map((image, index) => <FeedbackImage key={`${image.originalUrl}-${index}`} src={signedDetailImages[index]} size={96} onClick={() => setViewerIndex(index)} />)}
                        </div>
                      </div>
                    )}

                    {/* 授课内容 */}
                    {detailFeedback.lessonContent && (
                      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>本节授课内容</Typography.Text>
                        <Typography.Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                          {detailFeedback.lessonContent}
                        </Typography.Paragraph>
                      </div>
                    )}

                    {/* 总体评价 */}
                    {detailFeedback.overallComment && (
                      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>总体评价</Typography.Text>
                        <Typography.Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                          {detailFeedback.overallComment}
                        </Typography.Paragraph>
                      </div>
                    )}

                    {/* 课堂小结 */}
                    {detailFeedback.summary && (
                      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>课堂小结</Typography.Text>
                        <Typography.Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                          {detailFeedback.summary}
                        </Typography.Paragraph>
                      </div>
                    )}

                    {/* 作业 */}
                    {homework.length > 0 && (
                      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>作业</Typography.Text>
                        <ol style={{ margin: 0, paddingLeft: 20, color: '#4B5563', fontSize: 14, lineHeight: 1.8 }}>
                          {homework.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                        </ol>
                      </div>
                    )}

                    {/* 课堂表现 */}
                    {performanceTags.length > 0 && (
                      <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #F0DDD2' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>课堂表现</Typography.Text>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {performanceTags.map((tag) => <Tag key={tag} style={{ borderRadius: 9999, margin: 0 }}>{tag}</Tag>)}
                        </div>
                      </div>
                    )}

                    {/* 家长回复 */}
                    {detailFeedback.parentReply && (
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#FFF3E8', border: '1px solid rgba(232,120,74,.2)', lineHeight: 1.7 }}>
                        <strong style={{ color: '#D46B3A' }}>家长回复：</strong>{detailFeedback.parentReply}
                      </div>
                    )}

                    {/* 管理员回复 */}
                    {detailFeedback.adminReply && (
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F0F7F4', border: '1px solid rgba(14,94,78,.2)', lineHeight: 1.7 }}>
                        <strong style={{ color: '#0E5E4E' }}>管理员已回复：</strong>{detailFeedback.adminReply}
                      </div>
                    )}
                  </>
                )}

                {/* 底部操作栏 */}
                {!editing && (
                  <div style={{
                    marginTop: 4, paddingTop: 14, borderTop: '1px solid #E8DFD5',
                    display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button danger onClick={() => setRevokeModalOpen(true)}>撤销反馈</Button>
                      <Button onClick={openEdit}>修改</Button>
                      <Button icon={<ShareAltOutlined />} loading={generatingImage} onClick={generateShareImage}
                        style={{ background: '#0E5E4E', borderColor: '#0E5E4E', color: '#fff' }}>
                        生成分享图
                      </Button>
                    </div>
                    <Button onClick={() => { setDetailFeedback(null); setAdminReply('') }}>关闭</Button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* 隐藏的分享卡（用于生成图片） */}
      {detailFeedback && (() => {
        const shareKnowledgeCard = parseStoredKnowledgeCard(detailFeedback.knowledgeCard)
        return (
        <div style={{ position: 'fixed', left: -9999, top: 0, width: 420, background: '#FAF8F5', fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
          <div ref={shareCardRef} style={{ width: 420, background: '#FAF8F5' }}>
            {/* 顶部品牌区 - logo 铺满 + 文字叠图上 */}
            <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
              {/* logo 铺满 */}
              <img src="/muzhe-logo.jpg" alt="牧哲学堂" style={{
                width: '100%', height: '100%', objectFit: 'cover',
              }} />
              {/* 渐变遮罩让文字可读 */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(14,94,78,.55) 0%, rgba(14,94,78,.35) 50%, rgba(14,94,78,.65) 100%)',
              }} />
              {/* 文字叠在图上（只留副标题，不重复 logo 本身的字） */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 10,
                display: 'flex', justifyContent: 'center', color: '#F6ECD2',
              }}>
                <div style={{
                  fontSize: 13, letterSpacing: 3, padding: '4px 16px',
                  background: 'rgba(14,94,78,.55)', borderRadius: 999,
                  backdropFilter: 'blur(4px)',
                }}>课堂成长反馈</div>
              </div>
            </div>

            {/* 老师信息卡 */}
            <div style={{ padding: '16px 16px 0' }}>
              {(() => {
                const tier = resolveTier(detailFeedback.teacher.tierLevel)
                const tierTheme = TIER_THEME[tier]
                return (
                <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,.05)', border: '1px solid #F0DDD2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CachedAvatarImage
                      src={getTeacherAvatarUrl(detailFeedback.teacher.avatar, detailFeedback.teacher.gender, detailFeedback.teacher.id)}
                      fallbackSrc={getTeacherAvatarUrl(null, detailFeedback.teacher.gender, detailFeedback.teacher.id)}
                      alt={`${detailFeedback.teacher.name}头像`}
                      loading="eager"
                      noCache
                      style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#1A1201', fontSize: 17 }}>{detailFeedback.teacher.name}</span>
                        {/* 等级标签：颜色按 tier */}
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                          background: tierTheme.bg, color: tierTheme.accent,
                          border: `1px solid ${tierTheme.border}`,
                        }}>{tierTheme.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 4 }}>
                        {detailFeedback.subject} 教师 · {detailFeedback.className || ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9A8E7A', textAlign: 'right' }}>
                      <div>{formatFeedbackTime(detailFeedback.createdAt || detailFeedback.date)}</div>
                      {detailFeedback.course && <div style={{ marginTop: 2 }}>{detailFeedback.course}</div>}
                    </div>
                  </div>
                  {/* 学员 */}
                  {detailFeedback.students.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5EFE8' }}>
                      <span style={{ fontSize: 11, color: '#9A8E7A' }}>学员：</span>
                      <span style={{ fontSize: 13, color: '#1A1201', fontWeight: 600 }}>
                        {detailFeedback.students.map(s => `${s.name}${s.grade ? `（${s.grade}）` : ''}`).join('、')}
                      </span>
                    </div>
                  )}
                </div>
                )
              })()}
            </div>

            {/* 知识点标签 */}
            {detailFeedback.knowledgePoints.length > 0 && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#FFFDF8', borderRadius: 12, padding: 14, border: '1px solid rgba(201,164,92,.3)' }}>
                  <div style={{ fontSize: 11, color: '#8A6D3B', marginBottom: 8, fontWeight: 700 }}>本节知识点</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detailFeedback.knowledgePoints.map((kp, i) => (
                      <span key={i} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, background: 'rgba(201,164,92,.15)', color: '#8A6D3B', border: '1px solid rgba(201,164,92,.4)' }}>{kp}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 知识点详解 */}
            {shareKnowledgeCard && (
              <div style={{ padding: '12px 16px 0' }}>
                <KnowledgePointDetail card={shareKnowledgeCard} audience="parent" defaultOpen />
              </div>
            )}

            {/* 授课内容 */}
            {detailFeedback.lessonContent && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                  <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 6, fontWeight: 700 }}>本节授课内容</div>
                  <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailFeedback.lessonContent}</div>
                </div>
              </div>
            )}

            {/* 课堂照片 */}
            {detailFeedback.images && detailFeedback.images.length > 0 && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                  <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 10, fontWeight: 700 }}>课堂照片</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {detailFeedback.images.slice(0, 4).map((img, i) => (
                      <img
                        key={i}
                        data-share-photo
                        src={`/api/admin/classroom-feedback/${encodeURIComponent(detailFeedback.id)}/image?index=${i}`}
                        alt={`课堂照片${i + 1}`}
                        style={{ width: '100%', display: 'block', borderRadius: 8, objectFit: 'cover', aspectRatio: '1' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 总体评价 */}
            {detailFeedback.overallComment && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                  <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 6, fontWeight: 700 }}>总体评价</div>
                  <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailFeedback.overallComment}</div>
                </div>
              </div>
            )}

            {/* 课堂小结（高亮） */}
            {detailFeedback.summary && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#FFF6EF', borderRadius: 12, padding: 16, border: '1px solid rgba(232,120,74,.25)' }}>
                  <div style={{ fontSize: 11, color: '#D46B3A', marginBottom: 6, fontWeight: 700 }}>课堂小结</div>
                  <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailFeedback.summary}</div>
                </div>
              </div>
            )}

            {/* 作业 */}
            {formatHomework(detailFeedback.homework).length > 0 && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #F0DDD2' }}>
                  <div style={{ fontSize: 11, color: '#9A8E7A', marginBottom: 6, fontWeight: 700 }}>作业</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#4B5563', lineHeight: 1.8 }}>
                    {formatHomework(detailFeedback.homework).map((item, i) => <li key={i}>{item}</li>)}
                  </ol>
                </div>
              </div>
            )}

            {/* 底部水印 */}
            <div style={{ textAlign: 'center', padding: '20px 0 18px', fontSize: 11, color: '#B0A898' }}>
              —— 牧哲学堂 · 用心陪伴每一次成长 ——
            </div>
          </div>
        </div>
        )
      })()}

      {viewerIndex !== null && detailImages.length > 0 && (
        <FeedbackImageViewer images={detailImages} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      {/* Compose drawer */}
      <Drawer
        open={composeOpen}
        onClose={() => { setComposeOpen(false); composeForm.resetFields(); setComposeTeacherId(''); setComposeLessonId('') }}
        title="代老师发布成长反馈"
        width={isMobile ? '100%' : 520}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '90vh' : undefined}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => submitOnBehalf('DRAFT')} loading={submitting}>保存草稿</Button>
            <Button type="primary" icon={<SendOutlined />} loading={submitting}
              style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              onClick={() => submitOnBehalf('PUBLISHED')}>
              发布并通知家长
            </Button>
          </div>
        }
        styles={{ body: { paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' } }}
      >
        <Alert
          type="info"
          showIcon
          message="管理端代发不计入教师反馈奖励"
          description="发布后家长看到的内容与教师发布一致，系统会保留管理员代发标记。"
          style={{ marginBottom: 16 }}
        />
        <Form form={composeForm} layout="vertical" size="middle">
          <Form.Item name="lessonId" label="选择关联课次（可选）">
            <AdaptiveSelect
              allowClear
              showSearch={false}
              placeholder="关联具体课次可自动回显老师和学员"
              onChange={handleLessonChange}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={220}
              virtual={false}
              options={allLessons.map(l => ({
                label: `${l.groupName} (${l.teacherName}) ${l.time}`,
                value: l.id,
                disabled: l.hasFeedback
              }))}
            />
          </Form.Item>

          <Form.Item name="teacherId" label="代发老师" required>
            <AdaptiveSelect
              showSearch={false}
              placeholder="选择老师"
              value={composeTeacherId || undefined}
              onChange={handleTeacherChange}
              options={teachers.map((t: { id: string; name: string }) => ({ label: t.name, value: t.id }))}
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={220}
              virtual={false}
            />
          </Form.Item>

          <Form.Item name="studentIds" label={`选择学员${composeStudents.length ? `（${composeStudents.length}位可选）` : ''}`} required>
            <AdaptiveSelect
              mode="multiple"
              showSearch={false}
              placeholder={composeTeacherId ? '选择要反馈的学员' : '请先选择老师或课次'}
              disabled={!composeTeacherId}
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={220}
              virtual={false}
              options={composeStudents.map(s => ({ label: `${s.name}${s.grade ? ` · ${s.grade}` : ''}`, value: s.id }))}
            />
          </Form.Item>

          <Form.Item name="knowledgePoints" label="知识点">
            <AdaptiveSelect mode="tags" placeholder="输入知识点后回车" style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={180}
              virtual={false}
              options={['新知识讲解', '错题订正', '课堂练习', '复习巩固', '测验讲评'].map(v => ({ label: v, value: v }))} />
          </Form.Item>

          <Form.Item name="summary" label="课堂小结/评语">
            <Input.TextArea rows={4} placeholder="本次课程的整体点评，家长将直接看到..." maxLength={400} showCount style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="homework" label="作业布置（可选）">
            <Input placeholder="简要描述本次作业" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item label="课堂资料（可选）">
            {composeImages.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <AntImage.PreviewGroup>
                  {composeImages.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <AntImage src={signedComposeImages[i]} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 6 }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23f5f2ee'/%3E%3Ctext x='30' y='30' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E" />
                      <button onClick={() => setComposeImages(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'grid', placeItems: 'center' }}>×</button>
                    </div>
                  ))}
                </AntImage.PreviewGroup>
              </div>
            )}
            <Upload name="file" action="/api/upload" accept="image/*" multiple maxCount={9} showUploadList={false}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/')) { toast.warning('仅支持图片文件'); return Upload.LIST_IGNORE }
                if (file.size > 5 * 1024 * 1024) { toast.warning('图片大小不能超过 5MB'); return Upload.LIST_IGNORE }
                return true
              }}
              onChange={info => {
                if (info.file.status === 'uploading') return
                if (info.file.status === 'done') {
                  const response = info.file.response as { assetPersisted?: boolean; file?: { storageKey?: string }, url?: string; error?: string }
                  if (response?.assetPersisted === false) {
                    toast.error('图片资产记录失败，请重新上传后再发布反馈')
                    return
                  }
                  const url = response?.file?.storageKey || response?.url
                  const error = response?.error
                  if (url) { setComposeImages(prev => [...prev, url]); toast.success('图片上传成功') }
                  else if (error) toast.error(`图片上传失败：${error}`)
                  else toast.error('上传成功但未返回图片地址')
                } else if (info.file.status === 'error') {
                  toast.error('图片上传失败：网络错误，请重试')
                }
              }}>
              <Button icon={<PlusOutlined />}>上传图片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>
    </PageLayout>
  )
}
