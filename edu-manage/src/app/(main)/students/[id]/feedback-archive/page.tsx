'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  EyeOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Drawer, Empty, Image as AntImage, Input, message, Row, Select, Space, Spin, Table, Tag } from 'antd'
import type { TablePaginationConfig } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'

const { RangePicker } = DatePicker

async function fetcher(url: string) {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '加载失败')
  return payload
}

type ArchiveImage = { assetId: string | null; thumbnailUrl: string; previewUrl: string }
type ArchiveItem = {
  id: string
  date: string
  teacher: { id: string; name: string }
  subject: string
  course: string | null
  className: string | null
  lessonContent: string | null
  overallComment: string | null
  summary: string | null
  tags: string[]
  images: ArchiveImage[]
}
type ArchivePayload = {
  student: { id: string; name: string; grade: string | null }
  summary: {
    totalCount: number
    subjectCount: number
    teacherCount: number
    firstFeedbackDate: string | null
    latestFeedbackDate: string | null
  }
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number }
  items: ArchiveItem[]
}
type DetailPayload = Omit<ArchiveItem, 'images'> & {
  students: Array<{ id: string; name: string; grade: string | null; studentRating: unknown }>
  knowledgePoints: string[]
  homework: unknown
  badge: string | null
  mood: string | null
  parentReply: string | null
  adminReply: string | null
  status: string
  images: Array<ArchiveImage & { originalUrl: string }>
  parentMessages: Array<{
    id: string
    replies: Array<{ id: string; authorName: string; role: string; content: string; createdAt: string }>
  }>
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function ThumbnailStrip({ images }: { images: ArchiveImage[] }) {
  const keys = images.slice(0, 3).map((image) => image.thumbnailUrl)
  const { urls } = useSignedUrls(keys)
  if (!images.length) return <span style={{ color: 'var(--color-ink-subtle)' }}>无</span>
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {urls.map((src, index) => (
        <div key={keys[index]} style={{ position: 'relative', width: 42, height: 42, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-hairline)' }}>
          <Image src={src} alt="反馈缩略图" fill sizes="42px" loading="lazy" unoptimized style={{ objectFit: 'cover' }} />
        </div>
      ))}
      {images.length > 3 && <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)' }}>+{images.length - 3}</div>}
    </div>
  )
}

function DetailDrawer({ detail, loading, onClose }: { detail: DetailPayload | null; loading: boolean; onClose: () => void }) {
  const isMobile = useIsMobile() ?? false
  const previewKeys = detail?.images.map((image) => image.previewUrl || image.thumbnailUrl) || []
  const originalKeys = detail?.images.map((image) => image.originalUrl) || []
  const { urls: previewUrls } = useSignedUrls(previewKeys)
  const { urls: originalUrls } = useSignedUrls(detail ? originalKeys : [])
  const homework = Array.isArray(detail?.homework) ? detail.homework : []

  return (
    <Drawer
      open={loading || !!detail}
      onClose={onClose}
      title="课堂反馈详情"
      width={isMobile ? '100%' : 620}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '92vh' : undefined}
      styles={{ body: { paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' } }}
    >
      {loading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }}><Spin size="large" /></div> : detail && (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Card size="small" bordered={false} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }}>
            <strong>{detail.teacher.name}</strong>
            <div style={{ marginTop: 4, color: 'var(--color-ink-muted)' }}>{detail.subject} · {detail.className || detail.course || '未关联课程'}</div>
            <div style={{ marginTop: 4, color: 'var(--color-ink-subtle)', fontSize: 12 }}>{formatDate(detail.date)}</div>
          </Card>
          <DetailBlock title="学生">
            <Space wrap>{detail.students.map((student) => <Tag key={student.id}>{student.name}{student.studentRating ? ` · ${String(student.studentRating)}` : ''}</Tag>)}</Space>
          </DetailBlock>
          {detail.lessonContent && <DetailBlock title="本节授课内容"><div style={{ whiteSpace: 'pre-wrap' }}>{detail.lessonContent}</div></DetailBlock>}
          {detail.tags.length > 0 && <DetailBlock title="课堂标签"><Space wrap>{detail.tags.map((tag) => <Tag key={tag} color="orange">{tag}</Tag>)}</Space></DetailBlock>}
          {detail.knowledgePoints.length > 0 && <DetailBlock title="知识点">{detail.knowledgePoints.join('、')}</DetailBlock>}
          {detail.overallComment && <DetailBlock title="总体评价"><div style={{ whiteSpace: 'pre-wrap' }}>{detail.overallComment}</div></DetailBlock>}
          {detail.summary && <DetailBlock title="课堂小结"><div style={{ whiteSpace: 'pre-wrap' }}>{detail.summary}</div></DetailBlock>}
          {homework.length > 0 && <DetailBlock title="作业"><pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: 'inherit' }}>{JSON.stringify(homework, null, 2)}</pre></DetailBlock>}
          {detail.images.length > 0 && (
            <DetailBlock title="课堂资料（点击查看原图）">
              <AntImage.PreviewGroup items={originalUrls}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
                  {previewUrls.map((src, index) => <AntImage key={previewKeys[index]} src={src} alt={`课堂资料${index + 1}`} width="100%" height={112} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
                </div>
              </AntImage.PreviewGroup>
            </DetailBlock>
          )}
          {detail.parentReply && <DetailBlock title="家长回复">{detail.parentReply}</DetailBlock>}
          {detail.adminReply && <DetailBlock title="管理员回复">{detail.adminReply}</DetailBlock>}
          {detail.parentMessages.flatMap((message) => message.replies).length > 0 && (
            <DetailBlock title="家校留言">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {detail.parentMessages.flatMap((message) => message.replies).map((reply) => (
                  <div key={reply.id}><strong>{reply.authorName}</strong><span style={{ color: 'var(--color-ink-subtle)', marginLeft: 8, fontSize: 12 }}>{formatDate(reply.createdAt)}</span><div>{reply.content}</div></div>
                ))}
              </Space>
            </DetailBlock>
          )}
        </Space>
      )}
    </Drawer>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginBottom: 6 }}>{title}</div><div style={{ padding: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)', borderRadius: 10, lineHeight: 1.7 }}>{children}</div></section>
}

