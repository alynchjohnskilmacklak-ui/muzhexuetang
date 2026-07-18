'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Carousel, Col, Drawer, Empty, Form, Input, Modal, Row, Select, Spin, Tag, Upload } from 'antd'
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SendOutlined, WarningOutlined } from '@ant-design/icons'
import { Image as AntImage } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from 'sonner'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import Image from 'next/image'

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('加载失败'); return res.json() })

type AdminFeedback = {
  id: string
  teacherName: string
  lessonName?: string
  courseName?: string
  subject?: string
  status: string
  students?: Array<{ id: string; name: string; grade?: string | null }>
  knowledgePoints?: string[]
  summary?: string | null
  homework?: unknown
  imageUrls?: string[]
  images?: AdminFeedbackImage[]
  parentReply?: string | null
  parentRepliedAt?: string | null
  adminReply?: string | null
  adminRepliedAt?: string | null
  mood?: string | null
  tags?: string[]
  badge?: string | null
  createdAt: string
}

type AdminFeedbackImage = {
  assetId: string | null
  originalUrl: string
  previewUrl: string
  thumbnailUrl: string
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
        <Image src={src} alt="课堂资料" fill sizes={`${size}px`} loading="lazy" unoptimized style={{ objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity .2s ease' }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
    </button>
  )
}

function FeedbackImageViewer({ images, initialIndex, onClose }: { images: AdminFeedbackImage[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex)
  const { urls: signedPreviews } = useSignedUrls(images.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl))
  const { urls: signedOriginals, loading: originalsLoading } = useSignedUrls(images.map((image) => image.originalUrl))
  const activeImage = images[current]
  const downloadHref = activeImage?.assetId
    ? `/api/admin/classroom-feedback/image-download?assetId=${encodeURIComponent(activeImage.assetId)}`
    : signedOriginals[current]

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width="min(960px, 100vw)"
      centered
      styles={{ body: { padding: 0, maxWidth: '100%', overflow: 'hidden' } }}
      title={<span style={{ color: '#1A1201' }}>课堂资料 <span style={{ color: '#9A8E7A', fontWeight: 400 }}>{current + 1} / {images.length}</span></span>}
    >
      <Carousel key={initialIndex} initialSlide={initialIndex} afterChange={setCurrent} arrows dots={false} swipeToSlide>
        {images.map((image, index) => (
          <div key={`${image.originalUrl}-${index}`}>
            <div style={{ position: 'relative', width: '100%', height: 'min(70vh, 720px)', minHeight: 280, background: '#1A1201' }}>
              <Image
                src={signedPreviews[index]}
                alt={`课堂资料 ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 960px"
                unoptimized
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        ))}
      </Carousel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px max(12px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom, 0px))', background: '#FAF8F5' }}>
        <Button type="primary" icon={<DownloadOutlined />} href={downloadHref} disabled={!activeImage?.assetId && originalsLoading} target="_blank" rel="noopener noreferrer" style={{ background: '#E8784A', borderColor: '#E8784A' }}>
          下载原图
        </Button>
      </div>
    </Modal>
  )
}

function FeedbackItemCard({ item, onOpen, signedThumbnailMap }: { item: AdminFeedback; onOpen: (item: AdminFeedback) => void; signedThumbnailMap: Map<string, string> }) {
  const students = Array.isArray(item.students) ? item.students : []
  const points = Array.isArray(item.knowledgePoints) ? item.knowledgePoints : []
  const originalImages = Array.isArray(item.imageUrls) ? item.imageUrls : []
  const images = Array.isArray(item.images) && item.images.length === originalImages.length
    ? item.images
    : originalImages.map((url) => ({ assetId: null, originalUrl: url, previewUrl: url, thumbnailUrl: url }))
  const thumbnails = images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl)
  const homework = formatHomework(item.homework)
  const performanceTags = Array.isArray(item.tags) ? item.tags : []
  return (
    <Card className="pressable" onClick={() => onOpen(item)} bordered={false} style={{ borderRadius: 10, border: '1px solid #EEE7E1', background: '#fff', cursor: 'pointer' }} styles={{ body: { padding: '12px 14px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1F2329' }}>{item.teacherName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color={item.status === 'PUBLISHED' ? 'green' : 'orange'} style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
            {item.status === 'PUBLISHED' ? '已发布' : '草稿'}
          </Tag>
          {item.parentReply && <Tag color="green" style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>家长已回复</Tag>}
          {item.adminReply && <Tag color="orange" style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>管理员已回复</Tag>}
          <span style={{ fontSize: 11, color: '#C4BAB0' }}>
            {new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      {students.length > 0 && (
        <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {students.map(s => <Tag key={s.id} style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}>{s.name}{s.grade ? ` · ${s.grade}` : ''}</Tag>)}
        </div>
      )}
      {points.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {points.map(p => <Tag key={p} style={{ borderRadius: 9999, fontSize: 11, background: '#FFF3EC', color: '#E8784A', border: 'none', margin: '0 3px 2px 0' }}>{p}</Tag>)}
        </div>
      )}
      {(item.mood || performanceTags.length > 0 || item.badge) && (
        <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {item.mood && <Tag style={{ borderRadius: 9999, margin: 0, background: '#F5F2EE', color: '#5A4E3A' }}>课堂情绪：{item.mood}</Tag>}
          {performanceTags.map((tag) => <Tag key={tag} style={{ borderRadius: 9999, margin: 0 }}>{tag}</Tag>)}
          {item.badge && <Tag color="gold" style={{ borderRadius: 9999, margin: 0 }}>徽章：{item.badge}</Tag>}
        </div>
      )}
      {item.summary && (
        <div style={{ padding: '6px 10px', background: '#FCFBF9', borderRadius: 6, borderLeft: '3px solid #E8784A', fontSize: 13, color: '#1F2329', lineHeight: 1.6 }}>
          {item.summary}
        </div>
      )}
      {homework.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, color: '#98A2B3' }}>
          作业 {homework.length} 项
        </div>
      )}
      {images.length > 0 && (
        <div onClick={(event) => event.stopPropagation()} style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          {images.slice(0, 4).map((image, i) => (
            <FeedbackImage key={`${image.originalUrl}-${i}`} src={signedThumbnailMap.get(thumbnails[i]) || thumbnails[i]} size={48} />
          ))}
          {images.length > 4 && <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f2ee', display: 'grid', placeItems: 'center', fontSize: 11, color: '#98A2B3' }}>+{images.length - 4}</div>}
        </div>
      )}
      {item.parentReply && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#EAF7F1', border: '1px solid #B6E2D2', color: '#176C53', fontSize: 12, lineHeight: 1.6 }}>
          <strong>家长回复：</strong>{item.parentReply}{item.parentRepliedAt ? ` · ${formatFeedbackTime(item.parentRepliedAt)}` : ''}
        </div>
      )}
    </Card>
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
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [q, setQ] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const groupByClass = true

  // Compose drawer state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm] = Form.useForm()
  const [composeImages, setComposeImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [composeTeacherId, setComposeTeacherId] = useState('')
  const [composeLessonId, setComposeLessonId] = useState('')
  const [detailFeedback, setDetailFeedback] = useState<AdminFeedback | null>(null)
  const [adminReply, setAdminReply] = useState('')
  const [replying, setReplying] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const detailOriginalImages = Array.isArray(detailFeedback?.imageUrls) ? detailFeedback.imageUrls : []
  const detailImages: AdminFeedbackImage[] = Array.isArray(detailFeedback?.images) && detailFeedback.images.length === detailOriginalImages.length
    ? detailFeedback.images
    : detailOriginalImages.map((url) => ({ assetId: null, originalUrl: url, previewUrl: url, thumbnailUrl: url }))
  const { urls: signedDetailImages } = useSignedUrls(detailImages.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const { urls: signedComposeImages } = useSignedUrls(composeImages)

  const params = new URLSearchParams({ date, limit: '200' })
  params.set('division', division)
  if (teacherFilter) params.set('teacherId', teacherFilter)
  if (viewAll) params.set('all', '1')
  const { data, isLoading, mutate } = useSWR(`/api/admin/classroom-feedback?${params.toString()}`, fetcher)
  const { data: teachersData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []

  const feedbacks: AdminFeedback[] = useMemo(() => Array.isArray(data?.feedbacks) ? data.feedbacks : [], [data])
  const listThumbnailKeys = useMemo(() => feedbacks.flatMap((feedback) => {
    const originals = Array.isArray(feedback.imageUrls) ? feedback.imageUrls : []
    const images = Array.isArray(feedback.images) && feedback.images.length === originals.length
      ? feedback.images
      : originals.map((url) => ({ assetId: null, originalUrl: url, previewUrl: url, thumbnailUrl: url }))
    return images.slice(0, 4).map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl)
  }), [feedbacks])
  const { urls: signedListThumbnails } = useSignedUrls(listThumbnailKeys)
  const signedThumbnailMap = useMemo(
    () => new Map(listThumbnailKeys.map((key, index) => [key, signedListThumbnails[index]])),
    [listThumbnailKeys, signedListThumbnails],
  )
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

  const openDetail = (feedback: AdminFeedback) => {
    setDetailFeedback(feedback)
    setAdminReply(feedback.adminReply || '')
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
      const repliedAt = new Date().toISOString()
      setDetailFeedback((current) => current ? { ...current, adminReply: reply, adminRepliedAt: repliedAt } : current)
      toast.success('回复已发送并通知家长')
      await mutate()
    } catch {
      toast.error('回复失败，请稍后重试')
    } finally {
      setReplying(false)
    }
  }

  const filtered = feedbacks.filter((feedback) => {
    const keyword = q.trim()
    if (!keyword) return true
    return `${feedback.teacherName} ${feedback.lessonName || ''} ${feedback.courseName || ''} ${feedback.summary || ''}`.includes(keyword)
      || feedback.students?.some((student) => student.name.includes(keyword))
      || feedback.knowledgePoints?.some((point) => point.includes(keyword))
  })

  const groupedByClass = useMemo(() => {
    if (!groupByClass) return null
    const groups = new Map<string, { className: string; subject: string; items: AdminFeedback[] }>()
    filtered.forEach(item => {
      const key = item.lessonName || item.courseName || '未关联班级'
      const existing = groups.get(key)
      if (existing) {
        existing.items.push(item)
      } else {
        groups.set(key, { className: key, subject: item.subject || '-', items: [item] })
      }
    })
    return Array.from(groups.values()).sort((a, b) => a.className.localeCompare(b.className))
  }, [filtered, groupByClass])

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
      subtitle="查看所有老师的反馈，可为家长回复或替老师补发（不计薪资）"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />}
            style={{ background: '#E8784A', borderColor: '#E8784A', fontWeight: 600 }}
            onClick={() => openCompose()}>
            代发反馈
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>
        </div>
      }
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: 'linear-gradient(135deg,#fff3ec,#fff)', border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 4 }}>今日已反馈</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1D9E75' }}>{feedbacks.length}</div>
          </Card>
        </Col>
        {!viewAll && (
          <Col xs={12} sm={8} md={6}>
            <Card bordered={false} style={{ borderRadius: 10, background: 'linear-gradient(135deg,#fff7ed,#fff)', border: '1px solid #FED7AA' }}>
              <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 4 }}>未反馈老师</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: noFeedback.length > 0 ? '#E87545' : '#1D9E75' }}>{noFeedback.length}</div>
            </Card>
          </Col>
        )}
      </Row>

      <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #EEE7E1', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: 150 }} disabled={viewAll} />
          <Select
            allowClear
            showSearch={false}
            placeholder="按教师筛选"
            style={{ width: 150 }}
            value={teacherFilter || undefined}
            onChange={(value) => setTeacherFilter(value || '')}
            options={teachers.map((teacher: { id: string; name: string }) => ({ label: teacher.name, value: teacher.id }))}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={220}
            virtual={false}
          />
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索内容/学员"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{ width: isMobile ? '100%' : 280 }}
          />
          <Button
            onClick={() => setViewAll((value) => !value)}
          >
            {viewAll ? '恢复按日查看' : '查看全部历史'}
          </Button>
        </div>
      </Card>

      {!viewAll && noFeedback.length > 0 && (
        <Card
          bordered={false}
          style={{ borderRadius: 10, border: '1.5px solid #FED7AA', background: '#FFFBF5', marginBottom: 16 }}
          title={<span style={{ color: '#D97706', fontSize: 14, fontWeight: 600 }}><WarningOutlined /> 今日尚未提交反馈</span>}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {noFeedback.map((teacher) => (
              <Tag 
                key={teacher.id} 
                color="orange" 
                style={{ borderRadius: 9999, cursor: 'pointer', padding: '2px 10px' }}
                onClick={() => openCompose(teacher.id)}
              >
                {teacher.name}
              </Tag>
            ))}
          </div>
          {missingLessons.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px dashed #FED7AA', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: '#9A8E7A', marginBottom: 8 }}>待补发的课次：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {missingLessons.map(lesson => (
                  <Tag 
                    key={lesson.id} 
                    style={{ borderRadius: 6, cursor: 'pointer', padding: '4px 8px', background: '#fff' }}
                    onClick={() => openCompose(undefined, lesson.id)}
                  >
                    <span style={{ color: '#E8784A', fontWeight: 600 }}>{lesson.groupName}</span>
                    <span style={{ margin: '0 4px', color: '#ccc' }}>|</span>
                    <span style={{ color: '#5a4e3a' }}>{lesson.teacherName}</span>
                    <span style={{ marginLeft: 6, color: '#98A2B3', fontSize: 11 }}>{lesson.time}</span>
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1' }}>
          <img src="/images/empty-box.png" alt="" style={{ width: 120, opacity: 0.5, marginBottom: 16 }} />
          <Empty description={viewAll ? '暂无反馈记录' : `${date} 暂无课堂反馈`} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Feedbacks listed by class or time */}
          {groupByClass && groupedByClass ? (
            groupedByClass.map(group => (
              <div key={group.className}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, background: '#E8784A', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1F2329' }}>{group.className}</span>
                  <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 9999, background: '#FFF3EC', color: '#E8784A' }}>
                    {group.subject}
                  </span>
                  <span style={{ fontSize: 12, color: '#98A2B3' }}>{group.items.length} 条反馈</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 14, borderLeft: '2px solid #F5EDE8' }}>
                  {group.items.map(item => <FeedbackItemCard key={item.id} item={item} onOpen={openDetail} signedThumbnailMap={signedThumbnailMap} />)}
                </div>
              </div>
            ))
          ) : (
            filtered.map(item => <FeedbackItemCard key={item.id} item={item} onOpen={openDetail} signedThumbnailMap={signedThumbnailMap} />)
          )}
        </div>
      )}

      {/* Read-only feedback detail and admin reply */}
      <Drawer
        open={!!detailFeedback}
        onClose={() => { setDetailFeedback(null); setAdminReply(''); setViewerIndex(null) }}
        title="课堂反馈详情"
        width={isMobile ? '100%' : 520}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '90vh' : undefined}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setDetailFeedback(null); setAdminReply('') }}>关闭</Button>
            <Button type="primary" icon={<SendOutlined />} loading={replying} onClick={submitAdminReply}
              style={{ background: '#E8784A', borderColor: '#E8784A' }}>
              发送回复
            </Button>
          </div>
        }
        styles={{ body: { paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' } }}
      >
        {detailFeedback && (() => {
          const students = Array.isArray(detailFeedback.students) ? detailFeedback.students : []
          const points = Array.isArray(detailFeedback.knowledgePoints) ? detailFeedback.knowledgePoints : []
          const homework = formatHomework(detailFeedback.homework)
          const images = detailImages
          const performanceTags = Array.isArray(detailFeedback.tags) ? detailFeedback.tags : []
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FAF8F5', border: '1px solid #EEE7E1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#1A1201' }}>{detailFeedback.teacherName}</strong>
                  <span style={{ color: '#9A8E7A', fontSize: 12 }}>{formatFeedbackTime(detailFeedback.createdAt)}</span>
                </div>
                <div style={{ marginTop: 4, color: '#5A4E3A', fontSize: 13 }}>
                  {detailFeedback.lessonName || '未关联课次'} · {detailFeedback.courseName || detailFeedback.subject || '课程未填写'}
                </div>
              </div>

              {students.length > 0 && <DetailSection label="学员"><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{students.map((student) => <Tag key={student.id} style={{ borderRadius: 9999, margin: 0 }}>{student.name}{student.grade ? ` · ${student.grade}` : ''}</Tag>)}</div></DetailSection>}
              {points.length > 0 && <DetailSection label="知识点"><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{points.map((point) => <Tag key={point} style={{ borderRadius: 9999, margin: 0, background: '#FFF3EC', color: '#E8784A', border: 'none' }}>{point}</Tag>)}</div></DetailSection>}
              {(detailFeedback.mood || performanceTags.length > 0 || detailFeedback.badge) && (
                <DetailSection label="课堂表现">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detailFeedback.mood && <Tag style={{ borderRadius: 9999, margin: 0 }}>课堂情绪：{detailFeedback.mood}</Tag>}
                    {performanceTags.map((tag) => <Tag key={tag} style={{ borderRadius: 9999, margin: 0 }}>{tag}</Tag>)}
                    {detailFeedback.badge && <Tag color="gold" style={{ borderRadius: 9999, margin: 0 }}>徽章：{detailFeedback.badge}</Tag>}
                  </div>
                </DetailSection>
              )}
              {detailFeedback.summary && <DetailSection label="课堂小结"><div style={{ color: '#1A1201', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detailFeedback.summary}</div></DetailSection>}
              {homework.length > 0 && <DetailSection label="作业"><ol style={{ margin: 0, paddingLeft: 20 }}>{homework.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></DetailSection>}
              {images.length > 0 && <DetailSection label="课堂资料（点击预览）"><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '100%' }}>{images.map((image, index) => <FeedbackImage key={`${image.originalUrl}-${index}`} src={signedDetailImages[index]} size={72} onClick={() => setViewerIndex(index)} />)}</div></DetailSection>}

              {detailFeedback.parentReply && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#EAF7F1', border: '1px solid #B6E2D2', color: '#176C53', lineHeight: 1.7 }}>
                  <strong>家长回复：</strong>{detailFeedback.parentReply}
                  {detailFeedback.parentRepliedAt && <div style={{ fontSize: 11, opacity: 0.75 }}>{formatFeedbackTime(detailFeedback.parentRepliedAt)}</div>}
                </div>
              )}
              {detailFeedback.adminReply && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFF3EC', border: '1px solid #FFD9BF', color: '#B85D32', lineHeight: 1.7 }}>
                  <strong>管理员已回复：</strong>{detailFeedback.adminReply}
                  {detailFeedback.adminRepliedAt && <div style={{ fontSize: 11, opacity: 0.75 }}>{formatFeedbackTime(detailFeedback.adminRepliedAt)}</div>}
                </div>
              )}

              <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 14 }}>
                <div style={{ fontWeight: 600, color: '#1A1201', marginBottom: 8 }}>管理员回复家长</div>
                <Input.TextArea rows={4} value={adminReply} onChange={(event) => setAdminReply(event.target.value)} maxLength={300} showCount placeholder="请输入给家长的回复内容" style={{ borderRadius: 8 }} />
              </div>
            </div>
          )
        })()}
      </Drawer>

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
              style={{ background: '#E8784A', borderColor: '#E8784A' }}
              onClick={() => submitOnBehalf('PUBLISHED')}>
              发布并通知家长
            </Button>
          </div>
        }
        styles={{ body: { paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' } }}
      >
        <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 12, padding: '6px 10px', background: '#FFF3EC', borderRadius: 6, border: '1px solid #FFD9BF' }}>
          管理端代发反馈标记为 source=admin，不计入教师薪资奖励
        </div>
        <Form form={composeForm} layout="vertical" size="middle">
          <Form.Item name="lessonId" label="选择关联课次（可选）">
            <Select
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
            <Select
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
            <Select
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
            <Select mode="tags" placeholder="输入知识点后回车" style={{ width: '100%' }}
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
