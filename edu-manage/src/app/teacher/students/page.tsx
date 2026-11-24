'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button, Card, Input, Segmented, Tag } from 'antd'
import {
  AlertOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CrownFilled,
  EditFilled,
  ExclamationCircleFilled,
  FileTextOutlined,
  HistoryOutlined,
  ProfileOutlined,
  RightOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltFilled,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatPercent } from '@/lib/format'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { StudentMembershipBadge } from '@/components/Common/StudentMembershipBadge'
import { resolveTier, TIER_APP, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`加载失败（${response.status}）`)
  return response.json()
}

type TeacherStudent = {
  id: string
  name?: string
  grade?: string | null
  gender?: string | null
  school?: string | null
  membershipLevel?: string | null
  remainHours?: number | string | null
  totalHours?: number | string | null
  taughtHours?: number | string | null
  attendanceRate?: number | null
  daysSinceLastFeedback?: number | null
  lastFeedback?: string | null
  primaryCourseType?: 'ONE_ON_ONE' | 'SMALL_GROUP' | 'GROUP' | 'STUDY_HALL' | string | null
  studyHallMemberships?: Array<{
    id: string
    purchasedDays?: number | null
    adjustedDays?: number
    studyClass: { id: string; name: string; scheduleType: 'WEEKDAY_LATE' | 'WEEKEND'; gradeScope?: string[] }
  }>
  enrollments?: Array<{
    id: string
    remainHours?: number | string | null
    totalHours?: number | string | null
    group?: {
      lessonMinutes?: number | null
      course?: { name?: string | null; type?: string | null } | null
      teacherAssignments?: Array<{ subject?: string | null }>
    } | null
  }>
}

type FilterKey = 'ALL' | 'NEED_FEEDBACK' | 'ATTENDANCE_WARN' | '初一' | '初二' | '初三' | 'ONE_ON_ONE' | 'STUDY_HALL'

