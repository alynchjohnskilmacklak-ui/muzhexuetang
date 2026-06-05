'use client'

import { Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Card, Empty, Input, List, message, Rate, Select, Space, Tag, Typography, Upload } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, HolderOutlined, PlusOutlined, SaveOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons'
import { MobileSelect } from '@/components/MobileSelect'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const { TextArea } = Input
const { Dragger } = Upload
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const DEFAULT_POINTS = ['新知识讲解', '错题订正', '课堂练习', '阅读理解', '计算训练', '解题方法', '复习巩固', '测验讲评']
const FILE_TYPES = ['练习题', '板书', '作业', '试卷']

type HomeworkItem = { id: string; order: number; content: string }
type LessonStudent = {
  id: string
  name?: string | null
  grade?: string | null
}
type TeacherLesson = {
  id: string
  lessonDate: string | Date
  startTime?: string
  courseType?: string
  oneOnOneStudentName?: string
  groupName?: string
  subject?: string
  courseName?: string
  studentCount?: number
  students?: LessonStudent[]
}
type FeedbackHistoryItem = {
  id: string
  createdAt: string | Date
  status?: string
  knowledgePoints?: string[]
  homework?: unknown[]
  imageUrls?: string[]
  summary?: string | null
  classLesson?: { group?: { name?: string | null } | null } | null
}
type ViewFeedback = {
  id: string
  lessonName?: string
  lessonDate?: string | null
  lessonTime?: string | null
  knowledgePoints?: string[]
  summary?: string | null
  homework?: unknown
  imageUrls?: string[]
  students?: LessonStudent[]
  createdAt?: string
}
type UploadRequest = {
  file: unknown
  onSuccess?: (body?: unknown) => void
  onError?: (error: Error) => void
  onProgress?: (event: { percent: number }) => void
}

