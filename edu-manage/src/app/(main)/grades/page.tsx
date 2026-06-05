'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Button, Input, InputNumber, message,
  Popconfirm, Select, Space, Tag, Upload,
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined,
  PlusOutlined, SaveOutlined,
  SendOutlined, WarningOutlined,
} from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { format } from 'date-fns'
import { PageLayout } from '@/components/Layout/PageLayout'
import { MobileSelect } from '@/components/MobileSelect'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

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

const SUBJECT_COLORS: Record<string, string> = {
  数学: '#E8784A', 英语: '#185FA5', 物理: '#7c5cff', 化学: '#1D9E75', 语文: '#D4537E',
}

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('加载失败'); return r.json() })

export default function GradesPage() {
  const isMobile = useIsMobile() ?? false
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
      const r1 = await fetch(`/api/exam-papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, paperDate: new Date(paperDate).toISOString(), imageUrls, tags, overallComment, status: 'DRAFT' }),
      })
      if (!r1.ok) throw new Error('保存试卷信息失败')
      const r2 = await fetch(`/api/exam-papers/${paper.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      if (!r2.ok) throw new Error('保存题目失败')
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
      const r1 = await fetch(`/api/exam-papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, paperDate: new Date(paperDate).toISOString(), imageUrls, tags, overallComment }),
      })
      if (!r1.ok) throw new Error('保存试卷信息失败')
      const r2 = await fetch(`/api/exam-papers/${paper.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      if (!r2.ok) throw new Error('保存题目失败')
      const r3 = await fetch(`/api/exam-papers/${paper.id}/publish`, { method: 'POST' })
      if (!r3.ok) throw new Error('发布失败')
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '320px minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* ── 左栏：学员选择 + 试卷列表 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 14 }}>
            <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 8, fontWeight: 600 }}>选择学员</div>
            <MobileSelect
              allowClear placeholder="搜索学员姓名"
              style={{ width: '100%', marginBottom: 8 }}
              value={studentId || undefined}
              onChange={(v) => { setStudentId(v || ''); setSelectedPaperId('') }}
              options={students.map((s: Record<string, unknown>) => ({
                label: `${s.name}${s.grade ? ` / ${s.grade}` : ''}`,
                value: s.id as string,
              }))}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <Select allowClear placeholder="全部科目" style={{ flex: 1 }}
                value={filterSubject || undefined} onChange={(v) => setFilterSubject(v || '')}
                options={SUBJECTS.map(s => ({ label: s, value: s }))} />
              <Button type="primary" icon={<PlusOutlined />} onClick={createPaper}
                style={{ background: '#E8784A', borderColor: '#E8784A', flexShrink: 0 }}>
                新建
              </Button>
            </div>
          </div>

          {/* 试卷卡片列表 */}
          {!studentId ? (
            <div style={{ background: '#FCFBF9', borderRadius: 12, border: '1px dashed #EEE7E1', padding: 24, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>
              请先选择学员查看试卷
            </div>
          ) : papers.length === 0 ? (
            <div style={{ background: '#FCFBF9', borderRadius: 12, border: '1px dashed #EEE7E1', padding: 24, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>
              该学员暂无试卷，点击"新建"开始添加
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {papers.map((p: Record<string, unknown>) => {
                const pId = p.id as string
                const isSelected = selectedPaperId === pId
                const pStatus = p.status as string
                const pSubject = p.subject as string
                const statusColor = pStatus === 'PUBLISHED' ? '#1D9E75' : pStatus === 'DRAFT' ? '#E87545' : '#98A2B3'
                const statusLabel = pStatus === 'PUBLISHED' ? '已发布' : pStatus === 'DRAFT' ? '草稿' : '已删除'
                const subjectColor = SUBJECT_COLORS[pSubject] || '#8D806F'
                return (
                  <div
                    key={pId}
                    onClick={() => selectPaper(pId)}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #FFF3EC 0%, #FFF8F4 100%)' : '#fff',
                      border: `1.5px solid ${isSelected ? '#E8784A' : '#EEE7E1'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      boxShadow: isSelected ? '0 2px 12px rgba(232,120,74,.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2329', flex: 1, marginRight: 8, lineHeight: 1.4 }}>
                        {p.title as string}
                      </div>
                      <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}15`, padding: '2px 8px', borderRadius: 9999, flexShrink: 0 }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: subjectColor, background: `${subjectColor}15`, padding: '1px 8px', borderRadius: 9999 }}>
                        {pSubject}
                      </span>
                      {(p.paperDate as string) && (
                        <span style={{ fontSize: 11, color: '#C4BAB0' }}>
                          {format(new Date(p.paperDate as string), 'M月d日')}
                        </span>
                      )}
                      {(p.questions as unknown[])?.length > 0 && (
                        <span style={{ fontSize: 11, color: '#C4BAB0' }}>{(p.questions as unknown[]).length}题</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 右栏：试卷编辑器 ── */}
        {!paper ? (
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px dashed #EEE7E1',
            minHeight: isMobile ? 200 : 400,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, color: '#98A2B3',
          }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>选择左侧试卷进行编辑</div>
            <div style={{ fontSize: 12 }}>或点击"新建"创建新试卷</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 顶部元信息 + 操作按钮 */}
            <div style={{ background: 'linear-gradient(135deg, #FFF3EC 0%, #FFFBF6 100%)', borderRadius: 12, border: '1px solid #F0D4C4', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    size="large"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="试卷标题（如：6月数学月考）"
                    style={{ fontSize: 16, fontWeight: 600, border: 'none', background: 'transparent', padding: '0 0 8px' }}
                    bordered={false}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Select size="small" value={subject} onChange={v => { setSubject(v); setTags([]) }}
                      options={SUBJECTS.map(s => ({ label: s, value: s }))}
                      style={{ width: 90 }} />
                    <Input type="date" value={paperDate} onChange={e => setPaperDate(e.target.value)}
                      size="small" style={{ width: 130 }} />
                    <span style={{ fontSize: 12, color: paper.status === 'PUBLISHED' ? '#1D9E75' : '#E87545' }}>
                      {paper.status === 'PUBLISHED' ? '✓ 已发布' : '○ 草稿'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button icon={<SaveOutlined />} onClick={saveDraft} loading={saving}>保存</Button>
                  {paper.status !== 'PUBLISHED' ? (
                    <Button type="primary" icon={<SendOutlined />} onClick={publishPaper} loading={publishing}
                      style={{ background: '#1D9E75', borderColor: '#1D9E75' }}>发布给家长</Button>
                  ) : (
                    <Popconfirm title="确定撤回发布？" onConfirm={async () => {
                      await fetch(`/api/exam-papers/${paper.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DRAFT' }) })
                      mutatePaper(); mutatePapers()
                    }}>
                      <Button>撤回发布</Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            </div>

            {/* 总评语 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 8 }}>总体评语</div>
              <TextArea
                value={overallComment}
                onChange={e => setOverallComment(e.target.value)}
                rows={3}
                placeholder="对本次试卷的总体评价，将显示在家长端试卷卡片顶部..."
                style={{ borderRadius: 8 }}
                maxLength={300}
                showCount
              />
            </div>

            {/* 试卷图片 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>试卷图片</div>
              {imageUrls.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
                  {imageUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4', background: '#faf8f5' }}>
                      <img src={normalizeUploadUrl(url)} alt={`p${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                      >
                        <Button danger type="text" size="small" icon={<DeleteOutlined />}
                          style={{ position: 'absolute', top: 4, right: 4, color: '#fff' }}
                          onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))} />
                        <span style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 11, color: 'rgba(255,255,255,.8)' }}>第 {i + 1} 页</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <Upload.Dragger name="file" action="/api/upload" accept="image/*,.pdf" multiple maxCount={9}
                showUploadList={false}
                onChange={(info) => {
                  if (info.file.status === 'done') {
                    const url = (info.file.response as { url?: string })?.url
                    if (url) setImageUrls(prev => [...prev, url])
                  }
                }}
                style={{ borderRadius: 8, background: imageUrls.length > 0 ? '#FCFBF9' : undefined }}
              >
                <p style={{ margin: 0, fontSize: 13, color: '#98A2B3' }}>
                  {imageUrls.length > 0 ? `已上传 ${imageUrls.length} 张，继续添加` : '点击或拖拽上传试卷图片 / PDF'}
                </p>
              </Upload.Dragger>
            </div>

            {/* 知识点标签 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329', marginBottom: 10 }}>知识点标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(SUBJECT_TAGS[subject] || []).map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} style={{
                    padding: '4px 12px', borderRadius: 9999, cursor: 'pointer', fontSize: 12,
                    background: tags.includes(tag) ? '#E8784A' : '#F5F2EE',
                    color: tags.includes(tag) ? '#fff' : '#5a4e3a',
                    border: 'none', fontWeight: tags.includes(tag) ? 600 : 400,
                    transition: 'all 0.15s',
                  }}>
                    {tag}
                  </button>
                ))}
              </div>
              <Space.Compact style={{ width: 240 }}>
                <Input size="small" value={customTag} onChange={e => setCustomTag(e.target.value)}
                  placeholder="自定义知识点" onPressEnter={addCustomTag} />
                <Button size="small" onClick={addCustomTag}>+ 添加</Button>
              </Space.Compact>
              {tags.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tags.map(tag => (
                    <Tag key={tag} closable onClose={() => setTags(prev => prev.filter(t => t !== tag))}
                      style={{ borderRadius: 9999, background: '#FFF3EC', color: '#E8784A', border: '1px solid #F5C9A3' }}>
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            {/* 题目标注 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2329' }}>题目标注</div>
                <Button size="small" icon={<PlusOutlined />} onClick={addQuestion}>添加题目</Button>
              </div>
              {questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#98A2B3', fontSize: 13 }}>
                  点击"添加题目"开始标注每道题的掌握情况
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {questions.map((q, i) => {
                    const masteryConfig = MASTERY_CONFIG[q.mastery as MasteryKey] || MASTERY_CONFIG.NEEDS_REVIEW
                    return (
                      <div key={i} style={{
                        background: `${masteryConfig.color}08`,
                        border: `1px solid ${masteryConfig.color}25`,
                        borderLeft: `4px solid ${masteryConfig.color}`,
                        borderRadius: 8, padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: masteryConfig.color, minWidth: 28 }}>#{q.order}</span>
                          <Input size="small" style={{ width: 140 }} value={q.topic}
                            onChange={e => updateQuestion(i, 'topic', e.target.value)} placeholder="知识点名称" />
                          <InputNumber size="small" style={{ width: 68 }} min={1} value={q.pageNum}
                            onChange={v => updateQuestion(i, 'pageNum', v)} placeholder="页码" addonBefore="P" />
                          <Button size="small" danger type="text" icon={<DeleteOutlined />}
                            onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))} />
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                          {(Object.keys(MASTERY_CONFIG) as MasteryKey[]).map(key => (
                            <button key={key} onClick={() => updateQuestion(i, 'mastery', key)} style={{
                              padding: '3px 10px', borderRadius: 9999, fontSize: 11, cursor: 'pointer',
                              background: q.mastery === key ? MASTERY_CONFIG[key].color : 'transparent',
                              color: q.mastery === key ? '#fff' : MASTERY_CONFIG[key].color,
                              border: `1px solid ${MASTERY_CONFIG[key].color}`,
                              fontWeight: q.mastery === key ? 600 : 400,
                            }}>
                              {MASTERY_CONFIG[key].label}
                            </button>
                          ))}
                        </div>
                        <Input size="small" value={q.teacherNote}
                          onChange={e => updateQuestion(i, 'teacherNote', e.target.value)}
                          placeholder="老师点评（可选）" style={{ borderRadius: 6 }} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Popconfirm title="确定删除此试卷？" onConfirm={() => deletePaper(paper.id)}>
                  <Button danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </div>
            </div>

          </div>
        )}
      </div>
    </PageLayout>
  )
}
