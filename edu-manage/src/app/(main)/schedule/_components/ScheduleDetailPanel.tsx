'use client'

import { Drawer, Input, Select, Space, Tag, Typography } from 'antd'
import { toast } from 'sonner'
import { CalendarOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { TYPE_LABELS, STATUS_LABELS, SUBJECTS } from '../_types'

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

          <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
            <Text strong style={{ color: '#1F2329' }}>编辑本次课</Text>
            <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 10 }}>
              <Input type="date" value={editLesson.lessonDate} onChange={e => setEditLesson(prev => ({ ...prev, lessonDate: e.target.value }))} />
              <Space.Compact style={{ width: '100%' }}>
                <Input type="time" value={editLesson.startTime} onChange={e => setEditLesson(prev => ({ ...prev, startTime: e.target.value }))} />
                <Input type="time" value={editLesson.endTime} onChange={e => setEditLesson(prev => ({ ...prev, endTime: e.target.value }))} />
              </Space.Compact>
              <Select placeholder="本次课老师" value={editLesson.teacherId || undefined}
                onChange={value => setEditLesson(prev => ({ ...prev, teacherId: value }))}
                options={(Array.isArray(selectedGroup.teacherAssignments) ? selectedGroup.teacherAssignments : []).map((a: any) => ({
                  label: a.teacher?.name || '老师', value: a.teacherId,
                }))} />
              <Select placeholder="本次课科目" value={editLesson.subject || undefined}
                onChange={value => setEditLesson(prev => ({ ...prev, subject: value }))}
                options={SUBJECTS.map(s => ({ label: s, value: s }))} />
              <Select placeholder="课次状态" value={editLesson.status || undefined}
                onChange={value => setEditLesson(prev => ({ ...prev, status: value }))}
                options={[
                  { label: '待上课', value: 'SCHEDULED' },
                  { label: '进行中', value: 'IN_PROGRESS' },
                  { label: '已完成', value: 'COMPLETED' },
                  { label: '已调课', value: 'POSTPONED' },
                  { label: '已停课', value: 'CANCELLED' },
                ]} />
              <button onClick={onSave} disabled={savingLesson} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: '#E8784A', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}>{savingLesson ? '保存中...' : '保存本次课'}</button>
            </Space>
          </div>

          <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <button onClick={() => { router.push(`/courses/${selectedGroup.id}`) }} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: '#E8784A', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}><CalendarOutlined /> 进入班级管理</button>
              <button onClick={() => { toast.info('复制新建请在课程管理中使用批量复制'); router.push('/courses') }} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: 'transparent', color: '#E8784A', border: '1px solid #E8784A', fontSize: 14, cursor: 'pointer',
              }}>复制新建</button>
              <button onClick={() => onCancel(selectedLesson.id as string)} style={{
                width: '100%', padding: '8px 0', borderRadius: 6,
                background: 'transparent', color: '#E24B4A', border: '1px solid #E24B4A', fontSize: 14, cursor: 'pointer',
              }}>取消本次课</button>
            </Space>
          </div>
        </Space>
      )}
    </Drawer>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #1f2126', paddingBottom: 8 }}>
      <Text style={{ color: '#98A2B3', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#1F2329', fontSize: 12, textAlign: 'right' }}>{value}</Text>
    </div>
  )
}
