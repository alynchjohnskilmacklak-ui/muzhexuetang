'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  SaveOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type StudentLite = { id: string; name: string }
type Goal = {
  id: string
  subject: string
  goalDesc: string
  deadline?: string | null
  isAchieved: boolean
}
type Weakness = {
  id: string
  topic: string
  mistakeCount: number
  suggestion?: string | null
  paper?: { id: string; title: string; subject: string } | null
}
type Paper = {
  id: string
  studentId: string
  title: string
  subject: string
  status: string
  student?: { id: string; name: string }
}
type StageDraft = {
  id: string
  periodStart: string
  periodEnd: string
  summary: string
  suggestions?: string | null
  dataSnapshot?: unknown
}
type StageMaterial = {
  overview: {
    attendanceRate: number | null
    masteryRate: number | null
    paperCount: number
    badgeCount: number
    totalHours: number
  }
  summarySeed: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || '请求失败')
  return data
}

async function requestJson(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || '操作失败')
  return data
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function defaultStart() {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const cardStyle = { borderRadius: 12, border: '1px solid #F0DDD2' } as const

export function TeacherStudentProfileClient({ student }: { student: StudentLite }) {
  const { data: goalsData, mutate: mutateGoals } = useSWR<{ goals: Goal[] }>(
    `/api/teacher/learning-goals?studentId=${student.id}`,
    fetcher,
  )
  const { data: weaknessData, mutate: mutateWeaknesses } = useSWR<{ weaknesses: Weakness[] }>(
    `/api/teacher/weaknesses?studentId=${student.id}`,
    fetcher,
  )
  const { data: stageData, mutate: mutateStage } = useSWR<{ material: StageMaterial | null; draft: StageDraft | null }>(
    `/api/teacher/stage-summary?studentId=${student.id}&months=3`,
    fetcher,
  )
  const { data: papers } = useSWR<Paper[]>('/api/teacher/papers', fetcher)

  const [goalSubject, setGoalSubject] = useState('')
  const [goalDesc, setGoalDesc] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [weakTopic, setWeakTopic] = useState('')
  const [weakCount, setWeakCount] = useState<number | null>(1)
  const [weakSuggestion, setWeakSuggestion] = useState('')
  const [paperId, setPaperId] = useState<string | undefined>()
  const [periodStart, setPeriodStart] = useState(defaultStart())
  const [periodEnd, setPeriodEnd] = useState(today())
  const [summary, setSummary] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [draftId, setDraftId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!stageData?.draft) return
    setDraftId(stageData.draft.id)
    setPeriodStart(toDateInput(stageData.draft.periodStart))
    setPeriodEnd(toDateInput(stageData.draft.periodEnd))
    setSummary(stageData.draft.summary || '')
    setSuggestions(stageData.draft.suggestions || '')
  }, [stageData?.draft])

  const studentPapers = useMemo(
    () => (papers || []).filter((paper) => paper.student?.id === student.id || paper.studentId === student.id),
    [papers, student.id],
  )

  const goals = goalsData?.goals || []
  const weaknesses = weaknessData?.weaknesses || []
  const material = stageData?.material

  async function addGoal() {
    try {
      await requestJson('/api/teacher/learning-goals', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, subject: goalSubject, goalDesc, deadline: goalDeadline || undefined }),
      })
      toast.success('学习目标已添加')
      setGoalSubject('')
      setGoalDesc('')
      setGoalDeadline('')
      mutateGoals()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败')
    }
  }

  async function achieveGoal(goal: Goal) {
    try {
      await requestJson('/api/teacher/learning-goals', {
        method: 'PATCH',
        body: JSON.stringify({ id: goal.id, action: 'achieve' }),
      })
      toast.success('已标记达成')
      mutateGoals()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    }
  }

  async function deleteGoal(id: string) {
    try {
      await fetch(`/api/teacher/learning-goals?id=${id}`, { method: 'DELETE' }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json())?.error || '删除失败')
      })
      toast.success('目标已删除')
      mutateGoals()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function addWeakness() {
    try {
      await requestJson('/api/teacher/weaknesses', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, topic: weakTopic, mistakeCount: weakCount || 1, suggestion: weakSuggestion }),
      })
      toast.success('薄弱点已添加')
      setWeakTopic('')
      setWeakCount(1)
      setWeakSuggestion('')
      mutateWeaknesses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加失败')
    }
  }

  async function importWeaknesses() {
    if (!paperId) {
      toast.error('请选择试卷')
      return
    }
    try {
      const data = await requestJson('/api/teacher/weaknesses', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, fromPaperId: paperId }),
      })
      toast.success(`已导入 ${data.count || 0} 项薄弱点`)
      setPaperId(undefined)
      mutateWeaknesses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败')
    }
  }

  async function deleteWeakness(id: string) {
    try {
      await fetch(`/api/teacher/weaknesses?id=${id}`, { method: 'DELETE' }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json())?.error || '删除失败')
      })
      toast.success('薄弱点已删除')
      mutateWeaknesses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function saveDraft() {
    setSaving(true)
    try {
      const data = await requestJson('/api/teacher/stage-summary', {
        method: 'POST',
        body: JSON.stringify({
          id: draftId,
          studentId: student.id,
          periodStart,
          periodEnd,
          summary,
          suggestions,
          dataSnapshot: material,
        }),
      })
      setDraftId(data.stageSummary.id)
      mutateStage()
      toast.success('草稿已保存')
      return data.stageSummary.id as string
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function publishSummary() {
    const id = await saveDraft()
    if (!id) return
    try {
      await requestJson('/api/teacher/stage-summary', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'publish' }),
      })
      toast.success('已发布，家长端档案将显示本期寄语')
      mutateStage()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 88 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>{student.name} · 学情档案</Title>
        <Text type="secondary">维护学习目标、薄弱点，并发布阶段学情小结</Text>
      </div>

      <Card bordered={false} style={cardStyle} title="学习目标">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={5}><Input placeholder="学科" value={goalSubject} onChange={(e) => setGoalSubject(e.target.value)} /></Col>
          <Col xs={24} md={9}><Input placeholder="目标描述" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} /></Col>
          <Col xs={24} md={5}><Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></Col>
          <Col xs={24} md={5}><Button type="primary" icon={<PlusOutlined />} block onClick={addGoal}>新增目标</Button></Col>
        </Row>
        <List
          style={{ marginTop: 12 }}
          dataSource={goals}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无学习目标" /> }}
          renderItem={(goal) => (
            <List.Item
              actions={[
                goal.isAchieved ? <Tag key="done" color="green">已达成</Tag> : <Button key="achieve" size="small" icon={<CheckCircleOutlined />} onClick={() => achieveGoal(goal)}>达成</Button>,
                <Popconfirm key="delete" title="删除该目标？" onConfirm={() => deleteGoal(goal.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta title={`${goal.subject}：${goal.goalDesc}`} description={goal.deadline ? `截止：${toDateInput(goal.deadline)}` : '未设置截止日期'} />
            </List.Item>
          )}
        />
      </Card>

      <Card bordered={false} style={cardStyle} title="薄弱点">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}><Input placeholder="知识点/题型" value={weakTopic} onChange={(e) => setWeakTopic(e.target.value)} /></Col>
          <Col xs={24} md={4}><InputNumber min={1} value={weakCount} onChange={setWeakCount} style={{ width: '100%' }} /></Col>
          <Col xs={24} md={9}><Input placeholder="建议" value={weakSuggestion} onChange={(e) => setWeakSuggestion(e.target.value)} /></Col>
          <Col xs={24} md={5}><Button type="primary" icon={<PlusOutlined />} block onClick={addWeakness}>新增薄弱点</Button></Col>
        </Row>
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col xs={24} md={18}>
            <Select
              placeholder="选择试卷，从需练习题目导入"
              value={paperId}
              onChange={setPaperId}
              style={{ width: '100%' }}
              options={studentPapers.map((paper) => ({ value: paper.id, label: `${paper.subject} · ${paper.title}` }))}
            />
          </Col>
          <Col xs={24} md={6}><Button icon={<FileTextOutlined />} block onClick={importWeaknesses}>从试卷导入</Button></Col>
        </Row>
        <List
          style={{ marginTop: 12 }}
          dataSource={weaknesses}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无薄弱点" /> }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm key="delete" title="删除该薄弱点？" onConfirm={() => deleteWeakness(item.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<Space wrap><Text strong>{item.topic}</Text><Tag color="volcano">错 {item.mistakeCount}</Tag>{item.paper ? <Tag>{item.paper.title}</Tag> : null}</Space>}
                description={item.suggestion || '暂无建议'}
              />
            </List.Item>
          )}
        />
      </Card>

      <Card bordered={false} style={cardStyle} title="阶段学情小结">
        {material ? (
          <div style={{ background: '#FFF8F4', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Space wrap>
              <Tag color="green">出勤 {material.overview.attendanceRate ?? '暂无'}%</Tag>
              <Tag color="blue">掌握 {material.overview.masteryRate ?? '暂无'}%</Tag>
              <Tag color="orange">试卷 {material.overview.paperCount}</Tag>
              <Tag color="purple">徽章 {material.overview.badgeCount}</Tag>
            </Space>
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: '10px 0 0' }}>{material.summarySeed}</Paragraph>
            <Button size="small" onClick={() => setSummary(material.summarySeed)} style={{ marginTop: 8 }}>一键填入底稿</Button>
          </div>
        ) : null}

        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} addonBefore="开始" /></Col>
          <Col xs={24} md={12}><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} addonBefore="结束" /></Col>
          <Col xs={24}>
            <Text strong>教师寄语/小结</Text>
            <TextArea rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="请结合自动素材，写出给家长看的阶段小结" />
          </Col>
          <Col xs={24}>
            <Text strong>下一步建议</Text>
            <TextArea rows={4} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} placeholder="例如：接下来重点巩固计算准确率，每周完成一次错题复盘" />
          </Col>
        </Row>

        <Space wrap style={{ marginTop: 14 }}>
          <Button icon={<SaveOutlined />} loading={saving} onClick={saveDraft}>保存草稿</Button>
          <Button type="primary" icon={<RocketOutlined />} loading={saving} onClick={publishSummary}>发布给家长</Button>
        </Space>
      </Card>
    </div>
  )
}
