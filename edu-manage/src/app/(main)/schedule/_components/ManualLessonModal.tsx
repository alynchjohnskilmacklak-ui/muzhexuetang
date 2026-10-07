'use client'

import { useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { Alert, DatePicker, Input, Modal, Select, Space, Tag, message } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { useDivision } from '@/contexts/DivisionContext'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('班级资料加载失败')
  return response.json()
}

type Props = {
  initialGroupId?: string
  initialDate?: string
  onClose: () => void
  onSuccess: () => void
}

export function ManualLessonModal({ initialGroupId, initialDate, onClose, onSuccess }: Props) {
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const [groupId, setGroupId] = useState(initialGroupId || '')
  const [date, setDate] = useState(initialDate || dayjs().format('YYYY-MM-DD'))
  const [assignmentKey, setAssignmentKey] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: groups, error: groupsError } = useSWR(!initialGroupId ? `/api/class-groups?division=${division}` : null, fetcher)
  const { data: group, error: groupError } = useSWR(groupId ? `/api/class-groups/${groupId}` : null, fetcher)

  const assignments: Array<{ teacherId: string; subject: string; teacherName: string }> = Array.isArray(group?.teacherAssignments) && group.teacherAssignments.length
    ? group.teacherAssignments.filter((item: { subject?: string | null }) => Boolean(item.subject)).map((item: { teacherId: string; subject: string; teacher?: { name?: string } }) => ({
        teacherId: item.teacherId, subject: item.subject, teacherName: item.teacher?.name || '任课教师',
      }))
    : group?.teacherId && group?.course?.subject
      ? [{ teacherId: group.teacherId, subject: group.course.subject, teacherName: group.teacher?.name || '任课教师' }]
      : []
  const selectedAssignment = assignments.find((item) => `${item.teacherId}::${item.subject}` === assignmentKey)
  const studentCount = selectedAssignment && Array.isArray(group?.enrollments)
    ? group.enrollments.filter((enrollment: { subjects: string[] }) => enrollmentIncludesSubject(enrollment.subjects || [], selectedAssignment.subject)).length
    : 0

  const save = async () => {
    if (!groupId || !selectedAssignment || !date || !startTime || !endTime) {
      message.warning('请填写班级、科目教师、日期和时间')
      return
    }
    if (note.trim().length < 2) {
      message.warning('请填写本次临时加课原因')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/class-groups/${groupId}/lessons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, startTime, endTime,
          teacherId: selectedAssignment.teacherId,
          subject: selectedAssignment.subject,
          note: note.trim(),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '临时加课失败')
      message.success(`已加课，${result.studentCount || 0} 名已报该学科的学员进入名单`)
      onSuccess()
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '临时加课失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="为现有班级临时加课"
      open
      onCancel={onClose}
      onOk={save}
      confirmLoading={saving}
      okText="确认加课"
      cancelText="取消"
      width={isMobile ? 'calc(100vw - 24px)' : 560}
      styles={{ body: { maxHeight: 'min(70vh, 620px)', overflowY: 'auto' } }}
    >
      <Space direction="vertical" size={14} style={{ width: '100%', maxWidth: '100%' }}>
        <Alert type="info" showIcon message="任意日期单独加课" description="适用于国庆补课、临时加课等情况，不改变固定每周上课日，也不会替换其他课次。" />
        {groupsError && <Alert type="error" showIcon message="班级列表加载失败，请重新打开。" />}
        <div>
          <div style={{ marginBottom: 6 }}>班级</div>
          <Select
            showSearch={!isMobile}
            optionFilterProp="label"
            placeholder="选择已有班级"
            value={groupId || undefined}
            disabled={Boolean(initialGroupId)}
            onChange={(value) => { setGroupId(value); setAssignmentKey(''); setStartTime(''); setEndTime('') }}
            options={initialGroupId
              ? [{ value: initialGroupId, label: group?.name || '当前班级' }]
              : (Array.isArray(groups) ? groups : []).filter((item: { status?: string; term?: { status?: string } }) => item.status !== 'ARCHIVED' && item.term?.status === 'ACTIVE').map((item: { id: string; name: string; course?: { name?: string } }) => ({
                  value: item.id, label: `${item.name} · ${item.course?.name || '课程'}`,
                }))}
            style={{ width: '100%' }}
            listHeight={240}
            virtual={false}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          />
        </div>
        {groupError && <Alert type="error" showIcon message="班级详情加载失败，请重新选择。" />}
        {groupId && (
          <>
            <div>
              <div style={{ marginBottom: 6 }}>科目与任课教师</div>
              <Select
                placeholder="选择本次课的学科和老师"
                value={assignmentKey || undefined}
                onChange={setAssignmentKey}
                options={assignments.map((item) => ({ value: `${item.teacherId}::${item.subject}`, label: `${item.subject} · ${item.teacherName}` }))}
                style={{ width: '100%' }}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              {!assignments.length && group && <Alert type="warning" showIcon message="该班尚未分配学科教师，请先在班级管理中配置。" style={{ marginTop: 8 }} />}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <div style={{ marginBottom: 6 }}>上课日期</div>
                <DatePicker value={date ? dayjs(date) : null} onChange={(_, value) => setDate(Array.isArray(value) ? value[0] || '' : value)} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                <div style={{ marginBottom: 6 }}>开始</div>
                <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                <div style={{ marginBottom: 6 }}>结束</div>
                <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
            <Input.TextArea aria-label="临时加课原因" placeholder="说明加课原因，例如：国庆补课" rows={2} maxLength={200} showCount value={note} onChange={(event) => setNote(event.target.value)} />
            <div style={{ padding: 12, background: 'var(--color-surface-3)', borderRadius: 10, color: 'var(--color-text-secondary)' }}>
              <div>预计名单：<Tag color="processing">{studentCount} 名已报该学科的学员</Tag></div>
              <div style={{ fontSize: 12, marginTop: 6 }}>保存时会再次检查教师、教室和学员冲突；开课并完成考勤后，才按原流程结算课时。家长课表会同步更新。</div>
            </div>
          </>
        )}
      </Space>
    </Modal>
  )
}
