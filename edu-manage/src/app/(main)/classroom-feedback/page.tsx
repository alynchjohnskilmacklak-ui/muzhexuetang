'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Alert, Avatar, Badge, Button, Card, Carousel, Drawer, Form, Input, List, Modal, Segmented, Select, Spin, Tag, Tooltip, Typography, Upload } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, DownloadOutlined, HistoryOutlined, InboxOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SearchOutlined, SendOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons'
import { Image as AntImage } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from 'sonner'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'
import { AdminTeachingRecordSwitcher } from '@/components/study-hall/AdminTeachingRecordSwitcher'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import styles from './classroom-feedback.module.css'

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('加载失败'); return res.json() })
type AdminFeedback = {
  id: string
  studentName: string
  teacherName: string
  lessonContent: string | null
  subject: string
  date: string
  tags: string[]
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
  teacher: { id: string; name: string }
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
      title={<span style={{ color: '#1A1201' }}>课堂资料 <span style={{ color: '#9A8E7A', fontWeight: 400 }}>{current + 1} / {images.length}</span></span>}
    >
      <Carousel key={initialIndex} initialSlide={initialIndex} afterChange={setCurrent} arrows dots={false} swipeToSlide>
        {images.map((image, index) => (
          <div key={`${image.originalUrl}-${index}`}>
            <div style={{ position: 'relative', width: '100%', height: 'min(70vh, 720px)', minHeight: 280, background: '#1A1201' }}>
              <AntImage
                src={signedPreviews[index]}
                alt={`课堂资料 ${index + 1}`}
                width="100%"
                height="min(70vh, 720px)"
                preview={false}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        ))}
      </Carousel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px max(12px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom, 0px))', background: '#FAF8F5' }}>
        <Button type="primary" icon={<DownloadOutlined />} href={downloadHref} disabled={!activeImage?.assetId && originalLoading} target="_blank" rel="noopener noreferrer" style={{ background: '#E8784A', borderColor: '#E8784A' }}>
          下载原图
        </Button>
      </div>
    </Modal>
  )
}

