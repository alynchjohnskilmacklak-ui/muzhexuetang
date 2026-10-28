'use client'

import { Button, Space, Tooltip, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { StudentAvatar } from '@/components/Common/StudentAvatar'

import { StatusBadge } from './StatusBadge'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'
import {
  hasLowPrepaidHours,
  hasOutstandingPrepaidBalance,
  hasOverdueFees,
} from '@/lib/student-billing-status'

const { Text } = Typography

const AVATAR_COLORS = ['#E8784A', '#27a644', '#b37feb', '#f5a623', '#828fff', '#e03e2d']
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ONE_ON_ONE: { bg: '#EEEDFE', text: '#3C3489', label: '一对一' },
  ONE_ON_TWO: { bg: '#E6F1FB', text: '#185FA5', label: '一对二' },
  ONE_ON_THREE: { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  SMALL_GROUP: { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  GROUP: { bg: '#FAEEDA', text: '#633806', label: '班课' },
  STUDY_HALL: { bg: '#FFF0E8', text: '#A63F18', label: '作业班' },
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

type StudentFee = {
  id: string
  status?: string | null
  dueDate?: string | null
  amount?: number | null
}

type StudentEnrollment = {
  id: string
  remainHours?: number | null
  totalHours?: number | null
  usedHours?: number | null
  group?: {
    name?: string | null
    lessonMinutes?: number | null
    intensiveMode?: string | null
    course?: { name?: string | null; type?: string | null } | null
  } | null
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
    taughtHours: number
    source?: string | null
    membershipLevel?: string
    courseType?: string | null
    fees?: StudentFee[]
    enrollments?: StudentEnrollment[]
    studyHallMemberships?: Array<{
      id: string
      remainingDays: number | null
      totalDays: number | null
      quotaState: 'UNSET' | 'ACTIVE' | 'LOW' | 'EXPIRED'
      studyClass: { name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND' }
    }>
    mainTeacher?: { id: string; name: string } | null
    schedules?: Array<{ schedule: { course?: { id: string; name: string } | null } }>
  }
  onEdit: (student: Record<string, unknown>) => void
  onDelete: (student: Record<string, unknown>) => void
}

export function StudentCard({ student, onEdit, onDelete }: StudentCardProps) {
  const router = useRouter()
  const isLowHours = student.status === 'ACTIVE' && hasLowPrepaidHours(student.enrollments)
  // 欠费只看“有逾期未缴费用”，与课时数字无关；接口未返回 fees 时回退旧逻辑
  const isOwed = student.status === 'ACTIVE'
    && (Array.isArray(student.fees)
      ? hasOverdueFees(student.fees)
      : hasOutstandingPrepaidBalance(student.enrollments))
  const bgColor = getAvatarColor(student.name)
  const membershipLevel = resolveMembership(student.membershipLevel)
  const membershipTheme = MEMBERSHIP_THEME[membershipLevel]
  const hasMembershipBadge = membershipLevel === 'VIP' || membershipLevel === 'SVIP'
  const isSvipCard = membershipLevel === 'SVIP'
  const isVipCard = membershipLevel === 'VIP'
  const cardBg = isSvipCard ? '#0E2E2A' : isVipCard ? '#FFF7F1' : '#ffffff'
  const cardBorder = isSvipCard ? '#C9A45C' : isVipCard ? '#F2B58F' : '#EEE7E1'
  const cardMainText = isSvipCard ? '#F6E9C8' : isVipCard ? '#7A4A28' : '#1F2329'
  const cardSubText = isSvipCard ? 'rgba(246,233,200,.72)' : isVipCard ? '#B08150' : '#98A2B3'
  const cardAccentText = isSvipCard ? '#F6E9C8' : '#E8784A'
  // 操作按钮颜色：SVIP 金 / VIP 橙 / 普通深灰，默认常显
  const actionColor = isSvipCard ? '#F6E9C8' : isVipCard ? '#B94F25' : '#4A5568'

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${cardBorder}`,
        borderRadius: 8,
        background: cardBg,
        padding: 12,
        minHeight: 128,
        boxShadow: isSvipCard ? '0 0 14px rgba(201,164,92,.18)' : 'none',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = isSvipCard ? '#D6B56A' : '#E8784A'
        if (isSvipCard) event.currentTarget.style.boxShadow = '0 0 22px rgba(201,164,92,.38)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = cardBorder
        if (isSvipCard) event.currentTarget.style.boxShadow = '0 0 14px rgba(201,164,92,.18)'
      }}
    >
      {hasMembershipBadge && (
        <span style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 2, borderRadius: 999, background: membershipTheme.accent }} />
      )}
      {isLowHours && (
        <Tooltip title="课时不足">
          <span style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 99, background: '#e03e2d' }} />
        </Tooltip>
      )}

      <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10 }}>
        <StudentAvatar gender={student.gender} name={student.name} size={30} rounded={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ color: cardMainText, fontSize: 13, lineHeight: 1.25 }}>{student.name}</Text>
            {hasMembershipBadge && (
              <span style={{ background: isSvipCard ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : membershipTheme.bg, color: isSvipCard ? '#fff' : membershipTheme.accent, border: `1px solid ${isSvipCard ? '#D6B56A' : membershipTheme.border}`, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 7px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                {membershipLevel === 'SVIP' && <span style={{ marginRight: 3 }}>★</span>}
                {membershipTheme.badge}
              </span>
            )}
          </div>
          <Text style={{ color: cardSubText, fontSize: 11, display: 'block', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[student.grade || '未设年级', student.school].filter(Boolean).join(' · ')}
          </Text>
        </div>
      </div>

      <Space size={[5, 5]} wrap style={{ marginBottom: 10 }}>
        <StatusBadge status={student.status} isOwed={isOwed} />
        <CourseTypeBadge type={student.courseType} />
      </Space>

      {student.studyHallMemberships?.map((membership) => (
        <div key={membership.id} style={{ fontSize: 11, color: cardSubText, margin: '-3px 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {membership.studyClass.scheduleType === 'WEEKEND' ? '周末班' : '晚托'}：{membership.studyClass.name}
          {' · '}{membership.quotaState === 'UNSET' ? '未设置天数' : membership.quotaState === 'EXPIRED' ? '已到期' : `剩余${membership.remainingDays}/${membership.totalDays}天`}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: isSvipCard ? '1px solid rgba(201,164,92,.30)' : '1px solid #EEE7E1', paddingTop: 9 }}>
        <span style={{ color: cardSubText, fontSize: 11, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          已上 <strong style={{ color: cardAccentText, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{Number(student.taughtHours || 0).toFixed(1)} 小时</strong>
        </span>
        <Space className="student-actions" size={2} style={{ opacity: 1 }}>
          <Tooltip title="查看资料与学情">
            <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: actionColor, transition: 'color .15s' }} onClick={() => router.push(`/students/${student.id}`)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} style={{ color: actionColor, transition: 'color .15s' }} onClick={() => onEdit(student)} />
          </Tooltip>
          <Tooltip title="离校">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(student)} />
          </Tooltip>
        </Space>
      </div>
    </div>
  )
}
