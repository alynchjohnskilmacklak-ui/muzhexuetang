'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Alert, Button, Card, Empty, Form, Input, InputNumber, Modal, Select, Space, Typography, message } from 'antd'
import type { InputRef } from 'antd'
import { DownloadOutlined, FileTextOutlined, BarChartOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { calculateGradeStats, countCompletedGradeEntries, isInvalidGradeScore } from '@/lib/gradebook-stats'

type Student = { id: string; name: string }
type Group = {
  id: string
  name: string
  course: { name: string; subject: string | null; grade: string | null }
  enrollments: Array<{ studentId: string; student: Student }>
}
type Assessment = {
  id: string
  name: string
  type: string
  assessDate: string
  fullScore: number
  absentStudentIds: string[]
  gradeRecords: Array<{ id: string; score: number; comment: string | null; notifySent: boolean; student: Student }>
}

const EXAM_TYPES = [
  { value: 'STAGE', label: '阶段测评' },
  { value: 'WEEKLY', label: '周测' },
  { value: 'MONTHLY', label: '月考' },
  { value: 'MOCK', label: '模拟考' },
]
const TYPE_LABELS: Record<string, string> = {
  DIAGNOSTIC: '诊断测评', STAGE: '阶段测评', WEEKLY: '周测', MONTHLY: '月考', FINAL: '期末测评', MOCK: '模拟考',
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '加载失败')
  return data
}

