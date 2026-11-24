'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Card, Empty, Image, Input, Modal, Skeleton, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, FileAddOutlined, FileImageOutlined, FileTextOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { formatFriendlyTime } from '@/lib/date/relative'
import { SingleSessionFeedbackComposer } from '@/components/teacher/FeedbackComposer'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'

const { Title, Text, Paragraph } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '加载单次反馈失败')
  return data as { feedbacks: SingleSessionFeedback[]; total: number }
}

type SingleSessionFeedback = {
  id: string
  studentName: string
  studentGrade: string | null
  subject: string
  status: string
  sessionDate: string | null
  createdAt: string
  summary: string | null
  overallComment: string | null
  lessonContent: string | null
  knowledgePoints: string[]
  homework: Array<string | { content?: string; title?: string }>
  imageUrls: string[]
  teacher: { id: string; name: string; avatar?: string | null }
}

export default function SingleSessionFeedbackAdminClient() {
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [selected, setSelected] = useState<SingleSessionFeedback | null>(null)
  const [creating, setCreating] = useState(false)
  const handleMobileBack = useCallback(() => {
    if (selected) { setSelected(null); return true }
    if (creating) { setCreating(false); return true }
    return false
  }, [creating, selected])
  useMobileBackHandler(handleMobileBack, 10)
  const params = new URLSearchParams()
  if (search.trim()) params.set('q', search.trim())
  if (date) params.set('date', date)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/single-session-feedback?${params}`, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
  })
  const feedbacks = data?.feedbacks || []

  if (creating) {
    return (
      <main style={{ maxWidth: 1360, margin: '0 auto', paddingBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>新建单次课程反馈</Title>
            <Text type="secondary">复用教师端完整编辑、个性化整理和分享图流程；保存为草稿素材，不会发送给家长。</Text>
          </div>
          <Button className="mobile-shell-back" icon={<ArrowLeftOutlined />} onClick={() => setCreating(false)}>返回反馈记录</Button>
        </div>
        <SingleSessionFeedbackComposer onRecordSaved={() => void mutate()} />
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>单次课程反馈</Title>
          <Text type="secondary">集中查看教师为非班级课次创建的单次反馈，独立于课堂成长反馈。</Text>
        </div>
        <Space wrap>
          <Tag color="green" style={{ margin: 0, padding: '5px 10px', borderRadius: 999 }}>共 {data?.total ?? '—'} 条记录</Tag>
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setCreating(true)}>新建单次反馈</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
        <Space wrap style={{ width: '100%' }} size={10}>
          <Input
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索学员姓名、学科或教师"
            prefix={<SearchOutlined />}
            style={{ width: 'min(360px, 100%)' }}
          />
          <Input aria-label="按上课日期筛选" type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: 180 }} />
          {(search || date) && <Button onClick={() => { setSearch(''); setDate('') }}>清除筛选</Button>}
          {error && <Button onClick={() => void mutate()}>重试</Button>}
        </Space>
      </Card>

      {error && <Alert type="error" showIcon message={error.message || '加载失败'} style={{ marginBottom: 16 }} />}
      {isLoading ? (
        <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
      ) : feedbacks.length === 0 ? (
        <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search || date ? '没有符合条件的单次反馈' : '还没有单次课程反馈'} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
          {feedbacks.map((feedback) => (
            <Card
              key={feedback.id}
              hoverable
              onClick={() => setSelected(feedback)}
              style={{ borderRadius: 14, borderColor: 'var(--color-border, rgba(0,0,0,.08))' }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 17 }}>{feedback.studentName}</Text>
                    {feedback.studentGrade && <Tag>{feedback.studentGrade}</Tag>}
                    <Tag color={feedback.status === 'PUBLISHED' ? 'green' : 'gold'}>{feedback.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
                  </div>
                  <Text type="secondary">{feedback.subject} · {feedback.teacher?.name || '教师'}</Text>
                </div>
                <FileTextOutlined style={{ color: 'var(--color-primary)', fontSize: 19, marginTop: 3 }} />
              </div>
              <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '14px 0 10px', minHeight: 42, color: 'var(--color-ink-muted)' }}>
                {feedback.summary || feedback.overallComment || feedback.lessonContent || '尚未填写文字总结'}
              </Paragraph>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-ink-subtle)' }}>
                <span><CalendarOutlined /> {feedback.sessionDate ? new Date(feedback.sessionDate).toLocaleDateString('zh-CN') : formatFriendlyTime(feedback.createdAt)}</span>
                <span><FileImageOutlined /> {feedback.imageUrls?.length || 0} 张图片</span>
                {feedback.knowledgePoints?.length > 0 && <span>知识点 {feedback.knowledgePoints.length} 项</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title={selected ? `${selected.studentName} · ${selected.subject}单次反馈` : '单次课程反馈'}
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>关闭</Button>}
        width={760}
      >
        {selected && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
            <Space wrap style={{ marginBottom: 14 }}>
              <Tag icon={<UserOutlined />}>{selected.studentName}{selected.studentGrade ? ` · ${selected.studentGrade}` : ''}</Tag>
              <Tag color="green">{selected.teacher?.name || '教师'}</Tag>
              <Tag>{selected.sessionDate ? new Date(selected.sessionDate).toLocaleDateString('zh-CN') : formatFriendlyTime(selected.createdAt)}</Tag>
            </Space>
            {selected.knowledgePoints?.length > 0 && <section style={{ marginBottom: 16 }}><Text strong>本节知识点</Text><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{selected.knowledgePoints.map((point) => <Tag key={point}>{point}</Tag>)}</div></section>}
            {selected.lessonContent && <section style={{ marginBottom: 16 }}><Text strong>本节授课内容</Text><Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{selected.lessonContent}</Paragraph></section>}
            {selected.summary && <section style={{ marginBottom: 16 }}><Text strong>课堂小结</Text><Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{selected.summary}</Paragraph></section>}
            {selected.overallComment && <section style={{ marginBottom: 16 }}><Text strong>总体评价</Text><Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{selected.overallComment}</Paragraph></section>}
            {selected.homework?.length > 0 && <section style={{ marginBottom: 16 }}><Text strong>课后巩固</Text><ol style={{ marginTop: 8 }}>{selected.homework.map((item, index) => <li key={index}>{typeof item === 'string' ? item : item.content || item.title}</li>)}</ol></section>}
            {selected.imageUrls?.length > 0 && <section><Text strong>课堂图片</Text><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 8 }}>{selected.imageUrls.map((url, index) => <Image key={`${url}-${index}`} src={url} alt={`${selected.studentName}课堂图片 ${index + 1}`} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8 }} />)}</div></section>}
          </div>
        )}
      </Modal>
    </main>
  )
}
