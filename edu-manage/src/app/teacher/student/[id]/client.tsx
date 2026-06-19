'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Empty, Input, InputNumber, List, Popconfirm, Select, Space, Tag, Typography, Upload, Progress, Segmented } from 'antd'
import {
  CheckCircleOutlined, DeleteOutlined, FileTextOutlined, PlusOutlined,
  RocketOutlined, SaveOutlined, ArrowLeftOutlined, SendOutlined,
  BookOutlined, TrophyOutlined, ClockCircleOutlined, LineChartOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const fetcher = (url: string) => fetch(url).then(async r => {
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || '请求失败')
  return data
})

async function requestJson(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '操作失败')
  return data
}

const MASTERY_LEVELS = [
  { value: 'MASTERED', label: '已掌握', color: 'green' },
  { value: 'NEEDS_REVIEW', label: '需复习', color: 'orange' },
  { value: 'NEEDS_PRACTICE', label: '薄弱', color: 'red' },
]

export function TeacherStudentWorkbenchClient({ studentId, studentName, teacherId }: { studentId: string; studentName: string; teacherId: string }) {
  const router = useRouter()
  const [tab, setTab] = useState('overview')

  // Stage summary
  const [stageData, setStageData] = useState<any>(null)
  const [summary, setSummary] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [saving, setSaving] = useState(false)

  // Goals
  const [goals, setGoals] = useState<any[]>([])
  const [goalSubject, setGoalSubject] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  // Weaknesses
  const [weaknesses, setWeaknesses] = useState<any[]>([])
  const [weakTopic, setWeakTopic] = useState('')
  const [weakCount, setWeakCount] = useState<number | null>(1)
  const [weakSuggestion, setWeakSuggestion] = useState('')

  // Mastery push
  const [kpInput, setKpInput] = useState('')
  const [kpLevel, setKpLevel] = useState('NEEDS_REVIEW')
  const [kpNote, setKpNote] = useState('')
  const [masteryRecords, setMasteryRecords] = useState<any[]>([])

  // Growth feedback (merged: classroom-feedback + performance)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackMood, setFeedbackMood] = useState('GOOD')
  const [feedbackTags, setFeedbackTags] = useState('')
  const [homeworkDone, setHomeworkDone] = useState<boolean | null>(null)
  const [inClassRating, setInClassRating] = useState<number | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [feedbackSaving, setFeedbackSaving] = useState(false)

  useEffect(() => {
    // Load stage summary
    fetcher(`/api/teacher/stage-summary?studentId=${studentId}&months=3`).then(d => setStageData(d)).catch(() => {})
    // Load goals
    fetcher(`/api/teacher/learning-goals?studentId=${studentId}`).then(d => setGoals(d.goals || [])).catch(() => {})
    // Load weaknesses
    fetcher(`/api/teacher/weaknesses?studentId=${studentId}`).then(d => setWeaknesses(d.weaknesses || [])).catch(() => {})
    // Load mastery records
    fetcher(`/api/teacher/mastery?studentId=${studentId}`).then(d => setMasteryRecords(d.records || [])).catch(() => {})
  }, [studentId])

  async function saveStage() {
    setSaving(true)
    try {
      await requestJson('/api/teacher/stage-summary', {
        method: 'POST',
        body: JSON.stringify({ studentId, periodStart: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0,10), periodEnd: new Date().toISOString().slice(0,10), summary, suggestions }),
      })
      toast.success('草稿已保存')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function publishStage() {
    setSaving(true)
    try {
      const d = await requestJson('/api/teacher/stage-summary', {
        method: 'POST',
        body: JSON.stringify({ studentId, periodStart: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0,10), periodEnd: new Date().toISOString().slice(0,10), summary, suggestions }),
      })
      await requestJson('/api/teacher/stage-summary', {
        method: 'PATCH',
        body: JSON.stringify({ id: d.stageSummary.id, action: 'publish' }),
      })
      toast.success('已发布，家长端将显示本期寄语')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function addGoal() {
    try {
      await requestJson('/api/teacher/learning-goals', { method: 'POST', body: JSON.stringify({ studentId, subject: goalSubject, goalDesc }) })
      toast.success('目标已添加'); setGoalSubject(''); setGoalDesc('')
      const d = await fetcher(`/api/teacher/learning-goals?studentId=${studentId}`); setGoals(d.goals || [])
    } catch (e: any) { toast.error(e.message) }
  }

  async function addWeakness() {
    try {
      await requestJson('/api/teacher/weaknesses', { method: 'POST', body: JSON.stringify({ studentId, topic: weakTopic, mistakeCount: weakCount || 1, suggestion: weakSuggestion }) })
      toast.success('薄弱点已添加'); setWeakTopic(''); setWeakCount(1); setWeakSuggestion('')
      const d = await fetcher(`/api/teacher/weaknesses?studentId=${studentId}`); setWeaknesses(d.weaknesses || [])
    } catch (e: any) { toast.error(e.message) }
  }

  async function pushMastery() {
    try {
      await requestJson('/api/teacher/mastery', { method: 'POST', body: JSON.stringify({ studentId, teacherId, knowledgePoint: kpInput, level: kpLevel, note: kpNote || undefined }) })
      toast.success('知识点掌握已推送'); setKpInput(''); setKpNote('')
      const d = await fetcher(`/api/teacher/mastery?studentId=${studentId}`); setMasteryRecords(d.records || [])
    } catch (e: any) { toast.error(e.message) }
  }

  async function submitFeedback() {
    if (!feedbackText.trim()) { toast.warning('请输入反馈内容'); return }
    setFeedbackSaving(true)
    try {
      await requestJson('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: [studentId],
          mood: feedbackMood,
          tags: feedbackTags.split(/[,，]/).filter(Boolean).map((t: string) => t.trim()),
          overallComment: feedbackText,
          homeworkDone, inClassRating,
          imageUrls, status: 'PUBLISHED',
        }),
      })
      toast.success('成长反馈已发布，家长会立即收到通知')
      setFeedbackText(''); setFeedbackMood('GOOD'); setFeedbackTags('')
      setHomeworkDone(null); setInClassRating(null); setImageUrls([])
    } catch (e: any) { toast.error(e.message) }
    finally { setFeedbackSaving(false) }
  }

  const cardStyle = { borderRadius: 12, border: '1px solid #F0DDD2' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 88 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push('/teacher/students')}>返回</Button>
        <Title level={3} style={{ margin: 0 }}>{studentName} · 学生工作台</Title>
      </div>

      <Segmented block
        value={tab}
        onChange={setTab}
        options={[
          { label: '阶段寄语', value: 'overview', icon: <RocketOutlined /> },
          { label: '成长反馈', value: 'feedback', icon: <SendOutlined /> },
          { label: '知识掌握', value: 'mastery', icon: <BookOutlined /> },
          { label: '学习目标', value: 'goals', icon: <TrophyOutlined /> },
          { label: '薄弱点', value: 'weakness', icon: <LineChartOutlined /> },
        ]}
        style={{ marginBottom: 14 }}
      />

      {/* Stage Summary */}
      {tab === 'overview' && (
        <Card bordered={false} style={cardStyle} title={<span><RocketOutlined /> 阶段学情寄语（家长端「案」板块）</span>}>
          {stageData?.material && (
            <div style={{ background: '#FFF8F4', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Space wrap>
                <Tag color="green">出勤 {stageData.material.overview.attendanceRate ?? '暂无'}%</Tag>
                <Tag color="blue">掌握 {stageData.material.overview.masteryRate ?? '暂无'}%</Tag>
              </Space>
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: '10px 0 0' }}>{stageData.material.summarySeed}</Paragraph>
            </div>
          )}
          <Text strong>教师寄语/小结</Text>
          <TextArea rows={5} value={summary} onChange={e => setSummary(e.target.value)} placeholder="结合自动素材，写给家长看的阶段学情小结" />
          <div style={{ marginTop: 10 }}><Text strong>下一步建议</Text></div>
          <TextArea rows={3} value={suggestions} onChange={e => setSuggestions(e.target.value)} placeholder="例如：接下来重点巩固计算准确率" />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<SaveOutlined />} loading={saving} onClick={saveStage}>保存草稿</Button>
            <Button type="primary" icon={<RocketOutlined />} loading={saving} onClick={publishStage}>发布给家长</Button>
          </Space>
        </Card>
      )}

      {/* Growth Feedback */}
      {tab === 'feedback' && (
        <Card bordered={false} style={cardStyle} title={<span><SendOutlined /> 成长反馈</span>}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>反馈内容</Text>
          <TextArea rows={3} value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="写一句话描述孩子的课堂表现或成长亮点..." />

          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div><Text type="secondary">情绪</Text>
              <Select size="small" value={feedbackMood} onChange={setFeedbackMood} style={{ width: 100 }}
                options={[
                  { value: 'GREAT', label: '😄 很棒' }, { value: 'GOOD', label: '🙂 良好' },
                  { value: 'OKAY', label: '😐 平稳' }, { value: 'NEEDS_ATTENTION', label: '😟 需关注' },
                ]} />
            </div>
            <div><Text type="secondary">作业完成</Text>
              <Select size="small" value={homeworkDone} onChange={setHomeworkDone} style={{ width: 80 }} allowClear placeholder="-"
                options={[{ value: true, label: '✅ 完成' }, { value: false, label: '❌ 未完成' }]} />
            </div>
            <div><Text type="secondary">课堂表现 1-5</Text>
              <InputNumber size="small" min={1} max={5} value={inClassRating} onChange={setInClassRating} style={{ width: 60 }} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}><Text type="secondary">标签（逗号分隔）</Text>
            <Input size="small" value={feedbackTags} onChange={e => setFeedbackTags(e.target.value)} placeholder="积极,专注,进步" />
          </div>

          <div style={{ marginTop: 12 }}>
            <Upload.Dragger name="file" action="/api/upload" accept="image/*" multiple maxCount={9} showUploadList={false}
              data={{ uploadType: 'teacher-feedback' }}
              beforeUpload={file => { if (file.size > 5*1024*1024) { toast.warning('图片不超过5MB'); return Upload.LIST_IGNORE }; return true }}
              onChange={info => { if (info.file.status === 'done') { const url = (info.file.response as any)?.url; if (url) setImageUrls(p => [...p, url]) } }}>
              <div style={{ fontSize: 13, color: '#98A2B3' }}>拖拽上传课堂照片（≤5MB）</div>
            </Upload.Dragger>
            {imageUrls.length > 0 && <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{imageUrls.map((url, i) => <img key={i} src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />)}</div>}
          </div>

          <Button type="primary" icon={<SendOutlined />} loading={feedbackSaving} onClick={submitFeedback}
            style={{ marginTop: 14, background: '#E8784A', border: 'none' }}>发布反馈</Button>
        </Card>
      )}

      {/* Mastery Push */}
      {tab === 'mastery' && (
        <div>
          <Card bordered={false} style={cardStyle} title={<span><BookOutlined /> 知识点掌握推送</span>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input placeholder="知识点名称" value={kpInput} onChange={e => setKpInput(e.target.value)} />
              <Select value={kpLevel} onChange={setKpLevel} options={MASTERY_LEVELS} />
              <Input placeholder="备注（可选）" value={kpNote} onChange={e => setKpNote(e.target.value)} />
              <Button type="primary" icon={<PlusOutlined />} onClick={pushMastery}>推送到学习档案</Button>
            </Space>
          </Card>
          <Card bordered={false} style={{ ...cardStyle, marginTop: 12 }} title="已推送记录">
            {masteryRecords.length === 0 ? <Empty description="暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <List dataSource={masteryRecords.slice(0, 20)} renderItem={(r: any) => (
                <List.Item><List.Item.Meta title={r.knowledgePoint}
                  description={<Tag color={r.level === 'MASTERED' ? 'green' : r.level === 'NEEDS_PRACTICE' ? 'red' : 'orange'}>{MASTERY_LEVELS.find(l => l.value === r.level)?.label}</Tag>} /></List.Item>
              )} />
            )}
          </Card>
        </div>
      )}

      {/* Goals */}
      {tab === 'goals' && (
        <Card bordered={false} style={cardStyle} title="学习目标">
          <Space style={{ width: '100%' }}>
            <Input placeholder="学科" value={goalSubject} onChange={e => setGoalSubject(e.target.value)} style={{ width: 100 }} />
            <Input placeholder="目标描述" value={goalDesc} onChange={e => setGoalDesc(e.target.value)} style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={addGoal}>新增</Button>
          </Space>
          <List style={{ marginTop: 12 }} dataSource={goals} renderItem={(goal: any) => (
            <List.Item actions={[
              goal.isAchieved ? <Tag color="green">已达成</Tag> : <Button size="small" onClick={async () => { await requestJson('/api/teacher/learning-goals', { method: 'PATCH', body: JSON.stringify({ id: goal.id, action: 'achieve' }) }); const d = await fetcher(`/api/teacher/learning-goals?studentId=${studentId}`); setGoals(d.goals || []) }}>达成</Button>,
            ]}>{goal.subject}：{goal.goalDesc}</List.Item>
          )} />
        </Card>
      )}

      {/* Weakness */}
      {tab === 'weakness' && (
        <Card bordered={false} style={cardStyle} title="薄弱点">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input placeholder="知识点/题型" value={weakTopic} onChange={e => setWeakTopic(e.target.value)} />
            <InputNumber min={1} value={weakCount} onChange={setWeakCount} style={{ width: '100%' }} placeholder="错题次数" />
            <Input placeholder="建议（可选）" value={weakSuggestion} onChange={e => setWeakSuggestion(e.target.value)} />
            <Button type="primary" icon={<PlusOutlined />} onClick={addWeakness}>新增薄弱点</Button>
          </Space>
          <List style={{ marginTop: 12 }} dataSource={weaknesses} renderItem={(w: any) => (
            <List.Item><List.Item.Meta title={<Space><Text strong>{w.topic}</Text><Tag color="volcano">错 {w.mistakeCount}</Tag></Space>} description={w.suggestion || '暂无建议'} /></List.Item>
          )} />
        </Card>
      )}
    </div>
  )
}