function createHomeworkId() {
  return `homework-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function SortableHomework({ item, onChange, onRemove, isMobile = false }: { item: HomeworkItem; onChange: (value: string) => void; onRemove: () => void; isMobile?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'grid', gridTemplateColumns: isMobile ? '32px minmax(0, 1fr) 36px' : '28px 1fr 36px', gap: 8, alignItems: 'center' }}>
      <Button size="small" icon={<HolderOutlined />} {...attributes} {...listeners} />
      <Input value={item.content} onChange={(event) => onChange(event.target.value)} placeholder={`作业${item.order}描述`} style={{ minWidth: 0 }} />
      <Button danger size="small" icon={<DeleteOutlined />} onClick={onRemove} />
    </div>
  )
}

function ClassroomFeedbackPageInner() {
  const isMobile = useIsMobile() ?? false
  const searchParams = useSearchParams()
  const router = useRouter()
  const preselectStudentId = searchParams.get('studentId') || ''
  const preselectLessonId = searchParams.get('lessonId') || ''
  const viewId = searchParams.get('viewId') || ''
  const { data: allLessons = [] } = useSWR('/api/teacher/lessons?days=30', fetcher)
  const { data: subjects = [] } = useSWR('/api/settings/subjects', fetcher)
  const { data: history, mutate } = useSWR('/api/teacher/classroom-feedback?limit=10', fetcher)
  const { data: viewFeedbackData } = useSWR<ViewFeedback>(viewId ? `/api/teacher/classroom-feedback/${viewId}` : null, fetcher)
  const [classLessonId, setClassLessonId] = useState(preselectLessonId)
  const [targetType, setTargetType] = useState<'CLASS' | 'STUDENT'>(preselectStudentId ? 'STUDENT' : 'CLASS')
  const [studentIds, setStudentIds] = useState<string[]>(preselectStudentId ? [preselectStudentId] : [])
  const [knowledgePoints, setKnowledgePoints] = useState<string[]>([])
  const [customPoint, setCustomPoint] = useState('')
  const [summary, setSummary] = useState('')
  const [homework, setHomework] = useState<HomeworkItem[]>([{ id: 'homework-1', order: 1, content: '' }])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageTypes, setImageTypes] = useState<Record<string, string>>({})
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [publishDone, setPublishDone] = useState(false)

  const lessonGroups = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(todayStart.getDate() + 1)
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - todayStart.getDay() + (todayStart.getDay() === 0 ? -6 : 1))

    const lessons = (Array.isArray(allLessons) ? allLessons : []) as TeacherLesson[]
    const sorted = [...lessons].sort((a, b) =>
      new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime()
      || String(b.startTime || '').localeCompare(String(a.startTime || ''))
    )
    const toOption = (lesson: TeacherLesson) => {
      const isSmall = lesson.courseType === 'ONE_ON_ONE' || lesson.courseType === 'SMALL_GROUP'
      const typeLabel = lesson.courseType === 'ONE_ON_ONE' ? '一对一' : lesson.courseType === 'SMALL_GROUP' ? '小组课' : '班课'
      const dateLabel = new Date(lesson.lessonDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      const title = isSmall
        ? `【${typeLabel}】${lesson.oneOnOneStudentName || lesson.groupName} · ${lesson.subject || lesson.courseName} · ${dateLabel} ${lesson.startTime}`
        : `【班课】${lesson.groupName} · ${lesson.subject || lesson.courseName} · ${dateLabel} ${lesson.startTime} (${lesson.studentCount || 0}人)`
      return { label: title, value: lesson.id, lesson }
    }

    const todays = sorted.filter((lesson) => {
      const date = new Date(lesson.lessonDate)
      return date >= todayStart && date < tomorrowStart
    })
    const weeks = sorted.filter((lesson) => {
      const date = new Date(lesson.lessonDate)
      return date >= weekStart && date < todayStart
    })
    const older = sorted.filter((lesson) => new Date(lesson.lessonDate) < weekStart)

    return [
      ...(todays.length ? [{ label: '今日课次', options: todays.map(toOption) }] : []),
      ...(weeks.length ? [{ label: '本周课次', options: weeks.map(toOption) }] : []),
      ...(older.length ? [{ label: '历史课次', options: older.map(toOption) }] : []),
    ]
  }, [allLessons])

  const selectedLesson = ((Array.isArray(allLessons) ? allLessons : []) as TeacherLesson[]).find((lesson) => lesson.id === classLessonId)
  const students = selectedLesson?.students || []
  const pointOptions = useMemo(() => {
    const names = Array.isArray(subjects)
      ? subjects.map((item: { name?: string }) => item.name).filter((name): name is string => !!name)
      : []
    return Array.from(new Set([...names, ...DEFAULT_POINTS]))
  }, [subjects])

  const togglePoint = (point: string) => {
    setKnowledgePoints((current) => {
      if (current.includes(point)) return current.filter((item) => item !== point)
      if (current.length >= 10) {
        message.warning('知识点最多选择10个')
        return current
      }
      return [...current, point]
    })
  }

  const addCustomPoint = () => {
    const value = customPoint.trim()
    if (!value) return
    togglePoint(value)
    setCustomPoint('')
  }

  const handleUploadFile = async ({ file, onSuccess, onError, onProgress }: UploadRequest) => {
    if (!(file instanceof File)) {
      onError?.(new Error('无效文件'))
      return
    }
    if (!file.type.startsWith('image/')) {
      message.error('只支持上传图片格式（jpg/png/webp 等）', 3)
      onError?.(new Error('非图片文件'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片不能超过 10 MB', 3)
      onError?.(new Error('文件过大'))
      return
    }

    try {
      onProgress?.({ percent: 30 })
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      const url: string = data.url || data.data?.url || ''
      if (!res.ok || !url) throw new Error(data.error || '上传失败')
      onProgress?.({ percent: 100 })
      const normalized = normalizeUploadUrl(url)
      setImageUrls((current) => [...current, normalized].slice(0, 9))
      setImageTypes((current) => ({ ...current, [normalized]: FILE_TYPES[0] }))
      onSuccess?.({ url: normalized })
      message.success('图片上传成功', 2)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败，请重试', 3)
      onError?.(error instanceof Error ? error : new Error('上传失败'))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setHomework((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      return arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index + 1 }))
    })
  }

  const save = async (status: 'DRAFT' | 'PUBLISHED') => {
    setSaving(true)
    setPublishDone(false)
    if (status === 'PUBLISHED' && !classLessonId) {
      message.warning('发布前请先选择关联课次，否则无法正确结算反馈奖励')
      setSaving(false)
      return
    }
    const payload = {
      classLessonId,
      targetType,
      studentIds: targetType === 'CLASS' ? students.map((student) => student.id) : studentIds,
      knowledgePoints,
      summary,
      homework: homework.filter((item) => item.content.trim()).map(({ order, content }) => ({ order, content })),
      imageUrls,
      imageTypes,
      studentRatings: ratings,
      status,
    }
    const res = await fetch('/api/teacher/classroom-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(data.error || '保存失败')
      setSaving(false)
      return
    }
    if (status === 'PUBLISHED') {
      setPublishDone(true)
      message.success('已发布并同步家长通知', 3)
      setTimeout(() => setPublishDone(false), 3000)
    } else {
      message.success('草稿已保存')
    }
    mutate()
    setSaving(false)
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>课堂反馈</Title>
      {viewFeedbackData && (
        <Card
          bordered={false}
          style={{
            background: '#FCFBF9',
            border: '1.5px solid rgba(232,120,74,.2)',
            borderRadius: 12,
            marginBottom: 20,
          }}
          bodyStyle={{ padding: isMobile ? 14 : '16px 18px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2329' }}>{viewFeedbackData.lessonName || '课堂反馈'}</span>
              {viewFeedbackData.lessonDate && (
                <span style={{ fontSize: 12, color: '#98A2B3', marginLeft: 8 }}>
                  {new Date(viewFeedbackData.lessonDate).toLocaleDateString('zh-CN')}
                  {viewFeedbackData.lessonTime ? ` ${viewFeedbackData.lessonTime}` : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => router.replace('/teacher/classroom-feedback')}
              aria-label="关闭反馈详情"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          {viewFeedbackData.summary && (
            <p style={{ fontSize: 13, color: '#1F2329', marginBottom: 10, lineHeight: 1.7 }}>{viewFeedbackData.summary}</p>
          )}
          {!!viewFeedbackData.knowledgePoints?.length && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#98A2B3' }}>知识点：</span>
              {viewFeedbackData.knowledgePoints.map((point) => (
                <Tag key={point} style={{ borderRadius: 9999, background: '#FFF3EC', color: '#E8784A', border: 'none' }}>{point}</Tag>
              ))}
            </div>
          )}
          {!!viewFeedbackData.students?.length && (
            <div>
              <span style={{ fontSize: 12, color: '#98A2B3' }}>反馈学员：</span>
              {viewFeedbackData.students.map((student) => (
                <Tag key={student.id} style={{ borderRadius: 9999 }}>{student.name}{student.grade ? ` · ${student.grade}` : ''}</Tag>
              ))}
            </div>
          )}
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(520px, 1fr) 360px', gap: 16, alignItems: 'start' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="基本信息" bordered={false} style={{ borderRadius: 10 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <MobileSelect
                allowClear
                placeholder="关联课次（今日课次优先显示）"
                value={classLessonId || undefined}
                onChange={(value) => { setClassLessonId(value || ''); setStudentIds([]); setTargetType('CLASS') }}
                options={lessonGroups}
                style={{ width: '100%' }}
                listHeight={280}
                popupMatchSelectWidth={false}
                dropdownStyle={{ maxWidth: isMobile ? '95vw' : 480 }}
              />
              <div style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } : undefined}>
                <Button type={targetType === 'CLASS' ? 'primary' : 'default'} onClick={() => setTargetType('CLASS')}>全班</Button>
                <Button type={targetType === 'STUDENT' ? 'primary' : 'default'} onClick={() => setTargetType('STUDENT')}>指定学员</Button>
              </div>
              {targetType === 'STUDENT' && (
                <Select
                  mode="multiple"
                  placeholder="选择学员"
                  value={studentIds}
                  onChange={setStudentIds}
                  options={students.map((student) => ({ label: `${student.name} / ${student.grade || '-'}`, value: student.id }))}
                  style={{ width: '100%' }}
                />
              )}
            </Space>
          </Card>

          <Card title="今日课堂内容" bordered={false} style={{ borderRadius: 10 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap style={{ maxHeight: isMobile ? 160 : undefined, overflowY: isMobile ? 'auto' : undefined }}>
                {pointOptions.map((point) => (
                  <Tag.CheckableTag key={point} checked={knowledgePoints.includes(point)} onChange={() => togglePoint(point)}>
                    {point}
                  </Tag.CheckableTag>
                ))}
              </Space>
              <Space.Compact style={{ width: '100%' }}>
                <Input value={customPoint} onChange={(event) => setCustomPoint(event.target.value)} onPressEnter={addCustomPoint} placeholder="自定义知识点" />
                <Button onClick={addCustomPoint}>添加</Button>
              </Space.Compact>
              <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} showCount rows={5} placeholder="课堂小结，最多500字" />
            </Space>
          </Card>

          <Card title="课后作业" bordered={false} style={{ borderRadius: 10 }} extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setHomework((items) => [...items, { id: createHomeworkId(), order: items.length + 1, content: '' }])}>添加作业</Button>}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={homework.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {homework.map((item, index) => (
                    <SortableHomework
                      key={item.id}
                      item={{ ...item, order: index + 1 }}
                      isMobile={isMobile}
                      onChange={(value) => setHomework((items) => items.map((row) => row.id === item.id ? { ...row, content: value } : row))}
                      onRemove={() => setHomework((items) => items.filter((row) => row.id !== item.id).map((row, rowIndex) => ({ ...row, order: rowIndex + 1 })))}
                    />
                  ))}
                </Space>
              </SortableContext>
            </DndContext>
          </Card>

          <Card title="上传资料" bordered={false} style={{ borderRadius: 10 }}>
            {(isMobile ?? false) && (
              <Upload
                customRequest={handleUploadFile}
                accept="image/*"
                multiple
                showUploadList={false}
                style={{ display: 'block', marginBottom: 8 }}
              >
                <Button icon={<UploadOutlined />} block style={{ height: 44 }}>
                  拍照 / 选择图片
                </Button>
              </Upload>
            )}
            <Dragger
              customRequest={handleUploadFile}
              accept="image/*"
              multiple
              maxCount={9}
              showUploadList={false}
            >
              <p><UploadOutlined style={{ fontSize: 28, color: '#E8784A' }} /></p>
              <p>点击或拖拽上传课堂照片、板书、练习题、试卷</p>
            </Dragger>
            {imageUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                {imageUrls.map((url) => (
                  <div key={url} style={{ border: '1px solid #eee2d8', borderRadius: 8, padding: 8 }}>
                    <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#f5f0eb', borderRadius: 6, overflow: 'hidden' }}>
                      {url.toLowerCase().endsWith('.pdf') ? <Text style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>PDF</Text> : <Image src={url} alt="资料" fill sizes="160px" style={{ objectFit: 'cover' }} unoptimized />}
                    </div>
                    <Select value={imageTypes[url] || FILE_TYPES[0]} onChange={(value) => setImageTypes((current) => ({ ...current, [url]: value }))} options={FILE_TYPES.map((item) => ({ label: item, value: item }))} style={{ width: '100%', marginTop: 6 }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="学员课堂表现快评" bordered={false} style={{ borderRadius: 10 }}>
            {students.length ? (
              <List dataSource={students} renderItem={(student: LessonStudent) => (
                <List.Item style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 6 : 12, alignItems: isMobile ? 'flex-start' : 'center' }}>
                  <Text>{student.name}</Text>
                  <Rate style={{ fontSize: isMobile ? 18 : undefined }} value={ratings[student.id] || 5} onChange={(value) => setRatings((current) => ({ ...current, [student.id]: value }))} />
                </List.Item>
              )} />
            ) : <Empty description="选择课次后显示学员" />}
          </Card>

          <Card bordered={false} style={{ borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto auto', gap: 8 }}>
              <Button
                type="primary"
                icon={publishDone ? <CheckCircleOutlined /> : <SendOutlined />}
                loading={saving}
                onClick={() => save('PUBLISHED')}
                style={{
                  background: publishDone ? '#1D9E75' : '#E8784A',
                  borderColor: publishDone ? '#1D9E75' : '#E8784A',
                  width: isMobile ? '100%' : undefined,
                  transition: 'background 0.3s',
                }}
              >
                {publishDone ? '已发布' : '发布 · 同步家长'}
              </Button>
              <Button icon={<SaveOutlined />} loading={saving} onClick={() => save('DRAFT')} style={{ width: isMobile ? '100%' : undefined }}>保存草稿</Button>
            </div>
          </Card>
        </Space>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="家长端预览说明" bordered={false} style={{ borderRadius: 10 }}>
            <Text type="secondary">发布后会给所选学员家长发送通知，并在家长端学习档案中展示课堂反馈卡片。</Text>
          </Card>
          <Card title="历史记录" bordered={false} style={{ borderRadius: 10 }}>
            {!(history?.feedbacks?.length) ? (
              <Empty description="暂无课堂反馈" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {((history.feedbacks || []) as FeedbackHistoryItem[])
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((item) => {
                    const dateStr = new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                    const timeStr = new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                    const isPublished = item.status === 'PUBLISHED'
                    const lessonName = item.classLesson?.group?.name || ''
                    return (
                      <div key={item.id} style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: isPublished ? '#f0fdf4' : '#fafafa',
                        border: `1px solid ${isPublished ? '#d1fae5' : '#EEE7E1'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#8d806f' }}>{dateStr} {timeStr}{lessonName ? ` · ${lessonName}` : ''}</span>
                          <Tag color={isPublished ? 'green' : 'orange'} style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
                            {isPublished ? '已发布' : '草稿'}
                          </Tag>
                        </div>
                        <Space wrap size={4} style={{ marginBottom: 4 }}>
                          {item.knowledgePoints?.slice(0, 4).map((point: string) => (
                            <Tag key={point} style={{ fontSize: 11, borderRadius: 9999, margin: 0 }}>{point}</Tag>
                          ))}
                        </Space>
                        <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 4 }}>
                          {item.homework?.length ? `${item.homework.length}条作业` : '无作业'}
                          {' · '}
                          {item.imageUrls?.length ? `${item.imageUrls.length}张资料` : '无资料'}
                          {item.summary ? ' · 有小结' : ''}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </Card>
        </Space>
      </div>
    </div>
  )
}

export default function ClassroomFeedbackPage() {
  return (
    <Suspense fallback={null}>
      <ClassroomFeedbackPageInner />
    </Suspense>
  )
}
