'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Button, Card, Col, Empty, Input, InputNumber, message,
  Popconfirm, Row, Select, Space, Tag, Upload,
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined,
  InboxOutlined, PlusOutlined,
  SendOutlined, WarningOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import { MobileSelect } from '@/components/MobileSelect'
import { normalizeUploadUrl } from '@/lib/upload-url'

const SUBJECTS = ['数学', '英语', '物理', '化学', '语文']
const SUBJECT_TAGS: Record<string, string[]> = {
  数学: ['函数极值', '三角函数', '导数应用', '几何辅助线', '数列', '概率', '向量', '解析几何', '不等式', '二项式'],
  英语: ['阅读理解', '完形填空', '语法填空', '书面表达', '听力', '词汇'],
  物理: ['力学', '电磁', '光学', '热力学', '动量', '能量守恒'],
  化学: ['有机化学', '无机反应', '化学方程式', '实验分析'],
  语文: ['古诗文', '文言文', '现代文阅读', '作文', '字词'],
}
const MASTERY_CONFIG = {
  MASTERED: { color: '#1D9E75', label: '已掌握', icon: <CheckCircleOutlined /> },
  NEEDS_REVIEW: { color: '#f5a623', label: '需巩固', icon: <WarningOutlined /> },
  NEEDS_PRACTICE: { color: '#E24B4A', label: '需重点练习', icon: <CloseCircleOutlined /> },
} as const
type MasteryKey = keyof typeof MASTERY_CONFIG

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('加载失败'); return r.json() })

