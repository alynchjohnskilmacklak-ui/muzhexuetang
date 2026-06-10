'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, Drawer, Empty, Form, Input, message, Row, Select, Spin, Tag, Upload } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, SendOutlined, WarningOutlined } from '@ant-design/icons'
import { Image as AntImage } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { normalizeUploadUrl } from '@/lib/upload-url'

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

function FeedbackItemCard({ item, isMobile: _isMobile }: { item: AdminFeedback; isMobile: boolean }) {
  const students = Array.isArray(item.students) ? item.students : []
  const points = Array.isArray(item.knowledgePoints) ? item.knowledgePoints : []
  const images = Array.isArray(item.imageUrls) ? item.imageUrls : []
  const homework = Array.isArray(item.homework) ? item.homework : []
  return (
    <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #EEE7E1', background: '#fff' }} styles={{ body: { padding: '12px 14px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1F2329' }}>{item.teacherName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color={item.status === 'PUBLISHED' ? 'green' : 'orange'} style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
            {item.status === 'PUBLISHED' ? '已发布' : '草稿'}
          </Tag>
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
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          {images.slice(0, 4).map((url, i) => (
            <img key={i} src={normalizeUploadUrl(url)} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #EEE7E1' }} />
          ))}
          {images.length > 4 && <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f2ee', display: 'grid', placeItems: 'center', fontSize: 11, color: '#98A2B3' }}>+{images.length - 4}</div>}
        </div>
      )}
    </Card>
  )
}

export default function ClassroomFeedbackAdminPage() {
  const isMobile = useIsMobile() ?? false
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [q, setQ] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const [groupByClass, setGroupByClass] = useState(true)

  // Compose drawer state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm] = Form.useForm()
  const [composeImages, setComposeImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [composeTeacherId, setComposeTeacherId] = useState('')
  const [composeLessonId, setComposeLessonId] = useState('')

  const params = new URLSearchParams({ date, limit: '200' })
  if (teacherFilter) params.set('teacherId', teacherFilter)
  if (viewAll) params.set('all', '1')
  const { data, isLoading, mutate } = useSWR(`/api/admin/classroom-feedback?${params.toString()}`, fetcher)
  const { data: teachersData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []

  const feedbacks: AdminFeedback[] = Array.isArray(data?.feedbacks) ? data.feedbacks : []
  const allLessons: any[] = Array.isArray(data?.lessons) ? data.lessons : []
  const missingLessons = allLessons.filter(l => !l.hasFeedback)
  const noFeedback: Array<{ id: string; name: string }> = Array.isArray(data?.teachersWithoutFeedback) ? data.teachersWithoutFeedback : []
  
  const { data: composeStudentsData } = useSWR(
    composeTeacherId && !composeLessonId ? `/api/students?status=ACTIVE&limit=200` : null,
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
          studentIds: lesson.students.map((s: any) => s.id)
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
    if (!composeTeacherId) { message.error('请选择代发老师'); return }
    if (!values.studentIds?.length) { message.error('请选择学员'); return }
    if (!values.summary?.trim() && !values.knowledgePoints?.length) { message.error('请填写评语或知识点'); return }

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
      if (!res.ok) { message.error(data.error || '提交失败'); return }
      message.success(status === 'PUBLISHED' ? '已代发并通知家长' : '草稿已保存')
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
            placeholder="按教师筛选"
            style={{ width: 150 }}
            value={teacherFilter || undefined}
            onChange={(value) => setTeacherFilter(value || '')}
            options={teachers.map((teacher: { id: string; name: string }) => ({ label: teacher.name, value: teacher.id }))}
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
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
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
                  {group.items.map(item => <FeedbackItemCard key={item.id} item={item} isMobile={isMobile} />)}
                </div>
              </div>
            ))
          ) : (
            filtered.map(item => <FeedbackItemCard key={item.id} item={item} isMobile={isMobile} />)
          )}
        </div>
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
              placeholder="关联具体课次可自动回显老师和学员"
              onChange={handleLessonChange}
              options={allLessons.map(l => ({ 
                label: `${l.groupName} (${l.teacherName}) ${l.time}`, 
                value: l.id,
                disabled: l.hasFeedback 
              }))}
            />
          </Form.Item>

          <Form.Item name="teacherId" label="代发老师" required>
            <Select
              showSearch
              placeholder="选择老师"
              value={composeTeacherId || undefined}
              onChange={handleTeacherChange}
              options={teachers.map((t: { id: string; name: string }) => ({ label: t.name, value: t.id }))}
              filterOption={(input, option) => String(option?.label || '').includes(input)}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="studentIds" label={`选择学员${composeStudents.length ? `（${composeStudents.length}位可选）` : ''}`} required>
            <Select
              mode="multiple"
              placeholder={composeTeacherId ? '选择要反馈的学员' : '请先选择老师或课次'}
              disabled={!composeTeacherId}
              style={{ width: '100%' }}
              options={composeStudents.map(s => ({ label: `${s.name}${s.grade ? ` · ${s.grade}` : ''}`, value: s.id }))}
            />
          </Form.Item>

          <Form.Item name="knowledgePoints" label="知识点">
            <Select mode="tags" placeholder="输入知识点后回车" style={{ width: '100%' }}
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
                      <AntImage src={normalizeUploadUrl(url)} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      <button onClick={() => setComposeImages(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'grid', placeItems: 'center' }}>×</button>
                    </div>
                  ))}
                </AntImage.PreviewGroup>
              </div>
            )}
            <Upload name="file" action="/api/upload" accept="image/*" multiple maxCount={9} showUploadList={false}
              onChange={info => { if (info.file.status === 'done') { const url = (info.file.response as { url?: string })?.url; if (url) setComposeImages(prev => [...prev, url]) } }}>
              <Button icon={<PlusOutlined />}>上传图片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>
    </PageLayout>
  )
}