export default function TeacherStudentsPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [q, setQ] = useState('')
  const [filterKey, setFilterKey] = useState<FilterKey>('ALL')
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('compact')

  // 获取学员列表与当前教师身份
  const { data: rawStudents, error, isLoading, mutate } = useSWR<TeacherStudent[]>('/api/teacher/students', fetcher)
  const { data: dashData } = useSWR<{ teacher?: { id: string; name: string; tierLevel?: string | null } }>(
    '/api/teacher/dashboard',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[currentTier]
  const appTheme = TIER_APP[currentTier]

  // 梯队动态专属风格（自适应管理老师紫金、专属教师黑金、资深教师墨绿琥珀、经验教师翡翠绿、新晋教师浅翠绿）
  const tierVisual = useMemo(() => {
    switch (currentTier) {
      case 'MANAGER':
        return {
          gradient: 'linear-gradient(135deg, #241A5E 0%, #4C3FA8 55%, #6B5DC2 100%)',
          shadow: '0 12px 30px rgba(76, 63, 168, 0.32)',
          subColor: '#E2D9F4',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#E2D9F4',
          badgeBorder: 'rgba(226, 217, 244, 0.28)',
          accentColor: '#4C3FA8',
          goldColor: '#FDE68A',
          bannerTag: `🛡️ ${tierTheme.label} · 授课学员全景`,
        }
      case 'ELITE':
        return {
          gradient: 'linear-gradient(135deg, #061A17 0%, #0D3732 55%, #18524B 100%)',
          shadow: '0 12px 30px rgba(13, 55, 50, 0.38)',
          subColor: '#F6E9C8',
          badgeBg: 'rgba(201, 164, 92, 0.24)',
          badgeFg: '#F6E9C8',
          badgeBorder: 'rgba(201, 164, 92, 0.38)',
          accentColor: '#0D3732',
          goldColor: '#C9A45C',
          bannerTag: `👑 ${tierTheme.label} · 授课学员全景`,
        }
      case 'SENIOR':
        return {
          gradient: 'linear-gradient(135deg, #0B2923 0%, #14574D 55%, #1E7E6F 100%)',
          shadow: '0 12px 30px rgba(20, 87, 77, 0.35)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#14574D',
          goldColor: '#F3D98F',
          bannerTag: `⭐ ${tierTheme.label} · 授课学员全景`,
        }
      case 'EXPERIENCED':
        return {
          gradient: 'linear-gradient(135deg, #103B31 0%, #267461 55%, #38957E 100%)',
          shadow: '0 12px 30px rgba(38, 116, 97, 0.32)',
          subColor: '#CCFBF1',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#99F6E4',
          badgeBorder: 'rgba(153, 246, 228, 0.25)',
          accentColor: '#267461',
          goldColor: '#FDE68A',
          bannerTag: `🌿 ${tierTheme.label} · 授课学员全景`,
        }
      case 'NEW':
      default:
        return {
          gradient: 'linear-gradient(135deg, #174233 0%, #3D8A6F 55%, #52A687 100%)',
          shadow: '0 12px 30px rgba(61, 138, 111, 0.32)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#3D8A6F',
          goldColor: '#FEF08A',
          bannerTag: `🌱 ${tierTheme.label} · 授课学员全景`,
        }
    }
  }, [currentTier, tierTheme])

  const students = useMemo(() => rawStudents ?? [], [rawStudents])

  // 核心统计指标计算
  const stats = useMemo(() => {
    const totalCount = students.length
    const needFeedbackStudents = students.filter(
      (s) => (s.daysSinceLastFeedback == null ? 999 : Number(s.daysSinceLastFeedback)) > 7
    )
    const warnAttendanceStudents = students.filter(
      (s) => s.attendanceRate != null && Number(s.attendanceRate) < 85
    )
    const totalTaughtHours = students.reduce((sum, s) => sum + Number(s.taughtHours || 0), 0)
    const validAttendanceStudents = students.filter((s) => s.attendanceRate != null)
    const avgAttendance = validAttendanceStudents.length
      ? Math.round(
          validAttendanceStudents.reduce((sum, s) => sum + Number(s.attendanceRate || 0), 0) /
            validAttendanceStudents.length
        )
      : 100

    return {
      totalCount,
      needFeedbackCount: needFeedbackStudents.length,
      warnAttendanceCount: warnAttendanceStudents.length,
      totalTaughtHours: Math.round(totalTaughtHours * 10) / 10,
      avgAttendance,
    }
  }, [students])

  // 多维筛选计算
  const filtered = useMemo(() => {
    return students.filter((student) => {
      const searchText = [
        student.name,
        student.grade,
        student.school,
        ...(student.enrollments?.map((enrollment) => enrollment.group?.course?.name || '') || []),
        ...(student.studyHallMemberships?.map((membership) => membership.studyClass.name) || []),
      ].join(' ')

      const matchSearch = !q.trim() || searchText.toLowerCase().includes(q.trim().toLowerCase())

      let matchFilter = true
      if (filterKey === 'NEED_FEEDBACK') {
        matchFilter = (student.daysSinceLastFeedback == null ? 999 : Number(student.daysSinceLastFeedback)) > 7
      } else if (filterKey === 'ATTENDANCE_WARN') {
        matchFilter = student.attendanceRate != null && Number(student.attendanceRate) < 85
      } else if (filterKey === '初一' || filterKey === '初二' || filterKey === '初三') {
        matchFilter = student.grade === filterKey
      } else if (filterKey === 'ONE_ON_ONE') {
        matchFilter = student.primaryCourseType === 'ONE_ON_ONE'
      } else if (filterKey === 'STUDY_HALL') {
        matchFilter = student.primaryCourseType === 'STUDY_HALL' || Boolean(student.studyHallMemberships?.length)
      }

      return matchSearch && matchFilter
    })
  }, [students, q, filterKey])

  // 按班型课程分组
  const groupedStudents = useMemo(() => {
    const oneOnOne = filtered.filter((student) => student.primaryCourseType === 'ONE_ON_ONE')
    const smallGroup = filtered.filter((student) => student.primaryCourseType === 'SMALL_GROUP')
    const group = filtered.filter((student) => student.primaryCourseType === 'GROUP' || !student.primaryCourseType)
    const studyHall = filtered.filter(
      (student) => student.primaryCourseType === 'STUDY_HALL' || (!student.enrollments?.length && Boolean(student.studyHallMemberships?.length))
    )
    return { oneOnOne, smallGroup, group, studyHall }
  }, [filtered])

  // 学员状态徽章
  const getFeedbackMeta = (student: TeacherStudent) => {
    if (!student.enrollments?.length && student.studyHallMemberships?.length) {
      return {
        label: '晚托作业班',
        type: 'STUDY_HALL' as const,
        color: '#D97706',
        bg: '#FEF3C7',
        border: 'rgba(217, 119, 6, 0.25)',
      }
    }
    const days = student.daysSinceLastFeedback == null ? 999 : Number(student.daysSinceLastFeedback)
    if (days > 7) {
      return {
        label: days >= 999 ? '待写首评' : `未反馈 · ${days}天前`,
        type: 'PENDING' as const,
        color: '#C2572C',
        bg: '#FDF2EB',
        border: 'rgba(194, 87, 44, 0.3)',
      }
    }
    return {
      label: days === 0 ? '今日已反馈' : `已反馈 · ${days}天前`,
      type: 'DONE' as const,
      color: tierVisual.accentColor,
      bg: '#F4F9F6',
      border: 'rgba(20, 87, 77, 0.18)',
    }
  }

  // 渲染单张学员档案卡片
  const renderStudentCard = (student: TeacherStudent, index: number) => {
    const taughtHours = Number(student.taughtHours || 0)
    const feedbackMeta = getFeedbackMeta(student)
    const gradeGender = [student.grade, student.gender === 'FEMALE' ? '女' : student.gender === 'MALE' ? '男' : null].filter(Boolean).join(' · ')
    const schoolLabel = student.school ? `${student.school}` : null

    // 老师授课科目提取
    const subjects = [
      ...new Set(
        (student.enrollments || [])
          .flatMap((e) => (e.group?.teacherAssignments || []).map((a) => a?.subject).filter(Boolean) as string[])
      ),
    ].slice(0, 3)

    const studyHallOnly = !student.enrollments?.length && Boolean(student.studyHallMemberships?.length)
    const studyHallLabels = (student.studyHallMemberships || []).map((membership) => membership.studyClass.name).slice(0, 2)
    const attendance = student.attendanceRate != null ? Number(student.attendanceRate) : 100
    const isAttendanceLow = attendance < 85

    if (isMobile && viewMode === 'compact') {
      return (
        <div
          key={student.id}
          onClick={() => router.push(studyHallOnly ? '/teacher/study-hall' : `/teacher/students/${student.id}`)}
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '10px 10px 8px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background:
                feedbackMeta.type === 'PENDING'
                  ? 'linear-gradient(180deg, #E0783D 0%, #C2572C 100%)'
                  : `linear-gradient(180deg, ${tierVisual.accentColor} 0%, rgba(20, 87, 77, 0.6) 100%)`,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <StudentAvatar gender={student.gender} name={student.name} size={32} />
                {student.membershipLevel === 'VIP' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#78350F',
                      fontSize: 8,
                    }}
                  >
                    <CrownFilled />
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {student.name}
                </div>
                <div style={{ fontSize: 10.5, color: '#8C7E6A' }}>
                  {student.grade || '在读学员'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              padding: '4px 6px',
              borderRadius: 6,
              background: '#F9F7F3',
              marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 9.5, color: '#8C7E6A' }}>出勤率</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: isAttendanceLow ? '#DC2626' : tierVisual.accentColor }}>
                  {formatPercent(student.attendanceRate)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9.5, color: '#8C7E6A' }}>已授</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#B25E18' }}>
                  {taughtHours.toFixed(1)}h
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/teacher/feedback?studentId=${student.id}`)
            }}
            style={{
              width: '100%',
              height: 26,
              borderRadius: 6,
              border: feedbackMeta.type === 'PENDING' ? 'none' : `1px solid ${tierVisual.accentColor}33`,
              background:
                feedbackMeta.type === 'PENDING'
                  ? 'linear-gradient(135deg, #C2572C 0%, #E0783D 100%)'
                  : 'rgba(0, 0, 0, 0.04)',
              color: feedbackMeta.type === 'PENDING' ? '#FFFFFF' : tierVisual.accentColor,
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <EditFilled style={{ fontSize: 10 }} />
            <span>{feedbackMeta.type === 'PENDING' ? '写反馈' : '已反馈'}</span>
          </button>
        </div>
      )
    }

    return (
      <div
        key={student.id}
        onClick={() => router.push(studyHallOnly ? '/teacher/study-hall' : `/teacher/students/${student.id}`)}
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          padding: '16px 16px 14px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          animationDelay: `${Math.min(index, 8) * 40}ms`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.03)'
        }}
      >
        {/* 卡片左侧主色指示条 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background:
              feedbackMeta.type === 'PENDING'
                ? 'linear-gradient(180deg, #E0783D 0%, #C2572C 100%)'
                : `linear-gradient(180deg, ${tierVisual.accentColor} 0%, rgba(20, 87, 77, 0.6) 100%)`,
          }}
        />

        <div>
          {/* 第 1 行：头像 + 姓名 + 身份标签 + 反馈状态胶囊 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <StudentAvatar gender={student.gender} name={student.name} size={42} />
                {student.membershipLevel === 'VIP' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#78350F',
                      fontSize: 9,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    <CrownFilled />
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#17352F', letterSpacing: '-0.01em' }}>
                    {student.name}
                  </span>
                  {student.membershipLevel && (
                    <StudentMembershipBadge level={student.membershipLevel} />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: '#7A694F' }}>
                  {gradeGender && <span>{gradeGender}</span>}
                  {schoolLabel && (
                    <>
                      <span>·</span>
                      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={schoolLabel}>
                        {schoolLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 反馈状态胶囊 */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: feedbackMeta.color,
                background: feedbackMeta.bg,
                border: `1px solid ${feedbackMeta.border}`,
                padding: '3px 9px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {feedbackMeta.type === 'PENDING' && <AlertOutlined style={{ fontSize: 11 }} />}
              {feedbackMeta.type === 'DONE' && <CheckCircleFilled style={{ fontSize: 11 }} />}
              <span>{feedbackMeta.label}</span>
            </span>
          </div>

          {/* 第 2 行：授课科目标签与班级标签 */}
          {(subjects.length > 0 || studyHallLabels.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12, marginLeft: 2 }}>
              {subjects.map((sub, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: tierVisual.accentColor,
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {sub}
                </span>
              ))}
              {studyHallLabels.map((label, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#D97706',
                    background: '#FEF3C7',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* 第 3 行：核心数据指标小看板（出勤 / 已上课时 / 班级数） */}
          <div
            style={{
              background: '#F9F8F5',
              borderRadius: 12,
              padding: '9px 12px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.3fr 1fr',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#8C7E6A' }}>月出勤率</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: isAttendanceLow ? '#DC2626' : tierVisual.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  marginTop: 1,
                }}
              >
                <span>{formatPercent(student.attendanceRate)}</span>
                {isAttendanceLow && <AlertOutlined style={{ fontSize: 11, color: '#DC2626' }} />}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#8C7E6A' }}>累计已上</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#B25E18', marginTop: 1 }}>
                {taughtHours.toFixed(1)} <span style={{ fontSize: 11, fontWeight: 600 }}>小时</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#8C7E6A' }}>在读班级</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#17352F', marginTop: 1 }}>
                {(student.enrollments?.length || 0) + (student.studyHallMemberships?.length || 0)}{' '}
                <span style={{ fontSize: 11, fontWeight: 600 }}>个</span>
              </div>
            </div>
          </div>
        </div>

        {/* 第 4 行：双动作按钮栏 */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          {/* 随堂反馈按钮 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/teacher/feedback?studentId=${student.id}`)
            }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              border: feedbackMeta.type === 'PENDING' ? 'none' : `1px solid ${tierVisual.accentColor}33`,
              background:
                feedbackMeta.type === 'PENDING'
                  ? 'linear-gradient(135deg, #C2572C 0%, #E0783D 100%)'
                  : 'rgba(0, 0, 0, 0.04)',
              color: feedbackMeta.type === 'PENDING' ? '#FFFFFF' : tierVisual.accentColor,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxShadow: feedbackMeta.type === 'PENDING' ? '0 2px 8px rgba(194, 87, 44, 0.28)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <EditFilled style={{ fontSize: 12 }} />
            <span>{feedbackMeta.type === 'PENDING' ? '去写随堂反馈' : '补录反馈'}</span>
          </button>

          {/* 学员详情档案按钮 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              router.push(studyHallOnly ? '/teacher/study-hall' : `/teacher/students/${student.id}`)
            }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(0, 0, 0, 0.12)',
              background: '#FFFFFF',
              color: '#17352F',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <ProfileOutlined style={{ fontSize: 12, color: '#7A694F' }} />
            <span>学情档案</span>
            <RightOutlined style={{ fontSize: 9, color: '#A09380' }} />
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <CardSkeleton rows={3} />
  }

  if (error) {
    return (
      <BrandEmpty
        title="学员列表加载失败"
        hint={error instanceof Error ? error.message : '请检查网络后重新加载'}
        icon={<ProfileOutlined />}
        actionText="重新加载"
        onAction={() => void mutate()}
      />
    )
  }

  return (
    <div style={{ paddingBottom: isMobile ? 88 : 32, overflowX: 'clip', color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 顶部根据老师等级/标签动态渲染专属高光数据看板 (HERO BANNER) */}
      {/* ========================================================= */}
      <div
        style={{
          background: tierVisual.gradient,
          borderRadius: 22,
          padding: isMobile ? '20px 18px' : '24px 26px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tierVisual.shadow,
          marginBottom: 16,
        }}
      >
        {/* 背景微光光晕 */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* 标题区 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tierVisual.badgeBg,
                border: `1px solid ${tierVisual.badgeBorder}`,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: tierVisual.badgeFg,
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}
            >
              <TeamOutlined style={{ color: tierVisual.goldColor }} />
              <span>{tierVisual.bannerTag}</span>
            </div>
            <div
              style={{
                color: '#FFFFFF !important',
                fontSize: isMobile ? 24 : 28,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              授课学员管理 · 学情全景
            </div>
            <div style={{ fontSize: 12.5, color: tierVisual.subColor, marginTop: 5, opacity: 0.95 }}>
              实时追踪在读学员出勤率、随堂反馈时效与学情画像
            </div>
          </div>
        </div>

        {/* 4 大可交互核心指标卡片（点击快速联动筛选） */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {/* 指标 1：授课学员总数 */}
          <div
            onClick={() => setFilterKey('ALL')}
            style={{
              background: filterKey === 'ALL' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: filterKey === 'ALL' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: tierVisual.subColor }}>
              <span>在读学员</span>
              <UserOutlined style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
              {stats.totalCount} <span style={{ fontSize: 12, fontWeight: 600 }}>人</span>
            </div>
            <div style={{ fontSize: 10.5, color: tierVisual.subColor, opacity: 0.9, marginTop: 2 }}>点击查看全部</div>
          </div>

          {/* 指标 2：待反馈学员（高亮警示） */}
          <div
            onClick={() => setFilterKey('NEED_FEEDBACK')}
            style={{
              background: filterKey === 'NEED_FEEDBACK' ? 'rgba(224, 120, 61, 0.35)' : 'rgba(255, 255, 255, 0.12)',
              border: filterKey === 'NEED_FEEDBACK' ? '1.5px solid #FFAB91' : stats.needFeedbackCount > 0 ? '1px solid rgba(255, 171, 145, 0.4)' : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: '#FFD7C2' }}>
              <span>待跟进反馈</span>
              <AlertOutlined style={{ color: '#FFAB91' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stats.needFeedbackCount > 0 ? '#FFE082' : '#FFFFFF', marginTop: 4 }}>
              {stats.needFeedbackCount} <span style={{ fontSize: 12, fontWeight: 600 }}>人待评</span>
            </div>
            <div style={{ fontSize: 10.5, color: stats.needFeedbackCount > 0 ? '#FFAB91' : tierVisual.subColor, marginTop: 2 }}>
              {stats.needFeedbackCount > 0 ? '⚠️ 超7天未反馈' : '教学反馈完备'}
            </div>
          </div>

          {/* 指标 3：平均出勤率 */}
          <div
            onClick={() => setFilterKey(stats.warnAttendanceCount > 0 ? 'ATTENDANCE_WARN' : 'ALL')}
            style={{
              background: filterKey === 'ATTENDANCE_WARN' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: filterKey === 'ATTENDANCE_WARN' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: tierVisual.subColor }}>
              <span>平均出勤率</span>
              <CheckCircleFilled style={{ color: '#34D399' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
              {stats.avgAttendance}%
            </div>
            <div style={{ fontSize: 10.5, color: stats.warnAttendanceCount > 0 ? '#FFAB91' : tierVisual.subColor, marginTop: 2 }}>
              {stats.warnAttendanceCount > 0 ? `${stats.warnAttendanceCount}人出勤低于85%` : '出勤状况优良'}
            </div>
          </div>

          {/* 指标 4：累计授课学时 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 14,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: tierVisual.subColor }}>
              <span>累计授课</span>
              <HistoryOutlined style={{ color: tierVisual.goldColor }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
              {stats.totalTaughtHours} <span style={{ fontSize: 12, fontWeight: 600 }}>小时</span>
            </div>
            <div style={{ fontSize: 10.5, color: tierVisual.subColor, opacity: 0.9, marginTop: 2 }}>本学期有效课时</div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 搜索与多维快捷筛选工具栏                                    */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {/* 搜索框与移动端视图切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Input
            prefix={<SearchOutlined style={{ color: tierVisual.accentColor, fontSize: 15 }} />}
            placeholder="搜索学员姓名、年级、学校或课程班级名称..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            allowClear
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(0, 0, 0, 0.12)',
              background: '#FFFFFF',
              fontSize: 13.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          />
          {isMobile && (
            <Segmented
              size="middle"
              value={viewMode}
              onChange={(val) => setViewMode(val as 'detailed' | 'compact')}
              options={[
                { value: 'compact', icon: <AppstoreOutlined title="2×2紧凑磁贴" /> },
                { value: 'detailed', icon: <UnorderedListOutlined title="单列详细" /> },
              ]}
              style={{ flexShrink: 0, background: '#ECE6DC' }}
            />
          )}
        </div>

        {/* 筛选 Chip 滚动条 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            overflowX: 'auto',
            paddingBottom: 4,
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { key: 'ALL', label: `全部学员 (${students.length})` },
            {
              key: 'NEED_FEEDBACK',
              label: `⚠️ 待写反馈 (${stats.needFeedbackCount})`,
              highlight: stats.needFeedbackCount > 0,
            },
            { key: 'ATTENDANCE_WARN', label: `出勤预警 (${stats.warnAttendanceCount})` },
            { key: '初一', label: '初一' },
            { key: '初二', label: '初二' },
            { key: '初三', label: '初三' },
            { key: 'ONE_ON_ONE', label: '一对一' },
            { key: 'STUDY_HALL', label: '晚托作业班' },
          ].map((chip) => {
            const active = filterKey === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilterKey(chip.key as FilterKey)}
                style={{
                  background: active
                    ? chip.highlight
                      ? '#C2572C'
                      : tierVisual.accentColor
                    : chip.highlight
                      ? '#FDF2EB'
                      : '#FFFFFF',
                  color: active
                    ? '#FFFFFF'
                    : chip.highlight
                      ? '#C2572C'
                      : '#5A4E3A',
                  border: active
                    ? 'none'
                    : chip.highlight
                      ? '1px solid rgba(194, 87, 44, 0.3)'
                      : '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: active || chip.highlight ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: active ? '0 3px 10px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 学员列表展示（按班型模块化分组聚合）                         */}
      {/* ========================================================= */}
      {!filtered.length ? (
        <BrandEmpty
          title="未找到匹配的学员"
          hint={q || filterKey !== 'ALL' ? '尝试调整搜索关键词或重置筛选条件' : '暂无关联的授课学员'}
          icon={<ProfileOutlined />}
          actionText={q || filterKey !== 'ALL' ? '清除筛选' : undefined}
          onAction={() => {
            setQ('')
            setFilterKey('ALL')
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { key: 'oneOnOne', label: '一对一 定制冲刺', color: '#534AB7', bg: '#F2F0FB', students: groupedStudents.oneOnOne },
            { key: 'smallGroup', label: '精品小组课', color: '#D4537E', bg: '#FBF0F4', students: groupedStudents.smallGroup },
            { key: 'group', label: '班级课程', color: tierVisual.accentColor, bg: 'rgba(0, 0, 0, 0.04)', students: groupedStudents.group },
            { key: 'studyHall', label: '晚托与作业辅导班', color: '#D97706', bg: '#FEF3C7', students: groupedStudents.studyHall },
          ]
            .filter((group) => group.students.length > 0)
            .map((group) => (
              <div key={group.key}>
                {/* 模块分组标题栏 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 16, borderRadius: 999, background: group.color }} />
                    <span style={{ fontWeight: 900, fontSize: 16, color: '#17352F' }}>{group.label}</span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: group.color,
                        background: group.bg,
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {group.students.length} 位学员
                    </span>
                  </div>

                  <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>
                    {group.students.filter((s) => (s.daysSinceLastFeedback == null ? 999 : Number(s.daysSinceLastFeedback)) > 7).length > 0 ? (
                      <span style={{ color: '#C2572C', fontWeight: 700 }}>
                        {group.students.filter((s) => (s.daysSinceLastFeedback == null ? 999 : Number(s.daysSinceLastFeedback)) > 7).length} 位需随堂反馈
                      </span>
                    ) : (
                      '反馈完备'
                    )}
                  </span>
                </div>

                {/* 学员网格 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? viewMode === 'compact'
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'minmax(0, 1fr)'
                      : 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: isMobile ? (viewMode === 'compact' ? 8 : 12) : 14,
                    minWidth: 0,
                  }}
                >
                  {group.students.map(renderStudentCard)}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