export default function GradesPage() {
  const [studentId, setStudentId] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const { data: studentsData } = useSWR('/api/students?status=ACTIVE&limit=200', fetcher)
  const students = Array.isArray(studentsData?.students) ? studentsData.students : []
  const { data: paperListData, mutate: mutatePapers } = useSWR(
    studentId ? `/api/exam-papers?studentId=${studentId}${filterSubject ? `&subject=${filterSubject}` : ''}` : null,
    fetcher
  )
  const papers = Array.isArray(paperListData?.papers) ? paperListData.papers : []
  const { data: paperData, mutate: mutatePaper } = useSWR(
    selectedPaperId ? `/api/exam-papers/${selectedPaperId}` : null,
    fetcher
  )
  const paper = paperData && paperData.id ? paperData : null

  // Editor state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [paperDate, setPaperDate] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [questions, setQuestions] = useState<{ order: number; topic: string; mastery: string; teacherNote: string; pageNum?: number }[]>([])
  const [overallComment, setOverallComment] = useState('')
  const [customTag, setCustomTag] = useState('')

  const selectPaper = useCallback((id: string) => {
    setSelectedPaperId(id)
  }, [])

  // Load paper into editor when selected
  useEffect(() => {
    if (paper) {
      setTitle(paper.title || '')
      setSubject(paper.subject || '')
      setPaperDate(paper.paperDate ? format(new Date(paper.paperDate), 'yyyy-MM-dd') : '')
      setImageUrls(Array.isArray(paper.imageUrls) ? paper.imageUrls : [])
      setTags(Array.isArray(paper.tags) ? paper.tags : [])
      setQuestions(Array.isArray(paper.questions) ? paper.questions.map((q: Record<string, unknown>) => ({
        order: Number(q.order),
        topic: String(q.topic || ''),
        mastery: String(q.mastery || 'NEEDS_REVIEW'),
        teacherNote: String(q.teacherNote || ''),
        pageNum: q.pageNum ? Number(q.pageNum) : undefined,
      })) : [])
      setOverallComment(paper.overallComment || '')
    }
  }, [paper])

  const createPaper = async () => {
    const targetId = studentId || (students.length === 1 ? (students[0] as Record<string, unknown>).id as string : '')
    if (!targetId) return message.error('请先在左侧选择一位学员')
    if (!studentId) setStudentId(targetId)
    try {
      const res = await fetch('/api/exam-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetId,
          title: '新试卷',
          subject: filterSubject || SUBJECTS[0],
          paperDate: new Date().toISOString(),
          tags: [],
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return message.error(data?.error || `创建失败：${res.status}`)
      message.success('试卷草稿已创建')
      await mutatePapers()
      setSelectedPaperId(data.id)
    } catch {
      message.error('创建失败，请检查网络或重新登录')
    }
  }

  const saveDraft = async () => {
    if (!paper) return
    setSaving(true)
    try {
      await fetch(`/api/exam-papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, paperDate: new Date(paperDate).toISOString(), imageUrls, tags, overallComment, status: 'DRAFT' }),
      })
      await fetch(`/api/exam-papers/${paper.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      message.success('草稿已保存')
      mutatePaper()
      mutatePapers()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const publishPaper = async () => {
    if (!paper) return
    setPublishing(true)
    try {
      await fetch(`/api/exam-papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, paperDate: new Date(paperDate).toISOString(), imageUrls, tags, overallComment }),
      })
      await fetch(`/api/exam-papers/${paper.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      await fetch(`/api/exam-papers/${paper.id}/publish`, { method: 'POST' })
      message.success('试卷已推送给家长')
      mutatePaper()
      mutatePapers()
    } catch {
      message.error('推送失败')
    } finally {
      setPublishing(false)
    }
  }

  const deletePaper = async (id: string) => {
    const res = await fetch(`/api/exam-papers/${id}`, { method: 'DELETE' })
    if (!res.ok) return message.error('删除失败')
    message.success('试卷已删除')
    setSelectedPaperId('')
    mutatePapers()
  }

  const toggleTag = (tagName: string) => {
    setTags((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName])
  }

  const addCustomTag = () => {
    const tag = customTag.trim()
    if (!tag) return
    if (tags.includes(tag)) return message.error('标签已存在')
    setTags((prev) => [...prev, tag])
    setCustomTag('')
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      order: prev.length + 1,
      topic: '',
      mastery: 'NEEDS_REVIEW',
      teacherNote: '',
    }])
  }

  const updateQuestion = (index: number, field: string, value: unknown) => {
    setQuestions((prev) => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 })))
  }

  const tagOptions = SUBJECT_TAGS[subject] || []

  return (
    <PageLayout title="学习档案" subtitle="试卷管理与题目标注">
      <Row gutter={16}>
        <Col xs={24} lg={6}>
          <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <MobileSelect
                allowClear
                placeholder="选择学员"
                style={{ width: '100%' }}
                value={studentId || undefined}
                onChange={(v) => { setStudentId(v || ''); setSelectedPaperId(''); }}
                options={students.map((s: Record<string, unknown>) => ({ label: `${s.name}${s.grade ? ` / ${s.grade}` : ''}`, value: s.id as string }))}
              />
              <Select
                allowClear
                placeholder="科目筛选"
                style={{ width: '100%' }}
                value={filterSubject || undefined}
                onChange={(v) => setFilterSubject(v || '')}
                options={SUBJECTS.map((s) => ({ label: s, value: s }))}
              />
              <Button type="primary" icon={<PlusOutlined />} block onClick={createPaper} style={{ background: '#E8784A' }}>
                新建试卷
              </Button>
            </Space>
          </Card>

          <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ color: '#9a8e7a', fontSize: 12, marginBottom: 8 }}>
              {papers.length ? `共 ${papers.length} 份试卷` : '暂无试卷'}
            </div>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {papers.map((p: { id: string; title: string; subject: string; status: string; paperDate: string; teacher?: { name?: string } }) => (
                <div
                  key={p.id}
                  onClick={() => selectPaper(p.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedPaperId === p.id ? 'rgba(232,117,69,.12)' : 'rgba(0,0,0,0.06)',
                    border: selectedPaperId === p.id ? '1px solid rgba(232,117,69,.3)' : '1px solid transparent',
                  }}
                >
                  <div style={{ color: '#1F2329', fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <Tag color={p.status === 'PUBLISHED' ? 'green' : p.status === 'DRAFT' ? 'orange' : 'default'} style={{ fontSize: 11, lineHeight: '18px' }}>
                      {p.status === 'PUBLISHED' ? '已发布' : p.status === 'DRAFT' ? '草稿' : '已删除'}
                    </Tag>
                    <span style={{ color: '#9a8e7a', fontSize: 11 }}>
                      {p.teacher?.name || ''} · {p.subject}
                    </span>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={18}>
          {!paper ? (
            <Card bordered={false} style={{ borderRadius: 8, minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <Empty description="选择左侧试卷进行编辑，或创建新试卷" />
            </Card>
          ) : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* Header info */}
              <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 12]} align="middle">
                  <Col xs={24} md={8}>
                    <Input size="large" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="试卷标题" addonBefore="标题" />
                  </Col>
                  <Col xs={12} md={4}>
                    <Select size="large" style={{ width: '100%' }} value={subject} onChange={(v) => { setSubject(v); setTags([]); }} options={SUBJECTS.map((s) => ({ label: s, value: s }))} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Input type="date" value={paperDate} onChange={(e) => setPaperDate(e.target.value)} style={{ height: 40 }} />
                  </Col>
                  <Col xs={24} md={8}>
                    <Space>
                      <Tag color={paper.status === 'PUBLISHED' ? 'green' : 'orange'}>
                        {paper.status === 'PUBLISHED' ? '已发布' : '草稿'}
                      </Tag>
                      <span style={{ color: '#9a8e7a', fontSize: 13 }}>
                        {paper.student?.name} · {paper.teacher?.name}
                      </span>
                    </Space>
                  </Col>
                </Row>
              </Card>

              {/* Image upload */}
              <Card title="试卷图片" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Upload.Dragger
                  name="file"
                  action="/api/upload"
                  accept="image/*,.pdf"
                  multiple
                  maxCount={9}
                  showUploadList={false}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      const url = (info.file.response as { url?: string })?.url
                      if (url) setImageUrls((prev) => [...prev, url])
                    }
                  }}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">点击或拖拽上传试卷图片</p>
                  <p className="ant-upload-hint">支持图片和 PDF，最多 9 张</p>
                </Upload.Dragger>
                {imageUrls.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
                    {imageUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', background: '#faf8f5' }}>
                        <img src={normalizeUploadUrl(url)} alt={`page-${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Button
                          size="small" danger type="text"
                          icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 2, right: 2 }}
                          onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Tags */}
              <Card title="知识点标签" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Space wrap size={[6, 8]} style={{ marginBottom: 8 }}>
                  {tagOptions.map((tag) => (
                    <Tag
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        cursor: 'pointer', borderRadius: 99, padding: '4px 12px',
                        border: tags.includes(tag) ? 'none' : '1px solid rgba(255,255,255,.12)',
                        background: tags.includes(tag) ? '#E8784A' : 'transparent',
                        color: tags.includes(tag) ? '#fff' : 'rgba(255,255,255,.5)',
                      }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
                <Space.Compact style={{ width: 260 }}>
                  <Input size="small" value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="自定义标签" onPressEnter={addCustomTag} />
                  <Button size="small" onClick={addCustomTag}>添加</Button>
                </Space.Compact>
              </Card>

              {/* Questions */}
              <Card
                title="题目标注"
                extra={<Button size="small" icon={<PlusOutlined />} onClick={addQuestion}>添加题目</Button>}
                bordered={false}
                style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                {questions.length === 0 ? (
                  <Empty description="暂无题目，点击添加题目开始标注" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    {questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,.06)' }}>
                        <span style={{ color: '#9a8e7a', fontSize: 13, minWidth: 40 }}>#{q.order}</span>
                        <Input
                          size="small"
                          style={{ width: 160 }}
                          value={q.topic}
                          onChange={(e) => updateQuestion(i, 'topic', e.target.value)}
                          placeholder="知识点"
                        />
                        <Input
                          size="small"
                          style={{ flex: 1 }}
                          value={q.teacherNote}
                          onChange={(e) => updateQuestion(i, 'teacherNote', e.target.value)}
                          placeholder="老师点评"
                        />
                        <InputNumber size="small" style={{ width: 60 }} min={1} value={q.pageNum} onChange={(v) => updateQuestion(i, 'pageNum', v)} placeholder="页码" />
                        <div style={{ display: 'flex', gap: 2 }}>
                          {(Object.keys(MASTERY_CONFIG) as MasteryKey[]).map((key) => (
                            <Button
                              key={key}
                              size="small"
                              type={q.mastery === key ? 'primary' : 'default'}
                              onClick={() => updateQuestion(i, 'mastery', key)}
                              style={{
                                background: q.mastery === key ? MASTERY_CONFIG[key].color : 'transparent',
                                borderColor: MASTERY_CONFIG[key].color,
                                color: q.mastery === key ? '#fff' : MASTERY_CONFIG[key].color,
                                fontSize: 11,
                              }}
                              icon={MASTERY_CONFIG[key].icon}
                            >
                              {MASTERY_CONFIG[key].label}
                            </Button>
                          ))}
                        </div>
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeQuestion(i)} />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>

              {/* Overall comment */}
              <Card title="整体评语" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Input.TextArea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  placeholder="老师对这份试卷的整体评价与建议..."
                  maxLength={500}
                  showCount
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Card>

              {/* Action bar */}
              <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button icon={<EditOutlined />} loading={saving} onClick={saveDraft}>保存草稿</Button>
                  <Button type="primary" icon={<SendOutlined />} loading={publishing} onClick={publishPaper} style={{ background: '#1D9E75', borderColor: '#1D9E75' }}>
                    推送给家长
                  </Button>
                  <Popconfirm title="确定删除此试卷？" onConfirm={() => deletePaper(paper.id)}>
                    <Button danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Space>
          )}
        </Col>
      </Row>
    </PageLayout>
  )
}