function FeedbackItemCard({ item, onOpen }: { item: AdminFeedback; onOpen: (item: AdminFeedback) => void }) {
  return (
    <List.Item
      className={styles.feedbackItem}
      role="button"
      tabIndex={0}
      aria-label={`查看${item.studentName}的课堂反馈`}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item)
        }
      }}
      actions={[
        <div className={styles.feedbackActions} key="status">
          <Tooltip title={item.hasImage ? '含课堂资料图片' : '无课堂资料图片'}>
            {item.hasImage ? <PictureOutlined aria-label="含图片" style={{ color: 'var(--color-primary)' }} /> : <span />}
          </Tooltip>
          <Badge status={item.status === 'PUBLISHED' ? 'success' : 'warning'} text={item.status === 'PUBLISHED' ? '已发布' : '草稿'} />
          <RightOutlined aria-hidden style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }} />
        </div>,
      ]}
    >
      <List.Item.Meta
        avatar={<Avatar style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 700 }}>{item.studentName.slice(0, 1)}</Avatar>}
        title={
          <div className={styles.feedbackTitle}>
            <span>{item.studentName}</span>
            <span className={styles.feedbackMeta}>{item.teacherName} · {item.subject}</span>
          </div>
        }
        description={
          <div>
            <div className={styles.feedbackMeta}>{formatFeedbackTime(item.date)}</div>
            {item.lessonContent && <Typography.Paragraph ellipsis={{ rows: 2 }} className={styles.feedbackExcerpt}>授课内容：{item.lessonContent}</Typography.Paragraph>}
            {item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {item.tags.map((tag) => <Tag key={tag} bordered={false} color="orange" style={{ margin: 0 }}>{tag}</Tag>)}
              </div>
            )}
          </div>
        }
      />
    </List.Item>
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
  const teachers = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []

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

  const filtered = feedbacks.filter((feedback) => {
    const keyword = q.trim()
    if (!keyword) return true
    return `${feedback.studentName} ${feedback.teacherName} ${feedback.subject} ${feedback.lessonContent || ''} ${feedback.tags.join(' ')}`.includes(keyword)
  })

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
      <AdminTeachingRecordSwitcher />
      <Card bordered={false} className={styles.overview} styles={{ body: { padding: 0 } }}>
        <div className={styles.overviewBody}>
          <div className={styles.overviewMetric}>
            <div className={styles.metricIcon}><CheckCircleOutlined /></div>
            <div>
              <div className={styles.metricValue}>{feedbacks.length}</div>
              <div className={styles.metricLabel}>{viewAll ? '历史反馈' : '当日已反馈'}</div>
            </div>
          </div>
          {!viewAll && (
            <>
              <div className={styles.overviewDivider} />
              <div className={styles.overviewMetric}>
                <div className={styles.metricIcon}><TeamOutlined /></div>
                <div>
                  <div className={styles.metricValue}>{noFeedback.length}</div>
                  <div className={styles.metricLabel}>尚未提交的教师</div>
                </div>
              </div>
            </>
          )}
          <div className={styles.overviewHint}>
            {viewAll ? `当前共显示 ${filtered.length} 条反馈` : noFeedback.length > 0 ? '可直接点击下方教师或课次快速补发' : '今日教学反馈已全部提交'}
          </div>
        </div>
      </Card>

      <Card bordered={false} className={styles.filterBar} styles={{ body: { padding: 0 } }}>
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
            className={styles.searchInput}
          />
        </div>
      </Card>

      {!viewAll && noFeedback.length > 0 && (
        <Card
          bordered={false}
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

      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <InboxOutlined aria-hidden style={{ fontSize: 72, color: 'var(--color-ink-muted)', opacity: 0.35, marginBottom: 16 }} />
          <GuidedEmpty title={viewAll ? '还没有课堂反馈记录' : `${date}没有课堂反馈`} description={viewAll ? '教师发布的课堂内容、评价和照片会显示在这里，便于教务检查反馈是否完整。' : '可以查看全部日期，确认是否已有其他课堂反馈。'} actionLabel={viewAll ? '查看课程管理' : '查看全部反馈'} onAction={() => viewAll ? window.location.assign('/courses') : setViewAll(true)} />
        </div>
      ) : (
        <List
          className={styles.feedbackList}
          dataSource={filtered}
          renderItem={(item) => <FeedbackItemCard key={item.id} item={item} onOpen={openDetail} />}
        />
      )}

      {/* Read-only feedback detail and admin reply */}
      <Drawer
        open={detailLoading || !!detailFeedback}
        onClose={() => { setDetailFeedback(null); setAdminReply(''); setViewerIndex(null) }}
        title="课堂反馈详情"
        width={isMobile ? '100%' : 520}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '90vh' : undefined}
        footer={detailFeedback ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setDetailFeedback(null); setAdminReply('') }}>关闭</Button>
            <Button type="primary" icon={<SendOutlined />} loading={replying} onClick={submitAdminReply}
              style={{ background: '#E8784A', borderColor: '#E8784A' }}>
              发送回复
            </Button>
          </div>
        ) : null}
        styles={{ body: { paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' } }}
      >
        {detailLoading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><Spin size="large" /></div> : detailFeedback && (() => {
          const students = Array.isArray(detailFeedback.students) ? detailFeedback.students : []
          const points = Array.isArray(detailFeedback.knowledgePoints) ? detailFeedback.knowledgePoints : []
          const knowledgeCard = parseStoredKnowledgeCard(detailFeedback.knowledgeCard)
          const homework = formatHomework(detailFeedback.homework)
          const images = detailImages
          const performanceTags = Array.isArray(detailFeedback.tags) ? detailFeedback.tags : []
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.detailHeader}>
                <Avatar size={40} style={{ background: 'var(--color-primary)', fontWeight: 700 }}>{detailFeedback.teacher.name.slice(0, 1)}</Avatar>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--color-ink)' }}>{detailFeedback.teacher.name}</strong>
                    <Badge status={detailFeedback.status === 'PUBLISHED' ? 'success' : 'warning'} text={detailFeedback.status === 'PUBLISHED' ? '已发布' : '草稿'} />
                  </div>
                  <div style={{ marginTop: 3, color: 'var(--color-ink-muted)', fontSize: 13 }}>
                    {detailFeedback.className || '未关联班级'} · {detailFeedback.course || detailFeedback.subject || '课程未填写'}
                  </div>
                  <div style={{ marginTop: 3, color: 'var(--color-ink-subtle)', fontSize: 12 }}>{formatFeedbackTime(detailFeedback.date)}</div>
                </div>
              </div>

              {students.length > 0 && <DetailSection label="学员"><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{students.map((student) => <Tag key={student.id} style={{ borderRadius: 9999, margin: 0 }}>{student.name}{student.grade ? ` · ${student.grade}` : ''}{student.studentRating ? ` · ${String(student.studentRating)}` : ''}</Tag>)}</div></DetailSection>}
              {points.length > 0 && <DetailSection label="知识点"><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{points.map((point) => <Tag key={point} style={{ borderRadius: 9999, margin: 0, background: '#FFF3EC', color: '#E8784A', border: 'none' }}>{point}</Tag>)}</div></DetailSection>}
              {knowledgeCard && (
                <div style={{ marginTop: 2 }}><KnowledgePointDetail card={knowledgeCard} audience="parent" defaultOpen /></div>
              )}
              {(detailFeedback.mood || performanceTags.length > 0 || detailFeedback.badge) && (
                <DetailSection label="课堂表现">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detailFeedback.mood && <Tag style={{ borderRadius: 9999, margin: 0 }}>课堂情绪：{detailFeedback.mood}</Tag>}
                    {performanceTags.map((tag) => <Tag key={tag} style={{ borderRadius: 9999, margin: 0 }}>{tag}</Tag>)}
                    {detailFeedback.badge && <Tag color="gold" style={{ borderRadius: 9999, margin: 0 }}>徽章：{detailFeedback.badge}</Tag>}
                  </div>
                </DetailSection>
              )}
              {detailFeedback.lessonContent && <DetailSection label="本节授课内容"><div style={{ color: '#1A1201', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detailFeedback.lessonContent}</div></DetailSection>}
              {detailFeedback.overallComment && <DetailSection label="总体评价"><div style={{ color: '#1A1201', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detailFeedback.overallComment}</div></DetailSection>}
              {detailFeedback.summary && <DetailSection label="课堂小结"><div style={{ color: '#1A1201', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detailFeedback.summary}</div></DetailSection>}
              {homework.length > 0 && <DetailSection label="作业"><ol style={{ margin: 0, paddingLeft: 20 }}>{homework.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></DetailSection>}
              {images.length > 0 && (
                <DetailSection label="课堂资料（点击预览）">
                  {detailImageError && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, padding: '9px 10px', borderRadius: 8, background: 'var(--color-primary-bg)', color: 'var(--color-ink)', fontSize: 12 }}>
                      <span>图片签名暂时失败，反馈文字仍可正常查看。</span>
                      <Button size="small" icon={<ReloadOutlined />} onClick={retryDetailImages}>重新加载</Button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '100%' }}>
                    {images.map((image, index) => <FeedbackImage key={`${image.originalUrl}-${index}`} src={signedDetailImages[index]} size={72} onClick={() => setViewerIndex(index)} />)}
                  </div>
                </DetailSection>
              )}

              {detailFeedback.parentReply && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-success-bg)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)', lineHeight: 1.7 }}>
                  <strong>家长回复：</strong>{detailFeedback.parentReply}
                </div>
              )}
              {detailFeedback.adminReply && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-primary-bg)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)', lineHeight: 1.7 }}>
                  <strong>管理员已回复：</strong>{detailFeedback.adminReply}
                </div>
              )}
              {detailFeedback.parentMessages.flatMap((message) => message.replies).length > 0 && (
                <DetailSection label="家校留言">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailFeedback.parentMessages.flatMap((message) => message.replies).map((reply) => (
                      <div key={reply.id}>
                        <strong>{reply.authorName}</strong>
                        <span style={{ marginLeft: 8, color: '#9A8E7A', fontSize: 11 }}>{formatFeedbackTime(reply.createdAt)}</span>
                        <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{reply.content}</div>
                      </div>
                    ))}
                  </div>
                </DetailSection>
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
        <Alert
          type="info"
          showIcon
          message="管理端代发不计入教师反馈奖励"
          description="发布后家长看到的内容与教师发布一致，系统会保留管理员代发标记。"
          style={{ marginBottom: 16 }}
        />
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
