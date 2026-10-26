'use client'

import { useState } from 'react'
import { Alert, Button, Checkbox, Input, Modal, Space, Tag, message } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'

type Preview = {
  currentSubjects: string[]
  storedSubjects: string[]
  selectedSubjects: string[]
  addedSubjects: string[]
  removedSubjects: string[]
  addedLessonCount: number
  removedLessonCount: number
  protectedMessage: string
}

type Props = {
  groupId: string
  groupName: string
  studentId: string
  studentName: string
  availableSubjects: string[]
  initialSubjects: string[]
  onClose: () => void
  onSaved: () => void
}

export function SubjectChangeModal({
  groupId, groupName, studentId, studentName, availableSubjects, initialSubjects, onClose, onSaved,
}: Props) {
  const isMobile = useIsMobile() ?? false
  const subjects = [...new Set([...availableSubjects, ...initialSubjects])].filter(Boolean).sort()
  const [selected, setSelected] = useState<string[]>(initialSubjects.length ? initialSubjects : subjects)
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)

  const request = async (method: 'POST' | 'PATCH', expectedSubjects?: string[]) => {
    const response = await fetch(`/api/class-groups/${groupId}/enrollments/${studentId}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects: selected, expectedSubjects, reason }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '学科变更失败')
    return data as Preview
  }

  const handleNext = async () => {
    if (!selected.length) return message.warning('请至少保留一个报读学科；退班请使用“移出班级”')
    if (!preview && selected.slice().sort().join(',') !== (initialSubjects.length ? initialSubjects : subjects).slice().sort().join(',') && !reason.trim()) {
      return message.warning('请填写增减学科的原因，便于日后核对')
    }
    setBusy(true)
    try {
      if (!preview) {
        setPreview(await request('POST'))
      } else {
        await request('PATCH', preview.storedSubjects)
        message.success(`已更新 ${studentName} 的报读学科`)
        onSaved()
        onClose()
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '学科变更失败')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`${studentName} · 调整报读学科`}
      open
      onCancel={onClose}
      width={isMobile ? 'calc(100vw - 24px)' : 560}
      styles={{ body: { maxHeight: 'min(70vh, 620px)', overflowY: 'auto' } }}
      footer={[
        <Button key="cancel" onClick={preview ? () => setPreview(null) : onClose}>{preview ? '返回修改' : '取消'}</Button>,
        <Button key="confirm" type="primary" loading={busy} disabled={!subjects.length || (Boolean(preview) && !preview?.addedSubjects.length && !preview?.removedSubjects.length && !preview?.addedLessonCount && !preview?.removedLessonCount)} onClick={handleNext}>
          {preview ? '确认变更' : '预览影响'}
        </Button>,
      ]}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div style={{ color: 'var(--ink-muted, #5a4e3a)', fontSize: 13 }}>
          班级：{groupName}。只勾选实际报读的学科；调整后教师考勤与反馈名单按学科显示。
        </div>
        <Checkbox.Group
          value={selected}
          disabled={Boolean(preview) || busy}
          onChange={(values) => setSelected(values as string[])}
          options={subjects}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}
        />
        {!subjects.length && <Alert type="warning" showIcon message="该班尚无可选学科，请先排课或分配学科老师。" />}
        <Input.TextArea
          aria-label="学科变更说明"
          placeholder="增减学科时请填写原因，例如：家长申请新增英语"
          maxLength={200}
          showCount
          rows={2}
          value={reason}
          disabled={Boolean(preview) || busy}
          onChange={(event) => setReason(event.target.value)}
        />
        {preview && (
          <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2, #faf8f5)', border: '1px solid var(--hairline, rgba(0,0,0,.06))' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>变更影响</div>
            <div style={{ marginBottom: 8 }}>
              新增：{preview.addedSubjects.length ? preview.addedSubjects.map((subject) => <Tag key={subject} color="success">{subject}</Tag>) : '无'}
            </div>
            <div style={{ marginBottom: 8 }}>
              移除：{preview.removedSubjects.length ? preview.removedSubjects.map((subject) => <Tag key={subject} color="warning">{subject}</Tag>) : '无'}
            </div>
            <div>待上课名单：新增 {preview.addedLessonCount} 节，移除 {preview.removedLessonCount} 节。</div>
            <div style={{ marginTop: 8, color: 'var(--ink-muted, #5a4e3a)', fontSize: 12 }}>{preview.protectedMessage}</div>
            {(preview.addedSubjects.length > 0 || preview.removedSubjects.length > 0) && (
              <Alert
                type="warning"
                showIcon
                message="请另行核对课时与费用"
                description="本操作只变更报读学科和未开始课次名单，不自动加课时、退费或修改收费记录；如有差额，请到学员详情单独处理。"
                style={{ marginTop: 10 }}
              />
            )}
            {!preview.addedSubjects.length && !preview.removedSubjects.length && !preview.addedLessonCount && !preview.removedLessonCount && <Alert type="info" showIcon message="学科与待上课名单均未变化，无需保存。" style={{ marginTop: 10 }} />}
            {!preview.addedSubjects.length && !preview.removedSubjects.length && (preview.addedLessonCount > 0 || preview.removedLessonCount > 0) && <Alert type="info" showIcon message="报名学科未变化，但待上课名单需要同步。" style={{ marginTop: 10 }} />}
            {preview.addedSubjects.length > 0 && preview.addedLessonCount === 0 && (
              <Alert type="warning" showIcon message="新增学科目前没有待上课次，请检查排课；报名关系仍会保存。" style={{ marginTop: 10 }} />
            )}
          </div>
        )}
      </Space>
    </Modal>
  )
}