function localDateInput() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function GradebookPage() {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const [groupId, setGroupId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [scores, setScores] = useState<Record<string, string>>({})
  const [absent, setAbsent] = useState<Record<string, boolean>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form] = Form.useForm()
  const inputRefs = useRef<Record<string, InputRef | null>>({})

  const { data: groups = [], error: groupsError, isLoading: groupsLoading } = useSWR<Group[]>(
    '/api/class-groups?status=ACTIVE&include=all', fetcher,
  )
  const selectedGroup = groups.find((group) => group.id === groupId)
  const assessmentUrl = groupId ? `/api/assessments?groupId=${encodeURIComponent(groupId)}` : null
  const { data: assessments = [], error: assessmentsError, isLoading: assessmentsLoading, mutate: refreshAssessments } = useSWR<Assessment[]>(assessmentUrl, fetcher)
  const exam = assessments.find((item) => item.id === assessmentId)
  const students = selectedGroup?.enrollments.map((enrollment) => enrollment.student) || []
  const fullScore = exam?.fullScore ?? 100

  useEffect(() => {
    if (!groupId && groups.length) setGroupId(groups[0].id)
  }, [groupId, groups])

  useEffect(() => {
    if (assessments.length && !assessments.some((item) => item.id === assessmentId)) setAssessmentId(assessments[0].id)
    if (!assessments.length) setAssessmentId('')
  }, [assessmentId, assessments])

  useEffect(() => {
    if (!exam) {
      setScores({})
      setAbsent({})
      return
    }
    setScores(Object.fromEntries(exam.gradeRecords.map((record) => [record.student.id, String(record.score)])))
    setAbsent(Object.fromEntries((exam.absentStudentIds || []).map((studentId) => [studentId, true])))
  }, [exam])

  const isInvalid = (value?: string) => isInvalidGradeScore(value, fullScore)
  const studentIds = students.map((student) => student.id)
  const hasInvalid = students.some((student) => !absent[student.id] && isInvalid(scores[student.id]))
  const doneCount = countCompletedGradeEntries(studentIds, scores, absent)
  const scoreValues = students.flatMap((student) => {
    const value = scores[student.id]?.trim()
    if (absent[student.id] || !value || isInvalid(value)) return []
    return [Number(value)]
  })
  const stats = calculateGradeStats(scoreValues)

  const focusNext = (index: number) => {
    const next = students[index + 1]
    if (next) inputRefs.current[next.id]?.focus()
  }

  const selectAssessment = (nextId: string) => {
    setAssessmentId(nextId)
    setScores({})
    setAbsent({})
  }

  const createAssessment = async () => {
    setCreating(true)
    try {
      const values = await form.validateFields()
      if (!groupId) {
        message.error('请先选择班级')
        return
      }
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          name: values.name.trim(),
          type: values.type,
          assessDate: values.date,
          fullScore: values.fullScore,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '创建测评失败')
      setCreateOpen(false)
      form.resetFields()
      await refreshAssessments()
      setAssessmentId(result.id)
      setScores({})
      setAbsent({})
      message.success('已创建，可以开始录入')
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(error instanceof Error ? error.message : '创建测评失败')
    } finally {
      setCreating(false)
    }
  }

  const save = async (notifyParents: boolean) => {
    if (!exam) return
    if (hasInvalid) {
      message.error(`有成绩超出 0–${fullScore} 的范围，请先修正`)
      return
    }
    if (notifyParents && doneCount < students.length) return
    if (doneCount === 0) {
      message.error('请先录入成绩或标记缺考')
      return
    }

    const records = students.flatMap((student) => {
      const value = scores[student.id]?.trim()
      if (absent[student.id] || !value) return []
      return [{ studentId: student.id, score: Number(value) }]
    })
    const absentStudentIds = students.filter((student) => absent[student.id]).map((student) => student.id)
    setSaving(true)
    try {
      const response = await fetch('/api/grade-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: exam.id, records, absentStudentIds, replaceRosterState: true, notifyParents }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '保存成绩失败')
      await refreshAssessments()
      message.success(notifyParents ? '成绩已保存，并已通知家长' : '成绩已保存')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存成绩失败')
    } finally {
      setSaving(false)
    }
  }

  const exportGrades = async () => {
    if (!exam) return
    setExporting(true)
    try {
      const response = await fetch(`/api/grade-records/export?assessmentId=${encodeURIComponent(exam.id)}`)
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || '导出失败')
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${exam.name}_成绩单.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
      message.success('成绩单已导出')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageLayout
      title="测评成绩"
      subtitle="选择班级和测评，逐人录入成绩或标记缺考"
    >
      <div style={{ paddingBottom: 88, width: '100%', maxWidth: 900, margin: '0 auto' }}>
        {groupsError && <Alert type="error" showIcon message={groupsError.message} style={{ marginBottom: 12 }} />}
        {assessmentsError && <Alert type="error" showIcon message={assessmentsError.message} style={{ marginBottom: 12 }} />}

        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', borderRadius: 14, padding: 12, boxShadow: '0 6px 18px rgba(26,18,1,.06)' }}>
          <Space style={{ display: 'flex', width: '100%' }} size={8}>
            <Select
              aria-label="选择班级"
              loading={groupsLoading}
              size="large"
              value={groupId || undefined}
              onChange={(value) => { setGroupId(value); setAssessmentId(''); setScores({}); setAbsent({}) }}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
              placeholder="选择班级"
              style={{ flex: 1, minWidth: 0 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={280}
              virtual={false}
            />
            <Select
              aria-label="选择测评"
              loading={assessmentsLoading}
              size="large"
              value={assessmentId || undefined}
              onChange={selectAssessment}
              options={assessments.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="选择测评"
              notFoundContent="还没有测评"
              style={{ flex: 1, minWidth: 0 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={280}
              virtual={false}
            />
            <Button type="primary" style={{ minHeight: 44, background: '#14574D', borderColor: '#14574D' }} onClick={() => setCreateOpen(true)}>新建</Button>
          </Space>
        </div>

        {!exam ? (
          <div style={{ padding: '56px 12px' }}>
            <Empty description={groups.length ? '先新建或选择一场测评，再录入成绩' : '当前学部暂无在读班级'}>
              {!!groups.length && <Button type="primary" style={{ minHeight: 44, background: '#14574D', borderColor: '#14574D' }} onClick={() => setCreateOpen(true)}>新建测评</Button>}
            </Empty>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 4px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: 'var(--color-ink-muted)', fontSize: 13 }}>
              <span>{TYPE_LABELS[exam.type] || exam.type} · {new Date(exam.assessDate).toLocaleDateString('zh-CN')} · 满分 {fullScore}</span>
              <span>均分 {stats.average === null ? '—' : stats.average.toFixed(1)} · 最高 {stats.maximum ?? '—'} · 最低 {stats.minimum ?? '—'}</span>
            </div>

            <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14, overflow: 'hidden' }}>
              {students.map((student, index) => {
                const isAbsent = Boolean(absent[student.id])
                const invalid = isInvalid(scores[student.id])
                return (
                  <div
                    key={student.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, minHeight: 62,
                      padding: isMobile ? '9px 12px' : '10px 16px',
                      borderBottom: index === students.length - 1 ? 'none' : '1px solid var(--color-hairline-tertiary)',
                      opacity: isAbsent ? 0.58 : 1,
                    }}
                  >
                    <span style={{ width: 22, color: 'var(--color-ink-subtle)', fontSize: 13, textAlign: 'right', flex: '0 0 22px' }}>{index + 1}</span>
                    <Typography.Text strong style={{ flex: 1, minWidth: 0, fontSize: 16, overflowWrap: 'anywhere' }}>{student.name}</Typography.Text>
                    <a
                      href={`/student-archive?studentId=${student.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#14574D',
                        background: '#E8F2F0',
                        border: '1px solid rgba(20,87,77,0.2)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        marginRight: 4,
                      }}
                      title="查看该学员学情档案"
                    >
                      档案
                    </a>
                    <Button
                      aria-pressed={isAbsent}
                      type={isAbsent ? 'primary' : 'default'}
                      danger={isAbsent}
                      onClick={() => setAbsent((previous) => ({ ...previous, [student.id]: !isAbsent }))}
                      style={{ minHeight: 44, flex: '0 0 auto', paddingInline: 10 }}
                    >缺考</Button>
                    <Input
                      ref={(element) => { inputRefs.current[student.id] = element }}
                      disabled={isAbsent}
                      size="large"
                      status={invalid ? 'error' : undefined}
                      value={scores[student.id] ?? ''}
                      onChange={(event) => setScores((previous) => ({ ...previous, [student.id]: event.target.value }))}
                      onPressEnter={() => focusNext(index)}
                      inputMode="decimal"
                      enterKeyHint={index === students.length - 1 ? 'done' : 'next'}
                      placeholder="分数"
                      suffix={<span style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>/{fullScore}</span>}
                      aria-label={`${student.name}成绩`}
                      style={{ width: isMobile ? 108 : 128, minHeight: 44, flex: '0 0 auto' }}
                    />
                  </div>
                )
              })}
              {!students.length && <div style={{ padding: 24 }}><Empty description="当前班级没有在班学生" /></div>}
            </Card>

            {hasInvalid && <div role="alert" style={{ padding: '8px 4px', color: 'var(--color-semantic-error)', fontSize: 13 }}>标红的成绩不在 0–{fullScore} 范围内</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => void exportGrades()}>导出成绩单</Button>
            </div>
          </>
        )}

        {exam && <div style={{ position: 'sticky', bottom: 0, zIndex: 20, marginTop: 10, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', borderRadius: 14, padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -5px 18px rgba(26,18,1,.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, color: 'var(--color-ink-muted)', fontSize: 13 }}>已录入 {doneCount}/{students.length}</span>
          <Button style={{ minHeight: 44 }} loading={saving} onClick={() => void save(false)}>保存</Button>
          <Button type="primary" style={{ minHeight: 44 }} loading={saving} disabled={doneCount < students.length || hasInvalid || students.length === 0} onClick={() => void save(true)}>保存并通知家长</Button>
        </div>}
      </div>

      <Modal title="新建测评" open={createOpen} confirmLoading={creating} onOk={() => void createAssessment()} onCancel={() => setCreateOpen(false)} okText="创建测评" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ type: 'STAGE', date: localDateInput(), fullScore: 100 }}>
          <Form.Item name="name" label="测评名称" rules={[{ required: true, whitespace: true, message: '请输入测评名称' }, { max: 120, message: '测评名称不能超过 120 字' }]}>
            <Input placeholder="如：11月阶段测评" maxLength={120} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择测评类型' }]}>
            <Select options={EXAM_TYPES} />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择测评日期' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="fullScore" label="满分" rules={[{ required: true, message: '请输入满分' }]}>
            <InputNumber min={1} max={1000} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  )
}