export default function StudentFeedbackArchivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [subject, setSubject] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [detail, setDetail] = useState<DetailPayload | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (subject.trim()) params.set('subject', subject.trim())
    if (teacherId) params.set('teacherId', teacherId)
    if (dateRange) {
      params.set('startDate', dateRange[0])
      params.set('endDate', dateRange[1])
    }
    return params.toString()
  }, [dateRange, page, pageSize, subject, teacherId])
  const { data, isLoading, error } = useSWR<ArchivePayload>(id ? `/api/admin/students/${id}/feedback-archive?${query}` : null, fetcher)
  const { data: teacherData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers: Array<{ id: string; name: string }> = Array.isArray(teacherData?.teachers) ? teacherData.teachers : []

  const openDetail = async (feedbackId: string) => {
    setDetailLoading(true)
    try {
      setDetail(await fetcher(`/api/admin/classroom-feedback/${feedbackId}/detail`))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '详情加载失败')
    } finally {
      setDetailLoading(false)
    }
  }
  const pagination: TablePaginationConfig = {
    current: data?.pagination.page || page,
    pageSize: data?.pagination.pageSize || pageSize,
    total: data?.pagination.totalCount || 0,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    onChange: (nextPage, nextPageSize) => {
      setPage(nextPageSize !== pageSize ? 1 : nextPage)
      setPageSize(nextPageSize)
    },
  }

  return (
    <PageLayout
      title={data?.student ? `${data.student.name} · 课堂反馈档案` : '课堂反馈档案'}
      subtitle={data?.student?.grade || '按学科、教师和时间查看完整课堂反馈'}
      actions={<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/students/${id}`)}>返回学生详情</Button>}
    >
      {isLoading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><Spin size="large" /></div> : error ? (
        <Card bordered={false}><Empty description={error.message || '档案加载失败'} /></Card>
      ) : data && (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}><SummaryCard icon={<BookOutlined />} label="累计反馈" value={data.summary.totalCount} /></Col>
            <Col xs={12} md={6}><SummaryCard icon={<SearchOutlined />} label="涉及学科" value={data.summary.subjectCount} /></Col>
            <Col xs={12} md={6}><SummaryCard icon={<TeamOutlined />} label="教师数量" value={data.summary.teacherCount} /></Col>
            <Col xs={12} md={6}><SummaryCard icon={<CalendarOutlined />} label="最近反馈" value={data.summary.latestFeedbackDate ? new Date(data.summary.latestFeedbackDate).toLocaleDateString('zh-CN') : '-'} /></Col>
          </Row>
          <Card bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14, marginBottom: 16 }}>
            <Space wrap style={{ width: '100%' }}>
              <Input placeholder="筛选学科" allowClear value={subject} onChange={(event) => { setSubject(event.target.value); setPage(1) }} style={{ width: isMobile ? '100%' : 180 }} />
              <Select allowClear placeholder="筛选教师" value={teacherId || undefined} onChange={(value) => { setTeacherId(value || ''); setPage(1) }} style={{ width: isMobile ? '100%' : 180 }} options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))} />
              <RangePicker onChange={(_dates, strings) => { setDateRange(strings[0] && strings[1] ? [strings[0], strings[1]] : null); setPage(1) }} />
            </Space>
          </Card>
          <Card bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
            <Table<ArchiveItem>
              rowKey="id"
              dataSource={data.items}
              pagination={pagination}
              scroll={{ x: 760 }}
              columns={[
                { title: '时间', dataIndex: 'date', width: 150, render: (value: string) => formatDate(value) },
                { title: '学科', dataIndex: 'subject', width: 120, render: (value: string) => <Tag color="orange">{value}</Tag> },
                { title: '教师', dataIndex: ['teacher', 'name'], width: 110 },
                { title: '标签', dataIndex: 'tags', render: (tags: string[]) => <Space wrap size={4}>{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space> },
                { title: '简评', key: 'comment', ellipsis: true, render: (_value, record) => record.summary || record.overallComment || '-' },
                { title: '图片', dataIndex: 'images', width: 150, render: (images: ArchiveImage[]) => <ThumbnailStrip images={images} /> },
                { title: '操作', width: 90, fixed: 'right', render: (_value, record) => <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>详情</Button> },
              ]}
              locale={{ emptyText: <Empty description="暂无课堂反馈" /> }}
            />
          </Card>
        </>
      )}
      <DetailDrawer detail={detail} loading={detailLoading} onClose={() => setDetail(null)} />
    </PageLayout>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <Card bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}><div style={{ color: 'var(--color-primary)', fontSize: 18 }}>{icon}</div><div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 8 }}>{label}</div><div style={{ color: 'var(--color-ink)', fontSize: 22, fontWeight: 800, marginTop: 2 }}>{value}</div></Card>
}
