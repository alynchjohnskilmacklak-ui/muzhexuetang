'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Space, Tooltip, Typography } from 'antd'
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { StatusBadge } from './StatusBadge'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'
import {
  hasLowPrepaidHours,
  hasOutstandingPrepaidBalance,
  hasOverdueFees,
} from '@/lib/student-billing-status'
import styles from './StudentCard.module.css'

const { Text } = Typography

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  ONE_ON_ONE:   { bg: '#EEEDFE', text: '#3C3489', label: '一对一' },
  ONE_ON_TWO:   { bg: '#E6F1FB', text: '#185FA5', label: '一对二' },
  ONE_ON_THREE: { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  SMALL_GROUP:  { bg: '#FBEAF0', text: '#72243E', label: '一对三' },
  GROUP:        { bg: '#FAEEDA', text: '#633806', label: '精品班课' },
  STUDY_HALL:   { bg: '#FFF0E8', text: '#A63F18', label: '晚托作业班' },
}

function CourseTypeBadge({ type }: { type?: string | null }) {
  const config = TYPE_CONFIG[type || ''] || { bg: '#F4F5F7', text: '#6B7280', label: '未分班' }
  return (
    <span
      style={{
        borderRadius: 6,
        padding: '2px 7px',
        fontSize: 11,
        background: config.bg,
        color: config.text,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
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
  const isOwed =
    student.status === 'ACTIVE' &&
    (Array.isArray(student.fees)
      ? hasOverdueFees(student.fees)
      : hasOutstandingPrepaidBalance(student.enrollments))

  const membershipLevel = resolveMembership(student.membershipLevel)
  const membershipTheme = MEMBERSHIP_THEME[membershipLevel]
  const isSvipCard = membershipLevel === 'SVIP'
  const isVipCard = membershipLevel === 'VIP'

  // Calculate actual remain hours displayed
  const totalRemain = Number(student.remainHours || 0)
  const totalTaught = Number(student.taughtHours || 0)

  return (
    <article className={styles.card}>
      {/* Top tier subtle indicator */}
      {isSvipCard && <div className={styles.svipStrip} />}
      {isVipCard && !isSvipCard && <div className={styles.vipStrip} />}

      <div>
        {/* Header: Avatar, Name, Tier, School */}
        <div className={styles.headRow}>
          <StudentAvatar gender={student.gender} name={student.name} size={36} rounded />
          <div className={styles.identityCol}>
            <div className={styles.nameRow}>
              <span className={styles.studentName}>{student.name}</span>
              {(isVipCard || isSvipCard) && (
                <span
                  className={styles.membershipTag}
                  style={{
                    background: isSvipCard
                      ? 'linear-gradient(135deg,#C9A45C,#A8873D)'
                      : membershipTheme.bg,
                    color: isSvipCard ? '#fff' : membershipTheme.accent,
                    border: `1px solid ${isSvipCard ? '#D6B56A' : membershipTheme.border}`,
                  }}
                >
                  {isSvipCard ? '★ SVIP' : 'VIP'}
                </span>
              )}
            </div>
            <div className={styles.metaSubtitle}>
              {[student.grade || '未设年级', student.school].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Badges: Status & Course Type */}
        <div className={styles.badgesRow}>
          <StatusBadge status={student.status} isOwed={isOwed} />
          <CourseTypeBadge type={student.courseType} />
          {isLowHours && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#E03E2D',
                background: '#FFF0EE',
                border: '1px solid #F1D3CF',
                padding: '1px 6px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <WarningOutlined /> 课时告急
            </span>
          )}
        </div>

        {/* Hours Summary Box */}
        <div className={styles.hoursBar}>
          <div className={styles.remainHoursItem}>
            <span>剩余课时:</span>
            <span
              className={`${styles.remainHoursVal} ${
                isLowHours ? styles.remainHoursDanger : styles.remainHoursNormal
              }`}
            >
              {totalRemain.toFixed(1)} 节
            </span>
          </div>
          <div className={styles.taughtHoursItem}>
            已上 {totalTaught.toFixed(1)}h
          </div>
        </div>

        {/* Study Hall membership if enrolled */}
        {student.studyHallMemberships?.map((membership) => (
          <div key={membership.id} className={styles.studyHallLine}>
            {membership.studyClass.scheduleType === 'WEEKEND' ? '周末作业班' : '晚托班'}：
            {membership.studyClass.name} ·{' '}
            {membership.quotaState === 'UNSET'
              ? '未设天数'
              : membership.quotaState === 'EXPIRED'
              ? '已到期'
              : `余${membership.remainingDays}/${membership.totalDays}天`}
          </div>
        ))}
      </div>

      {/* Action Dock (数据链路连通坞) */}
      <div className={styles.actionDock}>
        <div className={styles.primaryLinks}>
          <Link href={`/students/${student.id}`} className={styles.quickLinkBtn}>
            📋 档案
          </Link>
          <Link
            href={`/schedule/intensive?studentId=${student.id}`}
            className={styles.quickLinkBtn}
            style={{
              background: 'rgba(201, 164, 92, 0.12)',
              borderColor: 'rgba(201, 164, 92, 0.3)',
              color: '#8A6517',
            }}
          >
            📅 排课
          </Link>
        </div>

        <div className={styles.iconActions}>
          <Tooltip title="编辑学员资料">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: 'var(--color-ink-muted)' }} />}
              onClick={() => onEdit(student)}
            />
          </Tooltip>
          <Tooltip title="学员离校处理">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(student)}
            />
          </Tooltip>
        </div>
      </div>
    </article>
  )
}
