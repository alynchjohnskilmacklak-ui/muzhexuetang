'use client'

import { Button, Space, Tooltip, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, ProfileOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

import { StatusBadge } from './StatusBadge'
import { formatHours } from '@/lib/format'

const { Text } = Typography

const AVATAR_COLORS = ['#E8784A', '#27a644', '#b37feb', '#f5a623', '#828fff', '#e03e2d']
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ONE_ON_ONE: { bg: '#EEEDFE', text: '#3C3489', label: '一对一' },
  ONE_ON_TWO: { bg: '#E6F1FB', text: '#185FA5', label: '一对二' },
  ONE_ON_THREE: { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  SMALL_GROUP: { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  GROUP: { bg: '#FAEEDA', text: '#633806', label: '班课' },
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function CourseTypeBadge({ type }: { type?: string | null }) {
  const config = TYPE_COLORS[type || ''] || { bg: '#F4F5F7', text: '#6B7280', label: '未分班' }
  return (
    <span style={{ borderRadius: 6, padding: '2px 7px', fontSize: 11, background: config.bg, color: config.text, lineHeight: 1.6 }}>
      {config.label}
    </span>
  )
}

type StudentCardProps = {
  student: {
    id: string
    name: string
    status: string
    gender?: string | null
    grade?: string | null
    school?: string | null
    enrolledAt: Date | string
    remainHours: number
    totalHours: number
    source?: string | null
    courseType?: string | null
    mainTeacher?: { id: string; name: string } | null
    schedules?: Array<{ schedule: { course?: { id: string; name: string } | null } }>
  }
  onEdit: (student: Record<string, unknown>) => void
  onDelete: (student: Record<string, unknown>) => void
}

export function StudentCard({ student, onEdit, onDelete }: StudentCardProps) {
  const router = useRouter()
  const isLowHours = student.remainHours <= 3 && student.status === 'ACTIVE'
  const bgColor = getAvatarColor(student.name)

  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid #EEE7E1',
        borderRadius: 8,
        background: '#ffffff',
        padding: 12,
        minHeight: 128,
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = '#E8784A'
        const actions = event.currentTarget.querySelector('.student-actions') as HTMLElement | null
        if (actions) actions.style.opacity = '1'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = '#EEE7E1'
        const actions = event.currentTarget.querySelector('.student-actions') as HTMLElement | null
        if (actions) actions.style.opacity = '0'
      }}
    >
      {isLowHours && (
        <Tooltip title="课时不足">
          <span style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 99, background: '#e03e2d' }} />
        </Tooltip>
      )}

      <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: bgColor, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
          {student.name.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ color: '#1F2329', fontSize: 13, display: 'block', lineHeight: 1.25 }}>{student.name}</Text>
          <Text style={{ color: '#98A2B3', fontSize: 11, display: 'block', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[student.grade || '未设年级', student.school].filter(Boolean).join(' · ')}
          </Text>
        </div>
      </div>

      <Space size={[5, 5]} wrap style={{ marginBottom: 10 }}>
        <StatusBadge status={student.status} remainHours={student.remainHours} />
        <CourseTypeBadge type={student.courseType} />
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EEE7E1', paddingTop: 9 }}>
        <span style={{ color: '#98A2B3', fontSize: 11 }}>
          余 <strong style={{ color: isLowHours ? '#e03e2d' : '#1F2329', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatHours(student.remainHours)}</strong> 课时
        </span>
        <Space className="student-actions" size={2} style={{ opacity: 0, transition: 'opacity 0.2s' }}>
          <Tooltip title="查看">
            <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#98A2B3' }} onClick={() => router.push(`/students/${student.id}`)} />
          </Tooltip>
          <Tooltip title="学情档案">
            <Button type="text" size="small" icon={<ProfileOutlined />} style={{ color: '#98A2B3' }} onClick={() => router.push(`/student-archive/${student.id}`)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#98A2B3' }} onClick={() => onEdit(student)} />
          </Tooltip>
          <Tooltip title="离校">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(student)} />
          </Tooltip>
        </Space>
      </div>
    </div>
  )
}
