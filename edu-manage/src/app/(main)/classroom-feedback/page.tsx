'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, Empty, Input, Row, Select, Spin, Tag, Typography } from 'antd'
import { ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeUploadUrl } from '@/lib/upload-url'

const { Paragraph } = Typography
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
  createdAt: string
}

export default function ClassroomFeedbackAdminPage() {
  const isMobile = useIsMobile() ?? false
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [q, setQ] = useState('')
  const [viewAll, setViewAll] = useState(false)

  const params = new URLSearchParams({ date, limit: '200' })
  if (teacherFilter) params.set('teacherId', teacherFilter)
  if (viewAll) params.set('all', '1')
  const { data, isLoading, mutate } = useSWR(`/api/admin/classroom-feedback?${params.toString()}`, fetcher)
  const { data: teachersData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []

  const feedbacks: AdminFeedback[] = Array.isArray(data?.feedbacks) ? data.feedbacks : []
  const noFeedback: Array<{ id: string; name: string }> = Array.isArray(data?.teachersWithoutFeedback) ? data.teachersWithoutFeedback : []
  const filtered = feedbacks.filter((feedback) => {
    const keyword = q.trim()
    if (!keyword) return true
    return `${feedback.teacherName} ${feedback.lessonName || ''} ${feedback.courseName || ''} ${feedback.summary || ''}`.includes(keyword)
      || feedback.students?.some((student) => student.name.includes(keyword))
      || feedback.knowledgePoints?.some((point) => point.includes(keyword))
  })

  return (
    <PageLayout
      title="课堂反馈总览"
      subtitle="查看所有老师的课堂反馈，追踪今日反馈提交情况"
      actions={<Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: 'linear-gradient(135deg,#fff3ec,#fff)', border: '1px solid #EEE7E1' }}>
            <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 4 }}>已反馈</div>
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
            placeholder="按教师筛选"
            style={{ width: 150 }}
            value={teacherFilter || undefined}
            onChange={(value) => setTeacherFilter(value || '')}
            options={teachers.map((teacher: { id: string; name: string }) => ({ label: teacher.name, value: teacher.id }))}
          />
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索老师/课程/内容/学员"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{ width: isMobile ? '100%' : 280 }}
          />
          <Button
            type={viewAll ? 'primary' : 'default'}
            onClick={() => setViewAll((value) => !value)}
            style={viewAll ? { background: '#E8784A', borderColor: '#E8784A' } : undefined}
          >
            {viewAll ? '恢复按日查看' : '查看全部历史'}
          </Button>
        </div>
      </Card>

      {!viewAll && noFeedback.length > 0 && (
        <Card
          bordered={false}
          style={{ borderRadius: 10, border: '1.5px solid #FED7AA', background: '#FFFBF5', marginBottom: 16 }}
          title={<span style={{ color: '#D97706' }}><WarningOutlined /> 今日尚未提交反馈的老师</span>}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {noFeedback.map((teacher) => <Tag key={teacher.id} color="orange" style={{ borderRadius: 9999 }}>{teacher.name}</Tag>)}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Empty description={viewAll ? '暂无反馈记录' : `${date} 暂无课堂反馈`} />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item) => {
            const students = Array.isArray(item.students) ? item.students : []
            const points = Array.isArray(item.knowledgePoints) ? item.knowledgePoints : []
            const images = Array.isArray(item.imageUrls) ? item.imageUrls : []
            const homework = Array.isArray(item.homework) ? item.homework : []
            return (
              <Card key={item.id} bordered={false} style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#fff' }} bodyStyle={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1F2329', marginRight: 8 }}>{item.teacherName}</span>
                    <Tag color="blue" style={{ borderRadius: 9999 }}>{item.courseName || item.lessonName || '-'}</Tag>
                    {item.subject && item.subject !== '-' && <Tag style={{ borderRadius: 9999 }}>{item.subject}</Tag>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color={item.status === 'PUBLISHED' ? 'green' : 'orange'} style={{ borderRadius: 9999 }}>
                      {item.status === 'PUBLISHED' ? '已发布' : '草稿'}
                    </Tag>
                    <span style={{ fontSize: 11, color: '#98A2B3' }}>
                      {new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {students.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#98A2B3', marginRight: 6 }}>反馈学员（{students.length}人）：</span>
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                      {students.map((student) => (
                        <Tag key={student.id} style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}>
                          {student.name}{student.grade ? ` · ${student.grade}` : ''}
                        </Tag>
                      ))}
                    </span>
                  </div>
                )}

                {points.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#98A2B3', marginRight: 6 }}>知识点：</span>
                    {points.map((point) => (
                      <Tag key={point} style={{ borderRadius: 9999, fontSize: 11, background: '#FFF3EC', color: '#E8784A', border: 'none', margin: '0 3px 3px 0' }}>{point}</Tag>
                    ))}
                  </div>
                )}

                {item.summary && (
                  <div style={{ marginBottom: 8, padding: '8px 12px', background: '#FCFBF9', borderRadius: 8, borderLeft: '3px solid #E8784A' }}>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>课堂小结：</span>
                    <Paragraph style={{ margin: 0, fontSize: 13, color: '#1F2329', marginTop: 4, lineHeight: 1.6 }}>{item.summary}</Paragraph>
                  </div>
                )}

                {homework.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#98A2B3' }}>布置作业（{homework.length}项）：</span>
                    {homework.map((row: unknown, index: number) => (
                      <div key={index} style={{ fontSize: 12, color: '#5a4e3a', marginLeft: 8, marginTop: 2 }}>
                        {index + 1}. {typeof row === 'string' ? row : (row as { content?: string })?.content || JSON.stringify(row)}
                      </div>
                    ))}
                  </div>
                )}

                {images.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#98A2B3', marginBottom: 4, display: 'block' }}>课堂资料（{images.length}张）：</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {images.slice(0, 4).map((url, index) => (
                        <a key={`${url}-${index}`} href={normalizeUploadUrl(url)} target="_blank" rel="noopener noreferrer">
                          <img src={normalizeUploadUrl(url)} alt="课堂资料" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #EEE7E1' }} />
                        </a>
                      ))}
                      {images.length > 4 && <div style={{ width: 56, height: 56, borderRadius: 6, background: '#f5f2ee', display: 'grid', placeItems: 'center', fontSize: 12, color: '#98A2B3' }}>+{images.length - 4}</div>}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
