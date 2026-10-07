'use client'

import { Alert, Drawer, Input, Select, Space, Tag, Typography, message } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { TYPE_LABELS, STATUS_LABELS } from '../_types'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { localDateKey } from '@/lib/date/local-day'

const { Text } = Typography

interface ScheduleDetailPanelProps {
  selectedLesson: Record<string, unknown> | null
  editLesson: Record<string, string>
  setEditLesson: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  savingLesson: boolean
  onClose: () => void
  onSave: () => Promise<void>
  onCancel: (id: string) => Promise<void>
}

export function ScheduleDetailPanel({
  selectedLesson, editLesson, setEditLesson, savingLesson, onClose, onSave, onCancel,
}: ScheduleDetailPanelProps) {
  const router = useRouter()
  if (!selectedLesson) return null

  const selectedGroup = selectedLesson.group as Record<string, unknown> | undefined
  const selectedCourse = selectedGroup?.course as Record<string, unknown> | undefined
  const selectedTeacher = (selectedLesson.teacher as Record<string, unknown> | undefined) || selectedGroup?.teacher as Record<string, unknown> | undefined
  const selectedRoom = selectedGroup?.room as Record<string, unknown> | undefined
  const selectedType = selectedCourse?.type as string | undefined
  const selectedStatus = STATUS_LABELS[selectedLesson.status as string] || { text: String(selectedLesson.status || '-'), color: 'default' }
  const assignments = (Array.isArray(selectedGroup?.teacherAssignments) ? selectedGroup.teacherAssignments : []) as Array<{ teacherId: string; subject: string | null; teacher?: { name?: string } }>
  const teacherSubjectOptions = assignments.filter((item) => item.subject).map((item) => ({
    label: `${item.subject} · ${item.teacher?.name || '任课教师'}`,
    value: `${item.teacherId}::${item.subject}`,
  }))
  if (!teacherSubjectOptions.length && selectedGroup?.teacherId && selectedCourse?.subject) {
    teacherSubjectOptions.push({
      label: `${selectedCourse.subject} · ${(selectedGroup.teacher as { name?: string } | undefined)?.name || '任课教师'}`,
      value: `${selectedGroup.teacherId}::${selectedCourse.subject}`,
    })
  }
  const clock = chinaClock(new Date())
  const lessonDay = localDateKey(String(selectedLesson.lessonDate))
  const canEdit = selectedLesson.status === 'SCHEDULED'
    && (lessonDay > clock.day || (lessonDay === clock.day && String(selectedLesson.startTime) > clock.time))

  return (
    <Drawer title="课次详情" open={true} onClose={onClose} width={320}>
      {selectedGroup && selectedCourse && (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div style={{ height: 4, borderRadius: 4, background: '#E8784A' }} />
          <div>
            <Text strong style={{ color: '#1F2329', fontSize: 17 }}>{selectedCourse.name as string}</Text>
            <div style={{ marginTop: 6 }}><Tag color={selectedStatus.color}>{selectedStatus.text}</Tag></div>
          </div>
          <InfoRow label="班级" value={selectedGroup.name as string} />
          <InfoRow label="教师" value={selectedTeacher?.name as string || '未分配'} />
          <InfoRow label="教室" value={selectedRoom?.name as string || '未分配'} />
          <InfoRow label="时间" value={`${format(new Date(selectedLesson.lessonDate as string), 'M月d日 EEEE', { locale: zhCN })} ${selectedLesson.startTime as string}-${selectedLesson.endTime as string}`} />
          <InfoRow label="类型" value={TYPE_LABELS[selectedType || 'GROUP'] || '-'} />
          <InfoRow label="学员" value={`${Array.isArray(selectedGroup.enrollments) ? selectedGroup.enrollments.length : 0}人`} />

          {canEdit ? <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <Text strong style={{ color: '#1F2329' }}>编辑本次课</Text>
            <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 10 }}>
              <Input type="date" value={editLesson.lessonDate} onChange={e => setEditLesson(prev => ({ ...prev, lessonDate: e.target.value }))} />
              <Space.Compact style={{ width: '100%' }}>
                <Input type="time" value={editLesson.startTime} onChange={e => setEditLesson(prev => ({ ...prev, startTime: e.target.value }))} />
                <Input type="time" value={editLesson.endTime} onChange={e => setEditLesson(prev => ({ ...prev, endTime: e.target.value }))} />
              </Space.Compact>
              <Select placeholder="本次课学科与任课教师"
                value={editLesson.teacherId && editLesson.subject ? `${editLesson.teacherId}::${editLesson.subject}` : undefined}
                onChange={(value: string) => {
                  const [teacherId, subject] = value.split('::')
                  setEditLesson(prev => ({ ...prev, teacherId, subject }))
                }}
                options={teacherSubjectOptions} />
              <button onClick={onSave} disabled={savingLesson} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: '#E8784A', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}>{savingLesson ? '保存中...' : '保存本次课'}</button>
            </Space>
          </div> : <Alert type="info" showIcon message="历史或已开始的课次只读" description="涉及考勤和结算的修正请使用专门的业务纠错流程。" />}

          <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <button onClick={() => { router.push(`/courses/${selectedGroup.id}`) }} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: '#E8784A', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}><CalendarOutlined /> 进入班级管理</button>
              <button onClick={() => { message.info('复制新建请在课程管理中使用批量复制'); router.push('/courses') }} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: 'transparent', color: '#E8784A', border: '1px solid #E8784A', fontSize: 14, cursor: 'pointer',
              }}>复制新建</button>
              {canEdit && <button onClick={() => onCancel(selectedLesson.id as string)} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: 'transparent', color: '#E24B4A', border: '1px solid #E24B4A', fontSize: 14, cursor: 'pointer',
              }}>取消本次课</button>}
            </Space>
          </div>
        </Space>
      )}
    </Drawer>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
      <Text style={{ color: '#98A2B3', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#1F2329', fontSize: 12, textAlign: 'right' }}>{value}</Text>
    </div>
  )
}
